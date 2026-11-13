/* 认可的紧凑水墨战斗边栏。CSS 几何只负责绘制，购买、放置、召唤、暂停仍走原命令。 */
(function () {
  'use strict';
  var X=window.XY, P=X.pv2, I=X.compactHud={}, PI=Math.PI, RED='#a73525', INK='#38382f', SOFT='#756f5e';
  var IDS=['arrow','cannon','frost','siege','heal'], NAMES=['弓兵','炮兵','寒冰','破阵','佛光'], stamps={};
  I.on=function(G,a){return !!(X.ui2&&X.ui2.on)&&!!G.fb&&!G.villain&&!G.lair;};
  I.layout=function(a){
    var s=XY.uiScale?XY.uiScale(a.lw*a.zoom,a.lh*a.zoom):1,W=a.lw*a.zoom/s,H=a.lh*a.zoom/s,port=W<H,small=W<900,head=port?64:small?30:39;
    var L={W:W,H:H,port:port,small:small,head:head,fs:small?11.5:15,
      map:{x:W-(small?82:134),y:small?50:59,w:small?72:116,h:small?51:80},
      fabao:{cx:W-(small?34:48),cy:small?126:178,r:small?16:23},
      party:{x:small?16:20,y:H-(small?49:64),w:small?36:48,h:small?36:48},
      sky:{cx:W-(small?45:54),cy:H-(small?37:49),r:small?26:34},
      troop:{first:small?92:114,step:small?54:70,cy:H-(small?57:78),r:small?17:22,nameY:H-(small?28:41),costY:H-(small?13:19),y:H-(small?75:111),w:small?48:62,h:small?66:102},
      xp:{x:small?W*.607:W*.64,y:small?15:19.5},time:{x:W/2,y:small?15:19.5},
      speed:{x:W-(small?115:138),y:0,w:44,h:44},pause:{x:W-(small?60:60),y:0,w:48,h:44}
    };
    if(port){L.map.y=148;L.fabao.cy=224;L.xp={x:14,y:48};L.time.y=48;L.speed.y=26;L.xp.w=145;L.pause.y=0;
      L.troop.first=W/2-108;L.troop.cy=H-125;L.troop.nameY=H-96;L.troop.costY=H-81;L.troop.y=H-143;
      L.quest={x:12,y:76,w:W-24,h:22};L.notice={x:12,y:108,w:W-116,h:22};L.combo={x:W-96,y:108,w:84,h:22};
    } else {
      L.xp.w=Math.min(small?160:190,Math.max(90,L.speed.x-L.xp.x-40));
      L.quest={x:small?12:20,y:head+8,w:small?Math.min(210,W*.3):300,h:small?22:30};
      var nx=L.quest.x+L.quest.w+8,nw=Math.min(small?380:440,L.map.x-nx-(small?102:140));
      L.notice={x:nx,y:head+8,w:nw,h:small?22:28};L.combo={x:nx+nw+8,y:head+8,w:small?82:118,h:small?22:28};
    }
    L.skills={x:L.xp.x-6,y:port?32:0,w:L.xp.w+8,h:44};
    if(!port && H<420){
      var mapBot=L.map.y+L.map.h+18, skyTop=L.sky.cy-L.sky.r-8;
      L.fabao.r=Math.min(L.fabao.r, Math.max(13,(skyTop-mapBot)*0.22));
      L.fabao.cy=Math.max(mapBot+L.fabao.r+2, Math.min((mapBot+skyTop)/2, skyTop-L.fabao.r-16));
    }
    // 临时反馈避开真实热区（不只是可见文字），主控件几何不变。
    if(L.small&&!port){L.notice.h=18;L.combo.h=18;}
    var gap=port||L.small?1:4, goal={x:L.quest.x,y:L.quest.y+(port?2:0),w:L.quest.w,h:44};
    [L.notice,L.combo].forEach(function(b){
      [L.skills,goal,L.pause,L.speed].forEach(function(q){
        if(b.x<q.x+q.w&&q.x<b.x+b.w&&b.y<q.y+q.h&&q.y<b.y+b.h)b.y=q.y+q.h+gap;
      });
    });
    return L;
  };
  function rec(a,id,b){X.ui.hud.push({id:id,x:XY.kToLog(a,b.x),y:XY.kToLog(a,b.y),w:XY.kToLog(a,b.w),h:XY.kToLog(a,b.h)});}
  function hit(K,b,act,ex){K.hit(b.x,b.y,b.w,b.h,act,ex);}
  function paper(c,x,y,w,h,alpha,seed){
    c.save();c.globalAlpha=alpha==null?.92:alpha;c.fillStyle='#f4efdf';c.beginPath();c.moveTo(x,y+1);
    for(var i=1;i<=18;i++)c.lineTo(x+w*i/18,y+.7*Math.sin(i*4.2+seed));
    for(i=18;i>=0;i--)c.lineTo(x+w*i/18,y+h+Math.sin(i*3.1+seed)*1.4+Math.sin(i*8+seed)*.7);
    c.closePath();c.fill();c.restore();
  }
  function brush(c,x,y,w,f,col,width){
    var p=X.INKP;f=X.clamp(f,0,1);c.save();
    p.stroke(c,x,y,x+w,y+.2,width||1.8,p.rgb(col),.18,29,.002);
    [0,.28,.57,.82].forEach(function(s,i){var end=Math.min(f,[.25,.54,.79,1][i]);if(end>s)p.stroke(c,x+s*w,y+Math.sin(i)*.4,x+end*w,y+.4,(width||1.8)*(1-i*.06),p.rgb(col),.92,41+i*11,.009);});c.restore();
  }
  function ring(c,x,y,r,col,seed,on){c.save();X.INKP.ring(c,x,y,r,on?2.15:1.3,X.INKP.rgb(col),.9,seed,4,1,.1);X.INKP.ring(c,x+.5,y-.3,r+2.3,.45,X.INKP.rgb(col),.5,seed+7,3,1,-.05);c.restore();}
  function stamp(c,x,y,w,h,round,dim){
    var key=[w,h,round,dim].join(','),cv=stamps[key];
    if(!cv){cv=stamps[key]=document.createElement('canvas');cv.width=Math.ceil(w*2);cv.height=Math.ceil(h*2);var g=cv.getContext('2d');g.scale(2,2);g.fillStyle=dim?'#887b68':RED;g.beginPath();
      if(round){for(var i=0;i<=96;i++){var a=i/96*PI*2,r=w*.48*(1+.019*Math.sin(i*1.9)+.013*Math.sin(i*3.3));var xx=w/2+Math.cos(a)*r,yy=h/2+Math.sin(a)*r;if(!i)g.moveTo(xx,yy);else g.lineTo(xx,yy);}}
      else {for(var j=0;j<=16;j++)g.lineTo(1+j*(w-2)/16,1+Math.sin(j*3.9)*.8);for(j=0;j<=16;j++)g.lineTo(w-1+Math.sin(j*2)*.7,1+j*(h-2)/16);for(j=16;j>=0;j--)g.lineTo(1+j*(w-2)/16,h-1+Math.sin(j*2.4)*.8);for(j=16;j>=0;j--)g.lineTo(1+Math.sin(j*4)*.7,1+j*(h-2)/16);}
      g.closePath();g.fill();g.globalCompositeOperation='destination-out';
      // 刻损只在印边，字在复合完成后另外绘制，不会被纹理挖掉。
      for(var n=0;n<30;n++){var t=n*2.399963,r0=w*.46,px=round?w/2+Math.cos(t)*r0:(n%2?w-2:2),py=round?h/2+Math.sin(t)*r0:(n*13.71)%(h-4)+2;g.fillStyle='rgba(0,0,0,.75)';g.fillRect(px-1.3,py-1,1.4+(n%3),.7+(n%2));}
      g.globalCompositeOperation='source-over';g.strokeStyle='rgba(250,239,214,.75)';g.lineWidth=.65;
      if(round){g.beginPath();g.arc(w/2,h/2,w*.405,.14,5.98);g.stroke();}else g.strokeRect(4,4,w-8,h-8);
    }
    c.drawImage(cv,x,y,w,h);
  }
  function kai(K,s,x,y,size,col,align){K._fam=(X.menu&&X.menu.KAI)||X.C.FONT;K.t(s,x,y,size,col,align||'left',true);K._fam=null;}
  function tooltip(a,K,b,lines){if(K.over(b.x,b.y,b.w,b.h))a._tip={x:XY.kToLog(a,b.x+b.w/2),y:XY.kToLog(a,b.y+b.h+6),below:true,lines:lines};}
  function statChips(K,G,a,L){
    var chips=X.R4.battleChips(G,a),x=L.port?L.W-115:L.skills.x+L.skills.w+4,w=L.port?48:Math.max(18,L.speed.x-x-12);
    X.ui.topChips=[];X.ui.strip=null;
    if(!chips.length||w<18)return;
    var ch=chips[0],s=ch.text;
    if(ch.id==='rage'){var rm=/(\d+:\d+)/.exec(String(ch.text));s='狂 '+(rm?rm[1]:'');}
    else if(L.small)s=ch.id==='breach'?'营危':ch.id==='wave'?'妖潮':'妖府';
    var b={x:x,y:L.port?7:5,w:w,h:L.small?20:27};
    var cc=K.c; cc.save(); cc.font=(L.small?12:14)+'px "Ma Shan Zheng","KaiTi",serif'; cc.fillStyle='#24180f'; cc.textAlign='left'; cc.textBaseline='middle'; cc.fillText(s, x+4, b.y+b.h/2); cc.restore();
    X.ui.topChips.push({id:ch.id,x:XY.kToLog(a,x),y:XY.kToLog(a,b.y),w:XY.kToLog(a,w),h:XY.kToLog(a,b.h)});
    if(ch.id==='breach')X.ui.strip=X.ui.topChips[0];tooltip(a,K,b,ch.tip||[ch.text]);
  }
  I.battle=function(c,G,a,ctx){
    var K=P.begin(c,a),L=I.layout(a),W=L.W,t=G.heroes[0],sz=L.small?11.5:15,yy=L.port?16:L.head/2;
    paper(c,0,0,W,L.head,.98,73);brush(c,1,L.head-1,W-2,1,'#635f4a',.85);
    hit(K,{x:0,y:0,w:W,h:L.head},'ui');
    rec(a,'top',{x:0,y:0,w:L.port?L.pause.x-4:L.skills.x-4,h:L.port?30:L.head});
    var need=X.xpNeed(G.level),xf=X.clamp(G.xp/need,0,1);
    rec(a,'xp',{x:0,y:L.head+1,w:W,h:3});
    c.save();c.translate(L.small?14:18,yy);c.fillStyle='#9d8144';c.beginPath();for(var ci=0;ci<6;ci++){var ca=ci*PI/3;c.lineTo(Math.cos(ca)*(L.small?4.7:6),Math.sin(ca)*(L.small?4.7:6));}c.closePath();c.fill();c.fillStyle='#f4efdf';c.fillRect(-1.5,-1.5,3,3);c.restore();
    var icCost=160+(G._incense||0)*80, coinX=L.small?22:32, incLabel='香火 '+icCost, incY=L.port?yy+22:yy, incX=coinX;
    c.save();
    c.font=(L.small?18:22)+'px "Ma Shan Zheng","KaiTi",serif';
    c.fillStyle='#a42d19'; c.textAlign='left'; c.textBaseline='middle';
    c.fillText(X.fmtNum(Math.floor(G.coins)), coinX, yy);
    var coinW=c.measureText(X.fmtNum(Math.floor(G.coins))).width;
    if(!L.port) incX=coinX+coinW+16;
    c.font=(L.port?16:(L.small?15:17))+'px "Ma Shan Zheng","KaiTi",serif';
    c.fillStyle=G.coins>=icCost?'#a42d19':'#8a6a58';
    c.fillText(incLabel, incX, incY);
    var incW=c.measureText(incLabel).width;
    c.restore();
    hit(K,{x:incX-4,y:incY-14,w:incW+12,h:28},'incense');
    var tx=L.port?(L.small?156:174):(incX+incW+22), hx=tx+(L.small?36:52), hw=L.small?54:78;

    var ix=L.small?231:362,hpText=Math.ceil(t.hp)+'/'+t.maxHp,hpSize=L.small?11:14,hpGap=L.small?6:9;
    // Reserve the actual number width before drawing the blood stroke; anchors/hitboxes stay fixed.
    c.save();c.font='bold '+hpSize+'px '+K.fam(hpSize,true);hw=Math.max(14,Math.min(hw,ix-5-hx-hpGap-c.measureText(hpText).width));c.restore();
    var invText=t.inv>0?'护身 '+Math.ceil(t.inv)+'秒':t.down?'阵亡':'护送中';
    if(L.port){
      c.save(); c.font=sz+'px "Ma Shan Zheng","KaiTi",serif'; c.fillStyle=G.breach||G.tdanger?RED:INK; c.textAlign='left'; c.textBaseline='middle'; c.fillText('唐僧', 136, yy); c.restore();
      var bx0=178,bw0=52;
      if(XY.INKP){ XY.INKP.stroke(c,bx0,yy,bx0+bw0,yy,1.4,'83,61,34',0.3,3,0.01); if(!t.down && t.maxHp) XY.INKP.stroke(c,bx0,yy,bx0+bw0*(t.hp/t.maxHp),yy,2.8,'168,50,36',0.92,5,0.02); }
      K.t(t.down?'尽':(t.hp>t.maxHp*0.66?'满':t.hp>t.maxHp*0.33?'半':'危'), bx0+bw0+8, yy, 14, INK, 'left', true);
      if(t.inv>0) K.t('护'+Math.ceil(t.inv), bx0+bw0+30, yy, 13, SOFT, 'left', false);
    } else {
      c.save(); c.font=sz+'px "Ma Shan Zheng","KaiTi",serif'; c.fillStyle=G.breach||G.tdanger?RED:INK; c.textAlign='left'; c.textBaseline='middle'; c.fillText('唐僧', tx, yy); c.restore();
      c.save(); c.font=(L.small?11:12)+'px "Ma Shan Zheng","KaiTi",serif'; c.fillStyle='#5c4a38'; c.textAlign='right'; c.textBaseline='middle'; c.fillText('气血', hx-4, yy); c.restore();
      if(XY.INKP){ XY.INKP.stroke(c,hx,yy,hx+hw,yy,1.4,'83,61,34',0.3,3,0.01); if(!t.down && t.maxHp) XY.INKP.stroke(c,hx,yy,hx+hw*(t.hp/t.maxHp),yy,2.8,'168,50,36',0.92,5,0.02); }
      var hpX=hx+hw+hpGap;K.tf('气血'+(t.down?'尽':(t.hp>t.maxHp*0.66?'满':t.hp>t.maxHp*0.33?'半':'危')),hpX,yy,ix-5-hpX,hpSize,INK,'left',true,10.5);
      var iw=L.time.x-(L.small?36:60)-ix-8;
      K.tf(X.fmtStr(invText),ix,yy,iw,L.small?10.5:13,t.inv>0?SOFT:RED,'left',false,L.small?10.5:13);
    }
    tooltip(a,K,{x:tx,y:0,w:(L.small?283:455)-tx,h:L.port?30:L.head},['唐僧气血 '+Math.ceil(t.hp)+' / '+t.maxHp,X.fmtStr(invText)]);
    if(L.port){var tmw=92,tmx=L.W-tmw-8,tmy=L.quest.y;paper(c,tmx,tmy,tmw,L.quest.h,.98,17);K.t(X.fmtTime(G.t),tmx+tmw/2,tmy+L.quest.h/2,16,INK,'center',true);L.quest={x:L.quest.x,y:L.quest.y,w:Math.max(120,tmx-L.quest.x-8),h:L.quest.h};}
    else K.t(X.fmtTime(G.t),L.time.x,L.time.y,L.small?14:20,INK,'center',true);
    c.save(); c.font=(L.small?14:17)+'px "Ma Shan Zheng","KaiTi",serif'; c.fillStyle='#24180f'; c.textAlign='left'; c.textBaseline='middle'; c.fillText(G.level+'级', L.xp.x, L.xp.y); c.restore();
    var barX=L.xp.x+(L.small?34:42), barW=Math.max(36, L.xp.w-(L.small?88:110));
    if(XY.INKP){ XY.INKP.stroke(c,barX,L.xp.y+6,barX+barW,L.xp.y+6,1.3,'83,61,34',0.28,7,0.01); XY.INKP.stroke(c,barX,L.xp.y+6,barX+barW*xf,L.xp.y+6,2.6,'42,32,22',0.9,11,0.02); }
    c.save(); c.font=(L.small?11:13)+'px "Ma Shan Zheng","KaiTi",serif'; c.fillStyle='#5c4a38'; c.textAlign='left'; c.textBaseline='middle'; c.fillText('经验 '+X.fmtNum(Math.floor(G.xp))+'/'+X.fmtNum(need), barX, L.xp.y-8); c.restore();
    var sealX=L.skills.x+L.skills.w-48, sealY=L.xp.y-16;
    c.save(); c.fillStyle='#a83224'; c.beginPath(); c.moveTo(sealX+3,sealY+2); c.lineTo(sealX+42,sealY+4); c.lineTo(sealX+38,sealY+28); c.lineTo(sealX+1,sealY+26); c.closePath(); c.fill();
    c.fillStyle='#fff6e8'; c.font='15px "Ma Shan Zheng","KaiTi",serif'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('修行', sealX+21, sealY+15); c.restore();
    if(G.points>0){c.fillStyle=RED;c.beginPath();c.arc(L.xp.x-4,L.xp.y,2.5,0,PI*2);c.fill();}
    rec(a,'skillBtn',{x:L.skills.x,y:L.xp.y-9,w:L.skills.w,h:18});
    hit(K,L.skills,'skills',{label:'修行菜单 · 技能点 '+G.points});
    tooltip(a,K,L.skills,['修行菜单 · 技能点 '+G.points,'等级 '+G.level+' · 经验 '+Math.floor(G.xp)+' / '+need,'Tab 打开 / 关闭；法宝图直接打开法宝页']);
    statChips(K,G,a,L);
    var spOk=X.sweep09&&X.sweep09.spdOk(G),speedY=L.port?48:yy;
    K.t(G.speed===2?'二倍速':'一倍速',L.speed.x+22,speedY,L.small?12:15,G.speed===2?RED:SOFT,'center',spOk);
    hit(K,L.speed,spOk?'spd2':'ui',{label:spOk?'切换二倍速':'未解锁二倍速'});
    tooltip(a,K,L.speed,[spOk?'本关三星已解锁 2×，点击切换':'本关三星后解锁二倍速','本关三星（无人阵亡）后解锁']);
    rec(a,'speed',{x:L.speed.x,y:speedY-10,w:44,h:20});
    var cancel=!!(a.build||a.selTower||a.summon);
    rec(a,'pause',{x:L.pause.x,y:yy-11,w:48,h:22});
    K.t(cancel?'×':'停',L.pause.x+24,yy,L.small?19:23,INK,'center',true);hit(K,L.pause,'esc',{label:cancel?'取消当前操作':'暂停 / Esc'});
    var qb=L.quest,main=G.quests&&G.quests.main,goal=G.gate&&!G.gate.sealed?'护送唐僧至西行关口':main?main.def.short:'护送唐僧';
    paper(c,qb.x-4,qb.y,qb.w+4,qb.h,.86,37);X.INKP.stroke(c,qb.x+2,qb.y+7,qb.x+5,qb.y+qb.h-6,2.8,'167,52,35',.9,91,.02);
    var qt=K.fit('当前目标 · '+goal,qb.w-16,L.small?11.5:16,true,L.small?11.5:16);kai(K,qt.s,qb.x+10,qb.y+qb.h/2,qt.size,INK);
    hit(K,{x:qb.x,y:qb.y+(L.port?2:0),w:qb.w,h:44},'battleGoal',{label:'查看任务、营地、路程与战况'});rec(a,'quest',qb);
    if(a.debugOn){
      var dbg=(G.godMode?'无敌 · ':'')+Math.round(a.fps)+' FPS · 敌'+G.enemies.length+' · ×'+G.speed;
      K.tf('调试 '+dbg,qb.x+10,qb.y+qb.h+12,qb.w-10,10.5,RED,'left',false,10.5);
    }
    ctx.denBottom=XY.kToLog(a,qb.y+qb.h);ctx.topCount=1;
    P.end(c);I.minimap(c,G,a,L);I.artifact(c,G,a,L);
    X.ui.compact={anchors:{tang:{x:XY.kToLog(a,tx),y:0,w:XY.kToLog(a,(L.small?283:455)-tx),h:XY.kToLog(a,L.port?30:L.head)},quest:{x:XY.kToLog(a,qb.x),y:XY.kToLog(a,qb.y),w:XY.kToLog(a,qb.w),h:XY.kToLog(a,qb.h)}},layout:L,coins:G.coins,tangHp:t.hp,inv:t.inv,level:G.level,xp:G.xp,target:goal};
  };
  var miniImage=null;
  I.minimap=function(c,G,a,L){
    L=L||I.layout(a);var K=P.begin(c,a),b=L.map,pad=3,w=b.w-6,h=b.h-6;
    paper(c,b.x-2,b.y-2,b.w+4,b.h+15,.87,43);c.save();c.beginPath();c.rect(b.x+pad,b.y+pad,w,h);c.clip();
    if(X.bgPaintOn(G)&&X.BGS1){if(!miniImage){miniImage=new Image();miniImage.src=X.BGS1.src;}if(miniImage.complete&&miniImage.naturalWidth){c.globalAlpha=.6;c.drawImage(miniImage,b.x+pad,b.y+pad,w,h);c.globalAlpha=1;}}
    function mp(x,y){return{x:b.x+pad+x/X.C.WORLD_W*w,y:b.y+pad+y/X.C.WORLD_H*h};}
    if(G.rt&&G.rt.pts){c.beginPath();G.rt.pts.forEach(function(p,i){var q=mp(p.x,p.y);if(i)c.lineTo(q.x,q.y);else c.moveTo(q.x,q.y);});c.strokeStyle='rgba(120,100,65,.7)';c.lineWidth=.8;c.stroke();}
    G.dens.forEach(function(d){var q=mp(d.x,d.y);c.fillStyle=d.alive?RED:'#9c9684';c.fillRect(q.x-1.8,q.y-1.8,3.6,3.6);});
    [G.camp,G.gate].forEach(function(d,i){var q=mp(d.x,d.y);c.strokeStyle=i&&d.sealed?SOFT:'#8e702d';c.lineWidth=1.2;c.strokeRect(q.x-2.4,q.y-2.4,4.8,4.8);});
    G.captives.forEach(function(d){if(d.freed)return;var q=mp(d.x,d.y);c.fillStyle='#426980';c.fillRect(q.x-1,q.y-1,2,2);});
    G.heroes.forEach(function(d){if(d.down)return;var q=mp(d.x,d.y);c.beginPath();c.arc(q.x,q.y,d.id==='tang'?2.1:1.25,0,PI*2);c.fillStyle=d.id==='tang'?'#b18930':INK;c.fill();});
    var v=mp(G.cam.x-G.view.w/2,G.cam.y-G.view.h/2);c.strokeStyle='rgba(45,43,34,.8)';c.lineWidth=.8;c.strokeRect(v.x,v.y,G.view.w/X.C.WORLD_W*w,G.view.h/X.C.WORLD_H*h);
    if(X.fork)X.fork.drawMini(c,G,mp);c.restore();brush(c,b.x,b.y+b.h,b.w,1,'#5e5948',.65);
    K.t('地图',b.x+2,b.y+b.h+7,10.5,SOFT,'left',false);hit(K,{x:b.x-2,y:b.y-2,w:b.w+4,h:b.h+4},'ui',{label:'全图路线、营地、关口、被困者与队伍位置'});rec(a,'minimap',{x:b.x-2,y:b.y-2,w:b.w+4,h:b.h+4});
    X.ui.miniAlpha=.6;P.end(c);
  };
  I.artifact=function(c,G,a,L){
    if(!G.fb)return;var K=P.begin(c,a),b=L.fabao,all=X.fabao.all(G),it=all.length?X.fabao.info(all[0].id):null,rdy=X.fabao.ready(G),s=G.fb.gain;
    c.save();c.fillStyle='rgba(249,241,219,.85)';c.beginPath();c.arc(b.cx,b.cy,b.r+1,0,PI*2);c.fill();c.restore();
    // 空装备以既有乾坤袋图作收纳入口，不把某件武器假装成已获得。
    X.ICONINK.draw(c,it?it.name:'乾坤袋',b.cx,b.cy,b.r*1.9);ring(c,b.cx,b.cy,b.r,'#81704c',104,false);
    c.save();c.translate(b.cx,b.cy+b.r+9);c.scale(L.small?23:30,10);var glow=c.createRadialGradient(0,0,0,0,0,1);glow.addColorStop(0,'rgba(249,242,224,.98)');glow.addColorStop(.7,'rgba(249,242,224,.9)');glow.addColorStop(1,'rgba(249,242,224,0)');c.fillStyle=glow;c.fillRect(-1,-1,2,2);c.restore();
    var labelY=b.cy+b.r+9; if(L.sky && labelY+7>L.sky.cy-L.sky.r) labelY=b.cy-b.r-9;
    K.t('法宝'+(all.length?' '+all.length:''),b.cx,labelY,L.small?12:13,INK,'center',false);
    if(rdy.length||s){c.fillStyle=RED;c.beginPath();c.arc(b.cx+b.r-2,b.cy-b.r+2,3,0,PI*2);c.fill();}
    var box={x:b.cx-Math.max(22,b.r+3),y:b.cy-Math.max(22,b.r+3),w:Math.max(44,(b.r+3)*2),h:Math.max(44,(b.r+3)*2)+14};
    hit(K,box,'battleFabao',{label:'法宝详情 · 已有 '+all.length+' 件 · 可炼 '+rdy.length});rec(a,'fabao',box);X.ui.cardPanel={x:XY.kToLog(a,box.x),y:XY.kToLog(a,box.y),w:XY.kToLog(a,box.w),h:XY.kToLog(a,box.h)};
    tooltip(a,K,box,['法宝 '+G.fb.w.length+'/'+X.C.FB.SLOT_F+' · 灵物 '+G.fb.s.length+'/'+X.C.FB.SLOT_L,'可炼配方 '+rdy.length+' · 点击查看携带 / 门派 / 配方']);
    var fa=G.fb.fuseAnim;if(fa){var fr=X.fabao.recipe(fa.rid),xx=L.W/2,yy=L.H*.29;paper(c,xx-115,yy-26,230,52,.95,49);X.ICONINK.draw(c,fr.name,xx-85,yy,42);K.t('炼成 · '+fr.name,xx-55,yy,18,RED,'left',true);}
    P.end(c);
  };
  I.soldiers=function(c,G,a){
    var K=P.begin(c,a),L=I.layout(a),b=L.troop;
    c.save();var fw=L.small?370:450;c.translate(L.port?L.W/2:fw*.42,L.port?b.costY+22:L.H+17);c.scale(fw*.64,L.port?94:110);var fog=c.createRadialGradient(0,0,0,0,0,1);fog.addColorStop(0,'rgba(247,240,220,.98)');fog.addColorStop(.6,'rgba(247,240,220,.88)');fog.addColorStop(1,'rgba(247,240,220,0)');c.fillStyle=fog;c.fillRect(-1,-1,2,2);c.restore();
    c.save();c.shadowColor='#f7f0dc';c.shadowBlur=2;
    /* 在场人数改由天兵按钮本身表示，不再在地上写一行游离小字。 */
    IDS.forEach(function(id,i){var d=X.TOWERS[id],price=X.soldierCost(G,id),cx=b.first+i*b.step,own=X.save.solOwned(id),ok=own&&G.coins>=price,on=a.build===id,n=G.towers.filter(function(t){return t.type===id;}).length;
      c.save();c.fillStyle='rgba(247,240,220,.82)';c.beginPath();c.arc(cx,b.cy,b.r,0,PI*2);c.fill();c.globalAlpha=own?1:.4;X.ICONINK.sol(c,id,cx,b.cy,b.r*2,1);c.restore();ring(c,cx,b.cy,b.r+1,on?RED:INK,18+i*23,on);
      kai(K,NAMES[i],cx,b.nameY,L.small?11.5:15,!own?SOFT:on?RED:INK,'center');K.tf(price+'金×'+n,cx,b.costY,b.w-2,L.small?10.5:12,!own?SOFT:!ok||on?RED:SOFT,'center',false,10.5);
      var box={x:cx-b.w/2,y:b.y,w:b.w,h:b.h};hit(K,box,'tower',{type:id,label:d.name+' '+price+'金币 · 在场'+n+'名'});
      tooltip(a,K,box,[d.name+' · '+price+'金币 · 在场'+n+'名','卡 Lv'+X.save.solLevel(id)+' · '+X.save.solCards(id)+' 张 · '+d.key.toUpperCase(),d.desc]);
    });
    rec(a,'tower',{x:b.first-b.w/2,y:b.y,w:b.step*4+b.w,h:b.h});c.restore();P.end(c);
  };
  I.party=function(c,G,a){
    var K=P.begin(c,a),L=I.layout(a),b=L.party,h=G.heroes[G.ctrl],pad=L.small?4:4;
    stamp(c,b.x,b.y,b.w,b.h,false,false);kai(K,'队伍',b.x+b.w/2,b.y+b.h/2,L.small?15:20,'#faefd8','center');
    var box={x:b.x-pad,y:b.y-5,w:b.w+pad*2,h:Math.max(44,b.h+8)},label='队伍 · 操控 '+h.def.name;
    hit(K,box,'party',{label:label});X.ui.party.tab={x:XY.kToLog(a,box.x),y:XY.kToLog(a,box.y),w:XY.kToLog(a,box.w),h:XY.kToLog(a,box.h)};X.ui.party.current={id:h.id,name:h.def.name,label:label};rec(a,'partyTab',b);
    tooltip(a,K,box,[label,'打开海报手卷 · 打开暂停 / 收起继续','唐僧自己赶路，不受指挥']);P.end(c);
  };
  I.sky=function(c,G,a){
    var K=P.begin(c,a),L=I.layout(a),b=L.sky,s=X.guest.state(G),pool=X.guest.pool(G),busy=!!s.h,ready=!busy&&s.cd<=0&&pool.length>0;
    stamp(c,b.cx-b.r,b.cy-b.r,b.r*2,b.r*2,true,!ready);
    kai(K,busy?'在场':'召唤',b.cx,b.cy-(L.small?6:8),L.small?16:21,'#fff0d5','center');
    K.t(busy?Math.max(0,Math.ceil(s.max-s.t))+'秒':ready?'就绪':pool.length?Math.ceil(s.cd)+'秒':'无人',b.cx,b.cy+(L.small?12:15),L.small?10.5:13,'#fff0d5','center',false);
    if(busy||s.cd>0&&pool.length){var f=busy?1-s.t/s.max:1-s.cd/X.guest.cdMax(G);c.save();c.strokeStyle='#9b3a25';c.lineWidth=2;c.beginPath();c.arc(b.cx,b.cy,b.r+2,-PI/2,-PI/2+PI*2*X.clamp(f,0,1));c.stroke();c.restore();}
    var rr=b.r+4,box={x:b.cx-rr,y:b.cy-rr,w:rr*2,h:rr*2};hit(K,box,'guest',{label:'召唤特殊人物 · '+(busy?'在场':ready?'就绪':Math.ceil(s.cd)+'秒冷却')});rec(a,'sky',box);
    tooltip(a,K,box,['召唤特殊人物','随机召来一位特殊人物，立刻放大招','停留 '+X.C.GUEST.STAY+' 秒 · 冷却 '+X.guest.cdMax(G)+' 秒']);P.end(c);
  };
  I.vendor=function(c,G,a){
    if(G.mode!=='play'||X.vendor.closedReason(G))return;
    var K=P.begin(c,a),L=I.layout(a),b=L.troop,left=X.vendor.stock(G).filter(function(v){return !v.sold;}).length;
    var lastCx=b.first+4*b.step, priceHalf=Math.max(b.w/2+18, 48);
    var minX=lastCx+priceHalf+28, skyLeft=L.sky.cx-L.sky.r-10;
    var x=L.port?L.W/2-70:Math.max(b.first+4*b.step+b.w/2+12,L.W/2-70,minX);
    if(!L.port && x+140>skyLeft) x=Math.max(minX, skyLeft-140);
    var box={x:x,y:L.H-61,w:140,h:44};
    var key=a.touchUI?'':' N';
    stamp(c,box.x,box.y,box.w,box.h,false,false);kai(K,'货郎·'+left+'件'+key,x+box.w/2,box.y+box.h/2,L.small?15:17,'#faefd8','center');hit(K,box,'vendorOpen');rec(a,'vendorBtn',box);P.end(c);
  };
  I.notices=function(c,G,a){
    var K=P.begin(c,a),L=I.layout(a),n=G.banner||G.toast,b=L.notice;X.ui.banner=null;
    // 360竖屏：没有连杀提示时借用空位，不把开场目标截在空白旁；认可的390+布局不变。
    if(L.port&&L.W<390&&!(G.combo&&G.combo.n>=3)&&!G.comboMs)b={x:b.x,y:b.y,w:L.W-24,h:b.h};
    if(n){var al=Math.min(1,n.t/.15,((n.max||3)-n.t+.03)/.15);c.save();c.globalAlpha=X.clamp(al,0,1);paper(c,b.x,b.y,b.w,b.h,.96,83);brush(c,b.x+2,b.y+b.h-2,b.w-4,1,RED,.75);K.tf(X.fmtStr(n.short||n.text),b.x+b.w/2,b.y+b.h/2,b.w-10,L.small?10.5:14,RED,'center',true,10.5);c.restore();rec(a,'toast',b);X.ui.banner={x:XY.kToLog(a,b.x),y:XY.kToLog(a,b.y),w:XY.kToLog(a,b.w),h:XY.kToLog(a,b.h)};}
    var cb=G.combo;if(cb&&cb.n>=3||G.comboMs){var q=L.combo,nn=G.comboMs?G.comboMs.n:cb.n;paper(c,q.x,q.y,q.w,q.h,.88,79);K.tf(X.fmtNum(nn)+' 连杀',q.x+q.w/2,q.y+q.h/2,q.w-8,L.small?11:15,RED,'center',true,10.5);if(cb)brush(c,q.x+4,q.y+q.h-2,q.w-8,X.clamp(cb.t/2.8,0,1),RED,.8);rec(a,'combo',q);}
    P.end(c);
  };
  I.details=function(K,G,x,y,w,h){
    if(!G)return;var land=!K.port&&w>=560,dw=land?w*.53:w,fs=K.W<900?11.5:15,lh=fs+5,t=G.heroes[0],all=[G.quests.main].concat(G.quests.sides||[]),row=Math.max(31,Math.min(58,(h-46)/Math.max(1,all.length))),yy=y+9;
    K.tf('营地 '+Math.ceil(G.camp.hp)+'/'+G.camp.maxHp+' · 取经路 '+Math.round(G.tang.s/G.rt.total*100)+'% · 击杀 '+G.kills,x+4,yy,dw-8,fs,INK,'left',true,11);
    yy+=lh;K.tf((G.gate.sealed?'关口封印 · 先完成主线':'护送唐僧到关口 · 距 '+Math.round(X.dist(t.x,t.y,G.gate.x,G.gate.y)))+' · 出怪 ×'+G.spawnMul.toFixed(2),x+4,yy,dw-8,fs,SOFT,'left',false,11);yy+=lh+5;
    all.forEach(function(q,i){var rr=q.def.reward||{},reward=(rr.card?'法宝 ':'')+(rr.lingshi?'灵石+'+rr.lingshi+' ':'')+(rr.shard?'碎片+'+rr.shard:'');K.tf((i?'支线 · ':'主线 · ')+(q.done?'✓ ':q.failed?'未成 · ':'')+q.def.short,x+4,yy,dw-8,fs,q.done?'#456442':INK,'left',true,11);K.tf((q.prog||'')+(reward?' · '+reward:''),x+4,yy+lh,dw-8,fs-1,SOFT,'left',false,10.5);yy+=row;});
    var dx=land?x+w*.58:x+4,dy=land?y+12:yy+18,rw=land?w*.42-4:w-8;
    kai(K,'洞府妖情',dx,dy,land?16:18,RED);dy+=25;
    G.dens.forEach(function(d){var b=d.boss,st=!d.alive?'已镇灭':b&&b.enraged?'狂暴中':d.closedT>0?'闭门'+(d.closedT<1e6?' '+X.fmtTime(d.closedT):''):b&&b.enrageT!=null?'狂暴倒计时 '+X.fmtTime(Math.max(0,b.enrageT)):'';K.tf(d.name+' · '+(d.bossName||''),dx,dy,rw,fs,INK,'left',true,11);K.tf((b&&!b.dead?'气血 '+Math.ceil(b.hp)+'/'+Math.round(b.maxHp)+' · ':'')+st,dx,dy+lh,rw,fs-1,SOFT,'left',false,10.5);dy+=land?34:42;});
  };})();
