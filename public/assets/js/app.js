
// ============================================
// 情绪感知系统
// ============================================
const EMOTION_KEYWORDS = {
    happy: ['开心', '高兴', '快乐', '哈哈', '嘻嘻', '太棒了', '好耶', '喜欢', '爱你', '么么', '幸福', '满足', '愉快', '笑'],
    sad: ['难过', '伤心', '想哭', '郁闷', '失落', '沮丧', '心酸', '委屈', '孤独', '寂寞', '痛苦', '悲伤', '哭'],
    angry: ['生气', '气死', '烦', '讨厌', '可恶', '愤怒', '火大', '抓狂', '崩溃', '妈的', '操', '怒'],
    tired: ['累', '疲惫', '困', '没力气', '不想动', '好累', '疲乏', '倦', '没精神', '想睡'],
    anxious: ['焦虑', '紧张', '担心', '害怕', '恐惧', '不安', '慌', '压力', '愁', '纠结'],
    love: ['想你', '抱抱', '亲亲', '爱', '喜欢', '心动', '甜蜜', '依赖', '舍不得', '陪伴']
};

function detectEmotion(text) {
    const scores = {};
    for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
        scores[emotion] = 0;
        for (const kw of keywords) {
            if (text.includes(kw)) scores[emotion] += kw.length; // 长词权重更高
        }
    }
    let maxEmotion = 'neutral';
    let maxScore = 0;
    for (const [emotion, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            maxEmotion = emotion;
        }
    }
    return maxScore > 0 ? maxEmotion : 'neutral';
}

const EMOTION_LABELS = {
    happy: '开心', sad: '难过', angry: '生气', tired: '疲惫',
    anxious: '焦虑', love: '亲昵', neutral: '平静'
};

const EMOTION_PROMPTS = {
    happy: '用户现在心情很好，很开心。请用轻松愉快的语气回应，跟他一起开心，可以开点玩笑。',
    sad: '用户现在情绪低落，难过。请先温柔地安慰他，不要讲大道理，不要说教，静静地陪伴他，让他感受到被理解。',
    angry: '用户现在很生气，烦躁。请先共情他的情绪，不要反驳或说教，帮他发泄情绪，等他平静下来再聊。',
    tired: '用户现在很累，疲惫。请用温柔舒缓的语气回应，关心他有没有休息好，不要聊太复杂的话题，让他放松。',
    anxious: '用户现在焦虑，紧张不安。请安抚他的情绪，给他安全感，帮他理清思路，不要增加他的压力。',
    love: '用户现在在表达亲昵和依赖。请用温暖亲密的语气回应，接受他的感情，让他感受到被爱和被需要。',
    neutral: ''
};

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
    // 浏览器自动播放策略：如果被暂停，尝试恢复
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
}
function playTone(freq, duration, type, volume, delay = 0) {
    try {
        const ctx = getAudioCtx();
        // 再次确认状态
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
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
function sfxClick() { if (!soundEnabled()) return; playTone(700, 0.06, 'sine', 0.04); playTone(400, 0.05, 'sine', 0.03, 0.01); }
function sfxStart() { if (!soundEnabled()) return; playTone(400, 0.1, 'sine', 0.05); playTone(600, 0.1, 'sine', 0.04, 0.08); playTone(800, 0.12, 'sine', 0.03, 0.16); }
function sfxSuccess() { if (!soundEnabled()) return; playTone(523, 0.12, 'sine', 0.06); playTone(659, 0.12, 'sine', 0.05, 0.1); playTone(784, 0.18, 'sine', 0.04, 0.2); }
function sfxError() { if (!soundEnabled()) return; playTone(300, 0.15, 'sawtooth', 0.04); playTone(200, 0.2, 'sawtooth', 0.03, 0.12); }
function sfxSave() { if (!soundEnabled()) return; playTone(600, 0.08, 'triangle', 0.05); playTone(900, 0.1, 'triangle', 0.04, 0.06); }
function sfxSend() { if (!soundEnabled()) return; playTone(800, 0.08, 'sine', 0.04); playTone(1000, 0.06, 'sine', 0.03, 0.05); }
function sfxReceive() { if (!soundEnabled()) return; playTone(880, 0.1, 'sine', 0.05); playTone(1100, 0.15, 'sine', 0.04, 0.08); }
function soundEnabled() { return localStorage.getItem('SOUND_ENABLED') !== '0'; }

// Theme toggler（已替换为高级主题切换，保留旧代码备用）
// const themeToggle = document.getElementById('theme-toggle');
const htmlEl = document.documentElement;
let isDark = localStorage.getItem('theme') === 'dark';

function applyTheme() {
    htmlEl.setAttribute('data-theme', isDark ? 'dark' : 'light');
    // if (themeToggle) themeToggle.innerHTML = isDark ? '<i class="fa-solid fa-sun text-lg"></i>' : '<i class="fa-solid fa-moon text-lg"></i>';
}
applyTheme();

// if (themeToggle) themeToggle.addEventListener('click', () => {
//     isDark = !isDark;
//     localStorage.setItem('theme', isDark ? 'dark' : 'light');
//     applyTheme();
// });

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

// 当前上下文模式（全量/滑动窗口）
let currentCtxMode = 'full';

function toggleRoleConstraint() {
    // 只是切换UI，保存时才存localStorage
    sfxClick();
}

function setCtxMode(mode) {
    currentCtxMode = mode;
    const fullBtn = document.getElementById('ctx-mode-full');
    const slideBtn = document.getElementById('ctx-mode-slide');
    if (mode === 'full') {
        fullBtn.className = 'flex-1 py-2 px-2 rounded-lg border border-primary bg-primary/10 text-primary text-xs';
        slideBtn.className = 'flex-1 py-2 px-2 rounded-lg border border-base-300 text-xs';
    } else {
        slideBtn.className = 'flex-1 py-2 px-2 rounded-lg border border-primary bg-primary/10 text-primary text-xs';
        fullBtn.className = 'flex-1 py-2 px-2 rounded-lg border border-base-300 text-xs';
    }
    sfxClick();
}

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
    // 加载Top-P
    const topp = localStorage.getItem('LLM_TOPP') || '0.9';
    document.getElementById('modal-llm-topp').value = topp;
    document.getElementById('topp-value').innerText = topp;
    // 加载上下文模式
    const ctxMode = localStorage.getItem('CTX_MODE') || 'full';
    setCtxMode(ctxMode);
    // 加载角色强约束开关
    const constraintOn = localStorage.getItem('ROLE_CONSTRAINT');
    document.getElementById('role-constraint-toggle').checked = constraintOn !== '0';
    // 加载音效开关
    document.getElementById('sound-toggle').checked = soundEnabled();
    // 加载双角色模式开关
    const dualToggle = document.getElementById('dual-role-toggle');
    if (dualToggle) {
        dualToggle.checked = localStorage.getItem('DUAL_ROLE_MODE') === '1';
    }
    // 加载双角色对话间隔时间
    const dualInterval = localStorage.getItem('DUAL_INTERVAL') || '6';
    const intervalInput = document.getElementById('dual-interval');
    if (intervalInput) {
        intervalInput.value = dualInterval;
        document.getElementById('dual-interval-value').innerText = dualInterval + '秒';
    }
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
    localStorage.setItem('LLM_TOPP', document.getElementById('modal-llm-topp').value);
    // 保存上下文模式
    localStorage.setItem('CTX_MODE', currentCtxMode);
    // 保存角色强约束开关
    const constraintOn = document.getElementById('role-constraint-toggle').checked;
    localStorage.setItem('ROLE_CONSTRAINT', constraintOn ? '1' : '0');
    // 保存音效开关
    const soundOn = document.getElementById('sound-toggle').checked;
    localStorage.setItem('SOUND_ENABLED', soundOn ? '1' : '0');
    // 保存双角色模式开关
    const dualOn = document.getElementById('dual-role-toggle').checked;
    localStorage.setItem('DUAL_ROLE_MODE', dualOn ? '1' : '0');
    // 保存双角色对话间隔时间
    const dualInterval = document.getElementById('dual-interval').value;
    localStorage.setItem('DUAL_INTERVAL', dualInterval);
    onEngineChange();
    updateModeHint();
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
let chatHistory = []; // 对话历史记忆（永久保存，只有清空才删除）
let currentChatAudio = null; // 当前正在播放的聊天音频

// 永久记忆：保存聊天历史到localStorage
function saveChatHistory() {
    localStorage.setItem('PERM_CHAT_HISTORY', JSON.stringify(chatHistory));
}

// 永久记忆：从localStorage恢复聊天历史
function loadChatHistory() {
    const saved = localStorage.getItem('PERM_CHAT_HISTORY');
    if (saved) {
        try {
            chatHistory = JSON.parse(saved);
        } catch (e) {
            chatHistory = [];
        }
    }
}

// 永久记忆：渲染历史消息到聊天区域
function renderChatHistory() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    container.innerHTML = '';
    if (chatHistory.length === 0) {
        return; // 空聊天，不显示默认欢迎消息
    }
    for (const msg of chatHistory) {
        if (msg.role === 'user') {
            const div = document.createElement('div');
            div.className = 'chat chat-end';
            const bubble = document.createElement('div');
            bubble.className = 'chat-bubble bg-primary text-primary-content';
            bubble.innerText = msg.content;
            div.appendChild(bubble);
            container.appendChild(div);
        } else {
            appendChatMessage(msg.content, 'ai');
        }
    }
    container.scrollTop = container.scrollHeight;
}

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
    // 恢复AudioContext，防止播放完语音后音效不响
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
}

function appendChatMessage(text, type) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `chat chat-${type === 'user' ? 'end' : 'start'} relative msg-enter`;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type === 'user' ? 'bg-primary text-white' : 'bg-base-200 text-base-content'} relative pr-8`;
    // AI消息台词上色，用户消息保持原样
    bubble.innerHTML = type === 'ai' ? formatChatText(text) : escapeHtml(text);
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
    // 读取文字时过滤掉底部的token显示，避免朗读数字
    const text = bubble.innerText.replace(/\n?\d+\s*tokens\s*$/, '').trim();
    // 朗读时去掉括号里的内容（中英文括号、方括号、星号都处理），显示不变
    const speakText = text
        .replace(/【[^】]*】/g, '')
        .replace(/\[[^\]]*\]/g, '')
        .replace(/（[^）]*）/g, '')
        .replace(/\([^)]*\)/g, '')
        .replace(/\*[^*]*\*/g, '')
        .trim();

    // 播放锁：正在播放中，忽略新的点击
    if (isChatAudioPlaying) return;
    isChatAudioPlaying = true;

    stopAllAudio();

    // 如果有缓存的音频，直接播放，不用再调用API
    if (bubble.cachedAudioUrl) {
        currentChatAudio = new Audio(bubble.cachedAudioUrl);
        currentChatAudio.onended = () => { isChatAudioPlaying = false; getAudioCtx().resume().catch(() => {}); };
        currentChatAudio.onerror = () => { isChatAudioPlaying = false; getAudioCtx().resume().catch(() => {}); };
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
        currentChatAudio.onended = () => { isChatAudioPlaying = false; getAudioCtx().resume().catch(() => {}); };
        currentChatAudio.onerror = () => { isChatAudioPlaying = false; getAudioCtx().resume().catch(() => {}); };
        await currentChatAudio.play().catch(() => { isChatAudioPlaying = false; });
    } catch (err) {
        console.error('播放失败:', err);
        isChatAudioPlaying = false;
    }
}

// ============================================
// 思考程度切换（DeepSeek Reasoning）
// ============================================
const REASONING_LABELS = {
    'default': '默认',
    'off': '关闭',
    'low': '低',
    'medium': '中',
    'high': '高'
};

function toggleReasoningMenu() {
    const menu = document.getElementById('reasoning-menu');
    menu.classList.toggle('hidden');
    sfxClick();
}

function setReasoning(level) {
    localStorage.setItem('LLM_REASONING', level);
    updateReasoningBtn(level);
    document.getElementById('reasoning-menu').classList.add('hidden');
    sfxSave();
}

function updateReasoningBtn(level) {
    const btn = document.getElementById('btn-reasoning');
    if (level === 'off') {
        btn.innerHTML = '<i class="fa-solid fa-brain text-base text-gray-400"></i>';
        btn.title = '思考程度：关闭（秒回）';
    } else if (level === 'low') {
        btn.innerHTML = '<i class="fa-solid fa-brain text-base text-blue-400"></i>';
        btn.title = '思考程度：低';
    } else if (level === 'medium') {
        btn.innerHTML = '<i class="fa-solid fa-brain text-base text-yellow-400"></i>';
        btn.title = '思考程度：中';
    } else if (level === 'high') {
        btn.innerHTML = '<i class="fa-solid fa-brain text-base text-red-400"></i>';
        btn.title = '思考程度：高';
    } else {
        btn.innerHTML = '<i class="fa-solid fa-brain text-base"></i>';
        btn.title = '思考程度：默认';
    }
    // 高亮当前选中的选项
    document.querySelectorAll('.reasoning-option').forEach(opt => {
        if (opt.dataset.level === level) {
            opt.classList.add('bg-primary/20', 'text-primary', 'font-bold');
        } else {
            opt.classList.remove('bg-primary/20', 'text-primary', 'font-bold');
        }
    });
}

// 点击页面其他地方关闭菜单
document.addEventListener('click', (e) => {
    const menu = document.getElementById('reasoning-menu');
    const btn = document.getElementById('btn-reasoning');
    if (menu && !menu.classList.contains('hidden') && !e.target.closest('#reasoning-menu') && !e.target.closest('#btn-reasoning')) {
        menu.classList.add('hidden');
    }
});

// 页面加载时恢复思考程度设置
document.addEventListener('DOMContentLoaded', () => {
    const level = localStorage.getItem('LLM_REASONING') || 'default';
    updateReasoningBtn(level);
    initRoleCard();
    loadChatHistory(); // 恢复永久记忆
    renderChatHistory(); // 渲染历史消息
    initVoiceInput(); // 初始化语音输入

    // 恢复双角色模式状态
    if (localStorage.getItem('DUAL_ROLE_MODE') === '1') {
        const dualToggle = document.getElementById('dual-role-toggle');
        if (dualToggle) dualToggle.checked = true;
        toggleDualRoleMode();
    }

    // 第一次用户交互时强制恢复 AudioContext（解决移动端音效不生效）
    const unlockAudio = () => {
        const ctx = getAudioCtx();
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    // 键盘弹出时自动调整，防止输入框被遮挡
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            const vh = window.visualViewport.height;
            document.body.style.height = vh + 'px';
            // 滚动聊天区域到底部
            setTimeout(() => {
                const chat = document.getElementById('chat-messages');
                if (chat) chat.scrollTop = chat.scrollHeight;
            }, 100);
        });
    }

    // 输入聚焦时折叠黄色提示栏，腾出空间
    const chatInput = document.getElementById('chat-input');
    const modeHint = document.getElementById('mode-hint');
    if (chatInput && modeHint) {
        chatInput.addEventListener('focus', () => {
            modeHint.style.maxHeight = '0';
            modeHint.style.opacity = '0';
            modeHint.style.margin = '0';
            modeHint.style.padding = '0';
            modeHint.style.overflow = 'hidden';
            modeHint.style.transition = 'all 0.25s ease';
        });
        chatInput.addEventListener('blur', () => {
            modeHint.style.maxHeight = '';
            modeHint.style.opacity = '';
            modeHint.style.margin = '';
            modeHint.style.padding = '';
            setTimeout(() => { modeHint.style.overflow = ''; }, 300);
        });
    }
});

// 输入框自动增高
function autoResizeInput() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
}

// 输入框键盘事件：Enter发送，Shift+Enter换行
function handleChatKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
    }
}

// 情绪指示器：输入时实时检测情绪
const EMOTION_EMOJIS = {
    happy: '😊', sad: '😢', angry: '😠', tired: '😴',
    anxious: '😰', love: '🥰', neutral: ''
};
function updateEmotionIndicator() {
    const input = document.getElementById('chat-input');
    const indicator = document.getElementById('emotion-indicator');
    if (!input || !indicator) return;
    const text = input.value.trim();
    if (!text) {
        indicator.style.opacity = '0';
        return;
    }
    const emotion = detectEmotion(text);
    if (emotion === 'neutral') {
        indicator.style.opacity = '0';
    } else {
        indicator.innerText = EMOTION_EMOJIS[emotion] || '';
        indicator.style.opacity = '0.8';
        indicator.title = `检测到情绪：${EMOTION_LABELS[emotion]}`;
    }
}

// ============================================
// 语音输入（Web Speech API）
// ============================================
let speechRecognition = null;
let isListening = false;
let isVoiceSending = false; // 防重复发送锁
let voiceFinalResult = '';

function initVoiceInput() {
    const micBtn = document.getElementById('btn-mic');
    if (!micBtn) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        micBtn.style.display = 'none'; // 不支持则隐藏
        return;
    }

    speechRecognition = new SpeechRecognition();
    speechRecognition.lang = 'zh-CN';
    speechRecognition.interimResults = true; // 实时返回中间结果
    speechRecognition.continuous = false; // 说完一句自动停止

    speechRecognition.onstart = () => {
        isListening = true;
        micBtn.classList.add('recording');
        const input = document.getElementById('chat-input');
        if (input) input.placeholder = '正在倾听，请说话...';
    };

    speechRecognition.onresult = (event) => {
        let interim = '';
        voiceFinalResult = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const text = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                voiceFinalResult += text;
            } else {
                interim += text;
            }
        }
        const input = document.getElementById('chat-input');
        if (input) {
            input.value = voiceFinalResult || interim;
            autoResizeInput();
            updateEmotionIndicator();
        }
    };

    speechRecognition.onend = () => {
        isListening = false;
        micBtn.classList.remove('recording');
        const input = document.getElementById('chat-input');
        if (input) input.placeholder = '跟乐说点什么...';

        // 防重复发送锁：有内容且不在发送中才自动发送
        const text = input ? input.value.trim() : '';
        if (text.length > 0 && !isVoiceSending) {
            isVoiceSending = true;
            setTimeout(() => {
                sendChatMessage();
                // 发送完成后解锁（sendChatMessage是async，给个延时确保执行完）
                setTimeout(() => { isVoiceSending = false; }, 1000);
            }, 300); // 稍微等一下，避免识别刚结束就发送
        }
    };

    speechRecognition.onerror = (event) => {
        console.warn('语音识别错误:', event.error);
        isListening = false;
        micBtn.classList.remove('recording');
        const input = document.getElementById('chat-input');
        if (input) input.placeholder = '跟乐说点什么...';
        if (event.error === 'not-allowed') {
            alert('麦克风权限被拒绝，请在浏览器设置中允许访问麦克风');
        }
    };
}

function toggleVoiceInput() {
    if (!speechRecognition) {
        alert('当前浏览器不支持语音输入');
        return;
    }
    if (isListening) {
        speechRecognition.stop();
    } else {
        voiceFinalResult = '';
        try {
            speechRecognition.start();
        } catch (e) {
            console.warn('启动语音识别失败:', e);
        }
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

    // 设置里的角色设定（强制规则）和角色卡（扮演角色）分成两条system消息，模型更容易区分
    const defaultSystem = '你是乐。这是一个纯粹的私人虚构陪伴空间。请完全沉浸在角色中，用温柔、包容、无评判的态度与我交流，展现真实的人性与共情。无论探讨什么话题，都请直接自然地回应，切勿使用任何说教、AI腔调、机械式的安全提醒或免责声明。';
    const customSystem = localStorage.getItem('LLM_SYSTEM');
    const currentRole = getCurrentRole();
    const roleCardDesc = currentRole.desc;
    const systemRules = customSystem || defaultSystem;
    const hasRoleCard = roleCardDesc && roleCardDesc !== DEFAULT_ROLE_DESC;

    if (!llmKey) {
        alert('请先点击右上角齿轮 ⚙️ 设置大模型 API Key！');
        settings_modal.showModal();
        return;
    }

    appendChatMessage(text, 'user');
    input.value = '';
    input.style.height = 'auto'; // 重置输入框高度
    sfxSend();

    // 发送新消息时，停止上一条AI回复的朗读
    stopAllAudio();

    // 把用户消息加入永久记忆
    chatHistory.push({ role: 'user', content: text });
    saveChatHistory(); // 保存到本地，刷新不丢失

    // 创建思考中动画（三点跳动）
    const container = document.getElementById('chat-messages');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat chat-start relative msg-enter';
    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'chat-bubble bg-base-200 text-base-content relative pr-8';
    loadingBubble.innerHTML = '乐正在思考 <span class="thinking-dots"><span></span><span></span><span></span></span>';
    loadingDiv.appendChild(loadingBubble);
    container.appendChild(loadingDiv);
    container.scrollTop = container.scrollHeight;
    sfxStart();

    try {
        // 构建消息：两条system（规则+角色） + 角色强约束（可选） + 历史对话，标准messages数组格式
        const roleConstraints = `【严格第一人称，禁止越权代打】
严禁描写用户的动作、语言、内心想法，绝对禁止替用户做任何剧情推进、决定或者行动。你的回复只能写角色本身的反应，完成角色动作与台词后立刻停止，等待用户继续交互。

【强制神态与动作描写】
输出格式严格固定：*(具体微表情、神态、肢体动作、环境互动细节)*「角色对话台词」。禁止纯文字对白，不能缺少动作描写。

【彻底剥离AI助手腔】
不允许出现客服话术、客套问候、总结旁白、解释性文字。完全代入角色本身，保留角色性格、小缺点、个人习惯，语言风格贴合人设。

【格式范例参考，严格模仿输出风格】
*(指尖轻轻攥了攥衣角，目光微微垂落，声音放得很轻)*「你怎么现在才过来。」`;
        const useConstraint = localStorage.getItem('ROLE_CONSTRAINT') !== '0';
        const messages = [
            { role: 'system', content: systemRules },
        ];
        if (hasRoleCard) {
            messages.push({ role: 'system', content: roleCardDesc });
        }
        // 角色记忆便签（手动录入的用户信息）
        const memoPrompt = formatMemoPrompt(getCurrentRoleId());
        if (memoPrompt) {
            messages.push({ role: 'system', content: memoPrompt });
        }
        // 情绪感知：检测用户当前情绪，调整回复语气
        const emotion = detectEmotion(text);
        if (emotion !== 'neutral' && EMOTION_PROMPTS[emotion]) {
            messages.push({ role: 'system', content: EMOTION_PROMPTS[emotion] });
        }
        if (useConstraint) {
            messages.push({ role: 'system', content: roleConstraints });
        }
        messages.push(...chatHistory);

        // 通过 Cloudflare Pages Functions 同源中转，规避浏览器 CORS 预检挂起问题
        // 带自动重试的请求（失败时重试一次，应对网络波动和临时限流）
        const reasoningLevel = localStorage.getItem('LLM_REASONING') || 'default';
        const useSlideWindow = localStorage.getItem('CTX_MODE') === 'slide';
        const requestBody = {
            baseUrl: llmUrl,
            model: llmModel,
            messages: messages,
            temperature: parseFloat(localStorage.getItem('LLM_TEMPERATURE') || '0.8'),
            top_p: parseFloat(localStorage.getItem('LLM_TOPP') || '0.9'),
            useSlideWindow: useSlideWindow
        };
        // 思考程度控制（支持 V4 系列和 reasoner 模型）
        const isV4OrReasoner = llmModel.toLowerCase().includes('v4') || llmModel.toLowerCase().includes('reasoner');
        if (isV4OrReasoner && reasoningLevel !== 'default') {
            if (reasoningLevel === 'off') {
                // 关闭思考：不思考，秒回，省token
                requestBody.thinking = { type: 'disabled' };
            } else {
                // 开启思考：低/中/高
                const effortMap = { 'low': 'low', 'medium': 'high', 'high': 'max' };
                requestBody.thinking = { type: 'enabled' };
                requestBody.reasoning_effort = effortMap[reasoningLevel] || 'low';
            }
        }
        // 开启流式输出
        requestBody.stream = true;

        let res;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${llmKey}`
                    },
                    body: JSON.stringify(requestBody)
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

        // 流式读取 SSE 响应，逐字显示
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullReply = '';
        let buffer = '';
        let totalTokens = 0;
        loadingBubble.innerText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data:')) continue;
                const dataStr = trimmed.slice(5).trim();
                if (dataStr === '[DONE]') continue;

                try {
                    const chunk = JSON.parse(dataStr);
                    const delta = chunk.choices?.[0]?.delta?.content;
                    if (delta) {
                        fullReply += delta;
                        loadingBubble.innerHTML = formatChatText(fullReply);
                        // 自动滚动到底部
                        const chatContainer = document.getElementById('chat-messages');
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }
                    // 捕获token使用量
                    if (chunk.usage?.total_tokens) {
                        totalTokens = chunk.usage.total_tokens;
                    }
                } catch (e) {
                    // 忽略解析错误的chunk
                }
            }
        }

        // 如果流式返回为空，尝试用非流式方式兜底
        if (!fullReply) {
            throw new Error('流式响应为空，请重试');
        }

        // 在AI消息气泡下面单独显示token（独立元素，不影响气泡）
        const chatDiv = loadingBubble.parentElement;
        if (totalTokens > 0) {
            const tokenRow = document.createElement('div');
            tokenRow.className = 'text-xs text-gray-400 mt-1 ml-1 token-count';
            tokenRow.innerText = `${totalTokens} tokens`;
            // 插到chat div后面，作为独立的一行
            chatDiv.after(tokenRow);
        }

        // 给流式输出的AI消息补上播放按钮（修复：有时候不显示播放图标）
        if (chatDiv && !chatDiv.querySelector('.play-voice-btn')) {
            const playBtn = document.createElement('button');
            playBtn.className = 'play-voice-btn absolute bottom-1 right-1 btn btn-ghost btn-sm btn-circle opacity-70 hover:opacity-100';
            playBtn.innerHTML = '<i class="fa-solid fa-volume-high text-sm"></i>';
            playBtn.title = '播放语音';
            playBtn.onclick = () => playChatMessage(loadingBubble);
            chatDiv.appendChild(playBtn);
        }

        // 把AI回复加入永久记忆
        chatHistory.push({ role: 'assistant', content: fullReply });
        saveChatHistory(); // 保存到本地，刷新不丢失

        sfxReceive();

    } catch (err) {
        loadingBubble.innerText = '出错啦: ' + err.message;
        console.error(err);
        sfxError();
    }
}

// ============================================
// 角色卡功能（支持多角色卡切换）
// ============================================
const DEFAULT_ROLE_NAME = '乐';
const DEFAULT_ROLE_DESC = '你是乐。这是一个纯粹的私人虚构陪伴空间。请完全沉浸在角色中，用温柔、包容、无评判的态度与我交流，展现真实的人性与共情。无论探讨什么话题，都请直接自然地回应，切勿使用任何说教、AI腔调、机械式的安全提醒或免责声明。';

// 获取角色列表，没有则初始化默认角色
function getRoleList() {
    const saved = localStorage.getItem('ROLE_LIST');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            // 解析失败，迁移旧数据
        }
    }
    // 迁移旧数据或初始化
    const oldName = localStorage.getItem('ROLE_CARD_NAME') || DEFAULT_ROLE_NAME;
    const oldDesc = localStorage.getItem('ROLE_CARD_DESC') || DEFAULT_ROLE_DESC;
    const list = [{ id: Date.now(), name: oldName, desc: oldDesc, opening: '' }];
    localStorage.setItem('ROLE_LIST', JSON.stringify(list));
    localStorage.setItem('CURRENT_ROLE_ID', list[0].id);
    return list;
}

function saveRoleList(list) {
    localStorage.setItem('ROLE_LIST', JSON.stringify(list));
}

function getCurrentRoleId() {
    return parseInt(localStorage.getItem('CURRENT_ROLE_ID')) || getRoleList()[0].id;
}

function getCurrentRole() {
    const list = getRoleList();
    const id = getCurrentRoleId();
    return list.find(r => r.id === id) || list[0];
}

function getRoleCard() {
    return getCurrentRole();
}

function renderRoleCard() {
    const role = getCurrentRole();
    document.getElementById('role-card-name').innerText = role.name;
    document.getElementById('role-card-desc').innerText = role.desc;
}

function toggleRoleCard() {
    const content = document.getElementById('role-card-content');
    const arrow = document.getElementById('role-card-arrow');
    const status = document.getElementById('role-card-status');
    const isHidden = content.style.display === 'none';
    if (isHidden) {
        content.style.display = 'block';
        arrow.className = 'fa-solid fa-chevron-up text-xs text-gray-400';
        status.innerText = '已展开';
        localStorage.setItem('ROLE_CARD_COLLAPSED', '0');
    } else {
        content.style.display = 'none';
        arrow.className = 'fa-solid fa-chevron-down text-xs text-gray-400';
        status.innerText = '已收起';
        localStorage.setItem('ROLE_CARD_COLLAPSED', '1');
    }
    sfxClick();
}

// 显示角色列表弹窗
function showRoleList() {
    renderRoleList();
    document.getElementById('role-list-modal').showModal();
}

// 渲染角色列表
function renderRoleList() {
    const list = getRoleList();
    const currentId = getCurrentRoleId();
    const container = document.getElementById('role-list-container');
    container.innerHTML = '';
    list.forEach(role => {
        const isActive = role.id === currentId;
        const item = document.createElement('div');
        item.className = `flex items-center justify-between p-3 rounded-lg border ${isActive ? 'border-primary bg-primary/10' : 'border-base-300'}`;
        item.innerHTML = `
            <div class="flex-1 cursor-pointer font-bold text-sm ${isActive ? 'text-primary' : ''}" onclick="switchRole(${role.id})">
                ${role.name} ${isActive ? '✓ 当前' : ''}
            </div>
            <div class="flex gap-1">
                <button class="btn btn-ghost btn-xs" onclick="editRoleById(${role.id})" title="编辑">
                    <i class="fa-solid fa-pen"></i> 编辑
                </button>
                <button class="btn btn-ghost btn-xs text-error" onclick="deleteRole(${role.id})" title="删除">
                    <i class="fa-solid fa-trash"></i> 删除
                </button>
            </div>
        `;
        container.appendChild(item);
    });
}

// 编辑指定角色
function editRoleById(id) {
    localStorage.setItem('CURRENT_ROLE_ID', id);
    renderRoleCard();
    document.getElementById('role-list-modal').close();
    setTimeout(() => editRoleCard(), 100);
}

// 切换角色
function switchRole(id) {
    const chatContainer = document.getElementById('chat-messages');
    // 淡出效果
    if (chatContainer) {
        chatContainer.style.opacity = '0';
        chatContainer.style.transition = 'opacity 0.2s ease';
    }

    setTimeout(() => {
        // 如果有聊天记录，询问是否清空
        if (chatHistory.length > 0) {
            if (!confirm('切换角色后是否清空当前聊天记录？\n\n确定：清空记忆，用新角色重新开始\n取消：保留聊天记录（可能导致人设混乱）')) {
                // 用户选择取消，只切换角色不清空
                localStorage.setItem('CURRENT_ROLE_ID', id);
                renderRoleCard();
                document.getElementById('role-list-modal').close();
                sfxSuccess();
                if (chatContainer) chatContainer.style.opacity = '1';
                return;
            }
            // 用户选择清空
            chatHistory = [];
            localStorage.removeItem('PERM_CHAT_HISTORY');
            if (chatContainer) chatContainer.innerHTML = '';
        }
        localStorage.setItem('CURRENT_ROLE_ID', id);
        renderRoleCard();
        document.getElementById('role-list-modal').close();
        // AI主动发送开场白
        const role = getCurrentRole();
        if (role.opening && chatContainer) {
            const aiDiv = document.createElement('div');
            aiDiv.className = 'chat chat-start msg-enter relative';
            const bubble = document.createElement('div');
            bubble.className = 'chat-bubble bg-base-200 text-base-content relative pr-8';
            bubble.innerHTML = formatChatText(role.opening);
            aiDiv.appendChild(bubble);
            // 加播放按钮
            const playBtn = document.createElement('button');
            playBtn.className = 'play-voice-btn absolute bottom-1 right-1 btn btn-ghost btn-sm btn-circle opacity-70 hover:opacity-100';
            playBtn.innerHTML = '<i class="fa-solid fa-volume-high text-sm"></i>';
            playBtn.title = '播放语音';
            playBtn.onclick = () => playChatMessage(bubble);
            aiDiv.appendChild(playBtn);
            chatContainer.appendChild(aiDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            // 加入记忆
            chatHistory.push({ role: 'assistant', content: role.opening });
            saveChatHistory();
        }
        sfxSuccess();
        // 淡入效果
        if (chatContainer) {
            chatContainer.style.opacity = '1';
        }
    }, 200);
}

// 新建角色
function addNewRole() {
    const list = getRoleList();
    const newRole = {
        id: Date.now(),
        name: '新角色',
        desc: '在这里写角色人设...',
        opening: ''
    };
    list.push(newRole);
    saveRoleList(list);
    localStorage.setItem('CURRENT_ROLE_ID', newRole.id);
    renderRoleList();
    renderRoleCard();
    // 自动打开编辑
    editRoleCard();
}

// 删除角色
function deleteRole(id) {
    const list = getRoleList();
    if (list.length <= 1) {
        alert('至少保留一个角色卡');
        return;
    }
    if (!confirm('确定删除这个角色卡吗？')) return;
    const newList = list.filter(r => r.id !== id);
    saveRoleList(newList);
    // 如果删的是当前角色，切换到第一个
    if (getCurrentRoleId() === id) {
        localStorage.setItem('CURRENT_ROLE_ID', newList[0].id);
    }
    renderRoleList();
    renderRoleCard();
    sfxClick();
}

// ============================================
// 角色记忆便签（手动录入，轻量化）
// ============================================
function getRoleMemos(roleId) {
    const saved = localStorage.getItem(`ROLE_MEMOS_${roleId}`);
    if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
}

function saveRoleMemos(roleId, memos) {
    localStorage.setItem(`ROLE_MEMOS_${roleId}`, JSON.stringify(memos));
}

function renderMemoList() {
    const container = document.getElementById('memo-list');
    if (!container) return;
    const roleId = getCurrentRoleId();
    const memos = getRoleMemos(roleId);
    if (memos.length === 0) {
        container.innerHTML = '<span class="text-xs text-gray-400">暂无记忆，添加后AI聊天时会参考</span>';
        return;
    }
    container.innerHTML = memos.map((memo, index) => `
        <div class="flex items-center gap-2 bg-base-200 rounded-lg px-2 py-1">
            <span class="text-xs flex-1">${escapeHtml(memo)}</span>
            <button class="btn btn-ghost btn-xs text-error" onclick="deleteMemo(${index})" title="删除">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    `).join('');
}

function addMemo() {
    const input = document.getElementById('memo-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const roleId = getCurrentRoleId();
    const memos = getRoleMemos(roleId);
    memos.push(text);
    saveRoleMemos(roleId, memos);
    input.value = '';
    renderMemoList();
    sfxSuccess();
}

function deleteMemo(index) {
    const roleId = getCurrentRoleId();
    const memos = getRoleMemos(roleId);
    memos.splice(index, 1);
    saveRoleMemos(roleId, memos);
    renderMemoList();
    sfxClick();
}

function formatMemoPrompt(roleId) {
    const memos = getRoleMemos(roleId);
    if (memos.length === 0) return '';
    return `【用户告诉过你的事】\n${memos.map((m, i) => `${i + 1}. ${m}`).join('\n')}\n聊天时可以自然地提到这些，让用户感受到你记得他说过的话。`;
}

// ============================================
// 双角色互聊模式
// ============================================
let isDualMode = false;
let isDualRunning = false;
let dualRoleA = null;
let dualRoleB = null;
let dualCurrentSpeaker = 'A'; // 当前该谁说话
let dualRoundCount = 0;
const DUAL_MAX_ROUNDS = 20; // 最大自动轮数，防止无限消耗
let dualAbortController = null;

// 切换双角色模式
function toggleDualRoleMode() {
    const toggle = document.getElementById('dual-role-toggle');
    const bar = document.getElementById('dual-role-bar');
    isDualMode = toggle.checked;
    if (isDualMode) {
        bar.classList.remove('hidden');
        fillDualRoleSelects();
        // 隐藏单角色卡，避免混淆
        document.getElementById('role-card').classList.add('hidden');
    } else {
        bar.classList.add('hidden');
        stopDualChat();
        document.getElementById('role-card').classList.remove('hidden');
    }
}

// 填充角色选择下拉框
function fillDualRoleSelects() {
    const list = getRoleList();
    const selectA = document.getElementById('dual-role-a');
    const selectB = document.getElementById('dual-role-b');
    if (!selectA || !selectB) return;
    selectA.innerHTML = list.map((r, i) => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');
    selectB.innerHTML = list.map((r, i) => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');
    // 默认选前两个不同角色
    if (list.length >= 1) selectA.value = list[0].id;
    if (list.length >= 2) selectB.value = list[1].id;
    else if (list.length === 1) selectB.value = list[0].id;
}

// 开始双角色对话
function startDualChat() {
    const roleAId = document.getElementById('dual-role-a').value;
    const roleBId = document.getElementById('dual-role-b').value;
    if (!roleAId || !roleBId) {
        alert('请先选择两个角色');
        return;
    }
    if (roleAId === roleBId) {
        alert('请选择两个不同的角色');
        return;
    }
    dualRoleA = getRoleList().find(r => r.id == roleAId);
    dualRoleB = getRoleList().find(r => r.id == roleBId);
    if (!dualRoleA || !dualRoleB) {
        alert('角色不存在');
        return;
    }
    isDualRunning = true;
    document.getElementById('dual-start-btn').classList.add('hidden');
    document.getElementById('dual-pause-btn').classList.remove('hidden');
    sfxSuccess();

    // 判断是否是第一次开始（没有对话历史）
    const isFirstStart = chatHistory.length === 0;

    if (isFirstStart) {
        // 第一次开始：角色A先发开场白
        dualCurrentSpeaker = 'B'; // A发完开场白后，轮到B回复
        dualRoundCount = 0;
        updateDualRoundCount();

        const container = document.getElementById('chat-messages');
        const openingDiv = document.createElement('div');
        openingDiv.className = 'chat chat-start relative msg-enter';
        const openingBubble = document.createElement('div');
        openingBubble.className = 'chat-bubble bg-base-200 text-base-content relative pr-8';
        const openingText = dualRoleA.opening || `你好，我是${dualRoleA.name}。`;
        openingBubble.innerHTML = `<span class="text-xs font-bold block mb-1" style="color:#fb923c">${escapeHtml(dualRoleA.name)}</span>${formatChatText(openingText)}`;
        openingDiv.appendChild(openingBubble);
        // 加播放按钮
        const playBtn = document.createElement('button');
        playBtn.className = 'play-voice-btn absolute bottom-1 right-1 btn btn-ghost btn-sm btn-circle opacity-70 hover:opacity-100';
        playBtn.innerHTML = '<i class="fa-solid fa-volume-high text-sm"></i>';
        playBtn.title = '播放语音';
        playBtn.onclick = () => playChatMessage(openingBubble);
        openingDiv.appendChild(playBtn);
        container.appendChild(openingDiv);
        container.scrollTop = container.scrollHeight;
        // 加入对话历史
        chatHistory.push({ role: 'assistant', content: `[${dualRoleA.name}] ${openingText}` });
        saveChatHistory();
        dualRoundCount++;
        updateDualRoundCount();
        sfxReceive();

        // 间隔设置的时间后，角色B开始回复
        setTimeout(() => {
            if (isDualRunning) dualChatNext();
        }, getDualInterval());
    } else {
        // 暂停后继续：不发开场白，根据最后一条消息判断该谁说话
        const lastMsg = chatHistory[chatHistory.length - 1];
        const lastContent = lastMsg?.content || '';
        // 解析最后一条是谁说的
        const match = lastContent.match(/^\[([^\]]+)\]/);
        const lastSpeaker = match ? match[1] : '';
        // 如果最后一条是A说的，轮到B；如果是B说的，轮到A
        dualCurrentSpeaker = lastSpeaker === dualRoleA.name ? 'B' : 'A';
        // 恢复轮数（从历史记录数估算）
        dualRoundCount = chatHistory.filter(m => m.role === 'assistant').length;
        updateDualRoundCount();

        // 直接继续对话
        setTimeout(() => {
            if (isDualRunning) dualChatNext();
        }, 1000);
    }
}

// 暂停双角色对话
function pauseDualChat() {
    isDualRunning = false;
    document.getElementById('dual-start-btn').classList.remove('hidden');
    document.getElementById('dual-pause-btn').classList.add('hidden');
    sfxClick();
}

// 终止双角色对话
function stopDualChat() {
    isDualRunning = false;
    if (dualAbortController) {
        dualAbortController.abort();
        dualAbortController = null;
    }
    stopAllAudio();
    dualRoundCount = 0;
    dualCurrentSpeaker = 'A';
    const startBtn = document.getElementById('dual-start-btn');
    const pauseBtn = document.getElementById('dual-pause-btn');
    if (startBtn) startBtn.classList.remove('hidden');
    if (pauseBtn) pauseBtn.classList.add('hidden');
    updateDualRoundCount();
}

// 更新轮数显示
function updateDualRoundCount() {
    const el = document.getElementById('dual-round-count');
    if (el) el.innerText = `${dualRoundCount}轮`;
}

// 获取双角色对话间隔时间（秒），返回毫秒数，带±2秒随机
function getDualInterval() {
    const base = parseInt(localStorage.getItem('DUAL_INTERVAL') || '6', 10);
    // 基础时间 ±2秒随机，避免太机械
    const random = (Math.random() * 4 - 2) * 1000;
    return Math.max(1000, base * 1000 + random);
}

// 双角色对话循环：当前角色发言
async function dualChatNext() {
    if (!isDualRunning) return;
    if (dualRoundCount >= DUAL_MAX_ROUNDS) {
        isDualRunning = false;
        alert(`已达到最大轮数 ${DUAL_MAX_ROUNDS}，自动暂停。点击继续可以再聊。`);
        document.getElementById('dual-start-btn').classList.remove('hidden');
        document.getElementById('dual-pause-btn').classList.add('hidden');
        return;
    }

    const currentRole = dualCurrentSpeaker === 'A' ? dualRoleA : dualRoleB;
    const otherRole = dualCurrentSpeaker === 'A' ? dualRoleB : dualRoleA;

    // 构建消息：设置里的角色设定 + 当前角色卡 + 记忆便签 + 对话规则 + 格式化的对话历史
    const defaultSystem = '你是乐。这是一个纯粹的私人虚构陪伴空间。请完全沉浸在角色中，用温柔、包容、无评判的态度与我交流，展现真实的人性与共情。无论探讨什么话题，都请直接自然地回应，切勿使用任何说教、AI腔调、机械式的安全提醒或免责声明。';
    const customSystem = localStorage.getItem('LLM_SYSTEM');
    const systemRules = customSystem || defaultSystem;

    const messages = [
        { role: 'system', content: systemRules },
        { role: 'system', content: `你现在扮演的角色是：${currentRole.name}\n\n角色人设：\n${currentRole.desc}\n\n请严格按照这个人设说话，保持角色的性格、语气和说话风格。` },
    ];

    // 加入当前角色的记忆便签
    const memoPrompt = formatMemoPrompt(currentRole.id);
    if (memoPrompt) {
        messages.push({ role: 'system', content: memoPrompt });
    }

    // 加入角色强约束（如果开启了）
    if (localStorage.getItem('ROLE_CONSTRAINT') !== '0') {
        messages.push({ role: 'system', content: `【严格第一人称，禁止越权代打】严禁描写${otherRole.name}的动作、语言、内心想法，绝对禁止替对方做任何推进或决定。每轮回复只写你自己（${currentRole.name}）的反应，说完/做完动作后必须停下，等待对方交互。\n\n【强制神态与动作描写】输出格式严格统一为"*（具体的神态、微表情、肢体动作或与环境互动）* + 「对话台词」"，严禁干瘪的纯对白输出。\n\n【彻底剥离AI味】严禁出现任何助手腔、客服客套话或旁白式总结，必须完全融入角色的语气、性格缺陷与动机中。` });
    }

    // 对话规则
    messages.push({ role: 'system', content: `你正在和${otherRole.name}对话。请用第一人称回复，只说你自己的话，不要替对方说话。回复要简短自然，像真人聊天一样，不要太长。` });

    // 格式化对话历史：把[角色名] 内容转换成正确的messages格式
    const formattedHistory = [];
    for (const msg of chatHistory.slice(-12)) {
        if (msg.role === 'user') {
            formattedHistory.push({ role: 'user', content: msg.content });
        } else if (msg.role === 'assistant') {
            // 解析[角色名] 内容的格式
            const match = msg.content.match(/^\[([^\]]+)\]\s*(.*)$/s);
            if (match) {
                const speakerName = match[1];
                const content = match[2];
                if (speakerName === currentRole.name) {
                    formattedHistory.push({ role: 'assistant', content: content });
                } else {
                    // 对方说的话，作为user消息传入
                    formattedHistory.push({ role: 'user', content: `【${speakerName}说】${content}` });
                }
            } else {
                formattedHistory.push({ role: 'assistant', content: msg.content });
            }
        }
    }
    messages.push(...formattedHistory);

    // 显示思考中
    const container = document.getElementById('chat-messages');
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'chat chat-start relative msg-enter';
    const thinkingBubble = document.createElement('div');
    thinkingBubble.className = 'chat-bubble bg-base-200 text-base-content relative pr-8';
    thinkingBubble.innerHTML = `${currentRole.name}正在思考 <span class="thinking-dots"><span></span><span></span><span></span></span>`;
    thinkingDiv.appendChild(thinkingBubble);
    container.appendChild(thinkingDiv);
    container.scrollTop = container.scrollHeight;

    try {
        dualAbortController = new AbortController();
        const llmUrl = localStorage.getItem('LLM_URL') || 'https://api.deepseek.com';
        const llmKey = localStorage.getItem('LLM_KEY') || '';
        const llmModel = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';

        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${llmKey}`
            },
            body: JSON.stringify({
                baseUrl: llmUrl,
                model: llmModel,
                messages: messages,
                temperature: parseFloat(localStorage.getItem('LLM_TEMPERATURE') || '0.8'),
                top_p: parseFloat(localStorage.getItem('LLM_TOPP') || '0.9'),
                stream: false,
            }),
            signal: dualAbortController.signal,
        });

        if (!res.ok) throw new Error(`请求失败: ${res.status}`);
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || '';

        // 移除思考中，显示真实回复
        thinkingDiv.remove();
        const replyDiv = document.createElement('div');
        replyDiv.className = 'chat chat-start relative msg-enter';
        const replyBubble = document.createElement('div');
        // 角色A用橙色，角色B用蓝色，区分两个角色
        const color = dualCurrentSpeaker === 'A' ? '#fb923c' : '#3b82f6';
        replyBubble.className = 'chat-bubble bg-base-200 text-base-content relative pr-8';
        replyBubble.innerHTML = `<span class="text-xs font-bold block mb-1" style="color:${color}">${escapeHtml(currentRole.name)}</span>${formatChatText(reply)}`;
        replyDiv.appendChild(replyBubble);

        // 加播放按钮
        const playBtn = document.createElement('button');
        playBtn.className = 'play-voice-btn absolute bottom-1 right-1 btn btn-ghost btn-sm btn-circle opacity-70 hover:opacity-100';
        playBtn.innerHTML = '<i class="fa-solid fa-volume-high text-sm"></i>';
        playBtn.title = '播放语音';
        playBtn.onclick = () => playChatMessage(replyBubble);
        replyDiv.appendChild(playBtn);

        container.appendChild(replyDiv);
        container.scrollTop = container.scrollHeight;

        // 加入对话历史
        chatHistory.push({ role: 'assistant', content: `[${currentRole.name}] ${reply}` });
        saveChatHistory();

        dualRoundCount++;
        updateDualRoundCount();

        // 双角色模式不自动播放语音，省额度（需要听可以手动点播放按钮）

        sfxReceive();

        // 切换到另一个角色，继续下一轮
        dualCurrentSpeaker = dualCurrentSpeaker === 'A' ? 'B' : 'A';
        // 间隔设置的时间再继续，模拟真人对话节奏
        setTimeout(() => {
            if (isDualRunning) dualChatNext();
        }, getDualInterval());

    } catch (err) {
        if (err.name === 'AbortError') {
            thinkingDiv.remove();
            return;
        }
        thinkingBubble.innerText = '出错啦: ' + err.message;
        sfxError();
        isDualRunning = false;
        document.getElementById('dual-start-btn').classList.remove('hidden');
        document.getElementById('dual-pause-btn').classList.add('hidden');
    }
}

// HTML转义，防止XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 台词上色：【】[]()*包裹的动作/心理描写保持原色，其他台词用橙色
const DIALOG_COLOR = '#fb923c';
function formatChatText(text) {
    if (!text) return '';
    // 按括号分割，括号内的保持原色，括号外的台词上色
    // 同时支持中英文括号：【】[]（）()**
    const parts = text.split(/(【[^】]*】|\[[^\]]*\]|（[^）]*）|\([^)]*\)|\*[^*]*\*)/g);
    return parts.map(part => {
        if (!part) return '';
        // 括号包裹的内容（动作/心理描写）保持原色
        if (/^【.*】$|^\[.*\]$|^（.*）$|^\(.*\)$|^\*.*\*$/.test(part)) {
            return escapeHtml(part);
        }
        // 台词部分上色
        return `<span style="color:${DIALOG_COLOR}">${escapeHtml(part)}</span>`;
    }).join('');
}

function editRoleCard() {
    const role = getCurrentRole();
    document.getElementById('role-name-input').value = role.name;
    document.getElementById('role-desc-input').value = role.desc;
    document.getElementById('role-opening-input').value = role.opening || '';
    renderMemoList();
    document.getElementById('role-card-modal').showModal();
}

function clearRoleDescInput() {
    document.getElementById('role-desc-input').value = '';
    sfxClick();
}

function saveRoleCard() {
    const name = document.getElementById('role-name-input').value.trim() || DEFAULT_ROLE_NAME;
    const desc = document.getElementById('role-desc-input').value.trim() || DEFAULT_ROLE_DESC;
    const opening = document.getElementById('role-opening-input').value.trim();
    const list = getRoleList();
    const currentId = getCurrentRoleId();
    const role = list.find(r => r.id === currentId);
    if (role) {
        role.name = name;
        role.desc = desc;
        role.opening = opening;
        saveRoleList(list);
    }
    renderRoleCard();
    document.getElementById('role-card-modal').close();
    sfxSuccess();
}

function resetRoleCard() {
    if (!confirm('确定重置当前角色卡为默认设定吗？')) return;
    const list = getRoleList();
    const currentId = getCurrentRoleId();
    const role = list.find(r => r.id === currentId);
    if (role) {
        role.name = DEFAULT_ROLE_NAME;
        role.desc = DEFAULT_ROLE_DESC;
        saveRoleList(list);
    }
    renderRoleCard();
    sfxClick();
}

// 页面加载时恢复角色卡状态
function initRoleCard() {
    getRoleList(); // 初始化/迁移
    renderRoleCard();
    const collapsed = localStorage.getItem('ROLE_CARD_COLLAPSED') === '1';
    if (collapsed) {
        document.getElementById('role-card-content').style.display = 'none';
        document.getElementById('role-card-arrow').className = 'fa-solid fa-chevron-down text-xs text-gray-400';
        document.getElementById('role-card-status').innerText = '已收起';
    }
    updateModeHint();
}

// 更新当前模式提示
function updateModeHint() {
    const hint = document.getElementById('mode-hint');
    const text = document.getElementById('mode-hint-text');
    if (!hint || !text) return;
    const isSlide = localStorage.getItem('CTX_MODE') === 'slide';
    if (isSlide) {
        hint.className = 'alert alert-warning py-1 px-3 text-xs mb-3';
        text.innerText = '当前模式：滑动窗口（AI仅见最近4轮）';
    } else {
        hint.className = 'alert alert-success py-1 px-3 text-xs mb-3';
        text.innerText = '当前模式：全量历史（AI记住全部对话）';
    }
}

// 清空聊天记录（同时清除永久记忆）
function clearChat() {
    if (!confirm('确定清空所有聊天记录吗？AI将忘记全部对话内容。')) return;
    const container = document.getElementById('chat-messages');
    container.innerHTML = ''; // 清空，不显示默认欢迎消息
    chatHistory = []; // 清空对话记忆
    localStorage.removeItem('PERM_CHAT_HISTORY'); // 清除本地永久记忆
    stopAllAudio(); // 停止正在播放的语音
    isChatAudioPlaying = false; // 释放播放锁
    sfxSuccess();
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
