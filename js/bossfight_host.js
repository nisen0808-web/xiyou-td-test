/* v0.9 Boss 战（牛魔王街霸式对战）主游戏一侧的接入：整页用 iframe 嵌入 bossfight/index.html，图片全部按需载入（点进 Boss 战才请求）。
 *  XY.bossfight.open(ctx)：ctx.kind = 'level' | 'dungeon'（通关结算时调用，只登记“可挑战”，在过关页多出一个按钮）| 'menu'（主菜单入口，直接进）
 *  XY.bossfight.launch(ctx)：真正打开 iframe；结算时由主游戏发奖（灵石）、记通关、刷新解锁链。
 *  XY.bossfight.reward(result, first)：奖励表（纯函数，测试用）。 */
(function () {
  'use strict';
  var XY = window.XY, BASE = 'bossfight/index.html?manual=1', BF = null;
  function ownList() {
    var all = ['phyrex', 'sisi', 'laosiji', 'kuanggong', 'haiteng', 'yuanzhang', 'heyuxi', 'diaoyulao', 'martin'];
    return all.filter(function (k) { try { return XY.save.spOwned(k); } catch (e) { return false; } });
  }
  function reward(r, first) {
    if (!r) return { lingshi: 0, text: [] };
    if (!r.win) return { lingshi: 10, text: ['灵石 +10 <em>安慰奖</em>'] };
    var n = first ? 300 : 40 + 20 * r.stars;
    return { lingshi: n, text: ['灵石 +' + n + (first ? ' <em>首通</em>' : ''), '★ ' + r.stars + ' 星', first ? '牛魔王 Boss 战 <em>首通 · 解锁下一环</em>' : '牛魔王 Boss 战 <em>再次通关</em>'] };
  }
  function randomKey() { var bytes = new Uint8Array(16); crypto.getRandomValues(bytes); return Array.prototype.map.call(bytes, function (n) { return ('0' + n.toString(16)).slice(-2); }).join(''); }
  function validResult(r) { return !!r && typeof r.win === 'boolean' && Number.isInteger(r.runId) && r.runId >= 1 && Number.isInteger(r.stars) && r.stars >= 0 && r.stars <= 3 && typeof r.time === 'number' && isFinite(r.time) && r.time >= 0; }
  function msg(t) { var app = window.__xy && window.__xy.app; if (app) app.menuMsg = { text: t, bad: true, until: (app.rt || 0) + 3 }; }
  BF = XY.bossfight = {
    host: true, stub: false, frame: null, lastCtx: null, offer: null, lastResult: null, reward: reward,
    open: function (ctx) {
      ctx = ctx || {}; BF.lastCtx = ctx;
      if (XY.chain09 && !XY.chain09.unlocked('bossfight')) return false;
      if (ctx.kind === 'level' || ctx.kind === 'dungeon') { BF.offer = { kind: ctx.kind, levelId: ctx.levelId, dungeonId: ctx.dungeonId }; if (ctx.G) ctx.G.bossOffer = BF.offer; return 'offer'; }
      return BF.launch(ctx);
    },
    launch: function (ctx) {
      if (BF.frame) return true;
      var own = ownList();
      if (!own.length) { msg('先获得一位特殊人物当搭档'); return false; }
      BF.lastResult = null;
      var hostKey = location.protocol === 'file:' ? randomKey() : null;
      var fr = document.createElement('iframe'); fr.id = 'bossfightFrame'; fr.src = BASE + (hostKey ? '&hostKey=' + hostKey : '');
      var expectedSrc = fr.src;
      fr.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:0;z-index:9999;background:#efe6cf';
      var wf = XY.app && XY.app.frame; if (wf && wf.x > 0) { fr.style.left = wf.x + 'px'; fr.style.width = wf.w + 'px'; }   // 超宽屏：Boss 战和主画面用同一个居中画框
      fr.setAttribute('allow', 'autoplay'); BF.frame = fr; BF.loadedAt = Date.now();
      var chosen = null; try { chosen = XY.save.carryId(); } catch (e) { }
      var loadToken = 0, loaded = false, dispose = null;
      function disposeLoad() { if (dispose) { dispose(); dispose = null; } }
      function armTimeout() { clearTimeout(BF._t); BF._t = setTimeout(function () { if (BF.frame === fr && !loaded) BF.fail(); }, 8000); }
      BF._dispose = disposeLoad;
      fr.onload = function () {
        if (BF.frame !== fr) return;
        if (fr.src !== expectedSrc) { BF.fail(); return; }
        disposeLoad(); loaded = false; armTimeout();
        var token = ++loadToken, receipts = Object.create(null);
        var w = fr.contentWindow, bf = null, opaque = false;
        try { bf = w && w.XY && w.XY.bossfight; }
        catch (e) { if (location.protocol === 'file:' && e.name === 'SecurityError') opaque = true; else { BF.fail(); return; } }
        if (!opaque && !bf) { BF.fail(); return; }
        try { w.focus(); } catch (e) { }
        var context = {
          own: own, partner: (chosen && own.indexOf(chosen) >= 0) ? chosen : own[0], skipIntro: false,
          onResult: function (r) {
            if (BF.frame !== fr || token !== loadToken || !validResult(r)) return { rewards: [] };
            if (receipts[r.runId]) return receipts[r.runId];
            var first = !(XY.save.data.chain && XY.save.data.chain.boss && XY.save.data.chain.boss.niumo > 0), rw = reward(r, first);
            BF.lastResult = { result: r, reward: rw, first: first };
            receipts[r.runId] = { rewards: rw.text };
            try {
              XY.save.addLingshi(rw.lingshi);
              if (r.win) { XY.chain09.bossWin('niumo'); var d = XY.save.data; d.chain.bossBest = d.chain.bossBest || {}; var b = d.chain.bossBest.niumo || (d.chain.bossBest.niumo = { stars: 0, time: 0 }); if (r.stars > b.stars) b.stars = r.stars; if (!b.time || r.time < b.time) b.time = r.time; if (XY.save.touch) XY.save.touch(); }
              if (XY.board && XY.board.onBoss) XY.board.onBoss('niumo', r);                       // v0.9 排行榜：Boss 战榜（赢了记最短用时 + 最高伤害）
              if (XY.save.flush) XY.save.flush();
            } catch (e) { if (window.console) console.warn('bossfight.result', e); }
            return receipts[r.runId];
          },
          onExit: function (r) { if (BF.frame === fr && token === loadToken) BF.close(); }
        };
        if (!opaque) { loaded = true; clearTimeout(BF._t); bf.open(context); return; }
        // Opaque file documents cannot inspect one another. Transfer a dedicated port
        // only after source+origin+per-load challenge AND URL capability match. The child
        // transfers its own port, so navigation cannot hand a parent-created port to another document.
        var key = randomKey();
        var port = null, opened = false, origin = 'null';
        function active() { return BF.frame === fr && token === loadToken; }
        function send(kind, value) { if (port && active()) port.postMessage({ bridge: 'xy-boss-1', token: key, kind: kind, value: value }); }
        function receive(e) {
          if (!active()) return;
          var m = e.data;
          if (!m || m.bridge !== 'xy-boss-1' || m.token !== key) return;
          if (m.kind === 'opened' && !opened) { opened = loaded = true; clearTimeout(BF._t); }
          else if (m.kind === 'result' && opened) {
            var r = m.value;
            if (!validResult(r) || own.indexOf(r.partner) < 0 || (r.summon !== null && ['phyrex', 'sisi', 'laosiji', 'kuanggong', 'haiteng', 'yuanzhang', 'heyuxi', 'diaoyulao', 'martin'].indexOf(r.summon) < 0) || (r.why !== null && typeof r.why !== 'string') || !Number.isInteger(r.bossHpPct) || r.bossHpPct < 0 || r.bossHpPct > 100) return;
            // Copy only result fields; callbacks/commands are never part of the protocol.
            r = { runId: r.runId, win: r.win, stars: r.stars, time: r.time, partner: r.partner, summon: r.summon, why: r.why, bossHpPct: r.bossHpPct };
            var receipt = context.onResult(r);
            if (receipt && receipt.rewards) send('receipt', { runId: r.runId, rewards: receipt.rewards });
          } else if (m.kind === 'exit' && opened) context.onExit();
        }
        function handshake(e) {
          var m = e.data;
          if (!e.isTrusted || !active() || e.source !== w || e.origin !== origin || !m || m.bridge !== 'xy-boss-1' || m.kind !== 'ready' || m.token !== key || m.hostKey !== hostKey || e.ports.length !== 1 || port) return;
          port = e.ports[0];
          port.onmessage = receive; port.start(); window.removeEventListener('message', handshake);
          send('open', { own: own, partner: context.partner });
        }
        dispose = function () { window.removeEventListener('message', handshake); if (port) { port.onmessage = null; port.close(); port = null; } };
        window.addEventListener('message', handshake);
        w.postMessage({ bridge: 'xy-boss-1', kind: 'probe', token: key }, '*');
      };
      document.body.appendChild(fr); if (XY.villainUI && XY.villainUI.tipDom) XY.villainUI.tipDom('bossfight');
      armTimeout();
      return true;
    },
    fail: function () { BF.close(); msg('Boss 战资源没找到：bossfight 文件夹要和 index.html 放在同一目录'); },
    close: function () {
      clearTimeout(BF._t); var fr = BF.frame; if (!fr) return; BF.frame = null;
      if (BF._dispose) { BF._dispose(); BF._dispose = null; }
      if (fr) { try { fr.contentWindow.XY.bossfight.close(); } catch (e) { } if (fr.parentNode) fr.parentNode.removeChild(fr); }
      if (BF.lastResult && BF.lastResult.result.win) BF.offer = null;
      try { window.focus(); } catch (e) { }
      // v0.9 首次打赢 Boss 战：播一段牛魔王「不服气」短过场，然后打开反派模式首页（只播一次）
      var d = XY.save.data;
      if (BF.lastResult && BF.lastResult.result.win && XY.villainUI && d.tips && !d.tips.cut) XY.villainUI.cutscene(function () { var w = window.__xy; if (w) { w.toMenu(); XY.villain.open({ page: 'home' }); } });
    }
  };
  XY.FLAGS09 = XY.FLAGS09 || {}; XY.FLAGS09.bossEntry = true; XY.FLAGS09.villainEntry = true;
})();
