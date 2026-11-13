/* v0.8.0 怪物水墨工笔精灵（第一关）：小妖 / 弓箭妖 / 石头怪 / 盾兵 / 牛头卫 / 黑熊精 / 白骨精 / 妖塔。
 * 图集：js/monster_ink_data.js（tools/monster_bake.py 烘焙；AI 生成 → 切帧 → 抠图，运行时不生成任何图）。
 * 每只怪 8 帧：0/1 待机（交叉淡化）、2–5 走路 4 帧、6 前摇、7 出招；妖塔 4 帧：0/1 待机、2 蓄力、3 开火。
 * 逐帧实时画（一只 = 一次 drawImage，待机交叉淡化 2 次），不再烘成单张静态图。受击 = 白色染色帧，狂暴 = 红色染色帧（运行时 source-atop 缓存）。
 * 没有图（还没解码 / XY.MINK.on=false / 别的怪）→ 返回 false，调用方退回旧的矢量画法。朝右为原图，朝左镜像。 */
(function () {
  'use strict';
  var XY = window.XY, PI2 = Math.PI * 2, imgs = {}, tints = {};
  var M = XY.MINK = { on: true, stats: { minion: 0, elite: 0, boss: 0, tower: 0 }, last: null, frames: {} };

  function ent(t) {
    if (!M.on || !XY.MINK_DATA) return null;
    var d = XY.MINK_DATA[t]; if (!d) return null;
    var e = imgs[t]; if (!e) { e = imgs[t] = { img: new Image(), d: d }; e.img.src = d.src; }
    return e.img.complete && e.img.naturalWidth > 0 ? e : null;
  }
  M.has = function (t) { return !!ent(t); };
  // 静态水墨图鉴 / 关口海报用同一张真实精灵首帧，不借用带战斗状态的绘制入口。
  M.portrait = function (c, type, x, foot, height) {
    var en = ent(type); if (!en) return false;
    var f = en.d.fr[0], scale = height / f[3];
    c.drawImage(en.img, f[0], f[1], f[2], f[3], x - f[2] * scale / 2, foot - height, f[2] * scale, height); return true;
  };
  M.preload = function () { if (XY.MINK_DATA) for (var k in XY.MINK_DATA) ent(k); };
  function tint(t, i, mode, en) {
    var ck = t + mode + i, c = tints[ck]; if (c) return c;
    var f = en.d.fr[i]; c = tints[ck] = document.createElement('canvas'); c.width = f[2]; c.height = f[3];
    var x = c.getContext('2d'); x.drawImage(en.img, f[0], f[1], f[2], f[3], 0, 0, f[2], f[3]);
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = mode === 'w' ? 'rgba(255,255,255,0.92)' : 'rgba(28,22,16,0.42)'; x.fillRect(0, 0, f[2], f[3]);
    return c;
  }

  /* 取动画帧：只看渲染时能看到的状态（位置变化 / 攻击冷却跳变），不改游戏逻辑 */
  function pick(e, rt, G) {
    var st = e._mk; if (!st) st = e._mk = { x: e.x, y: e.y, mv: -9, sa: -9, at: e.atkT || 0, sh: e.shootT || 0, t: -1 };
    if (st.t !== rt) {
      var dx = e.x - st.x, dy = e.y - st.y; if (dx * dx + dy * dy > 0.04) st.mv = rt;
      st.x = e.x; st.y = e.y; st.t = rt;
      if (e.atkT > st.at + 0.3) st.sa = rt; st.at = e.atkT;
      if (e.shootT > st.sh + 0.5) st.sa = rt; st.sh = e.shootT;
    }
    var d = e.def, moving = rt - st.mv < 0.14 && !(e.stunT > 0), since = rt - st.sa, bs = e.bstate;
    var w = e.wob || 0;
    if (bs === 'charge' || since < 0.22) return { i: 7 };
    if (bs === 'tele' || bs === 'slam') return { i: 6 };
    if (since < 0.34) return { i: 6 };
    if (!(e.stunT > 0)) {
      if (d.range && e.shootT > 0 && e.shootT < 0.32) return { i: 6 };
      if (!d.range && !d.denBoss && !moving && e.atkT > 0 && e.atkT < 0.18) return { i: 6 };
    }
    if (moving) return { i: 2 + (Math.floor(rt * 9 + w) & 3), walk: true };
    return { i: 0, mix: e.stunT > 0 ? 0 : 0.5 + 0.5 * Math.sin(rt * 2.4 + w) };
  }
  /* 在 (x, foot) 画第 i 帧；脚底对齐，按 k 缩放，look<0 镜像 */
  function one(c, en, t, i, alpha, mode, x, foot, k, look) {
    var f = en.d.fr[i]; if (!f) return;
    c.globalAlpha = alpha; c.save(); c.translate(x, foot); c.scale(look * k, k);
    if (mode) c.drawImage(tint(t, i, mode, en), 0, 0, f[2], f[3], -f[4], -f[5], f[2], f[3]);
    else c.drawImage(en.img, f[0], f[1], f[2], f[3], -f[4], -f[5], f[2], f[3]);
    c.restore(); c.globalAlpha = 1;
  }
  function footOf(e, kind) { return kind === 'boss' ? 34 * (e.r / 44) : e.r * (kind === 'elite' ? 0.9 : 0.8); }
  /* 精灵头顶距单位中心的像素（血条 / 状态图标 / 名牌往上放）*/
  M.top = function (e) { var d = XY.MINK_DATA && XY.MINK_DATA[e.type]; if (!d) return e.r * 1.6; var kind = e.def.denBoss ? 'boss' : (e.def.elite ? 'elite' : 'minion'); return d.T * (e.r / e.def.r) - footOf(e, kind) + 3; };

  function draw(c, G, e, rt, look, kind) {
    var en = ent(e.type); if (!en) return false;
    var a = pick(e, rt, G), k = (e.r / e.def.r) / XY.MINK_SS, foot = e.y + footOf(e, kind);
    var bob = a.walk ? -Math.abs(Math.sin(rt * 9 + (e.wob || 0))) * (kind === 'boss' ? 2 : 1.4) : 0;
    var mode = e.flash > 0 ? 'w' : (e.enraged ? 'r' : null);
    var hw = en.d.fr[0][2] * k * 0.34;
    c.fillStyle = 'rgba(70,50,30,0.17)'; c.beginPath(); c.ellipse(e.x, foot - 1, hw, hw * 0.3, 0, 0, PI2); c.fill();
    if (a.mix !== undefined && !G._lod) { one(c, en, e.type, 0, 1, mode, e.x, foot + bob, k, look); if (a.mix > 0.02) one(c, en, e.type, 1, a.mix, mode, e.x, foot + bob, k, look); }
    else one(c, en, e.type, a.i === 0 || a.mix !== undefined ? 0 : a.i, 1, mode, e.x, foot + bob, k, look);
    M.stats[kind]++; M.last = { type: e.type, frame: a.mix !== undefined ? 0 : a.i, mode: mode || '', kind: kind, t: rt };
    M.frames[e.type + ':' + (a.mix !== undefined ? 0 : a.i)] = 1;
    return true;
  }
  M.minion = function (c, G, e, rt, look) { return draw(c, G, e, rt, look, 'minion'); };
  M.elite = function (c, G, e, rt) {
    var th = e.toCamp || !e.th ? G.camp : e.th, look = th.x > e.x ? 1 : -1, pr = 0.5 + 0.5 * Math.sin(rt * 6);
    if (!ent('elite')) return false;
    c.strokeStyle = 'rgba(217,83,79,' + (0.25 + 0.2 * pr) + ')'; c.lineWidth = 3; c.beginPath(); c.ellipse(e.x, e.y + e.r * 0.9, e.r * 1.25, e.r * 0.42, 0, 0, PI2); c.stroke();
    return draw(c, G, e, rt, look, 'elite');
  };
  M.boss = function (c, G, e, rt) {
    if (!ent(e.type)) return false;
    var th = e.toCamp || !e.th ? G.camp : e.th, look = th.x > e.x ? 1 : -1, s = e.r / 44, fy = e.y + 34 * s;
    if (e.enraged) { var ep = 0.5 + 0.5 * Math.sin(rt * 3); c.strokeStyle = 'rgba(36,28,20,' + (0.35 + 0.15 * ep) + ')'; c.lineWidth = 2.2; c.beginPath(); c.ellipse(e.x, fy, 58 * s, 14 * s, 0, 0, PI2); c.stroke(); c.strokeStyle = 'rgba(141,31,24,0.55)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(e.x, fy - 2, 36 * s, 8 * s, 0, 0.4, 2.2); c.stroke(); }
    var ok = draw(c, G, e, rt, look, 'boss');
    if (ok && e.enraged && XY.MA && XY.MA.flameAt) { var top = M.top(e); XY.MA.flameAt(c, rt, e.x - 28 * s * look, e.y - top * 0.42, 14 * s, 26 * s, 0.3); XY.MA.flameAt(c, rt, e.x + 28 * s * look, e.y - top * 0.42, 14 * s, 26 * s, 1.9); }
    return ok;
  };
  /* 妖塔：0/1 待机（交叉淡化）、2 余焰（开火后 0.2–0.5 秒）、3 开火（刚射完 0.2 秒）；脚底 = e.y + 20 */
  M.tower = function (c, G, e, rt) {
    var en = ent('etower'); if (!en) return false;
    var st = e._mk; if (!st) st = e._mk = { sa: -9, sh: e.shootT || 0 };
    if (e.shootT > st.sh + 0.3) st.sa = rt; st.sh = e.shootT;
    var k = 1 / XY.MINK_SS, foot = e.y + 20, mode = e.flash > 0 ? 'w' : null, since = rt - st.sa, mix = 0.5 + 0.5 * Math.sin(rt * 2.4 + (e.wob || 0)), i;
    if (e.building > 0) i = -1; else if (since < 0.2) i = 3; else if (since < 0.5) i = 2; else i = -1;   // 刚开火 0.2 秒 = 喷火帧，之后 0.3 秒 = 余焰（蓄力）帧；没有目标时 shootT 来回跳，所以不用 shootT 判蓄力
    var hw = en.d.fr[0][2] * k * 0.4;
    c.fillStyle = 'rgba(70,40,90,0.25)'; c.beginPath(); c.ellipse(e.x, foot - 1, hw, hw * 0.28, 0, 0, PI2); c.fill();
    if (i < 0) { one(c, en, 'etower', 0, 1, mode, e.x, foot, k, 1); if (!G._lod) one(c, en, 'etower', 1, mix, mode, e.x, foot, k, 1); }
    else one(c, en, 'etower', i, 1, mode, e.x, foot, k, 1);
    M.stats.tower++; M.last = { type: 'etower', frame: i < 0 ? 0 : i, mode: mode || '', kind: 'tower', t: rt }; M.frames['etower:' + (i < 0 ? 0 : i)] = 1;
    return true;
  };
  M.TOWER_TOP = 70;
  var BF = {};
  function bf(id, pose) {
    var k = id + '/' + pose, o = BF[k];
    if (!o) { o = BF[k] = new Image(); o.src = 'bossfight/assets/spr/' + id + '/' + pose + '.webp'; }
    return o.complete && o.naturalWidth ? o : null;
  }
  var DEN6 = { jin: 1, red: 1, yellow: 1, iron: 1, yumian: 1, chiyan: 1 };
  var IDLE5 = { jin: 1, red: 1, yellow: 1, iron: 1, yumian: 1, chiyan: 1, bat: 1, owl: 1, tang: 1, bajie: 1, wujing: 1, horse: 1, dragon: 1 };
  function metaPose(id, pose) { var bag = window.BF_SPR_META && window.BF_SPR_META[id]; return bag && bag[pose] ? bag[pose] : null; }
  function allowPose(id, pose) {
    if (window.BF_SPR_META && window.BF_SPR_META[id]) return !!window.BF_SPR_META[id][pose];
    if (pose === 'idle') return !!IDLE5[id];
    return true;
  }
  function resolvePose(id, want) {
    var order = [want, 'idle', 'idle_b', 'idle_a', 'stance'], i, im;
    for (i = 0; i < order.length; i++) {
      if (!order[i] || !allowPose(id, order[i])) continue;
      im = bf(id, order[i]);
      if (im) return { pose: order[i], im: im };
    }
    return null;
  }
  function paintFoot(c, id, pose, im, bh, breathe) {
    var bw = bh * im.naturalWidth / im.naturalHeight, m = metaPose(id, pose);
    var ax = m && m.ax ? m.ax : im.naturalWidth / 2, k = bh / im.naturalHeight;
    c.scale(1, 1 + (breathe || 0));
    c.drawImage(im, -ax * k, -bh, bw, bh);
  }
  M.denPose = function (type) { return !!DEN6[type]; };
  M.bfBoss = function (c, e, rt) {
    var id = e.type === 'boss' ? 'niumo' : e.type;
    if (id !== 'niumo' && !DEN6[id]) return false;
    var ko = !!(e.dead || e.hp <= 0);
    var want = id === 'niumo'
      ? (ko ? 'ko' : (e.flash > 0 ? 'hit' : (e.atkT > 0 ? 'swing' : ((Math.floor(rt * 1.5) % 2) ? 'idle_b' : 'idle_a'))))
      : (ko ? 'ko' : (e.flash > 0 ? 'hit' : (e.atkT > 0 ? 'attack' : ((Math.floor(rt * 1.25 + (e.wob || 0)) % 2) ? 'idle' : 'stance'))));
    var got = resolvePose(id, want);
    if (!got) return id !== 'niumo';
    var face = (e.th && e.th.x < e.x) ? -1 : 1, bh = e.r * (ko ? 2.2 : 3.15);
    var breathe = (!ko && !(e.flash > 0) && !(e.atkT > 0)) ? Math.sin(rt * 2.2 + (e.wob || 0)) * 0.028 : 0;
    c.save();
    c.fillStyle = 'rgba(58,50,38,0.2)'; c.beginPath(); c.ellipse(e.x, e.y + e.r * 0.85, e.r * 1.15, e.r * 0.34, 0, 0, PI2); c.fill();
    c.translate(e.x, e.y + e.r * 0.92); c.scale(face, 1);
    paintFoot(c, id, got.pose, got.im, bh, breathe);
    c.restore();
    return true;
  };
  var POSE = { wukong: 1, phyrex: 1, sisi: 1, laosiji: 1, kuanggong: 1, haiteng: 1, yuanzhang: 1, heyuxi: 1, diaoyulao: 1, martin: 1, tang: 1, bajie: 1, wujing: 1, horse: 1 };
  M.poseOwns = function (h) { return !!(h && POSE[h.id] && !(h.def && h.def.xid)); };
  M.poseFolder = function (h) { return (h.id === 'horse' && h.def && h.def.form === 'human') ? 'dragon' : h.id; };
  M.poseHero = function (c, h, rt, x, y, r) {
    if (XY.chibi && XY.chibi.hdRoster && h && (XY.chibi.hdRoster(h.id) || (XY.chibiKey && XY.chibi.hdRoster(XY.chibiKey(h))))) return false;
    if (!M.poseOwns(h)) return false;
    // 倒地仍用旧 ko。新图集就绪后，待机 / 出招交给 chibi 多帧；走路和蓄力也回到 chibi 的旧帧。
    if (!h.down && ((XY.chibi && XY.chibi.useWild && XY.chibi.useWild(h)) || (XY.wildAnim && XY.wildAnim.ready && XY.wildAnim.ready(h.id, 'idle')))) return false;
    var id = M.poseFolder(h), face = Math.cos(h.face || 0) >= 0 ? 1 : -1;
    var want = h.down ? 'ko' : (h.hurtT > 0 ? 'hit' : (h.dash ? 'charge' : (h.atkT > 0 ? 'attack' : (h.moving ? 'stance' : ((Math.floor(rt * 1.25 + (h.bob || 0)) % 2) ? 'idle' : 'stance')))));
    var got = resolvePose(id, want);
    if (!got) return true;
    var ko = !!h.down, bh = r * (ko ? 2.3 : 3.6) * (h.xf > 0 ? 1.25 : 1);
    var breathe = (!ko && !(h.hurtT > 0) && !(h.atkT > 0) && !h.dash) ? Math.sin(rt * 2.2 + (h.bob || 0)) * 0.028 : 0;
    c.save();
    c.fillStyle = 'rgba(58,50,38,0.18)'; c.beginPath(); c.ellipse(x, y + r * 0.9, r * 1.05, r * 0.32, 0, 0, PI2); c.fill();
    c.translate(x, y + r * 0.9); c.scale(face, 1);
    paintFoot(c, id, got.pose, got.im, bh, breathe);
    c.restore();
    return true;
  };
  M.fly = function (c, e, rt, x, y, look) {
    if (e.type !== 'bat' && e.type !== 'owl') return false;
    var atk = e.fs === 'dive' || e.fs === 'aim', ko = e.hp <= 0;
    var want = ko ? 'ko' : (e.flash > 0 ? 'hit' : (atk ? 'attack' : ((Math.floor(rt * 1.4 + (e.wob || 0)) % 2) ? 'idle' : 'stance')));
    var got = resolvePose(e.type, want);
    if (!got) return true;
    var bh = Math.max(e.type === 'owl' ? 64 : 52, e.r * 5.2);
    var breathe = (!ko && !atk && !(e.flash > 0)) ? Math.sin(rt * 2.6 + (e.wob || 0)) * 0.035 : 0;
    c.save(); c.translate(x, y + bh * 0.42); c.scale(look || 1, 1);
    paintFoot(c, e.type, got.pose, got.im, bh, breathe);
    c.restore();
    return true;
  };
  M.flyIcon = function (c, type, x, y, r) {
    if (type !== 'bat' && type !== 'owl') return false;
    var got = resolvePose(type, 'stance');
    if (!got) return true;
    var bh = Math.max(36, r * 2.3);
    c.save(); c.translate(x, y + bh * 0.35);
    paintFoot(c, type, got.pose, got.im, bh, 0);
    c.restore();
    return true;
  };
  M.dexPose = function (c, type, x, foot, bh) {
    var id = type === 'boss' ? 'niumo' : type;
    if (!DEN6[type] && type !== 'bat' && type !== 'owl' && type !== 'boss') return false;
    var got = resolvePose(id, 'stance') || resolvePose(id, 'idle_a');
    if (!got) return true;
    c.save(); c.translate(x, foot); paintFoot(c, id, got.pose, got.im, bh, 0); c.restore();
    return true;
  };
  if (XY.MINK_DATA) M.preload(); else setTimeout(function () { if (XY.MINK_DATA) M.preload(); }, 0);
  if (!window.BF_SPR_META) { try { var mjs = document.createElement('script'); mjs.async = true; mjs.src = 'bossfight/meta.js'; document.head.appendChild(mjs); } catch (e) {} }
})();
