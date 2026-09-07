// sherpa-tts-worker.js
// sherpa-onnx TTS Web Worker - 官方浏览器版 WASM，按官方规范写法

let tts = null;
let isReady = false;
let baseUrl = '';
let modelBaseUrl = '';

// 消息处理
self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === 'init') {
    baseUrl = payload.baseUrl;
    modelBaseUrl = payload.modelBaseUrl;
    await initTts();
  } else if (type === 'generate') {
    if (!isReady || !tts) {
      self.postMessage({ type: 'error', message: 'TTS not ready' });
      return;
    }
    try {
      self.postMessage({ type: 'status', message: '正在合成语音...' });
      const audio = tts.generate({
        text: payload.text,
        sid: payload.sid || 0,
        speed: payload.speed || 1.0,
      });
      self.postMessage({
        type: 'audio',
        samples: audio.samples,
        sampleRate: audio.sampleRate,
      }, [audio.samples.buffer]);
    } catch (err) {
      self.postMessage({ type: 'error', message: '合成失败: ' + err.message });
    }
  } else if (type === 'destroy') {
    if (tts) {
      tts.free();
      tts = null;
      isReady = false;
    }
    self.postMessage({ type: 'destroyed' });
  }
};

async function initTts() {
  try {
    self.postMessage({ type: 'status', message: '正在加载 WASM 运行时...' });

    // 官方浏览器版写法：先设置 self.Module 配置对象，再 importScripts
    self.Module = {
      locateFile: function (path) {
        if (path.endsWith('.wasm')) {
          return baseUrl + 'sherpa-onnx.wasm';
        }
        return baseUrl + path;
      },
      setStatus: function (status) {
        if (status) {
          self.postMessage({ type: 'status', message: status });
        }
      },
      onRuntimeInitialized: function () {
        self.postMessage({ type: 'status', message: '正在加载语音模型...' });
        try {
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

          tts = new OfflineTts(config, self.Module);
          isReady = true;

          self.postMessage({
            type: 'ready',
            sampleRate: tts.sampleRate,
            numSpeakers: tts.numSpeakers,
          });
        } catch (err) {
          self.postMessage({ type: 'error', message: '模型加载失败: ' + err.message });
        }
      },
    };

    // 加载 WASM 胶水代码和 TTS 封装（加版本号防缓存）
    const ver = '?v=20260908b';
    importScripts(baseUrl + 'sherpa-onnx-wasm.js' + ver);
    importScripts(baseUrl + 'sherpa-onnx-tts.js' + ver);

    // 如果 WASM 已经同步初始化完成（某些浏览器），手动触发
    if (self.Module.calledRun) {
      self.Module.onRuntimeInitialized();
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: '初始化失败: ' + err.message });
  }
}
