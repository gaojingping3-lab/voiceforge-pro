/**
 * Kokoro TTS 浏览器端封装
 * 模型文件存放在 GitHub 仓库，通过 CDN 下载到 IndexedDB（不占内存）
 * 模型主文件分割为7个20MB分片，浏览器端自动合并
 * 中文女声：小北(zf_xiaobei)、小妮(zf_xiaoni)、小小(zf_xiaoxiao)、小艺(zf_xiaoyi)
 */
(function (global) {
    'use strict';

    const MODEL_ID = 'onnx-community/Kokoro-82M-v1.1-zh-ONNX';
    const CDN_BASES = [
        'https://cdn.jsdelivr.net/gh/gaojingping3-lab/voiceforge-pro@main/public/models/kokoro',
        'https://cdn.statically.io/gh/gaojingping3-lab/voiceforge-pro/main/public/models/kokoro',
        'https://raw.githubusercontent.com/gaojingping3-lab/voiceforge-pro/main/public/models/kokoro'
    ];
    const DB_NAME = 'kokoro-cache';
    const STORE_NAME = 'files';
    let ttsInstance = null;
    let loadPromise = null;

    const AVAILABLE_VOICES = [
        { key: 'zf_xiaobei', name: '小北（年轻女声）' },
        { key: 'zf_xiaoni', name: '小妮（温柔女声）' },
        { key: 'zf_xiaoxiao', name: '小小（明亮女声）' },
        { key: 'zf_xiaoyi', name: '小艺（自然女声）' }
    ];

    const MODEL_FILES = [
        'config.json',
        'tokenizer.json',
        'tokenizer_config.json',
        'onnx/model_quantized.onnx.partaa',
        'onnx/model_quantized.onnx.partab',
        'onnx/model_quantized.onnx.partac',
        'onnx/model_quantized.onnx.partad',
        'onnx/model_quantized.onnx.partae',
        'onnx/model_quantized.onnx.partaf',
        'onnx/model_quantized.onnx.partag',
        'voices/zf_xiaobei.bin',
        'voices/zf_xiaoni.bin',
        'voices/zf_xiaoxiao.bin',
        'voices/zf_xiaoyi.bin'
    ];

    // ========== IndexedDB 封装 ==========
    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function saveToDB(key, blob) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(blob, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async function getFromDB(key) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function hasInDB(key) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).count(key);
            req.onsuccess = () => resolve(req.result > 0);
            req.onerror = () => reject(req.error);
        });
    }

    // ========== 工具函数 ==========
    function waitForLibrary(timeout) {
        timeout = timeout || 15000;
        return new Promise((resolve, reject) => {
            if (global.KokoroTTS) return resolve();
            const start = Date.now();
            const check = () => {
                if (global.KokoroTTS) resolve();
                else if (Date.now() - start > timeout) reject(new Error('KokoroTTS 库加载超时'));
                else setTimeout(check, 100);
            };
            check();
        });
    }

    // 下载单个文件，多源自动回退，存到 IndexedDB
    async function downloadFile(file, onProgress) {
        const shortName = file.split('/').pop();
        if (await hasInDB(file)) return;

        let lastErr = null;
        for (let baseIdx = 0; baseIdx < CDN_BASES.length; baseIdx++) {
            const url = CDN_BASES[baseIdx] + '/' + file;
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    if (onProgress) onProgress('loading', 0, '下载 ' + shortName + '...');
                    const resp = await fetch(url);
                    if (!resp.ok) throw new Error('HTTP ' + resp.status);
                    const blob = await resp.blob();
                    await saveToDB(file, blob);
                    return;
                } catch (err) {
                    lastErr = err;
                    if (attempt < 2) await new Promise(r => setTimeout(r, 500));
                }
            }
        }
        throw new Error('下载失败: ' + shortName + ' - ' + (lastErr ? lastErr.message : 'unknown'));
    }

    // 下载所有模型文件到 IndexedDB
    async function downloadModelFiles(onProgress) {
        const total = MODEL_FILES.length;
        for (let i = 0; i < total; i++) {
            const file = MODEL_FILES[i];
            const pct = Math.round(i / total * 100);
            await downloadFile(file, (stage, p, msg) => {
                if (onProgress) onProgress('loading', pct, msg);
            });
            if (onProgress) onProgress('loading', pct, '已下载 ' + (i + 1) + '/' + total);
        }

        // 合并模型分片到 IndexedDB（不占内存，用流式合并）
        if (onProgress) onProgress('loading', 95, '合并模型文件...');
        if (!(await hasInDB('model_quantized.onnx'))) {
            const parts = [];
            for (let i = 0; i < 7; i++) {
                const suffix = String.fromCharCode(97 + i); // aa, ab, ac...
                const part = await getFromDB('onnx/model_quantized.onnx.part' + suffix);
                parts.push(part);
            }
            const merged = new Blob(parts, { type: 'application/octet-stream' });
            await saveToDB('model_quantized.onnx', merged);
            // 释放分片引用
            parts.length = 0;
        }

        if (onProgress) onProgress('loading', 100, '模型下载完成');
    }

    // 安装 fetch 拦截器，从 IndexedDB 读取模型文件
    function installFetchInterceptor() {
        if (global._kokoroFetchInterceptorInstalled) return;
        global._kokoroFetchInterceptorInstalled = true;

        const originalFetch = global.fetch.bind(global);
        global.fetch = async function(url, options) {
            const urlStr = typeof url === 'string' ? url : (url && url.url) || '';

            // 匹配模型文件，从 IndexedDB 读取
            let dbKey = null;
            if (urlStr.endsWith('/config.json')) dbKey = 'config.json';
            else if (urlStr.endsWith('/tokenizer.json')) dbKey = 'tokenizer.json';
            else if (urlStr.endsWith('/tokenizer_config.json')) dbKey = 'tokenizer_config.json';
            else if (urlStr.includes('model_quantized.onnx')) dbKey = 'model_quantized.onnx';
            else {
                const voiceMatch = urlStr.match(/voices\/(zf_[a-z]+\.bin)/);
                if (voiceMatch) dbKey = voiceMatch[1];
            }

            if (dbKey) {
                const blob = await getFromDB(dbKey);
                if (blob) {
                    // 用流式响应，减少内存副本
                    return new Response(blob.stream(), {
                        headers: { 'Content-Type': 'application/octet-stream' }
                    });
                }
            }

            return originalFetch(url, options);
        };
    }

    // ========== 主接口 ==========
    function load(onProgress) {
        if (ttsInstance) return Promise.resolve(ttsInstance);
        if (loadPromise) return loadPromise;

        loadPromise = (async () => {
            if (onProgress) onProgress('loading', 0, '正在加载 Kokoro 引擎...');
            await waitForLibrary();

            // 检测 WebGPU
            let device = 'wasm';
            try {
                if (navigator.gpu) {
                    const adapter = await navigator.gpu.requestAdapter();
                    if (adapter) {
                        device = 'webgpu';
                        if (onProgress) onProgress('loading', 3, '检测到 WebGPU 加速');
                    }
                }
            } catch (e) {}
            if (device === 'wasm' && onProgress) {
                onProgress('loading', 3, '使用 WASM 模式');
            }

            // 下载模型到 IndexedDB（不占内存）
            await downloadModelFiles(onProgress);

            // 安装 fetch 拦截器
            installFetchInterceptor();

            if (onProgress) onProgress('loading', 98, '正在加载模型...');

            // 尝试多个后端：webgpu -> webgl -> wasm
            const backends = device === 'webgpu' ? ['webgpu', 'webgl', 'wasm'] : ['webgl', 'wasm'];
            let lastErr = null;
            for (const backend of backends) {
                try {
                    if (onProgress) onProgress('loading', 98, '尝试 ' + backend + ' 后端...');
                    const opts = {
                        dtype: 'q8',
                        device: backend === 'webgl' ? 'wasm' : backend,
                        progress_callback: (progress) => {
                            if (!onProgress) return;
                            if (progress.status === 'done') {
                                onProgress('loading', 100, '模型加载完成');
                            }
                        }
                    };
                    // WASM 节俭模式：关闭内存预分配，降低优化等级，减少内存膨胀
                    if (backend === 'wasm') {
                        opts.session_options = {
                            executionProviders: ['wasm'],
                            enableCpuMemArena: false,
                            graphOptimizationLevel: 'basic',
                            executionMode: 'sequential'
                        };
                    } else if (backend === 'webgl') {
                        opts.session_options = { executionProviders: ['webgl'] };
                    }
                    ttsInstance = await global.KokoroTTS.from_pretrained(MODEL_ID, opts);
                    lastErr = null;
                    if (onProgress) onProgress('loading', 100, '模型已就绪（' + backend + '），可以合成');
                    break;
                } catch (err) {
                    lastErr = err;
                    console.warn('Kokoro backend', backend, 'failed:', err.message);
                }
            }
            if (lastErr) {
                throw new Error('所有后端都失败: ' + lastErr.message);
            }

            return ttsInstance;
        })();

        return loadPromise;
    }

    async function synthesize(text, voiceKey, speed, onProgress) {
        if (!text || !text.trim()) throw new Error('Text is empty');
        const tts = await load(onProgress);
        if (onProgress) onProgress('synth', 10, '正在合成语音...');
        const audio = await tts.generate(text, {
            voice: voiceKey || 'zf_xiaobei',
            speed: speed || 1.0
        });
        if (onProgress) onProgress('synth', 100, '合成完成');
        return audio.toBlob();
    }

    function isLoaded() { return !!ttsInstance; }

    global.KokoroWrapper = {
        synthesize, load, isLoaded, AVAILABLE_VOICES,
        getVoices: () => AVAILABLE_VOICES.slice()
    };
})(window);
