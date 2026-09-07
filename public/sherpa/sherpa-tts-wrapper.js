// sherpa-tts-wrapper.js
// sherpa-onnx TTS 主线程封装 - 与 Worker 通信，播放音频
// Worker 加载后自动初始化（模型已打包进 .data）

class SherpaTTS {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.sampleRate = 22050;
    this.audioContext = null;
    this.currentSource = null;
    this.onStatus = null;
    this.onReady = null;
    this.onError = null;
    this._readyPromise = null;
  }

  // 初始化（创建 Worker，等待自动初始化完成）
  async init() {
    if (this.isReady) return;
    if (this._readyPromise) return this._readyPromise;

    this._readyPromise = new Promise((resolve, reject) => {
      this.worker = new Worker('/sherpa/sherpa-tts-worker.js?v=20260908c');

      this.worker.onmessage = (e) => {
        const { type, message, sampleRate, numSpeakers } = e.data;

        switch (type) {
          case 'status':
            if (this.onStatus) this.onStatus(message);
            break;

          case 'ready':
            this.isReady = true;
            this.sampleRate = sampleRate;
            if (this.onReady) this.onReady({ sampleRate, numSpeakers });
            resolve({ sampleRate, numSpeakers });
            break;

          case 'error':
            if (this.onError) this.onError(message);
            reject(new Error(message));
            break;
        }
      };

      this.worker.onerror = (err) => {
        const msg = 'Worker error: ' + err.message;
        if (this.onError) this.onError(msg);
        reject(new Error(msg));
      };
    });

    return this._readyPromise;
  }

  // 合成音频（返回 Float32Array）
  async synthesize(text, sid = 0, speed = 1.0) {
    if (!this.isReady) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const handleAudio = (e) => {
        if (e.data.type === 'audio') {
          this.worker.removeEventListener('message', handleAudio);
          resolve({ samples: e.data.samples, sampleRate: e.data.sampleRate });
        } else if (e.data.type === 'error') {
          this.worker.removeEventListener('message', handleAudio);
          reject(new Error(e.data.message));
        }
      };

      this.worker.addEventListener('message', handleAudio);
      this.worker.postMessage({ type: 'generate', text, sid, speed });
    });
  }

  // 合成并播放
  async speak(text, sid = 0, speed = 1.0) {
    const { samples, sampleRate } = await this.synthesize(text, sid, speed);
    await this.playSamples(samples, sampleRate);
  }

  // 播放 Float32Array 音频
  async playSamples(samples, sampleRate) {
    this.stop();

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const buffer = this.audioContext.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel(samples, 0);

    this.currentSource = this.audioContext.createBufferSource();
    this.currentSource.buffer = buffer;
    this.currentSource.connect(this.audioContext.destination);
    this.currentSource.start();

    return new Promise((resolve) => {
      this.currentSource.onended = resolve;
    });
  }

  // 停止播放
  stop() {
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch (e) {}
      this.currentSource = null;
    }
  }

  // 销毁
  destroy() {
    this.stop();
    if (this.worker) {
      this.worker.postMessage({ type: 'destroy' });
      this.worker.terminate();
      this.worker = null;
    }
    this.isReady = false;
    this._readyPromise = null;
  }
}

window.SherpaTTS = SherpaTTS;
