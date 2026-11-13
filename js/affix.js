/* ============================================================
 * affix.js —— 精英词缀（v0.5 第 4 批）
 * 每只精英牛头卫出生带 1 个随机词缀（头顶有彩色名牌 + 脚下一圈同色环，一眼能看出怎么打）：
 *   狂暴  rage   ：移速 +25%；血量低于一半时再 +20% 移速、伤害 ×1.5（一次性，飘字提示）
 *   重甲  plate  ：受到的伤害 ×0.7（打它要多花时间；法术 / 物理一样）
 *   回春  heal   ：每秒给周围 170 范围内所有妖怪（含自己）回 2% 最大生命 —— 应该先杀它
 *   召唤  summon ：每 8 秒叫来 2 只小妖，最多叫 4 次（总数受全图敌人上限约束）
 *   自爆  blast  ：死亡时在脚下炸开 130 范围，伤到范围内的徒弟 / 特殊角色（不伤唐僧——他一碰就倒，见 CHANGELOG 取舍）
 * 接口：XY.affixInit(e[,id]) / XY.affixTick(G,e,dt) / XY.affixHurt(e,dmg) / XY.affixDeath(G,e) / XY.affixDraw(c,G,e,rt)
 * 追剿令的追兵、洞府定时派出的精英也都带词缀（走同一个 makeEnemy）。
 * ============================================================ */
(function () {
  var XY = window.XY, C = XY.C;
  XY.AFFIXES = {
    rage:   { name: '狂暴', color: '#d9534f', tip: '跑得快，半血更凶' },
    plate:  { name: '重甲', color: '#7a8794', tip: '伤害 ×0.7' },
    heal:   { name: '回春', color: '#3fa56b', tip: '给周围妖怪回血，先杀它' },
    summon: { name: '召唤', color: '#8a5fc0', tip: '每 8 秒叫 2 只小妖' },
    blast:  { name: '自爆', color: '#e08a1e', tip: '死亡时爆炸' }
  };
  XY.AFFIX_IDS = ['rage', 'plate', 'heal', 'summon', 'blast'];
  C.AFFIX_HEAL_R = 170; C.AFFIX_HEAL_PCT = 0.02; C.AFFIX_PLATE = 0.7; C.AFFIX_SUMMON_T = 8; C.AFFIX_SUMMON_N = 2; C.AFFIX_SUMMON_MAX = 4; C.AFFIX_BLAST_R = 130; C.AFFIX_BLAST_DMG = 1.4;

  XY.affixInit = function (e, id) {
    if (e.affix) return;                                           // 不重复叠加
    id = id || XY.AFFIX_IDS[Math.floor(Math.random() * XY.AFFIX_IDS.length)];
    e.affix = id; e.afT = id === 'heal' ? 1 : 3 + Math.random() * 3; e.afN = 0; e.afRaged = false;
    if (id === 'rage') e.speed *= 1.25;
  };
  XY.affixTick = function (G, e, dt) {
    var id = e.affix, K = XY.core, i, o;
    if (!id) return;
    if (id === 'rage') {
      if (!e.afRaged && e.hp < e.maxHp * 0.5) { e.afRaged = true; e.speed *= 1.2; e.dmg *= 1.5; K.text(G, e.x, e.y - e.r - 30, '狂暴！', 'counter', '#d9534f'); K.ring(G, e.x, e.y, e.r + 50, '#d9534f', 0.5, true); }
    } else if (id === 'heal') {
      e.afT -= dt;
      if (e.afT <= 0) {
        e.afT = 1; var n = 0, R2 = C.AFFIX_HEAL_R * C.AFFIX_HEAL_R;
        for (i = 0; i < G.enemies.length; i++) {
          o = G.enemies[i]; if (o.dead || o.retreatT > 0 || o.def.etower) continue;
          var dx = o.x - e.x, dy = o.y - e.y; if (dx * dx + dy * dy > R2) continue;
          if (o.hp < o.maxHp) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * C.AFFIX_HEAL_PCT); n++; }
        }
        if (n && !G._lod) K.ring(G, e.x, e.y, C.AFFIX_HEAL_R * 0.8, '#3fa56b', 0.6);
        G.stats.affixHeals = (G.stats.affixHeals || 0) + n;
      }
    } else if (id === 'summon') {
      e.afT -= dt;
      if (e.afT <= 0 && e.afN < C.AFFIX_SUMMON_MAX) {
        e.afT = C.AFFIX_SUMMON_T;
        if (G.enemies.length < C.MAX_ENEMIES - 4) {
          e.afN++;
          for (i = 0; i < C.AFFIX_SUMMON_N; i++) { var a = Math.random() * 6.283; K.makeEnemy(G, 'small', e.x + Math.cos(a) * (e.r + 24), e.y + Math.sin(a) * (e.r + 24), e.den); }
          K.text(G, e.x, e.y - e.r - 30, '召唤！', 'counter', '#8a5fc0'); K.ring(G, e.x, e.y, e.r + 40, '#8a5fc0', 0.5);
          G.stats.affixSummons = (G.stats.affixSummons || 0) + 1;
        }
      }
    }
  };
  XY.affixHurt = function (e, dmg) { return e.affix === 'plate' ? dmg * C.AFFIX_PLATE : dmg; };
  XY.affixDeath = function (G, e) {
    if (e.affix !== 'blast') return;
    var K = XY.core, i, h, R = C.AFFIX_BLAST_R;
    K.ring(G, e.x, e.y, R, '#e08a1e', 0.55, true); K.spark(G, e.x, e.y, '#e08a1e', 12); G.shake = Math.max(G.shake, 6);
    K.text(G, e.x, e.y - e.r - 28, '爆！', 'counter', '#a42d19');
    for (i = 1; i < G.heroes.length; i++) {
      h = G.heroes[i]; if (h.down || h.ridden) continue;
      if (XY.dist(h.x, h.y, e.x, e.y) < R + h.def.r) { K.hurtHero(G, h, e.dmg * C.AFFIX_BLAST_DMG, false, '精英自爆'); G.stats.affixBlastHits = (G.stats.affixBlastHits || 0) + 1; }
    }
  };
  XY.affixDraw = function (c, G, e, rt) {
    var A = XY.AFFIXES[e.affix]; if (!A) return;
    var x = e.x, y = e.y, r = e.r;
    c.strokeStyle = A.color; c.globalAlpha = 0.55 + 0.25 * Math.sin(rt * 5); c.lineWidth = 3; c.beginPath(); c.arc(x, y, r + 11, 0, 6.283); c.stroke(); c.globalAlpha = 1;
    var w = 44, yy = y - r - 34;
    c.fillStyle = A.color; c.beginPath(); c.moveTo(x - w / 2 + 5, yy); c.lineTo(x + w / 2 - 5, yy); c.quadraticCurveTo(x + w / 2, yy, x + w / 2, yy + 5); c.lineTo(x + w / 2, yy + 13); c.quadraticCurveTo(x + w / 2, yy + 18, x + w / 2 - 5, yy + 18); c.lineTo(x - w / 2 + 5, yy + 18); c.quadraticCurveTo(x - w / 2, yy + 18, x - w / 2, yy + 13); c.lineTo(x - w / 2, yy + 5); c.quadraticCurveTo(x - w / 2, yy, x - w / 2 + 5, yy); c.fill();
    c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(A.name, x, yy + 9.5);
  };
})();
