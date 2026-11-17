/* 掉落三选一、暂停、结算：宣纸大卡、墨条、朱印。不改首页。 */
(function () {
  'use strict';
  var XY = window.XY;
  if (!XY || !XY.pv2) return;
  var P = XY.pv2;

  function open(c, a) {
    XY.ui.hits.length = 0;
    c.save();
    c.setTransform((a.zoom || 1) * (a.dpr || 1), 0, 0, (a.zoom || 1) * (a.dpr || 1), 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    var K = P.begin(c, a);
    c.globalAlpha = 1;
    P.paper(c, K.W, K.H);
    return K;
  }
  function openVeil(c, a) {
    XY.ui.hits.length = 0;
    c.save();
    c.setTransform((a.zoom || 1) * (a.dpr || 1), 0, 0, (a.zoom || 1) * (a.dpr || 1), 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    var K = P.begin(c, a);
    c.globalAlpha = 1;
    return K;
  }
  function close(c) { P.end(c); c.restore(); }
  function kai(c, s, x, y, size, col, align, maxW) {
    c.save();
    var face = '"Ma Shan Zheng","KaiTi",serif';
    c.font = size + 'px ' + face;
    c.fillStyle = col || '#2b1c08';
    c.textAlign = align || 'left';
    c.textBaseline = 'middle';
    if (maxW && c.measureText(s).width > maxW) {
      size = Math.max(12, size * maxW / c.measureText(s).width);
      c.font = size + 'px ' + face;
    }
    c.fillText(s, x, y);
    c.restore();
    return size;
  }
  function inkBar(c, x, y, w, h, label, hot) {
    c.save();
    c.translate(x + w / 2, y + h / 2);
    c.rotate(hot ? -0.012 : 0.008);
    c.fillStyle = hot ? '#a83224' : '#2b1c08';
    c.beginPath();
    c.moveTo(-w / 2 + 3, -h * 0.42);
    c.quadraticCurveTo(0, -h * 0.56, w / 2 - 2, -h * 0.4);
    c.lineTo(w / 2 - 5, h * 0.42);
    c.quadraticCurveTo(0, h * 0.55, -w / 2 + 2, h * 0.4);
    c.closePath();
    c.fill();
    c.fillStyle = '#f6efe2';
    var size = Math.max(13, Math.min(24, h * 0.46)), face = '"Ma Shan Zheng","KaiTi",serif';
    c.font = size + 'px ' + face;
    while (size > 12 && c.measureText(label).width > w - 14) { size -= 1; c.font = size + 'px ' + face; }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(label, 0, 1);
    c.restore();
  }
  function paleBar(c, x, y, w, h, label) {
    c.save();
    c.translate(x + w / 2, y + h / 2);
    c.rotate(0.01);
    c.fillStyle = 'rgba(90,74,52,0.16)';
    c.beginPath();
    c.moveTo(-w / 2 + 3, -h * 0.4);
    c.quadraticCurveTo(0, -h * 0.55, w / 2 - 2, -h * 0.38);
    c.lineTo(w / 2 - 4, h * 0.4);
    c.quadraticCurveTo(0, h * 0.52, -w / 2 + 2, h * 0.38);
    c.closePath();
    c.fill();
    c.fillStyle = '#5c4a38';
    var size = Math.max(12, Math.min(20, h * 0.42));
    c.font = size + 'px "Ma Shan Zheng","KaiTi",serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(label, 0, 1);
    c.restore();
  }
  // Three disciples share the menu's complete transparent figures.
  // Tang and horse retain their existing paper-cover treatment.
  var resultCovers = {}, transparentCover = { wukong: 1, bajie: 1, wujing: 1 };
  var coreCover = { tang: 1, wukong: 1, bajie: 1, wujing: 1, horse: 1 };
  function resultCover(id) {
    var e = resultCovers[id];
    if (!e) {
      e = resultCovers[id] = { image: new Image(), canvas: null };
      e.image.src = transparentCover[id] ? 'assets/art/menu-v5/fig_' + id + '.webp' : 'assets/art/hero-cover-wild/' + id + '.jpg';
    }
    var im = e.image, w = im.naturalWidth, h = im.naturalHeight;
    if (!im.complete || !w || !h) return null;
    if (transparentCover[id]) return im;
    if (!e.canvas) {
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      var q = cv.getContext('2d'); q.drawImage(im, 0, 0);
      q.globalCompositeOperation = 'destination-in';
      var edge = Math.min(w, h) * 0.045;
      var gx = q.createLinearGradient(0, 0, w, 0);
      gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(edge / w, '#000');
      gx.addColorStop(1 - edge / w, '#000'); gx.addColorStop(1, 'rgba(0,0,0,0)');
      q.fillStyle = gx; q.fillRect(0, 0, w, h);
      var gy = q.createLinearGradient(0, 0, 0, h);
      gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(edge / h, '#000');
      gy.addColorStop(1 - edge / h, '#000'); gy.addColorStop(1, 'rgba(0,0,0,0)');
      q.fillStyle = gy; q.fillRect(0, 0, w, h);
      e.canvas = cv;
    }
    return e.canvas;
  }
  function cutout(c, id, x, foot, h, maxW) {
    if (coreCover[id]) {
      var cover = resultCover(id); if (!cover) return;
      // Account for CSS/UI scaling and DPR as well as the fitted logical size.
      var matrix = c.getTransform(), deviceScale = Math.max(1, Math.hypot(matrix.a, matrix.b), Math.hypot(matrix.c, matrix.d));
      var fit = Math.min(h / cover.height, maxW / cover.width, 1 / deviceScale);
      var cw = cover.width * fit, ch = cover.height * fit;
      c.save(); c.globalAlpha = 1; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.drawImage(cover, x - cw / 2, foot - ch, cw, ch); c.restore();
      return;
    }
    cutout.bag = cutout.bag || {};
    var custom = XY.xchar && XY.xchar.isX && XY.xchar.isX(id);
    var im = custom ? XY.xchar.portraitBare(id) : cutout.bag[id];
    if (!im && !custom) {
      im = cutout.bag[id] = new Image();
      im.src = (id === 'phyrex' || id === 'sisi' || id === 'heyuxi' ? 'assets/art/gacha-portraits/' : 'assets/art/battle-hd/') + id + '.webp';
    }
    var iw = im && (im.naturalWidth || im.width), ih = im && (im.naturalHeight || im.height);
    if (!iw || !ih || (im.complete === false)) return;
    var scale = Math.min(h / ih, maxW / iw), dw = iw * scale, dh = ih * scale;
    c.save();
    c.globalAlpha = 1;
    c.fillStyle = 'rgba(42,32,22,0.16)';
    c.beginPath(); c.ellipse(x, foot - 4, Math.min(dw * 0.42, dh * 0.3), Math.min(4, dh * 0.05), 0, 0, Math.PI * 2); c.fill();
    c.drawImage(im, x - dw / 2, foot - dh, dw, dh);
    c.restore();
  }
  function whoId(G) {
    var who = G.heroes && (G.heroes[G.ctrl] || G.heroes[0]);
    // Custom heroes keep the skill prototype in id; their visual identity is xid.
    var id = who && ((who.def && who.def.xid) || who.xid || who.id);
    if (XY.xchar && XY.xchar.isX && XY.xchar.isX(id)) return id;
    var ok = { tang: 1, wukong: 1, bajie: 1, wujing: 1, horse: 1, phyrex: 1, sisi: 1, laosiji: 1, kuanggong: 1, haiteng: 1, yuanzhang: 1, heyuxi: 1, diaoyulao: 1, martin: 1 };
    return ok[id] ? id : 'tang';
  }

  var prevEnd = XY.R4 && XY.R4.end;
  var AUTO_META = {
    points: { name: '自动加点', desc: '升级后自动分配技能点。', hint: '' },
    treat: { name: '自动犒赏', desc: function (G) {
      var tr = XY.C.SOLBUFF.treat;
      return tr.cost + '金：减伤' + Math.round(tr.dr * 100) + '% / ' + tr.t + '秒' +
        (G && G.td && G.td.on ? '' : '，驻留+' + Math.round(tr.life * 100) + '%') + '；不回血。';
    }, hint: '手动 F' },
    guest: { name: '自动召唤', desc: '特殊人物能召唤时自动召出。', hint: '手动 G' },
    pick: { name: '自动选宝', desc: '三选一时自动选推荐。', hint: '手动 1 2 3' }
  };
  function inkSheet(c, x, y, w, h) {
    c.save();
    c.beginPath();
    c.moveTo(x + 18, y + 6);
    c.quadraticCurveTo(x + w * 0.35, y - 8, x + w * 0.72, y + 8);
    c.quadraticCurveTo(x + w + 6, y + 18, x + w - 4, y + h * 0.42);
    c.quadraticCurveTo(x + w + 10, y + h * 0.7, x + w - 12, y + h - 10);
    c.quadraticCurveTo(x + w * 0.55, y + h + 8, x + 22, y + h - 6);
    c.quadraticCurveTo(x - 8, y + h * 0.55, x + 8, y + h * 0.22);
    c.quadraticCurveTo(x - 4, y + 24, x + 18, y + 6);
    c.closePath();
    c.fillStyle = 'rgba(246,239,226,0.94)';
    c.fill();
    c.clip();
    if (XY.villainUI && XY.villainUI.washE) {
      XY.villainUI.washE(c, x + w * 0.18, y + h * 0.22, w * 0.55, h * 0.28, '70,54,36', 0.16);
      XY.villainUI.washE(c, x + w * 0.82, y + h * 0.78, w * 0.4, h * 0.22, '120,48,36', 0.1);
    }
    c.restore();
    c.save();
    c.strokeStyle = 'rgba(42,32,22,0.55)';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(x + 22, y + 14);
    c.quadraticCurveTo(x + w * 0.4, y + 4, x + w - 28, y + 16);
    c.stroke();
    c.restore();
  }
  function inkMark(c, kind, x, y, s) {
    c.save();
    c.translate(x, y);
    c.strokeStyle = 'rgba(42,32,22,0.85)';
    c.fillStyle = 'rgba(42,32,22,0.85)';
    c.lineWidth = Math.max(1.2, s * 0.08);
    c.lineCap = 'round';
    if (kind === 'points') {
      c.beginPath(); c.moveTo(-s * 0.3, s * 0.2); c.quadraticCurveTo(0, -s * 0.45, s * 0.35, -s * 0.05); c.stroke();
      c.beginPath(); c.arc(s * 0.05, s * 0.12, s * 0.1, 0, 6.3); c.fill();
    } else if (kind === 'treat') {
      c.beginPath(); c.arc(0, 0, s * 0.28, 0, 6.3); c.stroke();
      c.font = (s * 0.32) + 'px "Ma Shan Zheng","KaiTi",serif';
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('赏', 0, 1);
    } else if (kind === 'guest') {
      c.beginPath(); c.arc(0, -s * 0.16, s * 0.12, 0, 6.3); c.stroke();
      c.beginPath(); c.moveTo(-s * 0.22, s * 0.28); c.quadraticCurveTo(0, -s * 0.02, s * 0.22, s * 0.28); c.stroke();
    } else {
      var i;
      for (i = 0; i < 3; i++) {
        c.strokeRect(-s * 0.34 + i * s * 0.24, -s * 0.16, s * 0.16, s * 0.32);
      }
    }
    c.restore();
  }
  if (XY.ov) XY.ov.pause = function (c, G, a) {
    var K = openVeil(c, a), scale = 1, W = K.W, H = K.H;
    // 暂停页跟着界面倍数放大（K 单位 = 界面倍数 × 屏幕像素）；原来固定按屏幕像素画，大屏上缩成一小块。
    c.scale(1 / scale, 1 / scale);
    var short = H < 480, narrow = W < 420, compact = H < 660;
    var pad = short ? 12 : narrow ? 16 : 24;
    var pw = Math.min(W - 24, short ? 900 : 660), w = pw - pad * 2;
    var headH = short ? 34 : narrow ? 62 : 42, btnH = 48;
    var rowH = short ? 52 : compact ? 50 : narrow ? 76 : 68;
    var cols = short ? 2 : 1, rows = 4 / cols;
    var ph = pad * 2 + headH + btnH + 8 + 44 + 8 + 28 + rows * rowH;
    var px = (W - pw) / 2, py = (H - ph) / 2, x = px + pad, y = py + pad;
    var layout = XY.ov.pauseLayout = { css: !(K.s > 1), uiScale: K.s || 1, width: W, height: H, panel: { x: px, y: py, w: pw, h: ph }, short: short, compact: compact, buttons: [], rows: [], texts: [] };
    function hit(x0, y0, w0, h0, act, ex) {
      K.hit(x0 / scale, y0 / scale, w0 / scale, h0 / scale, act, ex);
      layout.buttons.push({ x: x0, y: y0, w: w0, h: h0, act: act, key: ex && ex.key });
    }
    function text(kind, value, x0, y0, size, color, maxW, align) {
      var actual = kai(c, value, x0, y0, size, color, align || 'left', maxW);
      layout.texts.push({ kind: kind, text: String(value), x: x0, y: y0, size: actual });
    }
    inkSheet(c, px, py, pw, ph);
    text('title', '暂驻', x, y + 15, short ? 28 : 32, '#a42d19', w);
    var stats = '已坚持 ' + XY.fmtTime(G.t) + ' · ' + G.level + ' 级 · 击杀 ' + XY.fmtNum(G.kills);
    text('stats', stats, x + (narrow && !short ? 0 : 82), y + (narrow && !short ? 43 : 16), 14, '#5c4a38', w - (narrow && !short ? 0 : 82));
    y += headH;
    var gap = 8, bw = (w - gap * 2) / 3;
    inkBar(c, x, y, bw, btnH, '继续', true); hit(x, y, bw, btnH, 'resume');
    paleBar(c, x + bw + gap, y, bw, btnH, '重来'); hit(x + bw + gap, y, bw, btnH, 'restart');
    paleBar(c, x + (bw + gap) * 2, y, bw, btnH, '回首页'); hit(x + (bw + gap) * 2, y, bw, btnH, 'home');
    y += btnH + 8;
    var muted = !!(XY.audio && XY.audio.mute), soundW = Math.min(180, w);
    inkBar(c, x, y, soundW, 44, muted ? '声音 · 关' : '声音 · 开', !muted);
    hit(x, y, soundW, 44, 'muteTog');
    if (XY.ultClimax && XY.ultClimax.enabled && w - soundW - 8 >= 150) {      // 全屏必杀图开关，和声音并排
      var ultOn = XY.ultClimax.enabled(), ultW = Math.min(220, w - soundW - 8), ultX = x + soundW + 8;
      if (ultOn) inkBar(c, ultX, y, ultW, 44, '必杀大图 · 开', true); else paleBar(c, ultX, y, ultW, 44, '必杀大图 · 关');
      hit(ultX, y, ultW, 44, 'ultPicTog');
    }
    y += 52;
    text('section', '自动', x, y + 10, 20, '#a42d19', 70);
    text('hint', '点选切换开 / 关', x + w, y + 10, 14, '#6d6455', w - 70, 'right');
    y += 28;
    if (XY.auto) {
      ['points', 'treat', 'guest', 'pick'].forEach(function (key, i) {
        var on = !!XY.auto.get(key), meta = AUTO_META[key], rh = rowH - 6;
        var cw = (w - (cols - 1) * gap) / cols, bx = x + (i % cols) * (cw + gap), by = y + Math.floor(i / cols) * rowH;
        c.save(); c.fillStyle = on ? 'rgba(168,50,36,.08)' : 'rgba(90,74,52,.055)'; XY.R.rrect(c, bx, by, cw, rh, 5); c.fill(); c.restore();
        var badge = 36, badgeX = bx + cw - badge - 6, badgeY = by + (compact ? (rh - badge) / 2 : 4);
        if (on) inkBar(c, badgeX, badgeY, badge, badge, '开', true);
        else paleBar(c, badgeX, badgeY, badge, badge, '关');
        text('option', meta.name, bx + 10, by + (compact ? rh / 2 : 17), 18, '#24180f', cw - 60);
        if (!compact) {
          var line = '', lines = [], width = cw - 66;
          c.font = '16px "Ma Shan Zheng","KaiTi",serif';
          (typeof meta.desc === 'function' ? meta.desc(G) : meta.desc).split('').forEach(function (ch) { if (line && c.measureText(line + ch).width > width) { lines.push(line); line = ch; } else line += ch; });
          if (line) lines.push(line);
          lines.forEach(function (value, j) { text('description', value, bx + 10, by + 41 + j * 20, 16, '#5c4a38', width); });
        }
        hit(bx, by, cw, rh, 'autoTog', { key: key });
        layout.rows.push({ key: key, x: bx, y: by, w: cw, h: rh, on: on });
      });
    }
    close(c);
  };

  function failureCopy(G) {
    var e = G.ending || {}, cause = e.cause;
    function readable(value) { return typeof value === 'string' && /[\u3400-\u9fff]/.test(value) && !/undefined|null|NaN/.test(value) ? value : ''; }
    var recorded = readable(e.why) || readable(e.reason);
    if (cause === 'tang') {
      if (e.how === 'breach') return { reason: '妖怪闯入营地，直接击倒了唐僧', hint: G.camp && G.camp.hp > 0 ? '营地耐久尚存，也不能让妖怪接触师父' : '营地不能替师父抵挡接触攻击' };
      if (e.how === 'contact') return { reason: '妖怪接触到唐僧，师父当场阵亡', hint: '唐僧只有1点生命，请让徒弟拦住靠近的妖怪' };
      if (e.how === 'etower') return { reason: recorded || '妖塔的飞弹击中了师父', hint: '挡住朝向师父的飞弹，并优先摧毁正在攻击的妖塔' };
      if (e.how === 'proj') return { reason: recorded || '妖怪的远程攻击击中了唐僧', hint: '唐僧只有1点生命，请挡住朝向师父的弹道' };
      if (e.how === 'boss') return { reason: recorded || '头目的攻击击中了唐僧', hint: '唐僧只有1点生命，需躲开头目的攻击' };
      return { reason: recorded || '唐僧受到攻击，师父阵亡', hint: '唐僧被击中就会失败' };
    }
    if (cause === 'camp') return { reason: '妖怪耗尽了营地耐久，经书营地失守', hint: '守住营地，别让妖怪持续攻击' };
    var known = { cave: '洞府耐久耗尽，洞府失守', niumo: '牛魔王倒下了', wipe: '英雄全部倒下了', stall: '90秒未能继续攻破妖塔', timeout: '25分钟内未能完成挑战' };
    return { reason: recorded || known[cause] || '本次挑战未能完成', hint: '' };
  }

  if (prevEnd) XY.R4.end = function (c, G, a, win) {
    if (G.villain || G.lair) return prevEnd(c, G, a, win);
    var K = open(c, a), W = K.W, H = K.H, port = K.port, short = !port && H < 420;
    var cause = G.ending && G.ending.cause;
    var title = G.godMode ? '调试局 · 不记星、不发奖' : win ? '过 关' : cause === 'tang' ? '师父阵亡' : cause === 'camp' ? '营地失守' : '挑战失败';
    var x = port ? 18 : 24;
    var w = port ? W - 36 : Math.round(W * (short ? 0.46 : 0.5));
    var btnH = short ? 36 : 46;
    var btnY = H - 8 - btnH;
    var noteY = btnY - (short ? 22 : 28);
    var size = short ? 15 : (port ? 16 : 18), lh = size + (short ? 8 : 12);
    var casualties = XY.runCasualties(G), failureLines = [], failure = !win && failureCopy(G);
    c.save(); c.font = size + 'px "Ma Shan Zheng","KaiTi",serif';
    var currentLines = XY.runCasualtyLines(c, casualties, w, '当前倒地：');
    if (failure) {
      XY.R.wrapLines(c, '失败原因：' + failure.reason, w).forEach(function (line) { failureLines.push({ t: line, c: '#a42d19', measured: true }); });
      if (failure.hint) XY.R.wrapLines(c, failure.hint, w).forEach(function (line) { failureLines.push({ t: line, c: '#5c4034', measured: true }); });
    }
    c.restore();
    var contentTop = port ? Math.round(H * 0.46) : (short ? 104 : 150);
    // On a short portrait screen, give the concrete failure and complete
    // casualty list priority over the decorative illustration's height.
    if (port && failure) contentTop = Math.min(contentTop, Math.max(166, noteY - 8 - size / 2 - (failureLines.length + 1 + currentLines.length) * lh));
    var figH = port ? Math.min(H * 0.34, 280) : (short ? H * 0.86 : Math.min(H - 20, 560));
    var figFoot = port ? contentTop - 12 : H - 4;
    if (port) figH = Math.min(figH, Math.max(1, figFoot - 132)); // clear the title, stage subtitle and stars
    cutout(c, whoId(G), port ? W * 0.74 : (short ? W * 0.78 : W * 0.76), figFoot, figH, W * (port ? 0.46 : short ? 0.4 : 0.44));
    kai(c, title, port ? 18 : (short ? 20 : x), short ? 24 : 40, short ? 32 : 44, win ? '#a8680a' : '#a42d19', 'left', port ? W - 36 : (short ? W * 0.34 : w));
    kai(c, XY.lvPre(G) + G.lv.name + '」' + (win ? ' · 关口「' + G.gate.name + '」' : ''), port ? 18 : (short ? 20 : x), short ? 50 : 78, short ? 13 : 16, '#5c4a38', 'left', port ? W - 36 : (short ? W * 0.34 : w));
    var si = !G.godMode && XY.sweep09 && XY.sweep09.resultStars(G, win);
    if (si) kai(c, si.show ? si.text + (si.isNew ? ' · 新纪录' : '') : (si.faint || ''), short ? 20 : (port ? 18 : x), short ? 72 : (port ? 112 : 112), short ? 16 : 22, '#a42d19', 'left', port ? W - 36 : (short ? W * 0.34 : w));
    var lines = failureLines.slice();
    lines.push({ t: XY.fmtTime(G.t) + '  ·  ' + G.level + ' 级  ·  击杀 ' + G.kills, c: '#2b1c08' });
    var dr = G.runReport && G.runReport.diff;      // 五档难度：这一局是哪一档、按档位拿了多少、有没有开下一档
    if (dr && dr.name) {
      var dparts = ['难度「' + dr.name + '」'];
      if (win) {
        var cg = (G.run && G.run.clearGain) || 0; if (cg > 0) dparts.push('灵石 +' + cg + (dr.lingshiMul && dr.lingshiMul !== 1 ? '（×' + dr.lingshiMul + '）' : ''));
        var dsp = (G.spGot || []).filter(function (q) { return q && q.src === 'diff'; });
        if (dsp.length) dparts.push('档位角色卡 ' + dsp.map(function (q) { return (XY.SP_BY[q.id] || {}).name || q.id; }).join('、'));
        if (dr.opened) dparts.push('已开放「' + dr.opened + '」档');
      }
      lines.push({ t: dparts.join(' · '), c: win ? '#a8680a' : '#2b1c08' });
    }
    lines.push({ t: '本局倒地：' + casualties.count + ' 次', c: '#2b1c08' });
    currentLines.forEach(function (line) { lines.push({ t: line, c: casualties.names.length ? '#a42d19' : '#2b1c08' }); });
    var quests = [G.quests.main].concat(G.quests.sides || []);
    quests.forEach(function (q, i) {
      if (!q) return;
      var rw = q.def.reward || {};
      var r = q.done ? [(rw.lingshi ? '灵石 +' + rw.lingshi : ''), (rw.card ? '法宝' : ''), (rw.shard ? '碎片 +' + rw.shard : '')].filter(Boolean).join(' ') : '未完成';
      lines.push({ t: (i ? '支线' : '主线') + ' · ' + q.def.short + '  ' + (q.done ? ('成' + (r ? ' · ' + r : '')) : '未完成'), c: q.done ? '#a42d19' : '#2b1c08' });
    });
    if (!short) lines.push({ t: G.dungeon ? '一星 通关 · 二星 阵亡不超过三次 · 三星 无人阵亡' : '一星 通关本关    二星 至少一条支线    三星 无人阵亡', c: '#5c4034' });
    var y = contentTop;
    var maxLines = (short ? 5 : 12) + currentLines.length - 1 + failureLines.length;
    lines.slice(0, maxLines).forEach(function (ln) {
      if (y + size / 2 > noteY - 8) return;
      var world0 = XY.ui2 && XY.ui2.world;
      if (ln.measured && XY.ui2) XY.ui2.world = true;
      kai(c, ln.t, x, y, size, ln.c, 'left', w);
      if (ln.measured && XY.ui2) XY.ui2.world = world0;
      y += lh;
    });
    var jn = G.mod ? '非官方玩法包：不发奖励，不记通关' : G.dungeon ? (win ? '洞府副本不计入取经之旅' : '副本失败不扣任何东西') : win ? (G.levelId < XY.LEVEL_COUNT ? '全队成长已存档，第 ' + (G.levelId + 1) + ' 关已解锁' : '取经之旅走完，成长已存档') : '再来回到本关开始';
    kai(c, jn, x, noteY, short ? 14 : 16, '#2b1c08', 'left', w);
    var hasNext = win && !G.dungeon && !G.mod && G.levelId < XY.LEVEL_COUNT;
    var A = hasNext ? [['下一关', 'nextLevel', true], ['再来', 'restart'], ['首页', 'home']] : !win ? [['再来', 'restart', true], ['换角色', 'repick'], ['首页', 'home']] : [['再来', 'restart', true], ['首页', 'home']];
    if (win && G.bossOffer && XY.bossfight && XY.bossfight.launch) A.splice(hasNext ? 1 : 0, 0, ['Boss 战', 'bossGo']);
    var bw = (w - (A.length - 1) * 8) / A.length;
    A.forEach(function (b, i) {
      var bx = x + i * (bw + 8);
      if (b[2]) inkBar(c, bx, btnY, bw, btnH, b[0], true);
      else paleBar(c, bx, btnY, bw, btnH, b[0]);
      K.hit(bx, btnY, bw, btnH, b[1]);
    });
    close(c);
  };

  function cnRank(raw) {
    var s = String(raw || '');
    var map = { L: '传说', SSR: '传说', SR: '传说', R: '稀有', N: '普通', '神品': '传说', '仙品': '传说', '灵品': '稀有', '凡品': '普通' };
    if (map[s]) return map[s];
    var d = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    return s.replace(/Lv\s*(\d+)/gi, function (_, n) { return (d[+n] || n) + '重'; });
  }
  function offerWho(G) {
    if (!G || !XY.xAvIcon || !XY.xAvIcon.isSpecial) return '';
    if (G.special && XY.xAvIcon.isSpecial(G.special)) return G.special;
    var h = G.heroes && G.heroes[G.ctrl || 1];
    var id = h && (h.id || (h.def && h.def.id));
    if (id && id !== 'tang' && XY.xAvIcon.isSpecial(id)) return id;
    var carry = XY.save && XY.save.carryId && XY.save.carryId();
    if (carry && XY.xAvIcon.isSpecial(carry)) return carry;
    return '';
  }
  // 选宝统一交给 folio3：全部候选、详情与封印使用同一分页布局。

})();
