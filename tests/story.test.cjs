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
const finishCoverage=new Set();
const byPair=new Map();
const kinds=new Set(),skills=new Set(),patterns=new Set();let count=0,min=999,max=0;
for(const playerCard of characters)for(const cpuCard of characters){
  if(playerCard.id===cpuCard.id)continue;
  for(const roll of [0,0.123456,0.999999])for(const firstSide of ['player','cpu'])for(const round of [1,2,3]){
    const decision=b.resolveRound(playerCard,cpuCard,()=>roll);
    const result={playerCard,cpuCard,winner:decision.winner,decision,firstSide,round};
    const story=s.generateStory(result);count++;
    assert.equal(s.scene.validate(story.scene),true);
    assert.equal(story.scene.state.ended,'winner');
    assert.equal(story.scene.events.at(-1).actor,'winner');
    assert.ok(Object.isFrozen(story.scene)&&Object.isFrozen(story.scene.events));
    for(const event of story.scene.events){
      assert.ok(['far','near','grapple'].includes(event.after.distance));
      for(const pose of Object.values(event.after.posture))assert.ok(['standing','unbalanced','ground'].includes(pose));
      if(Object.values(event.after.holds).some(Boolean))assert.equal(event.after.distance,'grapple');
      if(event.after.top)assert.ok(Object.values(event.after.posture).every(pose=>pose==='ground'));
    }
    for(const [index,text]of [story.opening,story.middle,story.ending].entries()){
      assert.ok(text.startsWith(story.scene.events.filter(event=>event.paragraph===index).map(event=>event.text).join('')));
    }
    min=Math.min(min,story.body.length);max=Math.max(max,story.body.length);
    assert.ok(story.body.length>=150&&story.body.length<=250,`${story.body.length}: ${story.body}`);
    assert.ok(story.body.includes(playerCard.name));assert.ok(story.body.includes(cpuCard.name));
    assert.deepEqual(Array.from(story.body.split('\n\n')),[story.opening,story.middle,story.ending]);
    assert.doesNotMatch(story.body,/序盤：|中盤：|終盤：|互いの持ち味|勝機を探る/);
    assert.ok(story.ending.startsWith(story.winnerAlias));
    assert.equal(typeof story.winnerAlias,'string');assert.equal(typeof story.loserAlias,'string');
    assert.notEqual(story.winnerAlias,story.loserAlias);
    for(const sentence of story.body.split(/[。！]/).filter(Boolean))assert.ok(sentence.trim().length<=70, sentence);
    assert.ok(story.middle.includes(story.loserAlias));
    assert.doesNotMatch(story.opening+story.middle,/！/);
    assert.ok((story.body.match(/！/g)||[]).length<=1);
    for(let i=1;i<story.scene.events.length;i++){
      const prev=story.scene.events[i-1],event=story.scene.events[i];
      if(prev.actor===event.actor&&prev.paragraph===event.paragraph){
        const name=event.actor==='winner'?story.winnerAlias:story.loserAlias;
        assert.ok(!event.text.startsWith(name+'は'));
      }
    }
    assert.doesNotMatch(story.body,/相手|両者|彼|\{w\}|\{l\}/);
    const winnerCard=decision.winner==='player'?playerCard:cpuCard;
    const winnerProfile=context.window.COMBAT_STYLES[winnerCard.id];
    assert.ok(winnerProfile.finishes.some(finish=>finish.label===story.finish));
    // 表示される決まり手の主要な動作が本文にあり、KO/降参を取り違えない。
    for(const word of ['KO','関節技','絞め技','タックル','大外刈り','スイープ','フック','膝蹴り','足掛け','押し倒','組み倒','投げ']){
      if(story.finish.includes(word))assert.ok(story.body.includes(word),`${story.finish}: ${story.body}`);
    }
    const decisiveText=story.middle+story.ending;
    if(/^打撃から/.test(story.finish)){
      assert.match(story.middle,/打撃|パンチ/);
      assert.match(story.middle,/当たり|揺らし|ひるませ/);
      assert.match(story.ending,/組み付|押し倒|組み倒/);
      assert.ok(decisiveText.search(/打撃|パンチ/)<decisiveText.search(/組み付|押し倒|組み倒/));
      assert.ok(story.middle.includes(story.winnerAlias+'の'));
    }
    if(story.finish==='打撃からの制圧'){
      assert.ok(story.ending.includes('その隙に'));
      assert.equal(story.scene.events.at(-1).actor,'winner');
      assert.match(story.ending,/組み付き、地面へ押し倒して動きを封じ/);
    }
    if(story.finish==='膝蹴りによるKO')assert.match(story.ending,/膝蹴り.*命中.*KO/);
    // 短縮名を使う中盤の各文で、行動主体を直前の勝者または明示した敗者に保つ。
    assert.ok([story.winnerAlias,story.loserAlias].some(name=>story.middle.startsWith(name)));
    assert.match(story.middle.split(/[。！]/).filter(Boolean).at(-1),new RegExp('^'+story.loserAlias+'は'));
    assert.equal(story.body.includes('KO'),story.finish.includes('KO'));
    assert.equal(story.body.includes('降参'),/関節技|絞め技/.test(story.finish));
    for(const skill of [story.playerSkill,story.cpuSkill]){assert.ok(b.STATS.includes(skill));skills.add(skill);}
    assert.equal(story.winnerId,winnerCard.id);
    assert.match(story.ending,/勝利/);finishCoverage.add(`${winnerCard.id}|${story.finish}`);
    const gap=decision.playerPower-decision.cpuPower;
    const upset=(gap>0&&decision.winner==='cpu')||(gap<0&&decision.winner==='player');
    assert.equal(story.kind==='upset',upset);
    assert.equal(/番狂わせ|不利な予想/.test(story.ending),upset);
    assert.equal(story.headline.includes('逆転'),upset);
    if(Math.abs(gap)<=20)assert.match(story.ending,/接戦|競り合/);
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
for(const card of characters)for(const finish of profiles[card.id].finishes)assert.ok(finishCoverage.has(`${card.id}|${finish.label}`));
// 重点対戦は、勝者が逆転すると距離・組み・蹴り・抵抗からの決着も変わる。
const focus=[
 ['ww2-us-soldier','gladiator',/米兵のパンチ.*剣闘士[\s\S]*その隙に剣闘士へ組み付/,/剣闘士のパンチ.*米兵[\s\S]*その隙に大戦期の米兵へ組み付/],
 ['heavyweight-boxer','heavyweight-judoka',/手を振りほど[\s\S]*ジャブ[\s\S]*フック/,/ジャブ[\s\S]*懐へ[\s\S]*大外刈り/],
 ['muay-thai','mma-fighter',/タックル[\s\S]*上体[\s\S]*膝蹴り/,/ローキック[\s\S]*(打撃|タックル)[\s\S]*(KO|関節技)/],
 ['oil-wrestler','spartan',/打撃[\s\S]*胴[\s\S]*足掛け/,/胴に腕[\s\S]*体を前[\s\S]*投げ/],
 ['us-office-worker','heavyweight-boxer',/ジャブ[\s\S]*肩を低く[\s\S]*体当たり/,/ぎこちなく[\s\S]*ストレート[\s\S]*フック/]
];
for(const [a,c,playerPattern,cpuPattern]of focus){
 const playerCard=characters.find(card=>card.id===a),cpuCard=characters.find(card=>card.id===c);
 for(const [roll,pattern]of [[0,playerPattern],[.999999,cpuPattern]]){
  const decision=b.resolveRound(playerCard,cpuCard,()=>roll);
  const story=s.generateStory({playerCard,cpuCard,decision,winner:decision.winner,firstSide:'player',round:1});
  assert.match(story.body,pattern);
  const knownAliases={'ww2-us-soldier':'大戦期の米兵',gladiator:'剣闘士','heavyweight-boxer':'ボクサー','heavyweight-judoka':'柔道家','muay-thai':'ムエタイ選手','mma-fighter':'総合格闘家','oil-wrestler':'オイルレスラー',spartan:'スパルタ兵','us-office-worker':'社会人'};
  assert.equal(story.winnerAlias,knownAliases[decision.winner==='player'?a:c]);
  assert.equal(story.loserAlias,knownAliases[decision.winner==='player'?c:a]);
 }
}
function matchTrace(enabled,seed){
 let state=seed,calls=0;
 const random=()=>{calls++;state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const original=s.generateStory;
 if(!enabled)s.generateStory=()=>Object.freeze({body:''});
 try{
  const match=m.deal(characters,random);
  while(match.phase!=='finished'){
   const card=m.availableCards(match.playerHand,match.usedPlayerIds)[0];
   if(match.firstSide==='player')m.commitPlayerCard(match,card.id,random);
   m.playRound(match,card.id,(p,c)=>b.resolveRound(p,c,random));
   if(match.phase==='round-ended')m.nextRound(match,random);
  }
  return JSON.stringify({calls,winner:match.winner,rounds:match.rounds.map(r=>({player:r.playerCard.id,cpu:r.cpuCard.id,decision:r.decision,firstSide:r.firstSide}))});
 }finally{s.generateStory=original;}
}
for(let seed=1;seed<=100;seed++)assert.equal(matchTrace(true,seed),matchTrace(false,seed));
let generated=0;
const original=s.generateStory;
s.generateStory=result=>{generated++;return original(result);};
const match=m.deal(characters,()=>0.999999);
let draws=0;
const result=m.playRound(match,match.playerHand[0].id,(p,c)=>b.resolveRound(p,c,()=>{draws++;return 0;}));
assert.equal(generated,1);assert.equal(draws,1);
const saved=result.story;assert.equal(match.rounds[0].story,saved);
assert.throws(()=>m.playRound(match,match.playerHand[1].id));assert.equal(generated,1);assert.equal(draws,1);
m.deal(characters,()=>0);
assert.equal(match.rounds[0].story,saved);assert.equal(generated,1);
const body=saved.body;
match.rounds[0].playerCard.name='変更テスト';
assert.equal(saved.body,body);
console.log(`PASS: ${count}件の物語は${min}〜${max}文字・両者名・見出しなし3段落・固有技/決まり手・4展開・勝者整合・生成1回/保存・100試合の乱数列/勝敗一致`);
