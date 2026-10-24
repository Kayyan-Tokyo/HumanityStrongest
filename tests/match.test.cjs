const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({window:{}});
for(const file of ['characters','battle','combat-styles','story','match'])vm.runInContext(fs.readFileSync(`js/${file}.js`,'utf8'),context);
const {HumanityMatch:m,HumanityBattle:b,CHARACTERS:data}=context.window;
let seed=123456;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const before=JSON.stringify(data),seenPlayer=new Set(),seenCpu=new Set();
assert.equal(m.HAND_SIZE,2);assert.equal(m.CPU_HAND_SIZE,1);assert.equal(m.MAX_ROUNDS,1);
for(let n=0;n<3000;n++){
  const match=m.deal(data,random);
  assert.equal(match.playerHand.length,2);assert.equal(match.cpuHand.length,1);
  assert.equal(new Set([...match.playerHand,...match.cpuHand].map(c=>c.id)).size,3);
  assert.equal(match.cpuCard,match.cpuHand[0]);assert.equal(match.phase,'selecting');
  for(const c of match.playerHand)seenPlayer.add(c.id);seenCpu.add(match.cpuCard.id);
}
assert.equal(seenPlayer.size,30);assert.equal(seenCpu.size,30);
for(const winner of ['player','cpu','draw'])for(const choice of [0,1]){
  const match=m.deal(data,random),cpu=match.cpuCard;
  let calls=0;
  const result=m.playRound(match,match.playerHand[choice].id,(p,c)=>{
    calls++;assert.equal(c,cpu);
    assert.throws(()=>m.playRound(match,match.playerHand[1-choice].id));
    return {...b.resolveRound(p,c,()=>winner==='cpu'?.999999:0),winner};
  });
  assert.equal(calls,1);assert.equal(match.phase,'finished');assert.equal(match.winner,winner);
  assert.equal(match.rounds.length,1);assert.equal(match.rounds[0],result);assert.ok(Object.isFrozen(result));
  assert.ok(result.story.body.includes(result.playerCard.name));assert.ok(result.story.body.includes(cpu.name));
  assert.equal(result.cpuCard,cpu);assert.equal(match.usedPlayerIds.length,1);assert.equal(match.usedCpuIds.length,1);
  for(const card of match.playerHand)assert.throws(()=>m.playRound(match,card.id,()=>{calls++;}));
  assert.equal(calls,1);assert.equal(match.rounds.length,1);
}
const invalid=m.deal(data,random);
assert.throws(()=>m.playRound(invalid,'missing-id'));assert.equal(invalid.phase,'selecting');
assert.throws(()=>m.playRound(invalid,invalid.playerHand[0].id,()=>({winner:'unknown'})));
assert.equal(invalid.rounds.length,0);assert.equal(invalid.phase,'selecting');
assert.throws(()=>m.deal(data.slice(0,2)));
assert.throws(()=>m.deal([...data,data[0]]));
assert.equal(m.nextRound,undefined);assert.equal(m.commitPlayerCard,undefined);
for(let n=0;n<500;n++){
  const match=m.deal(data,random);let calls=0;
  m.playRound(match,match.playerHand[n%2].id,(p,c)=>b.resolveRound(p,c,()=>{calls++;return random();}));
  assert.equal(calls,1);assert.equal(match.rounds.length,1);assert.equal(match.phase,'finished');
}
assert.equal(JSON.stringify(data),before);
console.log('PASS: 3000回のCPU1/候補2の重複なし配布・全30人出現・両候補/全結果・CPU固定・判定1回/再入防止・1試合終了・保存結果・データ不変');
