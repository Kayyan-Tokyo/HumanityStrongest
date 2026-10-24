// 重点5対戦×両勝者×3展開を、実際の判定関数に固定乱数を渡して再現する。
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function makeExamples(){
 const context=vm.createContext({window:{}});
 for(const name of ['characters','battle','combat-styles','story'])vm.runInContext(fs.readFileSync(`js/${name}.js`,'utf8'),context);
 const {CHARACTERS:roster,HumanityBattle:b,HumanityStory:s}=context.window;
 const pairs=[['samurai','muay-thai'],['heavyweight-boxer','heavyweight-judoka'],['oil-wrestler','spartan'],['mma-fighter','bjj-fighter'],['us-office-worker','heavyweight-boxer']];
 const examples=[];
 for(const [a,c]of pairs)for(const winner of ['player','cpu']){
  const playerCard=roster.find(card=>card.id===a),cpuCard=roster.find(card=>card.id===c),pool=[];
  for(let i=0;i<60;i++){
   const roll=winner==='player'?.001+i*.0005:.96+i*.0005,round=i%3+1,firstSide=i%2?'player':'cpu';
   const decision=b.resolveRound(playerCard,cpuCard,()=>roll);assert.equal(decision.winner,winner);
   const story=s.generateStory({playerCard,cpuCard,winner,decision,round,firstSide});
   pool.push({playerCard,cpuCard,winner,round,firstSide,roll,story,route:story.scene.events.map(e=>`${e.actor}:${e.action}`).join('|')});
  }
  const selected=[pool[0]];
  const different=pool.find(example=>example.route!==selected[0].route);assert.ok(different);selected.push(different);
  const third=pool.find(example=>selected.every(other=>other.story.body!==example.story.body));assert.ok(third);selected.push(third);
  examples.push(...selected);
 }
 assert.equal(examples.length,30);return examples;
}
function formatExamples(examples){return examples.map((e,index)=>`\n## ${index+1}. ${e.playerCard.name} VS ${e.cpuCard.name} — 勝者：${e.winner==='player'?e.playerCard.name:e.cpuCard.name}（${e.story.body.length}文字）\n\n${e.story.headline}\n\n${e.story.body}\n\n決まり手：${e.story.finish}\n`).join('');}
if(require.main===module)process.stdout.write(formatExamples(makeExamples()));
module.exports={makeExamples,formatExamples};
