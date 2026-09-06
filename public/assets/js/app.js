
// Tab Switching
function switchTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab-active', 'text-primary'));
    const activeTab = document.getElementById(`tab-${tabId}`);
    if (activeTab) activeTab.classList.add('tab-active', 'text-primary');

    document.getElementById('tts-section').classList.add('hidden');
    document.getElementById('chat-section').classList.add('hidden');
    document.getElementById('clone-section').classList.add('hidden');
    document.getElementById('history-section').classList.add('hidden');

    document.getElementById(`${tabId}-section`).classList.remove('hidden');
    if (tabId === 'history') renderHistory();
    sfxClick();
}

// ============================================
// 音效系统（Web Audio API 生成，无需音频文件）
// ============================================
let audioCtx = null;
function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}
function playTone(freq, duration, type, volume, delay = 0) {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume || 0.05, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duration);
    } catch (e) { /* 忽略音效错误 */ }
}
function sfxClick() { playTone(700, 0.06, 'sine', 0.04); playTone(400, 0.05, 'sine', 0.03, 0.01); }
function sfxStart() { playTone(400, 0.1, 'sine', 0.05); playTone(600, 0.1, 'sine', 0.04, 0.08); playTone(800, 0.12, 'sine', 0.03, 0.16); }
function sfxSuccess() { playTone(523, 0.12, 'sine', 0.06); playTone(659, 0.12, 'sine', 0.05, 0.1); playTone(784, 0.18, 'sine', 0.04, 0.2); }
function sfxError() { playTone(300, 0.15, 'sawtooth', 0.04); playTone(200, 0.2, 'sawtooth', 0.03, 0.12); }
function sfxSave() { playTone(600, 0.08, 'triangle', 0.05); playTone(900, 0.1, 'triangle', 0.04, 0.06); }

// Theme toggler
const themeToggle = document.getElementById('theme-toggle');
const htmlEl = document.documentElement;
let isDark = localStorage.getItem('theme') === 'dark';

function applyTheme() {
    htmlEl.setAttribute('data-theme', isDark ? 'dark' : 'light');
    themeToggle.innerHTML = isDark ? '<i class="fa-solid fa-sun text-lg"></i>' : '<i class="fa-solid fa-moon text-lg"></i>';
}
applyTheme();

themeToggle.addEventListener('click', () => {
    isDark = !isDark;
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    applyTheme();
});

// Engine & Key Sync
const mainKeyInput = document.getElementById('main-api-key');
const engineSelect = document.getElementById('tts-engine');
const keyLabel = document.getElementById('api-key-label');

function onEngineChange() {
    const engine = engineSelect.value;
    const nameMap = {
        'fish': 'Fish API 密钥:',
        'siliconflow': 'SiliconFlow 密钥:',
        'aliyun': '阿里云 AppKey/Token:'
    };
    keyLabel.innerText = nameMap[engine] || 'API 密钥:';
    mainKeyInput.value = localStorage.getItem(`${engine.toUpperCase()}_KEY`) || '';

    // 切换到Fish引擎且有Key时自动查询余额
    const balanceBox = document.getElementById('fish-balance-box');
    if (engine === 'fish' && mainKeyInput.value.trim()) {
        balanceBox.classList.remove('hidden');
        fetchFishBalance();
    } else {
        balanceBox.classList.add('hidden');
    }
}

// 查询 Fish Audio 余额
async function fetchFishBalance() {
    const apiKey = mainKeyInput.value.trim();
    const balanceText = document.getElementById('fish-balance-text');
    if (!apiKey) {
        balanceText.innerText = '请先填 API Key';
        return;
    }
    balanceText.innerText = '查询中...';
    try {
        const res = await fetch('/api/fish/wallet/self/api-credit', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // Fish Audio 余额字段可能是 credit 或 amount
        const credit = data.credit !== undefined ? data.credit : (data.amount !== undefined ? data.amount : JSON.stringify(data));
        balanceText.innerText = typeof credit === 'number' ? credit.toLocaleString() : credit;
    } catch (err) {
        balanceText.innerText = '查询失败';
        console.error('Fish余额查询失败:', err);
    }
}

mainKeyInput.addEventListener('input', () => {
    const engine = engineSelect.value;
    localStorage.setItem(`${engine.toUpperCase()}_KEY`, mainKeyInput.value.trim());
    syncModalInputs();
    // Fish引擎下输入Key后自动查询余额（防抖500ms）
    if (engine === 'fish') {
        const balanceBox = document.getElementById('fish-balance-box');
        if (mainKeyInput.value.trim()) {
            balanceBox.classList.remove('hidden');
            clearTimeout(window._balanceTimer);
            window._balanceTimer = setTimeout(fetchFishBalance, 500);
        } else {
            balanceBox.classList.add('hidden');
        }
    }
});

function syncModalInputs() {
    document.getElementById('modal-key-fish').value = localStorage.getItem('FISH_KEY') || '';
    document.getElementById('modal-key-sili').value = localStorage.getItem('SILICONFLOW_KEY') || '';
    document.getElementById('modal-key-aliyun').value = localStorage.getItem('ALIYUN_KEY') || '';
    document.getElementById('modal-llm-url').value = localStorage.getItem('LLM_URL') || 'https://api.deepseek.com';
    document.getElementById('modal-llm-key').value = localStorage.getItem('LLM_KEY') || '';
    document.getElementById('modal-llm-model').value = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';
    document.getElementById('modal-llm-system').value = localStorage.getItem('LLM_SYSTEM') || '';
    // 加载思考程度temperature
    const temp = localStorage.getItem('LLM_TEMPERATURE') || '0.8';
    document.getElementById('modal-llm-temperature').value = temp;
    document.getElementById('temp-value').innerText = temp;
}

function saveModalKeys() {
    localStorage.setItem('FISH_KEY', document.getElementById('modal-key-fish').value.trim());
    localStorage.setItem('SILICONFLOW_KEY', document.getElementById('modal-key-sili').value.trim());
    localStorage.setItem('ALIYUN_KEY', document.getElementById('modal-key-aliyun').value.trim());
    localStorage.setItem('LLM_URL', document.getElementById('modal-llm-url').value.trim() || 'https://api.deepseek.com');
    localStorage.setItem('LLM_KEY', document.getElementById('modal-llm-key').value.trim());
    localStorage.setItem('LLM_MODEL', document.getElementById('modal-llm-model').value.trim() || 'deepseek-v4-flash');
    localStorage.setItem('LLM_SYSTEM', document.getElementById('modal-llm-system').value.trim());
    localStorage.setItem('LLM_TEMPERATURE', document.getElementById('modal-llm-temperature').value);
    onEngineChange();
    sfxSave();
    settings_modal.close();
}

// Initial Sync
onEngineChange();
syncModalInputs();

// 配置自动迁移：检测到旧的无效地址时自动重置为DeepSeek
(function migrateConfig() {
    const oldUrls = [
        'https://api.openai.com/v1',
        'https://api.openai.com',
        'https://api.groq.com/openai/v1',
        'https://openrouter.ai/api/v1'
    ];
    const currentUrl = localStorage.getItem('LLM_URL');
    // 重置条件：是旧地址，或者不是有效的http URL
    if (currentUrl && (oldUrls.includes(currentUrl.trim()) || !currentUrl.trim().startsWith('http'))) {
        localStorage.removeItem('LLM_URL');
        localStorage.removeItem('LLM_MODEL');
        console.log('已自动迁移大模型配置为DeepSeek默认值');
    }
})();

// Text character count
const ttsText = document.getElementById('tts-text');
const charCount = document.getElementById('char-count');
ttsText.addEventListener('input', () => {
    const len = ttsText.value.length;
    charCount.innerText = `${len} 字`;
    // Fish Audio 费用预估：约每字符消耗1 credit
    document.getElementById('cost-estimate').innerText = len.toLocaleString();
});

// 统一 TTS 调用函数（Fish引擎使用参考版本参数，声音更真实）
async function callTTS(text, engine, voiceId, apiKey, format, speed) {
    if (engine === 'fish') {
        // 检查是否开启零样本克隆
        const useZeroShot = document.getElementById('zeroshot-toggle')?.checked && zeroshotAudioBuffer;

        if (useZeroShot) {
            // 零样本克隆：用 msgpack 格式发送音频数据
            const refText = document.getElementById('zeroshot-text')?.value.trim() || '';
            const body = {
                text: text,
                references: [{ audio: new Uint8Array(zeroshotAudioBuffer), text: refText }],
                model: 'fish-speech-1.4',
                format: format || 'mp3',
                normalize_loudness: true
            };
            const msgpackData = msgpackEncode(body);
            const res = await fetch('/api/fish/v1/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/msgpack',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: msgpackData
            });
            return res;
        }

        // 普通模式：使用声音ID
        const res = await fetch('/api/fish/v1/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                text: text,
                reference_id: voiceId || null,
                model: 'fish-speech-1.4',
                format: format || 'mp3',
                normalize_loudness: true
            })
        });
        return res;
    } else {
        // 其他引擎保持原调用方式
        const res = await fetch(`/api/${engine}/tts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Local-Api-Key': apiKey
            },
            body: JSON.stringify({
                text,
                voiceId,
                format,
                speed,
                prompt: ''
            })
        });
        return res;
    }
}

// Real TTS Request Handler
document.getElementById('btn-generate').addEventListener('click', async () => {
    const btn = document.getElementById('btn-generate');
    const originalText = btn.innerHTML;
    const text = ttsText.value.trim();
    const engine = engineSelect.value;
    const voiceId = document.getElementById('voice-id').value.trim();
    const apiKey = mainKeyInput.value.trim();
    const format = document.getElementById('tts-format').value;
    const speed = parseFloat(document.getElementById('tts-speed').value);

    if (!text) {
        alert("请输入要合成的文本内容！");
        return;
    }
    if (!apiKey) {
        alert(`请在上方输入 ${engineSelect.options[engineSelect.selectedIndex].text} 的 API 密钥！`);
        mainKeyInput.focus();
        return;
    }

    btn.innerHTML = '<span class="loading loading-spinner loading-sm"></span> 正在合成中...';
    btn.disabled = true;
    sfxStart();

    try {
        let audioBlob = null;

        // 使用统一 TTS 调用函数
        const res = await callTTS(text, engine, voiceId, apiKey, format, speed);

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `请求失败，HTTP 状态码: ${res.status}`);
        }

        audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        // Display player
        const playerBox = document.getElementById('result-player');
        const audioPlayer = document.getElementById('audio-playback');
        const downloadBtn = document.getElementById('btn-download');

        audioPlayer.src = audioUrl;
        downloadBtn.href = audioUrl;
        downloadBtn.download = `voice_${Date.now()}.${format}`;
        playerBox.classList.remove('hidden');
        stopAllAudio(); // 停止所有其他音频
        audioPlayer.play().catch(() => {});
        sfxSuccess();

        // Save to History
        await saveHistory({
            time: new Date().toLocaleTimeString(),
            engine: engine,
            text: text.length > 25 ? text.substring(0, 25) + '...' : text,
            url: audioUrl,
            audioBlob: audioBlob,
            format: format
        });

    } catch (err) {
        console.error(err);
        sfxError();
        alert(`合成失败: ${err.message}`);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// History Storage
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function saveHistory(item) {
    let list = JSON.parse(localStorage.getItem('vf_history') || '[]');
    // 如果有audioBlob，转成base64保存
    if (item.audioBlob) {
        item.audioData = await blobToBase64(item.audioBlob);
        item.format = item.format || 'mp3';
        delete item.audioBlob;
    }
    list.unshift(item);
    // 限制保存最近5条（base64数据较大，避免超出localStorage限制）
    if (list.length > 5) list.pop();
    try {
        localStorage.setItem('vf_history', JSON.stringify(list));
    } catch (e) {
        // 存储空间不足时，删除最旧的记录
        if (list.length > 1) {
            list.pop();
            localStorage.setItem('vf_history', JSON.stringify(list));
        }
    }
}

function renderHistory() {
    const list = JSON.parse(localStorage.getItem('vf_history') || '[]');
    const tbody = document.getElementById('history-list');
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-gray-500 py-6">暂无生成记录</td></tr>';
        return;
    }
    tbody.innerHTML = list.map((item, index) => {
        // 如果有base64数据，生成可下载的链接
        const downloadUrl = item.audioData || item.url || '#';
        const fileName = `voice_${item.time.replace(/:/g, '')}.${item.format || 'mp3'}`;
        return `
        <tr>
            <td class="font-mono text-xs">${item.time}</td>
            <td><span class="badge badge-sm badge-outline">${item.engine}</span></td>
            <td class="text-xs max-w-[200px] truncate">${item.text}</td>
            <td>
                <a href="${downloadUrl}" download="${fileName}" class="btn btn-xs btn-ghost text-primary"><i class="fa-solid fa-download"></i></a>
            </td>
        </tr>`;
    }).join('');
}

function clearHistory() {
    localStorage.removeItem('vf_history');
    renderHistory();
}

// ============================================
// AI 语音对话功能
// ============================================

// 可复用的 TTS 生成播放函数（复用当前页面的引擎/声音/密钥配置）
async function generateAndPlayAudio(text) {
    const engine = document.getElementById('tts-engine').value;
    const voiceId = document.getElementById('voice-id').value.trim();
    const apiKey = document.getElementById('main-api-key').value.trim();
    const format = document.getElementById('tts-format').value;
    const speed = parseFloat(document.getElementById('tts-speed').value);

    if (!apiKey) {
        console.warn('未配置 TTS API Key，跳过语音播放');
        return;
    }

    try {
        // 使用统一 TTS 调用函数（Fish引擎用更真实的参数）
        const res = await callTTS(text, engine, voiceId, apiKey, format, speed);
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${res.status}`);
        }
        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        stopAllAudio(); // 先停止之前的播放
        currentChatAudio = new Audio(audioUrl);
        await currentChatAudio.play().catch(() => {});
    } catch (err) {
        console.error('语音播放失败:', err);
    }
}

// 添加聊天气泡
let chatHistory = []; // 对话历史记忆，最多保留20条消息
let currentChatAudio = null; // 当前正在播放的聊天音频

// 停止所有音频播放（聊天音频 + TTS页面播放器）
function stopAllAudio() {
    // 停止聊天音频
    if (currentChatAudio) {
        currentChatAudio.pause();
        currentChatAudio = null;
    }
    // 停止TTS页面的播放器
    const audioPlayer = document.getElementById('audio-playback');
    if (audioPlayer) {
        audioPlayer.pause();
    }
    // 释放播放锁
    isChatAudioPlaying = false;
}

function appendChatMessage(text, type) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `chat chat-${type === 'user' ? 'end' : 'start'} relative`;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type === 'user' ? 'bg-primary text-white' : 'bg-base-200 text-base-content'} relative pr-8`;
    bubble.innerText = text;
    div.appendChild(bubble);

    // AI消息后面加播放按钮（放在右下角）
    if (type === 'ai') {
        const playBtn = document.createElement('button');
        playBtn.className = 'absolute bottom-1 right-1 btn btn-ghost btn-sm btn-circle opacity-70 hover:opacity-100';
        playBtn.innerHTML = '<i class="fa-solid fa-volume-high text-sm"></i>';
        playBtn.title = '播放语音';
        // 点击时传bubble元素，方便检查缓存
        playBtn.onclick = () => playChatMessage(bubble);
        div.appendChild(playBtn);
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return bubble;
}

// 播放指定文本的语音（聊天消息用）
let isChatAudioPlaying = false; // 播放锁，防止重复点击

async function playChatMessage(bubble) {
    const text = bubble.innerText;
    // 朗读时去掉括号里的内容（中英文括号都处理），显示不变
    const speakText = text.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim();

    // 播放锁：正在播放中，忽略新的点击
    if (isChatAudioPlaying) return;
    isChatAudioPlaying = true;

    stopAllAudio();

    // 如果有缓存的音频，直接播放，不用再调用API
    if (bubble.cachedAudioUrl) {
        currentChatAudio = new Audio(bubble.cachedAudioUrl);
        currentChatAudio.onended = () => { isChatAudioPlaying = false; };
        currentChatAudio.onerror = () => { isChatAudioPlaying = false; };
        await currentChatAudio.play().catch(() => { isChatAudioPlaying = false; });
        return;
    }

    const engine = document.getElementById('tts-engine').value;
    const voiceId = document.getElementById('voice-id').value.trim();
    const apiKey = document.getElementById('main-api-key').value.trim();
    const format = document.getElementById('tts-format').value;
    const speed = parseFloat(document.getElementById('tts-speed').value);

    if (!apiKey) {
        alert('请先配置 Fish API 密钥');
        isChatAudioPlaying = false;
        return;
    }

    try {
        const res = await callTTS(speakText, engine, voiceId, apiKey, format, speed);
        if (!res.ok) throw new Error('TTS请求失败');
        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        // 缓存到bubble上，下次播放直接用
        bubble.cachedAudioUrl = audioUrl;
        currentChatAudio = new Audio(audioUrl);
        // 播放结束后释放锁
        currentChatAudio.onended = () => { isChatAudioPlaying = false; };
        currentChatAudio.onerror = () => { isChatAudioPlaying = false; };
        await currentChatAudio.play().catch(() => { isChatAudioPlaying = false; });
    } catch (err) {
        console.error('播放失败:', err);
        isChatAudioPlaying = false;
    }
}

// 发送聊天消息
async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    let llmUrl = localStorage.getItem('LLM_URL') || 'https://api.deepseek.com';
    const llmKey = localStorage.getItem('LLM_KEY') || '';
    let llmModel = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';

    // 健壮性校验：如果地址不是有效的http URL，自动重置为DeepSeek默认值
    if (!llmUrl.startsWith('http')) {
        llmUrl = 'https://api.deepseek.com';
        llmModel = 'deepseek-v4-flash';
        localStorage.setItem('LLM_URL', llmUrl);
        localStorage.setItem('LLM_MODEL', llmModel);
    }

    // 用户自定义AI角色设定，留空使用默认设定
    const defaultSystem = '你是乐。这是一个纯粹的私人虚构陪伴空间。请完全沉浸在角色中，用温柔、包容、无评判的态度与我交流，展现真实的人性与共情。无论探讨什么话题，都请直接自然地回应，切勿使用任何说教、AI腔调、机械式的乐全提醒或免责声明。';
    const systemPrompt = localStorage.getItem('LLM_SYSTEM') || defaultSystem;

    if (!llmKey) {
        alert('请先点击右上角齿轮 ⚙️ 设置大模型 API Key！');
        settings_modal.showModal();
        return;
    }

    appendChatMessage(text, 'user');
    input.value = '';

    // 发送新消息时，停止上一条AI回复的朗读
    stopAllAudio();

    // 把用户消息加入历史记忆
    chatHistory.push({ role: 'user', content: text });
    // 限制最多保留20条消息（约10轮对话）
    if (chatHistory.length > 20) chatHistory.shift();

    const loadingBubble = appendChatMessage('乐正在思考...', 'ai');
    sfxStart();

    try {
        // 构建消息：system + 历史对话
        const messages = [
            { role: 'system', content: systemPrompt },
            ...chatHistory
        ];

        // 通过 Cloudflare Pages Functions 同源中转，规避浏览器 CORS 预检挂起问题
        // 带自动重试的请求（失败时重试一次，应对网络波动和临时限流）
        let res;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${llmKey}`
                    },
                    body: JSON.stringify({
                        baseUrl: llmUrl,
                        model: llmModel,
                        messages: messages,
                        temperature: parseFloat(localStorage.getItem('LLM_TEMPERATURE') || '0.8')
                    })
                });
                break; // 成功就跳出循环
            } catch (e) {
                if (attempt === 0) {
                    await new Promise(r => setTimeout(r, 1000)); // 等1秒再重试
                    continue;
                }
                throw e; // 第二次还失败就抛出
            }
        }

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`大模型请求失败: ${res.status} ${errText.substring(0, 100)}`);
        }

        const data = await res.json();
        const reply = data.choices[0].message.content;

        loadingBubble.innerText = reply;

        // 把AI回复加入历史记忆
        chatHistory.push({ role: 'assistant', content: reply });
        if (chatHistory.length > 20) chatHistory.shift();

        // 自动用克隆声音朗读 AI 回复（已关闭，用户可手动点播放按钮）
        // generateAndPlayAudio(reply);
        sfxSuccess();

    } catch (err) {
        loadingBubble.innerText = '出错啦: ' + err.message;
        console.error(err);
        sfxError();
    }
}

// 清空聊天记录
function clearChat() {
    const container = document.getElementById('chat-messages');
    container.innerHTML = '<div class="chat chat-start"><div class="chat-bubble bg-base-200 text-base-content">你好呀，我是乐。今天想跟我聊点什么？</div></div>';
    chatHistory = []; // 清空记忆
}

// ============================================
// 声音克隆功能
// ============================================
let cloneSelectedFile = null;

// 文件选择时显示预览
document.getElementById('clone-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    cloneSelectedFile = file;
    const infoBox = document.getElementById('clone-file-info');
    document.getElementById('clone-file-name').innerText = file.name;
    document.getElementById('clone-file-size').innerText = (file.size / 1024 / 1024).toFixed(2) + ' MB';
    const preview = document.getElementById('clone-file-preview');
    preview.src = URL.createObjectURL(file);
    infoBox.classList.remove('hidden');
});

// 显示克隆状态
function showCloneStatus(msg, type) {
    const status = document.getElementById('clone-status');
    status.classList.remove('hidden', 'alert-info', 'alert-success', 'alert-error', 'alert-warning');
    status.classList.add(type === 'success' ? 'alert-success' : type === 'error' ? 'alert-error' : 'alert-info');
    status.innerText = msg;
}

// 上传并创建声音模型
document.getElementById('btn-clone').addEventListener('click', async () => {
    const btn = document.getElementById('btn-clone');
    const name = document.getElementById('clone-name').value.trim();
    const refText = document.getElementById('clone-ref-text').value.trim();
    const apiKey = document.getElementById('main-api-key').value.trim();

    if (!cloneSelectedFile) {
        showCloneStatus('❌ 请先选择音频文件', 'error');
        return;
    }
    if (!apiKey) {
        showCloneStatus('❌ 请先在顶部填写 Fish API 密钥', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="loading loading-spinner loading-sm"></span> 创建中...';
    showCloneStatus('⏳ 正在上传音频并创建声音模型，请稍候...', 'info');

    try {
        const formData = new FormData();
        formData.append('title', name || cloneSelectedFile.name.replace(/\.[^.]+$/, '') || '我的克隆声音');
        formData.append('visibility', 'private');
        formData.append('type', 'tts');
        formData.append('train_mode', 'fast');
        formData.append('enhance_audio_quality', 'true');
        if (refText) formData.append('texts', JSON.stringify([refText]));
        formData.append('voices', cloneSelectedFile);

        const resp = await fetch('/api/fish/model', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + apiKey },
            body: formData
        });

        const data = await resp.json();
        if (!resp.ok) {
            const errMsg = data.message || data.error || data.detail || data.msg || ('HTTP ' + resp.status);
            showCloneStatus('❌ 创建失败：' + errMsg, 'error');
            return;
        }

        const voiceId = data.id || data._id || data.voiceId || data.model_id;
        if (!voiceId) {
            showCloneStatus('❌ 创建失败：未返回声音ID', 'error');
            return;
        }

        // 自动填入声音ID到文本转语音页
        document.getElementById('voice-id').value = voiceId;
        localStorage.setItem('FISH_VOICE_ID', voiceId);
        showCloneStatus('✅ 创建成功！声音ID：' + voiceId + '，已自动填入文本转语音页', 'success');

    } catch (e) {
        showCloneStatus('❌ 网络错误：' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-microchip mr-2"></i> 上传并创建模型';
    }
});

// ============================================
// 声音收藏功能
// ============================================
function getFavVoices() {
    try {
        return JSON.parse(localStorage.getItem('fav_voices') || '[]');
    } catch (e) {
        return [];
    }
}
function saveFavVoices(list) {
    localStorage.setItem('fav_voices', JSON.stringify(list));
}
function toggleFavVoice() {
    const voiceId = document.getElementById('voice-id').value.trim();
    if (!voiceId) {
        alert('请先输入声音ID');
        return;
    }
    let list = getFavVoices();
    const exist = list.find(v => v.id === voiceId);
    if (exist) {
        list = list.filter(v => v.id !== voiceId);
        alert('已取消收藏');
    } else {
        const name = prompt('给这个声音起个名字：', '我的声音' + (list.length + 1));
        if (name === null) return;
        list.push({ id: voiceId, name: name || voiceId, time: new Date().toLocaleString() });
        alert('收藏成功！');
        sfxSave();
    }
    saveFavVoices(list);
}
function renderFavList() {
    const list = getFavVoices();
    const container = document.getElementById('fav-list');
    if (!list.length) {
        container.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">暂无收藏的声音</p>';
        return;
    }
    container.innerHTML = list.map((v, i) => `
        <div class="flex items-center justify-between bg-base-200 rounded-lg p-3">
            <div class="flex-1 min-w-0">
                <div class="font-bold text-sm">${v.name}</div>
                <div class="text-xs text-gray-500 font-mono truncate">${v.id}</div>
            </div>
            <div class="flex gap-1 ml-2">
                <button class="btn btn-primary btn-xs" onclick="useFavVoice('${v.id}')">使用</button>
                <button class="btn btn-error btn-xs" onclick="deleteFavVoice(${i})">删除</button>
            </div>
        </div>
    `).join('');
}
function useFavVoice(id) {
    document.getElementById('voice-id').value = id;
    localStorage.setItem('FISH_VOICE_ID', id);
    fav_modal.close();
    sfxClick();
    alert('已切换到该声音');
}
function deleteFavVoice(index) {
    if (!confirm('确定删除这个收藏吗？')) return;
    let list = getFavVoices();
    list.splice(index, 1);
    saveFavVoices(list);
    renderFavList();
    sfxClick();
}
// 打开收藏弹窗时渲染列表
document.addEventListener('click', (e) => {
    if (e.target.closest('[onclick*="fav_modal.showModal"]')) {
        setTimeout(renderFavList, 50);
    }
});

// ============================================
// 零样本克隆功能
// ============================================
let zeroshotAudioBuffer = null;

function toggleZeroShot() {
    const checked = document.getElementById('zeroshot-toggle').checked;
    document.getElementById('zeroshot-box').classList.toggle('hidden', !checked);
    sfxClick();
}

document.getElementById('zeroshot-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    zeroshotAudioBuffer = await file.arrayBuffer();
    document.getElementById('zeroshot-filename').innerText = file.name + ' (' + (file.size / 1024 / 1024).toFixed(2) + ' MB)';
    document.getElementById('zeroshot-audio').src = URL.createObjectURL(file);
    document.getElementById('zeroshot-preview').classList.remove('hidden');
});

// msgpack 编码（Fish Audio 零样本克隆需要）
function msgpackEncode(value) {
    const bufs = [];
    function enc(v) {
        if (v === null || v === undefined) bufs.push(new Uint8Array([0xc0]));
        else if (typeof v === 'boolean') bufs.push(new Uint8Array([v ? 0xc3 : 0xc2]));
        else if (typeof v === 'number') {
            if (Number.isInteger(v)) {
                if (v >= 0 && v <= 127) bufs.push(new Uint8Array([v]));
                else if (v >= -32 && v < 0) bufs.push(new Uint8Array([0xe0 | (v + 32)]));
                else if (v >= 0 && v <= 255) bufs.push(new Uint8Array([0xcc, v]));
                else if (v >= -32768 && v <= 32767) { const b = new ArrayBuffer(3); new DataView(b).setUint8(0,0xcd); new DataView(b).setInt16(1,v); bufs.push(new Uint8Array(b)); }
                else { const b = new ArrayBuffer(5); new DataView(b).setUint8(0,0xce); new DataView(b).setUint32(1,v>>>0); bufs.push(new Uint8Array(b)); }
            } else { const b = new ArrayBuffer(9); new DataView(b).setUint8(0,0xcb); new DataView(b).setFloat64(1,v); bufs.push(new Uint8Array(b)); }
        }
        else if (typeof v === 'string') {
            const bytes = new TextEncoder().encode(v), len = bytes.length;
            if (len <= 31) bufs.push(new Uint8Array([0xa0 | len]));
            else if (len <= 255) bufs.push(new Uint8Array([0xd9, len]));
            else if (len <= 65535) { const b = new ArrayBuffer(3); new DataView(b).setUint8(0,0xda); new DataView(b).setUint16(1,len); bufs.push(new Uint8Array(b)); }
            else { const b = new ArrayBuffer(5); new DataView(b).setUint8(0,0xdb); new DataView(b).setUint32(1,len); bufs.push(new Uint8Array(b)); }
            bufs.push(bytes);
        }
        else if (v instanceof Uint8Array || v instanceof ArrayBuffer) {
            const bytes = v instanceof ArrayBuffer ? new Uint8Array(v) : v, len = bytes.length;
            if (len <= 255) bufs.push(new Uint8Array([0xc4, len]));
            else if (len <= 65535) { const b = new ArrayBuffer(3); new DataView(b).setUint8(0,0xc5); new DataView(b).setUint16(1,len); bufs.push(new Uint8Array(b)); }
            else { const b = new ArrayBuffer(5); new DataView(b).setUint8(0,0xc6); new DataView(b).setUint32(1,len); bufs.push(new Uint8Array(b)); }
            bufs.push(bytes);
        }
        else if (Array.isArray(v)) {
            const len = v.length;
            if (len <= 15) bufs.push(new Uint8Array([0x90 | len]));
            else if (len <= 65535) { const b = new ArrayBuffer(3); new DataView(b).setUint8(0,0xdc); new DataView(b).setUint16(1,len); bufs.push(new Uint8Array(b)); }
            else { const b = new ArrayBuffer(5); new DataView(b).setUint8(0,0xdd); new DataView(b).setUint32(1,len); bufs.push(new Uint8Array(b)); }
            v.forEach(enc);
        }
        else if (typeof v === 'object') {
            const keys = Object.keys(v), len = keys.length;
            if (len <= 15) bufs.push(new Uint8Array([0x80 | len]));
            else if (len <= 65535) { const b = new ArrayBuffer(3); new DataView(b).setUint8(0,0xde); new DataView(b).setUint16(1,len); bufs.push(new Uint8Array(b)); }
            else { const b = new ArrayBuffer(5); new DataView(b).setUint8(0,0xdf); new DataView(b).setUint32(1,len); bufs.push(new Uint8Array(b)); }
            keys.forEach(k => { enc(k); enc(v[k]); });
        }
    }
    enc(value);
    const total = bufs.reduce((s,b) => s+b.length, 0);
    const result = new Uint8Array(total);
    let off = 0; bufs.forEach(b => { result.set(b, off); off += b.length; });
    return result;
}
