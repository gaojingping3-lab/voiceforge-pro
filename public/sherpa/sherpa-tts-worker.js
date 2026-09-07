// sherpa-tts-worker.js
// sherpa-onnx TTS Web Worker - 在后台线程运行，避免 UI 卡死

let wasmModule = null;
let tts = null;
let isReady = false;
let baseUrl = '';

// 加载 WASM 模块
async function loadWasm() {
  if (wasmModule) return wasmModule;

  // 动态加载 sherpa-onnx-wasm.js（它会定义全局 self.Module 函数）
  self.importScripts(baseUrl + 'sherpa-onnx-wasm.js');
  self.importScripts(baseUrl + 'sherpa-onnx-tts.js');

  // 初始化 WASM 模块（SherpaOnnxWasmModule 是 sherpa-onnx-wasm.js 导出的工厂函数）
  wasmModule = await self.SherpaOnnxWasmModule({
    locateFile: (path) => {
      if (path.endsWith('.wasm')) {
        return baseUrl + 'sherpa-onnx.wasm';
      }
      return baseUrl + path;
    },
    onRuntimeInitialized: () => {
      console.log('[SherpaTTS] WASM runtime initialized');
    }
  });

  return wasmModule;
}

// 初始化 TTS
async function initTts(modelBaseUrl) {
  if (isReady) return { ready: true };

  try {
    self.postMessage({ type: 'status', message: '正在加载 WASM 运行时...' });
    await loadWasm();

    self.postMessage({ type: 'status', message: '正在加载语音模型...' });

    const config = {
      offlineTtsModelConfig: {
        offlineTtsVitsModelConfig: {
          model: modelBaseUrl + 'model.onnx',
          lexicon: modelBaseUrl + 'lexicon.txt',
          tokens: modelBaseUrl + 'tokens.txt',
        },
        numThreads: 1,
        debug: 0,
        provider: 'cpu',
      },
      ruleFsts: modelBaseUrl + 'phone.fst,' + modelBaseUrl + 'date.fst,' + modelBaseUrl + 'number.fst',
      ruleFars: '',
      maxNumSentences: 1,
    };

    // sherpa-onnx-tts.js 里的 OfflineTts 类在 importScripts 后处于全局作用域
    tts = new OfflineTts(config, wasmModule);
    isReady = true;

    self.postMessage({
      type: 'ready',
      sampleRate: tts.sampleRate,
      numSpeakers: tts.numSpeakers,
    });

    return { ready: true };
  } catch (err) {
    self.postMessage({ type: 'error', message: '初始化失败: ' + err.message });
    throw err;
  }
}

// 合成音频
function generate(text, sid = 0, speed = 1.0) {
  if (!isReady || !tts) {
    throw new Error('TTS not ready');
  }

  const result = tts.generate({ text, sid, speed });
  return result;
}

// 消息处理
self.onmessage = async (e) => {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case 'init':
        baseUrl = payload.baseUrl;
        await initTts(payload.modelBaseUrl);
        break;

      case 'generate':
        self.postMessage({ type: 'status', message: '正在合成语音...' });
        const result = generate(payload.text, payload.sid || 0, payload.speed || 1.0);
        // 传输 Float32Array 的 buffer 以提高性能
        self.postMessage({
          type: 'audio',
          samples: result.samples,
          sampleRate: result.sampleRate,
        }, [result.samples.buffer]);
        break;

      case 'destroy':
        if (tts) {
          tts.free();
          tts = null;
          isReady = false;
        }
        self.postMessage({ type: 'destroyed' });
        break;
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message });
  }
};
