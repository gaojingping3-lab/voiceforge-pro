/**
 * Kokoro TTS 浏览器端封装
 * 基于 kokoro-js-zh，纯本地 WebGPU/WASM 语音合成
 * 中文女声：小北(zf_xiaobei)、小妮(zf_xiaoni)、小小(zf_xiaoxiao)、小艺(zf_xiaoyi)
 */
(function (global) {
    'use strict';

    const MODEL_ID = 'onnx-community/Kokoro-82M-v1.1-zh-ONNX';
    let ttsInstance = null;
    let loadPromise = null;

    // 可用中文女声
    const AVAILABLE_VOICES = [
        { key: 'zf_xiaobei', name: '小北（年轻女声）' },
        { key: 'zf_xiaoni', name: '小妮（温柔女声）' },
        { key: 'zf_xiaoxiao', name: '小小（明亮女声）' },
        { key: 'zf_xiaoyi', name: '小艺（自然女声）' }
    ];

    // 等待 KokoroTTS 库加载完成（ES module 是异步加载的）
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

    // 从进度对象中提取百分比（Transformers.js 的 progress 已经是 0-100）
    function extractProgress(p) {
        if (!p) return 0;
        // 格式1: { progress: 50 } 已经是 0-100 的百分比
        if (typeof p.progress === 'number' && p.progress >= 0) {
            return Math.min(100, Math.round(p.progress));
        }
        // 格式2: { loaded: 123, total: 456 }
        if (p.loaded && p.total) {
            return Math.min(100, Math.round(p.loaded / p.total * 100));
        }
        // 格式3: { percent: 50 }
        if (typeof p.percent === 'number') {
            return Math.min(100, Math.round(p.percent));
        }
        return 0;
    }

    /**
     * 加载模型（只加载一次，带重试和镜像回退）
     * @param {function} onProgress - (stage, percent, message) => void
     */
    function load(onProgress) {
        if (ttsInstance) return Promise.resolve(ttsInstance);
        if (loadPromise) return loadPromise;

        loadPromise = (async () => {
            if (onProgress) onProgress('loading', 0, '正在加载 Kokoro 引擎...');

            // 等待 ES module 加载完成
            await waitForLibrary();

            if (onProgress) onProgress('loading', 1, '正在检测设备加速能力...');

            // 检测 WebGPU 支持
            let device = 'wasm';
            try {
                if (navigator.gpu) {
                    const adapter = await navigator.gpu.requestAdapter();
                    if (adapter) {
                        device = 'webgpu';
                        if (onProgress) onProgress('loading', 2, '检测到 WebGPU 加速');
                    }
                }
            } catch (e) { /* 回退 WASM */ }

            // 尝试多个镜像源，每个最多重试2次
            const mirrors = [
                { name: 'hf-mirror国内镜像', host: 'https://hf-mirror.com' },
                { name: 'HuggingFace官方', host: 'https://huggingface.co' }
            ];
            const maxRetries = 2;
            let lastError = null;

            for (let m = 0; m < mirrors.length; m++) {
                const mirror = mirrors[m];
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        if (onProgress) {
                            onProgress('loading', 3,
                                '正在下载模型（' + mirror.name + '，约40MB，第' + attempt + '次尝试）...');
                        }

                        ttsInstance = await global.KokoroTTS.from_pretrained(MODEL_ID, {
                            dtype: 'q4',
                            device: device,
                            envConfig: { remoteHost: mirror.host },
                            progress_callback: (progress) => {
                                if (!onProgress) return;
                                const status = progress.status || '';
                                const pct = extractProgress(progress);
                                const file = progress.file || '';
                                const shortFile = file.split('/').pop() || file;

                                if (status === 'done') {
                                    onProgress('loading', 100, shortFile + ' 完成');
                                } else if (shortFile) {
                                    // 统一显示：文件名 + 进度%
                                    onProgress('loading', pct, shortFile + ' ' + pct + '%');
                                }
                            }
                        });

                        // 加载成功
                        if (onProgress) onProgress('loading', 100, '模型加载完成，可以开始合成');
                        return ttsInstance;

                    } catch (err) {
                        lastError = err;
                        const msg = err && err.message ? err.message : String(err);
                        if (onProgress) {
                            onProgress('loading', 0, mirror.name + ' 第' + attempt + '次失败：' + msg);
                        }
                        // 等待2秒后重试
                        if (attempt < maxRetries) {
                            await new Promise(r => setTimeout(r, 2000));
                        }
                    }
                }
                // 当前镜像失败，切换到下一个镜像
                if (m < mirrors.length - 1) {
                    if (onProgress) onProgress('loading', 0, '切换到' + mirrors[m + 1].name + '...');
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

            // 所有镜像都失败
            loadPromise = null;
            const msg = lastError && lastError.message ? lastError.message : String(lastError);
            throw new Error('模型下载失败：' + msg + '。请检查网络后重试。');
        })();

        return loadPromise;
    }

    /**
     * 合成语音
     * @param {string} text - 中文文本
     * @param {string} voiceKey - 声音 key
     * @param {number} speed - 语速 0.5~2.0
     * @param {function} onProgress - (stage, percent, message) => void
     * @returns {Promise<Blob>} WAV 音频 Blob
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

        // Kokoro 的 audio 对象有 toBlob() 直接返回 WAV Blob
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
