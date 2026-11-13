/* 第二关、第三关天兵层的纯规则。不改英雄伤害、不改关卡怪的血量。
 * 第二关起另加飞妖（出怪表里只加这一项）。浏览器和 node 测试共用。
 */
(function (root) {
  'use strict';
  var R = {};
  R.VERSION = '0.8.8';
  /* 不再为了凑伤害占比把一箭放大到秒杀。
   * 第二关 3.2：弓对小妖大约四下，两名跟随弓兵能在蝠妖俯冲落地前打死它。
   * 第三关 3.6：怪更厚，连携和升级（1.25 / 1.55）才是清精英的部分。 */
  R.TOWER_DMG_MUL = { 2: 3.2, 3: 3.6 };
  R.START_GRANT = { 2: 120, 3: 160 };
  R.WAVE_BOUNTY = { 2: 6, 3: 8 };
  R.TIDE_BOUNTY = { 2: 15, 3: 20 };
  R.WAVE_COIN = 0.5;
  R.FILL_COIN = 0.2;
  R.LIFE_MUL = 1.3;
  R.GAP = 12;
  R.BASE_COST = { arrow: 30, cannon: 70, frost: 50, siege: 90, heal: 70 };

  R.gate = function (g) {
    g = g || {};
    if ((g.levelId | 0) < 2) return false;
    if (g.noJourney || g.lair || g.villain || g.dungeon || g.mod) return false;
    return true;
  };
  R.formationOn = function (g) { return R.gate(g) && (g.levelId | 0) >= 3; };

  R.price = function (type, kind, disc) {
    var base = R.BASE_COST[type];
    if (!base) return 0;
    var k = kind === 'up3' ? 1.5 : 1;
    return Math.round(base * k * (disc == null ? 1 : disc));
  };

  /* started=false：开战前全额。开战后退 floor(投资 × 0.7 × min(血比, 寿比))。免费弓的投资不含白送的本体。 */
  R.refund = function (paid, hp, maxHp, life, maxLife, started) {
    paid = Math.max(0, paid || 0);
    if (!started) return paid;
    var hpR = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
    var lifeR = maxLife > 0 ? Math.max(0, Math.min(1, life / maxLife)) : 0;
    return Math.floor(paid * 0.7 * Math.min(hpR, lifeR));
  };

  R.rank = {
    dmg: { 1: 1, 2: 1.25, 3: 1.55 },
    slowTime: { 1: 1, 2: 1.15, 3: 1.3 },
    heal: { 1: 1, 2: 1.1, 3: 1.2 },
    hp: { 1: 1, 2: 1.15, 3: 1.3 }
  };
  R.rankOf = function (table, lv) { return table[lv] || table[1]; };

  /* 炮是地面溅射，打不着飞妖。弓、寒冰、破阵弹道、佛光脉冲打得着。 */
  R.hitsFlyer = function (type) {
    return type === 'arrow' || type === 'frost' || type === 'siege' || type === 'heal';
  };
  /* 飞妖伤害门。返回 true 表示这一下要取消。炮、英雄、法宝、大招、援军都取消。 */
  R.blockFlyer = function (hit) {
    if (!hit || !hit.flyer) return false;
    if (hit.cannon) return true;
    if (hit.tower || hit.combo) return false;
    return true;
  };
  R.towerUntargetable = function (tdOn) { return !!tdOn; };

  R.FORM_MIN = 4;
  R.FORM_MAX = 8;
  R.FORM_RANK_MAX = 3;
  /* 唐僧在阵里时，另外给阵中其他人的少量回血。攻防加成走 R.bonus，不改英雄基础伤害。 */
  R.TANG_GUARD = { regen: 3 };
  R.charge = function (cur, dt, sec) { return Math.min(1, (cur || 0) + (dt || 0) / (sec || 16)); };

  /* 每波额外飞妖。第一关不走这里。 */
  R.flyerPack = function (levelId, wave) {
    var lv = levelId | 0, n = wave | 0;
    if (lv < 2) return { bat: 0, owl: 0 };
    if (lv === 2) return { bat: 2, owl: n % 3 === 2 ? 1 : 0 };
    return { bat: 3, owl: n % 2 === 1 ? 1 : 0 };
  };

  /* 弓 ×1.3 对飞妖；炮不对空（调用方直接不打）；破阵对 tank/shield/elite ×1.4。返回额外倍率（0 表示不加）。 */
  R.counterExtra = function (towerType, enemy) {
    enemy = enemy || {};
    if (towerType === 'arrow' && enemy.fly) return 0.3;
    if (towerType === 'cannon' && enemy.fly) return -1;
    if (towerType === 'siege' && (enemy.type === 'tank' || enemy.type === 'shield' || enemy.type === 'elite' || enemy.elite)) return 0.4;
    return 0;
  };

  R.snapRadius = function (zoom) { return Math.max(60, 44 / (zoom || 1)); };

  /* 推荐位：沿路线累计距离取点，再沿法线偏出。不使用屏幕坐标。
   * route.at(s) 返回 {x,y,a}。第三关是前方 2 个加营地四向各 1 个。 */
  R.spots = function (levelId, route, camp) {
    var out = [], i, dists = (levelId | 0) >= 3 ? [420, 860] : [240, 520, 880, 1280, 1760];
    for (i = 0; i < dists.length; i++) {
      var s = Math.max(80, Math.min(route.total * 0.82, dists[i]));
      var p = route.at(s);
      var nx = -Math.sin(p.a), ny = Math.cos(p.a), side = i % 2 ? 1 : -1;
      out.push({ x: p.x + nx * 96 * side, y: p.y + ny * 96 * side, s: s, kind: 'road', i: out.length });
    }
    if ((levelId | 0) >= 3 && camp) {
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (i = 0; i < dirs.length; i++) {
        out.push({ x: camp.x + dirs[i][0] * 140, y: camp.y + dirs[i][1] * 140, s: route.total * 0.5, kind: 'camp', i: out.length });
      }
    }
    return out;
  };

  R.snap = function (x, y, spots, zoom) {
    var rad = R.snapRadius(zoom), best = null, bd = rad, i, d, dx, dy;
    for (i = 0; i < spots.length; i++) {
      dx = spots[i].x - x; dy = spots[i].y - y; d = Math.sqrt(dx * dx + dy * dy);
      if (d <= bd) { bd = d; best = spots[i]; }
    }
    return best;
  };

  R.hitSize = function (zoom) { return Math.max(44, 44 / (zoom || 1)); };

  /* 阵效叠加进联防、香火之后，总和不超过 cap。返回还能加上的比例。 */
  R.room = function (used, add, cap) {
    cap = cap == null ? 0.5 : cap;
    return Math.max(0, Math.min(add, cap - (used || 0)));
  };

  /* 阵眼在圆心。其余人按这个阵自己的方位站。八卦留一个生门，不算人。 */
  var FORM_SPREAD = 1.75;
  function ringSlots(labels, radius, opt) {
    opt = opt || {};
    radius *= FORM_SPREAD;
    var skip = opt.skip, n = labels.length + (skip == null ? 0 : 1), start = opt.start == null ? -Math.PI / 2 : opt.start;
    var slots = [{ eye: true, x: 0, y: 0, label: '阵眼' }], k = 0, i, a, rr;
    for (i = 0; i < n; i++) {
      a = start + i * Math.PI * 2 / n;
      if (skip != null && i === skip) continue;
      rr = radius * (opt.squash && (i % 2) ? opt.squash : 1);
      slots.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr * (opt.flat || 1), label: labels[k++] });
    }
    return slots;
  }
  function wedgeSlots() {
    return [
      { eye: true, x: 0, y: 0, label: '阵眼' },
      { x: 210, y: 0, label: '锋' },
      { x: 96, y: 126, label: '左' },
      { x: 96, y: -126, label: '右' }
    ];
  }
  function arcSlots() {
    return [
      { eye: true, x: 0, y: 0, label: '阵眼' },
      { x: -150, y: 0, label: '后' },
      { x: -64, y: 156, label: '左' },
      { x: -64, y: -156, label: '右' }
    ];
  }
  R.FORMATIONS = [
    { id: 'sixiang', name: '四象阵', who: 'line', unlock: 3, size: 4, role: 'def', free: true,
      slots: ringSlots(['青龙', '白虎', '朱雀'], 108),
      effect: '守阵。少挨得多，连携回血。', short: '4 人 · 守',
      comboName: '四象回春', sec: 16, combo: { dmg: 10, rad: 170, slow: 1.1, heal: 0.12 } },
    { id: 'fengshi', name: '锋矢阵', who: 'line', unlock: 3, size: 4, role: 'atk', free: true,
      slots: wedgeSlots(),
      effect: '攻阵。攻击更高，阵位收成箭矢。', short: '4 人 · 攻',
      comboName: '锋矢破阵', sec: 16, combo: { dmg: 22, rad: 200, slow: 0.4, heal: 0.03 } },
    { id: 'quexie', name: '却邪阵', who: 'line', unlock: 3, size: 4, role: 'air',
      slots: arcSlots(),
      effect: '对空。连携多打飞妖。', short: '4 人 · 对空',
      comboName: '却邪射空', sec: 16, combo: { dmg: 14, rad: 210, slow: 0.8, heal: 0.02, air: 1.5 } },
    { id: 'wuxing', name: '五行阵', who: 'line', unlock: 3, size: 5, role: 'atk',
      slots: ringSlots(['金', '木', '水', '火'], 118),
      effect: '攻阵。金木水火围着阵眼。', short: '5 人 · 攻',
      comboName: '五行相生', sec: 16, combo: { dmg: 20, rad: 190, slow: 0.6, heal: 0.06 } },
    { id: 'jiejie', name: '结界阵', who: 'line', unlock: 3, size: 5, role: 'def',
      slots: ringSlots(['东', '南', '西', '北'], 86),
      effect: '守阵。圈子收得紧，减伤更高。', short: '5 人 · 守',
      comboName: '结界回护', sec: 17, combo: { dmg: 8, rad: 150, slow: 0.5, heal: 0.1 } },
    { id: 'hansuo', name: '寒锁阵', who: 'line', unlock: 3, size: 5, role: 'ctrl',
      slots: ringSlots(['冰', '霜', '凝', '滞'], 124, { squash: 0.7 }),
      effect: '控阵。连携把靠近的妖怪定住。', short: '5 人 · 控',
      comboName: '寒锁冰封', sec: 17, combo: { dmg: 12, rad: 180, slow: 1.6, stun: 1.1, heal: 0.02 } },
    { id: 'liuhe', name: '六合阵', who: 'line', unlock: 3, size: 6, role: 'ctrl',
      slots: ringSlots(['东', '南', '西', '北', '天'], 128),
      effect: '控阵。五方合上，能定飞妖。', short: '6 人 · 控',
      comboName: '六合锁空', sec: 16, combo: { dmg: 14, rad: 200, slow: 0.8, stun: 0.9, air: 1.2, heal: 0.03 } },
    { id: 'huichun', name: '回春阵', who: 'line', unlock: 3, size: 6, role: 'heal',
      slots: ringSlots(['生', '息', '养', '复', '荣'], 112, { flat: 0.82 }),
      effect: '回复。连携把血抬起来。', short: '6 人 · 回复',
      comboName: '回春生息', sec: 16, combo: { dmg: 8, rad: 160, slow: 0.4, heal: 0.16 } },
    { id: 'qixing', name: '七星阵', who: 'line', unlock: 3, size: 7, role: 'atk',
      slots: ringSlots(['天璇', '天玑', '天权', '玉衡', '开阳', '摇光'], 136),
      effect: '攻阵。六星环着天枢。', short: '7 人 · 攻',
      comboName: '七星坠野', sec: 17, combo: { dmg: 24, rad: 220, slow: 1.0, heal: 0.04 } },
    { id: 'tianluo', name: '天罗阵', who: 'line', unlock: 3, size: 7, role: 'air',
      slots: ringSlots(['罗', '网', '缴', '射', '落', '空'], 132, { start: -Math.PI / 3 }),
      effect: '对空。网住往下扑的飞妖。', short: '7 人 · 对空',
      comboName: '天罗落羽', sec: 17, combo: { dmg: 16, rad: 230, slow: 0.9, air: 1.6, heal: 0.03 } },
    { id: 'bagua', name: '八卦阵', who: 'line', unlock: 3, size: 8, role: 'def',
      slots: ringSlots(['乾', '坤', '震', '巽', '坎', '离', '艮'], 146, { skip: 5 }),
      gap: (function () { var a = -Math.PI / 2 + 5 * Math.PI * 2 / 8, r = 146 * 1.75; return { x: Math.cos(a) * r, y: Math.sin(a) * r, label: '生' }; })(),
      effect: '守阵。八人，兑位留生门。', short: '8 人 · 守',
      comboName: '天罗地网', sec: 18, combo: { dmg: 16, rad: 240, slow: 0.7, stun: 1.2, heal: 0.06 } },
    { id: 'zhuxie', name: '诛邪阵', who: 'line', unlock: 3, size: 8, role: 'atk',
      slots: ringSlots(['诛', '邪', '破', '军', '斩', '灭', '锋'], 150, { start: -Math.PI / 5 }),
      effect: '攻阵。人多，攻击加成最高一档。', short: '8 人 · 攻',
      comboName: '诛邪破军', sec: 18, combo: { dmg: 26, rad: 230, slow: 0.5, heal: 0.03 } },
    { id: 'zhenyue', name: '镇岳阵', who: 'line', unlock: 3, size: 8, role: 'ctrl',
      slots: ringSlots(['镇', '岳', '定', '山', '止', '戈', '安'], 124, { squash: 0.78 }),
      effect: '控阵。圈子压得低，减速和定身。', short: '8 人 · 控',
      comboName: '镇岳定身', sec: 18, combo: { dmg: 12, rad: 200, slow: 1.5, stun: 1.3, heal: 0.04 } }
  ];
  R.formById = function (id) {
    for (var i = 0; i < R.FORMATIONS.length; i++) if (R.FORMATIONS[i].id === id) return R.FORMATIONS[i];
    return null;
  };
  R.filled = function (seats) {
    var n = 0, i;
    for (i = 0; i < (seats || []).length; i++) if (seats[i]) n++;
    return n;
  };
  /* 不满 4 人不能成阵。每种阵还要坐满自己的阵位。 */
  R.formOk = function (def, seats) {
    var n = R.filled(seats);
    if (!def || n < R.FORM_MIN || n > R.FORM_MAX) return false;
    return n === def.size;
  };
  R.isTang = function (u) { return !!(u && u.id === 'tang' && !u.type); };
  R.ROLE_NAME = { atk: '攻', def: '守', ctrl: '控', air: '对空', heal: '回复' };
  /* 入阵同时加攻击和减伤。人数越大、阶数越高，加成越高，落在攻击 15%–40%、减伤 15%–35%。 */
  R.bonus = function (def, rank) {
    if (!def) return { atk: 0, dr: 0 };
    rank = Math.max(1, Math.min(R.FORM_RANK_MAX, rank || 1));
    var sizeK = (def.size - 4) / 4;
    var atk = 0.16 + sizeK * 0.10 + (rank - 1) * 0.06;
    var dr = 0.16 + sizeK * 0.06 + (rank - 1) * 0.05;
    if (def.role === 'atk') { atk += 0.08; dr -= 0.02; }
    else if (def.role === 'def') { dr += 0.08; atk -= 0.02; }
    else if (def.role === 'ctrl') { atk -= 0.01; dr += 0.02; }
    else if (def.role === 'air') { atk += 0.04; }
    else if (def.role === 'heal') { dr += 0.04; atk -= 0.02; }
    atk = Math.max(0.15, Math.min(0.40, atk));
    dr = Math.max(0.15, Math.min(0.35, dr));
    return { atk: Math.round(atk * 100) / 100, dr: Math.round(dr * 100) / 100 };
  };
  R.priceOf = function (def) {
    if (!def || def.free) return 0;
    return { 4: 40, 5: 80, 6: 130, 7: 190, 8: 260 }[def.size] || 100;
  };
  R.upPrice = function (def, rank) {
    if (!def || def.free && false) return 0;
    var base = def.free ? 40 : R.priceOf(def);
    return Math.round(base * (rank === 1 ? 0.75 : 1.1));
  };
  R.COMBOS = {};
  R.FORMATIONS.forEach(function (f) { R.COMBOS[f.id] = { name: f.comboName, sec: f.sec }; });
  R.unlocked = function (levelId) {
    if ((levelId | 0) < 3) return [];
    return R.FORMATIONS.slice();
  };

  R.FLY_HINT = '这一关有飞妖。飞妖直扑唐僧，只有天兵能打。';
  R.GUIDE2 = [
    { id: 'wait', text: '出发前先安排天兵。现在时间不走，怪也不会出来。飞妖只有天兵打得着。' },
    { id: 'pick', text: '点选一名已经在场的弓兵。' },
    { id: 'move', text: '把他调到唐僧前方的推荐位。虚线是他现在的真实射程。' },
    { id: 'hire', text: '再请一名已经有、也买得起的天兵。弓打飞妖，炮清地面上的一群，寒冰拖慢，破阵攻坚，佛光回血。' },
    { id: 'detail', text: '点开他，可以升级、犒赏或遣返。升级会把寿命补满。' },
    { id: 'go', text: '天兵守沿途，英雄去做任务。布置好了，自己点出发。' }
  ];
  R.GUIDE3 = [
    { id: 'open', text: '第三关可以布阵。点「阵型」，先看每阵要几个人。' },
    { id: 'sixiang', text: '选四象阵：一共 4 人，阵眼居中。唐僧、天兵、徒弟都能入。' },
    { id: 'confirm', text: '点阵位，再点人放入。不满 4 人不能成阵。站稳半秒才算成阵。' },
    { id: 'break', text: '阵员阵亡或天兵被遣返，阵效马上停。天兵不会被妖怪打死。唐僧仍沿路走。' },
    { id: 'bagua', text: '八卦阵是 8 人阵：阵眼在中，七个方位，兑位留作生门。' },
    { id: 'go', text: '五行、六合、七星的人数在阵名旁边。人数够了再确认，然后点出发。' }
  ];

  R.widgets = function (g) {
    if (!R.gate(g)) return [];
    var out = [{ act: 'tdStart' }, { act: 'tdTab', id: 'tower' }];
    if (R.formationOn(g)) out.push({ act: 'tdTab', id: 'form' });
    return out;
  };

  root.TDRules = R;
  if (typeof module !== 'undefined' && module.exports) module.exports = R;
})(typeof window !== 'undefined' ? window : globalThis);
