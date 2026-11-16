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

  // One trail treatment for every procedural stage and the southern fork.
  // The route points are gameplay coordinates, never a decorative approximate route.
  XY.drawInkTrail = function (c, pts, opts) {
    if (!pts || pts.length < 2) return;
    opts = opts || {}; c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    function line(width, colour) {
      c.beginPath(); pts.forEach(function (p, i) { if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); });
      c.lineWidth = width; c.strokeStyle = colour; c.stroke();
    }
    // Feathered earthen wash replaces the outlined, lane-marked yellow highway.
    var soil = opts.soil || '232,222,197';
    line(102, 'rgba(72,60,44,.025)'); line(92, 'rgba(72,60,44,.035)');
    if (opts.textured) {
      // Keep the path readable where its bed meets a same-material clearing.
      // Only the two tiled mainline stages need this soft paper-coloured centre.
      if (opts.readable) {
        line(78, 'rgba(' + soil + ',.22)'); line(62, 'rgba(' + soil + ',.18)'); line(45, 'rgba(' + soil + ',.08)');
      } else {
        line(60, 'rgba(' + soil + ',.055)'); line(45, 'rgba(' + soil + ',.035)');
      }
    } else {
      line(82, 'rgba(' + soil + ',.15)'); line(72, 'rgba(' + soil + ',.22)');
      line(60, 'rgba(' + soil + ',.18)'); line(45, 'rgba(' + soil + ',.10)');
    }
    c.lineWidth = 1; c.strokeStyle = 'rgba(92,78,56,.17)';
    for (var i = 1; i < pts.length; i++) {
      var p = pts[i - 1], q = pts[i], dx = q.x - p.x, dy = q.y - p.y, len = Math.sqrt(dx * dx + dy * dy);
      if (!len) continue;
      var nx = -dy / len, ny = dx / len, rnd = XY.seeded(((p.x * 31 + p.y * 17) | 0) + 977);
      for (var k = 0; k < len; k += 24) {
        var t = k / len, off = (rnd() > .5 ? 1 : -1) * (30 + rnd() * 14), x = p.x + dx * t + nx * off, y = p.y + dy * t + ny * off;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx / len * (3 + rnd() * 8), y + dy / len * (3 + rnd() * 8)); c.stroke();
      }
    }
    c.restore();
  };

  var LAND_BANDS = {};
  function landBand(im, theme, row) {
    var key = theme + ':' + (row % 2), old = LAND_BANDS[key]; if (old) return old;
    // These authored areas contain no road. Keeping roads separate makes all
    // stages follow their own real escort route instead of borrowing stage one's.
    var closeGround = theme !== 'bamboo';
    var cv = document.createElement('canvas'); cv.width = closeGround ? 1900 : 4096; cv.height = closeGround ? 720 : 790;
    var c = cv.getContext('2d'); c.imageSmoothingQuality = 'high';
    c.save(); if (row % 2) { c.translate(cv.width, 0); c.scale(-1, 1); }
    // Sample actual ground, never the distant vertical peaks: the player must
    // stand on a readable surface. The tighter crop keeps large trees out of
    // the fire/cave combat plane. Source and destination preserve aspect ratio.
    c.drawImage(im, closeGround ? 1420 : 0, closeGround ? 1780 : 1770, cv.width, cv.height, 0, 0, cv.width, cv.height); c.restore();
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = theme === 'apricot' ? '#bb774a' : theme === 'cave' ? '#65746c' : theme === 'bone' ? '#a8b1ad' : '#e9d6b5';
    c.globalAlpha = theme === 'apricot' ? .48 : theme === 'cave' ? .48 : theme === 'bone' ? .32 : .22; c.fillRect(0, 0, cv.width, cv.height);
    c.globalAlpha = 1; c.globalCompositeOperation = 'destination-in';
    var fade = c.createLinearGradient(0, 0, 0, cv.height);
    fade.addColorStop(0, 'transparent'); fade.addColorStop(.15, '#000'); fade.addColorStop(.85, '#000'); fade.addColorStop(1, 'transparent');
    c.fillStyle = fade; c.fillRect(0, 0, cv.width, cv.height);
    var fx = c.createLinearGradient(0, 0, cv.width, 0);
    fx.addColorStop(0, 'transparent'); fx.addColorStop(.1, '#000'); fx.addColorStop(.9, '#000'); fx.addColorStop(1, 'transparent');
    c.fillStyle = fx; c.fillRect(0, 0, cv.width, cv.height);
    LAND_BANDS[key] = cv; return cv;
  }
  var CLEAR_GROUND = {};
  function clearingGround(im, theme) {
    if (CLEAR_GROUND[theme]) return CLEAR_GROUND[theme];
    var cv = document.createElement('canvas'); cv.width = 500; cv.height = 450;
    var c = cv.getContext('2d');
    // Readable combat clearing from the same authored foreground: no distant
    // peaks or bamboo crowns beneath bosses, captives or the rest pavilion.
    c.drawImage(im, 1770, 1940, 500, 450, 0, 0, 500, 450);
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = theme === 'apricot' ? '#bb774a' : theme === 'cave' ? '#65746c' : theme === 'bone' ? '#a8b1ad' : '#e9d6b5';
    c.globalAlpha = theme === 'apricot' ? .48 : theme === 'cave' ? .48 : theme === 'bone' ? .32 : .22;
    c.fillRect(0, 0, 500, 450); c.globalAlpha = 1;
    c.globalCompositeOperation = 'destination-in';
    c.scale(500, 450); var fade = c.createRadialGradient(.5, .5, .24, .5, .5, .5);
    fade.addColorStop(0, '#000'); fade.addColorStop(1, 'transparent'); c.fillStyle = fade; c.fillRect(0, 0, 1, 1);
    CLEAR_GROUND[theme] = cv; return cv;
  }
  var ROAD_SOIL = {};
  function drawRoadBed(c, R, clearing, theme, ox, oy) {
    // Skip off-tile segments before rasterizing the feathered pattern. Include
    // the full 150px half-width plus one antialias pixel; retained runs keep
    // their original points and joins, including neighbors outside the tile.
    var segments = [], margin = 151;
    for (var si = 1; si < R.pts.length; si++) {
      var pa = R.pts[si - 1], pb = R.pts[si];
      if (Math.max(pa.x, pb.x) < ox - margin || Math.min(pa.x, pb.x) > ox + TS + margin ||
          Math.max(pa.y, pb.y) < oy - margin || Math.min(pa.y, pb.y) > oy + TS + margin) continue;
      segments.push(si);
    }
    if (!segments.length) return false;
    var soil = ROAD_SOIL[theme];
    if (!soil) {
      soil = document.createElement('canvas'); soil.width = 500; soil.height = 450;
      var sc = soil.getContext('2d'), source = clearing.getContext('2d').getImageData(0, 0, 500, 450).data;
      var red = 0, green = 0, blue = 0, weight = 0;
      for (var i = 0; i < source.length; i += 4) { var a = source[i + 3]; red += source[i] * a; green += source[i + 1] * a; blue += source[i + 2] * a; weight += a; }
      // An empty/not-yet-decoded crop must not cache a NaN colour or blank bed.
      if (!(weight > 0)) return false;
      sc.fillStyle = 'rgb(' + Math.round(red / weight) + ',' + Math.round(green / weight) + ',' + Math.round(blue / weight) + ')';
      sc.fillRect(0, 0, 500, 450); sc.drawImage(clearing, 0, 0); ROAD_SOIL[theme] = soil;
    }
    // Pattern coordinates stay in world space. The crop does not follow the
    // route or repeat its rocks at every sample point. Feather only the mask.
    c.save(); c.strokeStyle = c.createPattern(soil, 'repeat'); c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); var previous = -1;
    for (var sj = 0; sj < segments.length; sj++) {
      var index = segments[sj], a = R.pts[index - 1], b = R.pts[index];
      if (index !== previous + 1) c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y); previous = index;
    }
    // Nine feather strokes retain the original cumulative opacity: each inner
    // step combines two former 0.12 layers (1 - 0.88 * 0.88 = 0.2256).
    for (var width = 300; width >= 140; width -= 20) { c.globalAlpha = width === 300 ? .12 : .2256; c.lineWidth = width; c.stroke(); }
    c.globalAlpha = .95; c.lineWidth = 130; c.stroke(); c.restore(); return true;
  }
  function buildInkTile(G, ix, iy) {
    var theme = G.dungeon && G.dungeon.id === 'baihu' ? 'bone' : (G.lv && G.lv.theme) || 'bamboo', R = G.rtN || G.rt, cv = document.createElement('canvas'); cv.width = TS * 2; cv.height = TS * 2;
    var c = cv.getContext('2d'); c.setTransform(2, 0, 0, 2, 0, 0); var ox = ix * TS, oy = iy * TS, im = paintImg(), roadBed = false;
    c.fillStyle = theme === 'apricot' ? '#d4b18c' : theme === 'cave' ? '#aeb8ab' : theme === 'bone' ? '#d0d2c6' : '#ece5d2'; c.fillRect(0, 0, TS, TS);
    c.save(); c.translate(-ox, -oy);
    if (im) {
      // Overlapping feathered landscape bands form one continuous world surface.
      // Texture coordinates are global, so crossing cached tile borders is seamless.
      var sample = landBand(im, theme, 0), bw = sample.width * 1.25, bh = sample.height * 1.25;
      var stride = bh * .8, period = bw * .85, first = Math.floor((oy - bh) / stride), last = Math.ceil((oy + TS) / stride);
      for (var row = first; row <= last; row++) {
        var band = landBand(im, theme, Math.abs(row)), shift = ((row * 1139 + G.levelId * 613) % period + period) % period;
        var by = row * stride, firstCol = Math.floor((ox - shift - bw) / period), lastCol = Math.ceil((ox + TS - shift) / period);
        for (var col = firstCol; col <= lastCol; col++) {
          var bx = shift + col * period;
          if (bx + bw > ox && bx < ox + TS) c.drawImage(band, bx, by, bw, bh);
        }
      }
      var clearing = clearingGround(im, theme), places = (G.dens || []).concat(G.captives || [], [G.camp, G.gate]);
      // A translucent tint over mountain art disappears on bright ground.
      // All tiled ink stages share the same textured, softly cleared route bed.
      roadBed = drawRoadBed(c, R, clearing, theme, ox, oy);
      places.forEach(function (p) {
        if (!p || p.x + 390 < ox || p.x - 390 > ox + TS || p.y + 350 < oy || p.y - 350 > oy + TS) return;
        c.drawImage(clearing, p.x - 390, p.y - 351, 780, 702);
      });
      // A light parchment wash keeps enemies and danger telegraphs readable.
      c.fillStyle = theme === 'cave' ? 'rgba(190,198,187,.08)' : theme === 'bone' ? 'rgba(228,230,218,.12)' : 'rgba(246,238,218,.08)'; c.fillRect(ox, oy, TS, TS);
    }
    XY.drawInkTrail(c, R.pts, { textured: roadBed, readable: theme === 'ochre' || theme === 'apricot', soil: theme === 'apricot' ? '244,226,201' : theme === 'ochre' ? '247,239,219' : theme === 'cave' ? '194,205,188' : theme === 'bone' ? '228,232,216' : '232,222,197' });
    c.restore(); return cv;
  }

  /* ---------- v0.8.0 第一关（bamboo / 黑风山）整幅水墨背景画 ----------
   * assets/art/bg-stage1/bg_q78.webp（4096x2560，对应世界 5120x3200，无水印）→ js/bg_s1_data.js（XY.BGS1）。路画在画里，
   * 与 levels.js 里已圆角的第 1 关路线对齐（路宽 84，误差 ≤ 路宽 10%）；这里不再程序化画山 / 树 / 溪 / 路 / 桥。
   * 每帧只把镜头范围那一块 drawImage 出来；局部修复图覆盖原画中烘焙的矩形接缝。场景准备门等待原画与修复图的最终绘制对象。
   * 没有 XY.BGS1（或经典画风）→ 回到原来的分块程序化画法。其它关不受影响。 */
  var PAINT_WORK = null, PAINT_GENERATION = 0;
  function paintPatchInput(p) { return [p.src, p.x, p.y, p.w, p.h, p.feather]; }
  function paintMatches(work) {
    var data = XY.BGS1;
    return !!(work && !work.retired && data === work.data && data.src === work.src &&
      (data.patches || null) === work.list && data.w === work.w && data.h === work.h &&
      (data.patches || []).length === work.patchInputs.length && (data.patches || []).every(function (p, i) { return !!p && paintPatchInput(p).every(function (value, j) { return value === work.patchInputs[i][j]; }); }));
  }
  function releasePaintObject(value) {
    if (value && typeof value.close === 'function') value.close();
    else if (value && value.getContext) { value.width = 0; value.height = 0; }
  }
  function releasePaintEntry(entry, keep) {
    if (!keep) { entry.blob = null; entry.baseSource = null; }
    entry.objects = entry.objects.filter(function (value) {
      if (value === keep) return true;
      releasePaintObject(value); return false;
    });
    entry.cleanups.splice(0).forEach(function (fn) { fn(); });
  }
  function retirePaintWork() {
    if (!PAINT_WORK) return;
    PAINT_WORK.retired = true;
    PAINT_WORK.entries.forEach(function (entry) {
      if (entry.fail) entry.fail(new Error('background source changed'));
      releasePaintEntry(entry); entry.drawable = null;
    });
  }
  function paintGuard(entry) {
    if (!paintMatches(entry.work) || entry.generation !== PAINT_GENERATION || entry.state !== 'loading') throw new Error('background preparation retired');
    if (performance.now() >= entry.deadline) throw new Error('background preparation timeout');
  }
  function paintYield(entry) {
    paintGuard(entry);
    var task = entry.yieldTask;
    if (!task) {
      task = entry.yieldTask = { channel: null, timer: null, wait: null, closed: false };
      function close(error) {
        if (task.closed) return;
        task.closed = true;
        if (task.timer != null) { clearTimeout(task.timer); task.timer = null; }
        if (task.channel) {
          task.channel.port1.onmessage = null;
          task.channel.port1.close(); task.channel.port2.close(); task.channel = null;
        }
        var wait = task.wait; task.wait = null; entry.yieldTask = null;
        if (wait) wait.reject(error || new Error('background preparation retired'));
      }
      function resume() {
        task.timer = null;
        if (task.closed || !task.wait) return;
        var wait = task.wait; task.wait = null;
        try { paintGuard(entry); wait.resolve(); } catch (error) { wait.reject(error); }
      }
      task.close = close; task.resume = resume;
      entry.cleanups.push(close);
      if (typeof MessageChannel === 'function') {
        try { task.channel = new MessageChannel(); task.channel.port1.onmessage = resume; }
        catch (error) {
          if (task.channel) { task.channel.port1.close(); task.channel.port2.close(); task.channel = null; }
        }
      }
    }
    return new Promise(function (resolve, reject) {
      if (task.wait) { reject(new Error('background yield already pending')); return; }
      task.wait = { resolve: resolve, reject: reject };
      try {
        // One message per entry, same <=64KiB base64 chunk and original deadline.
        if (task.channel) task.channel.port2.postMessage(0);
        else task.timer = setTimeout(task.resume, 0); // Compatibility only; timer-path performance is not guaranteed.
      } catch (error) { task.close(error); }
    }).then(function () { paintGuard(entry); });
  }
  function keepPaintObject(entry, value) {
    try { paintGuard(entry); } catch (error) { releasePaintObject(value); throw error; }
    entry.objects.push(value); return value;
  }
  function paintBlob(entry) {
    var src = entry.src;
    if (/^data:/i.test(src)) {
      // connect-src is self only. Decode embedded WebP locally, never fetch a data URL.
      var head = /^data:image\/webp;base64,/i.exec(src);
      if (!head) return Promise.reject(new Error('unsupported background data URL'));
      var encoded = src.slice(head[0].length), parts = [], offset = 0;
      if (!encoded.length || encoded.length % 4) return Promise.reject(new Error('invalid background base64'));
      function part() {
        return paintYield(entry).then(function () {
          var end = Math.min(offset + 65536, encoded.length), bytes = atob(encoded.slice(offset, end)), block = new Uint8Array(bytes.length);
          for (var i = 0; i < bytes.length; i++) block[i] = bytes.charCodeAt(i);
          paintGuard(entry); parts.push(block); offset = end;
          if (offset < encoded.length) return part();
          var blob = new Blob(parts, { type: 'image/webp' }); parts = []; return blob;
        });
      }
      return part();
    }
    var url;
    try {
      url = new URL(src, location.href);
      if (!/^https?:$/.test(url.protocol) || url.origin !== location.origin) throw new Error('background URL must be same-origin');
      if (entry.retry) url.searchParams.set('xy_bg_retry', String(Date.now()));
    } catch (error) { return Promise.reject(error); }
    paintGuard(entry);
    return fetch(url.href, { credentials: 'same-origin' }).then(function (response) {
      paintGuard(entry); if (!response.ok) throw new Error('background HTTP ' + response.status);
      return response.blob();
    }).then(function (blob) { paintGuard(entry); return blob; });
  }
  function rasterPaintCanvas(entry, canvas) {
    var context = canvas.getContext('2d'), row = 0;
    function stripe() {
      return paintYield(entry).then(function () {
        // Read only: force the prepared canvas pixels without a color-changing putImageData round trip.
        context.getImageData(0, row, canvas.width, Math.min(64, canvas.height - row)); row += 64;
        return row < canvas.height ? stripe() : canvas;
      });
    }
    return stripe();
  }
  function fallbackPaintCanvas(entry, blob) {
    return new Promise(function (resolve, reject) {
      var image = new Image(), url = URL.createObjectURL(blob), done = false;
      function finish(error) {
        if (done) return; done = true; image.onload = image.onerror = null;
        if (error) reject(error); else resolve(image);
      }
      entry.cleanups.push(function () { URL.revokeObjectURL(url); finish(new Error('background preparation retired')); });
      image.onerror = function () { finish(new Error('background image decode failed')); };
      image.onload = function () {
        var decoded;
        try { paintGuard(entry); decoded = image.decode ? image.decode() : Promise.resolve(); }
        catch (error) { finish(error); return; }
        Promise.resolve(decoded).then(function () {
          try { paintGuard(entry); if (!image.naturalWidth || !image.naturalHeight) throw new Error('empty background image'); finish(); }
          catch (error) { finish(error); }
        }, finish);
      };
      image.src = url;
    }).then(function (image) {
      paintGuard(entry);
      var canvas = keepPaintObject(entry, document.createElement('canvas'));
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      canvas.getContext('2d').drawImage(image, 0, 0);
      return rasterPaintCanvas(entry, canvas);
    });
  }
  function decodePaintSource(entry, blob) {
    paintGuard(entry);
    if (typeof window.createImageBitmap !== 'function') return fallbackPaintCanvas(entry, blob);
    return window.createImageBitmap(blob).then(function (bitmap) {
      keepPaintObject(entry, bitmap);
      if (!(bitmap.width > 0 && bitmap.height > 0)) throw new Error('empty background bitmap');
      return bitmap;
    });
  }
  function featherPaintPatch(entry, source) {
    var p = entry.p, data = entry.work.data;
    if (!p) return source;
    return paintYield(entry).then(function () {
      var cv = keepPaintObject(entry, document.createElement('canvas')); cv.width = source.width; cv.height = source.height;
      var cc = cv.getContext('2d'), fx = Math.min(0.49, p.feather / p.w), fy = Math.min(0.49, p.feather / p.h);
      cc.drawImage(source, 0, 0); cc.globalCompositeOperation = 'destination-in';
      var gx = cc.createLinearGradient(0,0,cv.width,0);
      gx.addColorStop(0,p.x > 0 ? 'transparent' : '#000'); gx.addColorStop(fx,'#000'); gx.addColorStop(1-fx,'#000'); gx.addColorStop(1,p.x+p.w < data.w ? 'transparent' : '#000');
      cc.fillStyle=gx; cc.fillRect(0,0,cv.width,cv.height);
      var gy = cc.createLinearGradient(0,0,0,cv.height);
      gy.addColorStop(0,p.y > 0 ? 'transparent' : '#000'); gy.addColorStop(fy,'#000'); gy.addColorStop(1-fy,'#000'); gy.addColorStop(1,p.y+p.h < data.h ? 'transparent' : '#000');
      cc.fillStyle=gy; cc.fillRect(0,0,cv.width,cv.height);
      if (typeof window.createImageBitmap !== 'function') return rasterPaintCanvas(entry, cv);
      return window.createImageBitmap(cv).then(function (bitmap) {
        keepPaintObject(entry, bitmap);
        if (bitmap.width !== cv.width || bitmap.height !== cv.height) throw new Error('background patch bitmap size changed');
        return bitmap;
      });
    });
  }
  function preparePaintEntry(entry) {
    if (entry.state === 'ready') return Promise.resolve(entry);
    if (entry.promise) return entry.promise;
    entry.state = 'loading'; entry.deadline = performance.now() + 15000;
    entry.promise = new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { finish(new Error('background preparation timeout')); }, 15000);
      function finish(error, drawable) {
        if (entry.state !== 'loading') return;
        clearTimeout(timer); entry.fail = null;
        if (error) {
          entry.state = 'error'; entry.error = String(error.message || error); releasePaintEntry(entry); reject(error); return;
        }
        entry.drawable = drawable; releasePaintEntry(entry, drawable); entry.state = 'ready';
        if (!entry.p) entry.baseSource = { drawable: drawable, blob: entry.blob, generation: entry.generation, src: entry.src };
        resolve(entry);
      }
      entry.fail = finish;
      Promise.resolve().then(function () { return paintYield(entry); }).then(function () { return paintBlob(entry); }).then(function (blob) {
        paintGuard(entry); if (!entry.p) entry.blob = blob;
        return decodePaintSource(entry, blob);
      })
        .then(function (source) { return featherPaintPatch(entry, source); }).then(function (drawable) {
          paintGuard(entry); finish(null, drawable);
        }).catch(function (error) { finish(error); });
    });
    // A background attempt may fail before the player opens the existing preparation panel.
    entry.promise.catch(function () {}); return entry.promise;
  }
  XY.prepareBgPaint = function (retry) {
    var data = XY.BGS1;
    if (!data) { retirePaintWork(); PAINT_WORK = null; return Promise.resolve(); }
    if (!paintMatches(PAINT_WORK)) {
      retirePaintWork(); ++PAINT_GENERATION;
      PAINT_WORK = { data: data, src: data.src, list: data.patches || null, patchInputs: (data.patches || []).map(paintPatchInput), w: data.w, h: data.h, entries: [], retired: false, promise: null };
      var descriptors = [{ src: data.src, p: null }].concat((data.patches || []).map(function (p) { return { src: p.src, p: p }; }));
      PAINT_WORK.entries = descriptors.map(function (descriptor) {
        return { work: PAINT_WORK, generation: PAINT_GENERATION, src: descriptor.src, p: descriptor.p, state: 'pending', objects: [], cleanups: [] };
      });
      LAND_BANDS = {}; CLEAR_GROUND = {}; ROAD_SOIL = {}; cache = {};
    }
    var work = PAINT_WORK;
    if (retry && work.entries.some(function (entry) { return entry.state === 'error'; })) {
      work.entries = work.entries.map(function (entry) {
        return entry.state !== 'error' ? entry : { work: work, generation: PAINT_GENERATION, src: entry.src, p: entry.p, state: 'pending', retry: true, objects: [], cleanups: [] };
      });
      work.promise = null;
    }
    if (!work.promise) {
      work.promise = work.entries.reduce(function (chain, entry) {
        return chain.then(function () { return preparePaintEntry(entry); });
      }, Promise.resolve()).then(function () {
        if (!paintMatches(work)) throw new Error('background source changed'); return work;
      });
      work.promise.catch(function () {});
    }
    return work.promise;
  };
  XY.bgPaintReady = function () {
    return !XY.BGS1 || (paintMatches(PAINT_WORK) && PAINT_WORK.entries.every(function (entry) { return entry.state === 'ready' && !!entry.drawable; }));
  };
  XY.bgPaintState = function () {
    if (!paintMatches(PAINT_WORK)) return 'idle';
    if (PAINT_WORK.entries.some(function (entry) { return entry.state === 'error'; })) return 'error';
    return PAINT_WORK.entries.every(function (entry) { return entry.state === 'ready' && !!entry.drawable; }) ? 'ready' : 'pending';
  };
  function paintImg() { return XY.BGS1 && XY.bgPaintReady() && PAINT_WORK ? PAINT_WORK.entries[0].drawable : null; }
  // Borrow the ready base only; terrain retains ownership and source-generation checks.
  XY.bgPaintDrawable = paintImg;
  // Borrow the same canonical base Blob; patches and retired generations are never exposed.
  XY.bgPaintBase = function () { return paintImg() ? PAINT_WORK.entries[0].baseSource : null; };
  function paintPatches() {
    return XY.BGS1 && XY.bgPaintReady() && PAINT_WORK ? PAINT_WORK.entries.slice(1).map(function (entry) { return { p: entry.p, cv: entry.drawable }; }) : [];
  }
  XY.bgPaintOn = function (G) { return !!XY.BGS1 && XY.inkBg() && ((G.lv && G.lv.theme) || 'bamboo') === 'bamboo'; };
  if (XY.BGS1) XY.prepareBgPaint().catch(function () {});
  function drawPaint(c, G, x0, y0, x1, y1) {
    var W = C.WORLD_W, H = C.WORLD_H, im = paintImg();
    c.fillStyle = '#f3efe0'; c.fillRect(x0, y0, x1 - x0, y1 - y0);
    /* 每帧的地面是这一关最贵的一笔，这里省两处，画面不变：
     * 1) 采样：屏幕上一个源像素占到 0.9 个设备像素以上（放大或接近原大）时用双线性；高质量采样只在明显缩小时才有用，放大时贵两三倍。
     * 2) 修补块盖住的地方不再先画一遍底图。修补块四周有一圈羽化，羽化圈以内是完全不透明的；底图只画这块不透明区以外的部分，
     *    羽化圈下面仍然有底图，所以接边和原来一样。开局视野里那块修补图几乎盖满全屏，原来等于背景每帧画两遍。 */
    var transform = im ? c.getTransform() : null, zoomX = transform ? (Math.hypot(transform.a, transform.b) || 1) : 1, zoomY = transform ? (Math.hypot(transform.c, transform.d) || 1) : 1;
    function paintQuality(perX, perY) { return Math.min(zoomX / perX, zoomY / perY) >= 0.9 ? 'low' : 'high'; }
    var patches = im ? paintPatches() : [], solid = [];
    patches.forEach(function (item) {
      if (!item.cv) return;
      var q = item.p, data = XY.BGS1, kx = W / data.w, ky = H / data.h, f = (q.feather || 0) + 2;
      var ax = q.x > 0 ? q.x + f : 0, ay = q.y > 0 ? q.y + f : 0, bx = q.x + q.w < data.w ? q.x + q.w - f : data.w, by = q.y + q.h < data.h ? q.y + q.h - f : data.h;
      if (bx - ax < 8 || by - ay < 8) return;
      ax *= kx; bx *= kx; ay *= ky; by *= ky;
      if (ax >= x1 || ay >= y1 || bx <= x0 || by <= y0) return;
      solid.push([Math.max(ax, x0 - 4), Math.max(ay, y0 - 4), Math.min(bx, x1 + 4), Math.min(by, y1 + 4)]);
    });
    if (im) {
      var sx = Math.max(0, x0 - 2), sy = Math.max(0, y0 - 2), ex = Math.min(W, x1 + 2), ey = Math.min(H, y1 + 2), k = im.width / W, kh = im.height / H;
      if (ex > sx && ey > sy) {
        if (solid.length) {
          c.save(); c.beginPath(); c.rect(sx, sy, ex - sx, ey - sy);
          solid.forEach(function (r) { c.rect(r[0], r[1], r[2] - r[0], r[3] - r[1]); });
          c.clip('evenodd');
        }
        c.imageSmoothingEnabled = true; c.imageSmoothingQuality = paintQuality(k, kh); c.drawImage(im, sx * k, sy * kh, (ex - sx) * k, (ey - sy) * kh, sx, sy, ex - sx, ey - sy);
        if (solid.length) c.restore();
      }
    }
    if (im) {
      patches.forEach(function (item) {
        if (!item.cv) return;
        var p=item.p, kx=W/XY.BGS1.w, ky=H/XY.BGS1.h, x=p.x*kx, y=p.y*ky, w=p.w*kx, h=p.h*ky;
        if (x >= x1 || y >= y1 || x+w <= x0 || y+h <= y0) return;
        // Keep the original feathered drawable and projection. Retain source
        // pixels beyond the viewport for high-quality sampling at the current scale.
        var px=item.cv.width/w, py=item.cv.height/h;
        var padX=Math.ceil(8*Math.max(1,px/zoomX)), padY=Math.ceil(8*Math.max(1,py/zoomY));
        var sx=Math.max(0,Math.floor((Math.max(x,x0)-x)*px)-padX), sy=Math.max(0,Math.floor((Math.max(y,y0)-y)*py)-padY);
        var ex=Math.min(item.cv.width,Math.ceil((Math.min(x+w,x1)-x)*px)+padX), ey=Math.min(item.cv.height,Math.ceil((Math.min(y+h,y1)-y)*py)+padY);
        c.imageSmoothingEnabled = true; c.imageSmoothingQuality = paintQuality(px, py);
        c.drawImage(item.cv,sx,sy,ex-sx,ey-sy,x+sx/px,y+sy/py,(ex-sx)/px,(ey-sy)/py);
      });
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
    var ink = XY.inkBg(), key = G.levelId + (G.dungeon ? G.dungeon.id : '') + (G.mod ? G.mod.id : '') + ':' + (G.lv && G.lv.theme) + ':' + (ink ? 'ink' : 'classic') + ':' + (paintImg() ? 'painted' : 'loading'); if (key !== cacheKey) { cache = {}; cacheKey = key; }
    c.fillStyle = ink ? '#f3efe0' : '#e9efdc'; c.fillRect(x0, y0, v.w, v.h);
    var ix0 = Math.max(0, Math.floor(x0 / TS)), ix1 = Math.min(Math.ceil(W / TS) - 1, Math.floor(x1 / TS));
    var iy0 = Math.max(0, Math.floor(y0 / TS)), iy1 = Math.min(Math.ceil(H / TS) - 1, Math.floor(y1 / TS)), n = 0, built = 0;
    for (var iy = iy0; iy <= iy1; iy++) for (var ix = ix0; ix <= ix1; ix++) {
      var k = tileKey(G, ix, iy), t = cache[k];
      if (!t) {
        if (built >= 2) {
          c.save(); c.beginPath(); c.rect(ix * TS, iy * TS, TS, TS); c.clip();
          c.fillStyle = ink ? '#f3efe0' : th.base; c.fillRect(ix * TS, iy * TS, TS, TS);
          // A cold tile must still show the actual route while its art waits
          // for the bounded bake budget. This draws no actors or hit regions.
          var pendingRoute = G.rtN || G.rt;
          if (ink) {
            XY.drawInkTrail(c, pendingRoute.pts, { soil: '216,200,170' });
          } else {
            c.lineCap = 'round'; c.lineJoin = 'round';
            pathRoute(c, pendingRoute, 0, 0); c.strokeStyle = th.edge; c.lineWidth = 92; c.stroke();
            c.strokeStyle = th.road; c.lineWidth = 78; c.stroke();
          }
          c.restore(); continue;
        }
        t = cache[k] = buildTile(G, ix, iy); built++;
      }   // 每帧最多现画 2 块，避免卡一下
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      // Ink tiles already share exact world coordinates. Stretching 512 to 514
      // shifts their texture at each join and exposes rectangular seams.
      if (ink) c.drawImage(t, ix * TS, iy * TS, TS, TS);
      else c.drawImage(t, ix * TS - 1, iy * TS - 1, TS + 2, TS + 2);
      n++;
    }
    // Route progress belongs in the HUD/minimap; do not repaint walked terrain.
    c.lineWidth = 6; c.strokeStyle = ink ? 'rgba(120,104,76,0.45)' : th.edge; c.strokeRect(0, 0, W, H);
    return n;
  };
})();
