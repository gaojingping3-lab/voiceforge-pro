
// Tab Switching Logic
function switchTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab-active', 'text-primary'));
    document.getElementById(`tab-${tabId}`).classList.add('tab-active', 'text-primary');

    document.getElementById('tts-section').classList.add('hidden');
    document.getElementById('clone-section').classList.add('hidden');
    document.getElementById('history-section').classList.add('hidden');

    document.getElementById(`${tabId}-section`).classList.remove('hidden');
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

// Settings Management
function saveKeys() {
    localStorage.setItem('FISH_KEY', document.getElementById('key-fish').value);
    localStorage.setItem('ALIYUN_KEY', document.getElementById('key-aliyun').value);
    localStorage.setItem('SILI_KEY', document.getElementById('key-sili').value);
}

function loadKeys() {
    document.getElementById('key-fish').value = localStorage.getItem('FISH_KEY') || '';
    document.getElementById('key-aliyun').value = localStorage.getItem('ALIYUN_KEY') || '';
    document.getElementById('key-sili').value = localStorage.getItem('SILI_KEY') || '';
}
loadKeys();

// Mock TTS Generation logic pointing to Cloudflare API routes
document.getElementById('btn-generate').addEventListener('click', async () => {
    const btn = document.getElementById('btn-generate');
    const originalText = btn.innerHTML;
    const text = document.getElementById('tts-text').value;
    const engine = document.getElementById('tts-engine').value;
    const voiceId = document.getElementById('voice-id').value;
    
    if(!text.trim()) {
        alert("请输入需要合成的文本");
        return;
    }

    btn.innerHTML = '<span class="loading loading-spinner"></span> 生成中...';
    btn.disabled = true;

    try {
        // Build the request to our CF functions backend
        const endpoint = `/api/${engine}/tts`;
        const headers = { 'Content-Type': 'application/json' };
        
        // Pass local keys if available (backend will prefer env vars, but use these as fallback)
        const localKey = localStorage.getItem(`${engine.toUpperCase()}_KEY`);
        if (localKey) headers['X-Local-Api-Key'] = localKey;

        // In a real app, we'd fetch from the actual endpoint:
        // const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({text, voiceId}) });
        // const blob = await response.blob();
        
        // MOCK SIMULATION for demonstration without real API
        await new Promise(r => setTimeout(r, 1500)); 
        console.log(`Simulated API call to ${endpoint} for ${engine}`);
        
        // MOCK audio result (using browser speech synthesis or just UI mockup)
        const resultPlayer = document.getElementById('result-player');
        resultPlayer.classList.remove('hidden');
        
        // Since we can't generate real TTS offline without API, we play a notification sound as mockup
        // In real deployment, set this to URL.createObjectURL(blob)
        // audioPlayer.src = URL.createObjectURL(blob);
        
        alert("API请求已发送! (目前为界面演示模式，部署后将调用对应的后端 Functions)");
        
    } catch(err) {
        alert("生成失败: " + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});
