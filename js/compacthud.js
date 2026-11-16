/* 认可的紧凑水墨战斗边栏。CSS 几何只负责绘制，购买、放置、召唤、暂停仍走原命令。 */
(function () {
  'use strict';
  var X=window.XY, P=X.pv2, I=X.compactHud={}, PI=Math.PI, RED='#a73525', INK='#38382f', SOFT='#756f5e';
  var IDS=['arrow','cannon','frost','siege','heal'], NAMES=['弓兵','炮兵','寒冰','破阵','佛光'], stamps={};
  I.on=function(G,a){return !!(X.ui2&&X.ui2.on)&&!!G.fb&&!G.villain&&!G.lair;};
  I.layout=function(a,G){
    var cssW=Math.round(a.lw*a.zoom),cssH=Math.round(a.lh*a.zoom),s=XY.uiScale?XY.uiScale(cssW,cssH):1,W=cssW/s,H=cssH/s,port=W<H,small=W<900,head=port?64:small?30:39;
    var L={W:W,H:H,port:port,small:small,head:head,fs:small?11.5:15,
      map:{x:W-(small?82:134),y:small?50:59,w:small?72:116,h:small?51:80},
      fabao:{cx:W-(small?34:48),cy:small?126:178,r:small?16:23},
      party:{x:small?16:20,y:H-(small?49:64),w:small?36:48,h:small?36:48},
      sky:{cx:W-(small?45:54),cy:H-(small?37:49),r:small?26:34},
      troop:{first:small?92:114,step:small?54:70,cy:H-(small?57:78),r:small?17:22,nameY:H-(small?28:41),costY:H-(small?13:19),y:H-(small?75:111),w:small?48:62,h:small?66:102},
      xp:{x:small?W*.607:W*.64,y:small?15:19.5},time:{x:W/2,y:small?15:19.5},
      speed:{x:W-(small?115:138),y:0,w:44,h:44},pause:{x:W-(small?60:60),y:0,w:48,h:44}
    };
    if(port){L.map.y=148;L.fabao.cy=224;L.xp={x:14,y:48};L.time.y=48;L.speed.y=26;L.speed.x=W-56;L.xp.w=Math.max(118,Math.min(145,W-195));L.pause.y=0;
      L.troop.first=W/2-108;L.troop.cy=H-125;L.troop.nameY=H-96;L.troop.costY=H-81;L.troop.y=H-143;
      L.quest={x:12,y:76,w:W-24,h:22};L.notice={x:12,y:108,w:W-116,h:22};L.combo={x:W-96,y:108,w:84,h:22};
    } else {
      L.xp.w=Math.min(small?160:190,Math.max(90,L.speed.x-L.xp.x-40));
      L.quest={x:small?12:20,y:head+8,w:small?Math.min(210,W*.3):300,h:small?22:30};
      var nx=L.quest.x+L.quest.w+8,nw=Math.min(small?380:440,L.map.x-nx-(small?102:140));
      L.notice={x:nx,y:head+8,w:nw,h:small?22:28};L.combo={x:nx+nw+8,y:head+8,w:small?82:118,h:small?22:28};
    }
    // Rest belongs to the persistent objective area; transient wave/rage chips cannot replace it.
    if(G&&G.tang&&G.tang.phase==='rest'&&!G.heroes[0].down){
      var qw=L.quest.w;L.rest=true;L.quest.h=48/s;L.quest.w=Math.max(qw,148/s);
      if(!port&&L.quest.w>qw){var grow=L.quest.w-qw;L.notice.x+=grow;L.notice.w-=grow;}
    }
    L.skills={x:L.xp.x-6,y:port?32:0,w:L.xp.w+8,h:44};
    // Short landscape: one readable 44px row; secondary information opens on demand.
    // Below 480px width keep the existing composition until its own layout review.
    if(!port&&W>=480&&W<900&&H>=320&&H<480){
      L.shortTop=true;L.head=44;
      L.header={coins:{x:8,y:0,w:48,h:44},tang:{x:60,y:0,w:72,h:44},status:{x:256,y:0,w:48,h:44},incense:{x:360,y:0,w:56,h:44}};
      L.skills={x:136,y:0,w:64,h:44};L.quest={x:204,y:0,w:48,h:44};
      L.speed={x:308,y:0,w:48,h:44};L.pause={x:W-60,y:0,w:52,h:44};
      L.map.y=52;L.notice={x:8,y:52,w:180,h:44};L.combo={x:8,y:100,w:84,h:44};

    }
    if(!port && H<420){
      var mapBot=L.map.y+L.map.h+18, skyTop=L.sky.cy-L.sky.r-8;
      L.fabao.r=Math.min(L.fabao.r, Math.max(13,(skyTop-mapBot)*0.22));
      L.fabao.cy=Math.max(mapBot+L.fabao.r+2, Math.min((mapBot+skyTop)/2, skyTop-L.fabao.r-16));
    }
    // 临时反馈避开真实热区（不只是可见文字），主控件几何不变。
    if(L.small&&!port){L.notice.h=18;L.combo.h=18;}
    var gap=port||L.small?1:4, goal={x:L.quest.x,y:L.quest.y+(port?2:0),w:L.quest.w,h:Math.max(44,L.quest.h)};
    [L.notice,L.combo].forEach(function(b){
      [L.skills,goal,L.pause,L.speed].forEach(function(q){
        if(b.x<q.x+q.w&&q.x<b.x+b.w&&b.y<q.y+q.h&&q.y<b.y+b.h)b.y=q.y+q.h+gap;
      });
    });
    // Reserve deployment controls in CSS space; bottom troop controls stay put.
    if(G&&G.td&&G.td.deploy&&I.on(G,a)){
      var cw=W*s,ch=H*s,toCss=function(b){return{x:b.x*s,y:b.y*s,w:b.w*s,h:b.h*s};},toK=function(b){return{x:b.x/s,y:b.y/s,w:b.w/s,h:b.h/s};};
      var guide=!!G.td.guide,plan={compact:small,start:null,guide:null,timer:null};
      if(L.shortTop){
        L.deployShort=true;L.head=44;
        L.header={coins:{x:8,y:0,w:56,h:44},troops:{x:68,y:0,w:56,h:44},incense:{x:W-128,y:0,w:56,h:44}};
        L.skills={x:128,y:0,w:64,h:44};L.party={x:196,y:0,w:48,h:44};
        L.deployFabao={x:248,y:0,w:48,h:44};L.quest={x:300,y:0,w:48,h:44};
        L.pause={x:W-68,y:0,w:60,h:44};L.speed={x:0,y:0,w:0,h:0};
        // The row leaves the right-hand world column clear at unchanged sprite scale.
        L.troop.first=32;L.troop.step=48;
        plan.short=true;plan.start={x:(cw-260)/2,y:44,w:260,h:44};
        if(guide)plan.guide={x:8,y:46,w:72,h:44};
        plan.tabs={x:8,y:Math.max(96,ch-136),w:64,h:44,gap:8};
        plan.camera={x:cw-164,y:ch-150};
        L.notice=toK({x:8,y:96,w:260,h:44});L.combo=toK({x:8,y:144,w:80,h:44});
      }else if(small){
        var top=Math.max((L.skills.y+L.skills.h)*s,(L.pause.y+L.pause.h)*s,(L.speed.y+L.speed.h)*s)+2;
        var lane=Math.max(148,Math.min(L.map.x*s-24,port?cw-116:cw-106));
        var gw=lane-(guide?68:0);L.quest=toK({x:12,y:top,w:gw,h:44});
        if(guide)plan.guide={x:12+gw+8,y:top,w:60,h:44};
        if(port)plan.timer={x:cw-100,y:top,w:92,h:44};
        plan.start={x:12,y:top+46,w:lane,h:60};
        var combo=!!(G.combo&&G.combo.n>=3||G.comboMs),comboW=combo?72:0;
        L.notice=toK({x:plan.start.x+8,y:plan.start.y+38,w:lane-16-(combo?comboW+6:0),h:18});
        L.combo=toK({x:plan.start.x+lane-8-comboW,y:plan.start.y+38,w:comboW,h:18});
      }else{
        var sy=Math.max((L.quest.y+Math.max(44,L.quest.h))*s+12,ch*.42);
        plan.start={x:(cw-380)/2,y:sy,w:380,h:60};
        if(guide)plan.guide={x:(cw-120)/2,y:sy+68,w:120,h:44};
      }
      plan.goal=toCss({x:L.quest.x,y:L.quest.y,w:L.quest.w,h:Math.max(44,L.quest.h)});
      L.deployment=plan;
    }
    return L;
  };
  I.hudTabsLayout=function(a,G){var L=I.layout(a,G);return L.shortTop?{x:8,y:Math.max(96,L.H-136),w:64,h:44,gap:8}:null;};
  I.deploymentLayout=function(a,G){var L=I.layout(a,G);return L.deployment||null;};
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
  function tooltip(a,K,b,lines){if(a.shortHudDescriptions)a.shortHudDescriptions.push(lines.slice());if(K.over(b.x,b.y,b.w,b.h))a._tip={x:XY.kToLog(a,b.x+b.w/2),y:XY.kToLog(a,b.y+b.h+6),below:true,lines:lines};}
  function statChips(K,G,a,L){
    var chips=X.R4.battleChips(G,a),x=L.port?L.W-115:L.skills.x+L.skills.w+4,w=L.port?107:Math.max(18,L.speed.x-x-12);
    X.ui.topChips=[];X.ui.strip=null;
    if(!chips.length||w<18)return;
    var ch=chips[0],s=ch.text;
    if(ch.id==='rage'){var rm=/(\d+:\d+)/.exec(String(ch.text));s='狂 '+(rm?rm[1]:'');}
    else if(L.small)s=ch.id==='breach'?'营危':ch.id==='wave'?'妖潮':'妖府';
    var b={x:x,y:L.port?L.map.y-24:5,w:w,h:L.small?20:27};
    var cc=K.c; cc.save(); cc.font=(L.small?12:14)+'px "Ma Shan Zheng","KaiTi",serif'; cc.fillStyle='#24180f'; cc.textAlign='left'; cc.textBaseline='middle'; cc.fillText(s, x+4, b.y+b.h/2); cc.restore();
    X.ui.topChips.push({id:ch.id,x:XY.kToLog(a,x),y:XY.kToLog(a,b.y),w:XY.kToLog(a,w),h:XY.kToLog(a,b.h)});
    if(ch.id==='breach')X.ui.strip=X.ui.topChips[0];tooltip(a,K,b,ch.tip||[ch.text]);
  }
  function shortStatus(ch){
    if(!ch)return['战况','行军中'];
    var raw=String(ch.text||'').replace(/^⚠\s*/,''),m;
    if(ch.id==='breach')return['营地遇袭','立即清敌'];
    if(ch.id==='rage'){
      m=/^(.*?)\s+狂暴(?:倒计时\s+(\d+:\d+)|中)$/.exec(raw);
      return m?[m[1],m[2]?'狂暴 '+m[2]:'狂暴中']:['狂暴',raw];
    }
    if(ch.id==='wave'){
      m=/^妖潮来袭\s+(.+)$/.exec(raw);if(m)return['妖潮来袭',m[1]];
      m=/^(备战|守营迎敌|战后休整|行前整备)\s+(\d+:\d+)$/.exec(raw);if(m)return['守营 · '+m[1],m[2]];
      m=/^(.+方)\s+(\d+:\d+)$/.exec(raw);if(m)return['妖潮 · '+m[1],m[2]+' 后来袭'];
      return['妖潮',raw];
    }
    if(/^den\d+$/.test(ch.id)){
      m=/^(.*?)\s+(闭门\s+\d+:\d+|狂暴|\d+:\d+)$/.exec(raw);
      return m?[m[1],/^\d/.test(m[2])?'狂暴 '+m[2]:m[2]]:[raw,'妖府'];
    }
    if(ch.id==='more')return['更多战况',raw+'条'];
    return['战况',raw];
  }
  function shortTop(c,G,a,K,L){
    var t=G.heroes[0],H=L.header,cost=160+(G._incense||0)*80,stats=[],chips=X.R4.battleChips(G,a),ch=chips[0];
    function text(id,value,b,y,size,col){K.t(value,b.x+b.w/2,b.y+y,size,col||INK,'center',size>=16);stats.push({id:id,text:value,x:b.x+b.w/2,y:b.y+y,fontCSS:size});}
    function lines(id,b,label,value,col){text(id+'Label',label,b,12,14,SOFT);text(id,value,b,31,16,col);}
    lines('coins',H.coins,'金币',X.fmtNum(Math.floor(G.coins)),RED);
    lines('tang',H.tang,'唐僧',t.down?'阵亡':t.inv>0?'护身'+Math.ceil(t.inv)+'秒':Math.max(0,Math.ceil(t.hp))+'/'+t.maxHp,t.down||G.breach||G.tdanger?RED:INK);
    tooltip(a,K,H.tang,['唐僧气血 '+Math.max(0,Math.ceil(t.hp))+' / '+t.maxHp,t.inv>0?'护身 '+Math.ceil(t.inv)+' 秒':'失去护身后必须躲避攻击']);
    K.btn(L.skills.x,0,L.skills.w,44,'','skills',{label:'修行菜单 · 技能点 '+G.points},{primary:true,size:16,minS:16});
    var refineReady=X.fabao.ready(G);
    if(refineReady.length){
      text('skillsLabel','修行',{x:L.skills.x,y:L.skills.y,w:L.skills.w/2},13,14,'#fff6e8');
      text('refineReady','可炼',{x:L.skills.x+L.skills.w/2,y:L.skills.y,w:L.skills.w/2},13,14,'#ffe3a1');
    }else text('skillsLabel','修行',L.skills,13,16,'#fff6e8');
    text('skillsPoints',G.points+'点',L.skills,29,14,'#fff6e8');rec(a,'skillBtn',L.skills);
    tooltip(a,K,L.skills,['修行菜单 · 技能点 '+G.points,'等级 '+G.level+' · 经验 '+Math.floor(G.xp)+' / '+X.xpNeed(G.level),'法宝：在修行菜单中点法宝页'].concat(refineReady.length?['超武可炼 '+refineReady.length+' 件 · 法宝 → 配方','材料已齐，下一次选宝时选择超级法宝炼化']:[]));
    var rest=G.tang&&G.tang.phase==='rest'&&!t.down;K.btn(L.quest.x,0,L.quest.w,44,rest?'':'目标','battleGoal',{label:'查看任务、营地、路程与战况'},{size:16,minS:16});rec(a,'quest',L.quest);
    var goal=G.gate&&!G.gate.sealed?'护送唐僧至西行关口':G.quests&&G.quests.main?G.quests.main.def.short:'护送唐僧';tooltip(a,K,L.quest,[goal,'点击查看任务、营地与路程']);
    X.ui.campRest=null;if(rest){var left=Math.max(0,Math.ceil(G.tang.restMax-G.tang.restT));text('restLabel','营地',L.quest,13,14,RED);text('restTime',X.fmtTime(left),L.quest,32,14,RED);X.ui.campRest={text:'营地休息 '+X.fmtTime(left),next:'结束后继续西行',seconds:left,rect:L.quest};tooltip(a,K,L.quest,['营地休息 '+X.fmtTime(left),'结束后继续西行']);}
    var status=ch&&ch.id==='breach'?['营地','遇袭']:ch&&ch.id==='wave'&&/^妖潮来袭/.test(ch.text)?['妖潮',String(ch.text).replace(/^妖潮来袭\s*/,'')]:ch&&ch.id==='rage'&&/狂暴中/.test(ch.text)?['首领','狂暴']:['战况','消息'];
    var dead=G.heroes.filter(function(h,i){return i>0&&h.down;}).length;
    if(t.down)status=['唐僧','阵亡'];else if(G.breach||G.tdanger)status=['师父','危险'];else if(dead)status=[dead+'人','阵亡'];
    var drawer=!!(P.folio&&P.folio.shortBattleDrawer);if(drawer&&!t.down&&!G.breach&&!G.tdanger&&!dead)status=['收起','战况'];K.btn(H.status.x,0,H.status.w,44,'','folio',{key:'shortBattleDrawer',i:drawer?0:1,label:'展开或收起地图与战况 · 战斗继续'},{size:16,minS:16});text('status',status[0],H.status,13,14,ch||t.down||G.breach||G.tdanger||dead?RED:INK);text('statusDetail',status[1],H.status,32,14,ch||t.down||G.breach||G.tdanger||dead?RED:SOFT);
    X.ui.topChips=ch?[{id:ch.id,x:XY.kToLog(a,H.status.x),y:0,w:XY.kToLog(a,H.status.w),h:XY.kToLog(a,44)}]:[];X.ui.strip=ch&&ch.id==='breach'?X.ui.topChips[0]:null;tooltip(a,K,H.status,(t.down?['唐僧阵亡']:G.breach||G.tdanger?['师父危险，立即保护']:dead?['阵亡队友：'+G.heroes.filter(function(h,i){return i>0&&h.down;}).map(function(h){return h.def.name;}).join('、')]:ch?ch.tip||[ch.text]:['行军中']).concat(['点击展开地图与消息 · 战斗继续']));
    var spOk=X.sweep09&&X.sweep09.spdOk(G);K.btn(L.speed.x,0,L.speed.w,44,G.speed===2?'二倍':'一倍',spOk?'spd2':'ui',{label:spOk?'切换二倍速':'未解锁二倍速'},{size:16,minS:16});rec(a,'speed',L.speed);tooltip(a,K,L.speed,[spOk?'本关三星已解锁二倍速':'本关三星后解锁二倍速']);
    K.btn(H.incense.x,0,H.incense.w,44,'','incense',null,{size:16,minS:16});lines('incense',H.incense,'香火',X.fmtNum(cost)+'金',G.coins>=cost?RED:SOFT);rec(a,'incense',H.incense);tooltip(a,K,H.incense,['香火需要 '+cost+' 金币','存活队友恢复30%最大气血，并强化攻势16秒']);
    var cancel=!!(a.build||a.selTower||a.summon);K.btn(L.pause.x,0,L.pause.w,44,cancel?'取消':'暂停','esc',{label:cancel?'取消当前操作':'暂停 / Esc'},{size:16,minS:16});rec(a,'pause',L.pause);
    a.shortHudLayout={width:L.W,height:44,rows:1,phase:'battle',fontCSS:[14,16],cells:H,skills:L.skills,speed:L.speed,pause:L.pause,stats:stats};
  }
  // Only display urgent wording in a free patch of screen. The real status
  // button and original tooltip stay available when no such patch is clear.
  function shortBlocks(G,a,K,L){
    var z=a.zoom||1,s=K.s||1,blocks=[],b=L.troop;
    G.heroes.forEach(function(h){if(h.down||h.ridden)return;var r=h.def.r,box=h._drawBox;if(box)blocks.push({x:(box.x-G.cam.x+G.view.w/2)*z/s-4,y:(box.y-G.cam.y+G.view.h/2)*z/s-4,w:box.w*z/s+8,h:box.h*z/s+8});blocks.push({x:(h.x-24-G.cam.x+G.view.w/2)*z/s,y:(h.y+r+3-G.cam.y+G.view.h/2)*z/s,w:48*z/s,h:12*z/s});});
    blocks.push({x:b.first-b.w/2-8,y:b.y-22,w:b.step*4+b.w+16,h:b.h+30});
    var tabs=I.hudTabsLayout(a,G);if(tabs)blocks.push({x:tabs.x,y:tabs.y,w:tabs.w*2+tabs.gap,h:tabs.h});
    if(a.shortHudDrawer)blocks.push(a.shortHudDrawer.rect);return blocks;
  }
  function shortFree(blocks){
    var choices=[{x:8,y:52,w:180,h:44},{x:8,y:100,w:180,h:44},{x:8,y:148,w:180,h:44}];
    for(var i=0;i<choices.length;i++){var q=choices[i];if(!blocks.some(function(r){return q.x<r.x+r.w&&r.x<q.x+q.w&&q.y<r.y+r.h&&r.y<q.y+q.h;}))return q;}return null;
  }
  function shortLines(c,text,w){
    c.save();var rows=X.inkHud.partyTextRows(c,text,w,[],'14px '+X.C.FONT);c.restore();return rows.length?rows:[''];
  }
  function shortWarning(c,G,a,K,L){
    var ch=X.R4.battleChips(G,a)[0],urgent=ch&&(ch.id==='breach'||ch.id==='wave'||ch.id==='rage'&&/狂暴中/.test(ch.text));a.shortHudWarning=null;if(!urgent)return;
    var lines=shortStatus(ch),q=shortFree(shortBlocks(G,a,K,L));if(!q)return;
    paper(c,q.x,q.y,q.w,q.h,.91,57);brush(c,q.x+3,q.y+q.h-2,q.w-6,1,RED,1);K.t(lines[0],q.x+8,q.y+13,14,RED,'left',true);K.t(lines[1],q.x+8,q.y+32,14,INK,'left',false);
    hit(K,q,'battleGoal',{label:ch.text});tooltip(a,K,q,ch.tip||[ch.text]);a.shortHudWarning={id:ch.id,lines:lines,rect:q};
  }
  function shortDrawer(c,G,a,K,L){
    a.shortHudDrawer=null;if(!(P.folio&&P.folio.shortBattleDrawer))return;
    var b={x:L.W-244,y:48,w:236,h:182},ch=X.R4.battleChips(G,a)[0],lines=shortStatus(ch),tab=P.folio.shortBattleTab||0;
    paper(c,b.x,b.y,b.w,b.h,.97,67);hit(K,b,'ui',{label:'地图与消息 · 战斗继续 · 再点顶栏收起'});
    K.btn(b.x+4,b.y+2,72,44,'地图','folio',{key:'shortBattleTab',i:0},{active:!tab,size:14,minS:14});
    K.btn(b.x+82,b.y+2,72,44,'消息','folio',{key:'shortBattleTab',i:1},{active:!!tab,size:14,minS:14});
    K.btn(b.x+160,b.y+2,72,44,'说明','hudExplain',{label:'阅读战场说明 · 暂停战斗'},{size:14,minS:14});
    a.shortHudDrawer={rect:b,lines:lines,nonModal:true,tab:tab};
    if(tab){
      var pages=[];(G.noteLog||[]).slice().reverse().forEach(function(n){var ls=shortLines(c,n.text,b.w-16);for(var i=0;i<ls.length;i+=3)pages.push({note:n,offset:i,time:X.fmtTime(n.t||0),lines:ls.slice(i,i+3),continued:i>0,text:n.text});});
      // Page actions carry the source note identity and segment offset. New
      // arrivals only advance readers following the latest page.
      var selected=P.folio.shortBattleMessagePage||0,at=0,expired=false;
      if(selected&&typeof selected==='object'&&!selected.latest){
        at=pages.findIndex(function(p){return p.note===selected.note&&p.offset===selected.offset;});
        if(at<0&&pages.length){at=pages.findIndex(function(p){return p.note===G.noteLog[0]&&p.offset===0;});expired=true;}
        else expired=!!selected.expired;
      }else if(typeof selected==='number')at=X.clamp(selected,0,Math.max(0,pages.length-1));
      at=Math.max(0,at);var page=pages[at];
      function anchor(i){var p=pages[i];return !p||i===0?{latest:true}:{note:p.note,offset:p.offset};}
      P.folio.shortBattleMessagePage=anchor(at);if(expired)P.folio.shortBattleMessagePage.expired=true;
      K.t(page?(expired?'旧记录已移除 · 最早消息':page.time+(page.continued?' · 续':' · 消息')):'暂无消息',b.x+8,b.y+61,14,SOFT,'left',false);
      if(page)page.lines.forEach(function(line,i){K.t(line,b.x+8,b.y+80+i*17,14,INK,'left',false);});
      K.btn(b.x+4,b.y+136,108,44,at>0?'较新':'最新',at>0?'folio':'ui',{key:'shortBattleMessagePage',i:anchor(at-1),direction:'newer'},{size:14,minS:14});
      K.btn(b.x+120,b.y+136,112,44,at+1<pages.length?'较早':'最早',at+1<pages.length?'folio':'ui',{key:'shortBattleMessagePage',i:anchor(at+1),direction:'older'},{size:14,minS:14});
      a.shortHudDrawer.message={page:at,pages:pages.length,entry:page||null,followingLatest:at===0,expired:expired};
    }else{
      var copy={};Object.keys(L).forEach(function(k){copy[k]=L[k];});copy.map={x:b.x+8,y:b.y+50,w:220,h:110,drawer:true};
      P.end(c);I.minimap(c,G,a,copy);P.begin(c,a);
    }
  }
  // This target never depends on the current camera: no world/screen feedback.
  // Nearby companions share the free vertical band when they fit; distant
  // members fade out of the framing calculation without moving their bodies.
  I.cameraTarget=function(G,a,controlled){
    if(!G||!a||!controlled||a.screen!=='play'||G.mode!=='play'||!I.on(G,a))return null;
    var L=I.layout(a,G);if(!L.shortTop||L.deployShort||G.heroes.length>=9)return null;
    var z=a.zoom||1,s=X.uiScale?X.uiScale(G.view.w*z,G.view.h*z):1,top=(L.head+8)*s/z,bottom=(L.troop.y-22)*s/z,viewMid=G.view.h/2;
    var low=Infinity,high=-Infinity,far=0;
    G.heroes.forEach(function(h){if(h.down||h.ridden)return;var r=h.def.r||18,n=h._ultNormalBody,valid=n&&X.chibi&&n.frameKey===X.chibi.bodyFrameKey(G,h),up=h.y-r*4.6,down=h.y+r+12;
      if(valid){up=Math.min(up,h.y+n.footOffset-n.height-8);down=Math.max(down,h.y+n.footOffset+8);}
      low=Math.min(low,up);high=Math.max(high,down);far=Math.max(far,Math.abs(h.x-controlled.x));});
    var span=high-low,space=bottom-top,slack=(space-span)*z/s,weight=X.clamp(slack/16,0,1)*X.clamp((G.view.w*.7-far)/(80*s/z),0,1);
    var fallback=controlled.y+viewMid-(top+bottom)/2,lo=high+viewMid-bottom,hi=low+viewMid-top;
    var desired=lo<=hi?X.clamp(controlled.y,lo,hi):fallback,cy=fallback+(desired-fallback)*weight;
    var first=a._shortCamGame!==G||a.shortHudLayout&&a.shortHudLayout.phase==='deployment';a._shortCamGame=G;
    a.shortHudCamera={targetY:cy,top:top,bottom:bottom,weight:weight,span:span,space:space,control:controlled.id,initial:!!first};
    return{x:controlled.x,y:cy,snap:!!first};
  };
  function deploymentTop(c,G,a,K,L){
    var H=L.header,cost=160+(G._incense||0)*80,stats=[];
    function line(id,value,b,y,size,col){K.t(value,b.x+b.w/2,b.y+y,size,col||INK,'center',size>=16);stats.push({id:id,text:value,x:b.x+b.w/2,y:b.y+y,fontCSS:size});}
    function pair(id,label,value,b,col){line(id+'Label',label,b,12,14,SOFT);line(id,value,b,31,16,col);}
    function button(b,label,act,extra){K.btn(b.x,b.y,b.w,b.h,label,act,extra,{size:16,minS:16});}
    pair('coins','金币',X.fmtNum(Math.floor(G.coins)),H.coins,RED);
    pair('troops','天兵',G.towers.length+'/'+X.soldierCap(G),H.troops,INK);
    K.btn(L.skills.x,0,L.skills.w,44,'','skills',{label:'修行菜单 · 技能点 '+G.points},{primary:true,size:16,minS:16});
    line('skillsLabel','修行',L.skills,13,16,'#fff6e8');line('skillsPoints',G.points+'点',L.skills,29,14,'#fff6e8');rec(a,'skillBtn',L.skills);
    tooltip(a,K,L.skills,['修行菜单 · 技能点 '+G.points,'等级 '+G.level+' · 经验 '+Math.floor(G.xp)+' / '+X.xpNeed(G.level),'法宝：在修行菜单中点法宝页']);
    button(L.party,'队伍','party',{label:'队伍 · 操控 '+G.heroes[G.ctrl].def.name});
    rec(a,'partyTab',L.party);
    var refineReady=X.fabao.ready(G),refine=refineReady.filter(function(r){return r.id===G.fb.pin;})[0]||refineReady[0];
    button(L.deployFabao,refine?'':'法宝','battleFabao',refine?{view:'recipe',rid:refine.id,label:'超武可炼 · 查看'+refine.name+'配方'}:{label:'法宝详情 · 携带 / 门派 / 配方'});
    if(refine){line('fabaoLabel','法宝',L.deployFabao,13,16,INK);line('refineReady','可炼',L.deployFabao,32,14,RED);}
    rec(a,'fabao',L.deployFabao);
    button(L.quest,'目标','battleGoal',{label:'查看任务、营地、路程与战况'});rec(a,'quest',L.quest);
    K.btn(H.incense.x,0,H.incense.w,44,'','incense',null,{size:16,minS:16});
    pair('incense','香火',X.fmtNum(cost)+'金',H.incense,G.coins>=cost?RED:SOFT);rec(a,'incense',H.incense);
    tooltip(a,K,H.incense,['香火需要 '+cost+' 金币','存活队友恢复30%最大气血，并强化攻势16秒']);
    var cancel=!!(a.build||a.selTower||a.summon);button(L.pause,cancel?'取消':'暂停','esc',{label:cancel?'取消当前操作':'暂停 / Esc'});rec(a,'pause',L.pause);
    X.ui.topChips=[];X.ui.strip=null;X.ui.campRest=null;
    a.shortHudLayout={width:L.W,height:44,rows:1,phase:'deployment',fontCSS:[14,16],cells:H,skills:L.skills,pause:L.pause,stats:stats};
  }
  I.battle=function(c,G,a,ctx){
    var K=P.begin(c,a),L=I.layout(a,G),W=L.W,t=G.heroes[0],sz=L.small?11.5:15,yy=L.port?16:L.head/2;
    a.shortHudDescriptions=L.shortTop?[]:null;a.shortHudDescriptionGame=G;
    if(L.shortTop){P.folio=P.folio||{};a.shortHudDrawer=null;a.shortHudWarning=null;if(a._shortHudGame!==G){P.folio.shortBattleTab=0;P.folio.shortBattleMessagePage=0;}if(a._shortHudGame!==G||L.deployShort){P.folio.shortBattleDrawer=0;a._shortHudGame=G;}if(P.folio.shortBattleDrawer&&!a._shortDrawerOpen)P.folio.shortBattleMessagePage=0;a._shortDrawerOpen=!!P.folio.shortBattleDrawer;}
    // Only the five troop controls receive a local paper wash; this shared
    // layer also covers the later tdline soldier-card renderer override.
    var b=L.troop;
    var pad=8,back={x:b.first-b.w/2-pad,y:b.y-pad,w:b.step*4+b.w+pad*2,h:b.h+pad*2};
    I.troopBackdrop=back;
    c.save();c.beginPath();c.rect(back.x,back.y,back.w,back.h);c.clip();
    var fog=c.createLinearGradient(0,back.y,0,back.y+back.h);
    fog.addColorStop(0,'rgba(247,240,220,0)');fog.addColorStop(.28,'rgba(247,240,220,.86)');fog.addColorStop(.88,'rgba(247,240,220,.91)');fog.addColorStop(1,'rgba(247,240,220,0)');
    c.fillStyle=fog;c.fillRect(back.x,back.y,back.w,back.h);c.restore();
    paper(c,0,0,W,L.head,.98,73);brush(c,1,L.head-1,W-2,1,'#635f4a',.85);
    hit(K,{x:0,y:0,w:W,h:L.head},'ui');
    rec(a,'top',{x:0,y:0,w:L.shortTop?W:L.port?L.pause.x-4:L.skills.x-4,h:L.port?30:L.head});
    var tx;
    if(L.deployShort){tx=L.header.coins.x;deploymentTop(c,G,a,K,L);}else if(L.shortTop){tx=L.header.tang.x;shortTop(c,G,a,K,L);}else{
    var need=X.xpNeed(G.level),xf=X.clamp(G.xp/need,0,1);
    rec(a,'xp',{x:0,y:L.head+1,w:W,h:3});
    c.save();c.translate(L.small?14:18,yy);c.fillStyle='#9d8144';c.beginPath();for(var ci=0;ci<6;ci++){var ca=ci*PI/3;c.lineTo(Math.cos(ca)*(L.small?4.7:6),Math.sin(ca)*(L.small?4.7:6));}c.closePath();c.fill();c.fillStyle='#f4efdf';c.fillRect(-1.5,-1.5,3,3);c.restore();
    var icCost=160+(G._incense||0)*80, coinX=L.small?22:32, incLabel='香火 '+icCost, incY=L.port?L.xp.y:yy, incX=L.port?L.xp.x+L.xp.w+16:coinX;
    c.save();
    c.font=(L.small?18:22)+'px "Ma Shan Zheng","KaiTi",serif';
    c.fillStyle='#a42d19'; c.textAlign='left'; c.textBaseline='middle';
    var coinLabel=X.fmtNum(Math.floor(G.coins)), tight=L.port?Math.max(0,370-W):0, tangX=136-tight*.48;
    if(L.port){var coinRoom=tangX-coinX-12,coinMeasured=c.measureText(coinLabel).width;if(coinMeasured>coinRoom)c.font=Math.max(12,18*coinRoom/coinMeasured)+'px "Ma Shan Zheng","KaiTi",serif';}
    c.fillText(coinLabel, coinX, yy);
    var coinW=c.measureText(coinLabel).width;
    if(!L.port) incX=coinX+coinW+16;
    c.font=(L.port?16:(L.small?15:17))+'px "Ma Shan Zheng","KaiTi",serif';
    c.fillStyle=G.coins>=icCost?'#a42d19':'#8a6a58';
    c.fillText(incLabel, incX, incY);
    var incW=c.measureText(incLabel).width;
    c.restore();
    var incenseBox={x:incX-4,y:incY-14,w:incW+12,h:28};
    hit(K,incenseBox,'incense');rec(a,'incense',incenseBox);
    var tx=L.port?(L.small?156:174):(incX+incW+22), hx=tx+(L.small?36:52), hw=L.small?54:78;

    var ix=L.small?231:362,hpText=Math.ceil(t.hp)+'/'+t.maxHp,hpSize=L.small?11:14,hpGap=L.small?6:9;
    // Reserve the actual number width before drawing the blood stroke; anchors/hitboxes stay fixed.
    c.save();c.font='bold '+hpSize+'px '+K.fam(hpSize,true);hw=Math.max(14,Math.min(hw,ix-5-hx-hpGap-c.measureText(hpText).width));c.restore();
    var invText=t.inv>0?'护身 '+Math.ceil(t.inv)+'秒':t.down?'阵亡':G.tang&&G.tang.phase==='rest'?'休息中':G.station?'驻守中':'护送中';
    if(L.port){
      c.save(); c.font=sz+'px "Ma Shan Zheng","KaiTi",serif'; c.fillStyle=G.breach||G.tdanger?RED:INK; c.textAlign='left'; c.textBaseline='middle'; c.fillText('唐僧', tangX, yy); c.restore();
      var bx0=178-tight*.64,bw0=52-tight*.2;
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
    if(L.port){var db=L.deployment&&L.deployment.timer,tmw=db?db.w/K.s:92,tmx=db?db.x/K.s:L.W-tmw-8,tmy=db?db.y/K.s:L.quest.y,tmh=db?db.h/K.s:L.quest.h;paper(c,tmx,tmy,tmw,tmh,.98,17);K.t(X.fmtTime(G.t),tmx+tmw/2,tmy+tmh/2,16,INK,'center',true);if(db)hit(K,{x:tmx,y:tmy,w:tmw,h:tmh},'ui');if(!db)L.quest={x:L.quest.x,y:L.quest.y,w:Math.max(120,tmx-L.quest.x-8),h:L.quest.h};}
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
    }
    var qb=L.quest,main=G.quests&&G.quests.main,goal=G.gate&&!G.gate.sealed?'护送唐僧至西行关口':main?main.def.short:'护送唐僧';
    if(!L.shortTop){
    paper(c,qb.x-4,qb.y,qb.w+4,qb.h,.86,37);X.INKP.stroke(c,qb.x+2,qb.y+7,qb.x+5,qb.y+qb.h-6,2.8,'167,52,35',.9,91,.02);
    X.ui.campRest=null;
    if(L.rest){
      var sec=Math.max(0,Math.ceil(G.tang.restMax-G.tang.restT)),restText='营地休息 '+X.fmtTime(sec),scale=K.s||1;
      K.t(restText,qb.x+10/scale,qb.y+15/scale,16/scale,RED,'left',true);
      K.t('结束后继续西行',qb.x+10/scale,qb.y+35/scale,14/scale,INK,'left',false);
      X.ui.campRest={text:restText,next:'结束后继续西行',seconds:sec,rect:{x:qb.x*scale,y:qb.y*scale,w:qb.w*scale,h:qb.h*scale}};
    }else{
      var qt=K.fit('当前目标 · '+goal,qb.w-16,L.small?11.5:16,true,L.small?11.5:16);kai(K,qt.s,qb.x+10,qb.y+qb.h/2,qt.size,INK);
    }
    hit(K,{x:qb.x,y:qb.y+(L.port&&!L.deployment?2:0),w:qb.w,h:Math.max(44,qb.h)},'battleGoal',{label:'查看任务、营地、路程与战况'});rec(a,'quest',qb);
    if(a.debugOn){
      var dbg=(G.godMode?'无敌 · ':'')+Math.round(a.fps)+' FPS · 敌'+G.enemies.length+' · ×'+G.speed;
      K.tf('调试 '+dbg,qb.x+10,qb.y+qb.h+12,qb.w-10,10.5,RED,'left',false,10.5);
    }
    }
    ctx.denBottom=XY.kToLog(a,qb.y+qb.h);ctx.topCount=1;
    if(L.shortTop&&!L.deployShort){shortWarning(c,G,a,K,L);shortDrawer(c,G,a,K,L);}
    P.end(c);if(!L.shortTop){I.minimap(c,G,a,L);I.artifact(c,G,a,L);}
    X.ui.compact={anchors:{tang:{x:XY.kToLog(a,tx),y:0,w:XY.kToLog(a,L.deployShort?L.header.coins.w:L.shortTop?L.header.tang.w:(L.small?283:455)-tx),h:XY.kToLog(a,L.shortTop?44:L.port?30:L.head)},quest:{x:XY.kToLog(a,qb.x),y:XY.kToLog(a,qb.y),w:XY.kToLog(a,qb.w),h:XY.kToLog(a,qb.h)}},layout:L,coins:G.coins,tangHp:t.hp,inv:t.inv,level:G.level,xp:G.xp,target:goal};
  };
  var miniPreview=null, miniPending=null;
  function miniCurrent(entry){
    return miniPreview===entry&&X.bgPaintDrawable&&X.bgPaintDrawable()===entry.source&&
      (!entry.base||(X.bgPaintBase&&X.bgPaintBase()===entry.base));
  }
  function miniRetire(){
    var old=miniPreview;miniPreview=null;
    // Only the resized bitmap belongs to this cache; terrain owns the source.
    if(old&&old.image&&typeof old.image.close==='function')old.image.close();
  }
  function miniFallback(entry){
    if(!miniCurrent(entry)||entry.state!=='pending')return;
    entry.state='fallback';
    try{
      var cv=document.createElement('canvas');cv.width=entry.w;cv.height=entry.h;
      var cc=cv.getContext('2d');cc.imageSmoothingEnabled=true;cc.imageSmoothingQuality='high';
      cc.drawImage(entry.source,0,0,entry.w,entry.h);entry.image=cv;
    }catch(error){entry.state='error';entry.error=String(error.message||error);}
  }
  function miniPrepare(source,w,h){
    var base=X.bgPaintBase&&X.bgPaintBase();
    if(!base||base.drawable!==source||!base.blob)base=null;
    if(!miniPreview||miniPreview.source!==source||miniPreview.base!==base||miniPreview.w!==w||miniPreview.h!==h){
      miniRetire();miniPreview={source:source,base:base,w:w,h:h,state:'pending',image:null};
    }
    var entry=miniPreview;
    // A native resize cannot be aborted. Coalesce rapid resizes behind its one outstanding job.
    if(entry.state!=='pending'||miniPending)return;
    if(!base||typeof window.createImageBitmap!=='function'){miniFallback(entry);return;}
    miniPending=entry;
    try{
      entry.promise=window.createImageBitmap(base.blob,{resizeWidth:w,resizeHeight:h,resizeQuality:'high'});
      entry.promise.then(function(bitmap){
        entry.promise=null;miniPending=null;
        if(!miniCurrent(entry)){
          if(bitmap&&typeof bitmap.close==='function')bitmap.close();return;
        }
        // Older implementations may ignore resize options. Retain the exact old fallback once.
        if(!bitmap||bitmap.width!==w||bitmap.height!==h){
          if(bitmap&&typeof bitmap.close==='function')bitmap.close();miniFallback(entry);return;
        }
        entry.image=bitmap;entry.state='ready';
      },function(){entry.promise=null;miniPending=null;miniFallback(entry);});
    }catch(error){entry.promise=null;miniPending=null;miniFallback(entry);}
  }
  I.minimap=function(c,G,a,L){
    L=L||I.layout(a);var K=P.begin(c,a),b=L.map,pad=3,w=b.w-6,h=b.h-6;
    paper(c,b.x-2,b.y-2,b.w+4,b.h+15,.87,43);c.save();c.beginPath();c.rect(b.x+pad,b.y+pad,w,h);c.clip();
    var miniImage=X.bgPaintOn(G)&&X.bgPaintDrawable?X.bgPaintDrawable():null;
    if(!miniImage)miniRetire();
    if(miniImage){
        // Prepare only the current size. Pending frames keep all live map overlays.
        var density=Math.max(1,Math.min(3,Math.abs(c.getTransform().a))), mw=Math.ceil(w*density), mh=Math.ceil(h*density);
        miniPrepare(miniImage,mw,mh);
        if(miniPreview.image){c.globalAlpha=.6;c.drawImage(miniPreview.image,b.x+pad,b.y+pad,w,h);c.globalAlpha=1;}
    }
    function mp(x,y){return{x:b.x+pad+x/X.C.WORLD_W*w,y:b.y+pad+y/X.C.WORLD_H*h};}
    if(G.rt&&G.rt.pts){c.beginPath();G.rt.pts.forEach(function(p,i){var q=mp(p.x,p.y);if(i)c.lineTo(q.x,q.y);else c.moveTo(q.x,q.y);});c.strokeStyle='rgba(120,100,65,.7)';c.lineWidth=.8;c.stroke();}
    G.dens.forEach(function(d){var q=mp(d.x,d.y);c.fillStyle=d.alive?RED:'#9c9684';c.fillRect(q.x-1.8,q.y-1.8,3.6,3.6);});
    [G.camp,G.gate].forEach(function(d,i){var q=mp(d.x,d.y);c.strokeStyle=i&&d.sealed?SOFT:'#8e702d';c.lineWidth=1.2;c.strokeRect(q.x-2.4,q.y-2.4,4.8,4.8);});
    G.captives.forEach(function(d){if(d.freed)return;var q=mp(d.x,d.y);c.fillStyle='#426980';c.fillRect(q.x-1,q.y-1,2,2);});
    G.heroes.forEach(function(d){if(d.down)return;var q=mp(d.x,d.y);c.beginPath();c.arc(q.x,q.y,d.id==='tang'?2.1:1.25,0,PI*2);c.fillStyle=d.id==='tang'?'#b18930':INK;c.fill();});
    var v=mp(G.cam.x-G.view.w/2,G.cam.y-G.view.h/2);c.strokeStyle='rgba(45,43,34,.8)';c.lineWidth=.8;c.strokeRect(v.x,v.y,G.view.w/X.C.WORLD_W*w,G.view.h/X.C.WORLD_H*h);
    if(X.fork)X.fork.drawMini(c,G,mp);c.restore();brush(c,b.x,b.y+b.h,b.w,1,'#5e5948',.65);
    K.t(b.drawer?'地图 · 战斗继续':'地图',b.x+2,b.y+b.h+(b.drawer?10:7),b.drawer?14:10.5,SOFT,'left',false);hit(K,{x:b.x-2,y:b.y-2,w:b.w+4,h:b.h+4},'ui',{label:'全图路线、营地、关口、被困者与队伍位置'});rec(a,'minimap',{x:b.x-2,y:b.y-2,w:b.w+4,h:b.h+4});
    X.ui.miniAlpha=.6;P.end(c);
  };
  I.artifact=function(c,G,a,L){
    if(!G.fb)return;var K=P.begin(c,a),b=L.fabao,all=X.fabao.all(G),it=all.length?X.fabao.info(all[0].id):null,rdy=X.fabao.ready(G),s=G.fb.gain;
    c.save();c.fillStyle='rgba(249,241,219,.85)';c.beginPath();c.arc(b.cx,b.cy,b.r+1,0,PI*2);c.fill();c.restore();
    // 空装备以既有乾坤袋图作收纳入口，不把某件武器假装成已获得。
    X.ICONINK.draw(c,it?it.name:'乾坤袋',b.cx,b.cy,b.r*1.9);ring(c,b.cx,b.cy,b.r,'#81704c',104,false);
    c.save();c.translate(b.cx,b.cy+b.r+9);c.scale(L.small?23:30,10);var glow=c.createRadialGradient(0,0,0,0,0,1);glow.addColorStop(0,'rgba(249,242,224,.98)');glow.addColorStop(.7,'rgba(249,242,224,.9)');glow.addColorStop(1,'rgba(249,242,224,0)');c.fillStyle=glow;c.fillRect(-1,-1,2,2);c.restore();
    var labelY=b.cy+b.r+9; if(L.sky && labelY+7>L.sky.cy-L.sky.r) labelY=b.cy-b.r-9;
    K.t(rdy.length?'超武可炼':'法宝'+(all.length?' '+all.length:''),b.cx,labelY,L.small?12:13,rdy.length?RED:INK,'center',!!rdy.length);
    if(rdy.length||s){c.fillStyle=RED;c.beginPath();c.arc(b.cx+b.r-2,b.cy-b.r+2,3,0,PI*2);c.fill();}
    var halfW=Math.max(22,b.r+3,rdy.length?(L.small?26:29):0),box={x:b.cx-halfW,y:Math.max(b.cy-Math.max(22,b.r+3),rdy.length?L.map.y+L.map.h+3:0),w:halfW*2,h:Math.max(44,(b.r+3)*2)+(rdy.length?16:14)};
    var refine=rdy.filter(function(r){return r.id===G.fb.pin;})[0]||rdy[0];
    hit(K,box,'battleFabao',refine?{view:'recipe',rid:refine.id,label:'超武可炼 · 查看'+refine.name+'配方'}:{label:'法宝详情 · 已有 '+all.length+' 件 · 可炼 '+rdy.length});rec(a,'fabao',box);X.ui.cardPanel={x:XY.kToLog(a,box.x),y:XY.kToLog(a,box.y),w:XY.kToLog(a,box.w),h:XY.kToLog(a,box.h)};
    tooltip(a,K,box,['法宝 '+G.fb.w.length+'/'+X.C.FB.SLOT_F+' · 灵物 '+G.fb.s.length+'/'+X.C.FB.SLOT_L,'可炼配方 '+rdy.length+' · 点击查看携带 / 门派 / 配方']);
    var fa=G.fb.fuseAnim;if(fa){var fr=X.fabao.recipe(fa.rid),xx=L.W/2,yy=L.H*.29;paper(c,xx-115,yy-26,230,52,.95,49);X.ICONINK.draw(c,fr.name,xx-85,yy,42);K.t('炼成 · '+fr.name,xx-55,yy,18,RED,'left',true);}
    P.end(c);
  };
  I.soldiers=function(c,G,a){
    var K=P.begin(c,a),L=I.layout(a),b=L.troop;
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
    var L=I.layout(a,G);
    // drawParty owns ui.party initialization; publish this tab after its reset.
    if(L.deployShort){X.ui.party.tab={x:XY.kToLog(a,L.party.x),y:0,w:XY.kToLog(a,L.party.w),h:XY.kToLog(a,44)};return;}
    var K=P.begin(c,a),b=L.party,h=G.heroes[G.ctrl],pad=L.small?4:4;
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
    var touch=!!a.touchUI;
    stamp(c,box.x,box.y,box.w,box.h,false,false);
    kai(K,'货郎商店',x+box.w/2,box.y+15,L.small?15:17,'#faefd8','center');
    K.t(left+' 件商品',x+box.w/2,box.y+33,L.small?11:12,'#faefd8','center',false);
    if(!touch){c.save();X.R.rrect(c,box.x+box.w-24,box.y+4,19,18,3);c.fillStyle='rgba(255,246,222,.16)';c.fill();c.restore();K.t('N',box.x+box.w-14.5,box.y+13,10,'#faefd8','center',true);}
    hit(K,box,'vendorOpen',{label:'货郎商店 · '+left+' 件商品'+(touch?'':' · 按 N 打开')});rec(a,'vendorBtn',box);P.end(c);
  };
  I.notices=function(c,G,a,inDeployment){
    var K=P.begin(c,a),L=I.layout(a,G),n=G.banner||G.toast,b=L.notice;X.ui.banner=null;
    if(L.deployShort&&inDeployment){P.end(c);return;}
    if(L.shortTop){
      var blocks=shortBlocks(G,a,K,L);if(a.shortHudWarning)blocks.push(a.shortHudWarning.rect);a.shortHudNotice=null;a.shortHudCombo=null;
      if(n){b=shortFree(blocks);if(b){var ls=shortLines(c,X.fmtStr(n.short||n.text),b.w-16);if(ls.length>2)ls=[ls[0],ls[1].slice(0,-1)+'…'];paper(c,b.x,b.y,b.w,b.h,.96,83);ls.forEach(function(line,i){K.t(line,b.x+8,b.y+13+i*19,14,RED,'left',false);});tooltip(a,K,b,[n.text,'全部消息：顶栏战况 → 消息']);rec(a,'toast',b);X.ui.banner={x:XY.kToLog(a,b.x),y:XY.kToLog(a,b.y),w:XY.kToLog(a,b.w),h:XY.kToLog(a,b.h)};a.shortHudNotice={rect:b,text:n.text};blocks.push(b);}}
      var combo=G.comboMs||G.combo;if(combo&&(G.comboMs||combo.n>=3)){var cb=shortFree(blocks);if(cb){paper(c,cb.x,cb.y,cb.w,cb.h,.88,79);K.t(X.fmtNum(combo.n)+' 连杀',cb.x+8,cb.y+22,14,RED,'left',true);a.shortHudCombo={rect:cb};rec(a,'combo',cb);}}
      P.end(c);return;
    }
    if(L.deployment&&L.deployment.compact&&!L.deployShort&&!inDeployment){P.end(c);return;}
    // 360竖屏：没有连杀提示时借用空位，不把开场目标截在空白旁；认可的390+布局不变。
    if(L.port&&!L.deployment&&L.W<390&&!(G.combo&&G.combo.n>=3)&&!G.comboMs)b={x:b.x,y:b.y,w:L.W-24,h:b.h};
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
    G.dens.forEach(function(d){var b=d.boss,st=!d.alive?'已镇灭':b&&b.enraged?'狂暴中':d.closedT>0?'闭门'+(d.closedT<1e6?' '+X.fmtTime(d.closedT):''):b&&b.enrageT!=null?'狂暴倒计时 '+X.fmtTime(Math.max(0,b.enrageT)):'';K.tf(d.name+' · '+(d.bossName||''),dx,dy,rw,fs,INK,'left',true,11);K.tf((b&&!b.dead?'气血 '+Math.ceil(b.hp)+'/'+Math.ceil(b.maxHp)+' · ':'')+st,dx,dy+lh,rw,fs-1,SOFT,'left',false,10.5);dy+=land?34:42;});
  };})();
