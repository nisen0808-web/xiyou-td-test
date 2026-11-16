/* ============================================================
 * render4.js —— v0.4 新增的绘制：洞府 / 关口 / 被困者 / 天兵 / 妖塔 / 五种塔（含升级外观）/ 常驻角色头像造型 / 全新 HUD
 * 依赖 render.js 导出的 XY.R；render.js 在对应位置调用 XY.R4.*。全是浅色主题。
 * ============================================================ */
(function () {
  var XY = window.XY, C = XY.C, PI2 = Math.PI * 2, R4 = XY.R4 = { rt: 0 };
  function R() { return XY.R; }
  function ELC(e) { var o = XY.ELEMS[e]; return o ? o.color : '#888'; }
  function ELN(e) { var o = XY.ELEMS[e]; return o ? o.name : '无'; }
  function inV(G, x, y, m) { return Math.abs(x - G.cam.x) < G.view.w / 2 + m && Math.abs(y - G.cam.y) < G.view.h / 2 + m; }

  // Render-private warning lifetimes: existing attacks keep their preferred CSS
  // offset. Only new attacks (or an actual viewport resize) choose a new slot.
  var warningLabels = null, warningRuns = new WeakMap(), lastWarningLayout = [];
  var WARNING_GAP = 4, WARNING_SHIFT = 96, WARNING_LEADER = 64;
  function warningBatch(c, G, app) {
    var b = warningLabels;
    return b && b.ctx === c && b.game === G && b.app === app && b.rt === app.rt &&
      G && app.screen === 'play' && G.mode === 'play' && !app.partyPanel && !app.confirm ? b : null;
  }
  R4.beginWarningLabels = function (c, G, app) {
    warningLabels = { ctx:c, game:G, app:app, rt:app.rt, rows:[], prepared:false };
    lastWarningLayout = [];
    bossNames = {ctx:c,game:G,app:app,rt:app.rt,rows:[]}; bossNameLayout = [];
  };
  function warningBox(row, x, y) {
    return {x:x-row.record.half,y:y-row.record.above,w:row.record.half*2,h:row.record.above+row.record.below};
  }
  function warningOverlap(b, a, gap) {
    return Math.max(0, Math.min(b.x+b.w+gap,a.x+a.w)-Math.max(b.x-gap,a.x)) *
      Math.max(0, Math.min(b.y+b.h+gap,a.y+a.h)-Math.max(b.y-gap,a.y));
  }
  function warningArea(b, list) {
    var n = 0; for (var i=0;i<list.length;i++) n += warningOverlap(b,list[i],WARNING_GAP); return n;
  }
  function warningMetrics(c, row, rec) {
    var key = row.size + '|' + row.face + '|' + row.outlineWidth;
    if (rec.metrics === key) return;
    c.save(); c.font = 'bold '+row.size+'px '+row.face; c.textAlign = 'center'; c.textBaseline = 'middle';
    var half = 0, above = row.size*.5, below = row.size*.5;
    rec.samples.forEach(function (text) {
      var m = c.measureText(text);
      half = Math.max(half,m.width/2,Math.abs(m.actualBoundingBoxLeft||0),Math.abs(m.actualBoundingBoxRight||0));
      above = Math.max(above,m.actualBoundingBoxAscent||0); below = Math.max(below,m.actualBoundingBoxDescent||0);
    });
    rec.half = half + row.outlineWidth/2; rec.above = above + row.outlineWidth/2; rec.below = below + row.outlineWidth/2;
    rec.metrics = key; c.restore();
  }
  function warningRecord(c, row, state, epoch) {
    var meta = row.meta, owner = meta.owner, valid = owner && (typeof owner === 'object' || typeof owner === 'function');
    var rec = valid ? state.owners.get(owner) : null, gen = meta.generation == null ? '' : String(meta.generation);
    if (!rec || rec.generation !== gen) {
      var samples = [row.text], max = Number(meta.maxSeconds), caption = meta.caption, tail = meta.tail || '';
      // Real warning maxima are <= a few seconds. Bound malformed metadata;
      // measure every displayed tenth at birth, never resize for later ticks.
      if (caption && isFinite(max) && max >= 0 && max <= 60) {
        for (var t=0;t<=Math.ceil(max*10);t++) samples.push(caption+' · '+(t/10).toFixed(1)+'秒'+tail);
        samples.push(caption+tail);
      }
      if (!meta.rawText) samples = samples.map(function(s){ return XY.fmtStr(s); });
      rec = {generation:gen,samples:samples,serial:++state.serial,epoch:null};
      if (valid) state.owners.set(owner,rec);
    }
    row.record = rec; row.persistent = !!valid; row.saved = rec.epoch === epoch;
    warningMetrics(c,row,rec);
  }

  // Boss names and HP are one screen-space group, placed after this frame's HUD.
  // No enemy state is written, and no offscreen anchor is clamped into view.
  var bossNames = null, bossNameLayout = [], bossNameOrder = new WeakMap(), bossNameSerial = 0, bossNamePlaces = new WeakMap();
  function queueBossName(c, G, e, tp, rt) {
    var b=bossNames; if(!b||b.ctx!==c||b.game!==G)return false;
    if(e.dead||e.hidden||e.dk||!(e.hp>0))return true;
    var a=b.app,dp=a.dpr||1,m=c.getTransform(),sx=Math.hypot(m.a,m.b)/dp;
    var x=(m.a*e.x+m.c*e.y+m.e)/dp,y=(m.b*e.x+m.d*e.y+m.f)/dp,W=a.lw*a.zoom,H=a.lh*a.zoom;
    // Deliberately conservative: a center outside the viewport never gains a floating name.
    if(x<0||x>W||y<0||y>H)return true;
    if(!bossNameOrder.has(e))bossNameOrder.set(e,++bossNameSerial);
    var mult=e.maxHp/(e.baseHp||e.maxHp),timer=e.enrageT!==undefined&&!e.enraged;
    b.rows.push({enemy:e,serial:bossNameOrder.get(e),x:x,y:y,head:y-tp*sx,foot:y+e.r*.8*sx,
      body:{x:x-Math.max(e.r*1.4,tp*.55)*sx,y:y-tp*sx,w:Math.max(e.r*2.8,tp*1.1)*sx,h:(tp+e.r*.8)*sx},
      text:(e.enraged?'狂 · ':'')+e.def.name+' '+ELN(e.elem)+' +'+Math.round((mult-1)*100)+'%',
      timer:timer?'狂暴 '+XY.fmtTime(Math.max(0,e.enrageT)):null,timerColor:timer?enrageLook(e.enrageT,rt).ink:null,
      hp:e.hp,maxHp:e.maxHp,enraged:!!e.enraged});
    return true;
  }
  function bossHudBlocks(G,a,c) {
    var z=a.zoom||1,out=[];
    (XY.ui.hits||[]).concat(XY.ui.hud||[]).forEach(function(q){if(q&&q.w>0&&q.h>0)out.push({x:q.x*z,y:q.y*z,w:q.w*z,h:q.h*z});});
    if(XY.compactHud&&XY.compactHud.on(G,a)){
      var L=XY.compactHud.layout(a,G),s=XY.uiScale?XY.uiScale(a.lw*z,a.lh*z):1;
      // The full top paper and map caption are larger than their legacy HUD records.
      out.push({x:0,y:0,w:a.lw*z,h:L.head*s+3});
      (XY.ui.hud||[]).forEach(function(q){if(q.id==='minimap')out.push({x:q.x*z,y:q.y*z,w:q.w*z,h:q.h*z+11*s});});
      var back=XY.compactHud.troopBackdrop;if(back)out.push({x:back.x*s,y:back.y*s,w:back.w*s,h:back.h*s});
      if(a.shortHudDrawer&&a.shortHudDrawer.rect){var d=a.shortHudDrawer.rect;out.push({x:d.x*s,y:d.y*s,w:d.w*s,h:d.h*s});}
    }
    // Tutorial has resolved its final card position before its dimming pass.
    if(G.tut&&G.tut.lay){var t=G.tut.lay;out.push({x:t.x*z,y:t.y*z,w:t.w*z,h:t.h*z});}
    // The cat has its own existing fixed bar, drawn by its later wrapper.
    // Query that same pure layout now, never the previous frame's dkBarLayout.
    var DK=XY.devilKitty;
    if(DK&&DK.ownsFloatText&&DK.ownsFloatText(G,a)&&DK.battleBarLayout){var cat=DK.battleBarLayout(G,a,G.dkRun.rageOn,c);out.push({x:cat.x,y:cat.y,w:cat.w,h:cat.h});}
    (R4.warningLabelLayout?R4.warningLabelLayout():[]).forEach(function(q){if(q.box)out.push(q.box);});
    return out;
  }
  R4.drawBossNames = function(c,G,a){
    var batch=bossNames;bossNames=null;
    if(!batch||batch.ctx!==c||batch.game!==G||batch.app!==a||batch.rt!==a.rt||a.screen!=='play'||G.mode!=='play'||a.partyPanel||a.confirm||G.cut)return;
    var panels=bossHudBlocks(G,a,c);
    function heroes(){
      var compact=XY.compactHud&&XY.compactHud.on(G,a),protection=compact&&!XY.compactHud.layout(a,G).deployShort;
      var blocked=panels.concat(bossNameLayout.filter(function(q){return q.box;}).map(function(q){return q.box;}));
      if(R().flushHeroNames)R().flushHeroNames(c,G,a,blocked,protection,projectWarning);
    }
    if(G.tut){heroes();return;}
    var W=a.lw*a.zoom,H=a.lh*a.zoom,dp=a.dpr||1,placed=[],T=R();
    c.save();c.setTransform(dp,0,0,dp,0,0);c.globalAlpha=1;
    var rows=batch.rows.sort(function(x,y){return x.serial-y.serial;});
    rows.forEach(function(row){
      if(row.enemy.dead||row.enemy.hidden||!(row.enemy.hp>0))return;
      c.font='bold 14px '+C.FONT;
      var lines=T.wrapLines(c,row.text,Math.min(240,Math.max(140,W*.48))),tw=0;
      lines.forEach(function(t){tw=Math.max(tw,c.measureText(t).width);});
      if(row.timer)tw=Math.max(tw,c.measureText(row.timer).width);
      var w=Math.max(120,tw+8),h=lines.length*18+13+(row.timer?18:0),pseudo={record:{half:w/2,above:h/2,below:h/2}},best=null;
      var preferred={x:row.x,y:row.head-6-h/2},body=row.body,bodies=rows.map(function(r){return r.body;}),all=panels.concat(placed);
      var epoch=W+'x'+H+'x'+w+'x'+h,kept=bossNamePlaces.get(row.enemy),prior=null;
      var starts=[preferred,{x:body.x-6-w/2,y:row.y},{x:body.x+body.w+6+w/2,y:row.y},{x:row.x,y:row.foot+6+h/2}];
      if(kept&&kept.epoch===epoch)starts.unshift({x:row.x+kept.dx,y:row.y+kept.dy,kept:true});
      starts.forEach(function(start){(start.kept?[0]:[-1,0,1]).forEach(function(k){
        var q=projectWarning(pseudo,start.x,start.y+k*(h+4),all,W,H,{}),box={x:q.x-w/2,y:q.y-h/2,w:w,h:h};
        if(box.x<8||box.y<8||box.x+w>W-8||box.y+h>H-8||warningArea(box,all)>0)return;
        var bx=Math.max(body.x,Math.min(body.x+body.w,q.x)),by=Math.max(body.y,Math.min(body.y+body.h,q.y));
        var lx=Math.max(box.x,Math.min(box.x+w,bx)),ly=Math.max(box.y,Math.min(box.y+h,by)),dist=Math.hypot(lx-bx,ly-by);
        var score=warningArea(box,bodies)*.5+Math.pow(q.x-preferred.x,2)+Math.pow(q.y-preferred.y,2);
        var candidate={box:box,x:q.x,y:q.y,score:score,leader:{x0:bx,y0:by,x1:lx,y1:ly,length:dist},paper:warningArea(box,bodies)>0};
        if(start.kept)prior=candidate;
        if(!best||score<best.score)best=candidate;
      });});
      // Preserve a valid near-equivalent placement rather than flip sides every frame.
      if(prior&&best&&prior.score<=best.score+3600)best=prior;
      if(best&&best!==prior)bossNamePlaces.set(row.enemy,{epoch:epoch,dx:best.x-row.x,dy:best.y-row.y});
      var meta={id:row.enemy.id,type:row.enemy.type,text:row.text,timer:row.timer,hp:row.hp,maxHp:row.maxHp,anchor:{x:row.x,y:row.y},body:body,fontCSS:14,lines:lines,box:best&&best.box,paper:!!(best&&best.paper),reason:best?'placed':'no-free-HUD-rectangle'};
      bossNameLayout.push(meta);if(!best)return;placed.push(best.box);
      c.save();
      if(best.leader.length>3&&best.leader.length<=96&&warningArea({x:Math.min(best.leader.x0,best.leader.x1),y:Math.min(best.leader.y0,best.leader.y1),w:Math.max(1,Math.abs(best.leader.x1-best.leader.x0)),h:Math.max(1,Math.abs(best.leader.y1-best.leader.y0))},panels)===0){c.lineWidth=1;c.strokeStyle='rgba(66,47,31,.65)';c.beginPath();c.moveTo(best.leader.x0,best.leader.y0);c.lineTo(best.leader.x1,best.leader.y1);c.stroke();}c.restore();
      if(best.paper){var b=best.box;c.fillStyle='rgba(246,239,226,.91)';c.beginPath();c.moveTo(b.x,b.y+1);c.lineTo(b.x+b.w*.45,b.y);c.lineTo(b.x+b.w,b.y+1);c.lineTo(b.x+b.w-1,b.y+b.h);c.lineTo(b.x+b.w*.55,b.y+b.h-1);c.lineTo(b.x,b.y+b.h);c.closePath();c.fill();}
      var y=best.box.y+9;
      lines.forEach(function(t){T.otxt(c,t,best.x,y,14,'#24180f','center',true,'rgba(246,239,226,.96)');y+=18;});
      if(row.timer){T.otxt(c,row.timer,best.x,y,14,row.timerColor,'center',true,'rgba(246,239,226,.96)');y+=18;}
      T.bar(c,best.x-60,y-4,120,8,row.hp/row.maxHp,row.enraged?'#5c4030':'#6b5344','rgba(255,255,255,.85)');
    });
    c.restore();heroes();
  };
  R4.bossNameLayout=function(){return bossNameLayout.map(function(q){return Object.assign({},q);});};

  // Capture the actual matrix, including the world camera/shake, once per row.
  // Metadata identifies an existing attack; this renderer never writes to it.
  function warningLabel(c, text, x, y, meta) {
    var batch = warningLabels && warningLabels.ctx === c ? warningLabels : null;
    if (!batch || batch.prepared) return null;
    meta = meta || {};
    var dp = batch.app.dpr || 1, m = c.getTransform(), scale = Math.hypot(m.a,m.b)/dp;
    var row = {text:meta.rawText?text:XY.fmtStr(text),anchorX:(m.a*x+m.c*y+m.e)/dp,anchorY:(m.b*x+m.d*y+m.f)/dp,
      size:meta.size||Math.max(16,13*scale),face:meta.face||C.FONT,dpr:dp,alpha:c.globalAlpha,
      color:meta.color||'#8e2f22',outline:meta.outline||'rgba(246,239,226,0.98)',outlineWidth:meta.outlineWidth||3,meta:meta};
    batch.rows.push(row); return row;
  }
  R4.queueWarningLabel = warningLabel;
  function clampWarning(v, lo, hi) { return hi < lo ? (lo+hi)/2 : Math.max(lo,Math.min(hi,v)); }
  function projectWarning(row, x, y, reserved, W, H, sides) {
    var r = row.record, p = {x:clampWarning(x,8+r.half,W-8-r.half),y:clampWarning(y,8+r.above,H-8-r.below)};
    // A side is chosen at birth and retained. Crossing a panel edge therefore
    // projects continuously rather than flipping between its top/bottom sides.
    var constraints=reserved.slice();
    Object.keys(sides).forEach(function(key){
      if (!constraints.some(function(q,i){return (q.key||'panel'+i)===key;})) constraints.push(sides[key].box);
    });
    for (var pass=0;pass<2;pass++) for (var i=0;i<constraints.length;i++) {
      var q=constraints[i],key=q.key||'panel'+i,b=warningBox(row,p.x,p.y),kept=sides[key],side=kept&&kept.side;
      if (!side&&!warningOverlap(b,q,WARNING_GAP)) continue;
      if (!side) {
        var opts = [
          {side:'top',x:p.x,y:q.y-WARNING_GAP-r.below},
          {side:'bottom',x:p.x,y:q.y+q.h+WARNING_GAP+r.above},
          {side:'left',x:q.x-WARNING_GAP-r.half,y:p.y},
          {side:'right',x:q.x+q.w+WARNING_GAP+r.half,y:p.y}
        ], best = null;
        opts.forEach(function(o){
          o.x=clampWarning(o.x,8+r.half,W-8-r.half); o.y=clampWarning(o.y,8+r.above,H-8-r.below);
          var score=warningArea(warningBox(row,o.x,o.y),reserved)*100000+Math.pow(o.x-p.x,2)+Math.pow(o.y-p.y,2);
          if (!best||score<best.score) best={side:o.side,score:score};
        });
        side=best.side;
      }
      // Keep the chosen half-plane for this short attack lifetime, even if
      // the anchor crosses the opposite edge or the panel disappears. Merely
      // releasing it on non-intersection would snap the text across the panel.
      sides[key]={side:side,box:{x:q.x,y:q.y,w:q.w,h:q.h,key:key}};
      if (side==='top') p.y=Math.min(p.y,q.y-WARNING_GAP-r.below);
      if (side==='bottom') p.y=Math.max(p.y,q.y+q.h+WARNING_GAP+r.above);
      if (side==='left') p.x=Math.min(p.x,q.x-WARNING_GAP-r.half);
      if (side==='right') p.x=Math.max(p.x,q.x+q.w+WARNING_GAP+r.half);
      p.x=clampWarning(p.x,8+r.half,W-8-r.half); p.y=clampWarning(p.y,8+r.above,H-8-r.below);
    }
    return p;
  }
  function warningLeader(row, b) {
    var x=Math.max(b.x,Math.min(b.x+b.w,row.anchorX)),y=Math.max(b.y,Math.min(b.y+b.h,row.anchorY));
    return {x:x,y:y,length:Math.hypot(x-row.anchorX,y-row.anchorY)};
  }
  R4.prepareWarningLabels = function (c, G, app, cssReserved) {
    var b=warningBatch(c,G,app); if (!b) return [];
    if (b.prepared) return b.reserved.slice();
    b.prepared=true;
    var dp=app.dpr||1,W=c.canvas.width/dp,H=c.canvas.height/dp,epoch=W+'x'+H,state=warningRuns.get(G);
    if (!state) { state={owners:new WeakMap(),serial:0}; warningRuns.set(G,state); }
    var panels=(cssReserved||[]).filter(function(q){return q&&isFinite(q.x)&&isFinite(q.y);}).map(function(q,i){return{x:q.x,y:q.y,w:q.w,h:q.h,key:q.id||'panel'+i};});
    // lblList is backing pixels from the current axis-aligned world render.
    // It covers registered hero/map names, not every direct enemy/HUD caption.
    var names=(R4.lblList?R4.lblList():[]).map(function(q){return{x:q.x0/dp,y:q.y0/dp,w:(q.x1-q.x0)/dp,h:(q.y1-q.y0)/dp};}),placed=[];
    b.rows.forEach(function(row){warningRecord(c,row,state,epoch);});
    b.rows.sort(function(a,z){return (z.saved?1:0)-(a.saved?1:0)||a.record.serial-z.record.serial;});
    b.rows.forEach(function(row){
      var rec=row.record,p;
      if (!row.saved) {
        var ys=[0,-1,1,-2,2,-3,3],xs=[0,-1,1,-2,2],sx=Math.min(48,rec.half+WARNING_GAP),sy=rec.above+rec.below+WARNING_GAP,best=null;
        ys.forEach(function(iy){xs.forEach(function(ix){
          var dx=ix*sx,dy=iy*sy; if (Math.hypot(dx,dy)>WARNING_SHIFT) return;
          var sides={},q=projectWarning(row,row.anchorX+dx,row.anchorY+dy,panels,W,H,sides),box=warningBox(row,q.x,q.y),leader=warningLeader(row,box);
          var outside=Math.max(0,8-box.x)+Math.max(0,box.x+box.w-W+8)+Math.max(0,8-box.y)+Math.max(0,box.y+box.h-H+8);
          var score=(warningArea(box,panels)+outside)*1000000+warningArea(box,placed)*100000+warningArea(box,names)*10000+
            Math.max(0,leader.length-WARNING_LEADER)*1000000+Math.pow(q.x-row.anchorX,2)+Math.pow(q.y-row.anchorY,2);
          if(!best||score<best.score)best={x:q.x,y:q.y,dx:dx,dy:dy,sides:sides,score:score};
        });});
        rec.dx=best.dx;rec.dy=best.dy;rec.sides=best.sides;rec.epoch=epoch;p={x:best.x,y:best.y};
      } else p=projectWarning(row,row.anchorX+rec.dx,row.anchorY+rec.dy,panels,W,H,rec.sides);
      row.x=p.x;row.y=p.y;row.box=warningBox(row,p.x,p.y);row.leader=warningLeader(row,row.box);
      row.issues=[];
      if(!row.persistent)row.issues.push('missing-attack-identity');
      if(warningArea(row.box,panels)>0)row.issues.push('reserved-panel-overlap');
      if(warningArea(row.box,placed)>0)row.issues.push('warning-overlap');
      if(warningArea(row.box,names)>0)row.issues.push('registered-name-overlap');
      if(row.box.x<8||row.box.y<8||row.box.x+row.box.w>W-8||row.box.y+row.box.h>H-8)row.issues.push('viewport-overflow');
      if(row.leader.length>WARNING_LEADER)row.issues.push('anchor-too-far');
      placed.push(row.box);
    });
    lastWarningLayout=b.rows.map(function(row){return {text:row.text,serial:row.record.serial,generation:row.record.generation,
      anchor:{x:row.anchorX,y:row.anchorY},preferred:{x:row.record.dx,y:row.record.dy},x:row.x,y:row.y,
      box:{x:row.box.x,y:row.box.y,w:row.box.w,h:row.box.h},size:row.size,epoch:row.record.epoch,leaderLength:row.leader.length,issues:row.issues.slice()};});
    b.reserved=placed.concat(panels).map(function(q){return{x0:q.x*dp,y0:q.y*dp,x1:(q.x+q.w)*dp,y1:(q.y+q.h)*dp};});
    return b.reserved.slice();
  };
  R4.warningLabelLayout = function () { return lastWarningLayout.map(function(q){return {text:q.text,serial:q.serial,generation:q.generation,
    anchor:{x:q.anchor.x,y:q.anchor.y},preferred:{x:q.preferred.x,y:q.preferred.y},x:q.x,y:q.y,
    box:{x:q.box.x,y:q.box.y,w:q.box.w,h:q.box.h},size:q.size,epoch:q.epoch,leaderLength:q.leaderLength,issues:q.issues.slice()};}); };
  function paintWarningLabel(c,row) {
    c.save();c.setTransform(row.dpr,0,0,row.dpr,0,0);c.globalAlpha=row.alpha;c.globalCompositeOperation='source-over';
    // Keep the line fully connected and short. An impossible offscreen anchor
    // is reported, not hidden or linked with a misleading truncated line.
    if(row.leader.length>3&&row.leader.length<=WARNING_LEADER){
      c.strokeStyle='#8e2f22';c.lineWidth=1;c.lineCap='round';c.beginPath();c.moveTo(row.anchorX,row.anchorY);c.lineTo(row.leader.x,row.leader.y);c.stroke();
    }
    c.font='bold '+row.size+'px '+row.face;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
    c.lineWidth=row.outlineWidth;c.strokeStyle=row.outline;c.fillStyle=row.color;
    c.strokeText(row.text,row.x,row.y);c.fillText(row.text,row.x,row.y);c.restore();
  }
  R4.drawWarningLabels = function (c,G,app) {
    var b=warningBatch(c,G,app);if(b&&!b.prepared)R4.prepareWarningLabels(c,G,app);
    warningLabels=null;
    if(!b){lastWarningLayout=[];return;}
    for(var i=0;i<b.rows.length;i++)paintWarningLabel(c,b.rows[i]);
  };

  // 朱砂预警共用干笔边缘：固定种子，仅在真实边界内侧的窄带落笔。
  // len=0 是圆，len>0 是胶囊；保留连续细外沿表示准确范围。
  function dangerEdgePath(c, r, len) {
    c.moveTo(0, -r); c.lineTo(len, -r);
    c.arc(len, 0, r, -Math.PI / 2, Math.PI / 2);
    c.lineTo(0, r); c.arc(0, 0, r, Math.PI / 2, Math.PI * 1.5); c.closePath();
  }
  function dangerInkEdge(c, r, len) {
    var P = XY.INKP; if (!P || !P.stroke || !P.hash || r < 5) return;
    var band = Math.min(8, r * .3), inset = band * .48, rr = r - inset;
    var perimeter = len * 2 + PI2 * rr, n = Math.max(8, Math.min(18, Math.ceil(perimeter / 65)));
    function point(t) {
      var d = t * perimeter;
      if (d < len) return [d, -rr];
      d -= len;
      if (d < Math.PI * rr) { var a = -Math.PI / 2 + d / rr; return [len + Math.cos(a) * rr, Math.sin(a) * rr]; }
      d -= Math.PI * rr;
      if (d < len) return [len - d, rr];
      var a = Math.PI / 2 + (d - len) / rr; return [Math.cos(a) * rr, Math.sin(a) * rr];
    }
    c.save(); c.beginPath(); dangerEdgePath(c, r, len); dangerEdgePath(c, r - band, len); c.clip('evenodd');
    for (var i = 0; i < n; i++) {
      var seed = 613 + i * 19, t0 = (i + .07 + P.hash(i, 31) * .12) / n;
      var t1 = Math.min(1, t0 + (.57 + P.hash(i, 47) * .27) / n);
      var a = point(t0), b = point(t1), m = point((t0 + t1) * .5);
      var dx = b[0] - a[0], dy = b[1] - a[1], dist = Math.hypot(dx, dy) || 1;
      var bend = 2 * ((m[0] - (a[0] + b[0]) * .5) * -dy + (m[1] - (a[1] + b[1]) * .5) * dx) / (dist * dist);
      P.stroke(c, a[0], a[1], b[0], b[1], band * (.28 + P.hash(i, 59) * .18), '153,39,24', .58, seed, bend);
      // 稀薄细笔与主笔错开，留下透明飞白，不铺纸色或额外墨团。
      if (i % 2 === 0) P.stroke(c, a[0], a[1], m[0], m[1], band * .09, '121,33,23', .30, seed + 7, bend * .5);
    }
    c.restore();
  }
  // 渐变、实际范围、进度角度和倒计时不变；笔触不读取时间或随机数。
  R4.dangerCircle = function (c, x, y, radius, progress, seconds, label, identity) {
    var r = Math.max(1, radius), p = Math.max(0, Math.min(1, progress || 0));
    c.save(); c.translate(x, y);
    var g = c.createRadialGradient(0, 0, r * .1, 0, 0, r);
    g.addColorStop(0, 'rgba(166,42,27,.025)');
    g.addColorStop(.72, 'rgba(166,42,27,.055)');
    g.addColorStop(1, 'rgba(166,42,27,' + (.16 + .10 * p) + ')');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, PI2); c.fill();
    c.lineCap = 'round'; c.lineJoin = 'round';
    dangerInkEdge(c, r, 0);
    c.strokeStyle = 'rgba(121,33,23,.72)'; c.lineWidth = 1.2;
    c.beginPath(); c.arc(0, 0, r, 0, PI2); c.stroke();
    // 收笔进度沿外沿推进，不再用大块红色扇形遮住敌我角色。
    c.strokeStyle = '#a52e20'; c.lineWidth = 3.6;
    c.beginPath(); c.arc(0, 0, Math.max(1, r - 2), -Math.PI / 2, -Math.PI / 2 + PI2 * p); c.stroke();
    if (label) {
      var text = label + (isFinite(seconds) ? ' · ' + Math.max(0, seconds).toFixed(1) + '秒' : '');
      warningLabel(c, text, 0, r + 17, Object.assign({caption:label},identity||{}));
    }
    c.restore();
  };
  R4.dangerLane = function (c, x, y, dx, dy, length, width, progress) {
    var len = Math.max(1, length), w = Math.max(2, width), p = Math.max(0, Math.min(1, progress || 0));
    c.save(); c.translate(x, y); c.rotate(Math.atan2(dy, dx));
    var g = c.createLinearGradient(0, -w / 2, 0, w / 2);
    g.addColorStop(0, 'rgba(164,43,26,.20)'); g.addColorStop(.2, 'rgba(164,43,26,.07)');
    g.addColorStop(.8, 'rgba(164,43,26,.07)'); g.addColorStop(1, 'rgba(164,43,26,.20)');
    c.fillStyle = g; c.beginPath();
    c.moveTo(0, -w / 2); c.lineTo(len, -w / 2);
    c.arc(len, 0, w / 2, -Math.PI / 2, Math.PI / 2);
    c.lineTo(0, w / 2); c.arc(0, 0, w / 2, Math.PI / 2, Math.PI * 1.5); c.closePath(); c.fill();
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(130,35,24,.78)'; c.lineWidth = 1.2;
    c.beginPath(); c.arc(0, 0, w / 2, Math.PI / 2, Math.PI * 1.5); c.stroke();
    c.beginPath(); c.arc(len, 0, w / 2, -Math.PI / 2, Math.PI / 2); c.stroke();
    for (var side = -1; side <= 1; side += 2) {
      c.strokeStyle = 'rgba(130,35,24,.78)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(0, side * w / 2); c.lineTo(len, side * w / 2); c.stroke();

    }
    dangerInkEdge(c, w / 2, len);
    // 短朱砂箭笔说明冲刺方向；箭笔在预告带内，不扩大判定。
    c.strokeStyle = 'rgba(142,35,23,' + (.28 + p * .28) + ')'; c.lineWidth = 2;
    for (var j = 1; j < 5; j++) {
      var ax = len * j / 5, ah = Math.min(w * .22, 12);
      c.beginPath(); c.moveTo(ax - ah, -ah); c.lineTo(ax, 0); c.lineTo(ax - ah, ah); c.stroke();
    }
    c.restore();
  };

  /* ================= 常驻角色：头像（圆形）+ 边框 + 程序画的身体 / 光环 ================= */
  // 头像圆盘：有图片画图片，没有就画“首字”占位（颜色取角色色）
  // 触屏浮动摇杆（屏幕坐标，浅色）：底圈在手指按下处，圆钮跟着手指（最远 64）
  R4.joy = function (c, app) {
    var j = app.joy; if (!j || !j.moved) return;
    var kx = j.p0.x + j.ux * j.k * 64, ky = j.p0.y + j.uy * j.k * 64;
    c.save();
    c.globalAlpha = 0.55; c.beginPath(); c.arc(j.p0.x, j.p0.y, 64, 0, PI2); c.fillStyle = '#fff8e0'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#c9a24a'; c.stroke();
    c.globalAlpha = 0.9; c.beginPath(); c.arc(kx, ky, 26, 0, PI2); c.fillStyle = '#ffd77a'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#b8863b'; c.stroke();
    c.restore();
  };
  R4.avatarDisc = function (c, def, x, y, r, rt) {
    var img = def.xid ? XY.xchar.img(def.xid) : (XY.avatar ? XY.avatar(def.id) : null); if (def.xid && img) XY.xchar.drawnAvatar++;   // v0.8.1：自建角色用它自己的头像
    c.save();
    c.beginPath(); c.arc(x, y, r, 0, PI2); c.clip();
    if (img) { c.drawImage(img, x - r, y - r, r * 2, r * 2); }
    else {
      var g = c.createLinearGradient(x, y - r, x, y + r); g.addColorStop(0, def.frame || '#fff'); g.addColorStop(1, def.color);
      c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
      c.font = 'bold ' + Math.round(r * 1.1) + 'px ' + C.FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(def.name.charAt(0), x, y + r * 0.06);
    }
    c.restore();
    // 外框：双圈 + 四颗元素色宝石；觉醒（Lv5）加金色外圈
    c.lineWidth = Math.max(2, r * 0.16); c.strokeStyle = def.dark; c.beginPath(); c.arc(x, y, r + c.lineWidth * 0.4, 0, PI2); c.stroke();
    c.lineWidth = Math.max(1.2, r * 0.08); c.strokeStyle = def.frame || '#fff'; c.beginPath(); c.arc(x, y, r + c.lineWidth * 2.4, 0, PI2); c.stroke();
    if (def.awakened && !R4.xfDraw) { c.lineWidth = Math.max(1.5, r * 0.1); c.strokeStyle = '#f0b429'; c.beginPath(); c.arc(x, y, r + r * 0.42, 0, PI2); c.stroke(); }
    var ec = ELC(def.elem);
    for (var k = 0; k < 4; k++) {
      var a = k * Math.PI / 2 + Math.PI / 4, gx = x + Math.cos(a) * (r + r * 0.28), gy = y + Math.sin(a) * (r + r * 0.28);
      c.fillStyle = ec; c.strokeStyle = '#fff'; c.lineWidth = 1; c.beginPath(); c.arc(gx, gy, Math.max(1.8, r * 0.13), 0, PI2); c.fill(); c.stroke();
    }
    /* v0.9 联动：已解锁头像框（万箭金框等）画在特殊角色圆头像外圈；无框时与现在一样 */
    if (!R4.xfDraw && !R4._noCosFrame && XY.VD && XY.VD.activeFrame) { var _cf = XY.VD.activeFrame(); if (_cf) XY.VD.drawFrame(c, x, y, r, _cf); }
  };
  R4.specialShape = function (c, def, x, y, r) {
    var rt = R4.rt, ec = ELC(def.elem), arch = def.arch, pul = 0.5 + 0.5 * Math.sin(rt * 3 + def.hp);
    // 元素光环
    if (!R4.xfDraw) {                                  // 变身中不画这圈元素光环（用户要求：变身形象头上不要光环）
    var g = c.createRadialGradient(x, y, r * 0.3, x, y, r * 2.0); g.addColorStop(0, ec + '66'); g.addColorStop(1, ec + '00');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r * (1.9 + pul * 0.12), 0, PI2); c.fill();
    }
    c.lineJoin = 'round';
    // 身体：披风 + 腰带
    c.fillStyle = def.color; c.strokeStyle = def.dark; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x - r * 0.55, y + r * 0.2); c.lineTo(x + r * 0.55, y + r * 0.2); c.lineTo(x + r * 0.95, y + r * 1.05); c.lineTo(x - r * 0.95, y + r * 1.05); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = def.frame || '#fff'; c.fillRect(x - r * 0.52, y + r * 0.5, r * 1.04, r * 0.14);
    // 不同玩法的小标志
    c.strokeStyle = def.dark; c.fillStyle = ec; c.lineWidth = 1.6;
    if (arch === 'dash') { for (var i = 0; i < 3; i++) { var a = rt * 3 + i * PI2 / 3; c.beginPath(); c.arc(x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 0.8 + r * 0.2, r * 0.18, 0, PI2); c.fill(); c.stroke(); } }
    else if (arch === 'heal') { c.beginPath(); c.moveTo(x + r * 1.1, y + r * 0.1); c.quadraticCurveTo(x + r * 1.45, y + r * 0.6, x + r * 1.1, y + r * 0.85); c.quadraticCurveTo(x + r * 0.75, y + r * 0.6, x + r * 1.1, y + r * 0.1); c.fill(); c.stroke(); }
    else if (arch === 'mark') { c.beginPath(); c.arc(x + r * 1.15, y + r * 0.5, r * 0.7, -1.2, 1.2); c.stroke(); c.beginPath(); c.moveTo(x + r * 1.15 + Math.cos(-1.2) * r * 0.7, y + r * 0.5 + Math.sin(-1.2) * r * 0.7); c.lineTo(x + r * 1.15 + Math.cos(1.2) * r * 0.7, y + r * 0.5 + Math.sin(1.2) * r * 0.7); c.stroke(); }
    else if (arch === 'tank') { rrectS(c, x - r * 1.45, y + r * 0.25, r * 0.8, r * 1.0, r * 0.2); c.fill(); c.stroke(); }
    else if (arch === 'storm') { c.beginPath(); c.moveTo(x + r * 1.2, y - r * 0.2); c.lineTo(x + r * 0.95, y + r * 0.45); c.lineTo(x + r * 1.25, y + r * 0.45); c.lineTo(x + r * 1.0, y + r * 1.2); c.stroke(); }
    // 头像
    R4.avatarDisc(c, def, x, y - r * 0.4, r * 0.95, rt);
    if (def.awakened && !R4.xfDraw) { c.fillStyle = '#f0b429'; c.strokeStyle = '#a8700a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - r * 0.6, y - r * 1.5); c.lineTo(x - r * 0.3, y - r * 1.9); c.lineTo(x, y - r * 1.55); c.lineTo(x + r * 0.3, y - r * 1.9); c.lineTo(x + r * 0.6, y - r * 1.5); c.closePath(); c.fill(); c.stroke(); }
  };
  function rrectS(c, x, y, w, h, r) { R().rrect(c, x, y, w, h, r); }

  /* ================= 世界：洞府 / 关口 / 被困者 / 宝物 ================= */

  // 地标透明原画按每格的 alpha 包围盒缩放，人物与建筑都以脚底落地。
  // 解码期间只显示小印记，避免闪回旧的三角门、方块人和棚顶。
  var propImages = {}, propCells = {};
  // BEGIN GENERATED ART ALPHA v1
  var staticArtAlpha = {"version":1,"records":[{"id":"landmarks","src":"assets/art/world-props/landmarks.png","sha256":"e333361570b2a912e2426cf15565d0dc596371f6ec6b12903e399b813d67950f","width":1254,"height":1254,"threshold":32,"specs":[{"left":0,"right":627,"top":0,"bottom":627},{"left":627,"right":1254,"top":0,"bottom":627},{"left":0,"right":627,"top":627,"bottom":1254},{"left":627,"right":1254,"top":627,"bottom":1254}],"bounds":[{"x":17,"y":10,"w":610,"h":579,"x1":626,"y1":588},{"x":650,"y":50,"w":596,"h":534,"x1":1245,"y1":583},{"x":159,"y":645,"w":324,"h":591,"x1":482,"y1":1235},{"x":749,"y":649,"w":375,"h":583,"x1":1123,"y1":1231}]},{"id":"denrock","src":"assets/art/bg-ink/rock_a.webp","sha256":"292c4d04432f7c1c598b25c330fb4e995d55d541a8e07a8ffd9becc8349adf5b","width":717,"height":333,"threshold":32,"specs":[{"left":0,"right":717,"top":0,"bottom":333}],"bounds":[{"x":0,"y":0,"w":716,"h":333,"x1":715,"y1":332}]},{"id":"undead","src":"assets/art/undead-ink/atlas.webp","sha256":"0a0c85f38f451d87c697cfb13e748a65dd9ef3f57b1dd23562306fd7443afbe4","width":1199,"height":1312,"threshold":40,"specs":[{"left":0,"right":300,"top":0,"bottom":300,"emptyOrigin":true},{"left":300,"right":600,"top":0,"bottom":300,"emptyOrigin":true},{"left":600,"right":900,"top":0,"bottom":300,"emptyOrigin":true},{"left":900,"right":1199,"top":0,"bottom":300,"emptyOrigin":true},{"left":0,"right":300,"top":300,"bottom":602,"emptyOrigin":true},{"left":300,"right":600,"top":300,"bottom":602,"emptyOrigin":true},{"left":600,"right":900,"top":300,"bottom":602,"emptyOrigin":true},{"left":900,"right":1199,"top":300,"bottom":602,"emptyOrigin":true},{"left":0,"right":300,"top":602,"bottom":960,"emptyOrigin":true},{"left":300,"right":600,"top":602,"bottom":960,"emptyOrigin":true},{"left":600,"right":900,"top":602,"bottom":960,"emptyOrigin":true},{"left":900,"right":1199,"top":602,"bottom":960,"emptyOrigin":true},{"left":0,"right":300,"top":960,"bottom":1312,"emptyOrigin":true},{"left":300,"right":600,"top":960,"bottom":1312,"emptyOrigin":true},{"left":600,"right":900,"top":960,"bottom":1312,"emptyOrigin":true},{"left":900,"right":1199,"top":960,"bottom":1312,"emptyOrigin":true}],"bounds":[{"x":17,"y":11,"w":268,"h":275,"x1":284,"y1":285},{"x":318,"y":26,"w":251,"h":257,"x1":568,"y1":282},{"x":620,"y":12,"w":280,"h":271,"x1":899,"y1":282},{"x":900,"y":33,"w":296,"h":267,"x1":1195,"y1":299},{"x":21,"y":308,"w":216,"h":278,"x1":236,"y1":585},{"x":314,"y":323,"w":216,"h":264,"x1":529,"y1":586},{"x":610,"y":308,"w":290,"h":277,"x1":899,"y1":584},{"x":900,"y":300,"w":260,"h":288,"x1":1159,"y1":587},{"x":18,"y":603,"w":282,"h":357,"x1":299,"y1":959},{"x":300,"y":621,"w":300,"h":314,"x1":599,"y1":934},{"x":600,"y":603,"w":300,"h":357,"x1":899,"y1":959},{"x":900,"y":619,"w":290,"h":312,"x1":1189,"y1":930},{"x":12,"y":960,"w":288,"h":328,"x1":299,"y1":1287},{"x":300,"y":973,"w":300,"h":313,"x1":599,"y1":1285},{"x":600,"y":960,"w":300,"h":327,"x1":899,"y1":1286},{"x":900,"y":964,"w":287,"h":322,"x1":1186,"y1":1285}]}]};
  // END GENERATED ART ALPHA v1
  // A timed-out Image can still have a pending network request. Only an
  // explicit retry of a failed record gets a fresh URL; identity stays src.
  function propRetrySource(src) {
    if (/^(data:|blob:)/i.test(src)) return src;
    var hash = src.indexOf('#'), tail = hash < 0 ? '' : src.slice(hash), base = hash < 0 ? src : src.slice(0, hash);
    return base + (base.indexOf('?') < 0 ? '?' : '&') + 'xy_art_retry=' + Date.now().toString(36) + '-' + (++propRetries) + tail;
  }
  // Read-only alpha bounds preparation: keep the original Image as drawable.
  // JS pixels are sliced; decode and native canvas calls have no hard4ms bound.
  function scanArtAlpha(im, rectangles, threshold, current) {
    var done = false, timer = null, channel = null, queued = false, resolveJob, rejectJob, cv, cc, specs, bounds = [], index = 0, row = 0, pixels, stripH, cursor = 0;
    var stage = 'decode', active, x0, y0, x1, y1;
    var promise = new Promise(function (yes, no) { resolveJob = yes; rejectJob = no; });
    function closeTasks() {
      if (timer !== null) { clearTimeout(timer); timer = null; }
      queued = false;
      if (channel) { channel.port1.onmessage = null; channel.port1.close(); channel.port2.close(); channel = null; }
    }
    function cancel(error) {
      if (done) return; done = true; closeTasks();
      pixels = cv = cc = null; rejectJob(error);
    }
    function live() { return !done && current(); }
    function queue() {
      if (!live()) { if (!done) cancel(new Error('素材准备已失效')); return; }
      if (channel) { queued = true; try { channel.port2.postMessage(0); } catch (error) { cancel(error); } }
      else timer = setTimeout(step, 0); // Compatibility path; no startup performance claim.
    }
    function beginCell() {
      active = specs[index]; row = active.top; x0 = active.right; y0 = active.bottom;
      x1 = active.emptyOrigin ? active.left : active.left - 1; y1 = active.emptyOrigin ? active.top : active.top - 1;
      stage = 'read';
    }
    function step() {
      timer = null;
      if (!live()) { if (!done) cancel(new Error('素材准备已失效')); return; }
      try {
        if (stage === 'decode') {
          var decoded = im.decode ? im.decode() : Promise.resolve();
          Promise.resolve(decoded).then(function () { stage = 'canvas'; queue(); }, cancel); return;
        }
        if (stage === 'canvas') {
          if (!im.complete || !im.naturalWidth || !im.naturalHeight) throw new Error('图片无有效尺寸');
          cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight;
          cc = cv.getContext('2d', { willReadFrequently: true }); specs = rectangles(cv.width, cv.height); stage = 'draw'; queue(); return;
        }
        if (stage === 'draw') { cc.drawImage(im, 0, 0); beginCell(); queue(); return; }
        if (stage === 'read') {
          stripH = Math.min(32, active.bottom - row);
          pixels = cc.getImageData(active.left, row, active.right - active.left, stripH).data;
          cursor = 0; stage = 'scan'; queue(); return;
        }
        var start = performance.now(), units = 0, width = active.right - active.left, count = width * stripH;
        while (cursor < count) {
          if (pixels[cursor * 4 + 3] >= threshold) {
            var x = active.left + cursor % width, y = row + Math.floor(cursor / width);
            x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
          }
          cursor++;
          if (++units >= 32768 || (units % 128 === 0 && performance.now() - start >= 4)) break;
        }
        if (cursor < count) { queue(); return; }
        pixels = null; row += stripH;
        if (row < active.bottom) stage = 'read';
        else {
          bounds.push({ x:x0, y:y0, w:x1-x0+1, h:y1-y0+1, x1:x1, y1:y1 }); index++;
          if (index < specs.length) beginCell();
          else { done = true; closeTasks(); cv = cc = null; resolveJob(bounds); return; }
        }
        queue();
      } catch (error) { cancel(error); }
    }
    if (typeof MessageChannel === 'function') {
      try { channel = new MessageChannel(); channel.port1.onmessage = function () { if (!queued || done) return; queued = false; step(); }; }
      catch (error) { closeTasks(); }
    }
    queue(); return { promise:promise, cancel:cancel };
  }
  // Exact fixed-source identity; dynamic/custom sources retain the scanner.
  function artAlphaRecord(src) {
    if (!staticArtAlpha || staticArtAlpha.version !== 1 || !Array.isArray(staticArtAlpha.records)) return null;
    for (var i = 0; i < staticArtAlpha.records.length; i++) {
      var rec = staticArtAlpha.records[i];
      if (rec && rec.src === src && /^[a-f0-9]{64}$/.test(rec.sha256)) return rec;
    }
    return null;
  }
  function artAlphaSource(src) {
    var rec = artAlphaRecord(src);
    return rec ? src + '?xy_art_sha=' + rec.sha256 : src;
  }
  function prepareArtAlpha(im, src, rectangles, threshold, current) {
    var rec = artAlphaRecord(src);
    if (!rec) return scanArtAlpha(im, rectangles, threshold, current);
    var done = false, fallback = null, rejectJob;
    var promise = new Promise(function (resolve, reject) {
      rejectJob = reject;
      var decoded;
      try { decoded = im.decode ? im.decode() : Promise.resolve(); }
      catch (error) { done = true; reject(error); return; }
      Promise.resolve(decoded).then(function () {
        if (done) return;
        if (!current()) { done = true; reject(new Error('素材准备已失效')); return; }
        if (!im.complete || !im.naturalWidth || !im.naturalHeight) { done = true; reject(new Error('图片无有效尺寸')); return; }
        var specs = rectangles(im.naturalWidth, im.naturalHeight);
        var valid = rec.width === im.naturalWidth && rec.height === im.naturalHeight && rec.threshold === threshold &&
          Array.isArray(rec.specs) && Array.isArray(rec.bounds) && rec.specs.length === specs.length && rec.bounds.length === specs.length;
        for (var i = 0; valid && i < specs.length; i++) {
          var a = specs[i], b = rec.specs[i], v = rec.bounds[i];
          valid = b && a.left === b.left && a.right === b.right && a.top === b.top && a.bottom === b.bottom && !!a.emptyOrigin === !!b.emptyOrigin &&
            v && [v.x,v.y,v.w,v.h,v.x1,v.y1].every(Number.isInteger) && v.w === v.x1-v.x+1 && v.h === v.y1-v.y+1 &&
            v.x >= a.left && v.x <= a.right && v.y >= a.top && v.y <= a.bottom && v.x1 >= a.left-1 && v.x1 < a.right && v.y1 >= a.top-1 && v.y1 < a.bottom;
        }
        if (valid) {
          done = true;
          resolve(rec.bounds.map(function (b) { return {x:b.x,y:b.y,w:b.w,h:b.h,x1:b.x1,y1:b.y1}; }));
        } else {
          fallback = scanArtAlpha(im, rectangles, threshold, current);
          fallback.promise.then(function (bounds) { if (!done) { done = true; resolve(bounds); } }, function (error) { if (!done) { done = true; reject(error); } });
        }
      }, function (error) { if (!done) { done = true; reject(error); } }).catch(function (error) { if (!done) { done = true; reject(error); } });
    });
    return { promise:promise, cancel:function (error) {
      if (done) return; done = true;
      if (fallback) fallback.cancel(error);
      rejectJob(error);
    } };
  }
  function loadPropSheet(id, src, names, cols, rows, retry) {
    var previous = propImages[id]; if (previous && previous.cancel) previous.cancel();
    var versionedSrc = artAlphaSource(src);
    var requestSrc = retry ? propRetrySource(versionedSrc) : versionedSrc;
    var im = new Image(), entry = propImages[id] = { image: im, state: 'loading', src: src, requestSrc: requestSrc };
    var resolveLoad, rejectLoad, settled = false, scan = null;
    entry.promise = new Promise(function (resolve, reject) { resolveLoad = resolve; rejectLoad = reject; });
    // Background failures stay cached for the explicit existing preparation gate.
    entry.promise.catch(function () {});
    var timer = setTimeout(function () { finish(false, 'timeout'); }, 15000);
    function current() { return !settled && propImages[id] === entry; }
    function finish(ok, why) {
      if (settled) return;
      if (ok && propImages[id] !== entry) { ok = false; why = '素材准备已失效'; }
      settled = true; clearTimeout(timer); im.onload = im.onerror = null;
      entry.state = ok ? 'ready' : 'error'; entry.error = why || '';
      if (!ok && scan) scan.cancel(new Error(id + ': ' + entry.error)); scan = null;
      if (ok) resolveLoad(entry); else rejectLoad(new Error(id + ': ' + entry.error));
    }
    entry.cancel = function () { finish(false, '素材准备已失效'); };
    im.onload = function () {
      if (settled || scan) return;
      scan = prepareArtAlpha(im, src, function (w, h) {
        return names.map(function (name, index) {
          return { left:Math.floor(index % cols * w / cols), right:Math.floor((index % cols + 1) * w / cols),
            top:Math.floor(Math.floor(index / cols) * h / rows), bottom:Math.floor((Math.floor(index / cols) + 1) * h / rows) };
        });
      }, 32, current);
      scan.promise.then(function (bounds) {
        if (!current()) { finish(false, '素材准备已失效'); return; }
        if (bounds.some(function (b) { return b.w <= 0 || b.h <= 0; })) { finish(false, 'empty art cell'); return; }
        names.forEach(function (name, i) { var b = bounds[i]; propCells[name] = { image:im, x:b.x, y:b.y, w:b.w, h:b.h }; });
        finish(true);
      }, function (error) { finish(false, String(error.message || error)); });
    };
    im.onerror = function () { finish(false, 'load error'); };
    try { im.src = requestSrc; } catch (error) { finish(false, String(error.message || error)); }
  }
  function minerBodyRequired(context) {
    if (context && (context.villain || context.lair)) return false;
    var id = context && Object.prototype.hasOwnProperty.call(context, 'carry')
      ? context.carry : XY.save && XY.save.carryId && XY.save.carryId();
    return id === 'kuanggong';
  }
  function requiredGroundArt(context) {
    var ids = context && context.villain ? [] : ['wujing', 'bajie', 'wukong'];
    if (minerBodyRequired(context)) ids.push('kuanggong');
    return ids.map(function (id) { return { id:id, art:XY[id + 'GroundArt'] }; });
  }
  var propPanel = null, propGate = 0, propRetries = 0;
  R4.worldProps = {
    images: propImages,
    cells: propCells,
    preload: function (retry, context) {
      // Join the actual layered-body caches before the first simulation step.
      // Villain has no disciples; lair keeps disciples but no carried special.
      requiredGroundArt(context).forEach(function (owner) {
        var art = owner.art;
        if (art && art.prepare && (retry || !art.ready())) art.prepare(!!retry).catch(function () {});
      });
      if (XY.prepareBgPaint) XY.prepareBgPaint(!!retry).catch(function () {});
      if (R4.preloadUndead) R4.preloadUndead(!!retry);
      // Full and split entries share the actual soldier-image cache. A failed
      // background preload stays failed until the player's explicit retry.
      if (XY.SINK_DATA && XY.SINK && XY.SINK.prepare && (retry || !XY.SINK.ready())) XY.SINK.prepare(!!retry).catch(function () {});
      if (!propImages.landmarks || (retry && propImages.landmarks.state === 'error')) {
        loadPropSheet('landmarks', 'assets/art/world-props/landmarks.png', ['gate', 'pavilion', 'tudi', 'cage'], 2, 2, !!propImages.landmarks);
      }
      if (!propImages.denrock || (retry && propImages.denrock.state === 'error')) loadPropSheet('denrock', 'assets/art/bg-ink/rock_a.webp', ['denrock'], 1, 1, !!propImages.denrock);
      if (XY.XC_TPL && XY.XC_TPL.scholar && (!propImages.villager || (retry && propImages.villager.state === 'error'))) {
        loadPropSheet('villager', XY.XC_TPL.scholar.src, ['villager'], 1, 1, !!propImages.villager);
      }
    },
    ready: function (context) {
      return !!(propImages.landmarks && propImages.landmarks.state === 'ready' && propImages.denrock && propImages.denrock.state === 'ready' &&
        (!(XY.XC_TPL && XY.XC_TPL.scholar) || (propImages.villager && propImages.villager.state === 'ready')) && undeadInk && undeadInk.cells &&
        (!XY.SINK_DATA || !XY.SINK || !XY.SINK.ready || XY.SINK.ready()) && (!XY.bgPaintReady || XY.bgPaintReady()) &&
        requiredGroundArt(context).every(function (owner) { return owner.art && owner.art.ready && owner.art.ready(); }));
    },
    // Passive background state for the lazy-done departure page only. SINK is
    // already validated by lazy.done; explicit retries keep the full-screen gate.
    pending: function (context) {
      var states = Object.keys(propImages).map(function (id) { return propImages[id].state; });
      requiredGroundArt(context).forEach(function (owner) {
        var state = owner.art && owner.art.state ? owner.art.state() : 'failed';
        states.push(state === 'failed' ? 'error' : state);
      });
      var terrain = XY.bgPaintState ? XY.bgPaintState() : 'idle';
      if (states.indexOf('error') >= 0 || (undeadInk && undeadInk.state === 'error') || terrain === 'error') return false;
      return states.indexOf('loading') >= 0 || !!(undeadInk && undeadInk.state === 'loading') || terrain === 'pending';
    },
    active: function () { return !!propPanel; },
    cancel: function () { ++propGate; if (propPanel) propPanel.remove(); propPanel = null; },
    enter: function (next, retry, context) {
      if (R4.worldProps.ready(context)) { R4.worldProps.cancel(); next(); return; }
      var token = ++propGate;
      if (!propPanel) {
        propPanel = document.createElement('div'); propPanel.id = 'worldArtStatus'; propPanel.setAttribute('role', 'status');
        propPanel.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(246,238,220,.98);color:#342c23;display:flex;align-items:center;justify-content:center;flex-direction:column;font:20px serif;gap:20px;text-align:center;padding:24px';
        document.body.appendChild(propPanel);
      }
      propPanel.replaceChildren(); var label = document.createElement('div'); label.textContent = '正在准备场景、角色与天兵'; propPanel.appendChild(label);
      var progress = document.createElement('progress'); progress.setAttribute('aria-label', '场景与天兵素材载入中'); progress.style.cssText = 'width:min(320px,80vw);height:8px;accent-color:#a83b2c'; propPanel.appendChild(progress);
      function button(text, fn) { var b = document.createElement('button'); b.textContent = text; b.style.cssText = 'min-width:144px;min-height:48px;background:#953b2b;color:#fff5df;border:0;font:20px serif'; b.onclick = fn; propPanel.appendChild(b); return b; }
      button('暂不出发', R4.worldProps.cancel);
      R4.worldProps.preload(retry, context);
      var pending = [propImages.landmarks.promise, propImages.denrock.promise]; if (propImages.villager) pending.push(propImages.villager.promise);
      pending.push(R4.preloadUndead());
      // preload(retry) above rebuilds failed records once; this call joins the
      // same attempt so stale/cancelled callbacks cannot authorize a battle.
      if (XY.SINK_DATA && XY.SINK && XY.SINK.prepare) pending.push(XY.SINK.prepare(false));
      requiredGroundArt(context).forEach(function (owner) {
        pending.push(owner.art && owner.art.prepare ? owner.art.prepare(false) : Promise.reject(new Error(owner.id + ' 动作模块未载入')));
      });
      if (XY.prepareBgPaint) pending.push(XY.prepareBgPaint(false));
      Promise.all(pending).then(function () {
        if (token !== propGate) return;
        propPanel.remove(); propPanel = null; next();
      }, function () {
        if (token !== propGate) return;
        propPanel.replaceChildren(); label.textContent = '场景、角色或天兵素材未能载入，请重试。'; propPanel.appendChild(label);
        var retryButton = button('重新载入', function () { R4.worldProps.enter(next, true, context); });
        retryButton.focus();
        requestAnimationFrame(function () {
          if (token === propGate && propPanel && retryButton.isConnected) retryButton.focus();
        });
        button('暂不出发', R4.worldProps.cancel);
      });
    },
    draw: function (c, name, x, footY, maxW, maxH, alpha) {
      if (name === 'villager' && !propImages.villager && XY.XC_TPL && XY.XC_TPL.scholar) {
        loadPropSheet('villager', XY.XC_TPL.scholar.src, ['villager'], 1, 1);
      }
      if (name !== 'villager') R4.worldProps.preload();
      var cell = propCells[name]; if (!cell) return false;
      var k = Math.min(maxW / cell.w, maxH / cell.h), w = cell.w * k, h = cell.h * k;
      c.save(); c.globalAlpha *= alpha == null ? 1 : alpha; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.drawImage(cell.image, cell.x, cell.y, cell.w, cell.h, x - w / 2, footY - h, w, h); c.restore();
      return { w: w, h: h };
    },
    glyph: function (c, text, x, y) {
      c.save(); c.strokeStyle = 'rgba(94,75,51,0.55)'; c.lineWidth = 1.2;
      c.beginPath(); c.arc(x, y, 15, 0, PI2); c.stroke();
      R().txt(c, text, x, y, 16, '#6e5940', 'center', true); c.restore();
    }
  };

  // 所有关卡的洞府共用水墨岩体；以两倍像素烘焙，逻辑尺寸与命中/牌匾位置一致。
  var denCache = {};
  function sr(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function bakeDen(alive, theme) {
    var cell = propCells.denrock; if (!cell) return null;
    var W = 320, H = 200, cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2;
    var c = cv.getContext('2d'); c.scale(2, 2); c.translate(180, 140); c.imageSmoothingQuality = 'high';
    // Keep the recess inside the central authored rock face. Its floor ends
    // above the rock's y+24 baseline, never below it as a detached black door.
    var mouth = c.createLinearGradient(0, -51, 0, 14);
    mouth.addColorStop(0, alive ? 'rgba(33,38,32,.92)' : 'rgba(95,100,89,.28)');
    mouth.addColorStop(.63, alive ? 'rgba(43,47,38,.86)' : 'rgba(117,118,103,.18)');
    mouth.addColorStop(1, 'rgba(67,66,49,0)');
    c.fillStyle = mouth; c.beginPath();
    c.moveTo(-25, 8); c.lineTo(-24, -7); c.lineTo(-21, -14); c.lineTo(-22, -22);
    c.lineTo(-14, -27); c.lineTo(-11, -36); c.lineTo(-4, -42); c.lineTo(4, -40);
    c.lineTo(8, -34); c.lineTo(15, -31); c.lineTo(20, -22); c.lineTo(18, -13);
    c.lineTo(23, -5); c.lineTo(25, 8); c.bezierCurveTo(9, 15, -10, 14, -25, 8); c.fill();
    // Original alpha carries the stone shading. Drawing the rock in front
    // breaks the dark outline into textured ledges; no artificial eye dots,
    // smooth outer arch, hard ground ellipse, or new image file is needed.
    var rh = cell.h * 280 / cell.w;
    c.globalAlpha = alive ? 1 : .48;
    c.drawImage(cell.image, cell.x, cell.y, cell.w, cell.h, -166, 24 - rh, 280, rh);
    c.globalAlpha = 1;
    return { cv: cv, ox: 180, oy: 140, w: W, h: H };
  }
  R4.denInk = function (c, G, x, y, alive) {
    var th = G.lv && G.lv.theme || 'bamboo';
    var k = th + (alive ? ':a' : ':d'), e = denCache[k] || (denCache[k] = bakeDen(alive, th));
    if (!e) return false;
    c.drawImage(e.cv, x - e.ox, y - e.oy, e.w, e.h);
    return true;
  };
  function drawDen(c, G, den, rt) {
    var x = den.x, y = den.y, ec = ELC(den.elem), alive = den.alive, T = R();
    if (!inV(G, x, y, 180)) return;
    if (alive) { var pg = c.createRadialGradient(x, y, 20, x, y, 130); pg.addColorStop(0, ec + '55'); pg.addColorStop(1, ec + '00'); c.fillStyle = pg; c.beginPath(); c.arc(x, y, 130 + Math.sin(rt * 2) * 6, 0, PI2); c.fill(); }
    R4.denInk(c, G, x, y, alive);
    // 牌匾
    var nm = den.name + (alive ? '' : '（已镇灭）');
    c.font = 'bold 15px ' + C.FONT; var tw = c.measureText(nm).width + 22;
    var py0 = y - 100, bsn = den.boss;
    if (alive && bsn && !bsn.dead && !bsn.hidden && dist2(bsn.x, bsn.y, x, y) < 340 * 340) py0 = y + 54;      // v0.7：洞主在洞口附近时，牌匾挪到洞口下方，别和他头顶的名牌 / 血条 / 倒计时叠在一起
    T.rrect(c, x - tw / 2, py0, tw, 26, 8); c.fillStyle = alive ? '#fff1d0' : '#ecebe6'; c.fill(); c.lineWidth = 2; c.strokeStyle = alive ? ec : '#aaa79e'; c.stroke();
    T.txt(c, nm, x, py0 + 13, 15, alive ? '#4a2a05' : '#8a8578', 'center', true);
    if (alive) {                                   // 倾巢 / 精英倒计时提示：快到了就闪
      if (den.swarmT < 4 && Math.sin(rt * 14) > 0) T.otxt(c, '倾巢出动！', x, y - 116, 14, '#d62828', 'center', true);
    } else {
      c.strokeStyle = '#8a8578'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 40, y - 4); c.lineTo(x + 40, y + 30); c.moveTo(x + 40, y - 4); c.lineTo(x - 40, y + 30); c.stroke();
    }
  }
  function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function drawGate(c, G, rt) {
    var g = G.gate, x = g.x, y = g.y, T = R(), open = !g.sealed;
    if (!inV(G, x, y, 240)) return;
    c.save();
    var k = 0.5 + 0.5 * Math.sin(rt * 3);
    c.setLineDash([10, 8]); c.lineDashOffset = -rt * 14; c.lineWidth = 2; c.strokeStyle = open ? 'rgba(170,132,54,0.72)' : 'rgba(117,108,92,0.5)';
    c.beginPath(); c.arc(x, y, g.r, 0, PI2); c.stroke(); c.setLineDash([]);
    if (open) { var gg = c.createRadialGradient(x, y, 10, x, y, g.r + 30); gg.addColorStop(0, 'rgba(240,215,153,' + (0.15 + 0.06 * k) + ')'); gg.addColorStop(1, 'rgba(240,215,153,0)'); c.fillStyle = gg; c.beginPath(); c.arc(x, y, g.r + 30, 0, PI2); c.fill(); }
    var art = R4.worldProps.draw(c, 'gate', x, y + 44, 226, 196, 1);
    if (!art) R4.worldProps.glyph(c, '关', x, y - 20);
    if (!open) {                                      // 封印位于真实门楼中央，开放后完整撤掉。
      c.save(); c.translate(x, y - 8); c.fillStyle = '#b34632'; c.strokeStyle = '#7e3829'; c.lineWidth = 1;
      c.rotate(0.46); c.fillRect(-43, -5, 86, 10); c.strokeRect(-43, -5, 86, 10);
      c.rotate(-0.92); c.fillRect(-43, -5, 86, 10); c.strokeRect(-43, -5, 86, 10); c.restore();
      T.otxt(c, '封', x, y - 8, 18, '#fff4de', 'center', true);
    }
    var nm = G.villain ? '芭蕉洞 · 洞口' : '西行关口「' + g.name + '」';
    var titleY = y + 44 - (art ? art.h : 132) - 26;
    c.font = 'bold 16px ' + C.FONT; var tw = c.measureText(nm).width + 24;
    T.rrect(c, x - tw / 2, titleY - 13, tw, 28, 5); c.fillStyle = 'rgba(250,245,229,0.93)'; c.fill(); c.lineWidth = 1.3; c.strokeStyle = open ? '#a78a50' : '#a59c89'; c.stroke();
    T.txt(c, nm, x, titleY + 1, 16, '#665139', 'center', true);
    var gl = G.villain ? (open ? '本轮守洞成功' : '来袭未尽 · 守住洞府和牛魔王') : (open ? '主线已完成 · 送唐僧过关！' : '主线未完成 · 关口封印'); T.otxt(c, gl, x, R4.placeLabel(c, gl, x, y + g.r + 20, 14, 1), 14, open ? '#907234' : '#71695a', 'center', true);
    if (g.hintT > 3 && !open) T.otxt(c, G.villain ? '守洞尚未结束' : '主线未完成', x, titleY - 26, 16, '#a83224', 'center', true);
    c.restore();
  }
  function drawCaptive(c, G, cp, rt) {
    if (!inV(G, cp.x, cp.y, 180)) return;
    var T = R(), x = cp.x, y = cp.y;
    c.save();
    c.setLineDash([6, 6]); c.lineWidth = 2; c.strokeStyle = cp.freed ? 'rgba(92,184,92,0.5)' : 'rgba(224,164,21,0.7)'; c.beginPath(); c.arc(x, y, cp.r, 0, PI2); c.stroke(); c.setLineDash([]);
    var key = cp.id === 'tudi' ? 'tudi' : 'villager';
    var person = R4.worldProps.draw(c, key, x, y + 23, 80, 100, cp.freed ? 0.9 : 1);
    if (!person) R4.worldProps.glyph(c, '援', x, y - 10);
    if (!cp.freed) R4.worldProps.draw(c, 'cage', x, y + 29, 118, 132, 1);
    if (!cp.freed && cp.t > 0) { c.lineWidth = 6; c.strokeStyle = '#5cb85c'; c.beginPath(); c.arc(x, y, cp.r, -Math.PI / 2, -Math.PI / 2 + PI2 * cp.t / cp.hold); c.stroke(); }
    T.otxt(c, cp.name + (cp.freed ? ' · 已救出' : ''), x, y - 120, 15, cp.freed ? '#2f7d3b' : '#80643a', 'center', true);
    if (!cp.freed) T.otxt(c, '英雄靠近守满 ' + cp.hold + ' 秒', x, y + cp.r + 20, 13, T.T.inkSoft, 'center', true);
    c.restore();
  }
  function drawItem(c, G, it, rt) {                          // v0.8 水墨灵草：绿墨洇的光晕 + 淡绿叶 + 浓墨描边与叶脉
    if (!inV(G, it.x, it.y, 60)) return;
    var T = R(), by = Math.sin(rt * 4) * 4, k = 0.5 + 0.5 * Math.sin(rt * 6), IP = XY.INKP, INK = IP.INK, sd = ((it.x * 3 + it.y) | 0) & 1023;
    if (XY.ITEMINK && XY.ITEMINK.size('fan')) {                  // v0.8 水墨精灵：芭蕉扇 / 其他拾取物（灵芝）
      IP.blot(c, it.x, it.y + by * 0.5, 14 + k * 3, '90,180,110', 0.1 + 0.08 * k, sd, 0, 1);
      c.fillStyle = 'rgba(' + INK + ',0.18)'; c.beginPath(); c.ellipse(it.x, it.y + 15, 8, 2.6, 0, 0, Math.PI * 2); c.fill();
      XY.ITEMINK.draw(c, it.kind === 'fan' ? 'fan' : 'lingzhi', it.x, it.y + by * 0.5 + 13, 1, 1);
      var pl = it.name + ' · 去拾取'; T.otxt(c, pl, it.x, R4.placeLabel(c, pl, it.x, it.y - 22, 12, -1), 12, '#2f7d3b', 'center', true); return;
    }
    IP.blot(c, it.x, it.y + by, 26 + k * 5, '80,170,100', 0.24 + 0.14 * k, sd, 0, 1);
    c.lineJoin = 'round'; c.fillStyle = 'rgba(123,216,143,0.9)'; c.strokeStyle = 'rgba(' + INK + ',0.9)'; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(it.x, it.y + by - 22); c.quadraticCurveTo(it.x + 24, it.y + by - 10, it.x + 6, it.y + by + 16); c.quadraticCurveTo(it.x - 20, it.y + by + 8, it.x, it.y + by - 22); c.fill(); c.stroke();
    IP.stroke(c, it.x + 1, it.y + by + 16, it.x - 6, it.y + by + 30, 3, INK, 0.9, sd + 1, 0.1);
    IP.stroke(c, it.x - 1, it.y + by - 14, it.x + 3, it.y + by + 12, 2.2, INK, 0.45, sd + 2, 0.12);
    var pl = it.name + ' · 去拾取'; T.otxt(c, pl, it.x, R4.placeLabel(c, pl, it.x, it.y - 40, 13, -1), 13, '#2f7d3b', 'center', true);
  }
  // 洞府 / 关口 / 被困者 / 宝物：画在塔和敌人下面
  R4.under = function (c, G, rt) {
    var i;
    drawGate(c, G, rt);
    for (i = 0; i < G.dens.length; i++) drawDen(c, G, G.dens[i], rt);
    for (i = 0; i < G.captives.length; i++) drawCaptive(c, G, G.captives[i], rt);
    for (i = 0; i < G.items.length; i++) drawItem(c, G, G.items[i], rt);
    if (XY.drawSpZones) XY.drawSpZones(c, G, rt);
  };

  /* ================= 天兵：人形士兵（五种：弓 / 炮 / 寒冰 / 破阵 / 佛光）+ 三级铠甲 + 待机晃动 + 出手动作 + 血条 ================= */
  // 造型：头盔 + 红缨、铠甲、肩甲、腿；每种拿不同的兵器（弓背长矛 / 手炮 + 戟 / 冰刃戟 / 大弩 / 佛光禅杖）
  // 动画：站着轻轻起伏；走路（跟随）时上下蹦；出手时（t.atkT 0.3 秒）朝目标前冲一下、兵器前刺 / 开火闪光
  R4.soldier = function (c, G, t, rt) {
    var T = R(), d = XY.TOWERS[t.type], x = t.x, y = t.y, s = XY.towerStat(G, t), h = G.heroes[G.ctrl], lv = t.lv || 1, sc = 1 + 0.1 * (lv - 1);
    if (!inV(G, x, y, 80)) return;
    R4.soldierDraws = (R4.soldierDraws || 0) + 1;     // 测试用：确认画的是天兵，不是塔
    if (XY.app && XY.app.build === t.type) { c.setLineDash([5, 7]); c.lineWidth = 1.2; c.strokeStyle = 'rgba(42,32,22,0.32)'; c.beginPath(); c.arc(x, y, s.range, 0, PI2); c.stroke(); c.setLineDash([]); }
    if (lv >= 2) { var gg = c.createRadialGradient(x, y - 6, 4, x, y - 6, 38 * sc); var gc = lv >= 3 ? '255,210,80' : '170,200,235'; gg.addColorStop(0, 'rgba(' + gc + ',' + (lv >= 3 ? 0.45 : 0.28) + ')'); gg.addColorStop(1, 'rgba(' + gc + ',0)'); c.fillStyle = gg; c.beginPath(); c.arc(x, y - 6, 38 * sc, 0, PI2); c.fill(); }
    // 朝向 / 走动：出手时朝目标；否则朝移动方向
    var lx = t._lx == null ? x : t._lx; t._lx = x;
    var mv = Math.abs(x - lx) > 0.15 || (t._ly != null && Math.abs(y - t._ly) > 0.15); t._ly = y;
    var atk = t.atkT > 0 ? Math.min(1, t.atkT / 0.3) : 0, aimed = t.type !== 'frost' && t.type !== 'heal', ang = t.ang || 0;
    if (atk > 0 && aimed) t._face = Math.cos(ang) >= 0 ? 1 : -1; else if (x - lx > 0.15) t._face = 1; else if (x - lx < -0.15) t._face = -1;
    var f = t._face || 1; if (!aimed) ang = f > 0 ? 0 : Math.PI;
    if (t.sd == null) t.sd = Math.random() * 6.28;
    var ph = rt * 3 + t.sd;
    var bob = mv ? -Math.abs(Math.sin(rt * 11 + t.sd)) * 3.2 : Math.sin(ph) * 1.3, lunge = atk * 6 * f;
    var gy = y + 13;                                                        // 脚底
    var inkd = XY.SINK && XY.SINK.draw(c, G, t, rt, f, mv, gy, sc, s.cd || 1);          // 有水墨帧时不再退回矢量天兵
    if (!inkd && !(XY.SINK_DATA && XY.SINK_DATA[t.type])) {
    c.fillStyle = 'rgba(80,60,30,0.22)'; c.beginPath(); c.ellipse(x, gy + 2, 15 * sc, 5, 0, 0, PI2); c.fill();
    c.save(); c.translate(x, gy); c.scale(sc, sc); c.translate(-x, -gy);
    c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 1.8;
    var tier = lv >= 3 ? 2 : (lv >= 2 ? 1 : 0), TY = t.type;
    var armor = [['#b98a52', '#c8d0d8', '#f0cf6a'], ['#7e8a96', '#cfd8e0', '#f2d675'], ['#5aa0d6', '#cfe6f6', '#f2d675'], ['#8a5a3a', '#b9a07c', '#f2d675'], ['#f4e3a0', '#fff6cf', '#fff0a8']][['arrow', 'cannon', 'frost', 'siege', 'heal'].indexOf(TY)][tier];
    var edge = tier === 2 ? '#a8821a' : (TY === 'frost' ? '#2f6aa8' : '#5a4528'), plume = { arrow: '#d9503c', cannon: '#d9503c', frost: '#3d8ad9', siege: '#c04030', heal: '#e0a415' }[TY];
    var bx = x + lunge * 0.8, by = bob;
    // 背后的长矛（弓天兵）/ 光环（佛光）
    if (TY === 'arrow') { c.strokeStyle = '#6a4a22'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(bx - f * 9, gy - 2 + by); c.lineTo(bx - f * 5, gy - 50 + by); c.stroke();
      c.fillStyle = '#dfe5ea'; c.strokeStyle = '#6b7a88'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(bx - f * 5, gy - 58 + by); c.lineTo(bx - f * 8, gy - 49 + by); c.lineTo(bx - f * 2, gy - 49 + by); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#d9503c'; c.beginPath(); c.arc(bx - f * 5, gy - 47 + by, 2.4, 0, PI2); c.fill(); }
    if (TY === 'heal') { var hp = 0.5 + 0.5 * Math.sin(rt * 3 + x); c.strokeStyle = 'rgba(229,185,60,' + (0.45 + 0.3 * hp) + ')'; c.lineWidth = 2.2; c.beginPath(); c.ellipse(bx, gy - 42 + by, 11, 4, 0, 0, PI2); c.stroke(); }
    // 腿 + 靴
    c.lineWidth = 1.8; c.strokeStyle = edge; c.fillStyle = '#5a4a38';
    var sw = mv ? Math.sin(rt * 11 + t.sd) * 3 : 0;
    T.rrect(c, bx - 7 + sw, gy - 9 + by * 0.3, 6, 10, 2); c.fill(); c.stroke(); T.rrect(c, bx + 1 - sw, gy - 9 + by * 0.3, 6, 10, 2); c.fill(); c.stroke();
    // 身体铠甲（佛光天兵是长袍）
    c.fillStyle = armor; c.strokeStyle = edge;
    if (TY === 'heal') { c.beginPath(); c.moveTo(bx - 9, gy - 26 + by); c.lineTo(bx + 9, gy - 26 + by); c.lineTo(bx + 12, gy - 4 + by); c.lineTo(bx - 12, gy - 4 + by); c.closePath(); c.fill(); c.stroke(); c.strokeStyle = '#e0a415'; c.lineWidth = 2; c.beginPath(); c.moveTo(bx - 9, gy - 26 + by); c.lineTo(bx + 4, gy - 8 + by); c.stroke(); }
    else { T.rrect(c, bx - 9, gy - 26 + by, 18, 18, 4); c.fill(); c.stroke();
      c.strokeStyle = tier === 2 ? '#e0a415' : edge; c.lineWidth = 2; c.beginPath(); c.moveTo(bx - 9, gy - 15 + by); c.lineTo(bx + 9, gy - 15 + by); c.stroke();           // 腰带
      c.fillStyle = tier === 2 ? '#f0cf6a' : '#e8e0c8'; c.lineWidth = 1.2; c.strokeStyle = edge; c.beginPath(); c.arc(bx, gy - 20 + by, 3.2, 0, PI2); c.fill(); c.stroke(); }          // 护心镜
    // 肩甲
    c.fillStyle = tier === 2 ? '#f0cf6a' : '#d8d2c0'; c.strokeStyle = edge; c.lineWidth = 1.4;
    c.beginPath(); c.arc(bx - 10, gy - 25 + by, 4.6, 0, PI2); c.fill(); c.stroke(); c.beginPath(); c.arc(bx + 10, gy - 25 + by, 4.6, 0, PI2); c.fill(); c.stroke();
    // 头 + 头盔 + 红缨
    var hy = gy - 33 + by;
    c.fillStyle = '#f6d3a8'; c.strokeStyle = '#8a5a30'; c.lineWidth = 1.5; c.beginPath(); c.arc(bx, hy, 6.6, 0, PI2); c.fill(); c.stroke();
    c.fillStyle = '#3a2c1a'; c.beginPath(); c.arc(bx + f * 2.2 - 2.2, hy + 0.5, 1, 0, PI2); c.arc(bx + f * 2.2 + 2.2, hy + 0.5, 1, 0, PI2); c.fill();
    c.fillStyle = TY === 'heal' ? '#fff0a8' : (tier === 2 ? '#f0cf6a' : (TY === 'frost' ? '#bcdcf2' : '#b8c0c8')); c.strokeStyle = edge; c.lineWidth = 1.6;
    c.beginPath(); c.arc(bx, hy - 1, 7.6, Math.PI, 0); c.lineTo(bx + 7.6, hy - 1); c.lineTo(bx - 7.6, hy - 1); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = plume; c.beginPath(); c.moveTo(bx, hy - 8); c.quadraticCurveTo(bx - f * 9, hy - 16 + Math.sin(ph) * 1.5, bx - f * 12, hy - 7); c.quadraticCurveTo(bx - f * 5, hy - 9, bx, hy - 5); c.closePath(); c.fill();
    // 兵器（手在身体前侧；出手时朝目标，平时竖着轻晃）
    var hx = bx + f * 8, hyy = gy - 19 + by, wa = atk > 0 ? ang : (-Math.PI / 2 + f * (0.12 + Math.sin(ph) * 0.05));
    c.save(); c.translate(hx, hyy); c.rotate(wa);
    var thrust = atk * 8;
    if (TY === 'arrow') {                                    // 弓：满弓 → 放箭
      var pull = atk > 0 ? 7 * (1 - atk) : 2;
      c.strokeStyle = '#6a4a22'; c.lineWidth = 2.6; c.beginPath(); c.arc(6, 0, 13, -1.15, 1.15); c.stroke();
      c.strokeStyle = '#f4efe0'; c.lineWidth = 1; c.beginPath(); c.moveTo(6 + Math.cos(-1.15) * 13, Math.sin(-1.15) * 13); c.lineTo(6 - pull, 0); c.lineTo(6 + Math.cos(1.15) * 13, Math.sin(1.15) * 13); c.stroke();
      if (atk < 0.5 || atk === 0) { c.strokeStyle = '#5a3b1a'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(6 - pull, 0); c.lineTo(22, 0); c.stroke(); c.fillStyle = '#b8c0c8'; c.beginPath(); c.moveTo(25, 0); c.lineTo(20, -2.6); c.lineTo(20, 2.6); c.fill(); }
    } else if (TY === 'cannon') {                            // 手炮：粗铜管 + 开火闪光；另一手扛着戟
      c.fillStyle = '#6a5a3c'; c.strokeStyle = '#3a2c18'; c.lineWidth = 1.6; T.rrect(c, 2 - atk * 3, -4.5, 24, 9, 3); c.fill(); c.stroke();
      c.fillStyle = '#d6a43c'; c.fillRect(8 - atk * 3, -4.5, 3, 9); c.fillRect(17 - atk * 3, -4.5, 3, 9);
      if (atk > 0.35) { c.fillStyle = 'rgba(255,170,50,' + atk + ')'; c.beginPath(); c.arc(30, 0, 5 + atk * 9, 0, PI2); c.fill(); c.fillStyle = 'rgba(255,240,170,' + atk + ')'; c.beginPath(); c.arc(30, 0, 3 + atk * 4, 0, PI2); c.fill(); }
    } else if (TY === 'frost') {                             // 冰刃戟：长杆 + 冰晶刃 + 月牙；出手时前刺
      c.strokeStyle = '#4a6a8a'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(-12 + thrust, 0); c.lineTo(30 + thrust, 0); c.stroke();
      c.fillStyle = '#cfeaff'; c.strokeStyle = '#4a90d9'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(42 + thrust, 0); c.lineTo(30 + thrust, -5); c.lineTo(30 + thrust, 5); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.arc(28 + thrust, 0, 7, -1.9, -0.2); c.stroke(); c.beginPath(); c.arc(28 + thrust, 0, 7, 0.2, 1.9); c.stroke();
      c.fillStyle = '#4a90d9'; c.beginPath(); c.arc(-12 + thrust, 0, 2.4, 0, PI2); c.fill();
    } else if (TY === 'siege') {                             // 大弩：弩臂 + 弩机 + 红头弩箭
      c.strokeStyle = '#4a2a10'; c.lineWidth = 3; c.beginPath(); c.moveTo(-4 - atk * 3, 0); c.lineTo(22, 0); c.stroke();
      c.lineWidth = 3.2; c.beginPath(); c.moveTo(14, -13); c.quadraticCurveTo(22 + atk * 6, 0, 14, 13); c.stroke();
      c.strokeStyle = '#f4efe0'; c.lineWidth = 1; c.beginPath(); c.moveTo(14, -13); c.lineTo(12 - (atk > 0 ? 0 : 5), 0); c.lineTo(14, 13); c.stroke();
      if (atk < 0.5 || atk === 0) { c.strokeStyle = '#5a3b1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(12 - (atk > 0 ? 0 : 5), 0); c.lineTo(34, 0); c.stroke(); c.fillStyle = '#c04030'; c.beginPath(); c.moveTo(38, 0); c.lineTo(31, -3.4); c.lineTo(31, 3.4); c.fill(); }
    } else {                                                 // 佛光禅杖：莲花头；出手 = 光脉冲
      c.strokeStyle = '#8a6a1a'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(-10, 0); c.lineTo(30, 0); c.stroke();
      c.fillStyle = '#ffd1dc'; c.strokeStyle = '#d27a96'; c.lineWidth = 1.2; for (var q = -1; q <= 1; q++) { c.beginPath(); c.ellipse(33, q * 4.2, 6, 3, q * 0.5, 0, PI2); c.fill(); c.stroke(); }
      c.fillStyle = '#fff3a0'; c.beginPath(); c.arc(33, 0, 3, 0, PI2); c.fill();
    }
    c.restore();
    // 戟（炮天兵另一手）：竖在身后
    if (TY === 'cannon') { c.strokeStyle = '#5a4528'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(bx - f * 11, gy - 1 + by); c.lineTo(bx - f * 11, gy - 52 + by); c.stroke();
      c.fillStyle = '#dfe5ea'; c.strokeStyle = '#6b7a88'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(bx - f * 11, gy - 60 + by); c.lineTo(bx - f * 14, gy - 51 + by); c.lineTo(bx - f * 8, gy - 51 + by); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.arc(bx - f * 11, gy - 47 + by, 6, f > 0 ? Math.PI * 0.6 : -Math.PI * 0.6 - 0.0, f > 0 ? Math.PI * 1.4 : Math.PI * 0.6 + Math.PI * 0.0, f < 0); c.stroke(); }
    // 出手的劈 / 冲击弧（近战感）：朝目标一道亮弧
    if (atk > 0 && (TY === 'frost' || TY === 'heal')) {
      c.strokeStyle = (TY === 'frost' ? 'rgba(120,190,245,' : 'rgba(255,215,90,') + atk + ')'; c.lineWidth = 3; c.beginPath(); c.arc(hx, hyy, 26 + (1 - atk) * 12, ang - 0.7, ang + 0.7); c.stroke();
    }
    c.restore();
    }
    // 等级星
    var cl0 = t.cl || 1, i; for (i = 0; i < cl0; i++) { c.fillStyle = '#f0b429'; c.strokeStyle = '#a8700a'; c.lineWidth = 1; c.beginPath(); c.arc(x - (cl0 - 1) * 5 + i * 10, y + 25, 3.6, 0, PI2); c.fill(); c.stroke(); }
    // 寒冰 / 佛光脉冲环
    if (t.pulse > 0 && TY === 'frost') { c.strokeStyle = 'rgba(80,160,230,' + (t.pulse * 1.5) + ')'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, s.range * (1 - t.pulse), 0, PI2); c.stroke(); }
    // 血条（受伤才显示）
    var mh = XY.towerMaxHp ? XY.towerMaxHp(t) : t.maxHp;
    if (t.hp < mh - 0.5 && !(G.td && G.td.on)) T.bar(c, x - 20, y + 31, 40, 5, t.hp / mh, '#e0533d', 'rgba(255,255,255,0.85)');
    if (t.maxLife) { T.bar(c, x - 20, y + 37, 40, 3, Math.max(0, t.life / t.maxLife), '#6bb7e8', 'rgba(255,255,255,0.7)'); }
    if (t.mode === 'garrison' && !(G.td && G.td.quiet > G.td.clock)) T.otxt(c, '驻守', x, inkd ? gy - XY.SINK.top(t) - 6 : y - 52, 10.5, '#a8700a', 'center', true);
    // 升级闪光（t.upT 倒计时）
    if (t.upT > 0) {
      var u = 1 - t.upT / 1.2; u = Math.max(0, Math.min(1, u));
      c.strokeStyle = 'rgba(255,200,60,' + (1 - u) + ')'; c.lineWidth = 5; c.beginPath(); c.arc(x, y - 4, 20 + u * 60, 0, PI2); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,' + (1 - u) + ')'; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y - 4, 10 + u * 40, 0, PI2); c.stroke();
      T.otxt(c, '升级！Lv' + lv, x, y - 62 - u * 24, 17, '#d98a00', 'center', true);
      for (i = 0; i < 6; i++) { var a = i * PI2 / 6 + u * 2; c.fillStyle = 'rgba(255,215,80,' + (1 - u) + ')'; c.beginPath(); c.arc(x + Math.cos(a) * (14 + u * 40), y - 4 + Math.sin(a) * (14 + u * 40), 3, 0, PI2); c.fill(); }
    }
  };

  /* ================= 敌人：妖塔 / 头顶标记 / BOSS 名字血条 ================= */
  R4.etower = function (c, G, e, rt) {
    var T = R(), x = e.x, y = e.y, bd = e.building > 0, fl = e.flash > 0, k = bd ? 1 - e.building / C.ETOWER_BUILD : 1;
    c.globalAlpha = bd ? 0.35 + 0.65 * k : 1;
    var ink = XY.MINK && XY.MINK.has('etower'), ty0 = ink ? 12 : 0;      // v0.8.0：水墨妖塔（比旧矢量塔高一点，名字 / 血条往上 / 下挪）
    if (ink) { XY.MINK.tower(c, G, e, rt); c.globalAlpha = 1; if (bd) { T.bar(c, x - 26, y + 26, 52, 6, k, '#8a5fc0', 'rgba(255,255,255,0.85)'); T.otxt(c, '妖塔建造中', x, y - 56 - ty0, 12, '#6b3fa0', 'center', true); } else { T.otxt(c, '妖塔', x, y - 56 - ty0, 12, '#6b3fa0', 'center', true); T.bar(c, x - 26, y + 26, 52, 6, e.hp / e.maxHp, '#e0533d', 'rgba(255,255,255,0.85)'); } return; }
    if (XY.MINK_DATA && XY.MINK_DATA.etower) { c.globalAlpha = 1; T.otxt(c, bd ? '妖塔建造中' : '妖塔', x, y - 56, 12, '#6b3fa0', 'center', true); return; }
    c.fillStyle = 'rgba(70,40,90,0.25)'; c.beginPath(); c.ellipse(x, y + 20, 30, 9, 0, 0, PI2); c.fill();
    var g = c.createRadialGradient(x, y - 10, 4, x, y - 10, 60); g.addColorStop(0, 'rgba(160,100,220,0.35)'); g.addColorStop(1, 'rgba(160,100,220,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y - 10, 60, 0, PI2); c.fill();
    c.lineJoin = 'round'; c.lineWidth = 2.5; c.strokeStyle = '#3e1f6e';
    var cols = fl ? ['#fff', '#fff', '#fff'] : ['#8a5fc0', '#a77ad8', '#c39be8'];
    for (var i = 0; i < 3; i++) {                     // 三层宝塔，越往上越小
      var w = 26 - i * 6, ty = y + 14 - i * 16;
      c.fillStyle = cols[i]; T.rrect(c, x - w, ty - 12, w * 2, 14, 3); c.fill(); c.stroke();
      c.fillStyle = '#4a2a80'; c.beginPath(); c.moveTo(x - w - 6, ty - 12); c.lineTo(x, ty - 22); c.lineTo(x + w + 6, ty - 12); c.closePath(); c.fill(); c.stroke();
    }
    c.fillStyle = e.fire > 0 ? '#ff5a3c' : '#f2e08a'; c.beginPath(); c.arc(x, y - 36, 5 + (e.fire > 0 ? 3 : 0), 0, PI2); c.fill();
    c.globalAlpha = 1;
    if (bd) { T.bar(c, x - 26, y + 26, 52, 6, k, '#8a5fc0', 'rgba(255,255,255,0.85)'); T.otxt(c, '妖塔建造中', x, y - 56, 12, '#6b3fa0', 'center', true); }
    else { T.otxt(c, '妖塔', x, y - 56, 12, '#6b3fa0', 'center', true); T.bar(c, x - 26, y + 26, 52, 6, e.hp / e.maxHp, '#e0533d', 'rgba(255,255,255,0.85)'); }
  };
  // 狂暴倒计时配色（浅色主题）：正常淡紫 / ≤30 秒琥珀 / ≤10 秒红色并脉动
  function enrageLook(t, rt) {
    if (t <= XY.C.ENRAGE_WARN2) { var p = 0.5 + 0.5 * Math.sin(rt * 14); return { fill: 'rgba(255,' + Math.round(225 - 60 * p) + ',' + Math.round(220 - 60 * p) + ',0.97)', line: '#d62828', ink: '#c01818', warn: 2, pulse: p }; }
    if (t <= XY.C.ENRAGE_WARN1) { var q = 0.5 + 0.5 * Math.sin(rt * 6); return { fill: 'rgba(255,243,205,0.97)', line: q > 0.5 ? '#e08a0b' : '#f0b84a', ink: '#9a5a00', warn: 1, pulse: q }; }
    return { fill: 'rgba(245,238,255,0.95)', line: '#9b59d0', ink: '#5b2d91', warn: 0, pulse: 0 };
  }
  R4.enrageLook = enrageLook;
  // v0.7 标签防重叠：BOSS 头顶的“倒计时胶囊 + 名牌 + 血条”占一块固定区域；英雄名字 / 洞府牌匾碰到这块区域就挪到脚下 / 洞口下方
  R4.bossStacks = function (G) {
    if (G._bsT === R4.rt && G._bsN === G.enemies.length && G._bsX === G.cam.x && G._bsY === G.cam.y) return G._bs;
    var out = [], i, e, tp;
    for (i = 0; i < G.enemies.length; i++) {
      e = G.enemies[i]; if (e.dead || !e.def || !e.def.denBoss || e.hidden || !inV(G, e.x, e.y, 200)) continue;
      tp = (XY.MA && XY.MA.hasFigure && XY.MA.hasFigure(e)) ? XY.MA.topOf(e) : e.r + 14;
      out.push({ x0: e.x - 80, x1: e.x + 80, y0: e.y - tp - 66, y1: e.y - tp - 3, e: e });
    }
    G._bsT = R4.rt; G._bsN = G.enemies.length; G._bsX = G.cam.x; G._bsY = G.cam.y; return (G._bs = out);
  };
  R4.labelClash = function (G, x, y, w, h) {
    var bs = R4.bossStacks(G);
    for (var i = 0; i < bs.length; i++) { var b = bs[i]; if (x < b.x1 && x + w > b.x0 && y < b.y1 && y + h > b.y0) return true; }
    return false;
  };
  // v0.7.0n：开一个“挖掉顶部 HUD 矩形”的裁剪（调用方负责 c.restore()），屏幕级特效画在它里面就不会盖住顶部细条 / 通知 / 连杀
  R4.clipOutTop = function (c, app) {
    c.save(); c.beginPath(); c.rect(0, 0, app.lw, app.lh);
    (XY.ui.hud || []).forEach(function (p) { if (p.id === 'top' || p.id === 'toast' || p.id === 'combo') c.rect(p.x - 2, p.y - 2, p.w + 4, p.h + 4); });
    c.clip('evenodd');
  };
  // v0.7.0n 战场文字防叠：每帧登记已画文字的屏幕矩形，后画的（居中）文字撞上了就沿 dir（+1 向下 / -1 向上）挪开，最多挪 6 次；返回挪好的 y（局部坐标）
  var LBL = [];
  R4.lblReset = function () { LBL.length = 0; };
  R4.lblList = function () { return LBL; };
  R4.placeLabel = function (c, s, x, y, sz, dir) {
    c.font = 'bold ' + sz + 'px ' + C.FONT; var m = c.getTransform(), sc = m.a || 1, w = (c.measureText(XY.fmtStr(s)).width + 6) * sc, h = (sz + 3) * sc, n = 0, step = (sz + 3) * dir, r, i;
    for (;;) {
      r = { x0: m.e + x * sc - w / 2, x1: m.e + x * sc + w / 2, y0: m.f + (y - sz / 2 - 1.5) * sc, y1: m.f + (y - sz / 2 - 1.5) * sc + h };
      var hit = false; for (i = 0; i < LBL.length; i++) { var o = LBL[i]; if (r.x0 < o.x1 && r.x1 > o.x0 && r.y0 < o.y1 && r.y1 > o.y0) { hit = true; break; } }
      if (!hit || n >= 6) break; y += step; n++;
    }
    LBL.push(r); return y;
  };
  function areaOf(r, list) {
    var a = 0, i, t, w, h;
    for (i = 0; i < list.length; i++) {
      t = list[i];
      w = Math.min(r.x1, t.x1) - Math.max(r.x0, t.x0);
      h = Math.min(r.y1, t.y1) - Math.max(r.y0, t.y0);
      if (w > 0 && h > 0) a += w * h;
    }
    return a;
  }
  R4.planMapLabels = function (c, G, app) {
    if (!G || !app || !G.gate || !G.camp || !G.heroes || !G.heroes.length) return [];
    var cssW = app.lw * (app.zoom || 1), cssH = app.lh * (app.zoom || 1);
    if (cssW < 1100 || cssH < 420) return [];
    var W = app.lw, H = app.lh, z = (app.zoom || 1) * (app.dpr || 1);
    var pOpen = !!(XY.party && XY.party.visible(G, app));
    var quiet = !!(G.td && G.td.quiet > G.td.clock);
    var bodies = [], zz = (app.zoom || 1) * (app.dpr || 1), hi, hb, db, bx0, by0;
    for (hi = 0; hi < G.heroes.length; hi++) {
      hb = G.heroes[hi]; if (!hb || hb.down || hb.ridden || !hb._drawBox) continue;
      db = hb._drawBox;
      bx0 = (G.view.w / 2 - G.cam.x + db.x) * zz;
      by0 = (G.view.h / 2 - G.cam.y + db.y) * zz;
      bodies.push({ x0: bx0 - 10 * zz, y0: by0 - 8 * zz, x1: bx0 + (db.w + 10) * zz, y1: by0 + (db.h + 18) * zz });
    }
    if (!bodies.length) bodies = (R4.bodyRects || []).slice();
    (R4.plates || []).forEach(function (p) { if (p.box) bodies.push(p.box); });
    // Route arrows never cover the resting pavilion or deployed soldiers.
    function blockWorld(x, y, w, h) {
      var sx = (G.view.w / 2 - G.cam.x + x) * zz, sy = (G.view.h / 2 - G.cam.y + y) * zz;
      bodies.push({x0:sx-w*zz/2,y0:sy-h*zz,x1:sx+w*zz/2,y1:sy+18*zz});
    }
    if (G.camp) blockWorld(G.camp.x, G.camp.y + 28, 226, 180);
    (G.towers || []).forEach(function (t) { blockWorld(t.x, t.y, 62, 96); });
    var marks = [], tg = G.heroes[0];
    function box(x, y, w, h) { return { x0: (x - w / 2) * z, y0: (y - h / 2) * z, x1: (x + w / 2) * z, y1: (y + h / 2) * z }; }
    function consider(tx, ty, label, alert) {
      var dx = tx - G.cam.x, dy = ty - G.cam.y;
      if (Math.abs(dx) <= G.view.w / 2 - 20 && Math.abs(dy) <= G.view.h / 2 - 20) return;
      var ang = Math.atan2(dy, dx), ca = Math.cos(ang), sa = Math.sin(ang);
      var x0 = Math.min(150, W * 0.18), x1 = W - Math.min(140, W * 0.18), y0 = Math.min(140, H * 0.12), y1 = H - Math.min(130, H * 0.14);
      var kx = ca > 0 ? (x1 - W / 2) / ca : (ca < 0 ? (x0 - W / 2) / ca : 1e9);
      var ky = sa > 0 ? (y1 - H / 2) / sa : (sa < 0 ? (y0 - H / 2) / sa : 1e9);
      var span = Math.min(kx, ky), ax0 = W / 2 + ca * span, ay0 = H / 2 + sa * span;
      var sz = 22, txa = -sa, tya = ca;
      c.font = sz + 'px "Ma Shan Zheng","KaiTi","STKaiti",serif';
      var tw = c.measureText(label).width + 8, th = sz + 6;
      var shifts = [0, 70, -70, 140, -140, 220, -220, 320, -320, 440, -440, 580, -580, 760, -760];
      var inns = [0, 42, 84];
      var best = null, si, ii, ax, ay, lx, ly, ar, lr, hit, score;
      for (si = 0; si < shifts.length; si++) for (ii = 0; ii < inns.length; ii++) {
        ax = Math.max(x0, Math.min(x1, ax0 + txa * shifts[si]));
        ay = Math.max(y0, Math.min(y1, ay0 + tya * shifts[si]));
        lx = ax - ca * (34 + inns[ii]);
        ly = ay - sa * (34 + inns[ii]);
        lx = Math.max(64 + tw / 2, Math.min(W - 18 - tw / 2, lx));
        ly = Math.max(18 + th / 2, Math.min(H - 18 - th / 2, ly));
        ax = Math.max(28, Math.min(W - 16, lx - tw / 2 - 22));
        ar = box(ax, ay, 36, 32);
        lr = box(lx, ly, tw, th);
        hit = areaOf(ar, bodies) + areaOf(lr, bodies);
        for (var q = 0; q < marks.length; q++) {
          var other = marks[q];
          hit += areaOf(lr, [other.lr, other.ar]) + areaOf(ar, [other.lr, other.ar]);
          // Keep nearby labels on separate lines while evaluating the candidate,
          // so the returned text position and its collision rectangle stay aligned.
          var nearX = Math.max(0, 240 - Math.abs(lx - other.lx));
          var nearY = Math.max(0, 28 - Math.abs(ly - other.ly));
          hit += nearX * nearY * z * z;
        }
        score = hit + Math.abs(shifts[si]) * z * 0.15 + inns[ii] * z * 0.05;
        if (!best || (hit === 0 && best.hit > 0) || ((hit === 0) === (best.hit === 0) && score < best.score)) best = { score: score, hit: hit, ax: ax, ay: ay, lx: lx, ly: ly, ang: ang, label: label, alert: !!alert, ar: ar, lr: lr, sz: sz };
        if (hit === 0 && shifts[si] === 0 && inns[ii] === 0) break;
      }
      if (best && !best.hit) marks.push(best);
    }
    if (!pOpen && (G.camp.active || (G.tang && G.tang.phase === 'walk')) && !quiet) consider(G.camp.x, G.camp.y, G.campAlert > 0 ? '营地被攻击！' : (G.camp.active ? '营地' : '休息点'), G.campAlert > 0);
    if (!pOpen && tg && !tg.down && !quiet) consider(tg.x, tg.y, (G.breach || G.tdanger) ? '师父危险！' : '师父', G.breach || G.tdanger);
    if (!pOpen && !quiet) consider(G.gate.x, G.gate.y, G.gate.sealed ? '关口（主线未完成）' : '关口：师父走到就通关', false);
    return marks;
  };
  R4.enemyOver = function (c, G, e, rt) {
    var T = R(), d = e.def, x = e.x, y = e.y, r = e.r;
    if (e.shield > 0) {                                   // 精英元素护盾：元素色光罩 + 剩余量弧条
      var sc = ELC(e.shieldElem || e.elem), sk = e.shield / e.shieldMax;
      c.globalAlpha = 0.16 + 0.1 * Math.sin(rt * 5); c.fillStyle = sc; c.beginPath(); c.arc(x, y, r + 7, 0, PI2); c.fill(); c.globalAlpha = 1;
      c.strokeStyle = sc; c.lineWidth = 3.5; c.beginPath(); c.arc(x, y, r + 7, -Math.PI / 2, -Math.PI / 2 + PI2 * sk); c.stroke();
    }
    if (e.synMk && e.synMk.until > G.t) { T.otxt(c, '印', x + r * 0.6, y - r - 12, 15, '#c0489a', 'center', true); }
    if (e.elem && !d.etower && !d.denBoss) { var q = 3.6, ex1 = x - r - 2, ey1 = y - r - 2; c.fillStyle = ELC(e.elem); c.strokeStyle = '#fff'; c.lineWidth = 1; c.beginPath(); c.moveTo(ex1, ey1 - q - 1); c.lineTo(ex1 + q, ey1); c.lineTo(ex1, ey1 + q + 1); c.lineTo(ex1 - q, ey1); c.closePath(); c.fill(); c.stroke(); }
    if (d.denBoss) {
      var bw = 120, mult = e.maxHp / (e.baseHp || e.maxHp), tp = (XY.MA && XY.MA.hasFigure(e)) ? XY.MA.topOf(e) : r + 14;
      if (e.enraged) {                                // 狂暴：淡墨气，不是红光
        var ep = 0.5 + 0.5 * Math.sin(rt * 9), eg = c.createRadialGradient(x, y - tp * 0.3, tp * 0.15, x, y - tp * 0.3, tp * 1.05);
        eg.addColorStop(0, 'rgba(28,22,16,' + (0.14 + 0.08 * ep) + ')'); eg.addColorStop(1, 'rgba(28,22,16,0)');
        c.fillStyle = eg; c.fillRect(x - tp * 1.15, y - tp * 1.35, tp * 2.3, tp * 2.05);
      }
      if (!queueBossName(c,G,e,tp,rt)) {
      var narrowBoss = G.view && G.view.w < 520;
      var tagW = narrowBoss ? 108 : 150, tagY = y - tp - (narrowBoss ? 70 : 38);
      var tagText = (e.enraged ? '狂 · ' : '') + d.name + (narrowBoss ? '' : (' ' + ELN(e.elem) + ' +' + Math.round((mult - 1) * 100) + '%'));
      // The boss name stays on the map in ink; no white capsule behind 狂.
      T.otxt(c, tagText, x, tagY + (narrowBoss ? 9 : 10), narrowBoss ? 12 : 13, '#24180f', 'center', true);
      var barW = narrowBoss ? 84 : bw, barY = narrowBoss ? (tagY + 24) : (y - tp - 14);
      T.bar(c, x - barW / 2, barY, barW, narrowBoss ? 6 : 9, e.hp / e.maxHp, e.enraged ? '#5c4030' : '#6b5344', 'rgba(255,255,255,0.85)');
      if (e.enrageT !== undefined && !e.enraged) {
        var ew = enrageLook(e.enrageT, rt), ey = narrowBoss ? (barY + 16) : (tagY - 16);
        var timer = '狂暴 ' + XY.fmtTime(Math.max(0, e.enrageT));
        if (narrowBoss) T.otxt(c, timer, x, ey, 11, '#24180f', 'center', true);
        else T.otxt(c, timer, x, ey + 1, 13, ew.ink, 'center', true);
      }
      }
      if (e.bstate === 'tele') {                      // 冲锋预警线
        // updateDenBoss: 540 units/s for .75s; the body sweeps a radius-r capsule.
        R4.dangerLane(c, x, y, e.cdx, e.cdy, 540 * .75, r * 2, 1 - Math.max(0, e.bt));
        warningLabel(c, '冲锋 · ' + Math.max(0, e.bt).toFixed(1) + '秒', x + e.cdx * 200, y + e.cdy * 200 + r + 18, {owner:e,generation:'charge:'+e.bi,maxSeconds:1,caption:'冲锋'});
      } else if (e.bstate === 'slam') {               // 震地预警圈
        R4.dangerCircle(c, x, y, e.slamR, 1 - Math.max(0, e.bt) / .9, e.bt, '震地', {owner:e,generation:'slam:'+e.bi,maxSeconds:.9});
      }
    }
  };

  /* ================= 天兵 / 英雄附加效果 / 鼠标目的地标记 ================= */
  // 园长召唤物共用水墨动作图集；所有绘制帧固定脚底。
  var undeadInk = { image: null, cells: null, promise: null, state: 'idle', src: 'assets/art/undead-ink/atlas.webp' };
  R4.preloadUndead = function (retry) {
    if (undeadInk.promise && (!retry || undeadInk.state !== 'error')) return undeadInk.promise;
    var versionedSrc = artAlphaSource(undeadInk.src);
    var requestSrc = retry && undeadInk.state === 'error' ? propRetrySource(versionedSrc) : versionedSrc;
    var resolveLoad, rejectLoad, settled = false, scan = null;
    var promise = new Promise(function (resolve, reject) { resolveLoad = resolve; rejectLoad = reject; });
    // Keep failures cached until explicit retry, including decode/scan errors.
    undeadInk.promise = promise; undeadInk.state = 'loading'; undeadInk.requestSrc = requestSrc;
    promise.catch(function () {});
    var im = undeadInk.image = new Image();
    function current() { return !settled && undeadInk.promise === promise && undeadInk.image === im; }
    function finish(error, cells) {
      if (settled) return;
      if (!error && !current()) error = new Error('亡灵动作图集已重新载入');
      settled = true; clearTimeout(timer); im.onload = im.onerror = null;
      if (error && scan) scan.cancel(error); scan = null;
      if (error) {
        if (undeadInk.promise === promise) undeadInk.state = 'error';
        rejectLoad(error); return;
      }
      undeadInk.cells = cells; undeadInk.state = 'ready'; resolveLoad(true);
    }
    var timer = setTimeout(function () { finish(new Error('亡灵动作图集加载超时')); }, 15000);
    im.onload = function () {
      if (settled || scan) return;
      var ys = [0, 300, 602, 960, 1312], xs = [0, 300, 600, 900, 1199];
      scan = prepareArtAlpha(im, undeadInk.src, function () {
        var specs = [];
        for (var row = 0; row < 4; row++) for (var col = 0; col < 4; col++) specs.push({ left:xs[col], top:ys[row], right:xs[col+1], bottom:ys[row+1], emptyOrigin:true });
        return specs;
      }, 40, current);
      scan.promise.then(function (bounds) {
        if (!current()) { finish(new Error('亡灵动作图集已重新载入')); return; }
        var cells = [];
        for (var row = 0; row < 4; row++) {
          cells[row] = [];
          for (var col = 0; col < 4; col++) {
            var left = xs[col], top = ys[row], b = bounds[row * 4 + col];
            cells[row][col] = { x:left, y:top, w:xs[col+1]-left, h:ys[row+1]-top, foot:b.y1-top,
              anchor:(b.x+b.x1)/2-left, bounds:{ x:b.x, y:b.y, w:b.w, h:b.h } };
          }
        }
        finish(null, cells);
      }, function (error) { finish(new Error('亡灵动作图集处理失败：' + String(error.message || error))); });
    };
    im.onerror = function () { finish(new Error('亡灵动作图集加载失败')); };
    try { im.src = requestSrc; }
    catch (err) { finish(new Error('亡灵动作图集加载失败：' + String(err.message || err))); }
    return promise;
  };

  R4.drawUndead = function (c, a, rt, G) {
    if (!undeadInk.cells) { R4.preloadUndead(); return; }
    var row = { bing:0, gong:1, hun:2, mo:3 }[a.ud]; if (row === undefined) return;
    var st = a._undeadDraw;
    if (!st) st = a._undeadDraw = { x:a.x, y:a.y, t:rt, distance:0, face:1, attackUntil:-1, atk:a.atkT || 0 };
    if (st.t !== rt) {
      var dx = a.x - st.x, dy = a.y - st.y, moved = Math.sqrt(dx*dx + dy*dy);
      if (moved < 40) st.distance += moved;
      st.moving = moved > .02;
      if (Math.abs(dx) > .12 && Math.abs(dx) > Math.abs(dy) * .15) st.face = dx < 0 ? -1 : 1;
      if ((a.atkT || 0) > st.atk + .2) st.attackUntil = rt + .24;
      if (a.shot && a.shot.t > 0 && Math.abs(a.shot.x-a.x) > 2) st.face = a.shot.x < a.x ? -1 : 1;
      st.x = a.x; st.y = a.y; st.t = rt; st.atk = a.atkT || 0;
    }
    var attacking = rt < st.attackUntil, frame = attacking ? 3 : (st.moving ? [0,1,2,1][Math.floor(st.distance / 11) % 4] : 0);
    var cell = undeadInk.cells[row][frame], scale = (row === 3 ? 68 : (row === 2 ? 64 : 60)) / (row === 2 ? 340 : (row === 3 ? 330 : 285));
    c.save(); c.translate(a.x, a.y + 14); c.scale(st.face, 1);
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(undeadInk.image, cell.x, cell.y, cell.w, cell.h, -cell.anchor * scale, -cell.foot * scale, cell.w * scale, cell.h * scale);
    if (a.hurtT > 0 && !(XY.shieldUI && XY.shieldUI.isShieldOnly(G, a))) { c.strokeStyle = 'rgba(141,58,39,.65)'; c.lineWidth = 1.3; c.beginPath(); c.arc(0, -22, 20, -.8, .6); c.stroke(); }
    c.restore();
    R4.undeadLast = { id:a.ud, row:row, frame:frame, face:st.face, source:'assets/art/undead-ink/atlas.webp', attack:attacking };
  };
  // 临时天兵沿实际位移迈步，不能用整体上下平移冒充行走。
  // 仅保存绘制状态；攻击、目标、生命和召唤次数仍由 updateAllies 管理。
  var skyDraw = new WeakMap();
  R4.drawSkyAlly = function (c, a, rt, G) {
    if (a.decoy) {
      c.save(); c.filter = 'grayscale(.75)';
      var drawn = XY.chibi && XY.chibi.portrait(c, 'laosiji', a.x, a.y + 14, 82, c.globalAlpha * .62);
      c.restore();
      R4.skyLast = { kind:'decoy', identity:'laosiji', frame:0, drawn:!!drawn };
      return !!drawn;
    }
    var en = XY.SINK && XY.SINK.entry('frost'); if (!en) return false;
    var st = skyDraw.get(a);
    if (!st) { st = { x:a.x, y:a.y, t:rt, distance:0, face:1, attackAt:-99, atk:a.atkT || 0, moving:false }; skyDraw.set(a, st); }
    if (st.t !== rt) {
      var dx = a.x - st.x, dy = a.y - st.y, moved = Math.sqrt(dx * dx + dy * dy);
      if (moved < 40) st.distance += moved;
      st.moving = moved > .02 && moved < 40;
      if (Math.abs(dx) > .12 && Math.abs(dx) > Math.abs(dy) * .28) st.face = dx < 0 ? -1 : 1;
      if ((a.atkT || 0) > st.atk + .15) {
        st.attackAt = rt;
        // Save the real struck target before damage: it may be dead/removed by
        // this paint. A surviving enemy on the other side must not reverse the stab.
        var aimX = Number.isFinite(a.attackX) && Number.isFinite(a.attackY) ? a.attackX : null;
        if (aimX == null) {
          var near = null, dist2 = 10000;
          (G.enemies || []).forEach(function (e) {
            if (e.dead || e.hp <= 0) return;
            var ex = e.x - a.x, ey = e.y - a.y, d2 = ex * ex + ey * ey;
            if (d2 < dist2) { dist2 = d2; near = e; }
          });
          if (near) aimX = near.x;
        }
        if (aimX != null && Math.abs(aimX - a.x) > 2) st.face = aimX < a.x ? -1 : 1;
      }
      st.x = a.x; st.y = a.y; st.t = rt; st.atk = a.atkT || 0;
    }
    var since = rt - st.attackAt;
    var frame = st.moving ? 2 + Math.floor(st.distance / (en.d.walkStep || 8)) % 4 : (since < .2 ? 7 : (since < 1.6 && a.atkT > 0 && a.atkT < .2 ? 6 : 0));
    var scale = 76 / (en.d.T * (en.d.ss || XY.SINK_SS));
    c.save(); c.translate(a.x, a.y + 14); c.scale(st.face * scale, scale);
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.filter = a.hurtT > 0 && !(XY.shieldUI && XY.shieldUI.isShieldOnly(G, a)) ? 'grayscale(.8) sepia(.5) brightness(1.35)' : 'grayscale(.8)';
    XY.SINK.drawFrame(c, en, frame); c.restore();
    R4.skyLast = { kind:'sky', identity:'spear-soldier', frame:frame, face:st.face, foot:a.y + 14, moving:st.moving, hurt:a.hurtT > 0 };
    return true;
  };
  R4.allies = function (c, G, rt) {
    var T = R(), i;
    for (i = 0; i < G.allies.length; i++) {
      var a = G.allies[i]; if (a.dead || !inV(G, a.x, a.y, 100)) continue;
      var al = Math.min(1, a.life / 2, 1 - Math.max(0, 0.6 - (a.born || 0)) * 0.5);
      c.globalAlpha = Math.max(0.3, al);
      c.fillStyle = 'rgba(70,50,30,0.18)'; c.beginPath(); c.ellipse(a.x, a.y + 12, 11, 4, 0, 0, PI2); c.fill();
      if (a.vmin) { XY.villainUI.drawMinion(c, a, rt, G); c.globalAlpha = 1; continue; }          // v0.9 牛魔王召的小妖
      if (a.ud) {
        c.globalAlpha = Math.min(1, Math.max(0.3, a.life / 2));
        if (a.shot && a.shot.t > 0) { a.shot.t -= 1 / 60; c.strokeStyle = 'rgba(82,107,91,' + Math.min(1, a.shot.t * 6) + ')'; c.lineWidth = 2; c.beginPath(); c.moveTo(a.x + 8, a.y); c.lineTo(a.shot.x, a.shot.y); c.stroke(); }
        R4.drawUndead(c, a, rt, G);
        if (a.hp < a.maxHp || (XY.shieldUI && XY.shieldUI.visible(G, a))) T.bar(c, a.x - 12, a.y + 18, 24, 4, a.hp / a.maxHp, '#5cb85c', 'rgba(255,255,255,0.8)');
        if (XY.shieldUI) XY.shieldUI.drawWorld(c, G, a, a.x - 12, a.y + 18, 24);
        c.globalAlpha = 1; continue;
      }
      R4.drawSkyAlly(c, a, rt, G);
      if (a.hp < a.maxHp || (XY.shieldUI && XY.shieldUI.visible(G, a))) T.bar(c, a.x - 12, a.y + 18, 24, 4, a.hp / a.maxHp, '#5cb85c', 'rgba(255,255,255,0.8)');
      if (XY.shieldUI) XY.shieldUI.drawWorld(c, G, a, a.x - 12, a.y + 18, 24);
      c.globalAlpha = 1;
    }
    var st = G.allies.filter(function (a) { return !a.dead && !a.decoy && !a.vmin && (a.mode === 'station' || a.mode === 'garrison') && a.anchor; })[0];
    // 320 是跟随/驻守锚点的活动限制，不是近战攻击半径；截图分身也没有该范围。
    // 亡灵与天兵共用驻守提示，但名称来自真实类型；登记后续英雄命令/名牌的避让区域。
    if (st) {
      var status = (st.ud ? '亡灵' : '天兵') + '·驻守';
      c.save();
      var labelY = R4.placeLabel(c, status, st.anchor.x, st.anchor.y + 38, 12, 1);
      T.otxt(c, status, st.anchor.x, labelY, 12, '#665940', 'center', true);
      c.restore();
    }
  };
  R4.heroOver = function (c, G, h, rt) {
    if (h.down) return;
    if (h.ringT > 0) {                                    // 六环绕身（Phyrex / 腾EO 大招）
      for (var i = 0; i < 6; i++) { var a = rt * 6 + i * PI2 / 6; c.strokeStyle = h.def.color; c.fillStyle = (h.def.frame || '#fff') + 'cc'; c.lineWidth = 3; c.beginPath(); c.arc(h.x + Math.cos(a) * 80, h.y + Math.sin(a) * 80, 11, 0, PI2); c.fill(); c.stroke(); }
    }
    if (h.shield > 0) { c.strokeStyle = 'rgba(160,130,80,0.9)'; c.lineWidth = 4; c.setLineDash([10, 6]); c.lineDashOffset = -rt * 20; c.beginPath(); c.arc(h.x, h.y, h.def.r + 14, 0, PI2); c.stroke(); c.setLineDash([]); }
    if (h.taunt > 0) { c.strokeStyle = 'rgba(242,143,176,0.8)'; c.lineWidth = 3; c.beginPath(); c.arc(h.x, h.y, h.def.r + 10 + Math.sin(rt * 12) * 3, 0, PI2); c.stroke(); }
    // v0.8.1：特殊人物的 Lv 并入头顶名牌（render.js flushHeroNames），这里不再单独画在脚下
  };
  R4.over = function (c, G, app, rt) {
    var T = R(), m = app.moveMark;
    if (m) {                                              // 鼠标目的地：脉冲圈 + 小旗
      var k = 0.5 + 0.5 * Math.sin(m.t * 8);
      c.strokeStyle = 'rgba(224,120,30,' + (0.6 + 0.3 * k) + ')'; c.lineWidth = 3; c.beginPath(); c.arc(m.x, m.y, 12 + k * 6, 0, PI2); c.stroke();
      c.fillStyle = '#a83224'; c.beginPath(); c.arc(m.x, m.y, 4, 0, PI2); c.fill();
      c.strokeStyle = '#8a4a05'; c.lineWidth = 2; c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x, m.y - 26); c.stroke();
      c.fillStyle = '#a83224'; c.beginPath(); c.moveTo(m.x, m.y - 26); c.lineTo(m.x + 14, m.y - 21); c.lineTo(m.x, m.y - 16); c.closePath(); c.fill();
    }
    if (XY.synActive) {                                   // 协同技：激活时两位角色之间拉一条粉色光带 + 名字
      var sa = XY.synActive(G);
      for (var si = 0; si < sa.length; si++) {
        var q = sa[si], ddx = q.b.x - q.a.x, ddy = q.b.y - q.a.y, dd = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dd > 800) continue;
        c.globalAlpha = 0.35 + 0.2 * Math.sin(rt * 4 + si); c.strokeStyle = '#c0489a'; c.lineWidth = 3; c.setLineDash([10, 8]); c.lineDashOffset = -rt * 30;
        c.beginPath(); c.moveTo(q.a.x, q.a.y); c.lineTo(q.b.x, q.b.y); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
        T.otxt(c, '协同·' + q.S.fullName + ' Lv' + q.l, (q.a.x + q.b.x) / 2, (q.a.y + q.b.y) / 2 - 12, 12, '#a03a82', 'center', true);
      }
    }
  };

  // v0.4.1 打击反馈层：连杀计数 / 连杀里程碑 / 清屏白光 + 大字
  R4.fxHud = function (c, G, app) {
    var T = R(), W = app.lw, H = app.lh, cb = G.combo, k;
    if ((!XY.compactHud || !XY.compactHud.on(G,app)) && ((cb && cb.n >= 3) || G.comboMs)) {                                          // v0.7.0l：连杀小标签；v0.8.0 起放在顶部居中、通知条正下方（原来在通知行右侧，手机竖屏会盖住暂停 / 菜单按钮）
      var M = topMetrics(app), n = G.comboMs ? G.comboMs.n : cb.n, ms = G.comboMs ? Math.sin(Math.min(1, G.comboMs.t / 0.25) * Math.PI) : 0;
      var cw0 = M.mob ? 140 : 112, cx0 = Math.round(W / 2 - cw0 / 2), cy0 = M.ty + M.th + 6, a0 = G.comboMs ? 1 : Math.min(1, cb.t / 0.6), col = n >= 50 ? '#a83224' : (n >= 25 ? '#8a3a22' : '#7a5a1e');
      c.save(); c.globalAlpha = a0; T.panel(c, cx0, cy0, cw0, M.th, 9, 'rgba(255,250,236,0.95)', col);
      var ct = XY.fmtNum(n) + ' 连杀', cs = Math.round((M.mob ? 22 : 16) * (1 + 0.15 * ms)); while (cs > 11 && tw(c, ct, cs, true) > cw0 - 14) cs--;
      T.txt(c, ct, cx0 + cw0 / 2, cy0 + M.th / 2 - (cb ? 2 : 0), cs, col, 'center', true);
      if (cb) { c.fillStyle = 'rgba(217,130,43,0.85)'; c.fillRect(cx0 + 8, cy0 + M.th - 5, (cw0 - 16) * Math.max(0, Math.min(1, cb.t / 2.8)), 2); }
      c.restore(); rec('combo', cx0, cy0, cw0, M.th);
    }
    if (G.flash > 0) { R4.clipOutTop(c, app); c.globalAlpha = Math.min(0.45, G.flash); c.fillStyle = '#fff6d6'; c.fillRect(0, 0, W, H); c.restore(); }
    if (G.clearFx) {                                                               // v0.7.0n：不再盖在屏幕中央 — 缩成通知行下面一条小横幅（≤1 秒），战场一直看得见
      var M2 = topMetrics(app); k = G.clearFx.t / G.clearFx.max; var pop = 1 + 0.35 * Math.max(0, 1 - k * 6), by = M2.ty + M2.th + (M2.mob ? 22 : 24) + ((G.combo && G.combo.n >= 3) || G.comboMs ? M2.th + 6 : 0);
      var big = Math.round((M2.mob ? 34 : 30) * pop), lab = G.clearFx.label || '清屏', sub = '一口气扫掉 ' + XY.fmtNum(G.clearFx.n) + ' 只妖怪';
      c.save(); c.globalAlpha = Math.min(1, (1 - k) * 2.2, k * 12 + 0.25);
      c.restore(); R4.clearBox = null;
    } else R4.clearBox = null;
  };

  /* ================= HUD ================= */
  function mouseIn(app, x, y, w, h) { return app.mouse && app.mouse.x >= x && app.mouse.x <= x + w && app.mouse.y >= y && app.mouse.y <= y + h; }
  R4.heroInfo = function (h) {
    var d = h.def, dt = d.dtype === 'magic' ? '法术' : '物理', ew = XY.weakText(d.elem);
    return [d.name + (d.special ? ' · Lv' + d.lv + ' 常驻' : '') + (d.role ? ' · ' + d.role : '') + ' · 生命 ' + Math.ceil(h.hp) + '/' + h.maxHp,
      '伤害：' + dt + ' · 元素：' + ELN(d.elem) + '   物防 ' + Math.round((h.pdef || 0) * 100) + '%  法防 ' + Math.round((h.mdef || 0) * 100) + '%' + (ew ? '   怕「' + ew + '」' : '')]
      .concat(d.sup ? ['辅助技能：' + d.sup.map(function (q) { return q.name + '（' + q.cd + '）'; }).join(' · '), '弱点：' + d.weakTxt] : []);
  };
  var HCOL = { ride: '#2d9aa6', follow: '#3d6288', station: '#a8700a', attack: '#b8300f', guard: '#2f7d3b' };

  // 屏幕上方居中的 BOSS 狂暴提示：倒数中 = 浅色胶囊 + 剩余进度条，≤30 秒琥珀色提示，≤10 秒红色脉动；已狂暴 = 红底白字（数值 / 出怪倍率）
  function drawEnrage(c, G, app, W, y) {
    var b = XY.enrageFocus(G); if (!b || G.tut) return y;
    var T = R(), rt = app.rt, w = Math.min(W - 20, 470), x = W / 2 - w / 2, h = 34, name = b.def.name, total = XY.enrageSeconds(b);
    if (b.enraged) {
      T.rrect(c, x, y, w, h, 11); c.fillStyle = 'rgba(247,241,228,0.96)'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#2a2118'; c.stroke();
      T.txt(c, name + ' 狂暴中 · 数值 ×' + C.BOSS_ENRAGE_MUL + ' · 小怪出量 ×' + (G.enrageMul || 1), W / 2, y + h / 2 + 1, 15, '#24180f', 'center', true);
      return y + h + 6;
    }
    var t = Math.max(0, b.enrageT), lk = enrageLook(t, rt), msg = lk.warn === 2 ? '就要狂暴了！快打！' : (lk.warn === 1 ? '快点打，不然它要狂暴！' : '');
    c.globalAlpha = 0.97; T.rrect(c, x, y, w, h, 11); c.fillStyle = lk.fill; c.fill(); c.lineWidth = lk.warn ? 3 : 2; c.strokeStyle = lk.line; c.stroke(); c.globalAlpha = 1;
    T.txt(c, name + ' 狂暴倒计时 ' + XY.fmtTime(t), x + 14, y + 13, 15, lk.ink, 'left', true);
    if (msg) T.txt(c, msg, x + w - 14, y + 13, 13, lk.ink, 'right', true);
    else T.txt(c, '时间到还没打死：数值 ×' + C.BOSS_ENRAGE_MUL + '，小怪出量 ×' + C.ENRAGE_SPAWN_MUL, x + w - 14, y + 13, 11, T.T.inkSoft, 'right', false);
    T.bar(c, x + 12, y + 23, w - 24, 6, t / total, lk.warn === 2 ? '#d62828' : (lk.warn === 1 ? '#e08a0b' : '#9b59d0'), 'rgba(255,255,255,0.85)');
    return y + h + 6;
  }
  // v0.7 妖潮预告条：休息点显示当前阶段及倒计时；下一波 ≤ WAVE_LEAD 秒时再加一行“几秒后 · 哪个方向 · 什么怪 × 多少”；刚刷出来的 4 秒显示“妖潮来袭”
  function waveTri(c, x, y, a, s, fill) {
    c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = fill || '#5c4a38'; c.strokeStyle = 'rgba(246,239,226,0.4)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(s, 0); c.lineTo(-s * 0.7, -s * 0.8); c.lineTo(-s * 0.35, 0); c.lineTo(-s * 0.7, s * 0.8); c.closePath(); c.fill(); c.stroke(); c.restore();
  }
  function waveCompTxt(w, G) {
    if (w.arrival) return '已入场 ' + w.arrival.total + ' 只 · 额外增援另计';
    return '计划 ' + wavePlanCounts(w, G).total + ' 只 · 按战场余量入场';
  }
  function wavePlanCounts(w, G) {
    var mi = XY.waveMulInfo ? XY.waveMulInfo(G) : { m: 1, far: false }, em = mi.m / (mi.far ? 1.8 : 1);
    var ground = Math.round(w.n * em) + (mi.far ? Math.round(w.n * 0.8 * em) : 0);
    var elite = w.elite || 0, air = w.air ? w.air.bat + w.air.owl : 0;
    return { ground: ground, elite: elite, air: air, total: ground + elite + air };
  }
  function waveCompDetails(w, G) {
    var out = [], E = XY.ENEMIES;
    if (w.arrival) {
      var ids = ['small', 'ranged', 'tank', 'shield', 'elite', 'bat', 'owl'], row = [];
      ids.forEach(function (id) { var n = w.arrival.types[id] || 0; if (n > 0) { row.push(E[id].name + '×' + n); if (row.length === 3) { out.push(row.join(' · ')); row = []; } } });
      if (row.length) out.push(row.join(' · '));
      if (!w.arrival.total) out.push('战场余量不足，本波编队未入场。');
    } else {
      var p = wavePlanCounts(w, G);
      out.push('计划地面 ' + p.ground + ' · 精英护送 ' + p.elite + ' · 飞妖 ' + p.air);
      out.push('计划数不保证全部入场，以来袭时的战场余量为准。');
    }
    out.push('本波编队统计不含随后另刷的飞妖增援。');
    return out;
  }
  function drawWaveChip(c, G, app, W, y) {
    var F = XY.waveForecast(G); if (!F) return y;
    var T = R(), rt = app.rt, w = Math.min(W - 20, 470), x = W / 2 - w / 2, W0 = F.now ? F.now.w : (F.next ? F.next.w : null), h = W0 ? 48 : 26;
    var near = F.next && F.next.left <= 8, hot = !!F.now || near, p = 0.5 + 0.5 * Math.sin(rt * 9);
    var bd = F.now ? '#a42d19' : '#5c4a38';
    c.globalAlpha = 0.96; T.rrect(c, x, y, w, h, 11); c.fillStyle = F.now ? 'rgba(255,238,232,0.97)' : (near ? 'rgba(255,246,226,0.97)' : 'rgba(255,255,255,0.94)'); c.fill();
    c.lineWidth = hot ? 2.5 + p : 1.8; c.strokeStyle = bd; c.stroke(); c.globalAlpha = 1;
    var segT = F.seg ? '守营 · ' + F.seg.label + ' ' + XY.fmtTime(Math.ceil(F.seg.left)) : '行军 · 前方有妖群';
    T.txt(c, segT, x + 12, y + 13, 13, T.T.inkSoft, 'left', true);
    if (F.now) {
      T.txt(c, '妖潮来袭！' + F.now.w.dir, x + w - 36, y + 13, 14, '#c0281a', 'right', true); waveTri(c, x + w - 18, y + 13, F.now.w.a, 8, '#d62828');
    } else if (F.next) {
      T.txt(c, '下一波 ' + XY.fmtTime(Math.ceil(F.next.left)) + ' · ' + F.next.w.dir, x + w - 36, y + 13, 14, near ? '#a42d19' : T.T.ink, 'right', true); waveTri(c, x + w - 18, y + 13, F.next.w.a, 8, near ? '#a42d19' : '#3a2a1c');
    }
    if (W0) T.txt(c, W0.name + (W0.big ? '！' : '') + ' · ' + waveCompTxt(W0, G), x + 12, y + 33, 12.5, W0.big ? '#b8300f' : T.T.ink, 'left', W0.big);
    return y + h + 6;
  }
  // 屏幕里的方向提示：从唐僧朝来袭方向射到可玩区域边缘，画一个脉动的箭头 + “妖潮”小字（只在最后 WAVE_LEAD 秒和刚来袭时画）
  function drawWaveEdge(c, G, app, W, H) {
    var F = XY.waveForecast(G); if (!F || !(F.now || F.next)) return;
    var w0 = F.now ? F.now.w : F.next.w, tg = G.heroes[0], T = R(), rt = app.rt;
    var xl = 300, xr = W - 290, yt = 150, yb = H - 200; if (xr - xl < 160) { xl = W * 0.25; xr = W * 0.75; }
    var x0 = Math.min(Math.max(tg.x - G.cam.x + G.view.w / 2, xl + 30), xr - 30), y0 = Math.min(Math.max(tg.y - G.cam.y + G.view.h / 2, yt + 30), yb - 30);
    var dx = Math.cos(w0.a), dy = Math.sin(w0.a), tt = 1e9;
    if (dx > 1e-3) tt = Math.min(tt, (xr - x0) / dx); else if (dx < -1e-3) tt = Math.min(tt, (xl - x0) / dx);
    if (dy > 1e-3) tt = Math.min(tt, (yb - y0) / dy); else if (dy < -1e-3) tt = Math.min(tt, (yt - y0) / dy);
    var px = x0 + dx * tt, py = y0 + dy * tt; XY.ui.waveArrow = { x: px, y: py, a: w0.a, x0: x0, y0: y0 };
    if (G.camp) {
      var csx = G.camp.x - G.cam.x + G.view.w / 2, csy = G.camp.y - G.cam.y + G.view.h / 2;
      if (Math.hypot(px - csx, py - csy) < 150) return;
    }
    var p = 0.5 + 0.5 * Math.sin(rt * 8), hot = !!F.now || (F.next && F.next.left <= 8);
    var col = hot ? '#a42d19' : '#3a2a1c', s = 15 + 3 * p;
    c.save(); c.globalAlpha = 0.28 + 0.2 * p; var gr = c.createRadialGradient(px, py, 4, px, py, 90); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(px - 90, py - 90, 180, 180); c.restore();
    waveTri(c, px - dx * 6, py - dy * 6, w0.a, s, col);
    var lx = px - dx * 44, ly = py - dy * 44; T.txt(c, F.now ? '妖潮来了' : '妖潮 ' + XY.fmtTime(Math.ceil(F.next.left)), lx, ly, 12, hot ? '#a42d19' : '#3a2a1c', 'center', true);
  }
  // ===== v0.7.0l 顶部重排（docs/ui-relayout/merged.md）=====
  // 顶部只有：Z0 经验细线(5) + Z1 一条细条(关卡 · 时间 · 等级 · 出怪量 + 至多 4 个 chip) + Z2 一条通知 toast(同一时刻最多 1 条) + Z2 右侧连杀小标签。
  // 总高度预算 ≤ 屏高 10%（手机横屏 ≤ 11%）；说明性长句只在悬停 chip 的提示里出现。
  var TOPL = { xp: 5 };
  function topMetrics(app) {                             // v0.7.0n：手机上字号按“实际缩放后 ≥ 10.5px”反推（原来 13×1.25×0.54 ≈ 8.8px 太小）
    var mob = app.zoom < 0.75;
    return { mob: mob, k: mob ? 1.25 : 1, y: mob ? 7 : 6, h: mob ? 40 : 34, ty: mob ? 49 : 46, th: mob ? 30 : 26, ch: mob ? 29 : 24, cap: mob ? 2 : 4,
      f1: mob ? 21 : 13, f2: mob ? 28 : 21, f3: mob ? 21 : 12, f4: 13, cf: mob ? 21 : 13, nf: mob ? 22 : 15 };
  }
  R4.topMetrics = topMetrics;
  var _twC = Object.create(null), _twN = 0;
  function tw(c, s, sz, bold) {
    var k = (bold ? 'b' : 'n') + sz + s, w = _twC[k]; if (w !== undefined) return w;
    c.font = (bold ? 'bold ' : '') + sz + 'px ' + C.FONT; w = c.measureText(XY.fmtStr(s)).width;
    if (++_twN > 800) { _twC = Object.create(null); _twN = 0; } _twC[k] = w; return w;
  }
  R4.tw = tw;
  R4.battleChips = function(G,app) { return topChips(G,app,{cap:20}); };
  function topChips(G, app, M) {
    var out = [], rt = app.rt, tg = G.heroes[0], i, p;
    if (G.breach && !tg.down) { p = 0.5 + 0.5 * Math.sin(rt * 12); out.push({ id: 'breach', text: '⚠ 闯入营地', ink: '#fff', fill: 'rgba(214,40,40,' + (0.84 + 0.14 * p) + ')', bd: '#fff', tip: ['妖怪闯进营地了！师父一碰就输 — 快清掉！'] }); }
    var fb = G.tut ? null : XY.enrageFocus(G);
    if (fb) {
      var tot = XY.enrageSeconds(fb), t = Math.max(0, fb.enrageT || 0);
      if (fb.enraged) out.push({ id: 'rage', text: fb.def.name + ' 狂暴中', ink: '#24180f', fill: 'rgba(247,241,228,0.96)', bd: '#2a2118', tip: [fb.def.name + ' 狂暴中！数值 ×' + C.BOSS_ENRAGE_MUL + ' · 小怪出量 ×' + (G.enrageMul || 1)] });
      else { var lk = enrageLook(t, rt); out.push({ id: 'rage', text: (lk.warn ? '⚠ ' : '') + fb.def.name + ' 狂暴倒计时 ' + XY.fmtTime(t), ink: lk.ink, fill: lk.fill, bd: lk.line, bar: { f: t / tot, col: lk.warn === 2 ? '#d62828' : (lk.warn === 1 ? '#e08a0b' : '#9b59d0') }, tip: [fb.def.name + ' 狂暴倒计时 ' + XY.fmtTime(t), '时间到还没打死：数值 ×' + C.BOSS_ENRAGE_MUL + '，小怪出量 ×' + C.ENRAGE_SPAWN_MUL] }); }
    }
    var F = XY.waveForecast(G);
    if (F && (F.now || F.next || F.seg)) {
      var w0 = F.now ? F.now.w : (F.next ? F.next.w : null), nearW = F.next && F.next.left <= 12, segT = F.seg ? '守营 · ' + F.seg.label + ' ' + XY.fmtTime(Math.ceil(F.seg.left)) : '行军 · 前方有妖群';
      var wtxt = F.now ? '妖潮来袭 ' + F.now.w.dir : (nearW ? F.next.w.dir + ' ' + XY.fmtTime(Math.ceil(F.next.left)) : (F.seg ? F.seg.label + ' ' + XY.fmtTime(Math.ceil(F.seg.left)) : ''));
      if (wtxt) {
        var hot = !!F.now, wcol = hot ? '#d62828' : (nearW ? '#e08a0b' : '#c9a24a');
        var tl = [segT]; if (F.next) tl.push('下一波 ' + XY.fmtTime(Math.ceil(F.next.left)) + ' · ' + F.next.w.dir); if (w0) { tl.push(w0.name + (w0.big ? '！' : '') + ' · ' + waveCompTxt(w0, G)); tl = tl.concat(waveCompDetails(w0, G)); }
        out.push({ id: 'wave', text: wtxt, ink: hot ? '#c0281a' : (nearW ? '#9a5a00' : T_INK()), fill: hot ? 'rgba(255,238,232,0.96)' : (nearW ? 'rgba(255,246,226,0.96)' : 'rgba(255,255,255,0.9)'), bd: wcol, tri: w0 && (hot || nearW) ? { a: w0.a, col: wcol } : null, tip: tl });
      }
    }
    var dl = [];
    G.dens.forEach(function (den, di) {
      var b = den.boss; if (!den.alive || !b || b.dead || b === fb) return;
      var ec = ELC(den.elem), tx = den.name, key = 1e9;
      if (den.closedT > 0 && den.closedT < 1e6) { tx += ' 闭门 ' + XY.fmtTime(Math.ceil(den.closedT)); key = 5e8; }
      else if (b.enraged) { tx += ' 狂暴'; key = -1; }
      else if (b.enrageT !== undefined) { tx += ' ' + XY.fmtTime(Math.max(0, b.enrageT)); key = b.enrageT; }
      var mult = b.maxHp / (b.baseHp || b.maxHp);
      dl.push({ id: 'den' + di, key: key, text: tx, ink: T_INK(), fill: 'rgba(255,255,255,0.9)', bd: ec, tip: [den.name + ' · ' + den.bossName + '（' + ELN(den.elem) + '）', 'BOSS 血量 ' + Math.ceil(b.hp) + ' / ' + Math.ceil(b.maxHp) + (mult > 1.02 ? ' · 强化 +' + Math.round((mult - 1) * 100) + '%' : '')] });
    });
    dl.sort(function (a, b) { return a.key - b.key; }); for (i = 0; i < dl.length; i++) out.push(dl[i]);
    if (out.length > M.cap) {
      var hid = out.splice(M.cap); out.push({ id: 'more', text: '+' + hid.length, ink: T_INK(), fill: 'rgba(255,255,255,0.9)', bd: '#b9a77a', tip: hid.map(function (h) { return h.text; }) });
    }
    return out;
  }
  function T_INK() { return R().T.ink; }
  function drawTop(c, G, app, ctx) {
    var T = R(), W = app.lw, rt = app.rt, M = topMetrics(app), k = M.k, i;
    // Z0 经验细线
    var need = XY.xpNeed(G.level), xf = Math.min(1, G.xp / need);
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(0, 0, W, TOPL.xp); c.fillStyle = '#7ccf6b'; c.fillRect(0, 0, W * xf, TOPL.xp);
    c.fillStyle = 'rgba(201,164,76,0.8)'; c.fillRect(0, TOPL.xp, W, 1); rec('xp', 0, 0, W, TOPL.xp + 1);
    if (app.mouse && app.mouse.y >= 0 && app.mouse.y <= TOPL.xp + 8 && app.mouse.x >= 0 && app.mouse.x <= W) app._tip = { x: Math.max(120, Math.min(W - 120, app.mouse.x)), y: TOPL.xp + 10, below: true, text: '等级 ' + G.level + '　经验 ' + Math.floor(G.xp) + ' / ' + need };
    // Z1 细条：先量宽度，再画
    var lvT = G.mod ? '非官方 ' + G.lv.name : G.dungeon ? '副本 ' + G.lv.name : '第 ' + G.levelId + ' 关 ' + G.lv.name, tmT = XY.fmtTime(G.t), lvL = 'Lv ' + G.level;
    var up = G.volDir > 0, dn = G.volDir < 0, vc = up ? '#d62828' : (dn ? '#2f9e4f' : T.T.inkSoft), spT = '出怪 ×' + G.spawnMul.toFixed(2) + (up ? '↑' : (dn ? '↓' : ''));
    var f1 = M.f1, f2 = M.f2, f3 = M.f3, f4 = M.f4, pad = 12, gap = 12;
    var w1 = tw(c, lvT, f1, true), w2 = tw(c, tmT, f2, true), w3 = tw(c, lvL, f3, true), w4 = M.mob ? 0 : tw(c, spT, f4, true);
    var mainW = pad + w1 + gap + w2 + gap + w3 + (w4 ? gap + w4 : 0) + pad;
    var maxW = Math.min(W - 2 * 256 + 20 > 360 ? 2 * (W / 2 - 256) : 360, 800), chips = topChips(G, app, M), cf = M.cf;
    function chipW(ch) { return tw(c, ch.text, cf, true) + 18 + (ch.tri ? 14 : 0); }
    var cw = 0, shown = chips.slice();
    function total() { var t = mainW; shown.forEach(function (ch) { t += 6 + chipW(ch); }); return t + 6; }
    while (shown.length && total() > maxW) { var drop = shown.splice(shown.length - 1, 1)[0]; if (drop.id !== 'more') { var mo = shown.filter(function (x) { return x.id === 'more'; })[0]; if (mo) { mo.n = (mo.n || +mo.text.slice(1)) + 1; mo.text = '+' + mo.n; mo.tip.push(drop.text); } else { shown.push({ id: 'more', n: 1, text: '+1', ink: T_INK(), fill: 'rgba(255,255,255,0.9)', bd: '#b9a77a', tip: [drop.text] }); } } if (shown.length === 1 && shown[0].id === 'more') break; }
    var sw = Math.min(maxW, total()), sx = Math.round(W / 2 - sw / 2), sy = M.y, sh = M.h;
    T.panel(c, sx, sy, sw, sh, 10, 'rgba(251,247,238,0.95)', '#c9a44c'); rec('top', sx, sy, sw, sh);
    var cy = sy + sh / 2 + 1, x = sx + pad;
    T.txt(c, lvT, x, cy, f1, '#6b5b45', 'left', true); x += w1 + gap;
    T.txt(c, tmT, x, cy, f2, T.T.ink, 'left', true); x += w2 + gap;
    T.txt(c, lvL, x, cy, f3, '#3d7a2f', 'left', true); x += w3 + gap;
    if (w4) { T.txt(c, spT, x, cy, f4, vc, 'left', true); x += w4; }
    var hits = XY.ui.topChips = [], tip = null;
    x = sx + mainW - pad + 4;
    var chh = M.ch, chy = sy + (sh - chh) / 2;
    shown.forEach(function (ch) {
      var w = chipW(ch); x += 6;
      c.globalAlpha = 0.97; T.rrect(c, x, chy, w, chh, chh / 2); c.fillStyle = ch.fill; c.fill(); c.lineWidth = 2; c.strokeStyle = ch.bd; c.stroke(); c.globalAlpha = 1;
      var tx0 = x + 9;
      if (ch.tri) { waveTri(c, x + 15, chy + chh / 2, ch.tri.a, 5.5, ch.tri.col); tx0 += 14; }
      T.txt(c, ch.text, tx0, chy + chh / 2 + 1, cf, ch.ink, 'left', true);
      if (ch.bar) { c.fillStyle = 'rgba(60,50,30,0.16)'; c.fillRect(x + 10, chy + chh - 4, w - 20, 2); c.fillStyle = ch.bar.col; c.fillRect(x + 10, chy + chh - 4, Math.max(2, (w - 20) * Math.max(0, Math.min(1, ch.bar.f))), 2); }
      hits.push({ id: ch.id, x: x, y: chy, w: w, h: chh });
      if (!tip && app.mouse && ch.tip && mouseIn(app, x, chy, w, chh)) tip = { x: x + w / 2, y: sy + sh + 4, below: true, lines: ch.tip };
      x += w;
    });
    if (tip) app._tip = tip;
    ctx.denBottom = sy + sh;
    ctx.topCount = 1 + shown.length;
  }
  // 通知：同一时刻最多 1 条（G.banner / G.toast 现在都是“队列里当前这一条”），淡入 150ms / 淡出 300ms，长句只显示短句，全文进 G.noteLog / 悬停提示
  function drawNote(c, G, app, ctx) {
    var T = R(), W = app.lw, M = topMetrics(app), n = G.banner || G.toast; XY.ui.banner = null;
    if (!n) return;
    var left = n.t, age = (n.max || 3) - n.t; if (n.max == null) { age = 1; }
    var al = Math.max(0, Math.min(1, age / 0.15, left / 0.3)), lift = (1 - Math.min(1, age / 0.15)) * -6 + (left < 0.3 ? (1 - left / 0.3) * -6 : 0);
    var txt = n.short || XY.noteShort(n.text), lv = (n.lv != null ? n.lv : (G.banner ? 1 : 0)), f = M.nf, maxw = M.mob ? 560 : 420;
    while (f > 11 && tw(c, txt, f, true) + 28 > maxw) f--;
    maxw = Math.max(200, Math.min(maxw, 2 * (W - (app.touchUI ? 206 : 104) - W / 2)));       // v0.8.0：通知条不盖暂停 / 菜单按钮（它们在右上角、和通知条同一高度）
    while (f > 11 && tw(c, txt, f, true) + 28 > maxw) f--;
    var w = Math.min(maxw, tw(c, txt, f, true) + 28);
    if (tw(c, txt, f, true) + 28 > maxw) { var mx = txt.length; while (mx > 4 && tw(c, txt.slice(0, mx) + '…', f, true) + 28 > maxw) mx--; txt = txt.slice(0, mx) + '…'; w = maxw; }
    var y = Math.max(M.y + M.h + 2, (G.tut && ctx.tutBottom ? ctx.tutBottom + 6 : M.ty) + lift), x = W / 2 - w / 2;   // 通知上浮也不能越过顶部细条的下边界
    c.globalAlpha = al; T.panel(c, x, y, w, M.th, 9, 'rgba(255,250,236,0.96)', lv >= 2 ? '#d9503c' : '#d9a21a');
    T.txt(c, txt, W / 2, y + M.th / 2 + 1, f, lv >= 1 ? '#9a3b1f' : T.T.ink, 'center', true); c.globalAlpha = 1;
    XY.ui.banner = { x: x, y: y, w: w, h: M.th }; rec('toast', x, y, w, M.th);
  }
  function ui_hit() { }

  function drawMini(c, G, app, y0) {
    var T = R();
    // v0.8.0：小地图搬到右上角（菜单按钮下面）
    var mw = 190, mh = 119, sc = mw / C.WORLD_W, mx = app.lw - 12 - (mw + 8), my = y0;
    // 半透明：底板 / 边框 50%（鼠标移上去降到 32%），战场透出来；标记点（唐僧 / 英雄 / 洞府 / 关口 / 营地 / 被困者）仍然不透明
    var hov = mouseIn(app, mx, my, mw + 8, mh + 8), ma = hov ? 0.32 : 0.5; XY.ui.miniAlpha = ma;
    T.panel(c, mx, my, mw + 8, mh + 8, 8, 'rgba(252,248,236,' + ma + ')', 'rgba(150,125,80,' + ma + ')'); rec('minimap', mx, my, mw + 8, mh + 8);
    c.save(); T.rrect(c, mx + 4, my + 4, mw, mh, 5); c.clip();
    c.fillStyle = 'rgba(233,241,218,' + ma + ')'; c.fillRect(mx + 4, my + 4, mw, mh);
    function mp(x, y) { return { x: mx + 4 + x * sc, y: my + 4 + y * sc }; }
    G.dens.forEach(function (d) { var p = mp(d.x, d.y); c.fillStyle = d.alive ? ELC(d.elem) : '#b0aca0'; c.strokeStyle = '#fff'; c.lineWidth = 1; c.beginPath(); c.arc(p.x, p.y, d.alive ? 5 : 3, 0, 6.3); c.fill(); c.stroke(); });
    var gp = mp(G.gate.x, G.gate.y); c.fillStyle = G.gate.sealed ? '#9a8a78' : '#e0a415'; c.fillRect(gp.x - 4, gp.y - 6, 8, 12);
    var cpp = mp(G.camp.x, G.camp.y); c.fillStyle = '#d9a21a'; c.beginPath(); c.arc(cpp.x, cpp.y, 4.5, 0, 6.3); c.fill();
    G.captives.forEach(function (k) { if (k.freed) return; var p = mp(k.x, k.y); c.fillStyle = '#5a8ad8'; c.fillRect(p.x - 2.5, p.y - 2.5, 5, 5); });
    G.heroes.forEach(function (h) { if (h.down) return; var p = mp(h.x, h.y); c.fillStyle = h.id === 'tang' ? '#e0a415' : h.def.color; c.strokeStyle = '#333'; c.lineWidth = 0.8; c.beginPath(); c.arc(p.x, p.y, h.id === 'tang' ? 3.5 : 2.5, 0, 6.3); c.fill(); c.stroke(); });
    var v = mp(G.cam.x - G.view.w / 2, G.cam.y - G.view.h / 2); c.strokeStyle = 'rgba(60,50,30,0.7)'; c.lineWidth = 1; c.strokeRect(v.x, v.y, G.view.w * sc, G.view.h * sc);
    if (XY.fork) XY.fork.drawMini(c, G, mp);
    c.restore();
    T.txt(c, '小地图', mx + 10, my + mh - 2, 9.5, T.T.inkSoft, 'left', false);
    return my + mh + 8;
  }
  function drawLeft(c, G, app) {
    if(XY.ui2.on&&XY.inkHud)return XY.inkHud.left(c,G,app);
    var T = R(), rt = app.rt, tg = G.heroes[0], i;
    T.panel(c, 12, 26, 214, 78, 12); rec('gold', 12, 26, 214, 78);
    c.fillStyle = '#ffd24a'; c.strokeStyle = '#b8860b'; c.lineWidth = 2; c.beginPath(); c.arc(30, 44, 9, 0, 6.3); c.fill(); c.stroke();
    T.txt(c, '金币 ' + G.coins, 46, 44, 18, T.T.ink, 'left', true);
    T.txt(c, '击杀 ' + G.kills, 140, 44, 14, T.T.inkSoft, 'left', false);
    var cf = G.camp.hp / G.camp.maxHp;
    T.txt(c, '经书营地', 24, 68, 13, T.T.ink, 'left', true);
    T.txt(c, Math.ceil(G.camp.hp) + ' / ' + G.camp.maxHp, 214, 68, 12, T.T.inkSoft, 'right', false);
    T.bar(c, 22, 80, 190, 11, cf, T.hpColor(cf), 'rgba(255,255,255,0.8)');
    if (G.campAlert > 0 && Math.sin(rt * 14) > 0) { c.strokeStyle = '#e0533d'; c.lineWidth = 3; T.rrect(c, 12, 26, 214, 78, 12); c.stroke(); }
    // 唐僧
    var tpy = 110, tdg = !tg.down && (G.breach || G.tdanger), tflash = tdg && Math.sin(rt * 10) > 0;
    T.panel(c, 12, tpy, 214, 50, 12, tflash ? '#fff0ec' : undefined); rec('tang', 12, tpy, 214, 50);
    T.txt(c, '师父 唐僧', 24, tpy + 15, 14, T.T.ink, 'left', true);
    var inv = tg.inv > 0 && G.t < C.TANG_START_INV + 0.5;
    T.txt(c, inv ? '开局保护 ' + Math.ceil(tg.inv) + ' 秒' : (tg.down ? '阵亡' : '只有 1 点血'), 214, tpy + 15, 12, inv ? '#a8700a' : '#b5503a', 'right', true);
    T.bar(c, 22, tpy + 28, 190, 14, tg.down ? 0 : 1, inv ? '#8a6a44' : '#3a2e26', '#efe6d4');
    if (tdg) T.txt(c, G.breach ? '妖怪闯进营地！' : '有东西逼近师父！', 117, tpy + 35, 10.5, '#fff', 'center', true);          // 平时不再常驻写“被碰到就输”（只在危险时提示）
    if (tdg) { c.strokeStyle = tflash ? '#e0533d' : '#f0a090'; c.lineWidth = 3; T.rrect(c, 12, tpy, 214, 50, 12); c.stroke(); }
    // 路程 / 休息状态（固定占 166~210）：路线进度条 + 休息倒计时
    var sy = 166, TT = G.tang, RR = G.rt, pf = TT.s / RR.total, rf = RR.restS / RR.total;
    rec('path', 12, sy, 214, 44);
    T.panel(c, 12, sy, 214, 44, 12, TT.phase === 'rest' ? 'rgba(255,243,196,0.97)' : undefined, TT.phase === 'rest' ? '#e0a415' : undefined);
    var stxt = tg.down ? '唐僧已阵亡' : (TT.phase === 'rest' ? '休息中 ' + XY.fmtTime(Math.max(0, TT.restMax - TT.restT)) + ' · 营地生效' : (TT.phase === 'walk' ? '自己赶路 · 去休息点' : (TT.phase === 'walk2' ? '继续西行 · 去关口' : '到关口了')));
    T.txt(c, stxt, 24, sy + 14, 12.5, TT.phase === 'rest' ? '#a8700a' : T.T.ink, 'left', true);
    T.txt(c, Math.round(pf * 100) + '%', 214, sy + 14, 11, T.T.inkSoft, 'right', false);
    c.fillStyle = 'rgba(120,100,60,0.18)'; T.rrect(c, 22, sy + 26, 190, 8, 4); c.fill();
    c.fillStyle = '#e8c050'; T.rrect(c, 22, sy + 26, Math.max(6, 190 * pf), 8, 4); c.fill();
    c.fillStyle = '#a8700a'; c.fillRect(22 + 190 * rf - 1, sy + 23, 2.5, 14);        // 休息点标记
    c.fillStyle = '#c0392b'; c.fillRect(22 + 190 - 2, sy + 23, 2.5, 14);               // 关口
    // 任务追踪
    var qy = 214, Q = G.quests, rows = 1 + 3, qh = 26 + 36 + 3 * 31 + 26;
    T.panel(c, 12, qy, 214, qh, 12); rec('quest', 12, qy, 214, qh);
    T.txt(c, '任务', 24, qy + 14, 14, T.T.ink, 'left', true);
    T.txt(c, '主线 ' + (Q.main.done ? '1/1' : '0/1') + ' · 支线 ' + Q.sides.filter(function (q) { return q.done; }).length + '/3', 214, qy + 14, 11, T.T.inkSoft, 'right', false);
    function qrow(q, y, tag) {
      var col = q.done ? '#2f7d3b' : (q.failed ? '#a33a2a' : T.T.ink), mark = q.done ? '✔ ' : (q.failed ? '✘ ' : '');
      T.txt(c, tag + mark + q.def.short, 22, y + 8, 12.5, col, 'left', true);
      T.txt(c, q.prog || '', 22, y + 23, 11, q.done ? '#2f7d3b' : (q.failed ? '#a33a2a' : T.T.inkSoft), 'left', false);
      if (!q.done && !q.failed && q.pmax > 0 && q.pv > 0) T.bar(c, 130, y + 19, 76, 6, q.pv / q.pmax, '#5cb85c', 'rgba(60,50,30,0.15)');
      if (q.def.reward) { var rw = q.def.reward, s = (rw.card ? '卡' : '') + (rw.lingshi ? ' 灵' + rw.lingshi : ''); T.txt(c, s, 206, y + 8, 10, '#a8700a', 'right', false); }
    }
    qrow(Q.main, qy + 24, '主线 ');
    Q.sides.forEach(function (q, k) { qrow(q, qy + 60 + k * 31, '支线 '); });
    var gy = qy + qh - 24, gd = Math.round(XY.dist(tg.x, tg.y, G.gate.x, G.gate.y));
    T.txt(c, G.gate.sealed ? '西行关口封印：先完成主线' : '→ 送唐僧到关口 · 距 ' + gd, 22, gy + 10, 11.5, G.gate.sealed ? T.T.inkSoft : '#a8700a', 'left', true);
    return qy + qh + 6;
  }

  // v0.7.0k：HUD 面板登记（回归测试 e2e-v29 用它检查面板之间不重叠）
  function rec(id, x, y, w, h) { (XY.ui.hud || (XY.ui.hud = [])).push({ id: id, x: x, y: y, w: w, h: h }); }
  // v0.8.0：右下角不再有「操作说明」框；操作说明搬进菜单面板（Tab / 点「菜单」/ 按 H）。召唤键是一枚圆形印章，贴在右下角
  function portrait(app) { return app.lw < 1000; }                      // v0.8.0：竖屏手机（逻辑宽 < 1000）走单独的底部布局
  // 竖屏底部布局（逻辑像素；手机上 1 逻辑像素 ≈ 0.5 CSS 像素，所以按钮高 84 ≈ 42 CSS px、字 ≥ 20 ≈ 10 CSS px）：
  // 自上而下：护法天兵条（五个天兵按钮 + 圆形召唤印章）→ 当前英雄面板（命令 / 特性 / 变身 / 骑乘 / 技能 CD）→ 一排紧凑英雄卡（头像 + 名字 + 血条）。
  // v0.9 队伍面板改成呼出式（hud2.js / XY.party）：竖屏底部常驻的只剩护法天兵条（含召唤印章），英雄卡在呼出面板里
  function botLayout(G, app) {
    var W = app.lw, H = app.lh, m = 12, bot = 28;
    var PB = XY.ui2 && XY.ui2.on ? 90 : 84, PE = XY.ui2 && XY.ui2.on ? 90 : 76, tbh = 124 + PB - 84, ty = H - bot - tbh, sr = 46;
    return { PB: PB, PE: PE, W: W, m: m, tx: m, ty: ty, tw: W - 2 * m - (2 * sr + 14), th: tbh, sky: { cx: W - m - sr - 4, cy: ty + tbh - sr - 6, r: sr } };
  }
  R4.botLayout = botLayout;
  function summonSpot(G, app) { if (XY.compactHud && XY.compactHud.on(G,app)) { var q=XY.compactHud.layout(app).sky; return {cx:XY.kToLog(app,q.cx),cy:XY.kToLog(app,q.cy),r:XY.kToLog(app,q.r)}; } if (portrait(app)) return botLayout(G, app).sky; if (XY.hud2 && XY.hud2.phoneLand(app)) { var z = app.zoom, W = app.lw * z, H = app.lh * z; return { cx: (W - 39) / z, cy: (H - 39) / z, r: 31 / z }; } return { cx: app.lw - 12 - 46, cy: app.lh - 12 - 46, r: 36 }; }
  R4.summonSpot = summonSpot;
  function drawTowerBarP(c, G, app) {
    if(XY.ui2.on&&XY.inkHud){var W=app.lw*app.zoom,H=app.lh*app.zoom;return XY.inkHud.soldiers(c,G,app,{x:8,y:H-111,w:W-92,h:99},false);}
    var T = R(), L = botLayout(G, app), tk = ['arrow', 'cannon', 'frost', 'siege', 'heal'], i, bx = L.tx, by = L.ty, bw = L.tw, bh = L.th;
    T.panel(c, bx, by, bw, bh, 14); rec('tower', bx, by, bw, bh);
    T.txt(c, '护法天兵', bx + 14, by + 20, 24, T.T.ink, 'left', true);
    var scap = XY.soldierCap(G), sfull = G.towers.length >= scap;
    T.txt(c, '天兵 ' + G.towers.length + '/' + scap + (sfull ? '（已满）' : ''), bx + bw - 14, by + 20, 22, sfull ? '#c0392b' : T.T.inkSoft, 'right', sfull);
    var gp = 6, w = Math.floor((bw - 16 - 4 * gp) / 5), h = L.PB, y = by + 36;
    for (i = 0; i < 5; i++) {
      var td = XY.TOWERS[tk[i]], x = bx + 8 + i * (w + gp), own = XY.save.solOwned(tk[i]), ok = own && G.coins >= XY.soldierCost(G,tk[i]), sel = app.build === tk[i];
      T.rrect(c, x, y, w, h, 12); c.fillStyle = ok ? '#fffdf6' : '#ececec'; c.fill(); c.lineWidth = sel ? 4 : 2; c.strokeStyle = sel ? '#e8892b' : (ok ? '#c9a24a' : '#c8c8c8'); c.stroke();
      c.fillStyle = ok ? td.color : '#bbb'; c.beginPath(); c.arc(x + w / 2, y + 28, 20, 0, 6.3); c.fill();
      if (!(XY.ICONINK && XY.ICONINK.sol(c, tk[i], x + w / 2, y + 26, 44, own ? 1 : 0.45))) T.txt(c, td.name.charAt(0), x + w / 2, y + 29, 24, '#fff', 'center', true);
      T.txt(c, own ? XY.soldierCost(G,tk[i]) + '' : '无卡', x + w / 2, y + 66, 24, ok ? '#a8700a' : '#aaa', 'center', true);
      XY.ui.hits.push({ x: x, y: y, w: w, h: h, act: 'tower', type: tk[i] });
    }
  }
  function drawTowerBar(c, G, app) {
    if(XY.ui2.on&&XY.inkHud&&!portrait(app)&&!(XY.hud2&&XY.hud2.phoneLand(app)))return XY.inkHud.soldiers(c,G,app,{x:12*app.zoom,y:(app.lh-112)*app.zoom,w:214*app.zoom,h:100*app.zoom},false);
    if (portrait(app)) return drawTowerBarP(c, G, app);
    if (XY.hud2 && XY.hud2.phoneLand(app)) return XY.hud2.drawTower(c, G, app);          // 手机横屏：左下独立天兵小条
    var T = R(), H = app.lh, bx = 12, bw = 214, bh = 100, by = H - bh - 12, tk = ['arrow', 'cannon', 'frost', 'siege', 'heal'], i;
    T.panel(c, bx, by, bw, bh, 12); rec('tower', bx, by, bw, bh);
    T.txt(c, '护法天兵', bx + 10, by + 13, 13, T.T.ink, 'left', true);
    var scap = XY.soldierCap(G), sfull = G.towers.length >= scap;
    T.txt(c, '天兵 ' + G.towers.length + '/' + scap + (sfull ? '（已满）' : ''), bx + bw - 10, by + 14, 12, sfull ? '#c0392b' : T.T.inkSoft, 'right', sfull);
    for (i = 0; i < 5; i++) {
      var td = XY.TOWERS[tk[i]], x = bx + 8 + i * 40, y = by + 26, own = XY.save.solOwned(tk[i]), ok = own && G.coins >= XY.soldierCost(G,tk[i]), hv = mouseIn(app, x, y, 38, 54), sel = app.build === tk[i];
      T.rrect(c, x, y, 38, 54, 8); c.fillStyle = ok ? (hv ? '#fff3d6' : '#fffdf6') : '#ececec'; c.fill(); c.lineWidth = sel ? 3 : 1.6; c.strokeStyle = sel ? '#e8892b' : (ok ? '#c9a24a' : '#c8c8c8'); c.stroke();
      c.fillStyle = ok ? td.color : '#bbb'; c.beginPath(); c.arc(x + 19, y + 17, 11, 0, 6.3); c.fill();
      if (!(XY.ICONINK && XY.ICONINK.sol(c, tk[i], x + 19, y + 15, 24, own ? 1 : 0.45))) T.txt(c, td.name.charAt(0), x + 19, y + 18, 13, '#fff', 'center', true);
      T.txt(c, own ? XY.soldierCost(G,tk[i]) + '' : '无卡', x + 19, y + 36, 12, ok ? '#a8700a' : '#aaa', 'center', true);
      T.txt(c, td.key.toUpperCase(), x + 19, y + 48, 10, '#8a7d63', 'center', true);
      XY.ui.hits.push({ x: x, y: y, w: 38, h: 54, act: 'tower', type: tk[i] });
      if (hv) app._tip = { x: x + 19, y: y - 6, text: td.name + '（卡 Lv' + XY.save.solLevel(tk[i]) + ' · ' + XY.save.solCards(tk[i]) + ' 张）：' + td.desc };
    }
  }

  // v0.8.0：「召唤」圆形水墨印章：一圈冷却环（中间是剩余秒数）、就绪时发光；说明放在悬停提示里，点击 / G 不变
  function kt(c, s, x, y, sz, col) { c.font = 'bold ' + sz + 'px ' + (XY.menu && XY.menu.KAI || XY.C.FONT); c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, x, y); }
  function drawSky(c, G, app) {
    var T = R(), sp = summonSpot(G, app), cx = sp.cx, cy = sp.cy, r = sp.r, s = XY.guest.state(G), cdMax = XY.guest.cdMax(G), pool = XY.guest.pool(G), rt = app.rt;
    var rcx = cx, rcy = cy, rr = r, sf = r / 36;                                   // 竖屏：印章放大（sf），画法不变：平移 + 缩放后按 36 半径画
    var busy = !!s.h, ready = !busy && s.cd <= 0 && pool.length > 0, hv = mouseIn(app, cx - r - 4, cy - r - 4, r * 2 + 8, r * 2 + 8), pul = 0.5 + 0.5 * Math.sin(rt * 4.5);
    rec('sky', cx - r - 5, cy - r - 5, r * 2 + 10, r * 2 + 10);
    c.save(); if (sf !== 1) { c.translate(rcx, rcy); c.scale(sf, sf); cx = 0; cy = 0; r = 36; }
    c.save();
    if (ready) { c.shadowColor = 'rgba(224,90,40,' + (0.45 + 0.35 * pul).toFixed(2) + ')'; c.shadowBlur = 16 + 10 * pul; }
    var g = c.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.2, cx, cy, r); g.addColorStop(0, ready ? (hv ? '#fff1d0' : '#ffe9bd') : '#f1eee6'); g.addColorStop(1, ready ? '#f6cf8a' : '#dedacd');
    c.beginPath(); c.arc(cx, cy, r, 0, 6.3); c.fillStyle = g; c.fill(); c.restore();
    // 印章的墨边：略不规则的双圈
    c.lineWidth = 3; c.strokeStyle = ready ? '#b8300f' : '#9a9486'; c.beginPath(); c.arc(cx, cy, r - 1.5, 0, 6.3); c.stroke();
    c.lineWidth = 1; c.strokeStyle = ready ? 'rgba(184,48,15,0.55)' : 'rgba(154,148,134,0.6)'; c.beginPath(); c.arc(cx, cy, r - 7, 0.15, 6.1); c.stroke();
    if (!ready && !busy && s.cd > 0 && pool.length) {                       // 冷却环：顺时针填满
      c.lineWidth = 5; c.lineCap = 'round'; c.strokeStyle = '#d8a13a'; c.beginPath(); c.arc(cx, cy, r + 4, -Math.PI / 2, -Math.PI / 2 + 6.2832 * (1 - s.cd / cdMax)); c.stroke(); c.lineCap = 'butt';
    }
    if (busy) { c.lineWidth = 5; c.lineCap = 'round'; c.strokeStyle = '#c0392b'; c.beginPath(); c.arc(cx, cy, r + 4, -Math.PI / 2, -Math.PI / 2 + 6.2832 * Math.max(0, 1 - s.t / s.max)); c.stroke(); c.lineCap = 'butt'; }
    if (busy) { kt(c, '在场', cx, cy - 8, 17, '#8a1f0c'); T.txt(c, Math.max(0, Math.ceil(s.max - s.t)) + ' 秒', cx, cy + 12, 13, '#7a5a10', 'center', true); }
    else if (ready) { kt(c, '召唤', cx, cy - 6, 22, '#b8300f'); T.txt(c, 'G', cx, cy + 15, 12, '#8a5a0b', 'center', true); }
    else if (!pool.length) { kt(c, '召唤', cx, cy - 4, 18, '#aaa'); T.txt(c, '无人', cx, cy + 14, 11, '#aaa', 'center', false); }
    else { kt(c, '召唤', cx, cy - 10, 17, '#8a7d63'); T.txt(c, Math.ceil(s.cd) + 's', cx, cy + 11, 16, '#6b5a37', 'center', true); T.txt(c, 'G', cx, cy + 25, 10, '#a89c80', 'center', false); }
    c.restore(); cx = rcx; cy = rcy; r = rr;
    XY.ui.hits.push({ x: cx - r, y: cy - r, w: r * 2, h: r * 2, act: 'guest' });
    if (hv) app._tip = { x: cx, y: cy - r - 10, text: '召唤特殊人物（G）：随机召来 1 位特殊人物（不含本局选的那位），立刻放出 TA 的大招，停留 ' + C.GUEST.STAY + ' 秒后离开；冷却 ' + cdMax + ' 秒' };
  }
  function H0(app) { return app.lh; }

  // v0.8.0 竖屏：一排紧凑英雄卡（头像 + 名字 + 血条，点一下 = 操控 TA）+ 当前英雄面板（命令 / 特性 / 变身 / 骑乘 / 技能 CD，按钮 ≥ 42 CSS px）
  // v0.8.3：一次性水珠小图标（就绪 = 蓝色实心水滴；冷却 = 灰色空心水滴 + 倒计时圈）
  function drawWard(c, w, x, y, r, rt) {
    var rdy = w.ready, pulse = rdy ? 0.5 + 0.5 * Math.sin(rt * 3) : 0;
    c.save(); c.translate(x, y);
    c.beginPath(); c.moveTo(0, -r * 1.25); c.bezierCurveTo(r * 0.9, -r * 0.2, r * 1.0, r * 0.35, 0, r); c.bezierCurveTo(-r * 1.0, r * 0.35, -r * 0.9, -r * 0.2, 0, -r * 1.25); c.closePath();
    if (rdy) { c.fillStyle = 'rgba(70,160,230,' + (0.85 + 0.1 * pulse) + ')'; c.fill(); c.lineWidth = Math.max(1.4, r * 0.2); c.strokeStyle = '#1d5e9e'; c.stroke(); c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.arc(-r * 0.3, -r * 0.1, r * 0.2, 0, 6.3); c.fill(); }
    else { c.fillStyle = 'rgba(214,218,222,0.8)'; c.fill(); c.lineWidth = Math.max(1.2, r * 0.16); c.strokeStyle = '#8a97a6'; c.stroke();
      c.strokeStyle = '#3d8fd0'; c.lineWidth = Math.max(2, r * 0.26); c.beginPath(); c.arc(0, 0, r * 1.35, -Math.PI / 2, -Math.PI / 2 + PI2 * (1 - w.cd / Math.max(1, w.max))); c.stroke(); }
    c.restore();
  }
  R4.drawWard = drawWard;
  // v0.9 队伍面板：所有尺寸共用 hud2.js 的呼出式水墨海报手卷（唐僧不进面板；收起时只画「队伍」签）。phase：'pre' = 面板打开（先画手卷，召唤印画在它上面；手卷底部自带水墨天兵，原天兵条不画）、'post' = 收起签 / 教程钉开
  function drawHeroCards(c, G, app, phase) { return XY.hud2.drawParty(c, G, app, phase || 'post'); }

  function drawTip(c, app, tip) {
    if(XY.ui2.on&&XY.inkHud)return XY.inkHud.tip(c,app,tip);
    if (!tip) return;
    var T = R(), W = app.lw, lines = tip.lines || [tip.text], w = 0, i;
    c.font = '12.5px ' + C.FONT;
    for (i = 0; i < lines.length; i++) w = Math.max(w, c.measureText(lines[i]).width);
    w = Math.min(W - 20, w + 24); var h = 12 + lines.length * 18, x = Math.max(10, Math.min(W - w - 10, tip.x - w / 2)), y = tip.below ? tip.y : tip.y - h;
    T.panel(c, x, y, w, h, 8, 'rgba(255,252,240,0.98)', '#c9a24a');
    for (i = 0; i < lines.length; i++) T.txt(c, lines[i], x + 12, y + 15 + i * 18, 12.5, i ? T.T.inkSoft : T.T.ink, 'left', i === 0);
  }

  // Consume the battle tooltip after every XY.render wrapper, never above an owner modal.
  R4.finalHudTip = function (c,G,app) {
    var queued=app._finalHudTip;app._finalHudTip=null;
    if(XY.inkHud&&app.shortHudInfo&&!XY.inkHud.infoOwns(G,app))XY.inkHud.clearInfo(app);
    if(XY.inkHud&&XY.inkHud.infoOwns(G,app)){XY.inkHud.drawInfo(c,G,app);return;}
    if(!XY.inkHud||!XY.inkHud.clearTip)return;
    var td=G&&G.td,dk=G&&G.dkRun,line=td&&td.form&&td.form.line,closeup=XY.ultscene&&XY.ultscene._closeup;
    var blocked=!XY.ui2||!XY.ui2.on||!queued||queued.game!==G||queued.rt!==app.rt||
      !G||app.screen!=='play'||G.mode!=='play'||XY.noHudShot||
      app.partyPanel||app.confirm||app.tipHold||G.tut||G.dkHold||
      (dk&&(dk.introLeft>0||dk.formLeft>0))||G.cut||
      (closeup&&closeup.G===G&&closeup.rt===app.rt)||
      app.tdChooser||app.tdFormShop||(td&&td.deploy&&td.guide)||
      (td&&td.on&&line&&line.state==='draft'&&td.drawer!==false)||
      app.build||app.summon||app.selTower||
      (XY.gacha10&&XY.gacha10.activityOpen)||
      (XY.fork&&XY.fork.offered&&XY.fork.offered(G));
    if(blocked){XY.inkHud.clearTip(app);return;}
    // The outer wrappers may leave a CSS-pixel transform. Restore logical pixels
    // for I.tip, which applies its own inverse zoom exactly once.
    var z=(app.zoom||1)*(app.dpr||1);
    c.save();c.setTransform(z,0,0,z,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.filter='none';
    try {XY.inkHud.tip(c,app,queued.tip);} finally {c.restore();}
  };

  // 卡牌飞入 / 提示条 / 皮肤解锁 / 任务完成 / 角色卡掉落 / 金光
  function drawEvents(c, G, app) {
    var T = R(), W = app.lw, H = app.lh, rt = app.rt, i;
    if (G.goldFlash > 0) { c.fillStyle = 'rgba(255,214,90,' + Math.min(0.45, G.goldFlash * 0.6) + ')'; c.fillRect(0, 0, W, H); }
    // 卡牌飞向右侧法宝栏
    G.cardFly.forEach(function (f) {
      var k = f.t / f.max, card = XY.CARD_BY[f.id], e = k < 0.4 ? k / 0.4 : 1, sx = W / 2, sy = H / 2 - 40, tx = W - 120, ty = 190;
      if(XY.compactHud&&XY.compactHud.on(G,app)){var fa=XY.compactHud.layout(app).fabao;tx=XY.kToLog(app,fa.cx);ty=XY.kToLog(app,fa.cy);}
      var p = k < 0.45 ? 0 : Math.pow((k - 0.45) / 0.55, 2), x = sx + (tx - sx) * p, y = sy + (ty - sy) * p, s = (k < 0.45 ? 0.6 + 0.9 * e : 1.5 - 1.0 * p);
      c.save(); c.translate(x, y); c.scale(s, s);
      var R_ = XY.RARITY[card.r]; c.fillStyle = R_.glow; c.beginPath(); c.arc(0, 0, 56, 0, 6.3); c.fill();
      T.drawCardMini(c, card, 0, 0, 62, 86, 1); c.restore();
    });
    // 提示条：得到了法宝
    var by = 190;
    G.cardBanners.forEach(function (b, k) {
      var card = XY.CARD_BY[b.id], R_ = XY.RARITY[card.r], al = Math.min(1, b.t / 0.25, (b.max - b.t) / 0.5), w = 360, x = W / 2 - w / 2, y = by + k * 70 - (1 - Math.min(1, b.t / 0.25)) * 14;
      c.globalAlpha = Math.max(0, al);
      T.panel(c, x, y, w, 62, 12, 'rgba(255,250,236,0.97)', R_.color); c.lineWidth = 3; c.strokeStyle = R_.color; T.rrect(c, x, y, w, 62, 12); c.stroke();
      T.drawCardMini(c, card, x + 34, y + 31, 36, 50, 1);
      T.txt(c, '获得法宝「' + card.name + '」', x + 64, y + 18, 17, T.T.ink, 'left', true);
      T.txt(c, R_.name + ' · ' + XY.CARD_SETS[card.set].name + '套 · ' + (b.isNew ? '新！加入收藏' : '重复 +1（可升级）'), x + 64, y + 38, 12.5, b.isNew ? '#d62828' : '#2f7d3b', 'left', true);
      T.txt(c, XY.cardFxText(card, XY.save.lvOf(card.id)), x + 64, y + 54, 11, T.T.inkSoft, 'left', false);
      c.globalAlpha = 1;
    });
    // 角色卡掉落（常驻特殊角色）
    (G.spBanners || []).forEach(function (b, k) {
      b.t += 0; var d = XY.SP_BY[b.id], al = Math.min(1, b.t / 0.25, (b.max - b.t) / 0.5), w = 380, x = W / 2 - w / 2, y = by + (G.cardBanners.length + k) * 70;
      c.globalAlpha = Math.max(0, al);
      T.panel(c, x, y, w, 62, 12, 'rgba(255,250,236,0.97)', d.frame); c.lineWidth = 3; c.strokeStyle = d.frame; T.rrect(c, x, y, w, 62, 12); c.stroke();
      R4.avatarDisc(c, d, x + 34, y + 31, 20, rt);
      T.txt(c, '获得角色卡「' + d.name + '」', x + 70, y + 18, 17, T.T.ink, 'left', true);
      T.txt(c, b.cards + ' 张' + (b.first ? ' · 解锁！可在关卡选择页携带' : (b.up ? ' · 升到' + b.lv + '重！' : '')), x + 70, y + 40, 12.5, b.first || b.up ? '#a42d19' : '#2f7d3b', 'left', true);
      c.globalAlpha = 1;
    });
    // 皮肤 / 栏位解锁弹窗
    function unlockText(text, x, y, size, color, align) {
      c.save(); c.font = size + 'px "Ma Shan Zheng","KaiTi","STKaiti",serif'; c.fillStyle = color;
      c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.fillText(text, x, y); c.restore();
    }
    var up = G.unlockPopup;
    if (up && XY.UNLOCKS.some(function (x) { return x.id === up.id; })) {
      var u = XY.UNLOCKS.filter(function (x) { return x.id === up.id; })[0], al2 = Math.min(1, up.t / 0.3, (up.max - up.t) / 0.5), w2 = Math.min(440, W - 24), h2 = u.kind === 'slot' ? 208 : 178, x2 = W / 2 - w2 / 2, y2 = Math.max(16, H / 2 - h2 / 2);
      c.globalAlpha = Math.max(0, al2);
      T.panel(c, x2, y2, w2, h2, 16, 'rgba(246,239,226,0.96)', '#3a3226'); c.lineWidth = 1.4; c.strokeStyle = 'rgba(42,32,22,0.45)'; T.rrect(c, x2, y2, w2, h2, 16); c.stroke();
      unlockText(u.kind === 'skin' ? '皮肤解锁' : (u.kind === 'slot' ? '开局可多带一张卡' : '新角色解锁'), W / 2, y2 + 28, 20, '#a42d19', 'center');
      unlockText(u.name, W / 2, y2 + 64, 18, T.T.ink, 'center');
      c.save(); c.font = '15px "Ma Shan Zheng","KaiTi","STKaiti",serif';
      var descLines = wrap2(c, u.desc, w2 - 32); c.restore();
      descLines.forEach(function (line, i) { if (line) unlockText(line, W / 2, y2 + 95 + i * 21, 15, '#2f7d3b', 'center'); });
      if (u.kind === 'slot') {
        unlockText('合计携带数量增加，战中分类上限不变', W / 2, y2 + 143, Math.min(14, (w2 - 24) / 20), T.T.inkSoft, 'center');
        unlockText('出发页 → 更多 → 卡牌组牌', W / 2, y2 + 177, 14, '#835334', 'center');
      } else unlockText(u.kind === 'skin' ? '角色页中选择换装' : '出发页中查看新角色', W / 2, y2 + 146, 14, T.T.inkSoft, 'center');
      c.globalAlpha = 1;
    }
    // 任务完成
    if (G.questPop && G.questPop.t > 0) {
      var qp = G.questPop, a3 = Math.min(1, qp.t / 0.4, (3 - qp.t) / 0.4 + 0.01), w3 = 330, x3 = W / 2 - w3 / 2, y3 = 216;
      if (a3 < 0) a3 = 0;
      c.globalAlpha = Math.min(1, a3 * 2);
      T.panel(c, x3, y3, w3, 56, 12, 'rgba(255,252,238,0.97)', qp.color); c.lineWidth = 3; c.strokeStyle = qp.color; T.rrect(c, x3, y3, w3, 56, 12); c.stroke();
      T.txt(c, '✔ ' + qp.text, W / 2, y3 + 19, 19, qp.color, 'center', true);
      T.txt(c, qp.sub, W / 2, y3 + 41, 12.5, T.T.ink, 'center', false);
      c.globalAlpha = 1;
    }
  }


  /* ================= 技能树页（根 + 三条分支 + 辅助行；每条分支 t1 t2 → 甲乙二选一的 3 个节点）================= */
  function fit(c, str, maxW) {
    if (c.measureText(str).width <= maxW) return str;
    while (str.length > 1 && c.measureText(str + '…').width > maxW) str = str.slice(0, -1);
    return str + '…';
  }
  function wrap2(c, str, maxW) {                         // 折成最多两行；第二行放不下才省略（折行位置避开数字 / 标点，见 R.breakAt）
    if (c.measureText(str).width <= maxW) return [str, ''];
    var k = R().breakAt(c, str, maxW), a = str.slice(0, k);
    return [a, fit(c, str.slice(k).replace(/^\s+/, ''), maxW)];
  }
  function shortReason(st) {
    var r = st.reason || '';
    if (r.indexOf('二选一') >= 0) return '已选了另一条路';
    if (r.indexOf('Lv4') >= 0) return 'Lv4 开放';
    if (r.indexOf('阵亡') >= 0) return '已阵亡';
    if (r.indexOf('最多学') >= 0) return '辅助已满 3 种';
    if (r.indexOf('要先学') >= 0) return '先学前置';
    return r.slice(0, 12);
  }
  function node2(c, G, app, hi, n, x, y, w, h, color, rects, o) {
    o = o || {};
    var T = R(), st = XY.nodeStatus(G, hi, n.id), lv = st.lv, m = app.mouse, hov = m && m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
    var locked = st.st === 'locked', maxed = st.st === 'max', can = st.st === 'ok', key = n.tier === 5;
    T.rrect(c, x, y, w, h, 9);
    c.fillStyle = lv > 0 ? '#fff0c4' : (locked ? '#eceae4' : (hov ? '#fff8e6' : '#fffdf6')); c.fill();
    c.lineWidth = maxed ? 3.2 : (can ? 3 : 1.8) + (hov ? 1.4 : 0);
    c.strokeStyle = maxed ? '#e0a415' : (can ? '#43a047' : (lv > 0 ? color : (locked ? '#cfc9bb' : '#b9a77a'))); c.stroke();
    var nt = XY.nodeType(n);
    c.fillStyle = nt.color; T.rrect(c, x, y, 6, h, 3); c.fill();                                     // 左侧类型色条
    c.fillStyle = nt.color; c.beginPath(); c.arc(x + w - 12 - n.max * 12 - 4, y + 12, 8, 0, PI2); c.fill();      // 类型图标
    T.txt(c, nt.icon, x + w - 12 - n.max * 12 - 4, y + 13, 10, '#fff', 'center', true);
    var nmW = w - 48 - n.max * 12, nmF = 12.5;                                                       // 名字太长就先缩字号（最小 10.5），还放不下才用省略号
    c.font = 'bold ' + nmF + 'px ' + C.FONT;
    while (nmF > 10.5 && c.measureText(n.name).width > nmW) { nmF -= 0.5; c.font = 'bold ' + nmF + 'px ' + C.FONT; }
    T.txt(c, fit(c, n.name, nmW), x + 8, y + 12, nmF, locked && lv === 0 ? '#9a9486' : T.T.ink, 'left', true);
    for (var k = 0; k < n.max; k++) { c.beginPath(); c.arc(x + w - 10 - (n.max - 1 - k) * 12, y + 12, 4.2, 0, PI2); c.fillStyle = k < lv ? (maxed ? '#e0a415' : color) : 'rgba(0,0,0,0.08)'; c.fill(); c.lineWidth = 1; c.strokeStyle = '#a89d7e'; c.stroke(); }
    c.font = '10.5px ' + C.FONT;
    var eff = lv > 0 ? XY.nodeText(n, lv) : (n.desc ? n.desc[0] : (n.eff ? n.eff(1) : ''));
    var el = wrap2(c, eff, w - 16), dcol = locked && lv === 0 ? '#aaa598' : T.T.inkSoft;           // 说明折成两行（原来一行截断成“…”看不全）
    T.txt(c, el[0], x + 8, y + 27, 10.5, dcol, 'left', false); if (el[1]) T.txt(c, el[1], x + 8, y + 39, 10.5, dcol, 'left', false);
    var line, col;
    if (maxed) { line = '已学'; col = '#b8860b'; } else if (can) { line = '点击学习 · ' + st.cost + ' 点'; col = '#2e7d32'; }
    else if (st.st === 'nopts') { line = '差 ' + (st.cost - G.points) + ' 点'; col = '#9a6a1a'; } else { line = '🔒 ' + shortReason(st); col = '#a0705a'; }
    c.font = 'bold 11px ' + C.FONT;
    T.txt(c, fit(c, line, w - 14), x + 8, y + h - 8, 11, col, 'left', true);
    ui_push({ x: x, y: y, w: w, h: h, act: 'node', hero: hi, id: n.id });
    rects.push({ x: x, y: y, w: w, h: h, n: n, st: st, hov: hov });
  }
  function ui_push(h) { XY.ui.hits.push(h); }


  // v0.8.0：菜单面板里的「操作说明」页（原来战场右下角那块常驻说明框搬到这里；H 键直接打开这一页）
  function helpPage(c, G, app, px, py, pw, ph) {
    var T = R(), tch = !!app.touchUI, y0 = py + 152, colW = (pw - 48 - 24) / 2, secs;
    if (!tch) secs = [
      ['走位', ['WASD / 方向键 都能走；按住鼠标左键 = 跟着鼠标走', '单击地面 = 设目的地；右键也行', '技能 / 大招全部自动释放，你只管走位']],
      ['换人与命令', ['1-6 或点头像：换你操控的英雄', 'Shift + 1-6：给这位伙伴下命令（跟随 / 驻守 / 出击 / 守护）', '白龙马：点「骑乘」，选一位伙伴驮着跑']],
      ['天兵与塔', ['Z X C V B：请出护法天兵；点天兵可升级', '点塔按钮再点地面造塔，点塔查看 / 升级', '右键 / Esc 取消当前的造塔或选择']],
      ['法宝与技能', ['法宝三选一，最多带 3 件同套' + (G.fb ? '（法宝 4 件 + 灵物 3 件，满级可炼化）' : ''), 'Tab：打开这个菜单；1-6 切换英雄页，7 / 0 全队页' + (G.fb ? '，8 法宝页' : ''), '升级给技能点，学技能在菜单里点节点']],
      ['召唤', ['G 或点右下角圆形「召唤」印章：随机召来 1 位特殊人物', '到场立刻放大招，停留一小会儿后离开', '冷却时印章外圈显示进度、中间是剩余秒数']],
      ['其他', ['H：打开 / 关闭本页 · P 或 Esc：暂停', 'Esc 也能关菜单；点菜单外的「关闭」按钮同样', '小地图在右上角，菜单按钮下面']]
    ];
    else secs = [
      ['走位', ['按住空地拖动 = 摇杆走路', '轻点空地 = 走到那里']],
      ['换人与命令', ['点头像换人；点小按钮下命令', '白龙马：点「骑乘」，选一位伙伴驮着跑']],
      ['天兵与塔', ['点天兵按钮，再轻点路上空地', '点塔查看 / 升级']],
      ['法宝与技能', ['法宝三选一，最多带 3 件同套', '右上「菜单」：技能树 / 法宝 / 本页']],
      ['召唤', ['点右下角圆形「召唤」印章', '冷却时外圈显示进度、中间是秒数']],
      ['其他', ['右上「暂停」暂停 / 取消', '小地图在右上角']]
    ];
    T.txt(c, '操作说明（H 键随时打开 / 关闭）', px + 24, py + 130, 16, '#8a5a10', 'left', true);
    var rowsN = 3, secH = Math.min(176, (ph - 152 - 24) / rowsN - 10);
    secs.forEach(function (sc, k) {
      var col = k % 2, row = (k - col) / 2, x = px + 24 + col * (colW + 24), y = y0 + row * (secH + 10);
      T.rrect(c, x, y, colW, secH, 12); c.fillStyle = 'rgba(250,244,226,0.95)'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = '#d6c79f'; c.stroke();
      T.txt(c, sc[0], x + 16, y + 20, 17, '#b8300f', 'left', true);
      sc[1].forEach(function (l, j) { T.txt(c, l, x + 16, y + 46 + j * 26, 15, T.T.ink, 'left', false); });
    });
  }

  R4.skills = function (c, G, app) {
    var T = R(), W = app.lw, H = app.lh, rt = app.rt, mouse = app.mouse, i, h, n = G.heroes.length, PT = 9;
    T.dim(c, app, 0.66);
    XY.ui.hits.length = 0;
    var pw = Math.min(1250, W - 20), ph = Math.min(704, H - 16), px = (W - pw) / 2, py = (H - ph) / 2;
    if (XY.ov) XY.ov.modal(c, px, py, pw, ph); else T.panel(c, px, py, pw, ph, 18, 'rgba(255,253,246,0.99)', '#d9a21a');
    var tab = app.skillTab; if (tab !== PT && tab < n && G.heroes[tab].down) tab = app.skillTab = PT;
    if (XY.ov) XY.ov.text(c, '菜单', px + 24, py + 30, 30, '#b8300f', 'left', true, XY.menu.KAI, 4); else T.txt(c, '菜单', px + 22, py + 30, 28, '#b8300f', 'left', true);
    T.rrect(c, px + 128, py + 12, 190, 36, 18); c.fillStyle = G.points > 0 ? '#ffd86a' : '#ece6d2'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#c78a1e'; c.stroke();
    T.txt(c, '可用技能点：' + G.points, px + 223, py + 31, 17, T.T.ink, 'center', true);
    var msg = app.skillMsg && app.skillMsg.until > rt ? app.skillMsg : null;
    if (msg) T.txt(c, msg.text, px + 332, py + 31, 15, msg.bad ? '#c0392b' : '#2e7d32', 'left', true);
    else T.txt(c, '技能点全队共用 · 每位角色 1 条根 + 3 条分支（每条分支后半段甲乙二选一）', px + 332, py + 31, 12.5, T.T.inkSoft, 'left', false);
    var cbw = 92, abw = 168, cx0 = px + pw - cbw - 14, ax0 = cx0 - abw - 10;
    T.btnS(c, app, ax0, py + 12, abw, 36, '自动加点：' + (G.autoPoints ? '开' : '关'), 'autopts', G.autoPoints);
    T.btnS(c, app, cx0, py + 12, cbw, 36, '关闭 (Tab)', 'closeSkills', false, true);
    // 标签
    var nt = n + (G.fb ? 3 : 2), tw = (pw - 28 - (nt - 1) * 6) / nt, ty = py + 58, th = 54;
    for (i = 0; i < nt; i++) {
      var id = i < n ? i : (i === n ? PT : (i === n + 1 && G.fb ? 10 : 11)), tx = px + 14 + i * (tw + 6), hd = i < n ? G.heroes[i] : null, dead = hd && hd.down, act = tab === id;
      var thov = !dead && mouse && mouse.x >= tx && mouse.x <= tx + tw && mouse.y >= ty && mouse.y <= ty + th;
      T.rrect(c, tx, ty, tw, th, 10); c.fillStyle = dead ? '#dedbd3' : (act ? '#fff3cf' : (thov ? '#fff8e6' : '#faf5e8')); c.fill();
      c.lineWidth = act ? 3.5 : 1.8; c.strokeStyle = dead ? '#b0ac9f' : (act ? (hd ? hd.def.color : '#d9a21a') : '#cdbf9c'); c.stroke();
      c.fillStyle = act ? '#8a5a10' : '#8a7d63'; c.beginPath(); c.arc(tx + 11, ty + 11, 8, 0, PI2); c.fill();
      T.txt(c, i < n ? String(i + 1) : (id === 10 ? '8' : (id === 11 ? 'H' : '9')), tx + 11, ty + 12, 11, '#fff', 'center', true);
      if (hd) {
        c.save(); if (dead) c.globalAlpha = 0.35; T.drawHeroShape(c, hd.def, tx + 38, ty + 26, 12); c.restore();
        T.txt(c, hd.def.name + (hd.sp ? ' Lv' + hd.def.lv : ''), tx + 58, ty + 17, 14, dead ? '#8a8578' : T.T.ink, 'left', true);
        if (dead) T.txt(c, '阵亡', tx + 58, ty + 34, 12, '#b3402e', 'left', true);
        else { T.txt(c, '已投 ' + XY.heroSpent(hd) + ' 点', tx + 58, ty + 33, 11.5, T.T.inkSoft, 'left', false); T.txt(c, '辅助 ' + XY.supportCount(hd) + '/' + XY.MAX_SUPPORTS, tx + 58, ty + 47, 11.5, T.T.inkSoft, 'left', false); }   // v0.7.0n：两行，不再在 “辅助 0/3” 处被截断
      } else if (id === 11) { T.txt(c, '操作说明', tx + tw / 2, ty + 18, 15, T.T.ink, 'center', true); T.txt(c, '键位 · 鼠标 · 触屏', tx + tw / 2, ty + 35, 11, T.T.inkSoft, 'center', false); }
      else if (id === 10) { T.txt(c, '法宝', tx + tw / 2, ty + 18, 15, T.T.ink, 'center', true); T.txt(c, '携带 · 炼化 · 图鉴', tx + tw / 2, ty + 35, 11, T.T.inkSoft, 'center', false); }
      else { T.txt(c, '全队 · 营地', tx + tw / 2, ty + 18, 15, T.T.ink, 'center', true); T.txt(c, '大家一起变强', tx + tw / 2, ty + 35, 11, T.T.inkSoft, 'center', false); }
      if (!dead) XY.ui.hits.push({ x: tx, y: ty, w: tw, h: th, act: 'tab', i: id });
    }
    if (tab === 10 && G.fb && XY.fabaoui && XY.fabaoui.page) { XY.fabaoui.page(c, G, app, px, py, pw, ph); return; }
    if (tab === 11) { helpPage(c, G, app, px, py, pw, ph); return; }
    var rects = [], bx = px + 24, by = py + 120, bw = pw - 48, detH = 92, bodyBot = py + ph - detH - 20;
    if (tab !== PT) {
      h = G.heroes[tab]; var d = h.def, tr = XY.TREE[h.id], col = d.color, hdd = (h.sp ? '常驻 Lv' + d.lv + ' · ' : '');
      var rootW = 168, gap = 12, brW = Math.floor((bw - rootW - 3 * gap) / 3), nh = 62, g = 5, y0 = by + 22;
      // 根
      T.txt(c, '根 · ' + d.weapon + '（已达 ' + h.wlv + ' 阶）', bx, by + 6, 13.5, d.dark, 'left', true);
      var ry = y0;
      ['m1', 'm2'].forEach(function (id) { node2(c, G, app, tab, tr.by[id], bx, ry, rootW, nh, col, rects); ry += nh + g; });
      if (tr.by.ma) {
        node2(c, G, app, tab, tr.by.ma, bx, ry, rootW, nh, col, rects); ry += nh + g;
        node2(c, G, app, tab, tr.by.mb, bx, ry, rootW, nh, col, rects); ry += nh + g;
        T.txt(c, '▲ 主技能 甲乙二选一', bx + rootW / 2, ry + 4, 11, '#b8300f', 'center', true);
      } else {
        var exn = tr.nodes.filter(function (q) { return q.kind === 'extra'; });
        if (exn.length) { T.txt(c, '▼ 专属强化（每个可升 3 级）', bx + rootW / 2, ry + 4, 11, '#a8801f', 'center', true); ry += 14; exn.forEach(function (q) { node2(c, G, app, tab, q, bx, ry, rootW, nh, col, rects); ry += nh + g; }); }
        else T.txt(c, '常驻角色：武器升阶靠根节点 + 分支', bx + rootW / 2, ry + 6, 10.5, T.T.inkSoft, 'center', false);
      }
      // 三条分支
      ['x', 'y', 'z'].forEach(function (L, bi) {
        var bx0 = bx + rootW + gap + bi * (brW + gap), th0 = XY.TREE_THEMES ? XY.TREE_THEMES[tr.themes[bi]] : null;
        var nodes = tr.nodes.filter(function (q) { return q.br === L; }), by_ = {}; nodes.forEach(function (q) { by_[q.id] = q; });
        var locked3 = bi === 2 && h.sp && !d.branch3, bname = (d.branches && d.branches[bi]) ? d.branches[bi].split(/[:：]/)[0] : (nodes[0] ? nodes[0].bname : '');
        c.save(); if (locked3) c.globalAlpha = 0.5;
        T.txt(c, '分支 ' + (bi + 1) + ' · ' + bname, bx0, by + 6, 13.5, d.dark, 'left', true);
        var yy = y0, half = Math.floor((brW - 8) / 2);
        node2(c, G, app, tab, by_[L + '1'], bx0, yy, brW, nh, col, rects); yy += nh + g;
        node2(c, G, app, tab, by_[L + '2'], bx0, yy, brW, nh, col, rects); yy += nh + g;
        var pa = by_[L + '3a'], pb = by_[L + '3b'];
        T.txt(c, 'A 路：' + (pa ? pa.pname : ''), bx0 + 2, yy + 5, 11.5, '#b8300f', 'left', true);
        T.txt(c, 'B 路：' + (pb ? pb.pname : ''), bx0 + half + 10, yy + 5, 11.5, '#2d6aa8', 'left', true); yy += 16;
        for (var t = 3; t <= 5; t++) {
          node2(c, G, app, tab, by_[L + t + 'a'], bx0, yy, half, nh, col, rects);
          node2(c, G, app, tab, by_[L + t + 'b'], bx0 + half + 8, yy, half, nh, col, rects);
          yy += nh + g;
        }
        c.restore();
        if (locked3) T.txt(c, '🔒 角色升到 Lv4 开放（' + XY.SP_LV_AT[3] + ' 张角色卡）', bx0 + brW, by + 6, 12, '#8a5a10', 'right', true);   // 第 4 批：原来的大提示框盖住了节点，改成标题行右侧小字
      });
      // 辅助行
      var sup = tr.nodes.filter(function (q) { return q.kind === 'support'; }), sy = y0 + 2 * (nh + g) + 16 + 3 * (nh + g) + 18;
      T.txt(c, '辅助技能（最多 ' + XY.MAX_SUPPORTS + ' 种，已学 ' + XY.supportCount(h) + '/' + XY.MAX_SUPPORTS + '）· 2 级要先学主技能一阶，3 级要先学二阶', bx, sy - 8, 13.5, d.dark, 'left', true);
      var sw = Math.floor((bw - (sup.length - 1) * 8) / sup.length);
      for (i = 0; i < sup.length; i++) node2(c, G, app, tab, sup[i], bx + i * (sw + 8), sy + 4, sw, nh + 6, col, rects);
    } else {
      T.txt(c, '全队 · 营地强化（不占英雄的技能位，所有人受益）', bx, by + 6, 15, '#8a5a10', 'left', true);
      var pn = XY.PARTY_NODES, pnw = Math.floor((bw - 4 * 12) / 5), pnh = 76;
      for (i = 0; i < pn.length; i++) node2(c, G, app, -1, pn[i], bx + (i % 5) * (pnw + 12), by + 28 + Math.floor(i / 5) * (pnh + 14), pnw, pnh, '#d9a21a', rects);
      var sl = XY.synList ? XY.synList(G) : [], sy0 = by + 28 + 3 * (pnh + 14) + 22;
      T.txt(c, '协同技（两人配合才有的效果 · 每条 2 级，花 2 + 3 点 · 需要两位角色都在队里）', bx, sy0 - 12, 14, '#a03a82', 'left', true);
      for (i = 0; i < sl.length; i++) node2(c, G, app, -1, sl[i], bx + i * (pnw + 12), sy0, pnw, pnh, '#c0489a', rects);
    }
    // 详情
    var dy = py + ph - detH - 12, dx = px + 14, dw = pw - 28;
    T.rrect(c, dx, dy, dw, detH, 12); c.fillStyle = 'rgba(250,244,226,0.95)'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#d6c79f'; c.stroke();
    var hv = null; for (i = 0; i < rects.length; i++) if (rects[i].hov) hv = rects[i];
    if (hv) {
      var nn = hv.n, st = hv.st, kn = nn.kind === 'extra' ? '专属强化（可升 3 级）' : nn.kind === 'main' ? '根·主技能' : (nn.kind === 'support' ? '辅助技能' : (nn.kind === 'deep' ? '分支 ' + (nn.bi + 1) + '·' + (nn.bname || '') + (nn.path ? ' · ' + nn.path + ' 路「' + nn.pname + '」' : '') + ' · 第 ' + nn.tier + ' 层' + (nn.tier === 5 ? '（关键节点）' : '') : '全队'));
      var nty = XY.nodeType(nn); T.txt(c, '类型：' + nty.name + '（' + nty.icon + '）', dx + dw - 16, dy + 20, 15, nty.color, 'right', true);
      T.txt(c, nn.name, dx + 16, dy + 20, 19, T.T.ink, 'left', true);
      c.font = 'bold 19px ' + C.FONT;
      T.txt(c, kn + ' · 等级 ' + st.lv + ' / ' + nn.max + (nn.branch ? ' · 二选一的分支 ' + nn.branch : ''), dx + 16 + c.measureText(nn.name).width + 18, dy + 21, 13, T.T.inkSoft, 'left', false);
      T.txt(c, '现在：' + (st.lv > 0 ? XY.nodeText(nn, st.lv) : '（还没学）'), dx + 16, dy + 44, 14, T.T.ink, 'left', false);
      T.txt(c, '下一级：' + (st.lv < nn.max ? XY.nodeText(nn, st.lv + 1) + '（花 ' + nn.cost[st.lv] + ' 点技能点）' : '已经满级了'), dx + 16, dy + 64, 14, '#8a5a10', 'left', true);
      var okk = st.st === 'ok';
      T.txt(c, okk ? '✔ 点击就能学' : (st.st === 'max' ? '已学会' : '✘ ' + st.reason), dx + 16, dy + 82, 13, okk ? '#2e7d32' : (st.st === 'max' ? '#b8860b' : '#b5503a'), 'left', true);
    } else {
      T.txt(c, '把鼠标放到技能上看详细效果；点一下花技能点学习。', dx + 16, dy + 26, 15, T.T.ink, 'left', false);
      T.txt(c, '分支后半段甲乙二选一（选了一边，另一边就锁了）；第 5 层是关键节点。1-6 切换角色页，9 是全队页；Tab / Esc 关闭。', dx + 16, dy + 52, 13, T.T.inkSoft, 'left', false);
      if (tab !== PT) { var hh = G.heroes[tab], m = hh.mod; T.txt(c, hh.def.name + '：生命 ' + Math.ceil(hh.hp) + '/' + hh.maxHp + ' · 暴击 ' + Math.round(m.crit * 100) + '% · 减伤 ' + Math.round((1 - m.dr) * 100) + '% · 物防 ' + Math.round(hh.pdef * 100) + '% 法防 ' + Math.round(hh.mdef * 100) + '% · ' + (hh.def.dtype === 'magic' ? '法术' : '物理') + '伤害 · ' + ELN(hh.def.elem) + '属性', dx + 16, dy + 76, 13, '#3d6288', 'left', true); }
    }
  };

  // Ordinary (non-TD) placement shares the real soldier artwork and pointer coordinates.
  R4.drawSoldierPlacementPreview = function (c, G, app) {
    app.soldierPlacementPreview = null;
    if (!G || G.td || !app.build || app.screen !== 'play' || G.mode !== 'play') return;
    var meta = app.soldierPlacementPreview = { scope: 'non-td', type: app.build, portraitDrawn: false, valid: false };
    if ((XY.party && XY.party.visible(G, app)) || app.confirm || G.dkHold || G.cut || G.ending) { meta.blocked = 'overlay'; return; }
    var T=R(),z=app.zoom||1,W=app.lw,H=app.lh,d=XY.TOWERS[app.build];if(!d)return;
    var boxes=(XY.ui.hits||[]).concat(XY.ui.hud||[]).filter(function(b){return b&&b.w>0&&b.h>0;});
    if(G.tut&&G.tut.lay)boxes.push(G.tut.lay); // final tutorial layout, after its actual draw/avoidance
    function overlaps(a,b){return a.x<b.x+b.w+3/z&&a.x+a.w>b.x-3/z&&a.y<b.y+b.h+3/z&&a.y+a.h>b.y-3/z;}
    function free(b){return b.x>=8/z&&b.y>=8/z&&b.x+b.w<=W-8/z&&b.y+b.h<=H-8/z&&!boxes.some(function(a){return overlaps(a,b);});}
    var artH=88/z,artW=76/z,lw=Math.min(236/z,W-16/z),cost=XY.soldierCost(G,app.build),count=G.towers.length,cap=XY.soldierCap(G);
    function point(p,source){var wx=p.x-G.view.w/2+G.cam.x,wy=p.y-G.view.h/2+G.cam.y;return{x:p.x,y:p.y,wx:wx,wy:wy,source:source,reason:XY.towerBlock(G,app.build,wx,wy)};}
    function body(p){return{x:p.x-artW/2,y:p.y-artH,w:artW,h:artH};}
    function labelFor(p,text){
      c.font=T.font(14/z,false);var widths=[lw,Math.min(lw,176/z)],answer=null;
      widths.forEach(function(ww){if(answer)return;var rows=XY.inkHud&&XY.inkHud.partyTextRows?XY.inkHud.partyTextRows(c,text,ww-20/z,[],T.font(14/z,false)):[text],hh=(30+rows.length*19)/z;
        var opts=[{x:p.x-ww/2,y:p.y+10/z},{x:p.x+artW/2+10/z,y:p.y-artH},{x:p.x-artW/2-10/z-ww,y:p.y-artH},{x:p.x-ww/2,y:p.y-artH-hh-10/z}];
        for(var yy=52/z;yy<H-hh-8/z;yy+=18/z)[8/z,W-ww-8/z,Math.max(8/z,Math.min(W-ww-8/z,p.x-ww/2))].forEach(function(xx){opts.push({x:xx,y:yy});});
        opts.forEach(function(b){b.x=Math.max(8/z,Math.min(W-ww-8/z,b.x));b.w=ww;b.h=hh;});
        opts=opts.filter(function(b){return free(b)&&!overlaps(b,body(p));});opts.sort(function(a,b){return Math.hypot(a.x+a.w/2-p.x,a.y+a.h/2-p.y)-Math.hypot(b.x+b.w/2-p.x,b.y+b.h/2-p.y);});if(opts[0])answer={box:opts[0],rows:rows};
      });return answer;
    }
    var p=null,j=app.joy;
    if(j&&!j.moved)p=point({x:j.p0.x,y:j.p0.y},'touch');
    else if(app.mouse&&!(app.touchUI&&app.touched))p=point(app.mouse,'mouse');
    if(!p&&(app.touchUI||app.touched)){
      var choices=[];for(var yy=artH+10/z;yy<H-56/z;yy+=24/z)for(var xx=artW/2+10/z;xx<W-artW/2-10/z;xx+=24/z){var q=point({x:xx,y:yy},'suggested');if(free(body(q)))choices.push(q);}
      choices.sort(function(a,b){return (!!a.reason-!!b.reason)||Math.hypot(a.x-W*.62,a.y-H*.56)-Math.hypot(b.x-W*.62,b.y-H*.56);});for(var qi=0;qi<Math.min(4,choices.length);qi++)if(labelFor(choices[qi],'可放置 · 轻点空地放下')){p=choices[qi];break;}
    }
    if(!p){meta.blocked='no-visible-point';return;}
    meta.source=p.source;meta.x=p.wx;meta.y=p.wy;meta.screen={x:p.x*z,y:p.y*z};meta.cost=cost;meta.count=count;meta.cap=cap;meta.reason=p.reason;meta.valid=!p.reason;
    if(!free(body(p))){meta.blocked='ui-or-edge';return;}
    var col=p.reason?'#a83224':'#426444',model=XY.makeTower(app.build,p.wx,p.wy),range=XY.towerStat(G,model).range,bounds={};meta.range=range;
    c.save();boxes.forEach(function(b){c.beginPath();c.rect(0,0,W,H);c.rect(b.x-3/z,b.y-3/z,b.w+6/z,b.h+6/z);c.clip('evenodd');});
    c.fillStyle=p.reason?'rgba(168,50,36,.055)':'rgba(67,100,68,.055)';c.strokeStyle=col;c.lineWidth=1.4/z;c.setLineDash([8/z,5/z]);c.beginPath();c.arc(p.x,p.y,range,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);
    c.globalAlpha=.58;meta.portraitDrawn=!!(XY.soldierInk&&XY.soldierInk.draw(c,app.build,p.x,p.y,artH,artW,bounds));c.globalAlpha=1;
    // A brush underline anchors the real feet; no geometric substitute character.
    c.strokeStyle=col;c.lineWidth=2/z;c.beginPath();c.moveTo(p.x-19/z,p.y+2/z);c.quadraticCurveTo(p.x,p.y+6/z,p.x+19/z,p.y+1/z);c.stroke();c.restore();
    if(meta.portraitDrawn)meta.bodyRect={x:bounds.x*z,y:bounds.y*z,w:bounds.w*z,h:bounds.h*z};
    var shortReason=p.reason;if(shortReason){[['天兵只能放','请选西行路'],['地图边缘','远离地图边缘'],['这是南线','请先选择岔路'],['这里是营地','移到营地外'],['离洞府太近','远离洞府'],['这里太挤','换个空位'],['天兵已经满','天兵已满'],['金币不够','金币不足'],['还没有','尚未获得卡片']].some(function(q){if(shortReason.indexOf(q[0])>=0){shortReason=q[1];return true;}return false;});}
    var title=d.name+' · '+cost+'金 · '+count+'/'+cap,text=p.reason?'不可放置 · '+shortReason:meta.portraitDrawn?'可放置 · 轻点空地放下':'天兵图像加载中';
    var plan=labelFor(p,text),label=plan&&plan.box,rows=plan&&plan.rows;
    if(!label){meta.labelHidden='no-free-rectangle';return;}
    c.save();c.fillStyle='rgba(246,237,216,.97)';c.fillRect(label.x,label.y,label.w,label.h);c.strokeStyle=col;c.lineWidth=1/z;c.beginPath();c.moveTo(label.x+4/z,label.y+label.h-2/z);c.lineTo(label.x+label.w-4/z,label.y+label.h-3/z);c.stroke();
    T.txt(c,title,label.x+10/z,label.y+15/z,14/z,'#30251a','left',true);rows.forEach(function(t,i){T.txt(c,t,label.x+10/z,label.y+(35+i*19)/z,14/z,col,'left',false);});c.restore();
    meta.range=range;meta.label=title+'\n'+rows.join('\n');meta.labelRect={x:label.x*z,y:label.y*z,w:label.w*z,h:label.h*z};
  };

  R4.hud = function (c, G, app) {
    app.soldierPlacementPreview = null;
    var T = R(), W = app.lw, H = app.lh, rt = app.rt, tg = G.heroes[0], ctx = {}, i;
    R4.rt = rt; app._tip = null; XY.ui.hud = [];
    var tdg = !tg.down && (G.breach || G.tdanger);
    if (tdg) {
      var va = (G.breach ? 0.42 : 0.26) * (0.6 + 0.4 * Math.sin(rt * 10));
      var vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
      [[0, 0], [W, 0], [0, H], [W, H]].forEach(function (p) {
        var ig = c.createRadialGradient(p[0], p[1], 6, p[0], p[1], Math.min(W, H) * 0.28);
        ig.addColorStop(0, 'rgba(42,32,22,' + (va * 0.55) + ')'); ig.addColorStop(1, 'rgba(42,32,22,0)');
        c.fillStyle = ig; c.fillRect(0, 0, W, H);
      });
    }
    var compact = XY.compactHud && XY.compactHud.on(G,app);
    if (compact) {
      XY.compactHud.battle(c,G,app,ctx);
      if (G.tut) XY.tutLayout(c,G,app,ctx);
      var pOpen=!!app.partyPanel&&XY.party.visible(G,app), tip;
      // Battle notices belong below the paused party sheet. Keep their queue
      // intact so closing the sheet resumes the same notification.
      if (pOpen) {
        drawWaveEdge(c,G,app,W,H);
        XY.compactHud.notices(c,G,app);
        drawEvents(c,G,app);
      }
      tip=drawHeroCards(c,G,app,'pre');
      if (!XY.party.visible(G,app)) XY.compactHud.soldiers(c,G,app);
      if (!pOpen) tip=drawHeroCards(c,G,app,'post');
      // Expanded party owns the footer; its close returns the battle summon control.
      if (!XY.party.visible(G,app)) XY.compactHud.sky(c,G,app);
      if (XY.vendor && !pOpen) XY.compactHud.vendor(c,G,app);
      if (!pOpen) {
        drawWaveEdge(c,G,app,W,H);
        XY.compactHud.notices(c,G,app);
        drawEvents(c,G,app);
      }
    } else {
    drawTop(c, G, app, ctx);                                           // v0.7.0l：经验细线 + 顶部一条细条（含 chip）+ 一条通知

    if (G.tut) XY.tutLayout(c, G, app, ctx);                           // 新手教程：提示卡的位置（卡本身最后画，盖在所有按钮上面）
    var left = drawLeft(c, G, app);
    // 右上
    var rx = W - 12;
    var tch = !!app.touchUI;
    var sb = { x: W - 12 - 84, y: 44, w: 84, h: 44 }, shov = mouseIn(app, sb.x, sb.y, sb.w, sb.h), hasPts = G.points > 0, sp2 = 0.5 + 0.5 * Math.sin(rt * 6);   // v0.8.0：小「菜单」按钮（点它 = 原来的技能树面板，Tab 同）
    c.fillStyle=shov?'#f4e6c9':'rgba(247,239,218,.85)';c.fillRect(sb.x,sb.y,sb.w,sb.h);                 // v0.8.0：菜单按钮永远只有「菜单」二字（没有红角标 / 红字）；有技能点改走顶部通知条
    if(XY.INKP)XY.INKP.stroke(c,sb.x+18,sb.y+sb.h-6,sb.x+sb.w-18,sb.y+sb.h-5,2,'64,49,30',.4,37,.01);
    T.txt(c, '菜单', sb.x + sb.w / 2, sb.y + sb.h / 2 + 1, 15, T.T.ink, 'center', true);
    XY.ui.hits.push({ x: sb.x, y: sb.y, w: sb.w, h: sb.h, act: 'skills' });
    if (tch) {                                                                   // 触屏没有 Esc / Tab：左边放一个“暂停 / 取消”按钮（技能树按钮就是 Tab）
      var eb = { x: sb.x - 8 - 94, y: sb.y, w: 94, h: sb.h }, cancel = !!(app.build || app.selTower || app.summon), ehov = mouseIn(app, eb.x, eb.y, eb.w, eb.h);
      T.rrect(c, eb.x, eb.y, eb.w, eb.h, 12); c.fillStyle = cancel ? (ehov ? '#ffd0c0' : '#ffe1d6') : (ehov ? '#fff3d6' : 'rgba(255,255,255,0.94)'); c.fill();
      c.lineWidth = 2.5; c.strokeStyle = cancel ? '#d9503c' : '#b9a77a'; c.stroke();
      T.txt(c, cancel ? '✕ 取消' : '⏸ 暂停', eb.x + eb.w / 2, eb.y + eb.h / 2 + 1, 16, T.T.ink, 'center', true);
      XY.ui.hits.push({ x: eb.x, y: eb.y, w: eb.w, h: eb.h, act: 'esc' });
    }
    if (XY.sweep09 && XY.sweep09.spdOk(G)) {                                      // v0.9：该关 ★★★ 后的正式 2×（墨条 / 开启时朱红印）；视觉 30 高，点击框 44
      var on2 = G.speed === 2, qx = (tch ? sb.x - 8 - 94 : sb.x) - 8 - 56, qb = { x: qx, y: sb.y, w: 56, h: sb.h }, qh = mouseIn(app, qb.x, qb.y - 7, qb.w, 44);
      T.rrect(c, qb.x, qb.y, qb.w, qb.h, 10); c.fillStyle = on2 ? (qh ? '#d84a32' : '#c0392b') : (qh ? '#fff3d6' : 'rgba(255,253,246,0.94)'); c.fill();
      c.lineWidth = 1.8; c.strokeStyle = on2 ? 'rgba(255,214,150,0.85)' : '#b9a77a'; c.stroke();
      T.txt(c, on2 ? '2× 开' : '2×', qb.x + qb.w / 2, qb.y + qb.h / 2 + 1, on2 ? 14 : 16, on2 ? '#fff8e8' : T.T.ink, 'center', true);
      XY.ui.hits.push({ x: qb.x, y: qb.y - 7, w: qb.w, h: 44, act: 'spd2' }); rec('spd2', qb.x, qb.y, qb.w, qb.h);
    }
    var mmB = drawMini(c, G, app, sb.y + sb.h + 8);                              // v0.8.0：小地图在菜单按钮下面
    var dy0 = mmB + 8;
    if (app.debugOn) {
      T.txt(c, '调试键：已开（Shift+F9 关）', rx, dy0, 12, '#c0392b', 'right', true); dy0 += 18;
      if (G.speed !== 1) { T.txt(c, '调试：速度 ×' + G.speed, rx, dy0, 13, '#c0392b', 'right', true); dy0 += 18; }
      if (G.godMode) { T.txt(c, '调试：无敌', rx, dy0, 13, '#c0392b', 'right', true); dy0 += 18; }
      T.txt(c, Math.round(app.fps) + ' FPS · 敌人 ' + G.enemies.length, rx, dy0, 12, T.T.inkSoft, 'right', false);
    }
    XY.ui.banner = null;
    T.drawCardsHUD(c, G, app, dy0 + 14);
    if (XY.ui.cardPanel) rec('fabao', XY.ui.cardPanel.x, XY.ui.cardPanel.y, XY.ui.cardPanel.w, XY.ui.cardPanel.h);
    rec('skillBtn', sb.x, sb.y, sb.w, sb.h);
    // 队伍展开时由队伍页管理底栏；收起后恢复战场召唤印和「队伍」签
    var pOpen = !!app.partyPanel && XY.party.visible(G, app), tip = null, pL = pOpen ? XY.hud2.layout(G, app) : null;
    if (pOpen) {
      drawWaveEdge(c, G, app, W, H);
      drawNote(c, G, app, ctx);
      drawEvents(c, G, app);
      tip = drawHeroCards(c, G, app, 'pre');
    }
    if (!XY.party.visible(G,app)) drawSky(c, G, app);
    if (XY.vendor && !pOpen) XY.vendor.drawBtn(c, G, app, portrait(app) ? XY.hud2.layout(G, app).tabC.y / app.zoom : app.lh - 250);
    // v0.8.0：右下角的「操作说明」框已搬进菜单面板（H 键直接打开那一页）
    if (!(pL && pL.cover)) drawTowerBar(c, G, app);
    if (!pOpen) tip = drawHeroCards(c, G, app, 'post');
    // v0.7.0l：顶部通知（一条）+ 妖潮边缘箭头；闯入 / 狂暴 / 妖潮 / 洞府都已经是细条里的 chip
    XY.ui.strip = null;
    var _bc = (XY.ui.topChips || []).filter(function (h) { return h.id === 'breach'; })[0]; if (_bc) XY.ui.strip = { x: _bc.x, y: _bc.y, w: _bc.w, h: _bc.h };
    if (!pOpen) {
      drawWaveEdge(c, G, app, W, H);
      drawNote(c, G, app, ctx);
      drawEvents(c, G, app);
    }
    }
    // 造塔预览 / 天兵落点预览 / 选中的塔
    var tcx = G.view.w / 2 - G.cam.x, tcy = G.view.h / 2 - G.cam.y;
    if (app.summon && app.mouse && G.mode === 'play') {
      c.save(); c.globalAlpha = 0.9; c.setLineDash([8, 6]); c.lineWidth = 2.5; c.strokeStyle = '#584d3d'; c.fillStyle = 'rgba(53,45,33,0.035)';
      c.beginPath(); c.arc(app.mouse.x, app.mouse.y, 320, 0, 6.3); c.fill(); c.stroke(); c.setLineDash([]); c.restore();
      T.otxt(c, '点击降下天兵（免费，每关一次）· 右键取消', app.mouse.x, app.mouse.y - 12, 14, '#584d3d', 'center', true);
    }
    if (app.selTower && G.towers.indexOf(app.selTower) >= 0 && !G.td && !(app.shortHudDrawer&&XY.compactHud&&XY.compactHud.on(G,app)&&XY.compactHud.layout(app,G).shortTop)) {
      var st = app.selTower, sd = XY.TOWERS[st.type], sx = st.x + tcx, sy = st.y + tcy, ss = XY.towerStat(G, st);
      c.beginPath(); c.arc(sx, sy, ss.range, 0, 6.3); c.lineWidth = 2; c.strokeStyle = 'rgba(232,137,43,0.8)'; c.setLineDash([6, 5]); c.stroke(); c.setLineDash([]);
      var sb = XY.solBuff(G, st), tr0 = C.SOLBUFF.treat, mobT = app.zoom < 0.75, u = mobT ? Math.min(2.4, 1.2 / app.zoom) : 1;   // 手机：整块浮窗放大，按钮 ≥ 40 CSS 像素
      var pw = 196, bh = mobT ? 44 / (app.zoom * u) : 44 / app.zoom, ph = 72 + bh + 8, PW = pw * u, PH = ph * u;
      var px2 = Math.max(6, Math.min(W - PW - 6, sx - PW / 2)), py2 = Math.max(60 / app.zoom, sy - 44 - PH);
      rec('towerInfo', px2, py2, PW, PH);
      c.save(); c.translate(px2, py2); c.scale(u, u); c.fillStyle='#f5ecd6';c.fillRect(0,0,pw,ph);if(XY.INKP)XY.INKP.stroke(c,8,3,pw-12,4,2,'64,49,30',.32,71,.01);
      T.txt(c, sd.name + ' · 卡 Lv' + (st.cl || 1) + '（不能升级）', pw / 2, 14, 13, T.T.ink, 'center', true);
      T.txt(c, '血 ' + Math.ceil(st.hp) + '/' + Math.round(XY.towerMaxHp(st)) + ' · 射程 ' + Math.round(ss.range), pw / 2, 31, 11, T.T.inkSoft, 'center', false);
      T.txt(c, (st.mode === 'garrison' ? '驻守中，唐僧走过后跟上' : '跟随唐僧') + ' · 还剩 ' + Math.max(0, Math.ceil(st.life || 0)) + ' 秒', pw / 2, 46, 11, T.T.inkSoft, 'center', false);
      var bl = []; if (sb.link) bl.push('联防 +' + Math.round(C.SOLBUFF.link.dmg[sb.link - 1] * 100) + '%'); if (sb.incense) bl.push('香火 +' + Math.round(C.SOLBUFF.incense.dmg * 100) + '%'); if (sb.treat > 0) bl.push('犒赏 ' + Math.ceil(sb.treat) + ' 秒');
      T.txt(c, bl.length ? bl.join(' · ') : '加成：无（附近凑齐 3 种天兵 = 联防）', pw / 2, 61, 11, bl.length ? '#a8700a' : '#9a968b', 'center', true);
      var why = XY.treatCheck(G, st), bw = pw - 20, by0 = 72;
      c.save();c.translate(pw/2,by0+bh/2);c.rotate(-.02);c.fillStyle=why?'rgba(70,50,20,.05)':'#ad321c';c.fillRect(-bw/2,-bh*.39,bw,bh*.78);c.restore();
      T.txt(c, st.treatCd > 0 ? '犒赏冷却 ' + Math.ceil(st.treatCd) + ' 秒' : '犒赏 ' + tr0.cost + ' 金币 · 冷却' + tr0.cd + '秒', pw / 2, by0 + bh / 2 - 7, 12, why ? '#81745d' : '#fff1d8', 'center', true);
      T.txt(c, tr0.t + '秒减伤' + Math.round(tr0.dr * 100) + '% · 驻留+' + Math.round(tr0.life * 100) + '%', pw / 2, by0 + bh / 2 + 9, 11, why ? '#81745d' : '#fff1d8', 'center', false);
      c.restore();
      XY.ui.hits.push({ x: px2 + 10 * u, y: py2 + by0 * u, w: bw * u, h: bh * u, act: 'treat' });
    }
    // 边缘箭头：营地 / 唐僧 / 关口
    var mapMarks = R4.planMapLabels(c, G, app);
    R4.mapLabels = mapMarks;
    mapMarks.forEach(function (m) {
      var ink = m.alert && Math.sin(rt * 10) > 0 ? '#a83224' : '#24180f';
      c.save();
      var ag = c.createRadialGradient(m.ax, m.ay, 3, m.ax, m.ay, 28);
      ag.addColorStop(0, 'rgba(246,239,226,0.28)');
      ag.addColorStop(1, 'rgba(243,234,214,0)');
      c.fillStyle = ag;
      c.beginPath();
      c.ellipse(m.ax, m.ay, 30, 16, m.ang, 0, Math.PI * 2);
      c.fill();
      c.restore();
      c.save();
      c.translate(m.ax, m.ay);
      c.rotate(m.ang);
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = ink; c.globalAlpha = 0.92;
      c.lineWidth = 3.1;
      c.beginPath(); c.moveTo(-14, 0); c.quadraticCurveTo(-2, -1.4, 12, 0); c.stroke();
      c.lineWidth = 2.1;
      c.beginPath(); c.moveTo(13, 0); c.quadraticCurveTo(4, -6, -1, -8); c.moveTo(13, 0); c.quadraticCurveTo(4, 6, -1, 8); c.stroke();
      c.restore();
      c.save();
      var tw = 0; c.font = m.sz + 'px "Ma Shan Zheng","KaiTi","STKaiti",serif';
      tw = c.measureText(m.label).width;
      var gx = c.createRadialGradient(m.lx, m.ly, m.sz * 0.15, m.lx, m.ly, Math.max(tw, m.sz) * 0.55);
      gx.addColorStop(0, 'rgba(246,239,226,0.34)');
      gx.addColorStop(1, 'rgba(243,234,214,0)');
      c.fillStyle = gx;
      c.beginPath();
      c.ellipse(m.lx, m.ly, tw * 0.42 + 6, m.sz * 0.72, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = m.alert ? '#a83224' : '#24180f';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(m.label, m.lx, m.ly);
      c.restore();
    });

/* BEGIN PARTY_NARROW_CANDIDATE_1 */
    if (XY.hud2 && XY.hud2.narrowOpen(G,app)) { XY.hud2.drawNarrowParty(c,G,app); return; }
/* END PARTY_NARROW_CANDIDATE_1 */
    if (XY.hud2 && XY.hud2.desktopOpen(G,app)) { XY.hud2.drawDesktopParty(c,G,app); return; }
    if(XY.ui2.on&&XY.inkHud)app._finalHudTip={game:G,rt:app.rt,tip:tip||app._tip};
    else drawTip(c, app, tip || app._tip);
    if (G.tut) XY.tutDraw(c, G, app);
    // Tutorial drawing may relocate its card: use its final current-frame hits.
    // The cat's outer wrapper paints a late body/warning pass, then flushes this group.
    if (!(XY.devilKitty && XY.devilKitty.ownsFloatText && XY.devilKitty.ownsFloatText(G,app))) R4.drawBossNames(c,G,app);
    R4.drawSoldierPlacementPreview(c, G, app);
  };
})();
