const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync('js/battle.js','utf8'),context);
const b=context.window.HumanityBattle;
const card=values=>({stats:Object.fromEntries(b.STATS.map((key,i)=>[key,values[i]]))});
const equal=card([50,50,50,50,50,50]),strong=card([100,100,100,100,100,100]),weak=card([0,0,0,0,0,0]);
assert.equal(b.calculatePower(card([1,2,3,4,5,6])),21);
for(let i=0;i<6;i++){const values=Array(6).fill(0);values[i]=10;assert.equal(b.calculatePower(card(values)),10);}
assert.equal(b.calculatePlayerWinPercent(300,300),50);
assert.equal(b.calculatePlayerWinPercent(301,300),50.5);
assert.equal(b.calculatePlayerWinPercent(320,300),60);
assert.equal(b.calculatePlayerWinPercent(210,300),5);
assert.equal(b.calculatePlayerWinPercent(390,300),95);
assert.equal(b.calculatePlayerWinPercent(-1000,1000),5);
assert.equal(b.calculatePlayerWinPercent(1000,-1000),95);
assert.equal(b.resolveRound(equal,equal,()=>0.499999).winner,'player');
assert.equal(b.resolveRound(equal,equal,()=>0.5).winner,'cpu');
assert.equal(b.resolveRound(weak,strong,()=>0.049999).winner,'player');
assert.equal(b.resolveRound(weak,strong,()=>0.05).winner,'cpu');
assert.equal(b.resolveRound(strong,weak,()=>0.949999).winner,'player');
assert.equal(b.resolveRound(strong,weak,()=>0.95).winner,'cpu');
let calls=0;
const result=b.resolveRound(strong,weak,()=>{calls++;return 0.999;});
assert.equal(calls,1);assert.equal(result.playerWinPercent,95);assert.equal(result.winner,'cpu');
assert.match(b.describeResult(result),/番狂わせ/);
assert.doesNotMatch(b.describeResult(result),/抽選値|判定境界|戦闘力|PLAYER|STR|SPD|END|STK|GRP|SUB|\d/);
assert.match(b.describeResult(b.resolveRound(weak,strong,()=>0)),/番狂わせ/);
assert.match(b.describeResult(b.resolveRound(equal,equal,()=>0)),/五分五分|互角/);
for(let i=0;i<10;i++)b.describeResult(result);assert.equal(calls,1);
assert.ok(Object.isFrozen(result));assert.ok(Object.isFrozen(result.playerStats));
strong.stats.STR=1;assert.equal(result.playerStats.STR,100);assert.equal(result.playerPower,600);
for(const roll of [-1,1,NaN,Infinity])assert.throws(()=>b.resolveRound(equal,equal,()=>roll));
assert.throws(()=>b.calculatePower({stats:{}}));
console.log('PASS: 等重み合計・暫定勝率式・5/95%制限・同戦闘力50%・乱数境界・番狂わせ・乱数1回・結果保存');

vm.runInContext("Math.random = () => { throw new Error('解説生成での乱数は禁止'); };",context);
const charactersContext=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync('js/characters.js','utf8'),charactersContext);
const bodies=new Set();let minimum=1000,maximum=0;
for(const p of charactersContext.window.CHARACTERS)for(const cpu of charactersContext.window.CHARACTERS){
  for(const roll of [0,0.1,0.2,0.3,0.5,0.7,0.999999]){
    const decision=b.resolveRound(p,cpu,()=>roll);
    const text=b.createCommentary(decision);
    minimum=Math.min(minimum,text.body.length);maximum=Math.max(maximum,text.body.length);
    assert.ok(text.body.length>=100&&text.body.length<=150,`${text.body.length}: ${text.body}`);
    assert.doesNotMatch(text.headline+text.body,/PLAYER|STR|SPD|END|STK|GRP|SUB|抽選値|判定境界|戦闘力|計算式|\d/);
    for(const stats of [decision.playerStats,decision.cpuStats]){
      const best=Math.max(...b.STATS.map(key=>stats[key]));
      assert.ok(b.STATS.some(key=>stats[key]===best&&text.body.includes(b.STAT_LABELS[key])));
    }
    const upset=(decision.playerPower>decision.cpuPower&&decision.winner==='cpu')||(decision.playerPower<decision.cpuPower&&decision.winner==='player');
    assert.equal(text.body.includes('番狂わせ'),upset);
    assert.deepEqual(b.createCommentary(decision),text);
    bodies.add(text.body);
  }
}
const tied=card([50,50,50,50,50,50]);
const variants=new Set([0,0.1,0.2].map(roll=>b.describeResult(b.resolveRound(tied,tied,()=>roll))));
assert.equal(variants.size,3);
assert.match(b.describeResult(b.resolveRound(card([51,50,50,50,50,50]),tied,()=>0)),/接戦|互角|差が小さ/);
assert.match(b.describeResult(b.resolveRound(card([100,100,100,100,100,100]),tied,()=>0)),/大きく|かなり/);
console.log(`PASS: 6300件の解説は${minimum}〜${maximum}文字・実際の高い能力を使用・内部情報なし・番狂わせ一致・接戦/大差/同能力・複数テンプレート`);
