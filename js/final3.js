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
  function cutout(c, id, x, foot, h) {
    cutout.bag = cutout.bag || {};
    var im = cutout.bag[id];
    if (!im) { im = cutout.bag[id] = new Image(); im.src = 'assets/art/battle-hd/' + id + '.webp'; }
    c.save();
    c.globalAlpha = 1;
    c.fillStyle = 'rgba(42,32,22,0.16)';
    c.beginPath(); c.ellipse(x, foot - 4, h * 0.3, h * 0.05, 0, 0, Math.PI * 2); c.fill();
    if (im.complete && im.naturalWidth) {
      var w = h * im.naturalWidth / im.naturalHeight;
      c.drawImage(im, x - w / 2, foot - h * 0.96, w, h);
    }
    c.restore();
  }
  function whoId(G) {
    var who = G.heroes && (G.heroes[G.ctrl] || G.heroes[0]);
    var id = who && who.id;
    var ok = { tang: 1, wukong: 1, bajie: 1, wujing: 1, horse: 1, phyrex: 1, sisi: 1, laosiji: 1, kuanggong: 1, haiteng: 1, yuanzhang: 1, heyuxi: 1, diaoyulao: 1, martin: 1 };
    return ok[id] ? id : 'tang';
  }

  var prevEnd = XY.R4 && XY.R4.end;
  var AUTO_META = {
    points: { name: '自动加点', desc: '升级后自动分配技能点。', hint: '' },
    treat: { name: '自动犒赏', desc: '花 30 金币给天兵补寿命、减伤。', hint: '手动 F' },
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
    var K = openVeil(c, a), W = K.W, H = K.H, port = K.port || H > W;
    var touch = !!(a.touchUI || port);
    var short = H < 420;
    var pw = Math.max(280, Math.min(W - 16, short ? W - 12 : (port ? W - 20 : 560)));
    var head = short ? 28 : 52;
    var btnH = short ? 32 : 46;
    var rowH = short ? 34 : (port ? 58 : 52);
    var autoH = short ? 16 + 2 * rowH : 22 + 4 * rowH;
    var ph = Math.min(H * 0.9, head + btnH + 8 + (short ? 28 : 44) + autoH + (short ? 6 : 16));
    var px = Math.round((W - pw) / 2), py = Math.round((H - ph) / 2);
    inkSheet(c, px, py, pw, ph);
    var x = px + 16, w = pw - 32, y = py + (short ? 18 : 26);
    kai(c, '暂驻', x, y, short ? 22 : 28, '#a42d19', 'left', w * 0.45);
    kai(c, '已坚持 ' + XY.fmtTime(G.t) + ' · ' + G.level + ' 级 · 击杀 ' + XY.fmtNum(G.kills), x + (short ? 78 : 96), y, short ? 13 : 15, '#5c4a38', 'left', w - (short ? 84 : 110));
    y += short ? 22 : 30;
    var seal = short ? 64 : 78;
    inkBar(c, x, y, seal, btnH, '继续', true);
    K.hit(x, y, seal, btnH, 'resume', null);
    var gap = 8, rest = w - seal - gap * 2;
    var bw = (rest - gap) / 2;
    paleBar(c, x + seal + gap, y, bw, btnH, '重来');
    K.hit(x + seal + gap, y, bw, btnH, 'restart', null);
    paleBar(c, x + seal + gap * 2 + bw, y, bw, btnH, '回首页');
    K.hit(x + seal + gap * 2 + bw, y, bw, btnH, 'home', null);
    y += btnH + (short ? 6 : 8);
    var muted = !!(XY.audio && XY.audio.mute);
    inkBar(c, x, y, Math.min(168, w), short ? 32 : 36, muted ? '声音 · 关' : '声音 · 开', !muted);
    K.hit(x, y, Math.min(168, w), short ? 32 : 36, 'muteTog', null);
    y += (short ? 32 : 36) + (short ? 6 : 10);
    kai(c, '自动', x, y, short ? 16 : 20, '#a42d19', 'left', 80);
    if (!touch) kai(c, '开是红印，关是淡墨', x + 56, y, 12, 'rgba(90,70,48,0.7)', 'left', w - 60);
    y += short ? 16 : 20;
    if (XY.auto) {
      var keys = ['points', 'treat', 'guest', 'pick'];
      var cols = short ? 2 : 1;
      keys.forEach(function (key, i) {
        var on = !!XY.auto.get(key), meta = AUTO_META[key], rh = rowH - 4;
        var col = cols === 1 ? 0 : i % 2, row = cols === 1 ? i : (i / 2) | 0;
        var cw = cols === 1 ? w : (w - 8) / 2;
        var bx = x + col * (cw + 8), by = y + row * rowH;
        inkMark(c, key, bx + 14, by + rh * 0.38, short ? 18 : 28);
        if (on) inkBar(c, bx + 32, by + 2, short ? 32 : 42, rh - 8, '开', true);
        else paleBar(c, bx + 32, by + 2, short ? 32 : 42, rh - 8, '关');
        var tx = bx + (short ? 70 : 86);
        kai(c, meta.name, tx, by + (short ? 10 : 16), short ? 13 : 16, '#24180f', 'left', cw * 0.55);
        if (!short) kai(c, meta.desc, tx, by + 36, 14, '#5c4a38', 'left', cw - (tx - bx) - 4);
        K.hit(bx, by, cw, rh, 'autoTog', { key: key });
      });
    }
    close(c);
  };

  if (prevEnd) XY.R4.end = function (c, G, a, win) {
    if (G.villain || G.lair) return prevEnd(c, G, a, win);
    var K = open(c, a), W = K.W, H = K.H, port = K.port, short = !port && H < 420;
    var cause = G.ending && G.ending.cause;
    var title = G.godMode ? '调试局 · 不记星、不发奖' : win ? '过 关' : cause === 'tang' ? '师傅阵亡' : '基地被入侵';
    var x = port ? 18 : 24;
    var w = port ? W - 36 : Math.round(W * (short ? 0.46 : 0.5));
    var btnH = short ? 36 : 46;
    var btnY = H - 8 - btnH;
    var noteY = btnY - (short ? 22 : 28);
    var contentTop = port ? Math.round(H * 0.46) : (short ? 78 : 150);
    var figH = port ? Math.min(H * 0.34, 280) : (short ? H * 0.86 : Math.min(H - 20, 560));
    var figFoot = port ? contentTop - 12 : H - 4;
    cutout(c, whoId(G), port ? W * 0.74 : (short ? W * 0.78 : W * 0.76), figFoot, figH);
    kai(c, title, port ? 18 : (short ? 20 : x), short ? 24 : 40, short ? 32 : 44, win ? '#a8680a' : '#a42d19', 'left', port ? W - 36 : (short ? W * 0.34 : w));
    kai(c, XY.lvPre(G) + G.lv.name + '」' + (win ? ' · 关口「' + G.gate.name + '」' : ''), port ? 18 : (short ? 20 : x), short ? 50 : 78, short ? 13 : 16, '#5c4a38', 'left', port ? W - 36 : (short ? W * 0.34 : w));
    var si = !G.godMode && XY.sweep09 && XY.sweep09.resultStars(G, win);
    if (si) kai(c, si.show ? si.text + (si.isNew ? ' · 新纪录' : '') : (si.faint || ''), short ? 20 : (port ? 18 : x), short ? 72 : (port ? 112 : 112), short ? 16 : 22, '#a42d19', 'left', port ? W - 36 : (short ? W * 0.34 : w));
    var dead = (G.heroes || []).filter(function (h) { return h.down; }).map(function (h) { return h.def.name; });
    var lines = [];
    lines.push({ t: XY.fmtTime(G.t) + '  ·  ' + G.level + ' 级  ·  击杀 ' + G.kills, c: '#2b1c08' });
    lines.push({ t: '阵亡英雄：' + (dead.join('、') || '无'), c: '#2b1c08' });
    var quests = [G.quests.main].concat(G.quests.sides || []);
    quests.forEach(function (q, i) {
      if (!q) return;
      var rw = q.def.reward || {};
      var r = q.done ? [(rw.lingshi ? '灵石 +' + rw.lingshi : ''), (rw.card ? '法宝' : ''), (rw.shard ? '碎片 +' + rw.shard : '')].filter(Boolean).join(' ') : '未完成';
      lines.push({ t: (i ? '支线' : '主线') + ' · ' + q.def.short + '  ' + (q.done ? ('成' + (r ? ' · ' + r : '')) : '未完成'), c: q.done ? '#a42d19' : '#2b1c08' });
    });
    if (!short) lines.push({ t: G.dungeon ? '一星 通关 · 二星 阵亡不超过三次 · 三星 无人阵亡' : '一星 通关本关    二星 至少一条支线    三星 无人阵亡', c: '#5c4034' });
    var y = contentTop, size = short ? 15 : (port ? 16 : 18), lh = size + (short ? 8 : 12);
    var maxLines = short ? 4 : 12;
    lines.slice(0, maxLines).forEach(function (ln) {
      if (y + size / 2 > noteY - 8) return;
      kai(c, ln.t, x, y, size, ln.c, 'left', w);
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
  var U = XY.fabaoui;
  if (U && U.scrolls) {
    var oldScroll = U.scrolls;
    U.scrolls = function (c, G, a, items, op) {
      if (!XY.ui2 || !XY.ui2.on) return oldScroll(c, G, a, items, op);
      var K = openVeil(c, a), W = K.W, H = K.H, port = K.port, VU = XY.villainUI;
      var short = !port && H < 420;
      var pw = Math.min(port ? W - 16 : W * 0.58, W - 16);
      var ph = Math.min(short ? H - 12 : H * 0.6, H - 16);
      var px = Math.round((W - pw) / 2), py = Math.round((H - ph) / 2);
      inkSheet(c, px, py, pw, ph);
      var who = offerWho(G);
      var av = Math.max(64, Math.min(88, Math.min(pw * 0.2, ph * 0.22)));
      var hero = G.heroes && G.heroes[G.ctrl || 1];
      var head = 8 + av + 14;
      if (who && XY.xAvIcon) XY.xAvIcon.draw(c, who, px + 14, py + 8, av, av);
      else if (hero && XY.hud2 && XY.hud2.face) XY.hud2.face(c, hero, px + 14 + av / 2, py + 8 + av / 2, av * 0.42, a.rt || 0);
      kai(c, op.title || '选一件', px + 22 + av, py + 8 + av / 2, short ? 20 : 26, '#a42d19', 'left', pw - av - 40);
      var n = Math.min(3, items.length), gap = port ? 8 : 12;
      var btnH = short ? 34 : 42;
      var btnY = py + ph - btnH - 12;
      var top = py + head;
      var areaH = btnY - 8 - top;
      var cards = [];
      var cw = (pw - 24 - gap * (n - 1)) / n;
      for (var j = 0; j < n; j++) cards.push({ x: px + 12 + j * (cw + gap), y: top, w: cw, h: areaH });
      items.slice(0, n).forEach(function (it, i) {
        var b = cards[i], x = b.x, y = b.y, w = b.w, h = b.h;
        c.save();
        var g = c.createLinearGradient(x, y, x, y + h);
        g.addColorStop(0, '#fcf7e8'); g.addColorStop(1, '#efe2c4');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(x + 8, y + 3);
        c.quadraticCurveTo(x + w * 0.5, y - 2, x + w - 6, y + 4);
        c.quadraticCurveTo(x + w + 1, y + h * 0.5, x + w - 4, y + h - 6);
        c.quadraticCurveTo(x + w * 0.45, y + h + 2, x + 6, y + h - 3);
        c.quadraticCurveTo(x - 1, y + h * 0.4, x + 8, y + 3);
        c.closePath(); c.fill();
        c.restore();
        if (VU && VU.washE) VU.washE(c, x + w * 0.28, y + h * 0.55, w * 0.55, h * 0.22, '90,78,58', 0.14);
        kai(c, it.name || '', x + w / 2, y + Math.max(16, h * 0.1), Math.max(15, Math.min(26, w * 0.16)), '#2b1c08', 'center', w - 12);
        var rank = cnRank(it.lv || it.r || '');
        kai(c, rank, x + w / 2, y + Math.max(34, h * 0.2), 14, '#a42d19', 'center', w - 12);
        var art = Math.min(w * 0.62, h * 0.32);
        if (XY.ICONINK && it.name) XY.ICONINK.draw(c, it.name, x + w / 2, y + h * 0.42, art);
        var eff = cnRank(it.eff || '');
        c.save();
        c.beginPath(); c.rect(x + 4, y + h * 0.62, w - 8, h * 0.36); c.clip();
        var face = '"Ma Shan Zheng","KaiTi",serif';
        var es = Math.max(12, Math.min(15, w * 0.13));
        c.font = es + 'px ' + face;
        var lines = [], cur = '', ci, ch;
        for (ci = 0; ci < eff.length; ci++) {
          ch = eff.charAt(ci);
          if (cur && c.measureText(cur + ch).width > w - 14) { lines.push(cur); cur = ch; }
          else cur += ch;
        }
        if (cur) lines.push(cur);
        if (lines.length > 3) lines.length = 3;
        var lh = es + 3, y0 = y + h - 8 - lines.length * lh;
        c.fillStyle = '#24180f'; c.textAlign = 'center'; c.textBaseline = 'top';
        for (ci = 0; ci < lines.length; ci++) c.fillText(lines[ci], x + w / 2, y0 + ci * lh);
        c.restore();
        K.hit(x, y, w, h - 4, 'offerPick', { k: i });
      });
      var bw = (pw - 36) / 2;
      paleBar(c, px + 12, btnY, bw, btnH, op.skipLabel || '都不要，换金币');
      K.hit(px + 12, btnY, bw, btnH, 'offerPick', { k: -1 });
      inkBar(c, px + 24 + bw, btnY, bw, btnH, op.rrLabel || '重抽', !op.rrDis);
      if (!op.rrDis) K.hit(px + 24 + bw, btnY, bw, btnH, 'offerReroll');
      close(c);
    };
  }
})();
