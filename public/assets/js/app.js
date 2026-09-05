
// Tab Switching
function switchTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab-active', 'text-primary'));
    const activeTab = document.getElementById(`tab-${tabId}`);
    if (activeTab) activeTab.classList.add('tab-active', 'text-primary');

    document.getElementById('tts-section').classList.add('hidden');
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
}

function saveModalKeys() {
    localStorage.setItem('FISH_KEY', document.getElementById('modal-key-fish').value.trim());
    localStorage.setItem('SILICONFLOW_KEY', document.getElementById('modal-key-sili').value.trim());
    localStorage.setItem('ALIYUN_KEY', document.getElementById('modal-key-aliyun').value.trim());
    onEngineChange();
    settings_modal.close();
}

// Initial Sync
onEngineChange();
syncModalInputs();

// Text character count
const ttsText = document.getElementById('tts-text');
const charCount = document.getElementById('char-count');
ttsText.addEventListener('input', () => {
    charCount.innerText = `${ttsText.value.length} 字`;
});

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
    const prompt = document.getElementById('tts-prompt').value.trim();

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

        // Try direct backend function first, or direct fallback if running locally
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
                prompt
            })
        });

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
