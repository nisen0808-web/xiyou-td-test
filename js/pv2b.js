/* ============================================================
 * pv2b.js —— v0.8.6 手机版 UI v2（续）：图鉴 / 技能树菜单（英雄页 · 全队页 · 法宝页 · 说明页）。CSS 像素排版，按钮 ≥ 44。
 * 技能树把「一屏 30 个小格」改成：英雄页签 → 子页签（根 / 分支 1~3 / 辅助）→ 每页 ≤ 8 个大卡，点卡 = 学习（act 'node' 不变）。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, R = XY.R, T = R.T, S = XY.save, PI2 = Math.PI * 2, P = XY.pv2, K;
  function ELC(e) { return (XY.ELEMS[e] || {}).color || '#888'; }
  function ELN(e) { return (XY.ELEMS[e] || {}).name || ''; }
  function tabChip(x, y, w, h, on, dead, col) {
    var c = K.c; K.rr(x, y, w, h, 12); c.fillStyle = dead ? '#dedbd3' : (on ? '#fff0c4' : (K.over(x, y, w, h) ? '#fff8e6' : '#fffdf6')); c.fill(); c.lineWidth = on ? 3 : 1.5; c.strokeStyle = dead ? '#b0ac9f' : (on ? (col || '#d9a21a') : '#cdbf9c'); c.stroke();
  }

  /* ================= 图鉴 ================= */
  function dex(c,G,app) {
    var f=P.frame(c,app,'众生藏卷'),port=K.port,tab=app.dexTab||'enemy',hp=XY.dexH,tx=port?f.x:224,ty=port?f.y:f.y-52,nTabs=tab==='card'?4:3,tw=port?(f.w-18)/nTabs:Math.min(90,(f.chipX-tx-24)/nTabs);
    [['enemy','妖怪'],['card','法宝'],['syn','协同']].forEach(function(t,i){var on=tab===t[0],bx=tx+i*(tw+6);K.t(t[1],bx+tw/2,ty+20,16,on?'#a42d19':'#24180f','center',true);if(XY.INKP)XY.INKP.stroke(c,bx+6,ty+38,bx+tw-6,ty+38,on?2.2:0.7,on?'164,45,25':'83,61,34',on?0.85:0.28,i+4,0.01);K.hit(bx,ty,tw,44,'dexTab',{tab:t[0]});});
    if(tab==='card'){var bx4=tx+3*(tw+6),on4=!!app.dexStarter;K.t(on4?'仅起手':'全部',bx4+tw/2,ty+20,14,on4?'#a42d19':'#24180f','center',true);if(XY.INKP)XY.INKP.stroke(c,bx4+6,ty+38,bx4+tw-6,ty+38,on4?2:0.7,on4?'164,45,25':'83,61,34',on4?0.8:0.25,9,0.01);K.hit(bx4,ty,tw,44,'dexStarter',{});}
    var top=port?f.y+54:f.y+8,bot=f.y+f.h,bh=bot-top,lw=port?f.w*.39:f.w*.43,rx=f.x+lw+20,rw=f.w-lw-20,ribbonY=port?bot-188:bot-153;
    var list=tab==='enemy'?XY.ENEMY_ORDER.map(function(t){return{id:t};}):tab==='card'?XY.CARDS.filter(function(z){return !app.dexStarter||S.fbTag(z.id).kind==='starter';}):XY.SYNS;
    var per=6,key='inkdex-'+tab,from=P.pager(list.length,per,key,f.x,bot-44,port?f.w:lw),sel=app.dexSel&&list.some(function(z){return z.id===app.dexSel;})?app.dexSel:list.length?list[0].id:null,view=P.folio.dexDetail||0;
    var nav=tab==='enemy'?['志','战法','收集']:tab==='card'?['故事','数值','来处']:['搭档','招式','修习'];nav.forEach(function(t,i){var on=i===view,bx=rx+i*rw/3,bw=rw/3-4;K.t(t,bx+bw/2,top+20,16,on?'#a42d19':'#24180f','center',true);if(XY.INKP)XY.INKP.stroke(c,bx+8,top+38,bx+bw-8,top+38,on?2.2:0.7,on?'164,45,25':'83,61,34',on?0.85:0.28,i+11,0.01);K.hit(bx,top,bw,44,'folio',{key:'dexDetail',i:i});});
    if(!sel){K.lines('没有符合筛选的藏品。',rx,top+70,rw,15,20,T.inkSoft,6,false);P.end(c);return;}
    var title='',sub='',text='',colour=T.ink,seen=false,artH=Math.min(port?230:350,ribbonY-top-30,lw*1.18),foot=port?Math.min(ribbonY-24,top+340):ribbonY-18,cx=f.x+lw*.52;
    function hero(id,x,y,r){var d=XY.SP_BY[id]?XY.specialDef(id,Math.max(1,S.spLevel(id))):XY.HEROES.filter(function(z){return z.id===id;})[0];if(d)XY.hud2.face(c,{id:id,def:d},x,y,r,app.rt);}
    function relicInk(cd,x,y,w,h,owned){c.save();c.globalAlpha=owned?1:.34;var nm=cd&&cd.name&&cd.name!=='未'&&cd.name!=='？'?cd.name:'';var drew=!!(owned&&nm&&XY.ICONINK&&XY.ICONINK.draw(c,nm,x,y,Math.min(w,h)*.86));if(!drew&&owned&&nm){c.fillStyle='#5c4a38';c.textAlign='center';c.textBaseline='middle';var sz=Math.max(14,Math.min(28,h*.22));c.font=sz+'px "Ma Shan Zheng","KaiTi",serif';c.fillText(nm,x,y);}else if(!drew){c.fillStyle='rgba(92,74,56,.28)';c.beginPath();c.ellipse(x,y,Math.max(8,w*.18),Math.max(10,h*.22),-.3,0,6.283);c.fill();}c.restore();}
    if(tab==='enemy'){
      var ee=S.dexOf(sel),sn=ee&&ee.seen>0,dd=XY.ENEMIES[sel],bz=XY.BESTIARY[sel];title=sn?dd.name:'未曾相逢';sub=sn?'遇见 '+ee.seen+' · 击杀 '+ee.kills:'在战场相逢，才会记进此卷';
      c.save();if(!sn){c.globalAlpha=.22;}var drawn=XY.MINK&&(XY.MINK.portrait(c,sel,cx,foot,artH)||(XY.MINK.dexPose&&XY.MINK.dexPose(c,sel,cx,foot,artH)));c.restore();if(!drawn)hp.enemyIcon(c,sel,cx,foot-artH*0.42,Math.min(artH*0.42,lw*0.38),!sn,app.rt);
      if(!sn)text='在战斗里遇到它，就会记进图鉴。还看不到详细信息。';
      else if(view===0)text=bz.desc+'\n\n对付它：'+bz.tip+'\n掉落：'+bz.drop;
      else if(view===1)text='生命 '+dd.hp+' · 速度 '+dd.speed+' · '+(dd.dive?'俯冲伤害 '+Math.round(dd.dmg*dd.dive.mul*10)/10:'碰撞伤害 '+dd.dmg)+(dd.range?' · 远程':'')+(dd.fly?' · 飞行':'')+'\n对付它：'+bz.tip+'\n掉落：'+bz.drop;
      else{var names=Object.keys(S.data.cosFrames||{}).map(function(k){return S.data.cosFrames[k];});text=(ee.card?'已得「'+ee.card+'」':'这种小妖进化到Ⅲ阶，可得西游线图鉴卡。')+'\n'+(names.length?'头像框：'+names.join('、'):'小妖进化到Ⅴ阶，可得头像框。');}
    }else if(tab==='card'){
      var cd=XY.CARD_BY[sel],own=S.has(sel),rar=XY.RARITY[cd.r],set=XY.CARD_SETS[cd.set],rec=S.data.cards[sel];title=cd.name;sub=rar.name+' · '+set.name+'套（'+set.theme+'）';colour=own?'#24180f':'#8a7964';
      c.save();c.translate(cx,foot-artH*.48);c.rotate(-.065);relicInk(cd,0,0,artH*.62,artH*.88,!!own);c.restore();
      if(view===0)text=own?cd.lore:'还没有获得。局内精英、宝箱、牛魔王都有机会掉落。';
      else if(view===1)text=own?'效果（Lv'+rec.lv+'）：'+XY.cardFxText(cd,rec.lv)+'\n累计获得 '+rec.got+' 次 · 等级 Lv'+rec.lv+'/'+XY.CARD_MAXLV:'未获得，还没有法宝等级。';
      else text=S.fbTag(sel).text+'\n'+(S.data.dex['hid:phcollect']?'图鉴线索已解开：Phyrex在场且由你亲自操控满30秒，可一次吸来全图灵石与金币。':'图鉴线索：听说有位大佬，被亲自带着走一阵子，战场上会发生一件好事。');
    }else{
      var sy=XY.SYN_BY[sel],got=S.data.dex['syn:'+sel],kind=XY.SYN_KIND[sy.kind0];title=got?sy.fullName:'未曾修习';sub=hp.synName(sy.a)+' + '+hp.synName(sy.b);
      hero(sy.a,cx-lw*.12,foot-artH*.56,Math.min(64,artH*.30));hero(sy.b,cx+lw*.16,foot-artH*.31,Math.min(52,artH*.24));
      if(view===0)text='五行：'+ELN(synElemId(sy.a))+' 与 '+ELN(synElemId(sy.b))+'\n搭配：'+sy.note+'\n玩法：'+kind.name;
      else if(view===1)text=got?'一级：'+kind.desc(sy,1)+'\n二级：'+kind.desc(sy,2):'还没有修习，学会后招式效果会记进此卷。';
      else text=got?'已学到Lv'+got.lv+' · 技能点 '+XY.SYN_COST[0]+' + '+XY.SYN_COST[1]:'局内打开菜单 → 全队 → 协同技，选好搭档后学习。带「常驻」的协同技需带上相应人物。';
    }
    K.tf(title,rx,top+72,rw,port?26:34,colour,'left',true,18);var yy=K.lines(sub,rx,top+112,rw,18,26,T.inkSoft,4,false);
    text.split('\n').forEach(function(t){yy=K.lines(t,rx,yy+18,rw,20,30,T.ink,6,false);});
    K.t(tab==='enemy'?'众生':tab==='card'?'珍藏':'同修',f.x+2,top+20,24,'#a42d19','left',true);
    P.objects(c,app,list.slice(from,from+per),{x:f.x,y:ribbonY,w:port?f.w:lw,h:91},sel,'dexSel',function(z,x,y,w,h){
      if(tab==='enemy'){var e=S.dexOf(z.id);if(e&&e.seen>0)hp.enemyIcon(c,z.id,x,y,Math.min(24,w*.34),false,app.rt);else{c.save();c.font='22px "Ma Shan Zheng","KaiTi",serif';c.fillStyle='#6d5b45';c.textAlign='center';c.textBaseline='middle';c.fillText('未',x,y);c.restore();}}
      else if(tab==='card')relicInk(z,x,y,Math.min(50,w*.68),Math.min(76,h),S.has(z.id));
      else{hero(z.a,x-w*.12,y-7,Math.min(18,w*.25));hero(z.b,x+w*.14,y+12,Math.min(17,w*.24));}
    },function(z){if(tab==='enemy'){var e=S.dexOf(z.id);return e&&e.seen>0?XY.ENEMIES[z.id].name:'未得';}if(tab==='card')return S.has(z.id)?z.name:'未得';return S.data.dex['syn:'+z.id]?z.fullName:'同修 '+(XY.SYNS.indexOf(z)+1);});
    P.end(c);
    function synElemId(id){var d=XY.SP_BY[id]||XY.HEROES.filter(function(z){return z.id===id;})[0];return d&&d.elem;}
  }

  /* ================= 技能树菜单 ================= */
  var HELP = [['走位', ['按住空地拖动 = 摇杆走路', '轻点空地 = 走到那里']], ['换人与命令', ['点头像换人；点小按钮下命令', '白龙马：点「骑乘」，选一位伙伴驮着跑']], ['天兵与塔', ['点天兵按钮，再轻点路上空地', '点塔查看 / 升级']], ['法宝与技能', ['法宝三选一，最多带 3 件同套', '点顶部等级经验：修行菜单；点右角法宝图：法宝详情']], ['召唤', ['点右下角圆形「召唤」印章', '冷却时外圈显示进度、中间是秒数']], ['其他', ['右上「暂停」暂停 / 取消', '小地图在右上角']], ['战况', []]];
  function subList(G, tab, h) {                                                // 返回 [{name, nodes:[...], hi}]
    if (tab === 9) return [{ n: '全队强化', nodes: XY.PARTY_NODES.slice(), hi: -1 }, { n: '协同技', nodes: (XY.synList ? XY.synList(G) : []), hi: -1 }];
    var tr = XY.TREE[h.id], d = h.def, out = [], q = function (id) { return tr.nodes.filter(function (z) { return z.id === id; })[0]; };
    var root = ['m1', 'm2'].concat(tr.by.ma ? ['ma', 'mb'] : []).map(function (id) { return tr.by[id]; }).filter(Boolean);
    if (!tr.by.ma) tr.nodes.filter(function (z) { return z.kind === 'extra'; }).forEach(function (z) { root.push(z); });
    out.push({ n: '根·' + d.weapon, nodes: root, hi: G.heroes.indexOf(h) });
    ['x', 'y', 'z'].forEach(function (Lr, bi) {
      var by = {}; tr.nodes.filter(function (z) { return z.br === Lr; }).forEach(function (z) { by[z.id] = z; });
      var nm = (d.branches && d.branches[bi]) ? d.branches[bi].split(/[:：]/)[0] : (by[Lr + '1'] ? by[Lr + '1'].bname : '分支' + (bi + 1)), ns = [by[Lr + '1'], by[Lr + '2'], by[Lr + '3a'], by[Lr + '3b'], by[Lr + '4a'], by[Lr + '4b'], by[Lr + '5a'], by[Lr + '5b']].filter(Boolean);
      out.push({ n: nm, nodes: ns, hi: G.heroes.indexOf(h), locked: bi === 2 && h.sp && !d.branch3 });
    });
    out.push({ n: '辅助 ' + XY.supportCount(h) + '/' + XY.MAX_SUPPORTS, nodes: tr.nodes.filter(function (z) { return z.kind === 'support'; }), hi: G.heroes.indexOf(h) });
    return out;
  }
  function skillFonts() { return K.port ? { name: 17, eff: 15, cost: 14.5 } : { name: 20, eff: 16.5, cost: 16 }; }
  function skillUnits(s) { return String(XY.fmtStr(s)).match(/[+-]?\d[\d,]*(?:\.\d+)?(?:%|\/\d+|秒|级|点|倍)?|[A-Za-z][A-Za-z0-9_.-]*|[\s\S]/g) || []; }
  function skillFont(size, bold) { return size + 'px "Ma Shan Zheng","KaiTi","STKaiti",serif'; }
  function skillLines(c, text, size, bold, maxW) {
    c.font = skillFont(size, bold); c.textAlign = 'left'; c.textBaseline = 'middle';
    var units = skillUnits(text), line = '', out = [], i, tt;
    for (i = 0; i < units.length; i++) { tt = line + units[i]; if (line && c.measureText(tt).width > maxW) { out.push(line); line = units[i]; } else line = tt; }
    if (line || !out.length) out.push(line);
    return out;
  }
  function skillDraw(c, lines, x, y, size, bold, col, lh) { c.font = skillFont(size, bold); c.fillStyle = col; c.textAlign = 'left'; c.textBaseline = 'middle'; lines.forEach(function (t, i) { c.fillText(t, x, y + i * lh); }); }
  function skillInk(size) { return { up: size * 0.68, down: size * 0.62 }; }
  function skillBody(c, G, hi, n, w) {
    var st = XY.nodeStatus(G, hi, n.id), sz = skillFonts(), pipW = Math.max(0, n.max) * 14 + 8;
    var nameW = Math.max(36, w - 28 - pipW), bodyW = Math.max(36, w - 28);
    var eff = st.lv > 0 ? XY.nodeText(n, st.lv) : (n.desc ? n.desc[0] : (n.eff ? n.eff(1) : ''));
    function cnLv(v){return ['零','一','二','三','四','五','六','七','八','九'][v]||String(v);}
    var cost = st.st === 'max' ? '已学 · ' + cnLv(st.lv) + '重' : st.st === 'ok' ? '点击学习 · ' + st.cost + ' 点' : st.st === 'nopts' ? '差 ' + (st.cost - G.points) + ' 点' : cnLv(st.lv) + '重 / ' + cnLv(n.max) + '重' + (st.reason ? ' · ' + st.reason : '');
    var ab = /[ab]$/.test(n.id) && n.tier >= 3 ? (/a$/.test(n.id) ? '甲路 ' : '乙路 ') : '';
    var nameLh = sz.name + 6, effLh = sz.eff + 8, costLh = sz.cost + 6;
    var names = skillLines(c, n.name, sz.name, true, nameW), effs = skillLines(c, eff, sz.eff, false, bodyW), costs = skillLines(c, ab + cost, sz.cost, true, bodyW);
    var yName = 8 + skillInk(sz.name).up;
    var yEff = yName + (names.length - 1) * nameLh + skillInk(sz.name).down + 8 + skillInk(sz.eff).up;
    var yCost = yEff + (effs.length - 1) * effLh + skillInk(sz.eff).down + 8 + skillInk(sz.cost).up;
    var h = Math.ceil(yCost + (costs.length - 1) * costLh + skillInk(sz.cost).down + 10);
    return { st: st, sz: sz, names: names, effs: effs, costs: costs, yName: yName, yEff: yEff, yCost: yCost, nameLh: nameLh, effLh: effLh, costLh: costLh, h: h, pipW: pipW };
  }
  XY.skillBody = function (c, G, hi, n, w) { return skillBody(c, G, hi, n, w); };
  function skillMark(c, n, x, y, sz) {
    var name = (n && n.name) || '技', seed = 0, i;
    for (i = 0; i < name.length; i++) seed = (seed + name.charCodeAt(i) * (i + 3)) % 360;
    c.save();
    c.translate(x, y);
    var g = c.createRadialGradient(-sz * 0.08, -sz * 0.1, sz * 0.04, 0, 0, sz * 0.5);
    g.addColorStop(0, 'hsla(' + seed + ',64%,58%,0.96)');
    g.addColorStop(0.72, 'hsla(' + ((seed + 32) % 360) + ',46%,40%,0.9)');
    g.addColorStop(1, 'hsla(' + seed + ',28%,24%,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, sz * 0.46, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(36,24,15,0.5)'; c.lineWidth = 1.2;
    c.beginPath(); c.arc(0, 0, sz * 0.4, 0.3, 5.4); c.stroke();
    if (!(XY.ICONINK && XY.ICONINK.has && XY.ICONINK.has(name) && XY.ICONINK.draw(c, name, 0, 0, sz * 0.7))) {
      c.fillStyle = '#24180f';
      c.font = Math.round(sz * 0.4) + 'px "Ma Shan Zheng","KaiTi",serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(name.charAt(0), 0, 1);
    }
    c.restore();
  }
  function nodeCard(c, G, app, hi, n, x, y, w, h, col, hov) {
    var b = skillBody(c, G, hi, n, Math.max(48, w - 58)), st = b.st, lv = st.lv, locked = st.st === 'locked', maxed = st.st === 'max', can = st.st === 'ok', ov = K.over(x, y, w, h);
    XY.skillRead = { name: b.sz.name, effect: b.sz.eff, cost: b.sz.cost, level: b.sz.cost };
    if(ov){var wash=c.createLinearGradient(x,y,x+w,y+h);wash.addColorStop(0,'rgba(184,48,15,0.10)');wash.addColorStop(1,'rgba(184,48,15,0)');c.fillStyle=wash;c.fillRect(x,y,w,h);}
    var icon = Math.min(48, Math.max(32, Math.min(h - 10, 48)));
    skillMark(c, n, x + icon * 0.55 + 4, y + icon * 0.55 + 4, icon);
    var tx = x + icon + 8;
    skillDraw(c, b.names, tx, y + b.yName, b.sz.name, true, locked && lv === 0 ? '#9a9486' : T.ink, b.nameLh);
    skillDraw(c, b.effs, tx, y + b.yEff, b.sz.eff, false, locked && lv === 0 ? '#aaa598' : T.inkSoft, b.effLh);
    skillDraw(c, b.costs, tx, y + b.yCost, b.sz.cost, true, maxed ? '#b8860b' : can ? '#2e7d32' : st.st === 'nopts' ? '#9a6a1a' : '#a0705a', b.costLh);
    K.hit(x, y, w, h, 'node', { hero: hi, id: n.id });
    return { n: n, st: st, hov: ov };
  }
  function skills(c, G, app) {
    R.dim(c, app, 0.66); XY.ui.hits.length = 0; P.begin(c, app);
    var W = K.W, H = K.H, port = K.port, m = 6, n = G.heroes.length, PT = 9, i, rt = app.rt;
    if (XY.tutSkillSync) XY.tutSkillSync(G, app);
    var tab = app.skillTab; if (tab !== PT && tab < n && G.heroes[tab].down) tab = app.skillTab = PT;
    P.paper(c,W,H);
    var x0 = m + 8, w0 = W - 2 * m - 16, y = m + 6;
    // —— 顶栏
    var msg = app.skillMsg && app.skillMsg.until > rt ? app.skillMsg : null;
    K.t('修行 · '+G.points+'点',x0+4,y+22,18,'#a42d19','left',true);K.ink(x0,y+43,106,.4,12);
    var cw = 96, aw = 132;
    function autoInk(ax, ay) {
      c.save();
      c.font = '16px "Ma Shan Zheng","KaiTi",serif';
      c.fillStyle = '#5c4a38';
      c.textAlign = 'left'; c.textBaseline = 'middle';
      c.fillText('自动加点', ax + 4, ay + 22);
      c.save();
      c.translate(ax + 96, ay + 22); c.rotate(-0.08);
      c.fillStyle = G.autoPoints ? '#a42d19' : 'rgba(164,45,25,0.28)';
      c.fillRect(-15, -15, 30, 30);
      c.fillStyle = '#f6efe2';
      c.font = '14px "Ma Shan Zheng","KaiTi",serif';
      c.textAlign = 'center';
      c.fillText(G.autoPoints ? '开' : '关', 0, 1);
      c.restore(); c.restore();
      K.hit(ax, ay, aw, 44, 'autopts');
    }
    if (port) { autoInk(x0 + 126, y); K.btn(x0 + w0 - cw, y, cw, 44, '关闭', 'closeSkills', null, { primary: true, size: 16 }); }
    else {
      K.btn(x0 + w0 - cw, y, cw, 44, '关闭', 'closeSkills', null, { primary: true, size: 16 }); autoInk(x0 + w0 - cw - 8 - aw, y);
      var mx = x0 + 126, mw2 = w0 - 126 - cw - aw - 24;
      if (msg) K.tf(msg.text, mx + 10, y + 22, mw2, 13.5, msg.bad ? '#c0392b' : '#2e7d32', 'left', true, 11); else { var hint = ['技能点全队共用 · 每位角色 1 条根 + 3 条分支（后半段甲乙二选一）', '技能点全队共用 · 分支后半段甲乙二选一', '技能点全队共用'].filter(function (t, i, a) { return i === a.length - 1 || K.fit(t, mw2 - 10, 12.5, false, 10.5).s === t; })[0]; K.tf(hint, mx + 10, y + 22, mw2, 12.5, T.inkSoft, 'left', false, 10.5); }
    }
    y += 50;
    if (port && msg) { K.tf(msg.text, x0 + 4, y - 2, w0 - 8, 12.5, msg.bad ? '#c0392b' : '#2e7d32', 'left', true, 10.5); }
    // —— 页签
    var ids = []; for (i = 0; i < n; i++) ids.push(i); ids.push(PT); if (G.fb) ids.push(10); ids.push(11);
    function tabDraw(id, x, yy, w, hh) {
      var hd = id < n ? G.heroes[id] : null, dead = hd && hd.down, act = tab === id, col = hd ? hd.def.color : '#d9a21a';
      if(act){ c.fillStyle='rgba(184,48,15,0.12)';c.beginPath();c.ellipse(x+w/2,yy+hh/2,w/2-1,hh/2-3,0,0,PI2);c.fill(); }
      if(XY.INKP)XY.INKP.stroke(c,x+6,yy+hh-3,x+w-6,yy+hh-2,act?2:0.8,act?'184,48,15':'83,61,34',act?0.7:0.24,id+12,0.004);
      if (hd) { c.save(); if (dead) c.globalAlpha = 0.35; XY.hud2.face(c, hd, x+(w>=80?20:w/2), yy+(w>=80?22:15), w>=80?14:11,rt); c.restore(); if (w >= 80) K.tf(hd.def.name, x + 38, yy + 22, w - 42, 13, dead ? '#8a8578' : T.ink, 'left', true, 10.5); else K.tf(hd.def.name, x + w / 2, yy + 35, w - 4, 11.5, dead ? '#8a8578' : T.ink, 'center', true, 10); }
      else K.tf(id === PT ? '全队' : (id === 10 ? '法宝' : '说明'), x + w / 2, yy + hh / 2, w - 6, 14, T.ink, 'center', true, 11);
      if (!dead) K.hit(x, yy, w, hh, 'tab', { i: id });
    }
    if (port) {
      var tw = (w0 - (n - 1) * 5) / n; for (i = 0; i < n; i++) tabDraw(i, x0 + i * (tw + 5), y, tw, 44); y += 49;
      var ex = ids.slice(n), ew = (w0 - (ex.length - 1) * 5) / ex.length; ex.forEach(function (id, k) { tabDraw(id, x0 + k * (ew + 5), y, ew, 44); }); y += 49;
    } else { var tw3 = (w0 - (ids.length - 1) * 5) / ids.length; ids.forEach(function (id, k) { tabDraw(id, x0 + k * (tw3 + 5), y, tw3, 44); }); y += 49; }
    var bottom = H - m - 6;
    if (tab === 11) { helpPage(c, x0, y, w0, bottom - y); P.end(c); return; }
    if (tab === 10 && G.fb) { fbPage(c, G, app, x0, y, w0, bottom - y); P.end(c); return; }
    // —— 子页签
    var h = tab !== PT ? G.heroes[tab] : null, subs = subList(G, tab, h), key = tab, sub = (app._pvSub && app._pvSub[key]) || 0; if (sub >= subs.length) sub = 0;
    var sw = (w0 - (subs.length - 1) * 5) / subs.length;
    subs.forEach(function (s, k) {
      var on = sub === k, bx = x0 + k * (sw + 5);
      K.t(s.n, bx + sw / 2, y + 18, sw < 90 ? 14 : 16, on ? '#a42d19' : '#24180f', 'center', true);
      if (XY.INKP) XY.INKP.stroke(c, bx + 8, y + 32, bx + sw - 8, y + 32, on ? 2.2 : 0.7, on ? '164,45,25' : '83,61,34', on ? 0.85 : 0.28, k + 7, 0.012);
      K.hit(bx, y, sw, 40, 'pvSub', { i: k });
    });
    y += 44;
    // —— 修行谱：前置关系按层分岔，全队独立加成按错落墨点展开
    var S0 = subs[sub], detH = port ? 72 : (H < 480 ? 48 : 64), gy = y, cardHi = tab === PT ? -1 : S0.hi, gap = 10, minW = port ? 118 : 148;
    function tallest(nodes, ww) { var m = 72, i; for (i = 0; i < nodes.length; i++) m = Math.max(m, skillBody(c, G, cardHi, nodes[i], ww).h); return m; }
    var probe = S0.nodes.length ? tallest(S0.nodes, Math.max(minW, w0)) : 72;
    if (probe + 8 > bottom - detH - 6 - gy) detH = Math.max(48, bottom - gy - 8 - probe);
    var gh = bottom - detH - 6 - gy, col = h ? h.def.color : '#d9a21a', rects = [];
    var nn = S0.nodes.length, layout=[], byId={}, depth={}, layered=false;
    S0.nodes.forEach(function(nd){byId[nd.id]=nd;depth[nd.id]=0;});
    for(var pass=0;pass<nn;pass++)S0.nodes.forEach(function(nd){Object.keys((nd.req&&nd.req[0])||{}).forEach(function(id){if(byId[id]){layered=true;depth[nd.id]=Math.max(depth[nd.id],depth[id]+1);}});});
    var ordered = [];
    if (layered) { var lv = 1, id; Object.keys(depth).forEach(function (k) { lv = Math.max(lv, depth[k] + 1); }); var bucket = []; for (id = 0; id < lv; id++) bucket.push([]); S0.nodes.forEach(function (nd) { bucket[depth[nd.id]].push(nd); }); bucket.forEach(function (g) { g.forEach(function (nd) { ordered.push(nd); }); }); }
    else ordered = S0.nodes.slice();
    var maxCols = Math.max(1, Math.min(ordered.length || 1, Math.floor((w0 + gap) / (minW + gap))));
    var cols = maxCols, ww = (w0 - (cols - 1) * gap) / cols, oneH = ordered.length ? tallest(ordered, ww) : 72;
    function room() { if (oneH > gh && detH > 48) { var give = Math.min(detH - 48, oneH - gh); detH -= give; gh += give; } }
    room();
    while (cols > 1 && oneH > gh) { cols--; ww = (w0 - (cols - 1) * gap) / cols; oneH = ordered.length ? tallest(ordered, ww) : 72; room(); }
    var pages = [[]], used = 0, row = [];
    function rowH(r) { var m = 0, i; for (i = 0; i < r.length; i++) if (r[i].h > m) m = r[i].h; return m; }
    ordered.forEach(function (nd, i) {
      row.push({ nd: nd, h: Math.max(72, skillBody(c, G, cardHi, nd, ww).h) });
      if (row.length === cols || i === ordered.length - 1) {
        var rh = rowH(row);
        if (pages[pages.length - 1].length && used + gap + rh > gh + 0.5) { pages.push([]); used = 0; }
        row.forEach(function (it, k) { pages[pages.length - 1].push({ nd: it.nd, x: x0 + k * (ww + gap), y: gy + used, w: ww, h: rh }); });
        used += rh + gap; row = [];
      }
    });
    var pageKey = 'skillPg' + tab + '-' + sub, pageN = pages.length, savedPage = P.folio[pageKey], pageI = ((savedPage || 0) % pageN + pageN) % pageN, pin = null, step = G.tut && XY.tutSteps ? XY.tutSteps(G)[G.tut.i] : null;
    if (step && step.id === 'skillLook' && XY.rootSkill) { var rs = XY.rootSkill(G); if (rs && rs.node) pin = rs.node.id; }
    else if (step && step.id === 'skillMark') pin = 'p_tower';
    if (pin) { pages.forEach(function (p, i) { if (p.some(function (it) { return it.nd.id === pin; })) pageI = i; }); P.folio[pageKey] = pageI; }
    else if (savedPage == null) P.folio[pageKey] = pageI;
    layout = pages[pageI] || [];
    if (layered && layout.length) {
      var groups = {}, maxD = 0, d0;
      layout.forEach(function (p) { var d = depth[p.nd.id] || 0; (groups[d] = groups[d] || []).push(p); if (d > maxD) maxD = d; });
      var rowsN = maxD + 1, band = gh / rowsN;
      for (d0 = 0; d0 < rowsN; d0++) {
        var g0 = groups[d0] || [], nat = 72, gi;
        for (gi = 0; gi < g0.length; gi++) nat = Math.max(nat, g0[gi].h);
        var gap0 = g0.length > 2 ? 40 : 28;
        var nw0 = g0.length < 2 ? Math.min(w0 * 0.46, 320) : (w0 - Math.max(0, g0.length - 1) * gap0) / g0.length;
        var nh0 = Math.max(nat, Math.min(148, Math.max(nat, band - 8)));
        var total0 = g0.length * nw0 + Math.max(0, g0.length - 1) * gap0, xs0 = x0 + (w0 - total0) / 2;
        g0.forEach(function (p, k) { p.x = xs0 + k * (nw0 + gap0); p.y = gy + d0 * band + Math.max(2, (band - nh0) / 2); p.w = nw0; p.h = nh0; });
      }
    } else if (layout.length === 1) {
      layout[0].w = Math.min(layout[0].w, w0 * 0.72);
      layout[0].x = x0 + (w0 - layout[0].w) / 2;
      layout[0].h = Math.min(Math.max(layout[0].h, 88), gh - 8);
      layout[0].y = gy + (gh - layout[0].h) / 2;
    } else if (layout.length) {
      var rows = Math.ceil(layout.length / cols), band2 = gh / rows;
      layout.forEach(function (p, i) {
        var r = Math.floor(i / cols), k = i % cols, nIn = Math.min(cols, layout.length - r * cols);
        var ww2 = Math.min(p.w, (w0 - (nIn - 1) * 14) / nIn), total = nIn * ww2 + (nIn - 1) * 14;
        p.w = ww2; p.x = x0 + (w0 - total) / 2 + k * (ww2 + 14);
        p.h = Math.max(p.h, 64);
        p.y = gy + r * band2 + Math.max(2, (band2 - p.h) / 2);
      });
    }
    c.save();
    layout.forEach(function (p) {
      Object.keys((p.nd.req && p.nd.req[0]) || {}).forEach(function (id) {
        var prev = layout.filter(function (t) { return t.nd.id === id; })[0];
        if (!prev) return;
        var x1 = prev.x + prev.w / 2, y1 = prev.y + prev.h, x2 = p.x + p.w / 2, y2 = p.y;
        if (XY.INKP) XY.INKP.stroke(c, x1, y1, x2, y2, 2.1, '42,32,22', 0.72, (id.length * 3 + p.nd.id.length) % 19, 0.09);
        else { c.strokeStyle = 'rgba(42,32,22,0.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
      });
    });
    c.restore();
    if(pageN>1){K.btn(x0+w0-196,bottom-detH+8,92,36,'上一页','folio',{key:pageKey,i:(pageI+pageN-1)%pageN},{size:14,minS:12});K.btn(x0+w0-98,bottom-detH+8,92,36,(pageI+1)+' / '+pageN,'folio',{key:pageKey,i:(pageI+1)%pageN},{size:14,minS:12});}
    if(S0.locked)K.tf('🔒 角色升到 Lv4 开放（'+XY.SP_LV_AT[3]+' 张角色卡）',x0+w0/2,gy+gh/2,w0-20,15,'#8a5a10','center',true,12);
    else if(!nn)K.t('这一页没有技能',x0+w0/2,gy+gh/2,15,T.inkSoft,'center',false);
    else layout.forEach(function(p){rects.push(nodeCard(c,G,app,tab===PT?-1:S0.hi,p.nd,p.x,p.y,p.w,p.h,tab===PT?(S0.n==='协同技'?'#c0489a':'#d9a21a'):col));});
    // —— 详情条
    var dy = bottom - detH, hv = null, dw = w0 - 24 - (pageN > 1 ? 210 : 0); rects.forEach(function (r) { if (r.hov) hv = r; });
    if(XY.INKP)XY.INKP.stroke(c,x0,dy,x0+w0,dy-1,1.5,'83,61,34',0.3,39,0.004);
    if (hv) {
      var nd2 = hv.n, st = hv.st, ty = XY.nodeType(nd2), okk = st.st === 'ok';
      K.lines(nd2.name + ' · 等级 ' + st.lv + '/' + nd2.max + ' · ' + ty.name, x0 + 12, dy + Math.min(22, detH * 0.28), dw, port ? 16 : 18, port ? 20 : 22, T.ink, 2, true);
      var nxt = '现在：' + (st.lv > 0 ? XY.nodeText(nd2, st.lv) : '（还没学）') + '　下一级：' + (st.lv < nd2.max ? XY.nodeText(nd2, st.lv + 1) + '（' + nd2.cost[st.lv] + ' 点）' : '已满');
      K.lines(nxt, x0 + 12, dy + Math.min(port ? 58 : 46, detH * 0.55), dw, port ? 15 : 16, port ? 19 : 20, '#8a5a10', 3, false);
    } else K.lines(tab !== PT ? G.heroes[tab].def.name + '：生命 ' + Math.ceil(G.heroes[tab].hp) + '/' + G.heroes[tab].maxHp + ' · 点一张卡学习，学前先看效果；甲乙二选一，选了一边另一边就锁了。' : '全队强化不占英雄的技能位；协同技要两位搭档都在队里。', x0 + 12, dy + Math.min(28, detH * 0.4), dw, port ? 15 : 16, 22, T.inkSoft, 3, false);
    P.end(c);
  }
  function helpPage(c,x,y,w,h){
    var pick=(P.folio.help||0)%HELP.length, sc=HELP[pick], rt=(XY.app&&XY.app.rt)||0;
    var narrow=w<480;
    var foot=y+h-50, artH=Math.max(120, Math.min(h*0.46, foot-y-150));
    var ax=x+48, ay=y+8;
    function kaiSafe(c2,s,xx,yy,sz,col,align){ c2.save(); c2.font=sz+'px "Ma Shan Zheng","KaiTi",serif'; c2.fillStyle=col; c2.textAlign=align||'center'; c2.textBaseline='middle'; c2.fillText(s,xx,yy); c2.restore(); }
    function hd(id, cx, cy, ht){
      if(!helpPage.bag) helpPage.bag={};
      var im=helpPage.bag[id];
      if(!im){ im=helpPage.bag[id]=new Image(); im.src='assets/art/battle-hd/'+id+'.webp'; }
      if(!(im.complete&&im.naturalWidth)) return;
      var sca=ht/im.naturalHeight, dw=im.naturalWidth*sca;
      c.drawImage(im, cx-dw/2, cy, dw, ht);
    }
    c.save();
    c.beginPath(); c.rect(x, y, w, artH + 12); c.clip();
    if (XY.INKP) XY.INKP.stroke(c, x+20, ay+artH, x+w*0.46, ay+artH-2, 1.2, '83,61,34', 0.35, 4, 0.01);
    var span = Math.min(w - 96, 820), ox = x + 56;
    if(pick===0){
      hd('tang', ox+span*0.20, ay, artH*0.92);
      hd('wukong', ox+span*0.42, ay+6, artH*0.78);
      hd('bajie', ox+span*0.64, ay+10, artH*0.7);
      kaiSafe(c,'一路向西', ox+span*0.46, ay+artH*0.9, 18, '#5c4a38');
    } else if(pick===1){
      hd('wukong', ox+span*0.28, ay, artH*0.88);
      hd('bajie', ox+span*0.62, ay, artH*0.88);
      c.strokeStyle='#24180f'; c.lineWidth=2.2;
      c.beginPath(); c.moveTo(ox+span*0.40, ay+artH*0.42); c.lineTo(ox+span*0.52, ay+artH*0.42); c.stroke();
      c.beginPath(); c.moveTo(ox+span*0.52, ay+artH*0.42); c.lineTo(ox+span*0.48, ay+artH*0.37); c.moveTo(ox+span*0.52, ay+artH*0.42); c.lineTo(ox+span*0.48, ay+artH*0.47); c.stroke();
    } else if(pick===2){
      ['arrow','cannon','frost'].forEach(function(id,i){
        var cx=ox+span*(0.16+i*0.28), cy=ay+artH*0.5, s=artH*0.4;
        var drew=XY.ICONINK&&XY.ICONINK.sol&&XY.ICONINK.sol(c,id,cx,cy-s*0.2,s*1.6);
        if(!drew){ c.save(); c.translate(cx,cy); c.strokeStyle=i===1?'#a42d19':'#24180f'; c.lineWidth=3; c.lineCap='round';
          c.beginPath(); c.arc(0,-s*0.55,s*0.16,0,6.3); c.stroke();
          c.beginPath(); c.moveTo(0,-s*0.36); c.lineTo(0,s*0.15); c.moveTo(-s*0.28,-s*0.05); c.lineTo(s*0.28,-s*0.12); c.moveTo(0,s*0.15); c.lineTo(-s*0.16,s*0.48); c.moveTo(0,s*0.15); c.lineTo(s*0.16,s*0.48); c.stroke();
          c.restore(); }
        kaiSafe(c,['弓手','炮手','冰阵'][i],cx,ay+artH*0.88,18,'#24180f');
      });
    } else if(pick===3){
      var icons=['金箍棒','筋斗云','紧箍咒'];
      icons.forEach(function(nm,i){ var cx=ox+span*(0.16+i*0.26), cy=ay+artH*0.36; if(!(XY.ICONINK&&XY.ICONINK.draw(c,nm,cx,cy,artH*0.55))) kaiSafe(c,nm,cx,cy,26,'#24180f'); else kaiSafe(c,nm,cx,ay+artH*0.78,16,'#24180f'); });
    } else if(pick===4){
      hd('phyrex', ox+span*0.32, ay, artH*0.9);
      kaiSafe(c,'召唤登场', ox+span*0.62, ay+artH*0.4, 26, '#a42d19');
    } else if(pick===5){
      kaiSafe(c,'暂驻', ox + span * 0.08, ay + artH * 0.16, 32, '#a42d19', 'left');
      ['继续','声音','自动加点','自动选宝'].forEach(function(t,i){ kaiSafe(c, t, ox + span * 0.08, ay + artH * (0.34 + i * 0.15), 26, '#24180f', 'left'); });
    } else {
      c.strokeStyle='rgba(90,70,48,0.7)'; c.lineWidth=1.4;
      c.beginPath(); c.moveTo(ox+10, ay+artH*0.7); c.quadraticCurveTo(ox+span*0.4, ay+artH*0.2, ox+span*0.85, ay+artH*0.55); c.stroke();
      hd('tang', ox+span*0.42, ay+artH*0.12, artH*0.62);
      kaiSafe(c,'关口', ox+span*0.78, ay+artH*0.4, 16, '#a42d19');
    }
    c.restore();
    var tx = x + 28, tw = w - 56, titleY = ay + artH + 22;
    kaiSafe(c, sc[0], tx, titleY, narrow ? 24 : 32, '#a42d19', 'left');
    if (XY.INKP) XY.INKP.stroke(c, tx, titleY + 18, tx + Math.min(160, tw * 0.2), titleY + 18, 1.8, '164,45,25', 0.55, pick + 2, 0.01);
    var lines=sc[1].length?sc[1]:['这里汇总当前战况：血量、任务和还要走多久。'];
    var top = titleY + 36, bot = foot - 6, band = (bot - top) / lines.length;
    lines.forEach(function (sentence, i) {
      var sz = narrow ? 22 : 36;
      c.font = sz + 'px "Ma Shan Zheng","KaiTi",serif';
      while (sz > 18 && c.measureText(sentence).width > tw) { sz -= 1; c.font = sz + 'px "Ma Shan Zheng","KaiTi",serif'; }
      var wrapped = [], cur = '';
      for (var ci = 0; ci < sentence.length; ci++) {
        var ch = sentence.charAt(ci);
        if (cur && c.measureText(cur + ch).width > tw) { wrapped.push(cur); cur = ch; }
        else cur += ch;
      }
      if (cur) wrapped.push(cur);
      var step = Math.min(sz + 12, (band - 8) / wrapped.length);
      wrapped.forEach(function (ln, k) {
        var ly = top + band * i + 8 + k * step + sz * 0.45;
        c.font = sz + 'px "Ma Shan Zheng","KaiTi",serif';
        var twid = c.measureText(ln).width, extra = Math.max(0, tw - twid), gap = ln.length > 1 ? Math.min(sz * 0.85, extra / (ln.length - 1)) : 0;
        var cx = tx;
        c.save(); c.font = sz + 'px "Ma Shan Zheng","KaiTi",serif'; c.fillStyle = '#24180f'; c.textAlign = 'left'; c.textBaseline = 'middle';
        for (var gi = 0; gi < ln.length; gi++) { c.fillText(ln.charAt(gi), cx, ly); cx += c.measureText(ln.charAt(gi)).width + gap; }
        c.restore();
      });
    });
    HELP.forEach(function(v,i){
      var bx=x+i*w/HELP.length, bw=w/HELP.length-4, on=i===pick;
      c.save();
      if(on){ c.fillStyle='#a83224'; c.beginPath(); c.moveTo(bx+4,foot+4); c.quadraticCurveTo(bx+bw/2,foot-2,bx+bw-3,foot+6); c.lineTo(bx+bw-5,foot+36); c.quadraticCurveTo(bx+bw/2,foot+44,bx+5,foot+34); c.closePath(); c.fill(); c.fillStyle='#fff6e8'; }
      else { c.strokeStyle='rgba(42,32,22,0.4)'; c.beginPath(); c.moveTo(bx+6,foot+34); c.quadraticCurveTo(bx+bw/2,foot+26,bx+bw-6,foot+34); c.stroke(); c.fillStyle='#24180f'; }
      c.font='14px "Ma Shan Zheng","KaiTi",serif'; c.textAlign='center'; c.textBaseline='middle';
      c.fillText(v[0], bx+bw/2, foot+(on?18:16));
      c.restore();
      K.hit(bx,foot,bw,42,'folio',{key:'help',i:i});
    });
  }
  function fbPage(c,G,app,x,y,w,h){
    var FB=XY.fabao,f=G.fb,C=XY.C,view=app.fbView||'carry',vs=[['carry','携带'],['sets','门派'],['recipe','配方'],['dex','图鉴']],reserve=view==='dex'?Math.min(130,w*.3):0,cw=(w-reserve-18)/4;
    vs.forEach(function(v,i){K.btn(x+i*(cw+6),y,cw,44,v[1],'fbView',{k:v[0]},{on:view===v[0],size:14});});
    if(view==='dex'){var fl=[['all','全部'],['f','法宝'],['l','灵物'],['u','已解锁']],fi=fl.findIndex(function(v){return v[0]===(app.fbFilter||'all');});K.btn(x+w-reserve,y,reserve,44,'筛：'+fl[fi][1]+' ›','fbFilter',{k:fl[(fi+1)%fl.length][0]},{size:12.5});}
    y+=52;h-=52;
    if(view==='recipe')return fbRecipes(c,G,app,x,y,w,h);
    if(view==='dex')return fbDex(c,G,app,x,y,w,h);
    if(view==='sets'){
      var ss=Object.keys(FB.SET_NAME),pg=P.pager(ss.length,1,'fbsets',x,y+h-44,w),sid=ss[pg],cm=G.combos.find(function(b){return b.set===sid;})||{n:0,tier:0},icon=FB.ITEMS.find(function(z){return z.set===sid;});
      P.object(c,icon?icon.name:FB.SET_NAME[sid],x+w*(K.port?.5:.22),y+(h-44)*(K.port?.64:.52),K.port?Math.min(w*.8,(h-44)*.52):Math.min(200,h-72),false);var tx=x+(K.port?12:w*.47),tw=K.port?w-24:w*.52;
      K.t(FB.SET_NAME[sid]+'门派',tx,y+24,22,'#a42d19','left',true);var yy=K.lines('本局 '+cm.n+' 件 · '+(cm.tier>=2?'大加成':cm.tier?'小加成':'未触发'),tx,y+55,tw,13,18,T.inkSoft,2,false);
      yy=K.lines('2件：'+XY.comboText(sid,0),tx,yy+8,tw,13,18,T.ink,4,false);K.lines('4件：'+XY.comboText(sid,1),tx,yy+6,tw,13,18,T.ink,4,false);return;
    }
    var items=[];for(var i=0;i<C.FB.SLOT_F+C.FB.SLOT_L;i++)items.push({s:i<C.FB.SLOT_F?f.w[i]:f.s[i-C.FB.SLOT_F],isL:i>=C.FB.SLOT_F});
    var pick=Math.min(P.folio.fbCarry||0,items.length-1),it=items[pick],s=it.s,mainH=h-78,sz=K.port?Math.min(w*.8,mainH*.6):Math.max(42,Math.min(206,mainH-18)),tx=x+(K.port?12:w*.44),tw=K.port?w-24:w*.55;
    if(s){var inf=FB.info(s.id),mx=inf.sup?1:FB.maxLv(s.id);P.object(c,inf.name,x+w*(K.port?.5:.2),y+mainH*(K.port?.64:.5),sz,false);K.tf(inf.name+(inf.sup?' · 超级':it.isL?' · 灵物':''),tx,y+18,tw,22,T.ink,'left',true,14);var yy=K.lines(inf.d,tx,y+48,tw,13,18,T.ink,8,false);K.lines('Lv'+s.lv+'/'+mx+(inf.set?' · '+FB.SET_NAME[inf.set]+'门派':''),tx,yy+8,tw,12,16,T.inkSoft,2,false);}
    else {K.t('虚位',x+w*.2,y+mainH*.45,Math.max(26,Math.min(54,mainH*.4)),'#a39579','center',true);K.t(it.isL?'灵物尚未携带':'法宝尚未携带',tx,y+26,20,T.ink,'left',true);K.lines('局内选择法宝后，会出现在此。全队共用；门派加成见「门派」卷。',tx,y+60,tw,13,18,T.inkSoft,5,false);}
    items.forEach(function(it,i){var step=w/items.length,cx=x+step*(i+.5),yy=y+h-55+[4,-2,6,0,3,-1][i%6];if(it.s)P.object(c,FB.info(it.s.id).name,cx,yy+10,32,false);else K.t(it.isL?'灵':'宝',cx,yy+10,18,'#aa9a7a','center',true);if(i===pick)K.ink(cx-15,yy+34,30,.7,i+2);K.hit(cx-step/2+2,y+h-67,step-4,58,'folio',{key:'fbCarry',i:i});});
    K.tf('法宝 '+f.w.length+'/'+C.FB.SLOT_F+' · 灵物 '+f.s.length+'/'+C.FB.SLOT_L,x,y+h-5,w,12,T.inkSoft,'left',false,11);
  }
  function fbRecipes(c,G,app,x,y,w,h){
    var FB=XY.fabao, rs=FB.RECIPES, key='fbrec';
    var pg=Math.max(0, Math.min(P.page[key]||0, rs.length-1)); P.page[key]=pg;
    var idx=pg, r=rs[idx], st=FB.recipeState(G,r), A=FB.BY[r.a], B=FB.BY[r.b], sup=FB.SUP[r.sup], pinned=G.fb.pin===r.id;
    var tag={ready:'现在可以炼',prog:'材料还在攒',missB:'还缺 '+B.name,locked:'还没解锁',done:'已经炼成'}[st.st];
    function kaiR(s,xx,yy,sz,col,mw,al){
      c.save(); var face='"Ma Shan Zheng","KaiTi",serif'; c.font=sz+'px '+face; c.fillStyle=col; c.textAlign=al||'center'; c.textBaseline='middle';
      if(mw && c.measureText(s).width>mw){ sz=Math.max(12, sz*mw/c.measureText(s).width); c.font=sz+'px '+face; }
      c.fillText(s, xx, yy); c.restore();
    }
    kaiR('两件材料炼成一件更强的法宝。满级的那件配上带着的另一件。', x+w/2, y+18, 16, '#5c4a38', w-24, 'center');
    var mid=y+36+(h-120)*0.38, sz=Math.min(180, (h-130)*0.46, w*0.22);
    function piece(name, cx, cy, s){
      var drew = XY.ICONINK && XY.ICONINK.draw(c, name, cx, cy, Math.min(s, 150));
      kaiR(name, cx, cy + (drew ? Math.min(s, 150) * 0.58 : 0), 16, '#24180f', w*0.24, 'center');
    }
    piece(A.name, x+w*0.14, mid, sz);
    kaiR('+', x+w*0.28, mid, 32, '#a42d19', 36, 'center');
    piece(B.name, x+w*0.40, mid, sz*0.9);
    c.save(); c.strokeStyle='rgba(42,32,22,0.8)'; c.lineWidth=2.2; c.beginPath();
    c.moveTo(x+w*0.50, mid); c.lineTo(x+w*0.58, mid); c.moveTo(x+w*0.58, mid); c.lineTo(x+w*0.55, mid-6); c.moveTo(x+w*0.58, mid); c.lineTo(x+w*0.55, mid+6); c.stroke(); c.restore();
    piece(sup.name, x+w*0.72, mid, sz*2.0);
    kaiR('条件：'+A.name+'满级，并且带着'+B.name, x+w/2, y+h-88, 16, '#24180f', w-28, 'center');
    kaiR(tag+'。'+sup.d, x+w/2, y+h-64, 15, '#5c4a38', w-28, 'center');
    var pinX=x+w*0.22, pinW=w*0.56;
    c.save(); c.fillStyle='#24180f'; c.font='16px "Ma Shan Zheng","KaiTi",serif'; c.textAlign='center'; c.textBaseline='middle';
    c.fillText((pinned?'已钉在战场':'钉此配方'), pinX+pinW/2, y+h-28); c.restore();
    if (XY.villainUI && XY.villainUI.drawSeal) XY.villainUI.drawSeal(c, pinX+pinW/2+70, y+h-40, 28, 28, pinned?'钉':'印', {sz:14, stack:false});
    K.hit(pinX, y+h-50, pinW, 42, 'fbPin', {rid:r.id});
    function arr(xx, lab, d){
      c.save(); c.strokeStyle='#24180f'; c.lineWidth=2.4; c.beginPath();
      if (lab==='上') { c.moveTo(xx+18, y+h-16); c.lineTo(xx+18, y+h-40); c.moveTo(xx+10, y+h-32); c.lineTo(xx+18, y+h-40); c.lineTo(xx+26, y+h-32); }
      else { c.moveTo(xx+18, y+h-40); c.lineTo(xx+18, y+h-16); c.moveTo(xx+10, y+h-24); c.lineTo(xx+18, y+h-16); c.lineTo(xx+26, y+h-24); }
      c.stroke(); c.restore();
      K.hit(xx, y+h-48, 36, 40, 'pvPage', {key:key, d:d});
    }
    kaiR((idx+1)+' / '+rs.length, x+w-12, y+40, 16, '#5c4a38', 80, 'right');
    arr(x+8, '上', -1); arr(x+w-44, '下', 1);
  }
  function fbDex(c,G,app,x,y,w,h){
    var FB=XY.fabao,flt=app.fbFilter||'all',list=FB.ITEMS.filter(function(z){return flt==='all'||(flt==='u'?FB.unlocked(z.id):z.kind===flt);}),small=!K.port&&K.W<950,per=small?1:4,start=P.pager(list.length,per,'fbdex',x,y+h-44,w);
    if(!list.length){K.lines('没有符合筛选的物件。',x+20,y+40,w-40,16,22,T.inkSoft,4,false);return;}
    var slice=list.slice(start,start+per),sel=P.folio.fbDex,chosen=slice.find(function(z){return z.id===sel;})||slice[0],un=FB.unlocked(chosen.id),mainH=small?h-54:h-155,sz=K.port?Math.min(w*.8,mainH*.6):Math.min(230,mainH-16),tx=x+(K.port?12:w*.44),tw=K.port?w-24:w*.55;
    P.object(c,chosen.name,x+w*(K.port?.5:.2),y+mainH*(K.port?.64:.5),Math.max(36,sz),!un);K.tf(un?chosen.name:'未解锁',tx,y+22,tw,22,T.ink,'left',true,14);var yy=K.lines((chosen.kind==='l'?'灵物':'法宝')+' · 图鉴 '+FB.ITEMS.filter(function(z){return FB.unlocked(z.id);}).length+'/'+FB.ITEMS.length,tx,y+51,tw,12,17,T.inkSoft,2,false);yy=K.lines(un?chosen.d:'解锁后可查看效果',tx,yy+7,tw,13,18,T.ink,8,false);K.lines('来处：'+FB.whereText(chosen.id),tx,yy+8,tw,12,17,T.inkSoft,5,false);
    if(!small)slice.forEach(function(z,i){var cx=x+w*(i+.5)/slice.length,yy=y+h-115+[4,-4,9,0][i],on=z.id===chosen.id;P.object(c,z.name,cx,yy,48,!FB.unlocked(z.id));K.tf(FB.unlocked(z.id)?z.name:'？？？',cx,yy+38,w/slice.length-10,12,on?'#a42d19':T.ink,'center',true,11);K.hit(cx-w/slice.length/2+2,y+h-147,w/slice.length-4,94,'folio',{key:'fbDex',i:z.id});});
  }

  var oDraw = XY.screens.draw;
  XY.screens.draw = function (c, G, app) { if (app.screen === 'dex' && XY.ui2 && XY.ui2.on) { K = P.K; dex(c, G, app); if (app.confirm) oDraw(c, G, { screen: '__none', confirm: app.confirm, lw: app.lw, lh: app.lh, mouse: app.mouse, rt: app.rt }); return; } return oDraw(c, G, app); };
  var oSk = XY.R4.skills;
  XY.R4.skills = function (c, G, app) { if (XY.ui2 && XY.ui2.on) return skills(c, G, app); return oSk(c, G, app); };
  var oBegin = P.begin; P.begin = function (c, app) { var k = oBegin(c, app); K = k; return k; };
})();
