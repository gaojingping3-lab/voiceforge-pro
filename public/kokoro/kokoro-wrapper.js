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

    /**
     * 加载模型（只加载一次）
     * @param {function} onProgress - (stage, percent) => void
     */
    function load(onProgress) {
        if (ttsInstance) return Promise.resolve(ttsInstance);
        if (loadPromise) return loadPromise;

        loadPromise = (async () => {
            if (!global.KokoroTTS) {
                throw new Error('KokoroTTS 库未加载，请检查 index.html 中的 script 引入');
            }

            if (onProgress) onProgress('loading', 0);

            // 检测 WebGPU 支持
            let device = 'wasm';
            try {
                if (navigator.gpu) {
                    const adapter = await navigator.gpu.requestAdapter();
                    if (adapter) device = 'webgpu';
                }
            } catch (e) { /* 回退 WASM */ }

            ttsInstance = await global.KokoroTTS.from_pretrained(MODEL_ID, {
                dtype: 'q8',
                device: device,
                // 使用国内镜像加速下载
                envConfig: {
                    remoteHost: 'https://hf-mirror.com'
                },
                progress_callback: (progress) => {
                    if (onProgress && progress.status === 'downloading') {
                        const pct = progress.progress ? Math.round(progress.progress * 100) : 0;
                        onProgress('loading', pct);
                    } else if (onProgress && progress.status === 'compiling') {
                        onProgress('compiling', 50);
                    }
                }
            });

            if (onProgress) onProgress('loading', 100);
            return ttsInstance;
        })();

        return loadPromise;
    }

    /**
     * 合成语音
     * @param {string} text - 中文文本
     * @param {string} voiceKey - 声音 key
     * @param {number} speed - 语速 0.5~2.0
     * @param {function} onProgress - (stage, percent) => void
     * @returns {Promise<Blob>} WAV 音频 Blob
     */
    async function synthesize(text, voiceKey, speed, onProgress) {
        if (!text || !text.trim()) throw new Error('Text is empty');

        const tts = await load(onProgress);

        if (onProgress) onProgress('synth', 10);

        const audio = await tts.generate(text, {
            voice: voiceKey || 'zf_xiaobei',
            speed: speed || 1.0
        });

        if (onProgress) onProgress('synth', 100);

        // Kokoro 的 audio 对象有 toBlob() 直接返回 WAV Blob
        const blob = audio.toBlob();
        return blob;
    }

    // AudioBuffer -> WAV Blob（备用）
    function audioBufferToWavBlob(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;
        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;
        const dataLength = buffer.length * blockAlign;
        const bufferArray = new ArrayBuffer(44 + dataLength);
        const view = new DataView(bufferArray);

        function writeStr(offset, str) {
            for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
        }

        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + dataLength, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        writeStr(36, 'data');
        view.setUint32(40, dataLength, true);

        const channels = [];
        for (let i = 0; i < numChannels; i++) {
            channels.push(buffer.getChannelData(i));
        }

        let offset = 44;
        for (let i = 0; i < buffer.length; i++) {
            for (let ch = 0; ch < numChannels; ch++) {
                let sample = Math.max(-1, Math.min(1, channels[ch][i]));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                offset += 2;
            }
        }

        return new Blob([bufferArray], { type: 'audio/wav' });
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
