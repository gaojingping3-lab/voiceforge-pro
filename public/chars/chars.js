// 立绘素材清单：从 localStorage 动态读取角色头像（dataURL），实时反映角色卡数据
// 格式兼容原 ARCAM_CHARS：{ name, file }，data 标记为 true 表示 file 是 dataURL/URL（不是相对路径）
window.ARCAM_CHARS = (function () {
    var characters = [];
    function add(name, dataUrl, kind, rid) {
        if (!dataUrl || typeof dataUrl !== 'string') return;
        characters.push({ name: (kind === 'user' ? '用户' : '角色') + '·' + name, file: dataUrl, data: true, rid: rid || null });
    }
    try {
        var list = JSON.parse(localStorage.getItem('ROLE_LIST') || '[]');
        for (var i = 0; i < list.length; i++) {
            var r = list[i];
            if (r && r.name) {
                var av = r.avatar || localStorage.getItem('AVATAR_' + r.name);
                add(r.name, av, 'role', r.id);
            }
        }
        var userAv = localStorage.getItem('AVATAR_USER');
        if (userAv) add('我', userAv, 'user');
    } catch (e) { /* ignore */ }
    return { characters: characters, backgrounds: [] };
})();
