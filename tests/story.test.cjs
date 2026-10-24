const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({window:{}});
for(const file of ['characters','battle','combat-styles','story','match'])vm.runInContext(fs.readFileSync(`js/${file}.js`,'utf8'),context);
const {HumanityBattle:b,HumanityStory:s,HumanityMatch:m,CHARACTERS:characters}=context.window;
vm.runInContext("Math.random=()=>{throw new Error('ストーリーで乱数を取得しない');}",context);
const profiles=context.window.COMBAT_STYLES;
assert.equal(Object.keys(profiles).length,30);
for(const card of characters){
  const profile=profiles[card.id];assert.ok(profile);
  assert.ok(profile.style&&profile.weakness&&profile.techniques.length&&profile.finishes.length);
  assert.equal(card.stats[profile.weaknessStat],Math.min(...Object.values(card.stats)));
  for(const move of [...profile.techniques,...profile.finishes]) assert.ok(b.STATS.includes(move.stat)&&move.action);
}
const byPair=new Map();
const kinds=new Set(),skills=new Set(),patterns=new Set();let count=0,min=999,max=0;
for(const playerCard of characters)for(const cpuCard of characters){
  if(playerCard.id===cpuCard.id)continue;
  for(const roll of [0,0.123456,0.999999])for(const firstSide of ['player','cpu'])for(const round of [1,2,3]){
    const decision=b.resolveRound(playerCard,cpuCard,()=>roll);
    const result={playerCard,cpuCard,winner:decision.winner,decision,firstSide,round};
    const story=s.generateStory(result);count++;
    min=Math.min(min,story.body.length);max=Math.max(max,story.body.length);
    assert.ok(story.body.length>=150&&story.body.length<=250,`${story.body.length}: ${story.body}`);
    assert.ok(story.body.includes(playerCard.name));assert.ok(story.body.includes(cpuCard.name));
    assert.ok(story.body.indexOf('序盤：')<story.body.indexOf('中盤：'));assert.ok(story.body.indexOf('中盤：')<story.body.indexOf('終盤：'));
    const winnerName=decision.winner==='player'?playerCard.name:cpuCard.name;
    const loserName=decision.winner==='player'?cpuCard.name:playerCard.name;
    assert.ok(story.ending.includes(`「${winnerName}」`));assert.ok(!story.ending.includes(`「${loserName}」`));
    for(const [card,skill] of [[playerCard,story.playerSkill],[cpuCard,story.cpuSkill]]){
      const profile=context.window.COMBAT_STYLES[card.id];
      assert.ok(profile.techniques.some(move=>move.stat===skill));
      assert.ok(story.opening.includes(profile.style));
      assert.ok(profile.techniques.some(move=>story.middle.includes(move.action)));
      skills.add(skill);
    }
    const winnerCard=decision.winner==='player'?playerCard:cpuCard;
    const winnerProfile=context.window.COMBAT_STYLES[winnerCard.id];
    assert.ok(winnerProfile.finishes.some(finish=>finish.label===story.finish&&story.ending.includes(finish.action)));
    assert.equal(story.winnerId,winnerCard.id);
    const gap=decision.playerPower-decision.cpuPower;
    const upset=(gap>0&&decision.winner==='cpu')||(gap<0&&decision.winner==='player');
    assert.equal(story.kind==='upset',upset);
    assert.equal(story.ending.includes('番狂わせ'),upset);
    assert.doesNotMatch(story.body,/あなた|CPU|PLAYER|STR|SPD|END|STK|GRP|SUB|抽選値|判定境界|計算式/);
    assert.deepEqual(s.generateStory(result),story);assert.ok(Object.isFrozen(story));
    kinds.add(story.kind);patterns.add(story.body);
    const key=`${playerCard.id}|${cpuCard.id}`;
    if(!byPair.has(key))byPair.set(key,new Set());
    byPair.get(key).add(story.body);
  }
}
assert.ok(skills.size>=5);assert.equal(kinds.size,4);assert.ok(patterns.size>100);
for(const variations of byPair.values())assert.ok(variations.size>1);
let generated=0;
const original=s.generateStory;
s.generateStory=result=>{generated++;return original(result);};
const match=m.deal(characters,()=>0.999999);
let draws=0;
const result=m.playRound(match,match.playerHand[0].id,(p,c)=>b.resolveRound(p,c,()=>{draws++;return 0;}));
assert.equal(generated,1);assert.equal(draws,1);
const saved=result.story;assert.equal(match.rounds[0].story,saved);
assert.throws(()=>m.playRound(match,match.playerHand[1].id));assert.equal(generated,1);assert.equal(draws,1);
m.nextRound(match,()=>0);
assert.equal(match.rounds[0].story,saved);assert.equal(generated,1);
const body=saved.body;
match.rounds[0].playerCard.name='変更テスト';
assert.equal(saved.body,body);
console.log(`PASS: ${count}件の物語は${min}〜${max}文字・両者名・序盤/中盤/終盤・固有スタイル/技/決まり手・4展開・勝者整合・生成1回/保存・追加抽選なし`);
