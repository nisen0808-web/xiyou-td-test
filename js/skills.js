/* ============================================================
 * skills.js —— 技能树：数据 + 学习规则 + 属性换算
 *
 * 结构：
 *   每个英雄一棵树 = 主技能线（一阶 → 二阶 → 分叉：强攻 / 特色，二选一）
 *                  + 7 个辅助技能（最多只能学 3 种）
 *   第 6 页“全队”：全队强化、营地强化，不占辅助名额
 *   升级给技能点（全队共用，可以投给任何一位活着的英雄）。
 *
 * 节点字段： id, kind(main/support/party), name, max, cost[每一级的价格],
 *            desc[每一级的效果文字]（队伍节点用 eff(l) 函数）,
 *            req[每一级需要的前置 {节点id: 等级}]、excl[互斥节点]
 * ============================================================ */
(function () {
  var XY = window.XY;

  /* ---------- 命令 ---------- */
  XY.ORDERS = ['follow', 'station', 'attack', 'guard'];
  XY.ORDER_NAME  = { follow: '跟随', station: '驻守营地', attack: '主动出击', guard: '守护师父' };
  XY.ORDER_SHORT = { follow: '跟随', station: '驻守', attack: '出击', guard: '守护' };
  XY.ORDER_DESC  = {
    follow:  '跟随手控英雄；手控英雄远离唐僧时，改为护送师父',
    station: '休息时守营地，行军时守在唐僧身边，攻击附近敌人',
    attack:  '主动找怪堆、精英、Boss 去打；血太低会自己撤回',
    guard:   '守在唐僧身边，挡住冲向他的妖怪和飞来的弹幕'
  };

  /* ---------- 每个英雄的“特色分支”和“专属辅助” ---------- */
  var BRANCH = {
    tang:   { a: '佛光普渡', b: '慈悲护营', bd: ['佛光回血 +50%；驻守时营地回血 ×1.5', '佛光回血 +100%；驻守时营地回血 ×2'] },
    wukong: { a: '霸王棒法', b: '疾风棒法', bd: ['攻击速度 +25%，大招伤害 +20%', '攻击速度 +50%，大招伤害 +40%'] },
    bajie:  { a: '九齿重砸', b: '铁壁蛮牛', bd: ['减伤 8%，大招冷却 -15%', '减伤 16%，大招冷却 -30%'] },
    wujing: { a: '骷髅大阵', b: '流沙奥义', bd: ['大招伤害和范围 +30%，大招冷却 -10%', '大招伤害和范围 +60%，大招冷却 -20%'] },
    horse:  { a: '穿云水箭', b: '疾风龙息', bd: ['攻击速度 +20%，大招伤害 +25%', '攻击速度 +40%，大招伤害 +50%'] }
  };
  var SPECIAL = {
    tang: { id: 'sp', name: '镇营安民', desc: [1, 2, 3].map(function (l) { return '驻守营地的额外回血×'+[1.25,1.5,2][l-1]+'，营地减伤再加'+[5,10,15][l-1]+'个百分点。营地展开且生命低于90%时恢复'+[200,350,500][l-1]+'生命，冷却24秒。'; }) },
    wukong: { id: 'sp', name: '七十二变', desc: [1,2,3].map(function(l){return '暴击率增加'+(10*l)+'个百分点。150内有敌人时横扫一圈，造成'+(60+15*l)+'基础伤害并击退，冷却'+[12,10,8][l-1]+'秒。';}) },
    bajie: { id: 'sp', name: '贪吃', desc: [1,2,3].map(function(l){return '自身击杀回复'+l+'生命。自身生命低于80%时恢复20%最大生命，冷却'+[20,17,14][l-1]+'秒。';}) },
    wujing: { id: 'sp', name: '坚忍', desc: [1,2,3].map(function(l){return '减伤增加'+(6*l)+'个百分点。160内至少3名敌人或自身生命低于60%时，无敌1.5秒，冷却'+[20,17,14][l-1]+'秒。';}) },
    horse: { id: 'sp', name: '龙鳞', desc: [1,2,3].map(function(l){return '大招冷却×'+[.9,.8,.7][l-1]+'。380内至少2名敌人时射出12支水箭，每支基础伤害'+[16.8,19.6,22.4][l-1]+'、最多命中3个目标，冷却'+[12,10,8][l-1]+'秒。';}) }
  };
  var COMMON = [
    {id:'vital',name:'强身健体',desc:[1,2,3].map(function(l){return '最大生命增加'+[20,40,70][l-1]+'点'+(l===3?'，减伤增加5个百分点':'')+'。自身生命低于85%时恢复15%最大生命，冷却'+[22,18,14][l-1]+'秒。';})},
    {id:'fire',name:'火眼·灼烧',desc:[1,2,3].map(function(l){return '240内有敌人时，将范围内敌人点燃4秒，每秒'+(4*l)+'基础法术伤害（火属性），冷却'+[9,8,7][l-1]+'秒。重复灼烧刷新时间，不重复叠层。';})},
    {id:'chill',name:'寒水·迟缓',desc:[1,2,3].map(function(l){return '240内有敌人时，使范围内敌人减速'+[20,35,50][l-1]+'%，持续3秒；首领减半。冷却'+[9,8,7][l-1]+'秒，同类减速取较强效果。';})},
    {id:'leech',name:'佛法·疗愈',desc:[1,2,3].map(function(l){return '220内有存活护法生命低于85%时，为该范围内所有存活护法恢复'+[8,12,16][l-1]+'%最大生命（包含自己，不含唐僧），冷却'+[20,17,14][l-1]+'秒。不会复活。';})},
    {id:'boom',name:'爆裂·连环',desc:[1,2,3].map(function(l){return '320内有敌人时，从420内随机选最多'+[2,3,4][l-1]+'名不同敌人，各引发半径75的爆炸，每次造成'+[50,70,90][l-1]+'基础法术伤害（火属性），受全队伤害加成。冷却'+[7,6,5][l-1]+'秒。';})},
    {id:'swift',name:'轻身',desc:[1,2,3].map(function(l){return '移动且未在加速中时，自身移速提高45%，持续3秒；冷却'+[14,12,10][l-1]+'秒。';})}
  ];
  // 辅助 / 专属技能的主动效果和冷却（1/2/3 级）。短名用在 HUD 技能图标上
  XY.SUP = {
    vital: { name: '回气',     short: '气', cd: [22, 18, 14], icon: '#3f9d5a' },
    fire:  { name: '火眼',     short: '火', cd: [9, 8, 7],    icon: '#e0642b' },
    chill: { name: '寒水',     short: '寒', cd: [9, 8, 7],    icon: '#4aa3d6' },
    leech: { name: '佛法',     short: '佛', cd: [20, 17, 14], icon: '#d9a21a' },
    boom:  { name: '爆裂',     short: '爆', cd: [7, 6, 5],    icon: '#e07a1f' },
    swift: { name: '疾步',     short: '疾', cd: [14, 12, 10], icon: '#6a7fd6' }
  };
  XY.SUP_SP = {
    tang:   { name: '镇营',     short: '营', cd: [24, 24, 24], icon: '#d9a21a' },
    wukong: { name: '分身',     short: '分', cd: [12, 10, 8],  icon: '#ef8a3c' },
    bajie:  { name: '大吃',     short: '吃', cd: [20, 17, 14], icon: '#f28fb0' },
    wujing: { name: '金身',     short: '金', cd: [20, 17, 14], icon: '#4f86c6' },
    horse:  { name: '龙鳞箭雨', short: '鳞', cd: [12, 10, 8],  icon: '#6fcfd8' }
  };
  XY.supDef = function (heroId, id) { if (/^s[123]$/.test(id)) return XY.spsupDef(heroId, id); return id === 'sp' ? XY.SUP_SP[heroId] : XY.SUP[id]; };
  var SUP_COST = [1, 1, 2];
  var SUP_REQ = [{}, { m1: 1 }, { m2: 1 }];     // 辅助技能：2 级要先学主技能一阶，3 级要先学二阶
  XY.MAX_SUPPORTS = 3;

  /* ---------- 深度技能树（v0.4）：每人 3 条分支，每条 t1 → t2 → 二选一岔路（3 → 4 → 5 关键石）----------
   * 每条分支 8 个节点，最多学 5 个：t1、t2 之后在 A / B 两条路里选一条走到底（互斥）。
   * 效果全是数值（fx），由 computeMods 统一折算；关键石（t5）数值最大。常驻角色的第 3 条分支要角色升到 Lv4 才开放。 */
  var THEMES = {
    atk:  { b: '攻伐', t1: ['蓄势', { dmg: 0.06 }], t2: ['连击', { atkSpd: 0.08 }],
            A: ['狂攻', [['锐意', { crit: 0.08 }], ['猛攻', { dmg: 0.10 }], ['★ 万钧', { dmg: 0.15, crit: 0.10, ultPow: 0.15 }]]],
            B: ['破阵', [['识破', { bossDmg: 0.12 }], ['击弱', { weakDmg: 0.15 }], ['★ 斩将', { bossDmg: 0.20, weakDmg: 0.20, ultPow: 0.15 }]]] },
    def:  { b: '守御', t1: ['强筋', { hpAdd: 30 }], t2: ['硬功', { dr: 0.04 }],
            A: ['金刚', [['铁甲', { pdef: 0.08 }], ['厚土', { hpAdd: 50 }], ['★ 金刚不坏', { pdef: 0.08, dr: 0.05, hpAdd: 60 }]]],
            B: ['护法', [['静心', { mdef: 0.10 }], ['化劲', { dr: 0.04 }], ['★ 法身', { mdef: 0.10, dr: 0.05, hpAdd: 60 }]]] },
    util: { b: '灵动', t1: ['轻身', { move: 0.05 }], t2: ['凝神', { ultCd: -0.08 }],
            A: ['疾行', [['缩地', { traitCd: -0.12 }], ['踏云', { move: 0.06 }], ['★ 御风', { traitCd: -0.15, move: 0.08, atkSpd: 0.08 }]]],
            B: ['法力', [['聚气', { ultPow: 0.15 }], ['回元', { ultCd: -0.08 }], ['★ 通玄', { ultPow: 0.20, ultCd: -0.10, traitCd: -0.08 }]]] },
    elem: { b: '专精', t1: ['入门', { tmain: 0.08 }], t2: ['观弱', { weakDmg: 0.10 }],
            A: ['精一', [['精研', { tmain: 0.10 }], ['会心', { crit: 0.06 }], ['★ 极意', { tmain: 0.18, weakDmg: 0.15 }]]],
            B: ['兼修', [['旁通', { tother: 0.12 }], ['敏捷', { atkSpd: 0.08 }], ['★ 圆融', { tother: 0.15, tmain: 0.08, dmg: 0.08 }]]] },
    heal: { b: '妙手', t1: ['仁心', { healMul: 0.10 }], t2: ['静气', { ultPow: 0.10 }],
            A: ['回春', [['妙手', { healMul: 0.15 }], ['养息', { regen: 0.8 }], ['★ 起死回生', { healMul: 0.25, regen: 1.2 }]]],
            B: ['化雨', [['润物', { ultPow: 0.20 }], ['调息', { ultCd: -0.10 }], ['★ 甘霖', { ultPow: 0.25, ultCd: -0.10, healMul: 0.15 }]]] },
    summon: { b: '召唤', t1: ['召集', { capAdd: 1 }], t2: ['香火', { capAdd: 1, solLife: 0.2 }],
            A: ['天兵营', [['精兵', { solDmg: 0.2 }], ['扩营', { capAdd: 1, solLife: 0.2 }], ['★ 天兵大营', { capAdd: 1, solDmg: 0.3, solSky: 1 }]]],
            B: ['急召', [['军饷', { solCost: -0.25 }], ['整编', { capAdd: 1, solCost: -0.15 }], ['★ 十万天兵', { capAdd: 1, solLife: 0.4, solCost: -0.2 }]]] },
    aura: { b: '佛光', t1: ['宝光', { auraMul: 0.15 }], t2: ['安营', { stRegen: 0.15 }],
            A: ['普照', [['慈光', { auraMul: 0.20 }], ['镇守', { stDef: 0.05 }], ['★ 万佛朝宗', { auraMul: 0.30, stDef: 0.08 }]]],
            B: ['安民', [['固本', { stRegen: 0.25 }], ['静心', { ultCd: -0.10 }], ['★ 大慈悲', { stRegen: 0.35, ultCd: -0.12, stDef: 0.05 }]]] },
    camp: { b: '营地', t1: ['筑垒', { stDef: 0.04 }], t2: ['修缮', { stRegen: 0.15 }],
            A: ['坚壁', [['加固', { stDef: 0.05 }], ['佛光', { auraMul: 0.15 }], ['★ 铜墙铁壁', { stDef: 0.08, auraMul: 0.20 }]]],
            B: ['行脚', [['行脚', { move: 0.06 }], ['静修', { ultCd: -0.10 }], ['★ 云游', { move: 0.10, ultCd: -0.10, stRegen: 0.20 }]]] }
  };
  var PICK = {   // 每个角色的三条分支 + 属性权重（突出各自的特色）
    tang: ['aura', 'camp', 'util'], wukong: ['atk', 'elem', 'util'], bajie: ['elem', 'def', 'atk'], wujing: ['summon', 'elem', 'def'], horse: ['util', 'elem', 'atk'],
    dash: ['atk', 'util', 'elem'], heal: ['heal', 'def', 'util'], mark: ['atk', 'elem', 'util'], tank: ['def', 'atk', 'util'], storm: ['elem', 'util', 'atk']
  };
  var WEIGHT = { wukong: { atk: 1.3, elem: 1.2 }, bajie: { elem: 1.35, def: 1.0, atk: 0.8 }, wujing: { elem: 1.2 }, horse: { util: 1.3 }, tank: { def: 1.4, atk: 0.7 }, mark: { atk: 1.2 }, heal: { heal: 1.2 } };
  function fxText(fx, dt, defId) {
    var L = { dmg: '伤害', atkSpd: '攻击速度', ultPow: '大招威力', move: '移动速度', crit: '暴击率', bossDmg: '对 BOSS 伤害', weakDmg: '克制时额外伤害', pdef: '物防', mdef: '法防',
              dr: '减伤', hpAdd: '生命', healMul: '治疗量', regen: '每秒回血', auraMul: '佛光治疗量', stRegen: '驻守营地额外回血', stDef: '驻守营地减伤', capAdd: '天兵上限', solDmg: '天兵伤害', solLife: '新部署天兵驻留时间', solCost: '召唤花费', solSky: '降临天兵人数', tmain: (dt === 'magic' ? '法术' : '物理') + '伤害', tother: (dt === 'magic' ? '物理' : '法术') + '伤害' };
    L.ultPow=defId==='tang'?'大招行走时伤害（不提高治疗）':defId==='wujing'?'大招伤害与范围':'大招伤害';
    L.healMul=defId==='haiteng'?'救命回复量（须先学辅助救命，不增加次数）':defId==='yuanzhang'?'辅助附魂的英雄治疗量（须先学附魂，不增加护盾）':'治疗量（不增加护盾）';
    var out = [];
    Object.keys(fx).forEach(function (k) {
      var v = fx[k];
      if (k === 'ultCd') out.push('大招冷却×' + Math.round((1+v)*1000)/1000);
      else if (k === 'traitCd') out.push('特性冷却×' + Math.round((1+v)*1000)/1000 + '（不影响辅助技能冷却）');
      else if (k === 'hpAdd') out.push('最大生命 +' + v);
      else if (k === 'regen') out.push('自身每秒恢复生命 +' + v);
      else if (k === 'capAdd') out.push(L[k] + ' +' + v);
      else if (k === 'solSky') out.push('召唤的特殊人物停留 +' + (v * 1.5) + ' 秒');      // v0.7：「天兵降临」换成了「召唤特殊人物」，这条改成延长停留时间
      else if (k === 'chain') out.push('闪电链多弹跳 ' + v + ' 次');
      else if (k === 'weakDmg') out.push('五行克制伤害倍率增加' + v);
      else if (k === 'crit' || k === 'pdef' || k === 'mdef' || k === 'dr' || k === 'stDef') out.push(L[k] + '增加' + Math.round(v * 100) + '个百分点'+(k==='dr'?'（此类减伤最多75%）':k==='pdef'||k==='mdef'?'（该类防御最多80%）':k==='stDef'?'（驻守总减伤最多80%）':''));
      else if (k === 'solCost') out.push('部署天兵费用减少' + Math.round(-v * 100) + '%（同类相加，最低原价40%）');
      else if (['dmg','atkSpd','ultPow','move','healMul','auraMul','stRegen'].indexOf(k) >= 0) out.push(L[k] + '×' + (Math.round((1+v)*1000)/1000));
      else out.push(L[k] + ' +' + Math.round(v * 100) + '%');
    });
    return out.join('，');
  }
  function scaled(fx, w) {
    var o = {}; Object.keys(fx).forEach(function (k) { var v = fx[k] * w; o[k] = k === 'hpAdd' ? Math.round(v / 5) * 5 : Math.round(v * 1000) / 1000; }); return o;
  }
  var DEEP_COST = { 1: 1, 2: 1, 3: 2, 4: 2, 5: 3 };
  function addBranches(nodes, defId, kind, dt, themes, wts) {
    ['x', 'y', 'z'].forEach(function (L, bi) {
      var T = THEMES[themes[bi]], w = (wts && wts[themes[bi]]) || 1, tier = [];
      var BR = defId && XY.SPU_BR && XY.SPU_BR[defId] && XY.SPU_BR[defId][bi], KEYIDX = { 1: 0, '3a': 1, '5a': 2, '5b': 3 };
      function mk(id, tname, fx, t, req, excl, extra) {
        var f = scaled(fx, w), ukey = null;
        if (kind === 'storm' && themes[bi] === 'elem' && id === L + '4a') f.chain = 1;
        var desc = fxText(f, dt, defId), nm = tname, bn = T.b;
        if (BR) {                                      // v0.4.1 常驻角色：分支名 / 节点名贴合主题，4 个节点带专属效果（sp12.js 读取）
          var oi = { 1: 0, 2: 1, '3a': 2, '4a': 3, '5a': 4, '3b': 5, '4b': 6, '5b': 7 }[id.slice(1)];
          nm = (oi === 4 || oi === 7 ? '★ ' : '') + BR.names[oi]; bn = BR.b;
          var ki = KEYIDX[id.slice(1)];
          if (ki !== undefined) { f[BR.key] = BR.vals[ki]; ukey = BR.key; var branchTotal=BR.vals[ki]+(ki===0?0:BR.vals[0]+(ki===2?BR.vals[1]:0)); desc = desc + '；' + XY.spuKeyText(BR, BR.vals[ki], branchTotal, defId); }
        }
        var n = { id: id, kind: 'deep', br: L, tier: t, name: nm, max: 1, cost: [DEEP_COST[t]], desc: [desc], fx: f, req: [req], excl: excl, bname: bn, theme: themes[bi], ukey: ukey };
        if (bi === 2 && kind) n.needB3 = true; // 只有常驻特殊角色的第三分支受角色卡 Lv4 限制
        if (extra) for (var k in extra) n[k] = extra[k];
        nodes.push(n);
      }
      var base = { m2: 1 };
      mk(L + '1', T.t1[0], T.t1[1], 1, base, []);
      mk(L + '2', T.t2[0], T.t2[1], 2, (function () { var r = {}; r[L + '1'] = 1; return r; })(), []);
      ['A', 'B'].forEach(function (p) {
        var s = p.toLowerCase(), list = T[p][1], prev = L + '2';
        list.forEach(function (e, k) {
          var id = L + (3 + k) + s, r = {}; r[prev] = 1;
          mk(id, e[0], e[1], 3 + k, r, k === 0 ? [L + '3' + (s === 'a' ? 'b' : 'a')] : [], { path: p, pname: T[p][0] });
          prev = id;
        });
      });
      nodes.filter(function (n) { return n.br === L; }).forEach(function (n) { n.bi = bi; });
    });
  }

  /* ---------- 生成每个英雄 / 常驻角色的树 ---------- */
  XY.TREE = {};
  // The fixed parts of a support must not inherit a generic rank multiplier.
  XY.spsupText = function(pid,sid,level){
    var l=Math.max(1,Math.min(3,+level||1)),f=1+.35*(l-1),n=function(v){return Math.round(v*100)/100;},s='';
    switch(pid+':'+sid){
      case 'phyrex:s1':s='周围380范围内敌人受到的法术伤害增加'+n(15*f)+'%，持续6秒。';break;
      case 'phyrex:s2':s='放下持续8秒的矿机，范围240内每0.5秒砸击一名敌人，基础伤害'+n(16*f)+'；附近召唤友军攻速+40%。';break;
      case 'phyrex:s3':s='随机缩小450范围内最多'+l+'只尚未缩水的普通敌人：当前及最大生命减半、攻击伤害降低30%、体型缩小40%；精英、首领和敌塔不受影响。';break;
      case 'sisi:s1':s='320范围内存活英雄清除眩晕和减速，并获'+n(6*f)+'%最大生命护盾；召唤友军获'+n(25*f)+'%护盾。双方减伤15%，持续'+n(4*f)+'秒。英雄不含唐僧；总吸收护盾最多为自身生命上限的90%。';break;
      case 'sisi:s2':s='优先随机强化一名召唤友军：伤害+50%、攻速+40%或射程+120，三选一，持续'+n(8*f)+'秒。没有召唤友军时强化第一位存活护法，改为伤害+40%、攻速+40%或移速+15%。';break;
      case 'sisi:s3':s='攻击450范围内最近敌人，造成'+n(26*f)+'基础法术伤害并击退，眩晕至多0.2秒；首领和抗性会限制控制效果。';break;
      case 'haiteng:s1':s='生成持续6秒的收缩圈，半径由380缩至130。460范围内处于圈外的敌人每0.4秒受到'+n(11*f)+'基础伤害。';break;
      case 'haiteng:s2':s='腾EO存活且已学此技时，队伍每关共享1次救命：致命伤时恢复'+[50,60,70][l-1]+'%最大生命，并无敌2秒；不含唐僧。治疗分支可提高恢复量，最多满血；额外次数来自对应分支。';break;
      case 'haiteng:s3':s='为700范围内生命比例最低的存活护法或召唤友军增加'+n(22*f)+'%最大生命护盾，不含唐僧；总吸收护盾最多为自身生命上限的90%。';break;
      case 'laosiji:s1':s='380范围内敌人受到的伤害增加'+n(12*f)+'%，持续6秒，并留下标记。';break;
      case 'laosiji:s2':s='向最近敌人方向冲刺480距离，碰撞基础伤害'+n(40*f)+'，冲刺时短暂无敌；沿路留下5片火区，持续3秒，每0.5秒造成'+n(8*f)+'基础伤害。';break;
      case 'laosiji:s3':s='留下生命为'+n(260*f)+'的诱敌分身，持续'+n(3+.5*(l-1))+'秒。分身不攻击，会吸引420范围内敌人；矿工的诱敌优先。';break;
      case 'kuanggong:s1':s='附近300范围内至少有3名敌人时发动嘲讽，420范围内的敌人优先追击自己，持续'+n(3+.5*(l-1))+'秒。';break;
      case 'kuanggong:s2':s='每30秒获得'+(6+3*(l-1))+'金币。战斗每经过90秒，每次再增加'+(6+3*(l-1))+'金币，最多增5档；最高每次'+((6+3*(l-1))*6)+'金币。';break;
      case 'kuanggong:s3':s='存活时，金币掉落概率提高'+n(10*f)+'%（按原概率计算）。';break;
      case 'yuanzhang:s1':s='优先为最近召唤友军补满生命、延寿3秒，并使伤害+50%、攻速+40%，持续'+n(4*f)+'秒。无召唤友军时，为最低生命比例的存活护法恢复'+n(25*f)+'%最大生命，并使伤害+40%、持续4秒；不含唐僧。';break;
      case 'yuanzhang:s2':s='每12秒准备一盏引魂灯，下次击杀额外掉落'+Math.round(4*f)+'金币，随后重新计时。只储存一次，不是随机几率。';break;
      case 'yuanzhang:s3':s='前方330范围、约69度扇形内敌人减速'+n(Math.min(.7,.4*f)*100)+'%，持续3秒（首领效果减半）；受到的伤害增加'+n(12*f)+'%，持续4秒。';break;
      case 'heyuxi:s1':s='移速+30%、攻速+15%，持续'+n(6*f)+'秒；升级延长持续时间，不提高这两项百分比。';break;
      case 'heyuxi:s2':s='附近至少有3名敌人时，将650范围内最远的非首领、非敌塔目标拉到距自己110处，并眩晕0.6秒。';break;
      case 'heyuxi:s3':s='在650范围内的敌人附近接连落下'+(5+2*(l-1))+'次音符，间隔0.15秒；每次在半径75内造成'+n(28*f)+'基础法术伤害。';break;
      case 'diaoyulao:s1':s='自身造成伤害时有'+n(8*f)+'%几率使此次伤害翻倍；触发好运后，另有30%几率获得2金币。';break;
      case 'diaoyulao:s2':s='320范围内存活护法恢复'+n(14*f)+'%最大生命，并加速3秒（默认移速+45%）；召唤友军恢复'+n(30*f)+'%最大生命。英雄不含唐僧。';break;
      case 'diaoyulao:s3':s='自身生命低于40%时，获得'+n(25*f)+'%最大生命护盾，并刷新特性冷却；总吸收护盾最多为自身生命上限的90%。';break;
      case 'martin:s1':s='花10金币，为600范围内生命比例最低的存活护法或召唤友军增加'+n(40*f)+'%最大生命护盾，不含唐僧；总吸收护盾最多为自身生命上限的90%。';break;
      case 'martin:s2':s='每'+[75,65,55][l-1]+'秒令所有存活护法移速+10%、减伤10%，持续8秒；不含唐僧。';break;
      case 'martin:s3':s='每次受伤积累1层老兵，每层减伤'+n(3*f)+'%，基础最多8层（合计'+n(24*f)+'%）；对应分支可增加层数上限和每层效果；老兵这一项减伤最多80%，没有反伤。';break;
      default:return null;
    }
    var d=XY.spsupDef(pid,sid),cd=d&&d.cd&&d.cd[l-1];
    return s+(cd?' 冷却'+cd+'秒。':d&&d.passive?' 被动。':'');
  };

  function buildTree(def, isSp) {
    var nodes = [], W = XY.WEAPON_DESC[def.id], B = BRANCH[def.id], key = isSp ? def.arch : def.id, dt = def.dtype || 'phys';
    if (!isSp) {
      nodes.push({ id: 'm1', kind: 'main', name: def.weapon + '·一阶', max: 1, cost: [1], desc: [W[0]], req: [{}], excl: [] });
      nodes.push({ id: 'm2', kind: 'main', name: def.weapon + '·二阶', max: 1, cost: [1], desc: [W[1]], req: [{ m1: 1 }], excl: [] });
      nodes.push({ id: 'ma', kind: 'main', name: B.a, branch: 'A', max: 2, cost: [2, 2], desc: [W[2], W[3]], req: [{ m2: 1 }, { m2: 1 }], excl: ['mb'] });
      nodes.push({ id: 'mb', kind: 'main', name: B.b, branch: 'B', max: 2, cost: [2, 2], desc: B.bd, req: [{ m2: 1 }, { m2: 1 }], excl: ['ma'] });
    } else {
      nodes.push({ id: 'm1', kind: 'main', name: def.weapon + '·精进', max: 1, cost: [1], desc: ['攻击速度提高10%，大招对普通妖怪的基础威力提高25%' + (def.id === 'phyrex' ? '；燃烧 BTC 币多发一枚' : '')], req: [{}], excl: [] });
      nodes.push({ id: 'm2', kind: 'main', name: def.weapon + '·大成', max: 1, cost: [1], desc: ['伤害提高12%，攻速再提高8%（两阶累计18.8%），大招对普通妖怪的基础威力累计提高50%' + (def.id === 'phyrex' ? '；环绕 BTC 币增加一枚' : '')], req: [{ m1: 1 }], excl: [] });
    }
    if (isSp) {                                        // 常驻角色：3 个专属辅助技能（s1 s2 s3，真实生效，见 spsup.js）
      [0, 1, 2].forEach(function (k) {
        var sd = XY.spsupDef(def.id, 's' + (k + 1)), cds = sd.cd;
        nodes.push({ id: 's' + (k + 1), kind: 'support', name: sd.name, max: 3, cost: SUP_COST, req: SUP_REQ, excl: [], sp: true,
          desc: [1, 2, 3].map(function (l) { return XY.spsupText(def.id, 's' + (k + 1), l) || (sd.effect + '【Lv' + l + (sd.passive ? '，被动' : (cds[l - 1] ? '，冷却 ' + cds[l - 1] + ' 秒' : '')) + '】'); }) });
      });
    }
    (isSp ? [] : COMMON.concat([SPECIAL[def.id]])).forEach(function (n) {
      if (def.id === 'tang' && (n.id === 'vital' || n.id === 'leech')) return;   // 唐僧永远 1 点血：没有生命 / 吸血类技能
      nodes.push({ id: n.id, kind: 'support', name: n.name, max: 3, cost: SUP_COST, desc: n.desc, req: SUP_REQ, excl: [] });
    });
    var themes = PICK[key].slice();
    if (isSp && XY.SPU_BR && XY.SPU_BR[def.id]) themes = XY.SPU_BR[def.id].map(function (s) { return s.th; });
    addBranches(nodes, def.id, isSp ? def.arch : null, dt, themes, WEIGHT[isSp ? def.arch : def.id]);
    var by = {}; nodes.forEach(function (n) { by[n.id] = n; });
    XY.TREE[def.id] = { nodes: nodes, by: by, themes: themes, sp: !!isSp };
  }
  XY.HEROES.forEach(function (d) { buildTree(d, false); });
  XY.SPECIALS.forEach(function (d) { buildTree(d, true); });
  XY.DEEP_BR = ['x', 'y', 'z'];

  /* ---------- 节点类型（v0.5）：攻击 / 速度 / 防御 / 辅助 / 控制 / 召唤 / 经济，界面上用颜色 + 图标区分 ---------- */
  XY.NODE_TYPES = {
    atk: { name: '攻击', icon: '剑', color: '#d9432e' }, spd: { name: '速度', icon: '疾', color: '#2f9bd6' }, def: { name: '防御', icon: '盾', color: '#6b7f3a' },
    aux: { name: '辅助', icon: '佛', color: '#d19a14' }, ctl: { name: '控制', icon: '缚', color: '#8a52c0' }, sum: { name: '召唤', icon: '兵', color: '#1fa08a' }, eco: { name: '经济', icon: '财', color: '#c2762a' }
  };
  var FXT = { dmg: 'atk', crit: 'atk', bossDmg: 'atk', weakDmg: 'atk', tmain: 'atk', tother: 'atk', ultPow: 'atk', chain: 'atk',
    atkSpd: 'spd', move: 'spd', ultCd: 'spd', traitCd: 'spd', hpAdd: 'def', dr: 'def', pdef: 'def', mdef: 'def', regen: 'def', stDef: 'def',
    healMul: 'aux', auraMul: 'aux', stRegen: 'aux', capAdd: 'sum', solDmg: 'sum', solLife: 'sum', solCost: 'sum', solSky: 'sum', slow: 'ctl' };
  var SUPT = { vital: 'def', fire: 'atk', chill: 'ctl', leech: 'aux', boom: 'atk', swift: 'spd', sp: 'aux' };
  var PARTYT = { p_dmg: 'atk', p_spd: 'spd', p_hp: 'def', p_move: 'spd', p_ult: 'spd', p_regen: 'aux', p_xp: 'eco', p_pick: 'eco', p_camp: 'def', p_tower: 'sum', p_sky: 'sum' };
  function kwType(tx) {      // 常驻角色的专属辅助：按名字 + 效果文字归类（先看特征强的类型）
    if (/召唤|天兵|分身|傀儡|随从|召来|小弟|仆/.test(tx)) return 'sum';
    if (/金币|灵石|经验|掉落|拾取|吸取|收益|财|宝石/.test(tx)) return 'eco';
    if (/减速|冻|眩晕|定身|控制|禁锢|击退|沉默|拉|聚拢|嘲讽|恐惧|束缚/.test(tx)) return 'ctl';
    if (/移速|移动速度|冲刺|闪|加速|攻速|攻击速度|冷却/.test(tx)) return 'spd';
    if (/护盾|减伤|格挡|无敌|免伤|生命上限|吸收/.test(tx)) return 'def';
    if (/治疗|回血|回复|恢复|复活|净化|增益|全队|光环|祝福/.test(tx)) return 'aux';
    return 'atk';
  }
  XY.nodeType = function (n) {
    if (!n) return XY.NODE_TYPES.atk;
    if (n.ntype) return XY.NODE_TYPES[n.ntype];
    var t = 'aux';
    if (n.kind === 'party') t = PARTYT[n.id] || 'aux';
    else if (n.kind === 'main') t = 'atk';
    else if (n.kind === 'support') t = n.sp ? kwType((n.name || '') + ' ' + ((n.desc && n.desc[0]) || '')) : (SUPT[n.id] || 'aux');
    else if (n.fx) { var k = Object.keys(n.fx)[0]; t = FXT[k] || 'aux'; }
    n.ntype = t; return XY.NODE_TYPES[t];
  };
  XY.nodeTypeKey = function (n) { XY.nodeType(n); return n.ntype; };

  /* ---------- 全队页 ---------- */
  var PC = [1, 1, 2, 2, 3];
  function pct(a) { return function (l) { return a * l; }; }
  XY.PARTY_NODES = [
    { id: 'p_dmg',   name: '全队·力量',   max: 5, eff: function (l) { return '全队伤害 +' + 12 * l + '%'; } },
    { id: 'p_spd',   name: '全队·疾风',   max: 5, eff: function (l) { return '全队攻击速度 +' + 10 * l + '%'; } },
    { id: 'p_hp',    name: '全队·体魄',   max: 5, eff: function (l) { return '存活护法最大生命累计增加' + 15 * l + '%（不含唐僧）；提升上限时补足新增生命，本次学习再恢复15%最大生命'; } },
    { id: 'p_move',  name: '全队·轻功',   max: 4, eff: function (l) { return '全队移动速度 +' + 8 * l + '%'; } },
    { id: 'p_ult',   name: '全队·法力',   max: 4, eff: function (l) { return '大招冷却 -' + Math.round((1 - Math.pow(0.88, l)) * 10000)/100 + '%'; } },
    { id: 'p_regen', name: '全队·回春',   max: 4, eff: function (l) { return '存活护法每秒恢复' + (0.6 * l).toFixed(1) + '生命，不含唐僧，不复活阵亡者'; } },
    { id: 'p_xp',    name: '全队·悟性',   max: 4, eff: function (l) { return '获得的经验 +' + 12 * l + '%'; } },
    { id: 'p_pick',  name: '全队·磁石',   max: 4, eff: function (l) { return '捡宝石和金币的范围 +' + 35 * l + '%'; } },
    { id: 'p_camp',  name: '营地·加固',   max: 3, eff: function (l) { return '营地血量上限 +' + 300 * l + '（学的时候修好 300）'; } },
    { id: 'p_tower', name: '天兵·兵器强化', max: 3, eff: function (l) { return '全队部署天兵伤害增加' + 25 * l + '%'; } },
    { id: 'p_sky',   name: '召唤·增援',   max: 2, cost: [2, 3], eff: function (l) { return '召唤特殊人物的冷却 −' + 10 * l + ' 秒（现在 ' + (60 - 10 * l) + ' 秒）'; } }
  ];
  XY.PARTY_NODES.forEach(function (n) { n.kind = 'party'; if (!n.cost) n.cost = PC.slice(0, n.max); n.req = []; n.excl = []; });
  XY.PARTY_BY = {}; XY.PARTY_NODES.forEach(function (n) { XY.PARTY_BY[n.id] = n; });

  /* ---------- 查询 ---------- */
  XY.skLv = function (h, id) { return (h.sk && h.sk[id]) || 0; };
  XY.partyLv = function (G, id) { return G.upg[id] || 0; };
  XY.nodeText = function (n, l) { if (l <= 0) return '（还没学）'; return n.desc ? n.desc[l - 1] : n.eff(l); };
  XY.supportCount = function (h) {
    var c = 0; XY.TREE[h.id].nodes.forEach(function (n) { if (n.kind === 'support' && XY.skLv(h, n.id) > 0) c++; });
    return c;
  };
  XY.heroSpent = function (h) {
    var t = 0, tr = XY.TREE[h.id];
    tr.nodes.forEach(function (n) { for (var l = 0; l < XY.skLv(h, n.id); l++) t += n.cost[l]; });
    return t;
  };

  // 这个节点现在能不能学？返回 { st: 'max'|'ok'|'locked'|'nopts', reason, cost, lv, node }
  // hi = 英雄编号；hi = -1 表示全队页
  XY.nodeStatus = function (G, hi, id) {
    var n, lv, h = null;
    if (hi < 0) { n = XY.PARTY_BY[id]; lv = XY.partyLv(G, id); }
    else { h = G.heroes[hi]; n = XY.TREE[h.id].by[id]; lv = XY.skLv(h, id); }
    if (!n) return { node: null, lv: 0, cost: 0, st: 'locked', reason: '这位英雄没有这个技能' };
    var r = { node: n, lv: lv, cost: lv < n.max ? n.cost[lv] : 0, st: 'ok', reason: '' };
    if (lv >= n.max) { r.st = 'max'; r.reason = '已满级'; return r; }
    if (h && h.down) { r.st = 'locked'; r.reason = h.def.name + ' 已阵亡，不能再加点'; return r; }
    if (h) {
      var tr = XY.TREE[h.id], i;
      for (i = 0; i < n.excl.length; i++) {
        if (XY.skLv(h, n.excl[i]) > 0) { r.st = 'locked'; r.reason = '已经选了「' + tr.by[n.excl[i]].name + '」分支，二选一，不能再学'; return r; }
      }
      if (n.needB3 && !(h.def.branch3)) { r.st = 'locked'; r.reason = '第三条分支要常驻角色升到 Lv4 才开放'; return r; }
      var rq = n.req[lv] || {};
      for (var k in rq) {
        if (XY.skLv(h, k) < rq[k]) { r.st = 'locked'; r.reason = '要先学「' + tr.by[k].name + '」' + (tr.by[k].max > 1 ? ' ' + rq[k] + ' 级' : ''); return r; }
      }
      if (n.kind === 'support' && lv === 0 && XY.supportCount(h) >= XY.MAX_SUPPORTS) {
        r.st = 'locked'; r.reason = '辅助技能最多学 ' + XY.MAX_SUPPORTS + ' 种了'; return r;
      }
    }
    if (G.points < r.cost) { r.st = 'nopts'; r.reason = '技能点不够（要 ' + r.cost + ' 点，现在有 ' + G.points + ' 点）'; return r; }
    return r;
  };

  // 学习（花点数）。返回 { ok, reason }
  XY.learn = function (G, hi, id) {
    var s = XY.nodeStatus(G, hi, id);
    if (s.st !== 'ok') return { ok: false, reason: s.reason };
    G.points -= s.cost;
    if (hi < 0) XY.onPartyLearn(G, id);
    else { var h = G.heroes[hi]; h.sk[id] = s.lv + 1; XY.onHeroLearn(G, h, id); }
    return { ok: true, reason: '学会了「' + s.node.name + '」 Lv' + (s.lv + 1) };
  };

  /* ---------- 属性换算：技能等级 → h.mod ---------- */
  XY.computeMods = function (h) {
    var s = h.sk, id = h.id, L = function (k) { return s[k] || 0; };
    var m = { crit: 0, dr: 0, atkSpd: 1, ultCd: 1, ultPow: 1, auraMul: 1, move: 1, hpAdd: 0,
              burn: 0, slowF: 0, leech: 0, boomP: 0, boomDmg: 30, killHeal: 0, stRegen: 1, stDef: 0 };
    var b = L('mb');
    switch (id) {
      case 'tang':   m.auraMul += [0, 0.5, 1][b]; m.stRegen *= [1, 1.5, 2][b]; break;
      case 'wukong': m.atkSpd *= [1, 1.25, 1.5][b]; m.ultPow *= [1, 1.2, 1.4][b]; break;
      case 'bajie':  m.dr += [0, 0.08, 0.16][b]; m.ultCd *= [1, 0.85, 0.7][b]; break;
      case 'wujing': m.ultPow *= [1, 1.3, 1.6][b]; m.ultCd *= [1, 0.9, 0.8][b]; break;
      case 'horse':  m.atkSpd *= [1, 1.2, 1.4][b]; m.ultPow *= [1, 1.25, 1.5][b]; break;
    }
    m.hpAdd = [0, 20, 40, 70][L('vital')]; if (L('vital') >= 3) m.dr += 0.05;
    // v0.4：这些都是“主动技能”，数值在 game.js 的脉冲里用；冷却见 XY.SUP
    m.burn = [0, 4, 8, 12][L('fire')];                 // 火眼：每秒灼烧
    m.slowF = [0, 0.2, 0.35, 0.5][L('chill')];         // 寒水：减速比例
    m.leech = [0, 0.08, 0.12, 0.16][L('leech')];       // 佛法：全队回血比例
    m.boomN = [0, 2, 3, 4][L('boom')];                 // 爆裂：爆炸堆数
    m.boomDmg = 30 + 20 * L('boom');
    m.swiftBoost = L('swift') > 0 ? 0.45 : 0;          // 疾步：加速比例
    var sp = L('sp');
    switch (id) {
      case 'tang':   m.stRegen *= [1, 1.25, 1.5, 2][sp]; m.stDef = [0, 0.05, 0.10, 0.15][sp]; break;
      case 'wukong': m.crit = [0, 0.1, 0.2, 0.3][sp]; break;
      case 'bajie':  m.killHeal = sp; break;
      case 'wujing': m.dr += [0, 0.06, 0.12, 0.18][sp]; break;
      case 'horse':  m.ultCd *= [1, 0.9, 0.8, 0.7][sp]; break;
    }
    // 深度分支 / 常驻角色的主技能精进：fx 统一折算
    var tr = XY.TREE[id], MULK = { dmg: 1, atkSpd: 1, ultPow: 1, move: 1, ultCd: 1, traitCd: 1, healMul: 1, auraMul: 1, stRegen: 1 };
    m.dmg = 1; m.traitCd = 1; m.healMul = 1; m.pdef = 0; m.mdef = 0; m.weakDmg = 0; m.bossDmg = 0; m.typeDmg = { phys: 0, magic: 0 }; m.regen = 0; m.chain = 0;
    if (tr && tr.sp) { if (L('m1')) m.atkSpd *= 1.10; if (L('m2')) { m.dmg *= 1.12; m.atkSpd *= 1.08; } }
    var dtm = (h.def && h.def.dtype) || 'phys', dto = dtm === 'magic' ? 'phys' : 'magic';
    if (tr) tr.nodes.forEach(function (n) {
      if ((n.kind !== 'deep' && n.kind !== 'extra') || !s[n.id]) return;
      var nlv = n.kind === 'extra' ? s[n.id] : 1;      // 专属强化可升多级：效果 × 等级
      Object.keys(n.fx).forEach(function (k) {
        var v = n.fx[k] * nlv;
        if (k === 'tmain') m.typeDmg[dtm] += v; else if (k === 'tother') m.typeDmg[dto] += v;
        else if (MULK[k]) m[k] *= (1 + v);
        else m[k] = (m[k] || 0) + v;
      });
    });
    h.wlv = 1 + L('m1') + L('m2') + L('ma');       // 主技能等级 1~5（沿用武器等级表）
    return m;
  };

  /* ---------- 自动加点（可选）：轮流给每个活着的英雄和全队页加点 ---------- */
  var AUTO_HERO = ['m1', 'm2', 'ma', 'x1', 'x2', 'x3a', 'x4a', 'x5a', 'vital', 'leech', 'sp', 'y1', 'y2', 'y3a', 'y4a', 'y5a', 'fire', 'boom', 'chill', 'swift', 's1', 's2', 's3', 'z1', 'z2', 'z3a', 'z4a', 'z5a']   // 唐僧没有 vital / leech，会被自动跳过;
  var AUTO_PARTY = ['p_dmg', 'p_hp', 'p_camp', 'p_spd', 'p_regen', 'p_ult', 'p_xp', 'p_tower', 'p_move', 'p_pick'];
  XY.autoSpendOne = function (G) {
    var targets = G.heroes.map(function (h, k) { return k; }).concat([-1]), t, i, n = targets.length;
    for (t = 0; t < n; t++) {
      var hi = targets[(G.autoIdx + t) % n], list = hi < 0 ? AUTO_PARTY : AUTO_HERO;
      if (hi >= 0 && G.heroes[hi].down) continue;
      for (i = 0; i < list.length; i++) {
        if (XY.nodeStatus(G, hi, list[i]).st === 'ok') { XY.learn(G, hi, list[i]); G.autoIdx = (G.autoIdx + t + 1) % n; return true; }
      }
    }
    return false;
  };
  XY.AUTO_HERO = AUTO_HERO; XY.AUTO_PARTY = AUTO_PARTY;
  // 旧版本在升级时给每名 AI 复制一份技能点，且留着玩家点数反而
  // 解锁更多免费分支。保留调用接口以兼容旧模块，但不再凭空学习；
  // 开启自动加点后，由 gainPoints → autoSpend 正常消费公共点数。
  // 五档难度：凡 / 灵档恢复「徒弟各自成长」——没被操控的徒弟每升一级各自多拿修行点；仙档及以上不变（全队共用点数池）。
  XY.followGrow = function (G, n) {
    var k = G && G.diff ? G.diff.follow : 0; if (!k || G.tut || G.villain) return;
    G.heroes.forEach(function (h, hi) {
      if (hi === G.ctrl || h.down) return;
      h.fp = (h.fp || 0) + n * k; var guard = 0;
      for (var i = 0; i < AUTO_HERO.length && guard < 80; i++) {
        var st = XY.nodeStatus(G, hi, AUTO_HERO[i]);
        if (st.st === 'ok' && st.cost <= h.fp) { var save = G.points; G.points = st.cost; XY.learn(G, hi, AUTO_HERO[i]); G.points = save; h.fp -= st.cost; i = -1; guard++; }
      }
    });
  };
  XY.autoSpend = function (G) { var n = 0; while (G.points > 0 && n++ < 60 && XY.autoSpendOne(G)); };
})();
