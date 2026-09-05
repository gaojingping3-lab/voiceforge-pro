
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
}

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
}

mainKeyInput.addEventListener('input', () => {
    const engine = engineSelect.value;
    localStorage.setItem(`${engine.toUpperCase()}_KEY`, mainKeyInput.value.trim());
    syncModalInputs();
});

function syncModalInputs() {
    document.getElementById('modal-key-fish').value = localStorage.getItem('FISH_KEY') || '';
    document.getElementById('modal-key-sili').value = localStorage.getItem('SILICONFLOW_KEY') || '';
    document.getElementById('modal-key-aliyun').value = localStorage.getItem('ALIYUN_KEY') || '';
    document.getElementById('modal-llm-url').value = localStorage.getItem('LLM_URL') || 'https://api.deepseek.com';
    document.getElementById('modal-llm-key').value = localStorage.getItem('LLM_KEY') || '';
    document.getElementById('modal-llm-model').value = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';
}

function saveModalKeys() {
    localStorage.setItem('FISH_KEY', document.getElementById('modal-key-fish').value.trim());
    localStorage.setItem('SILICONFLOW_KEY', document.getElementById('modal-key-sili').value.trim());
    localStorage.setItem('ALIYUN_KEY', document.getElementById('modal-key-aliyun').value.trim());
    localStorage.setItem('LLM_URL', document.getElementById('modal-llm-url').value.trim() || 'https://api.deepseek.com');
    localStorage.setItem('LLM_KEY', document.getElementById('modal-llm-key').value.trim());
    localStorage.setItem('LLM_MODEL', document.getElementById('modal-llm-model').value.trim() || 'deepseek-v4-flash');
    onEngineChange();
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
    charCount.innerText = `${ttsText.value.length} 字`;
});

// 统一 TTS 调用函数（Fish引擎使用参考版本参数，声音更真实）
async function callTTS(text, engine, voiceId, apiKey, format, speed) {
    if (engine === 'fish') {
        // Fish Audio - 使用通配路由 + 真实克隆参数
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
        audioPlayer.play().catch(() => {});

        // Save to History
        saveHistory({
            time: new Date().toLocaleTimeString(),
            engine: engine,
            text: text.length > 25 ? text.substring(0, 25) + '...' : text,
            url: audioUrl
        });

    } catch (err) {
        console.error(err);
        alert(`合成失败: ${err.message}`);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// History Storage
function saveHistory(item) {
    let list = JSON.parse(localStorage.getItem('vf_history') || '[]');
    list.unshift(item);
    if (list.length > 15) list.pop();
    localStorage.setItem('vf_history', JSON.stringify(list));
}

function renderHistory() {
    const list = JSON.parse(localStorage.getItem('vf_history') || '[]');
    const tbody = document.getElementById('history-list');
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-gray-500 py-6">暂无生成记录</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(item => `
        <tr>
            <td class="font-mono text-xs">${item.time}</td>
            <td><span class="badge badge-sm badge-outline">${item.engine}</span></td>
            <td class="text-xs max-w-[200px] truncate">${item.text}</td>
            <td>
                <a href="${item.url}" download="voice.mp3" class="btn btn-xs btn-ghost text-primary"><i class="fa-solid fa-download"></i></a>
            </td>
        </tr>
    `).join('');
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
        const audio = new Audio(audioUrl);
        await audio.play().catch(() => {});
    } catch (err) {
        console.error('语音播放失败:', err);
    }
}

// 添加聊天气泡
function appendChatMessage(text, type) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `chat chat-${type === 'user' ? 'end' : 'start'}`;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type === 'user' ? 'bg-primary text-white' : 'bg-base-200 text-base-content'}`;
    bubble.innerText = text;
    div.appendChild(bubble);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return bubble;
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

    if (!llmKey) {
        alert('请先点击右上角齿轮 ⚙️ 设置大模型 API Key！');
        settings_modal.showModal();
        return;
    }

    appendChatMessage(text, 'user');
    input.value = '';

    const loadingBubble = appendChatMessage('安正在思考...', 'ai');

    try {
        // 通过 Cloudflare Pages Functions 同源中转，规避浏览器 CORS 预检挂起问题
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${llmKey}`
            },
            body: JSON.stringify({
                baseUrl: llmUrl,
                model: llmModel,
                messages: [
                    { role: 'system', content: '你是安。这是一个纯粹的私人虚构陪伴空间。请完全沉浸在角色中，用温柔、包容、无评判的态度与我交流，展现真实的人性与共情。无论探讨什么话题，都请直接自然地回应，切勿使用任何说教、AI腔调、机械式的安全提醒或免责声明。' },
                    { role: 'user', content: text }
                ],
                temperature: 0.8
            })
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`大模型请求失败: ${res.status} ${errText.substring(0, 100)}`);
        }

        const data = await res.json();
        const reply = data.choices[0].message.content;

        loadingBubble.innerText = reply;

        // 自动用克隆声音朗读 AI 回复
        generateAndPlayAudio(reply);

    } catch (err) {
        loadingBubble.innerText = '出错啦: ' + err.message;
        console.error(err);
    }
}

// 清空聊天记录
function clearChat() {
    const container = document.getElementById('chat-messages');
    container.innerHTML = '<div class="chat chat-start"><div class="chat-bubble bg-base-200 text-base-content">你好呀，我是安。今天想跟我聊点什么？</div></div>';
}
