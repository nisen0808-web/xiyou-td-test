/* ============================================================
 * xchar_ui.js —— v0.8.1：「自建角色」界面（DOM 浮层：手机上输入框 / 相册选图都要用原生控件）
 *  流程：填 X 账号 → 导入头像（取不到就从相册选 / 用字母头像）→ 预览（动起来的水墨小人 + 技能 + 数值）→ 「换一套技能」→ 确认创建
 *  下面还有「我的自建角色」列表：带上 / 删除。所有数据只写本机 localStorage（xchar.js）。
 *  浅色界面；输入框 16px（iOS 不会自动放大页面）；按钮最小高度 46px。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, XC = XY.xchar, UI = XY.xcharUI = { isOpen: false, from: '' };
  var root = null, S = null, timer = 0, delArm = null, FONT = (XY.C && XY.C.FONT) || 'sans-serif';
  var STEP = ['待机', '待机', '行走', '行走', '行走', '行走', '起手', '出招'];

  function css() {
    if (document.getElementById('xcStyle')) return;
    var s = document.createElement('style'); s.id = 'xcStyle';
    s.textContent = [
      '#xcRoot{position:fixed;left:0;top:0;right:0;bottom:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(60,48,30,.38);font-family:' + FONT + ';-webkit-tap-highlight-color:transparent}',
      '#xcRoot *{box-sizing:border-box}',
      '#xcPanel{width:min(94vw,560px);max-height:94vh;overflow:auto;-webkit-overflow-scrolling:touch;background:#fffaf0;border:2px solid #c9a24a;border-radius:16px;padding:14px 16px 16px;color:#3a2f1c;box-shadow:0 8px 30px rgba(80,60,20,.25)}',
      '#xcPanel h2{margin:0;font-size:20px;line-height:1.3;color:#7a4b12}',
      '#xcPanel .xcSub{font-size:13px;color:#7b6c4c;margin:2px 0 10px;line-height:1.5}',
      '#xcPanel .xcRow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0}',
      '#xcPanel input[type=text]{flex:1 1 180px;min-width:0;height:46px;font-size:16px;padding:0 12px;border:2px solid #d8c48e;border-radius:10px;background:#fff;color:#3a2f1c;font-family:inherit;outline:none}',
      '#xcPanel input[type=text]:focus{border-color:#c9822a}',
      '#xcPanel button{min-height:46px;min-width:46px;padding:0 14px;font-size:15px;font-family:inherit;border-radius:10px;border:2px solid #c9a24a;background:#fff3cf;color:#6b4410;cursor:pointer;touch-action:manipulation}',
      '#xcPanel button.pri{background:#f0b429;border-color:#b8863b;color:#3a2410;font-weight:bold}',
      '#xcPanel button.dan{border-color:#c4685a;background:#fff0ec;color:#9a3a2c}',
      '#xcPanel button:disabled{opacity:.5}',
      '#xcStatus{min-height:20px;font-size:13px;line-height:1.5;color:#7b6c4c}',
      '#xcStatus.bad{color:#b0412e}#xcStatus.good{color:#3d7a3a}',
      '#xcPreview{display:flex;gap:12px;flex-wrap:wrap;border:1.5px dashed #d8c48e;border-radius:12px;padding:10px;background:#fffdf6;margin:8px 0}',
      '#xcPreview canvas{width:216px;height:288px;max-width:100%;background:#f7f1e3;border-radius:10px;flex:0 0 auto;margin:0 auto;box-shadow:0 1px 6px rgba(90,60,20,.18)}',
      '#xcPreview .xcInfo{flex:1 1 200px;min-width:0;font-size:13px;line-height:1.65}',
      '#xcPreview .xcInfo b{color:#7a4b12}',
      '.xcMine{display:flex;gap:10px;align-items:center;border:1.5px solid #e4d5a6;border-radius:12px;padding:8px;background:#fff;margin:6px 0}',
      '.xcMine img{width:48px;height:48px;border-radius:50%;border:2px solid #b8863b;flex:0 0 auto;background:#f3ead2}',
      '.xcMine img.xcCard{width:54px;height:72px;border-radius:8px}',
      '.xcMine .xcTxt{flex:1 1 auto;min-width:0;font-size:13px;line-height:1.45}',
      '.xcMine .xcTxt b{font-size:15px;color:#5a3a10}',
      '.xcPriv{font-size:12.5px;color:#6a7d52;margin:-4px 0 8px;line-height:1.5}',
      '@media (max-height:430px){#xcPanel{padding:8px 12px 10px}#xcPanel .xcSub{margin-bottom:4px}}'
    ].join('');
    document.head.appendChild(s);
  }
  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function say(t, cls) { var e = $('xcStatus'); if (e) { e.textContent = t || ''; e.className = cls || ''; } S.msg = t || ''; S.msgCls = cls || ''; }

  UI.open = function (from) {
    if (UI.isOpen) return;
    css(); UI.isOpen = true; UI.from = from || ''; S = { handle: '', pv: null, busy: false, msg: '', msgCls: '' };
    root = document.createElement('div'); root.id = 'xcRoot';
    root.innerHTML = '<div id="xcPanel" role="dialog" aria-label="自建角色">' +
      '<div class="xcRow" style="justify-content:space-between;margin-top:0"><h2>自建角色</h2><button id="xcClose" aria-label="关闭">关闭 ✕</button></div>' +
      '<div class="xcSub">输入你的 X 账号，导入头像，生成一位专属的特殊人物：头像和形象都是你的账号，技能从现有特殊人物里随机抽一套。</div>' +
      '<div class="xcPriv">🔒 角色只保存在本机，别人看不到。（存在这台手机 / 这个浏览器里，不会上传到任何地方；清除浏览器数据会一起删掉。）</div>' +
      '<div class="xcRow"><input id="xcHandle" type="text" inputmode="url" autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false" enterkeyhint="go" maxlength="80" placeholder="@PhyrexNi 或 x.com/PhyrexNi" aria-label="X 账号">' +
      '<button id="xcImport" class="pri">导入头像</button></div>' +
      '<div class="xcRow" style="margin-top:0"><button id="xcPick">从相册选图</button><button id="xcInit">用生成的字母头像</button><input id="xcFile" type="file" accept="image/*" style="display:none"></div>' +
      '<div id="xcStatus" aria-live="polite"></div>' +
      '<div id="xcPreviewBox"></div>' +
      '<h2 style="font-size:16px;margin-top:12px">我的自建角色 <span id="xcCount" style="font-size:13px;color:#7b6c4c"></span></h2><div id="xcList"></div>' +
      '</div>';
    document.body.appendChild(root);
    ['keydown', 'keyup', 'keypress'].forEach(function (ev) { root.addEventListener(ev, function (e) { e.stopPropagation(); if (ev === 'keydown' && e.key === 'Escape') UI.close(); if (ev === 'keydown' && e.key === 'Enter' && e.target && e.target.id === 'xcHandle') { e.preventDefault(); doImport(); } }); });
    root.addEventListener('mousedown', function (e) { if (e.target === root) UI.close(); });
    document.addEventListener('keydown', onDocKey, true);
    $('xcClose').onclick = UI.close; $('xcImport').onclick = doImport; $('xcPick').onclick = doPick; $('xcInit').onclick = doInitial;
    $('xcFile').onchange = function () { var f = this.files && this.files[0]; this.value = ''; if (f) fromFile(f); };
    XC.onArt = XC.onArt || []; if (XC.onArt.indexOf(UI.refreshList) < 0) XC.onArt.push(UI.refreshList);
    UI.refreshList(); say('');
    if (XY.app) XY.app.xcOpen = true;
  };
  UI.close = function () {
    if (!UI.isOpen) return; UI.isOpen = false; clearInterval(timer); timer = 0; document.removeEventListener('keydown', onDocKey, true);
    if (root && root.parentNode) root.parentNode.removeChild(root); root = null; if (XY.app) XY.app.xcOpen = false;
    if (XY.xcharAfter) XY.xcharAfter();
  };

  // 焦点不在浮层里（比如刚删完一项，按钮没了）时的按键：Esc 关浮层，其余不让游戏收到
  function onDocKey(e) { if (!UI.isOpen || (root && root.contains(e.target))) return; e.stopPropagation(); if (e.key === 'Escape') UI.close(); }
  function parse() { var p = XC.parseHandle($('xcHandle').value); if (!p.ok) { say(p.reason, 'bad'); return null; } return p; }
  function busy(b) { S.busy = b; ['xcImport', 'xcPick', 'xcInit'].forEach(function (i) { if ($(i)) $(i).disabled = b; }); }

  function doImport() {
    if (S.busy) return; var p = parse(); if (!p) return;
    busy(true); say('正在取 @' + p.handle + ' 的头像…');
    XC.fetchAvatar(p.handle).then(function (r) {
      if (!UI.isOpen) return; busy(false);
      if (r.ok) { say('已取到头像（来源：' + r.src + '）', 'good'); preview(p, r.avatar, r.src === 'unavatar' ? 'unavatar' : r.src); }
      else say('没取到 @' + p.handle + ' 的头像：账号名可能不对，或者网络 / 头像服务暂时不可用。你可以点「从相册选图」用自己的图，或「用生成的字母头像」，也可以稍后再试。', 'bad');
    });
  }
  function doPick() { if (S.busy) return; if (!parse()) return; $('xcFile').click(); }
  function fromFile(f) {
    var p = parse(); if (!p) return; busy(true); say('正在处理图片…');
    XC.fromFile(f).then(function (d) { if (!UI.isOpen) return; busy(false); say('已用相册里的图片做头像', 'good'); preview(p, d, 'local'); }, function (e) { if (!UI.isOpen) return; busy(false); say('这张图用不了（' + (e && e.message === 'too-big' ? '超过 12MB' : '不是可读的图片') + '），换一张试试', 'bad'); });
  }
  function doInitial() { if (S.busy) return; var p = parse(); if (!p) return; say('已生成字母头像', 'good'); preview(p, XC.initialAvatar(p.handle), 'initial'); }

  /* ---------- 预览 ---------- */
  function preview(p, avatar, src) {
    var im = new Image(), old = XC.get(p.id);
    im.onload = function () {
      if (!UI.isOpen) return;
      XC.analyze(p.id, avatar, im);
      S.pv = { p: p, avatar: avatar, src: src, im: im, kitN: old ? old.kitN : 0, name: old ? old.name : p.handle, frame: 0 };
      drawPreview(); clearInterval(timer); timer = setInterval(tick, 170);
    };
    im.onerror = function () { say('头像解码失败，换一张试试', 'bad'); };
    im.src = avatar;
  }
  function pvRec() { var v = S.pv; return { id: v.p.id, handle: v.p.handle, name: v.name, avatar: v.avatar, kitN: v.kitN }; }
  var SRC = { unavatar: '来自 X 账号头像（unavatar）', microlink: '来自 X 账号头像（microlink）', local: '你选的相册图片', initial: '程序生成的字母头像' };
  function drawPreview() {
    var v = S.pv, box = $('xcPreviewBox'); if (!v || !box) return;
    var rec = pvRec(), def = XC.build(rec), st = def.stats, base = XY.SP_BY[def.kit];
    v.def = def;
    var keep = $('xcName') ? $('xcName').value : null;
    box.innerHTML = '<div id="xcPreview"><canvas id="xcCv" width="432" height="576"></canvas><div class="xcInfo">' +
      '<div><b>' + esc('@' + v.p.handle) + '</b> · ' + SRC[v.src] + '</div>' +
      '<div class="xcRow" style="margin:4px 0"><label for="xcName" style="font-size:13px">显示名</label><input id="xcName" type="text" maxlength="12" value="' + esc(keep == null ? v.name : keep) + '" style="flex:1 1 120px;height:40px"></div>' +
      '<div><b>形象：</b>水墨「' + esc(XC.tplName(rec)) + '」（按账号名固定挑选，袍色取自头像）</div>' +
      '<div><b>技能：</b>与「' + esc(base.name) + '」同款（' + esc(base.role) + '）</div>' +
      '<div><b>大招：</b>' + esc(base.ult || '—') + '</div>' +
      '<div><b>数值：</b>生命 ' + def.hp + '（原型 ' + base.hp + '）· 速度 ' + def.speed + '（原型 ' + base.speed + '）· 物防 ' + Math.round(def.pdef * 100) + '% · 法防 ' + Math.round(def.mdef * 100) + '%</div>' +
      '<div style="color:#7b6c4c">数值由账号名决定，整体不高于「' + esc(base.name) + '」。</div>' +
      '<div class="xcRow"><button id="xcReroll">换一套技能</button><button id="xcConfirm" class="pri">确认创建</button><button id="xcCancel">取消</button></div>' +
      '</div></div>';
    $('xcName').oninput = function () { v.name = this.value; };
    $('xcReroll').onclick = function () { v.kitN++; v.name = $('xcName').value; drawPreview(); };
    $('xcCancel').onclick = function () { clearInterval(timer); timer = 0; S.pv = null; $('xcPreviewBox').innerHTML = ''; say(''); };
    $('xcConfirm').onclick = confirm;
    tick(true);
  }
  function tick(still) {
    var v = S.pv, cv = $('xcCv'); if (!v || !cv) return; if (still !== true) v.frame = (v.frame + 1) % 8;
    var c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    var cw = Math.round(cv.height * 0.75), ox = Math.round((cv.width - cw) / 2); c.save(); c.translate(ox, 0); c.beginPath(); c.rect(0, 0, cw, cv.height); c.clip(); XC.drawCard(c, cw, cv.height, pvRec(), v.def, v.im, v.frame * 0.9, { paper: true }); c.restore();
    cv.setAttribute('data-frame', v.frame); cv.title = STEP[v.frame];
  }
  function confirm() {
    var v = S.pv; if (!v) return; v.name = $('xcName').value.trim() || v.p.handle;
    var rec = pvRec(); rec.avSrc = v.src; rec.name = v.name;
    var r = XC.add(rec);
    if (!r.ok) { say(r.reason, 'bad'); return; }
    clearInterval(timer); timer = 0; S.pv = null; $('xcPreviewBox').innerHTML = ''; $('xcHandle').value = '';
    say('已创建「' + r.rec.name + '」（@' + r.rec.handle + '）：' + r.reason, r.saved ? 'good' : 'bad');
    UI.refreshList(); if (XY.xcharAfter) XY.xcharAfter(r.rec);
  }

  /* ---------- 我的自建角色 ---------- */
  UI.refreshList = function () {
    var box = $('xcList'); if (!box || !UI.isOpen) return;
    $('xcCount').textContent = '（' + XC.list.length + ' / ' + XC.MAX + '）';
    if (!XC.list.length) { box.innerHTML = '<div class="xcSub">还没有。导入一个 X 账号试试吧。</div>'; return; }
    var cur = XY.save.carryId && XY.save.carryId();
    box.innerHTML = XC.list.map(function (r) {
      var d = XY.SP_BY[r.id];
      return '<div class="xcMine" data-id="' + r.id + '"><img alt="" class="' + (XC.artReady(r.id) ? 'xcCard' : '') + '" src="' + ((XC.artReady(r.id) && XC.cardURL(r.id)) || r.avatar) + '"><div class="xcTxt"><b>' + esc(r.name) + '</b> <span style="color:#7b6c4c">@' + esc(r.handle) + '</span><br>技能同「' + esc(d.kitName) + '」' + (XC.artReady(r.id) ? '' : ' · 形象生成中…') + (cur === r.id ? ' · <span style="color:#3d7a3a">本关常驻</span>' : '') + '</div>' +
        '<button class="xcCarry" data-id="' + r.id + '">' + (cur === r.id ? '取消常驻' : '带上') + '</button><button class="xcDel dan" data-id="' + r.id + '">删除</button></div>';
    }).join('');
    Array.prototype.forEach.call(box.querySelectorAll('.xcCarry'), function (b) { b.onclick = function () {
      var id = b.getAttribute('data-id'), cur2 = XY.save.carryId && XY.save.carryId(), res = cur2 === id ? XY.save.setCarry(null) : XY.save.setCarry(id);
      say(res.reason, res.ok ? 'good' : 'bad'); UI.refreshList(); if (XY.xcharAfter) XY.xcharAfter();
    }; });
    Array.prototype.forEach.call(box.querySelectorAll('.xcDel'), function (b) { b.onclick = function () {
      var id = b.getAttribute('data-id');
      if (delArm !== id) { delArm = id; b.textContent = '再点一次删除'; setTimeout(function () { if (delArm === id) { delArm = null; if (b.parentNode) b.textContent = '删除'; } }, 3000); return; }
      delArm = null; var nm = XC.get(id).name; XC.remove(id); say('已删除「' + nm + '」', 'good'); UI.refreshList(); if (XY.xcharAfter) XY.xcharAfter();
    }; });
  };

  XC.load();
})();
