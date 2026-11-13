/* ============================================================
 * sptree.js —— 技能树补全（v0.6 第 3 批）
 *   1) phyrex / laosiji / cato / heyuxi 四棵树原来只有 攻击 / 速度（+1 个召唤）三种节点类型，
 *      现在把每棵树的 4 个普通节点换成真正有效果的 辅助 / 控制 / 防御 / 经济 节点（带数值、会生效，不是只改颜色）。
 *   2) Phyrex 的树更长：根列下面多 3 个“专属强化”节点（可升 3 级）：币火强化 / 币环强化 / 变身续航。
 * 效果键（都有真实实现）：killHeal 击杀回血、regen 每秒回血、hitSlow 命中减速、coinUp 击杀额外金币概率、
 *   pickUp 全队拾取范围、hpAdd / dr 生命与减伤、pdef / mdef 物法防御；btcN / btcPierce / btcDmg / orbitN / tfDur / tfCd 见 phyrex.js
 * ============================================================ */
(function () {
  var XY = window.XY;
  var LAB = { hpAdd: function (v) { return '最大生命 +' + v; }, dr: function (v) { return '减伤 +' + Math.round(v * 100) + '%'; }, regen: function (v) { return '每秒回血 +' + v; },
    killHeal: function (v) { return '每次击杀回血 +' + v; }, hitSlow: function (v) { return '命中减速 ' + Math.round(v * 100) + '%（BOSS 减半）'; },
    coinUp: function (v) { return '击杀额外掉币概率 +' + Math.round(v * 100) + '%'; }, pickUp: function (v) { return '全队拾取范围 +' + Math.round(v * 100) + '%'; },
    pdef: function (v) { return '物防 +' + Math.round(v * 100) + '%'; }, mdef: function (v) { return '法防 +' + Math.round(v * 100) + '%'; },
    btcN: function (v) { return 'BTC 币数 +' + v; }, btcPierce: function (v) { return 'BTC 币穿透 +' + v; }, btcDmg: function (v) { return 'BTC 伤害 +' + Math.round(v * 100) + '%'; },
    orbitN: function (v) { return '环绕币 +' + v; }, tfDur: function (v) { return '变身时长 +' + Math.round(v * 8) + ' 秒'; }, tfCd: function (v) { return '变身冷却 -' + Math.round(v * 15) + ' 秒'; },
    dmg: function (v) { return '伤害 +' + Math.round(v * 100) + '%'; }, atkSpd: function (v) { return '攻击速度 +' + Math.round(v * 100) + '%'; } };
  function txt(fx) { return Object.keys(fx).map(function (k) { return LAB[k] ? LAB[k](fx[k]) : k; }).join('，'); }

  // 4 棵树的“类型补全节点”：[节点 id, 类型, 效果, {角色: 名字}]
  var RETYPE = [
    ['x2', 'aux', { killHeal: 3, regen: 0.4 }, { phyrex: '币息回流', laosiji: '热度回血', cato: '要素回春', heyuxi: '润喉回气' }],
    ['x4b', 'ctl', { hitSlow: 0.18 }, { phyrex: '币价冻结', laosiji: '堵车限速', cato: '冰封要点', heyuxi: '余音绕梁' }],
    ['y2', 'def', { hpAdd: 35, dr: 0.04 }, { phyrex: '冷钱包', laosiji: '安全头盔', cato: '深耕厚土', heyuxi: '咖啡护体' }],
    ['y4b', 'eco', { coinUp: 0.2, pickUp: 0.12 }, { phyrex: '币圈红利', laosiji: '过路费', cato: '丰收入账', heyuxi: '版税分成' }],
    ['z4b', 'def', { pdef: 0.06, mdef: 0.06 }, { phyrex: '风控护甲', laosiji: '防滑轮胎', cato: '稳固框架', heyuxi: '隔音棉' }],
    ['z3b', 'sum', { solDmg: 0.2, solLife: 0.2 }, { cato: '稻草人军团' }]          // 只有 Cato 缺“召唤”类型：这一条补上（强化已有天兵：伤害 +20%、生命 +20%；不加天兵上限——上限只属于沙僧，v0.5 测试要求）
  ];
  XY.TYPE_FIX_IDS = ['phyrex', 'laosiji', 'cato', 'heyuxi'];
  XY.TYPE_FIX_IDS.forEach(function (cid) {
    var tr = XY.TREE[cid]; if (!tr) return;
    RETYPE.forEach(function (r) {
      var n = tr.by[r[0]]; if (!n || !r[3][cid]) return;
      n.fx = JSON.parse(JSON.stringify(r[2])); n.ntype = r[1]; n.name = r[3][cid]; n.desc = [txt(n.fx)]; n.retyped = true;
    });
  });

  // Phyrex：3 个专属强化（可升 3 级；每级效果 = fx × 等级，见 skills.js computeMods 的 extra 分支）
  var EX = [
    { id: 'e1', name: '币火强化', ntype: 'atk', fx: { btcDmg: 0.12, btcN: 0.34, btcPierce: 0.34 } },
    { id: 'e2', name: '币环强化', ntype: 'atk', fx: { orbitN: 0.34, dmg: 0.04 } },
    { id: 'e3', name: '变身续航', ntype: 'spd', fx: { tfDur: 0.34, tfCd: 0.34 } }
  ];
  var ph = XY.TREE.phyrex;
  if (ph) EX.forEach(function (x) {
    var n = { id: x.id, kind: 'extra', name: x.name, max: 3, cost: [2, 2, 3], req: [{ m2: 1 }, { m2: 1 }, { m2: 1 }], excl: [], fx: x.fx, ntype: x.ntype,
      desc: [1, 2, 3].map(function (l) { var f = {}; Object.keys(x.fx).forEach(function (k) { f[k] = Math.round(x.fx[k] * l * 1000) / 1000; }); return txt(f); }) };
    ph.nodes.push(n); ph.by[n.id] = n;
  });
  XY.PH_EXTRA = EX.map(function (x) { return x.id; });
})();
