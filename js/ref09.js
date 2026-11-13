/* ============================================================
 * ref09.js —— v0.9 引路码（本地记账版；1.0 前不上链、不接真 X API）
 *  码：「XY-」+ 5 位随机 + 1 位校验（字母表去掉 0/O/1/I/L），绑本机存档 data.ref09.my，第一次用到时生成。
 *  被引（新人这台机器）：URL ?ref= / #ref= 首次启动自动认，或洞府阁「杂务 · 引路码」手动粘贴。
 *    规则：自己的码不算；一台机器只能被引一次；成功 → 新人得 NEWBIE 灵石，并在本机账本记「拉人者 +REF_POINTS 积分」（ledger，等云端接通再上报）。
 *  拉人（老玩家这台机器）：XY.ref09.credit({ id, handle, name }) —— 以后由云端 / Bot 回执调用；记积分 + XY.board.recordReferral（引路榜读它）。
 *  存档：data.ref09 = { my, by, byAt, points, credits[], ledger{code:分}, newbie }
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, S = XY.save;
  var AL = '23456789ABCDEFGHJKMNPQRSTUVWXYZ', NEWBIE = 30, REF_POINTS = 10;
  var R = XY.ref09 = { NEWBIE: NEWBIE, REF_POINTS: REF_POINTS };
  function chk(body) { var s = 0, i; for (i = 0; i < body.length; i++) s = (s * 7 + AL.indexOf(body[i]) + i + 1) % AL.length; return AL[s]; }
  R.make = function () { var b = '', i; for (i = 0; i < 5; i++) b += AL[Math.floor(Math.random() * AL.length)]; return 'XY-' + b + chk(b); };
  /* 规范化：去空格 / 大小写 / 可省「XY-」；返回 'XY-XXXXXX' 或 null */
  R.norm = function (s) {
    s = String(s || '').toUpperCase().replace(/[\s_]/g, '');
    var m = s.match(/REF=([A-Z0-9-]+)/); if (m) s = m[1];
    s = s.replace(/^XY-?/, '');
    if (!/^[2-9A-Z]{6}$/.test(s)) return null;
    var b = s.slice(0, 5); for (var i = 0; i < 6; i++) if (AL.indexOf(s[i]) < 0) return null;
    return chk(b) === s[5] ? 'XY-' + s : null;
  };
  R.data = function () {
    var d = S.data; if (!d) return null;
    var r = d.ref09; if (!r || typeof r !== 'object') r = d.ref09 = {};
    if (!R.norm(r.my)) { r.my = R.make(); touch(); }
    if (r.by === undefined) r.by = null;
    if (typeof r.points !== 'number') r.points = 0;
    if (!Array.isArray(r.credits)) r.credits = [];
    if (!r.ledger || typeof r.ledger !== 'object') r.ledger = {};
    if (typeof r.newbie !== 'number') r.newbie = 0;
    return r;
  };
  function touch() { if (S.touch) S.touch(); }
  function flush() { touch(); if (S.flush) S.flush(); }
  R.myCode = function () { return R.data().my; };
  R.link = function () { var u = location.href.split('#')[0].split('?')[0]; return u + '?ref=' + R.myCode(); };
  /* 新人这边：填别人的码 */
  R.apply = function (raw, src) {
    var r = R.data(), code = R.norm(raw);
    if (!code) return { ok: false, reason: '引路码格式不对（XY- 加 6 位）' };
    if (code === r.my) return { ok: false, self: true, reason: '这是你自己的引路码，不算' };
    if (r.by) return { ok: false, dup: true, reason: '已经被「' + r.by + '」引过路了，一人只能填一次' };
    r.by = code; r.byAt = Date.now(); r.bySrc = src || 'manual';
    r.ledger[code] = (r.ledger[code] || 0) + REF_POINTS;          // 本地账本：欠拉人者的积分（云端接通后上报）
    r.newbie = NEWBIE; S.data.lingshi = (S.data.lingshi || 0) + NEWBIE;
    flush();
    return { ok: true, code: code, gain: NEWBIE, refPoints: REF_POINTS, reason: '引路成功：你得灵石 +' + NEWBIE + '，引路人记 ' + REF_POINTS + ' 积分' };
  };
  /* 拉人者这边：有新人经我的码进来（云端 / Bot 回执调用；本地测试直接调） */
  R.credit = function (who) {
    who = who || {}; var r = R.data(), id = String(who.id || who.handle || '').toLowerCase();
    if (!id) return { ok: false, reason: '缺少新人 id' };
    if (id === String(r.my).toLowerCase()) return { ok: false, self: true, reason: '不能引自己' };
    if (r.credits.some(function (c) { return c.id === id; })) return { ok: false, dup: true, reason: '这位新人已经记过了' };
    var br = XY.board ? XY.board.recordReferral({ id: id, handle: who.handle, name: who.name }) : { ok: true };
    if (!br.ok) return br;
    r.credits.push({ id: id, at: Date.now() }); r.points += REF_POINTS; flush();
    if (XY.board) XY.board.refreshRef();
    return { ok: true, points: r.points, count: r.credits.length };
  };
  R.summary = function () { var r = R.data(); return { my: r.my, by: r.by, points: r.points, count: r.credits.length, newbie: r.newbie }; };

  /* 引路榜文案带上积分 */
  if (XY.board) {
    var oldRR = XY.board.refreshRef;
    XY.board.refreshRef = function () {
      var e = oldRR.apply(this, arguments); try { var r = R.data(); e.points = r.points; e.sub = (e.count ? '有效拉新 ' + e.count + ' 人' : '还没有拉到新人') + ' · 积分 ' + r.points + ' · 我的码 ' + r.my; } catch (x) { }
      return e;
    };
    var def = XY.board.BY && XY.board.BY.ref; if (def) { def.rule = '新人填你的引路码（或从带 ?ref= 的链接进来）= 有效拉新；每人 +' + REF_POINTS + ' 积分（本地记账，1.0 前不上链）'; def.hint = '洞府阁「杂务 · 引路码」复制你的码发给朋友'; }
  }

  /* 启动：URL 里带 ?ref= / #ref= → 本机还没被引就自动认 */
  R.fromUrl = function (href) {
    var m = String(href || location.href).match(/[?#&]ref=([A-Za-z0-9-]+)/); if (!m) return null;
    var r = R.data(); if (r.by) return { ok: false, dup: true };
    return R.apply(m[1], 'url');
  };
  try { if (S.data) { R.data(); var u = R.fromUrl(); if (u && u.ok) setTimeout(function () { var a = window.__xy && window.__xy.app; if (a) a.menuMsg = { text: u.reason, until: (a.rt || 0) + 4 }; }, 800); } } catch (e) { }

  /* ---------- 对话框（DOM：要复制 / 粘贴）：宣纸卡 + 朱印 + 墨条按钮 ---------- */
  R.dialog = function () {
    var old = document.getElementById('refDlg'); if (old) old.remove();
    var r = R.data();
    var el = document.createElement('div'); el.id = 'refDlg'; el.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(58,50,38,0.35);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;font-family:"STKaiti","KaiTi","楷体","Noto Serif CJK SC",serif';
    var card = document.createElement('div'); card.className='inkDialog inkReferral'; card.setAttribute('role','dialog'); card.setAttribute('aria-label','引路码'); card.style.cssText = 'background:#fffaf0;border:2.5px solid #a8905a;border-radius:14px 10px 16px 12px/12px 16px 10px 14px;padding:14px 16px;width:min(460px,100%);max-height:100%;overflow:auto;color:#3a3226;font-size:15px;box-sizing:border-box;box-shadow:0 6px 24px rgba(58,50,38,0.25)';
    function div(css, t) { var d = document.createElement('div'); d.style.cssText = css; if (t != null) d.textContent = t; card.appendChild(d); return d; }
    var hd = div('display:flex;align-items:center;gap:10px;margin-bottom:4px');
    var seal = document.createElement('span'); seal.textContent = '引'; seal.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;background:#b8322a;color:#fff4e0;font-weight:700;font-size:20px;border-radius:5px 3px 6px 4px;transform:rotate(-4deg)';
    var tt = document.createElement('span'); tt.textContent = '引路码'; tt.style.cssText = 'font-weight:700;font-size:21px'; hd.appendChild(seal); hd.appendChild(tt);
    div('height:3px;width:90px;background:linear-gradient(90deg,rgba(58,50,38,0.5),rgba(58,50,38,0));border-radius:3px;margin:2px 0 10px');
    div('color:#6d6455;font-size:13px', '我的引路码（发给朋友，他填了你记 ' + REF_POINTS + ' 积分）');
    var mine = div('font-size:26px;font-weight:700;letter-spacing:3px;color:#b8322a;margin:4px 0 2px;font-family:ui-monospace,Menlo,Consolas,monospace', r.my); mine.id = 'refMine';
    div('color:#6d6455;font-size:12.5px;margin-bottom:10px', '已拉新 ' + r.credits.length + ' 人 · 积分 ' + r.points + ' · 本地记账，1.0 前不上链');
    var row1 = div('display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px');
    var msg;
    function btn(row, t, f, pri) { var b = document.createElement('button'); b.textContent = t; b.style.cssText = (pri ? 'flex:1;min-width:84px;min-height:48px;border-radius:7px 10px 6px 9px/9px 6px 10px 7px;border:2px solid rgba(255,236,214,0.7);outline:2px solid #b8322a;background:#b8322a;color:#fff4e0;font-size:16px;font-weight:700;cursor:pointer;transform:rotate(-1deg)' : 'flex:1;min-width:84px;min-height:46px;border-radius:4px 14px 8px 18px/10px 6px 14px 6px;border:none;border-bottom:3px solid rgba(58,50,38,0.45);background:rgba(58,50,38,0.08);color:#3a3226;font-size:15px;font-weight:700;cursor:pointer') + ';font-family:inherit'; b.onclick = f; row.appendChild(b); return b; }
    function copy(s, okT) { try { if (navigator.clipboard) navigator.clipboard.writeText(s); else throw 0; msg.textContent = okT; } catch (e) { var t = document.createElement('textarea'); t.value = s; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); msg.textContent = okT; } catch (e2) { msg.textContent = '请手动复制'; } t.remove(); } }
    btn(row1, '复制码', function () { copy(r.my, '已复制引路码'); }, false);
    btn(row1, '复制链接', function () { copy(R.link(), '已复制带引路码的链接'); }, false);
    div('color:#6d6455;font-size:13px', r.by ? '你已由「' + r.by + '」引路（得灵石 +' + (r.newbie || NEWBIE) + '）' : '填写引路码（别人引你进来的；一人只能填一次，新手得灵石 +' + NEWBIE + '）');
    var inp = document.createElement('input'); inp.id = 'refInput'; inp.placeholder = 'XY-XXXXXX'; inp.maxLength = 64; inp.disabled = !!r.by; inp.setAttribute('autocapitalize', 'characters'); inp.setAttribute('spellcheck', 'false');
    inp.style.cssText = 'width:100%;box-sizing:border-box;margin:6px 0 4px;min-height:44px;border:none;border-bottom:2px solid rgba(58,50,38,0.55);background:rgba(255,252,242,0.9);padding:6px 8px;font-size:18px;letter-spacing:2px;color:#3a3226;outline:none;font-family:ui-monospace,Menlo,Consolas,monospace';
    card.appendChild(inp);
    msg = div('min-height:20px;font-size:13.5px;color:#6d6455;margin:2px 0 8px'); msg.id = 'refMsg';
    var row2 = div('display:flex;gap:8px;flex-wrap:wrap');
    var go = btn(row2, '填写', function () { var res = R.apply(inp.value, 'manual'); msg.textContent = res.reason; msg.style.color = res.ok ? '#2f7d3b' : '#b33a2a'; if (res.ok) { inp.disabled = true; go.disabled = true; go.style.opacity = 0.5; row2.lastChild.focus(); } }, true);
    if (r.by) { go.disabled = true; go.style.opacity = 0.5; }
    btn(row2, '关闭', function () { el.remove(); }, false);
    el.onclick = function (e) { if (e.target === el) el.remove(); };
    function onEsc(e) { if (e.key === 'Escape') { el.remove(); document.removeEventListener('keydown', onEsc, true); e.preventDefault(); } }
    document.addEventListener('keydown', onEsc, true);
    var nodes=Array.prototype.slice.call(card.children),origin=document.createElement('section'),arrival=document.createElement('section');origin.className='inkOrigin';arrival.className='inkArrival';nodes.forEach(function(n,i){(i<6?origin:arrival).appendChild(n);});card.appendChild(origin);card.appendChild(arrival);el.appendChild(card); document.body.appendChild(el);if(XY.pv2.dialogKeys)XY.pv2.dialogKeys(el,function(){el.remove();},inp.disabled?row2.lastChild:inp);return el;
  };

  var HUB = XY.hubUI;
  if (HUB) { var oldAct = HUB.act; HUB.act = function (h, p, a) { if (h.act === 'refOpen') { R.dialog(); return true; } return oldAct(h, p, a); }; }
})();
