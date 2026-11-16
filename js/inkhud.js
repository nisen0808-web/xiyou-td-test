/* 常驻战场的墨边记事：以实际 CSS 像素排版，不把信息再次装进一排排槽位。 */
(function(){'use strict';var X=window.XY,P=X.pv2,R=X.R,T=R.T,I=X.inkHud={};
function wash(c,x,y,w,h){c.save();c.fillStyle='rgba(248,239,217,.88)';c.beginPath();c.moveTo(x+3,y+3);c.lineTo(x+w-6,y);c.lineTo(x+w,y+h-4);c.lineTo(x+2,y+h);c.closePath();c.fill();c.restore();}
function line(c,x,y,w,f,col){c.save();c.strokeStyle=col||'#58452b';c.lineWidth=1.8;c.globalAlpha=.25;c.beginPath();c.moveTo(x,y);c.lineTo(x+w,y+.8);c.stroke();c.globalAlpha=.85;[0,.29,.69].forEach(function(p,i){var e=Math.min(f,[.26,.65,1][i]);if(e>p){c.beginPath();c.moveTo(x+w*p,y+(i%2));c.lineTo(x+w*e,y+.7);c.stroke();}});c.restore();}
I.line=line;I.wash=wash;
function qReward(q){var r=q.def.reward||{};return (r.card?'卡 ':'')+(r.lingshi?'灵石 '+r.lingshi:'')+(q.failed?' · 未成':'');}
function rec(a,id,x,y,w,h){X.ui.hud.push({id:id,x:XY.kToLog(a,x),y:XY.kToLog(a,y),w:XY.kToLog(a,w),h:XY.kToLog(a,h)});}
I.left=function(c,G,a,ctx){var K=P.begin(c,a),small=K.W<900,w=small?(K.port?124:132):214,x=8,y=24,sz=small?10:13,lh=small?14:20,t=G.heroes[0],progress=X.clamp(G.tang.s/G.rt.total,0,1),danger=G.breach||G.tdanger,col=danger?'#a52c1d':T.ink;
wash(c,x-3,y-8,w+6,small?170:286);K.t('金 '+Math.floor(G.coins),x+4,y+3,small?14:20,'#946213','left',true);var incenseCost=160+(G._incense||0)*80;K.t('香火 '+incenseCost,x+4,y+(small?20:28),small?13:16,G.coins>=incenseCost?'#a42d19':'#8a7a68','left',true);K.hit(x,y+(small?10:16),Math.min(w-8,110),24,'incense');K.t('杀 '+G.kills,x+w-3,y+3,sz,T.inkSoft,'right',true);K.t('经书营 '+Math.ceil(G.camp.hp)+'/'+G.camp.maxHp,x+4,y+19,sz,T.inkSoft,'left',false);line(c,x+4,y+26,w-8,G.camp.hp/G.camp.maxHp,'#64543d');rec(a,'gold',x,y-8,w,35);
y+=small?33:46;K.t('唐僧',x+4,y,sz,col,'left',true);K.t(Math.ceil(t.hp)+'/'+t.maxHp,x+w-3,y,sz,col,'right',true);line(c,x+4,y+9,w-8,t.hp/t.maxHp,col);rec(a,'tang',x,y-6,w,18);if(t.inv>0)K.t('护身 '+t.inv.toFixed(0)+'秒',x+w-3,y-12,9,'#a52c1d','right',true);
y+=small?25:35;var rest=G.tang.phase==='rest'?'歇脚 '+X.fmtTime(Math.max(0,G.tang.restMax-G.tang.restT)):Math.round(progress*100)+'%';K.t('取经路',x+4,y,sz,T.ink,'left',true);K.t(rest,x+w-3,y,sz,T.inkSoft,'right',true);line(c,x+4,y+9,w-8,progress,'#725b36');rec(a,'path',x,y-9,w,22);
var q=G.quests;if(q){var qs=[q.main].concat(q.sides||[]).filter(Boolean),sides=(q.sides||[]).filter(function(v){return v.done;}).length;var yy=y+22;K.tf('主线 '+(q.main.done?'成':'行')+' · 支线 '+sides+'/'+(q.sides||[]).length,x+4,yy,w-8,sz,T.inkSoft,'left',true,9);if(small){qs.push({def:{short:G.gate.sealed?'关口 · 封印':'西行关口',reward:{}},prog:G.gate.sealed?'先完成主线':'距 '+Math.round(X.dist(t.x,t.y,G.gate.x,G.gate.y))+' · 护送唐僧'});var k=(P.folio.hudQuest||0)%qs.length,qq=qs[k];K.btn(x,yy+4,36,36,'‹','folio',{key:'hudQuest',i:(k+qs.length-1)%qs.length},{size:17});K.t((k+1)+' / '+qs.length,x+w/2,yy+23,10,T.inkSoft,'center',false);K.btn(x+w-36,yy+4,36,36,'›','folio',{key:'hudQuest',i:(k+1)%qs.length},{size:17});K.tf((qq.done?'✓ ':qq.failed?'✗ ':'')+qq.def.short,x+4,yy+47,w-8,11,qq.done?'#37643d':T.ink,'left',true,9.5);K.tf(qq.prog||'',x+4,yy+62,w-8,10,T.inkSoft,'left',false,9);K.tf(qReward(qq),x+4,yy+77,w-8,9.5,'#946213','left',false,9);rec(a,'quest',x,yy-8,w,92);y=yy+87;}else{qs.forEach(function(qq,i){var qy=yy+21+i*37;K.tf((qq.done?'✓ ':qq.failed?'✗ ':'')+qq.def.short,x+4,qy,w-8,13,qq.done?'#37643d':T.ink,'left',true,11);K.tf(qq.prog||''+' · '+qReward(qq),x+4,qy+16,w-8,11,T.inkSoft,'left',false,10);});rec(a,'quest',x,yy-8,w,qs.length*37+28);y=yy+qs.length*37+32;}}
P.end(c);return XY.kToLog(a,y);};
I.soldiers=function(c,G,a,box,land){var K=P.begin(c,a),s=K.s||1,x=box.x/s,y=box.y/s,w=box.w/s,h=box.h/s,ids=['arrow','cannon','frost','siege','heal'],keys=['Z','X','C','V','B'];wash(c,x-3,y-4,w+6,h+5);K.t('天兵',x+3,y+9,12,T.ink,'left',true);K.tf(G.towers.length+'/'+X.soldierCap(G)+' · 空地布阵',x+w-2,y+9,w-39,9.5,T.inkSoft,'right',false,9);ids.forEach(function(id,i){var d=X.TOWERS[id],owned=X.save.solOwned(id),on=a.build===id,cx,cy,bw,bh=44;if(land){bh=54;var pos=[[0,19],[66,15],[0,75],[66,70],[32,130]][i];cx=x+pos[0];cy=y+pos[1];bw=56;}else{bw=w/5-2;cx=x+i*w/5;cy=y+24+[4,0,9,1,6][i];bh=Math.max(44,h-28);}if(on){c.save();c.fillStyle='rgba(160,42,23,.13)';c.beginPath();c.ellipse(cx+bw/2,cy+20,bw*.45,27,-.07,0,Math.PI*2);c.fill();c.restore();}c.save();if(!owned)c.globalAlpha=.36;if(!(X.ICONINK&&X.ICONINK.sol(c,id,cx+bw/2,cy+18,32,1)))P.object(c,d.name,cx+bw/2,cy+18,32,!owned);c.restore();K.tf(d.name,cx+bw/2,cy+34,bw,9.5,owned?T.ink:T.inkSoft,'center',true,9);K.tf(owned?keys[i]+' '+X.soldierCost(G,id):'未有卡',cx+bw/2,cy+46,bw,9,T.inkSoft,'center',false,8.5);K.hit(cx,cy,bw,Math.max(54,bh),'tower',{type:id});if(K.over(cx,cy,bw,Math.max(54,bh)))a._tip={x:XY.kToLog(a,(cx+bw/2)),y:XY.kToLog(a,cy-6),text:d.name+'（卡 Lv'+X.save.solLevel(id)+' · '+X.save.solCards(id)+' 张）：'+d.desc};});rec(a,'tower',x,y,w,h);P.end(c);};
I.fabao=function(c,G,a,y0,all,combos,ready){if(!G.fb)return;var K=P.begin(c,a),sm=K.W<900,w=sm?134:232,x=K.W-w-8,y=y0*a.zoom/(K.s||1),tab=P.folio.hudFabao||0,names=['宝物','门派','炼化'],rh=sm?15:24,items=all(G),cmb=combos(G),rdy=ready(G),list=tab===0?items:tab===1?cmb:rdy,spot=X.R4.summonSpot(G,a),maxH=(spot.cy-spot.r-5)*a.zoom/(K.s||1)-y-4,per=tab===0?7:2,key='hudFabaoPage'+tab,page=P.folio[key]||0,start=page*per;if(sm&&tab===0){rh=Math.min(15,Math.floor((maxH-54)/Math.max(1,Math.min(7,items.length))));if(rh<12){rh=14;per=Math.max(1,Math.floor((maxH-90)/rh));}start=page*per;}if(start>=list.length)start=0;var n=Math.min(per,list.length-start),ph=54+Math.max(1,n)*(tab===0?rh:sm?29:45)+(list.length>per?36:0);wash(c,x,y,w,ph);names.forEach(function(s,i){K.btn(x+i*w/3,y,w/3,36,s,'folio',{key:'hudFabao',i:i},{on:i===tab,size:sm?11:14,minS:10});});K.tf('宝 '+G.fb.w.length+'/'+X.C.FB.SLOT_F+' · 灵 '+G.fb.s.length+'/'+X.C.FB.SLOT_L,x+6,y+43,w-12,sm?9:11,T.inkSoft,'left',false,9);var yy=y+58;if(!list.length)K.t(tab===0?'尚无宝物':tab===1?'尚无门派加成':'暂无可炼配方',x+7,yy,sm?10:13,T.inkSoft,'left',false);list.slice(start,start+per).forEach(function(o,i){var iy=yy+i*(tab===0?rh:sm?29:45);if(tab===0){var info=X.fabao.info(o.id),name=info.name;P.object(c,name,x+(sm?12:18),iy,sm?17:26,false);K.tf(name,x+(sm?26:39),iy,w-(sm?55:83),sm?10:13,T.ink,'left',true,sm?9:11);K.t(info.sup?'绝':o.lv+'级',x+w-7,iy,sm?10:13,info.sup?'#a52c1d':T.inkSoft,'right',true);}else if(tab===1){K.tf(X.fabao.SET_NAME[o.set]+' · '+o.n+' 件',x+7,iy,w-14,sm?10:13,T.ink,'left',true,9);K.tf(o.tier?(o.tier>=2?'大加成':'小加成'):'再得 '+(2-o.n)+' 件触发',x+7,iy+(sm?13:20),w-14,sm?9:11,o.tier?'#a52c1d':T.inkSoft,'left',false,9);}else{K.tf(o.name,x+7,iy,w-14,sm?10:13,'#a52c1d','left',true,9);K.tf(o.src||o.need||'待抉择时炼化',x+7,iy+(sm?13:20),w-14,sm?9:11,T.inkSoft,'left',false,9);}});if(list.length>per){var by=y+ph-36;K.btn(x,by,36,36,'‹','folio',{key:key,i:(page+Math.ceil(list.length/per)-1)%Math.ceil(list.length/per)});K.t((page+1)+'/'+Math.ceil(list.length/per),x+w/2,by+18,10,T.inkSoft,'center',false);K.btn(x+w-36,by,36,36,'›','folio',{key:key,i:(page+1)%Math.ceil(list.length/per)});}X.ui.cardPanel={x:XY.kToLog(a,x),y:XY.kToLog(a,y),w:XY.kToLog(a,w),h:XY.kToLog(a,ph)};var fa=G.fb.fuseAnim;if(fa){var aa=K.W/2,bb=K.H*.31,fr=X.fabao.recipe(fa.rid);wash(c,aa-165,bb-40,330,80);P.object(c,fr.name,aa-113,bb,60,false);K.t('炼成 · '+fr.name,aa-70,bb,23,'#a52c1d','left',true);}P.end(c);};
I.skillLeaf=function(c,G,a,h,S0,tab,sub,b){var K=P.K,ids=S0.nodes||[],leafKey='skillLeaf'+tab+'-'+sub,sel=(P.folio[leafKey]||0)%ids.length,n=ids[sel],hi=tab===9?-1:S0.hi,st=X.nodeStatus(G,hi,n.id),lv=st.lv,max=n.max,can=st.st==='ok',port=K.port,small=K.W<900,ax=b.x,artW=port?90:Math.min(210,b.w*.29),dx=b.x+artW+16,dw=b.w-artW-16,y=b.y+18,ay=b.y+Math.min(port?115:150,b.h*.38),radius=artW*.38;
if(tab===9){K.t('合',ax+artW*.45,ay,Math.min(92,artW),'#a42d19','center',true);K.tf('全队协同',ax+artW*.5,ay+radius+19,artW,12,T.inkSoft,'center',true,10);}else{X.hud2.face(c,h,ax+artW*.5,ay,radius,a.rt);K.tf(h.def.name,ax+artW*.5,ay+radius+23,artW,port?15:19,T.ink,'center',true,12);}
var ab=/[ab]$/.test(n.id)&&n.tier>=3?(/a$/.test(n.id)?'A路 · ':'B路 · '):'';K.lines(ab+n.name,dx,y,dw,port?22:28,port?26:32,T.ink,2,true);K.t('等级 '+lv+' / '+max+' · '+X.nodeType(n).name,dx,y+36,port?16:18,'#a42d19','left',true);
var effect=lv?X.nodeText(n,lv):n.desc?n.desc[0]:n.eff?n.eff(1):'',sz=small?16:18,lh=small?22:26,textKey='skillText'+tab+'-'+sub+'-'+n.id,allLines=[],text='',units=String(effect).match(/[+-]?\d[\d,]*(?:\.\d+)?(?:%|\/\d+|秒|级|点|倍)?|[A-Za-z][A-Za-z0-9_.-]*|[\s\S]/g)||[];c.font=sz+'px '+X.C.FONT;units.forEach(function(ch){if(c.measureText(text+ch).width>dw&&text){allLines.push(text);text=ch;}else text+=ch;});if(text)allLines.push(text);var per=port?8:small?4:6,pages=Math.max(1,Math.ceil(allLines.length/per)),tp=(P.folio[textKey]||0)%pages,shown=allLines.slice(tp*per,tp*per+per);shown.forEach(function(t,i){K.t(t,dx,y+64+i*lh,sz,T.ink,'left',false);});var sy=y+64+shown.length*lh;if(pages>1)K.btn(dx+dw-92,y+8,92,40,'说明 '+(tp+1)+'/'+pages,'folio',{key:textKey,i:(tp+1)%pages},{size:13,minS:12});var reason=st.st==='max'?'已圆满 · 等级 '+lv+'/'+max:can?'费用 '+st.cost+' 点 · 等级 '+lv+'/'+max:st.reason||(st.st==='nopts'?'还差 '+(st.cost-G.points)+' 点 · 要 '+st.cost+' 点':''),by=Math.min(b.y+b.h-48,Math.max(b.y+(port?250:small?120:175),sy+16)),bw=Math.min(168,dw*.48);
K.lines(reason,dx,by+18,dw-bw-12,port?15:16,20,can?'#795714':T.inkSoft,3,true);K.btn(dx+dw-bw,by,bw,48,lv>=max?'已圆满':'点墨修习','node',{hero:hi,id:n.id},{primary:can,size:16});
var ny=b.y+b.h+1,step=b.w/Math.max(1,ids.length);ids.forEach(function(nd,i){var letter=/[ab]$/.test(nd.id)&&nd.tier>=3?(/a$/.test(nd.id)?'A':'B'):'';K.btn(b.x+i*step,ny,step-2,44,(nd.tier||i+1)+letter,'folio',{key:leafKey,i:i},{on:i===sel,size:12,minS:10});});a.__inkSkillSpec={key:leafKey,n:ids.length,hi:hi,id:n.id,tab:tab,sub:sub,textKey:textKey,textPages:pages};};
I.tutorialCard=function(c,G,a,tt,st,L){var K=P.begin(c,a),z=a.zoom,s=K.s||1,x=L.x*z/s,y=L.y*z/s,w=L.w*z/s,h=L.h*z/s,wait=!!st.wait,VU=X.villainUI;c.save();c.fillStyle='#f6edd8';c.beginPath();c.moveTo(x+3,y+1);c.lineTo(x+w-4,y);c.lineTo(x+w-1,y+h-3);c.lineTo(x+2,y+h);c.closePath();c.fill();c.restore();if(VU&&VU.drawSeal)VU.drawSeal(c,x+6,y+6,32,32,'引',{sz:14,stack:false,rot:-0.05});c.save();c.font='18px "Ma Shan Zheng","KaiTi",serif';c.fillStyle='#3a2416';c.textAlign='left';c.textBaseline='middle';var title=String(st.title||'');if(c.measureText(title).width>w-52)c.font=Math.max(13,Math.floor(18*(w-52)/c.measureText(title).width))+'px "Ma Shan Zheng","KaiTi",serif';c.fillText(title,x+42,y+22);c.restore();L.lines.forEach(function(v,i){K.t(v,x+12,y+46+i*16,12,T.ink,'left',false);});K.hit(x,y,w,h,'ui');if(VU&&VU.drawBrush)VU.drawBrush(c,x+8,y+h-48,w*0.38,44,'跳过',{sz:13,vh:26});else K.btn(x+8,y+h-48,w*0.38,44,'跳过教程','tutSkip',null,{size:13});K.hit(x+8,y+h-48,w*0.38,44,'tutSkip');if(VU&&VU.drawSeal)VU.drawSeal(c,x+w*0.46,y+h-48,w*0.5,44,st.last?'开始':wait?'继续':'下一步',{style:wait?'line':'solid',sz:14,stack:false});else K.btn(x+w*0.46,y+h-48,w*0.5,44,'下一步','tutNext',null,{primary:!wait,size:14});K.hit(x+w*0.46,y+h-48,w*0.5,44,'tutNext');P.end(c);};

// Short-landscape hover is a quiet summary. Full descriptions are opened by an
// explicit, touchable command and own a paused reader; hovering never navigates.
I.shortTip=function(c,a,cache,G,L){
  a.shortHudLastDescription={game:G,parts:cache.parts.slice()};
  var z=a.zoom||1,W=Math.round(a.lw*z),H=Math.round(a.lh*z),b=L.troop,blocks=[{x:0,y:0,w:W,h:44},{x:b.first-b.w/2-8,y:b.y-22,w:b.step*4+b.w+16,h:b.h+30},{x:L.sky.cx-L.sky.r-4,y:L.sky.cy-L.sky.r-4,w:2*L.sky.r+8,h:2*L.sky.r+8}],soft=[];
  function add(q){if(q)blocks.push(q);}function world(q){return{x:(q.x-G.cam.x+G.view.w/2)*z,y:(q.y-G.cam.y+G.view.h/2)*z,w:q.w*z,h:q.h*z};}
  add(X.compactHud.hudTabsLayout(a,G));add(L.party);add(a.shortHudDrawer&&a.shortHudDrawer.rect);add(a.shortHudNotice&&a.shortHudNotice.rect);add(a.shortHudWarning&&a.shortHudWarning.rect);
  (X.ui.hud||[]).forEach(function(q){if(q.id==='combo'||q.id==='toast')add({x:q.x*z,y:q.y*z,w:q.w*z,h:q.h*z});});
  G.heroes.forEach(function(h,i){if(h.down||h.ridden)return;var target=i===G.ctrl?blocks:soft;if(h._drawBox)target.push(world(h._drawBox));if(h.id!=='tang')target.push(world({x:h.x-24,y:h.y+h.def.r+3,w:48,h:12}));});
  function over(q,r){return q.x<r.x+r.w&&r.x<q.x+q.w&&q.y<r.y+r.h&&r.y<q.y+q.h;}
  var src=cache.source||{x:cache.tip.x*z,y:cache.tip.y*z,w:0,h:0},choices=[],width=180,height=44,xs=[8,W-width-8,src.x,src.x+src.w-width,src.x-width-8,src.x+src.w+8],ys=[52,100,148,H-height-8,src.y+src.h+8];
  blocks.forEach(function(q){xs.push(q.x-width-8,q.x+q.w+8);ys.push(q.y-height-8,q.y+q.h+8);});
  xs.forEach(function(x){ys.forEach(function(y){var q={x:x,y:y,w:width,h:height};if(x<8||y<52||x+width>W-8||y+height>H-8||blocks.some(function(r){return over(q,r);}))return;choices.push({box:q,soft:soft.filter(function(r){return over(q,r);}).length,distance:Math.abs(x+width/2-src.x-src.w/2)+Math.abs(y-src.y-src.h)});});});
  choices.sort(function(a,b){return a.soft-b.soft||a.distance-b.distance||a.box.y-b.box.y||a.box.x-b.box.x;});
  if(!choices.length){a.readableTipLayout={compact:true,hiddenForSpace:true,fullTextAccessible:'战况 → 说明',source:cache.source||null};return;}
  var q=choices[0].box,rows=I.partyTextRows(c,cache.parts[0]||'战场说明',q.w-16,[],'14px '+X.C.FONT),title=rows[0]||'战场说明';
  if(rows.length>1){while(title&&c.measureText(title+'…').width>q.w-16)title=title.slice(0,-1);title+='…';}
  c.save();c.scale(1/z,1/z);c.fillStyle='#fbf4e4';c.fillRect(q.x,q.y,q.w,q.h);c.strokeStyle='#bba77f';c.lineWidth=1;c.strokeRect(q.x+.5,q.y+.5,q.w-1,q.h-1);c.font='14px '+X.C.FONT;c.textAlign='left';c.textBaseline='middle';c.fillStyle='#2f2618';c.fillText(title,q.x+8,q.y+12);c.fillStyle='#756f5e';c.fillText('完整说明：战况 → 说明',q.x+8,q.y+32);c.restore();
  cache.box=q;cache.lastAt=a.rt||0;a.readableTipLayout={compact:true,fontCSS:14,box:q,shown:[title,'完整说明：战况 → 说明'],fullTextAccessible:'战况 → 说明',source:cache.source||null};
};
I.clearInfo=function(a){a.shortHudInfo=null;a.shortHudInfoLayout=null;};
I.infoOwns=function(G,a){return !!(G&&a&&a.shortHudInfo&&a.shortHudInfo.game===G&&a.screen==='pause'&&G.mode===a.shortHudInfo.mode&&!G.cut&&!(G.dkRun&&(G.dkRun.introLeft>0||G.dkRun.formLeft>0)));};
I.openInfo=function(G,a){
  if(!G||!a||I.infoOwns(G,a)||!['play','pause'].includes(a.screen)||G.mode!=='play'||a.partyPanel||a.confirm||G.cut||G.tut||G.dkHold||G.dkRun&&(G.dkRun.introLeft>0||G.dkRun.formLeft>0))return false;
  var src=(a.shortHudDescriptionGame===G&&a.shortHudDescriptions||[]).slice(),recent=a.shortHudLastDescription,seen={},parts=[];
  if(recent&&recent.game===G&&!src.some(function(lines){return lines[0]===recent.parts[0];}))src.push(recent.parts);
  src.forEach(function(lines){var key=lines.join('\n');if(seen[key])return;seen[key]=true;parts.push(lines.map(function(text){return text==='点击展开地图与消息 · 战斗继续'?'返回战场后，点“战况”查看地图与消息。':text==='点击查看任务、营地与路程'?'返回战场后，点“目标”查看任务、营地与路程。':text;}));});
  if(!parts.length)parts=[['战场说明','在顶栏查看目标、修行与战况。']];
  a.shortHudInfo={game:G,screen:a.screen,mode:G.mode,page:0,parts:parts};a.screen='pause';I.clearTip(a);return true;
};
I.closeInfo=function(G,a){if(!I.infoOwns(G,a))return false;var s=a.shortHudInfo;I.clearInfo(a);a.screen=s.screen;return true;};
I.infoAction=function(G,a,h){if(!I.infoOwns(G,a))return false;if(h&&h.act==='hudInfoClose')I.closeInfo(G,a);else if(h&&h.act==='hudInfoPage'){var s=a.shortHudInfo;s.page=Math.max(0,Math.min((s.pages||1)-1,s.page+h.delta));}return true;};
I.infoKey=function(G,a,e){if(!I.infoOwns(G,a)||e.code==='KeyM')return false;e.preventDefault();e.stopImmediatePropagation();if(!e.repeat){if(e.code==='Escape'||e.code==='KeyP')I.closeInfo(G,a);else if(e.code==='ArrowLeft'||e.code==='PageUp')I.infoAction(G,a,{act:'hudInfoPage',delta:-1});else if(e.code==='ArrowRight'||e.code==='PageDown')I.infoAction(G,a,{act:'hudInfoPage',delta:1});}return true;};
I.drawInfo=function(c,G,a){
  if(!I.infoOwns(G,a))return false;var s=a.shortHudInfo,z=a.zoom||1,dpr=a.dpr||1,W=Math.round(a.lw*z),H=Math.round(a.lh*z),pad=16,lineH=24,top=72,per=Math.max(1,Math.floor((H-top-76)/lineH)),rows=[];
  s.parts.forEach(function(lines,i){if(i)rows.push('');lines.forEach(function(text){rows=rows.concat(I.partyTextRows(c,text,W-pad*2,[],'16px '+X.C.FONT));});});s.pages=Math.max(1,Math.ceil(rows.length/per));s.page=Math.max(0,Math.min(s.pages-1,s.page));var shown=rows.slice(s.page*per,(s.page+1)*per);
  X.ui.hits.length=0;X.ui.hud.length=0;c.save();c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#f6efdf';c.fillRect(0,0,W,H);c.fillStyle='#a73525';c.font=(W<400?'18px ':'20px ')+X.C.FONT;c.textAlign='left';c.textBaseline='middle';if(W<400){c.fillText('战场说明',pad,20);c.font='14px '+X.C.FONT;c.fillText('已暂停',pad,42);}else c.fillText('战场说明 · 已暂停',pad,30);
  function button(x,y,w,h,text,act,extra){c.fillStyle=act==='hudInfoClose'?'#a73525':'#e9dfcb';c.fillRect(x,y,w,h);c.fillStyle=act==='hudInfoClose'?'#fff6e8':'#382b1d';c.font='16px '+X.C.FONT;c.textAlign='center';c.fillText(text,x+w/2,y+h/2);var hit={x:x/z,y:y/z,w:w/z,h:h/z,act:act};if(extra)Object.keys(extra).forEach(function(k){hit[k]=extra[k];});X.ui.hits.push(hit);}
  button(W-132,8,116,44,s.screen==='pause'?'返回暂停':'返回战场','hudInfoClose');c.font='16px '+X.C.FONT;c.fillStyle='#2f2618';c.textAlign='left';shown.forEach(function(text,i){c.fillText(text,pad,top+12+i*lineH);});
  var fy=H-60;button(pad,fy,92,44,'上一页',s.page?'hudInfoPage':'hudInfoNoop',{delta:-1});button(W-pad-92,fy,92,44,'下一页',s.page+1<s.pages?'hudInfoPage':'hudInfoNoop',{delta:1});c.font='16px '+X.C.FONT;c.fillStyle='#756f5e';c.textAlign='center';c.fillText((s.page+1)+' / '+s.pages,W/2,fy+22);c.restore();
  a.shortHudInfoLayout={fontCSS:16,lineCSS:24,page:s.page,pages:s.pages,shown:shown,paused:true,returnScreen:s.screen};return true;
};

// CSS-pixel tooltip: opaque, token-safe, and paged without gameplay commands.
I.clearTip=function(a){
  a._tip=null;a.readableTip=null;a.readableTipLayout=null;
  // Remove only this tooltip's paper/page hits; retain every modal/world target.
  for(var i=X.ui.hits.length-1;i>=0;i--)if(X.ui.hits[i]._readableTip)X.ui.hits.splice(i,1);
};
I.tip=function(c,a,tip){
  var z=a.zoom||1,W=a.lw*z,H=a.lh*z,cache=a.readableTip,mouse=a.mouse&&{x:a.mouse.x*z,y:a.mouse.y*z};
  // Real HUD triggers leave a 6–10px gap before their tip. Retain across that
  // pointer-only bridge; hit rectangles remain the visible paper/buttons.
  function inside(b){return mouse&&b&&mouse.x>=b.x-12&&mouse.y>=b.y-12&&mouse.x<=b.x+b.w+12&&mouse.y<=b.y+b.h+12;}
  if(cache&&(cache.game!==X.G||cache.screen!==a.screen||(a.rt||0)-cache.lastAt>.5)){cache=null;a.readableTip=null;}
  // A hover source is a real current hit, not the tooltip paper or a blank UI backdrop.
  // The anchor must also belong to that hit; world-object tips keep point anchoring.
  function sourceOf(t){
    if(!mouse||!t)return null;var ax=t.x*z,ay=t.y*z,hits=X.ui.hits;
    for(var i=hits.length-1;i>=0;i--){var h=hits[i];if(h._readableTip||!h.act||(h.act==='ui'&&!h.label)||h.test)continue;
      var b={x:h.x*z,y:h.y*z,w:h.w*z,h:h.h*z};
      if(![b.x,b.y,b.w,b.h,ax,ay].every(Number.isFinite)||b.w<=0||b.h<=0)continue;
      if(mouse.x<b.x||mouse.x>b.x+b.w||mouse.y<b.y||mouse.y>b.y+b.h)continue;
      if(ax<b.x-12||ax>b.x+b.w+12||ay<b.y-12||ay>b.y+b.h+12)continue;
      b.act=h.act;b.key=JSON.stringify([h.act,h.i,h.type,h.id,h.hero,h.kind,h.label,b.x,b.y,b.w,b.h]);return b;
    }return null;
  }
  // A changed layout/removed source cannot retain an old paper rectangle over new controls.
  if(cache&&cache.source&&!X.ui.hits.some(function(h){
    return !h._readableTip&&JSON.stringify([h.act,h.i,h.type,h.id,h.hero,h.kind,h.label,h.x*z,h.y*z,h.w*z,h.h*z])===cache.source.key;
  })){cache=null;a.readableTip=null;}
  var source=sourceOf(tip),overPaper=cache&&mouse&&cache.box&&mouse.x>=cache.box.x&&mouse.x<=cache.box.x+cache.box.w&&mouse.y>=cache.box.y&&mouse.y<=cache.box.y+cache.box.h;
  // Keep the pointer bridge/page reader; a distinct source outside the paper is a new hover.
  if(cache&&inside(cache.box)&&(overPaper||!source||(cache.source&&cache.source.key===source.key)))tip=null;
  if(tip){var parts=(tip.lines||[tip.text]).map(function(v){return String(v==null?'':v);}),key=parts.join('\n'),sourceKey=source&&source.key;
    if(!cache||cache.key!==key||(cache.source&&cache.source.key)!==sourceKey)cache=a.readableTip={key:key,parts:parts,page:0,tip:tip,source:source,game:X.G,screen:a.screen,lastAt:a.rt||0};
    else{cache.tip=tip;cache.source=source;}}
  else if(!cache||!inside(cache.box)){I.clearTip(a);return;}
  var game=X.G,compact=game&&X.compactHud&&X.compactHud.on(game,a)&&X.compactHud.layout(a,game);
  if(compact&&compact.shortTop&&!compact.deployShort){I.shortTip(c,a,cache,game,compact);return;}
  var width=Math.min(480,W-24),rows=[],maxH=Math.min(424,H-24),lineH=24;
  cache.parts.forEach(function(v){rows=rows.concat(I.partyTextRows(c,v,width-32,cache.tip&&cache.tip.keepWords));});if(!rows.length)rows=[''];
  var per=Math.max(1,Math.floor((maxH-24)/lineH)),pages=Math.ceil(rows.length/per);
  if(pages>1){per=Math.max(1,Math.floor((maxH-80)/lineH));pages=Math.ceil(rows.length/per);}
  cache.page=Math.max(0,Math.min(pages-1,cache.page||0));var shown=rows.slice(cache.page*per,(cache.page+1)*per),height=pages>1?maxH:24+shown.length*lineH,anchor=cache.tip,x=Math.max(12,Math.min(W-width-12,anchor.x*z-width/2)),y=Math.max(12,Math.min(H-height-12,anchor.below?anchor.y*z:anchor.y*z-height));
  var placement='point';
  if(cache.source){
    var src=cache.source,gap=8,fullW=Math.min(480,W-24),areas=[
      {side:'above',x:12,y:12,w:W-24,h:src.y-gap-12},
      {side:'below',x:12,y:src.y+src.h+gap,w:W-24,h:H-12-src.y-src.h-gap},
      {side:'left',x:12,y:12,w:src.x-gap-12,h:H-24},
      {side:'right',x:src.x+src.w+gap,y:12,w:W-12-src.x-src.w-gap,h:H-24}
    ],preferred=anchor.below?'below':'above',choices=[];
    areas.forEach(function(area){
      var ww=Math.min(fullW,area.w),hh=Math.min(424,area.h),rr=[];
      if(ww<Math.min(128,fullW)||hh<48)return;
      cache.parts.forEach(function(v){rr=rr.concat(I.partyTextRows(c,v,ww-32,cache.tip&&cache.tip.keepWords));});if(!rr.length)rr=[''];
      var pp=Math.max(1,Math.floor((hh-24)/lineH)),nn=Math.ceil(rr.length/pp);
      if(nn>1){pp=Math.floor((hh-80)/lineH);if(pp<1)return;nn=Math.ceil(rr.length/pp);}
      var ah=nn>1?80+pp*lineH:24+rr.length*lineH;
      var xx=area.side==='left'?src.x-gap-ww:area.side==='right'?area.x:Math.max(12,Math.min(W-ww-12,anchor.x*z-ww/2));
      var yy=area.side==='above'?src.y-gap-ah:area.side==='below'?area.y:Math.max(12,Math.min(H-ah-12,src.y+src.h/2-ah/2));
      choices.push({side:area.side,x:xx,y:yy,w:ww,h:ah,rows:rr,per:pp,pages:nn,preferred:area.side===preferred});
    });
    choices.sort(function(a,b){return a.pages-b.pages||Number(b.preferred)-Number(a.preferred)||b.w-a.w||b.per-a.per;});
    // Only impossible tiny/source-filled viewports have no readable non-overlapping area.
    if(!choices.length){I.clearTip(a);return;}
    var chosen=choices[0];placement=chosen.side;x=chosen.x;y=chosen.y;width=chosen.w;height=chosen.h;rows=chosen.rows;per=chosen.per;pages=chosen.pages;
    cache.page=Math.max(0,Math.min(pages-1,cache.page||0));shown=rows.slice(cache.page*per,(cache.page+1)*per);
  }else if(!tip&&cache.box){
    // Point-anchored world tips retain the original reader position and bridge.
    x=cache.box.x;y=Math.max(12,Math.min(H-height-12,cache.box.y));
  }
  cache.box={x:x,y:y,w:width,h:height};cache.lastAt=a.rt||0;
  c.save();c.scale(1/z,1/z);c.fillStyle='#fbf4e4';c.fillRect(x,y,width,height);c.strokeStyle='#bba77f';c.lineWidth=1;c.strokeRect(x+.5,y+.5,width-1,height-1);
  X.ui.hits.push({x:x/z,y:y/z,w:width/z,h:height/z,act:'ui',_readableTip:true});
  shown.forEach(function(row,i){c.font='16px '+X.C.FONT;c.fillStyle='#2f2618';c.textAlign='left';c.textBaseline='middle';c.fillText(row,x+16,y+24+i*lineH);});
  if(pages>1){var by=y+height-52;
    [-1,1].forEach(function(delta){var bx=delta<0?x+12:x+width-56,off=delta<0?cache.page===0:cache.page===pages-1;c.fillStyle=off?'#e7e0d2':'#efe2c8';c.fillRect(bx,by,44,44);c.strokeStyle=off?'#a79d89':'#483521';c.lineWidth=2;c.beginPath();c.moveTo(bx+22-delta*4,by+15);c.lineTo(bx+22+delta*4,by+22);c.lineTo(bx+22-delta*4,by+29);c.stroke();if(!off)X.ui.hits.push({x:bx/z,y:by/z,w:44/z,h:44/z,act:'tipPage',delta:delta,_readableTip:true});});
    c.font='16px '+X.C.FONT;c.fillStyle='#483521';c.textAlign='center';c.fillText((cache.page+1)+' / '+pages,x+width/2,by+22);
  }
  a.readableTipLayout={fontCSS:16,lineCSS:24,opaque:true,page:cache.page,pages:pages,per:per,rows:rows,shown:shown,box:cache.box,source:cache.source||null,placement:placement};c.restore();
};


/* BEGIN PARTY_NARROW_CANDIDATE_1 */
/* Independent narrow-party reader. Existing tooltips retain their original path. */
I.partyTextRows=function(c,text,width,keepWords,font){
  c.font=font||'16px '+X.C.FONT;
  var out=[];
  String(text==null?'':text).split('\n').forEach(function(par){
    var names=(keepWords||[]).filter(function(v){return v&&c.measureText(v).width<=width;}).sort(function(a,b){return b.length-a.length;});
    var base=/[×+−-]?\d[\d,]*(?:\.\d+)?(?:\/\d[\d,]*(?:\.\d+)?)?(?:%|秒|级|点|倍|颗|金|s)?|[A-Za-z][A-Za-z0-9_.@-]*|不改变|不影响|不会|[\s\S]/y,raw=[],pos=0;
    while(pos<par.length){var word=names.filter(function(v){return par.slice(pos,pos+v.length)===v;})[0];if(word){raw.push(word);pos+=word.length;}else{base.lastIndex=pos;var m=base.exec(par);raw.push(m[0]);pos=base.lastIndex;}}
    var units=[],wrapped=[[]];
    raw.forEach(function(u){if(/^[，。；：、！？）》】,.!?;:)]$/.test(u)&&units.length)units[units.length-1]+=u;else units.push(u);});
    units.forEach(function(u){var row=wrapped[wrapped.length-1];if(row.length&&c.measureText(row.join('')+u).width>width){row=[];wrapped.push(row);}row.push(u);});
    // Avoid a final fragment such as “益。” or punctuation alone. Keep tokens
    // intact and retain every source character when balancing the last two rows.
    if(wrapped.length>1){var tail=wrapped[wrapped.length-1],prev=wrapped[wrapped.length-2],minTail=Math.min(width*.24,c.measureText('四个文字').width);
      while(prev.length>1&&c.measureText(tail.join('')).width<minTail){var last=prev[prev.length-1];if(c.measureText(last+tail.join('')).width>width||c.measureText(prev.slice(0,-1).join('')).width<width*.45)break;tail.unshift(prev.pop());}
    }
    wrapped.forEach(function(row){out.push(row.join(''));});
  });
  return out;
};
I.partyPageBlocks=function(c,spec,width,per){
  var plans=[[]],source=[],blocks=spec.blocks||(spec.lines||[]).map(function(v){return{text:v};});
  function page(){return plans[plans.length-1];}
  function next(){if(page().length)plans.push([]);}
  function put(text,kind,block,original){page().push({text:text,kind:kind,block:block,source:original});if(original)source.push(text);}
  blocks.forEach(function(b,bi){
    var title=b.title?I.partyTextRows(c,b.title,width,spec.keepWords):[],body=I.partyTextRows(c,b.text,width,spec.keepWords),total=title.length+body.length;
    // Keep short blocks together, and at least two effect lines on each side
    // of a page break when the viewport has enough room for them.
    var minBody=Math.min(2,body.length,Math.max(1,per-title.length));
    var need=total<=per?total:title.length+minBody;
    if(page().length&&per-page().length<need)next();
    title.forEach(function(t){put(t,'title',bi,true);});
    var pos=0;
    while(pos<body.length){
      if(page().length>=per){next();if(title.length){var label=b.continued||b.title+'（续）';I.partyTextRows(c,label,width,spec.keepWords).forEach(function(v){put(v,'continuation',bi,false);});}}
      var room=Math.max(1,per-page().length),take=Math.min(room,body.length-pos);
      if(body.length-pos-take===1&&take>1)take--;
      for(var j=0;j<take;j++)put(body[pos++],'body',bi,true);
      if(pos<body.length){next();if(title.length)I.partyTextRows(c,b.continued||b.title+'（续）',width,spec.keepWords).forEach(function(v){put(v,'continuation',bi,false);});}
    }
  });
  return{pages:plans,rows:source};
};
I.partyDetail=function(c,G,a,spec,U){
  if(U.layout.desktop)return I.desktopPartyDetail(c,G,a,spec,U);
  var L=U.layout,st=U.state,x=12,y=8,w=L.W-24,h=L.H-16,bodyY=80,bottom=L.H-60;
  // This is an opaque reading layer; underlying party controls do not own hits.
  X.ui.hits.length=0;U.reset();U.hit(0,0,L.W,L.H,{act:'ui'},'detail-blocker');
  U.paper(0,0,L.W,L.H);U.paper(x,y,w,h,true);
  U.text(spec.title,x+12,30,20,'left',true);
  U.button(L.W-100,8,88,44,'返回',{act:'partyInfoBack'});
  U.text(spec.subtitle||'当前效果',x+12,64,16,'left',false);
  var actions=spec.actions||[],actionY=bottom-52;
  if(actions.length)bottom=actionY-8;
  var per=Math.max(2,Math.floor((bottom-bodyY)/24)),menu=spec.menu||null;
  if(menu)per=Math.max(1,Math.floor((bottom-bodyY)/52));
  var plan=menu?null:I.partyPageBlocks(c,spec,w-24,per),rows=plan?plan.rows:[],pages=menu?Math.max(1,Math.ceil(menu.length/per)):plan.pages.length,page=Math.max(0,Math.min(pages-1,st.infoPage||0)),shown=menu?menu.slice(page*per,page*per+per).map(function(v){return v.label;}):plan.pages[page].map(function(v){return v.text;});
  if(menu){menu.slice(page*per,page*per+per).forEach(function(item,i){U.button(x+12,bodyY+i*52,w-24,44,item.label,item.hit,{align:'left',off:item.off});});}
  else shown.forEach(function(row,i){U.text(row,x+12,bodyY+12+i*24,16,'left',false);});
  actions.forEach(function(action,i){var aw=(w-24-8*(actions.length-1))/actions.length;U.button(x+12+i*(aw+8),actionY,aw,44,action.label,action.hit,{primary:true,off:action.off});});
  if(pages>1){
    U.button(x+12,L.H-52,44,44,'‹',{act:'partyInfoPage',delta:-1},{off:page===0});
    U.text((page+1)+' / '+pages,L.W/2,L.H-30,16,'center',false);
    U.button(L.W-x-56,L.H-52,44,44,'›',{act:'partyInfoPage',delta:1},{off:page===pages-1});
  }
  a.partyNarrowReading={kind:st.info,page:page,pages:pages,per:per,rows:rows,shown:shown,shownSource:menu?shown:plan.pages[page].filter(function(v){return v.source;}).map(function(v){return v.text;}),pagePlan:plan&&plan.pages,body:{x:x+12,y:bodyY,w:w-24,bottom:bottom},fontCSS:16,lineCSS:24,opaque:true};
};
/* END PARTY_NARROW_CANDIDATE_1 */
I.desktopPartyDetail=function(c,G,a,spec,U){
  var L=U.layout,st=U.state,w=Math.min(840,L.W-48),x=(L.W-w)/2,maxH=Math.min(600,L.H-48),actions=spec.actions||[],actionH=actions.length?60:0,menu=spec.menu||null,lineH=menu?52:24;
  var per=Math.max(2,Math.floor((maxH-112-actionH-64)/lineH)),plan=menu?null:I.partyPageBlocks(c,spec,w-40,per),rows=plan?plan.rows:[],pages=menu?Math.max(1,Math.ceil(menu.length/per)):plan.pages.length,page=Math.max(0,Math.min(pages-1,st.infoPage||0)),shown=menu?menu.slice(page*per,(page+1)*per).map(function(v){return v.label;}):plan.pages[page].map(function(v){return v.text;});
  var h=Math.min(maxH,Math.max(240,112+shown.length*lineH+actionH+(pages>1?64:16))),y=(L.H-h)/2,bodyY=y+96,bodyBottom=y+h-actionH-(pages>1?64:16);
  X.ui.hits.length=0;U.reset();U.hit(0,0,L.W,L.H,{act:'ui'},'desktop-detail-blocker');
  c.fillStyle='rgba(34,28,20,.56)';c.fillRect(0,0,L.W,L.H);U.paper(x,y,w,h,true);
  U.text(spec.title,x+20,y+30,22,'left',true);U.button(x+w-108,y+12,88,44,'返回',{act:'partyInfoBack'});
  U.text(spec.subtitle||'当前效果',x+20,y+68,16,'left',false);
  if(menu)menu.slice(page*per,(page+1)*per).forEach(function(item,i){U.button(x+20,bodyY+i*52,w-40,44,item.label,item.hit,{align:'left',off:item.off});});
  else shown.forEach(function(row,i){U.text(row,x+20,bodyY+12+i*24,16,'left',false);});
  if(actions.length){var ay=y+h-(pages>1?64:16)-44;actions.forEach(function(item,i){var aw=(w-40-8*(actions.length-1))/actions.length;U.button(x+20+i*(aw+8),ay,aw,44,item.label,item.hit,{primary:true,off:item.off});});}
  if(pages>1){U.button(x+20,y+h-52,44,44,'‹',{act:'partyInfoPage',delta:-1},{off:page===0});U.text((page+1)+' / '+pages,x+w/2,y+h-30,16,'center');U.button(x+w-64,y+h-52,44,44,'›',{act:'partyInfoPage',delta:1},{off:page===pages-1});}
  a.partyNarrowReading={kind:st.info,page:page,pages:pages,per:per,rows:rows,shown:shown,shownSource:menu?shown:plan.pages[page].filter(function(v){return v.source;}).map(function(v){return v.text;}),pagePlan:plan&&plan.pages,body:{x:x+20,y:bodyY,w:w-40,bottom:bodyBottom},fontCSS:16,lineCSS:24,opaque:true,desktop:true,panel:{x:x,y:y,w:w,h:h}};
};

/* 货郎：同一张商品卡同时显示物品、效果、价格和购买状态。 */
I.vendor=function(c,G,a){
  X.ui.hits.length=0;
  var K=P.begin(c,a),W=K.W,H=K.H,V=X.vendor,items=V.stock(G),n=items.length;
  var port=W<600,cols=port?1:2,per=port&&H<420?1:(port?H<650:H<500)?2:4,rows=Math.ceil(Math.min(n,per)/cols),gap=port?8:12;
  var pw=Math.min(port?430:920,W-24),header=port?112:104,footer=56;
  var cardH=port?Math.min(136,Math.floor((H-32-header-footer-gap*(rows-1))/Math.max(1,rows))):Math.min(168,Math.floor((H-40-header-footer-gap*(rows-1))/Math.max(1,rows)));
  var ph=header+rows*cardH+gap*Math.max(0,rows-1)+footer,x=(W-pw)/2,y=(H-ph)/2;
  var inset=port?12:18,cw=(pw-inset*2-gap*(cols-1))/cols,sel=Math.max(0,Math.min(n-1,P.folio.vendorItem||0)),page=Math.floor(sel/per),pages=Math.max(1,Math.ceil(n/per));
  c.save();c.fillStyle='rgba(36,29,21,.38)';c.fillRect(0,0,W,H);c.restore();
  if(X.villainUI&&X.villainUI.artCard)X.villainUI.artCard(c,x,y,pw,ph,{seed:41,paper:'#faf2e0'});else K.panel(x,y,pw,ph,12,'#faf2e0');
  K.t('货郎商店',x+inset,y+40,port?24:28,T.ink,'left',true);
  K.btn(x+pw-inset-80,y+22,80,44,'关闭','vendorClose',null,{size:16});
  K.t('金币 '+Math.floor(G.coins),port?x+inset:x+pw-inset-100,port?y+73:y+44,16,'#8a5a19',port?'left':'right',true);
  K.tf('用本局金币补给，购买后立即生效',x+inset,y+(port?96:71),pw-inset*2,port?13:15,T.inkSoft,'left',false,12);
  V.layout={panel:{x:x,y:y,w:pw,h:ph},cols:cols,page:page,pages:pages,total:n,heading:'货郎商店',coins:Math.floor(G.coins),cards:[],viewport:{w:W,h:H,scale:K.s||1}};
  items.slice(page*per,(page+1)*per).forEach(function(it,j){
    var i=page*per+j,bx=x+inset+(j%cols)*(cw+gap),by=y+header+Math.floor(j/cols)*(cardH+gap),d=V.DEFS[it.id],effect=V.description(G,it.id),why=V.why(G,it),ok=!why,chosen=i===sel;
    c.save();R.rrect(c,bx,by,cw,cardH,8);c.fillStyle=it.sold?'#eee7d7':'#fffaf0';c.fill();c.strokeStyle=chosen?'#9a3b29':'rgba(95,74,43,.32)';c.lineWidth=chosen?1.8:1;c.stroke();c.restore();
    K.hit(bx,by,cw,cardH,'folio',{key:'vendorItem',i:i});
    var icon=port?36:48,iconX=bx+12+icon/2,top=by+9,buttonW=port?88:108,buttonX=bx+cw-buttonW-10;
    P.object(c,d.name,iconX,top+22,icon,it.sold);
    K.tf(d.name,bx+icon+22,top+22,buttonX-bx-icon-28,port?16:20,it.sold?T.inkSoft:T.ink,'left',true,14);
    K.btn(buttonX,by+8,buttonW,44,it.sold?'已购买':X.C.VENDOR.price[it.id]+'金 · 购买','vendorBuy',{i:i},{primary:ok,size:14,off:it.sold,minS:12});
    var tx=bx+12,tw=cw-24,ty=by+(port||cardH<150?62:72),sz=port||cardH<150?14:16,lh=port||cardH<150?18:22,lines=[],v='';
    c.font=sz+'px '+X.C.FONT;String(effect).split('').forEach(function(ch){if(v&&c.measureText(v+ch).width>tw){lines.push(v);v=ch;}else v+=ch;});if(v)lines.push(v);
    lines.forEach(function(t,j){K.t(t,tx,ty+j*lh,sz,T.ink,'left',false);});
    var status=it.sold?'本休息点已购买':why||'可以购买 · 每件限购一次',statusY=by+cardH-14;
    K.tf(status,tx,statusY,tw,12,why&&!it.sold?'#8d4731':it.sold?T.inkSoft:'#4a6240','left',false,11);
    V.layout.cards.push({id:it.id,index:i,name:d.name,effect:effect,lines:lines,fontSize:sz,lineHeight:lh,textY:ty,statusY:statusY,status:status,sold:it.sold,buyable:ok,price:X.C.VENDOR.price[it.id],box:{x:bx,y:by,w:cw,h:cardH},button:{x:buttonX,y:by+8,w:buttonW,h:44},icon:{name:d.name,x:iconX,y:top+22,size:icon}});
  });
  var msg=G.vendorMsg&&G.vendorMsg.t>0?G.vendorMsg:null;
  if(pages>1){K.btn(x+inset,y+ph-49,44,44,'‹','folio',{key:'vendorItem',i:((page+pages-1)%pages)*per},{size:22});K.btn(x+pw-inset-44,y+ph-49,44,44,'›','folio',{key:'vendorItem',i:((page+1)%pages)*per},{size:22});}
  K.tf(msg?msg.text:pages>1?'商品 '+(page*per+1)+'–'+Math.min(n,(page+1)*per)+' / '+n:'休息点补给 · 关闭后继续战斗',x+pw/2,y+ph-28,pw-inset*2-(pages>1?110:0),port?12:14,msg?(msg.bad?'#9a3b29':'#37643d'):T.inkSoft,'center',false,11);
  if(msg)msg.t-=1/60;
  P.end(c);
};
I.skillKey=function(G,a,k){var s=a.__inkSkillSpec;if(!s||s.tab!==a.skillTab||s.sub!==((a._pvSub||{})[a.skillTab]||0))return false;if(k==='ArrowLeft'||k==='ArrowRight'){P.folio[s.key]=((P.folio[s.key]||0)+s.n+(k==='ArrowRight'?1:-1))%s.n;return true;}if(k==='PageDown'||k==='PageUp'){P.folio[s.textKey]=((P.folio[s.textKey]||0)+s.textPages+(k==='PageDown'?1:-1))%s.textPages;return true;}if(k==='Enter'){if(G.tut)return true;var r=X.learn(G,s.hi,s.id);a.skillMsg={text:r.reason,bad:!r.ok,until:a.rt+2.2};return true;}return false;};
I.vendorKey=function(G,a,k){
  var n=X.vendor.stock(G).length;if(!n)return false;
  var cols=X.vendor.layout?X.vendor.layout.cols:1,move=k==='ArrowLeft'?-1:k==='ArrowRight'?1:k==='ArrowUp'?-cols:k==='ArrowDown'?cols:0;
  if(move){P.folio.vendorItem=((P.folio.vendorItem||0)+n+move)%n;return true;}
  if(k==='Enter'){X.vendor.buy(G,(P.folio.vendorItem||0)%n);return true;}return false;
};
})();
