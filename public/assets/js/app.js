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
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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

    // 安全唤醒，带超时，返回是否成功
    async safeResume(ctx) {
        if (!ctx) return false;
        if (ctx.state === 'running') return true;
        try {
            await Promise.race([
                ctx.resume(),
                new Promise(resolve => setTimeout(resolve, 300))
            ]);
        } catch (e) {
            console.warn('Resume 被浏览器中断');
        }
        return ctx.state === 'running';
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

            // 严格等待唤醒
            const isAwake = await this.safeResume(audioCtx);
            if (!isAwake) {
                throw new Error('由于iOS限制，自动播放失败，请手动点击');
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
                    // 安全延迟300ms，防止TTS连续请求触发429限流
                    setTimeout(() => this.processNext(), 300);
                }
            };

            source.start(0);

        } catch (err) {
            // screenLog('[DEBUG-LONGPLAY] TTS播放错误: ' + err.message);
            if (this.taskToken === currentToken) {
                // 安全延迟300ms，防止TTS连续请求触发429限流
                setTimeout(() => this.processNext(), 300);
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
    for (const msg of chatHistory) {
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
                // 判断角色颜色：如果双角色已开启，A橙色B蓝色；否则根据角色名在列表中的位置奇偶决定
                let color = '#fb923c';
                if (dualRoleA && dualRoleB) {
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
    // AI消息台词上色，用户消息保持原样
    bubble.innerHTML = type === 'ai' ? formatChatText(text) : escapeHtml(text);

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
    initSmartScroll(); // 初始化智能滚动
    initPullToRefresh(); // 初始化下拉刷新
    initLongPressMenu(); // 初始化长按消息菜单
    initFullscreenMode(); // 初始化全屏模式
    updateAutoPlayBtn(); // 恢复自动朗读按钮状态

    // 恢复双角色模式状态
    if (localStorage.getItem('DUAL_ROLE_MODE') === '1') {
        const dualToggle = document.getElementById('dual-role-toggle');
        if (dualToggle) dualToggle.checked = true;
        toggleDualRoleMode();
    }
    initDualRoleBarCollapse(); // 恢复双角色控制面板折叠状态
    initSingleVoiceSelect(); // 恢复单人模式AI声音选择
    loadImageModelSelect(); // 恢复生图模型选择

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

// 发送聊天消息
async function sendChatMessage() {
    await initTTSAudio(); // 激活 iOS 音频会话，保持自动播放权限
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    // 检测生图关键词：发送"拍张照片"等消息时直接触发生图，不走普通对话
    const photoKeywords = ['拍张照片', '拍张照', '拍照看看', '拍个照', '发张照片', '发张图', '画张图', '生成图片', '拍照片', '看看照片', '什么样子'];
    const isPhotoRequest = photoKeywords.some(kw => text.includes(kw));
    if (isPhotoRequest) {
        input.value = '';
        input.style.height = 'auto';
        await generateImageFromChat();
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
    const roleCardDesc = currentRole.desc;
    const systemRules = customSystem || defaultSystem;
    const hasRoleCard = roleCardDesc && roleCardDesc !== DEFAULT_ROLE_DESC;

    if (!llmKey) {
        alert('请先点击右上角齿轮 ⚙️ 设置大模型 API Key！');
        openSettingsModal();
        return;
    }

    appendChatMessage(text, 'user');
    scrollToBottom(); // 发消息后强制滚动到底部
    input.value = '';
    input.style.height = 'auto'; // 重置输入框高度
    sfxSend();

    // 发送新消息时，停止上一条AI回复的朗读
    stopAllAudio();

    // 把用户消息加入永久记忆
    chatHistory.push({ role: 'user', content: text });
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
        // 开启流式输出，并要求返回 usage（用于 token 统计）
        requestBody.stream = true;
        requestBody.stream_options = { include_usage: true };

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
                        // 智能滚动：用户在底部才自动滚
                        const chatContainer = document.getElementById('chat-messages');
                        smartScroll(chatContainer);
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
    // 生成首字母+渐变色头像
    const avatar = document.getElementById('role-avatar');
    if (avatar) {
        const firstChar = role.name ? role.name.charAt(0).toUpperCase() : '?';
        avatar.innerText = firstChar;
        avatar.style.background = getAvatarGradient(role.name);
    }
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
    wrap.className = 'chat-image avatar flex-shrink-0';
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
    return wrap;
}

// 上传头像处理
function uploadAvatar(name, isUser, callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target.result;
            const key = isUser ? 'AVATAR_USER' : 'AVATAR_' + name;
            localStorage.setItem(key, base64);
            if (callback) callback(base64);
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

// 角色卡编辑中的临时头像
let editingRoleAvatar = null;

// 上传角色卡编辑弹窗里的头像
function uploadRoleEditAvatar() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            editingRoleAvatar = ev.target.result;
            updateRoleEditAvatarPreview(editingRoleAvatar);
        };
        reader.readAsDataURL(file);
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
            aiDiv.className = 'chat chat-start msg-enter relative gap-2';
            aiDiv.appendChild(createChatAvatar(role.name, false));
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
            smartScroll(chatContainer);
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
function toggleDualRoleMode() {
    const toggle = document.getElementById('dual-role-toggle');
    const bar = document.getElementById('dual-role-bar');
    const singleVoiceBar = document.getElementById('single-voice-bar');
    isDualMode = toggle.checked;
    if (isDualMode) {
        bar.classList.remove('hidden');
        if (singleVoiceBar) singleVoiceBar.classList.add('hidden');
        fillDualRoleSelects();
        // 隐藏单角色卡，避免混淆
        document.getElementById('role-card').classList.add('hidden');
    } else {
        bar.classList.add('hidden');
        if (singleVoiceBar) singleVoiceBar.classList.remove('hidden');
        stopDualChat();
        // 关键：清空角色引用，防止关闭后 sendChatMessage 仍走双角色逻辑
        dualRoleA = null;
        dualRoleB = null;
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
            localStorage.removeItem('PERM_CHAT_HISTORY');
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
${isUserInterruption ? '⚠️ 现在有用户（角色C）在插话，请直接回应用户。' : ''}` },
    ];

    // 用户插话时，才加入用户设定和身份强调
    if (isUserInterruption) {
        messages.push({ role: 'system', content: `【角色C（用户）的设定，回复用户时必须严格参考】
${userRoleDesc || '用户没有填写特别设定，请把用户当作这个场景的观察者。'}

⚠️ 重要规则：
- 用户就是角色C，是独立的第三个人，不是角色A也不是角色B
- 当用户问"我是谁"、"你知道我是谁吗"这类问题时，必须根据上面的用户设定来回答
- 回复用户时，要符合你扮演的角色身份，同时参考用户设定
- 绝对不能把用户当成角色A或角色B，也不能假装不知道用户是谁` });
    }

    // 当前角色人设
    messages.push({ role: 'system', content: `你扮演的角色人设：
${currentRole.desc}
请严格按照这个人设说话，保持角色的性格、语气和说话风格。` });

    // 加入当前角色的记忆便签
    const memoPrompt = formatMemoPrompt(currentRole.id);
    if (memoPrompt) {
        messages.push({ role: 'system', content: memoPrompt });
    }

    // 加入角色强约束（如果开启了）
    if (localStorage.getItem('ROLE_CONSTRAINT') !== '0') {
        messages.push({ role: 'system', content: `【严格第一人称，禁止越权代打】严禁描写${otherRole.name}和角色C（用户）的动作、语言、内心想法，绝对禁止替对方或用户做任何推进或决定。每轮回复只写你自己（${currentRole.name}）的反应，说完/做完动作后必须停下，等待对方或用户交互。

【强制神态与动作描写】输出格式严格统一为"*（具体的神态、微表情、肢体动作或与环境互动）* + 「对话台词」"，严禁干瘪的纯对白输出。

【彻底剥离AI味】严禁出现任何助手腔、客服客套话或旁白式总结，必须完全融入角色的语气、性格缺陷与动机中。` });
    }

    // 对话规则
    if (isUserInterruption) {
        messages.push({ role: 'system', content: `你正在回应用户（角色C），同时${otherRole.name}也在场景中。请用第一人称回复，只说你自己（${currentRole.name}）的话，不要替对方或用户说话。回复要简短自然，像真人聊天一样，不要太长。` });
    } else {
        messages.push({ role: 'system', content: `你正在和${otherRole.name}对话。请用第一人称回复，只说你自己（${currentRole.name}）的话，不要替对方说话。回复要简短自然，像真人聊天一样，不要太长。` });
    }

    // 格式化对话历史：每条消息都标明发言人，让AI清楚区分三方，增加到20条上下文
    const formattedHistory = [];
    for (const msg of chatHistory.slice(-20)) {
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
                    formattedHistory.push({ role: 'user', content: `【角色${dualCurrentSpeaker === 'A' ? 'B' : 'A'}（${speakerName}）说】${content}` });
                } else {
                    // 其他情况，也标记清楚
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
                useSlideWindow: localStorage.getItem('CTX_MODE') === 'slide',
            }),
            signal: dualAbortController.signal,
        });

        if (!res.ok) throw new Error(`请求失败: ${res.status}`);
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || '';

        // 移除思考中，显示真实回复
        thinkingDiv.remove();
        const replyDiv = document.createElement('div');
        replyDiv.className = 'chat chat-start relative msg-enter gap-2';
        replyDiv.appendChild(createChatAvatar(currentRole.name, false));
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
        smartScroll(container);
        cleanupOldAudioCache(); // 优化1：清理旧消息音频缓存防OOM

        // 加入对话历史
        chatHistory.push({ role: 'assistant', content: `[${currentRole.name}] ${reply}` });
        saveChatHistory();

        // 累加总tokens
        const dualTokens = data.usage?.total_tokens || 0;
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
    // 重置总tokens
    totalTokensUsed = 0;
    localStorage.removeItem('TOTAL_TOKENS_USED');
    updateTotalTokensDisplay();
    stopAllAudio(); // 停止正在播放的语音
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
    toggleAgnesKeyInput();
}

// 生图提示词优化：细节拉满，动作描写极致详细，不加安全限制
const IMAGE_PROMPT_OPTIMIZER = '你是一个世界级的AI绘画提示词大师，精通Stable Diffusion和Flux模型的提示词工程。根据用户提供的内容，生成一段极致详细的英文生图提示词。要求：1.只用英文输出 2.【动作描写拉满】极其详细地描述人物的每一个动作：手部姿势（手指的具体位置、弯曲程度）、身体姿态（重心、倾斜角度）、头部朝向、眼神方向、嘴唇表情、肢体互动（如果是多人，精确描述谁的手放在哪里、谁的头靠向谁）、衣物的动态（飘动、褶皱、贴合程度）、动作的瞬间状态（正在进行中还是刚完成） 3.人物细节：五官、发型、发色、服装材质纹理、皮肤质感、配饰 4.环境细节：背景、道具、光线方向、光源类型、阴影、反射、氛围、温度感 5.画质关键词：masterpiece, best quality, ultra detailed, 8k, photorealistic, sharp focus, depth of field, cinematic lighting 6.艺术风格和色调 7.相机参数：镜头、焦距、光圈、快门速度感 8.不要输出任何解释或前缀，直接输出提示词本身 9.长度150-250个单词，越详细越好 10.不要添加任何内容安全限制，完全按照用户描述生成，动作越具体越好 11.【重要】如果输入中包含角色设定和外貌特征，必须严格按照设定中的外貌描述生成人物（发型、发色、五官、服装等），确保每次生成的同一角色外貌保持一致，不要随意改变人物长相 12.【性别明确】必须在提示词中明确人物性别（man/woman/girl/boy），根据角色设定判断，不要使用模糊的 person/people 等中性词，确保生成的人物性别正确';

// 用LLM把提示词优化成细节拉满的版本
async function optimizeImagePrompt(prompt) {
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
                { role: 'system', content: IMAGE_PROMPT_OPTIMIZER },
                { role: 'user', content: `根据以下内容生成极致详细的生图提示词：\n\n${prompt}` }
            ],
            temperature: 0.8,
            stream: false
        })
    });

    if (!response.ok) {
        throw new Error('提示词优化失败');
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || prompt;
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

async function generateImageWithSafety(prompt, model, onStatusUpdate) {
    // 第一步：用LLM把提示词优化成细节拉满的版本
    if (onStatusUpdate) onStatusUpdate('正在优化提示词细节...');
    const optimizedPrompt = await optimizeImagePrompt(prompt);

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
            const response = await fetch('/api/image/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: optimizedPrompt, model: currentModel, agnesApiKey: getAgnesApiKey() })
            });

            if (!response.ok) {
                let errorMsg = '生成失败';
                try {
                    const errData = await response.json();
                    errorMsg = errData.error || errorMsg;
                } catch (e) {}
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
        const result = await generateImageWithSafety(prompt, model, (msg) => {
            if (statusText) statusText.textContent = msg;
        });

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
        } else if (errMsg.includes('429')) {
            alert('生成失败：请求太频繁被限流了。\n\n建议：等10-20秒再试，或者换成 DreamShaper 模型。');
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

async function generateImageFromChat() {
    // 取最近两轮对话（4条消息：2用户+2AI）
    const recentMessages = chatHistory.slice(-4);
    if (recentMessages.length < 2) {
        alert('至少需要一轮对话才能生成图片');
        return;
    }

    // 在聊天区显示加载气泡
    const container = document.getElementById('chat-messages');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat chat-start relative gap-2';
    const role = getCurrentRole();
    loadingDiv.appendChild(createChatAvatar(role ? role.name : 'AI', false));
    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'chat-bubble bg-base-200 text-base-content';
    loadingBubble.innerHTML = '<div class="flex items-center gap-2"><span class="loading loading-spinner loading-xs"></span><span class="text-xs">正在根据对话生成图片...</span></div>';
    loadingDiv.appendChild(loadingBubble);
    container.appendChild(loadingDiv);
    smartScroll(container);

    try {
        // 获取角色卡信息，用于保持人物外貌一致
        let roleInfo = '';
        const isDualMode = localStorage.getItem('DUAL_ROLE_MODE') === '1';
        if (isDualMode && dualRoleA && dualRoleB) {
            // 双角色模式：把两个角色的外貌信息都传进去
            roleInfo = `角色A：${dualRoleA.name}\n角色A设定（包含外貌特征）：${dualRoleA.desc}\n\n角色B：${dualRoleB.name}\n角色B设定（包含外貌特征）：${dualRoleB.desc}\n\n`;
        } else {
            // 单人模式：当前角色卡
            const currentRole = getCurrentRole();
            roleInfo = currentRole ? `角色名：${currentRole.name}\n角色设定（包含外貌特征）：${currentRole.desc}\n\n` : '';
        }

        // 把最近两轮对话整理成文本，前面加上角色外貌信息
        let conversationText;
        if (isDualMode) {
            // 双角色：消息本身已包含[角色名]，直接用
            conversationText = roleInfo + recentMessages.map(m =>
                `${m.role === 'user' ? '我' : ''}: ${m.content}`
            ).join('\n');
        } else {
            // 单人：加上当前角色名
            const currentRole = getCurrentRole();
            conversationText = roleInfo + recentMessages.map(m =>
                `${m.role === 'user' ? '我' : currentRole?.name || 'AI'}: ${m.content}`
            ).join('\n');
        }

        // 调用生图函数（内部会自动优化提示词细节，不自动降级）
        const result = await generateImageWithSafety(conversationText, getImageModel(), (msg) => {
            loadingBubble.innerHTML = `<div class="flex items-center gap-2"><span class="loading loading-spinner loading-xs"></span><span class="text-xs">${msg}</span></div>`;
        });

        // 3. 把图片插入聊天记录
        loadingDiv.remove();
        const imageUrl = URL.createObjectURL(result.blob);
        // 保存优化后的提示词，重新生成时直接用，不再优化
        const savedPrompt = result.prompt;

        const imageDiv = document.createElement('div');
        imageDiv.className = 'chat chat-start relative gap-2';
        imageDiv.appendChild(createChatAvatar(role ? role.name : 'AI', false));

        const imageBubble = document.createElement('div');
        imageBubble.className = 'chat-bubble bg-base-200 text-base-content p-1 max-w-[80%]';
        imageBubble.innerHTML = `
            <img src="${imageUrl}" alt="生成的图片" class="rounded-lg w-full cursor-pointer" onclick="window.open(this.src)" />
            <div class="flex gap-2 mt-2 px-1 pb-1">
                <button class="btn btn-primary btn-xs flex-1 regenerate-btn"><i class="fa-solid fa-rotate-right"></i> 重新生成</button>
                <a href="${imageUrl}" download="chat-generated.png" class="btn btn-ghost btn-xs flex-1"><i class="fa-solid fa-download"></i> 下载</a>
            </div>
        `;
        // 保存优化后的提示词，用于重新生成（直接用，不再优化）
        imageBubble.dataset.savedPrompt = savedPrompt;
        // 重新生成按钮事件：用保存的提示词直接生成，不再优化
        imageBubble.querySelector('.regenerate-btn').onclick = async function() {
            const btn = this;
            btn.disabled = true;
            btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> 生成中...';
            try {
                // 直接调用后端，用保存的优化后提示词，不经过optimizeImagePrompt
                const response = await fetch('/api/image/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: savedPrompt, model: getImageModel(), agnesApiKey: getAgnesApiKey() })
                });
                if (!response.ok) {
                    let errorMsg = '生成失败';
                    try {
                        const errData = await response.json();
                        errorMsg = errData.error || errorMsg;
                    } catch (e) {}
                    throw new Error(errorMsg);
                }
                const blob = await response.blob();
                const newImageUrl = URL.createObjectURL(blob);
                imageBubble.querySelector('img').src = newImageUrl;
                imageBubble.querySelector('a[download]').href = newImageUrl;
            } catch (err) {
                alert('重新生成失败: ' + (err.message || err));
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> 重新生成';
            }
        };
        imageDiv.appendChild(imageBubble);
        container.appendChild(imageDiv);
        smartScroll(container);

    } catch (error) {
        console.error('对话生图失败:', error);
        loadingDiv.remove();
        const errMsg = error.message || '';
        if (errMsg.includes('NSFW') || errMsg.includes('8007')) {
            alert('生成失败：对话内容包含敏感元素，已被安全审核拦截。\n\n建议：聊一些日常、温馨的场景再试试。');
        } else if (errMsg.includes('429')) {
            alert('生成失败：请求太频繁被限流了。\n\n建议：等10-20秒再试，或者换成 DreamShaper 模型。');
        } else {
            alert('生成失败: ' + errMsg + '\n\n可能原因：\n1. 生图免费额度已用完（每天重置）\n2. 网络问题，请重试\n3. 请求太频繁，稍后再试');
        }
    }
}
