/* 洞府验关必须由地图/队伍/seed/模拟时钟决定，不能借用绘图或页面的环境随机流。 */
(function(){'use strict';var X=window.XY,newGame=X.newGame,step=X.step,assist=X.auto&&X.auto.assist;
function scoped(rng,fn){var ambient=Math.random;Math.random=rng;try{return fn();}finally{Math.random=ambient;}}
X.newGame=function(id,opts){if(!opts||!opts.lair)return newGame.apply(this,arguments);var random=X.seeded(opts.lair.seed||1),calls=0,g;function next(){calls++;if(g)g.simRandomCalls=calls;return random();}var self=this,args=arguments;g=scoped(next,function(){return newGame.apply(self,args);});Object.defineProperty(g,'_simRandom',{value:next});g.simRandomCalls=calls;return g;};
// 原主循环的按真实帧辅助会使验关犒赏在不同帧扣钱/续命；验关改由同一模拟时钟推进。
if(assist)X.auto.assist=function(g,dt){if(g&&g.lair)return;return assist.apply(this,arguments);};
X.step=function(g,dt){if(!g._simRandom)return step.apply(this,arguments);var self=this,args=arguments;return scoped(g._simRandom,function(){if(assist)assist(g,dt);return step.apply(self,args);});};
})();
