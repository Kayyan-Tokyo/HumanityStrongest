const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context=vm.createContext({window:{}});
for(const file of ['js/characters.js','js/battle.js','js/match.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context);
const {deal,playRound,nextRound,availableCards,commitPlayerCard}=context.window.HumanityMatch;
const data=context.window.CHARACTERS;
function runRound(match,id,resolver){
  if(match.firstSide==='player'&&match.phase==='selecting')commitPlayerCard(match,id,random);
  return playRound(match,id,resolver);
}
const before=JSON.stringify(data);
let seed=123456;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const seenPlayer=new Set(),seenCpu=new Set();
for(let n=0;n<1000;n++){
  const match=deal(data,random);
  assert.equal(match.playerHand.length,3);assert.equal(match.cpuHand.length,3);
  assert.equal(new Set([...match.playerHand,...match.cpuHand].map(c=>c.id)).size,6);
  if(match.firstSide==='cpu')assert.ok(match.cpuHand.includes(match.cpuCard));else assert.equal(match.cpuCard,null);
  for(const c of match.playerHand)seenPlayer.add(c.id);
  for(const c of match.cpuHand)seenCpu.add(c.id);
}
assert.equal(seenPlayer.size,30);assert.equal(seenCpu.size,30);
for(const winners of [['player','player'],['cpu','cpu'],['player','cpu','player'],['cpu','player','cpu']]){
  const match=deal(data,random);
  for(const winner of winners){
    const player=availableCards(match.playerHand,match.usedPlayerIds)[0];
    const result=runRound(match,player.id,()=>({winner}));
    const cpu=result.cpuCard;
    assert.ok(match.usedPlayerIds.includes(player.id));assert.ok(match.usedCpuIds.includes(cpu.id));
    assert.throws(()=>runRound(match,player.id,()=>({winner})));
    if(match.phase!=='finished'){
      nextRound(match,random);
      assert.equal(match.firstSide,winner);
      if(match.cpuCard)assert.ok(!match.usedCpuIds.includes(match.cpuCard.id));
      assert.throws(()=>runRound(match,player.id,()=>({winner})));
    }
  }
  assert.equal(match.phase,'finished');
  assert.equal(match.rounds.length,winners.length);
  assert.equal(match.winner,winners.at(-1));
  assert.equal(new Set(match.usedPlayerIds).size,winners.length);
  assert.equal(new Set(match.usedCpuIds).size,winners.length);
  assert.throws(()=>nextRound(match,random));
  assert.throws(()=>runRound(match,match.playerHand[0].id,()=>({winner:'player'})));
}
const sample=deal(data,random);
assert.throws(()=>runRound(sample,sample.playerHand[0].id,()=>({winner:'draw'})));
assert.equal(sample.rounds.length,0);assert.equal(sample.phase,sample.firstSide==='player'?'ready':'selecting');
let draws=0;
runRound(sample,sample.playerHand[0].id,(p,c)=>context.window.HumanityBattle.resolveRound(p,c,()=>{draws++;return 0;}));
assert.equal(draws,1);
const saved=sample.rounds[0].decision;
assert.throws(()=>runRound(sample,sample.playerHand[1].id,()=>{draws++;return {winner:'cpu'};}));
assert.equal(draws,1);assert.equal(sample.rounds[0].decision,saved);
assert.throws(()=>deal(data.slice(0,5)));
assert.throws(()=>deal([...data.slice(0,6),data[0]]));
for(let n=0;n<1000;n++){
  const match=deal(data,random);let victoryDraws=0;
  while(match.phase!=='finished'){
    const player=availableCards(match.playerHand,match.usedPlayerIds)[0];
    runRound(match,player.id,(p,c)=>context.window.HumanityBattle.resolveRound(p,c,()=>{victoryDraws++;return random();}));
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

const playerFirst=deal(data,()=>0);
assert.equal(playerFirst.firstSide,'player');assert.equal(playerFirst.cpuCard,null);
assert.throws(()=>playRound(playerFirst,playerFirst.playerHand[0].id,()=>({winner:'player'})));
let picks=0;
commitPlayerCard(playerFirst,playerFirst.playerHand[0].id,()=>{picks++;assert.equal(playerFirst.playerCard.id,playerFirst.playerHand[0].id);return 0;});
assert.equal(picks,1);assert.equal(playerFirst.phase,'ready');
const lockedCpu=playerFirst.cpuCard;
assert.throws(()=>commitPlayerCard(playerFirst,playerFirst.playerHand[1].id,()=>{picks++;return 0;}));
assert.throws(()=>playRound(playerFirst,playerFirst.playerHand[1].id,()=>({winner:'cpu'})));
assert.equal(picks,1);assert.equal(playerFirst.cpuCard,lockedCpu);
playRound(playerFirst,playerFirst.playerCard.id,()=>({winner:'cpu'}));
nextRound(playerFirst,()=>0);
assert.equal(playerFirst.firstSide,'cpu');assert.ok(playerFirst.cpuCard);
const cpuFirst=deal(data,()=>0.999999);
assert.equal(cpuFirst.firstSide,'cpu');assert.ok(cpuFirst.cpuCard);
playRound(cpuFirst,cpuFirst.playerHand[0].id,()=>({winner:'player'}));
nextRound(cpuFirst,()=>0);assert.equal(cpuFirst.firstSide,'player');assert.equal(cpuFirst.cpuCard,null);
const choices=new Set();
for(const roll of [0,0.5,0.999999]){
  const m=deal(data,()=>0);m.cpuHand.sort((a,b)=>context.window.HumanityBattle.calculatePower(a)-context.window.HumanityBattle.calculatePower(b));
  commitPlayerCard(m,m.playerHand[0].id,()=>roll);choices.add(m.cpuCard.id);
  assert.equal(m.cpuCard,m.cpuHand[Math.floor(roll*3)]);
}
assert.equal(choices.size,3,'CPU後攻は有利なカードに固定せずランダム');
console.log('PASS: 初戦の両先攻・勝者先攻/敗者後攻・CPU先攻の先選択・あなた公開後のCPU後攻ランダム選択・公開後変更/多重確定拒否');
