/* ============================================================
 * guest.js —— v0.7：「召唤特殊人物」（替换原来的「天兵降临」）
 *   · 从 9 位可见的特殊角色里随机召来 1 位：不是本局选择 / 携带的那一位；隐藏角色永远不在池里
 *   · 召来的那一刻立刻放出 TA 的清屏大招（sp12 / phyrex 里的原版大招 + 全部特效），停留 STAY 秒后离开
 *   · 冷却 CD 秒（技能树「召唤·增援」每级 −10 秒，最低 30 秒）；开局就能用
 *   · 客人不在 G.heroes 里：不参与选人 / 命令 / 受伤，只是一个挂在 G.guest.h 的临时角色
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, C = XY.C, K = function () { return XY.core; }, cos = Math.cos, sin = Math.sin;
  C.GUEST = { CD: 60, STAY: 6.5, LV: 5, CD_PER_LV: 10, CD_MIN: 30 };
  var Gs = XY.guest = {};

  Gs.state = function (G) { return G.guest || (G.guest = { cd: 0, h: null, t: 0, max: 0, uses: 0, last: null }); };
  Gs.cdMax = function (G) { return Math.max(C.GUEST.CD_MIN, C.GUEST.CD - C.GUEST.CD_PER_LV * Math.min(2, (G.upg && G.upg.p_sky) || 0)); };
  // 可以被召来的人：9 位可见角色，去掉本局选择 / 携带的那一位
  Gs.pool = function (G) {
    var cur = XY.save.carryId && XY.save.carryId(), sp = G.special;
    return XY.SPECIALS.filter(function (d) { return d.id !== cur && d.id !== sp && !XY.isHidden(d.id); }).map(function (d) { return d.id; });
  };
  function mk(G, id, x, y) {
    var def = XY.specialDef(id, C.GUEST.LV);
    var h = { i: -1, id: def.id, def: def, sp: true, guest: true, x: x, y: y, hp: def.hp, maxHp: def.hp, down: false, inv: 99, order: 'guard', sk: {}, mod: null, ultCd: 0, atkT: 9, atkMax: 1,
      face: 0, wlv: 1, dmgMul: 1, crit: 0, dr: 0, tgt: null, retreat: false, rtT: 0, atkSpd: 1, hurtT: 0, contactT: 0, orbit: 0, pend: [], dash: null, auraT: 0, regenAcc: 0,
      moving: false, auraHeal: 3, bob: 0, scd: {}, traitCd: 0, taunt: 0, boostT: 0, pulseT: 0, beadOn: 3.5, beadRest: 0, dr2: 0, spT: 0, ringT: 0, shieldT: 0 };
    XY.recalcHeroOne(G, h, true);
    return h;
  }
  var reservations = new WeakMap(), serial = 0;
  Gs.reservation = function (G) { var t = reservations.get(G); return t ? { id: t.id, state: t.state, origin: t.origin } : null; };
  function release(t) { if (XY.materialPause) XY.materialPause.release(t.G, t); }
  function current(t) { return reservations.get(t.G) === t && (!XY.materialPause || XY.materialPause.current(t.G)); }
  function identity(t) {
    var XC = XY.xchar;
    if (!t.custom) return Gs.pool(t.G).indexOf(t.id) >= 0;
    var rec = XC && XC.get(t.id), def = XY.SP_BY && XY.SP_BY[t.id];
    return rec === t.record && rec.avatar === t.avatar && def && def.id === t.kit && XC.artReady(t.id) && XY.CHIBI[t.id] === t.body && Gs.pool(t.G).indexOf(t.id) >= 0;
  }
  function cancel(t) { if (!current(t)) { release(t); return; } t.state = 'cancelled'; t.autoSuppressed = true; release(t); }
  Gs.invalidate = function (G) {
    var t = reservations.get(G); if (!t) return;
    reservations.delete(G); t.state = 'stale';
    if (XY.lazy && XY.lazy.cancelOwner) XY.lazy.cancelOwner(t); release(t);
  };
  function invalid(t) {
    t.state = 'invalid'; release(t);
    if (XY.toast) XY.toast(t.G, '预留角色资料已改变，未消耗召唤。再次点击召唤可确认取消本次预留。', 4);
    return { ok: false, id: t.id, reason: 'identity_changed' };
  }
  function commit(t) {
    if (!current(t) || t.state === 'cancelled' || t.state === 'stale') return { ok: false, reason: 'cancelled' };
    var G = t.G, s = Gs.state(G), app = XY.app;
    if (G.mode !== 'play' || G.ending || G.villain || G.lair || s.h || s.cd > 0 || app && (app.screen !== 'play' || app.tipHold || app.partyPanel || app.confirm || app.tdFormShop || app.tdChooser || app.dkOpen || app.dkGear)) { cancel(t); return { ok: false, id: t.id, reason: 'mode' }; }
    if (!identity(t)) return invalid(t);
    if (XY.lazy && XY.lazy.on && !XY.lazy.specialReady(t.id)) return { ok: false, id: t.id, reason: 'art_not_ready' };
    reservations.delete(G); t.state = 'committed'; release(t);
    return summonReady(G, t.id);
  }
  function prepare(t) {
    if (!current(t)) return { ok: false, reason: 'stale' };
    if (!identity(t)) return invalid(t);
    if (!XY.lazy || !XY.lazy.on || XY.lazy.specialReady(t.id)) { t.state = 'ready'; return commit(t); }
    if (!XY.materialPause || !XY.materialPause.acquire(t.G, t)) return { ok: false, id: t.id, reason: 'modal' };
    t.state = 'preparing';
    XY.lazy.enterSpecial(t.id, function () { if (current(t) && t.state === 'preparing') { t.state = 'ready'; commit(t); } }, t, function () { cancel(t); });
    return { ok: false, id: t.id, reason: 'preparing' };
  }
  // Choose exactly once. Loading/cancelling never consumes cooldown or rerolls it.
  Gs.summon = function (G, id, options) {
    var s = Gs.state(G), origin = options && options.origin === 'auto' ? 'auto' : 'manual';
    if (G.mode !== 'play' || G.ending) return { ok: false, reason: 'mode' };
    if (G.villain || G.lair) return { ok: false, reason: 'villain' };
    if (s.h) { XY.toast(G, '特殊人物还在场，等 TA 离开'); return { ok: false, reason: 'busy' }; }
    if (s.cd > 0) { XY.toast(G, '召唤冷却中：还要 ' + Math.ceil(s.cd) + ' 秒'); return { ok: false, reason: 'cd' }; }
    var app = XY.app;
    if (app && (app.screen !== 'play' || app.tipHold || app.partyPanel || app.confirm || app.tdFormShop || app.tdChooser || app.dkOpen || app.dkGear)) return { ok: false, reason: 'modal' };
    var ticket = reservations.get(G);
    if (ticket) {
      if (origin === 'auto' && ticket.autoSuppressed) return { ok: false, id: ticket.id, reason: 'cancelled' };
      if (ticket.state === 'invalid') {
        if (origin === 'manual') { reservations.delete(G); XY.toast(G, '已取消失效的角色预留，请再次召唤。', 3); }
        return { ok: false, id: ticket.id, reason: 'identity_changed' };
      }
      if (ticket.state === 'preparing') return { ok: false, id: ticket.id, reason: 'preparing' };
      ticket.origin = origin; return prepare(ticket);
    }
    var XC = XY.xchar;
    if (id && XC && XC.isX(id) && !XC.artReady(id)) { XY.toast(G, '自建角色形象尚未就绪，请在自建角色中准备完成。未消耗召唤。', 4); return { ok: false, id: id, reason: 'art_not_ready' }; }
    var pool = Gs.pool(G);
    if (!pool.length) { XY.toast(G, '没有已就绪的可召唤角色，未消耗召唤。', 4); return { ok: false, reason: 'none' }; }
    if (!id || pool.indexOf(id) < 0) id = pool[Math.floor(Math.random() * pool.length)];
    var custom = XC && XC.isX(id), rec = custom && XC.get(id), def = XY.SP_BY && XY.SP_BY[id];
    ticket = { serial: ++serial, G: G, id: id, origin: origin, state: 'reserved', custom: !!custom,
      record: rec, avatar: rec && rec.avatar, kit: def && def.id, body: custom && XY.CHIBI && XY.CHIBI[id] };
    reservations.set(G, ticket); return prepare(ticket);
  };
  function summonReady(G, id) {
    var s = Gs.state(G);
    if (G.mode !== 'play' || G.ending) return { ok: false, reason: 'mode' };
    if (G.villain || G.lair) return { ok: false, reason: 'villain' };       // v0.9 反派关：不召西游特殊人物
    if (s.h) { XY.toast(G, '特殊人物还在场，等 TA 离开'); return { ok: false, reason: 'busy' }; }
    if (s.cd > 0) { XY.toast(G, '召唤冷却中：还要 ' + Math.ceil(s.cd) + ' 秒'); return { ok: false, reason: 'cd' }; }
    var XC=XY.xchar,omitted=XC&&XC.guestArtCounts?XC.guestArtCounts(G):{pending:0,error:0},waiting=omitted.pending+omitted.error;
    var c = G.heroes[G.ctrl]; if (c.down) c = G.heroes[0];
    var a = XY.rand(-0.9, 0.9) + (Math.random() < 0.5 ? 0 : Math.PI);
    var x = XY.clamp(c.x + cos(a) * 96, 60, C.WORLD_W - 60), y = XY.clamp(c.y + sin(a) * 64 - 10, 60, C.WORLD_H - 60);
    var h = mk(G, id, x, y), tg = G.grid.nearest(x, y, 600); h.face = tg ? Math.atan2(tg.y - y, tg.x - x) : 0;
    s.h = h; s.t = 0; s.max = C.GUEST.STAY + 1.5 * ((XY.solMods ? XY.solMods(G).sky : 0) || 0); s.cd = Gs.cdMax(G); s.uses++; s.last = id; s.ult = h.def.ult;
    G.sky.uses++; G.stats.guests = (G.stats.guests || 0) + 1;
    if (XY.anim) XY.anim.sky(G, x, y, 0);
    if (XY.specialUlt) XY.specialUlt(G, h);
    if (XY.toast) XY.toast(G, h.def.name + ' · ' + (h.def.ult || '') + (waiting ? ' · 仅从已就绪角色中召唤（自建形象 '+omitted.pending+' 位准备中、'+omitted.error+' 位失败）' : ''), waiting?4:1.6);
    return { ok: true, id: id, h: h };
  };
  Gs.update = function (G, dt) {
    var s = G.guest; if (!s) return;
    if (s.cd > 0) s.cd = Math.max(0, s.cd - dt);
    if (!s.h) return;
    s.t += dt;
    if (s.t >= s.max) {
      K().ring(G, s.h.x, s.h.y, 60, s.h.def.color, 0.5, true); if (XY.anim) XY.anim.sky(G, s.h.x, s.h.y, 1);
      s.h = null;
    }
  };
  Gs.alpha = function (G) { var s = G.guest; if (!s || !s.h) return 1; return Math.max(0, Math.min(1, s.t / 0.25, (s.max - s.t) / 0.5)); };
  // 姓名由统一名牌绘制；剩余时间放在脚下命令标签之后，沿用文字避让。
  Gs.drawTag = function (c, G) {
    var s = G.guest; if (!s || !s.h) return; var h = s.h;
    var label = '剩余 ' + Math.max(0, Math.ceil(s.max - s.t)) + ' 秒';
    var fs = 14 / (XY._worldZoom || 1), y = h.y + (h.def.r || 18) + 48;
    c.save(); c.globalAlpha = Gs.alpha(G);
    if (XY.R4 && XY.R4.placeLabel) y = XY.R4.placeLabel(c, label, h.x, y, fs, 1);
    c.font = fs + 'px "Ma Shan Zheng","KaiTi",serif'; c.fillStyle = '#3a2a1c'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = 'rgba(255,250,240,0.9)'; c.shadowBlur = 1.5;
    c.fillText(label, h.x, y);
    c.restore();
  };
})();
