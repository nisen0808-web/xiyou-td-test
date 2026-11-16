/* pv2c.js —— 藏品与定妆手卷；桌面及手机共用 CSS 像素布局。 */
(function () {
  'use strict';
  var XY = window.XY, R = XY.R, T = R.T, S = XY.save, P = XY.pv2, K;

  function deckSummary() {
    var fx = {}, cnt = {}, k, combos = [];
    function add(f, mul) { for (k in f) fx[k] = (fx[k] || 0) + f[k] * mul; }
    S.data.deck.forEach(function (id) { var cd = XY.CARD_BY[id]; add(cd.fx, XY.cardLvMul(S.lvOf(id))); cnt[cd.set] = (cnt[cd.set] || 0) + 1; });
    XY.SET_ORDER.forEach(function (sid) {
      var n = cnt[sid] || 0, s = XY.CARD_SETS[sid];
      if (n >= 3) { add(s.t3.fx, 1); combos.push(s.name + '3'); } if (n >= 5) { add(s.t5.fx, 1); combos.push(s.name + '5'); }
    });
    return { text: XY.fxText(fx, 1), combos: combos, any: Object.keys(fx).length > 0 };
  }

  // Current V2 starter rules, read from the same plan and descriptions as combat.
  function deckModel(id, view, sid) {
    var FB=XY.fabao,it=FB.BY[id],old=XY.CARD_BY[id],rec=S.data.cards[id],lv=rec?rec.lv:1,kg=it?FB.kg(id):0,plan=FB.startingPlan(),selected=plan.selected.slice(),parts=[],counts={f:0,l:0},sets={};
    if(!selected.length)selected=['jingubang'];
    selected.forEach(function(k){var z=FB.BY[k];counts[z.kind]++;sets[z.set]=(sets[z.set]||0)+1;});
    var owned=it?FB.unlocked(id):S.has(id),title=(it||old).name,meta=it?(it.kind==='l'?'灵物':'法宝')+' · 开光 '+kg+'/3':'典藏 · 不参与本局';
    if(view===2){
      title='起手携带';meta='本次 '+selected.length+'/'+plan.limit+' 件 · 法宝 '+counts.f+'/4 · 灵物 '+counts.l+'/3';
      parts.push('从第一关重新出发时，所选物件均以一重入场。续关沿用旅程中的法宝与重数。');
      parts.push('实际携带：'+selected.map(function(k){return FB.BY[k].name;}).join('、')+'。');
      if(!plan.selected.length)parts.push('未选有效起手物件，默认带一重金箍棒。');
      parts.push('总数受起手携带位限制，同时最多4件法宝、3件灵物。不同门派可以混带。');
      parts.push('收藏与开光：收藏Lv1、2、3、4、5分别对应开光0、1、2、3、3级。开光最高三级，不提高开局重数。');
      parts.push('每级开光让道具注明的属性增加'+Math.round(XY.C.FB.KG*100)+'%；具体加成见各物件的「效果」。未注明的固定效果不变。');
      if(plan.skipped.length)parts.push('本次不会带入：'+plan.skipped.map(function(z){return z.name+'（'+z.reason+'）';}).join('、')+'。旧选择仍保留，可先取下再调整。');
      XY.SET_ORDER.forEach(function(k){var n=sets[k]||0,s=XY.CARD_SETS[k];if(!n&&k!==sid)return;parts.push(s.name+'门派：'+n+'件。'+(n>=4?'已启用二件与四件加成。':n>=2?'已启用二件加成。':'尚未启用门派加成。')+'二件：'+XY.comboText(k,0)+'；四件另加：'+XY.comboText(k,1)+'。');});
    }else if(!it){
      parts.push('此物保留为典藏，不进入当前法宝选宝池，也不能加入起手携带。');
      if(view===1)parts.push((old&&old.lore)||'');
      else parts.push('收藏等级 Lv'+lv+' 仅为收藏记录；旧版属性与三件/五件套装在当前规则中不生效。');
    }else if(view===1){
      parts.push((old&&old.lore)||'取经路上的法宝。');parts.push('来处：'+FB.whereText(id)+'。');parts.push(owned?'已可加入起手携带；入场从一重开始。':'尚未解锁，满足来处条件后可加入起手携带。');
      parts.push('超级法宝由主法宝达到五重、持有对应材料，在后续选宝时炼化；不能作为起手物件。');
    }else{
      parts.push('开局一重，局内'+(it.kind==='l'?'最高三重':'最高五重')+'；收藏等级不提高开局重数。');
      var kgFields={jingubang:'横扫伤害',jiuchi:'砸地伤害',xiangyao:'环绕伤害',jingangzhuo:'抛圈伤害',bajiaoshan:'风与风幕伤害',liuli:'火径与灼烧伤害',sanmei:'火球与灼烧伤害',chanzhang:'震荡伤害',jindouyun:'每重的移速加成',huoyan:'暴击率加成',qishier:'冷却缩短比例',jinguzhou:'每重的大招冷却缩短比例',renshen:'英雄每秒回血',nianzhu:'每重的营地生命与回血加成'};
      parts.push(kgFields[id]?'当前开光'+kg+'级：'+kgFields[id]+(kg?'+'+Math.round(kg*XY.C.FB.KG*100)+'%。':'暂无额外加成。'):'开光不改变此物的固定效果。');
      var preview={level:1,P:{dmg:1}};
      var levels=FB.levelParts(id,preview).map(function(t){return t.replace('以上为当前队伍面板伤害','以上按队伍一级、已计当前开光显示，门派与英雄成长加成另算');});
      parts=[levels[1]].concat(parts,levels.slice(2));
      if(rec&&lv<XY.CARD_MAXLV)parts.push('收藏Lv'+lv+' → '+(lv+1)+'：消耗重复收藏卡'+S.upNeed(lv)+'张（现有'+rec.dup+'张），开光'+kg+' → '+Math.min(3,lv)+'级。'+(kg===Math.min(3,lv)?'这次只提高收藏等级，不增加开光。':''));
      parts.push('来处：'+FB.whereText(id)+'。');
    }
    return{id:id,title:title,meta:meta,parts:parts.filter(Boolean),owned:owned,active:!!it,lv:lv,kg:kg,rec:rec,plan:plan,selected:selected,counts:counts};
  }
  P.deckModel=deckModel;
  function deckV2(c,G,app){
    var f=P.frame(c,app,'法宝藏卷',{centerWide:true});K=P.K;
    var FB=XY.fabao,SO=XY.SET_ORDER,si=Math.max(0,Math.min(app.pvSet||0,SO.length-1)),sid=SO[si],set=XY.CARD_SETS[sid],w=f.w,top=f.y,short=!K.port&&K.H<480,shortPort=K.port&&K.H<680,ax=f.x+(short?188:0),aw=w-(short?188:0),setW=short?180:w;
    SO.forEach(function(id,i){K.btn(f.x+i*setW/4,top,setW/4-4,44,XY.CARD_SETS[id].name,'pvSet',{i:i},{on:i===si,size:15});});
    var list=FB.ITEMS.concat(FB.retired()).filter(function(z){return z.set===sid;}),per=short?1:4,choice=P.pageObject(list,per,'deck-objects-'+sid,app.deckSel),sel=app.deckSel=choice.id,view=P.folio.deckDetail||0,m=deckModel(sel,view,sid),it=FB.BY[sel]||XY.CARD_BY[sel];
    ['效果','故事 / 来处','起手卡组'].forEach(function(t,i){K.btn(ax+i*aw/3,top+(short?0:50),aw/3-4,44,t,'folio',{key:'deckDetail',i:i},{on:i===view,size:14});});
    var y=top+110,actionY=K.H-(short?60:shortPort?186:212),listY=short?top+56:K.H-(shortPort?130:152),pagerY=K.H-74;
    if(shortPort){P.object(c,it.name,f.x+14,top+109,22,!m.owned);K.tf(m.title,f.x+34,top+109,w-126,18,T.ink,'left',true,16);K.tf(view===2?'起手 '+m.selected.length+'/'+m.plan.limit:m.active?'开光 '+m.kg+'/3':'典藏',f.x+w,top+109,86,13,T.inkSoft,'right',false,13);}
    else if(!short){P.object(c,it.name,f.x+22,y+15,38,!m.owned);K.tf(m.title,f.x+52,y+6,w-56,21,T.ink,'left',true,18);}
    var meta=view===2?'法宝 '+m.counts.f+'/4 · 灵物 '+m.counts.l+'/3 · 起手位 '+m.plan.limit:m.meta;
    if(short){K.tf('当前：'+it.name,f.x+4,top+141,176,15,T.ink,'left',true,13);K.tf(m.meta,f.x+4,top+164,176,13,T.inkSoft,'left',false,13);}else if(!shortPort)K.tf(meta,f.x+52,y+31,w-56,14,T.inkSoft,'left',false,13);
    var size=16,lh=23,bodyY=short?top+64:shortPort?top+134:y+56,rows=[];c.font=size+'px '+XY.C.FONT;
    m.parts.forEach(function(t){var line='',units=t.match(/[+-]?\d[\d,]*(?:\.\d+)?(?:%|\/\d+|秒|级|点|倍)?|[A-Za-z][A-Za-z0-9_.-]*|[\s\S]/g)||[];units.forEach(function(ch){if(line&&c.measureText(line+ch).width>aw-12){rows.push(line);line=ch;}else line+=ch;});if(line)rows.push(line);});
    var cap=Math.max(1,Math.floor((actionY-bodyY-10)/lh)),need=rows.length>cap;if(need)cap=Math.max(1,Math.floor((actionY-bodyY-60)/lh));
    var key='deck-text-'+sel+'-'+view+'-'+m.lv+'-'+S.data.deck.join(','),pages=Math.max(1,Math.ceil(rows.length/cap)),pg=Math.max(0,Math.min(P.page[key]||0,pages-1));P.page[key]=pg;
    var shown=rows.slice(pg*cap,(pg+1)*cap);shown.forEach(function(t,i){K.t(t,ax+6,bodyY+i*lh,size,T.ink,'left',false);});
    if(pages>1){var py=actionY-52;K.btn(ax,py,72,44,'前文','pvPage',{key:key,d:-1},{size:15,off:pg===0});K.t((pg+1)+'/'+pages,ax+aw/2,py+22,14,T.inkSoft,'center');K.btn(ax+aw-72,py,72,44,'后文','pvPage',{key:key,d:1},{size:15,off:pg+1===pages});}
    var inside=S.inDeck(sel),toggleOk=inside||(m.active&&m.owned),upgradeOk=!!m.rec&&m.lv<XY.CARD_MAXLV;
    K.btn(ax,actionY,aw*.55-4,48,inside?'从起手取下':m.active?(m.owned?'放入起手':'尚未解锁'):'仅作典藏','deckToggle',{id:sel},{size:14,off:!toggleOk,primary:toggleOk&&!inside});
    K.btn(ax+aw*.55+4,actionY,aw*.45-4,48,!m.rec?'未持有收藏卡':m.lv>=XY.CARD_MAXLV?'收藏已达上限':m.kg===3?'收藏升级（不增开光）':'收藏升级','cardUp',{id:sel},{size:13,minS:13,off:!upgradeOk,primary:upgradeOk&&m.rec.dup>=S.upNeed(m.lv),wrap:true});
    var listW=short?180:w,start=P.pager(list.length,per,'deck-objects-'+sid,f.x,pagerY,listW),slice=list.slice(start,start+per);
    slice.forEach(function(z,i){var xx=f.x+i*listW/per,ww=listW/per-4,own=FB.BY[z.id]?FB.unlocked(z.id):S.has(z.id);P.object(c,z.name,xx+ww/2,listY+(shortPort?12:18),shortPort?24:30,!own);K.lines(own?z.name:'未解锁',xx+5,listY+(shortPort?32:43),ww-10,13,15,shortPort&&z.id===sel?'#a42d19':own?T.ink:T.inkSoft,2,z.id===sel);K.hit(xx,listY,ww,shortPort?54:70,'cardSel',{id:z.id});if(z.id===sel&&!shortPort)K.ink(xx+6,listY+71,ww-12,.6,i+9);});
    var notice=app.menuMsg&&app.rt<=app.menuMsg.until?app.menuMsg:null;
    K.tf(notice?notice.text:short?'起手 '+m.selected.length+'/'+m.plan.limit:'实际起手 '+m.selected.length+'/'+m.plan.limit+' · '+(m.plan.skipped.length?'有 '+m.plan.skipped.length+' 项未带入，见「起手卡组」':'均为一重；规则见「起手卡组」'),f.x,K.H-14,short?180:w,13,notice?(notice.bad?'#a42d19':'#2f663a'):T.inkSoft,'left',false,13);
    XY.deckLayout={id:sel,view:view,model:m,key:key,page:pg,pages:pages,fontSize:size,capacity:cap,compactPortrait:shortPort,allRows:rows,rows:shown.map(function(t,i){return{text:t,x:ax+6,y:bodyY+i*lh,w:aw-12,h:size};}),body:{x:ax+6,y:bodyY-size/2,w:aw-12,h:(need?actionY-60:actionY-8)-(bodyY-size/2)},actionY:actionY,listY:listY,pagerY:pagerY};
    P.end(c);
  }

  /* ================= 卡牌 / 组牌 ================= */
  function deck(c,G,app) {
    if(XY.fabao&&XY.fabao.on())return deckV2(c,G,app);
    var f=P.frame(c,app,'法宝藏卷',{centerWide:true});
    K=P.K;
    var port=K.port,SO=XY.SET_ORDER,si=Math.max(0,Math.min(app.pvSet||0,SO.length-1)),sid=SO[si],ss=XY.CARD_SETS[sid];
    var tx=port?f.x:270,ty=port?f.y:f.y-52,cw=port?(f.w-24)/SO.length:Math.min(94,(f.chipX-tx-32)/SO.length);
    SO.forEach(function(id,k){K.btn(tx+k*(cw+6),ty,cw,44,XY.CARD_SETS[id].name,'pvSet',{i:k},{on:k===si,size:15});});
    var top=port?f.y+52:f.y+6,bot=f.y+f.h,bh=bot-top,list=XY.CARDS.filter(function(z){return z.set===sid;}),sel=app.deckSel&&list.some(function(z){return z.id===app.deckSel;})?app.deckSel:list[0].id;
    var cd=XY.CARD_BY[sel],own=S.has(sel),lv=S.lvOf(sel),rar=XY.RARITY[cd.r],set=XY.CARD_SETS[cd.set],rec=S.data.cards[sel],n=S.deckSlots(),sm=deckSummary();
    var lw=port?132:Math.floor(f.w*.42),rx=port?f.x+144:f.x+lw+22,rw=port?f.w-144:f.w-lw-22,mainH=port?Math.min(256,bh*.4):bh-106;
    K.t(ss.name+'藏',f.x+4,top+18,22,ss.color,'left',true);
    K.tf('拥有 '+list.filter(function(z){return S.has(z.id);}).length+'/6',f.x+4,top+40,lw-8,12,T.inkSoft,'left',false,11);
    var ah=Math.min(port?190:260,mainH-60),aw=ah*.7,ax=f.x+lw*.5,ay=top+56+ah*.5;
    c.save();c.translate(ax,ay);c.rotate(-.07);R.drawCardMini(c,own?cd:{name:'？',set:cd.set,r:cd.r},0,0,aw,ah,own?1:.45);c.restore();
    var view=P.folio.deckDetail||0,vs=['法宝','故事','卡组'];vs.forEach(function(t,i){K.btn(rx+i*rw/3,top,rw/3-4,44,t,'folio',{key:'deckDetail',i:i},{on:i===view,size:14});});
    var yy=top+60;K.tf(view===2?'带进局的加成':own?cd.name:'？？？',rx,yy,rw,port?20:24,T.ink,'left',true,15);yy+=25;
    if(view===2){
      yy=K.lines(sm.any?sm.text:'卡组为空，点藏品，再盖「放入卡组」印。',rx,yy,rw,13,18,'#2f663a',8,false);
      yy=K.lines('羁绊：'+(sm.combos.join('、')||'未触发'),rx,yy+6,rw,12.5,18,T.inkSoft,4,false);
      yy=K.lines('3张：'+XY.comboText(sid,0)+'；5张：'+XY.comboText(sid,1),rx,yy+6,rw,12,16,set.color,5,false);
    }else if(view===1){
      yy=K.lines(own?cd.lore:'还没有这张法宝。精英、宝箱、牛魔王都有机会掉落，掉落后自动永久收进收藏。',rx,yy,rw,13.5,19,T.ink,10,false);
      K.lines(rar.name+' · '+set.name+'套（'+set.theme+'）',rx,yy+8,rw,12,17,rar.color,3,false);
    }else{
      yy=K.lines(rar.name+' · '+set.name+'套 · '+(own?'Lv'+lv+'/'+XY.CARD_MAXLV:'未获得'),rx,yy,rw,12,16,rar.color,2,false);
      if(own){yy=K.lines('现在：'+XY.cardFxText(cd,lv),rx,yy+5,rw,13,17,'#2f663a',4,false);yy=K.lines(lv<XY.CARD_MAXLV?'升级：'+XY.cardFxText(cd,lv+1):'已满级',rx,yy+4,rw,12.5,17,T.inkSoft,4,false);if(lv<XY.CARD_MAXLV)K.lines('重复法宝 '+rec.dup+'/'+S.upNeed(lv)+'（升级消耗）',rx,yy+5,rw,12,16,T.ink,2,false);}
      else K.lines('尚未收得，先在局内寻访。',rx,yy+12,rw,13,18,T.inkSoft,3,false);
    }
    var actionY=port?top+mainH+4:bot-111;
    if(own){var bw=(rw-8)/2;K.btn(rx,actionY,bw,44,S.inDeck(sel)?'从卡组取下':'放入卡组','deckToggle',{id:sel},{primary:!S.inDeck(sel),size:14});K.btn(rx+bw+8,actionY,bw,44,lv>=XY.CARD_MAXLV?'已满级':'升级','cardUp',{id:sel},{primary:lv<XY.CARD_MAXLV&&rec.dup>=S.upNeed(lv),size:14});}
    var ribbonY=port?actionY+66:bot-108;
    P.objects(c,app,list,{x:f.x,y:ribbonY,w:port?f.w:lw,h:78},sel,'cardSel',function(z,x,y,w,h){R.drawCardMini(c,S.has(z.id)?z:{name:'？',set:z.set,r:z.r},x,y,Math.min(48,w*.72),Math.min(66,h),S.has(z.id)?1:.45);},function(z){return S.has(z.id)?z.name:'？？？';});
    var dx=port?f.x:rx,dy=port?ribbonY+124:bot-53,dw=port?f.w:rw;
    K.tf('我的卡组 '+S.data.deck.length+'/'+n+' · 收藏 '+S.ownedCount()+'/'+XY.CARDS.length,dx,dy-7,dw,12,T.inkSoft,'left',true,11);
    for(var i=0;i<6;i++){var cx=dx+dw*(i+.5)/6,id=S.data.deck[i],locked=i>=n;K.t(id?XY.CARD_BY[id].name:locked?'锁':'空',cx,dy+19,11.5,id?'#a42d19':'#9b8d75','center',!!id);K.ink(cx-12,dy+34,24,id?.55:.15,i+3);if(id)K.hit(cx-dw/12+2,dy-2,dw/6-4,44,'cardSel',{id:id});}
    if(port)K.lines('集齐三张、五张同套，可把羁绊带进下一局。数值总览见「卡组」。',f.x,dy+62,f.w,13,18,T.inkSoft,4,false);
    K.msg(f.x+f.w,bot-5,'right',f.w);P.end(c);
  }

  /* ================= 解锁 / 皮肤 ================= */
  function unlock(c,G,app) {
    var f=P.frame(c,app,'定妆集',{centerWide:true});
    K=P.K;
    var port=K.port,tab=app.pvUk||0,tx=port?f.x:252,ty=port?f.y:f.y-52,tw=port?(f.w-12)/2:Math.min(136,(f.chipX-tx-20)/2),top=port?f.y+54:f.y+8,bot=f.y+f.h;
    [['人物定妆',0],['里程碑',1]].forEach(function(v,i){K.btn(tx+i*(tw+8),ty,tw,44,v[0],'pvUk',{i:v[1]},{on:tab===v[1],size:15});});
    if(tab===0){
      var hi=Math.max(0,Math.min(P.folio.skinHero||0,XY.HEROES.length)),variant=hi===XY.HEROES.length,base=XY.HEROES[variant?4:hi],idx=variant?4:hi,lw=port?f.w*.42:f.w*.47,rx=f.x+lw+20,rw=f.w-lw-20,ribbonY=bot-(port?210:91),height=ribbonY-top-20;
      var shortView=!port&&K.H<420,shown=XY.heroDef(idx),figH=Math.max(48,Math.min(port?300:460,height-(shortView?42:72))),figX=f.x+lw*.5,figFoot=top+(shortView?30:46)+figH;
      K.tf(variant?'龙马诸相':shown.name,f.x+10,top+24,lw-16,26,'#a42d19','left',true,18);
      var drawn=XY.heroink&&XY.heroink.portrait(c,shown,figX,figFoot,figH,lw-12);
      if(!drawn)K.tf('画卷载入中',figX,top+78,lw-16,14,T.inkSoft,'center',false,12);
      var pose=XY.heroink&&XY.heroink.lastPortrait;
      if(drawn&&pose){K.ink(pose.x,pose.y+pose.h+7,pose.w,.55,idx+41);if(shown.skinId){c.save();c.strokeStyle=shown.dark;c.lineWidth=2;c.strokeRect(pose.x-3,pose.y-3,pose.w+6,pose.h+6);c.restore();}}
      K.tf((shown.skinName||'原版')+(idx===4?' · '+(shown.form==='human'?'人形':'马身'):''),figX,figFoot+(shortView?18:26),lw-10,13,shown.skinId?shown.dark:T.inkSoft,'center',true,11);
      if(port)ribbonY=Math.min(ribbonY,figFoot+76);
      var opts;if(variant)opts=XY.HORSE_FORMS.map(function(fm){var lock=fm.id==='dragon'&&!S.dragonUnlocked();return{name:fm.name,on:S.horseForm()===fm.id,lock:lock,sub:lock?XY.condText(XY.UNLOCK_BY.u_dragon):S.horseForm()===fm.id?'已出战':'点击换上',pd:XY.previewDef(4,S.skinOf('horse')!=='default',fm.id==='dragon'),act:'variantSet',ex:{form:fm.id}};});
      else{var ul=S.skinUnlocked(base.id),cur=S.skinOf(base.id),u=XY.UNLOCKS.filter(function(z){return z.kind==='skin'&&z.hero===base.id;})[0];opts=[{name:'原版',on:cur==='default',lock:false,sub:cur==='default'?'使用中':'点击换上',pd:XY.previewDef(idx,false,idx===4&&S.horseForm()==='dragon'),act:'skinSet',ex:{hero:base.id,skin:'default'}},{name:XY.SKINS[base.id].name,on:cur!=='default'&&ul,lock:!ul,sub:ul?(cur!=='default'?'使用中':'点击换上'):XY.condText(u),pd:XY.previewDef(idx,true,idx===4&&S.horseForm()==='dragon'),act:'skinSet',ex:{hero:base.id,skin:'skin'}}];}
      var rh=Math.min(port?150:130,(height-(shortView?18:34))/opts.length);K.t(variant?'出战形态':'墨色饰纹',rx,top+24,18,T.ink,'left',true);
      opts.forEach(function(o,i){var yy=top+(shortView?38:46)+i*rh,rr=shortView?Math.min(18,(rh-10)/2):i===0?30:25,faceX=rx+rr+2;
        c.save();if(o.lock)c.globalAlpha=.42;R.drawHeroShape(c,o.pd,faceX,yy+rr+4,rr);c.restore();
        K.tf(o.name,rx+rr*2+14,yy+(shortView?11:18),rw-rr*2-16,15,o.lock?T.inkSoft:T.ink,'left',true,11);
        K.lines(o.sub,rx+rr*2+14,yy+(shortView?29:42),rw-rr*2-16,12,16,T.inkSoft,shortView?1:port?4:3,false);
        K.ink(rx+rr*2+14,yy+rh-5,Math.max(36,rw-rr*2-18),o.on?.65:.18,i+25);K.hit(rx,yy,rw,rh-4,o.act,o.ex);
      });
      XY.HEROES.concat([{id:'_variant',name:'龙马诸相'}]).forEach(function(h,i){var step=f.w/6,cx=f.x+step*(i+.5),cy=ribbonY+[8,0,10,2,7,1][i],d=XY.previewDef(Math.min(i,4),false,false);XY.hud2.face(c,{id:d.id,def:d},cx,cy+23,22,app.rt);K.tf(h.name,cx,cy+61,step-4,11.5,i===hi?'#a42d19':T.ink,'center',true,10.5);if(i===hi)K.ink(cx-18,cy+72,36,.6,i+9);K.hit(cx-step/2+2,ribbonY,step-4,88,'folio',{key:'skinHero',i:i});});
      var info=variant?XY.UNLOCK_BY.u_dragon:u;if(port&&info){var pr=S.progress(info),iy=ribbonY+113;K.t(info.name,f.x+8,iy,18,'#a42d19','left',true);iy=K.lines(info.kind==='skin'?'专属配色与头像饰纹':info.desc||XY.condText(info),f.x+8,iy+28,f.w-16,13,19,T.inkSoft,3,false);K.tf(XY.condText(info)+' · '+pr.cur+'/'+pr.need,f.x+8,iy+20,f.w-16,12,T.inkSoft,'left',false,11);}
    }else{
      var per=4,start=P.pager(XY.UNLOCKS.length,per,'unlock',f.x,bot-44,f.w),list=XY.UNLOCKS.slice(start,start+per),area=bot-top-78,doneN=XY.UNLOCKS.filter(function(u){return S.data.unlocks[u.id];}).length;
      K.tf('足迹 '+doneN+'/'+XY.UNLOCKS.length+' · 各项条件独立累计',f.x,top+10,f.w,13,T.inkSoft,'left',false,11);
      list.forEach(function(u,i){var x=port?f.x+(i%2?66:0):f.x+f.w*(i+.5)/per-62,y=port?top+45+i*(area-40)/4:top+50+[16,84,4,72][i],ww=port?f.w-(i%2?72:14):f.w/per-12,pr=S.progress(u),done=!!S.data.unlocks[u.id],cy=y+28;
        if(u.kind==='slot'){R.drawCardMini(c,XY.CARDS[0],x+26,cy,36,50,.75);K.t(u.name.replace(/\D/g,'')+'格',x+45,cy+22,18,'#a42d19','left',true);}else{var ix=XY.HEROES.findIndex(function(h){return h.id===u.hero;});var pd=XY.previewDef(ix<0?4:ix,true,u.kind==='hero');XY.hud2.face(c,{id:pd.id,def:pd},x+27,cy,25,app.rt);}
        var textX=port?x+72:x,yy=port?y+10:y+72,textW=port?ww-72:ww;K.tf(u.name,textX,yy,textW,16,T.ink,'left',true,12);yy=K.lines(XY.condText(u),textX,yy+25,textW,12.5,17,T.inkSoft,3,false);
        var progress=u.cond.type==='best'?Math.floor(pr.cur/60*10)/10+' / '+u.cond.n/60+' 分':pr.cur+' / '+pr.need;K.t(done?'已解锁':progress,textX,yy+12,12.5,done?'#a42d19':T.ink,'left',true);K.ink(textX,yy+28,Math.min(textW,140),done?.65:.23,i+15);
      });
    }
    K.msg(f.x+f.w,bot-3,'right',f.w);P.end(c);
  }

  var oDraw = XY.screens.draw;
  XY.screens.draw = function (c, G, app) {
    if (XY.ui2 && XY.ui2.on && (app.screen === 'deck' || app.screen === 'unlock')) { P.begin(c, app); K = P.K; P.end(c); XY.ui.hits.length = 0; if (app.screen === 'deck') deck(c, G, app); else unlock(c, G, app); return; }
    return oDraw(c, G, app);
  };
  var oBegin = P.begin; P.begin = function (c, app) { var k = oBegin(c, app); K = k; if ((app.screen === 'deck' || app.screen === 'unlock') && P.brushTools) P.brushTools(k); return k; };
})();
