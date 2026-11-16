/* ============================================================
 * pv2b.js —— v0.8.6 手机版 UI v2（续）：图鉴 / 技能树菜单（英雄页 · 全队页 · 法宝页 · 说明页）。CSS 像素排版，按钮 ≥ 44。
 * 技能树把「一屏 30 个小格」改成：英雄页签 → 子页签（根 / 分支 1~3 / 辅助）→ 每页 ≤ 8 个大卡，点卡 = 学习（act 'node' 不变）。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, R = XY.R, T = R.T, S = XY.save, PI2 = Math.PI * 2, P = XY.pv2, K;
  var BRUSH = '"Ma Shan Zheng","KaiTi","STKaiti",serif';
  function brushTools(tool) {
    tool.fam = function () { return BRUSH; };
    tool.lines = function (s, x, y, w, size, lh, col, maxL, bold) {
      var lines = skillLines(tool.c, s, size, bold, w);
      if (maxL && lines.length > maxL) {
        lines = lines.slice(0, maxL); var end = lines.length - 1;
        tool.c.font = skillFont(size, bold);
        while (lines[end] && tool.c.measureText(lines[end] + '…').width > w) lines[end] = lines[end].slice(0, -1);
        lines[end] += '…';
      }
      skillDraw(tool.c, lines, x, y, size, bold, col, lh); return y + lines.length * lh;
    };
  }
  P.brushTools = brushTools;
  function ELC(e) { return (XY.ELEMS[e] || {}).color || '#888'; }
  function ELN(e) { return (XY.ELEMS[e] || {}).name || ''; }
  function tabChip(x, y, w, h, on, dead, col) {
    var c = K.c; K.rr(x, y, w, h, 12); c.fillStyle = dead ? '#dedbd3' : (on ? '#fff0c4' : (K.over(x, y, w, h) ? '#fff8e6' : '#fffdf6')); c.fill(); c.lineWidth = on ? 3 : 1.5; c.strokeStyle = dead ? '#b0ac9f' : (on ? (col || '#d9a21a') : '#cdbf9c'); c.stroke();
  }

  P.enemyStatsText=function(id){
    var d=XY.ENEMIES[id],C=XY.C;if(!d)return '';
    var atk=d.etower?C.ETOWER_DMG:d.dmg,n=function(v){return Math.round(v*100)/100;};
    var a=['基础生命 '+d.hp+' · 基础速度 '+d.speed,
      (d.etower?'基础炮击伤害 ':d.dive?'基础俯冲伤害 ':'基础攻击伤害 ')+n(atk*(d.dive?d.dive.mul:1))+(d.range?' · 远程':'')+(d.fly?' · 飞行':'')];
    if(d.denBoss)a.push('洞主按关卡的首领倍率生成，并会随战斗时间与出征强化；不套用普通小怪的全局倍率。');
    else if(d.etower)a.push('妖塔按关卡和场上时间计算生命，炮击按关卡强化；不套用普通小怪的全局倍率。');
    else a.push('普通怪与精英生成时，基础生命另乘'+C.ENEMY_HP_MUL+'，基础攻击另乘'+C.ENEMY_DMG_MUL+'，再计算关卡与场上时间的成长。');
    a.push('洞府难度、旅程继承、词缀和临时状态还会改变实战数值；这里不是当前战场上的最终生命或伤害。');
    a.push('命中护法时，接触伤害另乘'+C.HERO_CONTACT_DMG_MUL+'，远程或招式另乘'+C.HERO_HIT_DMG_MUL+'，之后结算五行、防御、减伤和护盾。唐僧使用独立的保护与阵亡规则。');
    return a.join('\n');
  };

  // Reading pages use the available text area; the catalogue stays a separate,
  // compact control strip instead of reserving the cover's full artwork ribbon.
  function dexReading(c,app,f,o){
    var short=!K.port,top=K.port?f.y+54:f.y+8,bot=f.y+f.h,left=short?Math.min(168,f.w*.32):0;
    var rx=short?f.x+left+16:f.x+6,rw=short?f.w-left-16:f.w-12,per=short?1:3;
    var titleX=short?f.x:rx,titleW=short?left:rw;
    K.tf(o.title,titleX,top+(short?20:63),titleW,short?22:21,o.colour,'left',true,18);
    var subEnd=K.lines(o.sub,titleX,top+(short?51:87),titleW,13,16,T.inkSoft,0,false);
    var catalogueY=short?Math.max(top+88,subEnd+8):bot-120,catalogueW=short?left:f.w,catalogueH=68;
    var pageY=short?bot-44:catalogueY-50,bodyTop=short?top+55:Math.max(top+104,subEnd+3),bodyBottom=pageY-8;
    var size=16,lh=23,rows=[];o.text.split(/\n+/).forEach(function(t){rows=rows.concat(skillLines(c,t,size,false,rw));});
    var capacity=Math.max(1,Math.floor((bodyBottom-bodyTop)/lh)),key='dex-body-'+o.tab+'-'+o.sel+'-'+o.view,pages=Math.max(1,Math.ceil(rows.length/capacity));
    var pg=Math.max(0,Math.min(P.page[key]||0,pages-1));P.page[key]=pg;
    var shown=rows.slice(pg*capacity,(pg+1)*capacity);skillDraw(c,shown,rx,bodyTop+size/2,size,false,T.ink,lh);
    if(pages>1){K.btn(rx,pageY,72,44,'前文','pvPage',{key:key,d:-1},{size:15,off:pg===0});K.t('正文 '+(pg+1)+'/'+pages,rx+rw/2,pageY+22,14,T.inkSoft,'center',true);K.btn(rx+rw-72,pageY,72,44,'后文','pvPage',{key:key,d:1},{size:15,off:pg+1===pages});}
    var catKey='inkdex-'+o.tab,start=P.pager(o.list.length,per,catKey,f.x,bot-44,catalogueW),items=[];
    o.list.slice(start,start+per).forEach(function(z,i){var x=f.x+i*catalogueW/per,w=catalogueW/per-4,on=z.id===o.sel;items.push({id:z.id,x:x,y:catalogueY,w:w,h:catalogueH});
      o.drawItem(z,x+w/2,catalogueY+17,26,32);K.lines(o.label(z),x+3,catalogueY+42,w-6,13,15,on?'#a42d19':T.ink,0,on);if(on)K.ink(x+8,catalogueY+66,w-16,.55,i+7);K.hit(x,catalogueY,w,catalogueH,'dexSel',{id:z.id});
    });
    XY.dexLayout={tab:o.tab,id:o.sel,view:o.view,short:short,reading:true,key:key,page:pg,pages:pages,fontSize:size,capacity:capacity,
      body:{x:rx,y:bodyTop,w:rw,h:bodyBottom-bodyTop},ribbonY:catalogueY,allRows:rows.slice(),rows:shown.map(function(t,i){return{text:t,x:rx,y:bodyTop+i*lh,w:rw,h:size};}),
      pager:pages>1?{x:rx,y:pageY,w:rw,h:44}:null,catalogue:{key:catKey,start:start,per:per,items:items}};
  }

  /* ================= 图鉴 ================= */
  function dex(c,G,app) {
    var f=P.frame(c,app,'',{centerWide:true});
    K=P.K; brushTools(K); K.t('众生藏卷',102,32,24,'#a42d19','left',true);
    var port=K.port,tab=app.dexTab||'enemy',hp=XY.dexH,tx=port?f.x:224,ty=port?f.y:f.y-52,nTabs=tab==='card'?4:3,tw=port?(f.w-18)/nTabs:Math.min(90,(f.chipX-tx-24)/nTabs);
    [['enemy','妖怪'],['card','法宝'],['syn','协同']].forEach(function(t,i){var on=tab===t[0],bx=tx+i*(tw+6);K.t(t[1],bx+tw/2,ty+20,16,on?'#a42d19':'#24180f','center',true);if(XY.INKP)XY.INKP.stroke(c,bx+6,ty+38,bx+tw-6,ty+38,on?2.2:0.7,on?'164,45,25':'83,61,34',on?0.85:0.28,i+4,0.01);K.hit(bx,ty,tw,44,'dexTab',{tab:t[0]});});
    if(tab==='card'){var bx4=tx+3*(tw+6),on4=!!app.dexStarter;K.t(on4?'仅起手':'全部',bx4+tw/2,ty+20,14,on4?'#a42d19':'#24180f','center',true);if(XY.INKP)XY.INKP.stroke(c,bx4+6,ty+38,bx4+tw-6,ty+38,on4?2:0.7,on4?'164,45,25':'83,61,34',on4?0.8:0.25,9,0.01);K.hit(bx4,ty,tw,44,'dexStarter',{});}
    var short=!port&&K.H<480,top=port?f.y+54:f.y+8,bot=f.y+f.h,bh=bot-top,lw=port?f.w*.39:f.w*.43,rx=f.x+lw+20,rw=f.w-lw-20,ribbonY=port?bot-188:bot-153;
    var FB=XY.fabao,fbv=FB&&FB.on(),cardList=fbv?FB.ITEMS.concat(Object.keys(FB.SUP).map(function(id){return FB.SUP[id];}),FB.retired()):XY.CARDS;
    function relicOwn(z){var it=fbv&&FB.info(z.id);return it?(it.sup?!!(FB.sv().made[it.rid]||(G&&G.fb&&FB.held(G,it.id))):FB.unlocked(it.id)):S.has(z.id);}
    var list=tab==='enemy'?XY.ENEMY_ORDER.map(function(t){return{id:t};}):tab==='card'?cardList.filter(function(z){return !app.dexStarter||(fbv?!!(FB.BY[z.id]&&FB.BY[z.id].starter):S.fbTag(z.id).kind==='starter');}):XY.SYNS;
    var sel=app.dexSel&&list.some(function(z){return z.id===app.dexSel;})?app.dexSel:list.length?list[0].id:null,view=P.folio.dexDetail||0;
    var compactDetail=short||(K.port&&K.H<700);
    function reading(id){return (K.port||short)&&(compactDetail||tab==='syn'||view===1&&(tab==='enemy'||(tab==='card'&&fbv&&FB.info(id))));}
    var key='inkdex-'+tab,choice=P.pageObject(list,function(id){return reading(id)?(short?1:3):6;},key,sel);
    sel=app.dexSel=choice.id;
    var readWide=reading(sel),per=choice.per,from=readWide?choice.start:P.pager(list.length,per,key,f.x,bot-44,short?lw:f.w);
    if(readWide){var readLeft=short?Math.min(168,f.w*.32):0;rx=short?f.x+readLeft+16:f.x+6;rw=short?f.w-readLeft-16:f.w-12;}
    var nav=tab==='enemy'?['志','战法','收集']:tab==='card'?['故事','数值','来处']:['搭档','招式','修习'];nav.forEach(function(t,i){var on=i===view,bx=rx+i*rw/3,bw=rw/3-4;K.t(t,bx+bw/2,top+20,16,on?'#a42d19':'#24180f','center',true);if(XY.INKP)XY.INKP.stroke(c,bx+8,top+38,bx+bw-8,top+38,on?2.2:0.7,on?'164,45,25':'83,61,34',on?0.85:0.28,i+11,0.01);K.hit(bx,top,bw,44,'folio',{key:'dexDetail',i:i});});
    if(!sel){K.lines('没有符合筛选的藏品。',rx,top+70,rw,15,20,T.inkSoft,6,false);P.end(c);return;}
    var title='',sub='',text='',colour=T.ink,seen=false,artH=Math.min(short?48:port?230:350,ribbonY-top-30,lw*1.18),foot=port?Math.min(ribbonY-24,top+340):ribbonY-18,cx=f.x+lw*.52;
    function hero(id,x,y,r){var d=XY.SP_BY[id]?XY.specialDef(id,Math.max(1,S.spLevel(id))):XY.HEROES.filter(function(z){return z.id===id;})[0];if(d)XY.hud2.face(c,{id:id,def:d},x,y,r,app.rt);}
    function relicInk(cd,x,y,w,h,owned){c.save();c.globalAlpha=owned?1:.34;var nm=cd&&cd.name&&cd.name!=='未'&&cd.name!=='？'?cd.name:'';var drew=!!(owned&&nm&&XY.ICONINK&&XY.ICONINK.draw(c,nm,x,y,Math.min(w,h)*.86));if(!drew&&owned&&nm){c.fillStyle='#5c4a38';c.textAlign='center';c.textBaseline='middle';var sz=Math.max(14,Math.min(28,h*.22));c.font=sz+'px "Ma Shan Zheng","KaiTi",serif';c.fillText(nm,x,y);}else if(!drew){c.fillStyle='rgba(92,74,56,.28)';c.beginPath();c.ellipse(x,y,Math.max(8,w*.18),Math.max(10,h*.22),-.3,0,6.283);c.fill();}c.restore();}
    if(tab==='enemy'){
      var ee=S.dexOf(sel),sn=ee&&ee.seen>0,dd=XY.ENEMIES[sel],bz=XY.bestiaryEntry?XY.bestiaryEntry(sel):XY.BESTIARY[sel];title=sn?dd.name:'未曾相逢';sub=sn?'遇见 '+ee.seen+' · 击杀 '+ee.kills:'在战场相逢，才会记进此卷';
      c.save();if(!sn){c.globalAlpha=.22;}var drawn=!readWide&&XY.MINK&&(XY.MINK.portrait(c,sel,cx,foot,artH)||(XY.MINK.dexPose&&XY.MINK.dexPose(c,sel,cx,foot,artH)));c.restore();if(!readWide&&!drawn)hp.enemyIcon(c,sel,cx,foot-artH*0.42,Math.min(artH*0.42,lw*0.38),!sn,app.rt);
      if(!sn)text='在战斗里遇到它，就会记进图鉴。还看不到详细信息。';
      else if(view===0)text=bz.desc+'\n\n对付它：'+bz.tip+'\n奖励：'+bz.drop;
      else if(view===1)text=P.enemyStatsText(sel)+'\n对付它：'+bz.tip+'\n奖励：'+bz.drop;
      else{var names=Object.keys(S.data.cosFrames||{}).map(function(k){return S.data.cosFrames[k];});text=(ee.card?'已得「'+ee.card+'」':'这种小妖进化到Ⅲ阶，可得西游线图鉴卡。')+'\n'+(names.length?'头像框：'+names.join('、'):'小妖进化到Ⅴ阶，可得头像框。');}
    }else if(tab==='card'){
      var active=fbv&&FB.info(sel),legacy=XY.CARD_BY[sel],cd=active||legacy,own=relicOwn(cd),rec=S.data.cards[sel],recipe=active&&active.sup?FB.recipe(active.rid):null;
      title=cd.name;colour=own?'#24180f':'#8a7964';
      if(active)sub=(active.sup?'超级法宝 · 仅一重':active.kind==='l'?'灵物 · 最高三重':'法宝 · 最高五重')+' · '+FB.SET_NAME[active.set]+'门派';
      else{var rar=XY.RARITY[cd.r],set=XY.CARD_SETS[cd.set];sub=fbv?'典藏 · 不进入当前选宝池':rar.name+' · '+set.name+'套（'+set.theme+'）';}
      if(!readWide){c.save();c.translate(cx,foot-artH*.48);c.rotate(-.065);relicInk(cd,0,0,artH*.62,artH*.88,own);c.restore();}
      if(active){
        var where=recipe?'满级'+FB.BY[recipe.a].name+' + '+FB.BY[recipe.b].name+'，在选宝时炼化':FB.whereText(sel);
        if(view===0)text=own?((legacy&&legacy.lore)||(recipe&&recipe.lore)||'取经路上的法宝。'):'尚未解锁。来处：'+where;
        else if(view===1)text=own?FB.levelParts(sel,G).join('\n'):'尚未解锁。来处：'+where;
        else text='来处：'+where+'\n'+(active.sup?'超级法宝只占一个法宝位。':'局内等级从一重开始；旧卡修行等级只影响开光加成，不代表本局已升重。');
      }else if(view===0)text=own?cd.lore:'尚未收藏。';
      else if(view===1)text=(fbv?'典藏记录（当前法宝系统不生效）。\n':'')+(own?'旧效果（Lv'+rec.lv+'）：'+XY.cardFxText(cd,rec.lv)+'\n累计获得 '+rec.got+' 次 · 等级 Lv'+rec.lv+'/'+XY.CARD_MAXLV:'尚未收藏。');
      else text=fbv?'此物保留为典藏，不能加入当前起手携带，也不出现在局内选宝。':S.fbTag(sel).text;
      if(view===2)text+='\n'+(S.data.dex['hid:phcollect']?'特殊搭档彩蛋（已解开）：Phyrex存活时，每累计操控30秒，自动吸取全图经验与金币掉落。':'特殊搭档彩蛋线索：亲自操控某位搭档一阵子，会触发他的隐藏能力。');
    }else{
      var sy=XY.SYN_BY[sel],got=S.data.dex['syn:'+sel],kind=XY.SYN_KIND[sy.kind0],recordedLv=got?Math.min(2,Math.max(0,Number(got.lv)||0)):0,currentLv=G&&G.upg?Math.min(2,Math.max(0,Number(G.upg[sel])||0)):0;
      title=sy.fullName;sub=hp.synName(sy.a)+' + '+hp.synName(sy.b)+' · '+(currentLv?'本局已修习'+currentLv+'级':recordedLv?'图鉴记录：曾修习至'+recordedLv+'级':'尚未修习 · 可预览招式');
      if(!readWide){hero(sy.a,cx-lw*.12,foot-artH*.56,Math.min(64,artH*.30));hero(sy.b,cx+lw*.16,foot-artH*.31,Math.min(52,artH*.24));}
      if(view===0)text='五行：'+ELN(synElemId(sy.a))+' 与 '+ELN(synElemId(sy.b))+'\n搭配：'+sy.note+'\n玩法：'+kind.name+'\n生效需要双方在队且存活。';
      else if(view===1)text='一级（'+XY.SYN_COST[0]+'点）：'+kind.desc(sy,1)+'\n二级（再用'+XY.SYN_COST[1]+'点）：'+kind.desc(sy,2);
      else text='一级需'+XY.SYN_COST[0]+'点，升至二级再需'+XY.SYN_COST[1]+'点；使用全队技能点。\n局内打开菜单 → 全队 → 协同技，选好搭档后学习。\n学习和生效均需「'+hp.synName(sy.a)+'」与「'+hp.synName(sy.b)+'」在队且存活。'+(sy.spec?'特殊搭档需先选择出战。':'')+'\n图鉴记录不代表本局已修习，也不会自动激活协同。';
    }
    if(readWide){dexReading(c,app,f,{tab:tab,sel:sel,view:view,title:title,sub:sub,text:text,colour:colour,list:list,
      drawItem:function(z,x,y,w,h){if(tab==='enemy'){var e=S.dexOf(z.id);hp.enemyIcon(c,z.id,x,y,14,!(e&&e.seen>0),app.rt);}else if(tab==='syn'){hero(z.a,x-8,y-4,14);hero(z.b,x+9,y+8,13);}else relicInk(z,x,y,w,h,relicOwn(z));},
      label:function(z){if(tab==='enemy'){var e=S.dexOf(z.id);return e&&e.seen>0?XY.ENEMIES[z.id].name:'未得';}return tab==='syn'?z.fullName:relicOwn(z)?z.name:'未得';}});P.end(c);return;}
    // Short landscape keeps the identity beside the artwork so the article has
    // its own column. Never let long lore flow through the collection ribbon.
    var titleX=short?f.x:rx,titleW=short?lw:rw;
    K.tf(title,titleX,top+(short?20:72),titleW,short||port?26:34,colour,'left',true,20);
    var yy=K.lines(sub,titleX,top+(short?54:112),titleW,18,26,T.inkSoft,0,false);
    var bodyTop=short?top+54:yy+12,bodyBottom=ribbonY-12,bodySize=20,bodyLine=28,bodyRows=[];
    text.split(/\n+/).forEach(function(t){bodyRows=bodyRows.concat(skillLines(c,t,bodySize,false,rw));});
    var linesPer=Math.max(1,Math.floor((bodyBottom-bodyTop)/bodyLine));
    var needsPages=bodyRows.length>linesPer;
    if(needsPages&&!short){bodyBottom-=48;linesPer=Math.max(1,Math.floor((bodyBottom-bodyTop)/bodyLine));}
    var bodyKey='dex-body-'+tab+'-'+sel+'-'+view,bodyPages=Math.max(1,Math.ceil(bodyRows.length/linesPer));
    var bodyPage=Math.max(0,Math.min(P.page[bodyKey]||0,bodyPages-1));P.page[bodyKey]=bodyPage;
    var visibleRows=bodyRows.slice(bodyPage*linesPer,(bodyPage+1)*linesPer);
    skillDraw(c,visibleRows,rx,bodyTop+bodySize/2,bodySize,false,T.ink,bodyLine);
    var pageY=short?bot-44:bodyBottom+4;
    if(bodyPages>1){
      K.btn(rx,pageY,72,44,'前文','pvPage',{key:bodyKey,d:-1},{size:16,off:bodyPage===0});
      K.t((rw>=260?'正文 ':'')+(bodyPage+1)+'/'+bodyPages,rx+rw/2,pageY+22,15,T.inkSoft,'center',true);
      K.btn(rx+rw-72,pageY,72,44,'后文','pvPage',{key:bodyKey,d:1},{size:16,off:bodyPage+1===bodyPages});
    }
    XY.dexLayout={tab:tab,id:sel,view:view,short:short,key:bodyKey,page:bodyPage,pages:bodyPages,fontSize:bodySize,
      body:{x:rx,y:bodyTop,w:rw,h:Math.max(0,bodyBottom-bodyTop)},ribbonY:ribbonY,
      allRows:bodyRows.slice(),rows:visibleRows.map(function(t,i){return{text:t,x:rx,y:bodyTop+i*bodyLine,w:rw,h:bodySize};}),
      pager:bodyPages>1?{x:rx,y:pageY,w:rw,h:44}:null};
    if(!short&&!readWide)K.t(tab==='enemy'?'众生':tab==='card'?'珍藏':'同修',f.x+2,top+20,24,'#a42d19','left',true);
    P.objects(c,app,list.slice(from,from+per),{x:f.x,y:ribbonY,w:f.w,h:91},sel,'dexSel',function(z,x,y,w,h){
      if(tab==='enemy'){var e=S.dexOf(z.id);if(e&&e.seen>0)hp.enemyIcon(c,z.id,x,y,Math.min(port?24:32,w*.4),false,app.rt);else{c.save();c.font='22px "Ma Shan Zheng","KaiTi",serif';c.fillStyle='#6d5b45';c.textAlign='center';c.textBaseline='middle';c.fillText('未',x,y);c.restore();}}
      else if(tab==='card')relicInk(z,x,y,Math.min(50,w*.68),Math.min(76,h),relicOwn(z));
      else{hero(z.a,x-w*.12,y-7,Math.min(18,w*.25));hero(z.b,x+w*.14,y+12,Math.min(17,w*.24));}
    },function(z){if(tab==='enemy'){var e=S.dexOf(z.id);return e&&e.seen>0?XY.ENEMIES[z.id].name:'未得';}if(tab==='card')return relicOwn(z)?z.name:'未得';return z.fullName;});
    P.end(c);
    function synElemId(id){var d=XY.SP_BY[id]||XY.HEROES.filter(function(z){return z.id===id;})[0];return d&&d.elem;}
  }

  /* ================= 技能树菜单 ================= */
  var HELP = [['走位', ['按住空地拖动 = 摇杆走路', '轻点空地 = 走到那里']], ['换人与命令', ['打开「队伍」，点头像查看资料；点「操控此人」换人，用命令按钮下令', '白龙马：点「骑乘」，选一位伙伴驮着跑']], ['天兵与塔', ['点天兵按钮，再轻点路上空地', '点塔查看 / 升级']], ['法宝与技能', ['局内最多4件法宝 + 3件灵物；满级法宝配材料可炼化', '点顶部等级经验：修行菜单；点右角法宝图：法宝详情']], ['召唤', ['点右下角圆形「召唤」印章', '冷却时外圈显示进度、中间是秒数']], ['其他', ['右上「暂停」暂停 / 取消', '小地图在右上角']], ['战况', []]];
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
    // All shared detail/skill text follows the same Chinese punctuation rules.
    // Keep closing punctuation with its word and opening brackets with the next.
    c.font=skillFont(size,bold);c.textAlign='left';c.textBaseline='middle';
    var units=[],out=[],line='';skillUnits(text).forEach(function(t){
      if(units.length&&(/^[，。！？；：、）》」』】”’]/.test(t)||/[（《「『【“‘]$/.test(units[units.length-1])))units[units.length-1]+=t;
      else units.push(t);
    });
    units.forEach(function(t){if(line&&c.measureText(line+t).width>maxW){out.push(line);line=t;}else line+=t;});
    if(line||!out.length)out.push(line);return out;
  }
  function skillDraw(c, lines, x, y, size, bold, col, lh) { c.font = skillFont(size, bold); c.fillStyle = col; c.textAlign = 'left'; c.textBaseline = 'middle'; lines.forEach(function (t, i) { c.fillText(t, x, y + i * lh); }); }
  function skillInk(size) { return { up: size * 0.68, down: size * 0.62 }; }
  function skillBody(c, G, hi, n, w, maxH) {
    var st = XY.nodeStatus(G, hi, n.id), sz = skillFonts(), pipW = 0;
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
    var reading=null,fullWidth=false;
    if(maxH&&h>maxH){
      // Long descriptions own a full-width text column and explicit pages.
      // Keep the separate character/learning footer intact on short phones.
      var cardW=w+58,footerH;
      fullWidth=true;names=skillLines(c,n.name,sz.name,true,cardW-62);
      effs=skillLines(c,eff,sz.eff,false,cardW-24);
      if(st.st==='locked')effs=effs.concat(skillLines(c,'学习条件：'+(st.reason||cost),sz.eff,false,cardW-24));
      costs=skillLines(c,ab+(st.st==='locked'?'暂未解锁':cost),sz.cost,true,Math.max(48,cardW-140));
      yEff=Math.max(51,yName+(names.length-1)*nameLh+skillInk(sz.name).down+8+skillInk(sz.eff).up);
      footerH=Math.max(44,costs.length*costLh+8);
      var bodyEnd=maxH-footerH-12,per=Math.max(1,Math.floor((bodyEnd-yEff-skillInk(sz.eff).down)/effLh)+1);
      var textKey='skillText-'+(hi<0?'party':G.heroes[hi].id)+'-'+n.id+'-'+st.lv;
      var all=effs,pages=Math.max(1,Math.ceil(all.length/per)),page=Math.max(0,Math.min(P.folio[textKey]||0,pages-1));P.folio[textKey]=page;
      effs=all.slice(page*per,(page+1)*per);h=maxH;
      yCost=h-footerH+(footerH-(costs.length-1)*costLh)/2;
      reading={key:textKey,page:page,pages:pages,per:per,allRows:all,rows:effs,controlsY:h-44};
    }
    return { st: st, sz: sz, names: names, effs: effs, costs: costs, yName: yName, yEff: yEff, yCost: yCost, nameLh: nameLh, effLh: effLh, costLh: costLh, h: h, pipW: pipW,fullWidth:fullWidth,reading:reading };
  }
  XY.skillBody = function (c, G, hi, n, w, maxH) { return skillBody(c, G, hi, n, w, maxH); };
  // One visual family for a real mechanic; level variants keep the same mark.
  // Reuse decoded ink art so opening the tree adds no sprite/network workload.
  P.skillIcon = function(n,h){
    n=n||{};var I=XY.ICONINK,name=(n.name||'').replace(/^★\s*/,''),def=h&&(h.def||h),weapon=def&&def.weapon;
    if(weapon)weapon=weapon.replace(/\s+/g,'');
    var common={vital:'人参果',fire:'火眼金睛',chill:'玉净瓶',leech:'蟠桃',boom:'三昧火种',swift:'筋斗云'};
    var unique={tang:'修缮营地',wukong:'七十二变',bajie:'蟠桃',wujing:'金蝉法衣',horse:'龙息水箭'};
    var theme={def:'锦襴袈裟',heal:'蟠桃',summon:'集合队友',aura:'佛光经文',camp:'修缮营地'};
    var byType={atk:weapon||'金箍棒',spd:'筋斗云',def:'避水珠',aux:'佛光经文',ctl:'幌金绳',sum:'集合队友',eco:'乾坤袋'};
    var type=XY.nodeTypeKey?XY.nodeTypeKey(n):'aux',family=(XY.NODE_TYPES[type]||XY.NODE_TYPES.aux).name,art='';
    // The generic node classifier treats any mention of a soldier as summon.
    // These 27 support marks follow the actual spsup mechanics instead.
    var support={
      phyrex:[['照妖镜','ctl','易伤标记'],['燃烧的BTC币','atk','持续伤害'],['七十二变','ctl','缩小敌人']],
      sisi:[['在线守护','def','净化护盾'],['乾坤袋','aux','随机增益'],[null,'atk','木刺攻击']],
      laosiji:[['照妖镜','ctl','易伤标记'],['筋斗云','spd','冲刺火径'],['七十二变','sum','诱敌分身']],
      kuanggong:[['幌金绳','ctl','嘲讽'],['乾坤袋','eco','定时金币'],['乾坤袋','eco','掉落加成']],
      haiteng:[['安全圈','atk','圈外伤害'],[null,'aux','有限救命'],['避水珠','def','吸收护盾']],
      yuanzhang:[['唤骨令','aux','附魂强化'],['乾坤袋','eco','击杀金币'],['幌金绳','ctl','减速易伤']],
      heyuxi:[['筋斗云','spd','移动与攻速'],['甩竿','ctl','拉近敌人'],['音波','atk','音波轰击']],
      diaoyulao:[['乾坤袋','eco','额外掉落'],['蟠桃','aux','治疗加速'],['避水珠','def','低血救急']],
      martin:[['避水珠','def','金币换护盾'],['筋斗云','aux','移速与减伤'],['锦襴袈裟','def','受伤成长减伤']]
    },sp=n.kind==='support'&&/^s[123]$/.test(n.id)&&support[def&&def.id];
    if(sp){var sm=sp[+n.id.charAt(1)-1];return{family:sm[2],type:sm[1],art:sm[0]&&I&&I.has(sm[0])?sm[0]:null,glyph:sm[1]==='atk'?'ult':'aura'};}
    if(I&&I.has(name))art=name;
    else if(n.kind==='main'||n.kind==='extra'){art=weapon;family='主武器';}
    else if(n.kind==='support'&&common[n.id]){art=common[n.id];}
    else if(n.kind==='support'&&n.id==='sp'){art=unique[def&&def.id];}
    else if(n.theme==='atk'||n.theme==='elem'){art=weapon;family=n.theme==='atk'?'攻伐':'武器专精';}
    else if(theme[n.theme])art=theme[n.theme];
    else if(n.fx&&n.fx.ultCd)art='紧箍咒';
    if(!art)art=byType[type];
    var glyph=type==='atk'?'ult':type==='def'||type==='aux'?'aura':'sutra';
    return {family:family,type:type,art:I&&I.has(art)?art:null,glyph:glyph};
  };
  function skillMark(c,n,x,y,sz,h,st){
    var mark=P.skillIcon(n,h),I=XY.ICONINK;c.save();
    if(st&&st.st==='locked'&&!st.lv)c.globalAlpha=.38;
    c.strokeStyle='rgba(72,51,29,.24)';c.lineWidth=1;
    c.beginPath();c.ellipse(x,y,sz*.48,sz*.45,-.08,.25,5.9);c.stroke();
    if(!(mark.art&&I&&I.draw(c,mark.art,x,y,sz*.90))&&I&&I.glyph)I.glyph(c,mark.glyph,x,y,sz*.85,'#a42d19');
    c.restore();return mark;
  }
  P.drawSkillIcon=skillMark;
  function nodeCard(c, G, app, hi, n, x, y, w, h, col, hov) {
    var b = skillBody(c, G, hi, n, Math.max(48, w - 58),h), st = b.st, lv = st.lv, locked = st.st === 'locked', maxed = st.st === 'max', can = st.st === 'ok', ov = K.over(x, y, w, h);
    XY.skillRead = { name: b.sz.name, effect: b.sz.eff, cost: b.sz.cost, level: b.sz.cost };
    if(ov){var wash=c.createLinearGradient(x,y,x+w,y+h);wash.addColorStop(0,'rgba(184,48,15,0.10)');wash.addColorStop(1,'rgba(184,48,15,0)');c.fillStyle=wash;c.fillRect(x,y,w,h);}
    var icon = b.fullWidth?32:Math.min(48, Math.max(32, Math.min(h - 10, 48)));
    skillMark(c,n,x+icon*.55+4,y+icon*.55+4,icon,hi>=0?G.heroes[hi]:null,st);
    var tx = x + icon + 8;
    skillDraw(c, b.names, tx, y + b.yName, b.sz.name, true, locked && lv === 0 ? '#9a9486' : T.ink, b.nameLh);
    skillDraw(c, b.effs, b.fullWidth?x+12:tx, y + b.yEff, b.sz.eff, false, locked && lv === 0 ? '#aaa598' : T.inkSoft, b.effLh);
    skillDraw(c, b.costs, b.fullWidth?x+12:tx, y + b.yCost, b.sz.cost, true, maxed ? '#b8860b' : can ? '#2e7d32' : st.st === 'nopts' ? '#9a6a1a' : '#a0705a', b.costLh);
    K.hit(x, y, w, h, 'node', { hero: hi, id: n.id });
    if(b.reading&&b.reading.pages>1){
      var rd=b.reading,py=y+rd.controlsY;
      // Disabled arrows and the page count must never fall through to learning.
      K.hit(x+w-124,py,124,44,'folio',{key:rd.key,i:rd.page});
      K.btn(x+w-124,py,44,44,'‹','folio',{key:rd.key,i:Math.max(0,rd.page-1)},{size:23,off:rd.page===0});
      K.t((rd.page+1)+'/'+rd.pages,x+w-62,py+22,12,T.inkSoft,'center',false);
      K.btn(x+w-44,py,44,44,'›','folio',{key:rd.key,i:Math.min(rd.pages-1,rd.page+1)},{size:23,off:rd.page+1===rd.pages});
    }
    XY.skillCardLayout.push({id:n.id,hero:hi,x:x,y:y,w:w,h:h,body:b,icon:{x:x+icon*.55+4,y:y+icon*.55+4,size:icon},nameBottom:y+b.yName+(b.names.length-1)*b.nameLh+skillInk(b.sz.name).down,bodyTextTop:y+b.yEff-skillInk(b.sz.eff).up,bodyTextBottom:y+b.yEff+(b.effs.length-1)*b.effLh+skillInk(b.sz.eff).down,costTop:y+b.yCost-skillInk(b.sz.cost).up});
    return { n: n, st: st, hov: ov };
  }
  // Short screens keep one readable skill and explicit selection sheets.
  // This is menu state only: learning still uses the original node action.
  var shortSkillOwner = null;
  function shortTutorial(G) {
    var st=G.tut&&XY.tutSteps?XY.tutSteps(G)[G.tut.i]:null;
    return st&&/^(skillOpen|skillLook|skillParty|skillMark|skillClose)$/.test(st.id)?st:null;
  }
  P.shortSkillTutorial=function(G,a){
    var o=shortSkillOwner;
    if(!o||o.G!==G||o.app!==a||a.screen!=='play'||G.mode!=='skills'||!shortSkillSize(a)||o.tut!==G.tut||!G.tut||o.tutIndex!==G.tut.i||o.tab!==a.skillTab||!o.tutorial)return null;
    return {target:o.tutTarget||null,partyText:'点顶部「'+o.role+'」，在角色列表选择「全队」。全队强化用同一池技能点，不占英雄的技能位。法宝是另一页，不在这里花技能点。',allow:function(h){return (o.tutAllowed||[]).some(function(q){return Object.keys(q).every(function(k){return h[k]===q[k];});});}};
  };
  function shortSkillSize(app) {
    var z=app.zoom||1,w=app.lw*z,h=app.lh*z,s=XY.uiScale?XY.uiScale(w,h):1;
    return h/s<480;
  }
  P.shortSkillKey=function(G,app,k){
    var o=shortSkillOwner;
    if(!o||o.G!==G||o.app!==app||app.screen!=='play'||G.mode!=='skills'||!shortSkillSize(app)||o.tab!==app.skillTab)return false;
    var nav=P.folio.shortSkillNav;
    if(nav){
      if(k==='Escape'||k==='Tab')P.folio.shortSkillNav=0;
      else if(o.navKey&&(k==='ArrowLeft'||k==='PageUp'))P.folio[o.navKey]=Math.max(0,o.navPage-1);
      else if(o.navKey&&(k==='ArrowRight'||k==='PageDown'))P.folio[o.navKey]=Math.min(o.navPages-1,o.navPage+1);
      return true;
    }
    if(o.sub!==((app._pvSub||{})[app.skillTab]||0)||!o.nodeKey)return false;
    if(G.tut&&(k==='ArrowLeft'||k==='ArrowRight'))return true;
    if(k==='ArrowLeft'||k==='ArrowRight'){P.folio[o.nodeKey]=Math.max(0,Math.min(o.nodeCount-1,o.nodeIndex+(k==='ArrowRight'?1:-1)));return true;}
    if(k==='PageUp'||k==='PageDown'){P.folio[o.textKey]=Math.max(0,Math.min(o.textPages-1,o.textPage+(k==='PageDown'?1:-1)));return true;}
    if(k==='Enter'){if(!G.tut&&o.can){var lr=XY.learn(G,o.hi,o.id);app.skillMsg={text:lr.reason,bad:!lr.ok,until:app.rt+2.2};}return true;}
    return false;
  };
  function shortSkills(c,G,app,W,H,tab){
    var x=12,w=W-24,hero=tab===9?null:G.heroes[tab],subs=subList(G,tab,hero),sub=(app._pvSub&&app._pvSub[tab])||0;
    if(sub>=subs.length)sub=0;
    var S0=subs[sub],old=shortSkillOwner,nav=P.folio.shortSkillNav||0,tutorial=shortTutorial(G);
    if(!old||old.G!==G||old.app!==app||old.tab!==tab||old.sub!==sub||old.tut!==G.tut||old.tutIndex!==(G.tut&&G.tut.i)){nav=0;P.folio.shortSkillNav=0;}
    var role=hero?hero.def.name:'全队',branch=S0.n,navRows=skillLines(c,role+' · '+branch,16,true,w),navH=Math.max(44,navRows.length*22+8);
    var o=shortSkillOwner={G:G,app:app,tab:tab,sub:sub,tut:G.tut,tutIndex:G.tut&&G.tut.i,tutorial:tutorial,role:role,tutAllowed:[]};app.__inkSkillSpec=null;
    XY.skillCardLayout=[];XY.skillFooterLayout=null;
    function button(bx,by,bw,bh,label,act,ex,options){K.btn(bx,by,bw,bh,label,act,ex,Object.assign({size:16,minS:16},options||{}));}
    function logical(r){var u=(K.s||1)/(K.z||1);return{x:r.x*u,y:r.y*u,w:r.w*u,h:r.h*u};}
    function allow(act,ex){o.tutAllowed.push(Object.assign({act:act},ex||{}));}
    function tutorialFooter(back){
      var by=H-52,bw=(w-16)/3,nextOK=tutorial.id!=='skillParty'||!!tutorial.wait(G,G.tut);
      button(x,by,bw,44,back?'返回技能':'教学说明','folio',{key:'shortSkillNav',i:back?0:3});allow('folio',{key:'shortSkillNav',i:back?0:3});
      button(x+bw+8,by,bw,44,'跳过','tutSkip');
      button(x+2*(bw+8),by,bw,44,nextOK?'下一步':'先选全队','tutNext',null,{primary:nextOK,off:!nextOK});
      if(tutorial.id==='skillParty'&&nextOK)o.tutTarget=logical({x:x+2*(bw+8),y:by,w:bw,h:44});
    }
    if(tutorial&&nav===3){
      K.t('教学 '+(G.tut.i+1)+' / '+XY.tutSteps(G).length,x,30,18,T.ink,'left',true);
      button(W-x-64,8,64,44,'关闭','folio',{key:'shortSkillNav',i:0});allow('folio',{key:'shortSkillNav',i:0});
      skillDraw(c,navRows,x,64,16,true,T.ink,22);
      var titleY=64+navRows.length*22+10,titleRows=skillLines(c,tutorial.title,18,true,w);
      skillDraw(c,titleRows,x,titleY,18,true,'#a42d19',24);
      var ttRows=[],ttTop=titleY+titleRows.length*24+8,ttBottom=H-108;
      String(tutorial.text(G,app,G.tut)).split('\n').forEach(function(t){ttRows=ttRows.concat(skillLines(c,t,16,false,w));});
      var ttPer=Math.max(1,Math.floor((ttBottom-ttTop+8)/23)),ttPages=Math.max(1,Math.ceil(ttRows.length/ttPer)),ttKey='shortSkillTutorial'+G.tut.i,ttPage=Math.min(ttPages-1,Math.max(0,P.folio[ttKey]||0)),ttShown=ttRows.slice(ttPage*ttPer,(ttPage+1)*ttPer);
      P.folio[ttKey]=ttPage;o.navKey=ttKey;o.navPage=ttPage;o.navPages=ttPages;
      skillDraw(c,ttShown,x,ttTop,16,false,T.ink,23);
      button(x,H-100,72,44,'前文','folio',{key:ttKey,i:Math.max(0,ttPage-1)},{off:ttPage===0});
      button(W-x-72,H-100,72,44,'后文','folio',{key:ttKey,i:Math.min(ttPages-1,ttPage+1)},{off:ttPage+1===ttPages});
      allow('folio',{key:ttKey});K.t((ttPage+1)+' / '+ttPages,W/2,H-78,16,T.inkSoft,'center',false);tutorialFooter(true);
      XY.shortSkillLayout={sheet:'tutorial',role:role,branch:branch,fontSize:16,step:tutorial.id,allRows:ttRows,rows:ttShown,page:ttPage,pages:ttPages,body:{x:x,y:ttTop,w:w,bottom:ttBottom},textBottom:ttTop+(ttShown.length-1)*23+10};return;
    }
    if(nav){
      button(x,8,88,44,'返回技能','folio',{key:'shortSkillNav',i:0});if(tutorial)allow('folio',{key:'shortSkillNav',i:0});
      K.t(nav===1?'选择角色':'选择分支',W/2,30,17,T.ink,'center',true);
      button(W-x-64,8,64,44,'关闭','folio',{key:'shortSkillNav',i:0});
      skillDraw(c,navRows,x,64,16,true,T.ink,22);
      var items=nav===1?G.heroes.map(function(h,i){return{label:h.def.name+(h.down?'（阵亡）':''),act:'tab',ex:{i:i},off:!!h.down||!!tutorial,on:i===tab};}).concat([{label:'全队',act:'tab',ex:{i:9},on:tab===9}],G.fb?[{label:'法宝',act:'tab',ex:{i:10},off:!!tutorial}]:[],[{label:'说明',act:'tab',ex:{i:11},off:!!tutorial}]):subs.map(function(s,i){return{label:s.n,act:'pvSub',ex:{i:i},on:i===sub};});
      var cols=Math.max(1,Math.min(3,Math.floor((w+8)/140))),cw=(w-(cols-1)*8)/cols,cellH=Math.max(44,Math.max.apply(null,items.map(function(it){return skillLines(c,it.label,16,true,cw-16).length*22+8;})));
      var top=64+navRows.length*22+12,controls=H-52,per=Math.max(cols,Math.floor((controls-top-8)/(cellH+8))*cols),key='shortSkillSelect'+nav,pages=Math.max(1,Math.ceil(items.length/per)),pg=Math.min(pages-1,Math.max(0,P.folio[key]||0));
      P.folio[key]=pg;o.navKey=key;o.navPage=pg;o.navPages=pages;
      items.slice(pg*per,(pg+1)*per).forEach(function(it,j){var bx=x+(j%cols)*(cw+8),by=top+Math.floor(j/cols)*(cellH+8);button(bx,by,cw,cellH,it.label,it.act,it.ex,{off:it.off,on:it.on,wrap:true});if(tutorial&&it.act==='tab'&&it.ex.i===9){allow('tab',{i:9});o.tutTarget=logical({x:bx,y:by,w:cw,h:cellH});}});
      button(x,controls,72,44,'上一页','folio',{key:key,i:Math.max(0,pg-1)},{off:pg===0});
      K.t((pg+1)+' / '+pages,W/2,controls+22,16,T.inkSoft,'center',false);
      button(W-x-72,controls,72,44,'下一页','folio',{key:key,i:Math.min(pages-1,pg+1)},{off:pg+1===pages});
      if(tutorial){allow('folio',{key:key});if(!o.tutTarget)o.tutTarget=logical({x:W-x-72,y:controls,w:72,h:44});}
      XY.shortSkillLayout={sheet:nav===1?'heroes':'branches',role:role,branch:branch,top:top,cellH:cellH,per:per,page:pg,pages:pages,items:items.map(function(it){return it.label;}),fontSize:16,controlsY:controls};
      return;
    }
    K.t('修行 · '+G.points+'点',x,XY.diff?22:30,16,'#a42d19','left',true);if(XY.diff)K.t(XY.diff.pointsHint(G),x,42,12,'#7a4a32','left',false);
    button(W-x-168,8,96,44,'自动：'+(G.autoPoints?'开':'关'),'autopts',null,{on:G.autoPoints,off:!!tutorial});
    button(W-x-64,8,64,44,'关闭','closeSkills',null,{primary:true});
    var chipW=(w-8)/2,roleRows=skillLines(c,role,16,true,chipW-16),branchRows=skillLines(c,branch,16,true,chipW-16),chipH=Math.max(44,Math.max(roleRows.length,branchRows.length)*22+8);
    button(x,56,chipW,chipH,role,'folio',{key:'shortSkillNav',i:1},{wrap:true,off:!!tutorial&&tutorial.id!=='skillParty'});
    button(x+chipW+8,56,chipW,chipH,branch,'folio',{key:'shortSkillNav',i:2},{wrap:true,off:!!tutorial});
    if(tutorial&&tutorial.id==='skillParty'){allow('folio',{key:'shortSkillNav',i:1});o.tutTarget=logical({x:x,y:56,w:chipW,h:chipH});}
    var nodes=S0.nodes,hi=tab===9?-1:S0.hi,nodeKey='shortSkillNode'+tab+'-'+sub,idx=Math.min(nodes.length-1,Math.max(0,P.folio[nodeKey]||0)),pin=null,step=G.tut&&XY.tutSteps?XY.tutSteps(G)[G.tut.i]:null;
    if(step&&step.id==='skillLook'&&XY.rootSkill){var rs=XY.rootSkill(G);pin=rs&&rs.node&&rs.node.id;}
    else if(step&&step.id==='skillMark')pin='p_tower';
    if(pin){var at=nodes.findIndex(function(n){return n.id===pin;});if(at>=0)idx=at;}
    if(!pin)P.folio[nodeKey]=Math.max(0,idx);
    if(!nodes.length){K.t('这一页没有技能',x,56+chipH+26,16,T.inkSoft,'left',false);XY.shortSkillLayout={sheet:null,role:role,branch:branch,empty:true};return;}
    var n=nodes[idx],st=XY.nodeStatus(G,hi,n.id),can=!S0.locked&&st.st==='ok',nameRows=skillLines(c,n.name,18,true,w-74),nameY=56+chipH+18;
    skillDraw(c,nameRows,x,nameY,18,true,T.ink,24);K.t((idx+1)+' / '+nodes.length,W-x,nameY,16,T.inkSoft,'right',false);
    var state=S0.locked?'分支未开放 · '+st.cost+'点':st.st==='max'?'已满级':st.st==='ok'?'可学习 · '+st.cost+'点':st.st==='nopts'?'需'+st.cost+'点 · 差'+(st.cost-G.points)+'点':'未解锁 · '+st.cost+'点';
    var meta='等级 '+st.lv+'/'+n.max+' · '+state,metaRows=skillLines(c,meta,16,true,w),metaY=nameY+(nameRows.length-1)*24+25;
    skillDraw(c,metaRows,x,metaY,16,true,can?'#37643d':'#694b31',22);
    var paras=[(st.lv?'当前效果：':'一级效果：')+XY.nodeText(n,st.lv||1)];
    if(st.lv>0&&st.lv<n.max)paras.push('下一重：'+XY.nodeText(n,st.lv+1));
    if(S0.locked)paras.push('角色升到 Lv4 开放（'+XY.SP_LV_AT[3]+' 张角色卡）。');
    else if(st.reason&&st.st!=='max')paras.push('学习条件：'+st.reason);
    if(/[ab]$/.test(n.id)&&n.tier>=3)paras.push((/a$/.test(n.id)?'甲路':'乙路')+'：甲乙二选一，选定后另一条锁定。');
    var msg=app.skillMsg&&app.skillMsg.until>app.rt?app.skillMsg:null;if(msg)paras.unshift(msg.text);
    var rows=[];paras.forEach(function(t){rows=rows.concat(skillLines(c,t,16,false,w));});
    var bodyTop=metaY+(metaRows.length-1)*22+25,textControls=H-100,bodyBottom=textControls-8,per=Math.max(1,Math.floor((bodyBottom-bodyTop+8)/23)),textKey='shortSkillText'+tab+'-'+sub+'-'+n.id+'-'+st.lv+'-'+(msg?msg.until:'normal'),pages=Math.max(1,Math.ceil(rows.length/per)),page=Math.min(pages-1,Math.max(0,P.folio[textKey]||0)),shown=rows.slice(page*per,(page+1)*per);
    P.folio[textKey]=page;skillDraw(c,shown,x,bodyTop,16,false,T.ink,23);
    if(pages===1&&!tutorial&&nodes.length>1&&nodes.length<=8){
      // 正文一页就放得下时，这一行不放「前文 / 后文」，改放这一支全部技能的小签：点哪个看哪个，不用一项项翻
      var jw=(w-(nodes.length-1)*6)/nodes.length;
      nodes.forEach(function(nd,j){var js=XY.nodeStatus(G,hi,nd.id),nm=String(nd.name).replace(/^.*[·・]/,'');if(nm.length>4)nm=nm.slice(0,4);button(x+j*(jw+6),textControls,jw,44,(js.lv>0?'✓':'')+nm,'folio',{key:nodeKey,i:j},{on:j===idx,size:14,minS:13});});
    }else{
    button(x,textControls,72,44,'前文','folio',{key:textKey,i:Math.max(0,page-1)},{off:page===0});
    K.t('正文 '+(page+1)+' / '+pages,W/2,textControls+22,16,T.inkSoft,'center',false);
    button(W-x-72,textControls,72,44,'后文','folio',{key:textKey,i:Math.min(pages-1,page+1)},{off:page+1===pages});
    }
    if(tutorial){allow('folio',{key:textKey});tutorialFooter(false);if(tutorial.id==='skillLook'||tutorial.id==='skillMark')o.tutTarget=logical({x:x,y:nameY-12,w:w,h:bodyBottom-nameY+12});else if(tutorial.id==='skillClose')o.tutTarget=logical({x:W-x-64,y:8,w:64,h:44});}
    else {var by=H-52;button(x,by,64,44,'上一项','folio',{key:nodeKey,i:Math.max(0,idx-1)},{off:idx===0});
    button(x+72,by,w-144,44,st.st==='max'?'已满级':can?'学习 · '+st.cost+'点':'暂不可学','node',{hero:hi,id:n.id},{primary:can,off:!can});
    button(W-x-64,by,64,44,'下一项','folio',{key:nodeKey,i:Math.min(nodes.length-1,idx+1)},{off:idx+1===nodes.length});}
    Object.assign(o,{id:n.id,hi:hi,can:can,nodeKey:nodeKey,nodeCount:nodes.length,nodeIndex:idx,textKey:textKey,textPages:pages,textPage:page});
    XY.shortSkillLayout={sheet:null,role:role,branch:branch,id:n.id,hero:hi,points:G.points,level:st.lv,max:n.max,state:state,can:can,cost:st.cost,nodeIndex:idx,nodeCount:nodes.length,nameRows:nameRows,metaRows:metaRows,paragraphs:paras,allRows:rows,rows:shown,page:page,pages:pages,key:textKey,body:{x:x,y:bodyTop,w:w,bottom:bodyBottom},textBottom:bodyTop+(shown.length-1)*23+10,fontSize:16,textControlsY:textControls,learnY:H-52};
    XY.skillLayout={compact:true,page:idx,pages:nodes.length,top:bodyTop,bottom:bodyBottom,nodes:[{id:n.id,x:x,y:nameY-12,w:w,h:H-52-nameY}],connectors:[]};
  }

  function skills(c, G, app) {
    R.dim(c, app, 0.66); XY.ui.hits.length = 0; P.begin(c, app);
    K=P.K; brushTools(K);
    var W = K.W, H = K.H, port = K.port, m = 6, n = G.heroes.length, PT = 9, i, rt = app.rt;
    if (XY.tutSkillSync) XY.tutSkillSync(G, app);
    var tab = app.skillTab; if (tab !== PT && tab < n && G.heroes[tab].down) tab = app.skillTab = PT;
    // Keep the paper full-width and center readable menu content on wide displays.
    P.paper(c,W,H);
    {
      var helpW = Math.min(W, Math.max(H * (tab === 11 ? 1.85 : 1.6), 1000)), helpOffsetX = (W - helpW) / 2;
      if (helpOffsetX > 0) {
        c.translate(helpOffsetX, 0);
        var baseHit = K.hit, baseOver = K.over;
        K.hit = function (x, y, w, h, act, ex) { return baseHit(x + helpOffsetX, y, w, h, act, ex); };
        K.over = function (x, y, w, h) { return baseOver(x + helpOffsetX, y, w, h); };
        W = K.W = helpW;
      }
    }
    if(H<480&&(tab===PT||(tab>=0&&tab<n))){shortSkills(c,G,app,W,H,tab);P.end(c);return;}
    shortSkillOwner=null;P.folio.shortSkillNav=0;
    if(tab===11&&(P.folio.help||0)%HELP.length===6){helpStatusSheet(c,G,W,H);P.end(c);return;}
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
    if (port) { K.tf(msg ? msg.text : '技能点全队共用 · 点卡学习', x0 + 4, y + 10, w0 - 8, 12.5, msg ? (msg.bad ? '#c0392b' : '#2e7d32') : T.inkSoft, 'left', !!msg, 10.5); y += 26; }
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
    if (tab === 11) { helpPage(c, G, x0, y, w0, bottom - y); P.end(c); return; }
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
    var S0 = subs[sub], detH = port ? 134 : (H < 480 ? 104 : 120), gy = y, cardHi = tab === PT ? -1 : S0.hi, gap = 22;
    var gh = bottom - detH - 6 - gy, col = h ? h.def.color : '#d9a21a', rects = [];
    var nn = S0.nodes.length, layout = [], byId = {}, depth = {}, layered = false;
    S0.nodes.forEach(function (nd) { byId[nd.id] = nd; depth[nd.id] = 0; });
    for (var pass = 0; pass < nn; pass++) S0.nodes.forEach(function (nd) {
      Object.keys((nd.req && nd.req[0]) || {}).forEach(function (id) {
        if (byId[id]) { layered = true; depth[nd.id] = Math.max(depth[nd.id], depth[id] + 1); }
      });
    });
    var groups = [];
    if (layered) S0.nodes.forEach(function (nd) { var d = depth[nd.id]; (groups[d] = groups[d] || []).push(nd); });
    else groups = [S0.nodes];
    var pages = [[]], used = 0, maxCols = Math.max(1, Math.min(4, Math.floor((w0 + gap) / (280 + gap))));
    function bodyHeight(nd, width) { return Math.min(gh,Math.max(80,skillBody(c,G,cardHi,nd,Math.max(48,width-58)).h)); }
    groups.forEach(function (group) {
      if (!group) return;
      for (var pos = 0; pos < group.length;) {
        var count = Math.min(maxCols, group.length - pos), width, row, rowHeight;
        do {
          width = Math.min(count === 1 ? 480 : 420, (w0 - (count - 1) * gap) / count);
          row = group.slice(pos, pos + count); rowHeight = Math.max.apply(null, row.map(function (nd) { return bodyHeight(nd, width); }));
          if (rowHeight <= gh || count === 1) break;
          count--;
        } while (count > 0);
        if (pages[pages.length - 1].length && used + gap + rowHeight > gh) { pages.push([]); used = 0; }
        var rowGap = used ? gap : 0, left = x0 + (w0 - count * width - (count - 1) * gap) / 2;
        row.forEach(function (nd, k) { pages[pages.length - 1].push({ nd: nd, x: left + k * (width + gap), y: gy + used + rowGap, w: width, h: rowHeight }); });
        used += rowGap + rowHeight; pos += count;
      }
    });
    var pageKey = 'skillPg' + tab + '-' + sub, pageN = pages.length, savedPage = P.folio[pageKey], pageI = ((savedPage || 0) % pageN + pageN) % pageN, pin = null, step = G.tut && XY.tutSteps ? XY.tutSteps(G)[G.tut.i] : null;
    if (step && step.id === 'skillLook' && XY.rootSkill) { var rs = XY.rootSkill(G); if (rs && rs.node) pin = rs.node.id; }
    else if (step && step.id === 'skillMark') pin = 'p_tower';
    if (pin) { pages.forEach(function (p, i) { if (p.some(function (it) { return it.nd.id === pin; })) pageI = i; }); P.folio[pageKey] = pageI; }
    else if (savedPage == null) P.folio[pageKey] = pageI;
    layout = pages[pageI] || [];
    XY.skillLayout = { page: pageI, pages: pageN, top: gy, bottom: gy + gh, nodes: layout.map(function (p) { return { id: p.nd.id, x: p.x, y: p.y, w: p.w, h: p.h }; }) };
    c.save();
    XY.skillLayout.connectors = [];
    layout.forEach(function (p) {
      Object.keys((p.nd.req && p.nd.req[0]) || {}).forEach(function (id) {
        var prev = layout.filter(function (t) { return t.nd.id === id; })[0];
        if (!prev) return;
        var x1 = prev.x + prev.w / 2, y1 = prev.y + prev.h, x2 = p.x + p.w / 2, y2 = p.y;
        // A narrow screen stacks sibling nodes. Route their longer branches in
        // the left margin so a connector never runs through another node's text.
        var stacked = layout.some(function (q) { return q !== prev && q !== p && q.y >= y1 && q.y + q.h <= y2; });
        var path = stacked ? [[x1,y1+5],[x0-3,y1+5],[x0-3,p.y+28],[p.x+7,p.y+28]] : [[x1,y1],[x2,y2]];
        XY.skillLayout.connectors.push({ from: id, to: p.nd.id, path: path });
        for (var k = 1; k < path.length; k++) {
          var a = path[k-1], b = path[k];
          if (XY.INKP) XY.INKP.stroke(c, a[0], a[1], b[0], b[1], 3.4, '42,32,22', 0.88, (id.length * 3 + p.nd.id.length) % 19, stacked ? 0.008 : 0.09);
          else { c.strokeStyle = 'rgba(42,32,22,0.88)'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
        }
      });
    });
    c.restore();
    XY.skillCardLayout=[];
    if(S0.locked)K.tf('🔒 角色升到 Lv4 开放（'+XY.SP_LV_AT[3]+' 张角色卡）',x0+w0/2,gy+gh/2,w0-20,15,'#8a5a10','center',true,12);
    else if(!nn)K.t('这一页没有技能',x0+w0/2,gy+gh/2,15,T.inkSoft,'center',false);
    else layout.forEach(function(p){rects.push(nodeCard(c,G,app,tab===PT?-1:S0.hi,p.nd,p.x,p.y,p.w,p.h,tab===PT?(S0.n==='协同技'?'#c0489a':'#d9a21a'):col));});
    // The footer owns its whole width. Explanation pages and skill pages have
    // separate bottom controls, so neither can squeeze prose below the screen.
    var dy=bottom-detH,hv=null,focusKey='skillFocus'+tab+'-'+sub;
    rects.forEach(function(r){if(r.hov)hv=r;});
    if(hv)P.folio[focusKey]=hv.n.id;
    else if(P.folio[focusKey])hv=rects.filter(function(r){return r.n.id===P.folio[focusKey];})[0]||null;
    var title,detail,detailId='help';
    if(hv){
      var nd2=hv.n,st=hv.st,ty=XY.nodeType(nd2);
      if(nd2.sp&&/^s[123]$/.test(nd2.id)&&tab!==PT)ty={name:P.skillIcon(nd2,G.heroes[tab]).family};
      title=nd2.name+' · '+st.lv+'/'+nd2.max+'重 · '+ty.name;detailId=nd2.id+'-'+st.lv;
      detail='现在：'+(st.lv>0?XY.nodeText(nd2,st.lv):'还没学')+'　下一重：'+(st.lv<nd2.max?XY.nodeText(nd2,st.lv+1)+'（'+nd2.cost[st.lv]+'点）':'已满级');
    }else{
      title=tab!==PT?G.heroes[tab].def.name+' · 生命 '+Math.ceil(G.heroes[tab].hp)+'/'+G.heroes[tab].maxHp:'全队修行';
      detail=tab!==PT?'点卡学习，先看效果。甲乙二选一，选定后另一条锁定。'+(XY.diff&&XY.diff.pointsHint(G)?'修行点：'+XY.diff.pointsHint(G)+'。':''):'全队强化不占英雄的技能位；协同技要两位搭档都在队里。';
    }
    if(XY.INKP)XY.INKP.stroke(c,x0,dy,x0+w0,dy-1,1.5,'83,61,34',0.3,39,0.004);
    var footW=w0-24,titleRows=skillLines(c,title,15,true,footW),bodyY=dy+12+titleRows.length*21,controlsY=bottom-44,footRows=skillLines(c,detail,15,false,footW),rowCount=Math.max(1,Math.floor((controlsY-9-bodyY)/20)),footKey='skillFoot'+tab+'-'+sub+'-'+detailId,footPages=Math.max(1,Math.ceil(footRows.length/rowCount)),footPage=Math.min(footPages-1,Math.max(0,P.folio[footKey]||0)),shown=footRows.slice(footPage*rowCount,(footPage+1)*rowCount);
    skillDraw(c,titleRows,x0+12,dy+14,15,true,T.ink,21);
    skillDraw(c,shown,x0+12,bodyY+7,15,false,T.inkSoft,20);
    if(footPages>1){
      K.btn(x0,controlsY,44,44,'‹','folio',{key:footKey,i:(footPage+footPages-1)%footPages},{size:23});
      K.t((footPage+1)+'/'+footPages,x0+62,controlsY+23,12,T.inkSoft,'center',false);
      K.btn(x0+80,controlsY,44,44,'›','folio',{key:footKey,i:(footPage+1)%footPages},{size:23});
    }
    if(pageN>1){
      // Keep both directions explicit; the counter never advances a page.
      // At 320px the 164px tree controls leave the separate 124px text pager clear.
      var navButtonW=w0<440?60:72,navCountW=w0<440?36:48,navW=navButtonW*2+navCountW+8,navX=x0+w0-navW;
      K.hit(navX,controlsY,navW,44,'folio',{key:pageKey,i:pageI});
      K.btn(navX,controlsY,navButtonW,44,'上一页','folio',{key:pageKey,i:Math.max(0,pageI-1)},{size:14,minS:14,off:pageI===0});
      K.t((pageI+1)+' / '+pageN,navX+navButtonW+4+navCountW/2,controlsY+22,14,T.inkSoft,'center',false);
      K.btn(navX+navW-navButtonW,controlsY,navButtonW,44,'下一页','folio',{key:pageKey,i:Math.min(pageN-1,pageI+1)},{size:14,minS:14,off:pageI+1===pageN});
    }
    XY.skillFooterLayout={title:title,detail:detail,titleRows:titleRows,allRows:footRows,rows:shown,page:footPage,pages:footPages,key:footKey,body:{x:x0+12,y:bodyY,w:footW,h:rowCount*20},textBottom:bodyY+7+(shown.length-1)*20+10,controlsY:controlsY,bottom:bottom,fontSize:15};
    P.end(c);
  }
  // Read live simulation fields only; opening this page never evaluates/completes quests.
  function helpStatusLines(G) {
    if (!G || !G.heroes || !G.heroes[0]) return ['当前没有进行中的取经队伍。'];
    var t=G.heroes[0],Tg=G.tang||{},rt=G.rt||{},q=G.quests&&G.quests.main&&G.quests.main.def?G.quests.main:null,gate=G.gate,lines=[];
    function value(n){return typeof n==='number'&&isFinite(n)?(n>0&&n<.01?'<0.01':String(Math.round(n*100)/100)):'未知';}
    function health(u){return value(Math.max(0,u.hp))+' / '+value(u.maxHp);}
    lines.push('唐僧气血：'+health(t)+(t.down?' · 已阵亡，本关无法再战':' · 存活'));
    if(G.camp)lines.push('营地气血：'+health(G.camp)+(G.camp.active?' · 当前生效':' · 当前未生效'));
    if(G.ending)lines.push('本局'+(G.ending.kind==='win'?'已通关':'已失败')+'，等待结算。');
    else if(t.down)lines.push('唐僧已阵亡，无法继续护送。');
    else if(G.villain)lines.push('当前任务为守洞，以主线任务状态为准。');
    else if(q&&!q.done)lines.push('还需完成主线：'+(q.def.short||q.def.text)+(q.failed?'（当前任务已失败）':'')+'；主线完成后仍须唐僧本人抵达关口。');
    else if(q&&q.done&&gate)lines.push('主线已完成；还需护送唐僧抵达「'+(gate.name||'西行关口')+'」。');
    else lines.push('当前主线信息尚未就绪。');
    if(!t.down&&!G.ending&&G.td&&G.td.deploy)lines.push('布阵中：点「布阵完成，开始战斗」后出发。');
    if(Tg.phase==='rest'&&isFinite(Tg.restMax)&&isFinite(Tg.restT))lines.push('营地休息剩余：'+XY.fmtTime(Math.max(0,Tg.restMax-Tg.restT))+'（对局时间）。');
    var phases={walk:'前往休息点',rest:'营地休息',walk2:'继续西行',fork:'等待选择岔路',arrived:'已走到本路线终点'};
    if(Tg.phase)lines.push('行程状态：'+(phases[Tg.phase]||Tg.phase)+(t.down?'（已停止）':G.ending?'（本局已结束）':'')+'。');
    if(typeof Tg.s==='number'&&isFinite(Tg.s)&&typeof rt.total==='number'&&rt.total>0&&isFinite(rt.total)) {
      var p=Math.max(0,Math.min(1,Tg.s/rt.total));
      lines.push('当前路线进度：'+(Math.round(p*1000)/10)+'%'+(G.routeChoice==='S'?' · 南线':G.routeChoice==='N'?' · 北线':'')+'。这是路程比例，不是通关倒计时。');
    }
    if(!t.down&&!G.ending&&Tg.phase==='fork')lines.push('请在战场选择岔路；选路后按实际生效路线计算进度。');
    if(gate)lines.push('关口：'+(gate.sealed?'封印未解':'封印已解')+'。');
    if(q) {
      [q].concat(G.quests.sides||[]).forEach(function(o,i){
        if(!o||!o.def)return;
        lines.push((i?'支线':'主线')+' · '+(o.done?'已完成':o.failed?'已失败':'进行中')+' · '+o.def.short+'。');
        if(o.def.text&&o.def.text!==o.def.short)lines.push(o.def.text);
        if(o.prog)lines.push('实际进度：'+o.prog+'。');
      });
    }
    return lines;
  }
  function helpStatusSummary(G) {
    if(!G||!G.heroes||!G.heroes[0])return ['当前没有进行中的取经队伍。'];
    var h=G.heroes[0],Tg=G.tang||{},q=G.quests&&G.quests.main&&G.quests.main.def?G.quests.main:null,rt=G.rt||{},groups=[],next;
    function val(n){return typeof n==='number'&&isFinite(n)?(n>0&&n<.01?'<0.01':String(Math.round(n*100)/100)):'未知';}
    groups.push('唐僧气血：'+val(Math.max(0,h.hp))+' / '+val(h.maxHp)+(h.down?' · 已阵亡':' · 存活'));
    if(q){
      var state=q.done?'已完成':q.failed?'已失败':'进行中',progress=q.prog||'尚未开始';
      groups.push('主线：'+q.def.short+' · '+state+'\n进度：'+progress);
    }else groups.push('主线：当前信息尚未就绪。');
    if(Tg.phase==='rest'&&isFinite(Tg.restMax)&&isFinite(Tg.restT))groups.push('营地休息剩余：'+XY.fmtTime(Math.max(0,Tg.restMax-Tg.restT))+'（对局时间）');
    else {
      var phases={walk:'前往休息点',walk2:'继续西行',fork:'等待选择岔路',arrived:'已到本路线终点'},progress=typeof Tg.s==='number'&&isFinite(Tg.s)&&typeof rt.total==='number'&&rt.total>0&&isFinite(rt.total)?Math.round(Math.max(0,Math.min(1,Tg.s/rt.total))*1000)/10+'%':'未知';
      groups.push('当前路程：'+progress+' · '+(phases[Tg.phase]||'状态未就绪')+(G.routeChoice==='S'?'（南线）':G.routeChoice==='N'?'（北线）':''));
    }
    if(G.ending)next=G.ending.kind==='win'?'本局已通关，等待结算。':'本局已失败，等待结算。';
    else if(h.down)next='唐僧已阵亡，本关无法继续护送。';
    else if(G.td&&G.td.deploy)next='完成布阵后，点「开始战斗」。';
    else if(Tg.phase==='fork')next='回到战场选择岔路。';
    else if(q&&q.failed)next='主线已失败，请查看任务详情。';
    else if(q&&q.done)next=G.villain?'守洞任务已完成，等待结算。':'护送唐僧抵达西行关口。';
    else if(q){
      var d=q.def,dn=G.dens&&G.dens[d.den];
      if(d.type==='item')next=dn&&dn.beaten?'拾取落地宝物，再护送唐僧至关口。':'击退目标洞主，拾取其掉落的宝物。';
      else if(d.type==='rescue')next='守在被困者身边，直至救出。';
      else if(d.type==='slay_den')next=dn&&dn.beaten?'等待洞主再次出现，继续击败他。':'击败目标洞主，再护送唐僧至关口。';
      else if(d.type==='kill_den'||d.type==='kill_all')next='击退目标洞主，再护送唐僧至关口。';
      else if(d.type==='hold')next='守住营地，直到本轮行程结束。';
      else next='继续完成主线；完整条件见任务详情。';
    }else next='查看任务详情，确认当前目标。';
    groups.push('下一步：'+next);
    return groups;
  }
  function helpStatusSheet(c,G,W,H) {
    var wide=W>=900&&H>=500,w=wide?Math.min(920,W-64):W-28,x=(W-w)/2;
    var size=wide?18:16,line=wide?28:24,top=wide?88:60,bottom=H-60,view=P.folio.helpLiveView===1?1:0,key='helpLiveDetail',groups=view?helpStatusLines(G):helpStatusSummary(G),rows=[];
    var art=wide&&!view&&P.inkCutout,textW=art?w*0.6:w;      // 宽屏概览：右边放当前角色的立绘，不再整页留白
    if(!view&&G.diff)groups.unshift('难度：'+G.diff.name+'档 · '+G.diff.note);
    if(art)P.inkCutout(c,G,x+w*0.82,H-74,Math.min(H-170,470));
    groups.forEach(function(t,i){String(t).split('\n').forEach(function(p){rows=rows.concat(skillLines(c,p,size,false,textW));});if(!view&&i<groups.length-1)rows.push({gap:wide?12:3});});
    var capacity=Math.max(1,Math.floor((bottom-top)/line)),pages=view?Math.max(1,Math.ceil(rows.length/capacity)):1,page=view?Math.min(pages-1,Math.max(0,P.folio[key]||0)):0,shown=view?rows.slice(page*capacity,(page+1)*capacity):rows;
    K.btn(x,8,96,44,'返回说明','folio',{key:'help',i:0},{size:16,minS:16});
    K.t(view?'任务详情':'当前战况',W/2,30,18,'#a42d19','center',true);
    K.btn(W-x-76,8,76,44,'关闭','closeSkills',null,{primary:true,size:16,minS:16});
    var yy=top,drawn=[];
    shown.forEach(function(r){if(typeof r!=='string'){yy+=r.gap;return;}skillDraw(c,[r],x,yy+8,size,false,T.ink,line);drawn.push({text:r,y:yy+8});yy+=line;});
    var by=H-52;
    if(!view){var bw=(w-8)/2;K.btn(x,by,bw,44,'概览','folio',{key:'helpLiveView',i:0},{on:true,size:16,minS:16});K.btn(x+bw+8,by,bw,44,'任务详情','folio',{key:'helpLiveView',i:1},{size:16,minS:16});}
    else {K.btn(x,by,76,44,'概览','folio',{key:'helpLiveView',i:0},{size:16,minS:16});var bw=64;K.btn(x+84,by,bw,44,'前页','folio',{key:key,i:Math.max(0,page-1)},{off:page===0,size:16,minS:16});K.t((page+1)+' / '+pages,(x+148+W-x-64)/2,by+22,16,T.inkSoft,'center',false);K.btn(W-x-bw,by,bw,44,'后页','folio',{key:key,i:Math.min(pages-1,page+1)},{off:page+1===pages,size:16,minS:16});}
    XY.helpStatusLayout={section:6,sheet:true,view:view?'details':'summary',paragraphs:groups,allRows:rows,rows:shown,drawn:drawn,page:page,pages:pages,key:key,fontSize:size,lineHeight:line,capacity:capacity,body:{x:x,y:top,w:w,h:bottom-top},textBottom:drawn.length?drawn[drawn.length-1].y+10:top,controlsY:by,navY:by};
  }
  function helpStatusPage(c,G,x,y,w,h,foot,compactNav,pick,desktop) {
    var size=desktop?20:16,line=desktop?30:24,tx=x+12,tw=w-24,bodyY=y+40,controlsY=foot-50,capacity=Math.max(1,Math.floor((controlsY-8-bodyY)/line));
    var paragraphs=pick===6?helpStatusLines(G):HELP[1][1].slice(),rows=[];
    paragraphs.forEach(function(t){rows=rows.concat(skillLines(c,t,size,false,tw));});
    var pages=Math.max(1,Math.ceil(rows.length/capacity)),key=pick===6?'helpLiveStatus':'helpCommands',page=Math.min(pages-1,Math.max(0,P.folio[key]||0)),shown=rows.slice(page*capacity,(page+1)*capacity);
    skillDraw(c,[pick===6?'当前战况':'换人与命令'],tx,y+18,22,true,'#a42d19',28);
    skillDraw(c,shown,tx,bodyY+8,size,false,T.ink,line);
    K.btn(tx,controlsY,80,44,'上一页','folio',{key:key,i:(page+pages-1)%pages},{size:16});
    K.t((page+1)+' / '+pages,x+w/2,controlsY+22,16,T.inkSoft,'center',false);
    K.btn(x+w-92,controlsY,80,44,'下一页','folio',{key:key,i:(page+1)%pages},{size:16});
    XY.helpStatusLayout={section:pick,paragraphs:paragraphs,allRows:rows,rows:shown,page:page,pages:pages,key:key,fontSize:size,lineHeight:line,capacity:capacity,body:{x:tx,y:bodyY,w:tw,h:capacity*line},controlsY:controlsY,navY:foot,compactNav:compactNav};
  }
  // Balance only a paragraph's one-CJK final line; retain its text and line count.
  function balanceCJKLastLine(c, lines, width, from) {
    var i = lines.length - 1, prev = lines[i - 1], tail;
    if (i < (from || 0) + 1 || !/^[\u3400-\u9fff\uf900-\ufaff]$/.test(lines[i])) return lines;
    tail = prev.slice(-1) + lines[i];
    if (prev.length > 2 && /[\u3400-\u9fff\uf900-\ufaff]{2}$/.test(prev) && c.measureText(tail).width <= width) {
      lines[i - 1] = prev.slice(0, -1); lines[i] = tail;
    }
    return lines;
  }
  function helpPage(c,G,x,y,w,h){
    var pick=(P.folio.help||0)%HELP.length, sc=HELP[pick], rt=(XY.app&&XY.app.rt)||0;
    var narrow=w<480;
    var readable=pick===1||pick===6,compactNav=readable&&h<240;
    var navCols=w<700?Math.min(4,Math.max(2,Math.floor((w+6)/84))):HELP.length, navRows=compactNav?1:Math.ceil(HELP.length/navCols), navGap=6, navH=44;
    var foot=y+h-(navRows*navH+(navRows-1)*navGap), bodyH=foot-y-12;
    var wide=w>=900&&h>=400,readW=wide?Math.min(1040,w-32):w,readX=x+(w-readW)/2,artW=wide?readW*.38:w,textX=readX+readW*.42,textW=readW*.58;
    var artH=wide?Math.min(210,artW*.5,bodyH-64):Math.max(0,Math.min(240,bodyH*.48,bodyH-150));
    var ax=x+48, ay=wide?y+Math.max(16,(bodyH-artH)/2):y+8;
    function kaiSafe(c2,s,xx,yy,sz,col,align){ c2.save(); c2.font=sz+'px "Ma Shan Zheng","KaiTi",serif'; c2.fillStyle=col; c2.textAlign=align||'center'; c2.textBaseline='middle'; c2.fillText(s,xx,yy); c2.restore(); }
    function hd(id, cx, cy, ht){
      if(!helpPage.bag) helpPage.bag={};
      var im=helpPage.bag[id];
      if(!im){ im=helpPage.bag[id]=new Image(); im.src='assets/art/battle-hd/'+id+'.webp'; }
      if(!(im.complete&&im.naturalWidth)) return;
      var sca=ht/im.naturalHeight, dw=im.naturalWidth*sca;
      c.drawImage(im, cx-dw/2, cy, dw, ht);
    }
    // Static reference figures: complete source poses, never the cropped HUD portraits.
    function illustration(src, rect, cx, cy, maxW, maxH, bottom){
      if(!(maxW>0&&maxH>0)) return false;
      var bag=helpPage.figureBag||(helpPage.figureBag={}), im=bag[src];
      if(!im){im=bag[src]=new Image();im.src=src;}
      if(!(im.complete&&im.naturalWidth>0&&im.naturalHeight>0)) return false;
      var q=rect||[0,0,im.naturalWidth,im.naturalHeight];
      if(q[0]<0||q[1]<0||q[0]+q[2]>im.naturalWidth||q[1]+q[3]>im.naturalHeight) return false;
      var scale=Math.min(maxW/q[2],maxH/q[3]), dw=q[2]*scale, dh=q[3]*scale;
      c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
      c.drawImage(im,q[0],q[1],q[2],q[3],cx-dw/2,bottom?cy-dh:cy,dw,dh);c.restore();return true;
    }
    if(readable){
      if(wide){
        hd('wukong',readX+artW*.30,ay,artH*.90);hd('bajie',readX+artW*.70,ay,artH*.90);
        helpStatusPage(c,G,textX,ay-24,textW,foot-ay+24,foot,compactNav,pick,true);
      }else{
        var lead=pick===1&&bodyH>=300?112:0;
        if(lead){hd('wukong',x+w*.35,y+4,100);hd('bajie',x+w*.65,y+4,100);}
        helpStatusPage(c,G,x,y+lead,w,h-lead,foot,compactNav,pick);
      }
    }
    else {
    // On short pages the illustration band cannot fit a figure and its label.
    // Omit only that decorative band; keep the article and navigation below.
    if(artH>=64){
    c.save();
    c.beginPath(); c.rect(wide?readX:x, wide?ay:y, wide?artW:w, artH + 12); c.clip();
    if (XY.INKP&&!wide) XY.INKP.stroke(c, x+20, ay+artH, x+w*0.46, ay+artH-2, 1.2, '83,61,34', 0.35, 4, 0.01);
    var span = wide?artW-64:Math.min(w - 96, 820), ox = wide?readX+32:x+56;
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
      var soldiers=[
        ['assets/art/soldier-ink/cut2/aa_0.png',[0,117,278,504]],
        ['assets/art/soldier-ink/cut2/cannon_0.png',[37,35,246,296]],
        ['assets/art/frost-motion/atlas.webp',[64,4,192,408]]
      ];
      soldiers.forEach(function(pose,i){
        var cx=ox+span*(0.16+i*0.28);
        illustration(pose[0],pose[1],cx,ay+artH*.88-16,span*.24,Math.max(0,artH*.88-16),true);
        kaiSafe(c,['弓手','炮手','冰阵'][i],cx,ay+artH*0.88,18,'#24180f');
      });
    } else if(pick===3){
      var icons=['金箍棒','筋斗云','紧箍咒'];
      icons.forEach(function(nm,i){ var cx=ox+span*(0.16+i*0.26), cy=ay+artH*0.36; if(!(XY.ICONINK&&XY.ICONINK.draw(c,nm,cx,cy,artH*0.55))) kaiSafe(c,nm,cx,cy,26,'#24180f'); else kaiSafe(c,nm,cx,ay+artH*0.78,16,'#24180f'); });
    } else if(pick===4){
      illustration('assets/art/help/phyrex-stand.png',[70,0,270,437],ox+span*(narrow?.25:.32),ay,span*.4,artH*.9);
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
    }
    if(wide){
      // A bounded reading column: fixed line/paragraph spacing, never stretch
      // two instructions across the full remaining screen height.
      var titleY=ay+12,bodyTop=titleY+44,articleBottom=foot-58,articleKey='helpArticle-'+pick,articleRows=[];
      sc[1].forEach(function(sentence,i){if(i)articleRows.push({gap:20});balanceCJKLastLine(c,skillLines(c,sentence,26,false,textW),textW).forEach(function(row){articleRows.push({text:row,h:38});});});
      var articlePages=[],part=[],used=0,room=Math.max(38,articleBottom-bodyTop);
      articleRows.forEach(function(row){var hh=row.gap||row.h;if(part.length&&used+hh>room){articlePages.push(part);part=[];used=0;}if(row.gap&&!part.length)return;part.push(row);used+=hh;});
      if(part.length)articlePages.push(part);if(!articlePages.length)articlePages=[[]];
      var articlePage=Math.max(0,Math.min(articlePages.length-1,P.folio[articleKey]||0)),shown=articlePages[articlePage],yy=bodyTop,drawn=[];
      skillDraw(c,[sc[0]],textX,titleY,32,true,'#a42d19',38);
      if(XY.INKP)XY.INKP.stroke(c,textX,titleY+20,textX+Math.min(160,textW*.4),titleY+20,1.8,'164,45,25',.55,pick+2,.01);
      shown.forEach(function(row){if(row.gap){yy+=row.gap;return;}skillDraw(c,[row.text],textX,yy+13,26,false,T.ink,38);drawn.push({text:row.text,y:yy+13});yy+=38;});
      if(articlePages.length>1){K.btn(textX,foot-50,80,44,'上一页','folio',{key:articleKey,i:Math.max(0,articlePage-1)},{off:articlePage===0,size:16});K.t((articlePage+1)+' / '+articlePages.length,textX+textW/2,foot-28,16,T.inkSoft,'center',false);K.btn(textX+textW-80,foot-50,80,44,'下一页','folio',{key:articleKey,i:Math.min(articlePages.length-1,articlePage+1)},{off:articlePage+1===articlePages.length,size:16});}
      XY.helpArticleLayout={section:pick,key:articleKey,page:articlePage,pages:articlePages.length,rows:articleRows,drawn:drawn,body:{x:textX,y:bodyTop,w:textW,h:room},textBottom:yy,navY:foot,art:{x:readX,y:ay,w:artW,h:artH},fontSize:26,lineHeight:38};
    }else{
    var tx = x + 20, tw = w - 40, titleY = ay + artH + 16;
    kaiSafe(c, sc[0], tx, titleY, narrow ? 24 : 32, '#a42d19', 'left');
    if (XY.INKP) XY.INKP.stroke(c, tx, titleY + 18, tx + Math.min(160, tw * 0.2), titleY + 18, 1.8, '164,45,25', 0.55, pick + 2, 0.01);
    var lines=sc[1].length?sc[1]:['这里汇总当前战况：血量、任务和还要走多久。'];
    var top = titleY + 36, bot = foot - 6, band = (bot - top) / lines.length;
    lines.forEach(function (sentence, i) {
      var sz = bodyH < 240 ? 18 : narrow ? 21 : 26;
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
        kaiSafe(c,ln,tx,ly,sz,'#24180f','left');
      });
    });
    }
    }
    if(compactNav){
      K.btn(x,foot,96,44,'说明首页','folio',{key:'help',i:0},{size:16});
      K.t(sc[0],x+w/2,foot+22,16,T.ink,'center',true);
      K.btn(x+w-96,foot,96,44,'上一节','folio',{key:'help',i:pick-1},{size:16});
      return;
    }
    HELP.forEach(function(v,i){
      var row=Math.floor(i/navCols), inRow=Math.min(navCols,HELP.length-row*navCols), bw=(w-(navCols-1)*navGap)/navCols;
      var bx=x+(w-(inRow*bw+(inRow-1)*navGap))/2+(i%navCols)*(bw+navGap), by=foot+row*(navH+navGap), on=i===pick;
      c.save();
      if(on){ c.fillStyle='#a83224'; c.beginPath(); c.moveTo(bx+4,by+4); c.quadraticCurveTo(bx+bw/2,by-2,bx+bw-3,by+6); c.lineTo(bx+bw-5,by+38); c.quadraticCurveTo(bx+bw/2,by+44,bx+5,by+36); c.closePath(); c.fill(); }
      else { c.strokeStyle='rgba(42,32,22,0.45)'; c.lineWidth=1.6; c.beginPath(); c.moveTo(bx+6,by+36); c.quadraticCurveTo(bx+bw/2,by+31,bx+bw-6,by+36); c.stroke(); }
      c.restore();
      K.tf(v[0],bx+bw/2,by+21,bw-10,15,on?'#fff6e8':'#24180f','center',true,13);
      K.hit(bx,by,bw,navH,'folio',{key:'help',i:i});
    });
  }
  // The three reference pages share a readable article area, with the object
  // outside its text column and independent paging for complete descriptions.
  function fbArticle(c,x,y,w,h,o){
    var short=!K.port&&K.H<480,size=16,line=24,tx=short?x+w*.44:K.port?x+12:x+w*.44,tw=K.port?w-24:w*.55;
    var titleX=short?x+8:tx,titleW=short?w*.40:tw,titleSize=short?22:24;
    K.tf(o.title,titleX,y+20,titleW,titleSize,T.ink,'left',true,20);
    var metaRows=skillLines(c,o.meta||'',size,!!o.ready,titleW),metaY=y+50;
    skillDraw(c,metaRows,titleX,metaY,size,!!o.ready,o.ready?'#a42d19':T.inkSoft,22);
    var bodyTop,artX,artY,artSize;
    if(short){
      bodyTop=y+8;artSize=Math.max(24,Math.min(108,h-(metaY-y+metaRows.length*22)-12));
      artX=x+w*.20;artY=y+h-artSize/2-4;
    }else if(K.port){
      artSize=Math.min(140,h*.30);artX=x+w*.5;artY=metaY+(metaRows.length-1)*22+18+artSize/2;
      bodyTop=artY+artSize/2+18;
    }else{bodyTop=metaY+metaRows.length*22+12;artSize=Math.min(200,h*.7);artX=x+w*.20;artY=y+h*.52;}
    c.save();if(o.locked)c.globalAlpha=.34;
    if(o.art){if(!(XY.ICONINK&&XY.ICONINK.draw(c,o.art,artX,artY,artSize)))P.object(c,o.art,artX,artY,artSize,false);}
    else K.t('虚位',artX,artY,32,'#a39579','center',true);
    c.restore();
    var rows=[];(o.parts||[]).forEach(function(t){rows=rows.concat(skillLines(c,t,size,false,tw));});
    var bottom=y+h-6,count=Math.max(1,Math.floor((bottom-bodyTop)/line));
    if(rows.length>count){bottom-=48;count=Math.max(1,Math.floor((bottom-bodyTop)/line));}
    var key='fbtext-'+o.key,pages=Math.max(1,Math.ceil(rows.length/count)),page=Math.max(0,Math.min(P.page[key]||0,pages-1));P.page[key]=page;
    var shown=rows.slice(page*count,(page+1)*count);skillDraw(c,shown,tx,bodyTop+size/2,size,false,T.ink,line);
    if(pages>1){var py=y+h-46;K.btn(tx,py,72,44,'前文','pvPage',{key:key,d:-1},{size:16,off:page===0});K.t((page+1)+'/'+pages,tx+tw/2,py+22,16,T.inkSoft,'center');K.btn(tx+tw-72,py,72,44,'后文','pvPage',{key:key,d:1},{size:16,off:page+1===pages});}
    XY.fbArticleLayout={key:key,page:page,pages:pages,short:short,fontSize:size,lineHeight:line,allRows:rows,
      rows:shown.map(function(t,i){return{text:t,x:tx,y:bodyTop+i*line,w:tw,h:size};}),body:{x:tx,y:bodyTop,w:tw,h:Math.max(0,bottom-bodyTop)},
      art:{x:artX-artSize/2,y:artY-artSize/2,w:artSize,h:artSize},metaRows:metaRows,meta:{x:titleX,y:metaY-size/2,w:titleW,h:metaRows.length*22}};
  }
  P.fbArticle=fbArticle;
  function fbPage(c,G,app,x,y,w,h){
    var FB=XY.fabao,f=G.fb,C=XY.C,view=app.fbView||'carry',vs=[['carry','携带'],['sets','门派'],['recipe','配方'],['dex','图鉴']],reserve=view==='dex'?Math.min(130,w*.3):0,cw=(w-reserve-18)/4;
    vs.forEach(function(v,i){K.btn(x+i*(cw+6),y,cw,44,v[1],'fbView',{k:v[0]},{on:view===v[0],size:14});});
    if(view==='dex'){var fl=[['all','全部'],['f','法宝'],['l','灵物'],['u','已解锁']],fi=fl.findIndex(function(v){return v[0]===(app.fbFilter||'all');});K.btn(x+w-reserve,y,reserve,44,'筛：'+fl[fi][1]+' ›','fbFilter',{k:fl[(fi+1)%fl.length][0]},{size:12.5});}
    y+=52;h-=52;
    if(view==='recipe')return fbRecipes(c,G,app,x,y,w,h);
    if(view==='dex')return fbDex(c,G,app,x,y,w,h);
    if(view==='sets'){
      var ss=Object.keys(FB.SET_NAME),pg=P.pager(ss.length,1,'fbsets',x,y+h-44,w),sid=ss[pg],cm=G.combos.find(function(b){return b.set===sid;})||{n:0,tier:0},icon=FB.ITEMS.find(function(z){return z.set===sid;});
      fbArticle(c,x,y,w,h-52,{key:'set-'+sid,title:FB.SET_NAME[sid]+'门派',art:icon&&icon.name,
        meta:'本局 '+cm.n+' 件 · '+(cm.tier>=2?'大加成':cm.tier?'小加成':'未触发'),parts:['2件：'+XY.comboText(sid,0),'4件：'+XY.comboText(sid,1)]});return;
    }
    var items=[];for(var i=0;i<C.FB.SLOT_F+C.FB.SLOT_L;i++)items.push({s:i<C.FB.SLOT_F?f.w[i]:f.s[i-C.FB.SLOT_F],isL:i>=C.FB.SLOT_F});
    var pick=Math.min(P.folio.fbCarry||0,items.length-1),it=items[pick],s=it.s,shortCarry=!K.port&&K.H<480,mainH=h-(shortCarry?48:78);
    if(s){var inf=FB.info(s.id),mx=inf.sup?1:FB.maxLv(s.id);
      fbArticle(c,x,y,w,mainH,{key:'carry-'+s.id+'-'+s.lv,title:inf.name+(inf.sup?' · 超级':it.isL?' · 灵物':''),art:inf.name,
        meta:'Lv'+s.lv+'/'+mx+(inf.set?' · '+FB.SET_NAME[inf.set]+'门派':''),parts:(G.fb.starting&&G.fb.starting.skipped.length?['本次起手：'+G.fb.starting.selected.map(function(id){return FB.BY[id].name;}).join('、')+'。未带入：'+G.fb.starting.skipped.map(function(v){return v.name+'（'+v.reason+'）';}).join('、')+'。原卡组保留，可回首页卡组调整。']:[]).concat(FB.describe(s.id,s.lv,G).lines).concat(s.lv<mx?['下一重：'+FB.upgradeText(s.id,s.lv+1,G)]:[]).concat(FB.RECIPES.filter(function(r){return r.a===s.id||r.b===s.id;}).map(function(r){var a=FB.held(G,r.a),b=FB.held(G,r.b),st=FB.recipeState(G,r);return '炼化'+r.name+'：'+FB.BY[r.a].name+' '+(a?a.lv:0)+'/5重；'+FB.BY[r.b].name+(b?'已携带':'未携带')+'。'+(st.st==='ready'?'材料已齐，下一次选宝可炼化。':'点「配方」查看条件。');}))});}
    else fbArticle(c,x,y,w,mainH,{key:'empty-'+pick,title:it.isL?'灵物尚未携带':'法宝尚未携带',meta:'全队共用',parts:['局内选择法宝后，会出现在此。门派加成见「门派」卷。']});
    items.forEach(function(it,i){var step=w/items.length,cx=x+step*(i+.5),yy=shortCarry?y+h-38:y+h-55+[4,-2,6,0,3,-1][i%6];if(it.s)P.object(c,FB.info(it.s.id).name,cx,yy+10,32,false);else K.t(it.isL?'灵':'宝',cx,yy+10,18,'#aa9a7a','center',true);if(i===pick)K.ink(cx-15,yy+34,30,.7,i+2);K.hit(cx-step/2+2,y+h-(shortCarry?44:67),step-4,shortCarry?44:58,'folio',{key:'fbCarry',i:i});});
    if(!shortCarry)K.tf('法宝 '+f.w.length+'/'+C.FB.SLOT_F+' · 灵物 '+f.s.length+'/'+C.FB.SLOT_L,x,y+h-10,w,16,T.inkSoft,'left',false,16);
  }
  function fbRecipes(c,G,app,x,y,w,h){
    var FB=XY.fabao,rs=FB.RECIPES,key='fbrec',pg=Math.max(0,Math.min(P.page[key]||0,rs.length-1));P.page[key]=pg;
    var r=rs[pg],st=FB.recipeState(G,r),A=FB.BY[r.a],B=FB.BY[r.b],sup=FB.SUP[r.sup],a=FB.held(G,r.a),b=FB.held(G,r.b),pinned=G.fb.pin===r.id;
    var ready=st.st==='ready',done=st.st==='done',status=done?'已炼成':ready?'材料已齐 · 下次选宝可炼化':'尚缺材料或等级';
    var progress=A.name+'：'+(a?'第'+a.lv+'重 / 需5重':'未携带，需5重')+'；'+B.name+'：'+(b?'已带第'+b.lv+'重（1重即可）':'未携带，1重即可')+'。';
    var parts=['条件：'+A.name+'达到5重，并带着'+B.name+'。',progress];
    if(done)parts.push('本局已炼成此超级法宝。');
    else if(ready)parts.push('材料已齐！下一次选宝时选择「'+sup.name+'」完成炼化，不会自动合成。');
    else{if(!a)parts.push('还缺主法宝：'+A.name+'。');else if(a.lv<5)parts.push(A.name+'还需升级'+(5-a.lv)+'重。');if(!b)parts.push('还缺材料：'+B.name+'。');if(!FB.unlocked(r.a))parts.push(A.name+'来处：'+FB.whereText(r.a));if(!FB.unlocked(r.b))parts.push(B.name+'来处：'+FB.whereText(r.b));}
    parts.push('炼化消耗两件材料，超级法宝替换'+A.name+'的位置；'+B.name+'的格子腾空。');
    parts=parts.concat(FB.describe(r.sup,1,G).lines);
    fbArticle(c,x,y,w,h-56,{key:'recipe-'+r.id,title:sup.name,art:sup.name,meta:status,ready:ready,parts:parts});
    var footer=y+h-48,pinW=Math.min(240,w-136),pinX=x+(w-pinW)/2;
    K.btn(x,footer,44,44,'↑','pvPage',{key:key,d:-1},{size:24,off:pg===0});
    K.btn(pinX,footer,pinW,44,pinned?'已钉此配方':'钉此配方','fbPin',{rid:r.id},{size:16,on:pinned,primary:ready&&!pinned});
    K.btn(x+w-44,footer,44,44,'↓','pvPage',{key:key,d:1},{size:24,off:pg+1===rs.length});
    XY.recipeLayout={id:r.id,page:pg,state:st.st,ready:ready,progress:progress,parts:parts,article:XY.fbArticleLayout,footer:{x:x,y:footer,w:w,h:44}};
  }
  function fbDex(c,G,app,x,y,w,h){
    var FB=XY.fabao,flt=app.fbFilter||'all',all=FB.ITEMS.concat(Object.keys(FB.SUP).map(function(id){return FB.SUP[id];}));
    function known(z){return z.sup?!!(FB.sv().made[z.rid]||FB.held(G,z.id)):FB.unlocked(z.id);}
    var list=all.filter(function(z){return flt==='all'||(flt==='u'?known(z):z.kind===flt);}),small=!K.port&&K.W<950,per=small?1:4,start=P.pager(list.length,per,'fbdex',x,y+h-44,w);
    if(!list.length){K.lines('没有符合筛选的物件。',x+20,y+40,w-40,16,22,T.inkSoft,4,false);return;}
    var slice=list.slice(start,start+per),sel=P.folio.fbDex,chosen=slice.find(function(z){return z.id===sel;})||slice[0],un=known(chosen),mainH=small?h-54:h-155;
    var recipe=chosen.sup?FB.recipe(chosen.rid):null,where=recipe?'满级'+FB.BY[recipe.a].name+' + '+FB.BY[recipe.b].name+'，选宝时炼化':FB.whereText(chosen.id);
    fbArticle(c,x,y,w,mainH,{key:'dex-'+chosen.id,title:un?chosen.name:'未解锁',art:chosen.name,locked:!un,
      meta:(chosen.sup?'超级法宝':chosen.kind==='l'?'灵物':'法宝')+' · 图鉴 '+all.filter(known).length+'/'+all.length,
      parts:(un?FB.levelParts(chosen.id,G):['解锁后可查看效果']).concat(['来处：'+where])});
    if(!small)slice.forEach(function(z,i){var cx=x+w*(i+.5)/slice.length,yy=y+h-115+[4,-4,9,0][i],on=z.id===chosen.id;P.object(c,z.name,cx,yy,48,!known(z));K.tf(known(z)?z.name:'？？？',cx,yy+38,w/slice.length-10,12,on?'#a42d19':T.ink,'center',true,11);K.hit(cx-w/slice.length/2+2,y+h-147,w/slice.length-4,94,'folio',{key:'fbDex',i:z.id});});
  }

  var oDraw = XY.screens.draw;
  XY.screens.draw = function (c, G, app) { if (app.screen === 'dex' && XY.ui2 && XY.ui2.on) { K = P.K; dex(c, G, app); if (app.confirm) oDraw(c, G, { screen: '__none', confirm: app.confirm, lw: app.lw, lh: app.lh, mouse: app.mouse, rt: app.rt }); return; } return oDraw(c, G, app); };
  var oSk = XY.R4.skills;
  XY.R4.skills = function (c, G, app) { if (XY.ui2 && XY.ui2.on) return skills(c, G, app); return oSk(c, G, app); };
  var oBegin = P.begin; P.begin = function (c, app) { var k = oBegin(c, app); K = k; return k; };
})();
