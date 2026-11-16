/* 暂驻与战报手卷；只绘制已有数据，所有操作仍走原命令。 */
(function(){'use strict';var XY=window.XY,P=XY.pv2,T=XY.R.T;
P.note=function(c,x,y,w,h){c.save();var g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#eee1c3');g.addColorStop(1,'#fbf3df');c.fillStyle=g;c.fillRect(x,y,w,h);if(XY.INKP)XY.INKP.stroke(c,x+15,y+5,x+w*.44,y+7,2,'64,49,30',.4,73,.01);c.restore();};
function begin(c,a){XY.ui.hits.length=0;var k=P.begin(c,a);P.paper(c,k.W,k.H);return k;}
function figure(c,G,x,foot,h){var who=G.heroes[G.ctrl]||G.heroes[1],id=(who.def&&who.def.id)||who.id,five={wukong:1,tang:1,bajie:1,wujing:1,horse:1};if(five[id]){figure.cache=figure.cache||{};var im=figure.cache[id];if(!im){im=figure.cache[id]=new Image();im.src='assets/art/menu-v5/fig_'+id+'.webp';}if(im.complete&&im.naturalWidth){var ww=h*im.naturalWidth/im.naturalHeight;c.drawImage(im,x-ww/2,foot-h,ww,h);return;}}if(XY.HEROES.some(function(d){return d.id===id;}))XY.heroink.portrait(c,id,x,foot,h);else if(XY.xAvIcon&&XY.xAvIcon.isSpecial(id))XY.xAvIcon.draw(c,id,x-h*.4,foot-h*.85,h*.8,h*.8);else XY.hud2.face(c,who,x,foot-h*.5,Math.min(h*.4,100),0);}
function inkCutout(c,G,x,foot,h){var who=G.heroes&&(G.heroes[G.ctrl]||G.heroes[0]),id=who&&who.id,ok={tang:1,wukong:1,bajie:1,wujing:1,horse:1,phyrex:1,sisi:1,laosiji:1,kuanggong:1,haiteng:1,yuanzhang:1,heyuxi:1,diaoyulao:1,martin:1};if(!ok[id])id='tang';inkCutout.bag=inkCutout.bag||{};var im=inkCutout.bag[id];if(!im){im=inkCutout.bag[id]=new Image();im.src='assets/art/battle-hd/'+id+'.webp';}c.save();c.fillStyle='rgba(42,32,22,0.16)';c.beginPath();c.ellipse(x,foot-6,h*0.34,h*0.045,0,0,Math.PI*2);c.fill();if(im.complete&&im.naturalWidth){var w=h*im.naturalWidth/im.naturalHeight;c.drawImage(im,x-w/2,foot-h*0.97,w,h);}c.restore();}
P.inkCutout=inkCutout;
XY.ov.pause=function(c,G,a){var K=begin(c,a),W=K.W,H=K.H,port=K.port;
K.t('暂驻',22,36,36,'#a42d19','left',true);
figure(c,G,port?W*.34:W*.24,H-6,Math.min(port?H*.42:H-40,H-30));
var x=port?10:Math.round(W*.52),w=port?W-20:W-x-14,gap=8,top=port?Math.round(H*.48):52,bot=H-28;
var n=3+(XY.auto?1:0),room=bot-top-gap*(n-1),bh=Math.max(36,Math.min(56,Math.floor(room/n)));
function bar(xx,yy,ww,hh,label,act,ex,hot){c.save();c.translate(xx+ww/2,yy+hh/2);c.rotate(hot?-0.012:0.008);c.fillStyle=hot?'#a83224':'#3a2a1c';c.beginPath();c.moveTo(-ww/2+3,-hh*.4);c.lineTo(ww/2,-hh*.44);c.lineTo(ww/2-4,hh*.4);c.lineTo(-ww/2,hh*.36);c.closePath();c.fill();c.fillStyle=hot?'#fff6e4':'#f6efe2';c.font=Math.max(14,Math.min(26,hh*.36))+'px "Ma Shan Zheng","KaiTi",serif';c.textAlign='center';c.textBaseline='middle';c.fillText(label,0,1);c.restore();K.hit(xx,yy,ww,hh,act,ex);}
var yy=top;bar(x,yy,w,bh,'继续','resume',null,true);yy+=bh+gap;var hw=(w-gap)/2;
bar(x,yy,hw,bh,'重来','restart',null,false);bar(x+hw+gap,yy,hw,bh,'回首页','home',null,false);yy+=bh+gap;
var muted=!!(XY.audio&&XY.audio.mute);bar(x,yy,hw,bh,muted?'声关':'声开','muteSet',{mute:false},!muted);bar(x+hw+gap,yy,hw,bh,muted?'已静':'声静','muteSet',{mute:true},muted);
if(XY.auto){yy+=bh+gap;['points','treat','guest','pick'].forEach(function(key,i){var ww=(w-3*gap)/4,on=!!XY.auto.get(key);bar(x+i*(ww+gap),yy,ww,bh,XY.auto.LABEL[key],'autoTog',{key:key},on);});}
K.lines('已坚持 '+XY.fmtTime(G.t)+'  ·  Lv '+G.level+'  ·  击杀 '+XY.fmtNum(G.kills),24,port?78:78,port?W*.5:W*.42,15,20,'#3a3226',2,true);
K.tf(XY.lvPre(G)+G.lv.name+'」',24,108,port?W*.5:W*.4,14,'#5c4a38','left',false,11);
if(XY.inkBg)XY.inkBg();P.end(c);};
var oldEnd=XY.R4.end;
XY.R4.end=function(c,G,a,win){if(G.villain||G.lair)return oldEnd(c,G,a,win);var K=begin(c,a),W=K.W,H=K.H,port=K.port,rep=G.runReport||{},cause=G.ending&&G.ending.cause,title=win?'过 关':cause==='tang'?'师父阵亡':'基地被入侵',x=port?20:28,w=port?W-40:Math.round(W*0.5),top=port?390:30,leaf=P.folio.endLeaf||0;
K.t(title,22,47,port?37:44,win?'#a8680a':'#a42d19','left',true);K.tf(XY.lvPre(G)+G.lv.name+'」'+(win?' · 关口「'+G.gate.name+'」':''),24,85,port?W-48:W*.38,13,T.inkSoft,'left',false,11);
var si=XY.sweep09&&XY.sweep09.resultStars(G,win);if(si)K.tf(si.show?si.text+(si.isNew?' · 新纪录':''):si.faint||'',24,119,port?W-48:W*.38,20,'#a8680a','left',true,12);
inkCutout(c,G,port?W*.72:W*.78,port?H-80:H-36,Math.min(port?H*0.42:H-70,560));
['战报','任务','收获','足迹'].forEach(function(s,i){K.btn(x+i*w/4,top,w/4-4,44,s,'folio',{key:'endLeaf',i:i},{on:leaf===i,size:16});});var y=top+65,casualties=XY.runCasualties(G);
function para(s,col){y=K.lines(s,x+5,y,w-10,13,18,col||T.ink,16,false)+12;}
if(leaf===0){K.t(XY.fmtTime(G.t),x+4,y+9,32,T.ink,'left',true);y+=47;para('等级 '+G.level+' 级 · 击杀 '+G.kills+' 只 · 镇灭洞府 '+G.dens.filter(function(d){return !d.alive;}).length+'/'+G.dens.length);para('本局倒地：'+casualties.count+' 次');para('当前倒地：'+casualties.current);para('本局战绩','#8a5a12');[G.quests.main].concat(G.quests.sides||[]).forEach(function(q,i){var rw=q.def.reward||{},r=q.done?[(rw.lingshi?'灵石 +'+rw.lingshi:''),(rw.card?'法宝':''),(rw.shard?'碎片 +'+rw.shard:'')].filter(Boolean).join(' · '):'未完成';para((i?'支线':'主线')+' · '+q.def.short+'　'+(q.done?'已完成'+(r?' · '+r:''):'还没完成'),q.done?'#2f663a':T.ink);});para('奖励 · 灵石 +'+XY.fmtNum((G.run&&G.run.clearGain)||0)+' · 法宝 '+((G.cardLog||[]).length)+' 张','#8a5a12');if(!win&&G.ending&&(G.ending.why||G.ending.reason))para('死因：'+(G.ending.why||G.ending.reason),'#a42d19');if(si&&si.tip)para(si.tip,'#8a5a12');var rest=H-96-y;if(!port){[{t:'一星',s:'通关本关'},{t:'二星',s:'至少完成 1 条支线'},{t:'三星',s:'无人阵亡'}].forEach(function(row,i){var yy=y+22+i*34;K.t(row.t,x+6,yy,22,'#8a5a12','left',true);K.t(row.s,x+78,yy,18,'#24180f','left',true);});}}
else if(leaf===1){[G.quests.main].concat(G.quests.sides).forEach(function(q,i){var rw=q.def.reward||{},r=q.done?[(rw.card?'法宝':''),(rw.lingshi?'灵石 +'+rw.lingshi:''),(rw.shard?'碎片 +'+rw.shard:'')].filter(Boolean).join(' · '):'未完成';para((i?'支线':'主线')+' · '+q.def.short+'　'+(q.done?'已完成'+(r?' · '+r:''):'还没完成'),q.done?'#2f663a':T.inkSoft);});}
else if(leaf===2){para('法宝 '+(G.cardLog||[]).length+' 张 · 灵石 +'+XY.fmtNum((G.run&&G.run.clearGain)||0),'#8a5a12');var sp=G.spGot||[];if(sp.length){var per=(!port&&H<450)?2:4,from=P.pager(sp.length,per,'end-drops',x,H-174,w),rh=(!port&&H<450)?36:46;sp.slice(from,from+per).forEach(function(g,i){var d=XY.SP_BY[g.id],cy=y+i*rh+15;XY.hud2.face(c,{id:g.id,def:d},x+20,cy,15,a.rt);K.tf(d.name+' ×1',x+47,cy,w-52,14,T.ink,'left',true,11);});}}else{var nu=(rep.newUnlocks||[]).map(function(id){return XY.UNLOCK_BY[id].name;});para(nu.length?'新解锁：'+nu.join('、'):'本局没有新解锁');}
var jn=G.mod?'非官方玩法包：不发奖励，不记通关，不影响存档':G.dungeon?(win?'洞府副本不计入取经之旅（首通奖励已发）':'副本失败不扣任何东西'):win?(G.levelId<XY.LEVEL_COUNT?'全队成长已存档，第 '+(G.levelId+1)+' 关已解锁':'取经之旅：三关全部走完！成长已存档'):'之前积累保留，再来回到本关开始状态（'+XY.journey.status(G.levelId).text+'）';K.lines(jn,x,H-125,w,12,17,win?'#2f663a':T.inkSoft,3,false);
var hasNext=win&&!G.dungeon&&!G.mod&&G.levelId<XY.LEVEL_COUNT,A=hasNext?[['下一关','nextLevel',true],['再来 · R','restart'],['首页','home']]:!win?[['再来 · R','restart',true],['换角色','repick'],['首页','home']]:[['再来 · R','restart',true],['首页','home']];if(win&&G.bossOffer&&XY.bossfight&&XY.bossfight.launch)A.splice(hasNext?1:0,0,['Boss 战','bossGo']);var bw=(w-12)/A.length;A.forEach(function(b,i){K.btn(x+i*bw,H-65+[0,4,1,3][i],bw-5,44,b[0],b[1],null,{primary:!!b[2],size:14});});K.msg(x+w,H-9,'right',w);if(XY.version&&XY.version.showToggle&&XY.version.showToggle())K.btn(port?W-180:24,port?144:H-55,156,44,'切到标准版','toggleVer',null,{size:12});P.end(c);};
})();
/* DOM卷面：不同内容保留真实表单与滚动，但不再套设置App卡壳。 */
(function(){var st=document.createElement('style');st.id='folio3-dom';st.textContent=`
.inkDialog{position:relative!important;width:min(760px,100%)!important;max-height:calc(100dvh - 24px)!important;overflow:auto!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:linear-gradient(100deg,#eee2c7,#faf2df 22%,#f5ebd4)!important;color:#3a3023!important;padding:28px 32px!important;font-family:STKaiti,KaiTi,'Noto Serif CJK SC',serif!important}
.inkDialog button,#xcPanel button{border:0!important;outline:0!important;border-radius:0!important;background:transparent!important;color:#3a3023!important;box-shadow:none!important;min-height:44px!important;border-bottom:2px solid #9b8b71!important;transform:rotate(-1deg);font-family:inherit!important}
.inkDialog button:focus-visible,#xcPanel button:focus-visible{outline:2px solid #ad321c!important;outline-offset:2px!important}
.inkTip{padding-left:140px!important;min-height:230px}.inkTip:before{content:'引';position:absolute;left:30px;top:30px;font:bold 82px KaiTi,serif;color:#a4311e;writing-mode:vertical-rl;transform:rotate(-5deg)}
.inkTip>div:first-child{font-size:24px!important;color:#a4311e!important}.inkTip button{margin:18px 0 0!important;min-width:140px!important;background:#ad321c!important;color:#fff1d8!important;border:0!important}
.inkCode{padding-left:128px!important}.inkCode:before{content:'府';position:absolute;left:28px;top:28px;font:bold 74px KaiTi,serif;color:#a4311e;transform:rotate(-4deg)}
.inkCode textarea{min-height:130px!important;border:0!important;border-radius:0!important;border-bottom:2px solid #9b8b71!important;background:rgba(255,255,255,.16)!important;color:#473c2d!important;line-height:1.6}
.inkReferral{display:grid!important;grid-template-columns:1.05fr 1fr;gap:32px}.inkReferral #refMine{font-size:32px!important;margin:20px 0!important;overflow-wrap:anywhere}.inkReferral input{background:transparent!important;border-radius:0!important}.inkOrigin{padding-top:8px}.inkArrival{padding-top:26px}
#xcRoot{background:rgba(64,48,26,.25)!important}#xcPanel{width:min(94vw,880px)!important;max-height:94dvh!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:linear-gradient(100deg,#eee2c7,#fbf3e0 24%,#f4ead2)!important;padding:22px 28px!important;font-family:STKaiti,KaiTi,serif!important}
#xcPanel h2{font-size:27px!important;color:#a4311e!important}#xcPanel input[type=text]{border:0!important;border-radius:0!important;border-bottom:2px solid #9c8e75!important;background:transparent!important;padding-left:2px!important}#xcPanel button.pri{background:#ad321c!important;color:#fff0d4!important;border:0!important}
#xcPreview{border:0!important;border-radius:0!important;background:none!important;padding:16px 0!important;gap:28px!important}#xcPreview canvas{border-radius:0!important;background:transparent!important;box-shadow:none!important;width:240px!important;height:320px!important;margin:0!important;transform:rotate(-2deg)}#xcPreview .xcInfo{padding-top:14px;flex:1 1 240px!important}
.xcMine{border:0!important;border-radius:0!important;background:none!important;margin:10px 0!important;padding:12px 0!important;gap:18px!important}.xcMine:nth-child(even){padding-left:24px!important}.xcMine img.xcCard{width:72px!important;height:96px!important;border:0!important;border-radius:0!important;transform:rotate(-3deg)}
@media(max-width:520px){.inkDialog{padding:22px!important}.inkTip{padding-left:86px!important}.inkTip:before{font-size:54px;left:15px;top:29px}.inkCode{padding-top:88px!important}.inkCode:before{font-size:54px;left:22px;top:18px}.inkReferral{display:block!important}.inkArrival{padding-top:24px}.inkReferral #refMine{margin:12px 0!important}.xcMine{flex-wrap:wrap}.xcMine .xcTxt{flex-basis:180px!important}#xcPanel{padding:16px 18px!important}#xcPreview canvas{width:200px!important;height:267px!important;margin:auto!important}}
@media(max-height:430px){.inkDialog{padding-top:16px!important;padding-bottom:16px!important}.inkTip{min-height:200px}.inkReferral .inkArrival{padding-top:0}.inkReferral #refMine{margin:8px 0!important}#xcPanel{padding:12px 20px!important}#xcPreview canvas{width:165px!important;height:220px!important}}
`;document.head.appendChild(st);})();
(function(){'use strict';var XY=window.XY,P=XY.pv2,V=XY.villainUI,D=XY.VD,T=XY.R.T,roman=['未进化','I','II','III','IV','V'];
function evoParagraphs(id,s,leaf,onlyTier){
 var lv=s.evo[id]||0,t=D.TOWERS[id],un=D.unlocked(s,id),out=[];
 function add(text,col){out.push({text:text,col:col||T.ink});}
if(leaf===0){var aa=D.stat(id,1,lv),bb=D.stat(id,3,lv);if(id==='small'){if(!onlyTier||onlyTier===1)add('一阶营地：生命 '+Math.round(aa.hp)+'。'+V.campSpawnInfo(aa,1).summary);if(!onlyTier||onlyTier===3)add('三阶营地：生命 '+Math.round(bb.hp)+'。'+V.campSpawnInfo(bb,3).summary);}else{add('一阶塔：生命 '+Math.round(aa.hp)+(id==='bone'?' · 灼烧 '+Number(aa.dotDps.toFixed(3))+'/秒（5秒）':' · 伤害 '+Math.round(aa.dmg)+' · 射程 '+aa.rng));add('三阶塔：生命 '+Math.round(bb.hp)+(id==='bone'?' · 灼烧 '+Number(bb.dotDps.toFixed(3))+'/秒（5秒）':' · 伤害 '+Math.round(bb.dmg)));}add('每进化一阶生命 +'+Math.round(D.EVO_STAT*100)+'%');}
else if(leaf===1){if(!un)add('解锁需要妖金 '+t.unlock+' · 现有 '+s.wallet.yaojin);else if(lv===5)add('已进化到最高阶','#2f663a');else{var cost=D.evoCost(id,lv+1);add('下一阶 '+roman[lv+1]+'：'+D.EVO_NAMES[id][lv+1]);add(Object.keys(cost.mats).map(function(m){return D.MATS[m].name+' '+(s.mats[m]||0)+'/'+cost.mats[m];}).join(' · '));add('妖金 '+s.wallet.yaojin+'/'+cost.gold,'#8a5a12');}}
else if(leaf===2){var co=D.COS[id];add('III 阶：'+co.card+'，解锁西游线图鉴收藏');add('V 阶：'+co.frame+'，解锁西游线收藏外观');}
else{add(Object.keys(D.MATS).map(function(m){return D.MATS[m].name+' '+(s.mats[m]||0);}).join(' · '));}
 return out;
}
function compactEvo(c,G,a){
 var K=P.begin(c,a),W=K.W,H=K.H,s=D.ser(),id=V.sel,t=D.TOWERS[id],lv=s.evo[id]||0,un=D.unlocked(s,id),leaf=P.folio.evoLeaf||0;
 var pad=12,gap=12,leftW=Math.min(180,Math.max(96,Math.floor(W*.28))),rx=pad+leftW+gap,rw=W-rx-pad,actionY=H-56,bodyTop=116,bodySize=rw>=300?15:14,line=20;
 P.paper(c,W,H);K.btn(10,6,76,44,'‹ 返回','vHome');K.tf('小妖进化',100,28,W-202,22,T.ink,'left',true,18);
 K.t('妖金 '+s.wallet.yaojin,W-12,18,14,T.inkSoft,'right',false);K.t('妖丹 '+s.wallet.yaodan,W-12,39,14,T.inkSoft,'right',false);
 K.tf(D.EVO_NAMES[id][lv],pad,73,leftW,20,'#a42d19','left',true,16);K.t(un?roman[lv]+' 阶':'未解锁',pad,96,14,T.inkSoft,'left',false);
 var artY=108,artH=Math.max(80,Math.min(leftW*1.6,actionY-artY-10));V.drawImg(c,'evo/'+id+'_'+lv+'.webp',pad,artY,leftW,artH);
 var sel=D.TOWER_ORDER.indexOf(id),prev=D.TOWER_ORDER[Math.max(0,sel-1)],next=D.TOWER_ORDER[Math.min(D.TOWER_ORDER.length-1,sel+1)];
 K.btn(pad,actionY,44,44,'‹','vEvoSel',{id:prev},{off:sel===0,size:24});K.btn(pad+leftW-44,actionY,44,44,'›','vEvoSel',{id:next},{off:sel===D.TOWER_ORDER.length-1,size:24});
 var tw=(rw-12)/4;['修为','代价','联动','行囊'].forEach(function(text,i){K.btn(rx+i*(tw+4),56,tw,44,text,'folio',{key:'evoLeaf',i:i},{on:leaf===i,size:14,minS:14});});
 var paras=evoParagraphs(id,s,leaf,0),needTier=un&&lv<5&&!s.t3Seen[id],msg=V.msg&&a.rt<V.msg.until?V.msg:null;
 if(needTier)paras.push({text:'先在洞府里把它造到三阶（保存后才算）',col:'#a42d19'});
 if(msg)paras.unshift({text:msg.text,col:msg.bad?'#a42d19':'#2f663a'});
 var rows=[],blocks=[];c.font=bodySize+'px '+XY.C.FONT;paras.forEach(function(p){var block=XY.R.wrapLines(c,p.text,rw).map(function(text){return{text:text,col:p.col};});blocks.push(block);rows=rows.concat(block);});
 var room=actionY-8-bodyTop,allPer=Math.max(1,1+Math.floor((room-bodySize/2)/line)),paged=rows.length>allPer,per=paged?Math.max(1,1+Math.floor((actionY-50-bodyTop-bodySize/2)/line)):allPer;
 // Keep a paragraph on one reading page when it fits, including the complete three-tier prerequisite.
 if(paged){rows=[];blocks.forEach(function(block){var used=rows.length%per;if(used&&block.length<=per&&used+block.length>per)while(rows.length%per)rows.push({text:'',col:T.ink});rows=rows.concat(block);});}
 var key='evoRead-'+id+'-'+lv+'-'+leaf+(msg?'-'+msg.text:''),pagerY=actionY-48,from=paged?P.pager(rows.length,per,key,rx,pagerY,rw):0;
 rows.slice(from,from+per).forEach(function(row,i){K.t(row.text,rx,bodyTop+i*line,bodySize,row.col,'left',false);});
 if(!un)K.btn(rx,actionY,rw,44,'解锁 · '+t.unlock,'vUnlock',{id:id},{primary:s.wallet.yaojin>=t.unlock,size:16,minS:14});
 else if(lv<5)K.btn(rx,actionY,rw,44,needTier?'先造三阶并保存':'进化 · '+roman[lv+1],'vEvolve',{id:id},{primary:!needTier,size:16,minS:14});
 else K.t('已满阶',rx+rw/2,actionY+22,20,'#2f663a','center',true);
 // Existing drag/scroll selection receives logical coordinates, matching its CSS / zoom input conversion.
 var sc=K.s/K.z;V.evoF=sel;V.evoRect={x:pad*sc,y:artY*sc,w:leftW*sc,h:artH*sc,n:D.TOWER_ORDER.length,step:80*sc,note:{x:rx*sc,y:56*sc,w:rw*sc,h:(actionY+44-56)*sc},z:K.z};
 V.compactEvoLayout={width:W,height:H,bodySize:bodySize,line:line,paragraphs:paras,rows:rows,from:from,per:per,key:key,body:{x:rx,y:bodyTop,w:rw,h:room},pager:paged?{x:rx,y:pagerY,w:rw,h:44}:null,art:{x:pad,y:artY,w:leftW,h:artH},action:{x:rx,y:actionY,w:rw,h:44},selection:{index:sel,total:D.TOWER_ORDER.length}};
 P.end(c);
}
V.drawEvo=function(c,G,a){XY.ui.hits.length=0;if(a.lh*a.zoom/(XY.uiScale?XY.uiScale(a.lw*a.zoom,a.lh*a.zoom):1)<520){compactEvo(c,G,a);return;}var K=P.begin(c,a),W=K.W,H=K.H,port=K.port,s=D.ser(),id=V.sel,t=D.TOWERS[id],lv=s.evo[id]||0,un=D.unlocked(s,id),rx=port?20:W*.43,rw=port?W-40:W-rx-20,top=port?Math.max(220,Math.min(407,H-350)):70,artH=port?Math.max(64,Math.min(245,top-147)):H-217,bodySz=id==='bone'||id==='small'||(port&&H<760)?13.5:12.5,leaf=P.folio.evoLeaf||0,smallShort=id==='small'&&!port&&H<450;if(smallShort)top=54;P.paper(c,W,H);K.btn(10,8,82,44,'‹ 返回','vHome');K.t('小妖进化',108,34,26,T.ink,'left',true);K.tf('妖金 '+s.wallet.yaojin+' · 妖丹 '+s.wallet.yaodan,W-14,port?68:27,port?W-28:W-310,12.5,T.inkSoft,'right',false,11);
K.t(D.EVO_NAMES[id][lv],22,port?105:91,23,'#a42d19','left',true);V.drawImg(c,'evo/'+id+'_'+lv+'.webp',18,port?129:110,port?W*.46:W*.37,artH);K.tf(un?roman[lv]+' 阶':'未解锁',port?W*.55:24,port?181:123,port?W*.4:W*.32,14,un?T.inkSoft:'#a42d19','left',true,12);
['修为','代价','联动','行囊'].forEach(function(label,i){K.btn(rx+i*rw/4,top,rw/4-3,44,label,'folio',{key:'evoLeaf',i:i},{on:leaf===i,size:14});});var y=top+65;function para(z,col){if(id==='small'&&leaf===0)y+=V.wrap(c,XY.fmtStr(z),rx+4,y,rw-8,bodySz>=13?18:17,bodySz,col||T.ink,false,8,true);else y=K.lines(z,rx+4,y,rw-8,bodySz,bodySz>=13?18:17,col||T.ink,8,false);y+=smallShort?4:8;}
evoParagraphs(id,s,leaf,smallShort?(P.folio.campTier?3:1):0).forEach(function(p){para(p.text,p.col);});
var by=H-152;if(smallShort&&leaf===0)K.btn(rx,by,110,44,P.folio.campTier?'查看一阶':'查看三阶','folio',{key:'campTier',i:P.folio.campTier?0:1},{size:14});if(un&&lv<5&&!s.t3Seen[id]&&!(smallShort&&leaf===0))K.lines('先在洞府里把它造到三阶（保存后才算）',rx+4,by+7,rw-132,12,16,'#a42d19',3,false);
if(!un)K.btn(rx+rw-124,by,124,44,'解锁 · '+t.unlock,'vUnlock',{id:id},{primary:s.wallet.yaojin>=t.unlock,size:14});else if(lv<5){var needTier=smallShort&&leaf===0&&!s.t3Seen[id];K.btn(rx+rw-124,by,124,44,needTier?'先造三阶并保存':'进化 · '+roman[lv+1],'vEvolve',{id:id},needTier?{primary:false,size:12,minS:12}:{primary:!!s.t3Seen[id],size:15});}else K.t('已满阶',rx+rw-66,by+22,20,'#2f663a','center',true);
var rowY=H-91;D.TOWER_ORDER.forEach(function(type,i){var step=(W-24)/D.TOWER_ORDER.length,x=12+step*(i+.5),yy=rowY+[4,0,8,2,6,1,5,3][i];V.drawImg(c,'evo/'+type+'_'+(s.evo[type]||0)+'.webp',x-21,yy,42,46);K.tf(D.TOWERS[type].name,x,yy+60,step-4,10.5,type===id?'#a42d19':T.ink,'center',true,10);if(type===id)K.ink(x-14,yy+72,28,.65,i+5);K.hit(x-step/2+2,rowY,step-4,82,'vEvoSel',{id:type});});V.evoF=D.TOWER_ORDER.indexOf(id);V.evoRect={x:12,y:port?129:138,w:port?W*.46:W*.36,h:port?artH:H-240,n:D.TOWER_ORDER.length,step:80,note:{x:rx,y:top,w:rw,h:H-top},z:K.z};if(V.msg&&a.rt<V.msg.until)K.tf(V.msg.text,12,H-105,W-24,12,V.msg.bad?'#a42d19':'#2f663a','left',true,10.5);P.end(c);};
})();
(function(){'use strict';var XY=window.XY,P=XY.pv2,V=XY.villainUI,D=XY.VD,T=XY.R.T;
V.end=function(c,G,a,win){
  XY.ui.hits.length=0;
  var K=P.begin(c,a),W=K.W,H=K.H,r=(G.runReport&&G.runReport.rewards)||{},short=H<500&&!K.port,wide=W>=900&&!short;
  var pad=W<600?16:28,fw=Math.min(W-pad*2,1120),left=(W-fw)/2,top=wide?Math.max(24,(H-540)/2):12;
  var bottom=wide?Math.min(H-24,top+540):H-pad,by=bottom-48,gap=12,side=short?Math.min(220,fw*.32):wide?300:0;
  var x=wide?left+340:short?left+side+16:left,w=left+fw-x,leaf=P.folio.vEnd||0;
  var key='villain-end-mats',rep=G.runReport;
  if(V.end.report!==rep){V.end.report=rep;P.page[key]=0;}
  P.paper(c,W,H);
  var title=win?'洞府守住了':'守洞失败',titleW=wide?300:short?side:fw-104;
  K.tf(title,left,top+28,titleW,wide?36:short?24:27,win?'#2f663a':'#a42d19','left',true,short?22:25);
  if(win)K.t('★★★'.slice(0,r.stars||0)+'☆☆☆'.slice(0,3-(r.stars||0)),left,top+62,short?20:23,'#a8680a','left',true);
  else K.t('牛魔王 · 芭蕉洞',left,top+62,14,T.inkSoft,'left',false);
  if(wide||short)V.drawImg(c,'ui/niumo.webp',left,top+88,side,Math.max(80,by-top-100));
  else V.drawImg(c,'ui/niumo.webp',left+fw-94,top-4,94,86);

  function rule(yy){K.ink(x,yy,w,.32,73);}
  function summary(y,compact){
    K.t('本局妖金',x,y+10,16,'#8a5a12','left',true);
    var has=r.yaojin!==undefined,total=has?r.yaojin:0,first=win&&r.firstClear?D.STAGE.firstBonus:0,base=total-first;
    K.t(has?XY.fmtNum(total):'未结算',x,y+47,wide?52:36,'#8a5a12','left',true);
    var lines=[];
    if(!has)lines.push('本局未产生结算收益');
    else if(!win){lines.push('败局不发妖金');if(G.ending&&G.ending.reason)lines.push(G.ending.reason);}
    else{var vd=G.runReport&&G.runReport.diff,vdn=(r.diff&&r.diff.name)||(vd&&vd.name);lines.push('守洞收益 '+XY.fmtNum(base)+(vdn?' · 难度「'+vdn+'」'+(r.diff&&r.diff.mat!==1?' ×'+r.diff.mat:'')+(vd&&vd.opened?' · 已开放「'+vd.opened+'」档':''):''));if(r.daily)lines.push('守洞收益已含今日首通 '+D.STAGE.dailyK+' 倍');if(first)lines.push('总额已含首次通关奖励 '+XY.fmtNum(first));}
    var yy=y+(wide?100:80),body=wide?17:14,lineH=wide?24:20;
    lines.forEach(function(s,i){yy=K.lines(s,x,yy,w,body,lineH,i===0?T.ink:T.inkSoft,0,false);});
    var sy=compact?Math.max(yy+12,by-38):yy+14;
    rule(sy-13);
    K.t('用时 '+XY.fmtTime(r.sec!==undefined?r.sec:G.t),x,sy+5,wide?18:16,T.ink,'left',true);
    K.t('洞府余血 '+Math.round((r.cave||0)*100)+'%',x+w,sy+5,wide?18:16,T.ink,'right',true);
    return sy+42;
  }
  function harvest(y,cols,rowH){
    var mats=D.MAT_ORDER.filter(function(id){return(r.mats||{})[id]>0;}),trapCounts={},items=[];
    Object.keys(r.mats||{}).forEach(function(id){if(r.mats[id]>0&&mats.indexOf(id)<0)mats.push(id);});
    mats.forEach(function(id){var info=D.MATS[id];items.push({name:info?info.name:id,count:r.mats[id],material:info&&info.icon});});
    (r.traps||[]).forEach(function(id){trapCounts[id]=(trapCounts[id]||0)+1;});
    var traps=D.TRAP_ORDER.filter(function(id){return trapCounts[id]>0;});
    Object.keys(trapCounts).forEach(function(id){if(traps.indexOf(id)<0)traps.push(id);});
    traps.forEach(function(id){var info=D.TRAPS[id];items.push({name:info?info.name:id,count:trapCounts[id],trap:info&&info.icon});});
    K.t('本局收获',x,y+8,wide?20:16,T.ink,'left',true);
    var extras=[];if(r.yaodan)extras.push('妖丹 '+r.yaodan);if(r.traps&&r.traps.length)extras.push('陷阱 '+r.traps.length+' 件');
    if(extras.length)K.tf(extras.join(' · '),x+w,y+8,Math.max(110,w-88),14,'#6f4aa8','right',false,14);
    var gy=y+28,pagerY=by-52,room=pagerY-gy-6,rows=Math.max(1,Math.floor(room/rowH)),per=rows*cols;
    var needsPage=items.length>per;
    if(!needsPage){rows=Math.max(1,Math.floor((by-12-gy)/rowH));per=rows*cols;}
    var from=P.pager(items.length,per,key,x,pagerY,w),cw=(w-(cols-1)*8)/cols;
    if(!items.length)K.lines('本局没有素材或陷阱掉落',x,gy+20,w,16,22,T.inkSoft,0,false);
    items.slice(from,from+per).forEach(function(item,i){
      var xx=x+(i%cols)*(cw+8),yy=gy+Math.floor(i/cols)*rowH,art=wide?42:32;
      c.fillStyle='rgba(124,91,42,.065)';c.fillRect(xx,yy,cw,rowH-6);
      if(item.material)V.drawImg(c,'icons/'+item.material+'.png',xx+5,yy+5,art,rowH-16);
      if(item.trap){
        var cache=V.end.trapImages||(V.end.trapImages={}),im=cache[item.trap];
        if(!im){im=cache[item.trap]=new Image();im.src='assets/art/item-icons/'+item.trap+'.png';}
        if(im.complete&&im.naturalWidth){var scale=Math.min(art/im.naturalWidth,(rowH-16)/im.naturalHeight),iw=im.naturalWidth*scale,ih=im.naturalHeight*scale;c.drawImage(im,xx+5+(art-iw)/2,yy+5+(rowH-16-ih)/2,iw,ih);}
      }
      K.tf(item.name,xx+art+12,yy+15,cw-art-18,wide?18:14,T.ink,'left',true,14);
      K.tf('×'+XY.fmtNum(item.count),xx+art+12,yy+34,cw-art-18,wide?18:16,'#8a5a12','left',true,14);
    });
  }
  if(short){
    ['战况','收获'].forEach(function(label,i){K.btn(x+i*(w+8)/2,top,w/2-4,44,label,'folio',{key:'vEnd',i:i},{on:leaf===i,size:16});});
    if(!leaf)summary(top+52,true);else harvest(top+52,2,48);
  }else{var next=summary(wide?top+12:top+84,false);harvest(next,wide?3:W>=600?3:2,wide?54:48);}
  var bx=short?left:x,bw=short?fw:w,buttonW=(bw-gap)/2;
  K.btn(bx,by,buttonW,48,'再战一次','restart',null,{primary:true,size:18});
  K.btn(bx+buttonW+gap,by,buttonW,48,'反派首页','vHome2',null,{size:18});
  P.end(c);
};
V.drawTip=function(c,st){var W=st.cw,H=st.ch;P.paper(c,W,H);st.hit(0,0,W,H,'vNoop');V.txt(c,'引',W*.17,H*.48,Math.min(130,H*.4),'#a42d19','center',true);var x=W*.32,w=W-x-24;V.txt(c,'初入此境',x,H*.23,25,'#a42d19','left',true);V.wrap(c,V.tip.text,x,H*.37,w,25,17,T.ink,true,8);st.btn(x,H-78,Math.min(w,210),48,'知道了','vTipOk',{pri:true,sz:18});};
})();
/* 宝箱选择：物件散置一幅纸面，详情可读；原选取/封印/重抽命令不变。 */
(function(){'use strict';var XY=window.XY,P=XY.pv2,U=XY.fabaoui,T=XY.R.T,oldFit=U.withFit,oldScroll=U.scrolls,last=null,lastKey='';
U.withFit=function(c,a,n,fn){return XY.ui2.on?fn():oldFit(c,a,n,fn);};
U.scrolls=function(c,G,a,items,op){
  if(!XY.ui2.on)return oldScroll(c,G,a,items,op);
  XY.ui.hits.length=0;var K=P.begin(c,a),W=K.W,H=K.H,port=K.port,short=!port&&H<480,cwMax=Math.min(W-32,1240),left=(W-cwMax)/2;
  var offerKey=items.map(function(it){return it.id+'-'+it.level+'-'+it.tag;}).join('|');
  if(last!==G.cardOffer||lastKey!==offerKey){last=G.cardOffer;lastKey=offerKey;P.folio.offerInfo=-1;P.page.offer=0;}
  P.paper(c,W,H);K.t(op.title,left+4,30,28,'#a42d19','left',true);
  K.tf(op.sub,left+4,60,cwMax-8,14,T.inkSoft,'left',false,12);
  var info=P.folio.offerInfo;
  if(info>=0&&items[info]){
    var z=items[info],h=H-154;
    P.fbArticle(c,left+4,86,cwMax-8,h,{key:'offer-'+info+'-'+z.id+'-'+z.level,title:z.name,art:z.name,meta:z.tag+' · '+z.lv,parts:(z.change?['本次升级：'+z.change]:[]).concat(z.details||[z.eff],z.recipe?[z.recipe]:[])});
    var by=H-58,backW=72,sealW=z.canSeal?72:0,pickW=cwMax-backW-sealW-20;
    K.btn(left,by,pickW,44,'取此物 · '+(info+1),'offerPick',{k:info},{primary:true,size:16});
    K.btn(left+pickW+8,by,backW,44,'返回','folio',{key:'offerInfo',i:-1},{size:16});
    if(z.canSeal)K.btn(left+cwMax-sealW,by,sealW,44,'封印','offerSeal',{k:info},{off:!(op.sealN>0),size:16});
    XY.fbOfferLayout={mode:'detail',id:z.id,level:z.level,index:info,article:XY.fbArticleLayout};P.end(c);return;
  }
  function wrap(text,width){var out=[],v='';c.font='16px '+XY.C.FONT;(String(text||'').match(/[+-]?\d[\d,]*(?:\.\d+)?(?:%|秒|级|点|倍)?|[A-Za-z][A-Za-z0-9_.-]*|[\s\S]/g)||[]).forEach(function(ch){if(v&&c.measureText(v+ch).width>width){out.push(v);v=ch;}else v+=ch;});if(v)out.push(v);return out;}
  var per=short?1:port?2:3,gap=12,top=82,bottom=H-122,avail=bottom-top;
  function geometry(n){var cardW=port?cwMax:(cwMax-gap*(n-1))/n,cardH=port?(avail-gap*(n-1))/n:avail,textW=short?cardW-184:cardW-28;return{w:cardW,h:cardH,tw:textW};}
  while(per>1){var d=geometry(per),needed=Math.max.apply(null,items.map(function(it){return wrap(it.eff,d.tw).length*22+(port?122:210);}));if(needed<=d.h)break;per--;}
  var g=geometry(per),neededH=Math.max.apply(null,items.map(function(it){return wrap(it.eff,g.tw).length*22+(port?122:210);}));
  if(!short){g.h=Math.min(g.h,Math.max(port?230:320,neededH+12));top+=(avail-(port?g.h*per+gap*(per-1):g.h))/2;}
  var from=P.pager(items.length,per,'offer',left,H-110,cwMax),pageItems=items.slice(from,from+per);
  XY.fbOfferLayout={mode:'list',per:per,from:from,total:items.length,viewport:{w:W,h:H,scale:K.s||1},items:[]};
  pageItems.forEach(function(it,i){
    var idx=from+i,x=port?left:left+i*(g.w+gap),y=port?top+i*(g.h+gap):top,w=g.w,h=g.h;
    c.save();XY.R.rrect(c,x,y,w,h,7);c.fillStyle='#fff9ec';c.fill();c.strokeStyle='rgba(93,69,40,.42)';c.lineWidth=1;c.stroke();c.restore();
    K.hit(x,y,w,h,'offerPick',{k:idx});
    var art=short?(h<112?20:24):port?50:88,ax=short?x+26:port?x+40:x+w/2,ay=short?y+(h<112?17:22):port?y+35:y+58;
    P.object(c,it.name,ax,ay,art,false);
    var nameX=short?x+44:port?x+78:x+14,nameY=short?y+(h<112?16:22):port?y+23:y+120,nameW=short?114:port?w-92:w-28;
    K.tf((idx+1)+' · '+it.name,nameX,nameY,nameW,short?18:22,T.ink,'left',true,16);
    var metaX=short?x+14:nameX,metaY=short?y+(h<112?38:45):nameY+25,metaW=short?144:nameW,metaSize=short?14:16;
    var metaText=short&&it.tag==='炼'?'炼 · 消耗两件材料':it.tag+' · '+it.lv;
    K.tf(metaText,metaX,metaY,metaW,metaSize,it.lvCol||T.inkSoft,'left',false,14);
    var tx=short?x+170:x+14,ty=short?y+12:port?y+74:y+162,tw=short?w-184:w-28;
    var full=wrap(it.eff,tw),bodyBottom=short?y+h-8:y+h-54,rowsPer=Math.max(1,Math.floor((bodyBottom-ty)/22)),key='offer-body-'+idx+'-'+it.id+'-'+it.level;
    var pages=Math.max(1,Math.ceil(full.length/rowsPer));
    if(pages>1){bodyBottom-=44;rowsPer=Math.max(1,Math.floor((bodyBottom-ty)/22));pages=Math.ceil(full.length/rowsPer);}
    var pg=Math.max(0,Math.min(P.page[key]||0,pages-1));P.page[key]=pg;
    var shown=full.slice(pg*rowsPer,(pg+1)*rowsPer);shown.forEach(function(t,j){K.t(t,tx,ty+8+j*22,16,T.ink,'left',false);});
    var btnY=y+h-48,detailX=x+10,detailW=short?70:88;
    K.btn(detailX,btnY,detailW,44,'详情','folio',{key:'offerInfo',i:idx},{size:16});
    var sealX=short?x+88:x+w-82;
    if(it.canSeal){if(!(op.sealN>0))K.hit(sealX,btnY,72,44,'folio',{key:'offerInfo',i:-1});K.btn(sealX,btnY,72,44,'封印','offerSeal',{k:idx},{off:!(op.sealN>0),size:16});}
    if(pages>1){var py=short?y+h-48:y+h-98;K.hit(tx,py,tw,44,'pvPage',{key:key,d:0});K.btn(tx,py,64,44,'前文','pvPage',{key:key,d:-1},{size:14,off:pg===0});K.t((pg+1)+'/'+pages,tx+tw/2,py+22,14,T.inkSoft,'center');K.btn(tx+tw-64,py,64,44,'后文','pvPage',{key:key,d:1},{size:14,off:pg+1===pages});}
    XY.fbOfferLayout.items.push({id:it.id,level:it.level,index:idx,summary:it.eff,header:{short:short,art:{x:ax,y:ay,size:art},name:{x:nameX,y:nameY,w:nameW,size:short?18:22},meta:{x:metaX,y:metaY,w:metaW,size:metaSize,text:metaText},buttonsY:btnY},allRows:full,rows:shown,page:pg,pages:pages,key:key,fontSize:16,lineHeight:22,body:{x:tx,y:ty,w:tw,h:bodyBottom-ty},box:{x:x,y:y,w:w,h:h},pager:pages>1?{x:tx,y:py,w:tw,h:44}:null,seal:it.canSeal?{x:sealX,y:btnY,w:72,h:44,disabled:!(op.sealN>0)}:null});
  });
  var bw=(cwMax-12)/2;K.btn(left,H-58,bw,44,op.rrLabel,'offerReroll',null,{off:op.rrDis,primary:!op.rrDis,size:16});K.btn(left+bw+12,H-58,bw,44,op.skipLabel,'offerPick',{k:-1},{size:16});P.end(c);
};

})();
(function(){var P=window.XY.pv2;P.dialogKeys=function(el,close,focus){el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}if(e.key!=='Tab')return;var xs=[].slice.call(el.querySelectorAll('button,input,textarea,[tabindex]')).filter(function(x){return!x.disabled&&x.tabIndex>=0&&x.getClientRects().length;});if(!xs.length)return;var i=xs.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();xs[xs.length-1].focus();}else if(!e.shiftKey&&(i===xs.length-1||i<0)){e.preventDefault();xs[0].focus();}});if(focus)focus.focus({preventScroll:true});};})();
