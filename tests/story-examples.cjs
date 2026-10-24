// 日本語の読み味を手動確認する再現可能な代表例。勝敗は実際の判定関数を使う。
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const context = vm.createContext({window:{}});
for (const name of ['characters','battle','combat-styles','story']) vm.runInContext(fs.readFileSync(`js/${name}.js`,'utf8'),context);
const {CHARACTERS:roster,HumanityBattle:battle,HumanityStory:stories}=context.window;
function example(a,b,winner,round=1,roll=winner==='player'?0.001:0.999){
  const playerCard=roster.find(c=>c.id===a),cpuCard=roster.find(c=>c.id===b);
  const decision=battle.resolveRound(playerCard,cpuCard,()=>roll);
  assert.equal(decision.winner,winner);
  const story=stories.generateStory({playerCard,cpuCard,decision,winner:decision.winner,round,firstSide:'player'});
  return {playerCard,cpuCard,story,winner};
}
function print({playerCard,cpuCard,story,winner}){
  console.log(`\n## ${playerCard.name} VS ${cpuCard.name} — 勝者：${winner==='player'?playerCard.name:cpuCard.name}（${story.body.length}文字）\n\n${story.headline}\n\n${story.body}\n\n決まり手：${story.finish}`);
}
const pairs=[['ww2-us-soldier','gladiator'],['modern-us-soldier','gladiator'],['neanderthal','bodybuilder'],['heavyweight-boxer','heavyweight-judoka'],['muay-thai','mma-fighter'],['oil-wrestler','spartan'],
  ['us-office-worker','heavyweight-boxer'],['hacker','bjj-fighter'],['japanese-office-worker','female-mma-fighter']];
for(const [a,b] of pairs)for(const winner of ['player','cpu'])print(example(a,b,winner));
// 打撃だけでなく、MMAの倒す→寝技→関節技の接続も読む。
for(const [a,b] of [['muay-thai','mma-fighter'],['heavyweight-boxer','female-mma-fighter']]){
  let found;
  for(let i=0;i<100&&!found;i++){
    const candidate=example(a,b,'cpu',i%3+1,.96+i*.00039);
    if(candidate.story.finish.includes('関節技'))found=candidate;
  }
  assert.ok(found);print(found);
}
