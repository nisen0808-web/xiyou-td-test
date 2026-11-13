/* ============================================================
 * terrain.js —— v0.5 浅色地形：分块预渲染 + 西行道路（与逻辑共用 G.rt 路线数据）
 *  - 世界切成 512×512 的图块，第一次进入镜头时画到离屏画布缓存，之后每帧只 drawImage（不再逐个画草丛）
 *  - 三套浅色主题：bamboo 黑风山（竹林 / 溪水 / 小桥）、ochre 平顶山（浅赭 / 奶油岩石）、apricot 火焰山（杏黄 / 珊瑚 / 淡蓝薄雾）
 *  - 道路沿 G.rt.pts 折线；唐僧走过的那一段盖一层淡金色（动态，只画折线）
 *  - 全程浅色，没有黑色；不使用 shadowBlur
 * ============================================================ */
(function () {
  var XY = window.XY, C = XY.C, PI2 = Math.PI * 2, TS = 512;
  var THEMES = {
    bamboo:  { base: '#e3f0cf', alt: '#d9ead0', patch: '#cfe6bd', road: '#f3e7bf', edge: '#d8c68e', water: '#bfe6ef', waterEdge: '#9ccfdc', deco: 'bamboo', mist: null },
    ochre:   { base: '#f1e6c9', alt: '#ecdcb8', patch: '#e6d3a8', road: '#fbf1d8', edge: '#d9c08a', water: '#cfe9ee', waterEdge: '#a8d2da', deco: 'rock', mist: null },
    cave:    { base: '#e9e7e1', alt: '#e0ded8', patch: '#d7d5ce', road: '#f6f1e4', edge: '#bdb5a2', water: '#cfe3ea', waterEdge: '#a8c8d4', deco: 'rock', mist: null },       // v0.8.4 洞府副本：浅灰石色（仍是亮色，只是换了配色，不是新美术）
    apricot: { base: '#fbe6d0', alt: '#f8dcc2', patch: '#f6d2b6', road: '#fff0dc', edge: '#e6b99a', water: '#cdeaf5', waterEdge: '#a6d4e8', deco: 'coral', mist: 'rgba(190,226,245,0.28)' }
  };
  XY.TERRAIN_THEMES = THEMES;
  var cache = {}, cacheKey = null;
  function themeOf(G) { return THEMES[(G.lv && G.lv.theme)] || THEMES.bamboo; }

  function pathRoute(c, R, ox, oy) {
    c.beginPath(); c.moveTo(R.pts[0].x - ox, R.pts[0].y - oy);
    for (var i = 1; i < R.pts.length; i++) c.lineTo(R.pts[i].x - ox, R.pts[i].y - oy);
  }
  // 溪水：一条越过全图的弯曲溪流（每关一条，位置按关卡定），道路穿过处画小桥
  function streamPts(G) {
    var yb = [1050, 2500, 800][(G.levelId || 1) - 1] || 1050, pts = [], i;
    for (i = 0; i <= 40; i++) { var x = i * C.WORLD_W / 40; pts.push({ x: x, y: yb + Math.sin(x / 480 + G.levelId) * 150 + Math.sin(x / 190) * 40 }); }
    return pts;
  }
  function tileKey(G, ix, iy) { return G.levelId + ':' + ix + ':' + iy; }

  function buildTile(G, ix, iy) {
    if (XY.inkBg()) return buildInkTile(G, ix, iy);
    var th = themeOf(G), R = G.rtN || G.rt, cv = document.createElement('canvas'); cv.width = TS * 2; cv.height = TS * 2;
    var c = cv.getContext('2d'); c.setTransform(2, 0, 0, 2, 0, 0); var ox = ix * TS, oy = iy * TS, rnd = XY.seeded(9173 + ix * 131 + iy * 977 + G.levelId * 31), i;
    c.fillStyle = th.base; c.fillRect(0, 0, TS, TS);
    for (i = 0; i < 9; i++) { c.fillStyle = (i & 1) ? th.alt : th.patch; c.globalAlpha = 0.55; c.beginPath(); c.ellipse(rnd() * TS, rnd() * TS, 60 + rnd() * 120, 40 + rnd() * 80, rnd() * 3, 0, PI2); c.fill(); }
    c.globalAlpha = 1;
    // 溪水
    if (th.deco === 'bamboo' || th.deco === 'rock' || th.deco === 'coral') {
      var sp = streamPts(G); c.lineJoin = 'round'; c.lineCap = 'round';
      c.strokeStyle = th.waterEdge; c.lineWidth = 46; c.beginPath(); sp.forEach(function (p, k) { k ? c.lineTo(p.x - ox, p.y - oy) : c.moveTo(p.x - ox, p.y - oy); }); c.stroke();
      c.strokeStyle = th.water; c.lineWidth = 36; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 3; c.setLineDash([22, 30]); c.stroke(); c.setLineDash([]);
    }
    // 道路：外缘 + 路面 + 中线车辙
    c.lineJoin = 'round'; c.lineCap = 'round';
    pathRoute(c, R, ox, oy); c.strokeStyle = th.edge; c.lineWidth = 92; c.stroke();
    pathRoute(c, R, ox, oy); c.strokeStyle = th.road; c.lineWidth = 78; c.stroke();
    pathRoute(c, R, ox, oy); c.strokeStyle = 'rgba(214,190,130,0.45)'; c.lineWidth = 3; c.setLineDash([16, 22]); c.stroke(); c.setLineDash([]);
    // 小桥：溪水与道路相交处
    var sp2 = streamPts(G);
    for (i = 1; i < sp2.length; i++) {
      var pr = XY.routeProject(R, sp2[i].x, sp2[i].y);
      if (pr.d < 70) {
        var bp = XY.routeAt(R, pr.s), bx = bp.x - ox, by = bp.y - oy;
        if (bx < -80 || bx > TS + 80 || by < -80 || by > TS + 80) continue;
        c.save(); c.translate(bx, by); c.rotate(bp.a); c.fillStyle = '#f4dcae'; c.strokeStyle = '#c9a76a'; c.lineWidth = 3;
        c.fillRect(-30, -50, 60, 100); c.strokeRect(-30, -50, 60, 100);
        c.strokeStyle = '#d8bb86'; c.lineWidth = 2; for (var q = -3; q <= 3; q++) { c.beginPath(); c.moveTo(q * 8, -50); c.lineTo(q * 8, 50); c.stroke(); }
        c.restore();
      }
    }
    // 装饰（避开道路与溪水）
    var n = 34;
    for (i = 0; i < n; i++) {
      var lx = rnd() * TS, ly = rnd() * TS, wx = ox + lx, wy = oy + ly, k2 = rnd(), s = 0.7 + rnd() * 0.8;
      if (XY.routeProject(R, wx, wy).d < 70) continue;
      var near = false; for (var z = 0; z < sp2.length; z += 2) if (Math.abs(sp2[z].x - wx) < 80 && Math.abs(sp2[z].y - wy) < 60) { near = true; break; }
      if (near) continue;
      drawDeco(c, th.deco, lx, ly, s, k2);
    }
    if (th.mist) { for (i = 0; i < 3; i++) { c.fillStyle = th.mist; c.beginPath(); c.ellipse(rnd() * TS, rnd() * TS, 110 + rnd() * 90, 26 + rnd() * 18, 0, 0, PI2); c.fill(); } }
    return cv;
  }
  function drawDeco(c, kind, x, y, s, k) {
    c.lineCap = 'round';
    if (kind === 'bamboo') {
      if (k < 0.55) {                                   // 竹丛：几根竹竿 + 叶
        for (var j = -1; j <= 1; j++) { c.strokeStyle = '#8fc78a'; c.lineWidth = 4 * s; c.beginPath(); c.moveTo(x + j * 9 * s, y); c.lineTo(x + j * 9 * s + j * 3, y - 46 * s); c.stroke();
          c.strokeStyle = '#6fb06a'; c.lineWidth = 1.5; for (var m = 1; m < 3; m++) { c.beginPath(); c.moveTo(x + j * 9 * s - 4, y - m * 16 * s); c.lineTo(x + j * 9 * s + 4, y - m * 16 * s); c.stroke(); }
          c.fillStyle = '#a9dc9d'; c.beginPath(); c.ellipse(x + j * 9 * s + 8, y - 44 * s, 11 * s, 4 * s, -0.5, 0, PI2); c.fill(); c.beginPath(); c.ellipse(x + j * 9 * s - 8, y - 38 * s, 10 * s, 3.5 * s, 0.5, 0, PI2); c.fill(); }
      } else if (k < 0.8) { c.fillStyle = '#cfe2c0'; c.strokeStyle = '#b4cf9f'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(x, y, 16 * s, 10 * s, 0, 0, PI2); c.fill(); c.stroke(); }
      else { c.fillStyle = '#fff6d6'; for (var f = 0; f < 5; f++) { c.beginPath(); c.arc(x + Math.cos(f * 1.256) * 4 * s, y + Math.sin(f * 1.256) * 4 * s, 2.6 * s, 0, PI2); c.fill(); } c.fillStyle = '#f7b6c8'; c.beginPath(); c.arc(x, y, 2.2 * s, 0, PI2); c.fill(); }
    } else if (kind === 'rock') {                         // 平顶山：奶油色平顶岩
      if (k < 0.6) { c.fillStyle = '#fff5dc'; c.strokeStyle = '#dcc79a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 24 * s, y + 8 * s); c.lineTo(x - 18 * s, y - 20 * s); c.lineTo(x + 16 * s, y - 22 * s); c.lineTo(x + 26 * s, y + 8 * s); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#f6e6bf'; c.beginPath(); c.moveTo(x - 24 * s, y + 8 * s); c.lineTo(x - 14 * s, y - 2 * s); c.lineTo(x + 20 * s, y - 2 * s); c.lineTo(x + 26 * s, y + 8 * s); c.closePath(); c.fill(); }
      else { c.strokeStyle = '#d6c08a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 7, y); c.lineTo(x - 3, y - 9 * s); c.moveTo(x, y); c.lineTo(x, y - 12 * s); c.moveTo(x + 7, y); c.lineTo(x + 3, y - 9 * s); c.stroke(); }
    } else {                                              // 火焰山：杏黄地 + 珊瑚岩
      if (k < 0.5) { c.fillStyle = '#ffc9b0'; c.strokeStyle = '#eb9f84'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 16 * s, y + 6 * s); c.lineTo(x - 8 * s, y - 24 * s); c.lineTo(x, y - 8 * s); c.lineTo(x + 10 * s, y - 30 * s); c.lineTo(x + 18 * s, y + 6 * s); c.closePath(); c.fill(); c.stroke(); }
      else if (k < 0.8) { c.fillStyle = '#ffe3b8'; c.strokeStyle = '#f1c58a'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(x, y, 15 * s, 9 * s, 0, 0, PI2); c.fill(); c.stroke(); }
      else { c.strokeStyle = '#f2a98f'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 18 * s); c.moveTo(x, y - 10 * s); c.lineTo(x + 8 * s, y - 18 * s); c.moveTo(x, y - 7 * s); c.lineTo(x - 7 * s, y - 14 * s); c.stroke(); }
    }
  }


  /* ---------- v0.6.4 水墨山水背景（默认）：宣纸浅色 + 淡墨层叠远山 + 薄雾 + 稀疏松竹；同样分块预渲染，每帧只 drawImage ----------
   * 背景固定为浅色水墨。旧档如果存过 xy_bg=classic，读到时改写成 ink。暂停菜单不再提供彩色选项。
   * 画法：每块图块只画“宣纸底 → 附近 3×3 个单元里的远山（用单元坐标做种子，所以跨块接缝连续）→ 薄雾 → 溪水 → 道路 → 疏松 / 疏竹 / 墨点石”。
   * 对比度刻意压低：山 / 雾的墨色 ≤ 0.3 不透明度；道路是比纸更亮的奶白路面 + 两侧淡墨边线，单位和掉落物仍然是画面上最重的颜色。 */
  var INK = {
    bamboo:  { paper: '#f1f0e0', blot: '#e6ead2', mtn: '70,92,92',  mist: '255,255,250', road: '#fffdf3', edge: 'rgba(96,86,60,0.5)',  water: '#d4e6e6', waterEdge: 'rgba(86,120,126,0.45)', tree: '70,96,72',  deco: 'bamboo', heavy: true },
    ochre:   { paper: '#f5eedb', blot: '#eadfc4', mtn: '112,94,70', mist: '255,252,240', road: '#fffcf0', edge: 'rgba(120,96,56,0.5)', water: '#d9e8e6', waterEdge: 'rgba(96,126,126,0.45)', tree: '92,96,62',  deco: 'pine' },
    cave:    { paper: '#eeece6', blot: '#e1ded4', mtn: '86,90,98', mist: '250,250,252', road: '#fffdf5', edge: 'rgba(100,92,76,0.5)', water: '#d6e4e8', waterEdge: 'rgba(96,126,136,0.45)', tree: '84,88,84', deco: 'pine' },
    apricot: { paper: '#f8ecde', blot: '#f0dccb', mtn: '128,92,84', mist: '255,246,238', road: '#fffaf0', edge: 'rgba(140,92,66,0.5)', water: '#d8e8ee', waterEdge: 'rgba(96,126,146,0.45)', tree: '112,92,64', deco: 'pine' }
  };
  XY.inkBg = function () {
    try { if (window.localStorage.getItem('xy_bg') === 'classic') window.localStorage.setItem('xy_bg', 'ink'); } catch (e) {}
    return true;
  };
  XY.setInkBg = function () { try { window.localStorage.setItem('xy_bg', 'ink'); } catch (e) {} cache = {}; cacheKey = null; };
  function cellRnd(G, cx, cy, salt) { return XY.seeded(40009 + cx * 7919 + cy * 104729 + G.levelId * 613 + salt * 31); }
  function inkMountains(c, G, ix, iy, th) {
    for (var cy = iy - 1; cy <= iy + 1; cy++) for (var cx = ix - 1; cx <= ix + 1; cx++) {
      if (cx < -1 || cy < -1) continue;
      var rnd = cellRnd(G, cx, cy, 1); if (rnd() > 0.62) continue;
      var gx = (cx - ix) * TS + 60 + rnd() * (TS - 120), gy = (cy - iy) * TS + 200 + rnd() * (TS - 260), n = 3 + Math.floor(rnd() * 3), far = rnd() < 0.5;
      for (var layer = 0; layer < 2; layer++) {
        for (var k = 0; k < n; k++) {
          var px = gx + (k - n / 2) * (70 + rnd() * 30) + layer * 30, w = 90 + rnd() * 70, h = (layer ? 70 : 110) + rnd() * 70 + (far ? 20 : 0), by = gy + layer * 34 + rnd() * 14;
          var g = c.createLinearGradient(0, by - h, 0, by + 4), a0 = layer ? 0.22 : 0.15;
          g.addColorStop(0, 'rgba(' + th.mtn + ',' + a0 + ')'); g.addColorStop(0.75, 'rgba(' + th.mtn + ',' + a0 * 0.35 + ')'); g.addColorStop(1, 'rgba(' + th.mtn + ',0)');
          c.fillStyle = g; c.beginPath(); c.moveTo(px - w, by);
          c.quadraticCurveTo(px - w * 0.55, by - h * 0.45, px - w * 0.22, by - h * 0.78); c.lineTo(px - w * 0.06, by - h * 0.92); c.lineTo(px + w * 0.04, by - h);
          c.quadraticCurveTo(px + w * 0.3, by - h * 0.62, px + w * 0.6, by - h * 0.35); c.quadraticCurveTo(px + w * 0.85, by - h * 0.12, px + w, by); c.closePath(); c.fill();
          c.strokeStyle = 'rgba(' + th.mtn + ',' + (layer ? 0.2 : 0.12) + ')'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(px - w * 0.2, by - h * 0.75); c.quadraticCurveTo(px - w * 0.05, by - h * 0.95, px + w * 0.04, by - h); c.quadraticCurveTo(px + w * 0.32, by - h * 0.6, px + w * 0.58, by - h * 0.36); c.stroke();
          c.lineWidth = 1.2; c.strokeStyle = 'rgba(' + th.mtn + ',0.1)'; for (var q = 0; q < 3; q++) { c.beginPath(); c.moveTo(px - w * 0.1 + q * 12, by - h * 0.6 + q * 8); c.lineTo(px + w * 0.1 + q * 14, by - h * 0.4 + q * 12); c.stroke(); }
        }
        c.fillStyle = 'rgba(' + th.mist + ',' + (layer ? 0.55 : 0.5) + ')'; c.beginPath(); c.ellipse(gx + layer * 20, gy + 8 + layer * 36, 150 + n * 14, 22, 0, 0, PI2); c.fill();     // 山脚薄雾
      }
    }
  }

  function inkTree(c, kind, x, y, s, th, rnd) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (kind === 'bamboo') {
      for (var j = -1; j <= 1; j++) { var bx = x + j * 8 * s, h = (40 + rnd() * 18) * s; c.strokeStyle = 'rgba(' + th.tree + ',0.55)'; c.lineWidth = 3 * s; c.beginPath(); c.moveTo(bx, y); c.lineTo(bx + j * 2, y - h); c.stroke();
        c.strokeStyle = 'rgba(240,244,230,0.9)'; c.lineWidth = 1; for (var m = 1; m < 3; m++) { c.beginPath(); c.moveTo(bx - 3, y - m * h / 3); c.lineTo(bx + 3, y - m * h / 3); c.stroke(); }
        c.fillStyle = 'rgba(' + th.tree + ',0.45)'; c.beginPath(); c.ellipse(bx + 8 * s, y - h + 4, 9 * s, 3 * s, -0.5, 0, PI2); c.ellipse(bx - 8 * s, y - h + 12, 9 * s, 3 * s, 0.5, 0, PI2); c.fill(); }
    } else {                                                 // 松：弯干 + 两三层扁平松针
      c.strokeStyle = 'rgba(78,66,52,0.55)'; c.lineWidth = 4 * s; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - 8 * s, y - 24 * s, x + 4 * s, y - 50 * s); c.stroke();
      for (var l = 0; l < 3; l++) { c.fillStyle = 'rgba(' + th.tree + ',' + (0.4 + l * 0.05) + ')'; c.beginPath(); c.ellipse(x + (l - 1) * 5 * s, y - (22 + l * 14) * s, (22 - l * 4) * s, 6 * s, (l - 1) * 0.12, 0, PI2); c.fill(); }
    }
  }

  function buildInkTile(G, ix, iy) {
    var th = INK[(G.lv && G.lv.theme)] || INK.bamboo, R = G.rtN || G.rt, cv = document.createElement('canvas'); cv.width = TS * 2; cv.height = TS * 2;
    var c = cv.getContext('2d'); c.setTransform(2, 0, 0, 2, 0, 0); var ox = ix * TS, oy = iy * TS, rnd = XY.seeded(7311 + ix * 131 + iy * 977 + G.levelId * 31), i;
    c.fillStyle = th.paper; c.fillRect(0, 0, TS, TS);
    for (i = 0; i < 7; i++) { var bx = 40 + rnd() * (TS - 80), by = 40 + rnd() * (TS - 80), rx = Math.min(30 + rnd() * 80, bx - 4, TS - bx - 4), ry = Math.min(20 + rnd() * 50, by - 4, TS - by - 4); c.fillStyle = th.blot; c.globalAlpha = 0.5; c.beginPath(); c.ellipse(bx, by, rx, ry, rnd() * 3, 0, PI2); c.fill(); }
    c.globalAlpha = 1; c.strokeStyle = 'rgba(150,140,110,0.07)'; c.lineWidth = 1; for (i = 0; i < 34; i++) { var fx = rnd() * TS, fy = rnd() * TS; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + 6 + rnd() * 10, fy + rnd() * 4 - 2); c.stroke(); }   // 宣纸纤维
    inkMountains(c, G, ix, iy, th);
    var sp = streamPts(G); c.lineJoin = 'round'; c.lineCap = 'round';                                   // 溪：淡青灰 + 墨线边 + 几道波纹
    c.beginPath(); sp.forEach(function (p, k) { k ? c.lineTo(p.x - ox, p.y - oy) : c.moveTo(p.x - ox, p.y - oy); });
    c.strokeStyle = th.waterEdge; c.lineWidth = 44; c.stroke(); c.strokeStyle = th.water; c.lineWidth = 38; c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 3; c.setLineDash([26, 40]); c.stroke(); c.setLineDash([]);
    pathRoute(c, R, ox, oy); c.strokeStyle = th.edge; c.lineWidth = 92; c.stroke();                      // 道路：淡墨边 + 奶白路面（比纸更亮，一眼能看到）
    pathRoute(c, R, ox, oy); c.strokeStyle = th.road; c.lineWidth = 84; c.stroke();
    pathRoute(c, R, ox, oy); c.strokeStyle = 'rgba(150,130,90,0.4)'; c.lineWidth = 3; c.setLineDash([16, 24]); c.stroke(); c.setLineDash([]);
    for (i = 1; i < sp.length; i++) {                                                                    // 小桥
      var pr = XY.routeProject(R, sp[i].x, sp[i].y);
      if (pr.d < 70) { var bp = XY.routeAt(R, pr.s), bpx = bp.x - ox, bpy = bp.y - oy; if (bpx < -80 || bpx > TS + 80 || bpy < -80 || bpy > TS + 80) continue;
        c.save(); c.translate(bpx, bpy); c.rotate(bp.a); c.fillStyle = '#fbf0d6'; c.strokeStyle = 'rgba(120,96,56,0.65)'; c.lineWidth = 3; c.fillRect(-30, -50, 60, 100); c.strokeRect(-30, -50, 60, 100);
        c.strokeStyle = 'rgba(150,120,70,0.4)'; c.lineWidth = 2; for (var q = -3; q <= 3; q++) { c.beginPath(); c.moveTo(q * 8, -50); c.lineTo(q * 8, 50); c.stroke(); } c.restore(); }
    }
    for (i = 0; i < 16; i++) {                                                                           // 疏松 / 疏竹 / 墨点石（避开道路与溪、不贴图块边）
      var lx = 40 + rnd() * (TS - 80), ly = 60 + rnd() * (TS - 100), wx = ox + lx, wy = oy + ly, k2 = rnd(), s2 = 0.8 + rnd() * 0.7;
      if (XY.routeProject(R, wx, wy).d < 80) continue;
      var near = false; for (var z = 0; z < sp.length; z += 2) if (Math.abs(sp[z].x - wx) < 90 && Math.abs(sp[z].y - wy) < 70) { near = true; break; }
      if (near) continue;
      if (k2 < 0.7) inkTree(c, th.deco === 'bamboo' ? (k2 < 0.5 ? 'bamboo' : 'pine') : (k2 < 0.55 ? 'pine' : 'bamboo'), lx, ly, s2, th, rnd);
      else { c.fillStyle = 'rgba(' + th.mtn + ',0.22)'; c.beginPath(); c.ellipse(lx, ly, 14 * s2, 7 * s2, 0, 0, PI2); c.fill(); c.fillStyle = 'rgba(' + th.mtn + ',0.3)'; c.beginPath(); c.ellipse(lx - 3, ly - 2, 5 * s2, 2.4 * s2, 0, 0, PI2); c.fill(); }
    }
    return cv;
  }

  /* ---------- v0.8.0 第一关（bamboo / 黑风山）整幅水墨背景画 ----------
   * assets/art/bg-stage1/bg_q78.webp（4096x2560，对应世界 5120x3200，无水印）→ js/bg_s1_data.js（XY.BGS1）。路画在画里，
   * 与 levels.js 里已圆角的第 1 关路线对齐（路宽 84，误差 ≤ 路宽 10%）；这里不再程序化画山 / 树 / 溪 / 路 / 桥。
   * 每帧只把镜头范围那一块 drawImage 出来；唐僧走过的路段在画上叠一层很淡的金色。图还没解码好 → 先铺宣纸底色。
   * 没有 XY.BGS1（或经典画风）→ 回到原来的分块程序化画法。其它关不受影响。 */
  var PAINT = null, PAINT_SRC = null;
  function paintImg() {
    if (!XY.BGS1) return null;
    if (!PAINT || PAINT_SRC !== XY.BGS1.src) { PAINT = new Image(); PAINT_SRC = XY.BGS1.src; PAINT.src = PAINT_SRC; }
    return (PAINT.complete && PAINT.naturalWidth > 0) ? PAINT : null;
  }
  XY.bgPaintReady = function () { return !!paintImg(); };
  XY.bgPaintOn = function (G) { return !!XY.BGS1 && XY.inkBg() && ((G.lv && G.lv.theme) || 'bamboo') === 'bamboo'; };
  if (XY.BGS1) paintImg();                                                                                // 进游戏前就开始解码
  function drawPaint(c, G, x0, y0, x1, y1) {
    var W = C.WORLD_W, H = C.WORLD_H, im = paintImg();
    c.fillStyle = '#f3efe0'; c.fillRect(x0, y0, x1 - x0, y1 - y0);
    if (im) {
      var sx = Math.max(0, x0 - 2), sy = Math.max(0, y0 - 2), ex = Math.min(W, x1 + 2), ey = Math.min(H, y1 + 2), k = im.naturalWidth / W, kh = im.naturalHeight / H;
      if (ex > sx && ey > sy) { c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(im, sx * k, sy * kh, (ex - sx) * k, (ey - sy) * kh, sx, sy, ex - sx, ey - sy); }
    }
    var R = G.rt, s = Math.min(G.tang.s, R.total);
    if (s > 2) {                                                                                           // 唐僧走过的路段：淡金色（动态）
      c.lineJoin = 'round'; c.lineCap = 'round'; c.beginPath(); c.moveTo(R.pts[0].x, R.pts[0].y);
      for (var i = 1; i < R.pts.length && R.cum[i] <= s; i++) c.lineTo(R.pts[i].x, R.pts[i].y);
      var e = XY.routeAt(R, s); c.lineTo(e.x, e.y);
      c.strokeStyle = 'rgba(42,32,22,0.16)'; c.lineWidth = 62; c.stroke();
    }
    return 1;
  }

  XY.terrainReset = function () { cache = {}; };
  XY.terrainTiles = function () { var n = 0, k; for (k in cache) n++; return n; };

  // 画整张地面（c 已经平移到世界坐标）。返回本帧用到的图块数
  XY.drawTerrain = function (c, G) {
    var v = G.view, W = C.WORLD_W, H = C.WORLD_H, th = themeOf(G);
    var x0 = G.cam.x - v.w / 2, y0 = G.cam.y - v.h / 2, x1 = x0 + v.w, y1 = y0 + v.h;
    if (XY.bgPaintOn(G)) return drawPaint(c, G, x0, y0, x1, y1);                                     // v0.8.0：第一关 = 整幅水墨背景画（路已画在里面）
    var ink = XY.inkBg(), key = G.levelId + (G.dungeon ? G.dungeon.id : '') + (G.mod ? G.mod.id : '') + ':' + (G.lv && G.lv.theme) + ':' + (ink ? 'ink' : 'classic'); if (key !== cacheKey) { cache = {}; cacheKey = key; }
    c.fillStyle = ink ? '#f3efe0' : '#e9efdc'; c.fillRect(x0, y0, v.w, v.h);
    var ix0 = Math.max(0, Math.floor(x0 / TS)), ix1 = Math.min(Math.ceil(W / TS) - 1, Math.floor(x1 / TS));
    var iy0 = Math.max(0, Math.floor(y0 / TS)), iy1 = Math.min(Math.ceil(H / TS) - 1, Math.floor(y1 / TS)), n = 0, built = 0;
    for (var iy = iy0; iy <= iy1; iy++) for (var ix = ix0; ix <= ix1; ix++) {
      var k = tileKey(G, ix, iy), t = cache[k];
      if (!t) { if (built >= 2) { c.fillStyle = ink ? '#f3efe0' : th.base; c.fillRect(ix * TS, iy * TS, TS, TS); continue; } t = cache[k] = buildTile(G, ix, iy); built++; }   // 每帧最多现画 2 块，避免卡一下
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(t, ix * TS - 1, iy * TS - 1, TS + 2, TS + 2); n++;
    }
    // 唐僧走过的路段：淡金色（动态）
    var R = G.rt, s = Math.min(G.tang.s, R.total);
    if (s > 2) {
      c.lineJoin = 'round'; c.lineCap = 'round'; c.beginPath(); c.moveTo(R.pts[0].x, R.pts[0].y);
      for (var i = 1; i < R.pts.length && R.cum[i] <= s; i++) c.lineTo(R.pts[i].x, R.pts[i].y);
      var e = XY.routeAt(R, s); c.lineTo(e.x, e.y);
      c.strokeStyle = 'rgba(42,32,22,0.20)'; c.lineWidth = 70; c.stroke();
      c.strokeStyle = 'rgba(246,239,226,0.45)'; c.lineWidth = 8; c.stroke();
    }
    c.lineWidth = 6; c.strokeStyle = ink ? 'rgba(120,104,76,0.45)' : th.edge; c.strokeRect(0, 0, W, H);
    return n;
  };
})();
