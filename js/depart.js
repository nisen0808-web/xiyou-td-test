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
  /* 特殊角色的 X 头像：和主菜单（menu_v5 / menu_stage）同一套素材 —— dist 里是内联的 window.XY_X_AVATARS，源码版读 assets/art/x-avatars/<id>.jpg；没有 / 没加载好就回退成原来的自绘头像 */
  function xAv(id) { return pic('xav_' + id, 'assets/art/x-avatars/' + id + '.jpg'); }
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
    if (XY.FLAGS09 && XY.FLAGS09.bossEntry) { var ch = S.data.chain; out.push({ k: 'boss', id: 'niumo', tag: 'Boss 战', seal: '战', name: '牛魔王', sub: '独立对决', unl: !!(C && C.unlocked('bossfight')), cleared: !!(ch && ch.boss && ch.boss.niumo > 0), col: DEEP, hint: '通关任意一个洞府副本后解锁' }); }
    return out;
  };
  function sel(a, items) {
    var i, s = null;
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
    else lines.splice(1, 0, ['星级 ' + star + ' · ' + (kind === 'dungeon' ? '★2 阵亡≤3 · ★3 无人阵亡' : '★2 做 1 条支线 · ★3 无人阵亡') + ' → 三星解锁 2× 与扫荡', '#8a5a12', false]);
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
      lines.push(['先护住师父，洞主打两次，再护送到终点（约 6 分钟）', SOFT, false]);
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

  /* 携带：已解锁保留原始X头像；未解锁只把头像置灰，卡数与查看入口保留。 */
  function tile(c, st, a, tl, x, y, cellW, d, cur, out) {
    var id = tl.id, on = id === null ? !cur : cur === id;
    var cx = x + d / 2, cy = y + d / 2;
    var tileGeo = { id: id, x: x, y: y, w: cellW, h: d };
    (XY.departCards = XY.departCards || []).push(tileGeo);
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
    var have = tl.xc ? null : S.spCards(id), need = tl.xc ? null : XY.SP_LV_AT[0];
    tileGeo.owned = owned; tileGeo.cards = have; tileGeo.required = need; tileGeo.grayscale = !owned; tileGeo.face = { x: x, y: y, w: d, h: d };
    c.save();
    var drew = XY.xAvIcon && XY.xAvIcon.isSpecial && XY.xAvIcon.isSpecial(id) && XY.xAvIcon.draw(c, id, x, y, d, d, { locked: !owned });
    if (!drew) inkDisk(owned ? 'rgba(92,74,56,0.16)' : 'rgba(92,74,56,0.1)', null);
    c.restore();
    ring();
    if (owned) beside(name, cy, Math.min(18, d * 0.36), '#24180f');
    else {
      beside(name, cy - d * 0.16, Math.min(16, d * 0.32), '#8a7a68');
      beside(tl.xc ? '未开放' : '未解锁 ' + have + '/' + need, cy + d * 0.18, Math.min(13, d * 0.26), '#8a7a68');
    }
    if (!owned && tl.xc) { st.hit(x, y, cellW, d, 'xcharLocked'); return; }
    st.hit(x, y, cellW, d, owned ? 'carryPick' : 'dpCarryInspect', { id: id });
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
  // One full-body source for reveal cards, the result grid and post-draw introductions.
  // Do not briefly show the old half-body painting while the full illustration decodes.
  XY.gacha10.portraitImage = function (id) {
    if (!id || !(XY.SP_BY && XY.SP_BY[id]) ||
        (XY.isHidden && XY.isHidden(id) && !(S.spRealOwned && S.spRealOwned(id)))) return null;
    XY._gachaHd = XY._gachaHd || {};
    var fullFrame = ['laosiji', 'kuanggong', 'haiteng', 'yuanzhang', 'diaoyulao', 'martin'].indexOf(id) >= 0;
    var src = (fullFrame || id === 'sisi' || id === 'phyrex' || id === 'heyuxi')
      ? 'assets/art/gacha-portraits/' + id + '.webp'
      : 'assets/art/battle-hd/' + id + '.webp';
    var im = XY._gachaHd[id];
    // Replace a previously cached battle-HD body; load only the requested portrait.
    if (!im || (fullFrame && im._gachaSource !== src)) {
      im = XY._gachaHd[id] = new Image();
      im._gachaSource = src;
      im._gachaFullFrame = fullFrame;
      im.src = src;
    }
    return im.complete && im.naturalWidth ? im : null;
  };
  XY.gacha10.portraitBounds = function (im) {
    if (im._gachaBox) return im._gachaBox;
    var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
    // Preserve complete boots, weapon tips and faint ink edges in the new single images.
    if (im._gachaFullFrame) return im._gachaBox = { x: 0, y: 0, w: w, h: h };
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
    var data = g.getImageData(0, 0, w, h).data, x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (var i = 0; i < w * h; i++) if (data[i * 4 + 3] > 28) {
      var x = i % w, y = (i / w) | 0;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return im._gachaBox = x1 >= x0 && y1 >= y0
      ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
      : { x: 0, y: 0, w: w, h: h };
  };
  XY.gacha10.drawPortrait = function (c, id, x, y, w, h) {
    var im = XY.gacha10.portraitImage(id);
    if (!im) return null;
    var b = XY.gacha10.portraitBounds(im), box = XY.gacha10.portraitBox(b.w, b.h, x, y, w, h);
    c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(im, b.x, b.y, b.w, b.h, box.x, box.y, box.dw, box.dh);
    c.restore();
    return { id: id, src: im.src, source: b, target: box, region: { x:x, y:y, w:w, h:h } };
  };
  function gachaPortraitFit(c, id, x, y, w, h) {
    XY.gacha10.drawPortrait(c, id, x, y, w, h);
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
    var cw = st.cw, ch = st.ch, rec = v.rec, rows = rec.rows || [], land = cw > ch * 1.05, short = land && ch < 480;
    var elapsed = typeof XY.gacha10.freeze === 'number' ? XY.gacha10.freeze : Math.max(0, (a.rt || 0) - (v.t0 || 0));
    if (!document.getElementById('gachaBrush')) {
      var face = document.createElement('style'); face.id = 'gachaBrush';
      face.textContent = '@font-face{font-family:GachaBrush;src:url("assets/fonts/MaShanZheng-Regular.woff2") format("woff2"),url("assets/fonts/MaShanZheng-Regular.ttf") format("truetype");font-display:swap}';
      document.head.appendChild(face);
    }
    if (XY.gacha10.forceHold) v.hold = true;
    if (v.phase !== 'result' && !v.hold && XY.gacha10.freeze == null && elapsed >= XY.gacha10.timing.total) v.phase = 'result';
    var stage = v.phase !== 'result' && XY.gacha10.forceResult !== true;
    var focus = v.hold && v.focus != null ? v.focus : XY.gacha10.focusOf(elapsed);
    if (!v.hold) v.focus = focus;
    function visible(id) { return !!id && !(XY.isHidden && XY.isHidden(id) && !(XY.save.spRealOwned && XY.save.spRealOwned(id))); }
    function artFor(id) {
      var im = visible(id) && XY.gacha10.portraitImage(id);
      return im ? { im: im, source: im } : null;
    }
    var artBox = XY.gacha10.portraitBounds;
    rows.forEach(function (r) { artFor(r.id); });
    function text(s, x, y, size, color, align, width) {
      c.save(); c.font = size + 'px GachaBrush,"Ma Shan Zheng",KaiTi,serif';
      if (width && c.measureText(s).width > width) { size = Math.max(10, size * width / c.measureText(s).width); c.font = size + 'px GachaBrush,"Ma Shan Zheng",KaiTi,serif'; }
      c.fillStyle = color || INK; c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.fillText(s, x, y); c.restore();
    }
    function frame(x, y, w, h, color, lit) {
      c.save();
      c.shadowColor = 'rgba(45,34,22,0.15)'; c.shadowBlur = 10; c.shadowOffsetY = 5;
      c.fillStyle = '#f8f0de'; tornPath(c, x, y, w, h, 31); c.fill();
      c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
      var tint = c.createLinearGradient(x, y, x + w * 0.85, y + h);
      tint.addColorStop(0, '#fff9ed'); tint.addColorStop(0.55, '#f3e8cf'); tint.addColorStop(1, '#e8d8b8');
      c.fillStyle = tint; tornPath(c, x, y, w, h, 31); c.fill();
      c.strokeStyle = lit ? '#a53524' : color; c.lineWidth = lit ? 2.4 : 1.1; c.stroke();
      c.strokeStyle = 'rgba(101,79,43,0.25)'; c.lineWidth = 0.7; c.strokeRect(x + 6, y + 6, w - 12, h - 12);
      c.strokeStyle = color; c.lineWidth = 1.3;
      [[x+10,y+10,1,1],[x+w-10,y+10,-1,1],[x+10,y+h-10,1,-1],[x+w-10,y+h-10,-1,-1]].forEach(function (p) {
        c.beginPath(); c.moveTo(p[0],p[1]+p[3]*12); c.lineTo(p[0],p[1]); c.lineTo(p[0]+p[2]*12,p[1]); c.stroke();
      });
      c.restore();
    }
    function card(row, index, box, progress) {
      var x = box.x, y = box.y, w = box.w, h = box.h, front = progress >= 0.5;
      var color = row.kind === 'unlock' ? '#a53626' : row.kind === 'up' ? '#9b7433' : '#706452';
      var title = visible(row.id) ? gachaName(row.id) : '未揭晓';
      var lit = !stage && v.lit === row.id, flip = progress > 0 && progress < 1 ? Math.max(0.035, Math.abs(Math.cos(Math.PI * progress))) : 1;
      c.save(); c.translate(x + w / 2, y + h / 2); c.scale(flip, 1); c.translate(-x - w / 2, -y - h / 2);
      frame(x, y, w, h, front ? color : '#665a43', lit);
      if (!front) {
        c.save(); c.globalAlpha = 0.13; c.strokeStyle = '#403a2e'; c.lineWidth = 1;
        for (var ring = 0; ring < 4; ring++) { c.beginPath(); c.ellipse(x + w/2,y + h*.48,w*(.18+ring*.045),h*(.14+ring*.035),-.15,0,Math.PI*2);c.stroke(); }
        c.restore(); text('缘',x+w/2,y+h*.46,Math.min(70,w*.43),'#8e3024','center');
        text('西 行 奇 遇',x+w/2,y+h*.76,Math.max(12,w*.075),'#70604a','center',w-22);
      } else {
        var status = row.kind === 'unlock' ? '首次解锁' : row.kind === 'up' ? '角色升阶' : '重复获得';
        var bandH = 70, picture = {x:x+10,y:y+32,w:w-20,h:h-bandH-40};
        c.save(); tornPath(c,x+7,y+7,w-14,h-bandH,31);c.clip();
        if (VU.washE) { VU.washE(c,x+w*.5,y+h*.45,w*.55,picture.h*.60,'105,86,54',.10); VU.washE(c,x+w*.46,y+h*.64,w*.34,20,'58,47,35',.13); }
        var art = artFor(row.id);
        if (art) {
          var ab = artBox(art.im), sc = Math.min(picture.w/ab.w,picture.h/ab.h), dw=ab.w*sc, dh=ab.h*sc;
          c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
          c.drawImage(art.source,ab.x,ab.y,ab.w,ab.h,picture.x+(picture.w-dw)/2,picture.y+picture.h-dh,dw,dh);
          XY.gacha10.lastPortrait = {id:row.id,iw:ab.w,ih:ab.h,dw:dw,dh:dh};
        } else text(title.charAt(0),x+w/2,picture.y+picture.h*.5,42,'#493e2d','center');
        c.restore();
        text('特殊角色',x+13,y+19,Math.max(11,Math.min(13,w*.07)),'#76664d','left',w*.6);
        text(String(index+1).padStart(2,'0'),x+w-13,y+19,12,'#948367','right');
        var by=y+h-bandH;
        c.fillStyle='rgba(250,243,226,0.95)';c.fillRect(x+8,by,w-16,bandH-8);
        c.strokeStyle='rgba(95,75,42,0.36)';c.lineWidth=.8;c.beginPath();c.moveTo(x+16,by);c.lineTo(x+w-16,by);c.stroke();
        text(title,x+w/2,by+18,Math.max(18,Math.min(24,w*.13)),INK,'center',w-22);
        text(status,x+w/2,by+38,Math.max(11,Math.min(13,w*.075)),color,'center',w-18);
        var countText='+'+(row.add||1)+' 张  ·  共 '+(row.cards||row.add||1)+' 张';
        text(countText,x+w/2,by+56,Math.max(10.5,Math.min(12,w*.065)),SOFT,'center',w-18);
      }
      c.restore();
      if (!stage) st.hit(x,y,w,h,'gachaPick',{id:row.id});
      return {index:index,id:row.id,name:title,kind:row.kind,x:x,y:y,w:w,h:h,front:front,progress:progress};
    }
    if (VU.paperBg) VU.paperBg(c,{cw:cw,ch:ch},{rgb:'92,74,52',rgb2:'70,56,42',seed:21});
    else { c.fillStyle='#eee4ce';c.fillRect(0,0,cw,ch); }
    var wash=c.createLinearGradient(0,0,cw,ch);wash.addColorStop(0,'rgba(246,239,220,.74)');wash.addColorStop(1,'rgba(224,210,178,.46)');c.fillStyle=wash;c.fillRect(0,0,cw,ch);
    // The backdrop consumes the click; only the explicit button confirms results.
    st.hit(0,0,cw,ch,'gachaHold');
    var pageSize = !land ? (ch < 680 ? 2 : 4) : short ? 5 : 10, cols = !land ? 2 : 5;
    v.pages = Math.max(1,Math.ceil(rows.length/pageSize));
    var page = stage ? Math.floor(focus/pageSize) : Math.max(0,Math.min(v.pages-1,v.page||0));
    if (!stage) v.page = page;
    var first=page*pageSize,count=Math.min(pageSize,rows.length-first),rowCount=Math.max(1,Math.ceil(count/cols));
    var top=short?67:!land?100:88, bottom=short?66:!land?120:76, gap=short?11:14;
    var gridW=Math.min(cw-(!land?36:60),land?1120:430), maxH=Math.max(80,(ch-top-bottom-gap*(rowCount-1))/rowCount);
    var cardW=(gridW-gap*(cols-1))/cols,cardH=Math.min(maxH,cardW/0.66,land?292:280);
    cardW=Math.min(cardW,cardH*.70);gridW=cardW*cols+gap*(cols-1);
    var startX=(cw-gridW)/2,gridH=cardH*rowCount+gap*(rowCount-1),startY=top+Math.max(0,(ch-top-bottom-gridH)/2);
    var unique={};rows.forEach(function(r){if(r.kind==='unlock')unique[r.id]=true;});
    var titleY=short?25:36,titleSize=short?29:!land?32:38;
    text(stage?'奇遇揭晓':'十连奇遇',cw/2,titleY,titleSize,'#46351e','center');
    var subtitle=stage?'卡页轻启，故人新友相逢':'共 '+rows.length+' 张角色卡 · 新结识 '+Object.keys(unique).length+' 位';
    text(subtitle,cw/2,titleY+(short?25:32),short?12:14,'#837154','center',cw-40);
    if (!short && VU.brush) VU.brush(c,cw/2-74,titleY+47,148,1.2,.35,19);
    var layout=[];
    for(var i=0;i<count;i++){
      var idx=first+i,col=i%cols,rr=Math.floor(i/cols),inRow=Math.min(cols,count-rr*cols),rowW=inRow*cardW+(inRow-1)*gap;
      var box={x:(cw-rowW)/2+col*(cardW+gap),y:startY+rr*(cardH+gap),w:cardW,h:cardH};
      var progress=stage?(v.hold?(idx<=focus?1:0):XY.gacha10.cardAt(elapsed,idx)):1;
      layout.push(card(rows[idx],idx,box,progress));
    }
    if(stage){
      var by=ch-(short?54:60);text('第 '+(Math.min(focus,rows.length-1)+1)+' / '+rows.length+' 张',!land?cw/2:44,by+(short?20:!land?-18:0),13,SOFT,!land?'center':'left');
      st.btn(cw/2-82,ch-54,164,44,'全部翻开','gachaSkip',{pri:true,col:RED,sz:18});
    }else{
      if(v.pages>1){
        var navY=short?ch-54:ch-109,navX=short?34:cw/2-132;
        if(page>0)st.btn(navX,navY,84,44,'上一页','gachaPrev',{sz:15});else text('上一页',navX+42,navY+22,15,'#b3a48a','center');
        text((page+1)+' / '+v.pages,navX+132,navY+22,14,'#76664d','center');
        if(page+1<v.pages)st.btn(navX+180,navY,84,44,'下一页','gachaNext',{sz:15});else text('下一页',navX+222,navY+22,15,'#b3a48a','center');
      }else text('角色卡已记入行囊，重复所得计入成长',cw/2,ch-62,13,SOFT,'center',cw-24);
      var ackW=short?152:176,ackX=short?cw-ackW-34:(cw-ackW)/2;
      st.btn(ackX,ch-54,ackW,44,'收下 · 继续','gachaAck',{pri:true,col:RED,sz:19});
    }
    XY.gacha10.lastCardLayout={page:page,pages:v.pages,pageSize:pageSize,phase:stage?'flip':'result',width:cw,height:ch,cards:layout};
    XY.gacha10.lastNames=layout.map(function(q){return{id:q.id,name:q.name,x:q.x,y:q.y+q.h-70,w:q.w,h:70};});
  };

  /* Compact routes, readable briefing and an always-visible companion roster.
   * The sheet supplies detail on short screens; it is not the only avatar entry. */
  DP.draw = function (c, G, a) {
    XY.departPlates = []; XY.departSeals = []; XY.departTexts = []; XY.departCards = [];
    var st = VU.begin(c, a), fullW = st.cw, ch = st.ch;
    var cw = Math.min(fullW, 1360), offsetX = (fullW - cw) / 2;
    var land = (fullW >= 600 && fullW > ch * 1.1) || (fullW >= 480 && fullW >= ch * 1.5), short = land && ch < 500, compactPortrait = !land && ch < 620, narrowLand = land && cw < 700, compactCards = compactPortrait || narrowLand;
    bgPoster(c, fullW, ch, land);
    if (offsetX > 0) {
      c.translate(offsetX, 0);
      var baseHit = st.hit, baseOver = st.over;
      st.hit = function (x, y, w, h, act, ex) { return baseHit(x + offsetX, y, w, h, act, ex); };
      st.over = function (x, y, w, h) { return baseOver(x + offsetX, y, w, h); };
      st.cw = cw;
    }
    var geo = DP.geo = { land: land, tiny: short, cmp: short, cards: [], tiles: 0, btns: [], bottom: ch - 10 };
    var items = DP.items(), current = sel(a, items), mg = land ? 20 : 12;
    var contentTop = land ? (narrowLand ? 64 : 72) : 112, footerY = ch - 66;
    // Reserve a full-height portrait beside the briefing on desktop. The bottom
    // roster and the complete companion summary have their own vertical space.
    var desktopPortrait = land && cw >= 1200 && ch >= 720 && items.length <= 6;
    var desktopRosterY = ch - 74 - 10 - 128;
    var desktopArtX = cw - mg - 320;
    var listW = desktopPortrait ? 360 : land ? (narrowLand ? Math.max(192, Math.min(236, cw * 0.4)) : Math.min(420, Math.max(282, cw * 0.36))) : cw - mg * 2;
    var listX = mg, cardGap = 8, listCols = compactPortrait ? 3 : 2, cardW = (listW - cardGap * (listCols - 1)) / listCols;
    var cardH = compactPortrait ? 44 : land ? Math.max(44, Math.min(88, (ch - 74 - contentTop - 25 - cardGap * 2 - 12) / 3)) : (ch < 700 ? 48 : 58);
    var listY = contentTop + 25, listBottom = listY + Math.ceil(items.length / listCols) * (cardH + cardGap) - cardGap;
    function text(s0, x, y, sz, col, maxW, bold) {
      kt(c, s0, x, y, sz, col || INK, 'left', maxW, bold);
      XY.departTexts.push({ text: String(s0), x: x, y: y - sz * 0.6, w: maxW || c.measureText(String(s0)).width, h: sz * 1.2 });
    }
    function button(x, y, w, h, label, act, o) {
      st.btn(x, y, w, h, label, act, o || { sz: 16 });
      geo.btns.push({ act: act, x: x, y: y, w: w, h: Math.max(44, h) });
    }
    function paper(x, y, w, h, selected) {
      c.save(); c.fillStyle = selected ? '#fbf3df' : 'rgba(253,249,238,0.94)';
      c.strokeStyle = selected ? RED : 'rgba(112,91,59,0.30)'; c.lineWidth = selected ? 1.7 : 1;
      R.rrect(c, x, y, w, h, 7); c.fill(); c.stroke();
      if (selected) { c.fillStyle = RED; c.fillRect(x + 1, y + 8, 3, h - 16); }
      c.restore();
    }
    // Feedback owns an existing context region, never floats over controls or art.
    var menuNotice = a.menuMsg && a.rt < a.menuMsg.until ? { text: String(a.menuMsg.text), bad: !!a.menuMsg.bad } : null;
    function literalLines(value, width, size) {
      c.save(); c.font = R.font(size, false); var lines = [], line = '';
      String(value).split('').forEach(function (ch0) {
        if (ch0 === '\n') { lines.push(line); line = ''; }
        else if (line && c.measureText(line + ch0).width > width) { lines.push(line); line = ch0; }
        else line += ch0;
      });
      if (line) lines.push(line); c.restore(); return lines;
    }
    function literalWrap(value, x, y, width, lineH0, size, color) {
      var lines = literalLines(value, width, size);
      c.save(); c.font = R.font(size, false); c.fillStyle = color; c.textAlign = 'left'; c.textBaseline = 'middle';
      lines.forEach(function (line, i) { c.fillText(line, x, y + i * lineH0); }); c.restore();
      return lines.length * lineH0;
    }
    function feedback(x, y, width, owner) {
      var h = literalWrap(menuNotice.text, x + 6, y + 14, width - 12, 20, 14, menuNotice.bad ? RED : '#397c49') + 8;
      taper(c, x + 4, y + h - 2, x + width - 4, 1.2, 0.22, menuNotice.bad ? RED : BROWN);
      geo.feedback = { owner: owner, text: menuNotice.text, bad: menuNotice.bad, x: x, y: y, w: width, h: h, fontSize: 14 };
      return h;
    }
    function opaqueSheet(x, y, w, h) {
      // Opaque warm paper blocks old text; four restrained brush edges keep
      // the portrait clear without the large overlapping wash circles.
      c.save(); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      R.rrect(c, x, y, w, h, 7); c.fillStyle = '#fbf4e3'; c.fill(); c.clip();
      var brush = XY.INKP.stroke, ink = '100,83,58';
      brush(c, x + 3, y + 2, x + w - 3, y + 2, 1.3, ink, 0.65, 42, 0);
      brush(c, x + w - 2, y + 3, x + w - 2, y + h - 3, 1.2, ink, 0.58, 43, 0);
      brush(c, x + w - 3, y + h - 2, x + 3, y + h - 2, 1.3, ink, 0.65, 44, 0);
      brush(c, x + 2, y + h - 3, x + 2, y + 3, 1.2, ink, 0.58, 45, 0);
      c.restore();
      geo.opaqueSheet = { x: x, y: y, w: w, h: h, alpha: 1, paper: '#fbf4e3' };
    }
    var headingNoticeW = short ? listW : cw - mg * 2;
    var noticeInHeading = !!menuNotice && !DP.carryOpen && literalLines(menuNotice.text, headingNoticeW - 12, 14).length === 1;
    var noticeInBriefing = !!menuNotice && !DP.carryOpen && !noticeInHeading;
    // A solid paper header keeps the navigation readable over the landscape.
    c.save(); c.fillStyle = 'rgba(249,243,229,0.95)'; c.fillRect(0, 0, cw, land ? 59 : 104); c.restore();
    button(mg, 7, 68, 44, '返回', 'back', { back: true });
    text('出发', mg + 82, 28, 27, INK, 76);
    button(cw - mg - 60, 7, 60, 44, '更多', 'menuHub', { pri: true, col: RED, sz: 17, stack: false });
    geo.more = { x: cw - mg - 60, y: 7, w: 60, h: 44 };
    var nav = [['灵石商店', 'menuShop', 94], ['排行榜', 'menuBoard', 78], ['重走取经', 'menuRestart', 92]];
    if (XY.FLAGS09 && XY.FLAGS09.villainEntry) nav.push(['反派模式', 'menuVillain', 90]);
    if (XY.version && XY.version.showToggle && XY.version.showToggle()) nav.push([XY.version.name() + ' ⇄', 'toggleVer', 98]);
    if (!land && cw < 520) nav = nav.filter(function (n0) { return n0[1] !== 'toggleVer'; });
    if (land) {
      var navRoom = cw - mg * 2 - 72 - 170, navTotal = nav.reduce(function (n0, b0) { return n0 + b0[2]; }, 0);
      if (navTotal > navRoom) { nav = nav.filter(function (n0) { return n0[1] !== 'toggleVer'; }); navTotal = nav.reduce(function (n0, b0) { return n0 + b0[2]; }, 0); }
      if (navTotal > navRoom) nav.forEach(function (b0) { b0[2] = navRoom / nav.length; });
      var right = cw - mg - 72;
      for (var ni = nav.length - 1; ni >= 0; ni--) { right -= nav[ni][2]; button(right, 7, nav[ni][2] - 4, 44, nav[ni][0], nav[ni][1], { sz: 16 }); }
      var cloudW = XY.account && XY.account.barWidth ? XY.account.barWidth(cw) : 0;
      if (cloudW && right - cloudW >= mg + 178 && XY.account.paintBar) XY.account.paintBar(c, st, right - cloudW - 4, 7, cloudW, 44);
      else if (right > mg + 240) text('灵石 ' + S.data.lingshi, mg + 172, 30, 14, BROWN, right - mg - 185, false);
    } else {
      var navW = (cw - mg * 2) / nav.length;
      nav.forEach(function (b, k) { button(mg + k * navW, 57, navW - 3, 44, b[0], b[1], { sz: 15 }); });
    }
    if (noticeInHeading) feedback(mg, land ? 60 : 105, headingNoticeW, 'departure-heading');
    else text('选择目的地', listX + 2, contentTop + 8, 16, BROWN, listW);
    items.forEach(function (it, k) {
      var x = listX + k % listCols * (cardW + cardGap), y = listY + Math.floor(k / listCols) * (cardH + cardGap), on = current === it;
      paper(x, y, cardW, cardH, on);
      var sealW = compactCards ? 0 : short || !land ? 27 : 34, sx = x + 11, sy = desktopPortrait ? y + 12 : y + (cardH - sealW) / 2;
      if (sealW) VU.drawSeal(c, sx, sy, sealW, sealW, itemSeal(it), { style: on ? 'solid' : 'line', col: it.unl ? it.col : '#91836b', sz: sealW * 0.57, stack: false, rot: 0 });
      var nameX = compactCards ? x + 9 : sx + sealW + 10, nameW = compactCards ? cardW - 18 : cardW - sealW - 31;
      text(it.name, nameX, y + cardH * 0.36, compactCards ? 17 : land && !short ? 23 : 19, it.unl ? INK : SOFT, nameW);
      var state = it.cleared ? '已通关' : it.unl ? (it.k === 'level' ? '主线 · ' + it.sub : it.k === 'dungeon' ? '洞府副本' : '独立 Boss 战') : '未解锁';
      if (compactCards && it.unl && !it.cleared) state = it.k === 'level' ? '主线' : it.k === 'dungeon' ? '洞府副本' : 'Boss 战';
      text(state, desktopPortrait ? x + 11 : nameX, y + cardH * 0.73, land && !short ? 14 : 12, it.cleared ? '#397c49' : it.unl ? BROWN : '#8c7f69', desktopPortrait ? cardW - 22 : nameW, false);
      var act = it.k === 'level' && it.unl ? 'levelSel' : 'dpSel';
      st.hit(x, y, cardW, cardH, act, act === 'levelSel' ? { n: it.id } : { kind: it.k, id: it.id });
      geo.cards.push({ x: x, y: y, w: cardW, h: cardH, k: it.k, id: it.id, locked: !it.unl });
    });
    // Content is written in separate rows so the lock requirement and objective
    // never disappear behind a large illustration or a narrow vertical title.
    var dx = land ? listX + listW + (narrowLand ? 16 : 20) : mg, dy = land ? (short ? contentTop : listY) : listBottom + 14;
    var dw = desktopPortrait ? desktopArtX - 20 - dx : land ? cw - mg - dx : cw - mg * 2;
    if (land && !short && !noticeInHeading) text('关卡详情', dx + 2, contentTop + 8, 16, BROWN, dw);
    var dh = Math.max(92, (desktopPortrait ? desktopRosterY - 128 : land ? footerY - 16 : ch - 142) - dy);
    var tight = short || dh < 235 || dw < 340, pad = compactCards ? 10 : tight ? 12 : 20, bodyW = dw - pad * 2;
    var titleSz = tight ? 23 : 28, bodySz = tight ? 14 : 17, rowGap = narrowLand ? 4 : compactPortrait ? 5 : tight ? 6 : 13, lineH = bodySz * 1.4, labelW = narrowLand ? 34 : 46;
    var yy = dy + pad + titleSz * 0.5, go, rows0 = [], subtitle = '';
    var title = current.k === 'level' ? '第' + (NUM[current.id] || current.id) + '关 · ' + current.name : (current.k === 'dungeon' ? '洞府 · ' : 'Boss 战 · ') + current.name;
    if (current.k === 'level') {
      var L = XY.levelOf(current.id), li = S.levelInfo(current.id);
      subtitle = L.sub;
      rows0.push(['目标', L.main.text || L.main.short, INK]);
      rows0.push(['路线', '完成主线后，护送师父抵达「' + L.gate.name + '」', SOFT]);
      rows0.push(['进度', '支线 ' + S.levelSides(current.id) + '/' + L.sides.length + (li && li.best ? ' · 最快 ' + XY.fmtTime(li.best) : ''), BROWN]);
      go = { label: '出发！', sub: current.name, act: 'levelGo', ex: { n: current.id }, off: !current.unl };
    } else if (current.k === 'dungeon') {
      var dd = XY.dungeonOf(current.id), en = XY.ENEMIES[dd.boss], di = S.dngInfo(current.id);
      subtitle = dd.sub + ' · 洞主 ' + en.name;
      rows0.push(['成长', '1级重练，技能/法宝等级重置', RED]);
      rows0.push(['保留', '卡组起手，搭档/天兵卡等级保留', SOFT]);
      rows0.push(['目标', '护住师父，击退两轮洞主，再护送到终点', INK]);
      var fab = XY.fabao, rewardItem = fab && fab.DEN_ITEM && fab.BY && fab.BY[fab.DEN_ITEM[current.id]], haveReward = rewardItem && fab.unlocked(rewardItem.id);
      rows0.push(['奖励', '首通灵石 +' + XY.C.DNG_GAIN_FIRST + (rewardItem ? ' · 法宝「' + rewardItem.name + '」' + (haveReward ? '（已拥有）' : '') : '') + (tight ? '' : ' · 再次通关 +' + XY.C.DNG_GAIN), BROWN]);
      rows0.push(['行程', '约 6 分钟' + (di && di.best ? ' · 最快 ' + XY.fmtTime(di.best) : ''), SOFT]);
      go = { label: '进入副本', sub: '1级重练 · ' + current.name, act: 'dungeonGo', ex: { id: current.id }, off: !current.unl };
    } else {
      subtitle = '与牛魔王正面对决';
      rows0.push(['玩法', '自动普攻；点闪避或按空格躲重击\n选择 1 位搭档，随机援军每局 1 次', INK]);
      if (tight) {
        rows0.push(['奖励', '胜利必得 1 张特殊角色卡', BROWN]);
        rows0.push(['首通', '灵石 +300', BROWN]);
        rows0.push(['再次', '灵石 +60～100', BROWN]);
      } else rows0.push(['奖励', '胜利必得 1 张特殊角色卡\n灵石：首通 +300，再次 +60～100', BROWN]);
      rows0.push(['解锁', current.hint, current.unl ? SOFT : RED]);
      go = { label: '挑战牛魔王', sub: '独立 Boss 战', act: 'menuBoss', ex: null, off: !current.unl };
    }
    if (!current.unl && current.k !== 'boss') rows0.unshift(['解锁', current.hint, RED]);
    var SW = XY.sweep09;
    if (current.cleared && current.k !== 'boss' && SW) {
      var stars = SW.stars(current.k, current.id);
      rows0.push(['星级', '★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars) + (stars >= 3 ? ' · 可扫荡' : ' · 三星解锁扫荡'), '#397c49']);
      if (stars >= 3) go.sw = { kind: current.k, id: current.id, off: !SW.left() };
    }
    // Compact screens keep the complete objective and lock text; flavour and
    // progress are secondary, not a reason to shrink all text to ten pixels.
    if (tight) rows0 = rows0.filter(function (r0) { return r0[0] !== '进度' && r0[0] !== '行程'; });
    if (compactCards) rows0 = rows0.filter(function (r0) { return r0[0] !== '路线'; });
    if (noticeInBriefing) rows0.unshift(['提示', menuNotice.text, menuNotice.bad ? RED : '#397c49']);
    // Balance only a paragraph's one-CJK final line; retain its text and line count.
    function balanceCJKLastLine(c, lines, width, from) {
      var i = lines.length - 1, prev = lines[i - 1], tail;
      if (i < (from || 0) + 1 || !/^[\u3400-\u9fff\uf900-\ufaff]$/.test(lines[i])) return lines;
      tail = prev.slice(-1) + lines[i];
      if (prev.length > 2 && /[\u3400-\u9fff\uf900-\ufaff]{2}$/.test(prev) && c.measureText(tail).width <= width) {
        lines[i - 1] = prev.slice(0, -1); lines[i] = tail;
      }
      return lines;
    }
    function measureRows(str, width, cap) {
      c.font = R.font(bodySz, false); var n = 1, word = '';
      String(str).split('').forEach(function (ch0) { if (ch0 === '\n') { n++; word = ''; } else if (c.measureText(word + ch0).width > width) { n++; word = ch0; } else word += ch0; });
      return Math.min(n, cap);
    }
    function rowCap(r0) { return r0[0] === '提示' || current.k === 'dungeon' || current.k === 'boss' ? 100 : tight ? 2 : 3; }
    var diffKey = XY.diff && current.unl ? XY.diff.keyOf(current.k, current.id) : null, pickH = 0, pickInline = false;      // 五档难度选档条：标题右边放得下就放标题行，放不下才单占一行
    if (diffKey) {
      c.save(); c.font = R.font(titleSz, true); var titleW0 = c.measureText(title).width; c.restore();
      pickInline = bodyW - titleW0 - 14 >= 5 * 40 + 4 * 4; if (!pickInline) pickH = XY.diff.PICK_H + rowGap;
      rows0.unshift(['难度', XY.diff.tier(XY.diff.selected(diffKey)).name + '档 · ' + XY.diff.rewardText(XY.diff.selected(diffKey), diffKey), BROWN]);
    }
    var naturalH = pad * 2 + titleSz * 1.2 + 12 + pickH + (tight ? 0 : measureRows(subtitle, bodyW, 2) * lineH + rowGap);
    rows0.forEach(function (r0) { naturalH += measureRows(r0[1], bodyW - labelW, rowCap(r0)) * lineH + rowGap; });
    var briefingPages = null, briefingPage = 0, briefingNavY = 0;
    // Dungeon reset rules must be readable before entry, including on short
    // screens. Keep each rule together; split only a rule larger than one page.
    if ((current.k === 'dungeon' || current.k === 'boss' || desktopPortrait || noticeInBriefing) && naturalH > dh) {
      var headH = pad + titleSz * 1.2 + 12 + pickH + (tight ? 0 : measureRows(subtitle, bodyW, 2) * lineH + rowGap);
      var room = dh - headH - pad - 44, linesPerPage = Math.max(1, Math.floor(room / (lineH + rowGap)));
      var completeLines = [], groups = [];
      c.font = R.font(bodySz, false);
      rows0.forEach(function (r0) {
        var lines = [], line = '', paragraphStart = 0;
        String(r0[1]).split('').forEach(function (ch0) {
          if (ch0 === '\n') { lines.push(line); balanceCJKLastLine(c, lines, bodyW - labelW, paragraphStart); paragraphStart = lines.length; line = ''; }
          else if (line && c.measureText(line + ch0).width > bodyW - labelW) { lines.push(line); line = ch0; }
          else line += ch0;
        });
        if (line) lines.push(line);
        balanceCJKLastLine(c, lines, bodyW - labelW, paragraphStart);
        var group = lines.map(function (line0, n) { return [n ? '' : r0[0], line0, r0[2], r0[0]]; });
        groups.push(group); completeLines = completeLines.concat(group);
      });
      briefingPages = []; var pageLines = [];
      groups.forEach(function (group) {
        if (pageLines.length && pageLines.length + group.length > linesPerPage) { briefingPages.push(pageLines); pageLines = []; }
        group.forEach(function (line0) {
          if (pageLines.length >= linesPerPage) { briefingPages.push(pageLines); pageLines = []; }
          if (!pageLines.length && !line0[0]) line0[0] = line0[3];
          pageLines.push(line0);
        });
      });
      if (pageLines.length) briefingPages.push(pageLines);
      var briefingKey = current.k + ':' + current.id + ':' + current.unl + ':' + cw + ':' + ch + ':' + completeLines.map(function (r0) { return r0[1]; }).join('|');
      if (DP.briefingKey !== briefingKey) { DP.briefingKey = briefingKey; DP.briefingPage = 0; }
      briefingPage = Math.max(0, Math.min(briefingPages.length - 1, DP.briefingPage || 0));
      DP.briefingPage = briefingPage;
      rows0 = briefingPages[briefingPage];
      briefingNavY = dy + dh - pad - 44;
    }
    dh = Math.min(dh, naturalH);
    paper(dx, dy, dw, dh, false);
    geo.detail = { x: dx, y: dy, w: dw, h: dh };
    text(title, dx + pad, yy, titleSz, INK, pickInline ? bodyW - (5 * 40 + 4 * 4) - 14 : bodyW);
    if (diffKey && pickInline) { var pkW = Math.min(5 * 56 + 4 * 6, bodyW - titleW0 - 14), pkX = dx + dw - pad - pkW; XY.diff.drawPicker(c, st, diffKey, pkX, yy - XY.diff.PICK_H / 2, pkW); geo.btns.push({ act: 'diffSel', x: pkX, y: yy - XY.diff.PICK_H / 2, w: pkW, h: XY.diff.PICK_H }); }
    yy += titleSz * 0.7 + 12;
    if (!tight) { yy += VU.wrap(c, subtitle, dx + pad, yy, bodyW, lineH, bodySz, RED, false, 2) + rowGap; }
    taper(c, dx + pad, yy - 4, dx + dw - pad, 1.5, 0.25);
    if (diffKey && !pickInline) { text('选档', dx + pad, yy + XY.diff.PICK_H / 2, bodySz, INK, labelW - 6, true); XY.diff.drawPicker(c, st, diffKey, dx + pad + labelW, yy, bodyW - labelW); geo.btns.push({ act: 'diffSel', x: dx + pad + labelW, y: yy, w: bodyW - labelW, h: XY.diff.PICK_H }); yy += pickH; }
    var usedRows = [];
    rows0.forEach(function (r0) {
      var tx = dx + pad + labelW, avail = bodyW - labelW, cap = rowCap(r0);
      text(r0[0], dx + pad, yy + bodySz * 0.5, bodySz, r0[2], labelW - 6, true);
      var used = VU.wrap(c, r0[1], tx, yy + bodySz * 0.5, avail, lineH, bodySz, r0[2], false, cap);
      usedRows.push({ label: r0[0], text: r0[1], x: tx, y: yy, w: avail, h: used });
      yy += used + rowGap;
    });
    if (briefingPages) {
      var navW = Math.min(72, (bodyW - 52) / 2), navRight = dx + dw - pad - navW;
      if (briefingPage > 0) button(dx + pad, briefingNavY, navW, 44, '上一页', 'dpBriefPrev', { sz: 14 });
      else text('上一页', dx + pad + 5, briefingNavY + 22, 14, '#a39681', navW - 10, false);
      if (briefingPage + 1 < briefingPages.length) button(navRight, briefingNavY, navW, 44, '下一页', 'dpBriefNext', { sz: 14 });
      else text('下一页', navRight + 5, briefingNavY + 22, 14, '#a39681', navW - 10, false);
      kt(c, (briefingPage + 1) + ' / ' + briefingPages.length, dx + dw / 2, briefingNavY + 22, 13, SOFT, 'center', 48, false);
    }
    if (noticeInBriefing) geo.feedback = { owner: 'briefing-row', text: menuNotice.text, bad: menuNotice.bad, rows: usedRows.filter(function (r0) { return r0.label === '提示'; }), page: briefingPage, pages: briefingPages ? briefingPages.length : 1, fontSize: bodySz };
    geo.briefing = { title: title, subtitle: subtitle, rows: usedRows, bottom: yy, panelBottom: dy + dh, fontSize: bodySz, page: briefingPage, pages: briefingPages ? briefingPages.length : 1, navigationY: briefingPages ? briefingNavY : null };
    DP.detFit = { fz: bodySz, fit: yy <= dy + dh + 1, drawn: rows0.length, n: rows0.length };
    // Fixed action rail: overlay-owned activity labels use these same boxes.
    var railH = land ? 74 : 138;
    var carry = S.carryId(), carryDef = carry && (XY.SP_BY[carry] || (XY.xchar && XY.xchar.get(carry)));
    var carryName = carryDef && carryDef.name || '不带常驻';
    var rosterTop = desktopPortrait ? desktopRosterY : Math.max(listBottom, dy + dh) + 16, rosterBottom = ch - railH - 10;
    var rosterRoom = rosterBottom - rosterTop, inlineRoster = rosterRoom >= 110;
    if (inlineRoster) {
      var rosterH = Math.min(128, rosterRoom), ry = rosterBottom - rosterH, rw = cw - mg * 2;
      var publicTiles = tiles(a, true).filter(function (t) { return t.id && t.id !== '_xc'; });
      var rosterCols = Math.max(2, Math.min(publicTiles.length, Math.floor(rw / 108)));
      var rosterPages = Math.ceil(publicTiles.length / rosterCols), pageRoom = rosterPages > 1 ? 88 : 0;
      if (rosterPages > 1) rosterCols = Math.max(2, Math.floor((rw - pageRoom) / 76));
      rosterPages = Math.ceil(publicTiles.length / rosterCols);
      if (DP.rosterCarry !== carry || DP.rosterCols !== rosterCols) {
        DP.rosterPage = Math.max(0, Math.floor(publicTiles.findIndex(function (t) { return t.id === carry; }) / rosterCols));
        DP.rosterCarry = carry; DP.rosterCols = rosterCols;
      }
      DP.rosterPage = Math.max(0, Math.min(rosterPages - 1, DP.rosterPage || 0));
      var visibleTiles = publicTiles.slice(DP.rosterPage * rosterCols, (DP.rosterPage + 1) * rosterCols);
      paper(mg, ry, rw, rosterH, false);
      text('同行搭档 · 灰色未解锁', mg + 14, ry + 17, 15, BROWN, rw - 100);
      var gridX = mg + 10 + pageRoom / 2, gridW = rw - 20 - pageRoom, slotW = gridW / rosterCols;
      var faceD = Math.min(56, rosterH - 70, slotW - 12), faceY = ry + 30;
      var avatarRows = [];
      visibleTiles.forEach(function (t, k) {
        var def = t.rec || XY.SP_BY[t.id], owned = t.xc ? (!S.xcharOpen || S.xcharOpen()) : S.spOwned(t.id);
        var x = gridX + k * slotW, cx = x + slotW / 2, on = carry === t.id;
        if (on) { c.save(); c.fillStyle = 'rgba(184,50,42,0.08)'; R.rrect(c, x + 2, faceY - 5, slotW - 4, rosterH - 31, 6); c.fill(); c.restore(); }
        var have = t.xc ? null : S.spCards(t.id), need = t.xc ? null : XY.SP_LV_AT[0];
        var drawn = XY.xAvIcon && XY.xAvIcon.draw(c, t.id, cx - faceD / 2, faceY, faceD, faceD, { locked: !owned });
        if (!drawn) { c.save(); c.fillStyle = '#e4dac5'; c.beginPath(); c.arc(cx, faceY + faceD / 2, faceD / 2, 0, PI2); c.fill(); c.restore(); kt(c, (def.name || '?').charAt(0), cx, faceY + faceD / 2, 20, SOFT, 'center'); }
        if (on) { c.save(); c.strokeStyle = RED; c.lineWidth = 2.5; c.beginPath(); c.arc(cx, faceY + faceD / 2, faceD / 2 + 2, 0, PI2); c.stroke(); c.restore(); }
        kt(c, def.name, cx, faceY + faceD + 12, 14, on ? RED : INK, 'center', slotW - 8);
        kt(c, on ? '同行中' : owned ? '可同行' : t.xc ? '未开放' : '未解锁 ' + have + '/' + need, cx, faceY + faceD + 29, 11, on ? RED : SOFT, 'center', slotW - 8, false);
        var act = !owned ? (t.xc ? 'xcharLocked' : 'dpCarryInspect') : 'carryPick';
        st.hit(x + 2, faceY - 5, slotW - 4, rosterH - 31, act, { id: t.id });
        avatarRows.push({ id: t.id, owned: owned, cards: have, required: need, grayscale: !owned, act: act, face: { x: cx - faceD / 2, y: faceY, w: faceD, h: faceD }, selected: on, drawn: !!drawn, x: x + 2, y: faceY - 5, w: slotW - 4, h: rosterH - 31 });
      });
      if (rosterPages > 1) {
        button(mg + 2, ry + 36, 44, 48, '‹', 'dpRosterPrev', { sz: 28 });
        button(mg + rw - 46, ry + 36, 44, 48, '›', 'dpRosterNext', { sz: 28 });
        text((DP.rosterPage + 1) + ' / ' + rosterPages, mg + rw - 62, ry + 17, 13, SOFT, 54, false);
      }
      geo.avatarRoster = { x: mg, y: ry, w: rw, h: rosterH, page: DP.rosterPage, pages: rosterPages, total: publicTiles.length, visibleIds: visibleTiles.map(function (t) { return t.id; }), avatars: avatarRows, inline: true };
      // Use the same uncropped full-body illustration as the repaired card intro.
      var artTop = desktopPortrait ? listY : Math.max(listBottom, dy + dh) + 18, artH = ry - artTop - (desktopPortrait ? 16 : 20);
      if (land && artH >= 220 && carryDef && XY.SP_BY[carry]) {
        var artX = desktopPortrait ? desktopArtX : dx + Math.min(72, dw * 0.1), artW = desktopPortrait ? 320 : dw - Math.min(144, dw * 0.2);
        if (XY.xchar && XY.xchar.isX && XY.xchar.isX(carry)) {
          // Custom identities have generated portraits, never battle-hd/x_*.webp.
          var customArt = XY.bgArt && XY.bgArt(carry);
          if (customArt) {
            var cb = XY.gacha10.portraitBounds(customArt), ct = XY.gacha10.portraitBox(cb.w, cb.h, artX, artTop, artW, artH);
            c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
            c.drawImage(customArt, cb.x, cb.y, cb.w, cb.h, ct.x, ct.y, ct.dw, ct.dh); c.restore();
            geo.departPortrait = { id: carry, custom: true, source: cb, target: ct, region: { x: artX, y: artTop, w: artW, h: artH } };
          } else {
            var artState = XY.xchar.artStatus ? XY.xchar.artStatus(carry) : { text: '形象准备中…' };
            text(artState.state === 'error' ? '自建形象准备失败' : '自建形象准备中…', artX, artTop + 30, 18, BROWN, artW, true);
            text('角色和原图片已保留', artX, artTop + 60, 16, SOFT, artW, false);
            button(artX, artTop + 82, Math.min(180, artW), 44, '查看自建形象', 'xchar', { sz: 16 });
            geo.departPortraitPending = { id: carry, state: artState.state || 'pending', region: { x: artX, y: artTop, w: artW, h: artH } };
          }
        } else geo.departPortrait = XY.gacha10.drawPortrait(c, carry, artX, artTop, artW, artH);
        if (desktopPortrait) {
          var summaryX = mg + 18, summaryW = desktopArtX - 20 - summaryX;
          var summaryY = Math.min(ry - 110, Math.max(listBottom, dy + dh) + 18);
          text('同行 · ' + carryName, summaryX, summaryY + 24, 28, INK, 350);
          text('Lv' + S.spLevel(carry) + ' · ' + (carryDef.handle || ''), summaryX + 370, summaryY + 24, 16, BROWN, summaryW - 370, false);
          VU.wrap(c, carryDef.role, summaryX, summaryY + 54, summaryW, 23, 17, SOFT, false);
          VU.wrap(c, '必杀 · ' + carryDef.ult, summaryX, summaryY + 82, summaryW, 23, 17, BROWN, false);
          geo.partnerSummary = { id: carry, x: summaryX, y: summaryY, w: summaryW, h: 100, role: carryDef.role, ult: carryDef.ult };
        } else {
          var infoY = artTop + Math.max(24, (artH - 190) / 2);
          text('同行 · ' + carryName, mg + 18, infoY, 28, INK, listW - 36);
          text('Lv' + S.spLevel(carry) + ' · ' + (carryDef.handle || ''), mg + 18, infoY + 34, 16, BROWN, listW - 36, false);
          var nextY = infoY + 64;
          nextY += VU.wrap(c, carryDef.role, mg + 18, nextY, listW - 36, 23, 17, SOFT, false, 2);
          VU.wrap(c, '必杀 · ' + carryDef.ult, mg + 18, nextY + 12, listW - 36, 23, 17, BROWN, false, 2);
        }
      }
    }
    c.save(); c.fillStyle = 'rgba(249,243,229,0.98)'; c.fillRect(0, ch - railH, cw, railH); c.restore();
    taper(c, mg, ch - railH, cw - mg, 2, 0.3);
    var partnerW = land ? (narrowLand ? (cw < 520 ? 100 : Math.min(220, cw * 0.24)) : listW) : cw - mg * 2;
    var railW = land && narrowLand ? Math.min(cw - mg * 2, partnerW + 12 + 156 + 380) : cw - mg * 2;
    var railX = land && narrowLand ? (cw - railW) / 2 : mg;
    var partnerY = land ? footerY + 3 : ch - 128;
    var upperSweep = !land && go.sw && cw - mg * 2 - 140 < 196;
    var carryButtonW = partnerW - (upperSweep ? 74 : 0);
    paper(railX, partnerY, carryButtonW, 48, false);
    var thumbD = 36, thumbX = railX + 6, thumbY = partnerY + 6;
    var thumbDrawn = carry && XY.xAvIcon && XY.xAvIcon.draw(c, carry, thumbX, thumbY, thumbD, thumbD);
    if (!thumbDrawn) kt(c, '伴', thumbX + 18, thumbY + 18, 22, SOFT, 'center');
    text(narrowLand && cw < 520 ? '搭档' : carryName, railX + 48, partnerY + 16, 14, INK, carryButtonW - 54);
    text('换搭档 ›', railX + 48, partnerY + 34, 12, BROWN, carryButtonW - 54, false);
    st.hit(railX, partnerY, carryButtonW, 48, 'dpCarryOpen');
    geo.btns.push({ act: 'dpCarryOpen', x: railX, y: partnerY, w: carryButtonW, h: 48 });
    geo.carryThumb = { id: carry, drawn: !!thumbDrawn, x: thumbX, y: thumbY, w: thumbD, h: thumbD };
    if (upperSweep) sweepBtn(c, st, button, railX + partnerW - 66, partnerY, 66, 48, go);
    var actionX = land ? (narrowLand ? railX + partnerW + 12 : dx) : mg, eventW = land ? 70 : 62, gap = 8;
    geo.event = { x: actionX, y: footerY + 3, w: eventW, h: 48 };
    geo.gear = { x: actionX + eventW + gap, y: footerY + 3, w: eventW, h: 48 };
    var goX = actionX + 2 * (eventW + gap), goW = railX + railW - goX;
    if (go.sw && !upperSweep && goW >= (narrowLand && cw < 520 ? 140 : 196)) { var swW = 66; sweepBtn(c, st, button, goX, footerY, swW, 54, go); goX += swW + gap; goW -= swW + gap; }
    if (go.off) { go.label = '未解锁'; go.sub = '先完成解锁条件'; }
    goBtn(c, st, a, goX, footerY, goW, 54, go);
    geo.go = { act: go.act, x: goX, y: footerY, w: goW, h: 54, locked: !!go.off };
    geo.jt = '取经之旅 · 第 ' + a.levelId + ' 关：' + XY.journey.status(a.levelId).text;
    if (DP.carryOpen) {
      // Discard underlying targets; a backdrop closes the sheet, never starts a level.
      XY.ui.hits.length = 0;
      c.save(); c.fillStyle = 'rgba(44,35,24,0.43)'; c.fillRect(-offsetX, 0, fullW, ch); c.restore();
      st.hit(-offsetX, 0, fullW, ch, 'dpCarryClose');
      var portraitId = DP.carryFocus, portraitDef = portraitId && XY.SP_BY[portraitId];
      if (DP.carryView === 'portrait' && portraitDef && !(XY.xchar && XY.xchar.isX && XY.xchar.isX(portraitId))) {
        // Inspecting a portrait does not select it. Reuse the existing sheet so
        // Escape/backdrop close and the original carry/unlock handlers still apply.
        var pw = Math.min(cw - 24, 780), ph = ch - 24, px = (cw - pw) / 2, py = 12;
        opaqueSheet(px, py, pw, ph); st.hit(px, py, pw, ph, 'dpCarryHold');
        text(portraitDef.name, px + 18, py + 29, 28, INK, pw - 110);
        button(px + pw - 76, py + 7, 64, 44, '关闭', 'dpCarryClose', { sz: 16 });
        var pBodyW = pw - 36, pLineH = 23;
        var pInfo = ['Lv' + S.spLevel(portraitId) + ' · ' + (portraitDef.handle || ''), '定位：' + portraitDef.role, '必杀：' + portraitDef.ult];
        if (!S.spOwned(portraitId)) pInfo.push('未解锁 · 角色卡 ' + S.spCards(portraitId) + '/' + XY.SP_LV_AT[0]);
        var pArt, pTextX = px + 18, pTextW = pBodyW, pTextY, pLines, pInfoBox;
        if (land && short) {
          // Keep the complete figure at a fixed useful height on 480x320 too.
          // The adjacent record pages contain every original line; text never
          // shrinks and even a long notice cannot borrow the illustration area.
          var sideArtW = Math.floor(pBodyW * 0.42), sideTextW = pBodyW - sideArtW - 18;
          pArt = { x: px + 18, y: py + 62, w: sideArtW, h: ph - 134 };
          pTextX = pArt.x + sideArtW + 18; pTextW = sideTextW;
          var recordY = py + 62, recordH = ph - 134, recordBodyH = recordH - 52, recordPages = [], recordRows = [], recordUsed = 0;
          function recordBlock(value, size, color, key) {
            var lineH0 = size === 14 ? 20 : pLineH;
            literalLines(value, pTextW, size).forEach(function (line) {
              if (recordRows.length && recordUsed + lineH0 > recordBodyH) { recordPages.push(recordRows); recordRows = []; recordUsed = 0; }
              recordRows.push({ text: line, size: size, color: color, kind: key, h: lineH0 }); recordUsed += lineH0;
            });
          }
          if (menuNotice) recordBlock(menuNotice.text, 14, menuNotice.bad ? RED : '#397c49', 'notice');
          pInfo.forEach(function (line, i) { recordBlock(line, 17, i === 2 ? BROWN : INK, 'info-' + i); });
          if (recordRows.length) recordPages.push(recordRows);
          var recordKey = portraitId + ':' + cw + ':' + ch + ':' + pInfo.join('|') + ':' + (menuNotice ? menuNotice.text : '');
          if (DP.portraitRecordKey !== recordKey) { DP.portraitRecordKey = recordKey; DP.portraitRecordPage = 0; }
          var recordPage = Math.max(0, Math.min(recordPages.length - 1, DP.portraitRecordPage || 0)); DP.portraitRecordPage = recordPage;
          var recordAt = recordY, recordDrawn = [];
          recordPages[recordPage].forEach(function (row) {
            literalWrap(row.text, pTextX, recordAt + row.h / 2, pTextW, row.h, row.size, row.color);
            recordDrawn.push({ text: row.text, kind: row.kind, x: pTextX, y: recordAt, w: pTextW, h: row.h, fontSize: row.size }); recordAt += row.h;
          });
          var recordNavY = recordY + recordH - 44, recordNavW = 56;
          if (recordPage > 0) button(pTextX, recordNavY, recordNavW, 44, '前页', 'dpPortraitInfoPrev', { sz: 16 });
          else text('前页', pTextX + 10, recordNavY + 22, 16, SOFT, recordNavW - 12, false);
          if (recordPage + 1 < recordPages.length) button(pTextX + pTextW - recordNavW, recordNavY, recordNavW, 44, '后页', 'dpPortraitInfoNext', { sz: 16 });
          else text('后页', pTextX + pTextW - recordNavW + 10, recordNavY + 22, 16, SOFT, recordNavW - 12, false);
          kt(c, '档案 ' + (recordPage + 1) + '/' + recordPages.length, pTextX + pTextW / 2, recordNavY + 22, 14, BROWN, 'center', pTextW - 2 * recordNavW, false);
          geo.portraitRecord = { x: pTextX, y: recordY, w: pTextW, h: recordH, bodyH: recordBodyH, page: recordPage, pages: recordPages.length, rows: recordDrawn, navigationY: recordNavY };
          pInfoBox = { x: pTextX, y: recordY, w: pTextW, h: recordBodyH };
          if (menuNotice) geo.feedback = { owner: 'portrait-record', text: menuNotice.text, bad: menuNotice.bad, fontSize: 14, page: recordPage, pages: recordPages.length, rows: recordDrawn.filter(function (row) { return row.kind === 'notice'; }) };
        } else {
          var pNoticeH = menuNotice ? literalLines(menuNotice.text, pBodyW - 12, 14).length * 20 + 8 : 0;
          pLines = pInfo.reduce(function (n, line) { return n + literalLines(line, pBodyW, 17).length; }, 0);
          pTextY = py + ph - 72 - pLines * pLineH;
          pArt = { x: px + 18, y: py + 62 + pNoticeH, w: pBodyW, h: pTextY - (py + 62 + pNoticeH) - 18 };
          if (menuNotice) feedback(px + 18, py + 60, pBodyW, 'portrait-status');
          var pY = pTextY;
          pInfo.forEach(function (line, i) {
            // Handles are identifiers. R.txt/VU.wrap would add commas or drop 0601's zero.
            if (i === 0) pY += literalWrap(line, pTextX, pY, pTextW, pLineH, 17, INK);
            else pY += VU.wrap(c, line, pTextX, pY, pTextW, pLineH, 17, i === 2 ? BROWN : INK, false);
          });
          pInfoBox = { x: pTextX, y: pTextY - 11, w: pTextW, h: pLines * pLineH };
        }
        geo.carryPortrait = XY.gacha10.drawPortrait(c, portraitId, pArt.x, pArt.y, pArt.w, pArt.h);
        button(px + 18, py + ph - 56, 76, 44, '上一位', 'dpPortraitPrev', { sz: 16 });
        button(px + 102, py + ph - 56, pw - 204, 44, '返回选择', 'dpCarryGrid', { pri: true, col: RED, sz: 17 });
        button(px + pw - 94, py + ph - 56, 76, 44, '下一位', 'dpPortraitNext', { sz: 16 });
        geo.carry = { x: px, y: py, w: pw, h: ph, view: 'portrait', id: portraitId };
        geo.partnerSummary = { id: portraitId, x: pInfoBox.x, y: pInfoBox.y, w: pInfoBox.w, h: pInfoBox.h, role: portraitDef.role, ult: portraitDef.ult };
      } else {
      var tl = tiles(a, true), cols = land ? 4 : 2, smallSheet = ch < 650, gapC = smallSheet ? 6 : 8, mw = Math.min(cw - 24, land ? 780 : 440);
      var cellH = smallSheet ? 48 : 62, rowsC = Math.ceil(tl.length / cols), gridTop = 142;
      var mh = gridTop + 14 + rowsC * (cellH + gapC) - gapC, mx = (cw - mw) / 2, my = Math.max(8, (ch - mh) / 2);
      opaqueSheet(mx, my, mw, mh); st.hit(mx, my, mw, mh, 'dpCarryHold');
      text('选择同行搭档', mx + 18, my + 27, 23, INK, mw - 192);
      button(mx + mw - 68, my + 7, 58, 44, '完成', 'dpCarryClose', { pri: true, col: RED, sz: 16 });
      var cellW = (mw - 32) / cols;
      var carryOut = carryStrip(c, st, a, tl, mx + 16, my + gridTop, mw - 32, cols, cellW, cellH, cellH, gapC);
      var focused = carryOut.hover || DP.carryFocus, focusDef = focused && XY.SP_BY[focused], summaryW = mw - 36, sy = my + 62;
      if (focusDef && !(XY.xchar && XY.xchar.isX && XY.xchar.isX(focused))) button(mx + mw - 164, my + 7, 90, 44, '查看立绘', 'dpCarryPortrait', { sz: 16, ex: { id: focused } });
      if (menuNotice) {
        feedback(mx + 18, sy - 6, summaryW, 'companion-summary');
      } else if (focusDef) {
        var owned = S.spOwned(focused), lv = S.spLevel(focused);
        text(focusDef.name + (owned ? ' · Lv' + lv : ' · 未解锁 ' + S.spCards(focused) + '/' + XY.SP_LV_AT[0] + ' 张'), mx + 18, sy, 16, owned ? INK : SOFT, summaryW);
        var infoY = sy + 23;
        infoY += VU.wrap(c, '定位：' + focusDef.role, mx + 18, infoY, summaryW, 18, 14, INK, false, 2);
        VU.wrap(c, '必杀：' + focusDef.ult, mx + 18, infoY + 3, summaryW, 18, 14, BROWN, false, 1);
        geo.partnerSummary = { id: focused, name: focusDef.name, level: lv, owned: owned, cards: S.spCards(focused), required: XY.SP_LV_AT[0], role: focusDef.role, ult: focusDef.ult, x: mx + 18, y: sy - 10, w: summaryW, h: 80 };
      } else {
        VU.wrap(c, '点选头像，查看定位、等级和必杀', mx + 18, sy, summaryW, 20, 14, INK, false, 2);
        VU.wrap(c, '每关可带一位；集齐 ' + XY.SP_LV_AT[0] + ' 张角色卡解锁', mx + 18, sy + 28, summaryW, 20, 14, SOFT, false, 2);
      }
      geo.tiles = tl.length; geo.carry = { x: mx, y: my, w: mw, h: mh, cols: cols };
      }
    }
    if (!(XY.account && XY.account.holdGacha && XY.account.holdGacha()) && XY.gacha10 && XY.gacha10.paint) XY.gacha10.paint(c, st, a);
    if (XY.account && XY.account.paintModal) XY.account.paintModal(c, st, a);
    if (offsetX > 0) {
      [geo.cards, geo.btns, geo.avatarRoster && geo.avatarRoster.avatars, [geo.go, geo.more, geo.event, geo.gear, geo.detail, geo.carry, geo.partnerSummary, geo.carryThumb, geo.avatarRoster, geo.feedback, geo.opaqueSheet, geo.portraitRecord], XY.departCards, XY.departTexts].forEach(function (list) {
        (list || []).forEach(function (box) { if (box && typeof box.x === 'number') box.x += offsetX; });
      });
    }
    st.end();
  };
  var oldDraw = XY.screens.draw;
  XY.screens.draw = function (c, G, a) {
    var rs = a.retStack;      // 出发 / 洞府阁 的“返回栈”里留着刚才没真的跳走的条目（比如点了锁着的入口）→ 清掉
    if ((a.screen === 'levels' || a.screen === 'hub') && rs && rs.length && rs[rs.length - 1] === a.screen) rs.pop();
    if (a.screen === 'levels') {
      if (DP.prev !== 'levels') { DP.kind = 'level'; DP.id = a.levelId; DP.carryOpen = false; DP.briefingPage = 0; DP.briefingKey = null; }
      DP.prev = 'levels'; DP.draw(c, G, a);
      if (a.confirm) oldDraw(c, G, { screen: '__none', confirm: a.confirm, lw: a.lw, lh: a.lh, zoom: a.zoom, dpr: a.dpr, mouse: a.mouse, rt: a.rt });
    } else { DP.prev = a.screen; oldDraw(c, G, a); }
  };

  var oldAct = HUB.act;
  HUB.act = function (h, p, a) {
    if (NAV[h.act] && (a.screen === 'levels' || a.screen === 'hub')) (a.retStack || (a.retStack = [])).push(a.screen);
    if (h.act === 'dpCarryInspect') { DP.carryFocus = h.id; DP.carryView = 'grid'; DP.carryOpen = true; return true; }
    if (h.act === 'dpCarryOpen') { DP.carryOpen = true; DP.carryView = 'grid'; DP.carryFocus = S.carryId(); return true; }
    if (h.act === 'dpCarryClose') { DP.carryOpen = false; DP.carryView = 'grid'; return true; }
    if (h.act === 'dpCarryPortrait') { if (XY.SP_BY[h.id]) { DP.carryFocus = h.id; DP.carryView = 'portrait'; } return true; }
    if (h.act === 'dpCarryGrid') { DP.carryView = 'grid'; return true; }
    if (h.act === 'dpPortraitPrev' || h.act === 'dpPortraitNext') {
      var portraitIds = XY.SPECIALS.filter(function (d) { return !(XY.isHidden && XY.isHidden(d.id)); }).map(function (d) { return d.id; });
      var portraitIndex = portraitIds.indexOf(DP.carryFocus);
      if (portraitIds.length) DP.carryFocus = portraitIds[(Math.max(0, portraitIndex) + portraitIds.length + (h.act === 'dpPortraitNext' ? 1 : -1)) % portraitIds.length];
      return true;
    }
    if (h.act === 'dpPortraitInfoPrev' || h.act === 'dpPortraitInfoNext') {
      if (DP.carryOpen && DP.carryView === 'portrait' && DP.geo.portraitRecord) {
        var recordCount = DP.geo.portraitRecord.pages;
        DP.portraitRecordPage = Math.max(0, Math.min(recordCount - 1, (DP.portraitRecordPage || 0) + (h.act === 'dpPortraitInfoPrev' ? -1 : 1)));
      }
      return true;
    }
    if (h.act === 'dpCarryHold') return true;
    if (h.act === 'dpBriefPrev' || h.act === 'dpBriefNext') { var briefPages = DP.geo.briefing && DP.geo.briefing.pages || 1; DP.briefingPage = Math.max(0, Math.min(briefPages - 1, (DP.briefingPage || 0) + (h.act === 'dpBriefPrev' ? -1 : 1))); return true; }
    if (h.act === 'dpRosterPrev' || h.act === 'dpRosterNext') { var pages = DP.geo.avatarRoster && DP.geo.avatarRoster.pages || 1; DP.rosterPage = ((DP.rosterPage || 0) + pages + (h.act === 'dpRosterPrev' ? -1 : 1)) % pages; return true; }
    if (h.act === 'carryPick' && DP.carryOpen) DP.carryFocus = h.id;
    if (h.act === 'levelSel') { DP.kind = 'level'; DP.id = h.n; }
    if (h.act === 'dpSel') {
      var it = DP.items().filter(function (q) { return q.k === h.kind && q.id === h.id; })[0];
      if (it) { DP.kind = it.k; DP.id = it.id; DP.briefingPage = 0; if (!it.unl) say(a, it.hint, true); }
      return true;
    }
    return oldAct(h, p, a);
  };
})();
