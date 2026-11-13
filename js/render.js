/* ============================================================
 * render.js —— 所有画面绘制（世界、角色、特效、HUD、各种界面）
 * 全部用 Canvas 2D 画，没有外部图片。浅色主题。
 * 对外： XY.render(ctx, G, app)    XY.ui.hits 保存可点击区域
 * ============================================================ */
(function () {
  var XY = window.XY, C = XY.C, PI2 = Math.PI * 2;
  var FONT = C.FONT;
  var ui = XY.ui = { hits: [] };

  /* ---------- 主题色（浅色） ---------- */
  var T = {
    grass1: '#dcebc6', grass2: '#d3e5bb', outside: '#c3d3ad',
    ink: '#3a3226', inkSoft: '#6d6455', panel: 'rgba(255,253,246,0.95)', panelBorder: '#cdbf9c',
    gold: '#e0a415', good: '#5cb85c', bad: '#e0533d', blue: '#4a90d9'
  };

  /* ---------- 地图装饰（固定种子，每次一样） ---------- */
  var decor = null;
  function buildDecor() {
    var rnd = XY.seeded(20261031), out = [];
    for (var i = 0; i < 520; i++) {
      var x = rnd() * C.WORLD_W, y = rnd() * C.WORLD_H;
      if (XY.dist(x, y, C.WORLD_W / 2, C.WORLD_H / 2) < 230) continue;
      var r = rnd(), type = r < 0.5 ? 'tuft' : (r < 0.72 ? 'flower' : (r < 0.88 ? 'rock' : 'bush'));
      out.push({ x: x, y: y, t: type, s: 0.7 + rnd() * 0.7, c: rnd() });
    }
    return out;
  }

  /* ---------- 小工具 ---------- */
  function font(sz, bold) { return (bold ? 'bold ' : '') + sz + 'px ' + FONT; }
  function txt(c, s, x, y, sz, color, align, bold) {
    c.font = font(sz, bold); c.fillStyle = color; c.textAlign = align || 'left'; c.textBaseline = 'middle';
    c.fillText(XY.fmtStr(s), x, y);
  }
  function otxt(c, s, x, y, sz, color, align, bold, outline) {   // 带描边文字（飘字、名字）
    c.font = font(sz, bold); c.textAlign = align || 'center'; c.textBaseline = 'middle';
    c.lineWidth = 3; c.strokeStyle = outline || 'rgba(246,239,226,0.45)'; c.lineJoin = 'round';
    s = XY.fmtStr(s); c.strokeText(s, x, y); c.fillStyle = color; c.fillText(s, x, y);
  }
  function inkTag(c, s, x, y, sz, color) {                       // 战场名牌 / 命令：毛笔字，不铺白底
    c.save();
    c.font = sz + 'px "Ma Shan Zheng","KaiTi","STKaiti",serif';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = color || '#24180f';
    c.fillText(XY.fmtStr(s), x, y);
    c.restore();
  }
  function rrect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function panel(c, x, y, w, h, r, fill, border) {
    if (XY.ui2 && XY.ui2.on) return XY.ui2.panel(c, x, y, w, h, r, fill, border);
    rrect(c, x, y, w, h, r || 10); c.fillStyle = fill || T.panel; c.fill();
    c.lineWidth = 1.5; c.strokeStyle = border || T.panelBorder; c.stroke();
  }
  function bar(c, x, y, w, h, frac, color, bg) {
    frac = Math.max(0, Math.min(1, frac));
    c.fillStyle = bg || 'rgba(60,50,30,0.25)'; rrect(c, x, y, w, h, h / 2); c.fill();
    if (frac > 0) { c.fillStyle = color; rrect(c, x, y, Math.max(h, w * frac), h, h / 2); c.fill(); }
    c.lineWidth = 1; c.strokeStyle = 'rgba(60,50,30,0.5)'; rrect(c, x, y, w, h, h / 2); c.stroke();
  }
  function hpColor(f) { return f > 0.6 ? '#5cb85c' : (f > 0.3 ? '#f0ad4e' : '#e0533d'); }
  function inView(G, x, y, m) {
    return Math.abs(x - G.cam.x) < G.view.w / 2 + m && Math.abs(y - G.cam.y) < G.view.h / 2 + m;
  }

  /* ================= 角色造型（头像和场上共用） ================= */
  function drawHeroShape(c, def, x, y, r) {
    if (def.special) return XY.R4.specialShape(c, def, x, y, r);
    if (XY.heroink && XY.heroink.face(c, def, x, y, r)) return;          // v0.7.0m：五位主角用水墨工笔立绘的圆形脸；v0.8.0：皮肤脸 / 小白龙人形脸也用水墨脸
    var id = def.id, human = def.form === 'human', skin = id === 'bajie' ? '#fbd0de' : (id === 'horse' && !human ? '#ffffff' : '#ffe3c2');
    c.lineJoin = 'round';
    // 身体后面的部件：耳朵、光环
    c.fillStyle = id === 'bajie' ? '#f6a6c1' : (id === 'wukong' ? '#ffd9a8' : def.color); c.strokeStyle = def.dark; c.lineWidth = 2;
    if (id === 'bajie') {
      [-1, 1].forEach(function (s) { c.beginPath(); c.ellipse(x + s * r * 0.85, y - r * 0.55, r * 0.42, r * 0.62, s * 0.4, 0, PI2); c.fill(); c.stroke(); });
    } else if (id === 'wukong') {
      [-1, 1].forEach(function (s) { c.beginPath(); c.arc(x + s * r * 0.98, y - r * 0.1, r * 0.3, 0, PI2); c.fill(); c.stroke(); });
    } else if (id === 'horse' && human) {                    // 小白龙人形：头上两只小龙角
      c.fillStyle = '#f6e7a6'; c.strokeStyle = '#b8a040'; c.lineWidth = 1.8;
      [-1, 1].forEach(function (s) { c.beginPath(); c.moveTo(x + s * r * 0.3, y - r * 0.8); c.quadraticCurveTo(x + s * r * 0.9, y - r * 1.1, x + s * r * 0.7, y - r * 1.65); c.quadraticCurveTo(x + s * r * 0.45, y - r * 1.2, x + s * r * 0.1, y - r * 0.9); c.closePath(); c.fill(); c.stroke(); });
    } else if (id === 'horse') {
      [-1, 1].forEach(function (s) { c.beginPath(); c.moveTo(x + s * r * 0.2, y - r * 0.8); c.lineTo(x + s * r * 0.6, y - r * 1.35); c.lineTo(x + s * r * 0.85, y - r * 0.55); c.closePath(); c.fill(); c.stroke(); });
    } else if (id === 'tang') {
      c.beginPath(); c.arc(x, y - r * 0.2, r * 1.05, Math.PI * 1.15, Math.PI * 1.85); c.lineWidth = 3; c.strokeStyle = '#ffe58a'; c.stroke();
    }
    // 身体
    c.beginPath(); c.arc(x, y, r, 0, PI2); c.fillStyle = def.color; c.fill(); c.lineWidth = 2.5; c.strokeStyle = def.dark; c.stroke();
    // 衣服细节
    if (id === 'tang') {
      c.beginPath(); c.arc(x, y, r * 0.82, 0.15 * Math.PI, 0.85 * Math.PI); c.lineWidth = r * 0.34; c.strokeStyle = '#d9433a'; c.stroke();
    } else if (id === 'wujing') {
      c.fillStyle = '#fff';
      for (var k = 0; k < 5; k++) { var a = Math.PI * (0.2 + k * 0.15); c.beginPath(); c.arc(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85, r * 0.12, 0, PI2); c.fill(); }
    }
    // 脸
    c.beginPath(); c.ellipse(x, y - r * 0.12, r * 0.68, r * 0.6, 0, 0, PI2); c.fillStyle = skin; c.fill(); c.lineWidth = 1.5; c.strokeStyle = def.dark; c.stroke();
    if (id === 'bajie') {
      c.beginPath(); c.ellipse(x, y + r * 0.08, r * 0.3, r * 0.2, 0, 0, PI2); c.fillStyle = '#f5a3bd'; c.fill(); c.lineWidth = 1.2; c.stroke();
      c.fillStyle = '#8a3a55'; c.beginPath(); c.arc(x - r * 0.1, y + r * 0.08, r * 0.05, 0, PI2); c.arc(x + r * 0.1, y + r * 0.08, r * 0.05, 0, PI2); c.fill();
    }
    if (id === 'horse' && human) {                            // 白发 + 微笑
      c.beginPath(); c.arc(x, y - r * 0.2, r * 0.72, Math.PI * 1.02, Math.PI * 1.98); c.lineWidth = 5; c.strokeStyle = '#ffffff'; c.stroke();
      c.lineWidth = 1.2; c.strokeStyle = def.dark; c.beginPath(); c.arc(x, y - r * 0.2, r * 0.8, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
    } else if (id === 'horse') {
      c.beginPath(); c.ellipse(x, y + r * 0.22, r * 0.36, r * 0.24, 0, 0, PI2); c.fillStyle = '#d9f3f5'; c.fill(); c.lineWidth = 1.2; c.stroke();
      c.beginPath(); c.moveTo(x - r * 0.1, y - r * 0.75); c.quadraticCurveTo(x, y - r * 0.5, x + r * 0.1, y - r * 0.75); c.lineWidth = 3; c.strokeStyle = '#ffffff'; c.stroke();
    }
    if (id === 'wukong') {
      c.beginPath(); c.arc(x, y - r * 0.2, r * 0.74, Math.PI * 1.1, Math.PI * 1.9); c.lineWidth = 3.2; c.strokeStyle = '#f5c518'; c.stroke();
    }
    if (id === 'wujing') {
      c.beginPath(); c.arc(x, y + r * 0.02, r * 0.62, 0.15 * Math.PI, 0.85 * Math.PI); c.lineWidth = r * 0.22; c.strokeStyle = '#2f3e52'; c.stroke();
    }
    // 眼睛
    c.fillStyle = '#2b2118';
    var ey = y - r * (id === 'bajie' ? 0.28 : 0.22);
    c.beginPath(); c.arc(x - r * 0.25, ey, r * 0.085, 0, PI2); c.arc(x + r * 0.25, ey, r * 0.085, 0, PI2); c.fill();
    if (def.accent) {                                         // 皮肤：换色腰带 + 一颗小星
      c.beginPath(); c.arc(x, y, r * 0.9, 0.18 * Math.PI, 0.82 * Math.PI); c.lineWidth = r * 0.2; c.strokeStyle = def.accent; c.stroke();
      c.fillStyle = def.accent; c.strokeStyle = '#fff'; c.lineWidth = 1.2;
      var sx0 = x + r * 0.72, sy0 = y - r * 0.92, q = r * 0.3;
      c.beginPath(); c.moveTo(sx0, sy0 - q); c.lineTo(sx0 + q * 0.3, sy0 - q * 0.3); c.lineTo(sx0 + q, sy0); c.lineTo(sx0 + q * 0.3, sy0 + q * 0.3); c.lineTo(sx0, sy0 + q); c.lineTo(sx0 - q * 0.3, sy0 + q * 0.3); c.lineTo(sx0 - q, sy0); c.lineTo(sx0 - q * 0.3, sy0 - q * 0.3); c.closePath(); c.fill(); c.stroke();
    }
    if (id === 'tang' || id === 'wukong' || id === 'horse') {
      c.beginPath(); c.arc(x, y + r * (id === 'horse' && !human ? 0.3 : 0.18), r * 0.14, 0.1 * Math.PI, 0.9 * Math.PI); c.lineWidth = 1.4; c.strokeStyle = '#7a3b2b'; c.stroke();
    }
  }
  XY.drawHeroShape = drawHeroShape;

  /* ================= 世界绘制 ================= */
  function drawGround(c, G, ox, oy) {
    var v = G.view, W = C.WORLD_W, H = C.WORLD_H;
    var x0 = G.cam.x - v.w / 2, y0 = G.cam.y - v.h / 2, x1 = x0 + v.w, y1 = y0 + v.h;
    c.fillStyle = T.outside; c.fillRect(x0, y0, v.w, v.h);          // 地图外
    if (XY.drawTerrain) { XY.drawTerrain(c, G); if (XY.fork) XY.fork.drawWorld(c, G, G.t); }  /* v0.8.4：分岔路线的南线路面 / 封路牌（动态叠加层） */                       // v0.6：分块预渲染的浅色地形 + 西行道路（js/terrain.js）
    else {
    c.fillStyle = T.grass1; c.fillRect(0, 0, W, H);
    var ts = 160, ix0 = Math.max(0, Math.floor(x0 / ts)), ix1 = Math.min(W / ts - 1, Math.floor(x1 / ts));
    var iy0 = Math.max(0, Math.floor(y0 / ts)), iy1 = Math.min(H / ts - 1, Math.floor(y1 / ts));
    c.fillStyle = T.grass2;
    for (var iy = iy0; iy <= iy1; iy++) for (var ix = ix0; ix <= ix1; ix++) if ((ix + iy) & 1) c.fillRect(ix * ts, iy * ts, ts, ts);
    }
    var cp = G.camp;
    // 装饰
    if (!XY.drawTerrain && !decor) decor = buildDecor();
    for (var i = 0; !XY.drawTerrain && i < decor.length; i++) {
      var d = decor[i];
      if (d.x < x0 - 30 || d.x > x1 + 30 || d.y < y0 - 30 || d.y > y1 + 30) continue;
      if (d.t === 'tuft') {
        c.strokeStyle = '#a9c88a'; c.lineWidth = 2; c.beginPath();
        c.moveTo(d.x - 6 * d.s, d.y); c.lineTo(d.x - 3 * d.s, d.y - 9 * d.s); c.moveTo(d.x, d.y); c.lineTo(d.x, d.y - 11 * d.s); c.moveTo(d.x + 6 * d.s, d.y); c.lineTo(d.x + 3 * d.s, d.y - 9 * d.s); c.stroke();
      } else if (d.t === 'flower') {
        c.fillStyle = d.c < 0.5 ? '#f7b6c8' : '#fbe08a';
        for (var k = 0; k < 5; k++) { c.beginPath(); c.arc(d.x + Math.cos(k * 1.256) * 4 * d.s, d.y + Math.sin(k * 1.256) * 4 * d.s, 2.6 * d.s, 0, PI2); c.fill(); }
        c.fillStyle = '#fff6d6'; c.beginPath(); c.arc(d.x, d.y, 2.2 * d.s, 0, PI2); c.fill();
      } else if (d.t === 'rock') {
        c.fillStyle = '#c9c6b8'; c.strokeStyle = '#a9a595'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(d.x, d.y, 16 * d.s, 10 * d.s, 0, 0, PI2); c.fill(); c.stroke();
      } else {
        c.fillStyle = '#b9d79c'; c.strokeStyle = '#97bb78'; c.lineWidth = 1.5;
        c.beginPath(); c.arc(d.x, d.y, 15 * d.s, 0, PI2); c.arc(d.x + 14 * d.s, d.y + 4, 11 * d.s, 0, PI2); c.fill(); c.stroke();
      }
    }
    // 地图边界
    if (!XY.drawTerrain) { c.lineWidth = 6; c.strokeStyle = '#a8bd8e'; c.strokeRect(0, 0, W, H); }
  }

  function drawRestStall(c, x, y, rt) {
    var INK = (XY.INKP && XY.INKP.INK) || '42,32,22';
    c.save();
    c.translate(x, y); c.scale(1.5, 1.5); c.translate(-x, -y);
    c.strokeStyle = 'rgba(' + INK + ',0.32)';
    c.lineWidth = 1.3;
    c.translate(x, y); c.scale(1.55, 1.55); c.translate(-x, -y);
    c.strokeStyle = 'rgba(' + INK + ',0.88)';
    c.lineWidth = 2.2; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x - 30, y + 22); c.lineTo(x - 24, y - 6);
    c.moveTo(x + 30, y + 22); c.lineTo(x + 24, y - 6);
    c.stroke();
    c.fillStyle = 'rgba(48,36,24,0.9)';
    c.beginPath();
    c.moveTo(x - 44, y - 2);
    c.quadraticCurveTo(x - 10, y - 30, x + 2, y - 20);
    c.quadraticCurveTo(x + 14, y - 32, x + 46, y);
    c.quadraticCurveTo(x + 4, y - 8, x - 44, y - 2);
    c.fill();
    c.strokeStyle = 'rgba(120,90,60,0.45)';
    c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x - 36, y); c.quadraticCurveTo(x, y - 16, x + 36, y + 2); c.stroke();
    var wave = Math.sin(rt * 2.1) * 2.2;
    c.strokeStyle = 'rgba(' + INK + ',0.8)';
    c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x + 34, y - 4); c.lineTo(x + 34, y + 28); c.stroke();
    c.fillStyle = '#a83224';
    c.beginPath();
    c.moveTo(x + 34, y - 2);
    c.lineTo(x + 54, y + 4 + wave);
    c.lineTo(x + 50, y + 18 + wave * 0.4);
    c.lineTo(x + 34, y + 14);
    c.closePath(); c.fill();
    c.fillStyle = '#f6efe2';
    c.font = '12px "Ma Shan Zheng","KaiTi",serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('歇', x + 43, y + 8);
    c.restore();
  }
  function drawCamp(c, G, rt) {
    if (G.villain) return XY.villainUI.drawCave(c, G, rt);
    if (G.lair && XY.lairUI) XY.lairUI.drawWorld(c, G, rt);                 // v0.9 洞府验关：路径 / 岩石 / 陷阱 / 塔的弹                 // v0.9 反派关：营地 = 洞府阵眼（看不见的唐僧）
    var cp = G.camp, x = cp.x, y = cp.y;
    var tg = G.heroes[0];
    // 驻守圈：唐僧命令是“驻守营地”时画出虚线圈；真正驻守生效时整个营地发金光
    if (!cp.active) return;
    // 营地圈：妖怪闯进来才画一圈飞白墨弧，不再用红虚线和粉橙光
    var zp = 0.5 + 0.5 * Math.sin(rt * 6);
    if (G.breach) {
      var zg = c.createRadialGradient(x, y, 24, x, y, C.CAMP_ZONE_R);
      zg.addColorStop(0, 'rgba(28,22,16,0)'); zg.addColorStop(1, 'rgba(28,22,16,' + (0.08 + 0.05 * zp) + ')');
      c.fillStyle = zg; c.beginPath(); c.arc(x, y, C.CAMP_ZONE_R, 0, PI2); c.fill();
      c.lineWidth = 1.8; c.strokeStyle = 'rgba(28,22,16,' + (0.42 + 0.18 * zp) + ')';
      c.beginPath(); c.arc(x, y, C.CAMP_ZONE_R, 0.15, 1.35); c.stroke();
      c.beginPath(); c.arc(x, y, C.CAMP_ZONE_R, 1.9, 3.35); c.stroke();
      c.beginPath(); c.arc(x, y, C.CAMP_ZONE_R, 4.05, 5.65); c.stroke();
      c.strokeStyle = 'rgba(90,82,70,0.35)'; c.lineWidth = 1;
      c.beginPath(); c.arc(x, y, C.CAMP_ZONE_R * 0.84, 0.7, 2.15); c.stroke();
    }                                                                  // v0.6：平时不再画虚线营地圈（只有被攻破时才画红色警戒圈）
    if (cp.ward && XY.R4 && XY.R4.drawWard) XY.R4.drawWard(c, cp.ward, x + 56, y - 34, 12, rt);   // v0.8.3：定海神珠的营地水珠
    // 经书（卷轴）
    c.fillStyle = '#fffdf2'; c.strokeStyle = '#8a5a2b'; c.lineWidth = 2; rrect(c, x - 14, y - 4, 28, 20, 4); c.fill(); c.stroke();
    c.strokeStyle = '#c0392b'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 8, y + 3); c.lineTo(x + 8, y + 3); c.moveTo(x - 8, y + 9); c.lineTo(x + 8, y + 9); c.stroke();
    // 旗子
    c.strokeStyle = '#8a5a2b'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y - 46); c.lineTo(x, y - 74); c.stroke();
    c.fillStyle = '#e0533d'; c.beginPath(); c.moveTo(x, y - 74); c.lineTo(x + 24 + Math.sin(rt * 4) * 3, y - 68); c.lineTo(x, y - 60); c.fill();
    // 血条
    var f = cp.hp / cp.maxHp;
    bar(c, x - 50, y + 46, 100, 9, f, hpColor(f), 'rgba(255,255,255,0.8)');
    otxt(c, '营地', x, y + 132, 13, T.ink, 'center', true);
  }

  function drawTower(c, G, t, rt) {          // 名字沿用旧的，画的是天兵（人形士兵），不再是塔
    return XY.R4.soldier(c, G, t, rt);
  }

  /* ---------- 敌人 ---------- */
  // v0.5 性能：普通怪（小妖 / 石头怪 / 弓箭妖）预渲染成精灵图，一只 = 一次 drawImage（原来每只约 14 次绘图调用）
  var SPR = {}, SPR_Z = 2;
  function enemySprite(e, look, fl) {
    var r = Math.round(e.r * 2) / 2, k = e.type + '|' + r + '|' + look + '|' + (fl ? 1 : 0) + '|' + e.def.color, s = SPR[k];
    if (s) return s;
    var pad = Math.ceil(r * 1.6) + 6, sz = pad * 2, cv = document.createElement('canvas');
    cv.width = cv.height = sz * SPR_Z; var cc = cv.getContext('2d'); cc.scale(SPR_Z, SPR_Z); cc.lineJoin = 'round';
    var fake = { def: e.def, x: pad, y: pad, r: r, flash: fl ? 1 : 0, type: e.type, wob: 0, toCamp: false, th: { x: pad + look * 100, y: pad }, slowT: 0, burnT: 0, stunT: 0, hp: 1, maxHp: 1 };
    drawEnemyBase(cc, G0, fake, 0, true);
    s = SPR[k] = { cv: cv, pad: pad, sz: sz };
    return s;
  }
  var G0 = { camp: { x: 0, y: 0 } };
  function drawEnemy(c, G, e, rt) {
    if (e.dk) return;
    if (e.lt) return XY.lairUI.drawTower(c, G, e, rt);                    // v0.9 洞府塔
    if (e.fly) return;                                                   // v0.8.4 飞妖在空中层单独画（js/fly.js）
    if (e.def.etower) return XY.R4.etower(c, G, e, rt);
    if (!e.def.boss && !e.def.elite && (e.type === 'small' || e.type === 'tank' || e.type === 'ranged' || e.type === 'shield')) {
      var th = e.toCamp || !e.th ? G.camp : e.th, look = e.type === 'shield' && XY.v07b && XY.v07b.faceOf ? XY.v07b.faceOf(G, e) : (th.x > e.x ? 1 : -1);
      if (XY.MINK && XY.MINK.has(e.type)) {                       // v0.8.0：水墨工笔精灵，逐帧（待机 / 走路 4 帧 / 前摇 / 出招），不再烘成单张静态图
        XY.MINK.minion(c, G, e, rt, look); var tp = XY.MINK.top(e);
        if (e.slowT > 0 || e.burnT > 0 || e.stunT > 0 || (e.type !== 'small' && e.hp < e.maxHp)) drawEnemyStatus(c, e, tp);
        if (e.type === 'shield') XY.v07b.drawGuardTag(c, G, e, rt);
        if (!G._lod && e.elem) { c.fillStyle = XY.ELEMS[e.elem] ? XY.ELEMS[e.elem].color : '#999'; var ex1 = e.x - e.r - 2, ey1 = e.y - tp * 0.9; c.beginPath(); c.moveTo(ex1, ey1 - 4); c.lineTo(ex1 + 3.6, ey1); c.lineTo(ex1, ey1 + 4); c.lineTo(ex1 - 3.6, ey1); c.closePath(); c.fill(); }
        return;
      }
      if (XY.MINK_DATA && XY.MINK_DATA[e.type]) { if (e.slowT > 0 || e.burnT > 0 || e.stunT > 0 || (e.type !== 'small' && e.hp < e.maxHp)) drawEnemyStatus(c, e, e.r * 1.6); return; }
      var sp = enemySprite(e, look, e.flash > 0), bob = Math.sin(rt * 8 + e.wob) * 1.2;
      if (!G._lod && XY.anim && !(e.stunT > 0)) {                  // 走路挤压（以脚底为轴；可见怪 > 120 时关掉，只留上下晃）
        var sq2 = XY.anim.squash(true, rt, e.wob || 0), fy = e.y + e.r * 0.8;
        c.save(); c.translate(e.x, fy); c.scale(sq2[0], sq2[1]); c.translate(-e.x, -fy); c.drawImage(sp.cv, e.x - sp.pad, e.y - sp.pad + bob, sp.sz, sp.sz); c.restore();
      } else c.drawImage(sp.cv, e.x - sp.pad, e.y - sp.pad + bob, sp.sz, sp.sz);
      if (e.slowT > 0 || e.burnT > 0 || e.stunT > 0 || (e.type !== 'small' && e.hp < e.maxHp)) drawEnemyStatus(c, e);
      if (e.type === 'shield') XY.v07b.drawGuardTag(c, G, e, rt);
      if (!G._lod && e.elem) { c.fillStyle = XY.ELEMS[e.elem] ? XY.ELEMS[e.elem].color : '#999'; var ex0 = e.x - e.r - 2, ey0 = e.y - e.r - 2; c.beginPath(); c.moveTo(ex0, ey0 - 4); c.lineTo(ex0 + 3.6, ey0); c.lineTo(ex0, ey0 + 4); c.lineTo(ex0 - 3.6, ey0); c.closePath(); c.fill(); }
      return;
    }
    drawEnemyBase(c, G, e, rt);
    XY.R4.enemyOver(c, G, e, rt);
    if (e.affix) XY.affixDraw(c, G, e, rt);
  }
  function drawEnemyStatus(c, e, tp) {                          // tp：水墨精灵头顶距中心的像素（没有就用旧的 r*1.6）
    var x = e.x, y = e.y, r = e.r;
    drawEnemyStatus2(c, e, tp || r * 1.6);
    if (e.type !== 'small' && e.hp < e.maxHp) { var bw = r * 2; bar(c, x - bw / 2, y - (tp ? tp + 7 : r + 11), bw, 5, e.hp / e.maxHp, '#e0533d', 'rgba(255,255,255,0.85)'); }
  }
  // 状态标记（不再画圆圈）：减速 = 脚下淡蓝椭圆；灼烧 = 小火苗；眩晕 = 星星
  function drawEnemyStatus2(c, e, top) {
    var x = e.x, y = e.y, r = e.r;
    if (e.slowT > 0) { c.strokeStyle = 'rgba(42,32,22,0.35)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(x, y + r * 0.85, r * 0.7, r * 0.22, 0, 0, PI2); c.stroke(); }
    if (e.burnT > 0) { c.fillStyle = '#a83224'; c.beginPath(); c.moveTo(x + r * 0.4, y - top * 0.55); c.quadraticCurveTo(x + r * 0.4 + 6, y - top * 0.55 - 8, x + r * 0.4, y - top * 0.55 - 14); c.quadraticCurveTo(x + r * 0.4 - 6, y - top * 0.55 - 6, x + r * 0.4, y - top * 0.55); c.fill(); }
    if (e.stunT > 0) otxt(c, '★ ★', x, y - top - 4, 12, '#e0a415', 'center', true);
  }
  function drawEnemyBase(c, G, e, rt, baked) {
    var d = e.def, x = e.x, y = e.y, r = e.r, fl = e.flash > 0;
    var th = e.toCamp || !e.th ? G.camp : e.th, look = th.x > x ? 1 : -1;
    var bob = baked ? 0 : Math.sin(rt * 8 + e.wob) * 1.2;
    if (XY.MA) {                                               // v0.6.4：不再用圆圈——BOSS / 精英 / 小怪都是有轮廓的造型
      if (d.denBoss && XY.MINK && XY.MINK.bfBoss && XY.MINK.bfBoss(c, e, rt)) { var btop = e.r * 2.7; drawEnemyStatus2(c, e, btop); if (e.hp < e.maxHp) bar(c, x - r, y - btop - 4, r * 2, 5, e.hp / e.maxHp, '#e0533d', 'rgba(255,255,255,0.85)'); return; }
      if (d.denBoss && XY.MINK && XY.MINK.boss && XY.MINK.boss(c, G, e, rt)) { drawEnemyStatus2(c, e, XY.MINK.top(e)); if (e.hp < e.maxHp) bar(c, x - r, y - XY.MINK.top(e) - 6, r * 2, 5, e.hp / e.maxHp, '#e0533d', 'rgba(255,255,255,0.85)'); return; }
      if (d.denBoss && ((e.type === 'boss') || (XY.MINK && XY.MINK.denPose && XY.MINK.denPose(e.type)) || (XY.MINK_DATA && XY.MINK_DATA[e.type]))) { drawEnemyStatus2(c, e, e.r * 2.2); return; }
      if (d.denBoss && XY.MA.hasFigure(e)) { XY.MA.boss(c, G, e, rt); drawEnemyStatus2(c, e, XY.MA.topOf(e)); return; }
      if (d.elite && !d.boss && XY.MINK && XY.MINK.elite && XY.MINK.elite(c, G, e, rt)) { var etp0 = XY.MINK.top(e); drawEnemyStatus2(c, e, etp0 + r * 0.1); bar(c, x - r, y - etp0 - 6, r * 2, 5, e.hp / e.maxHp, '#e0533d', 'rgba(255,255,255,0.85)'); return; }
      if (d.elite && !d.boss && XY.MINK_DATA && XY.MINK_DATA.elite) { drawEnemyStatus2(c, e, r * 2.1); bar(c, x - r, y - r * 2.2, r * 2, 5, e.hp / e.maxHp, '#e0533d', 'rgba(255,255,255,0.85)'); return; }
      if (d.elite && !d.boss) { XY.MA.elite(c, G, e, rt); var etp = r * 2.1; drawEnemyStatus2(c, e, etp + r * 0.1); if (e.hp < e.maxHp || true) bar(c, x - r, y - etp - 6, r * 2, 5, e.hp / e.maxHp, '#e0533d', 'rgba(255,255,255,0.85)'); return; }
      if (e.type === 'small' || e.type === 'tank' || e.type === 'ranged' || e.type === 'shield') {
        c.fillStyle = 'rgba(70,50,30,0.16)'; c.beginPath(); c.ellipse(x, y + r * 0.8, r * 0.9, r * 0.35, 0, 0, PI2); c.fill();
        XY.MA.minion(c, e, look, fl); if (baked) return; drawEnemyStatus2(c, e, r * 1.6); return;
      }
    }
    c.fillStyle = 'rgba(70,50,30,0.16)'; c.beginPath(); c.ellipse(x, y + r * 0.8, r * 0.9, r * 0.35, 0, 0, PI2); c.fill();
    c.lineWidth = d.boss ? 4 : 2; c.strokeStyle = d.dark;
    c.fillStyle = fl ? '#ffffff' : d.color;
    var ey = y - r * 0.15 + bob;
    if (e.type === 'small') {
      c.beginPath(); c.arc(x, y + bob, r, 0, PI2); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(x - r * 0.7, y - r * 0.5 + bob); c.lineTo(x - r * 0.45, y - r * 1.3 + bob); c.lineTo(x - r * 0.1, y - r * 0.8 + bob);
      c.moveTo(x + r * 0.7, y - r * 0.5 + bob); c.lineTo(x + r * 0.45, y - r * 1.3 + bob); c.lineTo(x + r * 0.1, y - r * 0.8 + bob); c.fill(); c.stroke();
    } else if (e.type === 'tank') {
      rrect(c, x - r, y - r * 0.9 + bob * 0.5, r * 2, r * 1.8, r * 0.45); c.fill(); c.stroke();
      c.strokeStyle = d.dark; c.lineWidth = 2; c.beginPath(); c.moveTo(x - r * 0.7, y + r * 0.4); c.lineTo(x + r * 0.7, y + r * 0.4); c.stroke();
    } else if (e.type === 'ranged') {
      c.beginPath(); c.arc(x, y + bob, r, 0, PI2); c.fill(); c.stroke();
      c.strokeStyle = '#6b4a22'; c.lineWidth = 2.5; c.beginPath(); c.arc(x + look * r * 0.9, y + bob, r * 0.9, -1.1, 1.1, look < 0); c.stroke();
    } else {                                                 // 精英 / Boss：带角
      if (d.elite) { c.strokeStyle = 'rgba(217,83,79,' + (0.35 + 0.25 * Math.sin(rt * 6)) + ')'; c.lineWidth = 5; c.beginPath(); c.arc(x, y, r + 7, 0, PI2); c.stroke(); c.strokeStyle = d.dark; c.lineWidth = 3; }
      c.beginPath(); c.arc(x, y + bob, r, 0, PI2); c.fill(); c.stroke();
      c.fillStyle = fl ? '#fff' : '#f3ead2';
      [-1, 1].forEach(function (s) {
        c.beginPath(); c.moveTo(x + s * r * 0.45, y - r * 0.7); c.quadraticCurveTo(x + s * r * 1.3, y - r * 0.8, x + s * r * 1.15, y - r * 1.5); c.quadraticCurveTo(x + s * r * 0.8, y - r * 0.95, x + s * r * 0.2, y - r * 0.85); c.fill(); c.stroke();
      });
      if (d.boss) {                                          // 鼻环
        c.strokeStyle = '#f0b429'; c.lineWidth = 3; c.beginPath(); c.arc(x, y + r * 0.45, r * 0.18, 0, PI2); c.stroke();
      }
    }
    // 眼睛
    var es = r * (e.type === 'small' ? 0.32 : 0.26);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x - r * 0.33, ey, es, 0, PI2); c.arc(x + r * 0.33, ey, es, 0, PI2); c.fill();
    c.fillStyle = d.boss || d.elite ? '#c0392b' : '#2b2118';
    c.beginPath(); c.arc(x - r * 0.33 + look * es * 0.35, ey, es * 0.5, 0, PI2); c.arc(x + r * 0.33 + look * es * 0.35, ey, es * 0.5, 0, PI2); c.fill();
    if (baked) return;
    // 状态
    if (e.slowT > 0) { c.strokeStyle = 'rgba(42,32,22,0.4)'; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y + r * 0.7, r * 0.55, 0.3, 2.4); c.stroke(); }
    if (e.burnT > 0) { c.fillStyle = '#a83224'; c.beginPath(); c.arc(x + r * 0.5, y - r - 4, 3.5, 0, PI2); c.fill(); }
    if (e.stunT > 0) otxt(c, '★ ★', x, y - r - 12, 12, '#e0a415', 'center', true);
    // 血条（受伤后或强敌）
    if (e.type !== 'small' && (e.hp < e.maxHp || d.elite) && !d.boss) {
      var bw = r * 2; bar(c, x - bw / 2, y - r - 11, bw, 5, e.hp / e.maxHp, '#e0533d', 'rgba(255,255,255,0.85)');
    }
  }

  /* ---------- 英雄 ---------- */
  var cloudNow = false;
    /* 沙僧骷髅念珠：深墨珠串、枯笔飞白描边、浓淡墨小骷髅。不是白圆片，也没有彩色光晕。 */
  function drawInkBeads(c, x, y, n, R, br, orbit) {
    var INK = (XY.INKP && XY.INKP.INK) || '24,20,16', i, a, bx, by, a2, x2, y2, vis, inkA;
    c.save(); c.lineCap = 'round';
    for (i = 0; i < n; i++) {
      a = orbit + i / n * PI2; a2 = orbit + (i + 0.7) / n * PI2;
      bx = x + Math.cos(a) * R; by = y + Math.sin(a) * R; x2 = x + Math.cos(a2) * R; y2 = y + Math.sin(a2) * R;
      if (XY.INKP) XY.INKP.stroke(c, bx, by, x2, y2, 1.6, INK, 0.85, i * 13 + 1, 0.2);
    }
    for (i = 0; i < n; i++) {
      a = orbit + i / n * PI2; bx = x + Math.cos(a) * R; by = y + Math.sin(a) * R;
      vis = Math.max(br * 1.35, 17); inkA = 0.72 + (i % 3) * 0.1;
      c.save(); c.translate(bx, by); c.rotate(i * 0.4);
      c.strokeStyle = 'rgba(' + INK + ',' + inkA + ')'; c.lineWidth = 2.4;
      c.beginPath(); c.arc(0, 0, vis * 0.78, 0.55, 6.0); c.stroke();
      c.lineWidth = 1.3; c.globalAlpha = 0.55; c.beginPath(); c.arc(vis * 0.06, vis * 0.04, vis * 0.7, 1.1, 2.6); c.stroke();
      c.globalAlpha = 1; c.lineWidth = 1.8; c.beginPath(); c.arc(0, vis * 0.18, vis * 0.55, 0.35, 2.8); c.stroke();
      c.fillStyle = 'rgba(' + INK + ',' + inkA + ')';
      c.beginPath(); c.arc(-vis * 0.22, -vis * 0.02, vis * 0.13, 0, PI2); c.arc(vis * 0.24, -vis * 0.02, vis * 0.12, 0, PI2); c.fill();
      c.beginPath(); c.moveTo(0, vis * 0.1); c.lineTo(-vis * 0.08, vis * 0.28); c.lineTo(vis * 0.08, vis * 0.28); c.closePath(); c.fill();
      c.restore();
    }
    c.lineCap = 'butt'; c.restore();
  }

  function drawHero(c, G, h, rt) {                                  // v0.8.0 腾云：不在路上的角色脚踏水墨云、不迈步（js/cloudride.js）；只在路上才播走路动画
    if (h.ridden || h.down || G._quietShot || !(XY.cloud && XY.cloud.on(G, h))) return drawHero0(c, G, h, rt);
    var mv = h.moving; cloudNow = true; h.moving = false;
    try { drawHero0(c, G, h, rt, mv); } finally { h.moving = mv; cloudNow = false; }
  }
  function drawHero0(c, G, h, rt, cloudMv) {
    if (G.villain && h.id === 'tang') return;                 // v0.9 反派关：唐僧是看不见的阵眼
    if (h.id === 'niumo') return XY.villainUI.drawNiumo(c, G, h, rt);
    if (h.ridden) return;                                       // 白龙马正被骑：和骑手一起画在骑手那里
    var d = h.def, x = h.x, y = h.y, r = d.r, isC = G.ctrl === h.i;
    var resting = h.id === 'tang' && G.tang && G.tang.phase === 'rest';
    if (resting) y += r * 0.55;
    var bob = resting ? 0 : (h.moving ? Math.sin(rt * 14 + h.bob) * 2 : Math.sin(rt * 3 + h.bob) * 1);
    var cl = cloudNow, lift = 0;                                                      // 腾云：整个人抬高 9~12px 并轻轻上下浮（只改画的位置，不改 h.x / h.y）
    if (cl) { lift = 10 + 2.5 * Math.sin(rt * 2.2 + (h.bob || 0)); y -= lift; }
    // 唐僧佛光
    if (h.id === 'tang' && !h.down && !G._quietShot && isC) {
      var ar = h.auraR || 125;
      c.strokeStyle = 'rgba(42,32,22,0.28)'; c.lineWidth = 1.2;
      c.beginPath(); c.arc(x, y, ar, 0.35, 2.1); c.stroke();
      c.beginPath(); c.arc(x, y, ar, 3.4, 5.5); c.stroke();
    }
    // 流沙河、操控标记
    if (cl) {
      var mn0 = h.mounted ? G.heroes[4] : null, fo = mn0 ? r * 0.55 + mn0.def.r * 1.25 * 0.85 : r * 0.85;
      c.fillStyle = 'rgba(70,50,30,0.1)'; c.beginPath(); c.ellipse(x, y + lift + fo + 4, r * 1.3, r * 0.4, 0, 0, PI2); c.fill();   // 地面上一圈很淡的影
      XY.cloud.draw(c, h, x, y + fo + 3, r * (mn0 ? 1.25 : 1), rt, cloudMv);
    } else if (false) {}
    if (false && isC) {}
    if (h.down && !(XY.MINK && XY.MINK.poseOwns && XY.MINK.poseOwns(h))) {                                            // 有倒地立绘的角色留在下面画 ko；其余仍是墓碑
      c.fillStyle = 'rgba(70,50,30,0.15)'; c.beginPath(); c.ellipse(x, y + 12, 18, 6, 0, 0, PI2); c.fill();
      c.fillStyle = '#d6d3cb'; c.strokeStyle = '#8f8b80'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x - 13, y + 12); c.lineTo(x - 13, y - 8); c.arc(x, y - 8, 13, Math.PI, 0); c.lineTo(x + 13, y + 12); c.closePath(); c.fill(); c.stroke();
      txt(c, '阵亡', x, y - 2, 12, '#a33a2a', 'center', true);
      otxt(c, d.name, x, y - 32, 12, '#8a8578', 'center', true);
      return;
    }
    // 沙僧念珠改到人物画完再画，避免被身体挡住
    var mnt = h.mounted ? G.heroes[4] : null, ry = 0;
    if (mnt) {                                                  // 骑乘：脚下是白龙马（跑动时有速度线和尘土），骑手抬高一点
      var hsOK = XY.chibi && XY.chibi.ready(mnt); ry = hsOK ? -r * 1.05 : -r * 0.55; var mr = mnt.def.r * 1.25, my = y + bob * 0.5 + r * 0.55;
      if (h.moving) { c.save(); c.strokeStyle = 'rgba(111,207,216,0.55)'; c.lineWidth = 3; c.lineCap = 'round'; var fa = h.face + Math.PI; for (var sl = 0; sl < 4; sl++) { var so = (sl - 1.5) * 9, sx0 = x + Math.cos(fa) * (r + 6) - Math.sin(fa) * so, sy0 = my + Math.sin(fa) * (r + 6) + Math.cos(fa) * so; c.beginPath(); c.moveTo(sx0, sy0); c.lineTo(sx0 + Math.cos(fa) * (22 + 8 * Math.sin(rt * 20 + sl)), sy0 + Math.sin(fa) * (22 + 8 * Math.sin(rt * 20 + sl))); c.stroke(); } c.restore(); for (var dp = 0; dp < 3; dp++) { var dph = (rt * 3 + dp / 3) % 1; c.fillStyle = 'rgba(190,170,130,' + (0.45 * (1 - dph)) + ')'; c.beginPath(); c.arc(x - Math.cos(h.face) * (8 + dph * 26) + (dp - 1) * 6, my + r * 0.7 - dph * 6, 3 + dph * 5, 0, PI2); c.fill(); } }
      var horsePose = false;
      if (XY.MINK && XY.MINK.poseHero) { var mf0 = mnt.face, mm0 = mnt.moving, mhu0 = mnt.hurtT; mnt.face = h.face; mnt.moving = h.moving; mnt.hurtT = 0; horsePose = XY.MINK.poseHero(c, mnt, rt, x, my, mr); mnt.face = mf0; mnt.moving = mm0; mnt.hurtT = mhu0; }
      if (!horsePose && hsOK) { var mf = mnt.face, mm = mnt.moving, mhu = mnt.hurtT; mnt.face = h.face; mnt.moving = h.moving; mnt.hurtT = 0; XY.chibi.draw(c, G, mnt, rt, x, my, mr); mnt.face = mf; mnt.moving = mm; mnt.hurtT = mhu; }
      else if (!horsePose && !(XY.CHIBI_INK && XY.CHIBI_INK.horse) && !(XY.CHIBI && XY.CHIBI.horse) && !(XY.MINK && XY.MINK.poseOwns && XY.MINK.poseOwns(mnt))) drawHeroShape(c, mnt.def, x, my, mr);
    }
    var rr = r * (h.xf > 0 ? 1.25 : 1);
    if (h.id === 'phyrex') { if (!(G.td && G.td.quiet > G.td.clock) && !G._quietShot) XY.phDrawHeroUnder(c, G, h, x, y + bob, r, rt); XY.R4.xfDraw = h.xf > 0; }
    if (h._lx != null && Math.abs(h.x - h._lx) + Math.abs(h.y - h._ly) > 0.35 && !(XY.cloud && XY.cloud.on && XY.cloud.on(G, h))) h.moving = true;
    h._lx = h.x; h._ly = h.y;
    var posed = !!(XY.MINK && XY.MINK.poseHero && XY.MINK.poseHero(c, h, rt, x, y + bob + ry, rr));
    var useCb = !posed && !(h.id === 'horse' && d.form === 'human') && XY.chibi && XY.chibi.ready(h);
    var tall = useCb || posed, tr = tall ? rr * 2.85 - ry : r;
    var drewBody = false;
    if (!posed && useCb) drewBody = XY.chibi.draw(c, G, h, rt, x, y + ry, rr) !== false;
    if (h.id === 'wujing' && h.beads) drawInkBeads(c, x, y + ry, h.beads, h.beadR, h.beadSize, h.orbit);
    if (!drewBody && !posed && !((XY.chibiKey && XY.CHIBI && XY.CHIBI[XY.chibiKey(h)]) || (XY.CHIBI_INK && XY.CHIBI_INK[h.id]) || (h.def && h.def.xid) || (XY.chibi && XY.chibi.useWild && XY.chibi.useWild(h)))) {
      var sq = XY.anim ? XY.anim.squash(h.moving, rt, h.bob || 0) : null;          // 待机呼吸 / 走路挤压（以脚底为轴）
      if (sq) { c.save(); c.translate(x, y + r * 0.85); c.scale(sq[0], sq[1]); c.translate(-x, -(y + r * 0.85)); }
      drawHeroShape(c, d, x, y + bob + ry, rr);
      if (sq) c.restore();
    }
    if (h.id === 'phyrex') { XY.R4.xfDraw = false; if (!(G.td && G.td.quiet > G.td.clock) && !G._quietShot) XY.phDrawHeroOver(c, G, h, x, y + bob - (useCb ? r * 0.5 : 0), r, rt); }
    if (h.hurtT > 0 && !useCb && !posed) { c.fillStyle = 'rgba(255,60,40,' + (h.hurtT * 2) + ')'; c.beginPath(); c.arc(x, y + bob, r, 0, PI2); c.fill(); }
    var nearCamp = !!(G.camp && Math.abs(x - G.camp.x) < 170 && Math.abs(y - G.camp.y) < 150);
    if (h.inv > 0 && !nearCamp) { c.strokeStyle = 'rgba(42,32,22,0.28)'; c.lineWidth = 1.3; c.beginPath(); c.ellipse(x, y + r * 0.85, r + 8, r * 0.38, 0, 0, PI2); c.stroke(); }
    if (G._quietShot) return;
    // 血条
    var bw = 44, f = h.hp / h.maxHp;
    if (h.id === 'tang') { c.save(); c.font = '13px "Ma Shan Zheng","KaiTi",serif'; c.fillStyle = '#5c4030'; c.textAlign = 'center'; c.fillText('仅一血', x, y - r - 8); c.restore(); }
    else bar(c, x - bw / 2, y + r + 5, bw, 6, f, hpColor(f), 'rgba(255,255,255,0.85)');
    // 命令标签：手动 / 自动命令（唐僧驻守生效时写明“只回血”）
    var lab = isC ? '手动' : (nearCamp && h.id !== 'tang' ? '' : (h.id === 'tang' && (G.station || (G.tang && G.tang.phase === 'rest')) ? '驻守·回血' : (XY.ORDER_SHORT[h.order] || '')));
    if (lab && G.heroes.length < 9 && !(G.td && G.td.quiet > G.td.clock)) {
      var seen = XY.R4._orderSeen || (XY.R4._orderSeen = []);
      var dup = false, si;
      for (si = 0; si < seen.length; si++) if (seen[si].s === lab && Math.abs(seen[si].x - x) < 86 && Math.abs(seen[si].y - y) < 42) dup = true;
      if (!dup) {
        var nearCamp = G.camp && Math.abs(x - G.camp.x) < 120 && Math.abs(y - G.camp.y) < 120;
        var lx = nearCamp ? x + r + 46 : x, ly = nearCamp ? y - r - 6 : y + r + 28;
        seen.push({ s: lab, x: lx, y: ly });
        inkTag(c, lab, lx, XY.R4.placeLabel(c, lab, lx, ly, 15, nearCamp ? -1 : 1), 15, isC ? '#a42d19' : '#24180f');
      }
    }
    var clash = XY.R4.labelClash(G, x - 50, y + lift - tr - 54, 100, 52);          // v0.7：头顶标签碰到 BOSS 的名牌 / 血条区域 → 名字等挪到脚下
    // 唐僧血量低：红圈 + 感叹号
    if (h.id === 'tang' && (G.tdanger || G.breach) && !(G.td && G.td.quiet > G.td.clock)) {
      otxt(c, G.breach ? '妖怪进营地了！' : '师傅危险！', x, clash ? y + r + 46 : y - tr - 42, 14, '#d62828', 'center', true);
    }
    if (h.id === 'tang' && h.inv > 0 && !nearCamp && G.t < C.TANG_START_INV + 0.5 && !(G.td && G.td.quiet > G.td.clock)) {
      var invLab = '开局保护 ' + Math.ceil(h.inv) + ' 秒'; otxt(c, invLab, x, clash ? y + r + 46 : XY.R4.placeLabel(c, invLab, x, y - tr - 58, 12, -1), 12, '#a8700a', 'center', true);
    }
    // 名字（操控中的更醒目，头顶带小三角）
    // v0.8.1：名牌延后到所有英雄画完再画（flushHeroNames），避开其他角色的身体 / 血条 / 命令标签和别的名牌，也不会被后画的角色盖住
    heroBodies.push({ h: h, x0: x - Math.max(rr * 1.15, tall ? 30 : 0), x1: x + Math.max(rr * 1.15, tall ? 30 : 0), y0: Math.min(y - (tall ? tr : r) - 2, h._wildTop == null ? 1e9 : h._wildTop), y1: y + r + 12 });
    var nameY = clash ? y + r + (h.sp ? 47 : 34) : y - tr - (isC ? 36 : 32); if (!clash && h._wildTop != null) nameY = Math.min(nameY, h._wildTop - (isC ? 34 : 30));
    if (!(G.td && G.td.quiet > G.td.clock)) heroNames.push({ h: h, s: d.name, x: x, y: nameY, sz: isC ? 18 : 16, col: isC ? '#a42d19' : '#24180f', dir: clash ? 1 : -1, mark: isC && !clash, a: c.globalAlpha, tri: Math.sin(rt * 6) * 2 });
  }
  var heroBodies = [], heroNames = [];
  var NMIMG = {};
  function nameArt(id) {
    if (Object.prototype.hasOwnProperty.call(NMIMG, id)) return NMIMG[id].ok ? NMIMG[id] : null;
    var rec = NMIMG[id] = { ok: false };
    var D = window.XY_MENU_STAGE, spec = D && D.name && D.name[id] && D.name[id].h;
    if (!spec || !spec.src) return null;
    var im = new Image();
    im.onload = function () { rec.im = im; rec.w = spec.w || im.naturalWidth; rec.h = spec.h || im.naturalHeight; rec.ok = !!(rec.w && rec.h); };
    im.src = spec.src;
    if (im.complete && im.naturalWidth) { rec.im = im; rec.w = spec.w || im.naturalWidth; rec.h = spec.h || im.naturalHeight; rec.ok = !!(rec.w && rec.h); return rec; }
    return null;
  }
  function plateSplit(im) {
    if (im._split) return im._split;
    var cv = document.createElement('canvas');
    cv.width = im.naturalWidth; cv.height = im.naturalHeight;
    var g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0);
    var w = cv.width, h = cv.height, data = g.getImageData(0, 0, w, h).data;
    var anyL = w, anyR = 0, sealL = w, sealR = -1, y, x, i;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      i = (y * w + x) * 4;
      if (data[i + 3] < 24) continue;
      if (x < anyL) anyL = x;
      if (x > anyR) anyR = x;
      if (data[i] > 150 && data[i] > data[i + 1] + 35 && data[i] > data[i + 2] + 35) {
        if (x < sealL) sealL = x;
        if (x > sealR) sealR = x;
      }
    }
    im._split = { w: w, h: h, anyL: anyL, anyR: anyR, sealL: sealR >= sealL ? sealL : null, sealR: sealR >= sealL ? sealR : null };
    return im._split;
  }
  function nameBox(c, n) {
    var id = n.h && n.h.id, art = id && nameArt(id);
    var lv = (n.h && n.h.sp && n.h.def) ? ('Lv' + n.h.def.lv) : '';
    var wz = XY._worldZoom || 1, fs = Math.max(n.sz || 14, 15) / wz;
    if (art) {
      XY.R4.nameArtN = (XY.R4.nameArtN || 0) + 1;
      var ih = Math.max(18 / wz, fs + 4 / wz), iw = ih * art.w / art.h;
      if (iw > 156) { iw = 156; ih = iw * art.h / art.w; }
      c.font = Math.max(13, ih * 0.62) + 'px "Ma Shan Zheng","KaiTi","STKaiti",serif';
      var lw = lv ? c.measureText(lv).width + 4 : 0;
      return { w: iw + lw + 2, h: ih + 2, art: art, ih: ih, iw: iw, lv: lv, fs: Math.max(13, ih * 0.62) };
    }
    c.font = fs + 'px "Ma Shan Zheng","KaiTi","STKaiti",serif';
    return { w: c.measureText(XY.fmtStr(n.s)).width + 6, h: fs + 3, art: null, fs: fs };
  }
  function paperMist(c, x, y, w, h) {
    var rx = Math.max(14, w * 0.82), ry = Math.max(11, h * 1.35);
    var g = c.createRadialGradient(x, y, Math.min(rx, ry) * 0.2, x, y, Math.max(rx, ry));
    g.addColorStop(0, 'rgba(246,239,226,0.97)');
    g.addColorStop(0.72, 'rgba(246,239,226,0.93)');
    g.addColorStop(1, 'rgba(243,234,214,0)');
    c.save();
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  function paintName(c, n, x, y, box, col) {
    var face = '"Ma Shan Zheng","KaiTi","STKaiti",serif';
    if (box.art) {
      c.save();
      c.shadowColor = 'rgba(255,250,240,0.9)';
      c.shadowBlur = 1.4;
      c.drawImage(box.art.im, x - box.w / 2, y - box.ih / 2, box.iw, box.ih);
      c.restore();
      if (box.lv) {
        c.font = box.fs + 'px ' + face;
        c.textAlign = 'left'; c.textBaseline = 'middle';
        c.fillStyle = col || '#24180f';
        c.fillText(box.lv, x - box.w / 2 + box.iw + 3, y + 1);
      }
      return;
    }
    c.save();
    c.font = box.fs + 'px ' + face;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    var s = XY.fmtStr(n.s);
    c.fillStyle = col || '#24180f';
    c.fillText(s, x, y);
    c.restore();
  }
  function flushHeroNames(c) {                                  // 名牌防叠：挤在一起超过三人时只留主控的名字；其余左右、上下错开
    var R4 = XY.R4, L = R4.lblList(), m = c.getTransform(), sc = m.a || 1, i, j, k, B = [], pile = [], ctrl = window.__xy && window.__xy.G ? window.__xy.G.ctrl : -1;
    for (i = 0; i < heroNames.length; i++) {
      var n0 = heroNames[i], near = 0;
      for (j = 0; j < heroNames.length; j++) if (Math.abs(heroNames[j].x - n0.x) < 80 && Math.abs(heroNames[j].y - n0.y) < 64) near++;
      if (near >= 4 && !(n0.h && n0.h.i === ctrl)) continue;
      pile.push(n0);
    }
    heroNames = pile;
    var narrow = false, appN = XY.app;
    if (appN) { var cssW = appN.lw * (appN.zoom || 1), cssH = appN.lh * (appN.zoom || 1); narrow = Math.min(cssW, cssH) < 520 || cssH < 420; }
    if (narrow) heroNames = heroNames.filter(function (n) { return n.h && (n.h.i === ctrl || n.h.id === 'tang'); });
    XY.R4.nameArtN = 0;
    XY.R4.plates = [];
    var placed = [];
    for (j = 0; j < heroBodies.length; j++) { var o = heroBodies[j]; B.push({ h: o.h, x0: m.e + o.x0 * sc, x1: m.e + o.x1 * sc, y0: m.f + o.y0 * sc, y1: m.f + o.y1 * sc }); }
    function ov(r, list, skipH) { var a = 0; for (var q = 0; q < list.length; q++) { var t = list[q]; if (skipH && t.h === skipH) continue; var w = Math.min(r.x1, t.x1) - Math.max(r.x0, t.x0), h = Math.min(r.y1, t.y1) - Math.max(r.y0, t.y0); if (w > 0 && h > 0) a += w * h; } return a; }
    XY.R4.bodyRects = B;
    if (XY.R4.planMapLabels && window.__xy && window.__xy.G && XY.app) XY.R4.planMapLabels(c, window.__xy.G, XY.app);
    for (i = 0; i < heroNames.length; i++) {
      var n = heroNames[i], box = nameBox(c, n), ownB = null, bj, nearD = 1e9;
      for (bj = 0; bj < heroBodies.length; bj++) {
        if (heroBodies[bj].h === n.h) ownB = heroBodies[bj];
        else if (n.h) nearD = Math.min(nearD, Math.abs(heroBodies[bj].h.x - n.h.x));
      }
      var zN = (XY.app && XY.app.zoom) || 1, cssW = XY.app ? XY.app.lw * zN : 0, cssH = XY.app ? XY.app.lh * zN : 0;
      var wideN = Math.min(cssW, cssH) >= 700, narrowN = cssH < 420 || Math.min(cssW, cssH) < 520;
      var wantIh = 0;
      if (box.ih && wideN) wantIh = 20 / zN;
      else if (box.ih && narrowN) wantIh = Math.min(box.ih, 16 / Math.max(0.5, zN));
      if (!(wideN || narrowN)) {
        var cap = Math.max(46, Math.min(box.w, nearD - 10));
        if (cap < box.w && box.w > 0) { var kk = cap / box.w; box.w *= kk; box.h *= kk; if (box.iw) box.iw *= kk; if (box.ih) box.ih *= kk; box.fs *= kk; }
      }
      if (wantIh && box.ih && Math.abs(box.ih - wantIh) > 0.15) {
        var fit = wantIh / box.ih;
        box.w *= fit; box.h *= fit; if (box.iw) box.iw *= fit; box.ih *= fit; box.fs *= fit;
      }
      var tw = box.w, th = box.h, best = null;
      var head = (n.h && n.h._drawBox) ? n.h._drawBox.y : (ownB ? ownB.y0 : n.y), nudge = Math.max(12, Math.min(th * 0.45, 22));
      var cy0 = head - th / 2 - Math.min(4, th * 0.2);
      var cand = [[0, 0], [-nudge, 0], [nudge, 0], [-nudge * 2, 0], [nudge * 2, 0], [-nudge * 3, 0], [nudge * 3, 0]];
      for (k = 0; k < cand.length; k++) {
        var cy = cy0 + cand[k][1], cx = n.x + cand[k][0], r = { x0: m.e + (cx - tw / 2) * sc, x1: m.e + (cx + tw / 2) * sc, y0: m.f + (cy - th / 2) * sc, y1: m.f + (cy + th / 2) * sc };
        var onBody = ov(r, B, n.h), onText = ov(r, L, null);
        var sc0 = onText * 8 + onBody * 24 + (Math.abs(cand[k][0]) * 0.6 + Math.abs(cand[k][1])) * 0.05 * sc;
        if (!best || sc0 < best.s) best = { s: sc0, x: cx, y: cy, r: r, body: onBody, text: onText };
      }
      if (ov(best.r, placed, null) > 0) continue;
      if ((best.body > 0 || best.text > 0) && !(n.h && (n.h.i === ctrl || n.h.id === 'tang'))) continue;
      placed.push(best.r);
      var plate = { id: n.h && n.h.id, box: best.r, glyph: best.r, seal: null, headGap: head - (best.y + th / 2), half: th * 0.5 };
      if (box.art && box.art.im && box.w) {
        var sp = plateSplit(box.art.im), span = best.r.x1 - best.r.x0, imgW = box.iw / box.w * span;
        function seg(x0, x1) { return { x0: best.r.x0 + x0 / sp.w * imgW, y0: best.r.y0, x1: best.r.x0 + x1 / sp.w * imgW, y1: best.r.y1 }; }
        plate.box = seg(sp.anyL, sp.anyR + 1);
        plate.glyph = seg(sp.anyL, (sp.sealL == null ? sp.anyR : sp.sealL) + (sp.sealL == null ? 1 : 0));
        if (sp.sealL != null) plate.seal = seg(sp.sealL, sp.sealR + 1);
      }
      (XY.R4.plates = XY.R4.plates || []).push(plate);
      L.push(best.r);
      c.save(); c.globalAlpha = n.a; paintName(c, n, best.x, best.y, box, n.col);
      if (n.mark && best.x === n.x && Math.abs(best.y - n.y) < th * 1.5) { var ty = best.y - 19; c.fillStyle = '#e0533d'; c.beginPath(); c.moveTo(best.x - 6, ty + n.tri); c.lineTo(best.x + 6, ty + n.tri); c.lineTo(best.x, ty + 8 + n.tri); c.fill(); }
      c.restore();
    }
    XY.R4.nameRects = placed;
    XY.R4.bodyRects = B;
    heroBodies.length = 0; heroNames.length = 0;
  }

  function R4rt() { return XY.R4.rt; }
  function teardrop(c, x, y, a, r) {                         // 弹丸：水滴 / 流星形（尖尾在后），不再是圆点
    var ca = Math.cos(a), sa = Math.sin(a), L = r * 2.1, W = r * 1.05;
    function P(u, v) { return [x + u * ca - v * sa, y + u * sa + v * ca]; }
    var t = P(-L, 0), a1 = P(-r * 0.2, -W * 1.15), a2 = P(r * 1.0, -W * 0.9), f = P(r * 1.05, 0), b1 = P(r * 1.0, W * 0.9), b2 = P(-r * 0.2, W * 1.15);
    c.beginPath(); c.moveTo(t[0], t[1]); c.bezierCurveTo(a1[0], a1[1], a2[0], a2[1], f[0], f[1]); c.bezierCurveTo(b1[0], b1[1], b2[0], b2[1], t[0], t[1]); c.closePath();
  }
  function drawProj(c, p) {                                    // v0.8：弹丸水墨化——墨尾 + 点缀色洇开的头，不再是白描边的发光球
    var k = p.kind, x = p.x, y = p.y, a = Math.atan2(p.vy, p.vx), IP = XY.INKP, INK = IP.INK, ca = Math.cos(a), sa = Math.sin(a), sd = (p.id || p.life * 97 || 0) | 0;
    function accOf(col) { return IP.mix(IP.rgb(col), 0.14); }
    if (k === 'btc') { XY.phDrawProj(c, p, R4rt()); return; }
    if (k === 'water') {
      var wc = accOf('#2aa6b8');
      IP.stroke(c, x, y, x - ca * 20, y - sa * 20, p.r * 1.0, wc, 0.55, sd + 1, 0.06); IP.stroke(c, x, y, x - ca * 16, y - sa * 16, p.r * 0.5, INK, 0.5, sd + 2, 0.06);
      IP.blot(c, x, y, p.r * 1.2, INK, 0.5, sd, 2, 0.75); IP.ring(c, x, y, p.r * 0.72, 1.15, wc, 0.65, sd + 3, 4, 1, a);
    } else if (k === 'ring') {
      var rc = accOf(p.magic ? '#4aa3d6' : '#e0642b'), rr = p.r + 4, rot = R4rt() * 9;
      c.fillStyle = 'rgba(' + rc + ',0.14)'; c.beginPath(); c.arc(x, y, rr, 0, PI2); c.fill();
      IP.ring(c, x, y, rr, 3.4, rc, 0.8, 7, 4, 1, rot); IP.ring(c, x, y, rr, 1.5, INK, 0.85, 11, 3, 1, rot + 1);
    } else if (k === 'sutra') {
      c.fillStyle = '#f7f1e2'; c.strokeStyle = 'rgba(' + INK + ',0.9)'; c.lineWidth = 1.5; c.save(); c.translate(x, y); c.rotate(a); rrect(c, -9, -5, 18, 10, 1); c.fill(); c.stroke();
      c.fillStyle = 'rgba(36,28,22,0.85)'; c.fillRect(-1.5, -3, 3, 6); c.restore();
    } else if (k === 'arrow') {
      IP.stroke(c, x + ca * 8, y + sa * 8, x - ca * 16, y - sa * 16, 2.4, INK, 0.9, sd + 3, 0.04);
    } else {
      var pc = p.col || '#ffb347', ac = accOf(pc);
      if (k === 'wave') {
        for (var wi = 0; wi < 2; wi++) { var o = wi * 10, wx = x - ca * o, wy = y - sa * o; IP.stroke(c, wx + Math.cos(a - 1) * p.r * 1.3, wy + Math.sin(a - 1) * p.r * 1.3, wx + Math.cos(a + 1) * p.r * 1.3, wy + Math.sin(a + 1) * p.r * 1.3, 4.2 - wi, ac, 0.8 - wi * 0.2, sd + 4 + wi, 0.3); }
        IP.stroke(c, x + Math.cos(a - 1) * p.r * 1.3, y + Math.sin(a - 1) * p.r * 1.3, x + Math.cos(a + 1) * p.r * 1.3, y + Math.sin(a + 1) * p.r * 1.3, 1.6, INK, 0.8, sd + 8, 0.3);
      } else {
        IP.stroke(c, x, y, x - ca * p.r * 2.6, y - sa * p.r * 2.6, p.r * 0.9, INK, 0.45, sd + 5, 0.05);
        c.fillStyle = pc; c.strokeStyle = 'rgba(' + INK + ',0.8)'; c.lineWidth = 1.5; teardrop(c, x, y, a, p.r); c.fill(); c.stroke();
      }
    }
    c.lineCap = 'butt';
  }

  function drawFx(c, G) {
    for (var i = 0; i < G.fx.length; i++) {
      var f = G.fx[i], k = f.t / f.max;
      if (XY.ultscene && XY.ultscene.hides && XY.ultscene.hides(G, f)) continue;   // v0.8：水墨大招期间，大招自带的通用冲击环 / 涟漪 / 横扫白条不画（画面由 ultink 负责）
      if (f.type === 'an') { if (XY.animDraw) XY.animDraw(c, f, k, G); } else if (f.type === 'vglyph' || f.type === 'vshield' || f.type === 'vslash') { if (XY.vfx) XY.vfx.drawFx(c, f, k); } else if (f.type === 'vsfx') { if (XY.SKILLFX) XY.SKILLFX.draw(c, f, k); } else if (f.type === 'btcSeal' || f.type === 'xform' || f.type === 'coinDrop') { XY.phDrawFx(c, f, k, G); } else if (f.type === 'elemBurst') {                    // 五行相克：该元素颜色的墨圈 + 向外甩的笔触 + 大号元素字
        var eb = f.r * (0.4 + 0.9 * Math.min(1, k * 1.5)), IPe = XY.INKP, eac = IPe.mix(IPe.rgb(f.color), 0.14), esd = ((f.x * 3 + f.y * 5) | 0) & 1023;
        IPe.blot(c, f.x, f.y, eb * 0.8, eac, (1 - k) * 0.2, esd, 0, 1);
        IPe.ring(c, f.x, f.y, eb, 5.5 * (1 - k) + 1.5, eac, (1 - k) * 0.75, esd, 5, 1, k); IPe.ring(c, f.x, f.y, eb, 2, IPe.INK, (1 - k) * 0.8, esd + 3, 4, 1, k + 0.5);
        IPe.splash(c, f.x, f.y, eb * 0.7, eb * 1.25, 8, 3, eac, (1 - k) * 0.85, esd + 7, 1);
        c.globalAlpha = Math.min(1, (1 - k) * 1.6); otxt(c, f.glyph, f.x, f.y - 4 - k * 14, 26 + 16 * (1 - k), f.color, 'center', true); c.globalAlpha = 1;
      } else if (f.type === 'ring') {
        var r = f.r * (0.25 + 0.75 * Math.min(1, k * 1.6));
        c.save(); c.globalAlpha = (1 - k) * 0.8; c.strokeStyle = 'rgba(42,32,22,0.82)'; c.lineWidth = Math.max(2, Math.min(5, r * 0.015)); c.lineCap = 'round';
        c.beginPath(); c.arc(f.x, f.y, r, 0.15, 1.35); c.stroke();
        c.beginPath(); c.arc(f.x, f.y, r, 2.2, 4.1); c.stroke();
        c.restore();
      } else if (f.type === 'chain' || f.type === 'bolt') {
        var IPc = XY.INKP, cac = IPc.mix(IPc.rgb(f.color || '#8fd0ff'), 0.14); c.lineJoin = 'round'; c.lineCap = 'round';
        var pts = f.pts || [];
        if (f.type === 'bolt' && f.x != null) pts = [{ x: f.x, y: f.y - 260 }, { x: f.x + 14, y: f.y - 130 }, { x: f.x - 12, y: f.y - 70 }, { x: f.x, y: f.y }];
        if (pts.length > 1) {                                           // 点缀色洇边 + 墨色折线（闪电 / 锁链，每帧略抖）
          c.beginPath(); c.moveTo(pts[0].x, pts[0].y);
          for (var q = 1; q < pts.length; q++) { var mx = (pts[q - 1].x + pts[q].x) / 2 + (Math.random() - 0.5) * 16, my = (pts[q - 1].y + pts[q].y) / 2 + (Math.random() - 0.5) * 16; c.lineTo(mx, my); c.lineTo(pts[q].x, pts[q].y); }
          c.globalAlpha = (1 - k) * 0.42; c.strokeStyle = 'rgb(' + cac + ')'; c.lineWidth = f.type === 'bolt' ? 11 : 7; c.stroke();
          c.globalAlpha = (1 - k) * 0.92; c.strokeStyle = 'rgb(' + IPc.INK + ')'; c.lineWidth = f.type === 'bolt' ? 3.2 : 2; c.stroke();
          if (f.type === 'bolt') IPc.blot(c, pts[pts.length - 1].x, pts[pts.length - 1].y, 16, cac, (1 - k) * 0.5, 17, 6, 0.6);
        }
        c.lineCap = 'butt'; c.globalAlpha = 1;
      } else if (f.type === 'sweep') {
        var sx = f.x + f.w * Math.min(1, k * 1.15), IPs = XY.INKP, sac = IPs.mix(IPs.rgb(f.color), 0.14);
        c.globalAlpha = (1 - k) * 0.22; c.fillStyle = 'rgb(' + sac + ')'; c.fillRect(f.x, f.y, sx - f.x, f.h); c.globalAlpha = 1;
        IPs.stroke(c, sx, f.y, sx - 6, f.y + f.h, 9, IPs.INK, (1 - k) * 0.85, ((f.y * 3) | 0) & 1023, 0.04);          // 横扫前沿：一笔竖着的浓墨
      } else if (f.type === 'arc') {
        var ox = f.owner ? f.owner.x : f.x, oy = f.owner ? f.owner.y : f.y;
        c.save(); c.lineCap = 'round'; c.translate(ox, oy); c.rotate(f.ang || 0);
        var span = f.arc >= PI2 - 0.01 ? 1.8 : f.arc, a0 = -span / 2, a1 = span / 2;
        c.globalAlpha = (1 - k) * 0.9; c.strokeStyle = 'rgba(36,28,18,0.82)'; c.lineWidth = Math.max(8, f.range * 0.045);
        c.beginPath(); c.arc(0, 0, f.range, a0, a1); c.stroke();
        c.globalAlpha = (1 - k) * 0.45; c.lineWidth = Math.max(3, f.range * 0.02);
        c.beginPath(); c.arc(0, 0, f.range * 0.72, a0, a1); c.stroke();
        c.restore(); c.globalAlpha = 1; c.lineCap = 'butt';
      }
    }
    for (i = 0; i < G.parts.length; i++) {
      var p = G.parts[i]; c.globalAlpha = 1 - p.t / p.max; c.fillStyle = 'rgba(' + XY.INKP.INK + ',0.85)'; if (p.sq) { c.save(); c.translate(p.x, p.y); c.rotate(p.t * 9 + p.r); c.fillRect(-p.r, -p.r, p.r * 2, p.r * 2); c.restore(); } else { XY.INKP.blot(c, p.x, p.y, Math.max(2, p.r), XY.INKP.INK, 0.55 * (1 - p.t / p.max), (p.x | 0) & 31, 1, 1); }
    }
    c.globalAlpha = 1;
    if (XY.vfx) XY.vfx.draw(c, G);                                              // v0.7：池化粒子（火花 / 拖尾 / 币 / 雷 / 叶 …）
  }

  function drawZones(c, G, rt) {
    for (var i = 0; i < G.zones.length; i++) {
      var z = G.zones[i], a = Math.min(1, z.t / 1.2);
      if (XY.INKP) { XY.INKP.blot(c, z.x, z.y, z.r * 0.55, XY.INKP.INK, 0.08 * a, (z.x | 0) & 63, 0, 1); XY.INKP.ring(c, z.x, z.y, z.r, 2.4, XY.INKP.INK, 0.55 * a, 8, 6, 1, rt * 0.4); }
      c.globalAlpha = 1;
    }
  }

  /* ---------- 法宝掉落 / 宝箱 ---------- */
  function drawCardMini(c, card, x, y, w, h, alpha) {          // 小卡牌（地上的、HUD 里的共用）——v0.8 水墨：宣纸卡面 + 墨边 + 套系色洇
    var R = XY.RARITY[card.r], S = XY.CARD_SETS[card.set], IP = XY.INKP, sd = ((card.name.charCodeAt(0) || 1) * 7 + w) & 1023;
    c.globalAlpha = alpha === undefined ? 1 : alpha;
    IP.card(c, x, y, w, h, R.color, S.color, 1, sd, Math.max(1.6, h * 0.075));
    if (!(XY.ICONINK && h >= 20 && card.name !== '？' && XY.ICONINK.has(card.name) && XY.ICONINK.draw(c, card.name, x, y - h * 0.08, Math.min(w * 0.92, h * 0.56), c.globalAlpha))) txt(c, card.name.charAt(0), x, y - h * 0.08, Math.round(h * 0.42), '#2a2218', 'center', false);      // v0.8.6：有水墨图标的法宝画图标，不再只画首字
    c.fillStyle = R.color; c.strokeStyle = 'rgba(' + IP.INK + ',0.8)'; c.lineWidth = 1; c.beginPath(); c.arc(x, y + h * 0.3, h * 0.07, 0, PI2); c.fill(); c.stroke();
    c.globalAlpha = 1;
  }
  function drawCardDrop(c, d, rt) {                            // v0.8 水墨令牌（精灵）：N / R / SR / SSR 四色泼墨，牌名首字压在牌面上
    if (d.life < 8 && Math.sin(rt * 14) < -0.2) return;          // 快消失了：闪烁
    var card = XY.CARD_BY[d.id], R = XY.RARITY[card.r], by = Math.sin(d.bob) * 3 - 6, k = 0.5 + 0.5 * Math.sin(rt * 5 + d.bob), IP = XY.INKP;
    c.fillStyle = 'rgba(' + IP.INK + ',0.2)'; c.beginPath(); c.ellipse(d.x, d.y + 14, 8, 2.6, 0, 0, PI2); c.fill();
    var ra = IP.mix(IP.rgb(R.color), 0.16);
    IP.blot(c, d.x, d.y + by, 13 + k * 3, ra, 0.34, (d.bob * 31 | 0) & 63, 0, 1);
    IP.blot(c, d.x, d.y + by - 1, 7, IP.INK, 0.55, ((d.bob * 17) | 0) & 63, 1, 0.8);
    c.save();
    c.font = '14px "Ma Shan Zheng","KaiTi","STKaiti",serif';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#24180f';
    c.fillText(card.name.charAt(0), d.x, d.y + by - 1);
    c.restore();
  }
  function drawChest(c, ch, rt) {                              // v0.8 水墨宝箱（精灵）：关闭；标签「宝箱」不变
    var x = ch.x, y = ch.y, k = 0.5 + 0.5 * Math.sin(rt * 4), IP = XY.INKP, INK = IP.INK, sd = ((ch.x * 3 + ch.y) | 0) & 1023;
    if (XY.ITEMINK && XY.ITEMINK.size('chest_closed')) {
      IP.blot(c, x, y + 6, 20 + k * 4, '230,185,70', 0.1 + 0.07 * k, sd, 0, 0.7);
      XY.ITEMINK.draw(c, 'chest_closed', x, y + 16, 1, 1);
      var cl = '宝箱'; otxt(c, cl, x, XY.R4.placeLabel(c, cl, x, y - 31, 13, -1), 13, '#a8700a', 'center', true); return;
    }
    IP.blot(c, x, y - 2, 40 + k * 6, '220,170,50', 0.2 + 0.1 * k, sd, 0, 0.8);
    c.fillStyle = 'rgba(' + INK + ',0.2)'; c.beginPath(); c.ellipse(x, y + 20, 28, 7, 0, 0, PI2); c.fill();
    c.lineJoin = 'round'; c.lineWidth = 2.6; c.strokeStyle = 'rgba(' + INK + ',0.9)';
    rrect(c, x - 26, y - 6, 52, 28, 5); c.fillStyle = 'rgba(184,122,58,0.82)'; c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x - 26, y - 6); c.quadraticCurveTo(x, y - 34, x + 26, y - 6); c.closePath(); c.fillStyle = 'rgba(209,147,71,0.85)'; c.fill(); c.stroke();
    c.fillStyle = 'rgba(240,180,41,0.95)'; c.fillRect(x - 5, y - 10, 10, 14); c.lineWidth = 2; c.strokeRect(x - 5, y - 10, 10, 14);
    otxt(c, '宝箱', x, y - 44, 14, '#a8700a', 'center', true);
  }
  function drawChestFx(c, f) {                                 // 开箱的纯显示效果：开启中 → 已开启 → 淡出（不影响拾取 / 判定）
    var n = f.t < 0.35 ? 'chest_opening' : 'chest_open', a = f.t > 1.1 ? Math.max(0, 1 - (f.t - 1.1) / 0.4) : 1;
    if (XY.ITEMINK && XY.ITEMINK.draw(c, n, f.x, f.y + 16 - (f.t > 0.35 ? Math.min(4, (f.t - 0.35) * 10) : 0), a, 1)) return;
  }

  // 地上的经验 / 金币：最后 DROP_FADE 秒一边变淡一边闪（被吸走的不闪）
  XY.dropAlpha = function (g, rt) {
    if (g.mag) return 1;
    var left = XY.C.DROP_LIFE - (g.age || 0); if (left >= XY.C.DROP_FADE) return 1;
    var a = 0.3 + 0.7 * Math.max(0, left) / XY.C.DROP_FADE; return Math.sin(rt * 18) > 0 ? a : a * 0.35;
  };

  function drawInkDrop(c, x, y, s, seed) {
    c.save();
    c.fillStyle = '#3f8f4a'; c.strokeStyle = 'rgba(42,32,22,0.75)'; c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x + s * 0.9, y - s * 0.2, x, y + s * 0.8); c.quadraticCurveTo(x - s * 0.9, y - s * 0.2, x, y - s); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,250,240,0.7)'; c.beginPath(); c.moveTo(x, y - s * 0.7); c.lineTo(x, y + s * 0.4); c.stroke();
    c.restore();
  }
  function drawInkIngot(c, x, y, seed) {
    c.save();
    c.fillStyle = '#e0b04a'; c.strokeStyle = 'rgba(42,32,22,0.8)'; c.lineWidth = 1.2;
    c.beginPath(); c.arc(x, y, 6.5, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#3a2a1c'; c.font = '9px "Ma Shan Zheng","KaiTi",serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('金', x, y + 0.5);
    c.restore();
  }
  function drawWorld(c, G, rt) {
    var i, v = G.view;
    if (G._soloId) {
      var x0 = G.cam.x - v.w / 2, y0 = G.cam.y - v.h / 2, solo = null, keep = G.ctrl;
      c.fillStyle = '#f3ead6';
      c.fillRect(x0 - 40, y0 - 40, v.w + 80, v.h + 80);
      for (i = 0; i < G.heroes.length; i++) if (G.heroes[i].id === G._soloId && !G.heroes[i].ridden) solo = G.heroes[i];
      if (solo) { G._quietShot = true; G.ctrl = -1; drawHero(c, G, solo, rt); G.ctrl = keep; }
      return;
    }
    drawGround(c, G);
    drawZones(c, G, rt);
    drawCamp(c, G, rt);
    // 宝石和金币
    for (i = 0; i < G.gems.length; i++) {
      var g = G.gems[i]; if (!inView(G, g.x, g.y, 20)) continue;
      var s = g.big ? 8 : 5; c.globalAlpha = XY.dropAlpha(g, rt);
      drawInkDrop(c, g.x, g.y, s, ((g.x * 3 + g.y) | 0) + (g.big ? 11 : 0));
    }
    c.globalAlpha = 1;
    for (i = 0; i < G.coinDrops.length; i++) {
      if (G.td && G.td.quiet > G.td.clock) break;
      var k = G.coinDrops[i]; if (!inView(G, k.x, k.y, 20)) continue;
      c.globalAlpha = XY.dropAlpha(k, rt);
      drawInkIngot(c, k.x, k.y, ((k.x + k.y) | 0));
    }
    c.globalAlpha = 1;
    for (i = 0; i < G.chests.length; i++) drawChest(c, G.chests[i], rt);
    if (G.chestFx) for (i = 0; i < G.chestFx.length; i++) drawChestFx(c, G.chestFx[i]);
    for (i = 0; i < G.cardDrops.length; i++) drawCardDrop(c, G.cardDrops[i], rt);
    XY.R4.under(c, G, rt);
    if (XY.ultscene) XY.ultscene.draw(c, G, 'ground');
    if (XY.v07b) XY.v07b.drawWarns(c, G, rt);                              // v0.7b：黑熊精落石红圈
    if (XY.fly) XY.fly.drawGround(c, G, rt);                                 // v0.8.4：飞妖的影子 + 俯冲落点圈
    for (i = 0; i < G.towers.length; i++) drawTower(c, G, G.towers[i], rt);
    var nv = 0; G._lod = false;
    for (i = 0; i < G.enemies.length; i++) { var e0 = G.enemies[i]; if (inView(G, e0.x, e0.y, 60) && ++nv > 120) { G._lod = true; break; } }
    G._visN = nv; G.stats.visMax = Math.max(G.stats.visMax || 0, nv);
    for (i = 0; i < G.enemies.length; i++) { var e = G.enemies[i]; if (inView(G, e.x, e.y, 60)) drawEnemy(c, G, e, rt); }
    if (G.breach) for (i = 0; i < G.enemies.length; i++) {        // 闯进营地圈的妖怪：头上一个红圈 + 指向师父的红线
      var ie = G.enemies[i]; if (ie.dead || XY.dist(ie.x, ie.y, G.camp.x, G.camp.y) > C.CAMP_ZONE_R) continue;
      var bt = ie.def && ie.def.denBoss ? ie.r * 2.4 : ie.r + 12, bz = Math.sin(rt * 12) * 2; c.fillStyle = 'rgba(214,40,40,0.95)'; c.strokeStyle = '#fff'; c.lineWidth = 1.5;      // 闯营警示：头上一个红色倒三角
      c.beginPath(); c.moveTo(ie.x - 8, ie.y - bt - 12 + bz); c.lineTo(ie.x + 8, ie.y - bt - 12 + bz); c.lineTo(ie.x, ie.y - bt + 1 + bz); c.closePath(); c.fill(); c.stroke();
    }
    // 敌方子弹（红橙色，一眼能看出危险）
    for (i = 0; i < G.eprojs.length; i++) {
      var q = G.eprojs[i]; if (!inView(G, q.x, q.y, 20)) continue;
      var IPe = XY.INKP, eang = Math.atan2(q.vy, q.vx), eac = IPe.mix(IPe.rgb(q.boss ? '#4a3058' : '#6a3020'), 0.25);
      IPe.stroke(c, q.x, q.y, q.x - Math.cos(eang) * 16, q.y - Math.sin(eang) * 16, q.r * 0.7, IPe.INK, 0.45, (q.x | 0) + 3, 0.08);
      c.fillStyle = 'rgba(' + IPe.INK + ',0.78)'; c.strokeStyle = 'rgba(' + eac + ',0.9)'; c.lineWidth = 1.3; teardrop(c, q.x, q.y, eang, q.r); c.fill(); c.stroke();
    }
    for (i = 0; i < G.projs.length; i++) if (inView(G, G.projs[i].x, G.projs[i].y, 20)) drawProj(c, G.projs[i]);
    // 英雄：按 y 排序，靠下的盖在上面
    var order = G.heroes.slice(), gh = G.guest && G.guest.h; if (gh) order.push(gh);                // 召唤来的特殊人物（临时，不在 G.heroes 里）
    order.sort(function (a, b) { if (a.id === 'tang') return 1; if (b.id === 'tang') return -1; return a.y - b.y; });
    XY.R4.allies(c, G, rt); heroBodies.length = 0; heroNames.length = 0; XY.R4._orderSeen = [];
    for (i = 0; i < order.length; i++) {
      if (order[i] === gh) { c.save(); c.globalAlpha = XY.guest.alpha(G); drawHero(c, G, gh, rt); c.restore(); continue; }
      drawHero(c, G, order[i], rt); XY.R4.heroOver(c, G, order[i], rt);
    }
    flushHeroNames(c);
    if (G.camp && !G.villain) drawRestStall(c, G.camp.x, G.camp.y - (G.camp.active ? 8 : 0), rt);
    if (XY.fly) XY.fly.drawAir(c, G, rt, inView, bar);                       // v0.8.4：飞妖本体盖在英雄上面
    if (gh) XY.guest.drawTag(c, G);
    drawFx(c, G); if (XY.ultscene) XY.ultscene.draw(c, G, 'air'); if (G.fb && XY.fabao.draw) XY.fabao.draw(c, G); if (XY.animItems) XY.animItems(c, G);
    XY.R4.over(c, G, XY.app || {}, rt);
    // 飘字
    var hideFloat = G.mode === 'cards' || G.mode === 'skills' || G.mode === 'vendor';
    for (i = 0; i < G.texts.length && !hideFloat; i++) {
      var t = G.texts[i], a = 1 - Math.pow(t.t / t.max, 3);
      var sy = t.y - G.cam.y + G.view.h / 2;
      if (sy < 74 || sy > G.view.h - 112) continue;
      c.globalAlpha = Math.max(0, a);
      var col = t.color ? t.color : t.kind === 'crit' ? '#6e342c' : (t.kind === 'hurt' ? '#6e342c' : (t.kind === 'heal' ? '#6e342c' : (t.kind === 'coin' ? '#5c4632' : '#3a3226')));
      var label = t.s, dn = +t.s, dx = t.x, dy = t.y;
      if ((t.kind === 'dmg' || t.kind === 'crit' || t.kind === 'weak' || t.kind === 'hurt') && isFinite(dn) && Math.abs(dn) >= 10000) { var wan = dn / 10000; label = (Math.abs(wan) >= 100 ? Math.round(wan) : Math.round(wan * 10) / 10) + '万'; }
      if (G.view && G.view.w < 520 && G.enemies) { var bi, be; for (bi = 0; bi < G.enemies.length; bi++) { be = G.enemies[bi]; if (be && be.def && be.def.denBoss && !be.dead && Math.abs(be.x - t.x) < 90 && Math.abs(be.y - t.y) < 110) { dx = t.x + ((bi + i) % 2 ? 48 : -48); dy = t.y - 28; break; } } }
      c.save(); c.font = Math.max(11, Math.min(16, t.size)) + 'px "Ma Shan Zheng","KaiTi",serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 2; c.strokeStyle = 'rgba(255,250,240,0.88)'; c.strokeText(label, dx, dy); c.fillStyle = col; c.fillText(label, dx, dy); c.restore();
    }
    c.globalAlpha = 1;
  }

  /* ================= HUD ================= */
  function btn(c, app, x, y, w, h, label, act, opt) {
    opt = opt || {}; if (XY.ov) return XY.ov.btn(c, app, x, y, w, h, label, act, opt);
    var hov = app.mouse && app.mouse.x >= x && app.mouse.x <= x + w && app.mouse.y >= y && app.mouse.y <= y + h;
    c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(opt.primary ? -0.02 : 0.01);
    c.fillStyle = opt.primary ? (hov ? '#c4472e' : '#a83224') : (hov ? 'rgba(90,74,52,0.22)' : 'rgba(90,74,52,0.14)');
    c.beginPath(); c.moveTo(-w / 2 + 3, -h * 0.38); c.lineTo(w / 2, -h * 0.42); c.lineTo(w / 2 - 3, h * 0.38); c.lineTo(-w / 2 + 2, h * 0.34); c.closePath(); c.fill(); c.restore();
    txt(c, label, x + w / 2, y + h / 2 + 1, opt.size || 20, opt.primary ? '#fff6e8' : T.ink, 'center', true);
    ui.hits.push({ x: x, y: y, w: w, h: h, act: act });
  }

  /* ---------- 右侧：本局法宝 + 羁绊 ---------- */
  function drawCardsHUD(c, G, app, y0) {
    if (G.fb && XY.fabaoui) return XY.fabaoui.hud(c, G, app, y0);
    var W = app.lw, pw = 232, x = W - pw - 12, ids = {}, id, list = [], tip = null, i;
    G.deckIds.forEach(function (k) { ids[k] = 1; }); for (id in G.runCards) ids[id] = 1;
    for (id in ids) list.push(XY.CARD_BY[id]);
    list.sort(function (a, b) { return XY.SET_ORDER.indexOf(a.set) - XY.SET_ORDER.indexOf(b.set) || XY.RARITY_ORDER.indexOf(b.r) - XY.RARITY_ORDER.indexOf(a.r); });
    ui.cardPanel = null;
    if (!list.length) {
      panel(c, x, y0, pw, 26, 8); txt(c, '法宝 0 · 打精英 / 开宝箱', x + 10, y0 + 14, 12, T.inkSoft, 'left', false);
      ui.cardPanel = { x: x, y: y0, w: pw, h: 26 }; return;
    }
    var cols = 2, cwid = (pw - 16) / cols, rows = Math.min(7, Math.ceil(list.length / cols)), shown = rows * cols;
    var combos = G.combos.filter(function (b) { return b.n > 0; });
    var ph = 30 + rows * 22 + (list.length > shown ? 14 : 0) + (combos.length ? 24 : 0);
    var crow = combos.map(function (b) { return 18 + (b.tier >= 1 ? 14 * b.tier : 14); });
    crow.forEach(function (h) { ph += h + 4; });
    ph += 6;
    panel(c, x, y0, pw, ph, 10);
    ui.cardPanel = { x: x, y: y0, w: pw, h: ph };
    txt(c, '法宝 ' + list.length, x + 10, y0 + 14, 14, T.ink, 'left', true);
    txt(c, G.cardSwitchCd > 0 ? '切换冷却 ' + Math.ceil(G.cardSwitchCd) + ' 秒' : '点卡牌祭出（同时只能 1 个）', x + pw - 10, y0 + 15, 11, G.cardSwitchCd > 0 ? '#b8300f' : T.inkSoft, 'right', false);
    var flash = G.cardFlash ? 0.5 + 0.5 * Math.sin(app.rt * 14) : 0;
    for (i = 0; i < Math.min(list.length, shown); i++) {
      var cd = list[i], cx = x + 8 + (i % cols) * cwid, cy = y0 + 28 + Math.floor(i / cols) * 22, R = XY.RARITY[cd.r], S = XY.CARD_SETS[cd.set];
      var cp = Math.min(3, XY.cards.copies(G, cd.id)), hov = app.mouse && app.mouse.x >= cx && app.mouse.x < cx + cwid - 2 && app.mouse.y >= cy && app.mouse.y < cy + 20;
      var isAct = G.activeCard === cd.id;
      rrect(c, cx, cy, cwid - 3, 20, 6); c.fillStyle = isAct ? '#fff0c0' : (hov ? '#fff3d6' : '#fffdf6'); c.fill();
      ui.hits.push({ x: cx, y: cy, w: cwid - 3, h: 20, act: 'cardActive', id: cd.id });
      c.lineWidth = G.cardFlash && G.cardFlash.id === cd.id ? 2.5 : 1.5; c.strokeStyle = G.cardFlash && G.cardFlash.id === cd.id ? 'rgba(224,83,61,' + (0.5 + 0.5 * flash) + ')' : R.color; c.stroke();
      c.fillStyle = S.color; c.beginPath(); c.arc(cx + 9, cy + 10, 4.5, 0, PI2); c.fill();
      txt(c, cd.name, cx + 17, cy + 11, 11.5, T.ink, 'left', true);
      if (isAct) { c.fillStyle = '#e0a415'; c.strokeStyle = '#8a5a05'; c.lineWidth = 1; c.beginPath(); for (var sk = 0; sk < 10; sk++) { var sa = -Math.PI / 2 + sk * Math.PI / 5, sr = sk % 2 ? 3.2 : 7; c.lineTo(cx + cwid - 14 + Math.cos(sa) * sr, cy + 10 + Math.sin(sa) * sr); } c.closePath(); c.fill(); c.stroke(); }
      if (cp > 1) txt(c, '×' + cp, cx + cwid - 8, cy + 11, 11, '#b8300f', 'right', true);
      if (hov) tip = { card: cd, x: cx, y: cy, cp: cp };
    }
    var yy = y0 + 28 + rows * 22 + 2;
    if (list.length > shown) { txt(c, '…还有 ' + (list.length - shown) + ' 张', x + 10, yy + 6, 11, T.inkSoft, 'left', false); yy += 14; }
    if (combos.length) {
      txt(c, '羁绊（同一套 3 / 5 张）', x + 10, yy + 8, 11.5, T.inkSoft, 'left', true); yy += 22;
      combos.forEach(function (b, k) {
        var S2 = XY.CARD_SETS[b.set], on = b.tier >= 1, need = b.tier >= 2 ? 0 : XY.COMBO_AT[b.tier] - b.n;
        c.fillStyle = on ? 'rgba(92,184,92,0.16)' : 'rgba(0,0,0,0.04)'; rrect(c, x + 6, yy, pw - 12, crow[k], 6); c.fill();
        if (on) { c.lineWidth = 1.5; c.strokeStyle = '#5cb85c'; c.stroke(); }
        c.fillStyle = S2.color; c.beginPath(); c.arc(x + 15, yy + 9, 5, 0, PI2); c.fill();
        txt(c, S2.name + ' ' + b.n + (b.tier >= 2 ? ' 张 · 满' : ' / ' + XY.COMBO_AT[b.tier]) + (on ? ' ✔' : ''), x + 25, yy + 10, 12, on ? '#2f7d3b' : T.ink, 'left', true);
        var ly = yy + 24;
        function ctxt(str, col) { c.font = font(10.5, false); c.fillStyle = col; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(XY.fmtStr(str), x + 12, ly, pw - 22); }
        if (on) { for (var t = 0; t < b.tier; t++) { ctxt(XY.COMBO_AT[t] + '张：' + XY.comboText(b.set, t), '#2f7d3b'); ly += 14; } }
        else ctxt('再 ' + need + ' 张：' + XY.comboText(b.set, 0), T.inkSoft);
        yy += crow[k] + 4;
      });
    }
    if (G.comboFlash > 0 && Math.sin(app.rt * 12) > 0) { c.lineWidth = 3; c.strokeStyle = '#e0a415'; rrect(c, x, y0, pw, ph, 10); c.stroke(); }
    if (tip) {
      var cd2 = tip.card, lvv = XY.save.lvOf(cd2.id), lines = [cd2.name + ' · ' + XY.RARITY[cd2.r].name + ' · ' + XY.CARD_SETS[cd2.set].name + '套 · Lv' + lvv + (tip.cp > 1 ? ' · ×' + tip.cp + '份（每份 +50%）' : ''), XY.cardFxText(cd2, lvv), cd2.lore];
      var tw2 = 330, tx2 = Math.max(8, x - tw2 - 8);
      panel(c, tx2, tip.y - 4, tw2, 66, 8, 'rgba(255,252,240,0.98)', XY.RARITY[cd2.r].color);
      txt(c, lines[0], tx2 + 10, tip.y + 10, 12.5, T.ink, 'left', true); txt(c, lines[1], tx2 + 10, tip.y + 29, 12, '#2f7d3b', 'left', true); txt(c, lines[2], tx2 + 10, tip.y + 47, 11, T.inkSoft, 'left', false);
    }
  }

  function drawHUD(c, G, app) { return XY.R4.hud(c, G, app); }
  function drawHUDOld(c, G, app) {
    var W = app.lw, H = app.lh, rt = app.rt, i;
    // 师父有危险（妖怪闯进营地圈 / 妖怪或弹幕逼近师父）：屏幕四周泛红
    var tg = G.heroes[0], tdg = !tg.down && (G.breach || G.tdanger);
    if (tdg) {
      var va = (G.breach ? 0.42 : 0.26) * (0.6 + 0.4 * Math.sin(rt * 10));
      var vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
      c.save();
      [[0, 0], [W, 0], [0, H], [W, H]].forEach(function (p) {
        var ig = c.createRadialGradient(p[0], p[1], 6, p[0], p[1], Math.min(W, H) * 0.28);
        ig.addColorStop(0, 'rgba(42,32,22,' + (va * 0.55) + ')'); ig.addColorStop(1, 'rgba(42,32,22,0)');
        c.fillStyle = ig; c.fillRect(0, 0, W, H);
      });
      c.restore();
    }
    // 顶部经验条
    var need = XY.xpNeed(G.level);
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(0, 0, W, 18);
    c.fillStyle = '#7ccf6b'; c.fillRect(0, 0, W * Math.min(1, G.xp / need), 18);
    c.fillStyle = 'rgba(80,70,40,0.5)'; c.fillRect(0, 18, W, 1.5);
    otxt(c, '等级 ' + G.level + '    经验 ' + Math.floor(G.xp) + ' / ' + need, W / 2, 9.5, 12, T.ink, 'center', true);

    // 计时器
    var tleft = C.BOSS_TIME - G.t, boss = G.boss;
    panel(c, W / 2 - 80, 24, 160, G.bossSpawned ? 42 : 52, 12);
    txt(c, XY.fmtTime(G.t), W / 2, 44, 26, T.ink, 'center', true);
    if (!G.bossSpawned) txt(c, '牛魔王 ' + XY.fmtTime(tleft) + ' 后出现', W / 2, 63, 12, T.inkSoft, 'center', false);
    else if (!boss) txt(c, '已击败牛魔王', W / 2, 61, 12, T.good, 'center', true);
    if (boss) {
      var bw = Math.min(520, W - 40), bx = W / 2 - bw / 2, by = 78;
      panel(c, bx - 8, by - 4, bw + 16, 32, 10);
      bar(c, bx, by + 12, bw, 12, boss.hp / boss.maxHp, '#9b59d0', 'rgba(255,255,255,0.8)');
      txt(c, '牛魔王' + (boss.phase === 2 ? '（发怒）' : ''), bx + 4, by + 5, 13, '#5b2d91', 'left', true);
      txt(c, Math.ceil(boss.hp) + ' / ' + boss.maxHp, bx + bw - 4, by + 5, 12, T.inkSoft, 'right', false);
    }

    // 左上：金币、击杀、营地
    panel(c, 12, 26, 214, 78, 12);
    c.fillStyle = '#ffd24a'; c.strokeStyle = '#b8860b'; c.lineWidth = 2; c.beginPath(); c.arc(30, 44, 9, 0, PI2); c.fill(); c.stroke();
    txt(c, '金币 ' + G.coins, 46, 44, 18, T.ink, 'left', true);
    txt(c, '击杀 ' + G.kills, 140, 44, 14, T.inkSoft, 'left', false);
    var cf = G.camp.hp / G.camp.maxHp;
    txt(c, '经书营地', 24, 68, 13, T.ink, 'left', true);
    txt(c, Math.ceil(G.camp.hp) + ' / ' + G.camp.maxHp, 214, 68, 12, T.inkSoft, 'right', false);
    bar(c, 22, 80, 190, 11, cf, hpColor(cf), 'rgba(255,255,255,0.8)');
    if (G.campAlert > 0 && Math.sin(rt * 14) > 0) { c.strokeStyle = '#e0533d'; c.lineWidth = 3; rrect(c, 12, 26, 214, 78, 12); c.stroke(); }

    // 唐僧生命（输掉游戏的两个条件之一，所以放大放醒目）
    var tpy = 110, tdanger = tdg, tflash = tdanger && Math.sin(rt * 10) > 0;
    panel(c, 12, tpy, 214, 50, 12, tflash ? '#fff0ec' : undefined);
    txt(c, '师傅 唐僧', 24, tpy + 15, 14, T.ink, 'left', true);
    txt(c, tg.inv > 0 && G.t < C.TANG_START_INV + 0.5 ? '开局保护 ' + Math.ceil(tg.inv) + ' 秒' : (tg.down ? '阵亡' : '只有 1 点血'), 214, tpy + 15, 12, tg.inv > 0 ? '#a8700a' : '#b5503a', 'right', true);
    bar(c, 22, tpy + 28, 190, 14, tg.down ? 0 : 1, tg.inv > 0 && G.t < C.TANG_START_INV + 0.5 ? '#8a6a44' : '#3a2e26', '#efe6d4');
    txt(c, tdanger ? (G.breach ? '妖怪闯进营地！' : '有东西逼近师父！') : '被碰到 / 被打中一下就输', 117, tpy + 35, 10.5, '#fff', 'center', true);
    if (tdanger) { c.strokeStyle = tflash ? '#e0533d' : '#f0a090'; c.lineWidth = 3; rrect(c, 12, tpy, 214, 50, 12); c.stroke(); }
    // 驻守加成状态
    if (G.station) {
      var sy2 = tpy + 56, spl = 0.5 + 0.5 * Math.sin(rt * 4);
      panel(c, 12, sy2, 214, 44, 12, 'rgba(255,243,196,0.97)', '#e0a415');
      txt(c, '唐僧驻守中', 24, sy2 + 14, 14, '#a8700a', 'left', true);
      txt(c, '营地回血 +' + Math.round(G.campRegen) + '/秒', 24, sy2 + 31, 12, T.ink, 'left', true);
      txt(c, '营地受伤 -' + Math.round((1 - Math.max(0.2, C.STATION_DEF - G.heroes[0].mod.stDef)) * 100) + '%', 214, sy2 + 31, 12, T.ink, 'right', true);
      c.strokeStyle = 'rgba(224,164,21,' + (0.4 + 0.5 * spl) + ')'; c.lineWidth = 2; rrect(c, 12, sy2, 214, 44, 12); c.stroke();
    } else if (!tg.down && tg.order === 'station' && G.ctrl !== 0) {
      txt(c, '唐僧正在赶回营地…', 24, tpy + 66, 12, T.inkSoft, 'left', false);
    } else if (!tg.down && G.ctrl === 0) {
      txt(c, '唐僧是手动状态：不会驻守', 24, tpy + 66, 12, T.inkSoft, 'left', false);
    }

    // 右上
    var rx = W - 12;
    txt(c, 'Esc / P 暂停', rx, 36, 12, T.inkSoft, 'right', false);
    var sb = { x: W - 176, y: 44, w: 164, h: 38 }, shov = app.mouse && app.mouse.x >= sb.x && app.mouse.x <= sb.x + sb.w && app.mouse.y >= sb.y && app.mouse.y <= sb.y + sb.h;
    var hasPts = G.points > 0, sp2 = 0.5 + 0.5 * Math.sin(rt * 6);
    rrect(c, sb.x, sb.y, sb.w, sb.h, 12); c.fillStyle = hasPts ? (shov ? '#ffcf5a' : 'rgba(255,214,110,' + (0.85 + 0.15 * sp2) + ')') : (shov ? '#fff3d6' : 'rgba(255,255,255,0.94)'); c.fill();
    c.lineWidth = 2.5; c.strokeStyle = hasPts ? '#c78a1e' : '#b9a77a'; c.stroke();
    txt(c, '技能树 (Tab)', sb.x + 14, sb.y + sb.h / 2 + 1, 16, T.ink, 'left', true);
    if (hasPts) {
      c.fillStyle = '#e0533d'; c.beginPath(); c.arc(sb.x + sb.w - 20, sb.y + sb.h / 2, 13 + sp2, 0, PI2); c.fill();
      txt(c, String(G.points), sb.x + sb.w - 20, sb.y + sb.h / 2 + 1, 15, '#fff', 'center', true);
    }
    ui.hits.push({ x: sb.x, y: sb.y, w: sb.w, h: sb.h, act: 'skills' });
    if (hasPts) txt(c, '有 ' + G.points + ' 点技能点没用！', rx, 94, 12, '#b8300f', 'right', true);
    var dy0 = hasPts ? 112 : 96;
    if (app.debugOn) {
      txt(c, '调试键：已开（Shift+F9 关）', rx, dy0, 12, '#c0392b', 'right', true); dy0 += 18;
      if (G.speed !== 1) { txt(c, '调试：速度 ×' + G.speed, rx, dy0, 13, '#c0392b', 'right', true); dy0 += 18; }
      if (G.godMode) { txt(c, '调试：无敌', rx, dy0, 13, '#c0392b', 'right', true); dy0 += 18; }
      txt(c, Math.round(app.fps) + ' FPS · 敌人 ' + G.enemies.length, rx, dy0, 12, T.inkSoft, 'right', false);
    }

    ui.banner = null;
    drawCardsHUD(c, G, app, Math.max(150, dy0 + 22));
    // 提示横幅
    if (G.banner) {
      var b = G.banner, al = Math.min(1, b.t / 0.5, (b.max - b.t) / 0.2 + 0.01);
      c.globalAlpha = Math.max(0, Math.min(1, al));
      var stripY = boss ? 116 : 80;                                  // 师父危险红条的位置：横幅要让开它，不能叠在一起
      var bwid = Math.min(W - 20, Math.max(260, b.text.length * 24 + 60)), by2 = G.breach && !tg.down ? stripY + 42 : (boss ? 124 : 96);
      ui.banner = { x: W / 2 - bwid / 2, y: by2, w: bwid, h: 46 };
      panel(c, W / 2 - bwid / 2, by2, bwid, 46, 14, 'rgba(246,239,226,0.95)', '#5c4a38');
      txt(c, b.text, W / 2, by2 + 24, b.text.length > 22 ? 20 : 24, '#b8300f', 'center', true);
      c.globalAlpha = 1;
    }
    if (G.toast) {
      var tw = Math.max(240, G.toast.text.length * 15 + 40), ty = H - 182;
      panel(c, W / 2 - tw / 2, ty, tw, 34, 10, 'rgba(246,239,226,0.95)', '#5c4a38');
      txt(c, G.toast.text, W / 2, ty + 18, 15, T.ink, 'center', true);
    }

    // 底部：五位英雄头像卡
    var cw = Math.max(100, Math.min(134, (W - 480) / 5 - 8)), chh = 96, gap = 8, total = cw * 5 + gap * 4, sx = W / 2 - total / 2, sy = H - chh - 12, tip = null;
    var OB = ['follow', 'station', 'attack', 'guard'], OBL = { follow: '跟随', station: '驻守', attack: '出击', guard: '守护' };
    for (i = 0; i < 5; i++) {
      var h = G.heroes[i], d = h.def, x = sx + i * (cw + gap), y = sy - (G.ctrl === i && !h.down ? 6 : 0), isC = G.ctrl === i && !h.down;
      var hov = !h.down && app.mouse && app.mouse.x >= x && app.mouse.x <= x + cw && app.mouse.y >= y && app.mouse.y <= y + 70;
      rrect(c, x, y, cw, chh, 12); c.fillStyle = h.down ? 'rgba(214,212,206,0.96)' : (hov ? '#fffaf0' : 'rgba(255,255,255,0.94)'); c.fill();
      c.lineWidth = isC ? 4 : 1.8; c.strokeStyle = h.down ? '#a7a398' : (isC ? d.color : '#cdbf9c'); c.stroke();
      if (isC) { c.lineWidth = 1.5; c.strokeStyle = d.dark; rrect(c, x + 3, y + 3, cw - 6, chh - 6, 10); c.stroke(); }
      c.save(); if (h.down) c.globalAlpha = 0.35;
      drawHeroShape(c, d, x + 28, y + 34, 18);
      c.restore();
      // 按键徽章
      c.fillStyle = isC ? d.dark : '#8a7d63'; c.beginPath(); c.arc(x + 12, y + 12, 9, 0, PI2); c.fill();
      txt(c, String(i + 1), x + 12, y + 13, 12, '#fff', 'center', true);
      txt(c, d.name, x + 52, y + 15, 15, h.down ? '#8a8578' : T.ink, 'left', true);
      if (h.down) {
        c.save(); c.translate(x + cw / 2, y + 52); c.rotate(-0.12);
        c.strokeStyle = '#b3402e'; c.lineWidth = 3; rrect(c, -34, -17, 68, 34, 6); c.stroke();
        txt(c, '阵亡', 0, 1, 24, '#b3402e', 'center', true);
        c.restore();
        txt(c, '本局不能再出战', x + cw / 2, y + 84, 11, '#7a766a', 'center', false);
        continue;                                          // 阵亡的头像：不能选、不能下命令
      }
      var f = h.hp / h.maxHp;
      bar(c, x + 52, y + 27, cw - 62, 8, f, hpColor(f), 'rgba(60,50,30,0.2)');
      var olab = isC ? '手动操控' : (i === 0 && G.station ? '驻守中' : XY.ORDER_NAME[h.order]);
      txt(c, olab, x + 8, y + 46, 11.5, isC ? '#b8300f' : (i === 0 && G.station ? '#a8700a' : '#3d6288'), 'left', true);
      txt(c, Math.ceil(h.hp) + '/' + h.maxHp, x + cw - 8, y + 46, 10.5, T.inkSoft, 'right', false);
      var ready = h.ultCd <= 0, uc = XY.ultCdOf(G, h);
      if (ready) {
        var pulse = 0.5 + 0.5 * Math.sin(rt * 6);
        bar(c, x + 8, y + 54, cw - 16, 11, 1, 'rgba(' + (isC ? '255,170,40' : '120,190,110') + ',' + (0.75 + pulse * 0.25) + ')');
        txt(c, d.ult + '·就绪', x + cw / 2, y + 60, 11, T.ink, 'center', true);
      } else {
        bar(c, x + 8, y + 54, cw - 16, 11, 1 - h.ultCd / uc, '#8fb8e8');
        txt(c, d.ult + ' ' + Math.ceil(h.ultCd) + 's', x + cw / 2, y + 60, 11, T.ink, 'center', false);
      }
      ui.hits.push({ x: x, y: y, w: cw, h: 70, act: 'hero', i: i });
      // 命令按钮（点一下就下令；手动的那位也可以先设好）
      var obw = (cw - 16 - 9) / 4, oby = y + 72;
      for (var q = 0; q < 4; q++) {
        var ob = OB[q], obx = x + 8 + q * (obw + 3), off = (ob === 'guard' && i === 0), act = h.order === ob;
        var ohov = !off && app.mouse && app.mouse.x >= obx && app.mouse.x <= obx + obw && app.mouse.y >= oby && app.mouse.y <= oby + 18;
        rrect(c, obx, oby, obw, 18, 6);
        c.fillStyle = off ? '#e6e3dc' : (act ? (isC ? '#f3d9a0' : d.color) : (ohov ? '#fff3d6' : '#fbf6ea')); c.fill();
        c.lineWidth = act ? 2 : 1.2; c.strokeStyle = off ? '#d0cdc4' : (act ? d.dark : '#c9b98f'); c.stroke();
        txt(c, OBL[ob], obx + obw / 2, oby + 10, 11, off ? '#aaa69b' : (act && !isC ? '#fff' : T.ink), 'center', true);
        if (!off) ui.hits.push({ x: obx, y: oby, w: obw, h: 18, act: 'order', i: i, order: ob });
        if (ohov) tip = { x: x + cw / 2, y: y - 8, text: XY.ORDER_NAME[ob] + '：' + XY.ORDER_DESC[ob] + (isC ? '（正在手动操控，松手后生效）' : '') };
        else if (off && app.mouse && app.mouse.x >= obx && app.mouse.x <= obx + obw && app.mouse.y >= oby && app.mouse.y <= oby + 18) tip = { x: x + cw / 2, y: y - 8, text: '唐僧不能守护自己' };
      }
    }
    if (tip) {
      var tww = Math.min(W - 20, tip.text.length * 13 + 24), tx0 = Math.max(10, Math.min(W - tww - 10, tip.x - tww / 2)), ty0 = tip.y - 34;
      panel(c, tx0, ty0, tww, 30, 8, 'rgba(255,252,240,0.98)', '#c9a24a');
      txt(c, tip.text, tx0 + tww / 2, ty0 + 16, 13, T.ink, 'center', false);
    }

    // 左下：建塔栏（竖着排三个按钮）
    var bxs = 12, tk = ['arrow', 'cannon', 'frost'], bph = 188, bys0 = H - bph - 12;
    panel(c, bxs, bys0, 190, bph, 12);
    txt(c, '造塔（帮忙守营地）', bxs + 10, bys0 + 15, 13, T.ink, 'left', true);
    txt(c, '塔 ' + G.towers.length + '/' + XY.soldierCap(G) + '  点按钮再点地面·点塔升级', bxs + 10, bys0 + 33, 11, T.inkSoft, 'left', false);
    for (i = 0; i < 3; i++) {
      var td = XY.TOWERS[tk[i]], bx2 = bxs + 8, by3 = bys0 + 46 + i * 46, ok = G.coins >= td.cost;
      var hv = app.mouse && app.mouse.x >= bx2 && app.mouse.x <= bx2 + 174 && app.mouse.y >= by3 && app.mouse.y <= by3 + 42;
      rrect(c, bx2, by3, 174, 42, 10); c.fillStyle = ok ? (hv ? '#fff3d6' : '#fffdf6') : '#ececec'; c.fill();
      c.lineWidth = 2; c.strokeStyle = ok ? '#c9a24a' : '#c8c8c8'; c.stroke();
      if (app.build === tk[i]) { rrect(c, bx2 - 2, by3 - 2, 178, 46, 11); c.lineWidth = 3; c.strokeStyle = '#e8892b'; c.stroke(); }
      c.fillStyle = td.color; c.beginPath(); c.arc(bx2 + 20, by3 + 21, 11, 0, PI2); c.fill();
      c.fillStyle = '#8a7d63'; c.beginPath(); c.arc(bx2 + 20, by3 + 21, 0.1, 0, PI2); c.fill();
      txt(c, td.name.charAt(0), bx2 + 20, by3 + 22, 12, '#fff', 'center', true);
      txt(c, td.name, bx2 + 40, by3 + 14, 14, ok ? T.ink : '#999', 'left', true);
      txt(c, td.cost + ' 金币', bx2 + 40, by3 + 31, 13, ok ? '#a8700a' : '#aaa', 'left', true);
      txt(c, td.desc.slice(0, 5), bx2 + 168, by3 + 31, 10, '#999', 'right', false);
      ui.hits.push({ x: bx2, y: by3, w: 174, h: 42, act: 'tower', type: tk[i] });
    }

    // 右下：操作提示
    var alpha = G.t < 40 ? 0.95 : 0.6;
    c.globalAlpha = alpha;
    panel(c, W - 252, H - 104, 240, 92, 12);
    var lines = ['方向键只管走位', '技能和大招自己放', '点头像换人', '点修行看技能', '点暂停歇一歇'];
    for (i = 0; i < lines.length; i++) txt(c, lines[i], W - 242, H - 92 + i * 16, 12.5, T.ink, 'left', false);
    c.globalAlpha = 1;

    // 造塔预览 / 选中的塔：升级按钮（点击操作，不用热键）
    var tcx = G.view.w / 2 - G.cam.x, tcy = G.view.h / 2 - G.cam.y;
    if (app.build && app.mouse && G.mode === 'play' && !G.td) {
      var bd0 = XY.TOWERS[app.build], mxw = app.mouse.x - tcx, myw = app.mouse.y - tcy, why = XY.towerBlock(G, app.build, mxw, myw);
      c.save(); c.globalAlpha = 0.85;
      c.beginPath(); c.arc(app.mouse.x, app.mouse.y, bd0.range, 0, PI2); c.fillStyle = why ? 'rgba(220,80,60,0.08)' : 'rgba(80,170,90,0.10)'; c.fill();
      c.lineWidth = 2; c.strokeStyle = why ? '#d9503c' : '#4aa35a'; c.setLineDash([6, 5]); c.stroke(); c.setLineDash([]);
      c.fillStyle = bd0.color; c.beginPath(); c.arc(app.mouse.x, app.mouse.y, 14, 0, PI2); c.fill();
      c.lineWidth = 3; c.strokeStyle = why ? '#d9503c' : '#4aa35a'; c.stroke();
      c.restore();
      txt(c, why ? '✘ ' + why : '✔ 点击放置 ' + bd0.name + '（' + bd0.cost + ' 金币）', app.mouse.x, app.mouse.y - 40, 13, why ? '#b8300f' : '#2f7d3b', 'center', true);
    }
    if (app.selTower && G.towers.indexOf(app.selTower) >= 0 && !G.td) {
      var st = app.selTower, sd = XY.TOWERS[st.type], sx = st.x + tcx, sy = st.y + tcy, ss = XY.towerStat(G, st);
      c.beginPath(); c.arc(sx, sy, ss.range, 0, PI2); c.lineWidth = 2; c.strokeStyle = 'rgba(232,137,43,0.8)'; c.setLineDash([6, 5]); c.stroke(); c.setLineDash([]);
      var pw = 158, ph = 62, px2 = Math.max(6, Math.min(W - pw - 6, sx - pw / 2)), py2 = Math.max(60, sy - 40 - ph);
      panel(c, px2, py2, pw, ph, 10);
      txt(c, sd.name + ' Lv' + st.lv + (st.lv >= 3 ? '（满级）' : ''), px2 + pw / 2, py2 + 14, 13, T.ink, 'center', true);
      if (st.lv >= 3) txt(c, '已经是最高等级', px2 + pw / 2, py2 + 42, 13, T.inkSoft, 'center', false);
      else {
        var ucost = XY.TOWER_UP_COST[st.lv + 1], uok = G.coins >= ucost;
        rrect(c, px2 + 10, py2 + 26, pw - 20, 28, 8); c.fillStyle = uok ? '#ffb347' : '#e6e3dc'; c.fill(); c.lineWidth = 2; c.strokeStyle = uok ? '#c9822a' : '#c8c8c8'; c.stroke();
        txt(c, '升级 · ' + ucost + ' 金币', px2 + pw / 2, py2 + 41, 14, uok ? '#4a2a05' : '#999', 'center', true);
        ui.hits.push({ x: px2 + 10, y: py2 + 26, w: pw - 20, h: 28, act: 'upTower' });
      }
    }

    // 营地不在屏幕里：边缘箭头
    var cp = G.camp, dx = cp.x - G.cam.x, dy = cp.y - G.cam.y;
    if (Math.abs(dx) > G.view.w / 2 - 20 || Math.abs(dy) > G.view.h / 2 - 20) {
      var ang = Math.atan2(dy, dx), mx = W / 2 - 60, my = H / 2 - 110, sc = Math.min(mx / Math.abs(Math.cos(ang) || 1e-6), my / Math.abs(Math.sin(ang) || 1e-6));
      var ax = W / 2 + Math.cos(ang) * sc, ay = H / 2 + Math.sin(ang) * sc;
      var alert = G.campAlert > 0;
      c.save(); c.translate(ax, ay); c.rotate(ang);
      c.fillStyle = alert ? (Math.sin(rt * 14) > 0 ? '#e0533d' : '#ff9a80') : '#d9a21a'; c.strokeStyle = '#fff'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(18, 0); c.lineTo(-10, -13); c.lineTo(-4, 0); c.lineTo(-10, 13); c.closePath(); c.stroke(); c.fill(); c.restore();
      otxt(c, alert ? '营地被攻击！' : '营地', ax - Math.cos(ang) * 40, ay - Math.sin(ang) * 40, 13, alert ? '#c0392b' : T.ink, 'center', true);
    }
    ui.strip = null;
    if (G.breach && !tg.down) {
      var bp = 0.5 + 0.5 * Math.sin(rt * 12), sy3 = boss ? 116 : 80;
      ui.strip = { x: W / 2 - 230, y: sy3, w: 460, h: 36 };
      rrect(c, W / 2 - 230, sy3, 460, 36, 10); c.fillStyle = 'rgba(214,40,40,' + (0.82 + 0.15 * bp) + ')'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#fff'; c.stroke();
      txt(c, '⚠ 妖怪闯进营地了！师父一碰就输 — 快清掉！', W / 2, sy3 + 18, 18, '#fff', 'center', true);
    }
    // 唐僧不在屏幕里：红色边缘箭头（有危险时闪）
    if (!tg.down) {
      var tdx = tg.x - G.cam.x, tdy = tg.y - G.cam.y;
      if (Math.abs(tdx) > G.view.w / 2 - 20 || Math.abs(tdy) > G.view.h / 2 - 20) {
        var ta = Math.atan2(tdy, tdx), tmx = W / 2 - 60, tmy = H / 2 - 120, tsc = Math.min(tmx / Math.abs(Math.cos(ta) || 1e-6), tmy / Math.abs(Math.sin(ta) || 1e-6));
        var tax = W / 2 + Math.cos(ta) * tsc, tay = H / 2 + Math.sin(ta) * tsc, low = G.breach || G.tdanger;
        c.save(); c.translate(tax, tay); c.rotate(ta);
        c.fillStyle = low && Math.sin(rt * 12) > 0 ? '#e0533d' : '#e2a63a'; c.strokeStyle = '#fff'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(16, 0); c.lineTo(-9, -11); c.lineTo(-3, 0); c.lineTo(-9, 11); c.closePath(); c.stroke(); c.fill(); c.restore();
        otxt(c, low ? '师傅危险！' : '师傅', tax - Math.cos(ta) * 40, tay - Math.sin(ta) * 40, 13, low ? '#c0392b' : T.ink, 'center', true);
      }
    }
  }

  /* ================= 各个界面 ================= */
  function dim(c, app, a) { c.fillStyle = 'rgba(255,252,240,' + a + ')'; c.fillRect(0, 0, app.lw, app.lh); }

  // 自动换行的小文字（中文逐字换）
  // v0.7.0n 折行规则：数字 / 百分号 / 小数点不拆开，标点（，。、；：！？）」%）不出现在行首，（「 不留在行尾
  var NOSTART = /[，。、；：！？）」』】》,.;:!?)%％·…~]/, NUMCH = /[0-9.%％×+\-]/, NOEND = /[（「『【《(]/, ALNUM = /[A-Za-z0-9]/;
  function badBreak(s, m) {                               // 在 s[m-1] | s[m] 之间断开是否难看
    var a = s[m - 1], b = s[m];
    return NOSTART.test(b) || NOEND.test(a) || (NUMCH.test(a) && NUMCH.test(b)) || (ALNUM.test(a) && ALNUM.test(b)) || (/[0-9]/.test(a) && /[天秒级点层阶倍张只个次格发枚条人]/.test(b));
  }
  function breakAt(c, s, maxW) {                          // 返回这一行放得下的字数（≥1），并避开不该断的位置
    var n = 1; while (n < s.length && c.measureText(s.slice(0, n + 1)).width <= maxW) n++;
    if (n >= s.length) return n;
    var m = n, tries = 0;
    while (m > 1 && tries < 10 && badBreak(s, m)) { m--; tries++; }
    return tries >= 10 ? n : m;
  }
  function wrapLines(c, s, maxW) {
    var out = [], rest = XY.fmtStr(s);
    while (rest.length) { if (c.measureText(rest).width <= maxW) { out.push(rest); break; } var k = breakAt(c, rest, maxW); out.push(rest.slice(0, k)); rest = rest.slice(k).replace(/^\s+/, ''); }
    return out;
  }
  function wrap(c, s, cx, y, maxW, sz, lh, color, maxLines) {
    c.font = font(sz, false); c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
    var lines = wrapLines(c, s, maxW);
    for (var i = 0; i < lines.length && (!maxLines || i < maxLines); i++) c.fillText(lines[i], cx, y + i * lh);
  }

  // 把文字截短到放得下
  function fit(c, str, maxW) {
    if (c.measureText(str).width <= maxW) return str;
    while (str.length > 1 && c.measureText(str + '…').width > maxW) str = str.slice(0, -1);
    return str + '…';
  }

  function drawNode(c, G, app, hi, n, x, y, w, h, color, rects) {
    var st = XY.nodeStatus(G, hi, n.id), lv = st.lv, mouse = app.mouse;
    var hov = mouse && mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
    var locked = st.st === 'locked', maxed = st.st === 'max', can = st.st === 'ok';
    rrect(c, x, y, w, h, 10);
    c.fillStyle = lv > 0 ? '#fff6dc' : (locked ? '#eceae4' : (hov ? '#fff8e6' : '#fffdf6')); c.fill();
    c.lineWidth = maxed ? 3.5 : (can ? 3 : 2);
    c.strokeStyle = maxed ? '#e0a415' : (can ? '#43a047' : (lv > 0 ? color : (locked ? '#cfc9bb' : '#b9a77a')));
    if (hov) c.lineWidth += 1.5;
    c.stroke();
    c.font = font(14, true);
    txt(c, fit(c, n.name, w - 20 - n.max * 13), x + 9, y + 16, 14, locked && lv === 0 ? '#9a9486' : T.ink, 'left', true);
    for (var k = 0; k < n.max; k++) {                      // 等级点
      c.beginPath(); c.arc(x + w - 11 - (n.max - 1 - k) * 13, y + 16, 4.6, 0, PI2);
      c.fillStyle = k < lv ? (maxed ? '#e0a415' : color) : 'rgba(0,0,0,0.08)'; c.fill();
      c.lineWidth = 1; c.strokeStyle = '#a89d7e'; c.stroke();
    }
    c.font = font(11.5, false);
    var eff = lv > 0 ? XY.nodeText(n, lv) : (n.desc ? n.desc[0] : n.eff(1));
    txt(c, fit(c, (lv > 0 ? '' : '一级：') + eff, w - 14), x + 8, y + 37, 11.5, locked && lv === 0 ? '#aaa598' : T.inkSoft, 'left', false);
    c.font = font(11.5, true);
    var line, col;
    if (maxed) { line = '已满级'; col = '#b8860b'; }
    else if (can) { line = '点击学习 · 花 ' + st.cost + ' 点'; col = '#2e7d32'; }
    else if (st.st === 'nopts') { line = '差 ' + (st.cost - G.points) + ' 点技能点'; col = '#9a6a1a'; }
    else { line = '🔒 ' + st.reason; col = '#a0705a'; }
    txt(c, fit(c, line, w - 14), x + 8, y + h - 12, 11.5, col, 'left', true);
    if (!(app.skillTabDead)) ui.hits.push({ x: x, y: y, w: w, h: h, act: 'node', hero: hi, id: n.id });
    rects.push({ x: x, y: y, w: w, h: h, n: n, st: st, hov: hov });
  }

  function drawSkills(c, G, app) { return XY.R4.skills(c, G, app); }
  function drawSkillsOld(c, G, app) {
    var W = app.lw, H = app.lh, rt = app.rt, mouse = app.mouse, i, h;
    dim(c, app, 0.66);
    ui.hits.length = 0;                                      // 面板下面的 HUD 按钮不要被点到
    var pw = Math.min(1080, W - 20), ph = Math.min(650, H - 16), px = (W - pw) / 2, py = (H - ph) / 2;
    panel(c, px, py, pw, ph, 18, 'rgba(255,253,246,0.99)', '#d9a21a');
    var tab = app.skillTab; if (tab < 5 && G.heroes[tab].down) tab = app.skillTab = 5;
    // 标题行
    txt(c, '技能树', px + 22, py + 30, 28, '#b8300f', 'left', true);
    rrect(c, px + 128, py + 12, 190, 36, 18); c.fillStyle = G.points > 0 ? '#ffd86a' : '#ece6d2'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#c78a1e'; c.stroke();
    txt(c, '可用技能点：' + G.points, px + 223, py + 31, 17, T.ink, 'center', true);
    var msg = app.skillMsg && app.skillMsg.until > rt ? app.skillMsg : null;
    if (msg) txt(c, msg.text, px + 332, py + 31, 15, msg.bad ? '#c0392b' : '#2e7d32', 'left', true);
    else txt(c, '技能点全队共用，可投给任何活着的英雄', px + 332, py + 31, 12.5, T.inkSoft, 'left', false);
    var cbw = 92, abw = 168;
    var cx0 = px + pw - cbw - 14, ax0 = cx0 - abw - 10;
    btnS(c, app, ax0, py + 12, abw, 36, '自动加点：' + (G.autoPoints ? '开' : '关'), 'autopts', G.autoPoints);
    btnS(c, app, cx0, py + 12, cbw, 36, '关闭 Tab', 'closeSkills', false, true);

    // 标签页
    var tw = (pw - 28 - 5 * 6) / 6, ty = py + 58, th = 46;
    for (i = 0; i < 6; i++) {
      var tx = px + 14 + i * (tw + 6), hd = i < 5 ? G.heroes[i] : null, dead = hd && hd.down, act = tab === i;
      var thov = !dead && mouse && mouse.x >= tx && mouse.x <= tx + tw && mouse.y >= ty && mouse.y <= ty + th;
      rrect(c, tx, ty, tw, th, 10);
      c.fillStyle = dead ? '#dedbd3' : (act ? '#fff3cf' : (thov ? '#fff8e6' : '#faf5e8')); c.fill();
      c.lineWidth = act ? 3.5 : 1.8; c.strokeStyle = dead ? '#b0ac9f' : (act ? (hd ? hd.def.color : '#d9a21a') : '#cdbf9c'); c.stroke();
      c.fillStyle = act ? '#8a5a10' : '#8a7d63'; c.beginPath(); c.arc(tx + 11, ty + 11, 8, 0, PI2); c.fill();
      txt(c, String(i + 1 > 5 ? 6 : i + 1), tx + 11, ty + 12, 11, '#fff', 'center', true);
      if (hd) {
        c.save(); if (dead) c.globalAlpha = 0.35; drawHeroShape(c, hd.def, tx + 38, ty + 25, 13); c.restore();
        txt(c, hd.def.name, tx + 58, ty + 17, 15, dead ? '#8a8578' : T.ink, 'left', true);
        if (dead) txt(c, '阵亡', tx + 58, ty + 34, 12, '#b3402e', 'left', true);
        else txt(c, '已投 ' + XY.heroSpent(hd) + ' 点 · 辅助 ' + XY.supportCount(hd) + '/' + XY.MAX_SUPPORTS, tx + 58, ty + 34, 11, T.inkSoft, 'left', false);
      } else {
        txt(c, '全队 · 营地', tx + tw / 2 + 8, ty + 18, 15, T.ink, 'center', true);
        txt(c, '大家一起变强', tx + tw / 2 + 8, ty + 35, 11, T.inkSoft, 'center', false);
      }
      if (!dead) ui.hits.push({ x: tx, y: ty, w: tw, h: th, act: 'tab', i: i });
    }

    // 技能节点
    var rects = [], bx = px + 24, by = py + 120, bw = pw - 48;
    var detH = 104, bh = ph - 120 - detH - 18;
    if (tab < 5) {
      h = G.heroes[tab]; var d = h.def, tr = XY.TREE[h.id], col = d.color;
      var nw = Math.min(150, Math.floor((bw - 128) / 6)), nh = 66, gx = 34, y0 = by + 26;
      txt(c, '主技能：' + d.weapon + '   已达 ' + h.wlv + ' 阶', bx, by + 6, 15, d.dark, 'left', true);
      var c0 = bx, c1 = bx + nw + gx, c2 = bx + 2 * (nw + gx), midY = y0 + (nh + 18) / 2;
      var P = { m1: [c0, midY], m2: [c1, midY], ma: [c2, y0], mb: [c2, y0 + nh + 18] };
      // 连线
      c.strokeStyle = '#b9a77a'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(c0 + nw, midY + nh / 2); c.lineTo(c1, midY + nh / 2);
      c.moveTo(c1 + nw, midY + nh / 2); c.lineTo(c1 + nw + gx / 2, midY + nh / 2);
      c.moveTo(c1 + nw + gx / 2, y0 + nh / 2); c.lineTo(c1 + nw + gx / 2, y0 + nh + 18 + nh / 2);
      c.moveTo(c1 + nw + gx / 2, y0 + nh / 2); c.lineTo(c2, y0 + nh / 2);
      c.moveTo(c1 + nw + gx / 2, y0 + nh + 18 + nh / 2); c.lineTo(c2, y0 + nh + 18 + nh / 2); c.stroke();
      ['m1', 'm2', 'ma', 'mb'].forEach(function (id) { drawNode(c, G, app, tab, tr.by[id], P[id][0], P[id][1], nw, nh, col, rects); });
      txt(c, '二选一', c2 + nw / 2, y0 + nh + 9, 11, '#b8300f', 'center', true);
      // 左下：英雄现状
      var sy0 = y0 + 2 * nh + 18 + 18;
      if (sy0 + 90 < by + bh) {
        rrect(c, bx, sy0, 3 * nw + 2 * gx, by + bh - sy0, 12); c.fillStyle = 'rgba(248,242,225,0.9)'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#d6c79f'; c.stroke();
        drawHeroShape(c, d, bx + 40, sy0 + 44, 24);
        var m = h.mod, ln = [
          '生命 ' + Math.ceil(h.hp) + ' / ' + h.maxHp + '    移速 ' + Math.round(h.speed),
          '攻速 ×' + (1 / (m.atkSpd || 1)).toFixed(2) + '    暴击 ' + Math.round(m.crit * 100) + '%    减伤 ' + Math.round((1 - m.dr) * 100) + '%',
          '大招 ' + d.ult + '：冷却 ' + XY.ultCdOf(G, h).toFixed(0) + ' 秒，威力 ×' + m.ultPow.toFixed(2)
        ];
        for (i = 0; i < ln.length; i++) txt(c, ln[i], bx + 84, sy0 + 20 + i * 22, 13, T.ink, 'left', false);
        txt(c, '当前命令：' + (G.ctrl === tab ? '手动操控' : XY.ORDER_NAME[h.order]), bx + 84, sy0 + 20 + 3 * 22, 13, '#3d6288', 'left', true);
      }
      // 右：辅助
      var rx0 = bx + 3 * nw + 2 * gx + 40, sw = nw;
      txt(c, '辅助技能（最多 ' + XY.MAX_SUPPORTS + ' 种）已学 ' + XY.supportCount(h) + '/' + XY.MAX_SUPPORTS, rx0, by + 6, 15, d.dark, 'left', true);
      var sup = tr.nodes.filter(function (n) { return n.kind === 'support'; });
      for (i = 0; i < sup.length; i++) drawNode(c, G, app, tab, sup[i], rx0 + (i % 3) * (sw + 10), y0 + Math.floor(i / 3) * (nh + 14), sw, nh, col, rects);
      txt(c, '辅助 2 级要先学主技能一阶，3 级要先学二阶。绿框＝可学　金框＝满级　灰＝锁定', rx0, y0 + 3 * (nh + 14) + 2, 12, T.inkSoft, 'left', false);
    } else {
      txt(c, '全队 · 营地强化（不占英雄的技能位，所有人受益）', bx, by + 6, 15, '#8a5a10', 'left', true);
      var pn = XY.PARTY_NODES, pnw = Math.floor((bw - 4 * 12) / 5), pnh = 76;
      for (i = 0; i < pn.length; i++) drawNode(c, G, app, -1, pn[i], bx + (i % 5) * (pnw + 12), by + 28 + Math.floor(i / 5) * (pnh + 14), pnw, pnh, '#d9a21a', rects);
    }

    // 详情栏（鼠标放在哪个节点上就讲哪个）
    var dy = py + ph - detH - 12, dx = px + 14, dw = pw - 28;
    rrect(c, dx, dy, dw, detH, 12); c.fillStyle = 'rgba(250,244,226,0.95)'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#d6c79f'; c.stroke();
    var hv = null; for (i = 0; i < rects.length; i++) if (rects[i].hov) hv = rects[i];
    if (hv) {
      var n = hv.n, st = hv.st, kindName = n.kind === 'main' ? '主技能' : (n.kind === 'support' ? '辅助技能' : '全队');
      txt(c, n.name, dx + 16, dy + 20, 19, T.ink, 'left', true);
      txt(c, kindName + ' · 等级 ' + st.lv + ' / ' + n.max + (n.branch ? ' · 二选一的分支 ' + n.branch : ''), dx + 16 + c.measureText(n.name).width * 1.15 + 20, dy + 21, 13, T.inkSoft, 'left', false);
      txt(c, '现在：' + (st.lv > 0 ? XY.nodeText(n, st.lv) : '（还没学）'), dx + 16, dy + 46, 14, T.ink, 'left', false);
      txt(c, '下一级：' + (st.lv < n.max ? XY.nodeText(n, st.lv + 1) + '（花 ' + n.cost[st.lv] + ' 点技能点）' : '已经满级了'), dx + 16, dy + 68, 14, '#8a5a10', 'left', true);
      var okk = st.st === 'ok';
      txt(c, okk ? '✔ 点击就能学' : (st.st === 'max' ? '已满级' : '✘ ' + st.reason), dx + 16, dy + 90, 13.5, okk ? '#2e7d32' : (st.st === 'max' ? '#b8860b' : '#b5503a'), 'left', true);
    } else {
      txt(c, '把鼠标放到技能上看详细效果；点一下花技能点学习。', dx + 16, dy + 30, 15, T.ink, 'left', false);
      txt(c, '数字键 1-5 切换英雄页，6 是全队页；Tab / Esc 关闭，关闭后游戏继续。', dx + 16, dy + 56, 14, T.inkSoft, 'left', false);
      txt(c, '自动加点：打开后，升级的技能点会自动投给当前最需要的英雄（你也可以随时自己加）。', dx + 16, dy + 80, 14, T.inkSoft, 'left', false);
    }
  }

  function btnS(c, app, x, y, w, h, label, act, on, primary) {
    if (XY.ui2 && XY.ui2.on) { var gg = XY.ui2.grow(app, x, y, w, h); x = gg[0]; y = gg[1]; w = gg[2]; h = gg[3]; }
    var hov = app.mouse && app.mouse.x >= x && app.mouse.x <= x + w && app.mouse.y >= y && app.mouse.y <= y + h;
    if (XY.ui2 && XY.ui2.on) { XY.ui2.pill(c, x, y, w, h, label, { on: on, primary: primary, hov: hov, size: 15 }); ui.hits.push({ x: x, y: y, w: w, h: h, act: act }); return; }
    rrect(c, x, y, w, h, 12); c.fillStyle = on ? '#cfeccb' : (primary ? (hov ? '#ffb347' : '#ffc46b') : (hov ? '#fff3d6' : '#ffffff')); c.fill();
    c.lineWidth = 2.2; c.strokeStyle = on ? '#43a047' : '#b9a77a'; c.stroke();
    txt(c, label, x + w / 2, y + h / 2 + 1, 15, T.ink, 'center', true);
    ui.hits.push({ x: x, y: y, w: w, h: h, act: act });
  }

  function drawPause(c, G, app) {
    if (XY.ov) return XY.ov.pause(c, G, app);
    var W = app.lw, H = app.lh, y0 = H / 2 - 200;
    dim(c, app, 0.6);
    panel(c, W / 2 - 200, y0, 400, 410, 20, 'rgba(255,255,255,0.95)', '#d9a21a');
    txt(c, '已暂停', W / 2, y0 + 48, 40, T.ink, 'center', true);
    btn(c, app, W / 2 - 110, y0 + 98, 220, 52, '继续（Esc / P）', 'resume', { primary: true });
    btn(c, app, W / 2 - 110, y0 + 162, 220, 52, '重新开始（R）', 'restart');
    btn(c, app, W / 2 - 110, y0 + 226, 220, 52, '回到首页', 'home');
    if (XY.inkBg) XY.inkBg();
    txt(c, '现在 ' + XY.fmtTime(G.t) + '  ·  ' + G.level + ' 级  ·  击杀 ' + G.kills, W / 2, y0 + 360, 14, T.inkSoft, 'center', false);
    var mn = G.t / 60;                                                      // 从局内 HUD 挪过来的成长说明
    txt(c, '小怪 +' + Math.round(C.ENEMY_SCALE * mn * 100) + '%（每分钟 +1%）· BOSS +' + Math.round(C.BOSS_SCALE * mn * 100) + '%（每分钟 +5%）', W / 2, y0 + 384, 12, '#8a4a05', 'center', false);
  }

  function drawEnd(c, G, app, win) { return XY.R4.end(c, G, app, win); }
  function drawEndOld(c, G, app, win) {
    var W = app.lw, H = app.lh, cause = G.ending && G.ending.cause;
    dim(c, app, 0.68);
    var rep0 = G.runReport || {}, nu = (rep0.newUnlocks || []).map(function (id) { return XY.UNLOCK_BY[id].name; });
    var ph = 530, py = Math.max(6, H / 2 - ph / 2);
    panel(c, W / 2 - 270, py, 540, ph, 22, 'rgba(255,255,255,0.97)', win ? '#d9a21a' : '#c0392b');
    txt(c, win ? '取经成功！' : (cause === 'tang' ? '师傅阵亡' : '基地被入侵'), W / 2, py + 52, 50, win ? '#c8860a' : '#c0392b', 'center', true);
    txt(c, '取经' + (win ? '成功' : '失败'), W / 2, py + 92, 16, T.inkSoft, 'center', false);
    var why = G.ending && (G.ending.why || G.ending.reason), reason = win ? '牛魔王被打倒了，经书和师傅都平安！' : (why ? '死因：' + why : '再试一次吧');
    wrap(c, reason, W / 2, py + 124, 480, 19, 26, win ? T.ink : '#a8321f', 2);
    var dead = G.heroes.filter(function (h) { return h.down; }).map(function (h) { return h.def.name; });
    var tg = G.heroes[0];
    var rows = [['坚持时间', XY.fmtTime(G.t)], ['等级 / 技能点', G.level + ' 级 · 未用 ' + G.points + ' 点'], ['击杀妖怪', G.kills + ' 只'],
      ['阵亡英雄', dead.length ? dead.join('、') : '无'], ['营地血量', Math.ceil(G.camp.hp) + ' / ' + G.camp.maxHp], ['唐僧', '只有 1 点血，一碰就倒']];
    rows.push(['本局法宝', (G.cardLog ? G.cardLog.length : 0) + ' 张（已收进收藏）']);
    for (var i = 0; i < rows.length; i++) {
      txt(c, rows[i][0], W / 2 - 140, py + 190 + i * 30, 17, T.inkSoft, 'left', false);
      var vs = 17; c.font = 'bold 17px sans-serif'; if (c.measureText(rows[i][1]).width > 190) vs = 13;   // 值太长就缩小，别压住左边的名字
      txt(c, rows[i][1], W / 2 + 140, py + 190 + i * 30, vs, T.ink, 'right', true);
    }
    if (nu.length) { var uy = py + 190 + rows.length * 30 + 4; txt(c, '★ 新解锁：' + nu.join('、'), W / 2, uy, 15, '#2f7d3b', 'center', true); }
    btn(c, app, W / 2 - 225, py + ph - 84, 210, 54, '再来一局（R）', 'restart', { primary: true });
    btn(c, app, W / 2 + 15, py + ph - 84, 210, 54, '回到首页', 'home');
  }

  /* ================= 总入口 ================= */
  // app: { screen, lw, lh, zoom, dpr, rt, mouse, fps, showFps }
  XY.R = { T: T, wrapLines: wrapLines, breakAt: breakAt, font: font, txt: txt, otxt: otxt, rrect: rrect, panel: panel, bar: bar, btn: btn, btnS: btnS, wrap: wrap, dim: dim, drawCardMini: drawCardMini, drawHeroShape: drawHeroShape, btnS2: null, hpColor: hpColor, drawCardsHUD: drawCardsHUD, drawCard: null };
  XY.render = function (ctx, G, app) {
    if (XY.portraitHint) XY.portraitHint();
    ui.hits.length = 0; if (ui.ovBtns) ui.ovBtns.length = 0; XY.R4.lblReset();
    var z = app.zoom * app.dpr;
    ctx.setTransform(z, 0, 0, z, 0, 0);
    ctx.lineCap = 'butt';
    ctx.fillStyle = (app.screen === 'play' || app.screen === 'pause') ? T.outside : '#f4ead4'; ctx.fillRect(0, 0, app.lw, app.lh);

    var s = app.screen, snap = !!(XY.ov && XY.ov.ready(G, app));        // v0.7.0l：弹层打开时背景只在打开那一刻拍一张糊图，之后不再每帧重画世界 + HUD
    if (s === 'start' && window.XY_SPLIT_ENTRY && (!XY.lazy || XY.lazy.state !== 'done')) { XY.screens.draw(ctx, G, app); return; }
    if (snap) XY.ov.drawSnap(ctx, app, G.cardOffer ? 0.26 : null);
    else {
    // 世界（带镜头抖动）。满员时把整队放进顶栏和底栏之间，暂停模拟也要摆正镜头。
    if (G && G.heroes && G.heroes.length >= 9 && XY.frameParty) XY.frameParty(G);
    ctx.save();
    var v = G.view, camx = G.cam.x, camy = G.cam.y;
    var sh = G.shake > 0 ? G.shake : 0, shx = (Math.random() - 0.5) * sh, shy = (Math.random() - 0.5) * sh;
    var worldZoom = (app.lh > app.lw * 1.05 && (s === 'play' || s === 'pause')) ? 2 : 1;
    XY._worldZoom = worldZoom;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    if (worldZoom > 1) { ctx.translate(v.w / 2, v.h / 2); ctx.scale(worldZoom, worldZoom); ctx.translate(-v.w / 2, -v.h / 2); }
    ctx.translate(v.w / 2 - camx + shx, v.h / 2 - camy + shy);
    if (XY.ui2) XY.ui2.world = true;
    try { drawWorld(ctx, G, app.rt); } finally { if (XY.ui2) XY.ui2.world = false; }
    ctx.restore();

    if (s === 'start' || s === 'deck' || s === 'dex' || s === 'unlock' || s === 'levels' || s === 'shop' || s === 'dungeon' || s === 'villain' || s === 'board' || s === 'hub') { XY.screens.draw(ctx, G, app); return; }
    if (XY.ultscene && s === 'play') XY.ultscene.drawScreen(ctx, G, app);
    if (XY.portraitHint) XY.portraitHint();
    if (!XY.noHudShot) drawHUD(ctx, G, app);                                 // XY.noHudShot：只给截图 / 设计稿用（拿干净的战场）
    if (G.cut && s === 'play' && XY.cutin) XY.cutin.draw(ctx, G, app);
    if (XY.R4.fxHud && (s === 'play' || s === 'pause')) XY.R4.fxHud(ctx, G, app);
    if (XY.fork && s === 'play') XY.fork.drawUI(ctx, G, app);                 // v0.8.4：分岔路线的选路卡（顶部居中，手机直接点）
    if (XY.animScreen && G && s === 'play') { XY.R4.clipOutTop(ctx, app); XY.animScreen(ctx, G, app); ctx.restore(); }          // v0.7.0n：屏幕级特效不盖顶部细条 / 通知 / 连杀
    if (s === 'play' && XY.R4.joy && !XY.noHudShot) XY.R4.joy(ctx, app);
    if (XY.ov && XY.ov.wants(G, app)) { XY.ov.capture(ctx, G, app); XY.ov.drawSnap(ctx, app, G.cardOffer ? 0.26 : null); }
    }
    if (G.mode === 'skills' && s === 'play') drawSkills(ctx, G, app);
    else if (G.mode === 'cards' && s === 'play') XY.drawCardOffer(ctx, G, app);
    else if (G.mode === 'vendor' && s === 'play') XY.vendor.draw(ctx, G, app);
    else if (s === 'pause') { ui.hits.length = 0; drawPause(ctx, G, app); }
    else if (s === 'win') { ui.hits.length = 0; drawEnd(ctx, G, app, true); }
    else if (s === 'lose') { ui.hits.length = 0; drawEnd(ctx, G, app, false); }
    if (G.tut && G.mode === 'skills' && s === 'play' && XY.tutDraw) XY.tutDraw(ctx, G, app);   // 修行面板盖住战场后，再把教程洞和「下一步」画在真实按钮上
  };
})();
