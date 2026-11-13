/* 必杀高潮：按已确认的效果图切入，墨晕收边，约 1.5 秒，点按可跳过。不改伤害和冷却。 */
(function () {
  'use strict';
  var XY = window.XY;
  if (!XY) return;
  var IDS = ['tang', 'wukong', 'bajie', 'wujing', 'horse', 'phyrex', 'sisi', 'laosiji', 'kuanggong', 'haiteng', 'diaoyulao', 'yuanzhang', 'heyuxi', 'martin', 'niumo', 'arrow', 'cannon', 'frost', 'siege', 'heal'];
  var cache = {};
  var BASE = 'assets/art/ult-climax/';
  function img(id) {
    var e = cache[id];
    if (!e) {
      e = cache[id] = { im: new Image(), ok: false };
      e.im.onload = function () { e.ok = e.im.naturalWidth > 0; };
      e.im.src = BASE + id + '.jpg';
    }
    return e.ok ? e.im : null;
  }
  IDS.forEach(img);
  var U = XY.ultClimax = { hold: null, until: 0, id: null };
  U.play = function (id, app) {
    if (IDS.indexOf(id) < 0) return;
    U.id = id;
    U.hold = id;
    U.until = (app && app.rt || 0) + 1.5;
    img(id);
  };
  U.skip = function () { U.hold = null; U.id = null; };
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
      if (!q || !q.length || !app) { if (XY.gacha10) XY.gacha10.forceHold = false; return; }
      var id = q[0], sp = XY.SP_BY && XY.SP_BY[id];
      if (!sp) { q.shift(); return; }
      ctx.save();
      ctx.setTransform(app.zoom * app.dpr, 0, 0, app.zoom * app.dpr, 0, 0);
      if (app.screen !== 'levels') { q.length = 0; XY._introBox = null; if (XY.gacha10) XY.gacha10.forceHold = false; ctx.restore(); return; }
      if (XY.gacha10) XY.gacha10.forceHold = true;
      var W = app.lw, H = app.lh, pw = Math.min(560, W - 24), ph = Math.min(280, H * 0.46);
      var x = (W - pw) / 2, y = (H - ph) / 2;
      ctx.fillStyle = '#f6efe2';
      ctx.beginPath();
      ctx.moveTo(x + 16, y + 6);
      ctx.quadraticCurveTo(x + pw * 0.5, y - 8, x + pw - 12, y + 8);
      ctx.quadraticCurveTo(x + pw + 6, y + ph * 0.5, x + pw - 10, y + ph - 8);
      ctx.quadraticCurveTo(x + pw * 0.4, y + ph + 6, x + 14, y + ph - 6);
      ctx.quadraticCurveTo(x - 6, y + ph * 0.4, x + 16, y + 6);
      ctx.fill();
      var av = Math.min(ph - 36, pw * 0.34);
      if (XY.xAvIcon && XY.xAvIcon.draw) XY.xAvIcon.draw(ctx, id, x + 16, y + 18, av, av);
      var tx = x + pw * 0.46;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#24180f';
      ctx.font = '18px "Ma Shan Zheng","KaiTi",serif';
      ctx.fillText('身份  ' + (sp.role || sp.name), tx, y + 92);
      ctx.fillText('擅长  ' + (sp.weapon || sp.trait && sp.trait.name || ''), tx, y + 124);
      ctx.fillText('必杀  ' + (sp.ult || ''), tx, y + 156);
      ctx.fillStyle = '#a42d19';
      ctx.font = '32px "Ma Shan Zheng","KaiTi",serif';
      ctx.fillText(sp.name, tx, y + ph - 64);
      ctx.fillStyle = '#5c4a38';
      ctx.font = '15px "Ma Shan Zheng","KaiTi",serif';
      ctx.fillText('点一下收下', tx, y + ph - 28);
      XY._introBox = { x: x, y: y, w: pw, h: ph };
      ctx.restore();
    }
    render._ult = 1;
    XY.render = render;
  }
  hook();
  function showingIntro() {
    return !!(XY.introQ && XY.introQ.length && XY._introBox);
  }
  function eatIntro(ev) {
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
