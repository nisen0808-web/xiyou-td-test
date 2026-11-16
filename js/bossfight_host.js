/* v0.9 Boss 战（牛魔王街霸式对战）主游戏一侧的接入：整页用 iframe 嵌入 bossfight/index.html，图片全部按需载入（点进 Boss 战才请求）。
 *  XY.bossfight.open(ctx)：ctx.kind = 'level' | 'dungeon'（通关结算时调用，只登记“可挑战”，在过关页多出一个按钮）| 'menu'（主菜单入口，直接进）
 *  XY.bossfight.launch(ctx)：真正打开 iframe；结算时由主游戏发奖（灵石）、记通关、刷新解锁链。
 *  XY.bossfight.reward(result, first)：奖励表（纯函数，测试用）。 */
(function () {
  'use strict';
  var XY = window.XY, BASE = 'bossfight/index.html?manual=1', BF = null;
  var CARD_POOL = ['phyrex', 'sisi', 'laosiji', 'kuanggong', 'haiteng', 'yuanzhang', 'heyuxi', 'diaoyulao', 'martin'];
  function ownList() {
    return CARD_POOL.filter(function (k) { try { return XY.save.spOwned(k); } catch (e) { return false; } });
  }
  function reward(r, first, T) {
    if (!r) return { lingshi: 0, text: [] };
    if (!r.win) return { lingshi: 10, text: ['灵石 +10 <em>安慰奖</em>'] };
    var n = first ? 300 : 40 + 20 * r.stars;
    if (T && T.lingshi !== 1) n = Math.round(n * T.lingshi);      // 五档难度：灵石按档位倍率
    return { lingshi: n, text: ['灵石 +' + n + (first ? ' <em>首通</em>' : '') + (T ? ' <em>' + T.name + '档</em>' : ''), '★ ' + r.stars + ' 星', first ? '牛魔王 Boss 战 <em>首通 · 解锁下一环</em>' : '牛魔王 Boss 战 <em>再次通关</em>'] };
  }
  function randomKey() { var bytes = new Uint8Array(16); crypto.getRandomValues(bytes); return Array.prototype.map.call(bytes, function (n) { return ('0' + n.toString(16)).slice(-2); }).join(''); }
  function validResult(r) { return !!r && typeof r.win === 'boolean' && Number.isInteger(r.runId) && r.runId >= 1 && typeof r.battleId === 'string' && /^[a-f0-9]{32}$/.test(r.battleId) && Number.isInteger(r.stars) && r.stars >= (r.win ? 1 : 0) && r.stars <= (r.win ? 3 : 0) && typeof r.time === 'number' && isFinite(r.time) && r.time >= 0 && (!r.win || r.bossHpPct === 0); }
  function msg(t) { var app = window.__xy && window.__xy.app; if (app) app.menuMsg = { text: t, bad: true, until: (app.rt || 0) + 3 }; }
  function blocked(reason) { BF.lastFailureReason = reason; msg(reason); return false; }
  BF = XY.bossfight = {
    host: true, stub: false, frame: null, lastCtx: null, offer: null, lastResult: null, lastFailureReason: null, reward: reward,
    open: function (ctx) {
      ctx = ctx || {}; BF.lastCtx = ctx; BF.lastFailureReason = null;
      if (XY.chain09 && !XY.chain09.unlocked('bossfight')) return blocked('先通关任意一个洞府副本，再来挑战牛魔王');
      if (ctx.kind === 'level' || ctx.kind === 'dungeon') { BF.offer = { kind: ctx.kind, levelId: ctx.levelId, dungeonId: ctx.dungeonId }; if (ctx.G) ctx.G.bossOffer = BF.offer; return 'offer'; }
      return BF.launch(ctx);
    },
    launch: function (ctx) {
      if (BF.frame) return true;
      BF.lastFailureReason = null;
      // 结算页可直接调用 launch，也必须验证同一解锁条件。
      if (XY.chain09 && !XY.chain09.unlocked('bossfight')) return blocked('先通关任意一个洞府副本，再来挑战牛魔王');
      var own = ownList();
      if (!own.length) return blocked('先获得一位特殊人物当搭档');
      BF.lastResult = null;
      var hostKey = location.protocol === 'file:' ? randomKey() : null;
      var entryRev = window.XY_BOSS_ENTRY_REV;
      var fr = document.createElement('iframe'); fr.id = 'bossfightFrame'; var diffT = XY.diff ? XY.diff.bossTier() : 3; fr.src = BASE + '&diff=' + diffT + (entryRev ? '&xyrev=' + encodeURIComponent(entryRev) : '') + (hostKey ? '&hostKey=' + hostKey : '');
      var expectedSrc = fr.src;
      fr.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:9999;background:#efe6cf';
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
            var d = XY.save.data, ledger = d.bossReceipts || (d.bossReceipts = {}), saved = ledger[r.battleId];
            // A battle keeps its own random identity across cloned messages and save reloads.
            // The iframe's display run counter may restart after navigation; it is not a save key.
            if (saved) { BF.lastResult = saved; return { rewards: saved.reward.text }; }
            if (receipts[r.runId]) return receipts[r.runId];
            var first = !(d.chain && d.chain.boss && d.chain.boss.niumo > 0), DT = XY.diff ? XY.diff.tier(diffT) : null, tierFirst = !!(DT && XY.diff.doneMax('B') < diffT), rw = reward(r, first, DT);
            if (r.win) { rw.card = XY.specials.niumoCard(); rw.text.push(rw.card.text); }
            if (r.win && DT) {                                                            // 五档难度：神 / 圣档多送角色卡；打赢记档、开下一档
              var extra = tierFirst ? DT.spFirst : (Math.random() < DT.spAgain ? 1 : 0), ei, ec;
              for (ei = 0; ei < extra; ei++) { ec = XY.specials.niumoCard(); rw.text.push(ec.text + ' <em>' + DT.name + '档加赠</em>'); }
              var opened = XY.diff.bossWin(diffT); if (opened) rw.text.push('开放更难的 <em>' + opened.name + '档</em>');
            }
            XY.save.addLingshi(rw.lingshi);
            var result = { runId: r.runId, battleId: r.battleId, win: r.win, stars: r.stars, time: r.time, partner: r.partner, summon: r.summon, why: r.why, bossHpPct: r.bossHpPct };
            BF.lastResult = ledger[r.battleId] = { result: result, reward: rw, first: first };
            receipts[r.runId] = { rewards: rw.text };
            // Publish the receipt before bossWin's existing flush: card, currency and
            // deduplication state must be serialized in the same save snapshot.
            if (r.win) { XY.chain09.bossWin('niumo'); d.chain.bossBest = d.chain.bossBest || {}; var b = d.chain.bossBest.niumo || (d.chain.bossBest.niumo = { stars: 0, time: 0 }); if (r.stars > b.stars) b.stars = r.stars; if (!b.time || r.time < b.time) b.time = r.time; }
            if (XY.save.touch) XY.save.touch();
            if (XY.save.flush) XY.save.flush();
            try { if (XY.board && XY.board.onBoss) XY.board.onBoss('niumo', r); } catch (e) { if (window.console) console.warn('bossfight.board', e); }
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
            r = { runId: r.runId, battleId: r.battleId, win: r.win, stars: r.stars, time: r.time, partner: r.partner, summon: r.summon, why: r.why, bossHpPct: r.bossHpPct };
            var receipt = context.onResult(r);
            if (receipt && receipt.rewards) send('receipt', { runId: r.runId, battleId: r.battleId, rewards: receipt.rewards });
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
