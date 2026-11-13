/* ============================================================
 * waves.js —— v0.7 妖潮预告 + 休息点三夜潮
 *   · 每一波“妖潮”都先排好日程：几时来 / 从哪个方向 / 什么怪 / 多少只，提前 WAVE_LEAD 秒在屏幕上预告，到点按预告的来
 *   · 休息点 300 秒（总时长不变）拆成 3 个夜潮，每个 100 秒：备战 20 秒（怪少）+ 来潮 60 秒（两波预告过的妖潮）+ 收尾 20 秒（怪少，歇口气）；第 3 夜潮的第二波是“大潮”（更多 + 牛头卫护送）
 *   · 行军阶段保留原来的涌浪节奏（首次 SURGE_FIRST，之后约 SURGE_EVERY 一次），只是同样先预告；每第 4 波是大潮
 *   · C.WAVE_PLAN = false 时回到 v0.6 的老规则（用于旧新对照，见 test/probe.js）
 * 逻辑在 abilities.js 的 updateFlow 里调用 XY.waveTick / XY.waveSeg；画面在 render4.js（预告条 + 屏幕边缘箭头）。
 * ============================================================ */
(function () {
  var XY = window.XY, C = XY.C, rand = XY.rand, PI2 = Math.PI * 2;

  // 潮的种类：[小妖, 弓箭妖, 石头怪] 的占比 + 数量倍率
  XY.WAVE_KINDS = {
    swarm:  { name: '小妖潮',   mix: [0.92, 0.05, 0.03], nMul: 1.25 },
    archer: { name: '弓箭潮',   mix: [0.45, 0.45, 0.10], nMul: 1.0 },
    rock:   { name: '石头潮',   mix: [0.50, 0.10, 0.40], nMul: 0.8 },
    mix:    { name: '混合潮',   mix: [0.80, 0.13, 0.07], nMul: 1.0 }
  };
  var KIND_IDS = ['swarm', 'archer', 'rock', 'mix'];
  var DIRS = ['东', '东南', '南', '西南', '西', '西北', '北', '东北'];
  XY.waveDirName = function (a) { var i = Math.round(((a % PI2) + PI2) % PI2 / (PI2 / 8)) % 8; return DIRS[i] + '方'; };   // 屏幕坐标：x 向右，y 向下

  XY.waveState = function (G) { return G.wave || (G.wave = { next: null, seq: 0, last: null, rest: null, segKey: '', fired: 0, big: 0 }); };

  // 休息阶段的第几夜潮 / 哪一段（备战 prep / 来潮 tide / 收尾 wrap）/ 这一段还剩几秒 / 这一段的刷怪密度倍率
  XY.waveSeg = function (G) {
    var T = G.tang; if (!C.WAVE_PLAN || T.phase !== 'rest') return null;
    var seg = Math.max(1, C.REST_SEG), i = Math.min(2, Math.floor(T.restT / seg)), u = T.restT - i * seg, ph, left;
    if (u < C.REST_PREP) { ph = 'prep'; left = C.REST_PREP - u; }
    else if (u < seg - C.REST_WRAP) { ph = 'tide'; left = seg - C.REST_WRAP - u; }
    else { ph = 'wrap'; left = seg - u; }
    return { i: i, n: 3, ph: ph, left: left, mul: ph === 'prep' ? C.REST_MUL_PREP : (ph === 'tide' ? C.REST_MUL_TIDE : C.REST_MUL_WRAP) };
  };

  function pickKind(W) {
    if (W.seq === 0) return 'swarm';
    var k, tries = 0; do { k = KIND_IDS[Math.floor(Math.random() * KIND_IDS.length)]; } while (k === W.last && ++tries < 8);
    return k;
  }
  function plan(G, at, want, rest, forward, big) {
    var W = XY.waveState(G), kind = pickKind(W), K = XY.WAVE_KINDS[kind];
    var fwd = !rest && Math.random() < 0.6;
    var a = fwd ? forward + rand(-0.5, 0.5) : rand(0, PI2);
    var kRest = rest ? C.WAVE_REST_K : 1;
    var n = Math.round(want * rand(C.SURGE_K0, C.SURGE_K1) * K.nMul * (G.dungeon ? C.DNG_MUL * (G.dungeon.mul || 1) : 1) * (G.routeChoice === 'S' && G.tang.phase === 'walk2' ? C.FORK_S_MUL : 1) * kRest * (big ? C.WAVE_BIG_K : 1));
    var comp = [Math.round(n * K.mix[0]), Math.round(n * K.mix[1]), 0]; comp[2] = Math.max(0, n - comp[0] - comp[1]);
    W.seq++; W.last = kind;
    return { at: at, a: a, dir: XY.waveDirName(a), fwd: fwd, kind: kind, name: big ? '大潮' : K.name, big: !!big, n: n, comp: comp, sh: at >= 100 ? Math.round(comp[2] * 0.5) : 0, elite: big ? C.WAVE_BIG_ELITE : 0, warned: false, em0: 1 };
  }

  // 每个刷怪节拍调用一次（abilities.updateFlow 在 0.45 秒节拍里调）。到点了返回要刷的那一波，否则返回 null；没排日程就先排好。
  XY.waveTick = function (G, want, forward) {
    var W = XY.waveState(G), T = G.tang, rest = T.phase === 'rest', now = G.t, i;
    if (rest) {
      if (!W.rest) {                                         // 刚进休息点：一次排好 6 波（每夜潮 2 波），按休息计时换算成游戏时间
        W.rest = []; W.next = null;
        for (i = 0; i < 3; i++) C.REST_WAVES.forEach(function (u, j) {
          var big = i === 2 && j === C.REST_WAVES.length - 1;
          W.rest.push({ rt: i * C.REST_SEG + u, big: big });
        });
        W.restDone = 0;
      }
      var segN = XY.waveSeg(G);
      var key = segN ? segN.i + segN.ph : '';
      if (key !== W.segKey) {
        W.segKey = key;
        if (segN && T.restT > 0.1) {
          if (segN.ph === 'prep') { XY.banner(G, '夜潮 ' + (segN.i + 1) + '/3：备战 ' + C.REST_PREP + ' 秒', 2.5); if (XY.fabao && XY.fabao.on() && G.fb) XY.fabao.onPrep(G); }
          else if (segN.ph === 'wrap') XY.banner(G, '鸡鸣妖退，歇一口气', 2.5);
        }
      }
      if (!W.next && W.restDone < W.rest.length) {
        var r = W.rest[W.restDone];
        if (T.restT <= r.rt + 0.5) { W.next = plan(G, now + Math.max(0, r.rt - T.restT), want, true, forward, r.big); W.next.restIdx = W.restDone; W.next.air = XY.fly ? XY.fly.plan(G, true, W.restDone, r.big) : null; }
        else W.restDone++;                                    // 错过了（暂停 / 调试跳时间）：直接跳过
      }
    } else {
      if (W.rest) { W.rest = null; W.next = null; W.segKey = ''; }
      if (!W.next) {
        var first = W.fired === 0 && W.seq === 0;
        var at = first ? (G.dungeon ? C.DNG_FIRST : C.SURGE_FIRST) : now + (G.dungeon ? C.DNG_EVERY : C.SURGE_EVERY) * rand(0.8, 1.2);
        if (first && at < now) at = now + 5;
        W.next = plan(G, at, want, false, forward, (W.fired + 1) % C.WAVE_BIG_EVERY === 0 && W.fired > 0); W.next.air = XY.fly ? XY.fly.plan(G, false, 0, W.next.big) : null;
      }
    }
    var nx = W.next; if (!nx) return null;
    var left = nx.at - now;
    if (!nx.warned && left <= C.WAVE_LEAD) { nx.warned = true; if (XY.sfx) XY.sfx('wave_warn'); }
    if (left > 0) return null;
    W.next = null; W.fired++; if (nx.big) W.big++; if (nx.restIdx !== undefined) W.restDone = nx.restIdx + 1;
    W.fired0 = nx; W.firedAt = now;                          // 正在来袭：预告条再显示 4 秒“妖潮来袭”
    return nx;
  };

  // 预告条要显示的内容（没有要显示的返回 null）
  XY.waveForecast = function (G) {
    if (!C.WAVE_PLAN || G.tut || G.noSpawn || G.tang.phase === 'arrived' || G.ending) return null;
    var W = G.wave; if (!W) return null;
    var nx = W.next, seg = XY.waveSeg(G), out = { seg: seg, next: null, now: null };
    if (nx && nx.at - G.t <= C.WAVE_LEAD) out.next = { left: Math.max(0, nx.at - G.t), w: nx };
    if (W.fired0 && G.t - W.firedAt < 4) out.now = { w: W.fired0, k: (G.t - W.firedAt) / 4 };
    return (out.seg || out.next || out.now) ? out : null;
  };
})();
