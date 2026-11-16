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
  var LAB = { hpAdd: function (v) { return '最大生命 +' + v; }, dr: function (v) { return '减伤增加' + Math.round(v * 100) + '个百分点（此类减伤最多75%）'; }, regen: function (v) { return '每秒回血 +' + v; },
    killHeal: function (v) { return '每次击杀回血 +' + v; }, hitSlow: function (v) { return '非持续伤害命中使敌人减速' + Math.round(v * 100) + '%，持续1.2秒（首领减半，取较强减速）'; },
    coinUp: function (v) { return '自身击杀有' + Math.round(v * 100) + '%几率额外掉金币，普通敌人1枚、精英3枚'; }, pickUp: function (v) { return '存活时全队拾取范围增加基础范围的' + Math.round(v * 100) + '%（同类相加）'; },
    pdef: function (v) { return '物防增加' + Math.round(v * 100) + '个百分点（该类防御最多80%）'; }, mdef: function (v) { return '法防增加' + Math.round(v * 100) + '个百分点（该类防御最多80%）'; },
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
      desc: [1, 2, 3].map(function (l) {
        if(x.id==='e1')return '燃烧币直击、灼烧与环绕伤害累计增加'+(12*l)+'%。'+(l<3?'发射枚数与穿透仍在积累；本强化到第3级时各增加1。':'本强化额外发射1枚燃烧币，并可多穿透1名敌人。')+'币火流的整枚加成另计。';
        if(x.id==='e2')return '全伤害累计提高'+(4*l)+'%。'+(l<3?'环绕枚数仍在积累；单独本强化到第3级时增加1枚。':'单独本强化增加1枚环绕币。')+'与环绕流合算，跨过整枚门槛时可能提前增加。';
        return '变身持续时间累计增加'+[2.72,5.44,8.16][l-1]+'秒，变身冷却累计缩短'+[5.1,10.2,15.3][l-1]+'秒；仍需队伍达到99级才能变身。';
      }) };
    ph.nodes.push(n); ph.by[n.id] = n;
  });
  XY.PH_EXTRA = EX.map(function (x) { return x.id; });
})();
