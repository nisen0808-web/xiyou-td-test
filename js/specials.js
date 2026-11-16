/* ============================================================
 * specials.js —— 常驻特殊角色（v0.4）：名册 / 头像 / 卡牌升级 / 存档 / 商店
 *
  * 名册 12 位（v0.5 起 qinbafrank、TraderS 暂时隐藏，v0.6 起 Cato 也隐藏，见 XY.HIDDEN_SPECIALS，可玩 9 位）（Phyrex、Sisi、币圈老司机、DeFi小矿工、Cato、腾EO、园长、羽溪、钓鱼佬、马丁、qinbafrank、TraderS；不含 CZ、何一）；第一个获得的永远是 Phyrex，其余 11 位随机。
 * 这里的数值 / 技能只是“占位原型”（arch 决定玩法：dash 冲刺混合 / heal 治疗法术 / mark 点杀 / tank 坦克 / storm 闪电），
 * 每个人的真实特色以后由 docs/specials-roster-draft.json 的调研结果填进下面的数据，逻辑不用改。
 * 头像：可选图片（assets/specials/<id>.jpg）。dist 里由 build.sh 内联成 data URI（window.XY_AVATAR_DATA）；图片缺失就回退成程序画的头像。
 * 获得方式只有两种：随机掉落 / 商店用游戏内灵石买。没有真钱、没有支付界面。
 * ============================================================ */
(function () {
  var XY = window.XY;

  XY.SP_LV_AT = [2, 5, 10, 20, 40];            // 收集到这么多张卡 = Lv1 ~ Lv5
  XY.SP_PRICE = 160;                            // 商店里一张角色卡的灵石价
  // 12 位常驻角色的“人设 / 技能名 / 特性名与 CD / 3 条技能树分支名 / 3 个辅助技能”取自 docs/specials-roster-draft.json（调研草稿，待用户审阅措辞）。
  // 机制按 5 种玩法原型（arch: dash 冲刺环 / heal 治疗 / mark 点杀 / tank 坦克 / storm 闪电链）实现，每种原型 2~3 位角色（storm: Phyrex/Cato/qinbafrank，tank: 腾EO/DeFi小矿工/TraderS，其余各两位），靠 元素 / 物法伤害 / 物防法防 / 血量 / 速度 / 技能名 / 特性 CD 区分；
  // design.main / design.trait 是调研稿里的“设计意图原文”，只在详情提示里当“设定”展示；wdesc / udesc / trait.desc 才是实装效果。稿里的“塔”一律按我们的 护法天兵 / 友军理解。
  XY.SPECIALS = [
   {
    "id": "phyrex",
    "name": "Phyrex",
    "handle": "@PhyrexNi",
    "arch": "storm",
    "elem": "metal",
    "dtype": "magic",
    "pdef": 0.05,
    "mdef": 0.1,
    "color": "#f0d27a",
    "dark": "#a8801f",
    "frame": "#fff1bd",
    "hp": 215,
    "speed": 220,
    "r": 17,
    "role": "王牌：BTC 远程 + 环绕 + 满级变身",
    "roleKey": "ace",
    "power": 1,
    "weapon": "燃烧的 BTC 币",
    "wdesc": "向近处敌人发射可穿透的 BTC 币，命中后持续灼烧；身边的环绕币造成接触伤害",
    "ult": "比特币光印",
    "udesc": "BTC 光印打击落地时视野内的敌人，随后两次打击视野内强敌；精英受到的伤害提高20%，持续6秒",
    "ultCd": 30,
    "trait": {
     "name": "币值暴涨",
     "short": "搬",
     "cd": 45,
     "color": "#9a6ae0",
     "desc": "重击800范围内的目标，优先首领、其次当前生命最多者；非首领最多眩晕1.5秒"
    },
    "strong": "只用 BTC 攻击：穿透灼烧、环绕护身、全屏光印；队伍满级 99 可变身 ×10",
    "weakTxt": "本体脆弱;币环要贴身才起效,被围住时靠大招解围",
    "branches": [
     "币火流:每次发射更多 BTC 币",
     "环绕流:强化币数、转速和接触伤害；命中标记易伤，标记目标死亡掉金币",
     "算力流:强化灼烧与光印威力"
    ],
    "sup": [
     {
      "name": "币价快报",
      "effect": "周围380范围内敌人受到的法术伤害增加15%，持续6秒。 冷却10秒。",
      "cd": "CD 10s"
     },
     {
      "name": "矿机",
      "effect": "放下持续8秒的矿机，范围240内每0.5秒砸击一名敌人，基础伤害16；附近召唤友军攻速+40%。 冷却14秒。",
      "cd": "CD 14s"
     },
     {
      "name": "币值缩水",
      "effect": "随机缩小450范围内最多1只尚未缩水的普通敌人：当前及最大生命减半、攻击伤害降低30%、体型缩小40%；精英、首领和敌塔不受影响。 冷却18秒。",
      "cd": "CD 18s"
     }
    ],
    "design": {
     "main": "燃烧的 BTC 币穿透灼烧 + 身边 BTC 环绕",
     "trait": "点击:向最强的妖怪砸下一枚巨型 BTC",
     "note": "简介里有“不构成投资建议”,游戏里只做搞笑/科普风格,不涉及任何行情或价格。"
    }
   },
   {
    "id": "sisi",
    "name": "Sisi",
    "handle": "@sisibinance",
    "arch": "heal",
    "elem": "wood",
    "dtype": "magic",
    "pdef": 0.05,
    "mdef": 0.3,
    "color": "#5fbf6a",
    "dark": "#2f8a3a",
    "frame": "#8fe39a",
    "hp": 200,
    "speed": 175,
    "r": 17,
    "role": "治疗 / 护盾",
    "roleKey": "heal",
    "weapon": "在线守护",
    "wdesc": "发射藤蔓弹，束缚并减速非首领；同时给附近生命比例最低的存活护法治疗、加盾（不含唐僧）",
    "ult": "防钓鱼盾",
    "udesc": "护盾冲击视野内敌人；存活护法基础回复30%最大生命、获得25%最大生命护盾（不含唐僧，不复活）",
    "ultCd": 34,
    "trait": {
     "name": "全天在线",
     "short": "全",
     "cd": 50,
     "color": "#5fbf6a",
     "desc": "所有存活护法回复30%最大生命，包括自己；不含唐僧和天兵，不复活"
    },
    "strong": "治疗与护盾；学习辅助技能后可净化、提供随机强化",
    "weakTxt": "自身输出低,没有队友时很慢",
    "branches": [
     "守护流:提高普攻与大招的护盾量；总护盾不超过受益者最大生命90%",
     "礼物流:增加每次普攻治疗、加盾的人数，不改变辅助抽奖",
     "角宿流:提高藤蔓伤害并延长非首领的定身时间"
    ],
    "sup": [
     {
      "name": "防钓鱼盾",
      "effect": "320范围内存活英雄清除眩晕和减速，并获6%最大生命护盾；召唤友军获25%护盾。双方减伤15%，持续4秒。英雄不含唐僧；总吸收护盾最多为自身生命上限的90%。 冷却12秒。",
      "cd": "CD 12s"
     },
     {
      "name": "幸运抽奖",
      "effect": "优先随机强化一名召唤友军：伤害+50%、攻速+40%或射程+120，三选一，持续8秒。没有召唤友军时强化第一位存活护法，改为伤害+40%、攻速+40%或移速+15%。 冷却15秒。",
      "cd": "CD 15s"
     },
     {
      "name": "角宿进攻",
      "effect": "攻击450范围内最近敌人，造成26基础法术伤害并击退，眩晕至多0.2秒；首领和抗性会限制控制效果。 冷却5秒。",
      "cd": "CD 5s"
     }
    ],
    "design": {
     "main": "向四周放出治疗绿光,回复范围内护法天兵/主角的生命,并给他们一层短护盾",
     "trait": "点击:一次大范围治疗并让所有护法天兵 5 秒内不受负面状态影响",
     "note": "用“官方渠道”“防钓鱼”做机制,不涉及任何具体事件。"
    }
   },
   {
    "id": "laosiji",
    "name": "币圈老司机",
    "handle": "@Bqlsj2023",
    "arch": "mark",
    "elem": "fire",
    "dtype": "magic",
    "pdef": 0.05,
    "mdef": 0.1,
    "color": "#e0452e",
    "dark": "#982412",
    "frame": "#ff8a6a",
    "hp": 205,
    "speed": 185,
    "r": 17,
    "role": "火球点射 / 标记引爆",
    "roleKey": "hunt",
    "weapon": "追热点",
    "wdesc": "朝近处敌人发射定向火球，命中后标记8秒；标记目标死亡时在周围爆炸",
    "ult": "翻译一下",
    "udesc": "打击视野内敌人；精英、首领和敌塔受到的伤害提高30%，持续8秒",
    "ultCd": 32,
    "trait": {
     "name": "热搜上榜",
     "short": "热",
     "cd": 40,
     "color": "#e0452e",
     "desc": "重击700范围内当前生命最多的敌人；非首领最多眩晕3秒"
    },
    "strong": "定向火球、标记死亡爆炸；大招使强敌易伤",
    "weakTxt": "单发伤害不高,面对大量小怪需配合大招与技能成长",
    "branches": [
     "火球流:增加每次发射的定向火球数，火球不会转弯追踪或分裂",
     "标记流:扩大标记目标死亡时的爆炸范围，提高爆炸伤害",
     "老司机流:大招落地时获得短暂无敌，并向700内最近的敌人位移"
    ],
    "sup": [
     {
      "name": "翻译一下",
      "effect": "380范围内敌人受到的伤害增加12%，持续6秒，并留下标记。 冷却11秒。",
      "cd": "CD 11s"
     },
     {
      "name": "发车",
      "effect": "向最近敌人方向冲刺480距离，碰撞基础伤害40，冲刺时短暂无敌；沿路留下5片火区，持续3秒，每0.5秒造成8基础伤害。 冷却10秒。",
      "cd": "CD 10s"
     },
     {
      "name": "被截图了",
      "effect": "留下生命为260的诱敌分身，持续3秒。分身不攻击，会吸引420范围内敌人；矿工的诱敌优先。 冷却16秒。",
      "cd": "CD 16s"
     }
    ],
    "design": {
     "main": "发射 2 枚追踪火球,自动锁定最近的敌人,绝不打空",
     "trait": "点击:所有在场敌人同时被追踪火球锁定并命中一次",
     "note": "“追热点”做成追踪弹;所有币安/被盗/朝鲜相关内容(他最近的帖子里很多)都已排除。"
    }
   },
   {
    "id": "kuanggong",
    "name": "DeFi小矿工",
    "handle": "@DeFi8362",
    "arch": "tank",
    "elem": "earth",
    "dtype": "phys",
    "pdef": 0.32,
    "mdef": 0.25,
    "color": "#9a7448",
    "dark": "#5e4426",
    "frame": "#c9a36b",
    "hp": 340,
    "speed": 140,
    "r": 22,
    "role": "坦克 / 嘲讽 / 经济",
    "roleKey": "tank",
    "weapon": "挖矿",
    "wdesc": "向前小范围砸击、击退敌人；每名被砸中的敌人各有15%基础概率掉2金币",
    "ult": "下次一定",
    "udesc": "重镐震击视野内敌人；存活护法获得15%最大生命基础护盾（不含唐僧），并散落金币",
    "ultCd": 36,
    "trait": {
     "name": "HODL 拿住",
     "short": "H",
     "cd": 45,
     "color": "#9a7448",
     "desc": "施放时300范围内的存活护法获得50%减伤，持续5秒；不含唐僧和天兵"
    },
    "strong": "近身击退与出矿；特性减伤，辅助提供嘲讽和金币",
    "weakTxt": "移速慢、攻击距离短；近身作战需要护盾与走位",
    "branches": ["挖矿流:扩大普攻砸击范围、提高击退力度", "定投流:提高普攻砸击掉金币的概率，不缩短辅助定投的间隔", "HODL流:提高大招护盾量，并在4秒后治疗存活护法；不改变特性减伤"],
    "sup": [{"name": "人菜话多", "effect": "附近300范围内至少有3名敌人时发动嘲讽，420范围内的敌人优先追击自己，持续3秒。 冷却14秒。", "cd": "CD 14s"}, {"name": "每月定投", "effect": "每30秒获得6金币。战斗每经过90秒，每次再增加6金币，最多增5档；最高每次36金币。 被动。", "cd": "被动"}, {"name": "白嫖空投", "effect": "存活时，金币掉落概率提高10%（按原概率计算）。 被动。", "cd": "被动"}],
    "design": {"main": "小范围砸击并击退", "trait": "点击:300 范围内友军受到的伤害 −50%,持续 5 秒(“5年 HODL 刚刚开始”)", "note": "全部技能是游戏机制,不涉及币价、买卖或投资建议,不含他账号里的交易所推广链接;近期大量与交易所被盗、黑客组织相关的评论一律不采用。“暴富?下次一定!”只作大招名,“下次一定”=把妖怪晃晕、不让它们得手。"}
   },
   {
    "id": "cato",
    "name": "猫叔",
    "handle": "@Cato_KT",
    "arch": "storm",
    "elem": "water",
    "dtype": "magic",
    "pdef": 0.05,
    "mdef": 0.18,
    "color": "#4aa8c8",
    "dark": "#1f6c8a",
    "frame": "#7fd0ee",
    "hp": 220,
    "speed": 220,
    "r": 17,
    "role": "减益 / 成长型输出",
    "roleKey": "debuff",
    "power": 0.7,
    "weapon": "五大要素",
    "wdesc": "五行法术依次切换，连锁打击至多3名敌人；累计5次出手后在首个目标周围爆发",
    "ult": "搭框架",
    "udesc": "水波打击视野内敌人，使强敌受到的伤害提高30%持续8秒；留下持续6秒的减速水域",
    "ultCd": 30,
    "trait": {
     "name": "福祸相依",
     "short": "福",
     "cd": 42,
     "color": "#4aa8c8",
     "desc": "重击800范围内的目标，优先首领、其次当前生命最多者；非首领最多眩晕1.5秒"
    },
    "strong": "五行连锁、自身击杀成长；大招使强敌易伤并留下减速水域",
    "weakTxt": "前期弱、需要时间“积累框架”",
    "branches": [
     "要素流:提高触发五行爆发所需的出手次数；此专属键不会扩大或强化爆发",
     "耕耘流:提高自身击杀带来的伤害成长及成长上限",
     "水域流:扩大、延长大招水域，并短暂定住非首领"
    ],
    "sup": [
     {
      "name": "搭框架",
      "effect": "给范围内敌人上“已分析”标记:易伤 +10%,可叠到 3 层",
      "cd": "CD 11s"
     },
     {
      "name": "流动性收紧",
      "effect": "地面出现一片水域,敌人在其中减速并持续受伤",
      "cd": "CD 15s"
     },
     {
      "name": "老农耕耘",
      "effect": "每过 10 秒永久小幅提高自身法术伤害(每关上限 +30%)",
      "cd": "被动"
     }
    ],
    "design": {
     "main": "连续打出 5 道水刃,每命中一次叠一层“要素”,叠满 5 层时下一击翻倍",
     "trait": "点击:先给自己一个短护盾;护盾被打破或结束时,爆发一次大范围水波",
     "note": "只用“五要素/老农/框架”的结构梗;所有宏观、行情、事件内容都没有进入技能。"
    }
   },
   {
    "id": "haiteng",
    "name": "腾EO",
    "handle": "@Haiteng_okx",
    "arch": "tank",
    "elem": "metal",
    "dtype": "phys",
    "pdef": 0.48,
    "mdef": 0.3,
    "color": "#d4a62a",
    "dark": "#8a6a0b",
    "frame": "#f2cf62",
    "hp": 440,
    "speed": 125,
    "r": 22,
    "role": "区域封锁 / 缩圈护阵",
    "roleKey": "zone",
    "power": 0.4,
    "weapon": "安全圈",
    "wdesc": "向前砸地并击退敌人；每第三次出手留下收缩区域，伤害外沿敌人并向内推",
    "ult": "大逃杀缩圈",
    "udesc": "冲击从外向内收拢；存活护法获20%最大生命基础护盾，脚下守护区提供35%基础减伤、持续5秒（不含唐僧）",
    "ultCd": 36,
    "trait": {
     "name": "加固",
     "short": "加",
     "cd": 40,
     "color": "#d4a62a",
     "desc": "施放时300范围内的存活护法获得50%减伤，持续5秒；不含唐僧和天兵"
    },
    "strong": "每第三次普攻缩圈、大招加盾；学习「复活机制」后可救命",
    "weakTxt": "移动慢,输出一般",
    "branches": [
     "铁壁流:提高大招护盾、守护区减伤和持续时间；不会挡住敌人移动或反伤",
     "缩圈流:扩大每第三次普攻的收缩区域、提高外沿伤害；不增加圈数或收缩速度",
     "复活流:先学辅助「复活机制」才生效，增加队伍每关共用救命次数；不救唐僧"
    ],
    "sup": [
     {
      "name": "大逃杀缩圈",
      "effect": "生成持续6秒的收缩圈，半径由380缩至130。460范围内处于圈外的敌人每0.4秒受到11基础伤害。 冷却16秒。",
      "cd": "CD 16s"
     },
     {
      "name": "复活机制",
      "effect": "腾EO存活且已学此技时，队伍每关共享1次救命：致命伤时恢复50%最大生命，并无敌2秒；不含唐僧。治疗分支可提高恢复量，最多满血；额外次数来自对应分支。 被动。",
      "cd": "每关1次 · 被动"
     },
     {
      "name": "多一道防线",
      "effect": "为700范围内生命比例最低的存活护法或召唤友军增加22%最大生命护盾，不含唐僧；总吸收护盾最多为自身生命上限的90%。 冷却9秒。",
      "cd": "CD 9s"
     }
    ],
    "design": {
     "main": "在脚下展开一圈金色防线:圈内护法天兵受到伤害 -25%,进入圈内的敌人减速",
     "trait": "点击:立刻在主角周围升起一圈金墙 4 秒,挡住所有近战敌人",
     "note": "自嘲和“安全”是他的主旋律;不涉及任何具体安全事件。"
    }
   },
   {
    "id": "yuanzhang",
    "name": "园长",
    "handle": "@sanyuanVC",
    "arch": "dash",
    "elem": "wood",
    "dtype": "phys",
    "pdef": 0.12,
    "mdef": 0.08,
    "color": "#3fa797",
    "dark": "#1f6a60",
    "frame": "#8fdccd",
    "hp": 235,
    "speed": 190,
    "r": 19,
    "role": "召唤(亡灵)",
    "roleKey": "summon",
    "weapon": "唤骨令",
    "wdesc": "向前发射穿透骨环；每三次出手尝试召唤一名亡灵，轮流唤出阴兵、白骨弓手、游魂、尸魔",
    "ult": "百鬼夜行",
    "udesc": "亡灵横扫视野内敌人，召唤至多3名亡灵（场上最多6名，招魂分支可增加本次数量）；精英易伤20%持续6秒",
    "ultCd": 30,
    "trait": {
     "name": "鬼门大开",
     "short": "鬼",
     "cd": 40,
     "color": "#3fa797",
     "desc": "沿操控方向冲刺420，未输入方向时沿当前朝向；沿途撞伤敌人，并无敌0.6秒"
    },
    "strong": "轮流召唤四种亡灵；强化招魂、养魂可提高持续作战能力",
    "weakTxt": "亡灵会被打散、怕范围伤害",
    "branches": [
     "招魂流:提高普攻召唤上限、大招召唤数及新亡灵入场护盾",
     "养魂流:提高新召唤亡灵的伤害；不强化已在场亡灵，不附加再生",
     "魂灯流:亡灵附近的敌人死亡时额外掉金币，不要求亡灵最后一击，不额外掉角色卡"
    ],
    "sup": [
     {
      "name": "附魂",
      "effect": "优先为最近召唤友军补满生命、延寿3秒，并使伤害+50%、攻速+40%，持续4秒。无召唤友军时，为最低生命比例的存活护法恢复25%最大生命，并使伤害+40%、持续4秒；不含唐僧。 冷却11秒。",
      "cd": "CD 11s"
     },
     {
      "name": "引魂灯",
      "effect": "每12秒准备一盏引魂灯，下次击杀额外掉落4金币，随后重新计时。只储存一次，不是随机几率。 被动。",
      "cd": "被动,每 12s 触发一次"
     },
     {
      "name": "镇魂令",
      "effect": "前方330范围、约69度扇形内敌人减速40%，持续3秒（首领效果减半）；受到的伤害增加12%，持续4秒。 冷却15秒。",
      "cd": "CD 15s"
     }
    ],
    "design": {
     "main": "每 3 次出手唤出 1 名亡灵(阴兵 / 白骨弓手 / 游魂 / 尸魔轮流),并肩作战,最多同时 3 只以上(招魂流可加)",
     "trait": "点击:朝移动方向冲 420,沿途撞伤敌人并无敌 0.6 秒",
     "note": "亡灵法师:鬼火、白骨、魂灯的浅色水墨风,不血腥;只取轻松的风格。"
    }
   },
   {
    "id": "heyuxi",
    "name": "羽溪",
    "handle": "@Yuki27__",
    "arch": "dash",
    "elem": "fire",
    "dtype": "magic",
    "pdef": 0.1,
    "mdef": 0.12,
    "color": "#35b7b0",
    "dark": "#1f7a76",
    "frame": "#7fe0da",
    "hp": 215,
    "speed": 215,
    "r": 19,
    "role": "范围音波爆发",
    "roleKey": "burst",
    "weapon": "音波",
    "wdesc": "向前发射可穿透敌人的直线声波；歌手分支达到门槛后另向背后发一波，不会回旋或弹射",
    "ult": "新歌上线",
    "udesc": "两道声浪打击视野内敌人；全队基础获得6秒咖啡因：移速+30%、攻速+15%、伤害+15%",
    "ultCd": 30,
    "trait": {
     "name": "交作业",
     "short": "交",
     "cd": 35,
     "color": "#35b7b0",
     "desc": "沿操控方向冲刺420，未输入方向时沿当前朝向；沿途撞伤敌人，并无敌0.6秒"
    },
    "strong": "穿透声波、两波爆发、大招提供全队咖啡因",
    "weakTxt": "生命低,被近身就危险;技能前摇较长",
    "branches": [
     "歌手流:加宽声波、提高伤害和穿透数；甲路关键石解锁背后声波",
     "咖啡流:延长大招咖啡因并提高其伤害增益，不提高移速或攻速增益幅度",
     "旅人流:普攻正向声波命中后施加易伤，不改变辅助鱼钩"
    ],
    "sup": [
     {
      "name": "咖啡续航",
      "effect": "移速+30%、攻速+15%，持续6秒；升级延长持续时间，不提高这两项百分比。 冷却14秒。",
      "cd": "CD 14s"
     },
     {
      "name": "出海钓鱼",
      "effect": "附近至少有3名敌人时，将650范围内最远的非首领、非敌塔目标拉到距自己110处，并眩晕0.6秒。 冷却12秒。",
      "cd": "CD 12s"
     },
     {
      "name": "新歌上线",
      "effect": "在650范围内的敌人附近接连落下5次音符，间隔0.15秒；每次在半径75内造成28基础法术伤害。 冷却18秒。",
      "cd": "CD 18s"
     }
    ],
    "design": {
     "main": "吟唱一道穿透音波,向前贯穿直线上的所有敌人",
     "trait": "点击:连续吟唱 3 道音波,每道都会弹射一次",
     "note": "她的头像是本人生活照,形象使用请用户再确认;技能只取自内容风格。"
    }
   },
   {
    "id": "diaoyulao",
    "name": "钓鱼佬",
    "handle": "@BQDYL0601",
    "arch": "mark",
    "elem": "water",
    "dtype": "phys",
    "pdef": 0.05,
    "mdef": 0.1,
    "color": "#3f8fd0",
    "dark": "#1f5a94",
    "frame": "#6bb4ee",
    "hp": 210,
    "speed": 170,
    "r": 17,
    "role": "牵引拉怪",
    "roleKey": "pull",
    "weapon": "甩竿",
    "wdesc": "朝近处敌人甩出鱼钩，拉近非首领、非敌塔目标；命中有12%基础概率追加伤害",
    "ult": "猪脚饭",
    "udesc": "束缚并拉近视野内普通敌人后造成伤害，同时打击强敌；留下半径220、基础持续4秒的治疗区（不治疗唐僧，不复活）",
    "ultCd": 32,
    "trait": {
     "name": "末日生存经验",
     "short": "末",
     "cd": 38,
     "color": "#3f8fd0",
     "desc": "重击700范围内当前生命最多的敌人；非首领最多眩晕3秒"
    },
    "strong": "鱼钩拉近非首领、非敌塔目标，概率追加伤害；大招留下治疗区",
    "weakTxt": "单体控制为主,清大群慢;需要等待",
    "branches": [
     "鱼钩流:增加同时甩出的鱼钩数，不附加减速",
     "运势流:提高鱼钩命中时追加30基础伤害的概率，不是三倍暴击",
     "生存流:延长大招治疗区、提高每次治疗量，并在结束时震荡周围敌人"
    ],
    "sup": [
     {
      "name": "一命二运三风水",
      "effect": "自身造成伤害时有8%几率使此次伤害翻倍；触发好运后，另有30%几率获得2金币。 被动。",
      "cd": "被动"
     },
     {
      "name": "猪脚饭",
      "effect": "320范围内存活护法恢复14%最大生命，并加速3秒（默认移速+45%）；召唤友军恢复30%最大生命。英雄不含唐僧。 冷却14秒。",
      "cd": "CD 14s"
     },
     {
      "name": "有危就有机",
      "effect": "自身生命低于40%时，获得25%最大生命护盾，并刷新特性冷却；总吸收护盾最多为自身生命上限的90%。 冷却25秒。",
      "cd": "CD 25s"
     }
    ],
    "design": {
     "main": "朝最近敌人甩出鱼钩,命中后把它拉到身边并眩晕 1 秒",
     "trait": "点击:原地扎营 5 秒,期间“十小时刷红果”式地无敌发呆,结束时对周围敌人造成一次震慑波",
     "note": "以幽默生活梗为主;他有一些评论币圈事件的帖子,已排除。"
    }
   },
   {
    "id": "martin",
    "name": "马丁",
    "handle": "@BybitMartin",
    "arch": "heal",
    "elem": "earth",
    "dtype": "phys",
    "pdef": 0.25,
    "mdef": 0.15,
    "color": "#8a5ad8",
    "dark": "#4f2a96",
    "frame": "#b394f0",
    "hp": 250,
    "speed": 165,
    "r": 17,
    "role": "增益光环 / 指挥",
    "roleKey": "aura",
    "power": 0.8,
    "weapon": "集合队友",
    "wdesc": "近身号令伤害周围敌人；为范围内其他存活英雄提高伤害、攻速，并加速附近天兵，持续3秒",
    "ult": "GM 早安",
    "udesc": "号令横扫敌群，治疗存活护法（基础30%最大生命，不含唐僧、不复活）；英雄攻守强化、天兵攻速提高，基础持续8秒",
    "ultCd": 34,
    "trait": {
     "name": "开赛号角",
     "short": "开",
     "cd": 50,
     "color": "#8a5ad8",
     "desc": "所有存活护法回复30%最大生命，包括自己；不含唐僧和天兵，不复活"
    },
    "strong": "号令强化附近英雄与召唤天兵；大招治疗护法，并提供短时团队增益",
    "weakTxt": "自己输出一般,光环范围有限,单打独斗没优势",
    "branches": [
     "号令流:扩大普攻范围、提高英雄伤害及攻速增益，延长大招增益；不附加眩晕",
     "经济学流:普攻号令给范围内其他护法加盾，命中敌人时及大招落地时掉金币；没有破盾返还",
     "老兵流:先学辅助「七年老兵」才生效，提高受伤叠层上限及每层减伤；没有反伤"
    ],
    "sup": [
     {
      "name": "买大水",
      "effect": "花10金币，为600范围内生命比例最低的存活护法或召唤友军增加40%最大生命护盾，不含唐僧；总吸收护盾最多为自身生命上限的90%。 冷却13秒。",
      "cd": "CD 13s"
     },
     {
      "name": "GM 早安",
      "effect": "每75秒令所有存活护法移速+10%、减伤10%，持续8秒；不含唐僧。 被动。",
      "cd": "每波开始触发"
     },
     {
      "name": "七年老兵",
      "effect": "每次受伤积累1层老兵，每层减伤3%，基础最多8层（合计24%）；对应分支可增加层数上限和每层效果；老兵这一项减伤最多80%，没有反伤。 被动。",
      "cd": "被动"
     }
    ],
    "design": {
     "main": "发出一圈号令波:友方护法天兵攻速 +15%(5 秒),同时给范围内敌人小额雷击",
     "trait": "点击:全队 6 秒“团战狂热”——攻速 +40%、技能冷却加快",
     "note": "取材于栏目名、励志问候、赛事集合口号;他还有关于交易所公告/行情的帖子,全部排除。"
    }
   },
   {
    "id": "qinba",
    "name": "qinbafrank",
    "handle": "@qinbafrank",
    "arch": "storm",
    "elem": "metal",
    "dtype": "magic",
    "pdef": 0.05,
    "mdef": 0.08,
    "color": "#5ac0d8",
    "dark": "#2a7890",
    "frame": "#8ae0f2",
    "hp": 200,
    "speed": 205,
    "r": 17,
    "role": "预判标记 / 延迟爆发",
    "weapon": "前瞻框架",
    "wdesc": "预判近处敌人的行进位置，基础0.75秒后落雷，伤害落点周围的敌人；目标可以走出落点",
    "ult": "Runner",
    "udesc": "横扫施法者所在的水平带内普通敌人，并打击视野内强敌；向右位移200，获得0.6秒无敌并积累跑步时长",
    "ultCd": 30,
    "trait": {
     "name": "半场开香槟",
     "short": "半",
     "cd": 40,
     "color": "#5ac0d8",
     "desc": "重击800范围内的目标，优先首领、其次当前生命最多者；非首领最多眩晕1.5秒"
    },
    "strong": "预判落雷；学习跑步辅助后移动叠层，复盘分支可返还打空后的冷却",
    "weakTxt": "落雷有延迟，移动较快的敌人可能离开落点；被近身时危险",
    "branches": [
     "预判流:增加预测点数量、缩短落雷延迟，最低0.35秒",
     "跑者流:提高辅助跑步叠层上限及大招积累的跑步时长；没有风之轨迹",
     "复盘流:普攻落雷未命中时立即准备下一次普攻，并给存活队友短暂咖啡因"
    ],
    "sup": [
     {
      "name": "Runner",
      "effect": "持续移动时每秒叠一层“跑步”(最多 5 层):每层移速 +4%、风刃伤害 +3%;停下 2 秒后清零",
      "cd": "被动"
     },
     {
      "name": "掉坑爬坑",
      "effect": "一次预测点没有命中任何敌人时,返还 50% 冷却,并让下一次风刃伤害 +20%",
      "cd": "被动,每 8s 最多触发一次"
     },
     {
      "name": "资本流动",
      "effect": "每 10 秒让范围内的护法天兵技能冷却减少 1 秒(自己也享受)",
      "cd": "CD 10s"
     }
    ],
    "design": {
     "main": "在最密集的敌人处标出一个“预测点”,3 秒后落下一片风刃雨(范围伤害);若有 3 个以上敌人在落点内,伤害 +30%",
     "trait": "点击:场上所有预测点立即提前引爆;若引爆后敌人没死透,自己获得一个“😭”小护盾(玩笑:香槟开早了)",
     "note": "所有宏观、行情、被盗事件内容都没有进入技能;只取“前瞻框架 / 掉坑爬坑 / Runner / 半场开香槟”这些性格梗。盟友在本 kit 中称“护法天兵”。"
    }
   },
   {
    "id": "traders18",
    "name": "TraderS",
    "handle": "@TraderS18",
    "arch": "tank",
    "elem": "wood",
    "dtype": "magic",
    "pdef": 0.28,
    "mdef": 0.38,
    "color": "#b08a5a",
    "dark": "#6e5028",
    "frame": "#d8b080",
    "hp": 320,
    "speed": 145,
    "r": 22,
    "role": "缺德道人 · 符阵控场 / 睡眠控制",
    "weapon": "缺德符",
    "wdesc": "在近处敌人脚下布置持续4秒的催眠阵，持续伤害、施加易伤，并反复定住非首领",
    "ult": "道人打盹",
    "udesc": "令落地时视野内的敌人昏睡并受到25%额外伤害；普通敌人2.2秒后结算伤害，强敌先受一击",
    "ultCd": 36,
    "trait": {
     "name": "一睁眼",
     "short": "一",
     "cd": 55,
     "color": "#b08a5a",
     "desc": "施放时300范围内的存活护法获得50%减伤，持续5秒；不含唐僧和天兵"
    },
    "strong": "催眠阵持续伤害、定身非首领并施加易伤；学习「护身符」后可抵挡重击",
    "weakTxt": "符阵需要时间生效，敌人可以走出；普通攻击的定身对首领无效",
    "branches": [
     "符阵流:增加同时存在的催眠阵数量，不扩大范围",
     "睡眠流:延长普通攻击的定身、昏睡标记，提高易伤；不改变大招时长",
     "缺德流:提高催眠阵持续伤害，带昏睡标记的敌人死亡时额外掉金币"
    ],
    "sup": [
     {
      "name": "道人打盹",
      "effect": "站定不动 2 秒后进入“打盹”:回复生命,并让周围敌人产生睡意(攻击间隔变长)",
      "cd": "CD 14s"
     },
     {
      "name": "护身符",
      "effect": "被重击时自动弹出护身符:抵挡一次伤害并震退周围敌人",
      "cd": "CD 18s"
     },
     {
      "name": "黄金坑",
      "effect": "在地上挖一个坑,敌人掉进去被困 1.5 秒并多掉一份灵石(玩笑)",
      "cd": "CD 15s"
     }
    ],
    "design": {
     "main": "朝敌群甩出一张符箓,落地形成小型“困阵”:敌人减速 40%,停留 2 秒后昏睡 1 秒;对昏睡中的敌人,下一击伤害 +50%(“趁人睡着捅一下,缺德”)",
     "trait": "点击:全屏敌人集体昏睡 2 秒(精英/Boss 1 秒),随后“天塌了”——一次全屏小震动伤害",
     "note": "只取“睁眼/熬夜/道人”等吐槽性格梗;他大量的行情、抄底、被盗事件评论全部排除。盟友在本 kit 中称“护法天兵”。"
    }
   }
  ];
  // ===== 隐藏名单（v0.5）：qinbafrank / TraderS 暂时隐藏——数据和代码都在，但选角 / 掉落 / 商店 / 图鉴 / 全开开局全部不出现，头像也不打进 dist。
  //       v0.6：Cato 也先隐藏（含 Cato 的协同技「双水合流」一起隐藏）。
  //       要恢复：把 window.XY_HIDDEN_SPECIALS 设成 []，或网址加 ?hidden=0（build.sh 同步读本行的名单决定内联哪些头像）
  XY.HIDDEN_SPECIALS = /[?&]hidden=0/.test((window.location && window.location.search) || '') ? [] : (window.XY_HIDDEN_SPECIALS || ['qinba', 'traders18', 'cato']);
  XY.SPECIALS_ALL = XY.SPECIALS;
  XY.SPECIALS = XY.SPECIALS_ALL.filter(function (d) { return XY.HIDDEN_SPECIALS.indexOf(d.id) < 0; });
  XY.isHidden = function (id) { return XY.HIDDEN_SPECIALS.indexOf(id) >= 0; };
  XY.ROLE_TAG = { ace: '王牌', heal: '治疗', hunt: '追猎', tank: '坦克', debuff: '减益', zone: '控场', summon: '召唤', burst: '爆发', pull: '牵引', aura: '光环' };      // 选角界面的定位小标签（每人一个，互不重复）
  XY.SP_BY = {}; XY.SPECIALS.forEach(function (d) { XY.SP_BY[d.id] = d; });
  XY.SPECIAL_TRAITS = {}; XY.SPECIALS.forEach(function (d) { XY.SPECIAL_TRAITS[d.id] = d.trait; });
  XY.STAND_SP = { dash: 60, heal: 200, mark: 230, tank: 50, storm: 190 };

  /* ---------- 头像（可选图片 + 回退）---------- */
  var imgs = {};
  XY.avatar = function (id) {                      // 返回已加载好的 Image；没有 / 没加载好返回 null（调用方回退成程序画的）
    var d = XY.SP_BY[id]; if (!d) return null;
    var e = imgs[id];
    if (!e) {
      e = imgs[id] = { img: null, ok: false, failed: false };
      var src = (window.XY_AVATAR_DATA && window.XY_AVATAR_DATA[id]) || ((window.XY_AVATAR_FILES || []).indexOf(id) >= 0 ? 'assets/specials/' + id + '.jpg' : null);
      if (!src) { e.failed = true; return null; }          // 没有这张头像：不去请求（避免 404），调用方用程序画的占位头像
      var im = new Image();
      im.onload = function () { e.ok = true; };
      im.onerror = function () { e.failed = true; };
      im.src = src; e.img = im;
    }
    return e.ok ? e.img : null;
  };
  XY.SPECIALS.forEach(function (d) { d.avatar = 'assets/specials/' + d.id + '.jpg'; });
  // 立绘 / 变身图：XY.art('phyrex/stand') → 已加载好的 Image 或 null。源码版读 assets/art/<key>.jpg，dist 里由 build.sh 内联（window.XY_ART_DATA）
  var artImgs = {};
  XY.ART_KEYS = ['phyrex/stand', 'phyrex/stand_t'];
  XY.art = function (key) {
    var e = artImgs[key];
    if (!e) {
      e = artImgs[key] = { img: null, ok: false };
      var src = (window.XY_ART_DATA && window.XY_ART_DATA[key]) || (XY.ART_KEYS.indexOf(key) >= 0 ? 'assets/art/' + key + '.jpg' : null);
      if (!src) return null;
      var im = new Image(); im.onload = function () { e.ok = true; }; im.src = src; e.img = im;
    }
    return e.ok ? e.img : null;
  };

  // 选关页的整页背景立绘（压缩 WebP，只有可见角色；隐藏角色没有、也不会内联）。源码版读 assets/art/bg/<id>.webp，dist 里由 build.sh 内联（window.XY_BG_DATA）
  var bgImgs = {};
  XY.bgArt = function (id) {
    if (!id || !XY.SP_BY[id] || XY.isHidden(id)) return null;
    var e = bgImgs[id];
    if (!e) {
      e = bgImgs[id] = { img: null, ok: false };
      var src = 'assets/art/battle-hd/' + id + '.webp';
      if (!src) return null;
      var im = new Image(); im.onload = function () { e.ok = true; }; im.src = src; e.img = im;
    }
    return e.ok ? e.img : null;
  };

  /* ---------- 存档：角色卡张数 / 携带 ---------- */
  function sd() {
    var d = XY.save.data, key = XY.TEST_BUILD ? 'spT' : 'sp';     // 全开 / 标准版各存一份，互不污染
    if (!d[key] || typeof d[key] !== 'object') d[key] = { cards: {}, chosen: null, shop: null, shopGen: 0 };
    if (!d[key].cards) d[key].cards = {};
    return d[key];
  }
  XY.spLevelOf = function (n) { var l = 0; XY.SP_LV_AT.forEach(function (a, i) { if (n >= a) l = i + 1; }); return l; };
  XY.save.spCards = function (id) { return sd().cards[id] || 0; };
  // 全开（仅 ?test=1 / 存档 mode=test）：12 位特殊角色开局全部可选，等级至少 XY.TEST_LV（不写入存档）
  XY.save.spLevel = function (id) { if (XY.isHidden(id) || !XY.SP_BY[id]) return 0; return Math.max(XY.spLevelOf(XY.save.spCards(id)), XY.TEST_BUILD ? XY.TEST_LV : 0); };
  XY.save.spOwned = function (id) { return XY.save.spLevel(id) >= 1; };
  XY.save.spRealOwned = function (id) { return XY.spLevelOf(XY.save.spCards(id)) >= 1; };
  XY.save.addSpCard = function (id, n) {
    var s = sd(), before = XY.spLevelOf(s.cards[id] || 0);
    s.cards[id] = (s.cards[id] || 0) + (n || 1);
    var after = XY.spLevelOf(s.cards[id]); XY.save.touch();
    var first = before === 0 && after >= 1;
    if (first && n > 0) {
      var data = XY.save.data; data.intros = data.intros || {};
      if (!data.intros[id]) {
        data.pendingIntros = data.pendingIntros || [];
        if (data.pendingIntros.indexOf(id) < 0) data.pendingIntros.push(id);
        XY.introQ = (data.gacha10 && !data.gacha10.acked) ? [] : data.pendingIntros.slice();
      }
    } else if (n < 0 && before >= 1 && after === 0) {
      var pending = XY.save.data && XY.save.data.pendingIntros;
      if (pending) XY.save.data.pendingIntros = pending.filter(function (x) { return x !== id; });
      XY.introQ = (XY.save.data.pendingIntros || []).slice();
    }
    return { cards: s.cards[id], lv: after, up: after > before, first: first };
  };
  XY.save.carryId = function () {
    var c = sd().chosen;
    if (c && XY.isHidden(c)) { c = 'phyrex'; if (XY.save.spOwned(c)) { sd().chosen = c; XY.save.touch(); } }   // 存档里选的是隐藏角色：安全回退成 Phyrex
    return c && XY.save.spOwned(c) ? c : null;
  };
  XY.save.setCarry = function (id) {
    if (!id) { sd().chosen = null; XY.save.touch(); return { ok: true, reason: '这一关不带常驻角色' }; }
    if (!XY.SP_BY[id]) return { ok: false, reason: '没有这个角色' };
    if (typeof id === 'string' && id.indexOf('x_') === 0 && XY.save.xcharOpen && !XY.save.xcharOpen()) return { ok: false, reason: '通关第 1 关后才能携带自建角色' };
    if (!XY.save.spOwned(id)) return { ok: false, reason: '未解锁：集齐 ' + XY.SP_LV_AT[0] + ' 张「' + XY.SP_BY[id].name + '」角色卡（掉落或灵石商店）' };
    sd().chosen = id; XY.save.touch(); return { ok: true, reason: '本关常驻：' + XY.SP_BY[id].name };
  };
  // 全开“一击满级”：只在全开、只对本局常驻的特殊角色；师徒五人不受影响（队伍等级 G.level 不动）。
  // 满级 = 角色卡 Lv5（它自己的上限：数值 +100%、特性、第 3 分支、觉醒外观）+ 角色等级 99（G.spHeroLv，Phyrex 变身要它）。只改本局，不写存档。
  XY.SP_MAX_LV = 5; XY.HERO_MAXLV = 99; XY.instMaxOn = !window.XY_NO_INSTMAX;     // instMaxOn：平衡 probe 把它关掉
  XY.version.instantMax = function (G) {
    if (!XY.TEST_BUILD || !XY.instMaxOn || G.instMax || !G.special || G.noInstMax) return false;
    var h = G.heroes[5]; if (!h || !h.sp) return false;
    G.instMax = true; G.spHeroLv = XY.HERO_MAXLV;
    h.def = XY.specialDef(G.special, XY.SP_MAX_LV);
    if (XY.recalcAll) XY.recalcAll(G);
    if (!h.down) h.hp = h.maxHp;                         // 角色一击满级 = 这个角色升级：回满血
    XY.banner(G, '一击满级：' + XY.SP_BY[G.special].name + ' （角色卡 Lv' + XY.SP_MAX_LV + ' · 角色等级 ' + XY.HERO_MAXLV + '）', 3.2);
    XY.ring(G, h.x, h.y, 90, h.def.color, 0.7, true); XY.ring(G, h.x, h.y, 150, '#ffd54a', 1.0, false); if (XY.anim) XY.anim.maxLevel(G, h);
    return true;
  };
  XY.spHeroLv = function (G) { return G.instMax ? XY.HERO_MAXLV : Math.min(XY.HERO_MAXLV, G.level || 1); };   // 特殊角色的“角色等级”：全开一击满级后是 99，否则就是队伍等级

  // 下一级还差几张
  XY.spNext = function (id) {
    var n = XY.save.spCards(id), lv = XY.spLevelOf(n);
    return lv >= 5 ? null : { need: XY.SP_LV_AT[lv], have: n, lv: lv + 1 };
  };

  /* ---------- 出发页十连（每个存档一次）----------
   * 第一次进入出发页就定下 10 张特殊角色卡并立刻写入存档。
   * 刷新、关闭、跳过都用同一组结果，不会重抽。
   * 抽到的角色：第一张把角色卡补到解锁（2 张 = Lv1），之后每张重复 +1，够 5/10/20/40 张就升级。
   * 没抽到的仍锁，靠掉落或灵石商店凑 2 张。 */
  var gachaMint = null, gachaView = null;
  function gachaBag() {
    var d = XY.save.data, key = XY.TEST_BUILD ? 'spT' : 'sp', src = d && d[key] && d[key].cards, o = {}, k;
    if (src) for (k in src) o[k] = src[k] || 0;
    return o;
  }
  XY.gacha10 = {
    activityOpen: false,
    pendingIntros: function () {
      var d = XY.save.data;
      if (!d) return [];
      d.intros = d.intros || {};
      d.pendingIntros = (d.pendingIntros || []).filter(function (id, i, a) {
        return a.indexOf(id) === i && !d.intros[id];
      });
      // 未知或当前不可用的角色先保留在存档里，不能在每帧绘制时删掉。
      var visible = d.pendingIntros.filter(function (id) { return XY.SP_BY[id] && XY.save.spRealOwned(id); });
      XY.introQ = (d.gacha10 && !d.gacha10.acked) ? [] : visible.slice();
      return visible;
    },
    openActivity: function () {
      var d = XY.save.data, rec = d && d.gacha10;
      if (!d) return false;
      // 老版已发卡、尚未收下的十连没有待介绍字段；仅按原结果中明确标记的首次解锁补队列。
      if (rec && rec.granted && !rec.acked && !Array.isArray(d.pendingIntros) && Array.isArray(rec.rows)) {
        var seen = d.intros || {};
        d.pendingIntros = rec.rows.filter(function (r) { return r && r.kind === 'unlock' && r.id && !seen[r.id]; })
          .map(function (r) { return r.id; }).filter(function (id, i, a) { return a.indexOf(id) === i; });
      }
      var pending = XY.gacha10.pendingIntros();
      if (rec && rec.acked && !pending.length) return false;
      XY.gacha10.activityOpen = true;
      XY.gacha10._showFlip = true;
      return true;
    },
    closeActivity: function () { XY.gacha10.activityOpen = false; gachaView = null; },
    continueIntro: function () {
      var d = XY.save.data, pending = XY.gacha10.pendingIntros(), id = pending[0];
      if (!d || !id) { XY.gacha10.closeActivity(); return; }
      d.intros = d.intros || {}; d.intros[id] = true;
      d.pendingIntros = (d.pendingIntros || []).filter(function (x) { return x !== id; });
      XY.introQ = d.pendingIntros.slice();
      XY.save.touch(); XY.save.flush();
      if (!d.pendingIntros.length) XY.gacha10.closeActivity();
    },
    overlay: function () { return !!XY.gacha10.activityOpen; },
    roll: function (rnd) {
      rnd = rnd || Math.random;
      var pool = XY.SPECIALS.map(function (d) { return d.id; }), out = [], i;
      if (!pool.length) return out;
      for (i = 0; i < 10; i++) out.push(pool[Math.floor(rnd() * pool.length)]);
      return out;
    },
    plan: function (pulls, cards) {
      var bag = {}, seen = {}, rows = [], k;
      cards = cards || {};
      for (k in cards) bag[k] = cards[k] || 0;
      (pulls || []).forEach(function (id) {
        var had = bag[id] || 0, owned = XY.spLevelOf(had) >= 1, n = (seen[id] = (seen[id] || 0) + 1);
        var add, kind, text, beforeLv, afterLv;
        if (!owned && n === 1) {
          add = Math.max(XY.SP_LV_AT[0] - had, 1);
          kind = 'unlock';
          text = '解锁 · 计入 ' + add + ' 张';
        } else {
          add = 1;
          beforeLv = XY.spLevelOf(had);
          afterLv = XY.spLevelOf(had + add);
          kind = afterLv > beforeLv ? 'up' : 'dup';
          text = afterLv > beforeLv ? ('重复 · 升到 Lv' + afterLv) : '重复 · 角色卡 +1';
        }
        bag[id] = had + add;
        rows.push({ id: id, add: add, kind: kind, text: text, cards: bag[id], lv: XY.spLevelOf(bag[id]) });
      });
      return rows;
    },
    grant: function (rec) {
      if (!rec || rec.granted) return;
      (rec.rows || []).forEach(function (r) { XY.save.addSpCard(r.id, r.add); });
      rec.granted = true;
      XY.save.flush();
    },
    ensure: function () {
      var d = XY.save.data, rec;
      if (!d) return { show: false, fresh: false, rec: null };
      rec = d.gacha10;
      if (rec && rec.pulls && rec.pulls.length === 10) {
        if (!rec.rows) rec.rows = XY.gacha10.plan(rec.pulls, rec.granted ? {} : gachaBag());
        if (!rec.granted && XY.gacha10._showFlip) XY.gacha10.grant(rec);
        return { show: !!(rec.granted && !rec.acked), fresh: gachaMint === rec.seed, rec: rec };
      }
      var seed = ((Date.now() ^ ((Math.random() * 0x7fffffff) | 0)) >>> 0) || 1;
      var pulls = XY.gacha10.roll(XY.seeded(seed));
      rec = { seed: seed, pulls: pulls, rows: XY.gacha10.plan(pulls, gachaBag()), granted: false, acked: false, at: Date.now() };
      d.gacha10 = rec;
      gachaMint = seed;
      if (XY.gacha10._showFlip) XY.gacha10.grant(rec);
      if (XY.bgArt) pulls.forEach(function (id) { try { XY.bgArt(id); } catch (e) {} });
      return { show: true, fresh: true, rec: rec };
    },
    ack: function () {
      var g = XY.save.data && XY.save.data.gacha10;
      if (g) g.acked = true;
      gachaView = null;
      if (XY.save.flush) XY.save.flush();
      if (!XY.gacha10.pendingIntros().length) XY.gacha10.closeActivity();
    },
    blocking: function () {
      var g = XY.save.data && XY.save.data.gacha10;
      return !!(XY.gacha10.activityOpen && g && g.pulls && g.pulls.length === 10 && !g.acked);
    },
    nudge: function (dir) {
      if (XY.introQ && XY.introQ.length > 1) {
        if ((dir || 0) >= 0) XY.introQ.push(XY.introQ.shift());
        else XY.introQ.unshift(XY.introQ.pop());
        return;
      }
      if (!gachaView || !gachaView.rec) return;
      var n = (gachaView.rec.rows && gachaView.rec.rows.length) || 10;
      if (gachaView.phase === 'result') {
        var pages = gachaView.pages || 1;
        gachaView.page = Math.max(0, Math.min(pages - 1, (gachaView.page || 0) + (dir || 0)));
        return;
      }
      var cur = gachaView.focus;
      if (cur == null) cur = 0;
      gachaView.focus = Math.max(0, Math.min(n - 1, cur + dir));
      gachaView.hold = true;
    },
    pick: function (id) {
      if (gachaView) gachaView.lit = id;
    },
    key: function () {
      if (!XY.gacha10.activityOpen) return;
      if (XY.save.data && XY.save.data.gacha10 && XY.save.data.gacha10.acked) { XY.gacha10.continueIntro(); return; }
      var pack = XY.gacha10.ensure();
      if (!pack.show) return;
      if (!gachaView || gachaView.seed !== pack.rec.seed) gachaView = { seed: pack.rec.seed, phase: 'flip', t0: 0, rec: pack.rec };
      if (gachaView.phase === 'flip') gachaView.phase = 'result';
      else XY.gacha10.ack();
    },
    view: function (a) {
      if (!XY.gacha10.activityOpen) return null;
      var pack = XY.gacha10.ensure();
      if (!pack.show) { gachaView = null; return null; }
      if (!gachaView || gachaView.seed !== pack.rec.seed) {
        gachaView = { seed: pack.rec.seed, phase: pack.fresh ? 'flip' : 'result', t0: a && a.rt || 0, rec: pack.rec };
      }
      gachaView.rec = pack.rec;
      return gachaView;
    },
    freeze: null
  };
  XY.save.xcharOpen = function () {
    if (XY.TEST_BUILD) return true;
    var d = XY.save.data;
    if (!d) return false;
    if (d.stats && d.stats.wins > 0) return true;
    var lv = d.levels && d.levels[1];
    return !!(lv && lv.cleared);
  };

  // 等级加成：Lv2 +25%，Lv3 +50%，Lv4 +75%，Lv5 +100%（属性）；Lv2 起解锁特性；Lv3 大招伤害 +30%（治疗与护盾不变）；Lv4 开第 3 条分支；Lv5 特性 CD −25% + 觉醒外观
  XY.specialDef = function (id, lv) {
    var b = XY.SP_BY[id], d = {}, k;
    for (k in b) d[k] = b[k];
    lv = Math.max(1, lv || XY.save.spLevel(id) || 1);
    var m = 1 + 0.25 * (lv - 1);
    d.lv = lv; d.baseHp = b.hp; d.hp = Math.round(b.hp * m); d.special = true; d.statMul = m * (b.power || 1);
    d.traitOpen = lv >= 2; d.ultBonus = lv >= 3 ? 1.3 : 1; d.branch3 = lv >= 4; d.awakened = lv >= 5;
    d.traitCdMul = lv >= 5 ? 0.75 : 1;
    d.form = 'human';
    return d;
  };

  /* ---------- 随机掉落 ---------- */
  XY.specials = {
    // Cow Demon King guarantees one card from the nine public characters. This
    // bypasses the ordinary first-Phyrex drop bias, and never grants an unlock bundle.
    niumoCard: function (G, rnd) {
      var pool = ['phyrex', 'sisi', 'laosiji', 'kuanggong', 'haiteng', 'yuanzhang', 'heyuxi', 'diaoyulao', 'martin'];
      var id = pool[Math.floor((rnd || Math.random)() * pool.length)];
      var before = XY.save.spCards(id), beforeLv = XY.spLevelOf(before), r = XY.save.addSpCard(id, 1), name = XY.SP_BY[id].name;
      var state = r.first ? '首次解锁 · Lv' + r.lv : r.up ? '升阶 Lv' + beforeLv + ' → Lv' + r.lv : before ? '重复获得 · Lv' + r.lv : '首次获得';
      if (!r.lv) state += ' · 再得 ' + Math.max(0, XY.SP_LV_AT[0] - r.cards) + ' 张解锁';
      var card = { id: id, name: name, add: 1, before: before, cards: r.cards, lv: r.lv, up: r.up, first: r.first,
        text: '特殊角色卡 · ' + name + ' +1 <em>' + state + ' · 共 ' + r.cards + ' 张</em>' };
      if (G) {
        (G.spGot = G.spGot || []).push({ id: id, cards: r.cards, lv: r.lv, up: r.up, first: r.first, src: 'niumo', t: G.t });
        (G.spBanners = G.spBanners || []).push({ id: id, t: 0, max: 4, cards: r.cards, lv: r.lv, up: r.up, first: r.first });
        XY.toast(G, '击败牛魔王 · 获得角色卡「' + name + '」×1（' + state + ' · 共 ' + r.cards + ' 张）');
      }
      return card;
    },
    // 来源：boss 6% / chest 8% / clear 必掉 1 张（第 2、3 关首通）
    maybeDrop: function (G, src) {
      var p = src === 'boss' ? 0.06 : (src === 'chest' ? 0.08 : 1);   // 第 1 / 2 / 3 关首通必掉 1 张
      if (G.spDropOff || Math.random() >= p) return null;
      return XY.specials.drop(G, src);
    },
    // 抽一个角色 id：Phyrex 还没解锁时永远是 Phyrex（“第一个获得的都是我”）；之后 12 位里随机（rnd 可传种子随机数以便测试）
    pickId: function (rnd) {
      if (!XY.save.spRealOwned('phyrex')) return 'phyrex';
      rnd = rnd || Math.random;
      return XY.SPECIALS[Math.floor(rnd() * XY.SPECIALS.length)].id;
    },
    drop: function (G, src, id, rnd) {
      id = id || XY.specials.pickId(rnd);
      if (!XY.save.spRealOwned('phyrex')) id = 'phyrex';
      var r = XY.save.addSpCard(id, 1), d = XY.SP_BY[id];
      (G.spGot = G.spGot || []).push({ id: id, cards: r.cards, lv: r.lv, up: r.up, first: r.first, src: src, t: G.t });
      (G.spBanners = G.spBanners || []).push({ id: id, t: 0, max: 4, cards: r.cards, lv: r.lv, up: r.up, first: r.first });
      var nx = XY.spNext(id);
      XY.toast(G, '获得角色卡「' + d.name + '」×1（' + r.cards + ' 张' + (r.first ? ' · 解锁！' : (r.up ? ' · 升到 Lv' + r.lv + '！' : (nx ? '，再 ' + (nx.need - nx.have) + ' 张升 Lv' + nx.lv : ''))) + '）');
      return id;
    }
  };

  /* ---------- 商店（用灵石；轮换货架，每局结束后刷新）---------- */
  var SH = XY.shop = {
    slots: 6,
    gen: function (seed) {
      var s = sd(), rnd = XY.seeded ? XY.seeded((seed || Date.now()) % 2147483647) : Math.random, i;
      var ids = XY.SPECIALS.map(function (d) { return d.id; });
      function pick(a) { return a.splice(Math.floor(rnd() * a.length), 1)[0]; }
      var first = !XY.save.spRealOwned('phyrex'), spIds = ids.slice(), slots = [];
      if (first) { slots.push({ kind: 'sp', id: 'phyrex', price: XY.SP_PRICE }); slots.push({ kind: 'shard', price: 90, n: 1 }); }
      else { slots.push({ kind: 'sp', id: pick(spIds), price: XY.SP_PRICE }); slots.push({ kind: 'sp', id: pick(spIds), price: XY.SP_PRICE }); }
      var cardPool = XY.CARDS.filter(function (c) { return c.r !== 'N'; });
      var cardBag = cardPool.slice();
      for (i = 0; i < 2 && cardBag.length; i++) {
        var c = cardBag.splice(Math.floor(rnd() * cardBag.length), 1)[0];
        slots.push({ kind: 'card', id: c.id, price: { R: 60, SR: 140, SSR: 300 }[c.r] });
      }
      slots.push({ kind: 'shard', price: 90, n: 1 });
      slots.push({ kind: 'reroll', price: 20 });
      s.shop = { slots: slots, sold: [0, 0, 0, 0, 0, 0], n: (s.shopGen = (s.shopGen || 0) + 1) };
      XY.save.touch(); return s.shop;
    },
    // 旧存档里可能存着已被隐藏角色的货架（隐藏名单后来才加）：货架里有找不到的角色就整架重新刷
    stock: function () { var s = sd(), ok = !!s.shop && s.shop.slots.every(function (sl) { return !sl || sl.kind !== 'sp' || !!XY.SP_BY[sl.id]; }); return ok ? s.shop : SH.gen(); },
    refresh: function () { SH.gen(); },
    buy: function (i) {
      var st = SH.stock(), sl = st.slots[i], d = XY.save.data;
      if (!sl) return { ok: false, reason: '没有这个货位' };
      if (sl.kind === 'reroll') return SH.reroll();
      if (st.sold[i]) return { ok: false, reason: '这件已经买过了，下一局结束后补货' };
      if (d.lingshi < sl.price) return { ok: false, reason: '灵石不够：要 ' + sl.price + '，现在只有 ' + d.lingshi + '。通关一关就会得到灵石' };
      if (sl.kind === 'sp' && !XY.save.spRealOwned('phyrex')) sl.id = 'phyrex';   // 保险：第一个永远是 Phyrex
      d.lingshi -= sl.price; st.sold[i] = 1;
      var msg;
      if (sl.kind === 'sp') {
        var r = XY.save.addSpCard(sl.id, 1), nx = XY.spNext(sl.id), nm = XY.SP_BY[sl.id].name;
        msg = '买到角色卡「' + nm + '」（' + r.cards + ' 张）' + (r.first ? ' · 解锁！可以在关卡选择页携带' : (r.up ? ' · 升到 Lv' + r.lv + '！' : (nx ? ' · 再 ' + (nx.need - nx.have) + ' 张升 Lv' + nx.lv : ' · 已满级')));
      } else if (sl.kind === 'card') {
        var res = XY.save.addCard(sl.id); XY.save.checkUnlocks(); if (XY.fabao && XY.fabao.BY[sl.id]) XY.fabao.unlock(sl.id);   // v0.8.3：V2 法宝池里的法宝，买了就永久解锁
        msg = '买到法宝「' + XY.CARD_BY[sl.id].name + '」' + (res.isNew ? ' · 新！' : ' · 重复 +1');
      } else { XY.save.addShard(sl.n); XY.save.checkUnlocks(); msg = '买到皮肤碎片 ×' + sl.n; }
      XY.save.touch();
      return { ok: true, reason: msg };
    },
    /* ---- v0.8.3 页签：法宝解锁 / 天兵卡（货架页签保持原样）---- */
    FB_PRICE: { qishier: 160, jinguzhou: 160, qiankun: 260, nianzhu: 260 },        // 其余 灵物 200 / 法宝 240
    SOL_PRICE: { arrow: 40, heal: 60, frost: 60, cannon: 80, siege: 120 },
    SOL_MAX: 6,                                                                    // 卡满 6 张 = Lv3，不再卖
    // 还没解锁、也不是“击败洞主专属”的法宝 / 灵物（已解锁的不再出现）
    fbList: function () {
      var F = XY.fabao, den = {}, k; if (!F) return [];
      for (k in F.DEN_ITEM) den[F.DEN_ITEM[k]] = 1;
      return F.ITEMS.filter(function (it) { return !it.starter && !den[it.id] && !F.unlocked(it.id); })
        .map(function (it) { return { id: it.id, price: SH.FB_PRICE[it.id] || (it.kind === 'l' ? 200 : 240) }; });
    },
    solList: function () { return XY.TOWER_ORDER.map(function (t) { var n = XY.save.solCards(t); return { type: t, price: SH.SOL_PRICE[t], cards: n, lv: XY.solLevelOf(n), full: n >= SH.SOL_MAX }; }); },
    buyFb: function (id) {
      var row = SH.fbList().filter(function (r) { return r.id === id; })[0], d = XY.save.data;
      if (!row) return { ok: false, reason: '这件已经解锁，或者只能击败洞主得到' };
      if (d.lingshi < row.price) return { ok: false, reason: '灵石不够：要 ' + row.price + '，现在 ' + d.lingshi };
      d.lingshi -= row.price; XY.fabao.unlock(id); XY.save.touch();
      return { ok: true, reason: '解锁「' + XY.fabao.BY[id].name + '」：之后开局就能带' };
    },
    buySol: function (t) {
      var row = SH.solList().filter(function (r) { return r.type === t; })[0], d = XY.save.data;
      if (!row) return { ok: false, reason: '没有这种天兵' };
      if (row.full) return { ok: false, reason: XY.TOWERS[t].name + '卡已经满级了' };
      if (d.lingshi < row.price) return { ok: false, reason: '灵石不够：要 ' + row.price + '，现在 ' + d.lingshi };
      d.lingshi -= row.price; var r = XY.save.addSolCard(t, 1); XY.save.touch();
      return { ok: true, reason: '买到' + XY.TOWERS[t].name + '卡（' + r.cards + ' 张）' + (r.first ? ' · 解锁！' : (r.up ? ' · 升到 Lv' + r.lv : '')) };
    },
    reroll: function () {
      var d = XY.save.data;
      if (d.lingshi < 20) return { ok: false, reason: '灵石不够：要 20，现在 ' + d.lingshi };
      d.lingshi -= 20; SH.gen(); return { ok: true, reason: '货架刷新了' };
    }
  };

  /* ---------- 一局结束：结算灵石 + 首通必掉角色卡 + 货架刷新（包住原来的 commitRun）---------- */
  var oldCommit = XY.save.commitRun;
  XY.save.commitRun = function (G, result) {
    if (G.committed) return G.runReport;
    if (G.godMode) { G.committed = true; G.run = G.run || {}; G.run.clearGain = 0; G.runReport = { result: result, level: G.levelId || 1, cards: 0, newUnlocks: [], debug: true, stars: 0 }; return G.runReport; }
    if (G.mod) { G.committed = true; G.runReport = { result: result, level: 1, cards: 0, newUnlocks: [], mod: G.mod.id }; return G.runReport; }      // 非官方玩法包：只能玩，不发灵石 / 卡 / 碎片，不写通关、统计、取经之旅、解锁
    var dg = G.dungeon, dgFirst = !!(dg && result === 'win' && !(XY.save.data.dng[dg.id] && XY.save.data.dng[dg.id].cleared));
    var firstClear = !dg && result === 'win' && G.levelId >= 1 && !(XY.save.data.levels[G.levelId] && XY.save.data.levels[G.levelId].cleared);
    var gain = 0;
    if (dg && result === 'win') gain = dgFirst ? XY.C.DNG_GAIN_FIRST : XY.C.DNG_GAIN;          // 副本通关：首通 120 灵石，之后每次 50
    else if (result === 'win') gain = 60 + 25 * G.levelId + (firstClear ? 100 : 0);
    else gain = Math.floor(G.t / 60) * 4 + ((G.stats && G.stats.denKills) || 0) * 15;
    XY.save.addLingshi(gain); if (G.run) G.run.lingshi += gain; G.run.clearGain = gain;
    var rep = oldCommit(G, result);
    if (firstClear) XY.specials.drop(G, 'clear');
    if (dgFirst && XY.fabao && XY.fabao.DEN_ITEM && XY.fabao.unlock) XY.fabao.unlock(XY.fabao.DEN_ITEM[dg.id]);      // 副本首通：保底解锁该洞府的法宝（第一次击退时多半已解锁）
    if (rep && dg) rep.dungeon = { id: dg.id, first: dgFirst };
    if (XY.chain09) XY.chain09.refresh();
    if (result === 'win' && XY.bossfight && XY.bossfight.open && ((!dg && G.levelId === 1) || dg)) {              // v0.8.6 挂点：第 1 关末尾 / 洞府通关后进 Boss 战（v0.9.0 接入；这里只调用，stub 什么都不做）
      try { rep && (rep.bossfight = XY.bossfight.open({ kind: dg ? 'dungeon' : 'level', levelId: G.levelId, dungeonId: dg ? dg.id : null, first: dg ? dgFirst : firstClear, G: G, report: rep })); } catch (e) { if (window.console) console.warn('bossfight.open', e); }
    }
    SH.refresh();
    XY.save.flush();
    if (rep) rep.spGot = (G.spGot || []).map(function (x) { return x.id; });
    return rep;
  };
})();
