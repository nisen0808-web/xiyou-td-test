(function () {
  'use strict';
  var XY = window.XY;
  /* ============ v0.6.3 新手教程（第一次玩自动出现；可跳过；主菜单可重看） ============
     一步一步、要玩家真的点一下才往下走；亮起真实的界面元素。
     教程期间：不刷怪、英雄无敌、时间和唐僧都停住（只是学操作，不会输），结束 / 跳过后全部还原。 */

  function app() { return XY.app || (window.__xy && window.__xy.app); }
  function touchUI() { var a = app(); return !!(a && (a.touchUI || a.touched)); }
  function alive(G, i) { var h = G.heroes[i]; return h && !h.down; }
  function firstAlive(G, list, notI) { for (var k = 0; k < list.length; k++) if (alive(G, list[k]) && list[k] !== notI) return list[k]; for (k = 1; k < G.heroes.length; k++) if (alive(G, k) && k !== notI) return k; return 1; }
  function pickIdx(G, tt) { if (tt.pick == null) tt.pick = firstAlive(G, [2, 3, 4, 1], G.ctrl); return tt.pick; }
  function cmdIdx(G, tt) { if (tt.cmd == null) tt.cmd = firstAlive(G, [3, 4, 1, 2], G.ctrl); return tt.cmd; }
  function nm(G, i) { var h = G.heroes[i]; return h ? h.def.name : '徒弟'; }
  function union(rs) {
    var u = null;
    rs.forEach(function (r) {
      if (!r) return;
      if (!u) u = { x: r.x, y: r.y, w: r.w, h: r.h };
      else { var x2 = Math.max(u.x + u.w, r.x + r.w), y2 = Math.max(u.y + u.h, r.y + r.h); u.x = Math.min(u.x, r.x); u.y = Math.min(u.y, r.y); u.w = x2 - u.x; u.h = y2 - u.y; }
    });
    return u;
  }
  function hitsWhere(pred) { return union(XY.ui.hits.filter(pred)); }
  function hudArea(last){if(XY.ui.compact&&XY.compactHud&&XY.compactHud.on(XY.G,XY.app))return XY.ui.compact.anchors[last==='path'?'quest':'tang'];var rs=(XY.ui.hud||[]).filter(function(r){return ['gold','tang',last].indexOf(r.id)>=0;});return rs.length?union(rs):{x:12,y:26,w:214,h:last==='path'?184:134};}
  var CAMP = { x: 12, y: 26, w: 214, h: 78 }, TANG = { x: 12, y: 110, w: 214, h: 50 }, REST = { x: 12, y: 166, w: 214, h: 44 };
  function midIfNarrow(G, a) { return a.lw < 1000 ? 'mid' : 'top'; }
  function partyFocus(G,a,tt){var i=pickIdx(G,tt),d=(XY.ui.cardDbg||[]).filter(function(v){return v.i===i;})[0],f=d&&d.faceBox;if(f)return{x:f.x,y:f.y,w:f.w,h:d.lead?Math.min(f.h,64/a.zoom):f.h};return hitsWhere(function(h){return h.act==='hero'&&h.i===i;});}
  function cmdStep(order, title, text) {
    return {
      id: 'cmd_' + order, title: title,
      text: function (G, a, tt) { var i = cmdIdx(G, tt); return text.replace('{N}', nm(G, i)); },
      target: function (G, a, tt) { var i = cmdIdx(G, tt); return hitsWhere(function (h) { return h.act === 'order' && h.i === i && h.order === order; }); },
      allow: function (h, G, tt) { return h.act === 'order' && h.i === cmdIdx(G, tt) && h.order === order; },
      wait: function (G, tt) { var h = G.heroes[cmdIdx(G, tt)]; return !!h && h.order === order; }
    };
  }

  function skillHi(G) { var a = app(), n = G.heroes.length; if (a && a.skillTab >= 0 && a.skillTab < n && G.heroes[a.skillTab] && !G.heroes[a.skillTab].down) return a.skillTab; return G.ctrl; }
  function rootSkill(G) {
    var hi = skillHi(G), h = G.heroes[hi], tr = h && XY.TREE[h.id];
    if (!tr) return null;
    var ids = ['m1', 'm2', 'ma', 'mb'], best = null, rank = 99;
    tr.nodes.forEach(function (n) { if (n.kind === 'extra') ids.push(n.id); });
    ids.forEach(function (id) {
      if (!tr.by[id]) return;
      var s = XY.nodeStatus(G, hi, id), r = s.st === 'ok' ? 0 : s.st === 'nopts' ? 1 : s.st === 'locked' ? 2 : 3;
      if (r < rank) { rank = r; best = s; }
    });
    return best;
  }
  XY.rootSkill = rootSkill;
  function folioBook() { return (XY.pv2 && XY.pv2.folio) || null; }
  function skillRestore(a) {
    if (!a || !a._tutHold) return;
    var h = a._tutHold;
    if (!a._pvSub) a._pvSub = {};
    a._pvSub[h.tab] = h.sub;
    var book = folioBook();
    if (book && h.folioKey) { if (h.hadFolio) book[h.folioKey] = h.folio; else delete book[h.folioKey]; }
    if (h.skillTab != null) a.skillTab = h.skillTab;
    a._tutHold = null;
  }
  function skillLease(a, tab, sub) {
    if (!a._pvSub) a._pvSub = {};
    var key = tab + ':' + sub, fk = 'skillPg' + tab + '-' + sub, book = folioBook();
    if (!a._tutHold || a._tutHold.key !== key) {
      skillRestore(a);
      a._tutHold = { key: key, tab: tab, sub: a._pvSub[tab] || 0, folioKey: fk, hadFolio: !!(book && Object.prototype.hasOwnProperty.call(book, fk)), folio: book ? book[fk] : 0, skillTab: a.skillTab };
    }
    a.skillTab = tab;
    a._pvSub[tab] = sub;
  }
  // 教程临时借用修行子页和根分页。借的时候记下玩家原来的值，离开这一步、跳过或结束时原样还回去。
  XY.tutSkillSync = function (G, a) {
    if (!a) return;
    if (!G || !G.tut) { skillRestore(a); return; }
    var st = steps(G.tut)[G.tut.i];
    if (!st) { skillRestore(a); return; }
    if (st.id === 'skillLook') { skillLease(a, skillHi(G), 0); return; }
    if (st.id === 'skillMark') { skillLease(a, 9, 0); return; }
    skillRestore(a);
  };
  function panelGuide(G, inner) {
    var a = app();
    if (!a || !G || G.mode !== 'skills') return hitsWhere(function (h) { return h.act === 'skills'; });
    return inner(G, a);
  }
  function panelAllow(h, G) {
    if (h.act === 'closeSkills') return true;
    if (h.act === 'skills' && G.mode !== 'skills') return true;
    return false;
  }
  function costLine(s, G) {
    if (!s || !s.node) return '每条下面写着效果和费用。点「下一步」继续，不扣点。';
    if (s.st === 'nopts') return '「' + s.node.name + '」要 ' + s.cost + ' 点，你现在有 ' + G.points + ' 点，所以写着差几点。升级打怪才加技能点。点「下一步」，不扣点。';
    if (s.st === 'ok') return '「' + s.node.name + '」下一级花 ' + s.cost + ' 点，效果就写在这一条上。点「下一步」只是看过，不扣点。';
    if (s.st === 'max') return '「' + s.node.name + '」已满级。效果和费用仍写在条目上。点「下一步」继续。';
    return '「' + s.node.name + '」现在不能学：' + s.reason + '。点「下一步」继续，不扣点。';
  }
  function hitBy(act, id, hero, tab) {
    return hitsWhere(function (h) { return h.act === act && (id == null || h.id === id) && (hero == null || h.hero === hero) && (tab == null || h.i === tab); });
  }
  function steps(tt) { return (tt && tt.growOnly) ? XY.TUT_GROW : XY.TUT_STEPS; }
  XY.tutSteps = function (G) { return steps(G && G.tut); };
  XY.TUT_STEPS = [
    { id: 'welcome', title: '欢迎取经！',
      text: function () { return '这位红袍和尚是唐僧师傅。他会自己一路向西走，你指挥不了他。他只有 1 点血，被妖怪一碰就输——你和徒弟们要一路护着他。\n（教程里时间是停的，也不会来怪，放心慢慢点。）'; },
      target: function (G) { var t = G.heroes[0]; if (!t) return null; var x = t.x - G.cam.x + G.view.w / 2, y = t.y - G.cam.y + G.view.h / 2; return { x: x - 40, y: y - 52, w: 80, h: 92 }; } },   // 唐僧不进队伍面板：直接圈战场上的唐僧
    { id: 'choose', title: '第一步：选角色',
      text: function (G, a, tt) { var i = pickIdx(G, tt); return '点左下的队伍签打开手卷，再点「' + nm(G, i) + '」的头像，就能亲自操控他，并收起手卷继续战斗。' + (touchUI() ? '' : '\n键盘：数字键 1~6 会依次切换可指挥角色，唐僧不在名单中。'); },
      target: partyFocus,
      allow: function (h, G, tt) { return h.act === 'hero' && h.i === pickIdx(G, tt); },
      wait: function (G, tt) { return G.ctrl === pickIdx(G, tt); } },
    { id: 'move', title: '第二步：走一走',
      text: function () { return touchUI() ? '手指按住空白地面，往想去的方向拖，像摇杆一样；松手就停。轻点一下空地，他会自己走过去。试着走几步。' : '按 W A S D 走路，或者用鼠标点一下地面，他会自己走过去。试着走几步。'; },
      target: function (G, a) { var h = G.heroes[G.ctrl]; if (!h) return null; var x = h.x - G.cam.x + G.view.w / 2, y = h.y - G.cam.y + G.view.h / 2; return { x: x - 46, y: y - 56, w: 92, h: 100 }; },
      enter: function (G, tt) { var h = G.heroes[G.ctrl]; tt.x0 = h ? h.x : 0; tt.y0 = h ? h.y : 0; },
      wait: function (G, tt) { var h = G.heroes[G.ctrl]; return !!h && XY.dist(h.x, h.y, tt.x0, tt.y0) >= 130; } },
    { id: 'orders', title: '其他徒弟：下命令',
      text: function () { return '你同一时间只能亲自操控一位，这叫「手动」。其他徒弟会按「命令」自动行动。\n命令就是每张卡片下面这 4 个小按钮：跟随、驻守、出击、守护。下面我们一个一个试。'; },
      target: function () { return hitsWhere(function (h) { return h.act === 'order'; }); } },
    cmdStep('follow', '命令①：跟随', '「跟随」：他会跟着你操控的人一起走、一起打，适合大家一起转移阵地。\n请点「{N}」卡片上的「跟随」。'),
    cmdStep('station', '命令②：驻守', '「驻守」：他会回到经书营地，只在营地周围打怪，不乱跑——专门看家。\n请点「{N}」卡片上的「驻守」。'),
    cmdStep('attack', '命令③：出击', '「出击」：他会主动去找怪堆、精英和洞府里的 BOSS 打，血太低会自己撤回。想赢就要多出击，光守着不动一定会输！\n请点「{N}」卡片上的「出击」。'),
    cmdStep('guard', '命令④：守护', '「守护」：他守在唐僧身边，替师傅挡妖怪和弹幕。没下过命令的徒弟默认就是守护。\n请点「{N}」卡片上的「守护」，让他回到师傅身边。'),
    { id: 'build', title: '天兵：造一个',
      text: function () { return '金币可以请「护法天兵」——披甲拿兵器的天兵会站在路边帮你打妖怪（弓手、炮手、寒冰兵、破阵弩兵、佛光兵，价格不同）。我们先给你补了点金币。\n请点左下角的一个天兵按钮。'; },
      target: function () { return hitsWhere(function (h) { return h.act === 'tower'; }); },
      enter: function (G, tt) {
        G.coins = Math.max(G.coins, 400);
        var cap = XY.soldierCap ? XY.soldierCap(G) : 99; while (G.towers.length >= cap) G.towers.shift();
      },
      allow: function (h) { return h.act === 'tower'; },
      wait: function (G, tt) { var a = app(); return !!(a && a.build) || G.towers.length > (tt.n0 == null ? 1e9 : tt.n0); } },
    { id: 'place', title: '天兵：放下去',
      text: function () { return (touchUI() ? '再轻点一下西行路（土路）上的空地，天兵就落在那里。' : '再点一下西行路（土路）上的空地，天兵就落在那里（右键 / Esc 取消）。') + '\n天兵会持枪站岗、有妖怪进射程就出手；放在唐僧前面的会原地驻守，唐僧走过之后它就跟上。'; },
      target: function () { return hitsWhere(function (h) { return h.act === 'tower'; }); },
      enter: function (G, tt) { tt.n0 = G.towers.length; },
      allow: function (h) { return h.act === 'tower'; },
      wait: function (G, tt) { return G.towers.length > tt.n0; },
      back: function (G, tt) { var a = app(); return !(a && a.build) && G.towers.length <= tt.n0 && tt.t > 0.6; } },
    { id: 'sky', title: '召唤特殊人物：救急大招',
      text: function () { return '右边这块「召唤特殊人物」冷却 60 秒、能反复用：点一下，随机召来一位特殊角色（不会是你这局选的那位），TA 一到场就放出大招，几秒后离开。' + (touchUI() ? '' : '（快捷键 G）') + '\n留着救急用，现在先别点。'; },
      target: function () { return hitsWhere(function (h) { return h.act === 'guest'; }); } },
    { id: 'camp', title: '唐僧休息和营地',
      text: function () { return '唐僧走到路上的「休息点」会停下来休息 5 分钟，这时经书营地生效：给周围的人回血、减伤。点「当前目标」可看营地血量、路程和任务。\n但休息时妖怪也越来越多——要守好营地，也别光守着，要派人出击去清理洞府。'; },
      target: function () { return hudArea('path'); }, pos: midIfNarrow },
    { id: 'lose', title: '怎么输、怎么赢',
      text: function () { return '有两种输法：\n① 唐僧被妖怪碰到或打中（他只有 1 点血）；\n② 经书营地的血被打光。\n想赢：打退洞府 BOSS 完成主线，再让唐僧自己走到最西边的关口。'; },
      target: function () { return hudArea('tang'); }, pos: midIfNarrow },
    { id: 'buttons', title: '暂停在右上角',
      text: function () { return '右上角「Ⅱ」暂停；造天兵选点时它是取消。' + (touchUI() ? '' : ' Esc / P 也是暂停。') + '\n加点不在这里，下一步打开修行。'; },
      target: function () { return hitsWhere(function (h) { return h.act === 'esc'; }); }, pos: midIfNarrow },
    { id: 'skillOpen', title: '修行：加点入口',
      text: function () { return '加点、升级技能、全队强化都在顶部「Lv · 经验」。不在首页商店。\n请点亮着的经验条。战斗会按原来的方式暂停，这一步不花技能点。'; },
      target: function () { return hitsWhere(function (h) { return h.act === 'skills'; }); },
      allow: function (h) { return h.act === 'skills'; },
      wait: function (G) { return G.mode === 'skills'; }, pos: 'mid' },
    { id: 'skillLook', title: '效果和费用写在技能上',
      text: function (G) { var s = rootSkill(G); return s ? costLine(s, G) : '打开修行后，每条技能下面写着效果和要花的点数。点「下一步」继续，不扣点。'; },
      target: function (G) { return panelGuide(G, function () { var s = rootSkill(G); return s ? hitBy('node', s.node.id, skillHi(G)) : null; }); },
      allow: function (h, G) { return panelAllow(h, G); } },
    { id: 'skillParty', title: '全队强化是另一页',
      text: function () { return '点「全队」。全队强化用同一池技能点，不占英雄的技能位。\n法宝是旁边另一页，不在这里花技能点。'; },
      target: function (G) { return panelGuide(G, function () { return hitBy('tab', null, null, 9); }); },
      allow: function (h, G) { return panelAllow(h, G) || (h.act === 'tab' && h.i === 9); },
      wait: function (G, tt) { var a = app(); return !!(a && a.skillTab === 9); } },
    { id: 'skillMark', title: '强化费用也在条目上',
      text: function (G) { var s = XY.nodeStatus(G, -1, 'p_tower'); return '亮着的是「营地·塔强化」，加强天兵。' + costLine(s, G); },
      enter: function (G) { var a = app(); if (a) XY.tutSkillSync(G, a); },
      target: function (G) { return panelGuide(G, function () { return hitBy('node', 'p_tower', -1); }); },
      allow: function (h, G) { return panelAllow(h, G); } },
    { id: 'skillClose', title: '关闭后战斗恢复',
      text: function () { return '点右上「关闭」。修行开着时战斗暂停，关掉就恢复。\n以后随时点顶部经验条再来。'; },
      target: function (G) { return panelGuide(G, function () { return hitBy('closeSkills'); }); },
      allow: function (h, G) { return panelAllow(h, G) || h.act === 'closeSkills'; },
      wait: function (G) { return G.mode === 'play'; } },
    { id: 'done', title: '教程完成！', last: true,
      text: function () { return '走路、天兵、输赢，以及修行里的加点、技能费用、全队强化，都看过了。\n想再看：开始取经 → 出发页「更多」进洞府阁 →「新手教程」。只重看，不清存档。'; },
      target: function () { return null; } }
  ];
  XY.TUT_GROW = [
    { id: 'growHi', title: '修行在哪里',
      text: function () { return '加点、升级技能、全队强化都在战斗顶部的经验条里。\n下面带你点开真实入口。可跳过；不会扣技能点，也不清存档。'; },
      target: function () { return hitsWhere(function (h) { return h.act === 'skills'; }); }, pos: 'mid' },
    XY.TUT_STEPS.filter(function (s) { return s.id === 'skillOpen' || s.id === 'skillLook' || s.id === 'skillParty' || s.id === 'skillMark' || s.id === 'skillClose'; })[0],
    XY.TUT_STEPS.filter(function (s) { return s.id === 'skillLook'; })[0],
    XY.TUT_STEPS.filter(function (s) { return s.id === 'skillParty'; })[0],
    XY.TUT_STEPS.filter(function (s) { return s.id === 'skillMark'; })[0],
    XY.TUT_STEPS.filter(function (s) { return s.id === 'skillClose'; })[0],
    { id: 'growDone', title: '知道去哪看了', last: true,
      text: function () { return '修行左上角是可用技能点。每条下面是效果和费用；不够就写差几点。\n完整教程：开始取经 → 出发页「更多」进洞府阁 →「新手教程」。不清存档。'; },
      target: function () { return null; } }
  ];

  /* ---------- 状态 ---------- */
  function markTut(growOnly) {
    var t = XY.save && XY.save.data && XY.save.data.tutorial;
    if (!t || typeof t !== 'object' || Array.isArray(t)) return;
    if (growOnly) t.grow = true; else { t.done = true; t.grow = true; }
    if (XY.save.touch) XY.save.touch();
  }
  XY.tutStart = function (G, opt) {
    if (!G) return;
    G.tut = { i: 0, t: 0, entered: -1, ok: 0, growOnly: !!(opt && opt.growOnly) };
    G.tutSave = { noSpawn: G.noSpawn, god: G.godMode };
    G.noSpawn = true; G.godMode = true;
  };
  XY.tutFinish = function (G, skipped) {
    var aHold = app(); if (aHold) skillRestore(aHold);
    var growOnly = !!(G && G.tut && G.tut.growOnly);
    if (!G || !G.tut) { markTut(false); return; }
    G.tut = null;
    if (G.tutSave) { G.noSpawn = G.tutSave.noSpawn; G.godMode = G.tutSave.god; G.tutSave = null; }
    G.heroes.forEach(function (h, i) { if (i > 0 && h.order !== 'guard') { h.order = 'guard'; h.retreat = false; h.tgt = null; } });
    var a = app(); if (a) { a.build = null; a.summon = null; a.selTower = null; if (G.mode === 'skills') XY.toggleSkills(G, false); }
    markTut(growOnly);
    XY.toast(G, skipped ? '已跳过。出发页「更多」→新手教程' : '教程完成，开始取经！');
  };
  XY.tutNext = function (G) {
    var tt = G && G.tut; if (!tt) return;
    var list = steps(tt), st = list[tt.i];
    if (!st || st.last || tt.i >= list.length - 1) { XY.tutFinish(G, false); return; }
    tt.i++; tt.entered = -1; tt.ok = 0; tt.t = 0;
  };
  XY.tutTick = function (G, dt) {
    var tt = G.tut; if (!tt) return;
    var st = steps(tt)[tt.i]; if (!st) { XY.tutFinish(G, false); return; }
    if (tt.entered !== tt.i) { tt.entered = tt.i; tt.t = 0; tt.ok = 0; tt.done = false; if (st.enter) st.enter(G, tt); }
    tt.t += dt;
    if (st.wait) {
      if (tt.done || st.wait(G, tt)) { tt.done = true; tt.ok += dt; if (tt.ok >= 0.7) XY.tutNext(G); }
      else if (st.back && st.back(G, tt)) { tt.i = Math.max(0, tt.i - 1); tt.entered = -1; }
    }
  };
  XY.tutBlocks = function (G, h) {
    var tt = G.tut; if (!tt) return false;
    if (h.act === 'tutNext' || h.act === 'tutSkip' || h.act === 'esc' || h.act === 'ui') return false;
    if (h.act === 'node') { var a2 = app(); if (!tt.nag || (a2 && a2.rt - tt.nag > 2)) { tt.nag = a2 ? a2.rt : 0; XY.toast(G, '先看费用和效果。点「下一步」，教程不扣技能点。'); } return true; }
    var st = steps(tt)[tt.i];
    if (st && st.allow && st.allow(h, G, tt)) return false;
    var a = app(); if (a && (!tt.nag || a.rt - tt.nag > 2)) { tt.nag = a.rt; XY.toast(G, st && st.wait ? '先照提示点亮着的地方哦' : '点「下一步」继续，或者先看看亮着的地方'); }
    return true;
  };

  /* ---------- 画面 ---------- */
  function wrapLines(c, text, sz, maxW) {
    var R = XY.R, out = [], paras = text.split('\n'), noStart = '，。、！？：；）」』”…,.!?:;)';
    c.font = R.font(sz, false);
    paras.forEach(function (p) {
      var line = '';
      for (var k = 0; k < p.length; k++) {
        var ch = p.charAt(k), w = c.measureText(line + ch).width;
        if (w > maxW && line && noStart.indexOf(ch) < 0) { out.push(line); line = ch; } else line += ch;
      }
      out.push(line);
    });
    return out;
  }
  // 在 drawHUD 靠前的位置调用：算出提示卡的位置和大小，并告诉横幅 / 红条往下让
  XY.tutLayout = function (c, G, app, ctx) {
    var tt = G.tut; if (!tt) return;
    var W = app.lw, H = app.lh, list = steps(tt), st = list[tt.i] || list[0];
    var z=app.zoom||1, s=XY.uiScale?XY.uiScale(W*z,H*z):1, u=s/z, cw=Math.min(W-16*u,280*u),tsz=12*u,lines=wrapLines(c,st.text(G,app,tt),tsz,cw-28*u);
    var ch = (50 + lines.length*16 + 54)*u;
    var pos = 'corner';
    var y = Math.round((H > W * 1.05 ? 78 : 8) * u);
    tt.lay = { x: Math.round(8 * u), y: y, w: cw, h: ch, lines: lines, tsz: tsz, pos: pos };
    ctx.tutBottom = ctx.denBottom + 6;
  };
  function holePath(c, r, pad) {
    var x = r.x - pad, y = r.y - pad, w = r.w + pad * 2, h = r.h + pad * 2, rad = 12;
    c.moveTo(x + rad, y); c.arcTo(x + w, y, x + w, y + h, rad); c.arcTo(x + w, y + h, x, y + h, rad); c.arcTo(x, y + h, x, y, rad); c.arcTo(x, y, x + w, y, rad); c.closePath();
  }
  // 在 drawHUD 最后调用（这时所有真实按钮的位置都已经登记好了）
  XY.tutDraw = function (c, G, app) {
    var tt = G.tut; if (!tt || !tt.lay) return;
    var R = XY.R, T = R.T, W = app.lw, H = app.lh, list = steps(tt), st = list[tt.i] || list[0], L = tt.lay, rt = app.rt;
    var tr = st.target ? st.target(G, app, tt) : null, pad = 7;
    // v0.9 队伍面板在教程里钉开时卡片很高：提示卡要是盖住了亮着的目标，就挪到目标下方 / 上方 / 屏幕底 / 顶，找一个不盖住的位置
    function ov(y) { return tr && !(tr.x + tr.w <= L.x || L.x + L.w <= tr.x || tr.y + tr.h <= y || y + L.h <= tr.y); }
    if (tr && ov(L.y)) { var cands = [tr.y + tr.h + pad + 18, tr.y - pad - 18 - L.h, H - L.h - 8, 8]; for (var q = 0; q < cands.length; q++) if (cands[q] >= 8 && cands[q] + L.h <= H - 8 && !ov(cands[q])) { L.y = cands[q]; break; } }
    // 44px 关闭钮要整块可点。卡按 620 CSS 像素居中时，667 横屏右缘会盖住它的中心。
    var zFit = app.zoom || 1, sFit = XY.uiScale ? XY.uiScale(W * zFit, H * zFit) : 1, uFit = sFit / zFit, minW = 300 * uFit, gap = 8;
    (XY.ui.hits || []).forEach(function (b) {
      if (b.act !== 'closeSkills') return;
      if (L.x + L.w <= b.x || b.x + b.w <= L.x || L.y + L.h <= b.y || b.y + b.h <= L.y) return;
      var keepLeft = b.x - gap - L.x, keepRight = L.x + L.w - (b.x + b.w + gap);
      if (keepLeft >= minW && keepLeft >= keepRight) L.w = keepLeft;
      else if (keepRight >= minW) { L.x = b.x + b.w + gap; L.w = keepRight; }
      else { var below = b.y + b.h + gap; if (below + L.h <= H - 8) L.y = below; }
    });
    L.lines = wrapLines(c, st.text(G, app, tt), L.tsz, Math.max(80, L.w - 40 * uFit));
    L.h = (50 + L.lines.length * 16 + 54) * uFit;
    if (tr && ov(L.y)) { var cands2 = [tr.y + tr.h + pad + 18, tr.y - pad - 18 - L.h, H - L.h - 8, 8]; for (var q2 = 0; q2 < cands2.length; q2++) if (cands2[q2] >= 8 && cands2[q2] + L.h <= H - 8 && !ov(cands2[q2])) { L.y = cands2[q2]; break; } }
    // 变暗，只留亮着的那一块
    c.save();
    c.fillStyle = 'rgba(70,56,24,0.34)'; c.beginPath(); c.rect(0, 0, W, H);
    if (tr) holePath(c, tr, pad);
    c.fill('evenodd');
    if (tr) {
      var pu = 0.5 + 0.5 * Math.sin(rt * 5);
      c.beginPath(); holePath(c, tr, pad + pu * 2); c.lineWidth = 4; c.strokeStyle = 'rgba(168,50,36,' + (0.65 + 0.35 * pu) + ')'; c.stroke();
      var cx = tr.x + tr.w / 2, below = tr.y + tr.h / 2 < H / 2, ay = below ? tr.y + tr.h + pad + 8 + pu * 6 : tr.y - pad - 8 - pu * 6, dir = below ? -1 : 1;
      if (!(L.pos === 'top' && ay > L.y && ay < L.y + L.h) && cx > 0 && cx < W) {
        c.fillStyle = '#a83224'; c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(cx, ay); c.lineTo(cx - 13, ay - dir * 20); c.lineTo(cx + 13, ay - dir * 20); c.closePath(); c.stroke(); c.fill();
      }
    }
    c.restore();
    if(XY.ui2.on&&XY.inkHud){XY.inkHud.tutorialCard(c,G,app,tt,st,L);return;}
    // 提示卡
    R.panel(c, L.x, L.y, L.w, L.h, 16, 'rgba(255,251,236,0.98)', '#a83224');
    var n = list.length;
    R.txt(c, '新手教程 ' + (tt.i + 1) + '/' + n, L.x + 20, L.y + 18, 12, '#a8700a', 'left', true);
    R.txt(c, st.title, L.x + 20, L.y + 44, L.tsz + 4, '#3a2c10', 'left', true);
    for (var k = 0; k < L.lines.length; k++) R.txt(c, L.lines[k], L.x + 20, L.y + 78 + k * (L.tsz + 9), L.tsz, '#4a3a1a', 'left', false);
    XY.ui.hits.push({ x: L.x, y: L.y, w: L.w, h: L.h, act: 'ui' });      // 点到卡片本身不要穿透到地面（先登记，按钮在它上面）
    var by = L.y + L.h - 56, bh = 44;
    // 左：跳过教程
    var sw = 118, sx = L.x + 16;
    R.rrect(c, sx, by, sw, bh, 12); c.fillStyle = '#fff3d6'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#c9a24a'; c.stroke();
    R.txt(c, '跳过教程', sx + sw / 2, by + bh / 2 + 1, 16, '#4a3a1a', 'center', true);
    XY.ui.hits.push({ x: sx, y: by, w: sw, h: bh, act: 'tutSkip' });
    // 右：下一步 / 开始游戏 / 跳过这一步
    var waitStep = !!st.wait, nw = waitStep ? 130 : 150, nx = L.x + L.w - 16 - nw;
    R.rrect(c, nx, by, nw, bh, 12); c.fillStyle = waitStep ? '#f3efe4' : '#ffcf5a'; c.fill(); c.lineWidth = waitStep ? 1.6 : 2.4; c.strokeStyle = waitStep ? '#b9a77a' : '#c78a1e'; c.stroke();
    R.txt(c, st.last ? '开始游戏 ▶' : (waitStep ? '跳过这一步' : '下一步 ▶'), nx + nw / 2, by + bh / 2 + 1, 17, '#3a2c10', 'center', true);
    XY.ui.hits.push({ x: nx, y: by, w: nw, h: bh, act: 'tutNext' });
    if (waitStep) R.txt(c, tt.done ? '✔ 做对了！' : '👉 请照提示操作', nx - 10, by + bh / 2 + 1, 15, tt.done ? '#2f7d3b' : '#a8700a', 'right', true);
  };
})();
