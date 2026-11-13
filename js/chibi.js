/* v0.7 操控角色的 Q 版多帧渲染。
 * 战场上所有角色仍是 X 头像圆形肖像；只有“当前被玩家操控”的那一个换成 Q 版小人（切换后旧的变回头像）。
 * 精灵：assets 里预先烘好的图集（chibi_data.js，AI 生成 + 官方 Logo 合成 + 抠图，运行时不再生成任何图）。
 * 每个角色 8 帧：0/1 待机（A/B，交叉淡化成 4 个状态）、2–5 走路 4 帧、6 出招前摇、7 出招；另有受击：抖动 + 变红（缓存染色帧）。
 * 朝右为原图，朝左镜像（马丁的旗子有字，所以有单独烘好的朝左帧）。Phyrex 没有光环；变身用 phyrex_x。
 */
(function () {
  'use strict';
  var XY = window.XY, imgs = {}, tints = {}, face = {};
  var DRAW_H = 3.6;                                       // 画出来的高度 = 半径 × 3.6（站立帧 120px 对应这个高度）
  var S = XY.chibi = { stats: { idle: 0, walk: 0, atk: 0, hit: 0 }, last: null, frames: {}, drawn: 0 };

  /* v0.7.0n：五位主角优先用水墨工笔精灵 XY.CHIBI_INK（js/chibi_ink_data.js，tools/ink_bake.py 烘焙，切片在 assets/art/hero-ink/sprites/）；
   * 没有水墨版的角色（Phyrex、特殊人物）和 XY.chibi.useInk=false 时仍走旧图集 XY.CHIBI。两套图集格式相同，只有站高像素不同（stand）。 */
  S.useInk = true;
  function pickData(id) {
    if (S.useInk && XY.CHIBI_INK && XY.CHIBI_INK[id]) return { d: XY.CHIBI_INK[id], stand: XY.CHIBI_INK_STAND || XY.CHIBI_STAND, ink: true };
    var d = XY.CHIBI && XY.CHIBI[id]; return d ? { d: d, stand: XY.CHIBI_STAND, ink: false } : null;
  }
  function load(id) {
    var pd = pickData(id); if (!pd) return null;
    var e = imgs[id]; if (e && e.ink === pd.ink) return e;
    var d = pd.d;
    e = imgs[id] = { img: new Image(), d: d, stand: pd.stand, ink: pd.ink };
    e.img.src = d.src;
    return e;
  }
  function ok(e) { return e && e.img.complete && e.img.naturalWidth > 0; }
  XY.chibiKey = function (h) { return h.id === 'phyrex' && h.xf > 0 && XY.CHIBI && XY.CHIBI.phyrex_x ? 'phyrex_x' : h.id; };
  S.forget = function (id) { delete imgs[id]; if (XY._cbMenu) delete XY._cbMenu[id]; for (var k in tints) if (k.indexOf(id + '~') === 0 ) delete tints[k]; };   // v0.8.1：自建角色重做精灵时清缓存
  S.has = function (id) { return !!(XY.CHIBI && XY.CHIBI[id]) && !(XY.isHidden && XY.isHidden(id)); };
  S.preload = function () { if (XY.CHIBI) for (var k in XY.CHIBI) if (!(XY.isHidden && XY.isHidden(k))) load(k); };
  S.ready = function (h) { var k = XY.chibiKey(h); if (S.useWild(h)) return true; return S.has(k) && ok(load(k)); };

  function tint(key, set, i, e, f) {
    var ck = key + '~' + (e.ink ? 'ink' : 'plain') + '~' + set + '~' + i, t = tints[ck];
    if (t) return t;
    t = tints[ck] = document.createElement('canvas'); t.width = f[2]; t.height = f[3];
    var x = t.getContext('2d'); x.drawImage(e.img, f[0], f[1], f[2], f[3], 0, 0, f[2], f[3]);
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(255,50,40,0.6)'; x.fillRect(0, 0, f[2], f[3]);
    return t;
  }

  /* 狂野水墨多帧：待机按 animation.json 的 cycle / pingpong 播，出招 8 帧约 667ms，播完回待机。
   * 走路（2–5）和蓄力（6）仍用旧图集。币圈老司机没有出招包，出招那一下留旧的第 7 帧。
   * 伤害仍在攻击冷却被重置的那一瞬结算；出招动画从这一瞬开始，命中帧约在 250ms。 */
  var WILD_STAND = 192;
  S.wildOff = false;
  S.useWild = function (h) {
    if (S.wildOff || !h || !XY.wildAnim || !XY.wildAnim.ready) return false;
    if (h.id === 'horse' && h.def && h.def.form === 'human') return false;
    var key = XY.chibiKey(h);
    return XY.wildAnim.ready(key, 'idle') || XY.wildAnim.ready(h.id, 'idle');
  };
  S.wildState = function (h, rt, key) {
    var W = XY.wildAnim;
    if (!W || !W.knows || !W.knows(key)) return null;
    if (h._wildFreeze) return h._wSt || { mode: 'idle', t: 0 };
    var prev = h._wAtkSeen, edge = false;
    if (prev != null && h.atkMax > 0.25 && (h.atkT || 0) > prev + 0.15) edge = true;
    if (h.dash && !h._wDashSeen) edge = true;
    h._wAtkSeen = h.atkT; h._wDashSeen = !!h.dash;
    var dt = h._wRt == null ? 0 : (rt - h._wRt) * 1000;
    if (!(dt >= 0)) dt = 0;
    if (dt > 200) dt = 200;
    h._wRt = rt;
    var atk = W.ready(key, 'attack') ? W.clip(key, 'attack') : null;
    h._wSt = W.step(h._wSt, dt, edge, atk);
    if (h._wIdleT == null) h._wIdleT = Math.abs((h.bob || 0) * 1000) % 8000;
    else h._wIdleT += dt;
    return h._wSt;
  };
  function wildTint(key, clipName, i, im, sx, sy, cw, ch) {
    var ck = key + '~wild~' + clipName + '~' + i, t = tints[ck];
    if (t) return t;
    t = tints[ck] = document.createElement('canvas'); t.width = cw; t.height = ch;
    var g = t.getContext('2d'); g.drawImage(im, sx, sy, cw, ch, 0, 0, cw, ch);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,50,40,0.6)'; g.fillRect(0, 0, cw, ch);
    return t;
  }
  function drawWildFrame(c, key, clipName, index, k, tinted) {
    var W = XY.wildAnim, clip = W.clip(key, clipName), im = W.img(key, clipName);
    if (!clip || !im || index < 0 || index >= clip.frameCount) return null;
    var cw = clip.cell[0], ch = clip.cell[1], col = index % clip.cols, row = (index / clip.cols) | 0;
    var sx = col * cw, sy = row * ch, kk = k * (clip.fit || 1);
    var src = tinted ? wildTint(key, clipName, index, im, sx, sy, cw, ch) : im;
    c.drawImage(src, tinted ? 0 : sx, tinted ? 0 : sy, cw, ch, -clip.anchor[0] * kk, -clip.anchor[1] * kk, cw * kk, ch * kk);
    return clip;
  }

  /* 选动画：返回 {anim, i(帧号), mix(待机交叉淡化的 B 帧透明度)} */
  S.pick = function (h, rt) {
    var ph = rt * 10 + (h.bob || 0);
    if (h.hurtT > 0.05) return { anim: 'hit', i: h.moving ? 2 + (Math.floor(ph) & 3) : 0 };
    if (h.ultPose) return { anim: 'atk', i: h.ultPose };                       // 大招场景（ultscene）直接指定 Q 版动作帧，不去动攻击冷却
    var el = (h.atkMax || 0) - (h.atkT || 0);
    if (h.dash || (h.atkMax > 0.25 && h.atkT > 0 && el >= 0 && el < 0.2)) return { anim: 'atk', i: 7 };
    if (h.atkMax > 0.3 && h.atkT > 0.06 && h.atkT < 0.18) return { anim: 'atk', i: 6 };
    if (h.moving) return { anim: 'walk', i: 2 + (Math.floor(ph) & 3) };
    return { anim: 'idle', i: 0, mix: 0.5 + 0.5 * Math.sin(rt * 2.4 + (h.bob || 0)) };
  };

  var HD = {}, HDSET = { tang: 1, wukong: 1, bajie: 1, wujing: 1, horse: 1, phyrex: 1, phyrex_x: 1, sisi: 1, laosiji: 1, kuanggong: 1, haiteng: 1, yuanzhang: 1, heyuxi: 1, diaoyulao: 1, martin: 1 };
  S.hdRoster = function (id) { return !!(id && HDSET[id]); };
  S.hd = function (id) {
    if (!id) return null;
    var e = HD[id];
    if (!e) { e = HD[id] = new Image(); e.src = 'assets/art/battle-hd/' + id + '.webp'; }
    return e.complete && e.naturalWidth ? e : null;
  };
  /* 没有走路图：移动时在高清抠图上做起伏、摆动和落脚挤压。必杀过场不进这里。 */
  S.stepPose = function (h, rt) {
    var horse = h.id === 'horse';
    var ph;
    if (h._stepLock != null) ph = h._stepLock;
    else {
      var prev = h._stepAt, dt = prev ? Math.max(0.016, Math.min(0.08, rt - prev.t)) : 0.016;
      var dist = prev ? Math.hypot(h.x - prev.x, h.y - prev.y) : 0;
      h._stepAt = { x: h.x, y: h.y, t: rt };
      var v = dist / dt, pace = (horse ? 1.6 : 1.85) * (0.82 + 0.28 * Math.min(v, 180) / 180);
      h._stepPh = (h._stepPh || (h.bob || 0)) + dt * pace * Math.PI * 2;
      ph = h._stepPh;
    }
    var s = Math.sin(ph), cyc = Math.cos(ph), amp = horse ? 0.8 : 1.0;
    var contact = Math.pow(Math.max(0, 1 - Math.abs(s) * 2.2), 1.2);
    var squash = (horse ? 0.01 : 0.015) * contact;
    return { bob: (1 - Math.cos(ph * 2)) / 2 * amp, rot: s * 2.5 * Math.PI / 180, sway: cyc * (horse ? 0.6 : 1.0), sx: 1 + squash, sy: 1 - squash };
  };
  S.draw = function (c, G, h, rt, x, y, r) {
    var key = XY.chibiKey(h);
    var roster = S.hdRoster(key) || S.hdRoster(h.id);
    if (roster) key = S.hdRoster(key) ? key : h.id;
    else if (!(XY.wildAnim && XY.wildAnim.ready && XY.wildAnim.ready(key, 'idle')) && XY.wildAnim && XY.wildAnim.ready && XY.wildAnim.ready(h.id, 'idle')) key = h.id;
    var e = load(key), oldOk = ok(e);
    if (roster && !S.hd(key)) return true;
    if (!oldOk && !S.useWild(h) && !S.hd(key)) return false;
    if (h.ultInk) { h._wildTop = null; return true; }            // 大招水墨精灵（ultink.js）在场：本体由它画，这里不重复画
    var d = e && e.d, sz = (d && d.sz) || 1;
    var kWild = r * DRAW_H / WILD_STAND * sz, kOld = e ? r * DRAW_H / e.stand * sz : kWild;
    var a = S.pick(h, rt), cs = Math.cos(h.face || 0);
    var fl = face[h.i]; if (fl === undefined || Math.abs(cs) > 0.25) fl = face[h.i] = cs < 0;
    var set = d ? (fl && d.L ? d.L : d.fr) : null, mir = !!(fl && !(d && d.L));
    var st = S.wildState(h, rt, key);
    var charging = a.anim === 'atk' && a.i === 6;
    var legacyStrike = a.anim === 'atk' && a.i === 7 && !(XY.wildAnim && XY.wildAnim.clip(key, 'attack'));
    var tangStep = h.id === 'tang' && G && G.tang && (G.tang.phase === 'walk' || G.tang.phase === 'walk2');
    var acting = !!(h.ultPose || h.ultInk || charging || legacyStrike);
    var attacking = !!(st && st.mode === 'attack');
    var wildKind = null;
    if (!acting && st && S.useWild(h)) wildKind = attacking ? 'attack' : 'idle';
    if (!h.ultInk && (S.hd(key) || roster)) wildKind = roster ? 'idle' : wildKind;
    if (!h.ultInk && S.hd(key)) wildKind = 'idle';
    var hasOldWalk = oldOk && !!(set && set[2] && set[3] && set[4] && set[5]);
    var oldWalk = hasOldWalk && !acting && !attacking && !!h.moving;
    if (oldWalk) wildKind = null;                                // 恢复 11-11 之前的走路：路上移动播旧图集的走路帧，不在立绘上做抖动
    var wantWalk = !hasOldWalk && wildKind === 'idle' && !!(h.moving || tangStep);   // 只有没有旧走路图集的角色才在立绘上做落脚起伏
    if (!wildKind && (h.moving || tangStep) && !acting) a = { anim: 'walk', i: 2 + (Math.floor(rt * 10 + (h.bob || 0)) & 3), mix: 0 };
    var moving = !wildKind && a.anim === 'walk', foot = y + r * 0.85;
    var step = wantWalk ? S.stepPose(h, rt) : null;
    var bobY = step ? -step.bob : (wildKind ? 0 : (moving ? -Math.abs(Math.sin(rt * 10 + (h.bob || 0))) * r * 0.14 : -Math.sin(rt * 2.4 + (h.bob || 0)) * r * 0.025));
    var lean = step ? step.rot : (wildKind ? 0 : (moving ? (fl ? -0.05 : 0.05) * Math.sin(rt * 10 + (h.bob || 0)) : 0));
    var sy = step ? step.sy : 1, sx = step ? step.sx : 1;
    if (!step && !wildKind && a.anim === 'idle') { var br = Math.sin(rt * 2.4 + (h.bob || 0)); sy = 1 + br * 0.012; sx = 1 - br * 0.008; }
    var hitX = 0, hurt = h.hurtT > 0.05;
    if (hurt) { hitX = Math.sin(rt * 90) * r * 0.12; if (!wildKind) { sy = 0.95; sx = 1.04; } }
    c.save();
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.translate(x + hitX + (step ? step.sway : 0), foot + bobY); c.rotate(lean); c.scale(sx * (mir ? -1 : 1), sy);
    h._wildTop = null;
    if (wildKind) {
      var hdIm = S.hd(key);
      if (hdIm && wildKind === 'idle') {
        var dh = r * 3.4 * ((G && G._shotScale) || 1) * ((XY && XY._partyScale) || 1), dw = hdIm.naturalWidth * dh / hdIm.naturalHeight;
        c.drawImage(hdIm, -dw / 2, -dh, dw, dh);
        h._drawBox = { x: x + hitX + (step ? step.sway : 0) - dw / 2, y: foot + bobY - dh, w: dw, h: dh };
        h._wildTop = foot + bobY - dh;
        c.restore(); c.globalAlpha = 1;
        S.drawn++; S.last = { id: key, anim: wantWalk ? 'hd-walk' : 'hd-idle', frame: 0, left: !!fl, hero: h.i, t: rt, ink: true, wild: false, hd: true };
        (S.lastBy || (S.lastBy = {}))[h.i] = S.last;
        return true;
      }
      var wt = wildKind === 'attack' ? (st.t || 0) : (h._wIdleT || 0);
      var clip = XY.wildAnim.clip(key, wildKind);
      var fr = clip ? XY.wildAnim.frameAt(clip, wt) : null;
      var drawn = fr && drawWildFrame(c, key, wildKind, fr.index, kWild, hurt);
      if (drawn) {
        h._wildTop = foot + bobY - drawn.anchor[1] * kWild;
        c.restore(); c.globalAlpha = 1;
        var animName = wildKind === 'attack' ? 'atk' : 'idle';
        S.stats[animName]++; S.drawn++;
        S.last = { id: key, anim: wildKind === 'attack' ? 'wild-atk' : 'wild-idle', frame: fr.index, left: !!fl, hero: h.i, t: rt, ink: true, wild: true };
        (S.lastBy || (S.lastBy = {}))[h.i] = S.last;
        S.frames[key + ':' + S.last.anim + ':' + fr.index] = 1;
        return true;
      }
    }
    if (!oldOk || !set) { c.restore(); c.globalAlpha = 1; return false; }
    var k = kOld * (oldWalk ? ((G && G._shotScale) || 1) * ((XY && XY._partyScale) || 1) : 1);
    function one(i, alpha, tinted) {
      var f = set[i]; if (!f) return;
      var dw = f[2] * k, dh = f[3] * k;
      c.globalAlpha = alpha;
      c.drawImage(tinted ? tint(key, fl && d.L ? 'L' : 'R', i, e, f) : e.img, tinted ? 0 : f[0], tinted ? 0 : f[1], f[2], f[3], -f[4] * k, -f[5] * k, dw, dh);
    }
    if (a.anim === 'idle') { one(0, 1); one(1, a.mix); S.frames[key + ':idle:1'] = 1; }
    else { one(a.i, 1); if (a.anim === 'hit' || hurt) one(a.i, 1, true); }
    c.restore(); c.globalAlpha = 1;
    var bf0 = set[a.anim === 'idle' ? 0 : a.i];                   // 名字牌按这一帧的头顶摆，不沿用上一次立绘的位置
    if (bf0) { h._drawBox = { x: x + hitX - (mir ? (bf0[2] - bf0[4]) * k : bf0[4] * k), y: foot + bobY - bf0[5] * k, w: bf0[2] * k, h: bf0[3] * k }; h._wildTop = h._drawBox.y; } else h._drawBox = null;
    S.stats[a.anim]++; S.drawn++;
    S.last = { id: key, anim: a.anim, frame: a.i, left: !!fl, hero: h.i, t: rt, ink: !!e.ink };
    (S.lastBy || (S.lastBy = {}))[h.i] = S.last;                  // v0.8.1：每个角色最近一次画的帧（所有英雄都画 Q 版后，S.last 只是“最后画的那个”）
    S.frames[key + ':' + a.anim + ':' + a.i] = 1;
    return true;
  };
  ['tang','wukong','bajie','wujing','horse','phyrex','sisi','laosiji','kuanggong','haiteng','yuanzhang','heyuxi','diaoyulao','martin'].forEach(function (id) { S.hd(id); });
  if (XY.CHIBI) S.preload(); else setTimeout(function () { if (XY.CHIBI) S.preload(); }, 0);
})();
// 菜单 / 卡片用的静态立绘：画 Q 版第 0 帧（待机），脚底在 (x, foot)，站高 h 像素；返回是否画出
XY.chibi.portrait = function (c, id, x, foot, h, alpha) {
  var ink = XY.chibi.useInk && XY.CHIBI_INK && XY.CHIBI_INK[id], d = ink || (XY.CHIBI && XY.CHIBI[id]); if (!d || (XY.isHidden && XY.isHidden(id))) return false;
  var stand = ink ? (XY.CHIBI_INK_STAND || XY.CHIBI_STAND) : XY.CHIBI_STAND;
  var e = (function () { if (!XY._cbMenu) XY._cbMenu = {}; var m = XY._cbMenu[id]; if (!m) { m = XY._cbMenu[id] = { img: new Image() }; m.img.src = d.src; } return m; })();
  if (!(e.img.complete && e.img.naturalWidth > 0)) return false;
  var f = d.fr[0], k = h / stand;
  c.save(); c.globalAlpha = alpha === undefined ? 1 : alpha; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(e.img, f[0], f[1], f[2], f[3], x - f[4] * k, foot - f[5] * k, f[2] * k, f[3] * k); c.restore(); return true;
};
