/* ============================================================
 * phyrex.js —— v0.6 批次 3：Phyrex 专属（只有他有）
 *   攻击只用 BTC：① 燃烧的 BTC 币（飞出去穿透 + 灼烧）② BTC 环绕（身边转的币）③ 大招：巨型 BTC 光印清屏
 *   满级 99 才能「变身」（生命 / 伤害 ×10，限时 + 冷却）——HUD 按钮、键盘 T、触屏都能点
 *   隐藏能力「30 秒自动收集」：只有 Phyrex 在场、并且玩家正在亲自操控他，累计满 30 秒就把全图的经验和金币吸过来
 * 规则细节（取舍写在 CHANGELOG）：
 *   - 变身：持续 45 秒、冷却 90 秒（从变身开始算）；生命、伤害 ×10，移速 ×1.3；结束后血量按比例缩回
 *   - 收集计时：只在“Phyrex 在场、没倒下、是当前操控角色”时走；换人 / 自动命令时【暂停】（不清零）；触发后清零重来
 * ============================================================ */
(function () {
  var XY = window.XY, C = XY.C, PI2 = Math.PI * 2, cos = Math.cos, sin = Math.sin, atan2 = Math.atan2, dist = XY.dist;
  function K() { return XY.core; }
  function U(h, k) { return (h && h.mod && h.mod[k]) || 0; }
  function sdmg(G, h, base) { return K().heroDmg(G, h, base * (h.def.statMul || 1)); }
  function ph(G) { var h = G.heroes[5]; return h && h.id === 'phyrex' ? h : null; }
  XY.phyrexOf = ph;

  /* ---------- ① 燃烧的 BTC 币 ---------- */
  function near(G, x, y, r) { var l = []; G.grid.query(x, y, r, function (e) { if (!e.dead) l.push(e); }); return l; }
  function nearestN(G, h, r, n) { var l = near(G, h.x, h.y, r); l.sort(function (a, b) { return dist(a.x, a.y, h.x, h.y) - dist(b.x, b.y, h.x, h.y); }); return l.slice(0, n); }
  function btcAtk(G, h) {
    var n = 2 + Math.floor(U(h, 'u_bots') + U(h, 'btcN')), tg = nearestN(G, h, 480, Math.min(n, 4)); if (!tg.length) return false;
    h.face = atan2(tg[0].y - h.y, tg[0].x - h.x); h.bots = n;
    var rig = 1 + U(h, 'u_rig'), pierce = 1 + Math.floor(U(h, 'btcPierce')), dm = 1 + U(h, 'btcDmg');
    for (var i = 0; i < n; i++) {
      var t = tg[i % tg.length], a = atan2(t.y - h.y, t.x - h.x) + (i >= tg.length ? (i - tg.length + 1) * 0.16 * (i % 2 ? 1 : -1) : 0);
      G.projs.push({ x: h.x, y: h.y, vx: cos(a) * 470, vy: sin(a) * 470, dmg: sdmg(G, h, 22 * dm), crit: G._crit, r: 9, life: 1.0, pierce: pierce, hits: [], kind: 'btc', src: h, dtype: 'magic', elem: 'metal', col: '#f0b429',
        onHit: function (G2, e, p) {
          if (e.dead) return;
          e.btcT = 3.5; e.btcDps = Math.max(e.btcDps || 0, 6 * rig * dm); e.btcSrc = h;       // 灼烧（金属元素，和火眼的火焰灼烧分开算）
        } });
    }
    return 0.5;
  }
  // 灼烧伤害：每 0.5 秒结算（由 game.js 敌人更新调用）
  XY.btcBurnTick = function (G, e, dt) {
    e.btcT -= dt; e.btcAcc = (e.btcAcc || 0) + dt;
    if (e.btcAcc >= 0.5) { e.btcAcc -= 0.5; K().hurtEnemy(G, e, e.btcDps * 0.5, { src: e.btcSrc || null, dot: true, type: 'magic', elem: 'metal' }); }
  };

  /* ---------- ② BTC 环绕：身边常转着几枚币，碰到的怪受伤 ---------- */
  XY.phyrexOrbit = function (G, h, dt) {
    var n = 3 + Math.floor(U(h, 'u_mark') + U(h, 'orbitN')), R = 56 + 4 * n + 6 * (h.xf > 0 ? 1 : 0);
    h.orbitN = n; h.orbitR = R; h.orbA = (h.orbA || 0) + dt * 2.6 * (1 + 0.15 * U(h, 'u_mark'));
    var dm = 1 + U(h, 'btcDmg') + 0.25 * U(h, 'u_mark');
    for (var i = 0; i < n; i++) {
      var a = h.orbA + i / n * PI2, bx = h.x + cos(a) * R, by = h.y + sin(a) * R;
      G.grid.query(bx, by, 17, function (e) {
        if (e.dead || G.t < (e.orbT || 0)) return;
        e.orbT = G.t + 0.45;
        K().hurtEnemy(G, e, sdmg(G, h, 14 * dm), { src: h, kb: 70, fx: h.x, fy: h.y, crit: G._crit, type: 'magic', elem: 'metal' });
        if (U(h, 'u_mark') > 0 && !e.dead) { e.pmark = G.t + 6; e.vulnUntil = G.t + 5; e.vulnM = Math.max(e.vulnM || 0, 0.12 * (1 + U(h, 'u_mark'))); e.vulnType = null; }   // 环绕币命中：标记易伤，标记的怪死了掉灵石
      });
    }
  };

  /* ---------- ③ 大招：巨型 BTC 光印 ---------- */
  function btcUlt(G, h) {
    var rig = 1 + U(h, 'u_rig') * 0.6;
    // v0.7.0l：光印改由 XY.ultscene（js/ultscene.js）编排，不再有旧的“光圈”特效
    XY.clearArea(G, h, { name: '比特币光印', windup: 0.45, shape: 'screen', elem: h.def.elem, bossDmg: 120 * rig, stun: 1.8, color: '#f0b429',
      onLand: function (G2, list) { list.forEach(function (e) { if (e.def.elite) { e.vulnUntil = G2.t + 6; e.vulnM = Math.max(e.vulnM || 0, 0.2); e.vulnType = null; } }); } });
  }

  // 特性「币值暴涨」：向血最多的妖怪（BOSS 优先）砸下一枚巨型 BTC
  function btcTrait(G, h) {
    var best = null, bs = -1;
    G.grid.query(h.x, h.y, 800, function (e) { if (e.dead) return; var sc = e.hp + (e.def.boss ? 1e9 : 0); if (sc > bs) { bs = sc; best = e; } });
    if (!best) return;
    G.fx.push({ type: 'coinDrop', x: best.x, y: best.y, t: 0, max: 0.5, big: true });
    K().hurtEnemy(G, best, sdmg(G, h, 160), { src: h, kb: 80, fx: best.x, fy: best.y - 40, stun: 1.5, crit: G._crit, type: 'magic', elem: 'metal' });
    K().ring(G, best.x, best.y, 70, '#f0b429', 0.5, true);
  }
  function install() {
    var oldST = XY.specialTrait;
    XY.specialTrait = function (G, h, i, a) { if (h.id === 'phyrex') return btcTrait(G, h); return oldST(G, h, i, a); };
    var S = XY.SP12; if (!S) return;
    S.atk.phyrex = function (G, h) { var r = btcAtk(G, h); if (r !== false) h.casts = (h.casts || 0) + 1; return r; };
    S.ult.phyrex = btcUlt;
  }
  install();

  /* ---------- 变身（满级 99） ---------- */
  XY.phyrexXformCd = function (h) { return Math.max(30, C.PH_XF_CD - 15 * U(h, 'tfCd')); };
  XY.phyrexXformDur = function (h) { return C.PH_XF_DUR + 8 * U(h, 'tfDur'); };
  XY.phyrexCanXform = function (G) {
    var h = ph(G); if (!h) return { ok: false, reason: '只有 Phyrex 能变身' };
    if (h.down) return { ok: false, reason: 'Phyrex 已阵亡' };
    if (h.xf > 0) return { ok: false, reason: '正在变身中' };
    var rl = XY.spHeroLv ? XY.spHeroLv(G) : G.level;      // 角色等级：全开一击满级后是 99，否则就是队伍等级
    if (rl < C.PH_XF_LEVEL) return { ok: false, reason: '队伍等级到 ' + C.PH_XF_LEVEL + ' 级才能变身（现在 ' + rl + ' 级）' };
    if (h.xfCd > 0) return { ok: false, reason: '变身冷却中（还要 ' + Math.ceil(h.xfCd) + ' 秒）' };
    return { ok: true, reason: '' };
  };
  XY.phyrexXform = function (G) {
    var r = XY.phyrexCanXform(G), h = ph(G);
    if (!r.ok) { if (h && XY.toast) XY.toast(G, r.reason); return r; }
    h.xf = h.xfMax = XY.phyrexXformDur(h); h.xfCd = XY.phyrexXformCd(h); h.xfHpFrac = h.hp / h.maxHp;
    XY.recalcAll(G); h.hp = h.maxHp; h.inv = Math.max(h.inv, 1.2);
    G.stats.xforms = (G.stats.xforms || 0) + 1;
    K().banner(G, 'Phyrex 变身！生命、伤害 ×' + C.PH_XF_MUL + '，持续 ' + Math.round(h.xf) + ' 秒', 3);
    G.fx.push({ type: 'xform', x: h.x, y: h.y, t: 0, max: 1.6, follow: h });
    for (var i = 0; i < 3; i++) K().ring(G, h.x, h.y, 90 + i * 70, '#3a3226', 0.5 + i * 0.15, true);
    G.shake = Math.max(G.shake || 0, 12); if (XY.anim) XY.anim.xform(G, h);
    return { ok: true, reason: '' };
  };
  // 手动 / 触屏 / 键盘都走这里
  XY.phyrexXformToggle = function (G) { return XY.phyrexXform(G); };
  // recalcHero 末尾调用：变身中 ×10
  XY.phyrexMods = function (G, h) {
    if (h.id !== 'phyrex' || !(h.xf > 0)) return;
    h.dmgMul *= C.PH_XF_MUL;      // 生命 ×10 已在 recalcHero 里乘过 h.speed *= 1.3;
  };

  /* ---------- 隐藏能力：30 秒自动收集（每帧由 updateHeroes 调用） ---------- */
  XY.phyrexCollectOn = function (G) { var h = ph(G); return !!h && !h.down && G.ctrl === 5; };
  XY.phyrexTick = function (G, dt) {
    var h = ph(G); if (!h) return;
    if (h.xfCd > 0) h.xfCd -= dt;
    if (!h.down) XY.phyrexOrbit(G, h, dt);
    if (h.xf > 0) {
      h.xf -= dt;
      if (h.xf <= 0) {
        h.xf = 0; var fr = h.xfHpFrac || 1; XY.recalcAll(G); if (!h.down) h.hp = Math.max(1, Math.min(h.maxHp, Math.round(h.maxHp * Math.max(fr, h.hp / (h.maxHp * C.PH_XF_MUL))))); 
        K().banner(G, 'Phyrex 变身结束', 2);
      }
    }
    if (XY.phyrexCollectOn(G)) {
      h.colT = (h.colT || 0) + dt;
      if (h.colT >= C.PH_COLLECT_T) {
        h.colT = 0; var n = XY.magnetAll(G, 0, h);
        G.stats.phCollects = (G.stats.phCollects || 0) + 1;
        if (XY.save && XY.save.data && !XY.save.data.dex['hid:phcollect']) { XY.save.data.dex['hid:phcollect'] = { seen: 1, kills: 0, first: Date.now() }; XY.save.touch(); }   // 图鉴：解开隐藏提示
        K().ring(G, h.x, h.y, 120, '#f0b429', 0.6, true); K().toast(G, 'Phyrex：亲自操控满 ' + C.PH_COLLECT_T + ' 秒，全图收集！（' + n + ' 个）');
      }
    }
  };

  /* ---------- 画：BTC 币 / 环绕 / 光印 / 变身 ---------- */
  function coin(c, x, y, r, rot) {
    var IP = XY.INKP, INK = IP ? IP.INK : '24,20,16';
    c.save(); c.translate(x, y); c.rotate(rot || 0);
    if (IP) { IP.blot(c, 0, 0, r, INK, 0.62, (r * 13) | 0, 2, 1); IP.ring(c, 0, 0, r * 0.82, Math.max(1, r * 0.1), INK, 0.82, 5, 5, 1, rot || 0); }
    c.fillStyle = 'rgba(' + INK + ',0.92)'; c.font = 'bold ' + Math.round(r * 1.15) + 'px ' + C.FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('B', 0, r * 0.04);
    c.restore();
  }
  XY.drawBtcCoin = coin;
  // 金元宝（掉落物 / 非 Phyrex 角色的金币特效用；BTC 币只属于 Phyrex）
  XY.drawIngot = function (c, x, y, sc, rot) {
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(sc || 1, sc || 1);
    c.fillStyle = '#ffd24a'; c.strokeStyle = '#b8860b'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-8, -1); c.quadraticCurveTo(0, -10, 8, -1); c.lineTo(5.5, 6); c.lineTo(-5.5, 6); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#fff1b0'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-3.5, -3); c.quadraticCurveTo(0, -6, 3.5, -3); c.stroke();
    c.restore();
  };
  XY.phDrawProj = function (c, p, rt) {
    var a = Math.atan2(p.vy, p.vx);
    if (XY.INKP) XY.INKP.stroke(c, p.x, p.y, p.x - cos(a) * 26, p.y - sin(a) * 26, p.r * 0.7, XY.INKP.INK, 0.4, 2, 0.05);
    coin(c, p.x, p.y, p.r + 2, rt * 10);
  };
  XY.phDrawHeroUnder = function (c, G, h, x, y, r, rt) {      // 变身不再另画橙色光翼，只用变身立绘本身
    return;
  };
  XY.phDrawHeroOver = function (c, G, h, x, y, r, rt) {       // 在英雄身体上面：BTC 环绕
    var n = h.orbitN || 0; if (!n || h.down) return;
    if (XY.INKP) XY.INKP.ring(c, x, y, h.orbitR, 1.4, XY.INKP.INK, 0.35, 11, 5, 1, rt * 0.2);
    for (var i = 0; i < n; i++) { var a = (h.orbA || 0) + i / n * PI2; coin(c, x + cos(a) * h.orbitR, y + sin(a) * h.orbitR, 9, rt * 8 + i); }
  };
  XY.phDrawFx = function (c, f, k, G) {
    if (f.type === 'btcSeal') {
      var s = 0.3 + k * 1.1, al = k < 0.7 ? 1 : (1 - k) / 0.3, r = 240 * s;
      c.save(); c.translate(f.x, f.y); c.globalAlpha = Math.max(0, al) * 0.85;
      if (XY.INKP) { XY.INKP.blot(c, 0, 0, r * 0.85, XY.INKP.INK, 0.2, 8, 0, 1); XY.INKP.ring(c, 0, 0, r, 3, XY.INKP.INK, 0.45, 2, 6, 1, k); }
      coin(c, 0, 0, r, k * 0.6);
      c.restore();
    } else if (f.type === 'coinDrop') {
      var rr = f.big ? 30 : 13, yy = f.y - 160 * (1 - Math.min(1, k * 1.8)); c.save(); c.globalAlpha = k > 0.6 ? Math.max(0, (1 - k) / 0.4) : 1;
      if (k > 0.5 && XY.INKP) XY.INKP.ring(c, f.x, f.y, rr * (1 + (k - 0.5) * 4), 2, XY.INKP.INK, 0.55 * (1 - k), 6, 5, 1, k);
      if (f.ingot) XY.drawIngot(c, f.x, yy, rr / 8, k * 3); else coin(c, f.x, yy, rr, k * 8);      // 只有 Phyrex 的币才是 BTC；矿机等别人的「砸币」画金元宝
      c.restore();
    } else if (f.type === 'xform') {
      var h = f.follow || { x: f.x, y: f.y }; c.save(); c.globalAlpha = Math.max(0, 1 - k);
      for (var i = 0; i < 8; i++) { var a = i / 8 * PI2 + k * 2; if (XY.INKP) XY.INKP.stroke(c, h.x + cos(a) * 30, h.y + sin(a) * 30, h.x + cos(a) * (60 + 260 * k), h.y + sin(a) * (60 + 260 * k), 2.4, XY.INKP.INK, 0.7 * (1 - k), i + 3, 0.04); }
      if (XY.INKP) XY.INKP.blot(c, h.x, h.y, 40 + 80 * k, XY.INKP.INK, 0.12 * (1 - k), 4, 0, 1);
      c.restore();
    }
  };
})();
