/* 必杀高潮：按已确认的效果图切入，墨晕收边，约 1.5 秒，点按可跳过。不改伤害和冷却。 */
(function () {
  'use strict';
  var XY = window.XY;
  if (!XY) return;
  var IDS = ['tang', 'wukong', 'bajie', 'wujing', 'horse', 'phyrex', 'sisi', 'laosiji', 'kuanggong', 'haiteng', 'diaoyulao', 'yuanzhang', 'heyuxi', 'martin', 'niumo', 'arrow', 'cannon', 'frost', 'siege', 'heal'];
  var cache = {};
  var BASE = 'assets/art/ult-climax/';
  function img(id, retry) {
    if (IDS.indexOf(id) < 0) return null;
    var e = cache[id];
    if (e && e.failed && retry) e = cache[id] = null;
    if (!e) {
      e = cache[id] = { im: new Image(), ok: false };
      e.im.onload = function () { e.ok = e.im.naturalWidth > 0; e.failed = !e.ok; };
      e.im.onerror = function () { e.failed = true; };
      e.im.src = BASE + id + '.jpg';
    }
    return e.ok ? e.im : null;
  }
  var U = XY.ultClimax = { hold: null, until: 0, id: null };
  U.play = function (id, app) {
    if (IDS.indexOf(id) < 0) return;
    U.id = id;
    U.hold = id;
    U.until = (app && app.rt || 0) + 1.5;
    img(id, true);
  };
  U.skip = function () { U.hold = null; U.id = null; };
  // 设置开关：全屏必杀图默认开；玩家在暂停页关掉后记在本机，刷新后保持
  var PREF = 'xy_ult_pic';
  U.enabled = function () { try { return window.localStorage.getItem(PREF) !== '0'; } catch (e) { return U._on !== false; } };
  U.setEnabled = function (on) { U._on = !!on; try { window.localStorage.setItem(PREF, on ? '1' : '0'); } catch (e) { } if (!on) U.skip(); return !!on; };
  U.paint = function (c, app, id) {
    id = id || U.hold;
    var im = img(id);
    if (!im) return false;
    var W = app.lw, H = app.lh;
    c.save();
    c.fillStyle = 'rgba(244,234,212,0.94)';
    c.fillRect(0, 0, W, H);
    var s = Math.max(W / im.naturalWidth, H / im.naturalHeight);
    var dw = im.naturalWidth * s, dh = im.naturalHeight * s;
    c.save();
    c.beginPath();
    c.moveTo(W * 0.04, H * 0.08);
    c.lineTo(W * 0.96, H * 0.04);
    c.lineTo(W * 0.98, H * 0.92);
    c.lineTo(W * 0.03, H * 0.96);
    c.closePath();
    c.clip();
    c.drawImage(im, (W - dw) / 2, (H - dh) / 2, dw, dh);
    c.restore();
    c.restore();
    return true;
  };
  // Modern sheets own their input. A legacy introduction may remain queued
  // behind one, but must neither draw over it nor consume its next pointerdown.
  function introCovered(app) {
    return !!(app && (app.dkOpen || app.dkGear || app.confirm ||
      (XY.depart && XY.depart.carryOpen) || (XY.gacha10 && XY.gacha10.activityOpen)));
  }
  function clearIntroBox() {
    XY._introBox = null;
    XY.legacyIntroLayout = null;
    if (XY.gacha10) XY.gacha10.forceHold = false;
  }
  function hook() {
    if (!XY.render || XY.render._ult) return;
    var old = XY.render;
    function render(ctx, G, app) {
      old(ctx, G, app);
      if (U.hold) {
        if (app && app.rt > U.until) U.skip();
        else {
          ctx.save();
          ctx.setTransform(app.zoom * app.dpr, 0, 0, app.zoom * app.dpr, 0, 0);
          U.paint(ctx, app, U.hold);
          ctx.restore();
        }
      }
      var q = XY.introQ;
      if (!q || !q.length || !app || introCovered(app)) { clearIntroBox(); return; }
      var id = q[0], sp = XY.SP_BY && XY.SP_BY[id];
      if (!sp) { q.shift(); return; }
      ctx.save();
      // Legacy introductions are CSS-sized too: the former logical 18px body
      // shrank to 9px when a phone's game zoom was 0.5.
      ctx.setTransform(app.dpr || 1, 0, 0, app.dpr || 1, 0, 0);
      if (app.screen !== 'levels') { q.length = 0; XY._introBox = null; if (XY.gacha10) XY.gacha10.forceHold = false; ctx.restore(); return; }
      if (XY.gacha10) XY.gacha10.forceHold = true;
      var W = app.lw * (app.zoom || 1), H = app.lh * (app.zoom || 1);
      var pw = Math.min(1100, W - 24), ph = Math.min(680, H - 24), x = (W - pw) / 2, y = (H - ph) / 2;
      var short = H < 480, side = pw >= 560 || (pw >= 430 && pw > ph * 1.2);
      var pad = short ? 16 : 22, gap = short ? 9 : 14, footerH = 40;
      var innerW = pw - pad * 2, contentH = ph - pad * 2 - footerH;
      var pictureW = side ? innerW * 0.42 : innerW, splitGap = Math.max(20, innerW * 0.035);
      var tx = side ? x + pad + pictureW + splitGap : x + pad, tw = side ? innerW - pictureW - splitGap : innerW;
      var large = W >= 1000 && H >= 600;
      var bodySize = large ? (W >= 1600 ? 28 : 26) : short ? (W < 600 ? 18 : 20) : H < 650 ? 18 : 21;
      var nameSize = large ? (W >= 1600 ? 48 : 44) : short ? (W < 600 ? 28 : 32) : 32;
      var handleSize = large ? 20 : 16, lineHeight = Math.round(bodySize * 1.4), rows = [], cursor = 0;
      function line(kind, text, size, col, bold) {
        rows.push({ kind: kind, text: String(text), x: tx, y: cursor + size / 2, size: size, color: col, bold: !!bold });
        cursor += size;
      }
      function block(kind, text) {
        ctx.font = XY.R.font(bodySize, false);
        var parts = [], word = '';
        String(text).split('').forEach(function (ch) {
          if (ch === '\n') { parts.push(word); word = ''; }
          else if (word && ctx.measureText(word + ch).width > tw) { parts.push(word); word = ch; }
          else word += ch;
        });
        if (word) parts.push(word);
        parts.forEach(function (part, k) { if (k) cursor += lineHeight - bodySize; line(kind, part, bodySize, '#3a3226', false); });
        cursor += gap;
      }
      line('name', sp.name, nameSize, '#24180f', true); cursor += short ? 6 : 10;
      if (sp.handle) { line('handle', sp.handle, handleSize, '#a42d19', false); cursor += gap; }
      block('role', '身份：' + (sp.role || sp.name));
      block('weapon', '擅长：' + (sp.weapon || sp.trait && sp.trait.name || ''));
      block('ult', '必杀：' + (sp.ult || ''));
      var textH = cursor - gap, pictureH = side ? contentH : Math.max(64, Math.min(ph * 0.48, contentH - textH - 18));
      var picture = { x: x + pad, y: y + pad, w: pictureW, h: pictureH };
      var ty = side ? y + pad + Math.max(0, (contentH - textH) / 2) : picture.y + pictureH + 18;
      ctx.fillStyle = 'rgba(35,28,20,0.38)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#f6efe2'; ctx.strokeStyle = 'rgba(131,101,58,0.48)'; ctx.lineWidth = 1.4;
      XY.R.rrect(ctx, x, y, pw, ph, 12); ctx.fill(); ctx.stroke();
      var portrait = null, GA = XY.gacha10;
      if (GA && XY.xchar && XY.xchar.isX && XY.xchar.isX(id)) {
        var customArt = XY.bgArt && XY.bgArt(id);
        if (customArt && GA.portraitBounds && GA.portraitBox) {
          var cb = GA.portraitBounds(customArt), ct = GA.portraitBox(cb.w, cb.h, picture.x, picture.y, picture.w, picture.h);
          ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(customArt, cb.x, cb.y, cb.w, cb.h, ct.x, ct.y, ct.dw, ct.dh); ctx.restore();
          portrait = { id: id, custom: true, source: cb, target: ct, region: picture };
        }
      } else if (GA && GA.drawPortrait) portrait = GA.drawPortrait(ctx, id, picture.x, picture.y, picture.w, picture.h);
      rows.forEach(function (row) { row.y += ty; XY.R.txt(ctx, row.text, row.x, row.y, row.size, row.color, 'left', row.bold); });
      var footer = { x: x + (pw - 176) / 2, y: y + ph - pad - 32, w: 176, h: 32 };
      XY.R.txt(ctx, '点一下收下', x + pw / 2, footer.y + 16, 18, '#a42d19', 'center', false);
      XY.legacyIntroLayout = { id: id, width: W, height: H, sideBySide: side, nameSize: nameSize, bodySize: bodySize, handleSize: handleSize, rows: rows, panel: { x: x, y: y, w: pw, h: ph }, picture: picture, portrait: portrait, text: { x: tx, y: ty, w: tw, h: textH }, footer: footer };
      XY._introBox = { x: x, y: y, w: pw, h: ph };
      ctx.restore();
    }
    render._ult = 1;
    XY.render = render;
  }
  hook();
  function showingIntro() {
    var app = XY.app;
    return !!(app && app.screen === 'levels' && !introCovered(app) && XY.introQ && XY.introQ.length && XY._introBox);
  }
  function eatIntro(ev) {
    if (XY.app && XY.app.materialHold || XY.lazy && XY.lazy.active && XY.lazy.active()) return;
    if (U.hold && ev.type === 'pointerdown') U.skip();
    if (!showingIntro()) return;
    if (ev.type === 'pointerdown') {
      var q = XY.introQ, id = q[0];
      var data = XY.save && XY.save.data;
      if (data) { data.intros = data.intros || {}; data.intros[id] = 1; if (XY.save.touch) XY.save.touch(); }
      q.shift();
      if (!q.length) XY._introBox = null;
    }
    if (ev.stopPropagation) ev.stopPropagation();
    if (ev.preventDefault && ev.cancelable) ev.preventDefault();
  }
  window.addEventListener('pointerdown', eatIntro, true);
})();
