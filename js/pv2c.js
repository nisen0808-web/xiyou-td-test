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

  /* ================= 卡牌 / 组牌 ================= */
  function deck(c,G,app) {
    var f=P.frame(c,app,'法宝藏卷'),port=K.port,SO=XY.SET_ORDER,si=Math.max(0,Math.min(app.pvSet||0,SO.length-1)),sid=SO[si],ss=XY.CARD_SETS[sid];
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
    var f=P.frame(c,app,'定妆集'),port=K.port,tab=app.pvUk||0,tx=port?f.x:252,ty=port?f.y:f.y-52,tw=port?(f.w-12)/2:Math.min(136,(f.chipX-tx-20)/2),top=port?f.y+54:f.y+8,bot=f.y+f.h;
    [['人物定妆',0],['里程碑',1]].forEach(function(v,i){K.btn(tx+i*(tw+8),ty,tw,44,v[0],'pvUk',{i:v[1]},{on:tab===v[1],size:15});});
    if(tab===0){
      var hi=Math.max(0,Math.min(P.folio.skinHero||0,XY.HEROES.length)),variant=hi===XY.HEROES.length,base=XY.HEROES[variant?4:hi],idx=variant?4:hi,lw=port?f.w*.42:f.w*.47,rx=f.x+lw+20,rw=f.w-lw-20,ribbonY=bot-(port?124:91),height=ribbonY-top-20;
      var figH=Math.min(port?300:460,height-46);K.t(variant?'龙马诸相':base.name,f.x+10,top+24,26,'#a42d19','left',true);
      if(XY.heroink)XY.heroink.portrait(c,base.id,f.x+lw*.53,top+46+figH,figH);if(port)ribbonY=Math.min(ribbonY,top+46+figH+76);
      var opts;if(variant)opts=XY.HORSE_FORMS.map(function(fm){var lock=fm.id==='dragon'&&!S.dragonUnlocked();return{name:fm.name,on:S.horseForm()===fm.id,lock:lock,sub:lock?XY.condText(XY.UNLOCK_BY.u_dragon):S.horseForm()===fm.id?'已出战':'点击换上',pd:XY.previewDef(4,false,fm.id==='dragon'),act:'variantSet',ex:{form:fm.id}};});
      else{var ul=S.skinUnlocked(base.id),cur=S.skinOf(base.id),u=XY.UNLOCKS.filter(function(z){return z.kind==='skin'&&z.hero===base.id;})[0];opts=[{name:'原版',on:cur==='default',lock:false,sub:cur==='default'?'使用中':'点击换上',pd:XY.previewDef(idx,false,false),act:'skinSet',ex:{hero:base.id,skin:'default'}},{name:XY.SKINS[base.id].name,on:cur!=='default'&&ul,lock:!ul,sub:ul?(cur!=='default'?'使用中':'点击换上'):XY.condText(u),pd:XY.previewDef(idx,true,false),act:'skinSet',ex:{hero:base.id,skin:'skin'}}];}
      var rh=Math.min(port?150:130,(height-34)/opts.length);K.t(variant?'出战形态':'衣冠墨色',rx,top+24,18,T.ink,'left',true);
      opts.forEach(function(o,i){var yy=top+46+i*rh,rr=i===0?30:25,faceX=rx+rr+2;
        c.save();if(o.lock)c.globalAlpha=.42;R.drawHeroShape(c,o.pd,faceX,yy+rr+4,rr);c.restore();
        K.tf(o.name,rx+rr*2+14,yy+18,rw-rr*2-16,15,o.lock?T.inkSoft:T.ink,'left',true,11);
        K.lines(o.sub,rx+rr*2+14,yy+42,rw-rr*2-16,12,16,T.inkSoft,port?4:3,false);
        K.ink(rx+rr*2+14,yy+rh-5,Math.max(36,rw-rr*2-18),o.on?.65:.18,i+25);K.hit(rx,yy,rw,rh-4,o.act,o.ex);
      });
      XY.HEROES.concat([{id:'_variant',name:'龙马诸相'}]).forEach(function(h,i){var step=f.w/6,cx=f.x+step*(i+.5),cy=ribbonY+[8,0,10,2,7,1][i],d=XY.previewDef(Math.min(i,4),false,false);XY.hud2.face(c,{id:d.id,def:d},cx,cy+23,22,app.rt);K.tf(h.name,cx,cy+61,step-4,11.5,i===hi?'#a42d19':T.ink,'center',true,10.5);if(i===hi)K.ink(cx-18,cy+72,36,.6,i+9);K.hit(cx-step/2+2,ribbonY,step-4,88,'folio',{key:'skinHero',i:i});});
      var info=variant?XY.UNLOCK_BY.u_dragon:u;if(port&&info){var pr=S.progress(info),iy=ribbonY+113;K.t(info.name,f.x+8,iy,18,'#a42d19','left',true);iy=K.lines(info.desc||XY.condText(info),f.x+8,iy+28,f.w-16,13,19,T.inkSoft,3,false);K.tf(XY.condText(info)+' · '+pr.cur+'/'+pr.need,f.x+8,iy+20,f.w-16,12,T.inkSoft,'left',false,11);}
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
  var oBegin = P.begin; P.begin = function (c, app) { var k = oBegin(c, app); K = k; return k; };
})();
