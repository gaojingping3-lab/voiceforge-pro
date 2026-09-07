// sherpa-tts-worker.js
// 基于官方 sherpa-onnx WASM TTS Worker，模型已打包进 .data 文件

let tts = null;
const VERSION = '?v=20260908i';
let wasmLogs = [];

self.Module = {
  locateFile: function (path, scriptDirectory) {
    wasmLogs.push('[locateFile] ' + path);
    if (path.endsWith('.wasm')) return '/sherpa/sherpa-onnx.wasm' + VERSION;
    if (path.endsWith('.data')) return '/sherpa/sherpa-onnx.data' + VERSION;
    return '/sherpa/' + path;
  },
  setStatus: function (status) {
    if (status) {
      self.postMessage({ type: 'status', message: status });
    }
  },
  print: function (text) {
    wasmLogs.push('[stdout] ' + text);
    if (wasmLogs.length > 80) wasmLogs.shift();
  },
  printErr: function (text) {
    wasmLogs.push('[stderr] ' + text);
    if (wasmLogs.length > 80) wasmLogs.shift();
  },
  onRuntimeInitialized: function () {
    self.postMessage({ type: 'status', message: 'WASM运行时已初始化，检查文件系统...' });

    // 尝试检查虚拟文件系统
    let fsInfo = 'FS不可用';
    try {
      const FS = self.Module.FS || self.FS || (typeof Module !== 'undefined' ? Module.FS : null);
      if (FS && FS.analyzePath) {
        const files = ['model.onnx', 'lexicon.txt', 'tokens.txt', 'phone.fst', 'date.fst', 'number.fst'];
        fsInfo = files.map(f => f + ':' + (FS.analyzePath('/' + f).exists ? 'OK' : 'MISSING')).join(' ');
      }
    } catch (e) {
      fsInfo = 'FS检查异常: ' + e.message;
    }
    wasmLogs.push('[fs] ' + fsInfo);

    self.postMessage({ type: 'status', message: '文件系统: ' + fsInfo + ', 正在创建TTS...' });

    try {
      const config = {
        offlineTtsModelConfig: {
          offlineTtsVitsModelConfig: {
            model: '/model.onnx',
            lexicon: '/lexicon.txt',
            tokens: '/tokens.txt',
            dataDir: '',
            noiseScale: 0.667,
            noiseScaleW: 0.8,
            lengthScale: 1.0,
          },
          numThreads: 1,
          debug: 1,
          provider: 'cpu',
        },
        ruleFsts: '/phone.fst,/date.fst,/number.fst',
        ruleFars: '',
        maxNumSentences: 1,
      };

      // 手动初始化配置并创建TTS，检查handle是否为0
      const wasmConfig = initSherpaOnnxOfflineTtsConfig(config, self.Module);
      const handle = self.Module._SherpaOnnxCreateOfflineTts(wasmConfig.ptr);
      freeConfig(wasmConfig, self.Module);

      self.postMessage({ type: 'status', message: 'TTS handle=' + handle + ', logs=' + wasmLogs.slice(-5).join(' | ') });

      if (!handle) {
        throw new Error('SherpaOnnxCreateOfflineTts返回0（模型加载失败）。WASM日志: ' + wasmLogs.join('\n'));
      }

      // handle有效，手动构造OfflineTts对象
      tts = {
        handle: handle,
        sampleRate: self.Module._SherpaOnnxOfflineTtsSampleRate(handle),
        numSpeakers: self.Module._SherpaOnnxOfflineTtsNumSpeakers(handle),
        Module: self.Module,
        generate: function (genConfig) {
          const textLen = this.Module.lengthBytesUTF8(genConfig.text) + 1;
          const textPtr = this.Module._malloc(textLen);
          this.Module.stringToUTF8(genConfig.text, textPtr, textLen);
          const cfgWasm = initSherpaOnnxGenerationConfig({
            sid: genConfig.sid ?? 0,
            speed: genConfig.speed ?? 1.0,
          }, this.Module);
          const h = this.Module._SherpaOnnxOfflineTtsGenerateWithConfig(
            this.handle, textPtr, cfgWasm.ptr, 0, 0);
          freeSherpaOnnxGenerationConfig(cfgWasm, this.Module);
          this.Module._free(textPtr);
          if (!h) throw new Error('TTS generation failed');
          const base = h / 4;
          const samplesPtr = this.Module.HEAPU32[base];
          const numSamples = this.Module.HEAP32[base + 1];
          const sampleRate = this.Module.HEAP32[base + 2];
          const samples = new Float32Array(numSamples);
          samples.set(this.Module.HEAPF32.subarray(samplesPtr / 4, samplesPtr / 4 + numSamples));
          this.Module._SherpaOnnxDestroyOfflineTtsGeneratedAudio(h);
          return { samples: samples, sampleRate: sampleRate };
        },
        free: function () {
          if (this.handle) {
            this.Module._SherpaOnnxDestroyOfflineTts(this.handle);
            this.handle = 0;
          }
        },
      };

      self.postMessage({
        type: 'ready',
        sampleRate: tts.sampleRate,
        numSpeakers: tts.numSpeakers,
      });
    } catch (e) {
      let detail;
      if (e instanceof Error) {
        detail = e.message + (e.stack ? '\n' + e.stack : '');
      } else if (typeof e === 'object' && e !== null) {
        detail = JSON.stringify(e);
      } else {
        detail = String(e);
      }
      detail += '\nWASM日志: ' + wasmLogs.join('\n');
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
