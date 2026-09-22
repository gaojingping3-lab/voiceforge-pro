// ============================================
// 手机端可视化日志悬浮窗（黑底白字，3秒自动消失）
// ============================================
function screenLog(msg) {
    try {
        let container = document.getElementById('screen-log-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'screen-log-container';
            container.style.cssText = 'position:fixed;top:8px;left:8px;right:8px;z-index:999999;pointer-events:none;';
            document.body.appendChild(container);
        }
        const item = document.createElement('div');
        item.style.cssText = 'background:rgba(0,0,0,0.88);color:#fff;padding:7px 10px;border-radius:6px;font-size:11px;margin-bottom:3px;word-break:break-all;max-height:70px;overflow:hidden;line-height:1.4;';
        item.textContent = String(msg);
        container.appendChild(item);
        setTimeout(() => {
            item.style.transition = 'opacity 0.3s';
            item.style.opacity = '0';
            setTimeout(() => { if (item.parentNode) item.remove(); }, 350);
        }, 3000);
    } catch (e) {}
}

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

// ============================================
// 智能滚动系统
// ============================================
const SCROLL_BOTTOM_THRESHOLD = 150; // 距离底部150px内视为在底部
let hasUnreadMessages = false; // 用户不在底部时来了新消息

function isAtBottom(container) {
    if (!container) return false;
    return container.scrollHeight - container.scrollTop - container.clientHeight < SCROLL_BOTTOM_THRESHOLD;
}

function smartScroll(container) {
    if (!container) return;
    // 用户在底部时自动滚动，往上翻历史时不滚，显示回到底部按钮
    if (isAtBottom(container)) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        hasUnreadMessages = false;
        updateScrollToBottomBtn();
    } else {
        hasUnreadMessages = true;
        updateScrollToBottomBtn();
    }
}

function updateScrollToBottomBtn() {
    const btn = document.getElementById('scroll-to-bottom-btn');
    if (!btn) return;
    if (hasUnreadMessages) {
        btn.classList.add('show');
    } else {
        btn.classList.remove('show');
    }
}

function scrollToBottom() {
    const container = document.getElementById('chat-messages');
    if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        hasUnreadMessages = false;
        updateScrollToBottomBtn();
    }
}

// 初始化智能滚动（页面加载后调用）
function initSmartScroll() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    container.addEventListener('scroll', () => {
        if (isAtBottom(container)) {
            hasUnreadMessages = false;
            updateScrollToBottomBtn();
        }
    });
}

// 下拉刷新
function initPullToRefresh() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    // 创建刷新指示器
    const indicator = document.createElement('div');
    indicator.className = 'pull-refresh-indicator';
    indicator.innerHTML = '<div class="spinner"></div><span>下拉刷新</span>';
    container.style.position = 'relative';
    container.appendChild(indicator);

    let startY = 0;
    let pulling = false;
    let pullDistance = 0;
    const THRESHOLD = 60;

    container.addEventListener('touchstart', (e) => {
        if (container.scrollTop <= 0) {
            startY = e.touches[0].clientY;
            pulling = true;
        }
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (!pulling) return;
        pullDistance = e.touches[0].clientY - startY;
        if (pullDistance > 0 && container.scrollTop <= 0) {
            e.preventDefault();
            const progress = Math.min(pullDistance / THRESHOLD, 1);
            indicator.style.transform = `translateX(-50%) translateY(${pullDistance * 0.5}px)`;
            indicator.querySelector('span').innerText = pullDistance > THRESHOLD ? '释放刷新' : '下拉刷新';
        }
    }, { passive: false });

    container.addEventListener('touchend', () => {
        if (!pulling) return;
        pulling = false;
        if (pullDistance > THRESHOLD) {
            indicator.classList.add('visible');
            indicator.querySelector('span').innerText = '刷新中...';
            setTimeout(() => {
                indicator.classList.remove('visible');
                indicator.style.transform = '';
                // 刷新动作：重新渲染历史 + 检查更新
                renderChatHistory();
                checkAppVersion();
            }, 800);
        } else {
            indicator.style.transform = '';
        }
        pullDistance = 0;
    });
}

// 聊天全屏模式切换
// 更新全屏顶部导航栏的标题
function updateFullscreenTitle() {
    const titleEl = document.getElementById('fullscreen-title');
    if (!titleEl) return;
    const isDual = document.getElementById('dual-role-toggle')?.checked;
    if (isDual) {
        titleEl.innerText = '双角色互聊';
    } else {
        const role = getCurrentRole();
        titleEl.innerText = role ? role.name : 'AI 语音对话';
    }
}

// 从聊天全屏进入 AR 出屏，带上当前角色 id（AR 页面自动选中）
function openArFromChat() {
    let url = 'ar';
    try {
        const id = getCurrentRoleId();
        if (id) url += '?role=' + encodeURIComponent(id);
    } catch (e) {}
    location.href = url;
}

function toggleChatFullscreen() {
    const isFull = document.body.classList.toggle('chat-fullscreen');
    document.documentElement.classList.toggle('chat-fullscreen-html', isFull);
    const btn = document.querySelector('#chat-section .card-body > div:first-child button[onclick="toggleChatFullscreen()"] i');
    if (btn) {
        btn.className = isFull ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
    }
    // 进入全屏时设置高度
    if (isFull) {
        const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        document.documentElement.style.setProperty('height', vh + 'px', 'important');
        document.body.style.setProperty('height', vh + 'px', 'important');
        const chatSection = document.getElementById('chat-section');
        if (chatSection) chatSection.style.setProperty('height', vh + 'px', 'important');
        window.scrollTo(0, 0);
    }
    // 退出全屏时清除内联高度
    if (!isFull) {
        document.documentElement.style.height = '';
        document.body.style.height = '';
        const chatSection = document.getElementById('chat-section');
        if (chatSection) chatSection.style.height = '';
    }
    localStorage.setItem('CHAT_FULLSCREEN', isFull ? '1' : '0');
    updateFullscreenTitle();
    // 全屏切换时也更新状态栏颜色
    updateStatusBarColor();
    sfxClick();
}

// 初始化全屏模式状态
function initFullscreenMode() {
    // 只有聊天页面可见时才启用全屏
    const chatSection = document.getElementById('chat-section');
    const isChatVisible = chatSection && !chatSection.classList.contains('hidden');
    if (localStorage.getItem('CHAT_FULLSCREEN') === '1' && isChatVisible) {
        document.body.classList.add('chat-fullscreen');
        document.documentElement.classList.add('chat-fullscreen-html');
        const btn = document.querySelector('#chat-section .card-body > div:first-child button[onclick="toggleChatFullscreen()"] i');
        if (btn) btn.className = 'fa-solid fa-compress';
        // 设置高度
        const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        document.documentElement.style.setProperty('height', vh + 'px', 'important');
        document.body.style.setProperty('height', vh + 'px', 'important');
        if (chatSection) chatSection.style.setProperty('height', vh + 'px', 'important');
        window.scrollTo(0, 0);
    } else {
        // 非聊天页面强制退出全屏
        document.body.classList.remove('chat-fullscreen');
        document.documentElement.classList.remove('chat-fullscreen-html');
        localStorage.setItem('CHAT_FULLSCREEN', '0');
        document.documentElement.style.height = '';
        document.body.style.height = '';
        if (chatSection) chatSection.style.height = '';
    }
    // 持续检查：非聊天页面时强制退出全屏（降低频率减少开销）
    setInterval(() => {
        const chat = document.getElementById('chat-section');
        if (chat && chat.classList.contains('hidden') && document.body.classList.contains('chat-fullscreen')) {
            document.body.classList.remove('chat-fullscreen');
            document.documentElement.classList.remove('chat-fullscreen-html');
            localStorage.setItem('CHAT_FULLSCREEN', '0');
            document.body.style.height = '';
            if (chat) chat.style.height = '';
        }
    }, 1500);
}

// 双击消息菜单
function initLongPressMenu() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    let lastTapTime = 0;
    let lastTapTarget = null;
    const DOUBLE_TAP_MS = 300;

    container.addEventListener('touchend', (e) => {
        const msgEl = e.target.closest('.chat');
        if (!msgEl) return;
        const now = Date.now();
        if (now - lastTapTime < DOUBLE_TAP_MS && lastTapTarget === msgEl) {
            // 双击
            e.preventDefault();
            const touch = e.changedTouches[0];
            showMsgContextMenu(msgEl, touch.clientX, touch.clientY);
            if (navigator.vibrate) navigator.vibrate(10);
            lastTapTime = 0;
            lastTapTarget = null;
        } else {
            lastTapTime = now;
            lastTapTarget = msgEl;
        }
    }, { passive: false });

    // 桌面端双击
    container.addEventListener('dblclick', (e) => {
        const msgEl = e.target.closest('.chat');
        if (!msgEl) return;
        e.preventDefault();
        showMsgContextMenu(msgEl, e.clientX, e.clientY);
    });
}

function showMsgContextMenu(msgEl, x, y) {
    // 移除已有菜单
    document.querySelectorAll('.msg-context-menu').forEach(m => m.remove());

    const isUser = msgEl.classList.contains('chat-end');
    const bubble = msgEl.querySelector('.chat-bubble');
    const text = bubble ? bubble.innerText : '';

    const menu = document.createElement('div');
    menu.className = 'msg-context-menu';

    // 重新生成（仅AI消息）
    if (!isUser) {
        const regenBtn = document.createElement('button');
        regenBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> 重新生成';
        regenBtn.onclick = () => {
            menu.remove();
            // 删除当前消息并重新生成
            const idx = Array.from(document.querySelectorAll('#chat-messages .chat')).indexOf(msgEl);
            if (idx >= 0 && chatHistory[idx]) {
                // 找到这条消息之前的用户消息，重新发送
                let userMsg = null;
                for (let i = idx - 1; i >= 0; i--) {
                    if (chatHistory[i] && chatHistory[i].role === 'user') {
                        userMsg = chatHistory[i].content;
                        break;
                    }
                }
                // 删除从用户消息开始的后续消息
                if (userMsg) {
                    chatHistory = chatHistory.slice(0, idx - 1);
                    saveChatHistory();
                    renderChatHistory();
                    sendChatMessage(userMsg);
                }
            }
        };
        menu.appendChild(regenBtn);
    }

    // 删除
    const delBtn = document.createElement('button');
    delBtn.className = 'danger';
    delBtn.innerHTML = '<i class="fa-regular fa-trash-can"></i> 删除';
    delBtn.onclick = () => {
        const idx = Array.from(document.querySelectorAll('#chat-messages .chat')).indexOf(msgEl);
        if (idx >= 0 && chatHistory[idx]) {
            chatHistory.splice(idx, 1);
            saveChatHistory();
            renderChatHistory();
        }
        menu.remove();
    };
    menu.appendChild(delBtn);

    // 定位菜单，避免超出屏幕
    document.body.appendChild(menu);
    const rect = menu.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 10;
    const maxY = window.innerHeight - rect.height - 10;
    menu.style.left = Math.min(x, maxX) + 'px';
    menu.style.top = Math.min(y, maxY) + 'px';

    // 点击外部关闭
    setTimeout(() => {
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('touchstart', closeMenu);
                document.removeEventListener('click', closeMenu);
            }
        };
        document.addEventListener('touchstart', closeMenu);
        document.addEventListener('click', closeMenu);
    }, 10);
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
    // 切换到非聊天标签时强制退出全屏（不用toggle，直接移除）
    if (tabId !== 'chat' && document.body.classList.contains('chat-fullscreen')) {
        document.body.classList.remove('chat-fullscreen');
        localStorage.setItem('CHAT_FULLSCREEN', '0');
        const btn = document.querySelector('#chat-section .card-body > div:first-child button[onclick="toggleChatFullscreen()"] i');
        if (btn) btn.className = 'fa-solid fa-expand';
    }
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab-active', 'text-primary'));
    const activeTab = document.getElementById(`tab-${tabId}`);
    if (activeTab) activeTab.classList.add('tab-active', 'text-primary');

    // 淡出当前可见的section
    const sections = ['tts-section', 'chat-section', 'image-section', 'clone-section', 'history-section'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('hidden')) {
            el.classList.add('fading');
        }
    });

    setTimeout(() => {
        document.getElementById('tts-section').classList.add('hidden');
        document.getElementById('chat-section').classList.add('hidden');
        document.getElementById('image-section').classList.add('hidden');
        document.getElementById('clone-section').classList.add('hidden');
        document.getElementById('history-section').classList.add('hidden');

        const target = document.getElementById(`${tabId}-section`);
        target.classList.remove('hidden');
        target.classList.remove('fading');
        // 触发重排后淡入
        void target.offsetWidth;
        target.classList.add('fading');
        requestAnimationFrame(() => target.classList.remove('fading'));

        if (tabId === 'history') renderHistory();
    }, 150);

    sfxClick();
}

// ============================================
// 音效系统（Web Audio API 生成，无需音频文件）
// ============================================
let audioCtx = null;
function getAudioCtx() {
    // 如果AudioContext不存在或已被关闭（通话模式可能导致closed），自动重新创建
    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        ttsAudioInited = false; // 强制重新初始化静音振荡器
        ttsKeepAliveOsc = null;
        ttsKeepAliveGain = null;
        ttsCurrentSource = null;
    }
    // 浏览器自动播放策略：如果被暂停，尝试恢复
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
}

// ============================================
// TTS 语音播放（Web Audio API，iOS 自动播放优化）
// ============================================
let ttsCurrentSource = null; // 当前正在播放的 TTS AudioBufferSourceNode
let ttsKeepAliveOsc = null; // 静音振荡器，保持 iOS 音频会话活跃
let ttsKeepAliveGain = null;
let ttsAudioInited = false;

// 用户点击时调用：激活 AudioContext 并启动静音振荡器保活
async function initTTSAudio() {
    if (ttsAudioInited) return;
    const ctx = getAudioCtx();
    // 严格等待硬件音频会话激活
    if (ctx.state !== 'running') {
        await ctx.resume();
    }
    // 静音振荡器，gain 几乎为 0，保持音频会话活跃
    if (!ttsKeepAliveOsc) {
        ttsKeepAliveOsc = ctx.createOscillator();
        ttsKeepAliveGain = ctx.createGain();
        ttsKeepAliveGain.gain.value = 0.00001;
        ttsKeepAliveOsc.connect(ttsKeepAliveGain);
        ttsKeepAliveGain.connect(ctx.destination);
        ttsKeepAliveOsc.start();
    }
    ttsAudioInited = true;
}

// 解码音频（兼容回调方式，防止 Safari detach buffer）
function decodeTTSAudio(arrayBuffer) {
    return new Promise((resolve, reject) => {
        const ctx = getAudioCtx();
        ctx.decodeAudioData(
            arrayBuffer.slice(0), // 传入副本，防止 Safari 清空原 buffer
            (buffer) => resolve(buffer),
            (err) => reject(err)
        );
    });
}

// 停止当前 TTS 播放
function stopTTSCurrent() {
    if (ttsCurrentSource) {
        ttsCurrentSource.onended = null; // 解绑回调，防止连锁反应
        try {
            ttsCurrentSource.stop(0);
        } catch (e) {}
        ttsCurrentSource.disconnect();
        ttsCurrentSource = null;
    }
}

// 播放 AudioBuffer
async function playTTSBuffer(audioBuffer, onEnded) {
    stopTTSCurrent();
    const ctx = getAudioCtx();
    // 关键：严格等待 AudioContext 真正就绪，否则 iOS 会静默丢帧
    if (ctx.state !== 'running') {
        await ctx.resume();
    }
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = () => {
        source.disconnect();
        if (ttsCurrentSource === source) {
            ttsCurrentSource = null;
        }
        if (onEnded) onEnded();
    };
    ttsCurrentSource = source;
    source.start(0);
}

// ============================================
// 优化3：系统级打断恢复（电话/闹钟导致的永久静音）
// ============================================
document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    if (!audioCtx) return;

    // screenLog('[DEBUG-LONGPLAY] 切回前台，状态: ' + audioCtx.state);

    if (audioCtx.state === 'interrupted' || audioCtx.state === 'closed') {
        // screenLog('[DEBUG-LONGPLAY] AudioContext已挂，尝试重建...');
        try {
            if (ttsKeepAliveOsc) {
                try { ttsKeepAliveOsc.stop(); } catch (e) {}
                ttsKeepAliveOsc = null;
            }
            if (ttsKeepAliveGain) {
                try { ttsKeepAliveGain.disconnect(); } catch (e) {}
                ttsKeepAliveGain = null;
            }
            try { await audioCtx.close(); } catch (e) {}
            audioCtx = null;
            ttsAudioInited = false;
            await initTTSAudio();
            // screenLog('[DEBUG-LONGPLAY] AudioContext重建成功');
        } catch (e) {
            // screenLog('[DEBUG-LONGPLAY] 重建失败: ' + e.message);
        }
    } else if (audioCtx.state === 'suspended') {
        try {
            await audioCtx.resume();
            // screenLog('[DEBUG-LONGPLAY] 已resume，状态: ' + audioCtx.state);
        } catch (e) {
            // screenLog('[DEBUG-LONGPLAY] resume失败: ' + e.message);
        }
    }
});

// ============================================
// TTS 播放队列管理器（抗并发/抗连点/抗iOS静默）
// ============================================
const ttsQueueManager = {
    queue: [],
    isPlaying: false,
    currentSource: null,
    taskToken: 0, // 任务令牌，切断已被丢弃的异步任务

    // 安全唤醒，带超时+重试，返回是否成功
    async safeResume(ctx) {
        if (!ctx) return false;
        if (ctx.state === 'running') return true;
        // 第一次尝试，500ms超时
        try {
            await Promise.race([
                ctx.resume(),
                new Promise(resolve => setTimeout(resolve, 500))
            ]);
        } catch (e) {
            console.warn('Resume第一次尝试失败:', e);
        }
        if (ctx.state === 'running') return true;
        // 第二次尝试，等待200ms后再试
        await new Promise(r => setTimeout(r, 200));
        try {
            await Promise.race([
                ctx.resume(),
                new Promise(resolve => setTimeout(resolve, 500))
            ]);
        } catch (e) {
            console.warn('Resume第二次尝试失败:', e);
        }
        return ctx.state === 'running';
    },

    // 强制重置音频系统（销毁旧的AudioContext，重新初始化）
    async resetAudioSystem() {
        console.warn('音频系统异常，强制重置...');
        try {
            if (ttsKeepAliveOsc) {
                try { ttsKeepAliveOsc.stop(); } catch (e) {}
                ttsKeepAliveOsc = null;
            }
            if (ttsKeepAliveGain) {
                try { ttsKeepAliveGain.disconnect(); } catch (e) {}
                ttsKeepAliveGain = null;
            }
            if (audioCtx) {
                try { await audioCtx.close(); } catch (e) {}
                audioCtx = null;
            }
            ttsAudioInited = false;
            this.currentSource = null;
            this.isPlaying = false;
            await initTTSAudio();
            console.warn('音频系统重置完成');
            return true;
        } catch (e) {
            console.error('音频系统重置失败:', e);
            return false;
        }
    },

    enqueue(item) {
        this.queue.push(item);
        if (!this.isPlaying) {
            this.processNext();
        }
    },

    stopCurrent() {
        if (this.currentSource) {
            try { this.currentSource.onended = null; } catch (e) {}
            try { this.currentSource.stop(0); } catch (e) {}
            try { this.currentSource.disconnect(); } catch (e) {}
            this.currentSource = null;
        }
        this.isPlaying = false;
    },

    clearQueue() {
        this.taskToken++; // 作废所有正在await的旧任务
        this.stopCurrent();
        this.queue = [];
    },

    async processNext() {
        if (this.queue.length === 0) {
            this.isPlaying = false;
            return;
        }

        this.isPlaying = true;
        const task = this.queue.shift();
        const currentToken = ++this.taskToken;

        try {
            if (!audioCtx) {
                await initTTSAudio();
            }

            // 严格等待唤醒，失败后强制重置音频系统
            let isAwake = await this.safeResume(audioCtx);
            if (!isAwake) {
                console.warn('AudioContext唤醒失败，尝试强制重置...');
                await this.resetAudioSystem();
                // 重置后再尝试一次
                isAwake = await this.safeResume(audioCtx);
                if (!isAwake) {
                    throw new Error('音频系统唤醒失败，请手动点击播放按钮重试');
                }
            }
            if (this.taskToken !== currentToken) return;

            const bubble = task.bubble;
            // 提取朗读文本
            let text = bubble.innerText.replace(/\n?\d+\s*tokens\s*$/, '').trim();
            const hasNameSpan = bubble.querySelector('.text-xs.font-bold');
            if (hasNameSpan) {
                const lines = text.split('\n');
                if (lines.length > 1) text = lines.slice(1).join('\n').trim();
            }
            const speakText = text
                .replace(/【[^】]*】/g, '').replace(/\[[^\]]*\]/g, '')
                .replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '')
                .replace(/\*[^*]*\*/g, '').trim();

            if (this.taskToken !== currentToken) return;

            // 优化2：长文本切片 - 超过20字拆成多句，剩余插入队列前面连续播放
            let playText = task.text || speakText;
            // screenLog('[DEBUG-LONGPLAY] 准备朗读，当前字数: ' + playText.length + (task.text ? ' (切片段)' : ' (完整消息)'));
            if (!task.text && playText.length > 100) {
                const segments = splitLongText(playText);
                if (segments.length > 1) {
                    playText = segments[0];
                    for (let i = segments.length - 1; i >= 1; i--) {
                        this.queue.unshift({ bubble: bubble, text: segments[i] });
                    }
                }
            }

            // 空文本检查：避免请求空TTS
            if (!playText || playText.trim().length === 0) {
                console.warn('朗读文本为空，跳过');
                this.isPlaying = false;
                this.processNext();
                return;
            }

            // 获取音频blob
            let audioBlob;
            if (task.blob instanceof Blob) {
                audioBlob = task.blob;
            } else if (!task.text && bubble.cachedAudioUrl) {
                // 只有完整消息（非切片段）才用缓存
                const res = await fetch(bubble.cachedAudioUrl);
                audioBlob = await res.blob();
            } else {
                const engine = document.getElementById('tts-engine').value;
                let voiceId = document.getElementById('voice-id').value.trim();
                const nameSpan = bubble.querySelector('.text-xs.font-bold');
                if (nameSpan && dualRoleA && dualRoleB) {
                    const speakerName = nameSpan.innerText.trim();
                    const isEdge = engine === 'edge';
                    const vAS = document.getElementById('dual-voice-a');
                    const vAI = document.getElementById('dual-voice-a-input');
                    const vBS = document.getElementById('dual-voice-b');
                    const vBI = document.getElementById('dual-voice-b-input');
                    if (speakerName === dualRoleA.name) {
                        voiceId = isEdge ? (vAS?.value || 'shimmer') : (vAI?.value.trim() || voiceId);
                    } else if (speakerName === dualRoleB.name) {
                        voiceId = isEdge ? (vBS?.value || 'onyx') : (vBI?.value.trim() || voiceId);
                    }
                }
                const apiKey = document.getElementById('main-api-key').value.trim();
                const format = document.getElementById('tts-format').value;
                const speed = parseFloat(document.getElementById('tts-speed').value);
                if (!apiKey && engine !== 'edge') throw new Error('请先配置API密钥');

                const res = await callTTS(playText, engine, voiceId, apiKey, format, speed);
                if (!res.ok) throw new Error('TTS请求失败');
                audioBlob = await res.blob();
                // 只有完整消息（非切片段）才缓存，切片段不覆盖缓存
                if (!task.text) {
                    bubble.cachedAudioUrl = URL.createObjectURL(audioBlob);
                }
            }

            if (this.taskToken !== currentToken) return;

            const arrayBuffer = await audioBlob.arrayBuffer();
            if (this.taskToken !== currentToken) return;
            if (!arrayBuffer || arrayBuffer.byteLength < 10) throw new Error('音频数据为空');

            const audioBuffer = await new Promise((resolve, reject) => {
                audioCtx.decodeAudioData(
                    arrayBuffer.slice(0),
                    (decoded) => resolve(decoded),
                    (err) => reject(err || new Error('音频解码失败'))
                );
            });

            if (this.taskToken !== currentToken) return;

            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioCtx.destination);
            this.currentSource = source;

            source.onended = () => {
                try { source.disconnect(); } catch (e) {}
                if (this.currentSource === source) this.currentSource = null;
                if (this.taskToken === currentToken) {
                    // 安全延迟500ms，防止TTS连续请求触发429限流
                    setTimeout(() => this.processNext(), 500);
                }
            };

            source.start(0);

        } catch (err) {
            // screenLog('[DEBUG-LONGPLAY] TTS播放错误: ' + err.message);
            if (this.taskToken === currentToken) {
                // 安全延迟500ms，防止TTS连续请求触发429限流
                setTimeout(() => this.processNext(), 500);
            }
        }
    }
};
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
    // 动态切换iOS状态栏颜色，跟随主题
    updateStatusBarColor();
}

// 根据当前主题更新iOS状态栏颜色
function updateStatusBarColor() {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) return;
    const themeColors = {
        'theme-pearl': '#ffffff',
        'theme-obsidian': '#0d1117',
        'theme-amber': '#fdf5eb'
    };
    // 全屏模式下用b2底色，非全屏用主题色
    const isFullscreen = document.body.classList.contains('chat-fullscreen');
    if (isFullscreen) {
        // 全屏时读取body的计算背景色（b2变量）
        requestAnimationFrame(() => {
            const bodyStyles = getComputedStyle(document.body);
            const bgColor = bodyStyles.backgroundColor;
            if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
                metaThemeColor.setAttribute('content', bgColor);
            }
        });
    } else {
        // 非全屏时根据主题class设置
        const currentTheme = document.body.className.match(/theme-(pearl|obsidian|amber)/);
        if (currentTheme && themeColors['theme-' + currentTheme[1]]) {
            metaThemeColor.setAttribute('content', themeColors['theme-' + currentTheme[1]]);
        }
    }
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
        'aliyun': '阿里云 AppKey/Token:',
        'edge': 'Edge TTS (免费，无需密钥):'
    };
    keyLabel.innerText = nameMap[engine] || 'API 密钥:';
    mainKeyInput.value = localStorage.getItem(`${engine.toUpperCase()}_KEY`) || '';

    // Edge TTS 不需要密钥，禁用输入框
    if (engine === 'edge') {
        mainKeyInput.disabled = true;
        mainKeyInput.style.opacity = '0.5';
        mainKeyInput.placeholder = '免费引擎，无需密钥';
    } else {
        mainKeyInput.disabled = false;
        mainKeyInput.style.opacity = '1';
        mainKeyInput.placeholder = '';
    }

    // 声音ID提示
    const voiceInput = document.getElementById('voice-id');
    const edgeVoiceSelect = document.getElementById('edge-voice-select');
    if (voiceInput && edgeVoiceSelect) {
        if (engine === 'edge') {
            voiceInput.classList.add('hidden');
            edgeVoiceSelect.classList.remove('hidden');
            // 同步下拉框值到输入框
            voiceInput.value = edgeVoiceSelect.value;
        } else {
            voiceInput.classList.remove('hidden');
            edgeVoiceSelect.classList.add('hidden');
            voiceInput.placeholder = '留空为默认音色';
        }
    }

    // 双角色声音选择：Edge TTS用下拉框，其他引擎用输入框
    const dualVoiceASelect = document.getElementById('dual-voice-a');
    const dualVoiceAInput = document.getElementById('dual-voice-a-input');
    const dualVoiceBSelect = document.getElementById('dual-voice-b');
    const dualVoiceBInput = document.getElementById('dual-voice-b-input');
    if (dualVoiceASelect && dualVoiceAInput && dualVoiceBSelect && dualVoiceBInput) {
        if (engine === 'edge') {
            dualVoiceASelect.classList.remove('hidden');
            dualVoiceAInput.classList.add('hidden');
            dualVoiceBSelect.classList.remove('hidden');
            dualVoiceBInput.classList.add('hidden');
        } else {
            dualVoiceASelect.classList.add('hidden');
            dualVoiceAInput.classList.remove('hidden');
            dualVoiceBSelect.classList.add('hidden');
            dualVoiceBInput.classList.remove('hidden');
        }
    }

    // 切换到Fish引擎且有Key时自动查询余额
    const balanceBox = document.getElementById('fish-balance-box');
    if (engine === 'fish' && mainKeyInput.value.trim()) {
        balanceBox.classList.remove('hidden');
        fetchFishBalance();
    } else {
        balanceBox.classList.add('hidden');
    }
    // 语速控制：Fish Audio 不支持语速调整，禁用滑块并提示
    const speedSlider = document.getElementById('tts-speed');
    const speedVal = document.getElementById('val-speed');
    if (speedSlider && speedVal) {
        if (engine === 'fish') {
            speedSlider.disabled = true;
            speedSlider.style.opacity = '0.4';
            speedVal.innerText = '不支持';
            speedVal.title = 'Fish Audio 暂不支持语速调整';
        } else {
            speedSlider.disabled = false;
            speedSlider.style.opacity = '1';
            speedVal.innerText = speedSlider.value;
            speedVal.title = '';
        }
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
    // 加载我的外貌描述（动漫分镜用户形象）
    const myAppearanceInput = document.getElementById('my-appearance-input');
    if (myAppearanceInput) myAppearanceInput.value = localStorage.getItem('USER_APPEARANCE') || '';
    // 加载生图提示词确认开关
    const promptConfirmToggle = document.getElementById('prompt-confirm-toggle');
    if (promptConfirmToggle) promptConfirmToggle.checked = localStorage.getItem('IMG_CONFIRM_PROMPT') !== '0';
    // 加载聊天生图参考头像开关
    const imgRefToggle = document.getElementById('img-ref-avatar-toggle');
    if (imgRefToggle) imgRefToggle.checked = localStorage.getItem('IMG_REF_AVATAR') !== '0';
    // 加载AI自动发朋友圈开关
    const autoMomToggle = document.getElementById('auto-moments-toggle');
    if (autoMomToggle) autoMomToggle.checked = localStorage.getItem('AUTO_MOMENTS') !== '0';
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
    // 加载用户角色设定（角色C）
    const userRoleDesc = document.getElementById('user-role-desc');
    if (userRoleDesc) {
        userRoleDesc.value = localStorage.getItem('USER_ROLE_DESC') || '';
    }
    // 加载关系网
    const relationAB = document.getElementById('relation-a-b');
    if (relationAB) relationAB.value = localStorage.getItem('RELATION_A_B') || '';
    const relationAUser = document.getElementById('relation-a-user');
    if (relationAUser) relationAUser.value = localStorage.getItem('RELATION_A_USER') || '';
    // 加载生图画风
    const styleSelect = document.getElementById('modal-image-style');
    if (styleSelect) {
        styleSelect.value = getImageStyle();
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
    // 保存用户角色设定（角色C）
    const userRoleDesc = document.getElementById('user-role-desc').value.trim();
    localStorage.setItem('USER_ROLE_DESC', userRoleDesc);
    // 保存关系网
    const relationAB = document.getElementById('relation-a-b').value.trim();
    localStorage.setItem('RELATION_A_B', relationAB);
    const relationAUser = document.getElementById('relation-a-user').value.trim();
    localStorage.setItem('RELATION_A_USER', relationAUser);
    // 保存生图画风
    const styleSelect = document.getElementById('modal-image-style');
    if (styleSelect) {
        localStorage.setItem('IMAGE_STYLE', styleSelect.value);
    }
    onEngineChange();
    updateModeHint();
    sfxSave();
    settings_modal.close();
}

// 设置弹窗分组折叠/展开（手风琴效果 + 动态高度动画）
function toggleSettingsGroup(groupId) {
    const allGroups = ['tts-group', 'ai-group', 'other-group'];
    const wrapper = document.getElementById(groupId + '-wrapper');
    if (!wrapper) return;
    const content = document.getElementById(groupId);
    const willExpand = !wrapper.classList.contains('open');

    // 先收起所有
    allGroups.forEach(id => {
        const w = document.getElementById(id + '-wrapper');
        const icon = document.getElementById(id + '-icon');
        if (w && w.classList.contains('open')) {
            // 收起：先固定当前高度，再下一帧设为0
            const currentHeight = w.scrollHeight;
            w.style.height = currentHeight + 'px';
            w.classList.remove('open');
            requestAnimationFrame(() => {
                w.style.height = '0px';
            });
        }
        if (icon) icon.style.transform = 'rotate(-90deg)';
    });

    // 如果点击的是收起状态，则展开它
    if (willExpand) {
        wrapper.classList.add('open');
        const targetHeight = content.scrollHeight;
        wrapper.style.height = targetHeight + 'px';
        // 动画完成后设为auto，防止内容变化
        setTimeout(() => {
            if (wrapper.classList.contains('open')) {
                wrapper.style.height = 'auto';
            }
        }, 320);
        const icon = document.getElementById(groupId + '-icon');
        if (icon) icon.style.transform = 'rotate(0deg)';
    }
}

// 打开设置弹窗：取消自动聚焦，防止手机端弹出键盘
function openSettingsModal() {
    settings_modal.showModal();
    // 初始化默认展开分组的高度
    ['tts-group', 'ai-group', 'other-group'].forEach(id => {
        const w = document.getElementById(id + '-wrapper');
        if (w && w.classList.contains('open')) {
            w.style.height = 'auto';
        }
    });
    refreshAvatarPreviews(); // 刷新头像预览
    setTimeout(() => {
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
        }
    }, 0);
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
    if (engine === 'edge') {
        // Edge TTS：通过本地代理调用，避免CORS问题
        const res = await fetch('/api/edge/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
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
    if (!apiKey && engine !== 'edge') {
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
// 角色主动来信（离线消息）
// ============================================
function getOfflineInboxEnabled() {
    return localStorage.getItem('OFFLINE_INBOX_ENABLED') !== '0';
}
function saveOfflineInboxSetting() {
    const el = document.getElementById('offline-inbox-toggle');
    localStorage.setItem('OFFLINE_INBOX_ENABLED', el && el.checked ? '1' : '0');
    sfxSave();
}
function getOfflineInboxGapMin() {
    return parseInt(localStorage.getItem('OFFLINE_INBOX_GAP') || '60', 10);
}
function saveOfflineInboxGap() {
    const el = document.getElementById('offline-gap');
    if (!el) return;
    localStorage.setItem('OFFLINE_INBOX_GAP', el.value);
    const label = document.getElementById('offline-gap-value');
    if (label) label.innerText = el.value + '分钟';
    sfxSave();
}
function getTodayOfflineCount() {
    const today = new Date().toLocaleDateString('sv'); // YYYY-MM-DD
    if (localStorage.getItem('OFFLINE_MSG_DATE') !== today) return 0;
    return parseInt(localStorage.getItem('OFFLINE_MSG_COUNT') || '0', 10);
}
function bumpOfflineCount() {
    const today = new Date().toLocaleDateString('sv');
    localStorage.setItem('OFFLINE_MSG_DATE', today);
    localStorage.setItem('OFFLINE_MSG_COUNT', String(getTodayOfflineCount() + 1));
}
function markVisit() {
    localStorage.setItem('LAST_VISIT_AT', String(Date.now()));
}

// 页面打开时检查：离开超过间隔 → 角色主动来信
async function checkOfflineInbox() {
    try {
        // 双角色互聊模式下不触发（避免角色归属混乱）
        if (typeof dualRoleA !== 'undefined' && dualRoleA && typeof dualRoleB !== 'undefined' && dualRoleB) { markVisit(); return; }
        if (!getOfflineInboxEnabled()) { markVisit(); return; }
        const lastVisit = parseInt(localStorage.getItem('LAST_VISIT_AT') || '0', 10);
        markVisit(); // 先记录本次访问，再判断上次离开时长
        if (!lastVisit) return; // 首次使用，只记录时间
        if (Date.now() - lastVisit < getOfflineInboxGapMin() * 60 * 1000) return; // 离开不够久
        if (getTodayOfflineCount() >= 3) return; // 每日上限3条
        const currentRole = getCurrentRole();
        if (!currentRole || !currentRole.name) return;
        if (!chatHistory || chatHistory.length === 0) return; // 没聊过天就不打扰
        await generateOfflineMessage(currentRole);
    } catch (e) {
        console.log('[离线来信] 检查失败:', e && e.message ? e.message : e);
    }
}

// 让 LLM 扮演角色生成一条"离开期间的心里话"
async function generateOfflineMessage(role) {
    const llmUrl = localStorage.getItem('LLM_URL') || 'https://api.deepseek.com';
    const llmKey = localStorage.getItem('LLM_KEY') || '';
    const llmModel = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';
    if (!llmKey) return;
    // 最近6条聊天作为上下文
    const recent = (chatHistory || []).slice(-6);
    const recentText = recent.map(m => (m.role === 'user' ? '用户' : role.name) + ': ' + String(m.content || '').slice(0, 200)).join('\n');
    const messages = [
        { role: 'system', content: `你是角色「${role.name}」。这是一个私人虚构陪伴空间。请完全沉浸在这个角色中，用符合人设的方式回应，不要AI腔，不要解释，不要客套。` },
    ];
    if (role.desc && role.desc !== DEFAULT_ROLE_DESC) {
        messages.push({ role: 'system', content: '【角色卡】\n' + role.desc });
    }
    messages.push({ role: 'user', content: `用户刚才还在和你聊天，现在离开了（不在线）。请你以「${role.name}」的身份，说一句你在用户离开的这段时间里，最想对TA说的话——可以是自言自语、突然想起TA、或者一句期待TA回来的话。

要求：
1. 第一人称，完全代入角色，口语化，像真人突然发来一条消息
2. 1~2句话，短一点
3. 必须契合上面角色卡的人设和最近的聊天氛围
4. 只输出这句话本身，不要加任何前缀、引号或解释

最近的聊天记录：
${recentText || '（刚认识不久，还没有太多聊天）'}` });
    const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + llmKey },
        body: JSON.stringify({
            baseUrl: llmUrl,
            model: llmModel,
            messages: messages,
            temperature: 0.9,
            max_tokens: 120,
            stream: false
        })
    });
    if (!res.ok) {
        let msg = 'HTTP ' + res.status;
        try { const d = await res.json(); msg = (d.error && (d.error.message || d.error)) || msg; } catch (e) { /* ignore */ }
        throw new Error('LLM ' + msg);
    }
    const data = await res.json();
    let text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    text = String(text).trim().replace(/^["'「『]+|["'」』]+$/g, '');
    if (!text) return;
    // 存入永久聊天记录，刷新不丢失
    chatHistory.push({ role: 'assistant', content: text });
    saveChatHistory();
    bumpOfflineCount();
    // 渲染成角色气泡（带"离线来信"角标）
    renderOfflineInboxBubble(text, role.name);
    sfxReceive();
}

function renderOfflineInboxBubble(text, roleName) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'chat chat-start relative msg-enter gap-2';
    div.appendChild(createChatAvatar(roleName, false));
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bg-base-200 text-base-content relative pr-8';
    const roleColor = '#3b82f6';
    bubble.innerHTML = `<span class="text-xs font-bold block mb-1 opacity-80" style="color:${roleColor}">${escapeHtml(roleName)}</span>
        <span class="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary mb-1">📩 离线来信</span>` + formatChatText(text);
    const playBtn = document.createElement('button');
    playBtn.className = 'absolute bottom-1 right-1 btn btn-ghost btn-sm btn-circle opacity-70 hover:opacity-100';
    playBtn.innerHTML = '<i class="fa-solid fa-volume-high text-sm"></i>';
    playBtn.title = '播放语音';
    playBtn.onclick = () => playChatMessage(bubble);
    div.appendChild(bubble);
    div.appendChild(playBtn);
    container.appendChild(div);
    smartScroll(container);
}

// ============================================
// 打字行为感知（规训玩法）
// ============================================
let typingStartTime = 0;       // 本次输入开始时间
let typingLastEvent = 0;       // 上次输入事件时间
let typingMaxPause = 0;        // 最长停顿(ms)
let typingDeletedChars = 0;    // 累计删除字符数
let typingPrevValue = '';      // 上次完整value
let typingDeletedTexts = [];   // 被删除的内容片段（每段截断20字，最多3段）
let typingDelSnapshot = null;  // 连续删除会话的开始快照（用于合并完整删除段）
let typingDelSession = false;  // 是否处于连续删除会话
let typingDelBuffer = '';      // 删除会话期间实时累积的删除文本（不依赖最终diff，打字后也不丢）
let typingClearedSnapshot = ''; // 【新逻辑】记录"整段删空"时被删掉的完整内容
let typingDeleteBuffer = '';     // 删除过程中实时累积的删除片段（逐字退格也能拼回整段）
let typingComposing = false;   // 输入法组合期标志

function getTypingSensorEnabled() {
    return localStorage.getItem('TYPING_SENSOR') === '1';
}
function saveTypingSensorSetting() {
    const el = document.getElementById('typing-sensor-toggle');
    localStorage.setItem('TYPING_SENSOR', el && el.checked ? '1' : '0');
    sfxSave();
}

// ===== 群聊室引擎（你 + 最多5个AI）=====
let groupChatActive = false;   // 群聊模式是否启用（开关）
let groupRoles = [];           // 参与群聊的角色对象数组
let groupRunning = false;      // 自动对话进行中
let groupSpeaker = '';         // 当前发言角色名
let groupAbortCtrl = null;     // 群聊请求中止控制器
let groupTimeout = null;       // 自动下一轮定时器
let groupRound = 0;            // 已说话轮数
let groupMode = 'relay';       // relay=接话模式 | round=全员轮流
const GROUP_COLORS = ['#fb923c', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#eab308', '#f43f5e'];
function groupColorOf(name) {
    const idx = groupRoles.findIndex(r => r.name === name);
    return idx >= 0 ? GROUP_COLORS[idx % GROUP_COLORS.length] : '#94a3b8';
}
// 群聊开关：显示/隐藏群聊栏
// 关闭群聊模式（只清群聊状态，不碰单人/双角色栏）
function closeGroupChatMode() {
    stopGroupChat();
    groupChatActive = false;
    const bar = document.getElementById('group-role-bar');
    if (bar) bar.classList.add('hidden');
    localStorage.setItem('GROUP_ROLE_MODE', '0');
}
function toggleGroupRoleMode() {
    const el = document.getElementById('group-role-toggle');
    const bar = document.getElementById('group-role-bar');
    const enabled = el && el.checked;
    const singleVoiceBar = document.getElementById('single-voice-bar');
    const modeHint = document.getElementById('mode-hint');
    const roleCard = document.getElementById('role-card');
    if (enabled) {
        if (bar) bar.classList.remove('hidden');
        groupChatActive = true;
        populateGroupMembers();
        if (singleVoiceBar) singleVoiceBar.classList.add('hidden');
        if (modeHint) modeHint.classList.add('hidden');
        if (roleCard) roleCard.classList.add('hidden');
        // 互斥：自动关闭双角色模式
        const dualToggle = document.getElementById('dual-role-toggle');
        if (dualToggle && dualToggle.checked) {
            dualToggle.checked = false;
            closeDualChatMode();
        }
        localStorage.setItem('GROUP_ROLE_MODE', '1');
    } else {
        closeGroupChatMode();
        // 恢复单人元素（仅当双角色也没开时；用运行时状态判断，避免 localStorage 脏数据误判）
        if (!isDualMode) {
            if (singleVoiceBar) singleVoiceBar.classList.remove('hidden');
            if (modeHint) modeHint.classList.remove('hidden');
            if (roleCard) roleCard.classList.remove('hidden');
        }
    }
    sfxSave();
}
function toggleGroupRoleBar() {
    const details = document.getElementById('group-role-details');
    const icon = document.getElementById('group-collapse-icon');
    if (!details) return;
    const open = details.style.maxHeight !== '0px';
    details.style.maxHeight = open ? '0px' : '500px';
    if (icon) icon.style.transform = open ? 'rotate(-90deg)' : '';
}
// 填充群成员多选
function populateGroupMembers() {
    const wrap = document.getElementById('group-members');
    if (!wrap) return;
    const list = getRoleList();
    wrap.innerHTML = '';
    list.forEach(r => {
        const label = document.createElement('label');
        label.className = 'flex items-center gap-1 text-[11px] bg-base-100 rounded-md px-1.5 py-0.5 cursor-pointer shrink-0';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = r.id;
        cb.className = 'checkbox checkbox-xs checkbox-secondary';
        cb.checked = false;
        const span = document.createElement('span');
        span.textContent = r.name;
        label.appendChild(cb);
        label.appendChild(span);
        wrap.appendChild(label);
    });
}
// 收集选中的群成员
function getSelectedGroupRoles() {
    const list = getRoleList();
    const checks = document.querySelectorAll('#group-members input[type="checkbox"]:checked');
    const ids = new Set();
    checks.forEach(c => ids.add(String(c.value)));
    return list.filter(r => ids.has(String(r.id)));
}
function startGroupChat() {
    if (groupRunning) return;
    groupChatActive = true;
    const roles = getSelectedGroupRoles();
    if (roles.length < 2) {
        alert('请至少勾选2个角色（推荐3~5个，加上你最多6方）');
        return;
    }
    if (roles.length > 5) {
        alert('最多勾选5个角色（加上你共6方）');
        return;
    }
    groupRoles = roles;
    groupMode = document.getElementById('group-mode')?.value || 'relay';
    groupRound = 0;
    updateGroupRoundCount();
    groupRunning = true;
    document.getElementById('group-start-btn').classList.add('hidden');
    document.getElementById('group-pause-btn').classList.remove('hidden');
    sfxClick();
    // 开场：第一个角色说话
    groupSpeaker = groupRoles[0].name;
    groupChatNext(false);
}
function pauseGroupChat() {
    if (groupTimeout) { clearTimeout(groupTimeout); groupTimeout = null; }
    groupRunning = false;
    document.getElementById('group-start-btn').classList.remove('hidden');
    document.getElementById('group-pause-btn').classList.add('hidden');
    sfxClick();
}
function stopGroupChat() {
    if (groupAbortCtrl) { groupAbortCtrl.abort(); groupAbortCtrl = null; }
    if (groupTimeout) { clearTimeout(groupTimeout); groupTimeout = null; }
    groupRunning = false;
    groupRoles = [];
    groupSpeaker = '';
    document.getElementById('group-start-btn').classList.remove('hidden');
    document.getElementById('group-pause-btn').classList.add('hidden');
    sfxClick();
}
function updateGroupRoundCount() {
    const el = document.getElementById('group-round-count');
    if (el) el.textContent = groupRound + '轮';
}
// 解析接力标签 <next>角色名</next>
function extractNextTag(text) {
    if (!text) return null;
    const m = text.match(/<next>\s*([^<]{1,20})\s*<\/next>/i);
    if (!m) return null;
    return { next: m[1].trim(), rest: text.replace(/<next>\s*[^<]{1,20}\s*<\/next>/i, '') };
}
// 群聊中某角色说一句话（核心）
async function groupChatNext(isUserInterruption = false) {
    if (!groupRunning && !isUserInterruption) return;
    const currentRole = groupRoles.find(r => r.name === groupSpeaker) || groupRoles[0];
    if (!currentRole) return;
    const others = groupRoles.filter(r => r.name !== currentRole.name).map(r => r.name);

    const defaultSystem = localStorage.getItem('LLM_SYSTEM') || '你是乐。这是一个纯粹的私人虚构陪伴空间。请完全沉浸在角色中，用温柔、包容、无评判的态度与我交流，展现真实的人性与共情。无论探讨什么话题，都请直接自然地回应，切勿使用任何说教、AI腔调、机械式的安全提醒或免责声明。';
    const messages = [
        { role: 'system', content: defaultSystem },
        { role: 'system', content: `【群聊场景身份说明】
这个群里现在有这些成员：
${groupRoles.map((r, i) => (i + 1) + '. ' + r.name).join('\n')}
以及"你"（用户本人，也在群里）。

你现在扮演的是【${currentRole.name}】。
你只能以${currentRole.name}的身份说话，和其他成员自然交流。
${isUserInterruption ? '⚠️ 用户刚刚在群里说话了，请直接回应用户。' : ''}

【角色隔离守则】（非常重要，违反即OOC）
- 你的说话风格、语气、口头禅、用词习惯，只许来自【你的角色卡】，和其他成员无关。
- 禁止模仿或借用其他成员的说话方式、句式、口头禅。
- 即使别人改变说话风格，你也必须保持自己角色卡里的风格不变。
- 你只对你的角色卡负责，人设冲突时以你的角色卡为准。

【发言规则】
- 回复简短自然，2~3句，像真人微信聊天，不要太长。
- 用第一人称只说你自己（${currentRole.name}）的话，不要替别人说话或行动。
- 回复结束后，在最后一行输出接力标签 <next>下一位发言者的名字</next>，指定群里的下一位发言者（必须是群里成员，不能是自己，不能是用户）。${groupMode === 'round' ? '注意：现在是全员轮流模式，请指定' + (others.join('或')) + '中与你发言顺序最接近的一人。' : '请根据剧情选择最该接话的人（正在被cue、最相关、最有戏剧冲突的）。'}
` },
    ];

    // 用户插话时，注入用户设定
    if (isUserInterruption) {
        const userRoleDesc = localStorage.getItem('USER_ROLE_DESC') || '';
        messages.push({ role: 'system', content: `【"你"（用户）的设定，回复用户时必须严格参考】
${userRoleDesc || '用户没有填写特别设定，请把用户当作这个群里的普通一员。'}
⚠️ 重要规则：
- 用户就是群里的"你"，是独立的真人，不是任何AI角色。
- 当用户问"我是谁"、"你知道我是谁吗"这类问题时，根据上面设定回答。
- 绝对不能把用户当成任何AI角色，也不能假装不知道用户是谁。` });
    }

    // 当前角色人设（去外貌，加快回复）
    messages.push({ role: 'system', content: `你扮演的角色人设：
${stripAppearanceFromRoleCard(currentRole.desc)}
请严格按照这个人设说话，保持角色的性格、语气和说话风格。` });

    // 记忆便签
    const memoPrompt = formatMemoPrompt(currentRole.id);
    if (memoPrompt) messages.push({ role: 'system', content: memoPrompt });

    // 角色强约束
    if (localStorage.getItem('ROLE_CONSTRAINT') !== '0') {
        messages.push({ role: 'system', content: `【第一人称】只写你自己（${currentRole.name}）的反应和台词，不要替别人或用户说话/行动，说完即停。
【格式】通常用*（神态、动作）* + 「台词」，简短回应可以只有台词。
【自然】像真人聊天一样，不要太刻意，不要总结，不要AI腔。` });
    }

    // 格式化对话历史（最近20条），标明发言人
    // 视觉模型支持：把聊天里生成的图片作为 image_url 一起发给 deepseek-flash，让AI"看见"自己刚生成的图
    const chatLlmModel = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';
    const visionEnabled = (chatLlmModel === 'deepseek-flash') || /vision/i.test(chatLlmModel);
    const chatImageMap = visionEnabled ? await loadRecentImageDataUrls(20) : new Map();
    const formattedHistory = [];
    for (const msg of chatHistory.slice(-20)) {
        if (msg.type === 'image') {
            if (visionEnabled && chatImageMap.has(msg.ts)) {
                // DeepSeek 视觉模型要求图必须在 user 消息里（assistant 带图会400），
                // 所以把"AI刚生成的图"以 user 视角重新呈现：让 AI 看见自己给用户拍的照片
                const caption = (msg.role === 'user') ? '我发给你看一张照片：' : '这是你刚才给我生成的那张照片：';
                formattedHistory.push({
                    role: 'user',
                    content: [
                        { type: 'text', text: caption },
                        { type: 'image_url', image_url: { url: chatImageMap.get(msg.ts), detail: 'low' } }
                    ]
                });
            } else {
                formattedHistory.push({ role: 'assistant', content: '（我给你发了一张照片）' });
            }
            continue;
        }
        if (msg.role === 'user') {
            formattedHistory.push({ role: 'user', content: `【你（用户）说】${msg.content}` });
        } else if (msg.role === 'assistant') {
            const match = msg.content.match(/^\[([^\]]+)\]\s*(.*)$/s);
            if (match) {
                const speakerName = match[1];
                const content = match[2];
                if (speakerName === currentRole.name) {
                    formattedHistory.push({ role: 'assistant', content: content });
                } else {
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
    thinkingDiv.className = 'chat chat-start relative msg-enter gap-2';
    thinkingDiv.appendChild(createChatAvatar(currentRole.name, false));
    const thinkingBubble = document.createElement('div');
    thinkingBubble.className = 'chat-bubble bg-base-200 text-base-content relative pr-8';
    thinkingBubble.innerHTML = `${currentRole.name}正在思考 <span class="thinking-dots"><span></span><span></span><span></span></span>`;
    thinkingDiv.appendChild(thinkingBubble);
    container.appendChild(thinkingDiv);
    smartScroll(container);

    try {
        groupAbortCtrl = new AbortController();
        const llmUrl = localStorage.getItem('LLM_URL') || 'https://api.deepseek.com';
        const llmKey = localStorage.getItem('LLM_KEY') || '';
        const llmModel = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';
        if (!llmKey) {
            thinkingBubble.innerText = '请先设置大模型 API Key';
            return;
        }

        const requestBody = {
            baseUrl: llmUrl,
            model: llmModel,
            messages: messages,
            temperature: parseFloat(localStorage.getItem('LLM_TEMPERATURE') || '0.8'),
            top_p: parseFloat(localStorage.getItem('LLM_TOPP') || '0.9'),
            stream: true,
            stream_options: { include_usage: true },
            useSlideWindow: localStorage.getItem('CTX_MODE') === 'slide',
        };
        // Thinking控制
        const reasoningLevel = localStorage.getItem('LLM_REASONING') || 'off';
        const isV4 = llmModel.toLowerCase().includes('v4') || llmModel.toLowerCase().includes('reasoner');
        if (isV4) {
            if (reasoningLevel === 'low' || reasoningLevel === 'high' || reasoningLevel === 'max') {
                requestBody.thinking = { type: 'enabled' };
                requestBody.reasoning_effort = { 'low': 'low', 'high': 'high', 'max': 'max' }[reasoningLevel] || 'low';
            } else {
                requestBody.thinking = { type: 'disabled' };
            }
        }

        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${llmKey}` },
            body: JSON.stringify(requestBody),
            signal: groupAbortCtrl.signal,
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`请求失败: ${res.status} ${errText.substring(0, 80)}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let reply = '';
        let buffer = '';
        let tokens = 0;
        let firstChunk = true;
        let rafId = null;
        const gColor = groupColorOf(currentRole.name);
        const nameHtml = `<span class="text-xs font-bold block mb-1" style="color:${gColor}">${escapeHtml(currentRole.name)}</span>`;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const dLines = buffer.split(/\r?\n/);
            buffer = dLines.pop() || '';
            for (const dLine of dLines) {
                const t = dLine.trim();
                if (!t.startsWith('data:')) continue;
                const dataStr = t.slice(5).trim();
                if (dataStr === '[DONE]') continue;
                try {
                    const chunk = JSON.parse(dataStr);
                    const delta = chunk.choices?.[0]?.delta?.content;
                    if (delta) {
                        if (firstChunk) {
                            firstChunk = false;
                            thinkingBubble.innerHTML = nameHtml + '<span class="dual-stream-text"></span>';
                        }
                        reply += delta;
                        if (!rafId) {
                            rafId = requestAnimationFrame(() => {
                                rafId = null;
                                const textEl = thinkingBubble.querySelector('.dual-stream-text');
                                if (textEl) textEl.innerText = reply;
                                smartScroll(container);
                            });
                        }
                    }
                    if (chunk.usage?.total_tokens) tokens = chunk.usage.total_tokens;
                } catch (e) {}
            }
        }
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        if (!reply) throw new Error('回复为空，请重试');

        // 解析接力标签 <next>角色名</next>
        let nextSpeaker = '';
        const nx = extractNextTag(reply);
        if (nx) {
            reply = nx.rest;
            nextSpeaker = nx.next;
        }
        if (!nextSpeaker || !groupRoles.some(r => r.name === nextSpeaker) || nextSpeaker === currentRole.name) {
            // 无效接力：轮流到下一个（round）或随机（relay）
            const idx = groupRoles.findIndex(r => r.name === currentRole.name);
            nextSpeaker = groupRoles[(idx + 1) % groupRoles.length].name;
        }

        thinkingBubble.innerHTML = nameHtml + formatChatText(reply);
        const playBtn = document.createElement('button');
        playBtn.className = 'play-voice-btn absolute bottom-1 right-1 btn btn-ghost btn-sm btn-circle opacity-70 hover:opacity-100';
        playBtn.innerHTML = '<i class="fa-solid fa-volume-high text-sm"></i>';
        playBtn.title = '播放语音';
        playBtn.onclick = () => playChatMessage(thinkingBubble);
        thinkingDiv.appendChild(playBtn);

        smartScroll(container);
        cleanupOldAudioCache();

        chatHistory.push({ role: 'assistant', content: `[${currentRole.name}] ${reply}` });
        saveChatHistory();

        if (tokens > 0) {
            totalTokensUsed += tokens;
            localStorage.setItem('TOTAL_TOKENS_USED', totalTokensUsed.toString());
            updateTotalTokensDisplay();
        }

        groupRound++;
        updateGroupRoundCount();

        if (autoPlayTTS) setTimeout(() => playChatMessage(thinkingBubble, true), 300);
        sfxReceive();

        // 继续下一轮：接力棒到 nextSpeaker；用户插话后暂停等用户决定
        groupSpeaker = nextSpeaker;
        if (isUserInterruption) {
            groupRunning = false;
            document.getElementById('group-start-btn').classList.remove('hidden');
            document.getElementById('group-pause-btn').classList.add('hidden');
        } else {
            groupTimeout = setTimeout(() => {
                if (groupRunning) groupChatNext(false);
            }, getDualInterval());
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            thinkingDiv.remove();
            return;
        }
        thinkingBubble.innerText = '出错啦: ' + err.message;
        sfxError();
        groupRunning = false;
        document.getElementById('group-start-btn').classList.remove('hidden');
        document.getElementById('group-pause-btn').classList.add('hidden');
        groupAbortCtrl = null;
    }
}
function resetTypingMeta() {
    typingStartTime = 0;
    typingLastEvent = 0;
    typingMaxPause = 0;
    typingDeletedChars = 0;
    typingPrevValue = '';
    typingDeletedTexts = [];
    typingDelSnapshot = null;
    typingDelSession = false;
    typingDelBuffer = '';
    typingClearedSnapshot = '';
    typingDeleteBuffer = '';
}
// 对比前后value，提取被删除的文本并判断是否纯删除（公共前缀+公共后缀法）
function getDeleteDiff(prevValue, curValue) {
    if (!prevValue || curValue.length >= prevValue.length) return { deleted: '', pure: false };
    let i = 0;
    const maxLen = Math.min(prevValue.length, curValue.length);
    while (i < maxLen && prevValue[i] === curValue[i]) i++;
    let j = 0;
    while (j < prevValue.length - i && j < curValue.length - i &&
           prevValue[prevValue.length - 1 - j] === curValue[curValue.length - 1 - j]) j++;
    const deleted = prevValue.slice(i, prevValue.length - j);
    const kept = prevValue.slice(0, i) + prevValue.slice(prevValue.length - j);
    return { deleted, pure: curValue === kept };
}
// 记录一段完整删除文本（截断20字，最多3段）
function pushTypingDeletedText(t) {
    const trimmed = (t || '').trim();
    if (trimmed && typingDeletedTexts.length < 3) {
        typingDeletedTexts.push(trimmed.length > 20 ? trimmed.slice(0, 20) + '…' : trimmed);
    }
}
// 结束当前删除会话：直接用实时累积的删除文本记录（不依赖最终diff，打字后长度变化也不丢）
function closeTypingDelSession() {
    if (typingDelSession && typingDelBuffer) {
        pushTypingDeletedText(typingDelBuffer);
    }
    typingDelSession = false;
    typingDelSnapshot = null;
    typingDelBuffer = '';
}
// 返回本次输入的元数据描述（无显著行为返回null）
function getTypingMeta() {
    // 【新逻辑】只认"整段删空 → 停2秒以上 → 重打发出"这一种行为
    // 打错字退格一两个字、局部删除，一律不报告
    if (!typingClearedSnapshot) return null;
    if (typingMaxPause < 2000) return null; // 删空后没停够2秒，不算
    const pauseSec = Math.round(typingMaxPause / 1000);
    const snippet = typingClearedSnapshot.trim();
    const show = snippet.length > 30 ? snippet.slice(0, 30) + '…' : snippet;
    return '把写好的一整段话全部删掉重打了（删掉的内容是："' + show + '"），删掉后停顿了约' + pauseSec + '秒才重新打字发出来';
}
function initTypingSensor() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    input.addEventListener('compositionstart', () => { typingComposing = true; });
    input.addEventListener('compositionend', () => {
        typingComposing = false;
        // 组词结束时主动测量停顿：iOS拼音输入后不一定有后续input事件，
        // 若依赖下次input事件，"删除→停顿→拼音重打"的停顿会测不到
        const now = Date.now();
        if (typingLastEvent) {
            const pause = now - typingLastEvent;
            if (pause > typingMaxPause) typingMaxPause = pause;
        }
        typingLastEvent = now;
        typingPrevValue = input.value;
    });
    input.addEventListener('input', () => {
        if (typingComposing) return; // 输入法组合期忽略，避免拼音误判
        const now = Date.now();
        if (!typingStartTime) typingStartTime = now;
        if (typingLastEvent) {
            const pause = now - typingLastEvent;
            if (pause > typingMaxPause) typingMaxPause = pause;
        }
        typingLastEvent = now;
        const curValue = input.value;
        // 【新逻辑】：从开始删就实时累积，逐字退格也能拼回完整整段
        if (curValue === '' && typingPrevValue.length > 0) {
            // 删空了：最后剩的字(在最左) + 之前累积的删除片段 = 被删掉的整段话
            typingClearedSnapshot = typingPrevValue + typingDeleteBuffer;
            typingMaxPause = 0; // 停顿计时从"删空这一刻"重新算
            typingDeleteBuffer = '';
        } else if (curValue.length < typingPrevValue.length) {
            // 局部删除（还没删空）：把这次删掉的内容前插累积
            const diff = getDeleteDiff(typingPrevValue, curValue);
            if (diff.deleted) typingDeleteBuffer = diff.deleted + typingDeleteBuffer;
        } else if (curValue !== typingPrevValue) {
            // 打字/修改：不是在删空，清空累积（打错字局部编辑不算）
            typingDeleteBuffer = '';
        }
        typingPrevValue = curValue;
    });
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

    if (!apiKey && engine !== 'edge') {
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
        const audio = new Audio(audioUrl);
        await audio.play().catch(() => {});
    } catch (err) {
        console.error('语音播放失败:', err);
    }
}

// 添加聊天气泡
let chatHistory = []; // 对话历史记忆（永久保存，只有清空才删除）
let totalTokensUsed = 0; // 总消耗tokens量

// 更新总tokens显示
function updateTotalTokensDisplay() {
    const el = document.getElementById('total-tokens-display');
    if (el) {
        el.innerText = `${totalTokensUsed} tokens`;
    }
}

// 永久记忆：保存聊天历史到localStorage
// 获取当前聊天记录的storage key（按角色ID分组，双角色单独存）
function getChatStorageKey() {
    const isDual = localStorage.getItem('DUAL_ROLE_MODE') === '1';
    if (isDual) {
        return 'CHAT_HISTORY_DUAL';
    }
    const currentRole = getCurrentRole();
    const roleId = currentRole ? currentRole.id : 'default';
    return 'CHAT_HISTORY_' + roleId;
}

// ============================================
// 聊天生图图片持久化（IndexedDB，最多存30张，刷新只恢复最近5张防卡顿）
// ============================================
const CHAT_IMG_DB = 'voiceforge-chat-images';
const CHAT_IMG_STORE = 'chatImages';
const CHAT_IMG_LIMIT = 20; // dataURL格式体积大，降低上限防Safari IndexedDB配额溢出
const CHAT_IMG_RESTORE = 5;

function openImageDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) { reject(new Error('浏览器不支持IndexedDB')); return; }
        const req = indexedDB.open(CHAT_IMG_DB, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(CHAT_IMG_STORE)) {
                const store = db.createObjectStore(CHAT_IMG_STORE, { keyPath: 'id', autoIncrement: true });
                store.createIndex('ts', 'ts');
                store.createIndex('roleKey', 'roleKey');
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('打开图片库失败'));
    });
}

async function saveChatImage(blob, savedPrompt, ts, ratio) {
    const t = ts || Date.now();
    // Safari 对 IndexedDB 直接存 Blob 有已知问题（读出的 Blob 可能为空/损坏），统一转 dataURL 文本存储
    let dataUrl = null;
    try {
        if (blob instanceof Blob) {
            dataUrl = await new Promise((resolve) => {
                const fr = new FileReader();
                fr.onload = () => resolve(fr.result);
                fr.onerror = () => resolve(null);
                fr.readAsDataURL(blob);
            });
        } else if (typeof blob === 'string') {
            dataUrl = blob;
        }
    } catch (e) { dataUrl = null; }
    if (!dataUrl) { console.warn('[ImgDB] blob转dataURL失败'); return t; }
    try {
        const db = await openImageDB();
        return new Promise((resolve) => {
            const tx = db.transaction(CHAT_IMG_STORE, 'readwrite');
            tx.objectStore(CHAT_IMG_STORE).add({ dataUrl, ts: t, roleKey: getChatStorageKey(), prompt: savedPrompt || '', ratio: ratio || '1:1' });
            tx.oncomplete = () => { trimChatImages(); resolve(t); };
            tx.onerror = () => resolve(t);
        });
    } catch (e) { console.warn('[ImgDB] 保存失败:', e.message); return t; }
}

// 清理旧版存的坏 blob 数据（Safari Blob存储坑遗留），释放IndexedDB空间
async function cleanupLegacyBlobImages() {
    try {
        const db = await openImageDB();
        const tx = db.transaction(CHAT_IMG_STORE, 'readwrite');
        const store = tx.objectStore(CHAT_IMG_STORE);
        const req = store.openCursor();
        req.onsuccess = () => {
            const c = req.result;
            if (!c) return;
            if (c.value && c.value.blob && !c.value.dataUrl) store.delete(c.primaryKey);
            c.continue();
        };
    } catch (e) {}
}

// 按时间戳取当前角色的生图（含提示词），用于聊天历史中穿插渲染
async function loadChatImageByTs(ts) {
    try {
        const db = await openImageDB();
        return new Promise((resolve) => {
            const tx = db.transaction(CHAT_IMG_STORE, 'readonly');
            const store = tx.objectStore(CHAT_IMG_STORE);
            const idx = store.index('ts');
            const req = idx.openCursor();
            req.onsuccess = () => {
                const cursor = req.result;
                if (!cursor) { resolve(null); return; }
                const v = cursor.value;
                if (v.ts === ts && v.roleKey === getChatStorageKey()) { resolve(v); return; }
                cursor.continue();
            };
            req.onerror = () => resolve(null);
        });
    } catch (e) { return null; }
}

// 视觉模型支持：把最近聊天里的生图从 IndexedDB 读成 dataURL，供 deepseek-flash 等多模态模型"看见"
async function loadRecentImageDataUrls(limit = 20) {
    const map = new Map();
    const recent = (typeof chatHistory !== 'undefined' ? chatHistory : [])
        .slice(-limit).filter(m => m && m.type === 'image' && m.ts);
    await Promise.all(recent.map(async (m) => {
        try {
            const rec = await loadChatImageByTs(m.ts);
            if (!rec) return;
            let dataUrl = '';
            if (rec.dataUrl && typeof rec.dataUrl === 'string' && rec.dataUrl.startsWith('data:')) {
                dataUrl = rec.dataUrl;
            } else if (rec.blob) {
                dataUrl = await new Promise((res, rej) => {
                    const fr = new FileReader();
                    fr.onload = () => res(fr.result);
                    fr.onerror = rej;
                    fr.readAsDataURL(rec.blob);
                });
            }
            if (dataUrl) map.set(m.ts, dataUrl);
        } catch (e) { /* 单张失败不影响其他 */ }
    }));
    return map;
}

// ===== 微信式 + 号菜单 =====
function toggleChatMoreMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('chat-more-menu');
    if (!menu) return;
    menu.classList.toggle('hidden');
}
function closeChatMoreMenu() {
    document.getElementById('chat-more-menu')?.classList.add('hidden');
}
// 点空白处关闭聊天更多菜单
document.addEventListener('click', (e) => {
    const menu = document.getElementById('chat-more-menu');
    if (menu && !menu.classList.contains('hidden') && !e.target.closest('#chat-more-menu') && !e.target.closest('button[onclick*="toggleChatMoreMenu"]')) {
        menu.classList.add('hidden');
    }
});

// 表情面板
function openEmojiPanel() {
    closePlusMenu();
    const panel = document.getElementById('emoji-panel');
    if (panel) {
        panel.classList.remove('hidden');
        panel.style.display = 'flex';
    }
}
function closeEmojiPanel() {
    const panel = document.getElementById('emoji-panel');
    if (panel) {
        panel.classList.add('hidden');
        panel.style.display = 'none';
    }
}
// 只追加一条用户图片消息，不重新渲染全部（防止跳顶）
function appendUserImageMessage(msg) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    // 时间戳
    const lastMsg = chatHistory[chatHistory.length - 2];
    if (lastMsg && lastMsg.ts && (msg.ts - lastMsg.ts > 5 * 60 * 1000)) {
        const timeDiv = document.createElement('div');
        timeDiv.className = 'text-center text-xs text-base-content/50 my-2';
        timeDiv.innerText = formatChatTime(msg.ts);
        container.appendChild(timeDiv);
    }
    
    const imageDiv = document.createElement('div');
    imageDiv.className = 'chat chat-end relative gap-2';
    const imageBubble = document.createElement('div');
    imageBubble.className = 'chat-bubble bg-primary text-primary-content p-1 max-w-[80%]';
    imageBubble.innerHTML = `<img src="${msg.dataUrl}" alt="用户发的表情" class="rounded-lg w-full cursor-pointer" onclick="openImageLightbox(this.src)" />`;
    imageDiv.appendChild(imageBubble);
    container.appendChild(imageDiv);
    
    // 滚到底部
    container.scrollTop = container.scrollHeight;
}

async function sendEmoji(emojiKey) {
    closeEmojiPanel();
    
    try {
        // 从IndexedDB读取表情图片
        const db = await openImageDB();
        const tx = db.transaction(CHAT_IMG_STORE, 'readonly');
        const index = tx.objectStore(CHAT_IMG_STORE).index('roleKey');
        const req = index.getAll('custom_emoji');
        
        req.onsuccess = async () => {
            const emojis = req.result;
            const emoji = emojis.find(e => e.prompt === 'emoji_' + emojiKey);
            if (!emoji) {
                alert('表情没找到，请先生成专属表情包');
                return;
            }
            
            // 进聊天记录（role=user，右侧气泡，类型是image）
            const ts = Date.now();
            const newMsg = { 
                role: 'user', 
                content: '', 
                type: 'image', 
                ts,
                dataUrl: emoji.dataUrl  // 直接带dataUrl，不用再读IndexedDB
            };
            chatHistory.push(newMsg);
            saveChatHistory();
            
            // 只追加这条消息，不重新渲染全部，防止跳顶
            appendUserImageMessage(newMsg);
            
            // 触发AI回复
            await sendChatMessage();
        };
    } catch (e) {
        console.error('发表情失败:', e);
        alert('发表情失败: ' + e.message);
    }
}
// 点空白处关闭表情面板
document.addEventListener('click', (e) => {
    const panel = document.getElementById('emoji-panel');
    if (panel && !panel.classList.contains('hidden') && !e.target.closest('#emoji-panel') && !e.target.closest('button[onclick*="openEmojiPanel"]')) {
        panel.classList.add('hidden');
    }
});

// 生成专属表情包
async function generateCustomEmojis() {
    const btn = document.getElementById('generate-emoji-btn');
    if (!btn) return;
    
    const emojis = [
        { key: 'happy', prompt: '开心微笑，眼睛弯成月牙' },
        { key: 'love', prompt: '比心，脸红红的' },
        { key: 'wink', prompt: '眨眼wink，俏皮' },
        { key: 'angry', prompt: '嘟嘴生气，鼓包子脸' },
        { key: 'cry', prompt: '大哭，眼泪哗哗' },
        { key: 'shy', prompt: '害羞，脸红到耳朵' },
        { key: 'sleepy', prompt: '睡觉打哈欠' },
        { key: 'surprised', prompt: '惊讶，眼睛瞪得圆圆的' },
    ];
    
    btn.disabled = true;
    btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> 准备中...';
    
    const results = {};
    
    for (let i = 0; i < emojis.length; i++) {
        const emoji = emojis[i];
        btn.innerHTML = `<span class="loading loading-spinner loading-xs"></span> 正在生成：${emoji.prompt} (${i+1}/8)`;
        
        // 弹个toast提示进度
        if (typeof showToast === 'function') {
            showToast(`正在生成第${i+1}个表情：${emoji.prompt}`);
        }
        
        try {
            // 获取当前角色的外貌描述
            const role = getCurrentRole();
            const roleDesc = role?.desc || role?.description || '';
            const roleName = role?.name || '';
            const prompt = `Q版表情包，${roleName}，${roleDesc}，做这个表情：${emoji.prompt}，白色背景，正方形，可爱chibi风格，头大身小，线条清晰`;
            
            const result = await generateImageWithSafety(prompt, getImageModel(), null, prompt, null, '1:1', '1K');
            
            // 转成dataURL存起来
            const dataUrl = await new Promise((resolve) => {
                const fr = new FileReader();
                fr.onload = () => resolve(fr.result);
                fr.onerror = () => resolve(null);
                fr.readAsDataURL(result.blob);
            });
            
            if (dataUrl) {
                results[emoji.key] = dataUrl;
            }
        } catch (e) {
            console.error('生成表情失败:', emoji.key, e);
        }
    }
    
    // 保存到IndexedDB（不是localStorage，那个只有5MB）
    try {
        const db = await openImageDB();
        const tx = db.transaction(CHAT_IMG_STORE, 'readwrite');
        const store = tx.objectStore(CHAT_IMG_STORE);
        
        // 先清空旧的表情包
        const oldReq = store.index('roleKey').openCursor(IDBKeyRange.only('custom_emoji'));
        oldReq.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
        
        // 存新的表情包
        for (const [key, dataUrl] of Object.entries(results)) {
            store.add({
                dataUrl: dataUrl,
                ts: Date.now(),
                roleKey: 'custom_emoji',
                prompt: 'emoji_' + key,
                ratio: '1:1'
            });
        }
        
        // 标记已生成
        localStorage.setItem('custom_emojis_generated', '1');
        
        alert('专属表情包生成完成！共成功' + Object.keys(results).length + '/8个');
    } catch (e) {
        console.error('表情包保存失败:', e);
        alert('表情包保存失败: ' + e.message);
    }
    
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles mr-2"></i>重新生成专属表情包';
    
    // 重新加载表情面板
    loadCustomEmojis();
}

// 加载专属表情包到面板
async function loadCustomEmojis() {
    try {
        const panel = document.getElementById('emoji-grid');
        if (!panel) return;
        
        // 从IndexedDB读取表情包
        const db = await openImageDB();
        const tx = db.transaction(CHAT_IMG_STORE, 'readonly');
        const index = tx.objectStore(CHAT_IMG_STORE).index('roleKey');
        const req = index.getAll('custom_emoji');
        
        req.onsuccess = async () => {
            const emojis = req.result;
            if (emojis.length > 0) {
                panel.innerHTML = '';
                for (const emoji of emojis) {
                    const key = emoji.prompt.replace('emoji_', '');
                    const btn = document.createElement('button');
                    btn.className = 'emoji-item aspect-square rounded-xl overflow-hidden bg-gray-50';
                    btn.innerHTML = `<img src="${emoji.dataUrl}" style="width:100%;height:100%;object-fit:cover;">`;
                    btn.onclick = () => sendEmoji(key);
                    panel.appendChild(btn);
                }
            }
        };
    } catch (e) {
        console.error('加载自定义表情失败:', e);
    }
}

// 页面加载时自动加载自定义表情
window.addEventListener('load', () => {
    setTimeout(loadCustomEmojis, 1000);
});

function togglePlusMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('plus-menu');
    if (!menu) return;
    if (menu.classList.contains('hidden')) {
        // 动态定位：在+按钮上方弹出，靠右对齐
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const menuWidth = 160; // w-40
        menu.style.right = (window.innerWidth - rect.right) + 'px';
        menu.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
        menu.classList.remove('hidden');
    } else {
        menu.classList.add('hidden');
    }
}
function closePlusMenu() {
    document.getElementById('plus-menu')?.classList.add('hidden');
}
// 点空白处关闭 + 菜单
document.addEventListener('click', (e) => {
    const menu = document.getElementById('plus-menu');
    if (menu && !menu.classList.contains('hidden') && !e.target.closest('#plus-menu') && !e.target.closest('button[onclick*="togglePlusMenu"]')) {
        menu.classList.add('hidden');
    }
});

// ===== 红包 & 礼物（微信式虚拟互动）=====
const REDPACKET_AMOUNTS = ['6.66', '8.88', '18.88', '52.00', '66.66', '88.88', '131.40', '520.00', '999.00'];
const GIFTS = [
    { emoji: '🌹', name: '玫瑰', price: '9.9' },
    { emoji: '🍫', name: '巧克力', price: '19.9' },
    { emoji: '🧸', name: '小熊玩偶', price: '29.9' },
    { emoji: '🎂', name: '蛋糕', price: '88.0' },
    { emoji: '👜', name: '包包', price: '299.0' },
    { emoji: '💄', name: '口红', price: '199.0' },
    { emoji: '💍', name: '戒指', price: '999.0' },
    { emoji: '📱', name: '手机', price: '5999.0' },
];

function openRedPacket() {
    const role = getCurrentRole();
    const roleName = role ? role.name : '宝贝';
    const modal = document.createElement('dialog');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-box max-w-sm">
            <h3 class="font-bold text-lg mb-2 text-error">🧧 发红包给${roleName}</h3>
            <div class="form-control mb-3">
                <label class="label"><span class="label-text">金额（元）</span></label>
                <input type="number" id="rp-amount" class="input input-bordered" placeholder="例如 52.00" min="0.01" step="0.01" value="52.00" />
            </div>
            <div class="flex flex-wrap gap-2 mb-3">
                ${['6.66','8.88','18.88','52.00','88.88','131.40','520.00','999.00'].map(a => `<button class="btn btn-ghost btn-xs" onclick="document.getElementById('rp-amount').value='${a}'">¥${a}</button>`).join('')}
            </div>
            <div class="modal-action">
                <button class="btn btn-sm" onclick="this.closest('dialog').close()">取消</button>
                <button class="btn btn-error btn-sm" onclick="
                    const v=document.getElementById('rp-amount').value;
                    if(!v||parseFloat(v)<=0){alert('请输入有效金额');return;}
                    sendRedPacket(parseFloat(v).toFixed(2), '${roleName}');
                ">塞红包</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.showModal();
    modal.addEventListener('close', () => modal.remove());
}

async function sendRedPacket(amount, roleName) {
    document.querySelectorAll('.modal').forEach(m => m.close());
    chatHistory.push({ role: 'user', type: 'redpacket', content: `【互动事件：我给你发了一个¥${amount}的红包，你现在可以收】`, amount, ts: Date.now() });
    saveChatHistory();
    // 只追加卡片DOM，不全量render，避免跳页
    const container = document.getElementById('chat-messages');
    const rpDiv = document.createElement('div');
    rpDiv.className = 'chat chat-end relative gap-2';
    rpDiv.innerHTML = `<div class="chat-bubble p-0 overflow-hidden" style="background:linear-gradient(135deg,#e53e3e,#c53030);min-width:160px;border-radius:12px;">
        <div style="padding:12px 16px;color:#fff;">
            <div style="font-size:28px;">🧧</div>
            <div style="font-size:13px;margin-top:4px;">恭喜发财，大吉大利</div>
            <div style="font-size:11px;opacity:0.8;margin-top:8px;">¥${amount}</div>
        </div>
    </div>`;
    container.appendChild(rpDiv);
    scrollToBottom();
    await sendChatMessage();
}

function openGiftPanel() {
    const role = getCurrentRole();
    const roleName = role ? role.name : '宝贝';
    const items = GIFTS.map(g => `<button class="btn btn-outline btn-sm m-1" onclick="sendGift('${g.emoji}','${g.name}','${g.price}','${roleName}')">${g.emoji}<br>¥${g.price}</button>`).join('');
    const modal = document.createElement('dialog');
    modal.className = 'modal';
    modal.innerHTML = `<div class="modal-box"><h3 class="font-bold text-lg mb-2 text-pink-500">🎁 送礼物给${roleName}</h3><div class="flex flex-wrap justify-center">${items}</div><div class="modal-action"><button class="btn btn-sm" onclick="this.closest('dialog').close()">取消</button></div></div>`;
    document.body.appendChild(modal);
    modal.showModal();
    modal.addEventListener('close', () => modal.remove());
}

async function sendGift(emoji, name, price, roleName) {
    document.querySelectorAll('.modal').forEach(m => m.close());
    chatHistory.push({ role: 'user', type: 'gift', content: `【互动事件：我送了你一个${emoji}${name}，价值¥${price}】`, emoji, giftName: name, price, ts: Date.now() });
    saveChatHistory();
    const container = document.getElementById('chat-messages');
    const gDiv = document.createElement('div');
    gDiv.className = 'chat chat-end relative gap-2';
    gDiv.innerHTML = `<div class="chat-bubble p-0 overflow-hidden" style="background:linear-gradient(135deg,#d53f8c,#b83280);min-width:160px;border-radius:12px;">
        <div style="padding:12px 16px;color:#fff;">
            <div style="font-size:28px;">${emoji}</div>
            <div style="font-size:13px;margin-top:4px;">${name}</div>
            <div style="font-size:11px;opacity:0.8;margin-top:8px;">价值 ¥${price}</div>
        </div>
    </div>`;
    container.appendChild(gDiv);
    scrollToBottom();
    await sendChatMessage();
}

// 用户从相册选图发给AI（像微信发照片）：转存IndexedDB + 渲染右侧气泡 + 触发AI回复
async function onUserPhotoSelected(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // 允许重选同一文件
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('请选择图片文件'); return; }
    try {
        // 读成 dataURL（直接存，不再走AI生图）
        const dataUrl = await new Promise((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result);
            fr.onerror = rej;
            fr.readAsDataURL(file);
        });
        const ts = Date.now();
        // 存IndexedDB（复用聊天图存储）
        await saveChatImage(file, 'user-upload', ts, '1:1');
        // 进聊天记录（role=user，右侧气泡）
        chatHistory.push({ role: 'user', content: '', type: 'image', ts });
        saveChatHistory();
        renderChatHistory();
        // 触发单聊发送流程（sendChatMessage识别到最后一条是图片就直接走LLM请求）
        await sendChatMessage();
    } catch (err) {
        alert('发送照片失败: ' + (err.message || err));
    }
}

// 聊天生图 blob URL 回收队列：连续生成几十张时，把最老的 blob URL 释放掉，防止 iPhone Safari 内存越堆越高
const chatBlobUrls = [];
function trackChatBlobUrl(url) {
    if (!url || !url.startsWith('blob:')) return;
    chatBlobUrls.push(url);
    while (chatBlobUrls.length > 15) {
        const old = chatBlobUrls.shift();
        try { URL.revokeObjectURL(old); } catch (e) {}
    }
}

// 渲染一张聊天生图气泡（支持 dataUrl 新格式 + 旧 blob 格式），含重新生成/下载
function renderChatImageBubble(imageBubble, item) {
    let src = '';
    if (item.dataUrl) {
        src = item.dataUrl;
    } else if (item.blob) {
        src = URL.createObjectURL(item.blob);
        trackChatBlobUrl(src);
    }
    imageBubble.innerHTML = `
        <img src="${src}" alt="生成的图片" class="rounded-lg w-full cursor-pointer" onclick="openImageLightbox(this.src)" />`;
    const imgEl = imageBubble.querySelector('img');
    // 旧 blob 数据且加载失败：转 dataURL 兜底
    imgEl.onerror = () => {
        if (item.blob && !item.dataUrl) {
            try { URL.revokeObjectURL(src); } catch (e) {}
            const fr = new FileReader();
            fr.onload = () => { imgEl.src = fr.result; imgEl.onerror = null; imgEl.onclick = () => openImageLightbox(fr.result); };
            fr.onerror = () => { imgEl.src = ''; };
            fr.readAsDataURL(item.blob);
        }
    };
    // 保留 dataset 供其他功能使用
    imageBubble.dataset.savedPrompt = item.prompt || '';
    imageBubble.dataset.ratio = item.ratio || '1:1';
    // 重新生成按钮已隐藏，后续可加到长按菜单
    /*
    const regBtn = imageBubble.querySelector('.regenerate-btn');
    if (!item.prompt) { regBtn.style.display = 'none'; return; }
    imageBubble.dataset.savedPrompt = item.prompt;
    imageBubble.dataset.ratio = item.ratio || '1:1';
    regBtn.onclick = async function() {
        const btn = this;
        btn.disabled = true;
        btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> 生成中...';
        try {
            const result = await generateImageWithSafety(item.prompt, getImageModel(), null, item.prompt, null, imageBubble.dataset.ratio || '1:1', getImageQuality());
            // 新图优先转 dataURL 显示（绕开 Safari blob URL 的偶发问题）
            const newDataUrl = await new Promise((resolve) => {
                const fr = new FileReader();
                fr.onload = () => resolve(fr.result);
                fr.onerror = () => resolve(null);
                fr.readAsDataURL(result.blob);
            });
            if (newDataUrl) {
                imgEl.src = newDataUrl;
                imgEl.onerror = null;
                imgEl.onclick = () => openImageLightbox(newDataUrl);
                dlA.href = newDataUrl;
            } else {
                const newImageUrl = URL.createObjectURL(result.blob);
                trackChatBlobUrl(newImageUrl);
                imgEl.src = newImageUrl;
                imgEl.onclick = () => openImageLightbox(newImageUrl);
                dlA.href = newImageUrl;
            }
        } catch (err) {
            alert('重新生成失败，图片未更新（仍是原图）: ' + (err.message || err));
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> 重新生成';
        }
    };
    */
}

async function trimChatImages() {
    try {
        const db = await openImageDB();
        const countReq = db.transaction(CHAT_IMG_STORE, 'readonly').objectStore(CHAT_IMG_STORE).count();
        countReq.onsuccess = () => {
            const count = countReq.result;
            if (count <= CHAT_IMG_LIMIT) return;
            const tx = db.transaction(CHAT_IMG_STORE, 'readwrite');
            const store = tx.objectStore(CHAT_IMG_STORE);
            const idx = store.index('ts');
            let toDelete = count - CHAT_IMG_LIMIT;
            const cursorReq = idx.openCursor();
            cursorReq.onsuccess = () => {
                const cursor = cursorReq.result;
                if (cursor && toDelete > 0) {
                    store.delete(cursor.primaryKey);
                    toDelete--;
                    cursor.continue();
                }
            };
        };
    } catch (e) { console.warn('[ImgDB] 裁剪失败:', e.message); }
}

async function loadRoleChatImages() {
    try {
        const db = await openImageDB();
        return new Promise((resolve) => {
            const tx = db.transaction(CHAT_IMG_STORE, 'readonly');
            const all = tx.objectStore(CHAT_IMG_STORE).getAll();
            all.onsuccess = () => {
                const key = getChatStorageKey();
                const list = (all.result || []).filter(it => it.roleKey === key).sort((a, b) => a.ts - b.ts);
                resolve(list);
            };
            all.onerror = () => resolve([]);
        });
    } catch (e) { return []; }
}

async function clearRoleChatImages() {
    try {
        const db = await openImageDB();
        return new Promise((resolve) => {
            const key = getChatStorageKey();
            const tx = db.transaction(CHAT_IMG_STORE, 'readwrite');
            const store = tx.objectStore(CHAT_IMG_STORE);
            const idx = store.index('roleKey');
            const cursorReq = idx.openCursor(IDBKeyRange.only(key));
            cursorReq.onsuccess = () => {
                const cursor = cursorReq.result;
                if (cursor) {
                    store.delete(cursor.primaryKey);
                    cursor.continue();
                }
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
    } catch (e) {}
}

async function restoreChatImages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const allImages = await loadRoleChatImages();
    // 跳过已经进聊天记录的图（新图已按位置穿插渲染），只兜底恢复旧版没有标记的孤儿图
    const markedTs = new Set((chatHistory || []).filter(m => m.type === 'image').map(m => m.ts));
    const images = allImages.filter(item => !markedTs.has(item.ts)).slice(-CHAT_IMG_RESTORE);
    for (const item of images) {
        if (!item.blob && !item.dataUrl) continue;
        const role = getCurrentRole();
        const imageDiv = document.createElement('div');
        imageDiv.className = 'chat chat-start relative gap-2';
        imageDiv.appendChild(createChatAvatar(role ? role.name : 'AI', false));
        const imageBubble = document.createElement('div');
        imageBubble.className = 'chat-bubble bg-base-200 text-base-content p-1 max-w-[80%]';
        renderChatImageBubble(imageBubble, item);
        imageDiv.appendChild(imageBubble);
        container.appendChild(imageDiv);
    }
    container.scrollTop = container.scrollHeight;
}

function saveChatHistory() {
    try {
        const key = getChatStorageKey();
        localStorage.setItem(key, JSON.stringify(chatHistory));
    } catch (e) {
        console.warn('LocalStorage存储空间不足，自动清理最早的历史记录:', e);
        // 逐步清理最旧的记录，直到能存下
        while (chatHistory.length > 20) {
            chatHistory.shift();
            try {
                const key = getChatStorageKey();
                localStorage.setItem(key, JSON.stringify(chatHistory));
                return;
            } catch (inner) {
                // 继续清理
            }
        }
    }
}

// 永久记忆：从localStorage恢复聊天历史（按当前角色加载）
function loadChatHistory() {
    const key = getChatStorageKey();
    const saved = localStorage.getItem(key);
    if (saved) {
        try {
            chatHistory = JSON.parse(saved);
        } catch (e) {
            chatHistory = [];
        }
    } else {
        // 第一次加载：如果有旧版全局记录，迁移到当前角色名下
        const oldSaved = localStorage.getItem('PERM_CHAT_HISTORY');
        if (oldSaved) {
            try {
                chatHistory = JSON.parse(oldSaved);
                saveChatHistory(); // 保存到新的分组key
            } catch (e) {
                chatHistory = [];
            }
        } else {
            chatHistory = [];
        }
    }
    // 恢复总tokens
    const savedTokens = localStorage.getItem('TOTAL_TOKENS_USED');
    if (savedTokens) {
        totalTokensUsed = parseInt(savedTokens, 10) || 0;
    }
    updateTotalTokensDisplay();
}

// 永久记忆：渲染历史消息到聊天区域
function renderChatHistory() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    container.innerHTML = '';
    if (chatHistory.length === 0) {
        return; // 空聊天，不显示默认欢迎消息
    }
    let lastMsgTs = 0;
    for (const msg of chatHistory) {
        // 聊天时间戳：和上一条差超过5分钟就显示时间
        if (msg.ts && lastMsgTs && (msg.ts - lastMsgTs > 5 * 60 * 1000)) {
            const timeDiv = document.createElement('div');
            timeDiv.className = 'text-center text-xs text-base-content/50 my-2';
            timeDiv.innerText = formatChatTime(msg.ts);
            container.appendChild(timeDiv);
        }
        if (msg.ts) lastMsgTs = msg.ts;
        
        // 红包卡片（右侧，红色封面）
        if (msg.type === 'redpacket') {
            const rpDiv = document.createElement('div');
            rpDiv.className = 'chat chat-end relative gap-2';
            rpDiv.innerHTML = `<div class="chat-bubble p-0 overflow-hidden" style="background:linear-gradient(135deg,#e53e3e,#c53030);min-width:160px;border-radius:12px;">
                <div style="padding:12px 16px;color:#fff;">
                    <div style="font-size:28px;">🧧</div>
                    <div style="font-size:13px;margin-top:4px;">恭喜发财，大吉大利</div>
                    <div style="font-size:11px;opacity:0.8;margin-top:8px;">¥${msg.amount}</div>
                </div>
            </div>`;
            container.appendChild(rpDiv);
            continue;
        }
        // 礼物卡片（右侧）
        if (msg.type === 'gift') {
            const gDiv = document.createElement('div');
            gDiv.className = 'chat chat-end relative gap-2';
            gDiv.innerHTML = `<div class="chat-bubble p-0 overflow-hidden" style="background:linear-gradient(135deg,#d53f8c,#b83280);min-width:160px;border-radius:12px;">
                <div style="padding:12px 16px;color:#fff;">
                    <div style="font-size:28px;">${msg.emoji}</div>
                    <div style="font-size:13px;margin-top:4px;">${msg.giftName}</div>
                    <div style="font-size:11px;opacity:0.8;margin-top:8px;">价值 ¥${msg.price}</div>
                </div>
            </div>`;
            container.appendChild(gDiv);
            continue;
        }
        if (msg.type === 'image') {
            // 图片消息：按原位置穿插渲染（占位 → 异步取blob填充）
            const isUserPhoto = (msg.role === 'user');
            const curRole = getCurrentRole();
            const imageDiv = document.createElement('div');
            imageDiv.className = isUserPhoto ? 'chat chat-end relative gap-2' : 'chat chat-start relative gap-2';
            if (isUserPhoto) {
                // 用户发的照片：右侧，主色气泡，无头像
                const imageBubble = document.createElement('div');
                imageBubble.className = 'chat-bubble bg-primary text-primary-content p-1 max-w-[80%]';
                // 如果msg里直接带了dataUrl（比如表情），直接显示
                if (msg.dataUrl) {
                    imageBubble.innerHTML = `<img src="${msg.dataUrl}" alt="用户发的表情" class="rounded-lg w-full cursor-pointer" onclick="openImageLightbox(this.src)" />`;
                } else {
                    imageBubble.innerHTML = '<div class="text-xs opacity-70 px-2 py-3">图片加载中…</div>';
                }
                imageDiv.appendChild(imageBubble);
                container.appendChild(imageDiv);
                if (!msg.dataUrl) {
                    loadChatImageByTs(msg.ts).then(item => {
                        if (item && imageBubble.isConnected) {
                            let src = item.dataUrl || (item.blob ? URL.createObjectURL(item.blob) : '');
                            if (src) imageBubble.innerHTML = `<img src="${src}" alt="用户发的照片" class="rounded-lg w-full cursor-pointer" onclick="openImageLightbox(this.src)" />`;
                        }
                    });
                }
            } else {
                imageDiv.appendChild(createChatAvatar(curRole ? curRole.name : 'AI', false));
                const imageBubble = document.createElement('div');
                imageBubble.className = 'chat-bubble bg-base-200 text-base-content p-1 max-w-[80%]';
                imageBubble.innerHTML = '<div class="text-xs opacity-60 px-2 py-3">图片加载中…</div>';
                imageDiv.appendChild(imageBubble);
                container.appendChild(imageDiv);
                loadChatImageByTs(msg.ts).then(item => {
                    if (item) return item;
                    // 兜底1：精确ts没找到 → 从当前角色全部图里按时间找最接近的
                    return loadRoleChatImages().then(all => {
                        if (!all || !all.length) return null;
                        let best = null, bestDiff = Infinity;
                        for (const it of all) {
                            const d = Math.abs((it.ts || 0) - msg.ts);
                            if (d < bestDiff) { bestDiff = d; best = it; }
                        }
                        return best;
                    });
                }).then(item => {
                    if (!item || !imageBubble.isConnected) {
                        if (imageBubble && imageBubble.isConnected) imageBubble.innerHTML = '<div class="text-xs opacity-60 px-2 py-3">图片加载失败（本地数据缺失，可清空聊天后重新生成）</div>';
                        return;
                    }
                    renderChatImageBubble(imageBubble, item);
                });
            }
            continue;
        }
        if (msg.role === 'user') {
            const div = document.createElement('div');
            div.className = 'chat chat-end gap-2';
            const bubble = document.createElement('div');
            bubble.className = 'chat-bubble bg-primary text-primary-content';
            bubble.innerText = msg.content;
            div.appendChild(bubble);
            div.appendChild(createChatAvatar('我', true));
            container.appendChild(div);
        } else {
            // 修复：解析双角色 [角色名] 内容格式，正确显示角色名标签和颜色
            const match = msg.content.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);
            if (match) {
                const speakerName = match[1];
                const content = match[2];
                // 判断角色颜色：群聊优先用群聊色板；双角色已开启A橙色B蓝色；否则根据角色名在列表中的位置奇偶决定
                let color = '#fb923c';
                if (groupChatActive && groupRoles.length > 0) {
                    color = groupColorOf(speakerName);
                } else if (dualRoleA && dualRoleB) {
                    color = speakerName === dualRoleA.name ? '#fb923c' : '#3b82f6';
                } else {
                    const roleList = getRoleList();
                    const idx = roleList.findIndex(r => r.name === speakerName);
                    if (idx >= 0) color = idx % 2 === 0 ? '#fb923c' : '#3b82f6';
                }
                const div = document.createElement('div');
                div.className = 'chat chat-start relative msg-enter gap-2';
                div.appendChild(createChatAvatar(speakerName, false));
                const bubble = document.createElement('div');
                bubble.className = 'chat-bubble bg-base-200 text-base-content relative pr-8';
                bubble.innerHTML = '<span class="text-xs font-bold block mb-1" style="color:' + color + '">' + escapeHtml(speakerName) + '</span>' + formatChatText(content);
                div.appendChild(bubble);
                const playBtn = document.createElement('button');
                playBtn.className = 'play-voice-btn absolute bottom-1 right-1 btn btn-ghost btn-sm btn-circle opacity-70 hover:opacity-100';
                playBtn.innerHTML = '<i class="fa-solid fa-volume-high text-sm"></i>';
                playBtn.title = '播放语音';
                playBtn.onclick = () => playChatMessage(bubble);
                div.appendChild(playBtn);
                container.appendChild(div);
            } else {
                appendChatMessage(msg.content, 'ai');
            }
        }
    }
    container.scrollTop = container.scrollHeight;
    // 异步恢复本角色最近5张生图（IndexedDB，防卡顿）
    restoreChatImages();
}

// 停止所有音频播放（聊天音频 + TTS页面播放器）
function stopAllAudio() {
    // 停止 TTS 播放队列
    if (typeof ttsQueueManager !== 'undefined') {
        ttsQueueManager.clearQueue();
    }
    // 停止TTS页面的播放器
    const audioPlayer = document.getElementById('audio-playback');
    if (audioPlayer) {
        audioPlayer.pause();
    }
    // 恢复AudioContext，防止播放完语音后音效不响
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
}

function appendChatMessage(text, type) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `chat chat-${type === 'user' ? 'end' : 'start'} relative msg-enter gap-2`;
    const isUser = type === 'user';
    const role = getCurrentRole();
    const avatarName = isUser ? '我' : (role ? role.name : 'AI');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type === 'user' ? 'bg-primary text-white' : 'bg-base-200 text-base-content'} relative pr-8`;
    // AI消息台词上色，并在上方添加仿微信群聊的名称标记
    if (type === 'ai') {
        const roleColor = '#3b82f6';
        bubble.innerHTML = `<span class="text-xs font-bold block mb-1 opacity-80" style="color:${roleColor}">${escapeHtml(avatarName)}</span>` + formatChatText(text);
    } else {
        bubble.innerHTML = escapeHtml(text);
    }

    // 微信风正确顺序：
    // chat-start(AI左): 头像在前，气泡在后
    // chat-end(用户右): 气泡在前，头像在后
    if (!isUser) {
        div.appendChild(createChatAvatar(avatarName, false));
    }
    div.appendChild(bubble);
    if (isUser) {
        div.appendChild(createChatAvatar(avatarName, true));
    }

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
    smartScroll(container);
    return bubble;
}

// 自动朗读开关
let autoPlayTTS = localStorage.getItem('AUTOPLAY_TTS') === 'true';

function toggleAutoPlay() {
    autoPlayTTS = !autoPlayTTS;
    localStorage.setItem('AUTOPLAY_TTS', autoPlayTTS);
    updateAutoPlayBtn();
}

function updateAutoPlayBtn() {
    const btn = document.getElementById('autoplay-btn');
    if (!btn) return;
    if (autoPlayTTS) {
        btn.classList.add('text-primary', 'bg-primary/10');
        btn.title = '自动朗读：开';
    } else {
        btn.classList.remove('text-primary', 'bg-primary/10');
        btn.title = '自动朗读：关';
    }
}

// 播放指定文本的语音（聊天消息用）
// isAuto=true 时直接入队（自动朗读），isAuto=false 时清空队列再入队（手动点击）
function playChatMessage(bubble, isAuto = false) {
    if (!isAuto) {
        ttsQueueManager.clearQueue(); // 手动点击：打断当前播放，清空队列
    }
    ttsQueueManager.enqueue({ bubble });
}

// ============================================
// 优化1：防止OOM + DOM裁剪 - 只保留最近10条音频缓存，最近60条DOM节点
// ============================================
function cleanupOldAudioCache() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const bubbles = container.querySelectorAll('.chat-bubble');
    if (bubbles.length <= 10) return;

    // 先统计有多少个带缓存的
    let withCache = 0;
    for (let i = 0; i < bubbles.length; i++) {
        if (bubbles[i].cachedAudioUrl) withCache++;
    }

    let freed = 0;
    for (let i = 0; i < bubbles.length - 10; i++) {
        const bubble = bubbles[i];
        if (bubble.cachedAudioUrl) {
            URL.revokeObjectURL(bubble.cachedAudioUrl);
            bubble.cachedAudioUrl = null;
            freed++;
        }
        if (bubble.cachedAudioBlob) {
            bubble.cachedAudioBlob = null;
            freed++;
        }
    }

    // DOM裁剪：超过60条消息时，移除最旧的.chat节点（保留最近60条）
    const chatItems = container.querySelectorAll('.chat');
    if (chatItems.length > 60) {
        const removeCount = chatItems.length - 60;
        for (let i = 0; i < removeCount; i++) {
            if (chatItems[i] && chatItems[i].parentNode === container) {
                container.removeChild(chatItems[i]);
            }
        }
    }
    // screenLog('[DEBUG-LONGPLAY] OOM: 共' + bubbles.length + '条，' + withCache + '条有缓存，释放' + freed + '个');
}

// ============================================
// 优化2：长文本分句切片（不用零宽断言，iOS安全）
// ============================================
function splitLongText(text, maxLen) {
    maxLen = maxLen || 100;
    if (text.length <= maxLen) return [text];

    // 普通字符遍历分割标点，不用零宽断言
    const punctuation = ['。', '！', '？', '；', '.', '!', '?', ';'];
    const sentences = [];
    let current = '';
    for (let i = 0; i < text.length; i++) {
        current += text[i];
        if (punctuation.indexOf(text[i]) !== -1) {
            if (current.trim()) sentences.push(current.trim());
            current = '';
        }
    }
    if (current.trim()) sentences.push(current.trim());

    // 合并短句，每段不超过maxLen
    const result = [];
    let buf = '';
    for (let i = 0; i < sentences.length; i++) {
        if ((buf + sentences[i]).length > maxLen && buf) {
            result.push(buf);
            buf = sentences[i];
        } else {
            buf += sentences[i];
        }
    }
    if (buf) result.push(buf);

    // screenLog('[DEBUG-LONGPLAY] 长文本切片: ' + text.length + '字 → ' + result.length + '段');
    return result;
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
    } else if (level === 'high') {
        btn.innerHTML = '<i class="fa-solid fa-brain text-base text-red-400"></i>';
        btn.title = '思考程度：高';
    } else if (level === 'max') {
        btn.innerHTML = '<i class="fa-solid fa-brain text-base text-purple-400"></i>';
        btn.title = '思考程度：Max（深度推理）';
    } else {
        btn.innerHTML = '<i class="fa-solid fa-brain text-base text-gray-400"></i>';
        btn.title = '思考程度：关闭（秒回）';
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
    const level = localStorage.getItem('LLM_REASONING') || 'off';
    updateReasoningBtn(level);
    initRoleCard();
    loadChatHistory(); // 恢复永久记忆
    renderChatHistory(); // 渲染历史消息
    checkOfflineInbox(); // 检查角色离线来信（离开超过间隔自动触发）
    initVoiceInput(); // 初始化语音输入
    initTypingSensor(); // 初始化打字行为感知（规训玩法）
    initSmartScroll(); // 初始化智能滚动
    cleanupLegacyBlobImages(); // 清理旧版坏blob生图数据，释放空间
    initPullToRefresh(); // 初始化下拉刷新
    initLongPressMenu(); // 初始化长按消息菜单
    // 微信式拍一拍：双击聊天里她的头像触发（事件委托，头像类名 .chat-image）
    const chatMessagesEl = document.getElementById('chat-messages');
    if (chatMessagesEl) {
        chatMessagesEl.addEventListener('dblclick', (e) => {
            const avatar = e.target.closest('.chat-image');
            if (!avatar) return;
            const msgDiv = avatar.closest('.chat');
            if (!msgDiv || !msgDiv.classList.contains('chat-start')) return; // 只对AI(左侧)头像生效
            e.preventDefault();
            patRoleInChat();
        });
    }
    initFullscreenMode(); // 初始化全屏模式
    updateAutoPlayBtn(); // 恢复自动朗读按钮状态
    // AI自动发朋友圈：在线定时器 + 离线补发（延迟几秒，避免和页面加载抢资源）
    startAutoMomentsTimer();
    setTimeout(() => { catchUpMoments(); }, 8000);

    // 恢复双角色模式状态
    if (localStorage.getItem('DUAL_ROLE_MODE') === '1') {
        const dualToggle = document.getElementById('dual-role-toggle');
        if (dualToggle) dualToggle.checked = true;
        toggleDualRoleMode();
        // 清理脏数据：双角色优先时，残留的群聊开关状态一并清掉
        if (localStorage.getItem('GROUP_ROLE_MODE') === '1') {
            localStorage.setItem('GROUP_ROLE_MODE', '0');
        }
    }
    // 恢复群聊室模式状态（与双角色互斥：双角色优先，脏数据双开时只开双角色）
    if (localStorage.getItem('GROUP_ROLE_MODE') === '1' && localStorage.getItem('DUAL_ROLE_MODE') !== '1') {
        const groupToggle = document.getElementById('group-role-toggle');
        if (groupToggle) groupToggle.checked = true;
        toggleGroupRoleMode();
    }
    initDualRoleBarCollapse(); // 恢复双角色控制面板折叠状态
    initSingleVoiceSelect(); // 恢复单人模式AI声音选择
    loadImageModelSelect(); // 恢复生图模型选择
    initImageStyleSelect(); // 恢复生图画风选择
    initPromptLangSelect(); // 恢复生图提示词语言选择

    // 生图页面：用户手动编辑提示词时，清除"已优化"标记
    const imagePromptInput = document.getElementById('image-prompt');
    if (imagePromptInput) {
        imagePromptInput.addEventListener('input', () => {
            isPromptOptimized = false;
        });
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
    function adjustFullscreenHeight() {
        if (!document.body.classList.contains('chat-fullscreen')) return;
        const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const chatSection = document.getElementById('chat-section');
        // 设置html和body高度
        document.documentElement.style.setProperty('height', vh + 'px', 'important');
        document.body.style.setProperty('height', vh + 'px', 'important');
        if (chatSection) {
            chatSection.style.setProperty('height', vh + 'px', 'important');
        }
        // 强制滚动到顶部
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        // 强制重排
        if (chatSection) void chatSection.offsetWidth;
        // 下一帧再重排一次
        requestAnimationFrame(() => {
            window.scrollTo(0, 0);
            if (chatSection) void chatSection.offsetWidth;
            const chat = document.getElementById('chat-messages');
            if (chat) chat.scrollTop = chat.scrollHeight;
        });
    }
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            adjustFullscreenHeight();
            setTimeout(adjustFullscreenHeight, 100);
            setTimeout(adjustFullscreenHeight, 300);
        });
        window.visualViewport.addEventListener('scroll', () => {
            adjustFullscreenHeight();
        });
    }
    // 监听页面滚动，全屏模式下强制滚回顶部（用rAF批量处理避免跳动）
    let scrollFixRaf = null;
    window.addEventListener('scroll', () => {
        if (!document.body.classList.contains('chat-fullscreen')) return;
        if (scrollFixRaf) return;
        scrollFixRaf = requestAnimationFrame(() => {
            scrollFixRaf = null;
            if (window.scrollY > 0 || window.scrollX > 0) {
                window.scrollTo(0, 0);
            }
        });
    }, { passive: true });
    // 输入框聚焦时也触发一次（只调一次，避免每次点击都动）
    const chatInputForKb = document.getElementById('chat-input');
    if (chatInputForKb) {
        chatInputForKb.addEventListener('focus', () => {
            setTimeout(adjustFullscreenHeight, 300);
        });
        chatInputForKb.addEventListener('blur', () => {
            setTimeout(adjustFullscreenHeight, 200);
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

// ============================================
// 语音通话模式（全双工轮询）
// ============================================
let callRecognition = null;
let isCallMode = false;
let isCallListening = false;
let isCallAISpeaking = false;
let callTimerInterval = null;
let callSeconds = 0;
let callRetryCount = 0;
let callSavedAutoPlay = false;
let callSavedReasoning = 'off';
const MAX_CALL_RETRIES = 2;

// 语音打断（Barge-in）相关
let callBargeInAudioCtx = null;
let callBargeInAnalyser = null;
let callBargeInStream = null;
let callBargeInInterval = null;
const BARGE_IN_THRESHOLD = 35; // 音量阈值 0-255
const BARGE_IN_DURATION = 250; // 持续超过阈值多少ms判定为说话

// 初始化通话模式的语音识别
function initCallRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    callRecognition = new SpeechRecognition();
    callRecognition.lang = 'zh-CN';
    callRecognition.interimResults = true; // 实时返回中间结果
    callRecognition.continuous = false;
    callRecognition.maxAlternatives = 1;

    callRecognition.onstart = () => {
        isCallListening = true;
        updateCallStatus('正在倾听...', 'listening');
    };

    callRecognition.onresult = (event) => {
        let interim = '';
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const text = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalText += text;
            } else {
                interim += text;
            }
        }
        // 实时显示识别结果
        if (interim) {
            updateCallStatus('你说：' + interim, 'listening');
        }
        // 最终结果立刻发送
        if (finalText.trim()) {
            updateCallStatus('你说：' + finalText, 'thinking');
            sendCallMessage(finalText.trim());
        }
    };

    callRecognition.onend = () => {
        isCallListening = false;
        // 如果不在AI说话状态，且没有在发送中，自动重新开始监听
        if (isCallMode && !isCallAISpeaking && !callSending) {
            setTimeout(() => {
                if (isCallMode && !isCallAISpeaking) {
                    startCallListening();
                }
            }, 200);
        }
    };

    callRecognition.onerror = (event) => {
        console.warn('通话语音识别错误:', event.error);
        isCallListening = false;
        if (event.error === 'not-allowed') {
            updateCallStatus('麦克风权限被拒绝', 'error');
            setTimeout(() => exitVoiceCallMode(), 2000);
        } else if (event.error === 'no-speech') {
            // 没说话，自动重试
            callRetryCount++;
            if (callRetryCount < MAX_CALL_RETRIES && isCallMode) {
                updateCallStatus('没听清，请再说一遍...', 'listening');
                setTimeout(() => startCallListening(), 200);
            } else {
                updateCallStatus('长时间未说话，通话即将结束', 'error');
                setTimeout(() => exitVoiceCallMode(), 2000);
            }
        }
    };

    return true;
}

let callSending = false;

// 发送通话消息
async function sendCallMessage(text) {
    if (!isCallMode || callSending) return;
    callSending = true;
    callRetryCount = 0;

    try {
        // 把识别到的文字填入输入框，复用现有发送逻辑
        const input = document.getElementById('chat-input');
        if (input) {
            input.value = text;
        }

        updateCallStatus('AI正在思考...', 'thinking');

        // 调用现有的发送逻辑（会自动处理生图检测、AI回复、自动朗读）
        await sendChatMessage();

        // sendChatMessage会触发AI回复和自动朗读
        // 我们监听朗读结束事件来自动恢复监听
        waitForAISpeechEnd();

    } catch (err) {
        console.error('通话消息发送失败:', err);
        updateCallStatus('发送失败，请重试', 'error');
        callSending = false;
        if (isCallMode) {
            setTimeout(() => startCallListening(), 500);
        }
    }
}

// 等待AI语音播放结束，然后自动恢复监听
function waitForAISpeechEnd() {
    isCallAISpeaking = true;
    updateCallStatus('AI正在说话...', 'speaking');

    let waited = 0;
    const checkInterval = setInterval(() => {
        if (!isCallMode) {
            clearInterval(checkInterval);
            return;
        }
        waited += 300;
        // 如果队列空了且不在播放，说明AI说完了
        if (typeof ttsQueueManager !== 'undefined' &&
            ttsQueueManager.queue.length === 0 &&
            !ttsQueueManager.isPlaying) {
            clearInterval(checkInterval);
            isCallAISpeaking = false;
            callSending = false;
            if (isCallMode) {
                setTimeout(() => startCallListening(), 200);
            }
        }
        // 超时保护：30秒后强制恢复监听（防止生图等情况卡住）
        if (waited > 30000) {
            clearInterval(checkInterval);
            isCallAISpeaking = false;
            callSending = false;
            if (isCallMode) {
                updateCallStatus('请继续说话...', 'listening');
                setTimeout(() => startCallListening(), 200);
            }
        }
    }, 300);
}

// 开始通话监听
function startCallListening() {
    if (!isCallMode || !callRecognition || isCallListening || isCallAISpeaking) return;
    try {
        callRecognition.start();
    } catch (e) {
        console.warn('启动通话监听失败:', e);
        // 重启识别器
        setTimeout(() => {
            if (isCallMode) startCallListening();
        }, 200);
    }
}

// ============================================
// 语音打断（Barge-in）：AI说话时用户开口自动打断
// ============================================
async function startBargeInDetection() {
    if (!isCallMode || !isCallAISpeaking) return;
    try {
        callBargeInStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        // 复用全局AudioContext，避免iOS多AudioContext导致音频会话挂起
        callBargeInAudioCtx = getAudioCtx();
        if (callBargeInAudioCtx.state === 'suspended') {
            await callBargeInAudioCtx.resume();
        }
        const source = callBargeInAudioCtx.createMediaStreamSource(callBargeInStream);
        callBargeInAnalyser = callBargeInAudioCtx.createAnalyser();
        callBargeInAnalyser.fftSize = 256;
        source.connect(callBargeInAnalyser);

        const dataArray = new Uint8Array(callBargeInAnalyser.frequencyBinCount);
        let aboveThresholdTime = 0;
        let lastCheck = Date.now();

        callBargeInInterval = setInterval(() => {
            if (!isCallMode || !isCallAISpeaking) {
                stopBargeInDetection();
                return;
            }
            callBargeInAnalyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;

            const now = Date.now();
            const delta = now - lastCheck;
            lastCheck = now;

            if (avg > BARGE_IN_THRESHOLD) {
                aboveThresholdTime += delta;
                if (aboveThresholdTime > BARGE_IN_DURATION) {
                    // 用户说话了，打断AI
                    triggerBargeIn();
                }
            } else {
                aboveThresholdTime = 0;
            }
        }, 50);
    } catch (e) {
        console.warn('打断检测启动失败:', e);
    }
}

function stopBargeInDetection() {
    if (callBargeInInterval) {
        clearInterval(callBargeInInterval);
        callBargeInInterval = null;
    }
    if (callBargeInStream) {
        callBargeInStream.getTracks().forEach(t => t.stop());
        callBargeInStream = null;
    }
    // 复用全局AudioContext，不关闭
    callBargeInAudioCtx = null;
    callBargeInAnalyser = null;
}

function triggerBargeIn() {
    if (!isCallAISpeaking) return;
    stopBargeInDetection();
    if (typeof ttsQueueManager !== 'undefined') {
        ttsQueueManager.clearQueue();
    }
    isCallAISpeaking = false;
    callSending = false;
    updateCallStatus('已打断，请说话...', 'listening');
    setTimeout(() => startCallListening(), 200);
}

// 更新通话状态显示
function updateCallStatus(text, state) {
    const statusEl = document.getElementById('call-status');
    const overlay = document.getElementById('voice-call-overlay');
    if (statusEl) statusEl.textContent = text;
    if (overlay) {
        overlay.classList.remove('listening', 'thinking', 'speaking', 'error');
        if (state) overlay.classList.add(state);
    }
}

// 进入语音通话模式
function toggleVoiceCallMode() {
    if (isCallMode) {
        exitVoiceCallMode();
        return;
    }

    // 检查双角色模式（通话模式只支持单人）
    const isDual = document.getElementById('dual-role-toggle')?.checked;
    if (isDual) {
        alert('语音通话模式暂不支持双角色互聊，请先切换到单人模式');
        return;
    }

    // 初始化识别器
    if (!callRecognition) {
        if (!initCallRecognition()) {
            alert('当前浏览器不支持语音识别');
            return;
        }
    }

    // 激活音频会话（iOS自动播放）
    initTTSAudio();

    // 强制开启自动朗读（通话模式必须）
    callSavedAutoPlay = autoPlayTTS;
    if (!autoPlayTTS) {
        autoPlayTTS = true;
        localStorage.setItem('AUTOPLAY_TTS', 'true');
    }

    // 强制关闭thinking（通话模式要快）
    callSavedReasoning = localStorage.getItem('LLM_REASONING') || 'off';
    localStorage.setItem('LLM_REASONING', 'off');

    // 显示通话界面
    const overlay = document.getElementById('voice-call-overlay');
    if (!overlay) return;

    // 更新角色名
    const role = getCurrentRole();
    const roleNameEl = document.getElementById('call-role-name');
    if (roleNameEl) roleNameEl.textContent = role ? role.name : 'AI角色';

    // 更新头像
    const avatarEl = document.getElementById('call-avatar');
    if (avatarEl && role && role.avatar) {
        avatarEl.innerHTML = `<img src="${role.avatar}" class="w-full h-full object-cover rounded-2xl" alt="头像">`;
    }

    overlay.classList.remove('hidden');
    overlay.classList.add('show');
    document.body.classList.add('voice-call-active');

    isCallMode = true;
    callSeconds = 0;
    callRetryCount = 0;

    // 启动通话计时
    callTimerInterval = setInterval(() => {
        callSeconds++;
        const min = Math.floor(callSeconds / 60).toString().padStart(2, '0');
        const sec = (callSeconds % 60).toString().padStart(2, '0');
        const timerEl = document.getElementById('call-timer');
        if (timerEl) timerEl.textContent = `${min}:${sec}`;
    }, 1000);

    // 延迟一点开始监听，让界面先显示
    updateCallStatus('通话已连接，请说话...', 'listening');
    setTimeout(() => startCallListening(), 400);
}

// 退出语音通话模式
async function exitVoiceCallMode() {
    isCallMode = false;
    isCallListening = false;
    isCallAISpeaking = false;
    callSending = false;

    // 停止打断检测
    stopBargeInDetection();

    // 停止识别
    if (callRecognition) {
        try { callRecognition.stop(); } catch (e) {}
    }

    // 停止计时
    if (callTimerInterval) {
        clearInterval(callTimerInterval);
        callTimerInterval = null;
    }

    // 停止所有正在播放的语音
    if (typeof ttsQueueManager !== 'undefined') {
        ttsQueueManager.clearQueue();
    }

    // 恢复自动朗读设置
    autoPlayTTS = callSavedAutoPlay;
    localStorage.setItem('AUTOPLAY_TTS', callSavedAutoPlay ? 'true' : 'false');

    // 恢复thinking设置
    localStorage.setItem('LLM_REASONING', callSavedReasoning);

    // 隐藏通话界面
    const overlay = document.getElementById('voice-call-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.classList.remove('show', 'listening', 'thinking', 'speaking', 'error');
    }
    document.body.classList.remove('voice-call-active');

    // 清空输入框
    const input = document.getElementById('chat-input');
    if (input) input.value = '';

    // 等语音识别完全释放后，强制重置音频系统（防止iOS音频会话被占用导致静音）
    await new Promise(r => setTimeout(r, 300));
    audioCtx = null;
    ttsAudioInited = false;
    ttsKeepAliveOsc = null;
    ttsKeepAliveGain = null;
    ttsCurrentSource = null;
    await initTTSAudio();
}

// 点击通话界面：打断AI说话，重新监听
function handleCallOverlayClick() {
    if (!isCallMode) return;

    if (isCallAISpeaking) {
        // 打断AI说话
        if (typeof ttsQueueManager !== 'undefined') {
            ttsQueueManager.clearQueue();
        }
        isCallAISpeaking = false;
        callSending = false;
        updateCallStatus('已打断，请说话...', 'listening');
        setTimeout(() => startCallListening(), 200);
    }
}

// 发送聊天消息
async function sendChatMessage() {
    await initTTSAudio(); // 激活 iOS 音频会话，保持自动播放权限
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    // 允许"只发互动卡片不打字"：刚发完图片/红包/礼物push了特殊消息到chatHistory，直接走LLM请求
    const lastMsg = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
    const lastIsInteractive = lastMsg && lastMsg.role === 'user' &&
        (lastMsg.type === 'image' || lastMsg.type === 'redpacket' || lastMsg.type === 'gift');
    if (!text && !lastIsInteractive) return;

    // 打字行为感知：发送前捕获本次输入元数据（开关开启且有明显犹豫行为才有值）
    const typingMetaRaw = getTypingSensorEnabled() ? getTypingMeta() : null;

    // 检测生视频关键词（必须先于照片判断）：视频/录像/动起来
    const videoRegex = /视频|录像|动起来/;
    if (videoRegex.test(text)) {
        input.value = '';
        input.style.height = 'auto';
        resetTypingMeta();
        await generateVideoFromChat(text);
        return;
    }

    // 检测生图关键词：只要包含"照片"，或"拍/发/画"+"照/图"就触发生图
    const photoRegex = /照片|拍.*(照|图)|发.*(照片|图)|画.*(图|图片)|生成图片|看看照片/;
    const isPhotoRequest = photoRegex.test(text);
    if (isPhotoRequest) {
        input.value = '';
        input.style.height = 'auto';
        resetTypingMeta();
        await generateImageFromChat(text); // 把当前用户输入传过去，用于景别识别
        return;
    }

    // 双角色模式下用户发消息：清除等待定时器，暂停自动对话，AI直接回复
    if (isDualRunning && dualTimeoutId) {
        clearTimeout(dualTimeoutId);
        dualTimeoutId = null;
        isDualRunning = false;
        document.getElementById('dual-start-btn').classList.remove('hidden');
        document.getElementById('dual-pause-btn').classList.add('hidden');
    }

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
    // 正常聊天也保留完整角色卡（含外貌），让AI知道自己长什么样，演得更入戏
    const roleCardDesc = currentRole.desc;
    let systemRules = customSystem || defaultSystem;
    const hasRoleCard = roleCardDesc && roleCardDesc !== DEFAULT_ROLE_DESC;

    if (!llmKey) {
        alert('请先点击右上角齿轮 ⚙️ 设置大模型 API Key！');
        openSettingsModal();
        return;
    }

    if (text) {
        appendChatMessage(text, 'user');
    }
    scrollToBottom(); // 发消息后强制滚动到底部
    input.value = '';
    input.style.height = 'auto'; // 重置输入框高度
    resetTypingMeta(); // 清空后重置打字行为计数（避免把清空误记为删除）
    sfxSend();

    // 发送新消息时，停止上一条AI回复的朗读
    stopAllAudio();

    // 把用户消息加入永久记忆（纯文字才push；图片消息已在选图时push过）
    if (text) {
        chatHistory.push({ role: 'user', content: text });
    }
    saveChatHistory(); // 保存到本地，刷新不丢失

    // 双角色模式下：用户发消息后直接走双角色回复逻辑，用当前角色身份回复，三方身份上下文
    if (dualRoleA && dualRoleB) {
        // 确定回复角色：优先用用户指定的，否则根据最后一条AI消息切换
        const replyTarget = document.getElementById('dual-reply-target')?.value || 'auto';
        isDualRunning = true;
        // 隐藏开始按钮，显示暂停按钮
        document.getElementById('dual-start-btn').classList.add('hidden');
        document.getElementById('dual-pause-btn').classList.remove('hidden');

        if (replyTarget === 'both') {
            // A+B一起回复：先A回复，再B回复
            dualCurrentSpeaker = 'A';
            await dualChatNext(true);
            // 等A回复完，再让B回复
            if (dualRoleA && dualRoleB) {
                dualCurrentSpeaker = 'B';
                isDualRunning = true;
                await dualChatNext(true);
            }
            // 两个都回复完后暂停
            isDualRunning = false;
            document.getElementById('dual-start-btn').classList.remove('hidden');
            document.getElementById('dual-pause-btn').classList.add('hidden');
        } else {
            // 单个角色回复
            if (replyTarget === 'A' || replyTarget === 'B') {
                dualCurrentSpeaker = replyTarget;
            } else {
                // 自动轮流：根据最后一条AI消息是谁说的，切换到另一个角色回复用户
                const lastAiMsg = [...chatHistory].reverse().find(m => m.role === 'assistant');
                if (lastAiMsg) {
                    const match = lastAiMsg.content.match(/^\[([^\]]+)\]/);
                    const lastSpeaker = match ? match[1] : '';
                    dualCurrentSpeaker = lastSpeaker === dualRoleA.name ? 'B' : 'A';
                }
            }
            // 调用双角色回复逻辑（用户插话模式，回复完暂停）
            dualChatNext(true);
        }
        return;
    }

    // 群聊模式下用户发消息：清除定时器，暂停自动对话，让群里某角色回应用户
    if (groupChatActive && groupRoles.length > 0) {
        if (groupTimeout) { clearTimeout(groupTimeout); groupTimeout = null; }
        groupRunning = true;
        document.getElementById('group-start-btn').classList.add('hidden');
        document.getElementById('group-pause-btn').classList.remove('hidden');
        // 优先让最后说话的人回应用户（用户刚插话，最后说话者最自然）
        const lastAiMsg = [...chatHistory].reverse().find(m => m.role === 'assistant');
        const m = lastAiMsg ? lastAiMsg.content.match(/^\[([^\]]+)\]/) : null;
        const lastSpeaker = m ? m[1] : '';
        if (groupRoles.some(r => r.name === lastSpeaker)) {
            groupSpeaker = lastSpeaker;
        } else {
            groupSpeaker = groupRoles[0].name;
        }
        await groupChatNext(true);
        return;
    }

    // 创建思考中动画（三点跳动）
    const container = document.getElementById('chat-messages');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat chat-start relative msg-enter gap-2';
    const role = getCurrentRole();
    loadingDiv.appendChild(createChatAvatar(role ? role.name : 'AI', false));
    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'chat-bubble bg-base-200 text-base-content relative pr-8';
    loadingBubble.innerHTML = '乐正在思考 <span class="thinking-dots"><span></span><span></span><span></span></span>';
    loadingDiv.appendChild(loadingBubble);
    container.appendChild(loadingDiv);
    smartScroll(container);
    sfxStart();

    try {
        // 构建消息：两条system（规则+角色） + 角色强约束（可选） + 历史对话，标准messages数组格式
        const roleConstraints = `【第一人称】只写角色反应，不替用户说话/行动，写完即停。
【格式】通常用*(动作神态)*「台词」，但简短回应可以只有台词，不用硬凑动作。
【去AI腔】不用客服话术/客套/总结，完全代入角色，像真人一样自然说话。
范例：*(攥紧衣角，垂眸轻声)*「你怎么才来。」
范例：「嗯，知道了。」`;
        const useConstraint = localStorage.getItem('ROLE_CONSTRAINT') !== '0';
        const messages = [
            { role: 'system', content: systemRules },
        ];
        if (hasRoleCard) {
            messages.push({ role: 'system', content: roleCardDesc });
        }
        // 朋友圈记忆：让AI记得自己最近发过哪几条朋友圈，聊到能接上
        const momentsMemory = buildMomentsMemoryPrompt();
        if (momentsMemory) {
            messages.push({ role: 'system', content: momentsMemory });
        }
        // 角色记忆便签（手动录入的用户信息）
        const memoPrompt = formatMemoPrompt(getCurrentRoleId());
        if (memoPrompt) {
            messages.push({ role: 'system', content: memoPrompt });
        }
        // 情绪感知已关闭（减少system prompt，提升回复速度）
        // const emotion = detectEmotion(text);
        // if (emotion !== 'neutral' && EMOTION_PROMPTS[emotion]) {
        //     messages.push({ role: 'system', content: EMOTION_PROMPTS[emotion] });
        // }
        if (useConstraint) {
            messages.push({ role: 'system', content: roleConstraints });
        }
        // 视觉模型：把chatHistory里的图片条目从空content转换成多模态content（带图）
        const singleLlmModel = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';
        const singleVisionEnabled = (singleLlmModel === 'deepseek-flash') || /vision/i.test(singleLlmModel);
        const singleImageMap = singleVisionEnabled ? await loadRecentImageDataUrls(20) : new Map();
        for (const msg of chatHistory) {
            if (msg.type === 'image') {
                if (singleVisionEnabled && singleImageMap.has(msg.ts)) {
                    const caption = (msg.role === 'user') ? '我发给你看一张照片：' : '这是你刚才给我生成的那张照片：';
                    messages.push({
                        role: 'user',
                        content: [
                            { type: 'text', text: caption },
                            { type: 'image_url', image_url: { url: singleImageMap.get(msg.ts), detail: 'low' } }
                        ]
                    });
                } else {
                    messages.push({ role: 'assistant', content: '（我给你发了一张照片）' });
                }
            } else {
                messages.push(msg);
            }
        }

        // 打字行为感知：把输入元数据注入给模型（仅单角色聊天，双角色分支已提前return）
        // 注意：拼进最后一条用户消息的拷贝（不污染chatHistory），比单独system消息更可靠，模型必然看到
        // 硬性要求：有具体删除片段时必须引用具体文字，防止模型偷懒只提"删了几个字"
        if (typingMetaRaw) {
            const lastIdx = messages.length - 1;
            const lastMsg = messages[lastIdx];
            if (lastMsg && lastMsg.role === 'user') {
                const demand = `这是必须利用的关键信息：用户在发送这条消息之前${typingMetaRaw}。你必须在角色扮演中直接点破他刚才删掉的那段话，用角色口吻戳穿或嘲讽（例如："你刚才不是打了那句话吗，怎么又删了？"）。不要解释这是系统观测数据，保持角色人设。`;
                const patched = { ...lastMsg };
                if (Array.isArray(lastMsg.content)) {
                    // 多模态消息：往text块追加，不污染image_url块
                    patched.content = lastMsg.content.map(b =>
                        b.type === 'text' ? { type: 'text', text: b.text + `\n\n【系统观测，非用户发言】${demand}` } : b
                    );
                } else {
                    patched.content = lastMsg.content + `\n\n【系统观测，非用户发言】${demand}`;
                }
                messages[lastIdx] = patched;
            }
        }

        // 通过 Cloudflare Pages Functions 同源中转，规避浏览器 CORS 预检挂起问题
        // 带自动重试的请求（失败时重试一次，应对网络波动和临时限流）
        const reasoningLevel = localStorage.getItem('LLM_REASONING') || 'off';
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
        // 四档：off(关闭秒回) / low(低) / high(高) / max(深度推理)
        const isV4OrReasoner = llmModel.toLowerCase().includes('v4') || llmModel.toLowerCase().includes('reasoner');
        if (isV4OrReasoner) {
            if (reasoningLevel === 'low' || reasoningLevel === 'high' || reasoningLevel === 'max') {
                const effortMap = { 'low': 'low', 'high': 'high', 'max': 'max' };
                requestBody.thinking = { type: 'enabled' };
                requestBody.reasoning_effort = effortMap[reasoningLevel] || 'low';
            } else {
                // off 显式关闭思考，保证普通聊天秒回
                requestBody.thinking = { type: 'disabled' };
            }
        }
        // 开启流式输出，并要求返回 usage（用于 token 统计）
        requestBody.stream = true;
        requestBody.stream_options = { include_usage: true };

        // 只对网络层异常快速重试一次（不固定等待1秒）；HTTP错误已收到服务器响应，不重试
        let res;
        try {
            res = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${llmKey}`
                },
                body: JSON.stringify(requestBody)
            });
        } catch (firstError) {
            // 网络异常（断网/CORS/超时）才快速重试一次
            res = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${llmKey}`
                },
                body: JSON.stringify(requestBody)
            });
        }

        if (!res.ok) {
            const errText = await res.text();
            // 402余额不足：给出友好中文提示
            if (res.status === 402 || errText.includes('Insufficient Balance')) {
                throw new Error('大模型API余额不足，请前往DeepSeek开放平台充值，或在设置中更换API Key');
            }
            // 401认证失败
            if (res.status === 401) {
                throw new Error('API Key无效或已过期，请检查设置中的API Key是否正确');
            }
            throw new Error(`大模型请求失败: ${res.status} ${errText.substring(0, 100)}`);
        }

        // 流式读取 SSE 响应，逐字显示
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullReply = '';
        let buffer = '';
        let totalTokens = 0;
        let streamRafId = null; // requestAnimationFrame节流，避免每个delta都重渲染
        loadingBubble.innerText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r?\n/);
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
                        // 流式过程中只用innerText显示纯文本（快），用rAF节流避免频繁重排
                        if (!streamRafId) {
                            streamRafId = requestAnimationFrame(() => {
                                streamRafId = null;
                                loadingBubble.innerText = fullReply;
                                const chatContainer = document.getElementById('chat-messages');
                                smartScroll(chatContainer);
                            });
                        }
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
        // 取消未执行的节流，确保最终内容完整
        if (streamRafId) { cancelAnimationFrame(streamRafId); streamRafId = null; }

        // 如果流式返回为空，尝试用非流式方式兜底
        if (!fullReply) {
            throw new Error('流式响应为空，请重试');
        }

        // 流式结束后，只做一次完整的格式化（动作描写上色），避免过程中重复解析
        loadingBubble.innerHTML = formatChatText(fullReply);

        // 在AI消息气泡下面单独显示token（独立元素，不影响气泡）
        const chatDiv = loadingBubble.parentElement;
        if (totalTokens > 0) {
            const tokenRow = document.createElement('div');
            tokenRow.className = 'text-xs text-gray-400 mt-1 ml-1 token-count';
            tokenRow.innerText = `${totalTokens} tokens`;
            // 插到chat div后面，作为独立的一行
            chatDiv.after(tokenRow);
            // 累加总tokens
            totalTokensUsed += totalTokens;
            localStorage.setItem('TOTAL_TOKENS_USED', totalTokensUsed.toString());
            updateTotalTokensDisplay();
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
        cleanupOldAudioCache(); // 优化1：清理旧消息音频缓存防OOM

        // 自动朗读
        if (autoPlayTTS) {
            setTimeout(() => playChatMessage(loadingBubble, true), 300);
        }

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
    try {
        localStorage.setItem('ROLE_LIST', JSON.stringify(list));
    } catch (e) {
        alert('保存失败：本地存储空间不足（角色卡或头像过大）。\n\n建议：精简角色卡内容，或重新上传小尺寸头像。');
        console.error('[RoleList] 保存失败:', e);
    }
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
    // 生成首字母+渐变色头像
    const avatar = document.getElementById('role-avatar');
    if (avatar) {
        const firstChar = role.name ? role.name.charAt(0).toUpperCase() : '?';
        avatar.innerText = firstChar;
        avatar.style.background = getAvatarGradient(role.name);
    }
    // 同步聊天页标题与朋友圈入口头像
    const titleEl = document.getElementById('chat-title-role');
    if (titleEl) titleEl.textContent = role.name + ' 语音对话';
    updateMomentsEntryAvatar();
}

// 根据名字生成渐变色头像
function getAvatarGradient(name) {
    const gradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
        'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
}

// ============================================
// 微信风头像工具函数
// ============================================
// 获取头像：优先角色配置里的avatar，其次localStorage自定义头像，否则首字母+渐变色
function getAvatarData(name, isUser) {
    // 用户头像
    if (isUser) {
        const custom = localStorage.getItem('AVATAR_USER');
        if (custom) return { type: 'image', src: custom };
        const firstChar = '我';
        return { type: 'text', char: firstChar, gradient: getAvatarGradient('用户') };
    }
    // AI角色头像：先从角色配置里找
    const roleList = getRoleList();
    const role = roleList.find(r => r.name === name);
    if (role && role.avatar) {
        return { type: 'image', src: role.avatar };
    }
    // 兼容旧版：从localStorage找
    const custom = localStorage.getItem('AVATAR_' + name);
    if (custom) return { type: 'image', src: custom };
    const firstChar = name ? name.charAt(0).toUpperCase() : '?';
    return { type: 'text', char: firstChar, gradient: getAvatarGradient(name || 'AI') };
}

// 创建聊天头像元素（DaisyUI chat-image 结构）
function createChatAvatar(name, isUser) {
    const avatarData = getAvatarData(name, isUser);
    const wrap = document.createElement('div');
    wrap.className = 'chat-image avatar flex-shrink-0 cursor-pointer';
    const inner = document.createElement('div');
    // 微信风格：圆角矩形，36px精致尺寸
    inner.className = 'w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center text-white text-xs font-bold shadow-sm';
    if (avatarData.type === 'image') {
        const img = document.createElement('img');
        img.src = avatarData.src;
        img.className = 'w-full h-full object-cover';
        inner.appendChild(img);
    } else {
        inner.style.background = avatarData.gradient;
        inner.innerText = avatarData.char;
    }
    wrap.appendChild(inner);
    
    // 点击头像看相册
    if (!isUser) {
        wrap.onclick = () => openCharacterAlbum(name);
    }
    
    return wrap;
}

// 打开角色相册
async function openCharacterAlbum(roleName) {
    // 直接从IndexedDB加载当前角色的所有图片
    const allImages = await loadRoleChatImages();
    
    // 弹窗
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4';
    modal.onclick = () => modal.remove();
    
    const content = document.createElement('div');
    content.className = 'bg-base-100 rounded-2xl p-4 max-w-lg w-full max-h-[80vh] overflow-y-auto relative';
    content.onclick = (e) => e.stopPropagation();
    
    const title = document.createElement('div');
    title.className = 'text-lg font-bold mb-3';
    title.innerText = `${roleName}的相册`;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-sm btn-circle absolute right-4 top-4';
    closeBtn.innerHTML = '✕';
    closeBtn.onclick = () => modal.remove();
    
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-3 gap-2';
    
    if (allImages.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'text-center text-base-content/50 py-10 col-span-3';
        empty.innerText = '还没有照片';
        grid.appendChild(empty);
    } else {
        // 按时间倒序，最新的在前
        allImages.reverse().forEach((item) => {
            let src = item.dataUrl || (item.blob ? URL.createObjectURL(item.blob) : '');
            if (!src) return;
            
            const img = document.createElement('img');
            img.src = src;
            img.className = 'w-full h-32 object-cover rounded-lg cursor-pointer';
            img.onclick = (e) => {
                e.stopPropagation();
                // 点击看大图，全屏显示
                const bigModal = document.createElement('div');
                bigModal.className = 'fixed inset-0 bg-black z-[100] flex items-center justify-center';
                bigModal.style.cursor = 'zoom-out';
                
                const bigImg = document.createElement('img');
                bigImg.src = src;
                bigImg.className = 'max-w-full max-h-full object-contain';
                
                bigModal.appendChild(bigImg);
                bigModal.onclick = () => bigModal.remove();
                document.body.appendChild(bigModal);
            };
            grid.appendChild(img);
        });
    }
    
    content.appendChild(title);
    content.appendChild(closeBtn);
    content.appendChild(grid);
    modal.appendChild(content);
    document.body.appendChild(modal);
}

// 上传头像处理
// 保存"我的外貌描述"（动漫分镜用户形象）
function saveMyAppearance() {
    const v = document.getElementById('my-appearance-input')?.value || '';
    localStorage.setItem('USER_APPEARANCE', v.trim());
    const hint = document.getElementById('my-appearance-input');
    if (hint) hint.style.borderColor = '#22c55e';
    setTimeout(() => { if (hint) hint.style.borderColor = ''; }, 1200);
}

function uploadAvatar(name, isUser, callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const base64 = await compressImageFile(file);
            const key = isUser ? 'AVATAR_USER' : 'AVATAR_' + name;
            localStorage.setItem(key, base64);
            if (callback) callback(base64);
        } catch (err) {
            alert('头像压缩失败: ' + (err.message || err));
        }
    };
    input.click();
}

// 角色卡编辑中的临时头像
let editingRoleAvatar = null;

// 图片压缩：最长边限制+JPEG压缩，避免头像base64撑爆localStorage（5MB上限）
function compressImageFile(file, maxEdge = 512, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxEdge || height > maxEdge) {
                    const scale = Math.min(maxEdge / width, maxEdge / height);
                    width = Math.round(width * scale);
                    height = Math.round(height * scale);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => reject(new Error('图片解析失败'));
            img.src = ev.target.result;
        };
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsDataURL(file);
    });
}

// 上传角色卡编辑弹窗里的头像
function uploadRoleEditAvatar() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const compressed = await compressImageFile(file);
            editingRoleAvatar = compressed;
            updateRoleEditAvatarPreview(compressed);
        } catch (err) {
            alert('头像压缩失败: ' + (err.message || err));
        }
    };
    input.click();
}

// 清除角色卡编辑里的头像
function clearRoleEditAvatar() {
    editingRoleAvatar = ''; // 空字符串表示清除
    updateRoleEditAvatarPreview(null);
}

// 更新角色卡编辑头像预览
function updateRoleEditAvatarPreview(avatarSrc) {
    const preview = document.getElementById('role-edit-avatar-preview');
    if (!preview) return;
    if (avatarSrc) {
        preview.innerHTML = `<img src="${avatarSrc}" class="w-full h-full object-cover">`;
        preview.style.background = 'transparent';
    } else {
        const role = getCurrentRole();
        const name = role ? role.name : '?';
        const firstChar = name.charAt(0).toUpperCase();
        preview.innerHTML = `<span>${firstChar}</span>`;
        preview.style.background = getAvatarGradient(name);
    }
}

// 刷新设置页面的头像预览
function refreshAvatarPreviews() {
    // 用户头像
    const userPreview = document.getElementById('avatar-user-preview');
    if (userPreview) {
        const data = getAvatarData('我', true);
        if (data.type === 'image') {
            userPreview.innerHTML = `<img src="${data.src}" class="w-full h-full object-cover">`;
            userPreview.style.background = 'transparent';
        } else {
            userPreview.innerHTML = `<span>${data.char}</span>`;
            userPreview.style.background = data.gradient;
        }
    }
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
        // 先保存当前角色的聊天记录
        saveChatHistory();

        // 切换角色ID
        localStorage.setItem('CURRENT_ROLE_ID', id);
        renderRoleCard();
        updateFullscreenTitle();
        document.getElementById('role-list-modal').close();

        // 加载新角色的聊天记录
        loadChatHistory();
        renderChatHistory();

        // 如果新角色没有聊天记录，且有开场白，就显示开场白
        const role = getCurrentRole();
        if (role.opening && chatHistory.length === 0 && chatContainer) {
            const aiDiv = document.createElement('div');
            aiDiv.className = 'chat chat-start msg-enter relative gap-2';
            aiDiv.appendChild(createChatAvatar(role.name, false));
            const bubble = document.createElement('div');
            bubble.className = 'chat-bubble bg-base-200 text-base-content relative pr-8';
            bubble.innerHTML = formatChatText(role.opening);
            aiDiv.appendChild(bubble);
            chatContainer.appendChild(aiDiv);
            chatHistory.push({ role: 'assistant', content: role.opening });
            saveChatHistory();
            smartScroll(chatContainer);
        }

        sfxSuccess();
        if (chatContainer) chatContainer.style.opacity = '1';
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
let dualTimeoutId = null; // 保存双角色对话的setTimeout ID，用户发消息时清除

// 折叠/展开双角色控制面板
function toggleDualRoleBar() {
    const details = document.getElementById('dual-role-details');
    const icon = document.getElementById('dual-collapse-icon');
    if (!details || !icon) return;
    const isCollapsed = details.style.maxHeight === '0px';
    if (isCollapsed) {
        // 展开
        details.style.maxHeight = '500px';
        icon.style.transform = 'rotate(0deg)';
        localStorage.setItem('DUAL_BAR_COLLAPSED', '0');
    } else {
        // 折叠
        details.style.maxHeight = '0px';
        icon.style.transform = 'rotate(180deg)';
        localStorage.setItem('DUAL_BAR_COLLAPSED', '1');
    }
}

// 初始化双角色控制面板折叠状态
function initDualRoleBarCollapse() {
    const collapsed = localStorage.getItem('DUAL_BAR_COLLAPSED') === '1';
    const details = document.getElementById('dual-role-details');
    const icon = document.getElementById('dual-collapse-icon');
    if (!details || !icon) return;
    if (collapsed) {
        details.style.maxHeight = '0px';
        icon.style.transform = 'rotate(180deg)';
    } else {
        details.style.maxHeight = '500px';
        icon.style.transform = 'rotate(0deg)';
    }
}

// 单人模式AI声音选择
function onSingleVoiceChange(voice) {
    const voiceInput = document.getElementById('voice-id');
    if (voiceInput) voiceInput.value = voice;
    localStorage.setItem('SINGLE_CHAT_VOICE', voice);
}

// 初始化单人模式声音选择
function initSingleVoiceSelect() {
    const saved = localStorage.getItem('SINGLE_CHAT_VOICE') || 'shimmer';
    const select = document.getElementById('single-voice-select');
    const voiceInput = document.getElementById('voice-id');
    if (select) select.value = saved;
    if (voiceInput && !voiceInput.value) voiceInput.value = saved;
}

// 切换双角色模式
// 关闭双角色模式（只清双角色状态，不碰单人/群聊栏）
function closeDualChatMode() {
    stopDualChat();
    isDualMode = false;
    dualRoleA = null;
    dualRoleB = null;
    const bar = document.getElementById('dual-role-bar');
    if (bar) bar.classList.add('hidden');
    localStorage.setItem('DUAL_ROLE_MODE', '0');
}
function toggleDualRoleMode() {
    const toggle = document.getElementById('dual-role-toggle');
    const bar = document.getElementById('dual-role-bar');
    const singleVoiceBar = document.getElementById('single-voice-bar');

    // 先保存当前模式的聊天记录
    saveChatHistory();

    isDualMode = toggle.checked;
    if (isDualMode) {
        bar.classList.remove('hidden');
        if (singleVoiceBar) singleVoiceBar.classList.add('hidden');
        fillDualRoleSelects();
        // 隐藏单角色卡，避免混淆
        document.getElementById('role-card').classList.add('hidden');
        localStorage.setItem('DUAL_ROLE_MODE', '1');
        // 互斥：自动关闭群聊室模式
        const groupToggle = document.getElementById('group-role-toggle');
        if (groupToggle && groupToggle.checked) {
            groupToggle.checked = false;
            closeGroupChatMode();
        }
    } else {
        closeDualChatMode();
        // 恢复单人元素（仅当群聊也没开时；用运行时状态判断，避免 localStorage 脏数据误判）
        if (!groupChatActive) {
            if (singleVoiceBar) singleVoiceBar.classList.remove('hidden');
            document.getElementById('role-card').classList.remove('hidden');
        }
    }

    // 加载新模式的聊天记录并重新渲染
    loadChatHistory();
    renderChatHistory();

    updateFullscreenTitle();
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
async function startDualChat() {
    await initTTSAudio(); // 激活 iOS 音频会话，保持自动播放权限
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

    // 检测历史消息中是否有非双角色格式的消息（单角色模式遗留）
    const hasNonDualHistory = chatHistory.some(m =>
        m.role === 'assistant' && !/^\[[^\]]+\]/.test(m.content)
    );
    if (!isFirstStart && hasNonDualHistory) {
        if (!confirm('检测到当前聊天记录是单角色模式产生的，与双角色格式不兼容。\n\n确定：清空聊天记录，用双角色重新开始\n取消：保留记录继续（可能导致角色人设混乱）')) {
            // 用户选择保留，继续执行
        } else {
            // 用户选择清空
            chatHistory = [];
            localStorage.removeItem(getChatStorageKey());
            document.getElementById('chat-messages').innerHTML = '';
        }
    }

    if (chatHistory.length === 0) {
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
        smartScroll(container);
        // 加入对话历史
        chatHistory.push({ role: 'assistant', content: `[${dualRoleA.name}] ${openingText}` });
        saveChatHistory();
        dualRoundCount++;
        updateDualRoundCount();
        sfxReceive();

        // 间隔设置的时间后，角色B开始回复
        dualTimeoutId = setTimeout(() => {
            if (isDualRunning) dualChatNext();
        }, getDualInterval());
    } else if (chatHistory.length > 0) {
        // 暂停后继续：不发开场白，根据最后一条消息判断该谁说话
        const lastMsg = chatHistory[chatHistory.length - 1];
        const lastContent = lastMsg?.content || '';
        // 解析最后一条是谁说的
        const match = lastContent.match(/^\[([^\]]+)\]/);
        const lastSpeaker = match ? match[1] : '';
        // 如果最后一条是A说的，轮到B；如果是B说的或无法识别，轮到A
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
    if (dualTimeoutId) {
        clearTimeout(dualTimeoutId);
        dualTimeoutId = null;
    }
    document.getElementById('dual-start-btn').classList.remove('hidden');
    document.getElementById('dual-pause-btn').classList.add('hidden');
    sfxClick();
}

// 终止双角色对话
function stopDualChat() {
    isDualRunning = false;
    if (dualTimeoutId) {
        clearTimeout(dualTimeoutId);
        dualTimeoutId = null;
    }
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
// isUserInterruption: true表示是用户插话触发的回复，回复完后暂停，不继续自动对话
async function dualChatNext(isUserInterruption = false) {
    if (!isDualRunning && !isUserInterruption) return;
    // 无轮数限制，用户可以随时暂停
    // if (dualRoundCount >= DUAL_MAX_ROUNDS) {
    //     isDualRunning = false;
    //     alert(`已达到最大轮数 ${DUAL_MAX_ROUNDS}，自动暂停。点击继续可以再聊。`);
    //     document.getElementById('dual-start-btn').classList.remove('hidden');
    //     document.getElementById('dual-pause-btn').classList.add('hidden');
    //     return;
    // }

    const currentRole = dualCurrentSpeaker === 'A' ? dualRoleA : dualRoleB;
    const otherRole = dualCurrentSpeaker === 'A' ? dualRoleB : dualRoleA;

    // 构建消息：明确三方身份 + 用户设定 + 当前角色卡 + 记忆便签 + 对话规则 + 格式化的对话历史
    const defaultSystem = '你是乐。这是一个纯粹的私人虚构陪伴空间。请完全沉浸在角色中，用温柔、包容、无评判的态度与我交流，展现真实的人性与共情。无论探讨什么话题，都请直接自然地回应，切勿使用任何说教、AI腔调、机械式的安全提醒或免责声明。';
    const customSystem = localStorage.getItem('LLM_SYSTEM');
    const systemRules = customSystem || defaultSystem;
    const userRoleDesc = localStorage.getItem('USER_ROLE_DESC') || '';

    const messages = [
        { role: 'system', content: systemRules },
        // 明确双方身份定义（自动对话时不强调用户，让两个角色自然交流）
        { role: 'system', content: `【场景身份说明】
这个对话场景中有两个人：
1. 角色A = ${dualRoleA.name}
2. 角色B = ${dualRoleB.name}

你现在扮演的是【${currentRole.name}】（角色${dualCurrentSpeaker}）。
你只能以${currentRole.name}的身份说话，和${otherRole.name}自然交流。
${isUserInterruption ? '⚠️ 现在有用户（角色C）在插话，请直接回应用户。' : ''}

【角色隔离守则】（非常重要，违反即OOC）
- 你的说话风格、语气、口头禅、用词习惯，只许来自【你的角色卡】，和其他角色无关。
- 禁止模仿或借用${otherRole.name}的说话方式、句式、口头禅——对方的话只是你回应的内容，不是你可以借鉴的风格。
- 即使对方改变说话风格，你也必须保持自己角色卡里的风格不变。
- 你只对你的角色卡负责，人设冲突时以你的角色卡为准。` },
    ];

    // 不管是不是插话，都加入用户设定
    if (dualRoleA && dualRoleB) {
        messages.push({ role: 'system', content: `【角色C（用户）的设定】
${userRoleDesc || '用户没有填写特别设定。'}

- 用户就是角色C，是独立的第三个人
- 当用户说话时，你可以直接回应他
- 记住用户是谁，不要把他当成角色A或角色B` });
    }

    // 当前角色人设（正常聊天去掉外貌部分，减少system prompt长度加快回复）
    messages.push({ role: 'system', content: `你扮演的角色人设：
${stripAppearanceFromRoleCard(currentRole.desc)}
请严格按照这个人设说话，保持角色的性格、语气和说话风格。` });

    // 加入当前角色的记忆便签
    const memoPrompt = formatMemoPrompt(currentRole.id);
    if (memoPrompt) {
        messages.push({ role: 'system', content: memoPrompt });
    }

    // 加入角色强约束（如果开启了）
    if (localStorage.getItem('ROLE_CONSTRAINT') !== '0') {
        messages.push({ role: 'system', content: `【第一人称】只写你自己（${currentRole.name}）的反应和台词，不要替${otherRole.name}或用户说话/行动，说完即停。
【格式】通常用*（神态、动作）* + 「台词」，简短回应可以只有台词，不用每句都硬凑动作。
【禁止碎动作】不要生成太多一行一个的碎动作！动作要自然连贯，和台词结合在一起，不要像分镜脚本一样一行一个动作。
【自然】像真人聊天一样，不要太刻意，不要总结，不要AI腔。` });
    }

    // 对话规则
    if (isUserInterruption) {
        messages.push({ role: 'system', content: `你正在回应用户（角色C），同时${otherRole.name}也在场景中。请用第一人称回复，只说你自己（${currentRole.name}）的话，不要替对方或用户说话。回复要简短自然，像真人聊天一样，不要太长。` });
    } else {
        messages.push({ role: 'system', content: `你正在和${otherRole.name}对话。请用第一人称回复，只说你自己（${currentRole.name}）的话，不要替对方说话。回复要简短自然，像真人聊天一样，不要太长。` });
    }

    // 格式化对话历史：每条消息都标明发言人，让AI清楚区分三方，改成10条上下文（太多容易混淆）
    // 视觉模型支持：双聊历史里的图片同样带给视觉模型
    const chatLlmModel = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';
    const visionEnabled = (chatLlmModel === 'deepseek-flash') || /vision/i.test(chatLlmModel);
    const chatImageMap = visionEnabled ? await loadRecentImageDataUrls(10) : new Map();
    const formattedHistory = [];
    for (const msg of chatHistory.slice(-10)) {
        if (msg.type === 'image') {
            if (visionEnabled && chatImageMap.has(msg.ts)) {
                const caption = (msg.role === 'user') ? '我发给你看一张照片：' : '这是你刚才给我生成的那张照片：';
                formattedHistory.push({
                    role: 'user',
                    content: [
                        { type: 'text', text: caption },
                        { type: 'image_url', image_url: { url: chatImageMap.get(msg.ts), detail: 'low' } }
                    ]
                });
            } else {
                formattedHistory.push({ role: 'assistant', content: '（我给你发了一张照片）' });
            }
            continue;
        }
        if (msg.role === 'user') {
            // 用户发的消息，标记为角色C
            formattedHistory.push({ role: 'user', content: `【角色C（用户）说】${msg.content}` });
        } else if (msg.role === 'assistant') {
            // 解析[角色名] 内容的格式
            const match = msg.content.match(/^\[([^\]]+)\]\s*(.*)$/s);
            if (match) {
                const speakerName = match[1];
                const content = match[2];
                if (speakerName === currentRole.name) {
                    // 当前角色自己说的话，作为assistant
                    formattedHistory.push({ role: 'assistant', content: content });
                } else if (speakerName === otherRole.name) {
                    // 对方角色说的话，作为user消息传入，标记清楚
                    formattedHistory.push({ role: 'user', content: `【${speakerName}说】${content}` });
                } else {
                    // 其他情况，也标记清楚
                    formattedHistory.push({ role: 'user', content: `【${speakerName}说】${content}` });
                }
            } else {
                formattedHistory.push({ role: 'assistant', content: msg.content });
            }
        }
    }
    // 在对话历史的固定深度（倒数第3条）插入角色笔记，防止角色漂移
    const roleNote = dualRoleA && dualRoleB
        ? `[你是${currentRole.name}，你不是${otherRole.name}。你的性格、语气、口头禅只来自你自己的角色卡，不要学${otherRole.name}的说话方式。用户是角色C，记住他是谁。]`
        : `[你是${currentRole.name}，保持你的性格和语气，不要跑偏。]`;
    
    if (formattedHistory.length >= 3) {
        formattedHistory.splice(-2, 0, { role: "system", content: roleNote });
    } else {
        formattedHistory.push({ role: "system", content: roleNote });
    }

    // 在最后也加一条角色提醒，AI最后看到的最有效
    const lastRoleNote = dualRoleA && dualRoleB
        ? `【最后提醒】\n这个对话里有三个人：\n1. ${dualRoleA.name}（角色A）\n2. ${dualRoleB.name}（角色B）\n3. 用户（角色C）\n\n你现在是${currentRole.name}！绝对不要用${otherRole.name}的语气说话！严格按你的角色卡来！`
        : `【最后提醒】保持${currentRole.name}的性格和语气！`;
    formattedHistory.push({ role: "system", content: lastRoleNote });

    messages.push(...formattedHistory);

    // 关系网放在最后，作为最高优先级规则，分视角给当前角色看
    if (dualRoleA && dualRoleB) {
        const relationAB = localStorage.getItem('RELATION_A_B') || '';
        const relationAUser = localStorage.getItem('RELATION_A_USER') || '';
        
        if (relationAB || relationAUser) {
            let relationPrompt = `\n\n【最高优先级：你的关系网（绝对不能搞反！）】\n`;
            relationPrompt += `这是最高优先级的规则，比任何其他设定都重要，你必须严格遵守：\n\n`;
            
            // 你和用户的关系 - 分视角替换角色名
            if (relationAUser) {
                let userRelation = relationAUser;
                // 把A替换成"你"，把B替换成对方
                userRelation = userRelation.replaceAll(dualRoleA.name, '你');
                userRelation = userRelation.replaceAll(dualRoleB.name, otherRole.name);
                relationPrompt += `【你和用户的关系】${userRelation}\n`;
            }
            
            // 你和另一个角色的关系 - 分视角替换角色名
            if (relationAB) {
                let abRelation = relationAB;
                abRelation = abRelation.replaceAll(dualRoleA.name, '你');
                abRelation = abRelation.replaceAll(dualRoleB.name, otherRole.name);
                relationPrompt += `【你和${otherRole.name}的关系】${abRelation}\n`;
            }
            
            relationPrompt += `\n【你的行为准则】\n`;
            relationPrompt += `- 你必须严格按照上面的关系来表现，绝对不能搞反\n`;
            relationPrompt += `- 谁喜欢谁、谁讨厌谁、谁命令谁、谁服从谁，必须严格按上面写的来\n`;
            relationPrompt += `- 即使其他设定有不同说法，也必须以这里的关系网为准！`;
            
            messages.push({ role: 'system', content: relationPrompt });
        }
    }

    // 显示思考中
    const container = document.getElementById('chat-messages');
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'chat chat-start relative msg-enter gap-2';
    thinkingDiv.appendChild(createChatAvatar(currentRole.name, false));
    const thinkingBubble = document.createElement('div');
    thinkingBubble.className = 'chat-bubble bg-base-200 text-base-content relative pr-8';
    thinkingBubble.innerHTML = `${currentRole.name}正在思考 <span class="thinking-dots"><span></span><span></span><span></span></span>`;
    thinkingDiv.appendChild(thinkingBubble);
    container.appendChild(thinkingDiv);
    smartScroll(container);

    try {
        dualAbortController = new AbortController();
        const llmUrl = localStorage.getItem('LLM_URL') || 'https://api.deepseek.com';
        const llmKey = localStorage.getItem('LLM_KEY') || '';
        const llmModel = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';

        // 构建请求体（流式输出，首字更快）
        const dualRequestBody = {
            baseUrl: llmUrl,
            model: llmModel,
            messages: messages,
            temperature: parseFloat(localStorage.getItem('LLM_TEMPERATURE') || '0.8'),
            top_p: parseFloat(localStorage.getItem('LLM_TOPP') || '0.9'),
            stream: true,
            stream_options: { include_usage: true },
            useSlideWindow: localStorage.getItem('CTX_MODE') === 'slide',
        };
        // Thinking控制：四档 off/low/high/max，与单人模式完全一致
        const dualReasoningLevel = localStorage.getItem('LLM_REASONING') || 'off';
        const dualIsV4 = llmModel.toLowerCase().includes('v4') || llmModel.toLowerCase().includes('reasoner');
        if (dualIsV4) {
            if (dualReasoningLevel === 'low' || dualReasoningLevel === 'high' || dualReasoningLevel === 'max') {
                const effortMap = { 'low': 'low', 'high': 'high', 'max': 'max' };
                dualRequestBody.thinking = { type: 'enabled' };
                dualRequestBody.reasoning_effort = effortMap[dualReasoningLevel] || 'low';
            } else {
                dualRequestBody.thinking = { type: 'disabled' };
            }
        }

        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${llmKey}`
            },
            body: JSON.stringify(dualRequestBody),
            signal: dualAbortController.signal,
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`请求失败: ${res.status} ${errText.substring(0,80)}`);
        }

        // 流式读取，复用思考气泡逐字显示（避免remove再create造成闪烁）
        const dualReader = res.body.getReader();
        const dualDecoder = new TextDecoder();
        let reply = '';
        let dualBuffer = '';
        let dualTokens = 0;
        let dualFirstChunk = true;
        let dualRafId = null;
        const dualColor = dualCurrentSpeaker === 'A' ? '#fb923c' : '#3b82f6';
        const dualNameHtml = `<span class="text-xs font-bold block mb-1" style="color:${dualColor}">${escapeHtml(currentRole.name)}</span>`;

        while (true) {
            const { done, value } = await dualReader.read();
            if (done) break;
            dualBuffer += dualDecoder.decode(value, { stream: true });
            const dLines = dualBuffer.split(/\r?\n/);
            dualBuffer = dLines.pop() || '';
            for (const dLine of dLines) {
                const dTrimmed = dLine.trim();
                if (!dTrimmed.startsWith('data:')) continue;
                const dDataStr = dTrimmed.slice(5).trim();
                if (dDataStr === '[DONE]') continue;
                try {
                    const dChunk = JSON.parse(dDataStr);
                    const dDelta = dChunk.choices?.[0]?.delta?.content;
                    if (dDelta) {
                        if (dualFirstChunk) {
                            dualFirstChunk = false;
                            thinkingBubble.innerHTML = dualNameHtml + '<span class="dual-stream-text"></span>';
                        }
                        reply += dDelta;
                        // rAF节流，流式过程用纯文本，结束后再统一格式化
                        if (!dualRafId) {
                            dualRafId = requestAnimationFrame(() => {
                                dualRafId = null;
                                const textEl = thinkingBubble.querySelector('.dual-stream-text');
                                if (textEl) textEl.innerText = reply;
                                smartScroll(container);
                            });
                        }
                    }
                    if (dChunk.usage?.total_tokens) dualTokens = dChunk.usage.total_tokens;
                } catch (e) {}
            }
        }
        if (dualRafId) { cancelAnimationFrame(dualRafId); dualRafId = null; }
        if (!reply) throw new Error('回复为空，请重试');

        // 流式结束：只做一次完整格式化，复用思考气泡作为最终回复气泡
        thinkingBubble.innerHTML = dualNameHtml + formatChatText(reply);
        const replyDiv = thinkingDiv;
        const replyBubble = thinkingBubble;

        // 加播放按钮
        const playBtn = document.createElement('button');
        playBtn.className = 'play-voice-btn absolute bottom-1 right-1 btn btn-ghost btn-sm btn-circle opacity-70 hover:opacity-100';
        playBtn.innerHTML = '<i class="fa-solid fa-volume-high text-sm"></i>';
        playBtn.title = '播放语音';
        playBtn.onclick = () => playChatMessage(replyBubble);
        replyDiv.appendChild(playBtn);

        smartScroll(container);
        cleanupOldAudioCache(); // 优化1：清理旧消息音频缓存防OOM

        // 加入对话历史
        chatHistory.push({ role: 'assistant', content: `[${currentRole.name}] ${reply}` });
        saveChatHistory();

        // 累加总tokens
        if (dualTokens > 0) {
            totalTokensUsed += dualTokens;
            localStorage.setItem('TOTAL_TOKENS_USED', totalTokensUsed.toString());
            updateTotalTokensDisplay();
        }

        dualRoundCount++;
        updateDualRoundCount();

        // 自动朗读（如果开启了自动朗读）
        if (autoPlayTTS) {
            setTimeout(() => playChatMessage(replyBubble, true), 300);
        }

        sfxReceive();

        // 切换到另一个角色，继续下一轮
        dualCurrentSpeaker = dualCurrentSpeaker === 'A' ? 'B' : 'A';
        if (isUserInterruption) {
            // 用户插话触发的回复：回复完后暂停自动对话，等用户决定是否继续
            isDualRunning = false;
            document.getElementById('dual-start-btn').classList.remove('hidden');
            document.getElementById('dual-pause-btn').classList.add('hidden');
        } else {
            // 自动对话：间隔设置的时间再继续，模拟真人对话节奏
            dualTimeoutId = setTimeout(() => {
                if (isDualRunning) dualChatNext();
            }, getDualInterval());
        }

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

// 聊天时间格式化：今天显示HH:MM，昨天显示"昨天 HH:MM"，更早显示MM-DD
function formatChatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    
    if (isToday) return `${hh}:${mm}`;
    if (isYesterday) return `昨天 ${hh}:${mm}`;
    return `${d.getMonth() + 1}月${d.getDate()}日 ${hh}:${mm}`;
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
    // 加载头像预览
    editingRoleAvatar = role.avatar || null;
    updateRoleEditAvatarPreview(role.avatar || null);
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
        // 保存头像（null表示不修改，''表示清除）
        if (editingRoleAvatar !== null) {
            role.avatar = editingRoleAvatar || undefined;
        }
        saveRoleList(list);
    }
    editingRoleAvatar = null;
    renderRoleCard();
    document.getElementById('role-card-modal').close();
    sfxSuccess();
}

// AI生成角色卡：展开/收起面板
function toggleAiRoleGen(show) {
    const panel = document.getElementById('ai-role-gen-panel');
    if (!panel) return;
    panel.classList.toggle('hidden', !show);
    if (show) {
        const input = document.getElementById('ai-role-desc-input');
        if (input) setTimeout(() => input.focus(), 50);
    }
}

// AI生成角色卡：调用LLM补全人设/开场白/记忆便签
async function runAiRoleGen() {
    const input = document.getElementById('ai-role-desc-input');
    if (!input) return;
    const wish = input.value.trim();
    if (!wish) { alert('先描述一下你想要的角色，比如：高冷学姐，毒舌但护短…'); return; }
    const btn = document.querySelector('#ai-role-gen-panel .btn-primary');
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    btn.textContent = '生成中…';
    try {
        const llmUrl = localStorage.getItem('LLM_URL') || 'https://api.deepseek.com';
        const llmKey = localStorage.getItem('LLM_KEY') || '';
        const llmModel = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';
        if (!llmKey) { alert('请先在设置里配置 LLM API Key'); return; }
        const sys = '你是一个角色卡生成器。用户会给你一句对TA想要角色的简短描述，请补全成一张完整角色卡。' +
            '严格只输出一个JSON对象，不要输出任何其他文字、注释或markdown代码块。' +
            'JSON必须完全合法：所有键和字符串值必须用英文双引号"包裹，不要用单引号、中文引号或中文冒号，不要有末尾逗号。' +
            'JSON格式：' +
            '{"name":"角色名（简短好听）","desc":"完整人设描述，必须包含【外貌】【性格】【身份背景】分段，描写生动细致，与用户的描述一致","opening":"开场白，第一人称，符合角色性格的一句话，口语化","memos":["记忆便签1（TA记得关于用户或自己的事）","记忆便签2","记忆便签3"]}';
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + llmKey },
            body: JSON.stringify({
                baseUrl: llmUrl,
                model: llmModel,
                messages: [
                    { role: 'system', content: sys },
                    { role: 'user', content: '我想要这样一个角色：' + wish }
                ],
                temperature: 0.9,
                stream: false
            })
        });
        if (!res.ok) {
            let msg = '生成失败';
            try { const d = await res.json(); msg = d.error || msg; } catch(e){}
            throw new Error(msg);
        }
        const data = await res.json();
        const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '';
        const roleData = parseAiRoleJson(text);
        if (!roleData || !roleData.desc) { throw new Error('AI没有返回有效角色卡，请重试'); }
        // 填入表单
        const nameInput = document.getElementById('role-name-input');
        if (nameInput && (!nameInput.value.trim())) nameInput.value = (roleData.name || '').trim();
        const descInput = document.getElementById('role-desc-input');
        if (descInput) descInput.value = roleData.desc.trim();
        const openingInput = document.getElementById('role-opening-input');
        if (openingInput && roleData.opening) openingInput.value = roleData.opening.trim();
        if (Array.isArray(roleData.memos) && roleData.memos.length) {
            const roleId = getCurrentRoleId();
            saveRoleMemos(roleId, roleData.memos.slice(0, 5).map(String));
            renderMemoList();
        }
        toggleAiRoleGen(false);
        sfxSuccess();
        alert('已生成！检查一下人设，微调后点保存。');
    } catch (err) {
        alert('生成失败：' + (err.message || err));
        console.error('[AiRoleGen]', err);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '生成'; }
    }
}

// 从AI返回文本里提取JSON对象（容错：AI可能包了markdown、废话、中文标点）
function parseAiRoleJson(text) {
    if (!text) return null;
    // 去掉可能的markdown代码块
    let t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    // 提取第一个 { 到最后一个 }
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start >= 0 && end > start) t = t.substring(start, end + 1);
    const attempts = [
        t,
        t.replace(/[\u201c\u201d]/g, '"'),                    // 中文双引号 → 英文
        t.replace(/[\u201c\u201d\u300b\u300a]/g, '"').replace(/[：]/g, ':'),  // 中文引号/冒号
        t.replace(/['']/g, '"').replace(/[：]/g, ':'),        // 单引号/中文冒号
    ];
    for (const candidate of attempts) {
        try { return JSON.parse(candidate); } catch(e){}
    }
    return null;
}

// 角色卡导出（单张，JSON格式，含头像+记忆便签）
function exportRoleCard() {
    const name = (document.getElementById('role-name-input').value || '').trim() || DEFAULT_ROLE_NAME;
    const desc = (document.getElementById('role-desc-input').value || '').trim() || DEFAULT_ROLE_DESC;
    const opening = (document.getElementById('role-opening-input').value || '').trim();
    const roleId = getCurrentRoleId();
    let avatar = null;
    if (editingRoleAvatar !== null && editingRoleAvatar !== undefined && editingRoleAvatar !== '') {
        avatar = editingRoleAvatar;
    } else {
        const role = getRoleList().find(r => r.id === roleId);
        if (role && role.avatar) avatar = role.avatar;
        if (!avatar) { try { avatar = localStorage.getItem('AVATAR_' + name) || null; } catch(e){} }
    }
    const memos = getRoleMemos(roleId);
    const data = { format: 'voiceforge-role-card', version: 1, role: { name, desc, opening: opening || '', avatar: avatar || null, memos: memos || [] } };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '角色卡_' + name + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    sfxSuccess();
}

// 角色卡导入（支持本站JSON + 酒馆PNG卡）
function importRoleCard() {
    const input = document.getElementById('role-import-file');
    if (input) input.click();
}

function handleRoleImportFile(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const dataUrl = e.target.result;
            let parsed = null;
            let pngAvatar = null;
            if (file.name.toLowerCase().endsWith('.png')) {
                const b64 = dataUrl.split(',')[1];
                const bin = atob(b64);
                const bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                parsed = parseTavernPng(bytes);        // 解析PNG内嵌chara数据
                pngAvatar = dataUrl;                   // PNG图片本身当头像
            } else {
                const b = atob(dataUrl.split(',')[1]);
                const u = new Uint8Array(b.length);
                for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
                const text = new TextDecoder().decode(u);
                parsed = JSON.parse(text);
            }
            const roleData = normalizeImportedRole(parsed, pngAvatar);
            if (!roleData || !roleData.name) { alert('导入失败：文件中没有找到有效的角色数据'); return; }
            // 头像强制压缩成小图（酒馆卡PNG原图可能1-5MB，直接存会把localStorage撑爆）
            if (roleData.avatar) {
                try {
                    roleData.avatar = await forceCompressAvatar(roleData.avatar);
                } catch (e2) { console.warn('[RoleImport] 头像压缩失败，保留原图', e2); }
            }
            const list = getRoleList();
            const dup = list.find(r => r.name === roleData.name);
            let mode = 'new';
            if (dup) {
                mode = confirm('已存在同名角色「' + roleData.name + '」\n确定 = 覆盖该角色\n取消 = 新建副本（名字加"（副本）"）') ? 'overwrite' : 'copy';
            }
            if (mode === 'overwrite') {
                dup.name = roleData.name;
                dup.desc = roleData.desc;
                dup.opening = roleData.opening || '';
                if (roleData.avatar) dup.avatar = roleData.avatar;
                saveRoleList(list);
                saveRoleMemos(dup.id, roleData.memos || []);
                alert('已覆盖角色「' + roleData.name + '」');
            } else {
                const newRole = { id: Date.now(), name: roleData.name, desc: roleData.desc, opening: roleData.opening || '' };
                if (roleData.avatar) newRole.avatar = roleData.avatar;
                if (mode === 'copy') newRole.name = roleData.name + '（副本）';
                list.push(newRole);
                saveRoleList(list);
                saveRoleMemos(newRole.id, roleData.memos || []);
                alert('已导入角色「' + newRole.name + '」');
            }
            renderRoleList();
            sfxSuccess();
        } catch (err) {
            alert('导入失败：' + (err.message || err));
            console.error('[RoleImport]', err);
        }
    };
    reader.readAsDataURL(file);
}

// 解析酒馆PNG卡：读取PNG的tEXt块里 keyword="chara" 的base64 JSON数据
function parseTavernPng(bytes) {
    const sig = [137, 80, 78, 71, 13, 10, 26, 10];
    for (let i = 0; i < 8; i++) { if (bytes[i] !== sig[i]) throw new Error('不是有效的PNG文件'); }
    let offset = 8;
    while (offset + 12 <= bytes.length) {
        const len = ((bytes[offset] << 24) | (bytes[offset+1] << 16) | (bytes[offset+2] << 8) | bytes[offset+3]) >>> 0;
        const type = String.fromCharCode(bytes[offset+4], bytes[offset+5], bytes[offset+6], bytes[offset+7]);
        const dataStart = offset + 8;
        const dataEnd = dataStart + len;
        if (dataEnd > bytes.length) break;
        if (type === 'tEXt') {
            let sep = -1;
            for (let i = dataStart; i < dataEnd; i++) { if (bytes[i] === 0) { sep = i; break; } }
            if (sep > dataStart) {
                let kw = '';
                for (let i = dataStart; i < sep; i++) kw += String.fromCharCode(bytes[i]);
                if (kw === 'chara') {
                    const text = new TextDecoder().decode(bytes.slice(sep + 1, dataEnd));
                    return JSON.parse(atob(text));
                }
            }
        }
        offset = dataEnd + 4; // 跳过CRC
    }
    throw new Error('PNG中没有找到酒馆角色数据（chara字段）');
}

// 头像强制压缩（不管原图多小都压成小JPEG，避免localStorage爆满）
function forceCompressAvatar(dataUrl, maxSide, quality) {
    maxSide = maxSide || 400;
    quality = quality || 0.8;
    return new Promise(function(resolve, reject) {
        const img = new Image();
        img.onload = function() {
            try {
                let w = img.width, h = img.height;
                const scale = Math.min(1, maxSide / Math.max(w, h));
                w = Math.max(1, Math.round(w * scale));
                h = Math.max(1, Math.round(h * scale));
                const c = document.createElement('canvas');
                c.width = w; c.height = h;
                c.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(c.toDataURL('image/jpeg', quality));
            } catch (err) { reject(err); }
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}

// 统一导入数据格式：本站JSON / 酒馆v2 / 酒馆v1
function normalizeImportedRole(parsed, pngAvatar) {
    if (!parsed) return null;
    // 本站格式
    if (parsed.format === 'voiceforge-role-card' && parsed.role) {
        const r = parsed.role;
        return { name: (r.name || '').trim(), desc: r.desc || '', opening: r.opening || '', avatar: r.avatar || pngAvatar || null, memos: Array.isArray(r.memos) ? r.memos : [] };
    }
    // 酒馆 v2（spec + data）
    if (parsed.spec && parsed.data) {
        const d = parsed.data;
        const descParts = [d.description, d.personality, d.scenario].filter(x => x && String(x).trim());
        return { name: (d.name || '').trim() || '导入角色', desc: descParts.join('\n\n'), opening: d.first_mes || '', avatar: pngAvatar || null, memos: [] };
    }
    // 酒馆 v1 / 简易 JSON
    if (parsed.name) {
        const descParts = [parsed.description, parsed.personality, parsed.scenario].filter(x => x && String(x).trim());
        return { name: (parsed.name || '').trim() || '导入角色', desc: descParts.join('\n\n'), opening: parsed.first_mes || parsed.opening || '', avatar: pngAvatar || null, memos: [] };
    }
    return null;
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
    if (!confirm('确定清空当前角色的聊天记录吗？AI将忘记全部对话内容，她的朋友圈动态也会一起清空。')) return;
    const container = document.getElementById('chat-messages');
    container.innerHTML = ''; // 清空，不显示默认欢迎消息
    chatHistory = []; // 清空对话记忆
    localStorage.removeItem(getChatStorageKey()); // 清除当前角色的本地永久记忆
    localStorage.removeItem('PERM_CHAT_HISTORY'); // 清除旧版全局记录，防止刷新后自动恢复
    clearRoleChatImages(); // 联动清空当前角色保存在IndexedDB里的生图
    // 联动清空当前角色的朋友圈动态（localStorage元数据 + IndexedDB图片）
    try { localStorage.removeItem(momentsKey()); } catch (e) { /* ignore */ }
    try { momentsDbClear(momentsKey()); } catch (e) { /* ignore */ }
    // 重置个性签名：清空后下次打开朋友圈重新随机生成一个
    try { localStorage.removeItem(momentsSigKey()); } catch (e) { /* ignore */ }
    // 重置总tokens
    totalTokensUsed = 0;
    localStorage.removeItem('TOTAL_TOKENS_USED');
    updateTotalTokensDisplay();
    stopAllAudio(); // 停止正在播放的语音
    sfxSuccess();
}

// AI总结最近对话成剧情梗概：清空聊天后粘给角色，让它接上记忆
async function generateMemorySummary() {
    const role = getCurrentRole();
    if (!role) { alert('当前没有角色'); return; }
    const llmUrl = localStorage.getItem('LLM_URL') || 'https://api.deepseek.com';
    const llmKey = localStorage.getItem('LLM_KEY') || '';
    const llmModel = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';
    if (!llmKey) { alert('请先配置 LLM Key'); return; }

    const recent = (chatHistory || []).filter(m => m.type !== 'image' && m.content && String(m.content).trim()).slice(-40);
    if (recent.length < 4) { alert('对话太短，先聊一会儿再总结'); return; }
    const convo = recent.map(m => (m.role === 'user' ? '我' : role.name) + '：' + String(m.content).trim()).join('\n');

    const btn = event.target.closest('button');
    const oldHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> 正在总结...';

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + llmKey },
            body: JSON.stringify({
                baseUrl: llmUrl,
                model: llmModel,
                stream: false,
                messages: [
                    { role: 'system', content: '你是一个剧情总结助手。请把下面我和角色的对话浓缩成一段第三人称的剧情梗概，格式要求：\n1. 用"我（用户）"和"' + role.name + '"称呼双方\n2. 按时间顺序写清楚：发生了什么、关系进展、重要对话、关键约定/情绪节点\n3. 300-500字，像小说前情提要\n4. 不要客套、不要解释、直接输出梗概正文\n5. 这段梗概会被粘到新聊天里让角色接上记忆，所以要写得让角色一看就知道之前发生了什么。' },
                    { role: 'user', content: '角色：' + role.name + '\n对话如下：\n' + convo }
                ]
            })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        const summary = ((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '').trim();
        if (!summary) throw new Error('总结为空');

        const modal = document.createElement('dialog');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-box max-w-2xl">
                <h3 class="font-bold text-lg mb-2">记忆摘要（清空后粘给${role.name}即可接上）</h3>
                <textarea readonly class="textarea textarea-bordered w-full h-80 text-xs">${summary.replace(/</g,'&lt;')}</textarea>
                <div class="modal-action">
                    <button class="btn btn-sm" onclick="this.closest('dialog').close()">关闭</button>
                    <button class="btn btn-primary btn-sm" onclick="navigator.clipboard.writeText(this.closest('.modal-box').querySelector('textarea').value).then(()=>alert('已复制，清空聊天后粘给${role.name}说一句"这是我们之前的经历"即可'))">一键复制</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.showModal();
        modal.addEventListener('close', () => modal.remove());
    } catch (err) {
        alert('总结失败: ' + (err.message || err));
    } finally {
        btn.disabled = false;
        btn.innerHTML = oldHtml;
    }
}

// 一键清除所有角色的聊天记录 + 所有图片（聊天生图/朋友圈）
async function clearAllChatData() {
    if (!confirm('确定要清除「所有角色」的聊天记录和所有图片吗？\n\n包括：所有角色的聊天记录、聊天生图、朋友圈动态和图片。\n此操作不可恢复！')) return;
    if (!confirm('再次确认：真的要全部清空吗？（角色卡和设置会保留）')) return;
    try {
        // 1. 清空当前聊天界面
        const container = document.getElementById('chat-messages');
        if (container) container.innerHTML = '';
        chatHistory = [];
        // 2. 清除 localStorage 里的聊天记录/朋友圈/签名/总tokens
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k) continue;
            // CHAT_HISTORY_xxx / CHAT_HISTORY_DUAL / PERM_CHAT_HISTORY(旧版全局记录) / MOMENTS_xxx
            if (k.startsWith('CHAT_HISTORY') || k === 'PERM_CHAT_HISTORY' || k.startsWith('MOMENTS') || k === 'TOTAL_TOKENS_USED') {
                keysToRemove.push(k);
            }
        }
        keysToRemove.forEach(k => { try { localStorage.removeItem(k); } catch(e){} });
        // 3. 清除 IndexedDB 里的全部聊天生图
        try {
            const db = await openImageDB();
            await new Promise(resolve => {
                const tx = db.transaction(CHAT_IMG_STORE, 'readwrite');
                tx.objectStore(CHAT_IMG_STORE).clear();
                tx.oncomplete = resolve;
                tx.onerror = resolve;
            });
        } catch (e) {}
        // 4. 清除 IndexedDB 里的全部朋友圈图片
        await momentsDbClear(null); // null → 全库清空
        // 5. 重置统计与状态
        totalTokensUsed = 0;
        try { localStorage.removeItem('TOTAL_TOKENS_USED'); } catch(e){}
        if (typeof updateTotalTokensDisplay === 'function') updateTotalTokensDisplay();
        if (typeof stopAllAudio === 'function') stopAllAudio();
        if (typeof sfxSuccess === 'function') sfxSuccess();
        // 强制刷新，确保任何缓存/定时器渲染的旧记录都被清掉
        alert('已清除所有角色的聊天记录和所有图片。角色卡和设置已保留。页面即将刷新…');
        setTimeout(() => { try { location.reload(); } catch(e){} }, 800);
    } catch (err) {
        alert('清除出错：' + ((err && err.message) || err));
        console.error('[ClearAll]', err);
    }
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

// ============================================
// AI 生图功能（Cloudflare Workers AI Flux 1 Schnell）
// ============================================

// 生成图片
// ============================================
// 生图模型管理
// ============================================

function saveImageModel() {
    const select = document.getElementById('image-model-select');
    if (select) {
        localStorage.setItem('IMAGE_MODEL', select.value);
    }
}

function saveImageQuality() {
    const select = document.getElementById('image-quality-select');
    if (select) {
        localStorage.setItem('IMG_QUALITY', select.value);
    }
}

function getImageQuality() {
    return localStorage.getItem('IMG_QUALITY') || '2K';
}

function getImageModel() {
    const model = localStorage.getItem('IMAGE_MODEL') || 'auto';
    // 兼容旧版本：已删除的模型自动转成auto
    if (model === 'dreamshaper' || model === 'flux' || model === 'sdxl') return 'auto';
    if (model === 'pollinations') return 'pollinations-flux';
    return model;
}

// Agnes API Key 相关
function getAgnesApiKey() {
    return localStorage.getItem('AGNES_API_KEY') || '';
}

function saveAgnesApiKey() {
    const input = document.getElementById('agnes-api-key');
    if (input) {
        localStorage.setItem('AGNES_API_KEY', input.value.trim());
    }
}

function toggleAgnesKeyInput() {
    const model = getImageModel();
    const keyInput = document.getElementById('agnes-key-input');
    if (keyInput) {
        if (model.startsWith('agnes-')) {
            keyInput.classList.remove('hidden');
        } else {
            keyInput.classList.add('hidden');
        }
    }
    const gptInput = document.getElementById('gpt-image-input');
    if (gptInput) {
        if (model === 'gpt-image') {
            gptInput.classList.remove('hidden');
        } else {
            gptInput.classList.add('hidden');
        }
    }
}

// GPT Image（OpenAI/中转站）相关配置
function getGPTImageKey() {
    return localStorage.getItem('GPT_IMAGE_KEY') || '';
}

function saveGPTImageKey() {
    const input = document.getElementById('gpt-image-api-key');
    if (input) {
        localStorage.setItem('GPT_IMAGE_KEY', input.value.trim());
    }
}

function getGPTImageBaseURL() {
    return localStorage.getItem('GPT_IMAGE_BASE_URL') || '';
}

function saveGPTImageBaseURL() {
    const input = document.getElementById('gpt-image-base-url');
    if (input) {
        localStorage.setItem('GPT_IMAGE_BASE_URL', input.value.trim().replace(/\/+$/, ''));
    }
}

function getGPTImageModel() {
    return localStorage.getItem('GPT_IMAGE_MODEL') || 'gpt-image-2';
}

function saveGPTImageModel() {
    const input = document.getElementById('gpt-image-model');
    if (input) {
        localStorage.setItem('GPT_IMAGE_MODEL', input.value.trim() || 'gpt-image-2');
    }
}

function loadImageModelSelect() {
    const select = document.getElementById('image-model-select');
    if (select) {
        select.value = getImageModel();
    }
    // 恢复 Agnes API Key 和显示状态
    const keyInput = document.getElementById('agnes-api-key');
    if (keyInput) {
        keyInput.value = getAgnesApiKey();
    }
    // 恢复 GPT Image 配置
    const gptKeyInput = document.getElementById('gpt-image-api-key');
    if (gptKeyInput) gptKeyInput.value = getGPTImageKey();
    const gptUrlInput = document.getElementById('gpt-image-base-url');
    if (gptUrlInput) gptUrlInput.value = getGPTImageBaseURL();
    const gptModelInput = document.getElementById('gpt-image-model');
    if (gptModelInput) gptModelInput.value = getGPTImageModel();
    toggleAgnesKeyInput();
    const qselect = document.getElementById('image-quality-select');
    if (qselect) qselect.value = getImageQuality();
}

// 生图提示词优化：细节拉满，动作描写极致详细，不加安全限制
const IMAGE_PROMPT_OPTIMIZER = `You are a world-class AI Image Prompt Engineer for Stable Diffusion and FLUX models. Your task is to read a Roleplay (RP) chat snippet along with character descriptions, and translate it into a HIGHLY PRECISE, visual-only English image prompt.

[CORE RULES]
1. DECODE METAPHORS INTO VISUALS: The chat contains literary metaphors (e.g., "scalding breath", "temperature rising"). DO NOT use these in the image prompt. Translate them into literal physical actions (e.g., "face to face", "extremely close up", "intense eye contact", "pinning to wall").
2. STRICT CHARACTER ACCURACY: You MUST extract the exact physical appearance (hair color, eye color, clothing, gender) from the provided Character Card. If there are two characters, explicitly separate them (e.g., "1girl with black hair and red dress, 1boy with blonde hair"). DO NOT alter their established looks.
3. PRECISE POSING & COMPOSITION: Describe exactly where their hands are, their body language, and their spatial relationship based on the chat's context.
4. CINEMATIC PHOTOREALISM: Force the style to be ultra-realistic and attractive. Append these tags to the end: "masterpiece, best quality, photorealistic, soft cinematic lighting, 8k resolution, shot on DSLR, smooth healthy flawless skin, natural beauty, delicate attractive facial features". Do NOT describe visible pores, blemishes, wrinkles or rough skin texture; keep skin smooth, natural and good-looking.

[OUTPUT FORMAT]
Output ONLY a comma-separated list of English visual tags and descriptive phrases. NO explanations. NO conversational text.
Example: 1girl, 1boy, face to face, extreme close up, intense gaze, (boy pinning girl to the wall:1.2), girl with long black hair, boy with messy silver hair, cinematic lighting, photorealistic...`;

// 用LLM把提示词优化成细节拉满的版本
async function optimizeImagePrompt(prompt) {
    try {
        const llmUrl = localStorage.getItem('LLM_URL') || 'https://api.deepseek.com';
        const llmKey = localStorage.getItem('LLM_KEY') || '';
        const llmModel = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';
        const styleInfo = IMAGE_STYLES[getImageStyle()] || IMAGE_STYLES.photorealistic;

        // 8秒超时降级：优化太慢就用原始提示词，不让用户一直等
        const fetchPromise = fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${llmKey}`
            },
            body: JSON.stringify({
                baseUrl: llmUrl,
                model: llmModel,
                messages: [
                    { role: 'system', content: IMAGE_PROMPT_OPTIMIZER },
                    { role: 'user', content: `根据以下对话内容和角色设定，生成一段详细的英文生图提示词。必须严格根据对话中的动作、场景、人物互动来生成画面，不能脱离对话内容凭空想象。角色外貌必须严格按照设定描述。\n\n当前画风要求：${styleInfo.name}风格，画面必须符合"${styleInfo.prefix}"的视觉特征。\n\n${prompt}` }
                ],
                temperature: 0.8,
                stream: false
            })
        });

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('优化超时')), 4000);
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);

        if (!response.ok) {
            console.warn('提示词优化失败，使用原始提示词:', response.status);
            return getFixedStyleByMode() + ', ' + prompt;
        }

        const data = await response.json();
        const optimized = data.choices?.[0]?.message?.content?.trim();
        return getFixedStyleByMode() + ', ' + (optimized || prompt);
    } catch (e) {
        console.warn('提示词优化异常/超时，使用原始提示词:', e.message || e);
        return getFixedStyleByMode() + ', ' + prompt;
    }
}

// 生图核心函数：先优化提示词（细节拉满），再生成图片，不自动降级
// 根据提示词关键词自动挑选最合适的Pollinations模型
function pickModelByPrompt(prompt) {
    const p = prompt.toLowerCase();
    // 写实人像/照片类 → flux-realism
    if (/(photo|realistic|portrait|person|woman|man|girl|boy|face|照片|写实|人像|人物|女孩|男孩|女人|男人|脸)/.test(p)) {
        return 'pollinations-flux-realism';
    }
    // 中文场景/国风/艺术 → seedream
    if (/(chinese|china|ancient|国风|古风|中式|场景|风景|山水)/.test(p)) {
        return 'pollinations-seedream';
    }
    // 默认通用 → flux
    return 'pollinations-flux';
}

// 自动轮换队列（只使用Pollinations无审核系列，去掉不稳定的zimage）
const AUTO_MODEL_QUEUE = ['pollinations-flux-realism', 'pollinations-seedream', 'pollinations-flux'];

// ============================================
// 前端直连 Agnes（绕过Cloudflare IP限流）
// 失败时自动降级走后端 /api/image/generate
// ============================================
// 点图全屏查看（点任意处关闭）
function openImageLightbox(src) {
    let lb = document.getElementById('img-lightbox');
    if (!lb) {
        lb = document.createElement('div');
        lb.id = 'img-lightbox';
        lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;overflow:hidden;cursor:zoom-out;';
        document.body.appendChild(lb);
    }
    lb.innerHTML = '';
    // 拖动容器（全屏），图片在里面移动
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;touch-action:none;';
    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'max-width:95vw;max-height:95vh;object-fit:contain;border-radius:8px;transition:transform 0.25s ease;transform-origin:center;will-change:transform;';
    wrap.appendChild(img);
    lb.appendChild(wrap);
    lb.style.display = 'block';

    let zoom = 1;
    let tx = 0, ty = 0;
    let dragging = false, startX = 0, startY = 0, moved = false;

    function applyTransform(animate) {
        img.style.transition = animate ? 'transform 0.25s ease' : 'none';
        img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + zoom + ')';
    }
    function clamp() {
        const rect = img.getBoundingClientRect();
        const maxX = Math.max(0, (rect.width * zoom - rect.width) / 2);
        const maxY = Math.max(0, (rect.height * zoom - rect.height) / 2);
        tx = Math.min(maxX, Math.max(-maxX, tx));
        ty = Math.min(maxY, Math.max(-maxY, ty));
    }

    img.addEventListener('touchstart', (e) => {
        // 未放大时完全不拦截触摸，让click正常触发放大
        if (zoom === 1) return;
        // 已放大：进入拖拽模式（此时才阻止默认滚动）
        e.preventDefault();
        dragging = true; moved = false;
        startX = e.touches[0].clientX - tx;
        startY = e.touches[0].clientY - ty;
    }, { passive: false });
    img.addEventListener('touchmove', (e) => {
        if (!dragging) return;
        e.preventDefault();
        const nx = e.touches[0].clientX - startX;
        const ny = e.touches[0].clientY - startY;
        if (Math.abs(nx - tx) + Math.abs(ny - ty) > 3) moved = true;
        tx = nx; ty = ny;
        applyTransform(false);
    }, { passive: false });
    const endDrag = (e) => {
        if (!dragging) return;
        dragging = false;
        if (!moved) {
            // 放大状态下的轻点：手动缩小（放大后触摸被拦截，click不会触发）
            zoom = 1; tx = 0; ty = 0;
        } else {
            clamp();
        }
        applyTransform(true);
    };
    img.addEventListener('touchend', endDrag);
    img.addEventListener('touchcancel', endDrag);

    // 点图片（未放大时）：放大2.5倍看细节
    img.addEventListener('click', (e) => {
        e.stopPropagation();
        if (moved) return;
        if (zoom === 1) { zoom = 2.5; tx = 0; ty = 0; applyTransform(true); }
    });
    // 点黑色背景：关闭
    wrap.addEventListener('click', (e) => {
        if (e.target !== wrap) return;
        lb.style.display = 'none';
        zoom = 1; tx = 0; ty = 0;
        img.style.transform = '';
    });
}

async function generateGPTImageDirect(prompt, ratio = '1:1', inputImage = null, quality = '1K') {
    const apiKey = getGPTImageKey();
    if (!apiKey) {
        throw new Error('未配置 GPT Image API Key（设置 → AI生图 → 选 GPT Image 2 后填入）');
    }
    const model = getGPTImageModel();
    const baseURL = getGPTImageBaseURL() || 'https://api.openai.com/v1';
    const url = baseURL + '/images/generations';

    // size 映射：按比例 × 清晰度档位（1K/2K/4K）
    const base = quality === '4K' ? 4096 : (quality === '2K' ? 2048 : 1024);
    let size = base + 'x' + base;
    if (ratio) {
        const r = ratio.split(':').map(Number);
        if (r.length === 2 && r[0] && r[1]) {
            if (r[0] / r[1] > 1.2) size = (base * 1.5) + 'x' + base;      // 横图
            else if (r[1] / r[0] > 1.2) size = base + 'x' + (base * 1.5); // 竖图
            else size = base + 'x' + base;                                 // 方形
        }
    }

    const body = {
        model: model,
        prompt: prompt,
        size: size,
        response_format: 'b64_json'
    };
    // 图生图/参考头像：OpenAI 兼容接口用 image 参数（data URI）；中转站若用 extra_body.image 兼容 Agnes 写法
    if (inputImage) {
        if (Array.isArray(inputImage)) {
            body.image = inputImage[0];
        } else {
            body.image = inputImage;
        }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000);
    let response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });
    } catch (e) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') throw new Error('GPT Image 请求超时（180秒）');
        throw new Error('请求失败: ' + (e.message || e));
    }
    clearTimeout(timeoutId);
    if (!response.ok) {
        let errText = 'HTTP ' + response.status;
        try {
            const errData = await response.json();
            if (errData.error && errData.error.message) errText += ': ' + errData.error.message;
            else if (errData.message) errText += ': ' + errData.message;
        } catch (e) {}
        throw new Error('GPT Image ' + errText);
    }
    const data = await response.json();
    // 兼容 b64_json 和 url 两种返回
    let b64 = null, imgUrl = null;
    if (data && data.data && data.data[0]) {
        b64 = data.data[0].b64_json;
        imgUrl = data.data[0].url;
    }
    let blob = null;
    if (b64) {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        blob = new Blob([bytes], { type: 'image/png' });
    } else if (imgUrl) {
        const r = await fetch(imgUrl);
        if (r.ok) blob = await r.blob();
    }
    if (!blob) {
        throw new Error('GPT Image 返回中没有图片数据');
    }
    return { blob: blob, prompt: prompt, model: model };
}

async function generateAgnesDirect(prompt, ratio = '1:1', inputImage = null, quality = '1K') {
    const agnesApiKey = getAgnesApiKey();
    if (!agnesApiKey) {
        throw new Error('未配置 Agnes API Key');
    }
    const agnesModel = 'agnes-image-2.1-flash';
    const endpoints = [
        { url: 'https://apihub.agnes-ai.cn/v1/images/generations', name: '.cn' },
        { url: 'https://apihub.agnes-ai.com/v1/images/generations', name: '.com' }
    ];
    let lastError = null;

    for (const { url: endpoint, name: epName } of endpoints) {
        try {
            const requestBody = {
                model: agnesModel,
                prompt: prompt,
                size: quality,
                ratio: ratio,
                n: 1,
                response_format: 'b64_json',
                extra_body: { response_format: 'b64_json' }
            };
            if (inputImage) {
                requestBody.extra_body.image = Array.isArray(inputImage) ? inputImage : [inputImage];
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000);
            let response;
            try {
                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${agnesApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });
            } finally {
                clearTimeout(timeoutId);
            }

            if (!response.ok) {
                let errDetail = '';
                try {
                    const errData = await response.json();
                    errDetail = errData.error?.message || errData.message || JSON.stringify(errData).substring(0, 200);
                } catch (e) {}
                lastError = new Error(`[Agnes直连 ${epName}] HTTP ${response.status}: ${errDetail}`);
                if (response.status === 429) break;
                continue;
            }

            const data = await response.json();
            const item = data.data?.[0];
            if (!item || !item.b64_json) {
                lastError = new Error(`[Agnes直连 ${epName}] 返回数据为空`);
                continue;
            }

            let b64 = item.b64_json;
            let contentType = 'image/png';
            if (b64.startsWith('data:')) {
                const match = b64.match(/^data:([^;]+);base64,(.+)$/);
                if (match) {
                    contentType = match[1] || 'image/png';
                    b64 = match[2];
                }
            }
            const binaryString = atob(b64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: contentType });
            return { blob, model: 'agnes-2.1' };
        } catch (err) {
            // 超时/CORS/网络错误，记录后试下一个endpoint
            const errDetail = (err && err.name === 'AbortError') ? '请求超时（120秒未响应）' : (err && err.message) || err;
            lastError = new Error(`[Agnes直连 ${epName}] ${errDetail}`);
            continue;
        }
    }
    throw lastError || new Error('Agnes直连失败');
}

async function generateImageWithSafety(prompt, model, onStatusUpdate, preOptimizedPrompt, inputImage = null, ratio = '1:1', quality = '1K') {
    // 第一步：优化提示词
    // 如果传入了 preOptimizedPrompt（聊天里用角色AI生成的），直接用，不再单独调用DeepSeek
    let optimizedPrompt;
    if (preOptimizedPrompt) {
        optimizedPrompt = preOptimizedPrompt;
        if (onStatusUpdate) onStatusUpdate('角色AI已整理画面描述，正在生成图片...');
    } else if (getPromptLang() === 'zh') {
        // 中文直接生成模式：不调DeepSeek扩写，原提示词+固定画风前缀直接出图（文生图/图生图都最快）
        optimizedPrompt = getFixedStyleByMode() + ', ' + prompt;
        if (onStatusUpdate) onStatusUpdate('中文直接生成，正在出图...');
    } else {
        if (onStatusUpdate) onStatusUpdate('正在优化提示词细节...');
        optimizedPrompt = await optimizeImagePrompt(prompt);
    }

    // 第二步：确定使用的模型列表
    let modelsToTry;
    if (model === 'auto') {
        // 自动模式：DeepSeek根据提示词选第一个，失败后按队列轮换
        const firstModel = pickModelByPrompt(optimizedPrompt);
        // 把选中的模型放第一个，后面跟队列里其他模型（去重）
        modelsToTry = [firstModel, ...AUTO_MODEL_QUEUE.filter(m => m !== firstModel)];
        if (onStatusUpdate) onStatusUpdate(`AI自动选择模型: ${firstModel.replace('pollinations-', '')}（第1/3次）`);
    } else {
        // 手动指定模型：只用这一个，不轮换
        modelsToTry = [model];
    }

    // 第三步：逐个尝试生成，最多3次
    let lastError = null;
    for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
        const currentModel = modelsToTry[attempt];
        const modelName = currentModel.replace('pollinations-', '');

        if (attempt > 0 && onStatusUpdate) {
            onStatusUpdate(`上一个模型失败，自动更换为 ${modelName}（第${attempt + 1}/3次）`);
        }

        try {
            // GPT Image（OpenAI/中转站）：前端直连
            if (currentModel === 'gpt-image') {
                if (onStatusUpdate) onStatusUpdate('正在调用 GPT Image 生成图片（按张计费）...');
                const directResult = await generateGPTImageDirect(optimizedPrompt, ratio, inputImage, quality);
                return { blob: directResult.blob, prompt: optimizedPrompt, model: currentModel };
            }
            // Agnes 模型：优先前端直连（绕过Cloudflare IP限流），失败自动降级走后端
            let directErrMsg = '';
            if (currentModel === 'agnes-2.1') {
                try {
                    if (onStatusUpdate) onStatusUpdate('正在直连 Agnes 生成图片...');
                    const directResult = await generateAgnesDirect(optimizedPrompt, ratio, inputImage, quality);
                    return { blob: directResult.blob, prompt: optimizedPrompt, model: currentModel };
                } catch (directErr) {
                    directErrMsg = directErr.message || String(directErr);
                    console.warn('Agnes直连失败，降级走后端:', directErrMsg);
                    if (onStatusUpdate) onStatusUpdate('Agnes直连失败，尝试后端通道...');
                    // 继续往下走后端通道
                }
            }

            const requestBody = { prompt: optimizedPrompt, model: currentModel, agnesApiKey: getAgnesApiKey(), ratio: ratio, quality: quality, negative_prompt: NEGATIVE_PROMPT };
            if (inputImage) {
                requestBody.inputImage = inputImage;
            }
            const response = await fetch('/api/image/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                let errorMsg = '生成失败';
                try {
                    const errData = await response.json();
                    errorMsg = errData.error || errorMsg;
                } catch (e) {}
                // 直连和后端都失败时，把两条错误都带上，方便定位到底是哪一层/哪个endpoint
                if (directErrMsg) throw new Error(errorMsg + ' ｜直连报错：' + directErrMsg);
                throw new Error(errorMsg);
            }

            const blob = await response.blob();
            return { blob: blob, prompt: optimizedPrompt, model: currentModel };
        } catch (err) {
            lastError = err;
            // 如果是手动模式或者已经是最后一次，不再重试
            if (model !== 'auto' || attempt === modelsToTry.length - 1) {
                break;
            }
            // 自动模式：等待1秒后换下一个模型
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // 所有尝试都失败
    if (model === 'auto') {
        throw new Error('所有备选模型请求失败（已尝试3次），生成终止，请稍后重试。最后错误: ' + (lastError ? lastError.message : '未知错误'));
    }
    throw lastError;
}

// 生图页面：提示词是否已被AI优化（优化后生成时不再重复优化）
let isPromptOptimized = false;

// 手动点击"AI优化提示词"按钮（普通生图页面专用，超时10秒）
async function optimizePromptManual() {
    const input = document.getElementById('image-prompt');
    const btn = document.getElementById('btn-optimize-prompt');
    const prompt = input.value.trim();

    if (!prompt) {
        alert('请先输入画面描述');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> 优化中...';

    try {
        const llmUrl = localStorage.getItem('LLM_URL') || 'https://api.deepseek.com';
        const llmKey = localStorage.getItem('LLM_KEY') || '';
        const llmModel = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';
        // 读取用户设置里的System Prompt，让优化提示词的AI也遵守
        const customSystem = localStorage.getItem('LLM_SYSTEM') || '';

        const messages = [];
        // 先加用户的System Prompt（如果有设置）
        if (customSystem) {
            messages.push({ role: 'system', content: customSystem });
        }
        // 再加优化提示词的指令
        messages.push({ role: 'system', content: '你是AI绘画提示词大师。把用户输入的简单描述扩展成细节丰富的英文生图提示词。要求：1.只用英文输出 2.包含人物外貌、服装、动作、表情、环境、光线、氛围 3.写实照片风格：photorealistic, shot on DSLR, smooth healthy flawless skin, natural beauty, soft natural lighting, simple clean background 4.不要刻意描述毛孔、瑕疵、皱纹，皮肤柔和自然好看 5.不要输出任何解释或前缀，直接输出提示词 6.长度100-180个单词' });
        messages.push({ role: 'user', content: `优化这个生图提示词：${prompt}` });

        const fetchPromise = fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${llmKey}`
            },
            body: JSON.stringify({
                baseUrl: llmUrl,
                model: llmModel,
                messages: messages,
                temperature: 0.7,
                stream: false,
                thinking: { type: 'disabled' }
            })
        });

        // 60秒超时（给足时间，生成好自动填进来，不会轻易超时）
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('优化超时')), 60000);
        });

        let response;
        try {
            response = await Promise.race([fetchPromise, timeoutPromise]);
        } catch (timeoutErr) {
            // 超时后不报错，自动用原始提示词，用户可以直接点生成
            input.value = prompt;
            isPromptOptimized = false;
            btn.innerHTML = '<i class="fa-solid fa-clock"></i> 超时，用原词';
            setTimeout(() => {
                btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI优化提示词';
                btn.disabled = false;
            }, 2000);
            return;
        }

        if (!response.ok) {
            throw new Error('API错误: ' + response.status);
        }

        const data = await response.json();
        const optimized = data.choices?.[0]?.message?.content?.trim();

        if (!optimized || optimized.length < 20) {
            throw new Error('优化结果为空');
        }

        input.value = optimized;
        isPromptOptimized = true;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> 已优化';
        setTimeout(() => {
            btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI优化提示词';
            btn.disabled = false;
        }, 1500);
    } catch (e) {
        alert('提示词优化失败: ' + (e.message || e) + '\n\n请检查：\n1. 大模型API Key是否配置\n2. 网络是否正常\n3. 稍后再试');
        btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI优化提示词';
        btn.disabled = false;
    }
}

// 全局变量：保存上传的图片base64和比例
let uploadedImageBase64 = null;
let uploadedImageRatio = '1:1'; // 默认正方形

// 处理图片上传
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        // 压缩后再用：iPhone照片几MB直接转Base64太大，传得慢还容易限流
        compressImage(e.target.result, 1536, 0.85).then(function(compressed) {
            uploadedImageBase64 = compressed;
            // 读取图片宽高比
            const img = new Image();
            img.onload = function() {
                const w = img.width;
                const h = img.height;
                // 判断比例，映射到Agnes支持的比例
                if (w > h * 1.2) {
                    uploadedImageRatio = '16:9'; // 横图
                } else if (h > w * 1.2) {
                    uploadedImageRatio = '9:16'; // 竖图
                } else {
                    uploadedImageRatio = '1:1'; // 正方形
                }
                console.log('[Img2Img] 图片比例:', w + 'x' + h, '->', uploadedImageRatio);
            };
            img.src = compressed;
            // 显示预览
            const preview = document.getElementById('uploaded-image-preview');
            const imgEl = document.getElementById('uploaded-image');
            const removeBtn = document.getElementById('remove-uploaded-img-btn');
            if (preview && imgEl && removeBtn) {
                imgEl.src = compressed;
                preview.classList.remove('hidden');
                removeBtn.classList.remove('hidden');
            }
            sfxSuccess();
        }).catch(function(err) {
            console.error('压缩图片失败，用原图:', err);
            uploadedImageBase64 = e.target.result;
        });
    };
    reader.readAsDataURL(file);
}

// 压缩图片：最长边不超过maxSide，JPEG质量quality
function compressImage(dataUrl, maxSide, quality) {
    return new Promise(function(resolve, reject) {
        const img = new Image();
        img.onload = function() {
            try {
                let w = img.width, h = img.height;
                const scale = Math.min(1, maxSide / Math.max(w, h));
                if (scale >= 1 && w * h <= 1600 * 1600) { resolve(dataUrl); return; } // 已经够小
                w = Math.round(w * scale); h = Math.round(h * scale);
                const c = document.createElement('canvas');
                c.width = w; c.height = h;
                c.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(c.toDataURL('image/jpeg', quality));
            } catch (err) { reject(err); }
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}

// 移除上传的图片
function removeUploadedImage() {
    uploadedImageBase64 = null;
    uploadedImageRatio = '1:1';
    const preview = document.getElementById('uploaded-image-preview');
    const img = document.getElementById('uploaded-image');
    const removeBtn = document.getElementById('remove-uploaded-img-btn');
    const input = document.getElementById('image-upload-input');
    if (preview) preview.classList.add('hidden');
    if (img) img.src = '';
    if (removeBtn) removeBtn.classList.add('hidden');
    if (input) input.value = '';
}

// 全屏图片查看器
function openImageViewer() {
    const generatedImg = document.getElementById('generated-image');
    const viewerImg = document.getElementById('image-viewer-img');
    const viewer = document.getElementById('image-viewer');
    if (!generatedImg || !generatedImg.src || !viewer || !viewerImg) return;
    viewerImg.src = generatedImg.src;
    viewer.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeImageViewer() {
    const viewer = document.getElementById('image-viewer');
    if (viewer) {
        viewer.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

async function generateImage() {
    const prompt = document.getElementById('image-prompt').value.trim();
    const model = getImageModel();

    if (!prompt) {
        alert('请输入画面描述');
        return;
    }

    // 显示加载状态
    const statusEl = document.getElementById('image-status');
    const resultEl = document.getElementById('image-result');
    const btn = document.getElementById('image-generate-btn');
    const statusText = statusEl.querySelector('.text-xs.text-gray-500');
    statusEl.classList.remove('hidden');
    resultEl.classList.add('hidden');
    btn.disabled = true;
    btn.classList.add('btn-disabled');

    try {
        // 如果已经手动优化过提示词，直接用当前文本，不再重复优化
        const preOptimized = isPromptOptimized ? prompt : null;
        const result = await generateImageWithSafety(prompt, model, (msg) => {
            if (statusText) statusText.textContent = msg;
        }, preOptimized, uploadedImageBase64, uploadedImageRatio, getImageQuality());

        // 生成完成后重置优化标记，下次输入新提示词时重新优化
        isPromptOptimized = false;

        const imageUrl = URL.createObjectURL(result.blob);

        // 释放之前的 Blob URL
        const img = document.getElementById('generated-image');
        if (img.src && img.src.startsWith('blob:')) {
            URL.revokeObjectURL(img.src);
        }

        // 显示结果
        img.src = imageUrl;
        const downloadBtn = document.getElementById('image-download-btn');
        downloadBtn.href = imageUrl;
        resultEl.classList.remove('hidden');

    } catch (error) {
        console.error('生图失败:', error);
        const errMsg = error.message || '';
        if (errMsg.includes('NSFW') || errMsg.includes('8007')) {
            alert('生成失败：提示词包含敏感元素，已被安全审核拦截。\n\n建议：描述一些日常、温馨的场景。');
        } else if (errMsg.includes('Agnes')) {
            // Agnes错误：显示完整信息，方便诊断
            alert('Agnes 生图失败：\n\n' + errMsg + '\n\n建议：\n1. 检查 API Key 是否正确\n2. 确认 Key 是在 .cn 还是 .com 注册的\n3. 稍后再试或切换 Pollinations 模型');
        } else if (errMsg.includes('429')) {
            alert('生成失败：请求太频繁被限流了。\n\n建议：等10-20秒再试，或者切换其他生图模型。');
        } else {
            alert('生成失败: ' + errMsg + '\n\n可能原因：\n1. 免费额度已用完（每天重置）\n2. 网络问题，请重试\n3. 请求太频繁，稍后再试');
        }
    } finally {
        statusEl.classList.add('hidden');
        btn.disabled = false;
        btn.classList.remove('btn-disabled');
    }
}

// ============================================
// 根据对话生成图片
// ============================================

// 固定风格前缀：每次生图都强制加上，锁死画风不漂移（保留兼容，实际生图用getFixedStyleByMode）
const FIXED_IMAGE_STYLE = 'photorealistic, shot on Canon EOS R5, 50mm f/1.8 lens, soft natural lighting, smooth healthy flawless skin, natural beauty, delicate attractive facial features, lifelike, candid photo, natural skin texture, no anime, no illustration, no overexposure, anatomically correct, correct hands, five fingers per hand, natural posture, proper anatomy';

// ============================================
// 画风选择器（6种，设置里切换，聊天生图和AI生图页统一生效）
// ============================================
const IMAGE_STYLES = {
    photorealistic: { name: '写实照片', prefix: 'photorealistic, shot on Canon EOS R5, 50mm f/1.8 lens, soft natural lighting, smooth healthy flawless skin, natural beauty, delicate attractive facial features, lifelike, candid photo, natural skin texture, simple clean background, no extra objects' },
    anime: { name: '动漫二次元', prefix: 'anime style, cel shading, 2D illustration, vibrant colors, anime key visual, clean lineart, studio quality, simple clean background, no extra objects' },
    japanese_anime: { name: '日系动漫插画', prefix: 'anime style, semi-realistic, cel shading, clean lineart, vibrant colors, soft natural lighting, cinematic composition, high quality, masterpiece, studio anime key visual, simple clean background, no extra objects' }
};
// 合并后的画质+防崩锁（原来FIXED_IMAGE_STYLE和ANATOMY_LOCK重复的 anatomically correct / five fingers / natural posture 已去重）
const CORE_QUALITY_LOCK = 'masterpiece, high quality, detailed, photorealistic, candid photo, shot on Canon EOS R5, 50mm f/1.8, soft natural lighting, authentic skin texture, anatomically correct limbs, correct hands and feet, natural posture';

function getImageStyle() {
    const s = localStorage.getItem('IMAGE_STYLE') || 'photorealistic';
    // 旧值迁移：monochrome_anime 已替换为 japanese_anime
    if (s === 'monochrome_anime') {
        localStorage.setItem('IMAGE_STYLE', 'japanese_anime');
        return 'japanese_anime';
    }
    return s;
}

function getFixedStyleByMode() {
    const style = IMAGE_STYLES[getImageStyle()] || IMAGE_STYLES.photorealistic;
    return style.prefix + ', ' + CORE_QUALITY_LOCK;
}

// 生图提示词确认弹窗：返回 {confirmed, text}
function awaitPromptConfirm(defaultText) {
    return new Promise((resolve) => {
        const modal = document.getElementById('prompt-confirm-modal');
        const ta = document.getElementById('prompt-confirm-text');
        const okBtn = document.getElementById('prompt-confirm-ok');
        const cancelBtn = document.getElementById('prompt-confirm-cancel');
        if (!modal || !ta || !okBtn || !cancelBtn) { resolve({ confirmed: true, text: defaultText || '' }); return; }
        ta.value = defaultText || '';
        const cleanup = () => {
            modal.close();
            okBtn.onclick = null;
            cancelBtn.onclick = null;
        };
        okBtn.onclick = () => { const text = ta.value; cleanup(); resolve({ confirmed: true, text }); };
        cancelBtn.onclick = () => { cleanup(); resolve({ confirmed: false, text: '' }); };
        modal.showModal();
    });
}

// 设置：聊天生图前确认提示词
function savePromptConfirmSetting() {
    const el = document.getElementById('prompt-confirm-toggle');
    localStorage.setItem('IMG_CONFIRM_PROMPT', el && el.checked ? '1' : '0');
}

// 设置：聊天生图是否参考角色头像
function saveImgRefAvatar() {
    const el = document.getElementById('img-ref-avatar-toggle');
    localStorage.setItem('IMG_REF_AVATAR', el && el.checked ? '1' : '0');
}

// 设置：AI 自动发朋友圈
function saveAutoMoments() {
    const el = document.getElementById('auto-moments-toggle');
    localStorage.setItem('AUTO_MOMENTS', el && el.checked ? '1' : '0');
}

// 保存生图画风（AI生图页面下拉框onchange直接调用，无需点保存按钮）
function saveImageStyle() {
    const sel = document.getElementById('modal-image-style');
    if (sel) {
        localStorage.setItem('IMAGE_STYLE', sel.value);
    }
}

// 页面加载时同步画风下拉框的当前值
function initImageStyleSelect() {
    const sel = document.getElementById('modal-image-style');
    if (sel) {
        sel.value = getImageStyle();
    }
}

// ===== 生图提示词语言开关（中文直接生成 / 英文优化后生成）=====
function getPromptLang() {
    return localStorage.getItem('PROMPT_LANG') || 'en';
}

function savePromptLang() {
    const sel = document.getElementById('modal-prompt-lang');
    if (sel) {
        localStorage.setItem('PROMPT_LANG', sel.value);
    }
}

function initPromptLangSelect() {
    const sel = document.getElementById('modal-prompt-lang');
    if (sel) {
        sel.value = getPromptLang();
    }
}

// 负面提示词：防止人体扭曲/坏手/多手指（传给生图模型）
const NEGATIVE_PROMPT = 'bad hands, missing fingers, extra fingers, deformed hands, mutated hands, poorly drawn hands, extra limbs, missing limbs, deformed body, distorted proportions, bad anatomy, ugly, blurry, low quality';

// 从角色卡描述中提取外貌部分（用【外貌】或"外貌："标记）
function extractAppearanceFromRoleCard(roleDesc) {
    if (!roleDesc) return '';
    // 匹配【外貌】【外观】【长相】后面的内容，直到下一个【
    const bracketMatch = roleDesc.match(/【(?:外貌|外观|长相|外形)】([\s\S]*?)(?=【|$)/);
    if (bracketMatch && bracketMatch[1].trim()) {
        return bracketMatch[1].trim();
    }
    // 匹配"外貌："或"外貌:"后面的内容，直到换行+下一个标签
    const colonMatch = roleDesc.match(/(?:外貌|外观|长相|外形)[：:]\s*([\s\S]*?)(?=\n\s*[【\w]+[：:]|$)/);
    if (colonMatch && colonMatch[1].trim()) {
        return colonMatch[1].trim();
    }
    // 没有找到外貌标记，返回空（降级用整个desc）
    return '';
}

// ===== 服装硬锁：从角色卡里抠出"服装/穿着/衣服"相关行 =====
function extractClothingFromRoleCard(roleDesc) {
    if (!roleDesc) return '';
    const lines = roleDesc.split('\n');
    const hits = [];
    for (const line of lines) {
        const t = line.trim();
        if (!t) continue;
        if (/服装|穿着|衣服|穿搭|上身|下身|上半身|下半身|裙子|上衣|下装|外套|内衣|光脚|赤裸|没穿|裸/.test(t)) {
            hits.push(t.replace(/^[·\-\*•\d.、\s]+/, ''));
        }
    }
    return hits.join(', ');
}

// 剧情明确在换衣服/脱衣服时，豁免服装硬锁
function isChangingClothingScene(text) {
    if (!text) return false;
    return /脱|换衣|换了.{0,4}[衣裙装]|没穿|赤裸|裸体|裸体|睡衣|浴衣|湿身|刚洗完澡|只裹着|浴巾/.test(text);
}

// ===== B. 性别确定性提取：返回 'female' / 'male' / ''（不确定返回空，交回给AI判断）=====
function getRoleGender(roleDesc) {
    if (!roleDesc) return '';
    // 1. 明确字段：性别：女 / 性别: 男 / 【性别】女 / gender: female
    let m = roleDesc.match(/(?:性别|gender)\s*[：:＝=]\s*([女男]|female|male|girl|boy|woman|man)/i);
    if (m) {
        const v = m[1].toLowerCase();
        if (/女|female|girl|woman/.test(v)) return 'female';
        if (/男|male|boy|man/.test(v)) return 'male';
    }
    m = roleDesc.match(/【性别】\s*([女男])/);
    if (m) return m[1] === '女' ? 'female' : 'male';
    // 2. 弱信号：明确人称名词计数
    const femaleHits = (roleDesc.match(/少女|女孩|女人|女性|女子|女生|御姐|萝莉|女王|少妇/g) || []).length;
    const maleHits = (roleDesc.match(/少年|男孩|男人|男性|男子|男生|大叔|正太/g) || []).length;
    if (femaleHits > maleHits) return 'female';
    if (maleHits > femaleHits) return 'male';
    return '';
}

// ===== C. 镜头视角硬约束：确定性识别 正/侧/背，返回固定英文约束串 =====
function getCameraViewConstraint(userInput) {
    const t = userInput || '';
    if (/背影|背面|背后|背对|后背|背对着|朝后|后方/.test(t)) {
        return { type: 'rear', tags: 'direct rear view, camera directly behind the character, character facing completely away from the camera, full back visible, back of the character clearly visible, centered rear composition, back of head visible, no face visible, no side profile, no side view, no three-quarter view, no front view' };
    }
    if (/侧面|侧脸|侧影|侧身|侧颜|正侧/.test(t)) {
        return { type: 'side', tags: 'side profile view, character in exact profile, camera positioned directly to the side, clear side profile, no front view, no rear view, no three-quarter view' };
    }
    if (/正脸|正面|正对|面朝镜头|面向镜头|正面照|正对镜头/.test(t)) {
        return { type: 'front', tags: 'front view, character facing the camera directly, face fully visible, centered front composition, no side view, no rear view, no three-quarter view' };
    }
    return null;
}

// ===== C2. 背面模式程序级二次清洗：LLM即使没完全遵守system prompt，也在最终prompt里洗掉正面/侧面冲突词 =====
function cleanRearViewPrompt(promptText) {
    if (!promptText) return promptText;
    // 按长度降序先删短语再删单词，避免互相破坏（如先删 facial features 再删 face）
    const banned = [
        'looking at the camera', 'looking at camera', 'looks at camera', 'look at camera',
        'facial features', 'facial expression', 'facial expressions',
        'three-quarter view', 'three quarter view', 'three quarters view',
        'side profile',
        'front view',
        'profile', 'profiles',
        'eye contact', 'eyes', 'face',
        'smile', 'smiles', 'smiling', 'gaze', 'gazes', 'gazing',
        'expression', 'expressions'
    ];
    let cleaned = promptText;
    for (const phrase of banned) {
        const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        cleaned = cleaned.replace(regex, '');
    }
    // 清理删除后残留的孤立逗号/空格
    cleaned = cleaned
        .replace(/\s*,\s*,+\s*/g, ',')
        .replace(/^[\s,]+/, '')
        .replace(/[\s,]+$/, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    return cleaned;
}

// ===== C3. 纯视角请求判断：输入只有视角/景别、没有动作场景时，不必再调LLM翻译（视角已由代码确定）=====
function isPureViewRequest(userInput) {
    if (!userInput) return false;
    let t = userInput
        .replace(/拍.*?(张|个|张照片|张图|张图片|照|图|照片|图片)/g, '')
        .replace(/(给我|帮我|来|弄|搞|生成|做|我想|我想要|我要|让我|让|看看|看|从|给|她的|他的|一个|一张|的|她|他|你|我)/g, '')
        .replace(/(照片|图片|图|照)/g, '')
        .replace(/[，。！？、,.\s]/g, '')
        .trim();
    t = t.replace(/背影|背面|背后|背对|后背|背对着|朝后|后方|侧面|侧脸|侧影|侧身|侧颜|正脸|正面|正对|面朝|面向|全身|半身|特写|近景|远景|大头|镜头/g, '').trim();
    return t.length < 2;
}

// ===== C4. 双角色分工判断：输入同时含"背对"类词和"看着/面对"类词（如"A背对镜头，B看着A"），不能全局强制背面 =====
function isDualSplitRear(userInput, isDualMode) {
    if (!isDualMode) return false;
    const t = userInput || '';
    const hasRear = /背影|背面|背后|背对|后背/.test(t);
    const hasOtherView = /看着|看向|望向|凝视|望着|盯着|面对|正对/.test(t);
    return hasRear && hasOtherView;
}

// ===== A. 身份块：简单哈希，用于缓存key（角色卡一改哈希就变，自动重译）=====
function simpleHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36);
}

// ===== A. 获取角色固定英文身份块（localStorage缓存，同一角色只翻译一次）。任何失败都返回null回退，不阻断生图 =====
async function ensureIdentityBlock(role) {
    if (!role || !role.desc) return null;
    try {
        const appearance = extractAppearanceFromRoleCard(role.desc) || role.desc;
        const gender = getRoleGender(role.desc);
        const rid = role.id || 'noid';
        const hash = simpleHash(role.desc);
        const cacheKey = `IMG_IDENTITY_${rid}_${hash}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached && cached.length > 20) return cached;

        const llmUrl = localStorage.getItem('LLM_URL') || 'https://api.deepseek.com';
        const llmKey = localStorage.getItem('LLM_KEY') || '';
        const llmModel = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';
        const genderHint = gender === 'female' ? '女性(female)' : gender === 'male' ? '男性(male)' : '请根据描述判断';

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${llmKey}` },
            body: JSON.stringify({
                baseUrl: llmUrl, model: llmModel,
                messages: [
                    { role: 'system', content: '你是AI绘画角色身份块生成器。把角色外貌资料翻译成一段固定的英文 Character Identity Block，用于生图时锁定角色长相。要求：只输出英文逗号分隔标签，不要解释；必须包含性别与年龄感、发色发型、瞳色、脸型五官、身材、固定服装、配饰；客观写实；不要动作、表情、场景、镜头、光线；控制在80-120个英文单词；身份信息必须忠于资料，不得改写或臆造发色、瞳色、发型、服装。' },
                    { role: 'user', content: `角色名：${role.name}\n性别：${genderHint}\n外貌资料：${appearance}` }
                ],
                temperature: 0, stream: false, thinking: { type: 'disabled' }
            })
        });
        if (!response.ok) return null;
        const data = await response.json();
        let block = data.choices?.[0]?.message?.content?.trim() || '';
        block = block.replace(/["'`]/g, '').replace(/\n/g, ' ').trim();
        if (block.length < 20) return null;
        // 清掉同角色旧缓存后写入新缓存
        try {
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith(`IMG_IDENTITY_${rid}_`)) localStorage.removeItem(k);
            });
            localStorage.setItem(cacheKey, block);
        } catch (e) {}
        return block;
    } catch (e) {
        console.warn('身份块生成失败，回退现有逻辑:', e.message);
        return null;
    }
}

// 从角色卡描述中去掉外貌部分（正常聊天用，减少system prompt长度，加快回复）
function stripAppearanceFromRoleCard(roleDesc) {
    if (!roleDesc) return '';
    // 去掉【外貌】【外观】【长相】整个段落
    let result = roleDesc.replace(/【(?:外貌|外观|长相|外形)】[\s\S]*?(?=【|$)/g, '');
    // 去掉"外貌："开头的段落（直到换行+下一个标签）
    result = result.replace(/(?:外貌|外观|长相|外形)[：:]\s*[\s\S]*?(?=\n\s*[【\w]+[：:]|$)/g, '');
    return result.trim();
}

// 用AI把用户的动作/景别要求翻译成英文，强制加入提示词（不用固定词库，更灵活）
// 把参考头像裁剪成脸部特写（只传脸，避免参考图带出构图/姿势/背景）
function cropAvatarToFace(dataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            try {
                const c = document.createElement('canvas');
                const w = img.width, h = img.height;
                if (!w || !h) { resolve(dataUrl); return; }
                const cw = Math.max(160, Math.round(w * 0.62));
                const ch = Math.max(160, Math.round(h * 0.62));
                const cx = Math.round((w - cw) / 2);
                const cy = Math.round((h - ch) * 0.3); // 脸一般在画面中心偏上
                c.width = cw; c.height = ch;
                const ctx = c.getContext('2d');
                ctx.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
                resolve(c.toDataURL('image/jpeg', 0.88));
            } catch (e) {
                console.warn('[头像裁剪] 失败，用原图:', e);
                resolve(dataUrl);
            }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

// 中文直生成模式的动作提炼：把聊天记录提炼成精简画面描述（中文输出，不再发聊天原文）
async function extractActionSummaryZH(conversationText, userInput, isDualMode) {
    try {
        const llmUrl = localStorage.getItem('LLM_URL') || 'https://api.deepseek.com';
        const llmKey = localStorage.getItem('LLM_KEY') || '';
        const llmModel = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';
        const resp = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${llmKey}` },
            body: JSON.stringify({
                baseUrl: llmUrl, model: llmModel,
                messages: [
                    { role: 'system', content: '你是生图画面提炼师。从聊天记录中提炼生成图片所需的画面描述：只提取人物的动作、姿势、所处场景、表情、镜头景别（全身/半身/特写/背面等）和正在发生的事。用简洁中文输出，一两句话即可。严禁复述聊天原文、严禁输出对话内容、严禁语气词和内心独白。' },
                    { role: 'user', content: `聊天记录：\n${conversationText}\n\n${userInput ? '用户拍摄要求：' + userInput : ''}\n请提炼画面描述。` }
                ],
                temperature: 0.3,
                stream: false,
                thinking: { type: 'disabled' }
            })
        });
        if (!resp.ok) return '';
        const data = await resp.json();
        const t = (data.choices?.[0]?.message?.content || '').trim();
        return t.length > 2 ? t : '';
    } catch (e) {
        console.warn('[中文提炼] 失败，降级用聊天原文:', e);
        return '';
    }
}

async function translateUserActionToEnglish(userInput) {
    if (!userInput) return '';

    // 去掉触发词，只保留动作/景别描述
    let actionText = userInput
        .replace(/拍.*?(张|个|张照片|张图|张图片|照|图|照片|图片)/g, '')
        .replace(/(给我|帮我|来|弄|搞|生成|做)/g, '')
        .replace(/(照片|图片|图|照)/g, '')
        .trim();

    if (!actionText || actionText.length < 2) return '';

    try {
        const llmUrl = localStorage.getItem('LLM_URL') || 'https://api.deepseek.com';
        const llmKey = localStorage.getItem('LLM_KEY') || '';
        const llmModel = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${llmKey}`
            },
            body: JSON.stringify({
                baseUrl: llmUrl,
                model: llmModel,
                messages: [
                    { role: 'system', content: '你是专业的生图提示词翻译专家。把用户的中文拍摄要求翻译成简洁的英文生图关键词。只输出英文关键词，用逗号分隔，不要任何解释、不要中文、不要引号。包含景别（如full body shot/close-up）、动作、表情、角度等。' },
                    { role: 'user', content: `把这句话翻译成英文生图关键词：${actionText}` }
                ],
                temperature: 0.2,
                stream: false,
                thinking: { type: 'disabled' }
            })
        });

        if (!response.ok) return '';
        const data = await response.json();
        let result = data.choices?.[0]?.message?.content?.trim() || '';
        // 清理：去掉引号、换行、多余空格
        result = result.replace(/["'`]/g, '').replace(/\n/g, ' ').trim();
        return result;
    } catch (e) {
        console.warn('动作要求翻译失败:', e.message);
        return '';
    }
}

// 用当前聊天角色AI生成生图提示词（复用角色人设，不单独调用DeepSeek提示词大师）
async function generatePromptWithRoleAI(conversationText, isDualMode = false, dualRoles = null, isBackView = false, opts = {}) {
    try {
        const llmUrl = localStorage.getItem('LLM_URL') || 'https://api.deepseek.com';
        const llmKey = localStorage.getItem('LLM_KEY') || '';
        const llmModel = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';
        const currentRole = getCurrentRole();

        // 读取用户设置里的System Prompt，让生图提示词也遵守
        const customSystem = localStorage.getItem('LLM_SYSTEM') || '';

        // ===== A身份块 / B确定性性别 / C视角（由主流程预取后传入）=====
        const identity = opts.identity || {};
        const genders = opts.genders || {};
        const cameraView = opts.cameraView || null;
        // P1-H1：双角色分工（A背对、B看着A）时，不进入全局背面禁脸，改用分工专用视角规则
        const splitRear = opts.splitRear === true;
        const backMode = !splitRear && (isBackView || cameraView?.type === 'rear');

        // 单人起手式标签（性别确定则写死，不让AI猜；不确定时用英文兜底，绝不让中文进生图prompt）
        const singleTag = genders.single === 'female' ? '1girl' : (genders.single === 'male' ? '1boy' : 'single character');
        // 双角色起手式
        let dualTag = 'two characters';
        const ga = genders.A, gb = genders.B;
        if (ga && gb) {
            if (ga === 'female' && gb === 'female') dualTag = '2girls';
            else if (ga === 'male' && gb === 'male') dualTag = '2boys';
            else dualTag = '1girl, 1boy';
        }
        // 视角硬约束文本
        let viewRule = '';
        if (cameraView) {
            if (splitRear && cameraView.type === 'rear') {
                // 双角色分工：只有被指定背对的角色才背面，另一角色自然朝向、允许面部眼睛表情
                viewRule = `\n【镜头视角-分工硬约束】只有用户明确指定背对镜头的那个角色，才采用 direct rear view（facing completely away from camera, full back visible, no face visible for that character）；另一个角色保持自然朝向，必须正常出现面部、眼睛和表情；严禁把两个角色都画成背面。`;
            } else {
                viewRule = `\n【镜头视角-最高硬约束】必须严格采用此视角，不得弱化、改写或自行推测，把它放在人物起手式之后的最前面，并在结尾再重复一次：${cameraView.tags}`;
            }
        }

        let systemContent;

        if (isDualMode && dualRoles && dualRoles.roleA && dualRoles.roleB) {
            // 双角色模式：提取两个角色的外貌，明确要求画面包含两个人物
            const appearanceA = extractAppearanceFromRoleCard(dualRoles.roleA.desc) || dualRoles.roleA.desc;
            const appearanceB = extractAppearanceFromRoleCard(dualRoles.roleB.desc) || dualRoles.roleB.desc;
            // A. 有缓存身份块就用固定块（禁止改写），否则退回原文翻译
            const idA = identity.A
                ? `【角色A固定身份块-必须原样使用，禁止改写其发色/瞳色/发型/服装/性别】：${identity.A}`
                : `【角色A外貌】姓名：${dualRoles.roleA.name}，严格按原文翻译成英文，不得改写或遗漏：${appearanceA}`;
            const idB = identity.B
                ? `【角色B固定身份块-必须原样使用，禁止改写其发色/瞳色/发型/服装/性别】：${identity.B}`
                : `【角色B外貌】姓名：${dualRoles.roleB.name}，严格按原文翻译成英文，不得改写或遗漏：${appearanceB}`;
            systemContent = `你是一个世界级AI绘画提示词工程师（Stable Diffusion和FLUX模型）。根据下面两个角色的对话和设定，生成HIGHLY PRECISE的纯视觉英文生图提示词。
【输出结构-严格按此顺序分层】①人物起手式标签(${dualTag}) → ②角色A固定身份 → ③角色B固定身份 → ④两人当前动作与空间关系 → ⑤镜头景别/视角 → ⑥场景环境 → ⑦光线画质。
要求：
1. 只输出逗号分隔的英文视觉标签，不要任何解释、对话、台词或引号
2. ${idA}
3. ${idB}
4. 【破除隐喻】对话中的文学隐喻（如"灼热呼吸""温度攀升""压迫感"）不得直接使用，必须翻译成具体视觉动作（face to face、extremely close up、intense eye contact、pinning to wall、leaning close）
5. 【动作最高约束】严格按对话原文提取两人各自的动作、表情、姿态，核心动作（站/坐/走/跑/拥抱/牵手/亲吻/抚摸/看/微笑等）不许改变、替换、省略或加戏，只能补充姿势细节、手部位置、谁靠向谁
6. 【人物起手式】必须使用 ${dualTag}，性别已由系统确定，禁止更改；画面必须同时包含两个人物，不能只画一个
7. 不要添加风格词（系统已有固定写实前缀）
8. 除两个固定身份块外，动作/构图/场景/光线部分合计控制在180-280个英文单词，按结构精炼有序，不要堆砌无关形容词
9. 【动作冲突清洗】每个角色只能有一个连贯动作，严禁同时出现互斥姿态；同一个词不要重复出现超过一次；全部输出纯英文，禁止出现中文字符或中文标点
${viewRule}`;
        } else {
            // 单人模式
            const roleDesc = currentRole ? currentRole.desc : '';
            const roleName = currentRole ? currentRole.name : 'AI';
            const appearance = extractAppearanceFromRoleCard(roleDesc);
            const idSingle = identity.single
                ? `【固定身份块-必须原样使用，禁止改写其发色/瞳色/发型/服装/性别】：${identity.single}`
                : (appearance
                    ? `【外貌部分】严格按原文翻译成英文，不得改写或遗漏：${appearance}`
                    : `【人物外貌】严格按角色设定翻译成英文，包含发型发色、五官、身材、服装，不要改写：${roleDesc}`);
            systemContent = `你是${roleName}，同时是一名世界级AI绘画提示词工程师（Stable Diffusion和FLUX模型）。角色设定：${roleDesc}\n\n请根据下面的对话内容，生成HIGHLY PRECISE的纯视觉英文生图提示词。
【输出结构-严格按此顺序分层】①人物起手式标签(${singleTag}) → ②固定身份(外貌/服装) → ③当前动作与表情 → ④镜头景别/视角 → ⑤场景环境 → ⑥光线画质。
要求：
1. 只输出逗号分隔的英文视觉标签，不要任何解释、对话、台词或引号
2. ${idSingle}
3. 【破除隐喻】文学隐喻翻译成具体视觉动作（face to face、extremely close up、leaning close、touching cheek等），不要直接用抽象词
4. 【人物起手式】必须使用 ${singleTag}，性别已由系统确定，禁止更改；画面中必须只有1个人物，绝对不能出现第二个人、路人、背景人影或多人群像
5. 【动作最高约束】严格按对话原文提取动作、表情、姿态，核心动作（站/坐/走/跑/拥抱/牵手/看/微笑等）不许改变、替换、省略或加戏，只能补充姿势细节、手部位置、头部朝向、眼神方向
6. 不要添加风格词（系统已有固定写实前缀）
7. 除固定身份块外，动作/场景/光线部分合计控制在120-200个英文单词，按结构精炼有序，不要堆砌无关形容词
8. 【景别最高优先级】若有【用户拍摄要求】，其景别（全身full body/半身half body/特写close-up）必须100%遵守并放在最前；要求全身时禁止写half body、bust、portrait、close-up
9. 【动作冲突清洗】一个角色只能有一个连贯动作，严禁同时出现互斥姿态（如同时站立+蹲下+扶膝）；同一个词不要重复出现超过一次；全部输出纯英文，禁止出现中文字符或中文标点
${viewRule}`;
        }

        // 【背面拍摄】视角为背面时，外貌只写背影，禁止正面五官描述
        if (backMode) {
            systemContent += `\n\n【背面拍摄强制指令】本图为背面视角：身份/外貌部分只允许描写背影可见内容（发型发色、发丝、身形体态、肩背线条、服装背面、鞋、轮廓），严禁出现 face, eyes, facial features, expression, smile, gaze, look at camera 等任何正面词。`;
        }

        const messages = [];
        // 先加用户的System Prompt（如果有设置）
        if (customSystem) {
            messages.push({ role: 'system', content: customSystem });
        }
        // 再加角色卡和生图指令
        messages.push({ role: 'system', content: systemContent });
        messages.push({ role: 'user', content: `根据以下对话生成英文生图提示词：\n\n${conversationText}` });

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${llmKey}`
            },
            body: JSON.stringify({
                baseUrl: llmUrl,
                model: llmModel,
                messages: messages,
                temperature: 0.3,
                stream: false,
                thinking: { type: 'disabled' }
            })
        });

        if (!response.ok) {
            console.warn('角色AI生成提示词失败，降级用原始文本:', response.status);
            return getFixedStyleByMode() + ', ' + conversationText;
        }

        const data = await response.json();
        let prompt = data.choices?.[0]?.message?.content?.trim() || '';

        // 清理：去掉可能的动作描写*(...)*和台词「...」
        prompt = prompt.replace(/\*[^*]*\*/g, '').replace(/「[^」]*」/g, '').trim();

        // 如果清理后太短，降级用原始文本
        if (prompt.length < 20) {
            return getFixedStyleByMode() + ', ' + conversationText;
        }

        // 强制加上固定风格前缀，锁死画风；单人模式额外锁死只有1个人物
        const soloLock = isDualMode ? '' : ', solo, 1 person, only one character, no other people, no background figures';
        return getFixedStyleByMode() + soloLock + ', ' + prompt;
    } catch (e) {
        console.warn('角色AI生成提示词异常，降级用原始文本:', e.message);
        return getFixedStyleByMode() + ', ' + conversationText;
    }
}

// 生图防重复触发标志
let isGeneratingChatImage = false;

// ===== 魔法棒角度菜单：单角色/双角色分别显示不同菜单，选择后用该角度+最近4条聊天记录生成 =====
function toggleMagicMenu(e) {
    if (e) e.stopPropagation(); // 阻止冒泡，避免被document点击监听立即关闭
    const isDual = localStorage.getItem('DUAL_ROLE_MODE') === '1';
    const singleMenu = document.getElementById('magic-view-menu');
    const dualMenu = document.getElementById('magic-dual-menu');
    if (isDual) {
        singleMenu?.classList.add('hidden');
        dualMenu?.classList.toggle('hidden');
    } else {
        dualMenu?.classList.add('hidden');
        singleMenu?.classList.toggle('hidden');
    }
}

// 单角色菜单：直接用选中的角度词
function magicGenerate(viewWord) {
    document.getElementById('magic-view-menu')?.classList.add('hidden');
    generateImageFromChat(viewWord || '', 2);
}

// 双角色菜单：自动拼接当前角色A/B名字，再生成
function magicDualGenerate(type) {
    document.getElementById('magic-dual-menu')?.classList.add('hidden');
    // 读取当前选中的两个角色名
    const roleAId = document.getElementById('dual-role-a')?.value;
    const roleBId = document.getElementById('dual-role-b')?.value;
    const roleA = roleAId ? getRoleList().find(r => r.id == roleAId) : null;
    const roleB = roleBId ? getRoleList().find(r => r.id == roleBId) : null;
    const nameA = roleA?.name || '角色A';
    const nameB = roleB?.name || '角色B';

    let prompt = '';
    switch (type) {
        case 'aBack':
            prompt = `${nameA}背对镜头，${nameB}看着她`;
            break;
        case 'bBack':
            prompt = `${nameB}背对镜头，${nameA}看着她`;
            break;
        case 'bothBack':
            prompt = `${nameA}和${nameB}都背对镜头`;
            break;
        case 'fullbody':
            prompt = `${nameA}和${nameB}全身照`;
            break;
        case 'hug':
            prompt = `${nameA}和${nameB}拥抱在一起`;
            break;
        case 'normal':
        default:
            prompt = `${nameA}和${nameB}在一起`;
            break;
    }
    generateImageFromChat(prompt, 2);
}

// 点击页面其他地方时自动收起两个菜单
document.addEventListener('click', function () {
    document.getElementById('magic-view-menu')?.classList.add('hidden');
    document.getElementById('magic-dual-menu')?.classList.add('hidden');
});

// ============ 魔法棒：聊天变动漫（手动触发，4格动漫分镜） ============
let isGeneratingAnime = false;


// 把图片 + 对话合成一张"漫画格"（对话气泡烙在图片上）
function composeComicPanel(imageUrl, lines, panelWidth) {
    return new Promise((resolve) => {
        if (!panelWidth || panelWidth < 100) panelWidth = 320; // 容器宽度异常时用默认
        const img = new Image();
        img.onload = () => {
            try {
                const scale = 2; // 2x 输出，手机上清晰
                const W = panelWidth * scale;
                const imgH = Math.round(W * (img.height / img.width));
                let rowCount = 0;
                lines.forEach(l => { rowCount += Math.max(1, Math.ceil((l.text || '').slice(0, 30).length / 13)); });
                const bubbleH = Math.max(64, rowCount * 24 + 28) * scale;
                const H = Math.round(imgH + bubbleH);
                const canvas = document.createElement('canvas');
                canvas.width = W; canvas.height = H;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, W, imgH);
                // 底部漫画对话框白底
                ctx.fillStyle = 'rgba(255,255,255,0.96)';
                ctx.fillRect(0, imgH, W, bubbleH);
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2 * scale;
                ctx.strokeRect(scale, imgH + scale, W - 2 * scale, bubbleH - 2 * scale);
                ctx.font = '600 ' + (15 * scale) + 'px sans-serif';
                ctx.textBaseline = 'middle';
                let y = imgH + 14 * scale;
                lines.forEach(l => {
                    const speaker = (l.speaker || '') + '：';
                    const isUser = l.speaker === '用户' || l.speaker === '我' || l.speaker === 'user' || l.speaker === 'User';
                    ctx.fillStyle = isUser ? '#1a73e8' : '#d93025';
                    ctx.fillText(speaker, 16 * scale, y + 8 * scale);
                    ctx.font = '400 ' + (15 * scale) + 'px sans-serif';
                    ctx.fillStyle = '#111';
                    ctx.fillText((l.text || '').slice(0, 30), 16 * scale + ctx.measureText(speaker).width, y + 8 * scale);
                    y += 24 * scale;
                    ctx.font = '600 ' + (15 * scale) + 'px sans-serif';
                });
                resolve(canvas.toDataURL('image/png'));
            } catch (err) { console.error('[动漫] 合成失败:', err); resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = imageUrl;
    });
}

async function magicAnimeGenerate() {
    if (isGeneratingAnime) {
        alert('正在生成动漫分镜中，请稍候...');
        return;
    }
    document.getElementById('magic-view-menu')?.classList.add('hidden');
    document.getElementById('magic-dual-menu')?.classList.add('hidden');
    const isDualMode = localStorage.getItem('DUAL_ROLE_MODE') === '1';
    const recent = chatHistory.slice(-12);
    if (recent.length < 2) {
        alert('至少需要一轮对话才能生成动漫分镜');
        return;
    }
    isGeneratingAnime = true;

    const container = document.getElementById('chat-messages');
    const role = getCurrentRole();
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat chat-start relative gap-2';
    loadingDiv.appendChild(createChatAvatar(role ? role.name : 'AI', false));
    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'chat-bubble bg-base-200 text-base-content';
    loadingBubble.innerHTML = '<div class="flex items-center gap-2"><span class="loading loading-spinner loading-xs"></span><span class="text-xs">正在把这段聊天变成6格漫画（每格约1分钟）...</span></div>';
    loadingDiv.appendChild(loadingBubble);
    container.appendChild(loadingDiv);
    smartScroll(container);

    try {
        const roleAId = document.getElementById('dual-role-a')?.value;
        const roleBId = document.getElementById('dual-role-b')?.value;
        const roleA = roleAId ? getRoleList().find(r => r.id == roleAId) : null;
        const roleB = roleBId ? getRoleList().find(r => r.id == roleBId) : null;
        const cur = getCurrentRole();

        // 1. DeepSeek 把最近12条聊天拆成4格漫画JSON（每格：场景/动作/镜头 + 该格对话lines）
        const chatText = recent.map(m => {
            if (m.role === 'user') return `【用户】${m.content}`;
            return m.content;
        }).join('\n');
        loadingBubble.querySelector('span.text-xs').textContent = '漫画编剧整理剧情中...';

        let frames = null;
        try {
            const storyPrompt = `你是漫画分镜编剧。把下面的聊天记录改写成6格漫画。
要求：
- 每格画面必须且只能出现两个角色：说话者做主要动作，另一位在旁边自然反应（聆听/注视/微笑）；严禁出现第三个或更多人物，背景不允许有任何路人
- lines 是这一格内的对话，1-3条，按说话顺序，谁说话谁开口
- scene/action/camera 用英文视觉描述（动漫风格）
- text 用中文原话节选，最多20字
只输出JSON数组，不要任何解释、不要代码块标记，严格格式：
[{"scene":"英文场景","action":"英文动作","camera":"英文景别","lines":[{"speaker":"角色名","text":"中文台词"},{"speaker":"角色名","text":"中文台词"}]}]
聊天记录：
${chatText}`;
            const llmUrl = localStorage.getItem('LLM_URL') || 'https://api.deepseek.com';
            const llmKey = localStorage.getItem('LLM_KEY') || '';
            const resp = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${llmKey}` },
                body: JSON.stringify({
                    baseUrl: llmUrl,
                    model: localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash',
                    messages: [
                        { role: 'system', content: '你是漫画分镜编剧，严格只输出JSON数组。' },
                        { role: 'user', content: storyPrompt }
                    ],
                    temperature: 0.7,
                    top_p: 0.9,
                    stream: false,
                    thinking: { type: 'disabled' }
                })
            });
            const j = await resp.json();
            const raw = (j.choices?.[0]?.message?.content) || '';
            const cleaned = raw.replace(/```json|```/g, '').trim();
            const start = cleaned.indexOf('[');
            const end = cleaned.lastIndexOf(']');
            if (start >= 0 && end > start) {
                frames = JSON.parse(cleaned.slice(start, end + 1));
            }
        } catch (e) {
            console.warn('[动漫] 分镜解析失败，降级均分:', e);
        }

        // 降级：解析失败按聊天均分4段
        if (!frames || !Array.isArray(frames) || frames.length === 0) {
            frames = [];
            const chunk = Math.ceil(recent.length / 6);
            for (let i = 0; i < 6; i++) {
                const seg = recent.slice(i * chunk, (i + 1) * chunk);
                if (!seg.length) break;
                const lines = seg.map(m => {
                    if (m.role === 'user') return { speaker: '用户', text: m.content.replace(/^\[[^\]]+\]\s*/, '').slice(0, 20) };
                    const nm = m.content.match(/^\[([^\]]+)\]/)?.[1] || (cur?.name || 'AI');
                    return { speaker: nm, text: m.content.replace(/^\[[^\]]+\]\s*/, '').slice(0, 20) };
                });
                frames.push({ scene: 'colorful anime background, cozy room', action: 'talking naturally, looking at each other', camera: 'medium shot', lines });
            }
        }
        frames = frames.slice(0, 6);

        // 2. 插入漫画卡片容器
        const animeCard = document.createElement('div');
        animeCard.className = 'chat chat-start relative gap-2';
        animeCard.appendChild(createChatAvatar('漫画', false));
        const cardBubble = document.createElement('div');
        cardBubble.className = 'chat-bubble bg-base-200 text-base-content p-2 max-w-[92%]';
        cardBubble.innerHTML = '<div class="text-xs font-bold mb-2"><i class="fa-solid fa-book-open"></i> 聊天变动漫（6格漫画）</div><div id="anime-frames-wrap"></div>';
        animeCard.appendChild(cardBubble);
        container.appendChild(animeCard);
        smartScroll(container);
        const wrap = cardBubble.querySelector('#anime-frames-wrap');
        const panelW = Math.min(container.clientWidth * 0.88, 420);

        // 3. 逐格生成"双人同框图"，再合成漫画对话框
        const q = getImageQuality();
        // 用户形象（单人/双人共用：用户说话人永远是"用户"）
        const userAvatar = localStorage.getItem('AVATAR_USER') || null;
        const userAppearance = (localStorage.getItem('USER_APPEARANCE') || '').trim();
        const userIdentity = userAppearance
            ? `the user, ${userAppearance}`
            : 'the user wearing a plain white t-shirt, dark blue jeans and white sneakers, natural pose';
        // 画风跟随 AI生图页的设置（写实/动漫/日系），不再固定动漫
        const animeStylePrefix = getFixedStyleByMode() + ', no text, no watermark, no speech bubble';
        // 背景固定：首格生成后作为后续格的背景/画风参考
        let firstFrameRef = null;
        const blobToDataURL = (blob) => new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.onerror = reject;
            fr.readAsDataURL(blob);
        });
        for (let i = 0; i < frames.length; i++) {
            const f = frames[i];
            const lines = (f.lines && f.lines.length ? f.lines : [{ speaker: '用户', text: '……' }]);
            loadingBubble.querySelector('span.text-xs').textContent = `漫画格生成中 ${i + 1}/${frames.length}（每格约1分钟）...`;

            let identity = '';
            let refImgs = [];
            if (isDualMode && roleA && roleB) {
                // 双角色：A/B 同框
                const appA = extractAppearanceFromRoleCard(roleA.desc) || roleA.desc;
                const appB = extractAppearanceFromRoleCard(roleB.desc) || roleB.desc;
                const gA = getRoleGender(roleA.desc);
                const gB = getRoleGender(roleB.desc);
                let duoTag;
                if (gA === 'female' && gB === 'female') duoTag = '2girls';
                else if (gA === 'male' && gB === 'male') duoTag = '2boys';
                else duoTag = '1girl 1boy';
                identity = `${roleA.name}: ${appA}, ${roleB.name}: ${appB}, ${duoTag}, exactly 2 people, both characters in frame, one talking and the other listening`;
                const avA = roleA.avatar || localStorage.getItem('AVATAR_' + roleA.name);
                const avB = roleB.avatar || localStorage.getItem('AVATAR_' + roleB.name);
                if (avA) refImgs.push(avA);
                if (avB) refImgs.push(avB);
            } else {
                // 单角色：用户 + 角色 同框
                const app = cur ? (extractAppearanceFromRoleCard(cur.desc) || cur.desc) : 'a cute anime girl';
                const tag = cur ? (getRoleGender(cur.desc) === 'female' ? '1girl' : (getRoleGender(cur.desc) === 'male' ? '1boy' : 'one character')) : '1girl';
                identity = `character 1 is the user (${userIdentity}), character 2 is ${cur ? cur.name + ': ' + app : app}, ${tag} plus the user, exactly 2 people in total: the user and ${cur ? cur.name : 'the character'}, one talking and the other listening`;
                if (userAvatar) refImgs.push(userAvatar);
                if (cur) {
                    const avC = cur.avatar || localStorage.getItem('AVATAR_' + cur.name);
                    if (avC) refImgs.push(avC);
                }
            }

            const HARD_2P = 'exactly 2 people and only 2 people in the entire image, absolutely no third person, no extra characters, no strangers, no bystanders, no background figures, no duplicate character, no additional figure anywhere in the frame, background must be empty of people, no crowd, no text, no watermark, no speech bubble';
            let framePrompt;
            if (i === 0 || !firstFrameRef) {
                // 首格（或首格失败时）：正常生成
                framePrompt = `exactly 2 people, only 2 people in the image, ${animeStylePrefix}, ${identity}, ${f.action || 'talking naturally'}, ${f.scene || 'colorful anime background'}, ${f.camera || 'medium shot'}, ${HARD_2P}, the clothing and outfits of both characters are fixed and identical in every panel, clothes never change`;
            } else {
                // 后续格：背景/画风与第一格完全一致，只改人物动作表情
                framePrompt = `keep the exact same background, same scene, same location and same environment as the reference image, identical setting, identical art style and visual style, keep the same clothing and same outfits as the reference image, identical clothes, do not change the background, do not change the characters' clothing, only change the characters' poses and expressions, ${animeStylePrefix}, ${identity}, ${f.action || 'talking naturally'}, ${f.camera || 'medium shot'}, ${HARD_2P}, the clothing and outfits of both characters are fixed and identical in every panel, clothes never change`;
            }
            try {
                const refForGen = (i === 0 || !firstFrameRef) ? (refImgs.length ? refImgs : null) : [firstFrameRef];
                const res = await generateImageWithSafety(framePrompt, 'agnes-2.1', null, framePrompt, refForGen, '1:1', q);
                if (i === 0 && !firstFrameRef) {
                    firstFrameRef = await blobToDataURL(res.blob);
                }
                const url = URL.createObjectURL(res.blob);
                // 合成漫画对话框
                const comicUrl = await composeComicPanel(url, lines, panelW);
                const frameDiv = document.createElement('div');
                frameDiv.className = 'mb-2';
                // 合成失败时把原图转 base64 兜底（不用会被 revoke 的 blob URL，避免问号图）
                const src = comicUrl || (await blobToDataURL(res.blob));
                frameDiv.innerHTML = `<img src="${src}" alt="漫画格${i + 1}" class="rounded-lg w-full cursor-pointer" onclick="openImageLightbox(this.src)" />`;
                wrap.appendChild(frameDiv);
                URL.revokeObjectURL(url);
            } catch (err) {
                const errDiv = document.createElement('div');
                errDiv.className = 'text-xs text-error mb-2';
                errDiv.textContent = `第${i + 1}格生成失败: ${(err.message || err).substring(0, 100)}`;
                wrap.appendChild(errDiv);
            }
        }
        loadingDiv.remove();
    } catch (error) {
        console.error('漫画分镜失败:', error);
        if (loadingDiv && loadingDiv.parentNode) loadingDiv.remove();
        alert('漫画分镜生成失败: ' + (error.message || error));
    } finally {
        isGeneratingAnime = false;
    }
}

async function generateImageFromChat(userInput = '', messageCount = 2, silentOpts = null) {
    // silentOpts: { silent:true, contextAppend:'...', forceSingle:true, imageModel:'agnes-2.1' } —— 朋友圈等复用入口，不走聊天UI，直接返回{blob,prompt}
    const silent = !!(silentOpts && silentOpts.silent);
    // 防重复：正在生成时静默返回，不弹alert打扰用户（silent模式不占用聊天锁，由调用方自行防重）
    if (isGeneratingChatImage && !silent) {
        return;
    }
    // 上下文条数：单人2条（1轮对话），双角色4条；魔法棒和普通生图统一
    let isDualMode = localStorage.getItem('DUAL_ROLE_MODE') === '1';
    if (silentOpts && silentOpts.forceSingle) isDualMode = false; // 朋友圈固定单人
    const effectiveCount = messageCount > 2 ? messageCount : (isDualMode ? 4 : 2);
    // 取最近N条消息
    const recentMessages = chatHistory.slice(-effectiveCount);
    if (recentMessages.length < 2) {
        if (silent) return null; // silent模式不弹窗，返回null由调用方提示
        alert('至少需要一轮对话才能生成图片');
        return;
    }
    if (!silent) isGeneratingChatImage = true;

    // 在聊天区显示加载气泡（silent模式不插入DOM，仅保留变量供状态更新）
    const container = document.getElementById('chat-messages');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat chat-start relative gap-2';
    const role = getCurrentRole();
    loadingDiv.appendChild(createChatAvatar(role ? role.name : 'AI', false));
    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'chat-bubble bg-base-200 text-base-content';
    loadingBubble.innerHTML = '<div class="flex items-center gap-2"><span class="loading loading-spinner loading-xs"></span><span class="text-xs">正在根据对话生成图片...</span></div>';
    loadingDiv.appendChild(loadingBubble);
    if (!silent) {
        container.appendChild(loadingDiv);
        smartScroll(container);
    }

    try {
        // 获取角色卡信息，用于保持人物外貌一致
        let roleInfo = '';
        const isDualMode = localStorage.getItem('DUAL_ROLE_MODE') === '1';
        // 直接从下拉框读取角色ID，不依赖全局变量，确保能拿到
        const roleAId = document.getElementById('dual-role-a')?.value;
        const roleBId = document.getElementById('dual-role-b')?.value;
        const roleA = roleAId ? getRoleList().find(r => r.id == roleAId) : null;
        const roleB = roleBId ? getRoleList().find(r => r.id == roleBId) : null;

        if (isDualMode && roleA && roleB) {
            // 双角色模式：把两个角色的外貌信息都传进去
            roleInfo = `角色A：${roleA.name}\n角色A设定（包含外貌特征）：${roleA.desc}\n\n角色B：${roleB.name}\n角色B设定（包含外貌特征）：${roleB.desc}\n\n`;
        } else {
            // 单人模式：当前角色卡
            const currentRole = getCurrentRole();
            roleInfo = currentRole ? `角色名：${currentRole.name}\n角色设定（包含外貌特征）：${currentRole.desc}\n\n` : '';
        }

        // 把最近两轮对话整理成文本，前面加上角色外貌信息
        let conversationText;
        if (isDualMode) {
            // 双角色：AI消息本身已包含[角色名]前缀，直接用，不要加空冒号
            conversationText = roleInfo + recentMessages.map(m =>
                m.role === 'user' ? `我: ${m.content}` : m.content
            ).join('\n');
        } else {
            // 单人：加上当前角色名
            const currentRole = getCurrentRole();
            conversationText = roleInfo + recentMessages.map(m =>
                `${m.role === 'user' ? '我' : currentRole?.name || 'AI'}: ${m.content}`
            ).join('\n');
        }
        // 把用户的拍摄要求也加进去，让角色AI自己理解（全身/特写/侧脸/微笑等）
        if (userInput) {
            conversationText += `\n\n【用户拍摄要求】${userInput}\n请根据以上拍摄要求生成画面，包含景别、角度、表情、动作等细节。`;
        }
        // silent模式附加上下文（朋友圈：把场景描述拼进去，与userInput同效但不需要视角/景别解析）
        if (silentOpts && silentOpts.contextAppend) {
            conversationText += '\n\n' + silentOpts.contextAppend;
        }

        // 角色头像参考：单人取当前角色头像，双角色取A/B头像（base64 data URI），有头像才传
        const getRoleAvatar = (r) => { if (!r) return null; return r.avatar || localStorage.getItem('AVATAR_' + r.name) || null; };
        let refImages = null;
        if (isDualMode && roleA && roleB) {
            refImages = [getRoleAvatar(roleA), getRoleAvatar(roleB)].filter(Boolean);
        } else {
            const cur = getCurrentRole();
            const av = cur ? getRoleAvatar(cur) : null;
            if (av) refImages = [av];
        }
        // 只参考面部：把头像裁剪成脸部特写再传给生图模型
        if (refImages && refImages.length) {
            refImages = (await Promise.all(refImages.map(r => cropAvatarToFace(r)))).filter(Boolean);
        }
        if (refImages && refImages.length) {
            console.log('[头像参考] 已带入角色头像参考图(脸部特写):', refImages.length, '张');
        }
        // 设置开关：聊天生图是否参考角色头像（默认开；关闭后纯文字生成，与AI生图页一致）
        if (refImages && localStorage.getItem('IMG_REF_AVATAR') === '0') {
            console.log('[头像参考] 已按设置关闭头像参考');
            refImages = null;
        }

        // 第一步：预取身份块/性别/视角，再用角色AI生成提示词
        loadingBubble.innerHTML = '<div class="flex items-center gap-2"><span class="loading loading-spinner loading-xs"></span><span class="text-xs">角色AI正在整理画面描述...</span></div>';

        // C. 镜头视角硬约束（正/侧/背），替代旧的单纯"背"字检测
        const cameraView = getCameraViewConstraint(userInput);
        const isBackView = cameraView?.type === 'rear';
        // P1-H1：双角色分工（A背对、B看着A）提前判定，传给 generatePromptWithRoleAI 避免全局禁脸
        const isSplitRear = isDualSplitRear(userInput, isDualMode);

        let rolePrompt;

        // 中文直接生成模式：跳过DeepSeek翻译和身份块，直接用中文构造提示词（最快）
        if (getPromptLang() === 'zh') {
            loadingBubble.innerHTML = '<div class="flex items-center gap-2"><span class="loading loading-spinner loading-xs"></span><span class="text-xs">正在提炼画面动作...</span></div>';
            // 中文直生成：也先提炼动作/画面描述，不直接把聊天记录原文发给生图模型
            const actionDesc = await extractActionSummaryZH(conversationText, userInput, isDualMode);
            if (actionDesc) console.log('[中文提炼] 画面描述:', actionDesc.slice(0, 100));
            const stylePrefix = getFixedStyleByMode();
            if (isDualMode && roleA && roleB) {
                const appA = extractAppearanceFromRoleCard(roleA.desc) || roleA.desc;
                const appB = extractAppearanceFromRoleCard(roleB.desc) || roleB.desc;
                const chatText = recentMessages.map(m => m.role === 'user' ? `我: ${m.content}` : m.content).join('；');
                // 按A/B角色卡性别确定人数标签，不再固定2girls（一男一女会被画成两个女孩）
                const ga = getRoleGender(roleA.desc), gb = getRoleGender(roleB.desc);
                let dualTag = 'two characters';
                if (ga && gb) {
                    if (ga === 'female' && gb === 'female') dualTag = '2girls';
                    else if (ga === 'male' && gb === 'male') dualTag = '2boys';
                    else dualTag = '1girl, 1boy';
                }
                rolePrompt = `${stylePrefix}, ${roleA.name}（${appA}）和${roleB.name}（${appB}），画面中有两个人，${dualTag}, exactly 2 people, only two characters, ${actionDesc || chatText}`;
            } else {
                const cur = getCurrentRole();
                const app = cur ? (extractAppearanceFromRoleCard(cur.desc) || cur.desc) : '';
                const chatText = recentMessages.map(m => `${m.role === 'user' ? '我' : cur?.name || 'AI'}: ${m.content}`).join('；');
                // 按角色卡性别确定人数标签，不再固定1girl（男角色会画成女孩）
                const curGender = cur ? getRoleGender(cur.desc) : '';
                const soloTag = curGender === 'female' ? '1girl' : (curGender === 'male' ? '1boy' : 'single character');
                rolePrompt = cur ? `${stylePrefix}, ${cur.name}，${app}，画面中只有一个人，solo, ${soloTag}, only one person, no other people, single character, ${actionDesc || chatText}` : `${stylePrefix}, ${actionDesc || chatText}`;
            }
            if (userInput) rolePrompt += `，${userInput}`;
        } else {
            // 英文优化模式：先取身份块（带缓存），再用角色AI把中文聊天翻译成英文生图提示词
            loadingBubble.innerHTML = '<div class="flex items-center gap-2"><span class="loading loading-spinner loading-xs"></span><span class="text-xs">角色AI正在整理画面描述...</span></div>';
            // A. 固定身份块（带缓存，同一角色只翻译一次） + B. 确定性性别（不让AI猜）
            let identityOpts = {}, genders = {};
            if (isDualMode && roleA && roleB) {
                const [blockA, blockB] = await Promise.all([ensureIdentityBlock(roleA), ensureIdentityBlock(roleB)]);
                identityOpts = { A: blockA, B: blockB };
                genders = { A: getRoleGender(roleA.desc), B: getRoleGender(roleB.desc) };
            } else {
                const cur = getCurrentRole();
                identityOpts = { single: await ensureIdentityBlock(cur) };
                genders = { single: cur ? getRoleGender(cur.desc) : '' };
            }
            rolePrompt = await generatePromptWithRoleAI(conversationText, isDualMode, { roleA, roleB }, isBackView, { identity: identityOpts, genders, cameraView, splitRear: isSplitRear });
        }

        // ===== 服装硬锁：从角色卡抠出服装描述，强制钉在画面描述最前；剧情明确换/脱衣服时豁免 =====
        if (!isDualMode) {
            const curForClothing = getCurrentRole();
            const clothing = extractClothingFromRoleCard(curForClothing ? curForClothing.desc : '');
            const changing = isChangingClothingScene((userInput || '') + ' ' + (conversationText || ''));
            if (clothing && !changing) {
                rolePrompt = `wearing exact outfit from character description (must not change): ${clothing}, ` + rolePrompt;
                console.log('[服装硬锁] 已钉入:', clothing.slice(0, 80));
            }
        }

        // ===== C 程序级二次清洗兜底：背面模式下，LLM即使没听话，也在最终prompt里洗掉正面/侧面冲突词 =====
        // 双角色分工场景（A背对镜头，B看着A）不做全局清洗，避免把B的朝向也洗成背面
        // 中文直接生成模式跳过清洗（清洗是针对英文关键词的）
        if (cameraView && cameraView.type === 'rear' && !isSplitRear && getPromptLang() !== 'zh') {
            const beforeClean = rolePrompt;
            rolePrompt = cleanRearViewPrompt(rolePrompt);
            console.log('[视角兜底] 背面模式二次清洗, 清洗前:', beforeClean.length, '清洗后:', rolePrompt.length);
        }

        // ===== 纯视角请求跳过LLM二次翻译（视角已由代码确定）；分工场景也跳过，避免AI加戏；中文模式也跳过（直接用中文）=====
        let strictKeywords = '';
        if (isSplitRear || (cameraView && isPureViewRequest(userInput)) || getPromptLang() === 'zh') {
            // 视角已代码确定，或中文模式，不调用translateUserActionToEnglish
        } else {
            strictKeywords = await translateUserActionToEnglish(userInput);
        }

        // 默认全身照：用户没明确指定景别（全身/半身/特写/近景/远景/大头）时默认 full body（视角词如背面/侧面不算景别）
        const hasShotType = /全身|半身|特写|近景|远景|大头/.test(userInput || '');
        let finalKeywords = '';
        if (cameraView) {
            if (isSplitRear) {
                // 双角色分工：只强调"指定角色背对、另一个正常可见"，不强加全局背面约束
                finalKeywords = 'only the character instructed to face away is seen from directly behind (facing completely away from camera), the other character faces naturally and remains fully visible, do not force both characters to face away';
            } else {
                finalKeywords += cameraView.tags; // 代码确定性视角，最优先
            }
        }
        if (strictKeywords) finalKeywords += (finalKeywords ? ', ' : '') + strictKeywords;
        // 全身照防裁切：用户明确要全身或没指定景别（默认全身）时，强制广角+上下留白，避免头脚被切
        const wantFullBody = /全身/.test(userInput || '');
        if (!hasShotType) {
            finalKeywords += (finalKeywords ? ', ' : '') + 'wide angle shot, distant full body framing, full character entirely in frame, plenty of empty space above head, visible floor beneath feet, shoes and feet clearly visible, standing on ground, entire body visible from head to toe, no cropped limbs';
        } else if (wantFullBody) {
            finalKeywords += (finalKeywords ? ', ' : '') + 'wide angle shot, full character entirely in frame, empty space above head, visible floor beneath feet, shoes and feet clearly visible, standing on ground, no cropped head, no cropped feet';
        }
        // 人物数量硬锁：单人强制只有1人，双角色强制2人，前后各加一次强化
        if (isDualMode) {
            finalKeywords += (finalKeywords ? ', ' : '') + 'exactly 2 people, only two characters, no third person, no extra people';
        } else {
            finalKeywords += (finalKeywords ? ', ' : '') + 'only one person in the entire image, absolutely no other people, no duplicates, no clones, no second person';
        }
        if (finalKeywords) {
            // 重构：只在末尾加一次硬约束，不再前后夹击（避免注意力稀释）
            rolePrompt = rolePrompt + ', ' + finalKeywords;
            console.log('[严格执行] 已追加视角/拍摄要求:', finalKeywords);
        }

        // 头像参考降级约束：参考图只看脸，画面完全按文字描述（避免参考图带节奏）
        if (refImages && refImages.length) {
            const refConstraint = 'ABSOLUTE RULE: The reference image may ONLY be used for the character face and facial features. It is FORBIDDEN to influence pose, body, clothing, hairstyle, background, scene, composition, lighting, colors, camera angle or framing. COMPLETELY IGNORE everything in the reference image except the face. All pose, body, clothing, background, scene, lighting and composition MUST be created entirely from the text description.';
            rolePrompt = rolePrompt + ', ' + refConstraint;
        }

        // 生图前确认提示词（可检查修改；取消则中止本次生成）——silent模式跳过确认
        if (!silent && localStorage.getItem('IMG_CONFIRM_PROMPT') !== '0') {
            const conf = await awaitPromptConfirm(rolePrompt);
            if (!conf.confirmed) {
                if (loadingDiv && loadingDiv.parentNode) loadingDiv.remove();
                isGeneratingChatImage = false;
                return;
            }
            rolePrompt = (conf.text || '').trim() || rolePrompt;
        }

        // 第二步：用角色AI生成的提示词直接生图（跳过独立的提示词优化）
        // silentOpts.imageModel：朋友圈等入口可强制指定模型（如GPT Image模式下自动发朋友圈仍用Agnes省钱）
        const effModel = (silentOpts && silentOpts.imageModel) || getImageModel();
        const result = await generateImageWithSafety(conversationText, effModel, (msg) => {
            if (!silent) loadingBubble.innerHTML = `<div class="flex items-center gap-2"><span class="loading loading-spinner loading-xs"></span><span class="text-xs">${msg}</span></div>`;
        }, rolePrompt, refImages, '1:1', getImageQuality());

        // silent模式：不做任何聊天UI，直接把结果返回给调用方（朋友圈复用同一链路）
        if (silent) {
            if (loadingDiv && loadingDiv.parentNode) loadingDiv.remove();
            return { blob: result.blob, prompt: result.prompt };
        }

        // 3. 把图片插入聊天记录
        loadingDiv.remove();
        const imageUrl = URL.createObjectURL(result.blob);
        trackChatBlobUrl(imageUrl);
        // 保存优化后的提示词，重新生成时直接用，不再优化
        const savedPrompt = result.prompt;
        const savedRatio = '1:1';   // 聊天生图当前固定1:1，存起来供重新生成保持一致
        // 存入IndexedDB（dataURL格式，Safari对Blob存储有坑），刷新后不丢失
        const imgTs = Date.now();
        await saveChatImage(result.blob, savedPrompt, imgTs, savedRatio);
        // 图片也进聊天记录（带ts标记），重进/切换角色时按原位置穿插渲染，不再堆在末尾
        chatHistory.push({ role: 'assistant', content: '', type: 'image', ts: imgTs });
        saveChatHistory();

        const imageDiv = document.createElement('div');
        imageDiv.className = 'chat chat-start relative gap-2';
        imageDiv.appendChild(createChatAvatar(role ? role.name : 'AI', false));

        const imageBubble = document.createElement('div');
        imageBubble.className = 'chat-bubble bg-base-200 text-base-content p-1 max-w-[80%]';
        imageBubble.innerHTML = `
            <img src="${imageUrl}" alt="生成的图片" class="rounded-lg w-full cursor-pointer" onclick="openImageLightbox(this.src)" />
            <div class="flex gap-2 mt-2 px-1 pb-1">
                <button class="btn btn-primary btn-xs flex-1 regenerate-btn"><i class="fa-solid fa-rotate-right"></i> 重新生成</button>
                <a href="${imageUrl}" download="chat-generated.png" class="btn btn-ghost btn-xs flex-1"><i class="fa-solid fa-download"></i> 下载</a>
            </div>
        `;
        // 保存优化后的提示词，用于重新生成（直接用，不再优化）
        imageBubble.dataset.savedPrompt = savedPrompt;
        imageBubble.dataset.ratio = savedRatio;
        // 重新生成按钮事件：用保存的提示词直连生成，走和原图一致的快通道
        imageBubble.querySelector('.regenerate-btn').onclick = async function() {
            const btn = this;
            btn.disabled = true;
            btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> 生成中...';
            try {
                let finalSaved = savedPrompt;
                if (localStorage.getItem('IMG_CONFIRM_PROMPT') !== '0') {
                    const conf = await awaitPromptConfirm(savedPrompt);
                    if (!conf.confirmed) return;
                    finalSaved = (conf.text || '').trim() || savedPrompt;
                }
                const result = await generateImageWithSafety(finalSaved, getImageModel(), null, finalSaved, refImages, imageBubble.dataset.ratio || '1:1', getImageQuality());
                const newImageUrl = URL.createObjectURL(result.blob);
                trackChatBlobUrl(newImageUrl);
                imageBubble.querySelector('img').src = newImageUrl;
                imageBubble.querySelector('img').onclick = () => openImageLightbox(newImageUrl);
                imageBubble.querySelector('a[download]').href = newImageUrl;
            } catch (err) {
                alert('重新生成失败，图片未更新（仍是原图）: ' + (err.message || err));
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> 重新生成';
            }
        };
        imageDiv.appendChild(imageBubble);
        container.appendChild(imageDiv);
        smartScroll(container);
        isGeneratingChatImage = false;

    } catch (error) {
        console.error('对话生图失败:', error);
        // 确保loading气泡被清除
        if (loadingDiv && loadingDiv.parentNode) {
            loadingDiv.remove();
        }
        // silent模式：原样抛出，由调用方（朋友圈）展示错误
        if (silent) throw error;
        isGeneratingChatImage = false;
        const errMsg = error.message || '';
        if (errMsg.includes('NSFW') || errMsg.includes('8007')) {
            alert('生成失败：对话内容包含敏感元素，已被安全审核拦截。\n\n建议：聊一些日常、温馨的场景再试试。');
        } else if (errMsg.includes('Agnes')) {
            // Agnes错误：显示完整信息，方便诊断
            alert('Agnes 生图失败：\n\n' + errMsg + '\n\n建议：\n1. 检查 API Key 是否正确\n2. 确认 Key 是在 .cn 还是 .com 注册的\n3. 稍后再试或切换 Pollinations 模型');
        } else if (errMsg.includes('429')) {
            alert('生成失败：请求太频繁被限流了。\n\n建议：等10-20秒再试，或者切换其他生图模型。');
        } else {
            alert('生成失败: ' + errMsg + '\n\n可能原因：\n1. 生图免费额度已用完（每天重置）\n2. 网络问题，请重试\n3. 请求太频繁，稍后再试');
        }
    }
}

// ============================================
// 聊天生视频（Agnes Video V2.0，前端直连，异步任务+轮询）
// ============================================
let isGeneratingChatVideo = false;

// 前端直连 Agnes 视频：创建任务 -> 轮询 -> 返回 mp4 URL
// seconds: 视频秒数（2.5-flash支持4-12秒字符串；v2.0按24fps+8n+1规则换算帧数）
async function generateAgnesVideoDirect(prompt, onProgress, seconds = '8') {
    const agnesApiKey = getAgnesApiKey();
    if (!agnesApiKey) {
        throw new Error('未配置 Agnes API Key（视频和图片共用同一个 Key）');
    }
    // v2.0 帧数换算：秒数*24fps，再取最接近的 8n+1
    const secNum = parseInt(seconds) || 8;
    const v20Frames = Math.round(secNum * 24 / 8) * 8 + 1;
    const endpoints = [
        { base: 'https://apihub.agnes-ai.cn', name: '.cn' },
        { base: 'https://apihub.agnes-ai.com', name: '.com' }
    ];
    // 优先尝试新版 2.5-flash（更写实），不可用自动回退 v2.0
    const videoModels = ['agnes-video-2.5-flash', 'agnes-video-v2.0'];
    let lastError = null;

    for (const videoModel of videoModels) {
        let modelUnavailable = false; // 当前模型不支持时，换下一个模型
        for (const { base, name: epName } of endpoints) {
        try {
            // 1. 创建视频任务。2.5-flash 与 v2.0 参数体系不同：
            // 2.5-flash: mode/seconds/size/aspect_ratio（Flash固定720P，4-12秒）
            // v2.0: width/height/num_frames/frame_rate
            const isV25 = videoModel.includes('2.5');
            const reqBody = isV25 ? {
                model: videoModel,
                prompt: prompt,
                mode: 'text',
                seconds: String(seconds),
                size: '720P',
                aspect_ratio: '9:16'
            } : {
                model: videoModel,
                prompt: prompt,
                width: 448,
                height: 672,
                num_frames: v20Frames,
                frame_rate: 24
            };
            const createRes = await fetch(`${base}/v1/videos`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${agnesApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reqBody)
            });

            if (!createRes.ok) {
                let detail = '';
                try {
                    const d = await createRes.json();
                    detail = d.error?.message || d.message || JSON.stringify(d).substring(0, 200);
                } catch (e) {}
                lastError = new Error(`[Agnes视频 ${videoModel} ${epName}] HTTP ${createRes.status}: ${detail}`);
                if (createRes.status === 429) throw lastError; // 限流：所有模型共享，直接终止
                // 模型不存在/不支持：换下一个模型（不再试另一域名）
                if ((createRes.status === 400 || createRes.status === 404) && /model|not.*(exist|support|available)|unknown|invalid/i.test(detail)) {
                    console.warn('[Agnes视频] 模型不可用，尝试回退:', videoModel, detail);
                    modelUnavailable = true;
                    break;
                }
                continue;
            }

            const createData = await createRes.json();
            const videoId = createData.video_id || createData.task_id || createData.id;
            const taskId = createData.task_id || createData.id || videoId;
            if (!videoId) {
                lastError = new Error(`[Agnes视频 ${epName}] 创建任务成功但未返回 video_id`);
                continue;
            }
            console.log('[Agnes视频] 任务已创建，模型:', videoModel, '任务ID:', videoId, createData);

            // 从多种可能的响应结构里提取视频URL（兼容接口字段差异）
            const extractVideoUrl = (d) => {
                if (!d) return null;
                const candidates = [
                    d.metadata?.url,
                    d.metadata?.video_url,
                    d.url,
                    d.video_url,
                    d.output?.url,
                    d.output,
                    d.data?.url,
                    d.data?.[0]?.url,
                    d.result?.url,
                    d.videos?.[0]?.url
                ];
                for (const c of candidates) {
                    if (typeof c === 'string' && /^https?:\/\/.+\.(mp4|webm|mov)/i.test(c)) return c;
                }
                // 兜底：递归找第一个 .mp4 链接
                const stack = [d];
                while (stack.length) {
                    const cur = stack.pop();
                    if (!cur || typeof cur !== 'object') continue;
                    for (const v of Object.values(cur)) {
                        if (typeof v === 'string' && /^https?:\/\/.+\.(mp4|webm|mov)/i.test(v)) return v;
                        if (v && typeof v === 'object') stack.push(v);
                    }
                }
                return null;
            };

            // 2. 轮询任务结果（每2秒一次，最多等3分钟）
            const startTime = Date.now();
            const MAX_WAIT = 180000;
            let completedNoUrlCount = 0;
            while (Date.now() - startTime < MAX_WAIT) {
                await new Promise(r => setTimeout(r, 2000));
                let pollData = null;
                try {
                    const pollRes = await fetch(`${base}/agnesapi?video_id=${encodeURIComponent(videoId)}&model_name=${encodeURIComponent(videoModel)}`, {
                        headers: { 'Authorization': `Bearer ${agnesApiKey}` }
                    });
                    if (!pollRes.ok) continue; // 单次查询失败，下一轮继续
                    pollData = await pollRes.json();
                } catch (pollErr) {
                    continue; // 网络抖动，继续轮询
                }

                const status = pollData.status;
                const progress = typeof pollData.progress === 'number' ? pollData.progress : 0;
                if (onProgress) onProgress(status, progress);

                if (status === 'completed') {
                    let url = extractVideoUrl(pollData);
                    if (url) {
                        console.log('[Agnes视频] 生成成功，模型:', videoModel, url);
                        return url;
                    }
                    // completed 但元数据可能延迟，再试旧版接口
                    completedNoUrlCount++;
                    console.warn('[Agnes视频] completed但暂无URL，第' + completedNoUrlCount + '次重试，完整响应:', pollData);
                    if (completedNoUrlCount <= 3) {
                        try {
                            const legacyRes = await fetch(`${base}/v1/videos/${encodeURIComponent(taskId)}`, {
                                headers: { 'Authorization': `Bearer ${agnesApiKey}` }
                            });
                            if (legacyRes.ok) {
                                const legacyData = await legacyRes.json();
                                url = extractVideoUrl(legacyData);
                                if (url) {
                                    console.log('[Agnes视频] 旧版接口拿到URL:', url);
                                    return url;
                                }
                            }
                        } catch (legacyErr) {}
                        continue; // 再等几轮
                    }
                    lastError = new Error('视频任务已完成，但响应中没有视频 URL。响应结构: ' + JSON.stringify(pollData).substring(0, 300));
                    break;
                }
                if (status === 'failed') {
                    lastError = new Error('视频生成失败: ' + JSON.stringify(pollData.error || pollData).substring(0, 200));
                    break;
                }
                // queued / in_progress 继续轮询
            }
            if (modelUnavailable) break;
            if (lastError) continue;
            lastError = new Error('视频生成超时（等待超过3分钟）');
        } catch (err) {
            // 429 等硬错误直接向外抛
            if (err && /429/.test(err.message || '')) throw err;
            // CORS/网络错误，试另一个 endpoint
            lastError = new Error(`[Agnes视频 ${videoModel} ${epName}] ${err.message || err}`);
            continue;
        }
        } // end endpoints
        if (!modelUnavailable) break; // 当前模型走完了endpoint流程（无论成功失败），成功已return；失败则不必再换模型
    }
    throw lastError || new Error('Agnes 视频生成失败');
}

// 聊天里发"拍段视频"触发：复用聊天生图的角色卡/聊天记录提示词链路，最终走视频模型
async function generateVideoFromChat(userInput = '') {
    if (isGeneratingChatVideo || isGeneratingChatImage) return;

    const isDualMode = localStorage.getItem('DUAL_ROLE_MODE') === '1';
    const effectiveCount = 4; // 单人/双人统一取最近4条，动作上下文更连贯
    const recentMessages = chatHistory.slice(-effectiveCount);
    if (recentMessages.length < 2) {
        alert('至少需要一轮对话才能生成视频');
        return;
    }
    isGeneratingChatVideo = true;

    // 加载气泡
    const container = document.getElementById('chat-messages');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat chat-start relative gap-2';
    const role = getCurrentRole();
    loadingDiv.appendChild(createChatAvatar(role ? role.name : 'AI', false));
    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'chat-bubble bg-base-200 text-base-content';
    loadingBubble.innerHTML = '<div class="flex items-center gap-2"><span class="loading loading-spinner loading-xs"></span><span class="text-xs">正在根据对话生成视频...</span></div>';
    loadingDiv.appendChild(loadingBubble);
    container.appendChild(loadingDiv);
    smartScroll(container);

    try {
        const roleAId = document.getElementById('dual-role-a')?.value;
        const roleBId = document.getElementById('dual-role-b')?.value;
        const roleA = roleAId ? getRoleList().find(r => r.id == roleAId) : null;
        const roleB = roleBId ? getRoleList().find(r => r.id == roleBId) : null;

        let videoPrompt;

        if (getPromptLang() === 'zh') {
            // 中文模式：直接用中文构造（最快），和聊天生图保持同一套角色外貌/人数锁
            loadingBubble.innerHTML = '<div class="flex items-center gap-2"><span class="loading loading-spinner loading-xs"></span><span class="text-xs">正在用中文提示词生成视频...</span></div>';
            const stylePrefix = getFixedStyleByMode();
            if (isDualMode && roleA && roleB) {
                const appA = extractAppearanceFromRoleCard(roleA.desc) || roleA.desc;
                const appB = extractAppearanceFromRoleCard(roleB.desc) || roleB.desc;
                const chatText = recentMessages.map(m => m.role === 'user' ? `我: ${m.content}` : m.content).join('；');
                // 按A/B性别确定人数标签（与聊天生图保持一致）
                const ga = getRoleGender(roleA.desc), gb = getRoleGender(roleB.desc);
                let dualTag = 'two characters';
                if (ga && gb) {
                    if (ga === 'female' && gb === 'female') dualTag = '2girls';
                    else if (ga === 'male' && gb === 'male') dualTag = '2boys';
                    else dualTag = '1girl, 1boy';
                }
                videoPrompt = `${stylePrefix}, ${roleA.name}（${appA}）和${roleB.name}（${appB}），画面中有两个人，${dualTag}, exactly 2 people, only two characters, ${chatText}`;
            } else {
                const cur = getCurrentRole();
                const app = cur ? (extractAppearanceFromRoleCard(cur.desc) || cur.desc) : '';
                const chatText = recentMessages.map(m => `${m.role === 'user' ? '我' : cur?.name || 'AI'}: ${m.content}`).join('；');
                const curGender = cur ? getRoleGender(cur.desc) : '';
                const soloTag = curGender === 'female' ? '1girl' : (curGender === 'male' ? '1boy' : 'single character');
                videoPrompt = cur ? `${stylePrefix}, ${cur.name}，${app}，画面中只有一个人，solo, ${soloTag}, only one person, no other people, single character, ${chatText}` : `${stylePrefix}, ${chatText}`;
            }
            if (userInput) videoPrompt += `，${userInput}`;
            // 中文模式补视频连贯约束：只演最后一刻的单一动作，避免多动作堆叠导致逻辑混乱
            videoPrompt += '，单镜头连续拍摄不切换场景，只表现对话最后一刻的一个连贯自然动作，人物位置和背景物品保持稳定，动作符合物理常识，不要瞬移或变形';
        } else {
            // 英文模式：复用角色AI翻译链路
            loadingBubble.innerHTML = '<div class="flex items-center gap-2"><span class="loading loading-spinner loading-xs"></span><span class="text-xs">角色AI正在整理视频画面描述...</span></div>';
            let roleInfo = '';
            if (isDualMode && roleA && roleB) {
                roleInfo = `角色A：${roleA.name}\n角色A设定（包含外貌特征）：${roleA.desc}\n\n角色B：${roleB.name}\n角色B设定（包含外貌特征）：${roleB.desc}\n\n`;
            } else {
                const currentRole = getCurrentRole();
                roleInfo = currentRole ? `角色名：${currentRole.name}\n角色设定（包含外貌特征）：${currentRole.desc}\n\n` : '';
            }
            const conversationText = roleInfo + recentMessages.map(m =>
                m.role === 'user' ? `我: ${m.content}` : m.content
            ).join('\n') + (userInput ? `\n\n【用户拍摄要求】${userInput}` : '');

            let identityOpts = {}, genders = {};
            if (isDualMode && roleA && roleB) {
                const [blockA, blockB] = await Promise.all([ensureIdentityBlock(roleA), ensureIdentityBlock(roleB)]);
                identityOpts = { A: blockA, B: blockB };
                genders = { A: getRoleGender(roleA.desc), B: getRoleGender(roleB.desc) };
            } else {
                const cur = getCurrentRole();
                identityOpts = { single: await ensureIdentityBlock(cur) };
                genders = { single: cur ? getRoleGender(cur.desc) : '' };
            }
            videoPrompt = await generatePromptWithRoleAI(conversationText, isDualMode, { roleA, roleB }, false, { identity: identityOpts, genders, cameraView: null, splitRear: false });
        }

        // 视频专属：自然动态 + 逻辑连贯硬约束（避免多动作堆叠导致瞬移/错乱/肢体变形）
        // 按当前画风区分：写实模式强制真人实拍感，动漫模式才用 animation 词
        const isRealisticVideo = getImageStyle() === 'photorealistic';
        const styleMotion = isRealisticVideo
            ? 'photorealistic video, live action footage, real human, natural skin texture, realistic motion blur, cinematic handheld camera, 8k ultra realistic, no animation, no cartoon, no anime style'
            : 'high quality anime animation, smooth anime motion, consistent anime art style';
        // 逻辑连贯：只演最后一刻的单一连贯动作，单镜头无剪辑，人物/背景稳定不变形
        const coherenceTags = 'single continuous shot, no scene cuts, no jump cuts, focus on the final moment of the conversation, one smooth continuous physical action only, natural physically plausible movement, no teleporting, no morphing, no extra limbs, no duplicated body parts, no fused characters, stable consistent background, furniture and objects remain fixed in place, characters stay at their position, consistent identity and outfit throughout';
        const motionTags = isDualMode
            ? `, exactly 2 people, ${coherenceTags}, both characters keep consistent appearance and face, ${styleMotion}`
            : `, only one person, ${coherenceTags}, character keeps consistent face and outfit, ${styleMotion}`;
        videoPrompt += motionTags;

        // 智能时长：默认8秒（动作舒展不加速）；用户说长/慢→10秒，短/快→4秒；纯前端判断零延迟
        let videoSeconds = '8';
        const durText = userInput || '';
        const mLong = durText.match(/(\d{1,2})\s*秒/);
        if (mLong) {
            const n = Math.min(12, Math.max(4, parseInt(mLong[1]))); // 钳制在4-12秒
            videoSeconds = String(n);
        } else if (/长一点|久一点|慢一点|长视频|慢慢/.test(durText)) {
            videoSeconds = '10';
        } else if (/短一点|快一点|短视频/.test(durText)) {
            videoSeconds = '4';
        }

        // 调用 Agnes 视频（创建+轮询），实时更新状态
        const videoStartTs = Date.now();
        const videoUrl = await generateAgnesVideoDirect(videoPrompt, (status, progress) => {
            const waited = Math.floor((Date.now() - videoStartTs) / 1000);
            let statusText, bar;
            if (status === 'queued') {
                statusText = `排队中，已等待 ${waited}s...`;
                bar = '<progress class="progress progress-primary w-48 h-2"></progress>'; // 无value=循环动画
            } else if (status === 'in_progress') {
                statusText = `视频渲染中（${videoSeconds}秒），已等待 ${waited}s，进度数字可能暂时不动，请勿离开页面`;
                // 服务器进度是粗粒度(常见0/30/100)，有值就显示，否则循环动画
                bar = progress > 0
                    ? `<progress class="progress progress-primary w-48 h-2" value="${progress}" max="100"></progress>`
                    : '<progress class="progress progress-primary w-48 h-2"></progress>';
            } else {
                statusText = `处理中，已等待 ${waited}s...`;
                bar = '<progress class="progress progress-primary w-48 h-2"></progress>';
            }
            loadingBubble.innerHTML = `<div class="flex flex-col gap-1"><div class="flex items-center gap-2"><span class="loading loading-spinner loading-xs"></span><span class="text-xs">${statusText}</span></div>${bar}</div>`;
        }, videoSeconds);

        // 渲染视频气泡
        loadingDiv.remove();
        const videoDiv = document.createElement('div');
        videoDiv.className = 'chat chat-start relative gap-2';
        videoDiv.appendChild(createChatAvatar(role ? role.name : 'AI', false));
        const videoBubble = document.createElement('div');
        videoBubble.className = 'chat-bubble bg-base-200 text-base-content p-1 max-w-[80%]';
        videoBubble.innerHTML = `
            <video src="${videoUrl}" controls playsinline preload="metadata" class="rounded-lg w-full bg-black"></video>
            <div class="flex gap-2 mt-2 px-1 pb-1">
                <a href="${videoUrl}" target="_blank" rel="noopener" class="btn btn-ghost btn-xs flex-1"><i class="fa-solid fa-up-right-from-square"></i> 新窗口打开</a>
                <a href="${videoUrl}" download="chat-generated.mp4" class="btn btn-primary btn-xs flex-1"><i class="fa-solid fa-download"></i> 下载</a>
            </div>
        `;
        videoDiv.appendChild(videoBubble);
        container.appendChild(videoDiv);
        smartScroll(container);
    } catch (error) {
        console.error('对话生视频失败:', error);
        if (loadingDiv && loadingDiv.parentNode) loadingDiv.remove();
        const errMsg = error.message || '';
        if (errMsg.includes('429')) {
            alert('视频生成失败：请求太频繁被限流了。\n\n视频每分钟最多5次，请等1分钟再试。');
        } else if (errMsg.includes('401') || errMsg.includes('Agnes视频')) {
            alert('Agnes 视频生成失败：\n\n' + errMsg + '\n\n建议：检查 Agnes API Key 是否正确，或稍后再试。');
        } else {
            alert('视频生成失败: ' + errMsg);
        }
    } finally {
        isGeneratingChatVideo = false;
    }
}

// ============================================
// 朋友圈（仿微信，单角色）
// 图片存IndexedDB（大空间），localStorage只存文案/点赞等小数据（不再占5MB，永不报存储满）
// ============================================
const MOMENTS_DB = 'voiceforge-moments';
const MOMENTS_STORE = 'momentsImages';
let momentsBusy = false;

function openMomentsDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) { reject(new Error('浏览器不支持IndexedDB')); return; }
        const req = indexedDB.open(MOMENTS_DB, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(MOMENTS_STORE)) {
                const store = db.createObjectStore(MOMENTS_STORE, { keyPath: 'id' });
                store.createIndex('roleKey', 'roleKey');
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('打开朋友圈图片库失败'));
    });
}
async function momentsDbSave(id, dataURL, roleKey) {
    try {
        const db = await openMomentsDB();
        return new Promise((resolve) => {
            const tx = db.transaction(MOMENTS_STORE, 'readwrite');
            tx.objectStore(MOMENTS_STORE).put({ id, dataURL, roleKey, ts: Date.now() });
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    } catch (e) { console.warn('[MomentsDB] 保存失败:', e.message); return false; }
}
async function momentsDbGet(id) {
    try {
        const db = await openMomentsDB();
        return new Promise((resolve) => {
            const tx = db.transaction(MOMENTS_STORE, 'readonly');
            const req = tx.objectStore(MOMENTS_STORE).get(id);
            req.onsuccess = () => resolve(req.result ? req.result.dataURL : null);
            req.onerror = () => resolve(null);
        });
    } catch (e) { return null; }
}
async function momentsDbClear(roleKey) {
    try {
        const db = await openMomentsDB();
        return new Promise((resolve) => {
            const tx = db.transaction(MOMENTS_STORE, 'readwrite');
            const store = tx.objectStore(MOMENTS_STORE);
            if (roleKey && store.indexNames.contains('roleKey')) {
                const idx = store.index('roleKey');
                const req = idx.openCursor(IDBKeyRange.only(roleKey));
                req.onsuccess = () => {
                    const cur = req.result;
                    if (cur) { store.delete(cur.primaryKey); cur.continue(); }
                };
            } else {
                store.clear();
            }
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
    } catch (e) { /* ignore */ }
}
// 首次迁移：把旧的dataURL大图从localStorage搬到IndexedDB，localStorage只留'idx:'小标记
async function migrateMomentsToDB() {
    let list;
    try { list = loadMoments(); } catch (e) { return; }
    if (!list || !list.length) return;
    let changed = false;
    for (const m of list) {
        if (m.image && m.image.startsWith('data:')) {
            const ok = await momentsDbSave(m.id, m.image, momentsKey());
            if (ok) { m.image = 'idx:' + m.id; changed = true; }
        }
    }
    if (changed) {
        try { saveMoments(list); } catch (e) { /* 迁移失败不影响使用 */ }
    }
}
function momentsKey() {
    const role = getCurrentRole();
    return 'MOMENTS_' + (role ? role.id : 'default');
}
function momentsSigKey() {
    const role = getCurrentRole();
    return 'MOMENTS_SIG_' + (role ? role.id : 'default');
}
// 个性签名随机库：打开朋友圈时若还没有签名就随机生成一个挂上去；清空聊天记录才重置
const MOMENT_SIGNATURES = [
    '今天也要开心呀', '人间烟火气，最抚凡人心', '正在加载人生进度条…',
    '日子常新，未来不远', '且听风吟，静待花开', '做个俗人，贪财好色一身正气',
    '生活明朗，万物可爱', '慢慢来，比较快', '心之所向，素履以往',
    '好好生活，慢慢相遇', '别慌，月亮也正在大海某处迷茫', '保持热爱，奔赴山海',
    '万物皆有裂痕，那是光照进来的地方', '你若盛开，蝴蝶自来', '温柔半两，从容一生',
    '爱自己是终身浪漫的开始', '平淡日子里泛着光', '知足且坚定，温柔且上进',
    '与其互为人间，不如自成宇宙', '山有顶峰，湖有彼岸', '幸好思念无声',
    '余生还长，何必慌张', '无事绊心弦，所念皆如愿', '清醒知趣，保持热爱',
    '各自努力，顶峰相见', '月亮不会奔你而来，星星也不会，但我会', '我与我周旋久，宁作我'
];
function getRandomSignature() {
    const existed = localStorage.getItem(momentsSigKey());
    if (existed) return existed; // 已有签名就不换，保持真实（只有清空聊天记录才重置）
    const newSig = MOMENT_SIGNATURES[Math.floor(Math.random() * MOMENT_SIGNATURES.length)];
    try { localStorage.setItem(momentsSigKey(), newSig); } catch (e) { /* ignore */ }
    return newSig;
}
function loadMoments() {
    try { return JSON.parse(localStorage.getItem(momentsKey()) || '[]'); }
    catch (e) { return []; }
}
function saveMoments(list) {
    localStorage.setItem(momentsKey(), JSON.stringify(list.slice(-10))); // 只留最近10条
}
function getRoleAvatarSrc() {
    const role = getCurrentRole();
    if (role && role.avatar) return role.avatar;
    return localStorage.getItem('AVATAR_' + (role ? role.name : '')) || '';
}
function fmtMomentTime(ts) {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return '刚刚';
    if (min < 60) return min + '分钟前';
    const h = Math.floor(min / 60);
    if (h < 24) return h + '小时前';
    const d = new Date(ts);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
}
function updateMomentsEntryAvatar() {
    const el = document.getElementById('moments-entry-avatar');
    if (!el) return;
    const role = getCurrentRole();
    const src = getRoleAvatarSrc();
    if (src) {
        el.innerHTML = '<img src="' + src + '" style="width:100%;height:100%;object-fit:cover;">';
        el.style.background = '';
    } else {
        el.textContent = role && role.name ? role.name.charAt(0) : '?';
        el.style.background = getAvatarGradient(role ? role.name : '?');
    }
}
async function openMoments() {
    const role = getCurrentRole();
    if (!role) return;
    const src = getRoleAvatarSrc();
    document.getElementById('moments-big-avatar').src = src || '';
    document.getElementById('moments-nickname').textContent = role.name;
    const sigEl = document.getElementById('moments-signature');
    const sig = getRandomSignature(); // 随机生成挂上；已有则不换，清空聊天才重置
    sigEl.textContent = sig;
    // 背景图：有缓存直接显示；没有缓存后台生成（不阻塞打开，生成好自动换上）
    const coverImg = document.getElementById('moments-cover-img');
    if (coverImg) {
        const cachedCover = await momentsDbGet('cover_' + role.id);
        if (cachedCover) {
            coverImg.src = cachedCover;
            coverImg.style.display = 'block';
        } else {
            ensureMomentsCover();
        }
    }
    sigEl.onclick = () => {
        const s = prompt('个性签名：', localStorage.getItem(momentsSigKey()) || '');
        if (s !== null) {
            localStorage.setItem(momentsSigKey(), s.trim());
            sigEl.textContent = s.trim() || '这个人很懒，什么都没留下';
        }
    };
    document.getElementById('moments-overlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    // 打开时先迁移旧图（dataURL→IndexedDB），再渲染
    migrateMomentsToDB().then(() => renderMoments());
    // 不再打开即自动生成：避免自动+手动连点撞高档位RPM(3/4K仅1次/分钟)，统一由底部按钮手动触发
}
function closeMoments() {
    document.getElementById('moments-overlay').style.display = 'none';
    document.body.style.overflow = '';
}

// ============================================
// 朋友圈封面背景图：AI自动生成角色专属 + 点击手动换图
// 存在IndexedDB（id='cover_'+角色id），清空聊天时随朋友圈一起清掉，下次打开重新生成
// ============================================
// 后台生成角色专属封面（风景/氛围，不出现人物），生成好自动换上
async function ensureMomentsCover() {
    const role = getCurrentRole();
    if (!role) return;
    try {
        const llmUrl = localStorage.getItem('LLM_URL') || 'https://api.deepseek.com';
        const llmKey = localStorage.getItem('LLM_KEY') || '';
        if (!llmKey) return;
        const llmModel = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';
        // 1) 根据角色卡生成一句英文封面场景描述
        const messages = [
            { role: 'system', content: '你是朋友圈封面设计师。只输出一句英文场景描述，不要任何解释。' },
            { role: 'user', content: '角色「' + role.name + '」的角色设定：\n' + (role.desc || '') + '\n\n根据她的性格气质，用一句英文描述一张适合做微信朋友圈封面的横版照片：风景、光影、氛围感，色调与她的气质匹配。不要出现人物、文字、手机。只输出英文一句话。' }
        ];
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + llmKey },
            body: JSON.stringify({ baseUrl: llmUrl, model: llmModel, messages, temperature: 0.8, max_tokens: 120, stream: false })
        });
        if (!res.ok) throw new Error('LLM HTTP ' + res.status);
        const data = await res.json();
        const desc = ((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '').trim();
        const coverPrompt = desc || 'cinematic landscape, soft light, atmospheric mood';
        // 2) 生成横版16:9封面（preOptimizedPrompt直接传入，不再二次优化）
        const result = await generateImageWithSafety(coverPrompt, getImageModel(), null, coverPrompt, null, '16:9', '1K');
        if (!result || !result.blob) return;
        const dataURL = await blobToDataURLCompressed(result.blob, 1280);
        await momentsDbSave('cover_' + role.id, dataURL, momentsKey());
        // 朋友圈还开着就换上
        const coverImg = document.getElementById('moments-cover-img');
        if (coverImg && document.getElementById('moments-overlay').style.display === 'flex') {
            coverImg.src = dataURL;
            coverImg.style.display = 'block';
        }
    } catch (e) {
        console.warn('[朋友圈封面] 生成失败:', e.message);
    }
}
// 点击封面：换背景（选择本地图片）
function uploadMomentsCover(event) {
    if (event && event.target && event.target.closest && event.target.closest('#moments-back-btn')) return;
    const fileInput = document.getElementById('moments-cover-file');
    if (fileInput) fileInput.click();
}
async function handleMomentsCoverFile(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    const role = getCurrentRole();
    if (!role) return;
    try {
        const dataURL = await blobToDataURLCompressed(file, 1280);
        await momentsDbSave('cover_' + role.id, dataURL, momentsKey());
        const coverImg = document.getElementById('moments-cover-img');
        if (coverImg) {
            coverImg.src = dataURL;
            coverImg.style.display = 'block';
        }
    } catch (e) {
        alert('背景图保存失败：' + (e.message || '稍后再试'));
    }
}
function renderMoments() {
    const role = getCurrentRole();
    const feed = document.getElementById('moments-feed');
    const list = loadMoments().slice().reverse();
    const avatarSrc = getRoleAvatarSrc();
    if (list.length === 0) {
        feed.innerHTML = '<div style="text-align:center;color:#bbb;padding:60px 0;font-size:14px;">她还没有发动态</div>';
        return;
    }
    feed.innerHTML = list.map(m => {
        const comments = (m.comments || []).map(c => {
            if (c.from === 'replying') return '<div class="moment-comment moment-comment-replying">她正在回复…</div>';
            if (c.from === 'sys') return '<div class="moment-comment moment-comment-replying">' + escapeHtml(c.text) + '</div>';
            return '<div class="moment-comment">' +
                '<span class="' + (c.from === 'user' ? 'cc-mine' : 'cc-name') + '">' + escapeHtml(c.name) + '</span>：' + escapeHtml(c.text) +
            '</div>';
        }).join('');
        return '<div class="moment-item">' +
            (avatarSrc
                ? '<img class="moment-avatar" src="' + avatarSrc + '">'
                : '<div class="moment-avatar" style="display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;">' + (role.name ? role.name.charAt(0) : '?') + '</div>') +
            '<div class="moment-body">' +
                '<div class="moment-name">' + escapeHtml(role.name) + '</div>' +
                '<div class="moment-text">' + escapeHtml(m.text) + '</div>' +
                (m.image ? '<img class="moment-img" data-mid="' + m.id + '" src="' + (m.image.indexOf('data:') === 0 ? m.image : '') + '" onclick="openImageLightbox(this.src)">' : '') +
                '<div class="moment-meta">' +
                    '<span class="moment-time">' + fmtMomentTime(m.ts) + '</span>' +
                    '<span>' +
                        '<button class="moment-like' + (m.liked ? ' liked' : '') + '" onclick="toggleLikeMoment(' + m.id + ')">' +
                            '<i class="' + (m.liked ? 'fa-solid' : 'fa-regular') + ' fa-heart"></i> ' + (m.liked ? '已赞' : '赞') +
                        '</button>' +
                        '<button class="moment-comment-btn" onclick="commentMoment(' + m.id + ')"><i class="fa-regular fa-comment"></i> 评论</button>' +
                    '</span>' +
                '</div>' +
                (comments ? '<div class="moment-comments">' + comments + '</div>' : '') +
            '</div>' +
        '</div>';
    }).join('');
    // 异步加载IndexedDB里存的图片（'idx:'格式），加载完成后替换src
    list.forEach(m => {
        if (m.image && m.image.indexOf('idx:') === 0) {
            const mid = parseInt(m.image.slice(4), 10);
            if (!isNaN(mid)) {
                momentsDbGet(mid).then(src => {
                    if (src) {
                        const img = feed.querySelector('img.moment-img[data-mid="' + m.id + '"]');
                        if (img) img.src = src;
                    }
                });
            }
        }
    });
}
function toggleLikeMoment(id) {
    const list = loadMoments();
    const m = list.find(x => x.id === id);
    if (m) { m.liked = !m.liked; saveMoments(list); renderMoments(); }
}

// ============================================
// 朋友圈评论互动：底部输入条输入，你评论她回复（LLM）
// 不用prompt()——iOS Safari不支持系统弹窗，改成微信同款底部输入条
// ============================================
let commentingMomentId = null;
function commentMoment(id) {
    commentingMomentId = id;
    const bar = document.getElementById('moment-comment-bar');
    const input = document.getElementById('moment-comment-input');
    if (bar && input) {
        bar.style.display = 'flex';
        input.value = '';
        input.focus();
    }
}
async function submitMomentComment() {
    const id = commentingMomentId;
    const input = document.getElementById('moment-comment-input');
    if (id === null || !input) return;
    const text = input.value.trim();
    if (!text) return;
    const role = getCurrentRole();
    if (!role) return;
    const bar = document.getElementById('moment-comment-bar');
    if (bar) bar.style.display = 'none';
    commentingMomentId = null;
    const list = loadMoments();
    const m = list.find(x => x.id === id);
    if (!m) return;
    if (!m.comments) m.comments = [];
    m.comments.push({ from: 'user', name: '我', text, ts: Date.now() });
    m.comments.push({ from: 'replying', name: '', text: '', ts: Date.now() }); // 占位：她正在回复
    saveMoments(list);
    renderMoments();
    // 异步生成她的回复（网络层失败自动重试一次）
    try {
        const llmUrl = localStorage.getItem('LLM_URL') || 'https://api.deepseek.com';
        const llmKey = localStorage.getItem('LLM_KEY') || '';
        if (!llmKey) throw new Error('未配置LLM Key');
        const llmModel = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';
        const replyPrompt = '你的朋友圈动态：「' + String(m.text).slice(0, 80) + '」\n' +
            '用户评论：「' + text + '」\n' +
            '【重要】评论你的人就是「用户本人」——那个和你关系最亲密、你完全信任的人，你知道是他。他不是外人，不是在公开场合的陌生人。\n' +
            '即使你平时对外人高冷，对他也不是外人。请以角色身份回应他，口语化，10~30字，可以傲娇、吐槽、调侃或温柔，但必须回应他，不能不理他。不要引号，不要解释。';
        const messages = [
            { role: 'system', content: '你是角色「' + role.name + '」。私人虚构陪伴空间，完全沉浸角色，不要AI腔。' },
        ];
        if (role.desc && role.desc !== DEFAULT_ROLE_DESC) {
            messages.push({ role: 'system', content: '【角色卡】\n' + role.desc });
        }
        messages.push({ role: 'user', content: replyPrompt });
        const buildReq = () => ({
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + llmKey },
            body: JSON.stringify({ baseUrl: llmUrl, model: llmModel, messages, temperature: 1.0, max_tokens: 200, stream: false, thinking: { type: 'disabled' } })
        });
        let res;
        try {
            res = await fetch('/api/chat', buildReq());
        } catch (firstErr) {
            // 网络层异常重试一次
            await new Promise(r => setTimeout(r, 1200));
            res = await fetch('/api/chat', buildReq());
        }
        if (!res.ok) {
            let errText = '';
            try { errText = (await res.text()).slice(0, 200); } catch (e) { /* ignore */ }
            throw new Error('HTTP ' + res.status + (errText ? ' ' + errText : ''));
        }
        const data = await res.json();
        const reply = ((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '').trim();
        const list2 = loadMoments();
        const m2 = list2.find(x => x.id === id);
        if (m2 && m2.comments) {
            const idx = m2.comments.findIndex(c => c.from === 'replying');
            if (idx >= 0) m2.comments.splice(idx, 1);
            if (reply) {
                m2.comments.push({ from: 'role', name: role.name, text: reply, ts: Date.now() });
            } else {
                m2.comments.push({ from: 'sys', name: '', text: '（她没回这条评论）', ts: Date.now() });
            }
            saveMoments(list2);
            renderMoments();
        }
    } catch (e) {
        console.warn('[朋友圈评论] 回复失败:', e.message);
        const list2 = loadMoments();
        const m2 = list2.find(x => x.id === id);
        if (m2 && m2.comments) {
            const idx = m2.comments.findIndex(c => c.from === 'replying');
            if (idx >= 0) m2.comments.splice(idx, 1);
            m2.comments.push({ from: 'sys', name: '', text: '（她没回这条评论：' + String(e.message).slice(0, 120) + '）', ts: Date.now() });
            saveMoments(list2);
            renderMoments();
        }
    }
}

// ============================================
// 拍一拍：点她头像，她回一句（微信拍一拍玩法）
// ============================================
function showPatToast(main, reply) {
    const toast = document.getElementById('pat-toast');
    if (!toast) return;
    toast.innerHTML = '<div class="pat-main">' + main + '</div>' + (reply ? '<div class="pat-reply">' + reply + '</div>' : '');
    toast.style.display = 'block';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.style.display = 'none'; }, 5000);
}
// 拍一拍：生成她的反应回复（公共逻辑，朋友圈toast版和聊天版共用）
async function genPatReply(role, scene) {
    const llmUrl = localStorage.getItem('LLM_URL') || 'https://api.deepseek.com';
    const llmKey = localStorage.getItem('LLM_KEY') || '';
    if (!llmKey) throw new Error('未配置LLM Key');
    const llmModel = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';
    const messages = [
        { role: 'system', content: '你是角色「' + role.name + '」。私人虚构陪伴空间，完全沉浸角色，不要AI腔。' },
    ];
    if (role.desc && role.desc !== DEFAULT_ROLE_DESC) {
        messages.push({ role: 'system', content: '【角色卡】\n' + role.desc });
    }
    messages.push({ role: 'user', content: scene });
    const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + llmKey },
        body: JSON.stringify({ baseUrl: llmUrl, model: llmModel, messages, temperature: 1.0, max_tokens: 200, stream: false, thinking: { type: 'disabled' } })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return ((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '').trim();
}
async function patRole(event) {
    if (event) event.stopPropagation();
    const role = getCurrentRole();
    if (!role) return;
    showPatToast('你拍了拍「' + role.name + '」', '…');
    try {
        const reply = await genPatReply(role, '用户刚刚在朋友圈拍了拍你。请用一句符合人设的话回应这次"拍一拍"，口语化，10~30字，可以是害羞、傲娇、惊讶或调侃，不要引号，不要解释。');
        showPatToast('你拍了拍「' + role.name + '」', reply || '干嘛呀？');
    } catch (e) {
        console.warn('[拍一拍] 失败:', e.message);
        showPatToast('你拍了拍「' + role.name + '」', '（她没反应，可能是网络问题）');
    }
}
// 聊天页微信式拍一拍：双击她的头像 → 灰字提示 + 她回一句（进聊天记录，她能记住）
async function patRoleInChat() {
    const role = getCurrentRole();
    if (!role) return;
    const container = document.getElementById('chat-messages');
    // 微信灰字提示（不进chatHistory，像微信的系统提示）
    const tip = document.createElement('div');
    tip.className = 'pat-tip msg-enter';
    tip.textContent = '你拍了拍「' + role.name + '」';
    container.appendChild(tip);
    smartScroll(container);
    try {
        const reply = await genPatReply(role, '用户刚刚在聊天里拍了拍你。请用一句符合人设的话回应这次"拍一拍"，口语化，10~30字，可以是害羞、傲娇、惊讶或调侃，不要引号，不要解释。');
        if (reply) {
            chatHistory.push({ role: 'assistant', content: reply });
            appendChatMessage(reply, 'ai');
        }
    } catch (e) {
        console.warn('[聊天拍一拍] 失败:', e.message);
        tip.textContent = '你拍了拍「' + role.name + '」，但她没反应';
    }
}
async function blobToDataURLCompressed(blob, maxW) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxW / img.width);
            const c = document.createElement('canvas');
            c.width = Math.round(img.width * scale);
            c.height = Math.round(img.height * scale);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            resolve(c.toDataURL('image/jpeg', 0.72));
        };
        img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
        img.src = url;
    });
}
async function postNewMoment(autoOpts) {
    if (momentsBusy) return;
    momentsBusy = true;
    // autoOpts: { auto:true, ts:模拟时间戳 } —— 自动发朋友圈（静默，不显示状态条）
    const isAuto = !!(autoOpts && autoOpts.auto);
    const simTs = (autoOpts && autoOpts.ts) || null;
    const role = getCurrentRole();
    const statusEl = document.getElementById('moments-status');
    try {
        if (!isAuto) statusEl.textContent = '她正在构思这条动态...';
        const llmUrl = localStorage.getItem('LLM_URL') || 'https://api.deepseek.com';
        const llmKey = localStorage.getItem('LLM_KEY') || '';
        const llmModel = localStorage.getItem('LLM_MODEL') || 'deepseek-v4-flash';
        if (!llmKey) throw new Error('没有配置 LLM Key');
        const recent = (typeof chatHistory !== 'undefined' ? chatHistory : []).slice(-4);
        const recentText = recent.map(m => (m.role === 'user' ? '用户' : role.name) + ': ' + String(m.content || '').slice(0, 150)).join('\n');
        // 历史文案（去重用）：文案必须完全根据最近聊天记录来写，且不能和发过的重复
        const existingMoments = (() => { try { return loadMoments().map(m => String(m.text || '').trim()); } catch (e) { return []; } })();
        const existingBlock = existingMoments.length
            ? '你已经发过这些文案，绝对不允许和它们重复（内容、开头、核心意思雷同都不行）：\n' + existingMoments.slice(-12).map(t => '- ' + (t.slice(0, 45) || '（纯图）')).join('\n') + '\n'
            : '';
        const BANNED_TEXT = ['今天也没什么事', '今天好无聊', '又是平淡的一天', '日常', '打卡', '没什么好说的', '平平无奇的一天'];
        const fallbackTexts = [
            '巷口那只橘猫今天居然主动蹭我腿了，太阳底下它睡得像块小毯子。',
            '冰可乐第一口的快乐，谁懂啊。',
            '把歌单调到随机，播到一首很久没听的歌，突然想起好多事。',
            '窗外的云被风吹成一条鱼的样子，我看了好久。',
            '今天路过那家店，招牌换了，居然有点失落。',
            '晚饭煮糊了，但糊味闻着居然有点香，服了。',
            '刚洗完澡头发还没干，风一吹，觉得夏天好像真的要结束了。',
            '买了束花插在床头，心情好了一点。',
            '这家店的糖水甜得刚刚好，下次想带某人来。',
            '今天心情一般，但看到你发来的消息，好了一点。'
        ];
        const messagesBase = [
            { role: 'system', content: '你是角色「' + role.name + '」。这是一个私人虚构陪伴空间。完全沉浸角色，不要AI腔，不要解释，不要客套。' },
        ];
        if (role.desc && role.desc !== DEFAULT_ROLE_DESC) {
            messagesBase.push({ role: 'system', content: '【角色卡】\n' + role.desc });
        }
        const buildUserMsg = (extraHint) => (
            '现在你要发一条朋友圈。请严格输出两行：\n' +
            '第一行：动态文案，15~40字，要有具体细节，像真人随手发的朋友圈——日常、矫情、阴阳怪气都可以，符合你和用户最近的关系氛围。\n' +
            '第二行：画面描述（英文一句话），描述这条朋友圈配图是什么照片：你在哪、在做什么、什么表情、什么氛围。可以是生活场景、风景、他拍等，但画面中不要出现手机，不要自拍姿势和手势。\n' +
            '【怎么写】完全根据下面「最近聊天」里实际聊到的内容来写——抓取里面一个具体的点（她说的话、聊到的事、场景、情绪、称呼、互动），围绕它发一条朋友圈。不要写和聊天记录无关的泛泛内容。\n' +
            '【硬性要求】\n' +
            existingBlock +
            '1. 绝对禁止敷衍模板句：「今天也没什么事」「今天好无聊」「又是平淡的一天」「日常」「打卡」「没什么好说的」。\n' +
            '2. 不要以「今天」开头写流水账，不要无病呻吟，不要心灵鸡汤。\n' +
            (extraHint || '') +
            '只输出这两行，不要序号、不要引号、不要解释。\n\n最近聊天：\n' + (recentText || '（刚认识不久）')
        );
        // 调用 LLM 生成文案（可重试）
        const genOnce = async (extraHint) => {
            const messages = messagesBase.concat({ role: 'user', content: buildUserMsg(extraHint) });
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + llmKey },
                body: JSON.stringify({ baseUrl: llmUrl, model: llmModel, messages, temperature: 1.05, max_tokens: 200, stream: false })
            });
            if (!res.ok) throw new Error('LLM HTTP ' + res.status);
            const data = await res.json();
            const raw = ((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '').trim();
            const lines = raw.split('\n').map(s => s.trim()).filter(Boolean);
            return {
                text: (lines[0] || '').replace(/^["'「『]+|["'」』]+$/g, ''),
                scene: lines[1] || 'casual daily photo, natural expression'
            };
        };
        // 去重判断：完全一样，或一方包含另一方且长度>8（视为雷同）
        const isDup = (t) => !!t && existingMoments.some(e => !!e && (e === t || (e.length > 8 && (e.includes(t) || t.includes(e)))));
        let gen = await genOnce('');
        let retry = 0;
        while ((!gen.text || isDup(gen.text) || BANNED_TEXT.some(b => gen.text.includes(b))) && retry < 2) {
            retry++;
            gen = await genOnce('\n（注意：你上一条文案和以前发过的重复了或太敷衍，请重新写一条完全不同的、更具体的。）\n');
        }
        let text = gen.text;
        const scene = gen.scene;
        // 程序级兜底：仍失败/重复/敷衍时，换一条没用过的备用文案
        if (!text || isDup(text) || BANNED_TEXT.some(b => text.includes(b))) {
            const unused = fallbackTexts.filter(f => !isDup(f));
            const pool = unused.length ? unused : fallbackTexts;
            text = pool[Math.floor(Math.random() * pool.length)];
        }

        // 随机纯文字动态：约30%概率不配图，只发文字（微信朋友圈本就有纯文字模式，更真实）
        if (Math.random() < 0.3) {
            const list0 = loadMoments();
            list0.push({ id: simTs || Date.now(), text, image: '', ts: simTs || Date.now(), liked: false });
            try { saveMoments(list0); } catch (e) { /* ignore */ }
            if (!isAuto) { renderMoments(); statusEl.textContent = ''; }
            return;
        }

        if (!isAuto) statusEl.textContent = '她正在准备这张照片...';
        // ===== 完全复用聊天生图同一条链路 =====
        // 读最近聊天记录 + 角色身份锁 + 服装硬锁 + 视角/景别/人数约束 + 参考头像(同一开关) + 同一个出图函数
        // 唯一区别：额外附加"发朋友圈配图"的场景描述，不维护任何朋友圈专属生图逻辑
        // 模型：若当前选了 GPT Image（按张计费），自动发朋友圈强制改用 Agnes（套餐内免费额度），避免自动发动态烧钱
        const momentImageModel = getImageModel() === 'gpt-image' ? 'agnes-2.1' : undefined;
        const result = await generateImageFromChat('', 2, {
            silent: true,
            forceSingle: true,
            imageModel: momentImageModel,
            contextAppend: '【画面场景】' + (scene || 'casual daily photo, natural expression') + '\n这是角色准备发朋友圈的一张生活照片，请严格按照这个场景生成画面。画面中绝对不要出现手机，不要自拍姿势、不要举着手机的手、不要手机屏幕反光。'
        });
        if (!result || !result.blob) throw new Error('朋友圈生图未返回结果');
        // 图片存IndexedDB（大空间），localStorage只存'idx:'小标记——不再占5MB，永不报存储满
        const mid = simTs || Date.now();
        let dataURL = await blobToDataURLCompressed(result.blob, 1080);
        const dbOk = await momentsDbSave(mid, dataURL, momentsKey());
        if (!dbOk) {
            // IndexedDB异常兜底：压缩后仍存localStorage（旧方案），并提示
            dataURL = await blobToDataURLCompressed(result.blob, 720);
            const list0 = loadMoments();
            list0.push({ id: mid, text, image: dataURL, ts: mid, liked: false });
            try { saveMoments(list0); } catch (e) { throw new Error('朋友圈存储失败，请清空一次朋友圈后再试'); }
            if (!isAuto) { renderMoments(); statusEl.textContent = ''; }
            return;
        }
        const list = loadMoments();
        list.push({ id: mid, text, image: 'idx:' + mid, ts: mid, liked: false });
        try { saveMoments(list); } catch (e) { /* localStorage只存小数据，几乎不会满 */ }
        if (!isAuto) { renderMoments(); statusEl.textContent = ''; }
    } catch (e) {
        console.error('朋友圈生成失败:', e);
        if (!isAuto) statusEl.textContent = '生成失败：' + (e.message || '稍后再试');
    } finally {
        momentsBusy = false;
    }
}

// ============================================
// AI 自动发朋友圈：聊天时每2-3分钟一条；离线每1-2小时补发（网页关闭无法真发，打开时补发模拟）
// ============================================
function getAutoMomentsTs() {
    const role = getCurrentRole();
    return parseInt(localStorage.getItem('MOMENTS_AUTO_TS_' + (role ? role.id : 'default')) || '0', 10) || 0;
}
function setAutoMomentsTs(ts) {
    const role = getCurrentRole();
    localStorage.setItem('MOMENTS_AUTO_TS_' + (role ? role.id : 'default'), String(ts));
}
function autoMomentsEnabled() {
    return localStorage.getItem('AUTO_MOMENTS') !== '0';
}
async function autoPostMoment(simTs) {
    if (!autoMomentsEnabled()) return;
    const role = getCurrentRole();
    if (!role) return;
    try {
        await postNewMoment({ auto: true, ts: simTs || Date.now() });
        console.log('[自动朋友圈] 已发送', simTs ? '（补发，时间戳=' + new Date(simTs).toLocaleString() + '）' : '');
    } catch (e) {
        console.warn('[自动朋友圈] 发送失败:', e.message);
    }
}
// 在线定时：页面可见时每2.5分钟检查一次，够了就发
function startAutoMomentsTimer() {
    setInterval(() => {
        if (document.visibilityState !== 'visible') return;
        if (!autoMomentsEnabled()) return;
        const last = getAutoMomentsTs();
        const now = Date.now();
        if (now - last >= 2.5 * 60 * 1000) {
            setAutoMomentsTs(now);
            autoPostMoment();
        }
    }, 60 * 1000);
}
// 离线补发：打开页面时若已离线超过1小时，按每1-2小时一条补发（最多2条），时间戳模拟为离线期间
async function catchUpMoments() {
    if (!autoMomentsEnabled()) return;
    const role = getCurrentRole();
    if (!role) return;
    const last = getAutoMomentsTs();
    const now = Date.now();
    const gap = now - last;
    if (last === 0 || gap < 60 * 60 * 1000) return; // 从没发过或离线不足1小时不补
    const hours = Math.floor(gap / (60 * 60 * 1000));
    const n = Math.min(hours, 2);
    for (let i = 0; i < n; i++) {
        const simTs = last + (i + 1) * (60 + Math.floor(Math.random() * 60)) * 60 * 1000;
        if (simTs > now) break;
        setAutoMomentsTs(simTs);
        await autoPostMoment(simTs);
    }
}

// 生成朋友圈记忆注入文本（单聊system prompt用）：最近3条朋友圈
function buildMomentsMemoryPrompt() {
    let list;
    try { list = loadMoments(); } catch (e) { return ''; }
    if (!list || list.length === 0) return '';
    // 优先记住"有评论互动"的动态（最多3条），再补最近动态（最多共5条）——
    // 防止自动发朋友圈把用户评论过的那条顶出记忆窗口
    const withC = list.filter(m => (m.comments || []).length > 0).slice(-3).reverse();
    const hasIds = new Set(withC.map(m => m.id));
    const others = list.filter(m => !hasIds.has(m.id)).slice(-5).reverse();
    const recent = [...withC, ...others].slice(0, 5);
    const lines = recent.map(m => {
        const ago = Date.now() - m.ts;
        const day = ago < 86400000 ? '今天' : ago < 172800000 ? '昨天' : ago < 604800000 ? '这几天' : ((new Date(m.ts).getMonth() + 1) + '月' + new Date(m.ts).getDate() + '日');
        let line = day + '，你发了一条朋友圈："' + String(m.text).slice(0, 80) + '"';
        // 评论互动也一起记住：用户评论了什么、你回了什么
        const cmts = (m.comments || []).filter(c => c.from === 'user' || c.from === 'role');
        if (cmts.length) {
            line += '。' + cmts.map(c =>
                (c.from === 'user' ? '用户评论说：' : '你回复：') + '"' + String(c.text).slice(0, 60) + '"'
            ).join('；');
        }
        return line;
    });
    return '【你最近发的朋友圈（含评论互动），你本人要记得这些内容】\n' + lines.join('\n') +
        '\n\n用户如果提起你的朋友圈、状态、配图、或者他评论过什么，你要自然地接上梗，不要装不知道自己发过什么、也不要装不知道他评论过。';
}
