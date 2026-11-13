/* ============================================================
 * ultscene.js —— v0.7.0l：9 位特殊人物各自的「大招编排」（召唤过场之后接着放，约 3~4 秒）；v0.8.0 起画面改为狂野水墨（见 ultink.js）
 *   每个大招是一段时间轴：前摇（蓄力 / 起势）→ 命中拍（伤害落地）→ 余波。
 *   · 画面是纯函数：只看 S.t（场景时钟）+ 施法者位置，所以能拨时间点做联系表，也不增加每帧状态。
 *   · 三层：ground（地面）/ air（空中：水墨精灵 + 范围泼墨）/ screen（闪白 + 暗角），全部由 XY.ULTINK 绘制；本文件只管数据和调度。
 *   · 伤害跟着拍子走：每个场景声明 clear = {windup, shape, ringT}（覆盖 XY.clearArea 的落地时间 / 扫过时间），
 *     beats = [{t, mul}] 是额外的“补刀拍”（对视口里的精英 / BOSS / 妖塔再来一次技能伤害，同时在那些怪头上盖章）。
 *   · acc = 点缀色（rgb）；coins = Phyrex 的官方 Bitcoin 标金币喷泉；buff = 增益类（队友头上出笔触圈 + 十字）。
 *   · 自适应画质：泼墨点 / 笔数 × [1, 0.6, 0.35]（XY.anim.lod），水墨精灵任何档位都画。
 *   · 不画任何文字 Logo：官方 logo 只在 tools/ult_logos.py 里合成进精灵图。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, C = XY.C;
  function K() { return XY.core; }
  function viewR(G) { return XY.viewRect(G, 0); }
  var US = XY.ultscene = { D: {}, pend: null, Q: 1 };

  function echo(G, S, h, mul) {
    var R = viewR(G), n = 0, i, e;
    for (i = 0; i < G.enemies.length; i++) {
      e = G.enemies[i]; if (e.dead || XY.isMinion(e)) continue;
      if (e.x < R.x0 || e.x > R.x1 || e.y < R.y0 || e.y > R.y1) continue;
      K().hurtEnemy(G, e, K().heroDmg(G, h, 60 * mul * (h.def.statMul || 1) * ((h.mod && h.mod.ultPow) || 1)), { src: h, type: 'magic', elem: h.def.elem, kb: 30, fx: S.x, fy: S.y, aoe: true });
      S.pts.push({ x: e.x, y: e.y, t: S.t }); n++;
    }
    if (!n) S.pts.push({ x: S.x, y: S.y, t: S.t, self: 1 });
    S.echoHit += n; S.beatsDone++; G.shake = Math.max(G.shake || 0, 5);
    if (XY.sfx) XY.sfx('ult_sweep');
    return n;
  }

  /* ---------- 九位的数据（时序与旧版一致：dur / hit / clear / beats 不变，伤害与测试口径不变） ---------- */
  function def(id, name, theme, dur, hit, clear, beats, extra) {
    var d = US.D[id] = { name: name, theme: theme, dur: dur, hit: hit, shape: clear.shape, clear: clear, beats: beats,
      ground: function (c, S, t, G) { XY.ULTINK.ground(c, S, t, G); }, air: function (c, S, t, G) { XY.ULTINK.air(c, S, t, G); }, screen: function (c, S, t, W, H) { XY.ULTINK.screen(c, S, t, W, H); } };
    for (var k in extra) d[k] = extra[k];
  }
  def('phyrex', '比特币光印', '黄金印玺', 3.8, 0.9, { windup: 0.9, shape: 'screen' }, [{ t: 1.35, mul: 0.35 }, { t: 1.8, mul: 0.35 }], { acc: '255,196,40', coins: true });
  def('sisi', '防钓鱼盾', '翠绿盾徽', 3.6, 0.7, { windup: 0.7, shape: 'ring', ringT: 0.55 }, [{ t: 1.15, mul: 0.3 }], { acc: '40,180,110', buff: true });
  def('laosiji', '翻译一下', '对话气泡 + K 线', 3.2, 0.6, { windup: 0.6, shape: 'screen' }, [{ t: 1.05, mul: 0.4 }], { acc: '240,96,30' });
  def('kuanggong', '下次一定', '重镐砸地', 3.8, 0.75, { windup: 0.75, shape: 'screen' }, [{ t: 1.15, mul: 0.4 }], { acc: '232,168,30', buff: true });
  def('haiteng', '大逃杀缩圈', '空投 + 缩圈', 3.8, 0.8, { windup: 0.8, shape: 'inward', ringT: 0.6 }, [{ t: 1.5, mul: 0.35 }], { acc: '240,140,20' });
  def('diaoyulao', '猪脚饭', '巨网拽怪', 4.0, 0.55, { windup: 0.55, shape: 'pull' }, [{ t: 0.95, mul: 0.4 }], { acc: '50,130,190' });
  def('yuanzhang', '百鬼夜行', '亡灵大军席卷', 4.0, 0.7, { windup: 0.7, shape: 'sweep', ringT: 0.9 }, [{ t: 1.7, mul: 0.35 }], { acc: '40,190,190' });
  def('heyuxi', '新歌上线', '舞台演唱会', 3.6, 0.6, { windup: 0.6, shape: 'waves' }, [{ t: 1.0, mul: 0.35 }], { acc: '240,90,150', buff: true });
  def('martin', 'GM 早安', 'Bybit 旗冲锋', 4.0, 0.8, { windup: 0.8, shape: 'sweep', ringT: 0.8 }, [{ t: 1.8, mul: 0.35 }], { acc: '250,160,20', buff: true });

  def('wukong', '大圣无双', '金箍棒横扫圈击', 2.8, 0.5, { windup: 0.5, shape: 'none' }, [], { acc: '239,122,44', mainHero: true });       // v0.8.5 主角悟空的大招画面（伤害仍在 game.js castUlt0 里即时结算，这里只负责 6 帧水墨演出）

  /* ---------- 调度：开场 / 时钟 / 拍子 / 绘制 ---------- */
  US.ids = function () { return Object.keys(US.D).filter(function (k) { return !US.D[k].mainHero; }); };      // 九位特殊人物（悟空等主角的演出另算：US.mainIds）
  US.mainIds = function () { return Object.keys(US.D).filter(function (k) { return US.D[k].mainHero; }); };
  US.start = function (G, h) {
    var d = US.D[h.id]; if (!d) return null;
    var v = viewR(G), S = { id: (h.def && h.def.xid) || h.id, def: d, h: h, t: 0, x: h.x, y: h.y, vw: v.x1 - v.x0, vh: v.y1 - v.y0, pts: [], beatsDone: 0, echoHit: 0, nextBeat: 0, born: G.t };
    G.us = (G.us || []).filter(function (o) { return o.t < o.def.dur; }); G.us.push(S);
    var st = G.stats.ultScenes || (G.stats.ultScenes = {}); st[h.id] = (st[h.id] || 0) + 1; G.usLast = S;
    US.live = G;
    return S;
  };
  US.skipCloseup = function (G) {
    var L = G && G.us, i, hit = false;
    if (!L) return false;
    for (i = 0; i < L.length; i++) {
      if (L[i].def && L[i].def.mainHero && !L[i].visualOff && L[i].t < L[i].def.dur) { L[i].visualOff = true; if (L[i].h) L[i].h.ultInk = false; hit = true; }
    }
    return hit;
  };
  /* 关掉特写的这一下不能再落到战场上：否则会放塔、召唤，或把队伍领到被画面挡住的地方。 */
  US.eatGesture = function () {
    var now = Date.now();
    if (US._eatUntil && now < US._eatUntil) return true;
    if (US.skipCloseup(US.live)) { US._eatUntil = now + 800; return true; }
    return false;
  };
  if (typeof window !== 'undefined' && window.addEventListener && !US._skipBound) {
    US._skipBound = true;
    function eatPointer(e) {
      if (!US.eatGesture()) return;
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
    }
    window.addEventListener('pointerdown', eatPointer, true);
    window.addEventListener('pointerup', eatPointer, true);
  }
  US.tick = function (G, dt) {
    var L = G.us; if (!L || !L.length) return;
    for (var i = L.length - 1; i >= 0; i--) {
      var S = L[i], d = S.def, h = S.h; S.t += dt;
      if (h && !h.down && !h.dead) { h.moving = false; h.ultPose = S.t < d.hit ? 6 : (S.t < d.hit + 0.5 ? 7 : 0); h.ultInk = !S.visualOff && !!(XY.ULTINK && XY.ULTINK.has && XY.ULTINK.has(S.id)) && S.t >= 0.05 && S.t < XY.ULTINK.T - 0.2; }      // 水墨精灵在场时不画 Q 版小人      // Q 版动作帧：抬手 → 出招 → 回待机（只改画面，不碰攻击冷却）
      while (S.nextBeat < d.beats.length && S.t >= d.beats[S.nextBeat].t) { var b = d.beats[S.nextBeat++]; if (G.mode === 'play' && h) echo(G, S, h, b.mul); }
      if (S.t >= d.dur) { if (h) { h.ultPose = 0; h.ultInk = false; } L.splice(i, 1); }
    }
  };
  /* 水墨大招期间，大招自带的通用特效（清屏冲击环 / 涟漪 / 横扫白条，浅蓝尖刺的来源）不画：它们都是大招开火之后才出生、且 x,y 在施法者脚下（横扫白条另按出生时间判断）。 */
  US.hides = function (G, f) {
    var L = G.us; if (!L || !L.length || !(XY.ULTINK && XY.ULTINK.on)) return false;
    var ty = f.type === 'an' ? f.kind : f.type; if (ty !== 'ripple' && ty !== 'ring' && ty !== 'sweep') return false;
    for (var i = 0; i < L.length; i++) {
      var S = L[i]; if (S.t >= S.def.dur || !XY.ULTINK.has(S.id) || f.t > S.t + 0.03) continue;
      if (ty === 'sweep' || (Math.abs(f.x - S.x) < 6 && Math.abs(f.y - S.y) < 6)) return true;
    }
    return false;
  };
  US.draw = function (c, G, layer) {
    var L = G.us; if (!L || !L.length) return; US.Q = [1, 0.6, 0.35][(XY.anim && XY.anim.lod) ? XY.anim.lod(G) : 0] || 1;
    for (var i = 0; i < L.length; i++) { var S = L[i], f = S.def[layer]; if (f && S.t < S.def.dur) { c.save(); f(c, S, S.t, G); c.restore(); } }
  };
  US.drawScreen = function (c, G, app) {
    var L = G.us; if (!L || !L.length) return; US.Q = [1, 0.6, 0.35][(XY.anim && XY.anim.lod) ? XY.anim.lod(G) : 0] || 1;
    var W = G.view.w, H = G.view.h;
    for (var i = 0; i < L.length; i++) { var S = L[i], f = S.def.screen; if (f && S.t < S.def.dur) { c.save(); f(c, S, S.t, W, H, S.x - G.cam.x + W / 2, S.y - G.cam.y + H / 2); c.restore(); } }
  };

  /* ---------- 挂接：大招开火时起场景，并把场景声明的落地时间 / 扫过时间写进 XY.clearArea 的参数 ---------- */
  var oldClear = XY.clearArea;
  XY.clearArea = function (G, caster, o) {
    var p = US.pend;
    if (p && p.h === caster) { o = o || {}; for (var k in p.def.clear) o[k] = p.def.clear[k]; p.used = true; }
    return oldClear.call(this, G, caster, o);
  };
  var oldUlt = XY.specialUlt;
  XY.specialUlt = function (G, h) {
    var d = US.D[h.id], S = null;
    if (d) { S = US.start(G, h); US.pend = { h: h, def: d }; }
    try { return oldUlt.call(this, G, h); } finally { US.pend = null; }
  };
})();
