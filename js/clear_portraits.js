/* 人物与暂停页走宣纸、红印、墨条。不套运行时滤镜。 */
(function () {
  'use strict';
  var XY = window.XY;
  if (!XY) return;
  window.XY_X_AVATARS = null;
  if (document.head) {
    var css = document.createElement('style');
    css.textContent = '@font-face{font-family:"Ma Shan Zheng";src:url("assets/fonts/MaShanZheng-Regular.ttf") format("truetype");font-display:swap}';
    document.head.appendChild(css);
  }
  var BRUSH = '"Ma Shan Zheng","TDBrush","KaiTi",serif';

  var FIVE = { tang: 1, wukong: 1, bajie: 1, wujing: 1, horse: 1 };
  var cache = {};
  function fileIm(src) {
    var im = cache[src];
    if (!im) {
      im = cache[src] = new Image();
      im.src = src;
    }
    return im.complete && im.naturalWidth ? im : null;
  }
  function pauseArt(id) {
    if (!id) return null;
    if (FIVE[id]) return fileIm('assets/art/menu-v5/fig_' + id + '.webp');
    return fileIm('assets/art/bg/' + id + '.webp');
  }
  function brush(c, text, x, y, size, col, align) {
    c.save();
    c.font = size + 'px ' + BRUSH;
    c.fillStyle = col || '#24180f';
    c.textAlign = align || 'left';
    c.textBaseline = 'middle';
    c.fillText(text, x, y);
    c.restore();
  }
  function sealBtn(c, K, x, y, w, h, label, act, ex, solid) {
    c.save();
    c.translate(x + w / 2, y + h / 2);
    c.rotate(solid ? -0.012 : 0.008);
    c.beginPath();
    c.moveTo(-w / 2 + 3, -h * 0.4);
    c.lineTo(w / 2, -h * 0.44);
    c.lineTo(w / 2 - 4, h * 0.4);
    c.lineTo(-w / 2, h * 0.36);
    c.closePath();
    c.fillStyle = solid ? '#a83224' : 'rgba(58,50,38,0.22)';
    c.fill();
    c.restore();
    brush(c, label, x + w / 2, y + h / 2, Math.max(16, Math.min(26, h * 0.34)), solid ? '#fff6e4' : '#24180f', 'center');
    if (K.hit) K.hit(x, y, w, Math.max(44, h), act, ex || null);
  }

  function tidyPause(c, G, a) {
    var P = XY.pv2;
    if (!P || !P.begin || !G) return false;
    var K = P.begin(c, a);
    var W = K.W, H = K.H, port = H > W * 1.02;
    if (P.paper) P.paper(c, W, H);
    var hero = G.heroes[G.ctrl] || G.heroes[1];
    var hid = hero && ((hero.def && hero.def.id) || hero.id);
    var colW = port ? W - 28 : Math.min(520, W * 0.42);
    var autoN = XY.auto && XY.auto.LABEL ? 1 : 0;
    var ctrlH = 100 + 44 + 44 + 44 + 52 + autoN * 52 + 36;
    var figH, figX, foot;
    if (port) {
      var panelTop = Math.max(48, H - 12 - ctrlH);
      figH = Math.max(64, Math.min(H * 0.42, panelTop - 28));
      figX = W / 2;
      foot = 16 + figH;
      if (foot + 8 > panelTop) foot = panelTop - 8;
    } else {
      figH = H - 24;
      figX = W * 0.28;
      foot = H - 12;
    }
    var im = pauseArt(hid);
    c.save();
    c.filter = 'none';
    if (im) {
      var sc = figH / im.naturalHeight;
      var dw = im.naturalWidth * sc;
      c.drawImage(im, figX - dw / 2, foot - figH, dw, figH);
    }
    c.restore();
    var x = port ? 14 : W - colW - 28;
    var y0 = port ? Math.max(foot + 8, H - 12 - ctrlH) : 16;
    var ph = port ? H - y0 - 12 : H - 28;
    c.save();
    c.fillStyle = '#f6edd8';
    c.beginPath();
    c.moveTo(x + 3, y0 + 1); c.lineTo(x + colW - 2, y0); c.lineTo(x + colW, y0 + ph - 2); c.lineTo(x + 1, y0 + ph);
    c.closePath();
    c.fill();
    c.lineWidth = 2.2; c.strokeStyle = '#2a2118'; c.stroke();
    c.restore();
    var pad = 16, inner = colW - pad * 2, y = y0 + 28;
    brush(c, '暂驻', x + pad, y, port ? 30 : 36, '#a83224', 'left');
    y += 26;
    brush(c, (XY.lvPre ? XY.lvPre(G) : '') + ((G.lv && G.lv.name) || ''), x + pad, y, 15, '#5c4a38', 'left');
    y += 22;
    brush(c, '已坚持 ' + XY.fmtTime(G.t) + '   Lv' + G.level + '  击杀 ' + XY.fmtNum(G.kills), x + pad, y, 15, '#24180f', 'left');
    y += 18;
    var hasAuto = !!(XY.auto && XY.auto.LABEL);
    var n = 3 + (hasAuto ? 1 : 0);
    var gap = 8;
    var bh = Math.max(48, Math.floor((y0 + ph - 36 - y - gap * (n - 1)) / n));
    sealBtn(c, K, x + pad, y, inner, bh, '继续', 'resume', null, true);
    y += bh + gap;
    sealBtn(c, K, x + pad, y, (inner - gap) / 2, bh, '重来', 'restart', null, false);
    sealBtn(c, K, x + pad + (inner + gap) / 2, y, (inner - gap) / 2, bh, '回首页', 'home', null, false);
    y += bh + gap;
    var muted = !!(XY.audio && XY.audio.mute);
    sealBtn(c, K, x + pad, y, (inner - gap) / 2, bh, muted ? '声关' : '声开', 'muteSet', { mute: false }, !muted);
    sealBtn(c, K, x + pad + (inner + gap) / 2, y, (inner - gap) / 2, bh, muted ? '已静' : '声静', 'muteSet', { mute: true }, muted);
    if (hasAuto) {
      y += bh + gap;
      var keys = ['points', 'treat', 'guest', 'pick'];
      var aw = (inner - gap * (keys.length - 1)) / keys.length;
      keys.forEach(function (key, i) {
        sealBtn(c, K, x + pad + i * (aw + gap), y, aw, bh, XY.auto.LABEL[key], 'autoTog', { key: key }, !!XY.auto.get(key));
      });
    }
    brush(c, '小怪 +' + Math.round(XY.C.ENEMY_SCALE * G.t / 60 * 100) + '%   首领 +' + Math.round(XY.C.BOSS_SCALE * G.t / 60 * 100) + '%', x + pad, y0 + ph - 18, 14, '#5c4a38', 'left');
    if (P.end) P.end(c);
    return true;
  }

  if (XY.ov) {
    XY.ov.pause = function (c, G, a) {
      if (!tidyPause(c, G, a) && XY.ov._pauseInk) XY.ov._pauseInk(c, G, a);
    };
  }

  setTimeout(function () {
    if (!XY.render) return;
    var prev = XY.render;
    XY.render = function (ctx) {
      if (ctx) {
        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'source-over';
      }
      return prev.apply(this, arguments);
    };
  }, 0);
})();
