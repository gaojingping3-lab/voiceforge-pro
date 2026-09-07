/**
 * Kokoro TTS 浏览器端封装
 * 模型文件存放在 GitHub 仓库，通过 jsDelivr CDN 下载（国内速度快）
 * 模型主文件分割为3个分片，浏览器端自动合并
 * 中文女声：小北(zf_xiaobei)、小妮(zf_xiaoni)、小小(zf_xiaoxiao)、小艺(zf_xiaoyi)
 */
(function (global) {
    'use strict';

    const MODEL_ID = 'onnx-community/Kokoro-82M-v1.1-zh-ONNX';
    // 多个 CDN 下载源，自动回退
    const CDN_BASES = [
        'https://cdn.jsdelivr.net/gh/gaojingping3-lab/voiceforge-pro@main/public/models/kokoro',
        'https://cdn.statically.io/gh/gaojingping3-lab/voiceforge-pro/main/public/models/kokoro',
        'https://raw.githubusercontent.com/gaojingping3-lab/voiceforge-pro/main/public/models/kokoro'
    ];
    let ttsInstance = null;
    let loadPromise = null;
    let modelBlobs = null; // 本地缓存的模型文件

    // 可用中文女声
    const AVAILABLE_VOICES = [
        { key: 'zf_xiaobei', name: '小北（年轻女声）' },
        { key: 'zf_xiaoni', name: '小妮（温柔女声）' },
        { key: 'zf_xiaoxiao', name: '小小（明亮女声）' },
        { key: 'zf_xiaoyi', name: '小艺（自然女声）' }
    ];

    // 需要下载的文件列表
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

    // 等待 KokoroTTS 库加载完成
    function waitForLibrary(timeout) {
        timeout = timeout || 15000;
        return new Promise((resolve, reject) => {
            if (global.KokoroTTS) return resolve();
            const start = Date.now();
            const check = () => {
                if (global.KokoroTTS) {
                    resolve();
                } else if (Date.now() - start > timeout) {
                    reject(new Error('KokoroTTS 库加载超时，请刷新页面重试'));
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    // 从多个 CDN 下载所有模型文件并合并
    async function downloadModelFiles(onProgress) {
        if (modelBlobs) return modelBlobs;

        const blobs = {};
        const total = MODEL_FILES.length;

        for (let i = 0; i < total; i++) {
            const file = MODEL_FILES[i];
            const pct = Math.round(i / total * 100);
            const shortName = file.split('/').pop();

            if (onProgress) onProgress('loading', pct, '下载 ' + shortName + '...');

            // 尝试多个下载源
            let lastErr = null;
            let downloaded = false;
            for (let baseIdx = 0; baseIdx < CDN_BASES.length && !downloaded; baseIdx++) {
                const url = CDN_BASES[baseIdx] + '/' + file;
                for (let attempt = 1; attempt <= 2 && !downloaded; attempt++) {
                    try {
                        const resp = await fetch(url);
                        if (!resp.ok) throw new Error('HTTP ' + resp.status);
                        blobs[file] = await resp.blob();
                        downloaded = true;
                    } catch (err) {
                        lastErr = err;
                        if (attempt < 2) {
                            await new Promise(r => setTimeout(r, 500));
                        }
                    }
                }
            }
            if (!downloaded) {
                throw new Error('下载失败: ' + shortName + ' - ' + (lastErr ? lastErr.message : 'unknown'));
            }
        }

        // 合并模型分片
        if (onProgress) onProgress('loading', 95, '合并模型文件...');
        const modelBlob = new Blob([
            blobs['onnx/model_quantized.onnx.partaa'],
            blobs['onnx/model_quantized.onnx.partab'],
            blobs['onnx/model_quantized.onnx.partac'],
            blobs['onnx/model_quantized.onnx.partad'],
            blobs['onnx/model_quantized.onnx.partae'],
            blobs['onnx/model_quantized.onnx.partaf'],
            blobs['onnx/model_quantized.onnx.partag']
        ], { type: 'application/octet-stream' });

        modelBlobs = {
            'config.json': blobs['config.json'],
            'tokenizer.json': blobs['tokenizer.json'],
            'tokenizer_config.json': blobs['tokenizer_config.json'],
            'model_quantized.onnx': modelBlob,
            'zf_xiaobei.bin': blobs['voices/zf_xiaobei.bin'],
            'zf_xiaoni.bin': blobs['voices/zf_xiaoni.bin'],
            'zf_xiaoxiao.bin': blobs['voices/zf_xiaoxiao.bin'],
            'zf_xiaoyi.bin': blobs['voices/zf_xiaoyi.bin']
        };

        if (onProgress) onProgress('loading', 100, '模型下载完成');
        return modelBlobs;
    }

    // 安装 fetch 拦截器，让 Transformers.js 从本地缓存读取模型文件
    function installFetchInterceptor() {
        if (global._kokoroFetchInterceptorInstalled) return;
        global._kokoroFetchInterceptorInstalled = true;

        const originalFetch = global.fetch.bind(global);
        global.fetch = async function(url, options) {
            const urlStr = typeof url === 'string' ? url : (url && url.url) || '';

            if (modelBlobs) {
                // 配置文件
                if (urlStr.endsWith('/config.json') && modelBlobs['config.json']) {
                    return new Response(modelBlobs['config.json']);
                }
                if (urlStr.endsWith('/tokenizer.json') && modelBlobs['tokenizer.json']) {
                    return new Response(modelBlobs['tokenizer.json']);
                }
                if (urlStr.endsWith('/tokenizer_config.json') && modelBlobs['tokenizer_config.json']) {
                    return new Response(modelBlobs['tokenizer_config.json']);
                }
                // 模型主文件
                if (urlStr.includes('model_quantized.onnx') && modelBlobs['model_quantized.onnx']) {
                    return new Response(modelBlobs['model_quantized.onnx']);
                }
                // 声音文件
                const voiceMatch = urlStr.match(/voices\/(zf_[a-z]+\.bin)/);
                if (voiceMatch && modelBlobs[voiceMatch[1]]) {
                    return new Response(modelBlobs[voiceMatch[1]]);
                }
            }

            return originalFetch(url, options);
        };
    }

    /**
     * 加载模型（只加载一次）
     */
    function load(onProgress) {
        if (ttsInstance) return Promise.resolve(ttsInstance);
        if (loadPromise) return loadPromise;

        loadPromise = (async () => {
            if (onProgress) onProgress('loading', 0, '正在加载 Kokoro 引擎...');

            // 等待 ES module 加载完成
            await waitForLibrary();

            if (onProgress) onProgress('loading', 2, '检测到 WebGPU 加速');

            // 从 jsDelivr CDN 下载模型文件（国内速度快）
            await downloadModelFiles(onProgress);

            // 安装 fetch 拦截器，让 Transformers.js 读本地文件
            installFetchInterceptor();

            if (onProgress) onProgress('loading', 98, '正在加载模型...');

            // 加载模型（从本地缓存读取，不走网络）
            ttsInstance = await global.KokoroTTS.from_pretrained(MODEL_ID, {
                dtype: 'q8',
                device: 'webgpu',
                progress_callback: (progress) => {
                    if (!onProgress) return;
                    const status = progress.status || '';
                    if (status === 'done') {
                        onProgress('loading', 100, '模型加载完成');
                    }
                }
            });

            if (onProgress) onProgress('loading', 100, '模型已就绪，可以合成');
            return ttsInstance;
        })();

        return loadPromise;
    }

    /**
     * 合成语音
     */
    async function synthesize(text, voiceKey, speed, onProgress) {
        if (!text || !text.trim()) throw new Error('Text is empty');

        const tts = await load(onProgress);

        if (onProgress) onProgress('synth', 10, '正在合成语音...');

        const audio = await tts.generate(text, {
            voice: voiceKey || 'zf_xiaobei',
            speed: speed || 1.0
        });

        if (onProgress) onProgress('synth', 100, '合成完成');

        const blob = audio.toBlob();
        return blob;
    }

    function isLoaded() { return !!ttsInstance; }

    global.KokoroWrapper = {
        synthesize,
        load,
        isLoaded,
        AVAILABLE_VOICES,
        getVoices: () => AVAILABLE_VOICES.slice()
    };
})(window);
