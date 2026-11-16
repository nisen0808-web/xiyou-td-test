/* ============================================================
 * difficulty.js —— 五档难度：凡 / 灵 / 仙 / 神 / 圣
 *   · 仙 = v0.8.8 r58 原样（所有倍率 1，不加任何照顾）。凡、灵放松，神、圣加难。
 *   · 每个目的地（主线关 / 洞府副本 / 牛魔王 Boss 战 / 守芭蕉洞）各自记档位：
 *     先开凡、灵两档，打赢一档才开下一档。全开测试档五档全开。
 *   · 档位越高掉落越好：通关灵石倍率、法宝升重机缘、特殊角色卡、守洞高级材料。
 *   · 战斗里的接入点只读 G.diff（game.js makeEnemy / hurtHero / 倒地，skills.js followGrow），
 *     没有 G.diff（玩法包、我的洞府验关）就等于仙档。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, D = XY.diff = {};
  // hp/dmg：小怪血、怪伤倍率；boss：洞主血倍率；restSafe：休息时师父不会被打；revive：徒弟倒地后几秒回来（0 = 本关不回来）；
  // follow：没被操控的徒弟每升一级各自白拿几点修行（0 = 全队共用一个点数池）
  // lingshi：通关灵石倍率；fbUp：选法宝时多升一重的几率；spFirst / spAgain：该档首通送几张角色卡 / 再次通关送卡几率；mat：守洞高级材料与妖金倍率
  D.TIERS = [null,
    { id: 1, name: '凡', hp: 0.7, dmg: 0.6, boss: 0.7, restSafe: true, revive: 15, follow: 1, lingshi: 0.6, fbUp: 0, spFirst: 0, spAgain: 0, mat: 0.7, note: '怪弱三成，师父休息时无敌，徒弟倒下 15 秒回来' },
    { id: 2, name: '灵', hp: 0.85, dmg: 0.8, boss: 0.85, restSafe: true, revive: 22, follow: 1, lingshi: 0.8, fbUp: 0, spFirst: 0, spAgain: 0, mat: 0.85, note: '怪稍弱，师父休息时无敌，徒弟倒下 22 秒回来' },
    { id: 3, name: '仙', hp: 1, dmg: 1, boss: 1, restSafe: false, revive: 0, follow: 0, lingshi: 1, fbUp: 0, spFirst: 0, spAgain: 0, mat: 1, note: '标准难度：徒弟倒下本关不回来，修行点全队共用' },
    { id: 4, name: '神', hp: 1.25, dmg: 1.2, boss: 1.3, restSafe: false, revive: 0, follow: 0, lingshi: 1.5, fbUp: 0.3, spFirst: 1, spAgain: 0.15, mat: 1.5, note: '怪血 +25%、伤害 +20%、洞主血 +30%' },
    { id: 5, name: '圣', hp: 1.6, dmg: 1.45, boss: 1.7, restSafe: false, revive: 0, follow: 0, lingshi: 2.2, fbUp: 0.6, spFirst: 2, spAgain: 0.3, mat: 2.2, note: '怪血 +60%、伤害 +45%、洞主血 +70%' }
  ];
  D.MAX = 5; D.BASE = 3; D.NEW_DEFAULT = 2;
  D.tier = function (t) { return D.TIERS[Math.max(1, Math.min(D.MAX, t | 0))] || D.TIERS[D.BASE]; };
  D.rewardText = function (t, key) {
    var T = D.tier(t), p = [];
    if (key === 'V') return '妖金与高级材料 ×' + T.mat;
    p.push('灵石 ×' + T.lingshi);
    if (T.fbUp) p.push('法宝多升一重 ' + Math.round(T.fbUp * 100) + '%');
    if (T.spFirst) p.push('首通角色卡 +' + T.spFirst);
    if (key === 'B') p = p.filter(function (x) { return x.indexOf('法宝') < 0; });
    return p.join(' · ');
  };

  function rec() {
    var d = XY.save && XY.save.data; if (!d) return { sel: {}, done: {} };
    if (!d.diff || typeof d.diff !== 'object' || Array.isArray(d.diff)) d.diff = { sel: {}, done: {} };
    if (!d.diff.sel || typeof d.diff.sel !== 'object') d.diff.sel = {};
    if (!d.diff.done || typeof d.diff.done !== 'object') d.diff.done = {};
    return d.diff;
  }
  // 目的地的键：主线 L1..，副本 D<id>，Boss 战 B，守洞 V
  D.keyOf = function (kind, id) { return kind === 'level' ? 'L' + id : kind === 'dungeon' ? 'D' + id : kind === 'boss' ? 'B' : kind === 'villain' ? 'V' : null; };
  // 改版前就通关过的目的地：算作打过「灵」，直接开到「仙」
  function legacyDone(key) {
    var d = XY.save && XY.save.data; if (!d || !key) return false;
    try {
      if (key.charAt(0) === 'L') return !!(d.levels && d.levels[key.slice(1)] && d.levels[key.slice(1)].cleared);
      if (key.charAt(0) === 'D') return !!(d.dng && d.dng[key.slice(1)] && d.dng[key.slice(1)].cleared);
      if (key === 'B') return !!(d.chain && d.chain.boss && d.chain.boss.niumo > 0);
      if (key === 'V') return !!(XY.VD && XY.VD.ser && XY.VD.ser().cleared > 0);
    } catch (e) { }
    return false;
  }
  D.doneMax = function (key) {
    var m = (rec().done[key] | 0);
    if (m < 2 && legacyDone(key)) m = 2;
    return m;
  };
  D.unlocked = function (key, t) { return t <= 2 || !!XY.TEST_BUILD || D.doneMax(key) >= t - 1; };
  D.maxOpen = function (key) { return XY.TEST_BUILD ? D.MAX : Math.min(D.MAX, Math.max(2, D.doneMax(key) + 1)); };
  D.selected = function (key) {
    var s = rec().sel[key] | 0;
    if (!s) s = legacyDone(key) ? D.BASE : D.NEW_DEFAULT;
    return Math.max(1, Math.min(s, D.maxOpen(key)));
  };
  D.select = function (key, t) {
    t = t | 0; if (!key || t < 1 || t > D.MAX) return { ok: false, reason: '没有这一档' };
    if (!D.unlocked(key, t)) return { ok: false, reason: '先打赢「' + D.tier(t - 1).name + '」档，才能开「' + D.tier(t).name + '」档' };
    rec().sel[key] = t; if (XY.save.touch) XY.save.touch();
    var T = D.tier(t); return { ok: true, reason: '难度「' + T.name + '」：' + T.note + '。掉落：' + D.rewardText(t, key) };
  };
  // 打赢了：记下这一档，返回是否新开了下一档
  D.markDone = function (key, t) {
    var r = rec(), before = D.maxOpen(key);
    if ((r.done[key] | 0) < t) r.done[key] = t;
    if (XY.save.touch) XY.save.touch();
    var after = D.maxOpen(key);
    return after > before ? D.tier(after) : null;
  };

  // 开局时由 game.js 调：这一局用哪一档。玩法包 / 我的洞府验关不分档（= 仙）。
  D.forRun = function (LV, opts) {
    opts = opts || {};
    if (!LV || LV.mod || LV.lair || opts.lair || opts.mod) return null;
    var key = (LV.villain || opts.villain) ? 'V' : LV.dungeon ? 'D' + LV.dungeon : 'L' + LV.id, t = D.selected(key), T = D.tier(t), o = {}, k;
    for (k in T) o[k] = T[k];
    o.key = key; o.tier = t;
    if (key === 'V') { o.restSafe = false; o.revive = 0; o.follow = 0; }       // 守洞是一个人守，没有师父和徒弟这几条
    return o;
  };

  /* ---------- 掉落 1：通关灵石倍率 + 高档位送角色卡；同时记档位 ---------- */
  if (XY.save && XY.save.commitRun) {
    var oldCommit = XY.save.commitRun;
    XY.save.commitRun = function (G, result) {
      if (G.committed) return G.runReport;
      var df = G.diff, was = df ? D.doneMax(df.key) : 0;
      var rep = oldCommit(G, result);
      if (!df || !rep || G.villain || G.godMode || G.mod) return rep;
      var gain = (G.run && G.run.clearGain) || 0, delta = Math.round(gain * df.lingshi) - gain;
      if (delta && XY.save.addLingshi) { XY.save.addLingshi(delta); G.run.lingshi += delta; G.run.clearGain = gain + delta; }
      rep.diff = { tier: df.tier, name: df.name, lingshiMul: df.lingshi };
      if (result === 'win') {
        var first = was < df.tier, n = first ? df.spFirst : (Math.random() < df.spAgain ? 1 : 0), i;
        for (i = 0; i < n; i++) if (XY.specials && XY.specials.drop) XY.specials.drop(G, 'diff');
        if (n) rep.spGot = (G.spGot || []).map(function (x) { return x.id; });
        var opened = D.markDone(df.key, df.tier);
        if (opened) { rep.diff.opened = opened.name; if (XY.toast) XY.toast(G, '打赢了「' + df.name + '」档：开放更难的「' + opened.name + '」档，掉落更好'); }
      }
      if (XY.save.flush) XY.save.flush();
      return rep;
    };
  }

  /* ---------- 掉落 2：神 / 圣档选法宝时有几率多升一重 ---------- */
  if (XY.fabao && XY.fabao.take) {
    var FB = XY.fabao, oldTake = FB.take;
    FB.take = function (G, c, opts) {
      var ok = oldTake.apply(this, arguments), df = G && G.diff;
      if (ok && df && df.fbUp > 0 && c && c.k !== 'fuse' && Math.random() < df.fbUp) {
        var h = FB.held(G, c.id);
        if (h && h.lv < FB.maxLv(c.id)) {
          h.lv++; FB.refresh(G);
          if (G.stats) G.stats.diffFbUp = (G.stats.diffFbUp || 0) + 1;
          if (XY.toast) XY.toast(G, '「' + df.name + '」档机缘：' + FB.BY[c.id].name + ' 再升一重，Lv' + h.lv);
        }
      }
      return ok;
    };
  }

  /* ---------- 掉落 3：守芭蕉洞的妖金和高级材料按档位加成；打赢记档 ---------- */
  if (XY.villain && XY.villain.rewards) {
    var V = XY.villain, oldRw = V.rewards, oldVCommit = V.commit;
    V.rewards = function (G, result, opt) {
      var out = oldRw.apply(this, arguments), df = G && G.diff;
      if (!out || !df || (opt && opt.sweep) || df.mat === 1) return out;
      out.yaojin = Math.round(out.yaojin * df.mat);
      if (out.win && out.mats && XY.VD && XY.VD.MATS) Object.keys(out.mats).forEach(function (m) { if (XY.VD.MATS[m] && XY.VD.MATS[m].boss) out.mats[m] = Math.max(df.mat < 1 ? 0 : 1, Math.round(out.mats[m] * df.mat)); });
      out.diff = { tier: df.tier, name: df.name, mat: df.mat };
      return out;
    };
    if (oldVCommit) V.commit = function (G, result) {
      var fresh = !G.committed, rep = oldVCommit.apply(this, arguments), df = G && G.diff;
      if (fresh && df && result === 'win' && rep && !rep.skipped) {
        var opened = D.markDone('V', df.tier);
        rep.diff = { tier: df.tier, name: df.name, opened: opened ? opened.name : null };
        if (XY.save.flush) XY.save.flush();
      }
      return rep;
    };
  }

  /* ---------- 选档条：五个小印，出发页和守洞页共用。st = villainUI.begin 返回的画布状态（st.hit 登记点击）。返回占用高度 ---------- */
  D.PICK_H = 44;
  D.drawPicker = function (c, st, key, x, y, w) {
    var sel = D.selected(key), gap = Math.max(4, Math.min(8, w * 0.02)), cw = Math.min(64, (w - gap * 4) / 5), h = 36, y0 = y + (D.PICK_H - h) / 2, i, T, cx, on, open;
    var font = function (sz) { return XY.R && XY.R.font ? XY.R.font(sz, true) : 'bold ' + sz + 'px serif'; };
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
    for (i = 1; i <= D.MAX; i++) {
      T = D.TIERS[i]; cx = x + (i - 1) * (cw + gap); on = i === sel; open = D.unlocked(key, i);
      c.beginPath(); if (c.roundRect) c.roundRect(cx, y0, cw, h, 6); else c.rect(cx, y0, cw, h);
      c.fillStyle = on ? '#b8322a' : open ? 'rgba(253,249,238,0.96)' : 'rgba(214,205,186,0.55)'; c.fill();
      c.lineWidth = on ? 1.8 : 1; c.strokeStyle = on ? '#8f241d' : open ? 'rgba(112,91,59,0.55)' : 'rgba(112,91,59,0.22)'; c.stroke();
      c.font = font(Math.min(19, cw * 0.42)); c.fillStyle = on ? '#fff7e6' : open ? '#3a3226' : '#a39681';
      c.fillText(T.name, cx + cw / 2, y0 + h / 2 + 1);
      if (st && st.hit) st.hit(cx, y, cw, D.PICK_H, 'diffSel', { key: key, t: i });
    }
    c.restore();
    D.lastPicker = { key: key, x: x, y: y, w: cw * 5 + gap * 4, h: D.PICK_H, sel: sel };
    return D.PICK_H;
  };

  /* ---------- Boss 战（独立页面）：档位随地址带进去；灵石倍率和记档由 bossfight_host.js 调这两个 ---------- */
  D.bossTier = function () { return D.selected('B'); };
  D.bossWin = function (t) { return D.markDone('B', t); };
})();
