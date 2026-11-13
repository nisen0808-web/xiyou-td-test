/* ============================================================
 * depart.js —— 「出发」页（screen = 'levels'，首页「开始取经」点进来；原来叫「选关出发」）
 * 所有官方关卡都在这一页，像选关一样点选：基础关（第 1~N 关）· 洞府副本（黑风洞 / 白虎岭）· Boss 战（牛魔王，按 XY.chain09.visible 出现）。
 * 反派模式（同样按 XY.chain09.visible）是一枚单独的按钮；排行榜、灵石商店、重新开始取经、版本开关是墨条按钮；「更多」朱红印 → 二级页「洞府阁」（修行 / 杂务）。
 * 画法和洞府阁同一套水墨海报风（villainUI 原语：宣纸底 + 朱印 + 毛笔墨条），按 CSS 像素排版（scale(1/zoom)），点击框 ≥ 44 CSS px。
 * 点击 act 全沿用原来的：levelSel / levelGo / dungeonGo / menuBoss / menuVillain / menuBoard / menuShop / menuRestart / toggleVer / carryPick / xchar / lockedSlot / back，
 * 只新增 dpSel（选中副本 / Boss 卡）。返回路径：从出发页进的子页（洞府阁 / 商店 / 排行榜 / 反派）返回都回出发页（main.js 的 app.retStack）。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, VU = XY.villainUI, S = XY.save, R = XY.R, HUB = XY.hubUI;
  var INK = '#3a3226', SOFT = '#6d6455', RED = '#b8322a', BROWN = '#7a4a32', PUR = '#6f4aa8', DEEP = '#9a2620';
  var DP = XY.depart = { kind: 'level', id: 1, prev: null };
  var NAV = { menuHub: 1, menuShop: 1, menuBoard: 1, menuVillain: 1, menuDungeon: 1, menuDeck: 1, menuDex: 1, menuUnlock: 1 };
  var imgs = {};
  function pic(key, src, inline) {
    var i = imgs[key]; if (!i) { var inl = window.XY_MENU_V5; i = imgs[key] = new Image(); i.src = inline || (inl && inl[key]) || src; }
    return i.complete && i.naturalWidth > 0 ? i : null;
  }
  /* 特殊角色的 X 头像：和主菜单（menu_v5 / menu_stage）同一套素材 —— dist 里是内联的 window.XY_X_AVATARS，源码版读 assets/art/x-avatars/<id>.webp；没有 / 没加载好就回退成原来的自绘头像 */
  function xAv(id) { return pic('xav_' + id, 'assets/art/x-avatars/' + id + '.webp'); }
  function xDisc(c, id, cx, cy, r, on) {
    var im = xAv(id); if (!im) return false;
    c.save(); c.fillStyle = 'rgba(58,50,38,0.12)'; c.beginPath(); c.arc(cx + 1, cy + 1.8, r + 1, 0, 6.2832); c.fill(); c.restore();
    c.save(); c.beginPath(); c.arc(cx, cy, r, 0, 6.2832); c.closePath(); c.clip(); c.drawImage(im, cx - r, cy - r, 2 * r, 2 * r); c.restore();
    c.save(); c.beginPath(); c.arc(cx, cy, r, 0, 6.2832); c.lineWidth = on ? 2.2 : 1.6; c.strokeStyle = on ? RED : 'rgba(58,50,38,0.6)'; c.stroke(); c.restore();
    return true;
  }
  function elem(e) { return XY.ELEMS[e] || { name: '', color: '#888' }; }
  function say(a, text, bad) { a.menuMsg = { text: text, bad: !!bad, until: a.rt + 3 }; }

  /* 官方关卡清单（顺序：基础关 → 副本 → Boss 战） */
  DP.items = function () {
    var C = XY.chain09, out = [], i, n = XY.LEVEL_COUNT;
    for (i = 1; i <= n; i++) { var L = XY.levelOf(i), info = S.levelInfo(i); out.push({ k: 'level', id: i, tag: '第 ' + i + ' 关', seal: String(i), name: L.name, sub: L.dens.length + ' 座洞府', unl: S.levelUnlocked(i), cleared: !!(info && info.cleared), col: RED, hint: '先通关上一关' }); }
    (XY.DUNGEONS || []).forEach(function (d) { var info = S.dngInfo(d.id); out.push({ k: 'dungeon', id: d.id, tag: '副本', seal: '洞', name: d.name, sub: d.sub, unl: S.dngUnlocked(d.id), cleared: !!(info && info.cleared), col: BROWN, hint: '先通关第 1 关一次' }); });
    if (C && C.visible('bossfight')) { var ch = S.data.chain; out.push({ k: 'boss', id: 'niumo', tag: 'Boss 战', seal: '战', name: '牛魔王', sub: 'Boss 战 · 街霸式对战', unl: true, cleared: !!(ch && ch.boss && ch.boss.niumo > 0), col: DEEP, hint: '' }); }
    return out;
  };
  function sel(a, items) {
    var i, s = null;
    if (DP.kind === 'level') DP.id = a.levelId;
    for (i = 0; i < items.length; i++) if (items[i].k === DP.kind && items[i].id === DP.id) s = items[i];
    if (!s) { DP.kind = 'level'; DP.id = a.levelId; s = items[Math.max(0, a.levelId - 1)] || items[0]; }
    return s;
  }

  /* ================= v0.9 ui3：水墨海报版出发页 =================
   * 横屏：左半「印帖竖卡」一排（取经路 / 洞府副本 / Boss 战三组）+ 卡下直接写在纸上的关卡说明；右半当前携带特殊角色定妆大图 + 反派 / 重开 + 大红「出发！」；
   * 底部一行圆形 X 头像（携带常驻，同首页 credits 的气质）；页头右侧是弱化的墨条小入口（版本 / 排行榜 / 商店）+ 朱红「更多」。
   * 竖屏：竖卡一排 → 说明 → 立绘 → 反派 / 重开 → 出发！ → 头像两行 → 排行榜 / 商店 / 版本。 */
  var KAI = (XY.menu && XY.menu.KAI) || '"STKaiti","KaiTi","楷体","Noto Serif CJK SC","Source Han Serif SC",serif', PI2 = Math.PI * 2;
  var NUM = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  var GROUP = { level: '取经路', dungeon: '洞府副本', boss: 'Boss 战' };
  function kt(c, s, x, y, sz, col, al, maxW, bold) {
    s = String(s); c.font = (bold === false ? '' : 'bold ') + sz + 'px ' + KAI;
    if (maxW) {
      var w = c.measureText(s).width;
      if (w > maxW) { sz = Math.max(10.5, sz * maxW / w - 0.2); c.font = (bold === false ? '' : 'bold ') + sz + 'px ' + KAI; while (s.length > 1 && c.measureText(s).width > maxW) s = s.slice(0, -2) + '…'; }
    }
    c.fillStyle = col; c.textAlign = al || 'left'; c.textBaseline = 'middle'; c.fillText(s, x, y);
  }
  function taper(c, x1, y, x2, th, al, col) {
    var mid = (x1 + x2) / 2; c.save(); c.globalAlpha = al; c.fillStyle = col || INK; c.beginPath(); c.moveTo(x1, y); c.quadraticCurveTo(mid, y - th, x2, y); c.quadraticCurveTo(mid, y + th * 0.45, x1, y); c.fill(); c.restore();
  }
  function stageName(id) { var D = window.XY_MENU_STAGE, n = D && D.name && D.name[id] && D.name[id].h; if (!n) return null; var i = pic('nm_' + id, n.src, n.src); return i ? { img: i, w: n.w, h: n.h } : null; }
  function itemSeal(it) { return it.k === 'level' ? (NUM[it.id] || String(it.id)) : it.seal; }

  /* —— 印帖竖卡：顶上一枚小朱印（关序 / 洞 / 战），中间竖排楷体名，底下一行状态；选中 = 朱砂印边 + 抬起 + 红晕 —— */
  function card(c, st, it, on, x, y, w, h, act, ex, k) {
    var hv = st.over(x, y, w, h), oy = on ? -3 : hv ? -1.5 : 0, yy = y + oy;
    c.save();
    VU.washE(c, x + w / 2, y + h + 2, w * 0.6, 5, '58,50,38', on ? 0.3 : 0.18);
    if (on) VU.washE(c, x + w / 2, yy + h / 2, w * 1.05, h * 0.62, '184,50,42', 0.2);
    if (!it.unl) c.globalAlpha = 0.66;
    if (on) VU.drawSeal(c, x, yy, w, h, '', { style: 'line', col: RED, rot: 0, seed: 40 + k * 3 });
    else VU.drawTag(c, x, yy, w, h, '', it.unl ? '#8a7a58' : '#b5af9e', { fill: !it.unl ? 'rgba(238,232,216,0.86)' : hv ? 'rgba(255,248,232,0.97)' : 'rgba(255,252,242,0.9)', seed: 31 + k * 7, cutK: 0.1 });
    var sz = Math.round(Math.max(18, Math.min(w - 16, 34, h * 0.22))), sy = yy + Math.max(6, h * 0.06);
    VU.drawSeal(c, x + (w - sz) / 2, sy, sz, sz, itemSeal(it), { style: it.unl ? 'solid' : 'ghost', col: on ? RED : it.col, sz: Math.round(sz * 0.62), stack: false, rot: -0.05 + (k % 3) * 0.03 });
    var foot = Math.max(14, Math.round(h * 0.13)), nTop = sy + sz + 4, nBot = yy + h - foot - 4, chs = it.name.split(''), fs = Math.max(11, Math.min(w * 0.5, (nBot - nTop) / (chs.length * 1.06), 34)), lh = fs * 1.06, n0 = (nTop + nBot) / 2 - (chs.length - 1) * lh / 2;
    chs.forEach(function (ch1, q) { kt(c, ch1, x + w / 2, n0 + q * lh, fs, it.unl ? (on ? '#2b1c08' : INK) : 'rgba(58,50,38,0.55)', 'center'); });
    var stT = it.cleared ? '已通关' : !it.unl ? '未解锁' : it.k === 'level' ? it.sub.replace(' 座洞府', ' 洞府') : it.k === 'boss' ? '斗法' : '副本', stC = it.cleared ? '#2f7d3b' : !it.unl ? 'rgba(109,100,85,0.8)' : on ? RED : SOFT;
    kt(c, stT, x + w / 2, yy + h - foot / 2 - 4, Math.min(14, foot * 0.8), stC, 'center', w - 6, it.cleared || on);
    c.restore();
    st.hit(x, y, w, h, act, ex);
    return { x: x, y: y, w: w, h: h, k: it.k, id: it.id };
  }

  /* —— 关卡说明：不画框，直接写在宣纸上（标题楷体 + 一笔墨痕 + 2~4 行小字）；返回「出发」按钮要用的东西 —— */
  /* v0.9 sweep09：星级一行 + 三星后出「扫荡」印（goBtn 旁边） */
  function starLine(lines, go, kind, id) {
    var SW = XY.sweep09; if (!SW) return;
    var n = SW.stars(kind, id), r = S.data[kind === 'dungeon' ? 'dng' : 'levels'][id];
    if (!r || !r.cleared) return;
    var star = '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n);
    if (n >= 3) { lines.splice(1, 0, ['星级 ' + star + ' · 局内可开 2× · 扫荡灵石 +' + SW.reward(kind, id) + '（今天剩 ' + SW.left() + '/' + SW.DAILY + ' 次）', '#2f7d3b', true]); go.sw = { kind: kind, id: id, off: !SW.left() }; }
    else lines.splice(1, 0, ['星级 ' + star + ' · ' + (kind === 'dungeon' ? '★2 阵亡≤3 · ★3 无人阵亡' : '★2 做 1 条支线 · ★3 阵亡≤1') + ' → 三星解锁 2× 与扫荡', '#8a5a12', false]);
  }
  function sweepBtn(c, st, sbtn, x, y, w, h, g) {
    sbtn(x, y, w, h, '扫荡', 'sweepGo', { seal: true, col: RED, sz: 18, stack: false, rot: 0.03, off: g.sw.off, hitOff: true, ex: { kind: g.sw.kind, id: g.sw.id } });
  }
  function detail(c, it, x, y, w, h, s) {
    var t, lines = [], go;
    if (it.k === 'level') {
      var L = XY.levelOf(it.id), info = S.levelInfo(it.id);
      t = '第' + (NUM[it.id] || it.id) + '关 · ' + L.name;
      lines.push([L.sub, RED, true]);
      lines.push(['洞府：' + L.dens.map(function (d) { var e = XY.ENEMIES[d.boss]; return d.name + '·' + e.name + '（' + elem(e.elem).name + '）'; }).join('  '), SOFT, false]);
      lines.push(['主线：' + L.main.short + (L.sides.length ? ' · 支线 ' + (info ? S.levelSides(it.id) : 0) + '/' + L.sides.length : ''), '#8a5a12', false]);
      lines.push(['终点：西行关口「' + L.gate.name + '」' + (info && info.best ? ' · 最快 ' + XY.fmtTime(info.best) : ''), SOFT, false]);
      go = { label: it.unl ? '出发！' : '未解锁', sub: '第' + (NUM[it.id] || it.id) + '关 · ' + L.name, act: 'levelGo', ex: { n: it.id }, off: !it.unl };
      starLine(lines, go, 'level', it.id);
    } else if (it.k === 'dungeon') {
      var d = XY.dungeonOf(it.id), en = XY.ENEMIES[d.boss], di = S.dngInfo(it.id), fb = XY.fabao, item = fb && fb.DEN_ITEM && fb.BY ? fb.BY[fb.DEN_ITEM[it.id]] : null, have = item && fb.unlocked(item.id);
      t = '洞府副本 · ' + d.name;
      lines.push([d.sub + ' · 洞主 ' + en.name + '（' + elem(en.elem).name + '）', RED, true]);
      lines.push(['短局约 6 分钟，洞主要打两次；不算第一关通关', SOFT, false]);
      lines.push(['首通：灵石 +' + XY.C.DNG_GAIN_FIRST + (item ? ' · 法宝「' + item.name + '」' + (have ? '（已有）' : '') : ''), '#8a5a12', false]);
      lines.push([it.unl ? '之后每次通关：灵石 +' + XY.C.DNG_GAIN + (di && di.best ? ' · 最快 ' + XY.fmtTime(di.best) : '') : '通关第一关一次后解锁', it.unl ? SOFT : RED, !it.unl]);
      go = { label: it.unl ? '进入副本' : '未解锁', sub: d.name, act: 'dungeonGo', ex: { id: it.id }, off: !it.unl };
      starLine(lines, go, 'dungeon', it.id);
    } else {
      var bb = S.data.chain && S.data.chain.bossBest && S.data.chain.bossBest.niumo;
      t = 'Boss 战 · 牛魔王';
      lines.push(['街霸式对战：带一位已获得的特殊人物当搭档', RED, true]);
      lines.push(['首通：灵石 +300 · 之后每次 灵石 +60~100（按星数）', '#8a5a12', false]);
      lines.push([bb && bb.stars ? '最佳 ★ ' + bb.stars + (bb.time ? ' · 最快 ' + XY.fmtTime(bb.time) : '') : '打赢牛魔王 → 解锁下一环', bb && bb.stars ? '#2f7d3b' : SOFT, false]);
      go = { label: '开战！', sub: '牛魔王', act: 'menuBoss', ex: null, off: false };
    }
    /* sweep09 加了星级一行后说明可能 5~6 行：先按原字号算每行要几行（首行 1 行、其余最多 2 行），放不下就逐级缩字号 / 行距，
     * 再不够就每条压成 1 行（超长的 … 截尾）——保证最后一行「终点 / 最快用时」（或副本的通关奖励）一定画得出来，不出格。 */
    var ts = Math.round(Math.min(20 * s, 26)), fz0 = Math.round(Math.min(12.5 * s, 16) * 10) / 10, fz = fz0, lh, k2, cap, yy, budget, need, fit = false;
    function rows(l, i, f, cp) { c.font = R.font(f, l[2]); var n = 1, cur = '', q, str = String(l[0]); for (q = 0; q < str.length; q++) { if (c.measureText(cur + str[q]).width > w - 4) { n++; cur = str[q]; } else cur += str[q]; } return Math.max(1, Math.min(n, i === 0 ? 1 : cp)); }
    for (k2 = 0; k2 < 14 && !fit; k2++) {
      cap = k2 < 7 ? 2 : 1; fz = Math.max(10, fz0 - (k2 % 7) * 0.5); lh = Math.round(fz * (k2 % 7 >= 3 ? 1.3 : 1.45));
      var tsk = k2 % 7 >= 3 ? Math.max(15, ts - 2) : ts;
      yy = y + tsk * 1.25 + 6 + lh * 0.5; budget = Math.floor((y + h - yy + lh * 0.5) / lh);
      need = 0; lines.forEach(function (l, i) { need += rows(l, i, fz, cap); });
      if (need <= budget) { fit = true; ts = tsk; }
    }
    if (!fit) { cap = 1; need = lines.length; }
    DP.detFit = { fz: fz, lh: lh, cap: cap, need: need, budget: budget, n: lines.length, fit: fit };
    VU.washE(c, x + w * 0.45, y + h * 0.5, w * 0.62, h * 0.7, '250,244,228', 0.75);
    kt(c, t, x + 2, y + ts * 0.6, ts, '#2b1c08', 'left', w - 4);
    taper(c, x, y + ts * 1.25, x + Math.min(w * 0.7, 260 * s), 2.6, 0.45);
    yy = y + ts * 1.25 + 6 + lh * 0.5;
    var bottom = y + h - fz * 0.55, drawn = 0;
    lines.forEach(function (l, i) {
      var n = rows(l, i, fz, cap), last = yy + (n - 1) * lh;
      if (last > bottom) return;
      var used = VU.wrap(c, l[0], x + 2, yy, w - 4, lh, fz, l[1], l[2], n);
      yy += used; drawn++;
    });
    DP.detFit.drawn = drawn;
    return go;
  }

  /* —— 大红「出发！」：和首页「开始取经」同一枚朱红圆角大印（渐变 + 金线 + 呼吸光） —— */
  function goBtn(c, st, a, x, y, w, h, g) {
    var off = g.off, hv = !off && st.over(x, y, w, h), pulse = 0.5 + 0.5 * Math.sin((a.rt || 0) * 2.4), oy = hv ? -2 : 0, rr = Math.min(16, h * 0.28);
    c.save();
    if (!off) { c.shadowColor = 'rgba(200,52,31,' + (0.3 + 0.12 * pulse + (hv ? 0.2 : 0)).toFixed(2) + ')'; c.shadowBlur = 16 + 6 * pulse; c.shadowOffsetY = 4; }
    var gr = c.createLinearGradient(0, y, 0, y + h);
    if (off) { gr.addColorStop(0, '#cfc6b4'); gr.addColorStop(1, '#b6ad9a'); } else { gr.addColorStop(0, hv ? '#e2553a' : '#d7432a'); gr.addColorStop(1, hv ? '#c13620' : '#b3301c'); }
    R.rrect(c, x, y + oy, w, h, rr); c.fillStyle = gr; c.fill(); c.restore();
    c.save(); c.lineWidth = 1.6; c.strokeStyle = off ? 'rgba(255,255,255,0.5)' : 'rgba(255,214,150,0.8)'; R.rrect(c, x + 3, y + 3 + oy, w - 6, h - 6, rr - 3); c.stroke(); c.restore();
    var big = Math.round(Math.min(h * 0.44, 34));
    kt(c, g.label, x + w / 2, y + h * (g.sub ? 0.41 : 0.5) + oy, big, '#fff8e8', 'center', w - 24);
    if (g.sub) kt(c, g.sub, x + w / 2, y + h * 0.79 + oy, Math.max(10.5, Math.round(h * 0.18)), 'rgba(255,240,215,0.92)', 'center', w - 24, false);
    if (!off) st.hit(x, y, w, h, g.act, g.ex);
  }

  function tiles(a, noq) {
    if (noq) { /* 隐藏占位不再出现 */ }
    var cur = S.carryId(), XC = XY.xchar, rec = XC && (XC.get(cur) || XC.list[0]), out = [{ id: null }];
    XY.SPECIALS.forEach(function (d) { if (!(XY.isHidden && XY.isHidden(d.id))) out.push({ id: d.id }); });
    if (rec) out.push({ id: rec.id, xc: true, rec: rec });
    if (S.xcharOpen && S.xcharOpen() && (!XC || !rec || (XC.list && XC.MAX && XC.list.length < XC.MAX))) out.push({ id: '_xc', xc: true, rec: null });
    return out;
  }

  /* 携带：圆形彩色头像，书法名字紧贴在右侧，没有卡框和卡底。 */
  function tile(c, st, a, tl, x, y, cellW, d, cur, out) {
    var id = tl.id, on = id === null ? !cur : cur === id;
    var cx = x + d / 2, cy = y + d / 2;
    (XY.departCards = XY.departCards || []).push({ id: id, x: x, y: y, w: cellW, h: d });
    function inkDisk(fill, ring) {
      c.save();
      c.beginPath(); c.arc(cx, cy, d * 0.48, 0, Math.PI * 2); c.closePath();
      c.fillStyle = fill; c.fill();
      if (ring) { c.lineWidth = 1.4; c.strokeStyle = ring; c.stroke(); }
      c.restore();
    }
    function beside(text, y0, size, col) {
      var face = '"Ma Shan Zheng","KaiTi",serif', sz = size, maxW = Math.max(8, cellW - d - 8);
      c.save();
      c.beginPath(); c.rect(x + d + 4, y - 2, maxW + 2, d + 4); c.clip();
      c.font = sz + 'px ' + face; c.textAlign = 'left'; c.textBaseline = 'middle';
      while (sz > 10 && c.measureText(text).width > maxW) { sz -= 0.5; c.font = sz + 'px ' + face; }
      c.fillStyle = col; c.fillText(text, x + d + 6, y0);
      c.restore();
    }
    function ring() {
      if (!on) return;
      c.save(); c.strokeStyle = '#a42d19'; c.lineWidth = Math.max(2, d * 0.055); c.lineJoin = 'round';
      c.beginPath();
      var i, ang, rr, px, py;
      for (i = 0; i <= 40; i++) {
        ang = i / 40 * Math.PI * 2;
        rr = d * 0.46 + Math.sin(ang * 3 + 0.6) * d * 0.012;
        px = cx + Math.cos(ang) * rr; py = cy + Math.sin(ang) * rr;
        if (!i) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.closePath(); c.stroke(); c.restore();
    }
    if (id === null) {
      inkDisk('rgba(92,74,56,0.2)', null);
      beside('不带', cy, Math.min(18, d * 0.38), '#5c4a38');
      if (on) ring();
      st.hit(x, y, cellW, d, 'carryPick', { id: null });
      return;
    }
    if (tl.xc && !tl.rec) {
      var createOpen = !S.xcharOpen || S.xcharOpen();
      inkDisk(createOpen ? 'rgba(168,50,36,0.12)' : 'rgba(92,74,56,0.12)', null);
      beside(createOpen ? '自建' : '未得', cy, Math.min(18, d * 0.38), createOpen ? '#a42d19' : '#8a7a68');
      st.hit(x, y, cellW, d, createOpen ? 'xchar' : 'xcharLocked');
      return;
    }
    var def = XY.SP_BY[id], xcLock = !!(tl.xc && tl.rec && S.xcharOpen && !S.xcharOpen());
    var owned = xcLock ? false : (tl.xc ? true : S.spOwned(id));
    var name = tl.xc ? ((tl.rec && tl.rec.name) || '自建') : ((def && def.name) || '');
    c.save();
    if (!owned) c.globalAlpha = 0.4;
    var drew = XY.xAvIcon && XY.xAvIcon.isSpecial && XY.xAvIcon.isSpecial(id) && XY.xAvIcon.draw(c, id, x, y, d, d);
    if (!drew) inkDisk(owned ? 'rgba(92,74,56,0.16)' : 'rgba(92,74,56,0.1)', null);
    c.restore();
    ring();
    if (owned) beside(name, cy, Math.min(18, d * 0.36), '#24180f');
    else {
      beside(name, cy - d * 0.16, Math.min(16, d * 0.32), '#8a7a68');
      beside('未得', cy + d * 0.18, Math.min(13, d * 0.26), '#8a7a68');
    }
    if (!owned && tl.xc) { st.hit(x, y, cellW, d, 'xcharLocked'); return; }
    st.hit(x, y, cellW, d, 'carryPick', { id: id });
    if (st.over(x, y, cellW, d)) out.hover = id;
  }

  /* —— 立绘：当前携带特殊角色的定妆大图（XY.bgArt = assets/art/bg/<id>.webp，与选关页 / cut-in 同套；自建走 XY.bgArt→xchar.portraitBare）
   * 选「不带」或未选 → 留空宣纸（不画唐僧 / 悟空占位，更干净）；脚下仍点一笔淡晕，和按钮区衔接。 */
  var figCache = {};
  function figSoft(id, im) {
    var e = figCache[id]; if (e && e.src === im) return e.cv;
    var w = im.width || im.naturalWidth || 0, h = im.height || im.naturalHeight || 0; if (!w || !h) return null;
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h; var o = cv.getContext('2d');
    o.drawImage(im, 0, 0);
    o.globalCompositeOperation = 'source-atop'; o.fillStyle = 'rgba(244,234,210,0.16)'; o.fillRect(0, 0, w, h);
    o.globalCompositeOperation = 'destination-in';
    var m = document.createElement('canvas'); m.width = w; m.height = h; var q = m.getContext('2d');
    var g = q.createRadialGradient(w / 2, h * 0.4, h * 0.1, w / 2, h * 0.46, h * 0.58);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.42, 'rgba(0,0,0,0.95)'); g.addColorStop(0.72, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    q.fillStyle = g; q.fillRect(0, 0, w, h);
    var lg = q.createLinearGradient(0, h * 0.6, 0, h * 0.97); lg.addColorStop(0, 'rgba(0,0,0,1)'); lg.addColorStop(0.6, 'rgba(0,0,0,0.45)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
    q.globalCompositeOperation = 'destination-in'; q.fillStyle = lg; q.fillRect(0, 0, w, h);
    var sg = q.createLinearGradient(0, 0, w, 0); sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(0.16, 'rgba(0,0,0,1)'); sg.addColorStop(0.84, 'rgba(0,0,0,1)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    q.fillStyle = sg; q.fillRect(0, 0, w, h);
    o.drawImage(m, 0, 0);
    Object.keys(figCache).forEach(function (k) { if (k !== id) delete figCache[k]; });
    figCache[id] = { src: im, cv: cv }; return cv;
  }
  function figure(c, cx, bottom, hgt, al) {
    var id = S.carryId(), im = id && XY.bgArt && XY.bgArt(id), soft = im && figSoft(id, im);
    if (soft) {
      var hh = hgt, ww = hh * soft.width / soft.height;
      var ink = c.createRadialGradient(cx, bottom - hh * 0.5, hh * 0.05, cx, bottom - hh * 0.48, hh * 0.5);
      ink.addColorStop(0, 'rgba(120,104,80,0.13)'); ink.addColorStop(0.6, 'rgba(150,130,100,0.06)'); ink.addColorStop(1, 'rgba(150,130,100,0)');
      c.save(); c.fillStyle = ink; c.fillRect(cx - hh, bottom - hh * 1.1, hh * 2, hh * 1.2); c.restore();
      c.save(); c.globalAlpha = al * 0.9; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.drawImage(soft, cx - ww / 2, bottom - hh * 0.97, ww, hh); c.restore();
    }
    VU.washE(c, cx, bottom, hgt * 0.55, hgt * 0.16, '250,244,228', soft ? 0.95 : 0.45);
  }

  function bgPoster(c, cw, ch, land) {
    VU.paperBg(c, { cw: cw, ch: ch }, { rgb: '201,162,74', rgb2: '184,50,42', seed: 17 });
    var k = land ? 'bg_v2' : 'bg_v2p', bg = pic(k, 'assets/art/menu-v5/' + k + '.webp');
    if (bg) { var sc = Math.max(cw / bg.naturalWidth, ch / bg.naturalHeight), bw0 = bg.naturalWidth * sc, bh0 = bg.naturalHeight * sc; c.save(); c.globalAlpha = 0.5; c.drawImage(bg, (cw - bw0) / 2, (ch - bh0) / 2, bw0, bh0); c.restore(); }
    var gr = land ? c.createLinearGradient(0, 0, cw, 0) : c.createLinearGradient(0, 0, 0, ch);
    if (land) { gr.addColorStop(0, 'rgba(250,244,228,0.84)'); gr.addColorStop(0.55, 'rgba(250,244,228,0.72)'); gr.addColorStop(1, 'rgba(250,244,228,0.32)'); }
    else { gr.addColorStop(0, 'rgba(250,244,228,0.8)'); gr.addColorStop(0.45, 'rgba(250,244,228,0.55)'); gr.addColorStop(1, 'rgba(250,244,228,0.86)'); }
    c.fillStyle = gr; c.fillRect(0, 0, cw, ch);
    var sun = c.createRadialGradient(cw * 0.86, ch * 0.13, 2, cw * 0.86, ch * 0.13, Math.min(cw, ch) * 0.1); sun.addColorStop(0, 'rgba(214,72,46,0.32)'); sun.addColorStop(1, 'rgba(214,72,46,0)'); c.fillStyle = sun; c.fillRect(0, 0, cw, ch);
  }

  /* 一排竖卡（带分组小题）；返回卡片区底 y */
  function cardRow(c, st, items, cur0, x, y, w, hMax, s, geo) {
    var groups = [], i; items.forEach(function (it) { if (!groups.length || groups[groups.length - 1].k !== it.k) groups.push({ k: it.k, n: 0 }); groups[groups.length - 1].n++; });
    var n = items.length, gg = Math.round(12 * s), cg = Math.round(6 * s), labH = Math.round(18 * Math.min(s, 1.2));
    var cwd = Math.max(44, Math.min(Math.round(96 * s), (w - gg * (groups.length - 1) - cg * (n - groups.length)) / n)), chh = Math.max(84, hMax - labH);
    var xx = x, gi = 0, k = 0;
    groups.forEach(function (g) {
      var gw = g.n * cwd + (g.n - 1) * cg, lbl = GROUP[g.k];
      kt(c, lbl, xx + 2, y + labH * 0.42, Math.round(Math.min(13 * s, 16)), g.k === 'boss' ? DEEP : g.k === 'dungeon' ? BROWN : RED, 'left', gw, true);
      c.font = 'bold ' + Math.round(Math.min(13 * s, 16)) + 'px ' + KAI; var lw = Math.min(gw - 4, c.measureText(lbl).width);
      if (gw - lw > 20) taper(c, xx + lw + 8, y + labH * 0.46, xx + gw - 2, 1.6, 0.3);
      for (i = 0; i < g.n; i++, k++) {
        var it = items[k], lv = it.k === 'level' && it.unl;
        geo.cards.push(card(c, st, it, it === cur0, xx + i * (cwd + cg), y + labH, cwd, chh, lv ? 'levelSel' : 'dpSel', lv ? { n: it.id } : { kind: it.k, id: it.id }, k));
      }
      xx += gw + gg; gi++;
    });
    return { bottom: y + labH + chh, right: xx - gg, cw: cwd, ch: chh };
  }

  function carryInfo(a, out) {
    var cur = S.carryId(), sd = out.hover && XY.SP_BY[out.hover];
    if (sd) {
      if (!S.spOwned(out.hover)) return sd.name + ' · 未解锁 · 集齐 ' + XY.SP_LV_AT[0] + ' 张角色卡（关卡掉落或灵石商店）';
      return sd.name + '（' + sd.handle + '）· ' + sd.role + ' · 大招 ' + sd.ult;
    }
    if (cur && XY.SP_BY[cur]) { var t = XY.synText(cur); return XY.SP_BY[cur].name + ' Lv' + S.spLevel(cur) + ' · ' + XY.SP_BY[cur].role + (t ? ' · ' + t : ''); }
    return '本关：不带常驻角色';
  }
  /* 头像一行 / 多行；返回 out（悬停） */
  function carryStrip(c, st, a, tl, x, y, w, cols, cellW, cellH, d, rowGap) {
    var cur = S.carryId(), out = { hover: null }, rows = Math.ceil(tl.length / cols), k;
    for (k = 0; k < tl.length; k++) {
      var row = Math.floor(k / cols), inRow = Math.min(cols, tl.length - row * cols), x0 = x + (w - inRow * cellW) / 2;
      tile(c, st, a, tl[k], x0 + (k % cols) * cellW, y + row * (cellH + rowGap), cellW, cellH, cur, out);
    }
    return out;
  }

  /* 十连浮层：竖版水墨卡。约 7 秒依次翻开；手机一次只放大一张，可左右滑，翻完再给总览。
   * 结果在翻牌前已经写入存档。刷新不重播，直接看总览。 */
  var GACHA_INTRO = 0.5, GACHA_STEP = 0.68, GACHA_FLIP = 0.5;
  function gachaHash(n) { var s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); }
  function gachaEase(p) { p = Math.max(0, Math.min(1, p)); return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
  function gachaName(id) { return (XY.SP_BY[id] && XY.SP_BY[id].name) || id; }
  function tornPath(c, x, y, w, h, seed) {
    var n = 12, i, p, jx, jy;
    c.beginPath();
    for (i = 0; i <= n; i++) {
      p = i / n; jy = (gachaHash(seed + i * 3) - 0.5) * 7;
      if (!i) c.moveTo(x + w * p, y + jy * 0.35);
      else c.lineTo(x + w * p, y + (i === n ? 0 : jy));
    }
    for (i = 1; i <= n; i++) {
      p = i / n; jx = (gachaHash(seed + 50 + i * 3) - 0.5) * 7;
      c.lineTo(x + w + (i === n ? 0 : jx), y + h * p);
    }
    for (i = n - 1; i >= 0; i--) {
      p = i / n; jy = (gachaHash(seed + 90 + i * 3) - 0.5) * 7;
      c.lineTo(x + w * p, y + h + (i ? jy : 0));
    }
    for (i = n - 1; i >= 1; i--) {
      p = i / n; jx = (gachaHash(seed + 130 + i * 3) - 0.5) * 7;
      c.lineTo(x + jx, y + h * p);
    }
    c.closePath();
  }
  function gachaPaper(c, x, y, w, h, seed) {
    var i, grd;
    c.save();
    c.fillStyle = 'rgba(58,50,38,0.13)';
    tornPath(c, x + 4, y + 6, w, h, seed + 2); c.fill();
    tornPath(c, x, y, w, h, seed);
    grd = c.createLinearGradient(x, y, x + w * 0.15, y + h);
    grd.addColorStop(0, '#fffdf8'); grd.addColorStop(0.5, '#f7efdc'); grd.addColorStop(1, '#efe1c4');
    c.fillStyle = grd; c.fill();
    c.save();
    tornPath(c, x, y, w, h, seed); c.clip();
    c.strokeStyle = 'rgba(70,54,32,0.2)'; c.lineWidth = 1.2; c.lineCap = 'round';
    for (i = 0; i < 5; i++) {
      var x1 = x + w * (0.15 + 0.7 * gachaHash(seed + i * 7));
      var y1 = y + h * (0.12 + 0.72 * gachaHash(seed + i * 7 + 2));
      var len = 16 + 36 * gachaHash(seed + i * 7 + 4);
      var ang = (gachaHash(seed + i * 7 + 6) - 0.5) * 2.4;
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x1 + Math.cos(ang) * len, y1 + Math.sin(ang) * len);
      c.stroke();
    }
    if (VU.washE) {
      VU.washE(c, x + w * 0.22, y + h * 0.16, w * 0.42, h * 0.16, '110,86,48', 0.07);
      VU.washE(c, x + w * 0.78, y + h * 0.78, w * 0.36, h * 0.18, '150,48,36', 0.05);
    }
    c.restore();
    if (VU.washE) VU.washE(c, x + w * 0.5, y + h * 0.48, w * 0.72, h * 0.62, '42,32,22', 0.22);
    c.restore();
  }
  XY.gacha10.CARD_RATIO = 0.66;
  XY.gacha10.cardSize = function (maxW, maxH) {
    var ratio = XY.gacha10.CARD_RATIO, w = Math.max(1, maxW), h = w / ratio;
    if (h > maxH) { h = Math.max(1, maxH); w = h * ratio; }
    return { w: w, h: h };
  };
  XY.gacha10.portraitBox = function (iw, ih, x, y, w, h) {
    iw = Math.max(1, iw); ih = Math.max(1, ih);
    var s = Math.min(w / iw, h / ih), dw = iw * s, dh = ih * s;
    return { x: x + (w - dw) / 2, y: y + (h - dh) / 2, dw: dw, dh: dh };
  };
  XY.gacha10.flipScale = function () { return 1; };
  function gachaPortraitFit(c, id, x, y, w, h) {
    if (XY.xAvIcon && XY.xAvIcon.isSpecial && XY.xAvIcon.isSpecial(id)) {
      var side = Math.min(w, h) * 0.92;
      XY.xAvIcon.draw(c, id, x + (w - side) / 2, y + (h - side) / 2, side, side);
      return;
    }
    var im = (XY.bgArt && XY.bgArt(id)) || xAv(id);
    c.save();
    c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.fillStyle = '#f4ead4'; c.fillRect(x, y, w, h);
    if (im && (im.naturalWidth || im.width)) {
      var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
      var box = XY.gacha10.portraitBox(iw, ih, x, y, w, h);
      XY.gacha10.lastPortrait = { id: id, iw: iw, ih: ih, dw: box.dw, dh: box.dh };
      c.drawImage(im, box.x, box.y, box.dw, box.dh);
    } else {
      c.fillStyle = '#241c16'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold ' + Math.round(Math.min(w, h) * 0.28) + 'px ' + KAI;
      c.fillText(gachaName(id).charAt(0), x + w / 2, y + h / 2);
    }
    c.restore();
  }
  function inkBloom(c, x, y, w, h, p) {
    var a;
    if (!VU.washE || p <= 0.02 || p >= 0.98) return;
    a = Math.sin(Math.max(0, Math.min(1, p)) * Math.PI);
    VU.washE(c, x + w * 0.5, y + h * 0.46, w * (0.25 + 0.85 * p), h * (0.16 + 0.5 * p), '42,34,26', 0.26 * a);
    VU.washE(c, x + w * 0.48, y + h * 0.4, w * (0.12 + 0.4 * p), h * (0.08 + 0.28 * p), '168,42,32', 0.34 * a);
  }
  function goldBrush(c, x, y, w, h, p, seed) {
    var k, i, y0, len, a;
    if (p < 0.48) return;
    k = Math.min(1, (p - 0.48) / 0.35);
    a = 0.8 * (k < 0.75 ? 1 : Math.max(0, 1 - (k - 0.75) / 0.25));
    if (a <= 0.02) return;
    c.save();
    c.strokeStyle = '#7a5a22'; c.lineCap = 'round'; c.globalAlpha = a;
    for (i = 0; i < 3; i++) {
      y0 = y + h * (0.28 + i * 0.16);
      len = w * (0.42 + 0.28 * gachaHash(seed + i)) * k;
      c.lineWidth = 2.4 - i * 0.45;
      c.beginPath();
      c.moveTo(x + w * 0.14, y0);
      c.quadraticCurveTo(x + w * 0.38, y0 - 8 + i * 3, x + w * 0.14 + len, y0 + 1.5);
      c.stroke();
      c.globalAlpha = a * 0.4;
      c.beginPath();
      c.moveTo(x + w * 0.14 + len * 0.72, y0 - 1);
      c.lineTo(x + w * 0.14 + len * 0.72 + 14 * k, y0 + 1);
      c.stroke();
      c.globalAlpha = a;
    }
    c.restore();
  }
  function drawBack(c, x, y, w, h, seed) {
    var ss, i, cx, cy, rx;
    gachaPaper(c, x, y, w, h, seed);
    if (VU.washE) {
      VU.washE(c, x + w * 0.5, y + h * 0.46, w * 0.8, h * 0.7, '36,28,20', 0.34);
      VU.washE(c, x + w * 0.32, y + h * 0.28, w * 0.4, h * 0.24, '90,70,48', 0.16);
    }
    c.save();
    c.strokeStyle = 'rgba(246,239,226,0.35)'; c.lineWidth = 1.3;
    for (i = 0; i < 4; i++) {
      cx = x + w * (0.28 + 0.44 * gachaHash(seed + i));
      cy = y + h * (0.18 + 0.5 * gachaHash(seed + 15 + i));
      rx = Math.min(w, h) * (0.08 + 0.06 * gachaHash(seed + 30 + i));
      c.beginPath(); c.ellipse(cx, cy, rx, rx * 0.66, gachaHash(seed + i), 0, Math.PI * 2); c.stroke();
    }
    c.restore();
    ss = Math.min(w, h) * 0.28;
    VU.drawSeal(c, x + (w - ss) / 2, y + h * 0.34, ss, ss, '封', { style: 'solid', col: RED, sz: Math.round(ss * 0.5), rot: -0.05, stack: false, seed: 40 + seed });
    kt(c, '天机', x + w / 2, y + h * 0.74, Math.max(18, Math.min(32, w * 0.13)), '#f6efe2', 'center', w - 24);
  }
  function drawFront(c, r, x, y, w, h, seed, sealP) {
    var subY = y + h - Math.max(48, Math.min(60, h * 0.15));
    var nameY = subY - Math.max(18, Math.min(26, h * 0.06));
    var picH = Math.max(24, nameY - y - 28);
    var ms = h < 140 ? Math.max(16, Math.round(Math.min(w, h) * 0.18)) : Math.round(Math.max(34, Math.min(w * 0.3, h * 0.16, 62)));
    var drop = sealP >= 1 ? 0 : (1 - gachaEase(Math.max(0, (sealP - 0.15) / 0.7)));
    var sy = y + 10 - drop * Math.min(56, h * 0.1);
    gachaPaper(c, x, y, w, h, seed);
    gachaPortraitFit(c, r.id, x + 12, y + 12, w - 24, picH);
    if (r.kind === 'unlock') goldBrush(c, x, y, w, h, sealP, seed);
    VU.drawSeal(c, x + w - ms - 12, sy, ms, ms, r.kind === 'unlock' ? '得' : '复', { style: 'solid', col: r.kind === 'unlock' ? RED : '#5a5146', sz: Math.round(ms * 0.56), rot: -0.07 - drop * 0.25, stack: false, seed: 80 + seed });
    kt(c, gachaName(r.id), x + w / 2, nameY, Math.max(16, Math.min(28, w * 0.14)), '#2b1c08', 'center', w - 18);
    kt(c, r.text || '', x + w / 2, subY, Math.max(12, Math.min(16, w * 0.075)), r.kind === 'unlock' ? RED : SOFT, 'center', w - 16, false);
  }
  function flipCard(c, r, x, y, w, h, seed, p) {
    p = p <= 0 ? 0 : (p >= 1 ? 1 : p);
    var front = p >= 0.5;
    if (!front) drawBack(c, x, y, w, h, seed);
    else drawFront(c, r, x, y, w, h, seed, p >= 1 ? 1 : (p - 0.5) / 0.5);
    XY.gacha10.paintFlipFx(c, x, y, w, h, p);
  }
  XY.gacha10.paintFlipFx = function (c, x, y, w, h, p) {
    if (p > 0.08 && p < 0.92) inkBloom(c, x, y, w, h, p);
  }
  XY.gacha10.timing = { intro: GACHA_INTRO, step: GACHA_STEP, flip: GACHA_FLIP, total: GACHA_INTRO + 10 * GACHA_STEP };
  XY.gacha10.cardAt = function (elapsed, i) {
    var start = GACHA_INTRO + i * GACHA_STEP;
    if (elapsed < start) return 0;
    return Math.min(1, (elapsed - start) / GACHA_FLIP);
  };
  XY.gacha10.focusOf = function (elapsed) {
    if (elapsed <= GACHA_INTRO) return 0;
    return Math.max(0, Math.min(9, Math.floor((elapsed - GACHA_INTRO) / GACHA_STEP)));
  };
  if (!XY.gacha10._swipe) {
    XY.gacha10._swipe = true;
    var gDown = null;
    window.addEventListener('pointerdown', function (e) {
      if (!XY.gacha10.blocking || !XY.gacha10.blocking()) return;
      gDown = { x: e.clientX, y: e.clientY };
    }, true);
    window.addEventListener('pointerup', function (e) {
      if (!gDown) return;
      var dx = e.clientX - gDown.x, dy = e.clientY - gDown.y;
      gDown = null;
      if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
      if (XY.gacha10.nudge) XY.gacha10.nudge(dx < 0 ? 1 : -1);
    }, true);
  }
  /* 立绘自带一圈底纹墨漩涡。纸色已经抠掉之后，再把连到画布边缘、又不挨着人物的灰墨去掉，留下身体、火焰和近身的一点墨边。 */
  /* 外轮廓跟着墨走：纸色从边缘淹进来，靠近人物留一圈不规则的纸边，再按距离羽化，避免矩形直边。 */
  function gachaSoften(d, w, h, pr, pg, pb) {
    var N = w * h, i, x, y, r, gv, b, mx, mn, sat, lum, dr, dg, db, ds, p, xx, yy, step;
    var paper = new Uint8Array(N), anchor = new Uint8Array(N);
    for (i = 0; i < N; i++) {
      if (d[i * 4 + 3] < 16) { paper[i] = 1; continue; }
      r = d[i * 4]; gv = d[i * 4 + 1]; b = d[i * 4 + 2];
      mx = r > gv ? r : gv; if (b > mx) mx = b;
      mn = r < gv ? r : gv; if (b < mn) mn = b;
      sat = mx - mn;
      lum = (r * 3 + gv * 6 + b) / 10;
      dr = r - pr; dg = gv - pg; db = b - pb;
      ds = Math.sqrt(dr * dr + dg * dg + db * db);
      if (sat > 40 || lum < 96) anchor[i] = 1;
      else if (ds < 86 && sat < 46 && lum > 138) paper[i] = 1;
    }
    var guard = new Uint8Array(N), q = new Int32Array(N), qh = 0, qt = 0;
    for (i = 0; i < N; i++) if (anchor[i]) { guard[i] = 1; q[qt++] = i; }
    while (qh < qt) {
      p = q[qh++];
      if (guard[p] > 22) continue;
      yy = (p / w) | 0; xx = p - yy * w; step = guard[p] + 1;
      if (yy > 0 && !guard[p - w]) { guard[p - w] = step; q[qt++] = p - w; }
      if (yy + 1 < h && !guard[p + w]) { guard[p + w] = step; q[qt++] = p + w; }
      if (xx > 0 && !guard[p - 1]) { guard[p - 1] = step; q[qt++] = p - 1; }
      if (xx + 1 < w && !guard[p + 1]) { guard[p + 1] = step; q[qt++] = p + 1; }
    }
    var kill = new Uint8Array(N);
    qh = 0; qt = 0;
    function pushK(idx) {
      if (kill[idx] || anchor[idx] || guard[idx]) return;
      if (!paper[idx] && d[idx * 4 + 3] >= 16) return;
      kill[idx] = 1; q[qt++] = idx;
    }
    for (x = 0; x < w; x++) { pushK(x); pushK((h - 1) * w + x); }
    for (y = 0; y < h; y++) { pushK(y * w); pushK(y * w + w - 1); }
    while (qh < qt) {
      p = q[qh++];
      yy = (p / w) | 0; xx = p - yy * w;
      if (yy > 0) pushK(p - w);
      if (yy + 1 < h) pushK(p + w);
      if (xx > 0) pushK(p - 1);
      if (xx + 1 < w) pushK(p + 1);
    }
    for (i = 0; i < N; i++) if (kill[i]) d[i * 4 + 3] = 0;
    var dist = new Uint16Array(N);
    for (i = 0; i < N; i++) dist[i] = 65535;
    qh = 0; qt = 0;
    for (i = 0; i < N; i++) if (d[i * 4 + 3] < 12) { dist[i] = 0; q[qt++] = i; }
    while (qh < qt) {
      p = q[qh++];
      if (dist[p] >= 56) continue;
      yy = (p / w) | 0; xx = p - yy * w; step = dist[p] + 1;
      if (yy > 0 && dist[p - w] > step) { dist[p - w] = step; q[qt++] = p - w; }
      if (yy + 1 < h && dist[p + w] > step) { dist[p + w] = step; q[qt++] = p + w; }
      if (xx > 0 && dist[p - 1] > step) { dist[p - 1] = step; q[qt++] = p - 1; }
      if (xx + 1 < w && dist[p + 1] > step) { dist[p + 1] = step; q[qt++] = p + 1; }
    }
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        i = y * w + x;
        if (d[i * 4 + 3] < 8) continue;
        var n = Math.sin(x * 0.17 + y * 0.11) * 43758.5453;
        n = n - Math.floor(n);
        var reach = 10 + n * 46;
        var edge = Math.min(x, y, w - 1 - x, h - 1 - y);
        var dd = dist[i] < edge ? dist[i] : edge;
        if (dd >= reach) continue;
        var t = dd / reach;
        t = t * t * (3 - 2 * t);
        d[i * 4 + 3] = Math.max(0, Math.round(d[i * 4 + 3] * t));
      }
    }
    /* 画布边是直的。灰墨沿顶边、左边走一条慢浪，彩焰和衣服只轻轻收一点，避免齐切。 */
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        i = y * w + x;
        if (d[i * 4 + 3] < 8) continue;
        var rr = d[i * 4], gg = d[i * 4 + 1], bb = d[i * 4 + 2];
        var mx = rr > gg ? rr : gg; if (bb > mx) mx = bb;
        var mn = rr < gg ? rr : gg; if (bb < mn) mn = bb;
        var sat = mx - mn;
        var deep = sat > 46 ? 0.24 : 1;
        var topW = (0.5 + 0.5 * Math.sin(x * 0.014 + 0.5)) * 0.55 + (0.5 + 0.5 * Math.sin(x * 0.041 + 0.7)) * 0.45;
        var leftW = (0.5 + 0.5 * Math.sin(y * 0.017 + 0.8)) * 0.55 + (0.5 + 0.5 * Math.sin(y * 0.046 + 1.1)) * 0.45;
        var nick = 0.5 + 0.5 * Math.sin(x * 0.08 + y * 0.063);
        var topR = 16 + topW * 230 * deep + nick * 22 * deep;
        var leftR = 12 + leftW * 210 * deep + nick * 18 * deep;
        var rightR = 12 + (0.5 + 0.5 * Math.sin(y * 0.02 + 2.4)) * 56 * deep;
        var botR = 10 + (0.5 + 0.5 * Math.sin(x * 0.018 + 1.2)) * 36 * deep;
        var inset = Math.min(x / leftR, y / topR, (w - 1 - x) / rightR, (h - 1 - y) / botR);
        if (inset >= 1) continue;
        var t2 = inset < 0 ? 0 : inset;
        t2 = t2 * t2 * (3 - 2 * t2);
        d[i * 4 + 3] = Math.max(0, Math.round(d[i * 4 + 3] * t2));
      }
    }
  }
  function gachaCutout(im) {
    if (!im || !(im.naturalWidth || im.width)) return null;
    if (im._gachaCut) return im._gachaCut;
    var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
    var cnv = document.createElement('canvas');
    cnv.width = w; cnv.height = h;
    var g = cnv.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0);
    var img = g.getImageData(0, 0, w, h), d = img.data, N = w * h;
    function at(x, y) { var i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]]; }
    var cs = [at(2, 2), at(w - 3, 2), at(2, h - 3), at(w - 3, h - 3)];
    var pr = 0, pg = 0, pb = 0, k;
    for (k = 0; k < 4; k++) { pr += cs[k][0]; pg += cs[k][1]; pb += cs[k][2]; }
    pr /= 4; pg /= 4; pb /= 4;
    var cand = new Uint8Array(N), dist = new Float32Array(N);
    var i, r, gv, b, dr, dg, db, ds, mx, mn;
    for (i = 0; i < N; i++) {
      r = d[i * 4]; gv = d[i * 4 + 1]; b = d[i * 4 + 2];
      dr = r - pr; dg = gv - pg; db = b - pb;
      ds = Math.sqrt(dr * dr + dg * dg + db * db);
      dist[i] = ds;
      mx = r > gv ? r : gv; if (b > mx) mx = b;
      mn = r < gv ? r : gv; if (b < mn) mn = b;
      if (ds < 50 && (mx - mn) < 66) cand[i] = 1;
    }
    var bg = new Uint8Array(N), q = new Int32Array(N), qh = 0, qt = 0;
    function push(p) { if (!bg[p] && cand[p]) { bg[p] = 1; q[qt++] = p; } }
    var x, y;
    for (x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    var p, yy, xx;
    while (qh < qt) {
      p = q[qh++];
      yy = (p / w) | 0; xx = p - yy * w;
      if (yy > 0) push(p - w);
      if (yy + 1 < h) push(p + w);
      if (xx > 0) push(p - 1);
      if (xx + 1 < w) push(p + 1);
    }
    for (i = 0; i < N; i++) if (bg[i]) d[i * 4 + 3] = 0;
    for (y = 1; y < h - 1; y++) {
      for (x = 1; x < w - 1; x++) {
        i = y * w + x;
        if (bg[i] || dist[i] > 34) continue;
        if (bg[i - 1] || bg[i + 1] || bg[i - w] || bg[i + w]) d[i * 4 + 3] = 0;
      }
    }
    gachaSoften(d, w, h, pr, pg, pb);
    var bx0 = w, by0 = h, bx1 = 0, by1 = 0, seenPx = 0;
    for (i = 0; i < N; i++) {
      if (d[i * 4 + 3] < 28) continue;
      y = (i / w) | 0; x = i - y * w;
      if (x < bx0) bx0 = x;
      if (y < by0) by0 = y;
      if (x > bx1) bx1 = x;
      if (y > by1) by1 = y;
      seenPx = 1;
    }
    im._gachaBox = seenPx ? { x: bx0, y: by0, w: bx1 - bx0 + 1, h: by1 - by0 + 1 } : { x: 0, y: 0, w: w, h: h };
    g.putImageData(img, 0, 0);
    im._gachaCut = cnv;
    return cnv;
  }
  /* 1–10 人各一套站位。x/y 是身位中心（0–1），s 是高低，z 0 后 / 1 中 / 2 前，ns -1 左 / 0 上 / 1 右。后层更小更靠上，前层更大更靠下。 */
  var GACHA_LAND = {
    1: [[0.62, 0.62, 1.05, 2, 1]],
    2: [[0.34, 0.36, 0.64, 0, -1], [0.66, 0.78, 1.04, 2, 1]],
    3: [[0.18, 0.36, 0.62, 0, -1], [0.46, 0.56, 0.76, 1, 0], [0.76, 0.80, 1.04, 2, 1]],
    4: [[0.14, 0.34, 0.60, 0, -1], [0.40, 0.58, 0.74, 1, -1], [0.66, 0.36, 0.60, 0, 1], [0.84, 0.80, 1.02, 2, 1]],
    5: [[0.10, 0.35, 0.58, 0, -1], [0.30, 0.80, 1.00, 2, -1], [0.50, 0.56, 0.74, 1, 0], [0.70, 0.36, 0.60, 0, 1], [0.88, 0.78, 1.02, 2, 1]],
    6: [[0.08, 0.34, 0.58, 0, -1], [0.26, 0.58, 0.74, 1, -1], [0.46, 0.82, 1.02, 2, -1], [0.62, 0.36, 0.58, 0, 1], [0.78, 0.58, 0.76, 1, 1], [0.92, 0.80, 1.00, 2, 1]],
    7: [[0.08, 0.34, 0.58, 0, -1], [0.24, 0.57, 0.72, 1, -1], [0.40, 0.82, 1.00, 2, -1], [0.56, 0.36, 0.58, 0, 0], [0.70, 0.58, 0.74, 1, 1], [0.84, 0.80, 1.02, 2, 1], [0.94, 0.38, 0.56, 0, 1]],
    8: [[0.07, 0.34, 0.56, 0, -1], [0.20, 0.58, 0.72, 1, -1], [0.36, 0.82, 1.00, 2, -1], [0.50, 0.35, 0.56, 0, 0], [0.64, 0.58, 0.72, 1, 1], [0.78, 0.80, 1.00, 2, 1], [0.90, 0.36, 0.56, 0, 1], [0.96, 0.62, 0.70, 1, 1]],
    9: [[0.18, 0.42, 0.82, 0, -1], [0.30, 0.58, 0.86, 1, -1], [0.40, 0.80, 0.98, 2, -1], [0.48, 0.40, 0.82, 0, 0], [0.56, 0.56, 0.86, 1, 1], [0.64, 0.80, 1.00, 2, 1], [0.82, 0.38, 0.82, 0, 1], [0.70, 0.52, 0.90, 1, -1], [0.90, 0.82, 0.96, 2, 1]],
    10: [[0.06, 0.34, 0.56, 0, -1], [0.18, 0.56, 0.70, 1, -1], [0.30, 0.82, 0.98, 2, -1], [0.42, 0.33, 0.54, 0, 0], [0.52, 0.58, 0.72, 1, 1], [0.64, 0.80, 1.00, 2, 1], [0.74, 0.36, 0.56, 0, 1], [0.84, 0.60, 0.70, 1, 1], [0.92, 0.82, 0.96, 2, 1], [0.98, 0.40, 0.54, 0, 1]]
  };
  /* 竖屏按行排：后排靠上、中排居中、前排靠下。每行左中右分开，只在脚下留一点空给名字。 */
  var GACHA_PORT = {
    1: [[0.50, 0.56, 1.50, 2, 0]],
    2: [[0.28, 0.28, 1.05, 0, -1], [0.72, 0.70, 1.28, 2, 1]],
    3: [[0.22, 0.16, 0.96, 0, -1], [0.74, 0.44, 1.12, 1, 1], [0.40, 0.76, 1.24, 2, -1]],
    4: [[0.22, 0.15, 0.92, 0, -1], [0.76, 0.17, 0.92, 0, 1], [0.30, 0.46, 1.08, 1, -1], [0.70, 0.76, 1.20, 2, 1]],
    5: [[0.20, 0.15, 0.90, 0, -1], [0.78, 0.17, 0.90, 0, 1], [0.28, 0.44, 1.04, 1, -1], [0.74, 0.46, 1.04, 1, 1], [0.48, 0.76, 1.18, 2, 0]],
    6: [[0.22, 0.15, 0.90, 0, -1], [0.78, 0.17, 0.90, 0, 1], [0.24, 0.44, 1.02, 1, -1], [0.74, 0.46, 1.02, 1, 1], [0.22, 0.76, 1.14, 2, -1], [0.74, 0.78, 1.16, 2, 1]],
    7: [[0.18, 0.14, 0.86, 0, -1], [0.50, 0.16, 0.84, 0, 0], [0.82, 0.14, 0.86, 0, 1], [0.28, 0.44, 1.04, 1, -1], [0.72, 0.46, 1.04, 1, 1], [0.26, 0.76, 1.14, 2, -1], [0.72, 0.78, 1.16, 2, 1]],
    8: [[0.18, 0.14, 0.86, 0, -1], [0.50, 0.16, 0.84, 0, 0], [0.82, 0.14, 0.86, 0, 1], [0.20, 0.43, 1.02, 1, -1], [0.50, 0.46, 1.06, 1, 0], [0.80, 0.43, 1.02, 1, 1], [0.28, 0.76, 1.14, 2, -1], [0.72, 0.78, 1.16, 2, 1]],
    9: [[0.17, 0.13, 0.88, 0, -1], [0.50, 0.155, 0.86, 0, 0], [0.83, 0.13, 0.88, 0, 1], [0.18, 0.42, 1.06, 1, -1], [0.50, 0.45, 1.10, 1, 0], [0.82, 0.42, 1.06, 1, 1], [0.16, 0.76, 1.16, 2, -1], [0.50, 0.80, 1.20, 2, 0], [0.84, 0.76, 1.16, 2, 1]],
    10: [[0.14, 0.13, 0.74, 0, -1], [0.38, 0.15, 0.74, 0, 0], [0.62, 0.13, 0.74, 0, 1], [0.86, 0.15, 0.74, 0, 1], [0.20, 0.42, 1.02, 1, -1], [0.50, 0.45, 1.06, 1, 0], [0.80, 0.42, 1.02, 1, 1], [0.17, 0.76, 1.12, 2, -1], [0.50, 0.80, 1.16, 2, 0], [0.83, 0.76, 1.12, 2, 1]]
  };
  XY.gacha10.rosterSlots = function (n, land) {
    n = n < 1 ? 1 : (n > 10 ? 10 : n | 0);
    var out = [], i, t, rows, base, extra, idx, r, cnt, col, frontN, backN;
    if (!land) {
      rows = n <= 3 ? 1 : (n <= 6 ? 2 : 3);
      base = Math.floor(n / rows);
      extra = n % rows;
      idx = 0;
      for (r = 0; r < rows; r++) {
        cnt = base + (r < extra ? 1 : 0);
        for (col = 0; col < cnt; col++, idx++) {
          t = cnt <= 1 ? 0.5 : col / (cnt - 1);
          out.push({ x: 0.16 + t * 0.68, y: (r + 0.58) / rows, s: 1, z: r, ns: t < 0.5 ? -1 : 1 });
        }
      }
      return out;
    }
    if (n === 1) return [{ x: 0.56, y: 0.68, s: 1, z: 2, ns: 1 }];
    frontN = Math.ceil(n / 2);
    backN = n - frontN;
    for (i = 0; i < backN; i++) {
      t = backN <= 1 ? 0.5 : i / (backN - 1);
      out.push({ x: 0.14 + t * 0.72, y: 0.36, s: 0.76, z: 0, ns: t < 0.5 ? -1 : 1 });
    }
    for (i = 0; i < frontN; i++) {
      t = frontN <= 1 ? 0.5 : i / (frontN - 1);
      out.push({ x: 0.06 + t * 0.88, y: 0.74, s: 1, z: 2, ns: t < 0.5 ? -1 : 1 });
    }
    return out;
  };


  XY.gacha10.paint = function (c, st, a) {
    var v = XY.gacha10.view(a); if (!v || !v.rec) return;
    var cw = st.cw, ch = st.ch, land = cw > ch * 1.05, short = land && ch < 420, rec = v.rec, rows = rec.rows || [];
    var elapsed = typeof XY.gacha10.freeze === 'number' ? XY.gacha10.freeze : Math.max(0, (a.rt || 0) - (v.t0 || 0));
    if (!document.getElementById('gachaBrush')) {
      var face = document.createElement('style');
      face.id = 'gachaBrush';
      face.textContent = '@font-face{font-family:GachaBrush;src:url("assets/fonts/MaShanZheng-Regular.ttf") format("truetype");font-display:swap}';
      document.head.appendChild(face);
    }
    rows.forEach(function (r) {
      if (XY.isHidden && XY.isHidden(r.id) && !(XY.save.spRealOwned && XY.save.spRealOwned(r.id))) return;
      gachaHd(r.id);
      if (XY.bgArt) { try { XY.bgArt(r.id); } catch (e) {} }
    });
    gachaHd('yuanzhang');
    if (XY.bgArt) { try { XY.bgArt('yuanzhang'); } catch (e) {} }
    if (XY.gacha10.forceHold) v.hold = true;
    if (v.phase !== 'result' && !v.hold && XY.gacha10.freeze == null && elapsed >= XY.gacha10.timing.total) v.phase = 'result';
    var stage = v.phase !== 'result' && XY.gacha10.forceResult !== true;
    var focus = v.hold && v.focus != null ? v.focus : XY.gacha10.focusOf(elapsed);
    if (!v.hold) v.focus = focus;
    if (VU.paperBg) VU.paperBg(c, { cw: cw, ch: ch }, { rgb: '92,74,52', rgb2: '70,56,42', seed: 21 });
    else { c.fillStyle = '#f6efe0'; c.fillRect(0, 0, cw, ch); }
    function shown(id) {
      if (!id) return false;
      if (XY.isHidden && XY.isHidden(id) && !(XY.save.spRealOwned && XY.save.spRealOwned(id))) return false;
      return true;
    }
    function gachaHd(id) {
      XY._gachaHd = XY._gachaHd || {};
      var im = XY._gachaHd[id];
      if (!im) { im = XY._gachaHd[id] = new Image(); im.src = 'assets/art/battle-hd/' + id + '.webp'; }
      return (im.complete && im.naturalWidth) ? im : null;
    }
    function alphaBox(im) {
      if (im._gachaBox) return im._gachaBox;
      var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
      var cnv = document.createElement('canvas');
      cnv.width = w; cnv.height = h;
      var g = cnv.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0);
      var d = g.getImageData(0, 0, w, h).data, i, x, y, bx0 = w, by0 = h, bx1 = 0, by1 = 0, seen = 0;
      for (i = 0; i < w * h; i++) {
        if (d[i * 4 + 3] < 28) continue;
        y = (i / w) | 0; x = i - y * w;
        if (x < bx0) bx0 = x; if (y < by0) by0 = y; if (x > bx1) bx1 = x; if (y > by1) by1 = y;
        seen = 1;
      }
      im._gachaBox = seen ? { x: bx0, y: by0, w: bx1 - bx0 + 1, h: by1 - by0 + 1 } : { x: 0, y: 0, w: w, h: h };
      return im._gachaBox;
    }
    function packArt(id, x, y, w, h) {
      if (!shown(id)) { XY.gacha10.lastPortrait = null; return null; }
      var hd = gachaHd(id);
      var im = hd || (XY.bgArt && XY.bgArt(id));
      if (!im || !(im.naturalWidth || im.width)) { XY.gacha10.lastPortrait = null; return null; }
      var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
      var box = XY.gacha10.portraitBox(iw, ih, x, y, w, h);
      XY.gacha10.lastPortrait = { id: id, iw: iw, ih: ih, dw: box.dw, dh: box.dh };
      if (hd) { alphaBox(hd); return { im: hd, cut: hd, iw: iw, ih: ih }; }
      return { im: im, cut: gachaCutout(im), iw: iw, ih: ih };
    }
    function inkName(c, text, x, y, size, maxW, col, bare) {
      if (!text) return;
      c.save();
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = size + 'px GachaBrush, KaiTi, STKaiti, serif';
      var tw = c.measureText(text).width;
      if (!bare) {
        while (size > 14 && tw > maxW) { size -= 1; c.font = size + 'px GachaBrush, KaiTi, STKaiti, serif'; tw = c.measureText(text).width; }
        c.lineWidth = Math.max(2, size * 0.08);
        c.strokeStyle = 'rgba(252,246,232,0.75)';
        c.strokeText(text, x, y);
      } else if (VU.washE) {
        VU.washE(c, x, y, Math.max(tw * 0.48, size), size * 0.55, '252,246,232', 0.5);
        c.lineWidth = Math.max(1.2, size * 0.07);
        c.strokeStyle = 'rgba(252,246,232,0.95)';
        c.strokeText(text, x, y);
      }
      c.fillStyle = col || '#1a120c';
      c.fillText(text, x, y);
      c.restore();
    }
    function drawCut(c, art, x, y, w, h) {
      var s = Math.min(w / art.iw, h / art.ih);
      var dw = art.iw * s, dh = art.ih * s, ox = x + (w - dw) / 2, oy = y + (h - dh) / 2;
      c.drawImage(art.cut, ox, oy, dw, dh);
      return { im: art.cut, x: ox, y: oy, w: dw, h: dh };
    }
    function leaf(c, x, y, len, rot, rgb, a) {
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      c.fillStyle = 'rgba(' + rgb + ',' + a + ')';
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(len * 0.48, -len * 0.28, len, 0);
      c.quadraticCurveTo(len * 0.42, len * 0.22, 0, 0);
      c.fill();
      c.restore();
    }
    /* 左侧竹林：秆、节、叶都画出纸边，旁边用墨团洇开，不铺方板。 */
    function grove(c, x, y, bw, bh) {
      var IP = XY.INKP, scale = Math.max(0.7, Math.min(1.3, bw / 180));
      if (IP) {
        IP.blot(c, x + bw * 0.16, y + bh * 0.8, bw * 0.58, '28,24,18', 0.5, 2, 14, 0.5);
        IP.blot(c, x + bw * 0.02, y + bh * 0.46, bw * 0.36, '34,28,22', 0.38, 8, 8, 0.66);
        IP.blot(c, x + bw * 0.48, y + bh * 0.18, bw * 0.32, '26,22,18', 0.3, 5, 7, 0.8);
        IP.stroke(c, x + bw * 0.08, y + bh * 0.28, x + bw * 1.05, y + bh * 0.2, 6, '30,26,20', 0.32, 21, 0.06);
        IP.stroke(c, x + bw * 0.04, y + bh * 0.72, x + bw * 0.85, y + bh * 0.8, 8, '24,20,16', 0.36, 24, -0.04);
        IP.dots(c, x + bw * 0.28, y + bh * 0.4, bw * 0.08, bw * 1.35, 20, 1.4, 3.6, '24,20,16', 0.55, 16, 0.72);
        IP.splash(c, x + bw * 0.18, y + bh * 0.66, bw * 0.04, bw * 0.85, 7, 4.5 * scale, null, 0.38, 19, 0.75);
      }
      if (VU.washE) VU.washE(c, x + bw * 0.35, y + bh * 0.78, bw * 0.42, bw * 0.28, '28,24,18', 0.16);
      var stalks = [[0.05, 0.0, 1, 8.2], [0.2, 0.02, 0.94, 10], [0.36, 0.08, 0.8, 6.4], [0.52, 0.0, 1, 9], [0.7, 0.05, 0.86, 7.2], [0.86, 0.1, 0.74, 6]];
      var rgb = '32,54,32';
      stalks.forEach(function (s, i) {
        var x0 = x + s[0] * bw, y0 = y + s[1] * bh, y1 = y + bh * s[2] + bh * 0.02;
        var lean = (i % 2 ? 0.07 : -0.06) * bw;
        var thick = s[3] * scale;
        if (IP) IP.stroke(c, x0 + lean, y1, x0, y0, thick, rgb, 0.88, 30 + i * 3, (i - 2.5) * 0.035);
        var j, t, jx, jy, ang, len;
        for (j = 1; j <= 5; j++) {
          t = j / 6;
          jx = x0 + lean * (1 - t);
          jy = y1 + (y0 - y1) * t;
          if (IP) IP.stroke(c, jx - thick, jy, jx + thick * 1.05, jy + 1.2, 1.5, '18,34,20', 0.85, 50 + i * 7 + j, 0.01);
          if (j >= 2) {
            ang = (i % 2 ? 0.55 : -0.5) + (j - 3) * 0.18;
            len = Math.min(bw, bh) * (0.075 + (j % 3) * 0.012);
            leaf(c, jx, jy, len, ang, rgb, 0.8);
            leaf(c, jx, jy, len * 0.82, ang + 0.75, '28,50,30', 0.72);
            leaf(c, jx, jy, len * 0.7, ang - 0.85, '24,42,28', 0.66);
          }
        }
      });
    }
    function crowdInk(cx, cy, rad) {
      var IP = XY.INKP;
      if (!IP) return;
      IP.stroke(c, cx - rad * 0.9, cy - rad * 0.08, cx + rad * 0.85, cy + rad * 0.12, Math.max(6, rad * 0.07), '36,28,20', 0.34, 4, 0.16);
      IP.stroke(c, cx - rad * 0.55, cy + rad * 0.22, cx + rad * 0.7, cy - rad * 0.18, Math.max(4, rad * 0.045), '24,18,14', 0.28, 9, -0.1);
      IP.stroke(c, cx - rad * 0.2, cy - rad * 0.35, cx + rad * 0.35, cy + rad * 0.4, Math.max(3, rad * 0.03), '48,38,28', 0.22, 15, 0.22);
      IP.blot(c, cx - rad * 0.12, cy + rad * 0.02, rad * 0.55, '32,26,18', 0.22, 6, 8, 0.48);
      IP.blot(c, cx + rad * 0.38, cy - rad * 0.08, rad * 0.32, '22,18,14', 0.16, 12, 5, 0.7);
      IP.splash(c, cx, cy, rad * 0.2, rad * 1.15, 8, Math.max(3, rad * 0.04), null, 0.26, 21, 0.5);
      IP.dots(c, cx, cy, rad * 0.3, rad * 1.4, 14, 1.2, 3.2, '28,22,16', 0.35, 27, 0.62);
    }
    function seal(c, x, y, s) {
      c.save();
      c.translate(x, y);
      c.rotate(-0.08);
      c.fillStyle = '#9d2b22';
      c.fillRect(-s / 2, -s / 2, s, s);
      c.fillStyle = '#f6efe2';
      c.font = Math.round(s * 0.62) + 'px GachaBrush, KaiTi, serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('印', 0, 1);
      c.restore();
    }
    function placeFigures(list, box) {
      if (box.h < 520) {
        var rowsS = Math.ceil(list.length / 5), colsS = Math.max(1, Math.ceil(list.length / rowsS)), placedS = [];
        list.forEach(function (g, idx) {
          var col = idx % colsS, row = (idx / colsS) | 0, fw = box.w / colsS * 0.92, fh = box.h / rowsS * 0.92;
          var inRow = Math.min(colsS, list.length - row * colsS);                 // 最后一排人少时居中，不靠左
          var cx = box.x + (box.w - inRow * (box.w / colsS)) / 2 + (col + 0.5) * (box.w / colsS), cy = box.y + (row + 0.55) * (box.h / rowsS);
          placedS.push({ id: g.id, n: g.n, unlock: g.unlock, label: g.label, x: cx - fw / 2, y: cy - fh / 2, w: fw, h: fh, z: row, ns: 0 });
        });
        return placedS;
      }
      if (land) {                                                   // 横屏大画面：五位以内站一排，再多站两排；谁也不压着谁，每人脚下留出写名字的地方
        var nmH = Math.max(28, Math.min(44, box.h * 0.065)), rowsL = list.length <= 5 ? 1 : 2, topN = rowsL === 1 ? 0 : Math.floor(list.length / 2), rowH = box.h / rowsL, placedL = [];
        list.forEach(function (g, idx) {
          var row = rowsL === 1 ? 0 : (idx < topN ? 0 : 1), cnt = rowsL === 1 ? list.length : (row === 0 ? topN : list.length - topN), col = row === 0 ? idx : idx - topN;
          var colW = box.w / Math.max(cnt, rowsL === 1 ? 3 : 4);
          var fh = Math.min(rowH - nmH - 8, colW * 0.94 / 0.75, box.h * 0.6), fw = fh * 0.75;
          var cx = box.x + (box.w - colW * cnt) / 2 + (col + 0.5) * colW;
          var y = box.y + row * rowH + (rowH - nmH - fh) * (rowsL === 1 ? 0.5 : (row === 0 ? 0.75 : 0.2));
          placedL.push({ id: g.id, n: g.n, unlock: g.unlock, label: g.label, x: cx - fw / 2, y: y, w: fw, h: fh, z: row, ns: 0 });
        });
        return placedL;
      }
      var unit = !land ? Math.min(box.h / 3.25, box.w * 0.42) : (short ? box.h * 0.62 : box.h * 0.52);
      var slots = XY.gacha10.rosterSlots(list.length, land);
      var placed = [];
      list.forEach(function (g, idx) {
        var sl = slots[Math.min(idx, slots.length - 1)];
        var fh = unit * sl.s, fw = fh * 0.75;
        var cx = box.x + sl.x * box.w, cy = box.y + sl.y * box.h;
        var x = cx - fw / 2, y = cy - fh / 2;
        var padX = 6, padTop = 4, bottom = box.y + box.h - 2;
        if (fw > cw - padX * 2) { var ks = (cw - padX * 2) / fw; fw *= ks; fh *= ks; x = cx - fw / 2; y = cy - fh / 2; }
        if (fh > bottom - padTop) { var ks2 = (bottom - padTop) / fh; fw *= ks2; fh *= ks2; x = cx - fw / 2; y = cy - fh / 2; }
        if (x < padX) x = padX;
        if (y < padTop) y = padTop;
        if (x + fw > cw - padX) x = cw - padX - fw;
        if (y + fh > bottom) y = bottom - fh;
        placed.push({ id: g.id, n: g.n, unlock: g.unlock, label: g.label, x: x, y: y, w: fw, h: fh, z: sl.z, ns: sl.ns });
      });
      return placed;
    }
    function layoutNames(placed, box) {
      function bodyOf(it) { return it.body || it; }
      function onBody(x, y, w, h) {
        var a0 = x - w / 2, a1 = x + w / 2, b0 = y - h / 2, b1 = y + h / 2, i, r, ox, oy, hit = 0;
        for (i = 0; i < placed.length; i++) {
          r = bodyOf(placed[i]);
          ox = Math.min(a1, r.x + r.w * 0.7) - Math.max(a0, r.x + r.w * 0.3);
          oy = Math.min(b1, r.y + r.h * 0.78) - Math.max(b0, r.y + r.h * 0.08);
          if (ox > 1 && oy > 1) hit += ox * oy;
        }
        return hit;
      }
      var taken = [];
      function onName(x, y, w, h) {
        var a0 = x - w / 2, a1 = x + w / 2, b0 = y - h / 2, b1 = y + h / 2, i, r, ox, oy, hit = 0;
        for (i = 0; i < taken.length; i++) {
          r = taken[i];
          ox = Math.min(a1, r.x + r.w / 2) - Math.max(a0, r.x - r.w / 2);
          oy = Math.min(b1, r.y + r.h / 2) - Math.max(b0, r.y - r.h / 2);
          if (ox > 0 && oy > 0) hit += ox * oy;
        }
        return hit;
      }
      var order = placed.slice().sort(function (a, b) { return a.z - b.z || a.x - b.x; });
      var names = order.map(function (it) {
        var size = Math.max(short ? 11 : 13, Math.min(short ? 15 : (land ? 26 : 15), box.h * (short ? 0.07 : (land ? 0.042 : 0.03))));
        var text = it.label, maxW = short ? Math.min(box.w * 0.12, 92) : (land ? Math.min(box.w * 0.16, 150) : Math.min(102, cw * 0.28));
        c.font = size + 'px GachaBrush, KaiTi, STKaiti, serif';
        while (size > 12 && c.measureText(text).width > maxW) { size -= 1; c.font = size + 'px GachaBrush, KaiTi, STKaiti, serif'; }
        var tw = Math.ceil(c.measureText(text).width), th = Math.ceil(size * 1.2);
        var bd = bodyOf(it);
        var left = bd.x > cw - (bd.x + bd.w);
        var cands = [], home;
        if (land) {
          var inward = bd.x < cw * 0.22 ? 0.62 : (bd.x + bd.w > cw * 0.82 ? 0.38 : (it.ns > 0 ? 0.62 : 0.4));
          if (it.z !== 2) cands.push([bd.x + bd.w * inward, bd.y - th * 0.75]);
          if (it.z === 2) cands.push([bd.x + bd.w * (it.ns < 0 ? 0.38 : 0.62), bd.y + bd.h + th * 0.75]);
          cands.push([left ? bd.x - tw * 0.55 - 4 : bd.x + bd.w + tw * 0.55 + 4, bd.y + th * 0.15]);
          cands.push([left ? bd.x + bd.w + tw * 0.55 + 4 : bd.x - tw * 0.55 - 4, bd.y + bd.h * 0.15]);
          cands.push([bd.x + bd.w * 0.5, bd.y - th * 0.65]);
          cands.push([bd.x + bd.w * 0.5, bd.y + bd.h + th * 0.7]);
        } else {
          var footX = bd.x + bd.w * 0.5, footY = bd.y + bd.h + th * 0.58;
          var col = footX < cw * 0.36 ? -1 : (footX > cw * 0.64 ? 1 : 0);
          cands.push([footX, footY]);
          cands.push([footX + col * 12, footY]);
          if (col < 0) cands.push([bd.x + Math.min(tw * 0.35, bd.w * 0.2), bd.y + bd.h * 0.84]);
          else if (col > 0) cands.push([bd.x + bd.w - Math.min(tw * 0.35, bd.w * 0.2), bd.y + bd.h * 0.84]);
          else cands.push([footX, bd.y + bd.h + th]);
          cands.push([footX, bd.y - th * 0.7]);
        }
        home = cands[0];
        var best = null, bi, x, y, sc;
        for (bi = 0; bi < cands.length; bi++) {
          var inset = land ? 36 : 8;
          x = Math.max(inset + tw / 2, Math.min(cw - inset - tw / 2, cands[bi][0]));
          y = Math.max(8 + th / 2, Math.min(box.y + box.h - 4 - th / 2, cands[bi][1]));
          var drift = Math.abs(x - home[0]) + Math.abs(y - home[1]);
          sc = onBody(x, y, tw, th) * 24 + onName(x, y, tw, th) * 14 + bi * 20 + (land ? 0 : drift * 0.45);
          if (!best || sc < best.sc) best = { x: x, y: y, sc: sc };
        }
        taken.push({ x: best.x, y: best.y, w: tw, h: th });
        return { id: it.id, text: text, size: size, x: best.x, y: best.y, w: tw, h: th, unlock: it.unlock, ns: it.ns, homeX: best.x, homeY: best.y };
      });
      var iter, i, k, a, b, ox, oy, push;
      for (iter = 0; iter < 10; iter++) {
        for (i = 0; i < names.length; i++) {
          a = names[i];
          for (k = i + 1; k < names.length; k++) {
            b = names[k];
            var gapX = Math.abs(a.x - b.x) - (a.w + b.w) / 2;
            var gapY = Math.abs(a.y - b.y) - (a.h + b.h) / 2;
            if (gapX < 8 && gapY < 10) {
              push = (10 - gapY) / 2 + 4;
              if (a.y <= b.y) { a.y -= push; b.y += push; }
              else { a.y += push; b.y -= push; }
            }
          }
          if (!land && a.homeX != null) {
            if (a.x > a.homeX + 26) a.x = a.homeX + 26;
            if (a.x < a.homeX - 26) a.x = a.homeX - 26;
            if (a.y > a.homeY + 22) a.y = a.homeY + 22;
            if (a.y < a.homeY - 22) a.y = a.homeY - 22;
          }
          var edge = land ? 36 : 8;
          a.x = Math.max(edge + a.w / 2, Math.min(cw - edge - a.w / 2, a.x));
          a.y = Math.max(8 + a.h / 2, Math.min(box.y + box.h - 4 - a.h / 2, a.y));
        }
      }
      return names;
    }

    function cinSeal(c, x, y, s, text) {
      if (!text) return;
      c.save();
      c.translate(x, y);
      c.rotate(-0.1);
      c.fillStyle = '#9d2b22';
      c.fillRect(-s / 2, -s * 0.48, s, s * 0.96);
      c.fillStyle = '#f6efe2';
      c.font = Math.round(s * 0.58) + 'px GachaBrush, KaiTi, serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(text, 0, 1);
      c.restore();
    }
    function roughSheet(c, x, y, w, h, seed) {
      var n = 26, i, p, ax = Math.max(8, Math.min(22, w * 0.012)), ay = Math.max(7, Math.min(18, h * 0.02));
      function j(k) { return (gachaHash(seed + k) - 0.5) * 2; }
      c.beginPath();
      for (i = 0; i <= n; i++) {
        p = i / n;
        if (!i) c.moveTo(x, y + j(i) * ay * 0.35);
        else c.lineTo(x + w * p, y + (i === n ? 0 : j(i) * ay));
      }
      for (i = 1; i <= n; i++) c.lineTo(x + w + j(80 + i) * ax, y + h * (i / n));
      for (i = n - 1; i >= 0; i--) c.lineTo(x + w * (i / n), y + h + (i ? j(160 + i) * ay : 0));
      for (i = n - 1; i >= 1; i--) c.lineTo(x + j(240 + i) * ax, y + h * (i / n));
      c.closePath();
    }
    function drawScroll(c, x, y, w, h, vertical) {
      var IP = XY.INKP;
      c.save();
      if (VU.washE) {
        VU.washE(c, x + w * 0.12, y + h * 0.18, w * 0.22, h * 0.16, '48,36,24', 0.16);
        VU.washE(c, x + w * 0.5, y + h * 0.04, w * 0.36, h * 0.08, '60,46,30', 0.1);
        VU.washE(c, x + w * 0.08, y + h * 0.72, w * 0.16, h * 0.22, '40,30,20', 0.12);
      }
      if (IP) IP.dots(c, x + w * 0.5, y + h * 0.5, Math.max(20, w * 0.46), Math.max(16, h * 0.42), 16, 1.1, 3.2, '36,28,20', 0.22, 6, 0.85);
      c.fillStyle = '#f3ead7';
      roughSheet(c, x, y, w, h, vertical ? 44 : 21);
      c.fill();
      if (!vertical) {
        var rw = Math.max(12, Math.min(34, h * 0.13)), rx = x + w - rw * 0.05;
        c.fillStyle = '#e4d2b0';
        c.beginPath(); c.ellipse(rx, y + h * 0.5, rw * 0.55, h * 0.47, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#f8f2e6';
        c.beginPath(); c.ellipse(rx - rw * 0.12, y + h * 0.5, rw * 0.26, h * 0.34, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#c9b48c';
        c.beginPath(); c.ellipse(rx + rw * 0.16, y + h * 0.5, rw * 0.14, h * 0.4, 0, 0, Math.PI * 2); c.fill();
      } else {
        var rh = Math.max(12, Math.min(28, w * 0.08)), ry = y + h - rh * 0.1;
        c.fillStyle = '#e4d2b0';
        c.beginPath(); c.ellipse(x + w * 0.5, ry, w * 0.48, rh * 0.55, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#f8f2e6';
        c.beginPath(); c.ellipse(x + w * 0.5, ry - rh * 0.12, w * 0.36, rh * 0.28, 0, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    }
    function inkBurst(c, cx, cy, rad) {
      var IP = XY.INKP;
      if (VU.washE) {
        VU.washE(c, cx, cy, rad * 1.05, rad * 0.72, '22,16,12', 0.62);
        VU.washE(c, cx - rad * 0.18, cy + rad * 0.04, rad * 0.62, rad * 0.4, '12,10,8', 0.45);
        VU.washE(c, cx + rad * 0.22, cy - rad * 0.08, rad * 0.4, rad * 0.28, '40,30,22', 0.28);
      }
      if (!IP) return;
      IP.blot(c, cx, cy, rad * 0.85, '20,14,10', 0.7, 4, 20, 0.62);
      IP.blot(c, cx - rad * 0.1, cy, rad * 0.45, '14,10,8', 0.5, 9, 14, 0.4);
      IP.splash(c, cx, cy, rad * 0.15, rad * 1.55, 22, Math.max(6, rad * 0.08), null, 0.72, 12, 0.9);
      IP.dots(c, cx, cy, rad * 0.2, rad * 1.8, 30, 1.4, 5.5, '18,12,8', 0.6, 21, 0.8);
      IP.stroke(c, cx - rad * 1.1, cy, cx + rad * 0.95, cy + rad * 0.08, Math.max(12, rad * 0.1), '16,12,8', 0.5, 6, 0.18);
      IP.stroke(c, cx - rad * 0.35, cy + rad * 0.4, cx + rad * 0.7, cy - rad * 0.3, Math.max(7, rad * 0.05), '28,20,14', 0.35, 14, -0.1);
    }
    function maskOf(im) {
      if (!im) return null;
      if (im._gachaA) return im._gachaA;
      var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
      if (!w || !h) return null;
      var cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      var g = cv.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0);
      var src = g.getImageData(0, 0, w, h).data, a = new Uint8Array(w * h), i;
      for (i = 0; i < w * h; i++) a[i] = src[i * 4 + 3];
      im._gachaA = { a: a, w: w, h: h };
      return im._gachaA;
    }
    function cover(draw, box, step) {
      if (!draw || !draw.im || box.w < 2 || box.h < 2) return { hits: 0, total: 1 };
      var m = maskOf(draw.im);
      if (!m) return { hits: 0, total: 1 };
      var hits = 0, total = 0, x, y, ix, iy;
      for (y = box.y; y < box.y + box.h; y += step) {
        for (x = box.x; x < box.x + box.w; x += step) {
          total++;
          if (x < draw.x || y < draw.y || x >= draw.x + draw.w || y >= draw.y + draw.h) continue;
          ix = ((x - draw.x) / draw.w * m.w) | 0;
          iy = ((y - draw.y) / draw.h * m.h) | 0;
          if (ix >= 0 && iy >= 0 && ix < m.w && iy < m.h && m.a[iy * m.w + ix] > 40) hits++;
        }
      }
      return { hits: hits, total: total || 1 };
    }
    function othersHit(list, box, step) {
      var n = 0, i;
      for (i = 0; i < list.length; i++) n += cover(list[i], box, step).hits;
      return n;
    }
    function fitOnBody(draw, body, others, text, size) {
      var anchor = body && body.w ? body : draw;
      c.font = size + 'px GachaBrush, KaiTi, STKaiti, serif';
      function linesFor(maxW) {
        if (c.measureText(text).width <= maxW) return [text];
        var best = null, i, a, b, w;
        for (i = 1; i < text.length; i++) {
          a = text.slice(0, i); b = text.slice(i);
          w = Math.max(c.measureText(a).width, c.measureText(b).width);
          if (!best || w < best.w) best = { w: w, lines: [a, b] };
        }
        return best ? best.lines : [text];
      }
      var lines = linesFor(Math.max(24, anchor.w * 0.96));
      var dimW = 0, li;
      for (li = 0; li < lines.length; li++) dimW = Math.max(dimW, Math.ceil(c.measureText(lines[li]).width));
      var gap = size * 1.15, dimH = Math.ceil(lines.length * gap);
      var head = { x: anchor.x, y: anchor.y, w: anchor.w, h: anchor.h * 0.35 };
      var waist = anchor.y + anchor.h * 0.5;
      function mistOf(cx, cy) {
        return { x: cx - dimW / 2 - 4, y: cy - dimH / 2 - 4, w: dimW + 8, h: dimH + 8, cx: cx, cy: cy, rx: dimW / 2 + 4, ry: dimH / 2 + 4 };
      }
      function hitsHead(m) {
        var x0 = Math.max(m.x, head.x), y0 = Math.max(m.y, head.y);
        var x1 = Math.min(m.x + m.w, head.x + head.w), y1 = Math.min(m.y + m.h, head.y + head.h);
        return x1 - x0 > 0.5 && y1 - y0 > 0.5;
      }
      var yf, sh, cx, cy, box, own, oth, frac, m, best = null;
      var shifts = [0, -0.06, 0.06];
      var topFrac;
      for (topFrac = 0.58; topFrac <= 1.02; topFrac += 0.04) {
        for (sh = 0; sh < shifts.length; sh++) {
          var top = anchor.y + anchor.h * topFrac;
          if (top < waist) continue;
          cx = anchor.x + anchor.w * (0.5 + shifts[sh]);
          cy = top + dimH / 2;
          m = mistOf(cx, cy);
          if (hitsHead(m)) continue;
          box = { x: cx - dimW / 2, y: cy - dimH / 2, w: dimW, h: dimH };
          if (box.x < 2 || box.y < 2 || box.x + box.w > cw - 2 || box.y + box.h > ch - 48) continue;
          var stt = mistOn(draw, m);
          if (stt.head || stt.frac > 0.15) continue;
          own = cover(draw, box, 2);
          oth = othersHit(others, box, 2);
          frac = own.hits / own.total;
          var sc = (oth === 0 ? 0 : 400) - frac * 100 + topFrac;
          if (!best || sc < best.sc) best = { x: cx, y: cy, size: size, w: dimW, h: dimH, lines: lines, own: Math.round(frac * 1000) / 1000, other: oth, sc: sc, mist: m, head: 0, mistFrac: Math.round(stt.frac * 1000) / 1000 };
        }
      }
      if (!best) best = { x: anchor.x + anchor.w * 0.5, y: waist + dimH / 2, size: size, w: dimW, h: dimH, lines: lines, own: 0, other: 1, mist: mistOf(anchor.x + anchor.w * 0.5, waist + dimH / 2) };
      return best;
    }
    function mistOn(draw, mist) {
      var mask = maskOf(draw && draw.im);
      if (!mask || !mist) return { head: 0, frac: 0 };
      var all = 0, hit = 0, headHit = 0, ix, iy, sx, sy, dx, dy, step = 2;
      var top = draw.y, span = draw.h;
      for (iy = 0; iy < mask.h; iy += step) {
        for (ix = 0; ix < mask.w; ix += step) {
          if (mask.a[iy * mask.w + ix] <= 40) continue;
          all++;
          sx = draw.x + (ix + 0.5) / mask.w * draw.w;
          sy = draw.y + (iy + 0.5) / mask.h * draw.h;
          dx = (sx - mist.cx) / mist.rx; dy = (sy - mist.cy) / mist.ry;
          if (dx * dx + dy * dy <= 1) {
            hit++;
            if (sy < top + span * 0.35) headHit++;
          }
        }
      }
      return { head: headHit, frac: all ? hit / all : 0 };
    }
    function softBamboo(c, x, y, w, h) {
      var IP = XY.INKP;
      if (!IP) return;
      [0.06, 0.14, 0.22, 0.3].forEach(function (p, i) {
        var x0 = x + w * p;
        IP.stroke(c, x0, y + h * 0.9, x0 + (i % 2 ? 10 : -8), y + h * 0.12, 6 - i * 0.6, '36,62,36', 0.42 - i * 0.07, 40 + i, 0.05);
      });
    }

    /* 整页先挡住出发页。名字和「收下」后登记，点名字不会穿透到后面。 */
    st.hit(0, 0, cw, ch, stage ? 'gachaSkip' : 'gachaAck');
    var scroll = { x: cw * 0.02, y: ch * 0.03, w: cw * 0.96, h: ch * 0.94 };
    if (stage && elapsed < XY.gacha10.timing.intro) {
      drawScroll(c, scroll.x, scroll.y, scroll.w, scroll.h, !land);
      if (land) grove(c, -cw * 0.01, -ch * 0.04, cw * 0.22, ch * 1.06);
      else grove(c, -cw * 0.02, -ch * 0.02, cw * 0.36, ch * 0.20);
      var titleX = scroll.x + scroll.w * (land ? 0.36 : 0.62);
      var titleY = scroll.y + scroll.h * (land ? 0.28 : 0.12);
      var titleS = land ? Math.min(72, scroll.h * 0.14) : Math.min(36, scroll.w * 0.1);
      inkName(c, '画十张', titleX, titleY, titleS, scroll.w * 0.34);
      cinSeal(c, titleX + titleS * 2.2, titleY + titleS * 0.15, Math.max(18, titleS * 0.48), '印');
      inkName(c, '画一张', titleX, titleY + titleS * 1.25, titleS * 0.78, scroll.w * 0.3);
      var host = shown('yuanzhang') ? 'yuanzhang' : (rows[0] && rows[0].id);
      var hx = scroll.x + scroll.w * (land ? 0.42 : 0.1);
      var hy = scroll.y + scroll.h * 0.08;
      var hw = scroll.w * (land ? 0.46 : 0.8);
      var hh = scroll.h * 0.78;
      inkBurst(c, hx + hw * 0.48, hy + hh * 0.5, Math.min(hw, hh) * 0.46);
      var art = host && packArt(host, hx, hy, hw, hh);
      var drawn = art && drawCut(c, art, hx, hy, hw, hh);
      if (host && drawn) {
        var hostBody = null;
        if (art.im && art.im._gachaBox) {
          var hb = art.im._gachaBox, hs = Math.min(hw / art.iw, hh / art.ih);
          var hdw = art.iw * hs, hdh = art.ih * hs;
          hostBody = { x: drawn.x + hb.x * (hdw / art.iw), y: drawn.y + hb.y * (hdh / art.ih), w: hb.w * (hdw / art.iw), h: hb.h * (hdh / art.ih) };
        }
        var hnSize = land ? Math.min(64, hh * 0.13) : Math.min(34, hw * 0.1);
        inkName(c, gachaName(host), hx + hw * 0.55, hy + hh * 0.48, hnSize, hw * 0.4, '#1a120c', true);
      }
    } else if (stage) {
      drawScroll(c, scroll.x, scroll.y, scroll.w, scroll.h, !land);
      var row = rows[focus] || rows[0];
      var introId = (XY.introQ && XY.introQ.length) ? XY.introQ[0] : null;
      var showId = introId || (row && row.id);
      var pp = v.hold ? 1 : XY.gacha10.cardAt(elapsed, focus);
      var fh = scroll.h * (short ? 0.86 : (land ? 0.78 : 0.62));
      var fw = Math.min(scroll.w * (land ? 0.38 : 0.72), fh * 0.72);
      var fx = scroll.x + (scroll.w - fw) / 2, fy = scroll.y + scroll.h * 0.05;
      if (!introId) inkBurst(c, fx + fw * 0.5, fy + fh * 0.52, Math.min(fw, fh) * 0.58);
      if (showId && shown(showId) && !introId) {
        var art2 = packArt(showId, fx, fy, fw, fh);
        c.save();
        c.globalAlpha = 0.25 + 0.75 * Math.max(0, Math.min(1, pp));
        var drawn2 = art2 && drawCut(c, art2, fx, fy, fw, fh);
        c.restore();
        if (drawn2) {
          var body2 = null;
          if (art2.im && art2.im._gachaBox) {
            var b2 = art2.im._gachaBox, s2 = Math.min(fw / art2.iw, fh / art2.ih);
            body2 = { x: drawn2.x + b2.x * s2, y: drawn2.y + b2.y * s2, w: b2.w * s2, h: b2.h * s2 };
          }
          var nmSize = Math.min(land ? 56 : 32, fh * 0.11);
          c.font = nmSize + 'px GachaBrush, KaiTi, STKaiti, serif';
          var nmW = c.measureText(gachaName(showId)).width;
          var nmX = fx + fw * (showId === 'yuanzhang' ? 0.64 : 0.5), nmY = fy + fh * (showId === 'yuanzhang' ? 0.5 : 0.9);
          if (!introId) inkName(c, gachaName(showId), nmX, nmY, nmSize, fw, '#1a120c', true);
          if (row.kind === 'unlock') cinSeal(c, nmX + nmW / 2 + nmSize * 0.7, nmY + nmSize * 0.45, Math.max(18, nmSize * 0.42), '新');
        }
      }
      inkName(c, '点按跳过', cw * 0.5, Math.min(ch - 22, scroll.y + scroll.h - 16), land ? 28 : 22, cw * 0.4);
    } else {
      var foot = 58;
      scroll = { x: cw * 0.015, y: 4, w: cw * 0.97, h: ch - foot - 6 };
      drawScroll(c, scroll.x, scroll.y, scroll.w, scroll.h, !land);
      var grouped = [], seenG = {}, gi;
      rows.forEach(function (r) {
        if (!shown(r.id)) return;
        gi = seenG[r.id];
        if (!gi) {
          gi = { id: r.id, n: 0, unlock: false, label: gachaName(r.id) };
          seenG[r.id] = gi;
          grouped.push(gi);
        }
        gi.n++;
        if (r.kind === 'unlock') gi.unlock = true;
      });
      var box = { x: scroll.x + scroll.w * 0.03, y: scroll.y + scroll.h * 0.04, w: scroll.w * 0.92, h: scroll.h * 0.9 };
      if (grouped.length) {
        var placed = placeFigures(grouped, box);
        if (!(land && box.h >= 520)) placed.forEach(function (it) { var room = Math.min(it.h * 0.16, short ? 20 : 24); it.h -= room; });   // 名字写在脚下，不再压在身上：人物让出一条
        XY.gacha10.lastCrowd = placed;
        var order = placed.slice().sort(function (a, b) { return a.z - b.z || a.y - b.y || a.x - b.x; });
        var draws = [];
        order.forEach(function (it) {
          var art3 = packArt(it.id, it.x, it.y, it.w, it.h);
          var d3 = !(XY.introQ && XY.introQ.length) && art3 && drawCut(c, art3, it.x, it.y, it.w, it.h);
          if (art3 && art3.im && art3.im._gachaBox && d3) {
            var b3 = art3.im._gachaBox, sc3 = Math.min(it.w / art3.iw, it.h / art3.ih);
            it.body = { x: d3.x + b3.x * sc3, y: d3.y + b3.y * sc3, w: b3.w * sc3, h: b3.h * sc3 };
          }
          it.draw = d3;
          if (d3) draws.push(it);
        });
        var names = [], audit = [];
        var nmSize = Math.round(Math.max(13, Math.min(short ? 16 : (land ? 30 : 16), box.h * (land ? 0.055 : 0.03))));
        draws.forEach(function (it) {                               // 名字写在各自脚下（毛笔字，不铺白底、不压在身上）；左右出框就往里收
          var bd = it.body || it.draw || it, size = nmSize, text = it.label, maxW = Math.max(60, (it.w || bd.w) * 1.25);
          c.font = size + 'px GachaBrush, KaiTi, STKaiti, serif';
          while (size > 12 && c.measureText(text).width > maxW) { size -= 1; c.font = size + 'px GachaBrush, KaiTi, STKaiti, serif'; }
          var tw = Math.ceil(c.measureText(text).width), th = Math.ceil(size * 1.2);
          var x = Math.max(box.x + tw / 2 + 4, Math.min(box.x + box.w - tw / 2 - 4, bd.x + bd.w / 2));
          var y = Math.min(box.y + box.h - th / 2 - 2, bd.y + bd.h + th * 0.62);
          var nm = { id: it.id, text: text, lines: [text], size: size, x: x, y: y, w: tw, h: th, unlock: it.unlock, n: it.n, own: 0, other: 0, head: 0, mistFrac: 0 };
          names.push(nm);
          audit.push({ id: nm.id, text: nm.text, own: 0, other: 0, size: nm.size, lines: 1, head: 0, mist: 0, pass: true });
        });
        XY.gacha10.lastNames = names;
        XY.gacha10.lastNameAudit = audit;
        function nameMist(x, y, w, h) {
          var rx = w / 2 + 4, ry = h / 2 + 4;
          c.save();
          c.translate(x, y); c.scale(rx, ry);
          var g = c.createRadialGradient(0, 0, 0.62, 0, 0, 1);
          g.addColorStop(0, 'rgba(246,239,226,0.94)');
          g.addColorStop(0.7, 'rgba(246,239,226,0.9)');
          g.addColorStop(1, 'rgba(246,239,226,0)');
          c.fillStyle = g; c.beginPath(); c.arc(0, 0, 1, 0, Math.PI * 2); c.fill();
          c.restore();
        }
        function resultInk(text, x, y, size) {
          c.save();
          c.font = size + 'px GachaBrush, KaiTi, STKaiti, serif';
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.lineJoin = 'round';
          c.lineWidth = Math.max(2, size * 0.14);
          c.strokeStyle = '#f7f1e4';
          c.strokeText(text, x, y);
          c.fillStyle = '#1a120c';
          c.fillText(text, x, y);
          c.restore();
        }
        function relLum(r, g, b) {
          function f(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        }
        function contrastAt(nm) {
          var m = c.getTransform ? c.getTransform() : null, sx = m ? m.a : 1, sy = m ? m.d : 1, ox = m ? m.e : 0, oy = m ? m.f : 0;
          var x0 = Math.max(0, Math.floor((nm.x - nm.w / 2) * sx + ox));
          var y0 = Math.max(0, Math.floor((nm.y - nm.h / 2) * sy + oy));
          var w = Math.max(2, Math.ceil(nm.w * sx)), h = Math.max(2, Math.ceil(nm.h * sy));
          var cv = c.canvas;
          if (x0 + w > cv.width) w = cv.width - x0;
          if (y0 + h > cv.height) h = cv.height - y0;
          if (w < 2 || h < 2) return 0;
          var d = c.getImageData(x0, y0, w, h).data, i, lum, dark = null, light = null, r, g, b, L1, L2, hi, lo;
          for (i = 0; i < d.length; i += 16) {
            r = d[i]; g = d[i + 1]; b = d[i + 2];
            lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            if (!dark || lum < dark.l) dark = { l: lum, c: [r, g, b] };
            if (!light || lum > light.l) light = { l: lum, c: [r, g, b] };
          }
          if (!dark || !light) return 0;
          L1 = relLum(dark.c[0], dark.c[1], dark.c[2]); L2 = relLum(light.c[0], light.c[1], light.c[2]);
          hi = Math.max(L1, L2); lo = Math.min(L1, L2);
          return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
        }
        var contrastRows = [];
        var introOn = !!(XY.introQ && XY.introQ.length);
        names.forEach(function (nm) {
          if (introOn) return;
          var lines = nm.lines || [nm.text], gap = nm.size * 1.15, y0 = nm.y - (lines.length - 1) * gap / 2, li;
          for (li = 0; li < lines.length; li++) resultInk(lines[li], nm.x, y0 + li * gap, nm.size);
          contrastRows.push({ id: nm.id, text: lines.join(''), lines: lines.slice(), size: nm.size, contrast: contrastAt(nm) });
          var hx = nm.x - nm.w / 2 - 6, hy = nm.y - nm.h / 2 - 4, hw = nm.w + 12, hh = Math.max(28, nm.h + 8);
          if (nm.unlock) cinSeal(c, nm.x + nm.w / 2 + nm.size * 0.85, nm.y + nm.h * 0.35, Math.max(14, nm.size * 0.42), '新');
          if (nm.n > 1) cinSeal(c, nm.x - nm.w / 2 - nm.size * 0.7, nm.y + nm.h * 0.15, Math.max(14, nm.size * 0.42), String(nm.n));
          st.hit(hx, hy, hw, hh, 'gachaPick', { id: nm.id });
        });
        XY.gacha10.lastContrast = contrastRows;
      }
      st.btn(cw * 0.5 - 70, ch - 52, 140, 44, '收下', 'gachaAck', { pri: true, col: '#9d2b22', sz: 20 });
    }
  };

  DP.draw = function (c, G, a) {
    XY.departPlates = []; XY.departSeals = []; XY.departTexts = []; XY.departCards = [];
    var st = VU.begin(c, a), cw = st.cw, ch = st.ch, land = (cw >= 600 && cw > ch * 1.1) || (cw >= 480 && cw > ch * 1.5), tiny = land && ch <= 360, cmp = tiny || (!land && ch < 720);
    var geo = DP.geo = { land: land, tiny: tiny, cmp: cmp, cards: [], tiles: 0, btns: [], bottom: 0 };
    bgPoster(c, cw, ch, land);
    var items = DP.items(), cur0 = sel(a, items), narrow = cw < 520, villainOn = XY.chain09 && XY.chain09.visible('villain');
    var s = land ? Math.max(0.85, Math.min(1.4, Math.min(cw / 844, ch / 390))) : Math.max(0.88, Math.min(1.4, cw / 390));
    function sbtn(x, y, w, h, label, act, o) { st.btn(x, y, w, h, label, act, o); geo.btns.push({ act: act, x: x, y: y, w: w, h: Math.max(44, h) }); }
    function weak(x, y, w, label, act) { VU.txt(c, label, x + w / 2, y + 22, 16, INK, 'center', true, w - 4); if (VU.brush) VU.brush(c, x + 10, y + 36, Math.max(24, w - 20), 2.2, 0.4, label.length); st.hit(x, y, w, 44, act); }

    var top = 56, tl, nt, d, nameH, cellW, cellH, cols, rows, out, go, gx, gy, gw, gh, cr;
    if (land) {
      // —— 底：携带常驻一行
      tl = tiles(a, true); nt = tl.length;
      cellH = tiny ? 34 : Math.min(52, Math.max(34, Math.round(ch * 0.1)));
      cellW = (cw - 28) / Math.max(1, nt);
      cols = nt; rows = 1;
      var rowGap = 0, labH = tiny ? 0 : 20;
      if (cellW - cellH < 56) {
        cols = Math.ceil(nt / 2); rows = Math.ceil(nt / cols);
        cellW = (cw - 28) / cols;
        rowGap = 4;
        cellH = Math.max(30, Math.min(tiny ? 32 : 42, Math.floor((Math.min(ch * 0.22, 92) - rowGap) / rows)));
      }
      d = cellH; nameH = 0;
      var stripBody = rows * cellH + (rows - 1) * rowGap;
      var stripY = ch - (tiny ? 10 : 6) - stripBody - labH;
      if (stripY < top + 120) stripY = top + 120;
      d = cellH;
      c.save(); c.fillStyle = '#f7f1e4'; c.fillRect(0, stripY - 2, cw, ch - stripY + 4); c.restore();
      VU.washE(c, cw / 2, stripY + (labH + stripBody) / 2 + 4, cw * 0.62, (labH + stripBody) * 0.75, '250,244,228', 0.8);
      taper(c, 24, stripY - 2, cw - 24, 2.2, 0.32);
      function noteBox(label, x, y, sz, al, maxW) {
        c.font = 'bold ' + sz + 'px ' + KAI;
        var tw = c.measureText(label).width, drawn = label;
        if (maxW && tw > maxW) { c.font = sz + 'px ' + KAI; tw = Math.min(maxW, c.measureText(label).width); }
        var left = al === 'right' ? x - Math.min(tw, maxW || tw) : x;
        var box = { label: label, x: left, y: y - sz * 0.72, w: Math.min(tw, maxW || tw), h: sz * 1.2 };
        (XY.departTexts = XY.departTexts || []).push(box);
        return box;
      }
      var info0 = carryInfo(a, { hover: null });
      var note = XY.TEST_BUILD ? XY.SPECIALS.length + ' 位全可选 · 不写存档' : '没抽到的要集齐 ' + XY.SP_LV_AT[0] + ' 张角色卡';
      if (!tiny) {
        kt(c, '携带常驻', 14, stripY + 9, 13, RED, 'left', 80);
        noteBox('携带常驻', 14, stripY + 9, 13, 'left', 80);
        c.font = '12px ' + KAI; var nw0 = Math.min(cw * 0.3, c.measureText(note).width);
        kt(c, info0, 84, stripY + 9, 12, INK, 'left', cw - 84 - nw0 - 30, false);
        noteBox(info0, 84, stripY + 9, 12, 'left', cw - 84 - nw0 - 30);
        kt(c, note, cw - 14, stripY + 9, 11.5, SOFT, 'right', cw * 0.3, false);
        noteBox(note, cw - 14, stripY + 9, 11.5, 'right', cw * 0.3);
      }
      out = carryStrip(c, st, a, tl, 12, stripY + labH, cw - 24, cols, cellW, cellH, d, rowGap);
      geo.tiles = nt; geo.strip = { y: stripY, h: labH + stripBody };
      // —— 中：左 竖卡 + 说明；右 立绘 + 按钮
      var y1 = stripY - (tiny ? 22 : 10), LW = Math.round(cw * (cw >= 1000 ? 0.58 : 0.6)), detMin = Math.round(Math.min(150, 84 * s));
      // 说明行数（sweep09 已通关会多一行星级）：按最小 13px 行距给够，竖卡相应矮一点，免得「终点 / 最快用时」被挤掉
      var nDet = (cur0.k === 'boss' ? 3 : 4) + (cur0.k !== 'boss' && cur0.cleared && XY.sweep09 ? 1 : 0);
      detMin = Math.min(132, Math.max(96, Math.round(18 + nDet * 18)));
      cr = cardRow(c, st, items, cur0, 14, top + 2, LW - 14, y1 - top - 2 - detMin - 10, s, geo);
      var dy = cr.bottom + 12;
      go = detail(c, cur0, 14, dy, LW - 14, y1 - dy, s);
      var rx = LW + 14, rw = cw - rx - 14;
      gh = Math.round(Math.max(52, Math.min(80, 58 * s))); gw = Math.min(rw, Math.round(300 * s)); gx = rx + (rw - gw) / 2; gy = y1 - gh;
      var sy2 = gy - 10 - 44, fh = Math.min((gy - top) * 1.18, rw * 1.6);
      figure(c, rx + rw * 0.5, sy2 + 18, fh, 0.95);
      VU.washE(c, gx + gw / 2, (sy2 + gy + gh) / 2, gw * 0.75, (gy + gh - sy2) * 0.75, '250,244,228', 0.7);
      var half = (gw - 8) / 2;
      if (villainOn) { sbtn(gx, sy2, half, 44, '反派模式', 'menuVillain', { seal: true, col: PUR, sz: Math.min(16, 14 * s), stack: false, rot: -0.02 }); sbtn(gx + half + 8, sy2, half, 44, '重新开始取经', 'menuRestart', { sz: Math.min(15, 13.5 * s), rgb: '122,74,50', vh: 30 }); }
      else sbtn(gx + gw * 0.15, sy2, gw * 0.7, 44, '重新开始取经', 'menuRestart', { sz: Math.min(15, 13.5 * s), rgb: '122,74,50', vh: 30 });
      if (go.sw) { var swW = 76; gw -= swW + 8; sweepBtn(c, st, sbtn, gx + gw + 8, gy, swW, gh, go); }
      goBtn(c, st, a, gx, gy, gw, gh, go);
      if (tiny) {
        c.font = 'bold 13px ' + KAI;
        var wCarry = c.measureText('携带常驻').width;
        c.font = '12px ' + KAI;
        var wInfo = c.measureText(info0).width;
        var gapL = 14, rowW = wCarry + gapL + wInfo;
        var xL = gx + Math.max(0, (gw - rowW) / 2);
        if (xL + rowW > cw - 10) xL = Math.max(8, cw - 10 - rowW);
        var zB = a.zoom || 1, sealR = (22 + 132 + 10 + 120) * zB + 10;
        if (xL < sealR) xL = sealR;
        var z2 = a.zoom || 1;
        XY.departDk = { top: Math.max(250, (a.lh || 0) - 250) * z2, bottom: Math.max(250, (a.lh || 0) - 250) * z2 + 56 * z2, right: sealR };
      }
      geo.go = { act: go.act, x: gx, y: gy, w: gw, h: gh }; geo.bottom = ch - 4;
    } else {
      // —— 竖屏：自下而上排：底栏小入口 → 头像 → 出发 → 反派 / 重开；自上而下：竖卡 → 说明；中间剩下的放立绘
      var mg = 12, linkY = ch - 64 - 44;
      var lb = [['排行榜', 'menuBoard'], ['灵石商店', 'menuShop']]; if (XY.version && XY.version.showToggle && XY.version.showToggle()) lb.push([XY.version.name() + ' ⇄', 'toggleVer']); var lw3 = (cw - 2 * mg - 6 * (lb.length - 1)) / lb.length;
      VU.washE(c, cw / 2, linkY + 22, cw * 0.6, 34, '250,244,228', 0.8);
      lb.forEach(function (b, k) { weak(mg + k * (lw3 + 6), linkY, lw3, b[0], b[1]); });
      tl = tiles(a, true); nt = tl.length;
      cols = Math.min(nt, cw < 460 ? 2 : 3);
      rows = Math.ceil(nt / cols);
      cellW = (cw - 2 * mg) / cols;
      cellH = Math.min(52, Math.max(34, cellW * 0.42));
      if (cellW - cellH < 34) cellH = Math.max(28, cellW - 36);
      var rg = 8, labHp = 36;
      var stripH = labHp + rows * cellH + (rows - 1) * rg;
      d = cellH; nameH = 0;
      var stripYp = linkY - 8 - stripH;
      VU.washE(c, cw / 2, stripYp + stripH / 2, cw * 0.7, stripH * 0.7, '250,244,228', 0.8);
      taper(c, 24, stripYp - 2, cw - 24, 2.2, 0.32);
      kt(c, '携带常驻', mg + 2, stripYp + 10, 13, RED, 'left', 80);
      out = carryStrip(c, st, a, tl, mg, stripYp + labHp, cw - 2 * mg, cols, cellW, cellH, d, rg);
      kt(c, carryInfo(a, out), mg + 2, stripYp + 27, 11.5, INK, 'left', cw - 2 * mg - 4, false);
      kt(c, XY.TEST_BUILD ? '全可选' : '集齐 ' + XY.SP_LV_AT[0] + ' 张解锁', cw - mg - 2, stripYp + 10, 11, SOFT, 'right', 120, false);
      geo.tiles = nt; geo.strip = { y: stripYp, h: stripH };
      gh = Math.round(Math.max(54, Math.min(84, 62 * s))); gw = Math.min(cw - 2 * mg - 20, Math.round(330 * s)); gx = (cw - gw) / 2; gy = stripYp - 14 - gh;
      var sy3 = gy - 8 - 44;
      cr = cardRow(c, st, items, cur0, mg, top + 2, cw - 2 * mg, Math.max(72, Math.min(Math.round(Math.min(ch * 0.2, 190 * s)), sy3 - top - 70)), s, geo);
      var dy2 = cr.bottom + 12, dh2 = Math.round(Math.max(64, Math.min(ch * 0.13, 120 * s)));
      dh2 = Math.min(dh2, sy3 - 8 - dy2);
      var free = sy3 - (dy2 + dh2);
      if (free > 60) figure(c, cw * 0.5, sy3 + 22, Math.min(free + 30, cw * 1.05), 0.95);
      go = detail(c, cur0, mg + 2, dy2, cw - 2 * mg - 4, dh2, s);
      var hw = Math.min((gw - 8) / 2, 170);
      VU.washE(c, cw / 2, sy3 + 22, gw * 0.6, 30, '250,244,228', 0.7);
      if (villainOn) { sbtn(cw / 2 - hw - 4, sy3, hw, 44, '反派模式', 'menuVillain', { seal: true, col: PUR, sz: 15, stack: false, rot: -0.02 }); sbtn(cw / 2 + 4, sy3, hw, 44, '重新开始取经', 'menuRestart', { sz: 14, rgb: '122,74,50', vh: 30 }); }
      else sbtn(cw / 2 - hw / 2, sy3, hw, 44, '重新开始取经', 'menuRestart', { sz: 14, rgb: '122,74,50', vh: 30 });
      if (go.sw) { var swP = 76; gw -= swP + 8; gx = (cw - gw - swP - 8) / 2; sweepBtn(c, st, sbtn, gx + gw + 8, gy, swP, gh, go); }
      goBtn(c, st, a, gx, gy, gw, gh, go);
      geo.go = { act: go.act, x: gx, y: gy, w: gw, h: gh }; geo.bottom = linkY + 44;
    }
    // —— 页头（最后画，盖在立绘上面）：竹简返回 · 「行」印 + 楷体「出发」· 灵石 —— 右边弱化墨条 + 朱红「更多」
    var x0 = 10; st.btn(x0, 6, 76, 44, '返回', 'back', { back: true }); x0 += 86;
    if (!narrow) { VU.seal(c, x0, 10, 34, 34, '行', RED, 20); x0 += 42; }
    var moreW = 58, moreX = cw - 10 - moreW;
    sbtn(moreX, 6, moreW, 44, '更多', 'menuHub', { pri: true, col: RED, sz: 17, stack: false });
    geo.more = { x: moreX, y: 6, w: moreW, h: 44 };
    var cloudW = (XY.account && XY.account.barWidth) ? XY.account.barWidth(cw) : 0;
    var hx = moreX - 6;
    var cloudSlot = null;
    if (cloudW >= 132 && XY.account && XY.account.paintBar) { hx -= cloudW; cloudSlot = hx; hx -= 4; }
    if (land) {
      VU.washE(c, cw - 170, 28, 220, 30, '250,244,228', 0.85);
      var hb = [['灵石商店', 'menuShop', cw < 700 ? 82 : 92], ['排行榜', 'menuBoard', cw < 700 ? 70 : 80]]; if (XY.version && XY.version.showToggle && XY.version.showToggle()) hb.push([XY.version.name() + ' ⇄', 'toggleVer', cw < 700 ? 92 : 100]);
      hb.forEach(function (b) { hx -= b[2]; weak(hx, 6, b[2], b[0], b[1]); hx -= 4; });
    }
    var tw0 = hx - x0 - 8;
    kt(c, '出发', x0, 25, narrow ? 26 : 30, '#2b1c08', 'left', Math.max(40, tw0));
    taper(c, x0 - 2, 41, x0 + Math.min(Math.max(40, tw0), 74), 2.4, 0.5);
    if (tw0 > 120) kt(c, '灵石 ' + S.data.lingshi + (''), x0 + 74, 31, 12, '#8a5a12', 'left', tw0 - 78, false);
    if (cloudSlot != null) XY.account.paintBar(c, st, cloudSlot, 6, cloudW, 44);

    if (!(XY.account && XY.account.holdGacha && XY.account.holdGacha()) && XY.gacha10 && XY.gacha10.paint) XY.gacha10.paint(c, st, a);
    geo.jt = '取经之旅 · 第 ' + a.levelId + ' 关：' + XY.journey.status(a.levelId).text;
    var mm = a.menuMsg; if (mm && a.rt < mm.until) { var vm = VU.msg; VU.msg = { text: mm.text, bad: !!mm.bad, until: mm.until }; VU.toast(c, st, a, land ? top : top); VU.msg = vm; }
    if (XY.account && XY.account.paintModal) XY.account.paintModal(c, st, a);
    st.end();
  };
  var oldDraw = XY.screens.draw;
  XY.screens.draw = function (c, G, a) {
    var rs = a.retStack;      // 出发 / 洞府阁 的“返回栈”里留着刚才没真的跳走的条目（比如点了锁着的入口）→ 清掉
    if ((a.screen === 'levels' || a.screen === 'hub') && rs && rs.length && rs[rs.length - 1] === a.screen) rs.pop();
    if (a.screen === 'levels') {
      if (DP.prev !== 'levels') { DP.kind = 'level'; DP.id = a.levelId; }
      DP.prev = 'levels'; DP.draw(c, G, a);
      if (a.confirm) oldDraw(c, G, { screen: '__none', confirm: a.confirm, lw: a.lw, lh: a.lh, mouse: a.mouse, rt: a.rt });
    } else { DP.prev = a.screen; oldDraw(c, G, a); }
  };

  var oldAct = HUB.act;
  HUB.act = function (h, p, a) {
    if (NAV[h.act] && (a.screen === 'levels' || a.screen === 'hub')) (a.retStack || (a.retStack = [])).push(a.screen);
    if (h.act === 'levelSel') DP.kind = 'level';
    if (h.act === 'dpSel') {
      var it = DP.items().filter(function (q) { return q.k === h.kind && q.id === h.id; })[0];
      if (it) { DP.kind = it.k; DP.id = it.id; if (!it.unl) say(a, it.hint, true); }
      return true;
    }
    return oldAct(h, p, a);
  };
})();
