/* ============================================================
 * mods_ui.js —— v0.8.7「导入玩法」界面（DOM 浮层，粘贴框要用原生输入）+ 链接入口（#mod= / #play=）
 *  流程：粘贴 JSON / 链接 →「检查」→ 校验失败列出每一条错误（路径 + 说明）；通过则弹确认卡（标题 / 作者 / 类型 / 体积）→「导入」才写入。
 *  永远不自动导入；文本一律 textContent（不走 innerHTML）；一律标「非官方」；导入的关卡不发任何奖励。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, M = XY.mod, UI = XY.modsUI = { isOpen: false, from: '' };
  var root = null, S = null, delArm = null, FONT = (XY.C && XY.C.FONT) || 'sans-serif';
  var KIND = { level: '关卡', character: '自建角色', pack: '合集包' };

  function css() {
    if (document.getElementById('mdStyle')) return;
    var s = document.createElement('style'); s.id = 'mdStyle';
    s.textContent = [
      '#mdRoot{position:fixed;left:0;top:0;right:0;bottom:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(60,48,30,.38);font-family:' + FONT + ';-webkit-tap-highlight-color:transparent}',
      '#mdRoot *{box-sizing:border-box}',
      '#mdPanel{position:relative;width:min(94vw,560px);max-height:94vh;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;background:radial-gradient(ellipse at 15% 0,rgba(214,190,130,.22),transparent 55%),radial-gradient(ellipse at 90% 100%,rgba(150,170,140,.18),transparent 50%),#fffaf0;border:2px solid #c9a24a;border-radius:16px;padding:14px 16px 16px;color:#3a2f1c;box-shadow:0 8px 30px rgba(60,40,10,.35),inset 0 0 0 4px #fffaf0,inset 0 0 0 5px #e6d29a;overflow-wrap:anywhere;word-break:break-word}',
      '#mdPanel .mdHead{display:flex;gap:10px;align-items:center;justify-content:space-between}',
      '#mdPanel h2{margin:0;font-size:21px;line-height:1.3;color:#a8321f;letter-spacing:2px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}',
      '.mdSeal{display:inline-block;transform:rotate(-6deg);border:2px solid #c8341f;color:#c8341f;border-radius:5px;padding:0 6px;font-size:13px;line-height:20px;font-weight:bold;letter-spacing:1px;background:rgba(200,52,31,.05);white-space:nowrap}',
      '#mdPanel .mdSub{font-size:13px;color:#7b6c4c;margin:6px 0 8px;line-height:1.6}',
      '#mdPanel textarea{display:block;width:100%;height:120px;min-height:80px;resize:vertical;font-size:16px;line-height:1.4;padding:10px 12px;border:2px solid #d8c48e;border-radius:12px;background:#fffdf6;color:#3a2f1c;font-family:ui-monospace,Menlo,Consolas,monospace;outline:none}',
      '#mdPanel textarea:focus{border-color:#c9822a}',
      '#mdPanel .mdRow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0}',
      '#mdPanel button{min-height:46px;min-width:46px;padding:0 16px;font-size:15px;font-family:inherit;border-radius:23px;border:2px solid #c9a24a;background:#fff3cf;color:#6b4410;cursor:pointer;touch-action:manipulation;max-width:100%}',
      '#mdPanel button.pri{background:#f0b429;border-color:#b8863b;color:#3a2410;font-weight:bold}',
      '#mdPanel button.dan{border-color:#c4685a;background:#fff0ec;color:#9a3a2c}',
      '#mdPanel button:disabled{opacity:.5}',
      '#mdStatus{min-height:20px;font-size:13px;line-height:1.5;color:#7b6c4c}#mdStatus.bad{color:#b0412e}#mdStatus.good{color:#3d7a3a}',
      '.mdErrs{margin:6px 0;padding:8px 10px 8px 12px;border-left:4px solid #c8341f;background:#fff4ee;border-radius:0 10px 10px 0;font-size:13px;line-height:1.55;color:#7a2d1c}',
      '.mdErrs b{display:block;margin-bottom:2px;color:#a8321f}.mdErrs div{margin:2px 0}.mdErrs code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:#5a3a10;background:rgba(201,162,74,.18);padding:0 4px;border-radius:4px}',
      '.mdCard{border:2px solid #c9a24a;border-radius:14px;padding:10px 12px;background:#fffdf6;margin:8px 0;box-shadow:0 1px 6px rgba(90,60,20,.12)}',
      '.mdCard .mdT{font-size:18px;color:#5a3a10;font-weight:bold;line-height:1.35;display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
      '.mdCard .mdL{font-size:13px;line-height:1.7;color:#6b5a37}',
      '.mdCard .mdL b{color:#7a4b12}',
      '.mdMine{display:flex;gap:10px;align-items:center;flex-wrap:wrap;border:1.5px solid #e4d5a6;border-radius:14px;padding:8px 10px;background:#fff;margin:6px 0}',
      '.mdMine .mdTxt{flex:1 1 150px;min-width:0;font-size:13px;line-height:1.5}',
      '.mdMine .mdTxt b{font-size:15px;color:#5a3a10}',
      '.mdPriv{font-size:12.5px;color:#6a7d52;margin:2px 0 6px;line-height:1.5}',
      '@media (max-height:430px){#mdPanel{padding:8px 12px 10px}#mdPanel textarea{height:64px}#mdPanel .mdSub{margin:2px 0 4px}}'
    ].join('');
    document.head.appendChild(s);
  }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text, kids) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; (kids || []).forEach(function (k) { e.appendChild(k); }); return e; }
  function btn(id, text, cls, fn) { var b = el('button', cls || '', text); if (id) b.id = id; b.type = 'button'; b.onclick = fn; return b; }
  function say(t, cls) { var e = $('mdStatus'); if (e) { e.textContent = t || ''; e.className = cls || ''; } if (S) { S.msg = t || ''; S.msgCls = cls || ''; } }
  function seal(t) { return el('span', 'mdSeal', t || '非官方'); }
  function line(label, val) { var d = el('div', ''); d.appendChild(el('b', '', label + '：')); d.appendChild(document.createTextNode(val)); return d; }

  UI.open = function (from, pre) {
    if (UI.isOpen) { if (pre) UI.show(pre); return; }
    css(); UI.isOpen = true; UI.from = from || ''; S = { res: null, msg: '', msgCls: '' }; delArm = null;
    root = el('div'); root.id = 'mdRoot';
    var p = el('div'); p.id = 'mdPanel'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', '导入玩法');
    var head = el('div', 'mdHead'); head.appendChild(el('h2', '', '导入玩法', [seal('非官方')])); head.appendChild(btn('mdClose', '关闭 ✕', '', UI.close)); p.appendChild(head);
    p.appendChild(el('div', 'mdSub', '把别人（或 Bot）做好的关卡 / 自建角色贴进来。玩法包只是数据，不会运行任何代码；导入的关卡只能玩，不发灵石、卡牌、碎片，也不记通关。'));
    p.appendChild(el('div', 'mdPriv', '🔒 只保存在本机（localStorage），不上传任何地方。'));
    var ta = el('textarea'); ta.id = 'mdText'; ta.placeholder = '粘贴玩法包 JSON，或带 #mod= 的链接'; ta.setAttribute('spellcheck', 'false'); ta.setAttribute('autocapitalize', 'off'); ta.setAttribute('autocorrect', 'off'); ta.setAttribute('aria-label', '玩法包内容'); ta.maxLength = 40000; p.appendChild(ta);
    var row = el('div', 'mdRow'); row.appendChild(btn('mdCheck', '检查', 'pri', UI.check)); row.appendChild(btn('mdClear', '清空', '', function () { $('mdText').value = ''; UI.show(null); say(''); })); p.appendChild(row);
    var st = el('div'); st.id = 'mdStatus'; st.setAttribute('aria-live', 'polite'); p.appendChild(st);
    var box = el('div'); box.id = 'mdBox'; p.appendChild(box);
    var h2 = el('h2', '', '我的玩法包'); h2.style.cssText = 'font-size:16px;margin-top:12px'; var cnt = el('span', '', ''); cnt.id = 'mdCount'; cnt.style.cssText = 'font-size:13px;color:#7b6c4c;letter-spacing:0'; h2.appendChild(cnt); p.appendChild(h2);
    var list = el('div'); list.id = 'mdList'; p.appendChild(list);
    root.appendChild(p); document.body.appendChild(root);
    ['keydown', 'keyup', 'keypress'].forEach(function (ev) { root.addEventListener(ev, function (e) { e.stopPropagation(); if (ev === 'keydown' && e.key === 'Escape') UI.close(); }); });
    root.addEventListener('mousedown', function (e) { if (e.target === root) UI.close(); });
    document.addEventListener('keydown', onDocKey, true);
    if (XY.app) XY.app.mdOpen = true;
    UI.refreshList(); if (pre) { UI.show(pre); } else say('');
  };
  UI.close = function () {
    if (!UI.isOpen) return; UI.isOpen = false; document.removeEventListener('keydown', onDocKey, true);
    if (root && root.parentNode) root.parentNode.removeChild(root); root = null; if (XY.app) XY.app.mdOpen = false;
  };
  function onDocKey(e) { if (!UI.isOpen || (root && root.contains(e.target))) return; e.stopPropagation(); if (e.key === 'Escape') UI.close(); }

  UI.check = function () { var t = $('mdText').value; if (!t.trim()) { say('先把玩法包粘贴到上面的框里', 'bad'); return; } UI.show(M.fromText(t)); };

  /* 显示校验结果：失败 = 错误清单；通过 = 确认卡（要点「导入」才写入） */
  UI.show = function (res) {
    var box = $('mdBox'); if (!box) return; while (box.firstChild) box.removeChild(box.firstChild); S.res = res;
    if (!res) return;
    if (!res.ok) {
      var d = el('div', 'mdErrs'); d.appendChild(el('b', '', '有 ' + res.errors.length + ' 处不能收：'));
      res.errors.slice(0, 8).forEach(function (e) { var l = el('div'); l.appendChild(el('code', '', e.path)); l.appendChild(document.createTextNode(' ' + e.msg + '（' + e.code + '）')); d.appendChild(l); });
      if (res.errors.length > 8) d.appendChild(el('div', '', '…还有 ' + (res.errors.length - 8) + ' 处'));
      box.appendChild(d); say('没有导入任何东西。改好再检查一次。', 'bad'); scrollTo(box); return;
    }
    var m = res.mod, c = el('div', 'mdCard'); c.appendChild(el('div', 'mdT', m.title, [seal('非官方')]));
    var l = el('div', 'mdL'); l.appendChild(line('类型', KIND[m.kind])); l.appendChild(line('作者', m.author || '（未署名）')); l.appendChild(line('体积', (res.size / 1024).toFixed(1) + ' KB'));
    l.appendChild(line('内容', summary(m)));
    if (m.kind === 'level' || (m.packs && m.packs.some(function (x) { return x.kind === 'level'; }))) l.appendChild(el('div', '', '只能玩：不发灵石 / 卡牌 / 碎片，不记通关，不解锁任何东西。'));
    c.appendChild(l);
    var row = el('div', 'mdRow'); row.appendChild(btn('mdImport', '导入', 'pri', UI.doImport)); row.appendChild(btn('mdCancel', '取消', '', function () { UI.show(null); say(''); })); c.appendChild(row);
    box.appendChild(c); say('确认一下再导入：点「导入」才会写进这台设备。', ''); scrollTo(box);
  };
  function scrollTo(box) { try { var P = $('mdPanel'); if (P && box) P.scrollTop = Math.max(0, box.offsetTop - 70); } catch (e) {} }      // 矮屏（横屏手机）：把结果卡滚到可见处
  function summary(m) {
    if (m.kind === 'level') return '洞府 ' + m.data.dens.length + ' 座 · 路线 ' + m.data.route.length + ' 个点 · 主线「' + M.level(m).main.short + '」';
    if (m.kind === 'character') return '账号 @' + m.data.handle + ' · 技能取自「' + ((XY.SP_BY[m.data.skillSet] || {}).name || m.data.skillSet) + '」';
    return m.packs.length + ' 个子包：' + m.packs.map(function (x) { return KIND[x.kind] + '「' + x.title + '」'; }).join('、');
  }
  UI.doImport = function () {
    var res = S && S.res; if (!res || !res.ok) return;
    var r = M.install(res.mod);
    if (!r.ok) { say(r.reason, 'bad'); return; }
    var box = $('mdBox'); while (box && box.firstChild) box.removeChild(box.firstChild); S.res = null; var tx = $('mdText'); if (tx) tx.value = '';
    say('已导入「' + res.mod.title + '」（' + r.n + ' 个）：' + r.reason, r.saved ? 'good' : 'bad'); UI.refreshList();
    if (XY.xcharAfter && r.chars) XY.xcharAfter();
  };

  UI.refreshList = function () {
    var box = $('mdList'); if (!box || !UI.isOpen) return; while (box.firstChild) box.removeChild(box.firstChild);
    var items = M.store.list(); $('mdCount').textContent = ' （' + items.length + ' / ' + M.MAX_MODS + '）';
    if (!items.length) { box.appendChild(el('div', 'mdSub', '还没有。贴一个玩法包试试吧。')); return; }
    items.forEach(function (e) {
      var m = e.mod, row = el('div', 'mdMine'), t = el('div', 'mdTxt'); t.appendChild(el('b', '', m.title)); t.appendChild(document.createTextNode('  '));
      t.appendChild(seal('非官方')); t.appendChild(el('div', '', KIND[m.kind] + (m.author ? ' · ' + m.author : '') + (m.kind === 'character' ? (XY.xchar && XY.xchar.get('x_' + m.data.handle.toLowerCase()) ? ' · 已登记为自建角色' : ' · 名额满，未登记') : '')));
      row.appendChild(t);
      if (m.kind === 'level') row.appendChild(btn(null, '开始', 'pri', function () { UI.close(); if (XY.startMod) XY.startMod(m.id); }));
      var del = btn(null, '删除', 'dan', function () {
        if (delArm !== m.id) { delArm = m.id; del.textContent = '再点一次删除'; setTimeout(function () { if (delArm === m.id) { delArm = null; if (del.parentNode) del.textContent = '删除'; } }, 3000); return; }
        delArm = null; if (m.kind === 'character' && XY.xchar) { var xr = XY.xchar.get('x_' + m.data.handle.toLowerCase()); if (xr && xr.mod && xr.mod.id === m.id) XY.xchar.remove(xr.id); }
        M.store.remove(m.id); say('已删除「' + m.title + '」', 'good'); UI.refreshList(); if (XY.xcharAfter) XY.xcharAfter();
      });
      row.appendChild(del); box.appendChild(row);
    });
  };

  /* ---------- 链接入口：#mod=<base64url(deflate(JSON))>（先弹确认，不自动导入）/ #play=stage:N | dungeon:id | mod:id ---------- */
  UI.boot = function () {
    var h = (window.location && window.location.hash) || '', m;
    if (!h || h.length < 6) return;
    function clear() { try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) {} }
    if ((m = /^#mod=(.*)$/.exec(h))) { clear(); var res = M.fromHash(m[1]); if (XY.app) XY.app.screen = 'start'; UI.open('link', res); return; }
    if ((m = /^#play=(.*)$/.exec(h))) {
      clear(); var r = XY.playLink(decodeURIComponent(m[1]));
      if (r && !r.ok && XY.app && !XY.app.menuMsg) XY.app.menuMsg = { text: r.reason, bad: true, until: XY.app.rt + 4 };
    }
  };
})();
