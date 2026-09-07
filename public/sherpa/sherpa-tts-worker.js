// sherpa-tts-worker.js
// 基于官方 sherpa-onnx WASM TTS Worker，模型已打包进 .data 文件

let tts = null;
const VERSION = '?v=20260908f';

self.Module = {
  locateFile: function (path, scriptDirectory) {
    if (path.endsWith('.wasm')) return '/sherpa/sherpa-onnx.wasm' + VERSION;
    if (path.endsWith('.data')) return '/sherpa/sherpa-onnx.data' + VERSION;
    return '/sherpa/' + path;
  },
  setStatus: function (status) {
    if (status) {
      self.postMessage({ type: 'status', message: status });
    }
  },
  onRuntimeInitialized: function () {
    self.postMessage({ type: 'status', message: '正在初始化语音模型...' });
    try {
      const config = {
        offlineTtsModelConfig: {
          offlineTtsVitsModelConfig: {
            model: '/model.onnx',
            lexicon: '/lexicon.txt',
            tokens: '/tokens.txt',
          },
          numThreads: 1,
          debug: 1,
          provider: 'cpu',
        },
        ruleFsts: '/phone.fst,/date.fst,/number.fst',
        ruleFars: '',
        maxNumSentences: 1,
      };
      tts = new OfflineTts(config, self.Module);
      self.postMessage({
        type: 'ready',
        sampleRate: tts.sampleRate,
        numSpeakers: tts.numSpeakers,
      });
    } catch (e) {
      const detail = getErrorMessage(e);
      self.postMessage({ type: 'error', message: '模型初始化失败: ' + detail });
    }
  },
};

importScripts('/sherpa/sherpa-onnx-wasm.js' + VERSION);
importScripts('/sherpa/sherpa-onnx-tts.js' + VERSION);

function getErrorMessage(err) {
  if (err instanceof Error) {
    return err.message + (err.stack ? '\n' + err.stack : '');
  }
  return String(err);
}

self.onmessage = async (e) => {
  const { type, text, sid, speed } = e.data;

  if (type === 'generate') {
    if (!tts) {
      self.postMessage({ type: 'error', message: '模型尚未就绪' });
      return;
    }
    try {
      self.postMessage({ type: 'status', message: '正在合成语音...' });
      const audio = tts.generate({
        text: text,
        sid: sid || 0,
        speed: speed || 1.0,
      });
      self.postMessage(
        {
          type: 'audio',
          samples: audio.samples,
          sampleRate: audio.sampleRate,
        },
        [audio.samples.buffer]
      );
    } catch (err) {
      self.postMessage({ type: 'error', message: '合成失败: ' + getErrorMessage(err) });
    }
  } else if (type === 'destroy') {
    if (tts) {
      tts.free();
      tts = null;
    }
    self.postMessage({ type: 'destroyed' });
  }
};
