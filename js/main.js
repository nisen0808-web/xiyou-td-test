/* ============================================================
 * main.js —— 入口：画布尺寸、键盘/鼠标输入、界面切换、主循环
 * 界面(app.screen)：start 主菜单 / levels 关卡选择 / shop 商店 / deck 组牌 / dex 图鉴 / unlock 解锁·皮肤 / play 游戏中 / pause 暂停 / win 胜利 / lose 失败
 * 技能树打开时是游戏中的一种状态(G.mode === 'skills')，游戏暂停
 * ============================================================ */
(function () {
  var XY = window.XY, C = XY.C;
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  if (!ctx) { if (window.XY_fail) window.XY_fail('这个浏览器不能画图（canvas）'); return; }

  var app = XY.app = {
    screen: 'start', levelId: 1, summon: null, moveMark: null, mm: { holding: false, downAt: 0, sx: 0, sy: 0, dest: null }, lw: 1280, lh: 720, zoom: 1, dpr: 1, rt: 0,
    mouse: null, fps: 60,
    // 调试键默认关闭：网址加 ?debug=1 打开，或者游戏里按 Shift+F9 切换
    debugOn: /[?&]debug(=1|=true)?(&|#|$)/.test(location.search),
    skillTab: 1, skillMsg: null, build: null, selTower: null,
    touchUI: !!(window.XY_TOUCH_UI || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)),      // 触屏设备：显示屏幕上的“暂停 / Esc”按钮
    confirm: null, deckSel: null, dexTab: 'enemy', dexSel: null, menuMsg: null
  };
  app.showFps = app.debugOn;
  var G = null, keys = {}, acc = 0, last = performance.now();
  var SPEEDS = [1, 2, 4, 8];

  /* ---------- 画布尺寸：窗口多大就画多大，整体按比例缩放 ---------- */
  XY.uiScale = function (cssW, cssH) {
    if (cssW < 1100 || cssH < 700) return 1;
    var fit = Math.min(cssW / 1280, cssH / 720);
    return fit > 1.05 ? Math.min(fit, 3.5) : 1;
  };
  XY.kToLog = function (app, v) {
    var z = app.zoom || 1, s = XY.uiScale(app.lw * z, app.lh * z);
    return v * s / z;
  };
  XY.WIDE_MAX = 2.0;
  /* 超宽屏两侧的留白：浅色宣纸底上几团淡墨，越往外墨色越重；贴着画面的那一边有一道很淡的墨影，像装裱过的画心。
   * 不盖住画面（边上的「返回」「更多」「队伍」都要看得清），只是装饰，不接收点击。 */
  function wideBands(fx, w, full) {
    var L = document.getElementById('wideL'), R = document.getElementById('wideR');
    if (fx <= 0) { if (L) L.style.display = 'none'; if (R) R.style.display = 'none'; return; }
    function mk(id) { var e = document.createElement('div'); e.id = id; e.setAttribute('aria-hidden', 'true'); e.style.cssText = 'position:fixed;top:0;bottom:0;pointer-events:none;z-index:4'; document.body.appendChild(e); return e; }
    if (!L) L = mk('wideL'); if (!R) R = mk('wideR');
    var blot = 'radial-gradient(ellipse 72% 34% at SIDE1 20%, rgba(52,46,38,.15), rgba(52,46,38,0) 70%),radial-gradient(ellipse 95% 28% at SIDE2 74%, rgba(52,46,38,.12), rgba(52,46,38,0) 72%),radial-gradient(ellipse 60% 20% at SIDE1 48%, rgba(120,104,78,.10), rgba(120,104,78,0) 70%),';
    function wash(dir) { return 'linear-gradient(' + dir + ', rgba(58,48,36,.20) 0, rgba(58,48,36,.07) 10px, rgba(58,48,36,0) 30px),linear-gradient(' + dir + ', #efe7d3 0%, #e7dfcc 48%, #d8d0bd 100%)'; }
    L.style.display = R.style.display = 'block';
    L.style.left = '0'; L.style.width = fx + 'px';
    L.style.background = blot.replace(/SIDE1/g, '22%').replace(/SIDE2/g, '34%') + wash('to left');
    R.style.right = '0'; R.style.width = (full - fx - w) + 'px';
    R.style.background = blot.replace(/SIDE1/g, '78%').replace(/SIDE2/g, '66%') + wash('to right');
  }
  function resize() {
    var w = window.innerWidth, h = window.innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 4);
    app.dpr = dpr;
    // 超宽屏：桌面窗口比 2:1 还宽时，整个画面按 2:1 居中，两侧留墨色淡出（wideBands）。手机横屏（高度不到 600）不走这条，仍用紧凑排版。
    var full = w, fx = 0;
    if (h >= 600 && w / h > XY.WIDE_MAX) { w = Math.round(h * XY.WIDE_MAX); fx = Math.round((full - w) / 2); }
    app.frame = { x: fx, w: w, full: full, h: h };
    var fit = Math.min(w / 1280, h / 720);
    app.zoom = Math.max(0.5, Math.min(fit, 3.5));      // 下限 0.5 保住手机横屏；大屏按 1280×720 设计放大，不再卡在 1.4 让字缩在角落
    app.lw = w / app.zoom; app.lh = h / app.zoom;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; canvas.style.marginLeft = fx + 'px';
    wideBands(fx, w, full);
    var bfr = document.getElementById('bossfightFrame'); if (bfr) { bfr.style.left = fx + 'px'; bfr.style.width = fx > 0 ? w + 'px' : '100%'; }
    if (G) { G.view.w = app.lw; G.view.h = app.lh; }
    if (XY.portraitHint) XY.portraitHint();
  }
  window.addEventListener('resize', resize);
  // 手机转屏：iOS 常常在转完后一会儿才报新的宽高，所以再补两次；地址栏伸缩（visualViewport）也跟着量
  function resizeLater() { resize(); setTimeout(resize, 150); setTimeout(resize, 600); }
  window.addEventListener('orientationchange', resizeLater);
  if (window.visualViewport && window.visualViewport.addEventListener) window.visualViewport.addEventListener('resize', resize);
  // 竖屏提示：只在战斗中出现，贴在顶栏下面，不压灵石、等级和当前目标。点「知道了」或八秒后消失。
  var portraitDismissed = false;
  function placePortrait(el) {
    var dpr = (XY.app && XY.app.dpr) || window.devicePixelRatio || 1;
    var bodies = (XY.R4 && XY.R4.bodyRects) || [];
    var W = window.innerWidth, H = window.innerHeight, hw = Math.min(228, W - 16), hh = 36;
    var boxes = bodies.map(function (b) {
      var c = { x: b.x0 / dpr, y: b.y0 / dpr, w: (b.x1 - b.x0) / dpr, h: (b.y1 - b.y0) / dpr };
      var cloud = Math.max(16, c.h * 0.55);
      c.x -= cloud * 0.35; c.w += cloud * 0.7; c.h += cloud;
      return c;
    });
    function area(r) {
      if (r.x < -0.5 || r.y < -0.5 || r.x + r.w > W + 0.5 || r.y + r.h > H + 0.5) return 1;
      var a = 0, i, b, w, h;
      for (i = 0; i < boxes.length; i++) {
        b = boxes[i];
        w = Math.min(r.x + r.w, b.x + b.w) - Math.max(r.x, b.x);
        h = Math.min(r.y + r.h, b.y + b.h) - Math.max(r.y, b.y);
        if (w > 0 && h > 0) a += w * h;
      }
      return a;
    }
    var port = H > W, bar = H - (port ? 168 : 124), best = null, y, x, r;
    for (y = bar - hh - 6; y >= 92 && !best; y -= 10) {
      for (x = 8; x <= W - hw - 8; x += Math.max(20, Math.round((W - hw) / 5))) {
        r = { x: x, y: y, w: hw, h: hh };
        if (area(r) === 0) { best = r; break; }
      }
    }
    if (!best) best = { x: 8, y: Math.max(8, bar - hh - 4), w: hw, h: hh };
    el.style.left = Math.round(best.x) + 'px';
    el.style.top = Math.round(best.y) + 'px';
    el.style.maxWidth = Math.round(hw) + 'px';
    XY.R4 = XY.R4 || {};
    XY.R4.hintBox = { x: best.x, y: best.y, w: best.w, h: best.h, hit: area(best) };
  }
  function portraitHint() {
    var touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    var portrait = window.innerHeight > window.innerWidth * 1.1;
    var Gnow = window.__xy && window.__xy.G;
    var playing = XY.app && XY.app.screen === 'play' && (!Gnow || Gnow.mode === 'play') && !(XY.gacha10 && XY.gacha10.blocking && XY.gacha10.blocking());
    var el = document.getElementById('xyPortrait');
    if (touch && portrait && playing && !portraitDismissed) {
      if (!el) {
        el = document.createElement('div');
        el.id = 'xyPortrait';
        el.style.cssText = 'position:fixed;left:8px;top:8px;z-index:35;max-width:228px;padding:4px 8px 6px;pointer-events:auto;color:#2b1c08;font:16px/1.2 "Ma Shan Zheng","KaiTi","STKaiti","楷体",serif;letter-spacing:1px;text-shadow:0 0 2px rgba(246,238,220,.96);background:linear-gradient(90deg,rgba(243,234,214,.94),rgba(243,234,214,.2));border:0;white-space:nowrap;opacity:.96';
        el.appendChild(document.createTextNode('竖着也能，请横过来'));
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = '知道了';
        btn.style.cssText = 'margin-left:8px;padding:0 4px;border:0;background:transparent;color:#a83224;font:inherit;cursor:pointer';
        btn.onclick = function () { portraitDismissed = true; if (el.parentNode) el.parentNode.removeChild(el); };
        el.appendChild(btn);
        (document.body || document.documentElement).appendChild(el);
        setTimeout(function () { portraitDismissed = true; if (el.parentNode) el.parentNode.removeChild(el); }, 8200);
      }
      placePortrait(el);
    } else if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  XY.portraitHint = portraitHint;

  /* ---------- 开始 / 重开 ---------- */
  function fresh() {
    releaseHeldInput();
    var modRec = app.modId ? XY.mod.store.get(app.modId) : null; if (app.modId && !modRec) app.modId = null;
    G = XY.newGame(app.levelId, app.villain ? { villain: true } : app.lair ? { lair: app.lair } : modRec && modRec.kind === 'level' ? { mod: modRec } : app.dungeonId ? { dungeon: app.dungeonId } : null); app.build = null; app.selTower = null; app.summon = null; app.moveMark = null; app.mm.holding = false; app.mm.dest = null;
    G.view.w = app.lw; G.view.h = app.lh; app.partyPanel = false;          // v0.9 换关 / 回菜单：队伍面板收起、时间解冻
    var h = G.heroes[G.ctrl]; G.cam.x = h.x; G.cam.y = h.y;
    XY.G = G;
  }
  // 中途放弃（回首页 / 重开）也记一局：时间和击杀照算
  function abandon() { if (G && !G.committed && G.t > 3 && (app.screen === 'play' || app.screen === 'pause')) XY.save.commitRun(G, 'abandon'); }
  function startGame(levelId, dungeonId) {
    var dlg = document.getElementById('refDlg'); if (dlg) dlg.remove();
    if (XY.wildAnim && XY.wildAnim.arm) XY.wildAnim.arm();
    abandon(); app.retStack = [];
    if (typeof levelId === 'number') { app.levelId = levelId; app.dungeonId = null; app.modId = null; app.villain = false; app.lair = null; }      // 点选关出发 = 普通关；副本入口传 dungeonId；R / 再来一局 保持上一次的选择
    if (dungeonId && XY.dungeonOf(dungeonId) && XY.save.dngUnlocked(dungeonId)) { app.dungeonId = dungeonId; app.modId = null; }
    if (!app.modId && !XY.save.levelUnlocked(app.levelId)) app.levelId = 1;
    fresh(); app.screen = 'play'; acc = 0; app.confirm = null;
    if (app.dungeonId && XY.villainUI && XY.villainUI.tipDom) XY.villainUI.tipDom('dungeon');      // v0.9：进副本后弹提示，此时已是 play，tipHold 才能冻住战斗
    if (XY.audio) { XY.audio.init(); if (XY.audio.bgmStart) XY.audio.bgmStart('play'); } if (XY.sfx) XY.sfx('start');
  }
  function openDeparture() {
    var go = function () { app.screen = 'levels'; };
    if (XY.lazy && XY.lazy.on) XY.lazy.enter(go);
    else go();
  }
  function goHome() { abandon(); app.retStack = []; app.dungeonId = null; app.modId = null; app.villain = false; app.lair = null; fresh(); app.screen = 'start'; if (XY.audio && XY.audio.bgmStart) XY.audio.bgmStart('menu'); }
  function toMenu() { app.dungeonId = null; app.modId = null; app.villain = false; app.lair = null; fresh(); app.screen = (app.retStack && app.retStack.length) ? app.retStack.pop() : 'start'; app.confirm = null; if (XY.audio && XY.audio.bgmStart) XY.audio.bgmStart('menu'); }     // v0.8.7b：返回回到“上一页”（出发页进的洞府阁 / 商店 / 排行榜 / 反派，返回都回出发页；栈空 = 首页）     // 从子界面回主菜单（刷新预览里的皮肤）
  // v0.9 反派关 / 洞府验关：从反派首页 / 洞府设计页出发（只用方向键）
  function startVillain() { if (XY.wildAnim && XY.wildAnim.arm) XY.wildAnim.arm(); abandon(); app.retStack = []; app.dungeonId = null; app.modId = null; app.lair = null; app.villain = true; app.levelId = 1; fresh(); app.screen = 'play'; acc = 0; app.confirm = null; if (XY.audio) { XY.audio.init(); if (XY.audio.bgmStart) XY.audio.bgmStart('play'); } if (XY.sfx) XY.sfx('start'); }
  function startLair(opts) { if (XY.wildAnim && XY.wildAnim.arm) XY.wildAnim.arm(); abandon(); app.retStack = []; app.dungeonId = null; app.modId = null; app.villain = false; app.lair = opts; app.levelId = 1; fresh(); app.screen = 'play'; acc = 0; app.confirm = null; if (XY.audio) { XY.audio.init(); if (XY.audio.bgmStart) XY.audio.bgmStart('play'); } if (XY.sfx) XY.sfx('start'); }
  function msg(text, bad) { app.menuMsg = { text: text, bad: !!bad, until: app.rt + 3 }; }

  function pause() { if (app.screen === 'play' && G.mode === 'play') { app.partyPanel = false; app.screen = 'pause'; } }   // 正式暂停菜单优先：队伍面板先收起，不抢点击
  function resume() { if (app.screen === 'pause') { app.screen = 'play'; last = performance.now(); } }

  /* ---------- 键盘 ---------- */
  function updateMove() {
    var mx = 0, my = 0, mm = app.mm;
    if (keys.KeyA || keys.ArrowLeft) mx -= 1;
    if (keys.KeyD || keys.ArrowRight) mx += 1;
    if (keys.KeyW || keys.ArrowUp) my -= 1;
    if (keys.KeyS || keys.ArrowDown) my += 1;
    if (!mx && !my && app.joy && app.joy.moved && (app.joy.ux || app.joy.uy)) { mx = app.joy.ux; my = app.joy.uy; }   // 触屏摇杆（键盘优先）
    if (mx || my) { mm.dest = null; app.moveMark = null; }              // 键盘 / 摇杆优先：有移动输入就取消鼠标目的地
    else if (G.mode === 'play' && !G.ending) {
      var c = G.heroes[G.ctrl], tx = null, ty = null;
      if (mm.holding && !G.villain && !G.lair && app.mouse && app.rt - mm.downAt >= C.MOUSE_HOLD) {   // 按住左键：朝光标持续走
        tx = app.mouse.x - G.view.w / 2 + G.cam.x; ty = app.mouse.y - G.view.h / 2 + G.cam.y;
      } else if (mm.dest) {
        tx = mm.dest.x; ty = mm.dest.y;
        if (XY.dist(c.x, c.y, tx, ty) < 14) { mm.dest = null; app.moveMark = null; tx = null; }
      }
      if (tx !== null) {
        var dx = tx - c.x, dy = ty - c.y, dl = Math.sqrt(dx * dx + dy * dy);
        if (dl > 12) { mx = dx / dl; my = dy / dl; }
      }
    }
    if (G.lair) { mx = 0; my = 0; }                                       // 洞府验关全自动：任何移动输入都无效
    G.input.mx = mx; G.input.my = my;                                   // 鼠标和键盘都只写这一个移动指令
  }

  window.addEventListener('keydown', function (e) {
    var k = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].indexOf(k) >= 0) e.preventDefault();
    if (XY.audio) { XY.audio.init(); if (k === 'KeyM' && !e.repeat) { XY.audio.setMute(!XY.audio.mute); var mm = XY.audio.mute ? '音效已关' : '音效已开'; if (app.screen === 'play' && G && XY.toast) XY.toast(G, mm); else msg(mm); } }   // 音频要等第一次按键 / 点击才能启动；M 静音（写入 localStorage xy_mute）
    if (introEl) { if (!e.repeat && (k === 'Escape' || k === 'Space' || k === 'Enter')) introEnd('skip'); return; }     // 开场视频播放中：这几个键 = 跳过，其余忽略
    if (e.repeat) { keys[k] = true; return; }
    if (!G) return;
    keys[k] = true;
    var s = app.screen;
    if (s === 'start') {
      if (app.confirm) { if (k === 'Escape') app.confirm = null; return; }
      if (k === 'Enter' || k === 'Space') openDeparture();
      return;
    }
    if (s === 'levels') {
      if (XY.gacha10 && XY.gacha10.overlay && XY.gacha10.overlay()) { if (k === 'ArrowLeft' || k === 'ArrowRight') { if (XY.gacha10.nudge) XY.gacha10.nudge(k === 'ArrowRight' ? 1 : -1); return; } if (k === 'Escape' || k === 'Enter' || k === 'Space') XY.gacha10.key(); return; }
      if (k === 'Escape') toMenu(); else if (k === 'Enter') { var dp = XY.depart; if (dp && dp.kind === 'dungeon' && XY.save.dngUnlocked(dp.id)) startGame(null, dp.id); else startGame(app.levelId); }
      return;
    }
    if (s === 'villain') { XY.villainUI.key(k, app); return; }
    if (s === 'board') { XY.boardUI.key(k, app); return; }
    if (s === 'hub') { XY.hubUI.key(k, app); return; }
    if (s === 'deck' || s === 'dex' || s === 'unlock' || s === 'shop' || s === 'dungeon') { if (k === 'Escape') toMenu(); return; }
    if (s === 'win' || s === 'lose') { if (k === 'KeyR' || k === 'Enter') startGame(); return; }
    if (s === 'pause') {
      if (k === 'Escape' || k === 'KeyP') resume(); else if (k === 'KeyR') startGame();
      return;
    }
    // —— 游戏中 ——
    if (G.villain) {
      XY.villain.noteInput('key', k);
      var vsk = { Digit1: 'fan', Numpad1: 'fan', KeyJ: 'fan', Digit2: 'charge', Numpad2: 'charge', KeyK: 'charge', Digit3: 'summon', Numpad3: 'summon', KeyL: 'summon' }[k];
      if (vsk && XY.villain.castByPlayer) { var vcr = XY.villain.castByPlayer(G, vsk); if (vcr && !vcr.ok) XY.toast(G, vcr.reason); return; }
      if (XY.villain.swallowKey(G, k)) return;
    }
    if (G.lair && app.screen === 'play' && !/^(Escape|KeyP|Period)$/.test(k) && !app.debugOn) return;          // v0.9 验关：玩家不操作，除暂停 / 变速外的键无效
    if (k === 'F9' && e.shiftKey) { app.debugOn = !app.debugOn; app.showFps = app.debugOn; XY.toast(G, app.debugOn ? '调试键：已打开' : '调试键：已关闭'); return; }
    if (G.mode === 'cards' && G.fb && XY.fabaoui) { XY.fabaoui.key(G, k, e.shiftKey); return; }
    if (G.mode === 'cards') {                         // 法宝三选一：1 2 3 选，Esc 放弃
      var cn = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[k];
      if (cn !== undefined) XY.cards.choose(G, cn); else if (k === 'Escape') XY.cards.choose(G, -1);
      return;
    }
    if (G.mode === 'vendor') { if(XY.inkHud&&XY.inkHud.vendorKey(G,app,k))return; if (k === 'KeyN' || k === 'Escape') XY.vendor.close(G); return; }
    if (k === 'KeyN' && G.mode === 'play' && app.screen === 'play') { XY.vendor.open(G); return; }
    if (k === 'KeyT' && G.mode === 'play') { XY.phyrexXform(G); return; }       // 满级 99 的 Phyrex 变身
    if (G.mode === 'skills') {                        // 技能树打开：Tab / Esc 关闭，1-5 选英雄页，6 全队页
      if(XY.inkHud&&XY.inkHud.skillKey(G,app,k))return;
      var tn = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Digit7: 9, Digit0: 9, Digit8: 10 }[k];
      if (k === 'Tab' || k === 'Escape') XY.toggleSkills(G, false);
      else if (k === 'KeyH') { if (app.skillTab === 11) XY.toggleSkills(G, false); else app.skillTab = 11; }      // v0.8.0：H = 菜单里的「操作说明」页
      else if (tn !== undefined) { if (tn === 9 || (tn === 10 && G.fb) || (tn < 9 && G.heroes[tn] && !G.heroes[tn].down)) app.skillTab = tn; }
      return;
    }
    if (app.partyPanel && (k === 'Escape' || k === 'KeyP')) { XY.party.close(app); return; }          // v0.9 队伍面板打开时：Esc / P 先收起面板
    var dg = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, Numpad5: 4, Numpad6: 5 }[k];
    if (dg !== undefined && dg >= G.heroes.length) dg = undefined;
    if (k === 'Tab') { app.skillTab = G.heroes[G.ctrl].down ? 0 : G.ctrl; XY.toggleSkills(G, true); }
    else if (dg !== undefined) { if (e.shiftKey) XY.cycleOrder(G, dg); else XY.switchHero(G, dg); }
    else if (k === 'Escape' && (app.build || app.selTower || app.summon)) { app.build = null; app.selTower = null; app.summon = null; }   // 先取消造塔/选塔
    else if (k === 'Escape' || k === 'KeyP') pause();
    else if (k === 'KeyF') XY.treat(G, app.selTower || null);                  // 犒赏：选中的天兵，没选就是身边最近的
    else if (k === 'KeyQ') XY.chooseRoute(G, 'N');                              // v0.8.4：岔路口选北线
    else if (k === 'KeyE') XY.chooseRoute(G, 'S');                              // v0.8.4：岔路口选南线
    else if (k === 'KeyG') XY.guest.summon(G);                                 // 召唤特殊人物
    else if (k === 'KeyH') { app.skillTab = 11; XY.toggleSkills(G, true); }                           // 操作说明面板：开局 40 秒自动显示，之后按 H 开 / 关
    // —— 调试键（默认关闭）——
    else if (!app.debugOn) { /* 调试键没打开，忽略 */ }
    else if (k === 'Period') { G.speed = SPEEDS[(SPEEDS.indexOf(G.speed) + 1) % SPEEDS.length]; }
    else if (k === 'Slash') XY.debug.skip60(G);
    else if (k === 'Semicolon') XY.debug.completeMain(G);
    else if (k === 'Quote') XY.debug.levelUp(G);
    else if (k === 'Backslash') XY.debug.coins(G);
    else if (k === 'Minus') XY.debug.god(G);
    else if (k === 'Equal') XY.debug.killAllBosses(G);
    else if (k === 'BracketLeft') app.showFps = !app.showFps;
    var tk = { KeyZ: 'arrow', KeyX: 'cannon', KeyC: 'frost', KeyV: 'siege', KeyB: 'heal' }[k];
    if (tk && G.mode === 'play') toggleBuild(tk);
    updateMove();
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; if (G) updateMove(); });
  // 屏幕上的“暂停 / 取消”按钮 = 键盘 Esc：先取消选点，再关面板，最后才暂停
  function doEsc() {
    if (!G) return;
    var s = app.screen;
    if (s === 'pause') { resume(); return; }
    if (s !== 'play') return;
    if (G.mode === 'cards') { XY.cards.choose(G, -1); return; }
    if (G.mode === 'vendor') { XY.vendor.close(G); return; }
    if (G.mode === 'skills') { XY.toggleSkills(G, false); return; }
    if (app.partyPanel) { XY.party.close(app); return; }
    if (app.build || app.selTower || app.summon) { app.build = null; app.selTower = null; app.summon = null; return; }
    pause();
  }
  XY.doEsc = doEsc;
  /* v0.8.7 Bot 启动：玩法包关卡开局 / 直达链接（#play=stage:N | dungeon:id | mod:id）。导入的关卡有自己的入口（app.modId），不走官方关卡表，不动官方关卡 */
  XY.startMod = function (id) {
    var m = XY.mod.store.get(id); if (!m || m.kind !== 'level') return false;
    app.modId = id; app.dungeonId = null; startGame(); return true;
  };
  XY.playLink = function (spec) {
    var m = /^(stage|dungeon|mod):(.{1,45})$/.exec(String(spec || '')), k, v, n;
    if (!m) return { ok: false, reason: '直达链接格式：#play=stage:2 / dungeon:heifeng / mod:你的包id' };
    k = m[1]; v = m[2];
    if (k === 'stage') {
      n = /^[1-9]\d?$/.test(v) ? +v : 0;
      if (!n || n > XY.LEVEL_COUNT) return { ok: false, reason: '没有第 ' + v + ' 关' };
      if (!XY.save.levelUnlocked(n)) { msg('第 ' + n + ' 关还没解锁：先通关上一关', true); return { ok: false, reason: '第 ' + n + ' 关还没解锁' }; }
      if (introEl) introEnd('link'); startGame(n); return { ok: true };
    }
    if (k === 'dungeon') {
      if (!XY.dungeonOf(v)) return { ok: false, reason: '没有这个洞府副本：' + v };
      if (!XY.save.dngUnlocked(v)) { msg('洞府副本还没开放：先通关第 1 关', true); return { ok: false, reason: '洞府副本还没开放' }; }
      if (introEl) introEnd('link'); startGame(1, v); return { ok: true };
    }
    var id = 'mod:' + v; if (!XY.mod.store.get(id)) { msg('这个玩法包还没导入：' + id, true); return { ok: false, reason: '这个玩法包还没导入' }; }
    if (introEl) introEnd('link'); return { ok: XY.startMod(id) };
  };
  function toggleBuild(type) {
    var price=XY.soldierCost(G,type),d=XY.TOWERS[type];
    if (app.build === type) app.build = null;
    else if (!XY.save.solOwned(type)) XY.toast(G,d.name+'还没有卡：打败 Boss / 开宝箱会掉天兵卡');
    else if (G.coins < price) XY.toast(G,'金币不够：'+d.name+'要 '+price+' 金币');
    else { app.build = type; app.selTower = null; app.summon = null; XY.toast(G, '点空地造' + d.name + '（右键 / Esc 取消）'); }
  }
  function releaseHeldInput() {
    for (var code in keys) delete keys[code];
    app.joy = null; app.mm.holding = false;
    if (G) updateMove();
  }
  window.addEventListener('blur', function () { releaseHeldInput(); pause(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { releaseHeldInput(); pause(); } });

  /* ---------- 鼠标 ---------- */
  function mpos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / app.zoom, y: (e.clientY - r.top) / app.zoom };
  }
  canvas.addEventListener('mousemove', function (e) { app.mouse = mpos(e); });
  canvas.addEventListener('mouseleave', function () { app.mouse = null; });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  function hitUI(p) {
    var hits = XY.ui.hits;
    for (var i = hits.length - 1; i >= 0; i--) { var h = hits[i]; if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return h; }
    return null;
  }
  function worldOf(p) { return { x: p.x - G.view.w / 2 + G.cam.x, y: p.y - G.view.h / 2 + G.cam.y }; }
  function setDest(w) {
    app.mm.dest = { x: XY.clamp(w.x, 20, C.WORLD_W - 20), y: XY.clamp(w.y, 20, C.WORLD_H - 20) };
    app.moveMark = { x: app.mm.dest.x, y: app.mm.dest.y, t: 0 };
  }
  window.addEventListener('mouseup', function (e) {
    if (e.button !== 0) return;
    var mm = app.mm;
    if (mm.holding) {
      mm.holding = false;
      if (app.rt - mm.downAt < C.MOUSE_HOLD && G && app.screen === 'play' && G.mode === 'play') setDest(mm.start);   // 短按 = 单击：设定目的地
    }
  });
  canvas.addEventListener('mousedown', function (e) { app.mouse = mpos(e); press(app.mouse, e.button, false); });
  // 按下：鼠标左 / 右键，或触屏的一次点按（touch = true 时，空地不开“按住走”，由虚拟摇杆负责）
  function press(p, button, touch) {
    if (introEl && !(app.intro && app.intro.playing)) introEnd('input');     // 视频还没开始播时玩家已经在点了：不再等视频
    var hits = XY.ui.hits;
    if (XY.audio) XY.audio.init();
    if (button === 2) {                               // 右键：造塔 / 选塔 / 选点模式下只取消；否则设目的地（点 UI 不算）
      if (app.screen !== 'play' || G.mode !== 'play' || hitUI(p)) return;
      if (G.villain || G.lair) return;
      if (app.build || app.selTower || app.summon) { app.build = null; app.selTower = null; app.summon = null; return; }
      setDest(worldOf(p)); return;
    }
    if (button !== 0) return;
    for (var i = hits.length - 1; i >= 0; i--) {
      var h = hits[i];
      if (p.x < h.x || p.x > h.x + h.w || p.y < h.y || p.y > h.y + h.h) continue;
      if (h.test && !h.test(p)) continue;                                      // 菜单人物（?menu=A）：按抠图 alpha 命中
      if (G && G.tut && app.screen === 'play' && XY.tutBlocks(G, h)) return;      // 新手教程：只有教程要你点的那个按钮能点
      if (XY.sfx && h.act !== 'spd2') XY.sfx('ui');                                                    // 按钮点按反馈（2× 连点不吵：交给 GAP）
      if (XY.villainUI && XY.villainUI.act && XY.villainUI.act(h, p, app)) return;                  // v0.9 反派模式的按钮
      if (XY.hubUI && XY.hubUI.act && XY.hubUI.act(h, p, app)) return;                             // v0.9 二级页「洞府阁」（首页「更多」红印 + 页内按钮）
      if (XY.boardUI && XY.boardUI.act && XY.boardUI.act(h, p, app)) return;                        // v0.9 排行榜页的按钮（含主菜单「排行榜」）
      switch (h.act) {
        case 'start': startGame(); break;
        case 'menuDeck': app.screen = 'deck'; app.deckSel = app.deckSel || XY.save.data.deck[0] || null; break;
        case 'menuDex': app.screen = 'dex'; break;
        case 'menuChar': XY.stage.sel = { id: h.id, until: app.rt + 3 }; break;
        case 'menuUnlock': app.screen = 'unlock'; break;
        case 'menuHow': XY.menu.how.open = !XY.menu.how.open; break;
        case 'menuTab': XY.menu.how.tab = h.i; XY.menu.how.open = true; break;
        case 'menuReset': app.confirm = { kind: 'reset' }; break;
        case 'back': toMenu(); break;
        case 'toggleVer': var nv = XY.version.toggle(); msg('已切换到' + XY.version.name(nv) + '：' + XY.version.desc(nv), false); app.verFlash = app.rt + 2.5; break;
        case 'menuRestart': app.confirm = { kind: 'journey' }; break;
        case 'confirmNo': app.confirm = null; break;
        case 'confirmYes':
          if (app.confirm && app.confirm.kind === 'journey') { XY.journey.restart(); app.levelId = 1; msg('取经之旅已重新开始：全队回到 Lv1，从第 1 关再出发'); }
          if (app.confirm && app.confirm.kind === 'reset') { XY.save.reset(); app.deckSel = null; app.dexSel = null; fresh(); msg('存档已清空，回到新手状态'); }
          app.confirm = null; break;
        case 'cardSel': app.deckSel = h.id; if(XY.CARD_BY[h.id])app.pvSet=XY.SET_ORDER.indexOf(XY.CARD_BY[h.id].set); break;
        case 'deckToggle': var tr = XY.save.toggleDeck(h.id); msg(tr.reason, !tr.ok); break;
        case 'cardUp': var ur = XY.save.upgradeCard(h.id); msg(ur.reason, !ur.ok); break;
        case 'dexTab': app.dexTab = h.tab; app.dexSel = null; break;
        case 'dexSel': app.dexSel = h.id; break;
        case 'dexStarter': app.dexStarter = !app.dexStarter; app.dexSel = null; break;
        case 'skinSet': var sr = XY.save.setSkin(h.hero, h.skin); if (!sr.ok) msg(sr.reason, true); break;
        case 'variantSet': var vr = XY.save.setHorseForm(h.form); if (!vr.ok) msg(vr.reason, true); break;
        case 'tutSkip': XY.tutFinish(G, true); break;
        case 'tutNext': XY.tutNext(G); break;
        case 'esc': doEsc(); break;
        case 'menuTutorial': XY.tutForce = true; startGame(1); break;
        case 'restart': startGame(); break;
        case 'home': goHome(); break;
        case 'resume': resume(); break;
        case 'bgSet': if (XY.setInkBg) XY.setInkBg(); break;
        case 'bg': if (XY.setInkBg) XY.setInkBg(); break;
        case 'muteTog': if (XY.audio) { XY.audio.init(); XY.audio.setMute(!XY.audio.mute); msg(XY.audio.mute ? '音效已关' : '音效已开'); } break;
        case 'muteSet': if (XY.audio) { XY.audio.init(); XY.audio.setMute(!!h.mute); msg(XY.audio.mute ? '音效已关' : '音效已开'); } break;
        case 'hero': var pc0 = G.ctrl; XY.switchHero(G, h.i); if (app.partyPanel && G.ctrl !== pc0) XY.party.close(app); break;   // 面板里点人 = 换人并收起面板继续打
        case 'party': XY.party.toggle(app); break;                                     // v0.9「队伍」签：打开 / 收起（打开 = 暂停）
        case 'partyPage': app.partyPage = (app.partyPage || 0) + 1; break;
        case 'partyClose': XY.party.close(app); break;                                 // 点面板外的遮罩 = 收起
        case 'order': XY.setOrder(G, h.i, h.order); break;
        case 'skills': if (app.screen === 'play') { app.skillTab = G.heroes[G.ctrl].down ? 0 : G.ctrl; XY.toggleSkills(G); } break;
        case 'battleFabao': if (app.screen === 'play' && G.fb) { app.partyPanel=false; app.skillTab=10; app.fbView='carry'; XY.toggleSkills(G,true); } break;
        case 'battleGoal': if (app.screen === 'play') { app.partyPanel=false; app.skillTab=11; XY.pv2.folio.help=6; XY.toggleSkills(G,true); } break;
        case 'closeSkills': XY.toggleSkills(G, false); break;
        case 'tab': app.skillTab = h.i; break;
        case 'fbPin': if (G.fb) XY.fabao.pin(G, h.rid); break;
        case 'fbFilter': app.fbFilter = h.k; break;
        case 'node':
          var lr = XY.learn(G, h.hero, h.id);
          app.skillMsg = { text: lr.reason, bad: !lr.ok, until: app.rt + 2.2 };
          break;
        case 'incense': {
          var ic = 160 + (G._incense || 0) * 80;
          if (G.coins < ic) { XY.toast(G, '香火要 ' + ic + ' 金币'); break; }
          G.coins -= ic; G._incense = (G._incense || 0) + 1; G._incenseAtk = G.t + 16;
          G.heroes.forEach(function (hh) { if (hh && !hh.down) hh.hp = Math.min(hh.maxHp, hh.hp + hh.maxHp * 0.3); });
          XY.toast(G, '香火：全队回了些血，攻势更盛');
          break;
        }
        case 'autopts': G.autoPoints = !G.autoPoints; if (XY.auto) XY.auto.set('points', G.autoPoints); if (G.autoPoints) XY.autoSpend(G); break;
        case 'autoTog': if (XY.auto) { var av = XY.auto.toggle(h.key); if (h.key === 'points') { G.autoPoints = av; if (av) XY.autoSpend(G); } } break;
        case 'tower':
          if (app.partyPanel && XY.save.solOwned(h.type) && G.coins >= XY.soldierCost(G,h.type)) XY.party.close(app);
          toggleBuild(h.type);
          break;
        case 'routeN': XY.chooseRoute(G, 'N'); break;
        case 'routeS': XY.chooseRoute(G, 'S'); break;
        case 'vendorOpen': XY.vendor.open(G); break;
        case 'vendorBuy': XY.vendor.buy(G, h.i); break;
        case 'vendorClose': XY.vendor.close(G); break;
        case 'treat': if (app.selTower) XY.treat(G, app.selTower); break;
        case 'ui': break;
        case 'trait': XY.useTrait(G, h.i); break;
        case 'cardActive': XY.cards.setActive(G, h.id); break;
        case 'offerPick': XY.cards.choose(G, h.k); break;
        case 'offerReroll': XY.fabao.reroll(G); break;
        case 'offerSeal': XY.fabao.seal(G, h.k); break;
        case 'ride': XY.rideCycle(G); break;
        case 'xform': XY.phyrexXform(G); break;
        case 'guest': XY.guest.summon(G); break;
        case 'helpClose': G.helpClosed = true; app.helpOn = false; break;                 // 点操作说明框：收起（按 H 再打开）
        case 'levelSel': if (XY.save.levelUnlocked(h.n)) app.levelId = h.n; else msg('先通关上一关', true); break;
        case 'levelGo': if (XY.gacha10 && XY.gacha10.blocking && XY.gacha10.blocking()) break; startGame(h.n); break;
        case 'menuDungeon': app.screen = 'dungeon'; if (XY.villainUI && XY.villainUI.tipDom) XY.villainUI.tipDom('dungeon'); break;
        case 'menuMods': XY.modsUI.open(app.screen); break;                        // v0.8.7 Bot 启动：导入玩法（DOM 浮层）
        case 'bossGo': if (XY.bossfight && XY.bossfight.launch) XY.bossfight.launch(G && G.bossOffer || { kind: 'menu' }); break;
        case 'menuBoss': if (XY.chain09 && !XY.chain09.unlocked('bossfight')) msg('先通关一个洞府副本', true); else if (XY.bossfight && XY.bossfight.open) { if (XY.bossfight.open({ kind: 'menu' }) === false) msg('Boss 战暂时打不开', true); } break;          // v0.8.6 挂点（入口默认隐藏）
        case 'menuVillain': if (XY.chain09 && !XY.chain09.unlocked('villain')) msg('先打赢牛魔王 Boss 战', true); else if (XY.villain && XY.villain.open) XY.villain.open({ kind: 'menu' }); break;
        case 'dungeonGo': if (XY.gacha10 && XY.gacha10.blocking && XY.gacha10.blocking()) break; if (XY.save.dngUnlocked(h.id)) startGame(null, h.id); else msg('先通关第 1 关一次', true); break;
        case 'menuLevels': openDeparture(); break;
        case 'xchar': if (XY.save.xcharOpen && !XY.save.xcharOpen()) { msg('通关第 1 关后才能自建角色', true); break; } XY.xcharUI.open(app.screen); break;
        case 'menuShop': app.screen = 'shop'; break;
        case 'nextLevel': app.levelId = Math.min(XY.LEVEL_COUNT, G.levelId + 1); app.screen = 'levels'; msg('通关啦！下一关前可以换常驻角色（点下面的角色），选好点「出发！」', false); break;   // v0.5：每次通关后有一次换人的机会
        case 'repick': app.dungeonId = null; app.levelId = G.levelId; app.screen = 'levels'; msg('可以换一位常驻角色再来这一关，选好点「出发！」', false); break;
        case 'buyCard': var br = XY.save.buyCard(); msg(br.ok ? '抽到了「' + (XY.CARDS[br.id] ? XY.CARDS[br.id].name : br.id) + '」' : br.reason, !br.ok); break;
        case 'shopBuy': var sb = XY.shop.buy(h.slot); msg(sb.reason, !sb.ok); break;
        case 'shopTab': app.shopTab = h.k; break;
        case 'folio': XY.pv2.folio[h.key]=h.i; break;
        case 'pvSet': app.pvSet = h.i; break;
        case 'pvUk': app.pvUk = h.i; break;
        case 'pvSub': (app._pvSub || (app._pvSub = {}))[app.skillTab] = h.i; break;
        case 'fbView': app.fbView = h.k; XY.pv2.page.fbrec = 0; XY.pv2.page.fbdex = 0; break;
        case 'pvPage': XY.pv2.page[h.key] = (XY.pv2.page[h.key] || 0) + h.d; break;
        case 'shopBuyFb': var sf = XY.shop.buyFb(h.id); msg(sf.reason, !sf.ok); break;
        case 'shopBuySol': var ss = XY.shop.buySol(h.t); msg(ss.reason, !ss.ok); break;
        case 'shopRoll': var sr2 = XY.shop.reroll(); msg(sr2.reason, !sr2.ok); break;
        case 'lockedSlot': msg('暂未开放', false); break;
        case 'xcharLocked': msg('通关第 1 关后才能自建角色。已经建好的角色还在，通关后就能带。', true); break;
        case 'gachaHold': break;
        case 'gachaPrev': if (XY.gacha10 && XY.gacha10.nudge) XY.gacha10.nudge(-1); break;
        case 'gachaNext': if (XY.gacha10 && XY.gacha10.nudge) XY.gacha10.nudge(1); break;
        case 'gachaSkip': if (XY.gacha10) XY.gacha10.key(); break;
        case 'gachaAck': if (XY.gacha10) XY.gacha10.ack(); break;
        case 'gachaPick': if (XY.gacha10 && XY.gacha10.pick) XY.gacha10.pick(h.id); break;
        case 'carryPick': var cp = XY.save.setCarry(h.id); msg(cp.reason, !cp.ok); break;
      }
      return;
    }
    // 没点到任何按钮：点的是地图
    if (app.screen === 'play' && G.mode === 'play' && (G.villain || G.lair)) { if (G.villain) XY.villain.noteInput('mouse'); return; }          // 反派关 / 验关：地图点击无效（只用方向键）
    if (app.screen === 'play' && G.mode === 'play') {
      var wo = worldOf(p), wx = wo.x, wy = wo.y;
      if (app.build) {
        if (app._placeAte && performance.now() - app._placeAte < 80) return;
        var placedType = app.build;
        if (XY.placeTower(G, placedType, wx, wy)) { app.build = null; app._placeAte = performance.now(); }
      } else if (app.summon) {
        var sr = XY.summonSky(G, app.summon.mode, wx, wy); if (sr.ok || sr.reason !== 'mode') app.summon = null;
      } else if (app.selTower) app.selTower = null;                      // 选着塔时再点一下只是取消选中，不走路
      else {
        var tw = XY.towerAt(G, wx, wy, 34);
        if (tw) app.selTower = tw;
        else if (touch) setDest(wo);                                                       // 触屏：轻点空地 = 设目的地
        else { app.mm.holding = true; app.mm.downAt = app.rt; app.mm.start = wo; }      // 空地：按住走 / 单击设目的地
      }
    }
  }

  /* ---------- 触屏：点按钮 / 轻点设目的地 / 按住空地拖动 = 浮动摇杆 ---------- */
  // 每根手指各管各的：落在按钮上就是点按钮；落在空地上就成为“摇杆手指”（同一时间一根）。拖动超过 14px 才算摇杆，没拖动就松手 = 轻点。
  var JOY_MAX = 64, JOY_DEAD = 14;
  function tpos(t) { var r = canvas.getBoundingClientRect(); return { x: (t.clientX - r.left) / app.zoom, y: (t.clientY - r.top) / app.zoom }; }
  function joyEnd(t, cancel) {
    var j = app.joy; if (!j || j.id !== t.identifier) return;
    var armed = !!(app.build || app.summon || app.selTower);      // 正在选点（造天兵 / 降临 / 选中天兵）：没拖动的松手一律算“点这里”，慢一点也行
    if (!j.moved && !cancel && G && app.screen === 'play' && G.mode === 'play' && (armed || app.rt - j.t0 < 0.45)) press(j.p0, 0, true);   // 没拖动：当作轻点
    app.joy = null; updateMove();
  }
  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault(); if (!G) return;
    if (introEl && !(app.intro && app.intro.playing)) introEnd('input');
    if (app.joy) { var alive = false; for (var k = 0; k < e.touches.length; k++) if (e.touches[k].identifier === app.joy.id) alive = true; if (!alive) app.joy = null; }   // 保险：摇杆手指早就不在屏幕上了（touchend 丢了）→ 释放，别让摇杆卡死
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i], p = tpos(t); app.touched = app.rt;
      if (XY.audio) XY.audio.init();
      var playing = app.screen === 'play' && G.mode === 'play';
      if (!playing || hitUI(p) || app.joy) { press(p, 0, true); continue; }     // 按钮 / 菜单：立刻点按。空地永远先当“摇杆手指”：造天兵 / 降临 / 选塔的选点模式也一样（修了：点了“造天兵”后整个屏幕都变成“放兵”，再也拖不动人）
      app.joy = { id: t.identifier, p0: p, x: p.x, y: p.y, ux: 0, uy: 0, k: 0, moved: false, t0: app.rt };
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i], j = app.joy; if (!j || j.id !== t.identifier) continue;
      var p = tpos(t), dx = p.x - j.p0.x, dy = p.y - j.p0.y, d = Math.sqrt(dx * dx + dy * dy);
      j.x = p.x; j.y = p.y;
      if (d > JOY_DEAD) { if (!j.moved && (app.build || app.summon || app.selTower)) { app.build = null; app.summon = null; app.selTower = null; XY.toast(G, '已取消选点：拖动 = 走路'); } j.moved = true; j.ux = dx / d; j.uy = dy / d; j.k = Math.min(1, d / JOY_MAX); } else if (j.moved) { j.ux = 0; j.uy = 0; j.k = 0; }
    }
    updateMove();
  }, { passive: false });
  canvas.addEventListener('touchend', function (e) { e.preventDefault(); for (var i = 0; i < e.changedTouches.length; i++) joyEnd(e.changedTouches[i], false); }, { passive: false });
  canvas.addEventListener('touchcancel', function (e) { e.preventDefault(); for (var i = 0; i < e.changedTouches.length; i++) joyEnd(e.changedTouches[i], true); }, { passive: false });

  /* ---------- 主循环：固定步长逻辑 + 每帧一次绘制 ---------- */
  var frameErrs = 0, booted = false;
  function frame(now) {
    requestAnimationFrame(frame);                       // 先排下一帧：这一帧里哪怕出错，游戏也不会就此卡死成空白
    try { frameBody(now); } catch (e) {
      if (frameErrs++ < 3 && window.XY_fail) window.XY_fail(e && e.message ? e.message : e);
      last = now;
      if (G && G.mode !== 'play' && app.screen === 'play') { /* 保持当前状态，下一帧再试 */ }
    }
    if (!booted) { booted = true; var b = document.getElementById('boot'); if (b && b.parentNode) b.parentNode.removeChild(b); }
  }
  function frameBody(now) {
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    app.rt += dt;
    if (dt > 0) app.fps += (1 / dt - app.fps) * 0.05;
    if (app.moveMark) app.moveMark.t += dt;
    if (app.partyPanel && (G.villain || app.screen !== 'play' || G.mode !== 'play')) XY.party.close(app);
    if (app.screen === 'play' && G && G.tut && G.mode === 'skills' && !app.tipHold && !app.partyPanel && XY.tutTick) XY.tutTick(G, dt);   // 修行面板沿用 mode!==play 暂停战斗，只推进教程计时
    if (app.screen === 'play' && G.mode === 'play' && !app.tipHold && !app.partyPanel) {     // v0.9 队伍面板打开 = 战斗时间冻结（不推进 XY.step）
      updateMove();
      acc += dt * G.speed;
      var n = 0;
      while (acc >= C.STEP && n++ < 60) { XY.step(G, C.STEP); acc -= C.STEP; if (G.mode !== 'play') break; }
      if (acc > C.STEP * 4) acc = 0;
    }
    if (app.screen === 'play' && !app.tipHold && !app.partyPanel && XY.auto) XY.auto.assist(G, dt);
    if (app.screen === 'play' && (G.mode === 'win' || G.mode === 'lose')) { app.screen = G.mode; XY.save.commitRun(G, G.mode); if (XY.audio && XY.audio.bgmStart) XY.audio.bgmStart('menu'); }
    if (XY.audio && XY.audio.bgmTick) {
      var duck = (app.screen === 'pause' || app.tipHold || app.partyPanel) ? 0.18 : 1;
      XY.audio.bgmTick({ duck: duck });
    }
    if (XY.vfx && XY.vfx.sample) XY.vfx.sample();
    if (XY.ui2) XY.ui2.begin(G, app);
    XY.render(ctx, G, app);
    if (XY.ui2) XY.ui2.end(G, app);
  }

  /* 加载片头已去掉。首页自己画，不播 assets/intro.mp4，也不创建跳过按钮。 */
  var introEl = null, introTimer = 0, introWatch = 0;
  function introEnd(why) {
    if (!introEl) return;
    clearTimeout(introTimer); clearInterval(introWatch); introWatch = 0;
    var el = introEl; introEl = null; app.intro = null; app.introWhy = why;
    try { el.pause(); } catch (e) {}
    if (el.parentNode) el.parentNode.removeChild(el);
    ['introSkip', 'introMute'].forEach(function (id) { var b = document.getElementById(id); if (b && b.parentNode) b.parentNode.removeChild(b); });
    last = performance.now();
  }
  XY.introSkip = function () { introEnd('skip'); };
  function introStart() {
    /* 加载片头已去掉：打开、刷新、竖屏都直接进首页。不挂视频，也不留跳过按钮。猫叔登场和变身视频不在这里。 */
    return;
  }


  resize();
  fresh();
  try { introStart(); } catch (e) { introEnd('exception'); }
  try { if (XY.modsUI) XY.modsUI.boot(); } catch (e) { if (window.console) console.warn('modsUI.boot', e); }
  window.__xy = { app: app, get G() { return G; }, startGame: startGame, keys: keys, fresh: fresh, startVillain: startVillain, startLair: startLair, toMenu: toMenu, goHome: goHome };
  requestAnimationFrame(frame);
})();
