/* ============================================================
 * spsup.js —— 12 位常驻角色各自的 3 个“辅助技能”（真实生效，v0.4）
 *
 * 每个角色的 3 个辅助技能 = 技能树里 s1 / s2 / s3 三个节点（每个 3 级，一人最多学 3 个辅助）。
 * 名字和效果文字取自 specials.js 里的 def.sup；这里是它们的“实现”：
 *   cd[3]      每一级的冷却（0 = 被动，没有冷却条）
 *   cond(G,h,lv)  主动技能的自动释放条件（和别的辅助技能一样自动放）
 *   fire(G,h,lv)  主动技能的效果
 *   被动技能走 XY.spsupTick / Global / Pre / Hurt / Kill / Revive / Miss / Speed 这些钩子（game.js / abilities.js 里调用）
 * 效果强度随等级：F(lv) = 1 + 0.35 × (lv − 1)
 * 状态字段（只给本文件和少数钩子用）：
 *   敌人  e.vulnUntil/vulnM/vulnType（易伤）, e.anaUntil/anaM（已分析）, e.goldMark
 *   英雄  h.absorb（护盾吸收量）, h.xdm（伤害倍率）, h.coffeeUntil, h.lureUntil, h.giftUntil/giftKind, h.gmUntil, h.wardUntil, h.vet
 *   天兵  a.absorb, a.giftUntil/giftKind, a.hasteUntil, a.decoy
 *   G.spz（持续区域）, G.spq（延迟动作队列）, G.xCoinP / G.xDrop（金币 / 法宝掉落倍率）
 * ============================================================ */
(function () {
  var XY = window.XY, C = XY.C;
  var rand = XY.rand, dist = XY.dist, cos = Math.cos, sin = Math.sin, atan2 = Math.atan2, PI2 = Math.PI * 2;
  function K() { return XY.core; }
  function F(lv) { return 1 + 0.35 * (lv - 1); }
  function near(G, x, y, r, f) { var l = []; G.grid.query(x, y, r, function (e) { if (!e.dead && (!f || f(e))) l.push(e); }); return l; }
  function cnt(G, x, y, r) { var n = 0; G.grid.query(x, y, r, function (e) { if (!e.dead) n++; }); return n; }
  function liveAllies(G) { return G.allies.filter(function (a) { return !a.dead && !a.decoy; }); }
  function friends(G) { return G.heroes.filter(function (o, i) { return i > 0 && !o.down; }); }
  function sd(G, h, base) { return K().heroDmg(G, h, base * (h.def.statMul || 1)); }
  function ring(G, x, y, r, col, t, fill) { K().ring(G, x, y, r, col, t || 0.4, fill !== false); }
  function absorb(G, t, v) { t.absorb = Math.min((t.absorb || 0) + v, (t.maxHp || 100) * 0.9); ring(G, t.x, t.y, 26, '#8fd0ff', 0.4); if (XY.vfx && t.def) XY.vfx.shield(G, t); }
  function hurt(G, h, e, d, o) { o = o || {}; o.src = h; o.dot = true; if (!o.type) o.type = 'magic'; K().hurtEnemy(G, e, d, o); }
  function addZone(G, z) { (G.spz = G.spz || []).push(z); return z; }
  function later(G, t, fn) { (G.spq = G.spq || []).push({ t: t, fn: fn }); }
  function lowest(list) { var b = null; list.forEach(function (o) { if (!b || o.hp / o.maxHp < b.hp / b.maxHp) b = o; }); return b; }
  function nearestEnemy(G, h, r) { return G.grid.nearest(h.x, h.y, r); }
  function coin(G, x, y, v) { if (v > 0) G.coinDrops.push({ x: x + rand(-8, 8), y: y + rand(-8, 8), v: Math.max(1, Math.round(v)), mag: null }); }
  function anyHurt(G, h, r) { return friends(G).concat(liveAllies(G)).some(function (o) { return o.hp < o.maxHp * 0.9 && dist(o.x, o.y, h.x, h.y) < r; }) || h.hp < h.maxHp * 0.9; }
  function lv(h, id) { return XY.skLv(h, id); }
  function owner(G, pid, sid) { for (var i = 0; i < G.heroes.length; i++) { var h = G.heroes[i]; if (!h.down && h.id === pid && lv(h, sid) > 0) return h; } return null; }

  var CD = function (a, b, c) { return [a, b, c]; };
  var P0 = [0, 0, 0];
  /* ---------------- 12 个人的 36 个辅助技能 ---------------- */
  var D = {
    phyrex: [
      { short: '简', cd: CD(10, 9, 8), cond: function (G, h) { return cnt(G, h.x, h.y, 380) >= 2; }, fire: function (G, h, l) {
        ring(G, h.x, h.y, 380, '#e5c24a', 0.5);
        near(G, h.x, h.y, 380).forEach(function (e) { e.vulnUntil = G.t + 6; e.vulnM = 0.15 * F(l); e.vulnType = 'magic'; }); } },
      { short: '机', cd: CD(14, 12, 10), cond: function (G, h) { return cnt(G, h.x, h.y, 360) >= 1; }, fire: function (G, h, l) {
        var f = F(l); ring(G, h.x, h.y, 240, '#7fd0ee', 0.5);
        addZone(G, { kind: 'rig', x: h.x, y: h.y, r: 240, t: 8, max: 8, every: 0.5, color: '#e5c24a', fn: function (G2, z) {
          var e = G2.grid.nearest(z.x, z.y, z.r);
          if (e) { G2.fx.push({ type: 'coinDrop', x: e.x, y: e.y, t: 0, max: 0.35, ingot: true }); hurt(G2, h, e, sd(G2, h, 16 * f), { elem: 'metal' }); }
          G2.allies.forEach(function (a) { if (!a.dead && dist(a.x, a.y, z.x, z.y) < z.r) a.hasteUntil = G2.t + 1.5; });
        } }); } },
      { short: '冷', cd: CD(18, 16, 14), cond: function (G, h) { return cnt(G, h.x, h.y, 450) >= 3; }, fire: function (G, h, l) {
        var pool = near(G, h.x, h.y, 450, function (e) { return !e.def.boss && !e.def.elite && !e.def.etower && !e.shrunk; });
        for (var i = 0; i < l && pool.length; i++) {
          var e = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
          e.shrunk = true; e.r *= 0.6; e.hp *= 0.5; e.maxHp *= 0.5; e.dmg *= 0.7; ring(G, e.x, e.y, 30, '#e5c24a', 0.4);
          K().text(G, e.x, e.y - 20, '换算成小号', 'big');
        } } }
    ],
    sisi: [
      { short: '盾', cd: CD(12, 11, 10), cond: function (G, h) { return cnt(G, h.x, h.y, 420) >= 1; }, fire: function (G, h, l) {
        var f = F(l); ring(G, h.x, h.y, 320, '#8fe08f', 0.5);
        friends(G).concat(h.id === 'sisi' ? [] : []).forEach(function (o) { if (dist(o.x, o.y, h.x, h.y) < 320) { o.stunT = 0; o.slowT = 0; o.wardUntil = G.t + 4 * f; absorb(G, o, o.maxHp * 0.06 * f); } });
        liveAllies(G).forEach(function (a) { if (dist(a.x, a.y, h.x, h.y) < 320) { a.wardUntil = G.t + 4 * f; absorb(G, a, a.maxHp * 0.25 * f); } }); } },
      { short: '运', cd: CD(15, 13, 11), cond: function (G, h) { return cnt(G, h.x, h.y, 500) >= 1 && (liveAllies(G).length + friends(G).length) > 0; }, fire: function (G, h, l) {
        var f = F(l), al = liveAllies(G), t = al.length ? al[Math.floor(Math.random() * al.length)] : friends(G)[0];
        if (!t) return;
        var kind = ['atk', 'spd', 'rng'][Math.floor(Math.random() * 3)];
        t.giftUntil = G.t + 8 * f; t.giftKind = kind; ring(G, t.x, t.y, 36, '#ffd24a', 0.5);
        K().text(G, t.x, t.y - 28, '幸运礼物·' + { atk: '攻击', spd: '攻速', rng: '射程' }[kind], 'big'); } },
      { short: '角', cd: CD(5, 4.5, 4), cond: function (G, h) { return !!nearestEnemy(G, h, 450); }, fire: function (G, h, l) {
        var e = nearestEnemy(G, h, 450); if (!e) return;
        G.fx.push({ type: 'chain', pts: [{ x: h.x, y: h.y - 8 }, { x: e.x, y: e.y }], t: 0, max: 0.3, color: '#5fb85a' });
        hurt(G, h, e, sd(G, h, 26 * F(l)), { elem: 'wood', kb: 60, fx: h.x, fy: h.y, stun: 0.2 }); } }
    ],
    haiteng: [
      { short: '圈', cd: CD(16, 14, 12), cond: function (G, h) { return cnt(G, h.x, h.y, 420) >= 3; }, fire: function (G, h, l) {
        var f = F(l); ring(G, h.x, h.y, 400, '#e0852b', 0.5, false);
        addZone(G, { kind: 'shrink', x: h.x, y: h.y, r: 380, r0: 380, r1: 130, t: 6, max: 6, every: 0.4, color: '#e0852b', fn: function (G2, z) {
          z.r = z.r1 + (z.r0 - z.r1) * Math.max(0, z.t / z.max);
          near(G2, z.x, z.y, 460).forEach(function (e) { if (dist(e.x, e.y, z.x, z.y) > z.r) hurt(G2, h, e, sd(G2, h, 11 * f), { elem: 'earth' }); });
        } }); } },
      { short: '活', cd: P0, passive: true },
      { short: '线', cd: CD(9, 8, 7), cond: function (G, h) { return friends(G).concat(liveAllies(G)).length > 0 && cnt(G, h.x, h.y, 600) >= 1; }, fire: function (G, h, l) {
        var t = lowest(friends(G).concat(liveAllies(G)).filter(function (o) { return dist(o.x, o.y, h.x, h.y) < 700; })); if (t) absorb(G, t, t.maxHp * 0.22 * F(l)); } }
    ],
    heyuxi: [
      { short: '咖', cd: CD(14, 13, 12), cond: function (G, h) { return cnt(G, h.x, h.y, 500) >= 1; }, fire: function (G, h, l) { h.coffeeUntil = G.t + 6 * F(l); ring(G, h.x, h.y, 40, '#b07a4a', 0.5); K().text(G, h.x, h.y - 30, '咖啡续航', 'big'); } },
      { short: '钓', cd: CD(12, 11, 10), cond: function (G, h) { return cnt(G, h.x, h.y, 700) >= 3; }, fire: function (G, h) {
        var far = near(G, h.x, h.y, 650, function (e) { return !e.def.boss && !e.def.etower; }).sort(function (a, b) { return dist(b.x, b.y, h.x, h.y) - dist(a.x, a.y, h.x, h.y); })[0];
        if (!far) return; var d = dist(far.x, far.y, h.x, h.y) || 1;
        G.fx.push({ type: 'chain', pts: [{ x: h.x, y: h.y - 8 }, { x: far.x, y: far.y }], t: 0, max: 0.35, color: '#6fb6d8' });
        far.x = h.x + (far.x - h.x) / d * 110; far.y = h.y + (far.y - h.y) / d * 110; far.stunT = Math.max(far.stunT, 0.6); } },
      { short: '歌', cd: CD(18, 16, 14), cond: function (G, h) { return cnt(G, h.x, h.y, 650) >= 3; }, fire: function (G, h, l) {
        var n = 5 + 2 * (l - 1), f = F(l), pool = near(G, h.x, h.y, 650);
        for (var i = 0; i < n && pool.length; i++) {
          (function (i) {
            var e = pool[Math.floor(Math.random() * pool.length)], x = e.x + rand(-30, 30), y = e.y + rand(-30, 30);
            later(G, 0.15 * i, function (G2) { ring(G2, x, y, 75, '#e8a0d8', 0.35); K().text(G2, x, y - 16, '♪', 'big'); G2.grid.query(x, y, 75, function (t) { hurt(G2, h, t, sd(G2, h, 28 * f), { elem: 'water' }); }); });
          })(i);
        } } }
    ],
    yuanzhang: [
      { short: '魂', cd: CD(11, 10, 9), cond: function (G, h) { return liveAllies(G).length > 0 || friends(G).some(function (o) { return o.hp < o.maxHp * 0.6; }); }, fire: function (G, h, l) {
        var al = liveAllies(G).sort(function (a, b) { return dist(a.x, a.y, h.x, h.y) - dist(b.x, b.y, h.x, h.y); })[0];
        if (al) { al.hp = al.maxHp; al.life += 3; al.giftUntil = G.t + 4 * F(l); al.giftKind = 'frenzy'; ring(G, al.x, al.y, 34, '#ffd24a', 0.5); K().text(G, al.x, al.y - 26, '附魂！', 'big'); }
        else { var t = lowest(friends(G)); if (t) { K().healHero(G, t, t.maxHp * 0.25 * F(l), true); t.giftUntil = G.t + 4; t.giftKind = 'atk'; } } } },
      { short: '灯', cd: P0, passive: true },
      { short: '令', cd: CD(15, 14, 12), cond: function (G, h) { return cnt(G, h.x, h.y, 350) >= 3; }, fire: function (G, h, l) {
        var f = F(l), a0 = h.face || 0; ring(G, h.x + cos(a0) * 140, h.y + sin(a0) * 140, 170, '#f0c040', 0.5);
        near(G, h.x, h.y, 330).forEach(function (e) {
          var a = atan2(e.y - h.y, e.x - h.x), dd = Math.abs(((a - a0 + Math.PI * 3) % PI2) - Math.PI);
          if (dd > 0.6) return;
          e.slowT = Math.max(e.slowT, 3); e.slowF = Math.max(e.slowF, Math.min(0.7, 0.4 * f) * (e.def.boss ? 0.5 : 1)); e.vulnUntil = G.t + 4; e.vulnM = 0.12 * f; e.vulnType = null;
        }); } }
    ],
    diaoyulao: [
      { short: '运', cd: P0, passive: true },
      { short: '饭', cd: CD(14, 12, 10), cond: function (G, h) { return anyHurt(G, h, 330) || cnt(G, h.x, h.y, 400) >= 2; }, fire: function (G, h, l) {
        var f = F(l); ring(G, h.x, h.y, 320, '#e0a050', 0.5);
        friends(G).concat([h]).forEach(function (o, i, a) { if (a.indexOf(o) !== i) return; if (dist(o.x, o.y, h.x, h.y) < 320) { K().healHero(G, o, o.maxHp * 0.14 * f, true); o.boostT = 3; } });
        liveAllies(G).forEach(function (a) { if (dist(a.x, a.y, h.x, h.y) < 320) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.3 * f); }); } },
      { short: '机', cd: CD(25, 22, 19), cond: function (G, h) { return h.hp < h.maxHp * 0.4; }, fire: function (G, h, l) { absorb(G, h, h.maxHp * 0.25 * F(l)); h.traitCd = 0; K().text(G, h.x, h.y - 30, '有危就有机', 'big'); } }
    ],
    cato: [
      { short: '框', cd: CD(11, 10, 9), cond: function (G, h) { return cnt(G, h.x, h.y, 380) >= 2; }, fire: function (G, h, l) {
        ring(G, h.x, h.y, 380, '#7fd0ee', 0.5);
        near(G, h.x, h.y, 380).forEach(function (e) { e.anaN = Math.min(3, (G.t < (e.anaUntil || 0) ? e.anaN : 0) + 1); e.anaUntil = G.t + 8; e.anaM = 0.10 * F(l) * e.anaN; }); } },
      { short: '水', cd: CD(15, 13, 11), cond: function (G, h) { return cnt(G, h.x, h.y, 450) >= 2; }, fire: function (G, h, l) {
        var e = nearestEnemy(G, h, 450) || h, f = F(l);
        addZone(G, { kind: 'water', x: e.x, y: e.y, r: 150, t: 6, max: 6, every: 0.4, color: '#4aa8c8', fn: function (G2, z) {
          near(G2, z.x, z.y, z.r).forEach(function (t) { t.slowT = Math.max(t.slowT, 0.6); t.slowF = Math.max(t.slowF, t.def.boss ? 0.25 : 0.4); hurt(G2, h, t, sd(G2, h, 8 * f), { elem: 'water' }); });
        } }); } },
      { short: '耕', cd: P0, passive: true }
    ],
    laosiji: [
      { short: '译', cd: CD(11, 10, 9), cond: function (G, h) { return cnt(G, h.x, h.y, 400) >= 2; }, fire: function (G, h, l) {
        ring(G, h.x, h.y, 380, '#f08a3c', 0.5);
        near(G, h.x, h.y, 380).forEach(function (e) { e.vulnUntil = G.t + 6; e.vulnM = 0.12 * F(l); e.vulnType = null; e.markT = Math.max(e.markT || 0, 0.01); }); } },
      { short: '车', cd: CD(10, 9, 8), cond: function (G, h) { return cnt(G, h.x, h.y, 500) >= 2 && !h.dash; }, fire: function (G, h, l) {
        var t = nearestEnemy(G, h, 500), a = t ? atan2(t.y - h.y, t.x - h.x) : (h.face || 0), f = F(l), dx = cos(a), dy = sin(a), x0 = h.x, y0 = h.y;
        h.face = a; h.dash = { t: 0.3, dx: dx, dy: dy, speed: 480 / 0.3, id: G.nextId++, dmg: 40 * f * (h.mod.ultPow || 1), kb: 120, stun: 0, col: '#f08a3c' };
        h.inv = Math.max(h.inv, 0.4);
        for (var i = 1; i <= 5; i++) (function (i) { later(G, 0.05 * i, function (G2) {
          addZone(G2, { kind: 'fire', x: x0 + dx * 96 * i, y: y0 + dy * 96 * i, r: 55, t: 3, max: 3, every: 0.5, color: '#f08a3c', fn: function (G3, z) { near(G3, z.x, z.y, z.r).forEach(function (e) { hurt(G3, h, e, sd(G3, h, 8 * f), { elem: 'fire' }); }); } });
        }); })(i); } },
      { short: '图', cd: CD(16, 14, 12), cond: function (G, h) { return cnt(G, h.x, h.y, 300) >= 3; }, fire: function (G, h, l) {
        var f = F(l), life = 3 + 0.5 * (l - 1);
        G.allies.push({ x: h.x + 30, y: h.y, hp: 260 * f, maxHp: 260 * f, life: life, maxLife: life, atkT: 9, mode: 'station', anchor: { x: h.x + 30, y: h.y }, slot: 0, def: { r: 14 }, dmgM: 0, down: false, dead: false, hurtT: 0, born: 0.4, decoy: true });
        ring(G, h.x, h.y, 50, '#f08a3c', 0.5); K().text(G, h.x, h.y - 30, '截图分身', 'big'); } }
    ],
    kuanggong: [
      { short: '嘲', cd: CD(14, 12, 10), cond: function (G, h) { return cnt(G, h.x, h.y, 300) >= 3; }, fire: function (G, h, l) {
        h.lureUntil = G.t + 3 + 0.5 * (l - 1); ring(G, h.x, h.y, 300, '#c9a36b', 0.5); K().text(G, h.x, h.y - 30, '人菜话多！', 'big'); } },
      { short: '投', cd: P0, passive: true },
      { short: '空', cd: P0, passive: true }
    ],
    martin: [
      { short: '水', cd: CD(13, 12, 11), cond: function (G, h) { return G.coins >= 10 && cnt(G, h.x, h.y, 500) >= 1 && (friends(G).length + liveAllies(G).length) > 0; }, fire: function (G, h, l) {
        var t = lowest(friends(G).concat(liveAllies(G)).filter(function (o) { return dist(o.x, o.y, h.x, h.y) < 600; })); if (!t) return;
        G.coins -= 10; absorb(G, t, t.maxHp * 0.4 * F(l)); K().text(G, t.x, t.y - 28, '买大水', 'big'); } },
      { short: '早', cd: P0, passive: true },
      { short: '兵', cd: P0, passive: true }
    ],
    qinba: [
      { short: '跑', cd: P0, passive: true },
      { short: '坑', cd: P0, passive: true },
      { short: '资', cd: CD(10, 9, 8), cond: function (G, h) { return cnt(G, h.x, h.y, 600) >= 1; }, fire: function (G, h, l) {
        var s = F(l); ring(G, h.x, h.y, 300, '#6fb6d8', 0.5);
        friends(G).concat([h]).forEach(function (o, i, a) { if (a.indexOf(o) !== i) return; o.ultCd = Math.max(0, o.ultCd - s); o.traitCd = Math.max(0, o.traitCd - s); for (var k in o.scd) if (o.scd[k] > 0) o.scd[k] = Math.max(0.01, o.scd[k] - s); }); } }
    ],
    traders18: [
      { short: '盹', cd: CD(14, 12, 10), cond: function (G, h) { return (h.stillT || 0) >= 2 && (h.hp < h.maxHp || cnt(G, h.x, h.y, 300) >= 2); }, fire: function (G, h, l) {
        var f = F(l); K().healHero(G, h, h.maxHp * 0.12 * f, true); ring(G, h.x, h.y, 300, '#b69be0', 0.6); K().text(G, h.x, h.y - 30, 'Zzz…', 'big');
        near(G, h.x, h.y, 300).forEach(function (e) { e.slowT = Math.max(e.slowT, 4); e.slowF = Math.max(e.slowF, Math.min(0.6, 0.35 * f) * (e.def.boss ? 0.5 : 1)); e.atkT += 1.0; }); } },
      { short: '符', cd: CD(18, 16, 14), passive: false, reactive: true },
      { short: '坑', cd: CD(15, 13, 11), cond: function (G, h) { return cnt(G, h.x, h.y, 450) >= 2; }, fire: function (G, h, l) {
        var e = nearestEnemy(G, h, 450); if (!e) return; var f = F(l);
        addZone(G, { kind: 'pit', x: e.x, y: e.y, r: 90, t: 4, max: 4, every: 0.2, color: '#d9a21a', fn: function (G2, z) {
          near(G2, z.x, z.y, z.r).forEach(function (t) { if (t.pitDone) return; t.pitDone = true; t.goldMark = f; if (!t.def.boss) t.stunT = Math.max(t.stunT, 1.5); else { t.slowT = Math.max(t.slowT, 1.5); t.slowF = Math.max(t.slowF, 0.5); } });
        } }); } }
    ]
  };
  XY.SPSUP = D;
  // 供 skills.js 取名字 / 图标 / 冷却：XY.spsupDef(personId, 's1')
  XY.spsupDef = function (pid, sid) {
    var k = +sid.charAt(1) - 1, d = D[pid] && D[pid][k], sp = XY.SP_BY && XY.SP_BY[pid] || null;
    if (!d) return null;
    var def = sp || (XY.SPECIALS.filter(function (s) { return s.id === pid; })[0]);
    var j = def && def.sup && def.sup[k];
    return { name: j ? j.name : '辅助技能', short: d.short, icon: def ? def.color : '#999', cd: d.cd, passive: !!d.passive, effect: j ? j.effect : '' };
  };

  /* ---------------- 钩子 ---------------- */
  // 主动技能：释放条件 / 效果（abilities.js 的 updateAbilities 调用）
  XY.spsupCond = function (G, h, sid) { var d = D[h.id] && D[h.id][+sid.charAt(1) - 1]; return d && d.cond ? d.cond(G, h, lv(h, sid)) : false; };
  XY.spsupFire = function (G, h, sid, l) { var d = D[h.id] && D[h.id][+sid.charAt(1) - 1]; if (d && d.fire) d.fire(G, h, l); };

  // 每帧（全局）：持续区域 / 延迟队列 / 全队金币倍率
  XY.spsupGlobal = function (G, dt) {
    var Z = G.spz, i, w = 0;
    if (Z) {
      for (i = 0; i < Z.length; i++) {
        var z = Z[i]; z.t -= dt; z.acc = (z.acc || 0) - dt;
        if (z.acc <= 0) { z.acc = z.every || 0.5; z.fn(G, z); }
        if (z.t > 0) Z[w++] = z;
      }
      Z.length = w;
    }
    var Q = G.spq;
    if (Q && Q.length) {
      var keep = [];
      for (i = 0; i < Q.length; i++) { Q[i].t -= dt; if (Q[i].t <= 0) Q[i].fn(G); else keep.push(Q[i]); }
      G.spq = keep;
    }
    if (XY.ultscene) XY.ultscene.tick(G, dt);
    var cp = 1, dp = 1, hh;
    for (i = 1; i < G.heroes.length; i++) {
      hh = G.heroes[i]; if (hh.down) continue;
      if (hh.id === 'kuanggong' && lv(hh, 's3') > 0) { cp += 0.10 * F(lv(hh, 's3')); dp += 0.10 * F(lv(hh, 's3')); }
    }
    G.xCoinP = cp; G.xDrop = dp;
  };

  // 每帧（每个活着的英雄）：被动技能的计时 / 状态
  XY.spsupTick = function (G, h, dt) {
    if (!h.def || !h.def.special) return;
    var id = h.id, l;
    // 记录站定 / 移动
    var px = h._px === undefined ? h.x : h._px, py = h._py === undefined ? h.y : h._py;
    var mv = dist(px, py, h.x, h.y) > 0.4; h._px = h.x; h._py = h.y;
    if (mv) { h.stillT = 0; h.runT = (h.runT || 0) + dt; } else { h.stillT = (h.stillT || 0) + dt; if (h.stillT > 2) { h.runT = 0; } }
    var xdm = 1, add = 0;
    if (id === 'qinba' && (l = lv(h, 's1')) > 0) { h.runStk = Math.min(5 + Math.floor(h.mod.u_run || 0), Math.floor(h.runT || 0)); add += h.runStk * 0.03 * F(l); } else h.runStk = 0;
    if (id === 'cato' && (l = lv(h, 's3')) > 0) { h.farmT = (h.farmT || 0) + dt; if (h.farmT >= 10) { h.farmT -= 10; h.farm = Math.min([0.15, 0.22, 0.30][l - 1], (h.farm || 0) + 0.03); K().text(G, h.x, h.y - 30, '耕耘 +' + Math.round(h.farm * 100) + '%', 'big'); } add += h.farm || 0; }
    if (id === 'diaoyulao' && (l = lv(h, 's1')) > 0) h.luckP = 0.08 * F(l); else h.luckP = 0;
    if (h.giftUntil > G.t && h.giftKind === 'atk') add += 0.4;
    if (h.giftUntil > G.t && h.giftKind === 'frenzy') add += 0.5;
    h.xdm = (1 + add) * (h.pitBoost ? 1 + 0.2 * F(lv(h, 's2') || 1) : 1);
    if (id === 'kuanggong' && (l = lv(h, 's2')) > 0) {
      h.dcaT = (h.dcaT || 0) + dt;
      if (h.dcaT >= 30) { h.dcaT -= 30; var tier = Math.min(5, Math.floor(G.t / 90)), n = Math.round((6 + 3 * (l - 1)) * (1 + tier)); G.coins += n; K().text(G, h.x, h.y - 34, '定投 +' + n + ' 金币', 'big'); ring(G, h.x, h.y, 40, '#d9a21a', 0.5); }
    }
    if (id === 'yuanzhang' && (l = lv(h, 's2')) > 0) { h.lootT = (h.lootT || 0) + dt; if (h.lootT >= 12) { h.lootT = 12; G.spLoot = l; } }
    if (id === 'martin' && (l = lv(h, 's2')) > 0) {
      h.gmT = (h.gmT || 0) + dt;
      if (h.gmT >= [75, 65, 55][l - 1]) { h.gmT = 0; G.heroes.forEach(function (o, i) { if (i > 0 && !o.down) o.gmUntil = G.t + 8; }); h.gmUntil = G.t + 8; K().banner(G, 'GM 早安！全队移速 +10%、减伤 10%（8 秒）', 2.5); }
    }
  };
  XY.spsupSpeed = function (G, h) {
    var m = 1;
    if (h.coffeeUntil > G.t) m *= 1.3;
    if (h.runStk) m *= 1 + 0.04 * h.runStk * F(lv(h, 's1') || 1);
    if (h.gmUntil > G.t) m *= 1.1;
    if (h.giftUntil > G.t && h.giftKind === 'rng') m *= 1.15;
    return m;
  };
  XY.spsupAtkSpd = function (G, h) {
    var m = 1;
    if (h.coffeeUntil > G.t) m *= 1.15;
    if (h.giftUntil > G.t && (h.giftKind === 'spd' || h.giftKind === 'frenzy')) m *= 1.4;
    return m;
  };
  // 英雄伤害倍率 + 好运（一命二运三风水）
  XY.spsupDmg = function (G, h, d) {
    if (h.xdm && h.xdm !== 1) d *= h.xdm;
    if (h.luckP > 0 && Math.random() < h.luckP) { d *= 2; G._crit = true; if (Math.random() < 0.3) { G.coins += 2; } K().text(G, h.x, h.y - 30, '好运！', 'big'); }
    return d;
  };
  // 受伤前：护身符 / 减伤；返回修改后的伤害（0 = 完全挡掉）
  XY.spsupPre = function (G, h, dmg) {
    var l;
    if (h.id === 'traders18' && (l = lv(h, 's2')) > 0 && !(h.scd && h.scd.s2 > 0) && dmg > h.maxHp * 0.10) {
      h.scd.s2 = D.traders18[1].cd[l - 1];
      ring(G, h.x, h.y, 220, '#ffd24a', 0.6); K().text(G, h.x, h.y - 34, '护身符！', 'big'); G.shake = Math.max(G.shake, 4);
      near(G, h.x, h.y, 220).forEach(function (e) { var d = dist(e.x, e.y, h.x, h.y) || 1, s = 420 * (1 - (e.def.knockRes || 0)); e.kx += (e.x - h.x) / d * s; e.ky += (e.y - h.y) / d * s; });
      return 0;
    }
    if (h.wardUntil > G.t) dmg *= 0.85;
    if (h.gmUntil > G.t) dmg *= 0.9;
    if (h.id === 'martin' && (l = lv(h, 's3')) > 0 && h.vet) dmg *= 1 - h.vet * 0.03 * F(l) * (1 + 0.5 * (h.mod.u_vet || 0));
    return dmg;
  };
  XY.spsupHurt = function (G, h) {
    var l;
    if (h.id === 'martin' && (l = lv(h, 's3')) > 0) { h.vet = Math.min(8 + Math.floor(h.mod.u_vet || 0) * 2, (h.vet || 0) + 1); }
  };
  // 复活机制（腾EO）：每关次数 = 等级；半血 + 短暂无敌
  XY.spsupRevive = function (G, h) {
    if (h.id === 'tang') return false;
    var o = owner(G, 'haiteng', 's2'); if (!o) return false;
    var l = lv(o, 's2'); G.spRevived = G.spRevived || 0;
    if (G.spRevived >= 1 + Math.floor(o.mod.u_rev || 0)) return false;                    // 每关一次（等级只提高复活后的血量：50 / 60 / 70%）
    G.spRevived++;
    h.hp = h.maxHp * [0.5, 0.6, 0.7][l - 1]; h.inv = Math.max(h.inv, 2); h.hurtT = 0.4;
    ring(G, h.x, h.y, 90, '#ffd24a', 0.7); K().banner(G, h.def.name + ' 被「复活机制」拉了回来（每关一次，已用掉）', 3);
    return true;
  };
  // 掉坑爬坑（秦巴）：预测箭没打中任何敌人
  XY.spsupMiss = function (G, h) {
    var l = lv(h, 's2'); if (h.id !== 'qinba' || l <= 0 || h.down) return;
    if (G.t - (h.pitAt === undefined ? -99 : h.pitAt) < 8) return;
    h.pitAt = G.t; h.atkT = 0; h.pitBoost = true; K().text(G, h.x, h.y - 30, '爬出坑·返还冷却', 'big');
  };
  XY.spsupAfterAtk = function (G, h) { if (h.pitBoost) h.pitBoost = false; };
  // 击杀：撸毛 / 黄金坑
  XY.spsupKill = function (G, e) {
    if (e.goldMark) coin(G, e.x, e.y, 3 * e.goldMark);
    if (G.spLoot > 0) { var o = owner(G, 'yuanzhang', 's2'); coin(G, e.x, e.y, 4 * F(G.spLoot)); G.spLoot = 0; if (o) o.lootT = 0; }
  };
  // 受击目标：嘲讽（人菜话多）
  XY.spsupLure = function (G, e) {
    for (var j = 1; j < G.heroes.length; j++) { var h = G.heroes[j]; if (!h.down && h.lureUntil > G.t && dist(h.x, h.y, e.x, e.y) < 420) return h; }
    for (j = 0; j < G.allies.length; j++) { var a = G.allies[j]; if (!a.dead && a.decoy && dist(a.x, a.y, e.x, e.y) < 420) return a; }
    return null;
  };
  // 天兵的增益（幸运抽奖 / 发工资 / 本地部署）
  XY.allyBuff = function (G, a) {
    var gk = a.giftUntil > G.t ? a.giftKind : null, haste = a.hasteUntil > G.t;
    return { dm: (gk === 'atk' || gk === 'frenzy') ? 1.5 : 1, hs: (haste || gk === 'spd' || gk === 'frenzy') ? 1.4 : 1, vis: gk === 'rng' ? 120 : 0 };
  };
  // 绘制持续区域（世界坐标）
  XY.drawSpZones = function (c, G, rt) {
    var Z = G.spz; if (!Z) return;
    for (var i = 0; i < Z.length; i++) {
      var z = Z[i], a = Math.min(1, z.t / 1.2), r = z.kind === 'shrink' ? z.r : z.r;
      c.save();
      c.globalAlpha = 0.16 * a + (z.kind === 'shrink' ? 0 : 0.04 * Math.sin(rt * 5 + i));
      if (z.kind !== 'shrink') { c.fillStyle = z.color; c.beginPath(); c.arc(z.x, z.y, r, 0, PI2); c.fill(); }
      c.globalAlpha = 0.6 * a; c.strokeStyle = z.color; c.lineWidth = z.kind === 'shrink' ? 4 : 2; c.setLineDash(z.kind === 'shrink' ? [14, 8] : [6, 6]);
      c.beginPath(); c.arc(z.x, z.y, r, 0, PI2); c.stroke();
      c.restore();
    }
  };
})();
