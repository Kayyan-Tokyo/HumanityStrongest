const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context=vm.createContext({window:{}});
for(const file of ['js/characters.js','js/battle.js','js/match.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context);
const {deal,playRound,nextRound,availableCards}=context.window.HumanityMatch;
const data=context.window.CHARACTERS;
const before=JSON.stringify(data);
let seed=123456;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const seenPlayer=new Set(),seenCpu=new Set();
for(let n=0;n<1000;n++){
  const match=deal(data,random);
  assert.equal(match.playerHand.length,3);assert.equal(match.cpuHand.length,3);
  assert.equal(new Set([...match.playerHand,...match.cpuHand].map(c=>c.id)).size,6);
  assert.ok(match.cpuHand.includes(match.cpuCard));
  for(const c of match.playerHand)seenPlayer.add(c.id);
  for(const c of match.cpuHand)seenCpu.add(c.id);
}
assert.equal(seenPlayer.size,30);assert.equal(seenCpu.size,30);
for(const winners of [['player','player'],['cpu','cpu'],['player','cpu','player'],['cpu','player','cpu']]){
  const match=deal(data,random);
  for(const winner of winners){
    const player=availableCards(match.playerHand,match.usedPlayerIds)[0];
    const cpu=match.cpuCard;
    playRound(match,player.id,()=>({winner}));
    assert.ok(match.usedPlayerIds.includes(player.id));assert.ok(match.usedCpuIds.includes(cpu.id));
    assert.throws(()=>playRound(match,player.id,()=>({winner})));
    if(match.phase!=='finished'){
      nextRound(match,random);
      assert.ok(!match.usedCpuIds.includes(match.cpuCard.id));
      assert.throws(()=>playRound(match,player.id,()=>({winner})));
    }
  }
  assert.equal(match.phase,'finished');
  assert.equal(match.rounds.length,winners.length);
  assert.equal(match.winner,winners.at(-1));
  assert.equal(new Set(match.usedPlayerIds).size,winners.length);
  assert.equal(new Set(match.usedCpuIds).size,winners.length);
  assert.throws(()=>nextRound(match,random));
  assert.throws(()=>playRound(match,match.playerHand[0].id,()=>({winner:'player'})));
}
const sample=deal(data,random);
assert.throws(()=>playRound(sample,sample.playerHand[0].id,()=>({winner:'draw'})));
assert.equal(sample.rounds.length,0);assert.equal(sample.phase,'selecting');
let draws=0;
playRound(sample,sample.playerHand[0].id,(p,c)=>context.window.HumanityBattle.resolveRound(p,c,()=>{draws++;return 0;}));
assert.equal(draws,1);
const saved=sample.rounds[0].decision;
assert.throws(()=>playRound(sample,sample.playerHand[1].id,()=>{draws++;return {winner:'cpu'};}));
assert.equal(draws,1);assert.equal(sample.rounds[0].decision,saved);
assert.throws(()=>deal(data.slice(0,5)));
assert.throws(()=>deal([...data.slice(0,6),data[0]]));
for(let n=0;n<1000;n++){
  const match=deal(data,random);let victoryDraws=0;
  while(match.phase!=='finished'){
    const player=availableCards(match.playerHand,match.usedPlayerIds)[0];
    playRound(match,player.id,(p,c)=>context.window.HumanityBattle.resolveRound(p,c,()=>{victoryDraws++;return random();}));
    if(match.phase!=='finished')nextRound(match,random);
  }
  assert.ok(match.rounds.length===2||match.rounds.length===3);
  assert.equal(Math.max(match.playerWins,match.cpuWins),2);
  assert.equal(victoryDraws,match.rounds.length);
  assert.equal(new Set(match.usedPlayerIds).size,match.rounds.length);
  assert.equal(new Set(match.usedCpuIds).size,match.rounds.length);
}
assert.equal(JSON.stringify(data),before);
console.log('PASS: 3枚ずつ・1000回重複なし抽選・全30人出現・2連勝で終了・最終ラウンド決着・両者再使用禁止・多重実行拒否');
