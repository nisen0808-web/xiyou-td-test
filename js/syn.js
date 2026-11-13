/* ============================================================
 * syn.js —— 协同技（v0.5 第 2 批）：两位角色配合才有的额外效果，用技能点在“全队页”学
 *
 * 一共 14 条：10 条「常驻角色 + 一位徒弟」+ 4 条「徒弟 + 徒弟」。五种玩法：
 *   mark 接力标记：一人命中给怪盖印（4 秒），另一人打到带印的怪，伤害 +30%/+50% 并溅射，印被消耗
 *   reson 相生共鸣：两人相距 700 内时，两人伤害 +12%/+20%
 *   guard 互相守护：两人相距 600 内时，两人各减伤 10%/16%，任一人击杀小怪给对方回最大生命 1.5%/2.5%
 *   cdp   大招联动：一人放大招，另一人的大招冷却 -20%/-30%；击杀每只让对方大招冷却 -0.15/-0.25 秒（每秒最多 1.2 秒）
 *   echo  大招回响：一人放大招，另一人身边炸出一圈同元素的冲击波（伤害 = 对方基础伤害 ×4/×6.5，300 范围）
 * 激活条件：学过（G.upg['syn_xxx']）+ 双方都在场且没倒下（常驻角色只算当前出战的那一位）。每条 2 级，花 2 + 3 点。
 * 协同技能点和别的全队节点共用技能点；因为要用掉两位角色的“专注”，成套收益见 XY.SYN_NOTE（设计说明）。
 * ============================================================ */
(function () {
  var XY = window.XY, C = XY.C, dist = XY.dist;
  var KIND = {
    mark:  { name: '接力标记', icon: '印', desc: function (S, l) { return '一人命中给怪盖印（4 秒）；另一人打到带印的怪伤害 +' + Math.round(S.v[l - 1] * 100) + '% 并溅射周围，印被消耗'; }, v: [0.30, 0.50] },
    reson: { name: '相生共鸣', icon: '生', desc: function (S, l) { return '两人相距 700 以内时，两人伤害各 +' + Math.round(S.v[l - 1] * 100) + '%'; }, v: [0.12, 0.20] },
    guard: { name: '互相守护', icon: '护', desc: function (S, l) { return '两人相距 600 以内时各减伤 ' + Math.round(S.v[l - 1] * 100) + '%；任一人击杀小怪，给对方回最大生命 ' + [1.5, 2.5][l - 1] + '%'; }, v: [0.10, 0.16] },
    cdp:   { name: '大招联动', icon: '联', desc: function (S, l) { return '一人放大招，另一人的大招冷却 -' + [20, 30][l - 1] + '%；击杀小怪让对方冷却 -' + [0.15, 0.25][l - 1] + ' 秒（每秒最多 1.2 秒）'; }, v: [0.20, 0.30] },
    echo:  { name: '大招回响', icon: '响', desc: function (S, l) { return '一人放大招，另一人身边炸出一圈同元素的冲击波（伤害约为基础伤害的 ' + [4, 6.5][l - 1] + ' 倍）'; }, v: [4, 6.5] }
  };
  XY.SYN_KIND = KIND;
  var D = [
    // 常驻角色 + 徒弟（特殊角色 id, 徒弟 id）
    ['phyrex',   'wukong', 'mark',  '金箍币雨',   '金金比和：币印一人盖、一人收'],
    ['sisi',     'bajie',  'guard', '青藤护体',   '木克土却护着土：绿光罩住钉耙'],
    ['laosiji',  'horse',  'echo',  '水火既济',   '水克火，反倒互济：龙吟引来热点'],
    ['kuanggong','wujing', 'guard', '矿坝同守',   '土克水：矿工筑坝，沙僧守河'],
    ['cato',     'wujing', 'echo',  '双水合流',   '水水比和：两股水一起涌'],
    ['haiteng',  'bajie',  'reson', '土生金·铁壁', '土生金：钉耙垫底，安全圈更稳'],
    ['yuanzhang','horse',  'reson', '水生木·万魂', '水生木：白龙马载着亡灵军团奔腾'],
    ['heyuxi',   'wukong', 'cdp',   '火炼真金',   '火克金：歌声把金箍棒炼得更快'],
    ['diaoyulao','horse',  'mark',  '双龙钓水',   '水水比和：钓线盖印、龙息收网'],
    ['martin',   'wukong', 'cdp',   '土生金·号令', '土生金：号令声催着大圣出手'],
    // 徒弟 + 徒弟
    ['wukong',   'bajie',  'reson', '金土合璧',   '土生金：棒与耙相生'],
    ['bajie',    'wujing', 'guard', '筑堤',       '土克水：八戒筑堤，沙僧守水'],
    ['wujing',   'horse',  'mark',  '水龙接力',   '水水比和：流沙与龙息接力标记（水雷接力的五行版）'],
    ['wukong',   'horse',  'cdp',   '金水相生',   '金生水：金光落水化作龙吟']
  ];
  D = D.filter(function (r) { return !XY.isHidden || !XY.isHidden(r[0]); });                  // v0.6：隐藏角色的协同技一起隐藏（数据保留）
  XY.SYNS = D.map(function (r) {
    var K = KIND[r[2]];
    return { id: 'syn_' + r[0] + '_' + r[1], a: r[0], b: r[1], kind: r[2], name: r[3], note: r[4], v: K.v, spec: !!XY.SP_BY[r[0]] };
  });
  XY.SYN_BY = {}; XY.SYNS.forEach(function (S) { XY.SYN_BY[S.id] = S; });
  XY.SYN_COST = [2, 3];

  function nameOf(id) { var d = XY.SP_BY[id] || XY.HEROES.filter(function (h) { return h.id === id; })[0]; return d ? d.name : id; }
  XY.SYNS.forEach(function (S) {
    // 伪装成“全队页”节点，复用技能页的绘制与学习流程
    S.kind0 = S.kind; S.kind = 'party'; S.syn = true; S.max = 2; S.cost = XY.SYN_COST.slice(); S.req = []; S.excl = [];
    S.fullName = S.name; S.name = S.name;
    S.eff = function (l) { return nameOf(S.a) + ' + ' + nameOf(S.b) + '：' + KIND[S.kind0].desc(S, l); };
    XY.PARTY_BY[S.id] = S;
  });
  // 技能页上的类型图标：协同技用「协」
  XY.NODE_TYPES.syn = { name: '协同', icon: '协', color: '#c0489a' };
  var _nt = XY.nodeType; XY.nodeType = function (n) { return n && n.syn ? XY.NODE_TYPES.syn : _nt(n); };

  // 当前局里相关的协同技（全队页的第 4 行）：当前常驻角色的 1 条 + 4 条徒弟互相的
  XY.synList = function (G) {
    var sp = G && G.heroes && G.heroes[5] ? G.heroes[5].id : null;
    return XY.SYNS.filter(function (S) { return S.spec ? S.a === sp : true; });
  };
  XY.synLv = function (G, S) { return (G.upg && G.upg[S.id]) || 0; };
  function who(G, id) { for (var i = 0; i < G.heroes.length; i++) if (G.heroes[i].id === id) return G.heroes[i]; return null; }
  // 激活的协同技（每个 tick 缓存一次）
  XY.synActive = function (G) {
    if (C.NO_COMBO) return [];
    var c = G._synC; if (c && c.t === G.t && c.n === G.heroes.length) return c.list;
    var list = [], i, S, a, b, l;
    for (i = 0; i < XY.SYNS.length; i++) {
      S = XY.SYNS[i]; l = (G.upg && G.upg[S.id]) || 0; if (!l) continue;
      a = who(G, S.a); b = who(G, S.b); if (!a || !b || a.down || b.down) continue;
      list.push({ S: S, l: l, a: a, b: b, v: S.v[l - 1] });
    }
    G._synC = { t: G.t, n: G.heroes.length, list: list };
    if (list.length && XY.anim && G.mode === 'play' && G.t > 0.5) XY.anim.synShow(G, list[0].S, list[0].l);       // 协同刚生效：全屏秀一下（同一条 25 秒内只秀一次）
    return list;
  };
  function partnerOf(act, h) { return act.a === h ? act.b : (act.b === h ? act.a : null); }
  function near(act, R) { return dist(act.a.x, act.a.y, act.b.x, act.b.y) <= R; }

  var syn = XY.syn = {
    // 命中前：标记增伤 / 相生共鸣
    hitMul: function (G, e, h, em) {
      var L = XY.synActive(G), m = 1, i, a, p;
      if (!L.length) return 1;
      for (i = 0; i < L.length; i++) {
        a = L[i]; p = partnerOf(a, h); if (!p) continue;
        if (a.S.kind0 === 'reson' && near(a, 700)) m *= 1 + a.v;
        else if (a.S.kind0 === 'mark' && e.synMk && e.synMk.by === p.id && e.synMk.until > G.t && e.synMk.sid === a.S.id) { m *= 1 + a.v; G._synProc = a; }
      }
      return m;
    },
    // 命中后：盖印 / 收印溅射
    afterHit: function (G, e, h, dmg, o) {
      var L = XY.synActive(G), i, a, p, K = XY.core;
      if (!L.length) return;
      for (i = 0; i < L.length; i++) {
        a = L[i]; if (a.S.kind0 !== 'mark') continue; p = partnerOf(a, h); if (!p) continue;
        if (e.synMk && e.synMk.by === p.id && e.synMk.until > G.t && e.synMk.sid === a.S.id) {          // 收印：溅射 + 清印
          e.synMk = null; G.stats.synProcs = (G.stats.synProcs || 0) + 1;
          G.fx.push({ type: 'ring', x: e.x, y: e.y, r: 90, color: '#c0489a', t: 0, max: 0.35, fill: true });
          K.text(G, e.x, e.y - e.r - 24, '协同·' + a.S.fullName, 'syn', '#c0489a');
          var ex = e, dm = dmg * 0.5, el = XY.skillElem(h);
          G.grid.query(e.x, e.y, 90, function (t) { if (t !== ex && !t.dead) K.hurtEnemy(G, t, dm, { dot: true, type: (h.def && h.def.dtype) || 'phys', elem: el }); });
        } else if (!e.synMk || e.synMk.until <= G.t) e.synMk = { by: h.id, until: G.t + 4, sid: a.S.id };
      }
    },
    // 减伤
    drMul: function (G, h) {
      var L = XY.synActive(G), i, a, m = 1;
      for (i = 0; i < L.length; i++) { a = L[i]; if (a.S.kind0 === 'guard' && (a.a === h || a.b === h) && near(a, 600)) m *= 1 - a.v; }
      return m;
    },
    onKill: function (G, e, h) {
      var L = XY.synActive(G), i, a, p, K = XY.core;
      for (i = 0; i < L.length; i++) {
        a = L[i]; p = partnerOf(a, h); if (!p) continue;
        if (a.S.kind0 === 'guard' && !e.def.boss && near(a, 600)) K.healHero(G, p, p.maxHp * [0.015, 0.025][a.l - 1], true);
        else if (a.S.kind0 === 'cdp' && p.ultCd > 0) {
          var bud = p.synBud === undefined ? 1.2 : Math.min(1.2, p.synBud + (G.t - p.synBt) * 1.2); var cut = Math.min(bud, [0.15, 0.25][a.l - 1]);
          p.synBud = bud - cut; p.synBt = G.t; p.ultCd = Math.max(0, p.ultCd - cut);
        }
      }
    },
    onUlt: function (G, h) {
      var L = XY.synActive(G), i, a, p, K = XY.core;
      for (i = 0; i < L.length; i++) {
        a = L[i]; p = partnerOf(a, h); if (!p) continue;
        if (a.S.kind0 === 'cdp') { if (p.ultCd > 0) p.ultCd *= 1 - a.v; K.text(G, p.x, p.y - 40, '协同·' + a.S.fullName, 'syn', '#c0489a'); G.stats.synProcs = (G.stats.synProcs || 0) + 1; }
        else if (a.S.kind0 === 'echo') {
          var el = XY.skillElem(h), base = a.v, px = p.x, py = p.y, dm = K.heroDmg(G, p, 10 * base * (p.def.statMul || 1)), dt = (p.def && p.def.dtype) || 'phys';
          G.stats.synProcs = (G.stats.synProcs || 0) + 1;
          G.fx.push({ type: 'ring', x: px, y: py, r: 300, color: (XY.ELEMS[el] || {}).color || '#c0489a', t: 0, max: 0.5, fill: true });
          K.text(G, px, py - 40, '协同·' + a.S.fullName, 'syn', '#c0489a'); G.shake = Math.max(G.shake, 5);
          G.grid.query(px, py, 300, function (t) { if (!t.dead) K.hurtEnemy(G, t, dm, { src: p, dot: true, type: dt, elem: el, kb: 120, fx: px, fy: py }); });
        }
      }
    },
    // 学习时：弹提示 + 记进图鉴
    onLearn: function (G, id) {
      var S = XY.SYN_BY[id]; if (!S) return;
      G._synC = null; var l = XY.synLv(G, S);
      if (XY.anim) XY.anim.synShow(G, S, l);
      XY.core.banner(G, '协同技「' + S.fullName + '」Lv' + l + '：' + nameOf(S.a) + ' + ' + nameOf(S.b), 3);
      var d = XY.save.data.dex, k = 'syn:' + S.id, e = d[k] || (d[k] = { seen: 0, kills: 0, first: Date.now(), lv: 0 });
      e.seen = Math.max(1, e.seen); e.lv = Math.max(e.lv || 0, l); XY.save.touch();
    }
  };
  var _opl = XY.onPartyLearn; XY.onPartyLearn = function (G, id) { if (XY.SYN_BY[id]) { G.upg[id] = (G.upg[id] || 0) + 1; syn.onLearn(G, id); return; } return _opl.apply(this, arguments); };

  // 学习条件：双方都在场且没倒下（学之前就要在场，免得花了点数却用不上）
  var _ns = XY.nodeStatus;
  XY.nodeStatus = function (G, hi, id) {
    var r = _ns.apply(this, arguments);
    if (hi < 0 && XY.SYN_BY[id] && (r.st === 'ok' || r.st === 'nopts')) {
      var S = XY.SYN_BY[id], a = who(G, S.a), b = who(G, S.b);
      if (!a || !b) { r.st = 'locked'; r.reason = '需要「' + nameOf(S.a) + '」和「' + nameOf(S.b) + '」都在队里'; }
      else if (a.down || b.down) { r.st = 'locked'; r.reason = nameOf(a.down ? S.a : S.b) + ' 已阵亡'; }
    }
    return r;
  };
  // “自动加点”不碰协同技（它们要玩家有意识地选）：autoSpend 用的是 PARTY_NODES，不含协同，所以无需处理

  // 选关界面用：这位常驻角色有哪条协同技（带谁、叫什么、五行关系）
  XY.synOfSpecial = function (id) { id = (XY.SP_BY[id] && XY.SP_BY[id].id) || id; return XY.SYNS.filter(function (S) { return S.spec && S.a === id; })[0] || null; };
  XY.synText = function (id) {
    var S = XY.synOfSpecial(id); if (!S) return '没有协同技';
    var ea = (XY.SP_BY[id] || {}).elem, eb = (XY.HEROES.filter(function (h) { return h.id === S.b; })[0] || {}).elem, rel = XY.elemRel(ea, eb);
    return '协同：带「' + nameOf(S.b) + '」→「' + S.fullName + '」（' + KIND[S.kind0].name + (rel ? '，' + rel : '') + '）';
  };
  XY.synDexCount = function () { var n = 0; XY.SYNS.forEach(function (S) { if (XY.save.data.dex['syn:' + S.id]) n++; }); return n; };
  XY.SYN_NOTE = '协同技要花全队技能点（2+3 点），换来两个人一起才有的收益；同样的点数投给单个角色的“主技能精进”，只能抬一个人。';
})();
