/* ============================================================
 * util.js —— 通用小工具：随机数、数学、空间网格
 * ============================================================ */
(function () {
  var XY = window.XY;

  XY.rand = function (a, b) { return a + Math.random() * (b - a); };
  XY.randi = function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); };
  XY.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  XY.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  XY.dist = function (ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); };
  XY.fmtTime = function (s) {
    s = Math.max(0, Math.floor(s));
    var m = Math.floor(s / 60), r = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
  };
  // 千分位：画面上所有 ≥1000 的数字统一加逗号（8963 → 8,963）。fmtStr 对整段文字里的“独立的 4 位以上整数”加逗号（日期 / 版本号 / 小数点后不动），带缓存
  XY.fmtNum = function (n) {
    if (typeof n !== 'number') n = +n; if (!isFinite(n)) return String(n);
    var neg = n < 0, a = Math.abs(Math.round(n)), s = String(a), o = '', i = s.length;
    if (a < 1000) return (neg ? '-' : '') + s;
    while (i > 3) { o = ',' + s.substr(i - 3, 3) + o; i -= 3; }
    return (neg ? '-' : '') + s.substr(0, i) + o;
  };
  var _fsC = Object.create(null), _fsN = 0;
  XY.fmtStr = function (s) {
    if (typeof s !== 'string') s = String(s);
    var k = _fsC[s]; if (k !== undefined) return k;
    var r = s;
    if (/\d{4}/.test(s)) r = s.replace(/\d{4,}/g, function (m, off) {
      var pre = off > 0 ? s.charAt(off - 1) : '', post = s.charAt(off + m.length);
      if (pre === '.' || pre === ',' || /\d/.test(pre) || ((pre === '-' || pre === '/') && /\d/.test(s.charAt(off - 2) || ''))) return m;   // 小数 / 已加逗号 / 日期
      if ((post === '-' || post === '/' || post === ':') && /\d/.test(s.charAt(off + m.length + 1) || '')) return m;
      return XY.fmtNum(+m);
    });
    if (_fsN > 4000) { _fsC = Object.create(null); _fsN = 0; } _fsC[s] = r; _fsN++;
    return r;
  };
  // 洗牌（Fisher-Yates）
  XY.shuffle = function (a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  /* 带固定种子的随机（用于地图装饰，每次进游戏地图一样） */
  XY.seeded = function (seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---------- 空间网格：快速查"某个圆圈里有哪些敌人" ---------- */
  XY.Grid = function (w, h, cell) {
    this.cell = cell;
    this.cols = Math.ceil(w / cell);
    this.rows = Math.ceil(h / cell);
    this.cells = [];
    for (var i = 0; i < this.cols * this.rows; i++) this.cells.push([]);
  };
  XY.Grid.prototype.clear = function () {
    var c = this.cells;
    for (var i = 0; i < c.length; i++) c[i].length = 0;
  };
  XY.Grid.prototype.insert = function (e) {
    var cx = Math.floor(e.x / this.cell), cy = Math.floor(e.y / this.cell);
    if (cx < 0) cx = 0; else if (cx >= this.cols) cx = this.cols - 1;
    if (cy < 0) cy = 0; else if (cy >= this.rows) cy = this.rows - 1;
    this.cells[cy * this.cols + cx].push(e);
  };
  // 对圆内（含敌人半径）的每个敌人调用 fn(e, distSq)
  XY.Grid.prototype.query = function (x, y, r, fn) {
    var cell = this.cell, pad = 60; // 敌人半径最大约 50，多查一圈
    var x0 = Math.max(0, Math.floor((x - r - pad) / cell)), x1 = Math.min(this.cols - 1, Math.floor((x + r + pad) / cell));
    var y0 = Math.max(0, Math.floor((y - r - pad) / cell)), y1 = Math.min(this.rows - 1, Math.floor((y + r + pad) / cell));
    for (var cy = y0; cy <= y1; cy++) {
      for (var cx = x0; cx <= x1; cx++) {
        var list = this.cells[cy * this.cols + cx];
        for (var i = 0; i < list.length; i++) {
          var e = list[i];
          if (e.dead || e.veil || (e.tdSky && !XY._skyOn)) continue;                        // v0.9 洞府塔：英雄没走进塔的射程之前，塔被妖气罩着，选不中也打不到；天兵层的飞妖不进英雄的索敌
          var dx = e.x - x, dy = e.y - y, rr = r + e.r;
          var d2 = dx * dx + dy * dy;
          if (d2 <= rr * rr) fn(e, d2);
        }
      }
    }
  };
  // 找最近的敌人（半径 r 内），找不到返回 null
  XY.Grid.prototype.nearest = function (x, y, r) {
    var best = null, bd = Infinity;
    this.query(x, y, r, function (e, d2) { if (d2 < bd) { bd = d2; best = e; } });
    return best;
  };
})();
