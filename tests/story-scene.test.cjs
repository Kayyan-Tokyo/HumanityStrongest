const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({window:{}});
for(const file of ['characters','battle','combat-styles','story'])vm.runInContext(fs.readFileSync(`js/${file}.js`,'utf8'),context);
const {scene:s,generateStory}=context.window.HumanityStory;
const act=(scene,action,actor='winner')=>s.advance(scene,action,actor,`${actor}:${action}。`);
const near=()=>act(s.create(),'approach');
function rejected(scene,action,actor='winner'){
 const before=JSON.stringify(scene);assert.throws(()=>act(scene,action,actor),s.SceneError);
 assert.equal(JSON.stringify(scene),before,'不正な動作は状態にも本文にも残さない');
}
// 遠い距離から投げる/膝を当てる、倒れたまま立ち技を使う、手を放さず殴る、を拒否。
rejected(s.create(),'throw_pin');rejected(s.create(),'knee_ko');rejected(s.create(),'kick_guard');
let scene=near();act(scene,'hold_arm','loser');
rejected(scene,'strike_guard');rejected(scene,'kick_guard');rejected(scene,'ko');
act(scene,'separate');rejected(scene,'hold_body');rejected(scene,'throw_down');
act(scene,'approach');act(scene,'hold_body');act(scene,'offbalance');act(scene,'throw_pin');
assert.equal(scene.state.posture.loser,'ground');assert.equal(scene.state.posture.winner,'ground');
rejected(scene,'guard','loser');rejected(scene,'recover','loser');rejected(scene,'approach','loser');
assert.equal(s.validate(scene),true);
// つかみをほどく→近い距離で打つ、は明示した動作があれば許可。
scene=near();act(scene,'hold_arm','loser');act(scene,'release');act(scene,'hit');act(scene,'ko');
assert.equal(scene.state.posture.loser,'ground');assert.equal(scene.state.ended,'winner');
rejected(scene,'strike_guard','loser');rejected(scene,'guard');
// 勝者が先に打撃を受けた場合も、明示的に体勢を立て直してから反撃する。
scene=near();act(scene,'hit','loser');rejected(scene,'strike_guard');
act(scene,'recover');act(scene,'hit');act(scene,'ko');assert.equal(s.validate(scene),true);
// タックルから寝技へ入った後は地面の抵抗と関節技だけ。無説明の起立/パンチは拒否。
scene=near();act(scene,'shoot_ground');
rejected(scene,'strike_guard');rejected(scene,'recover','loser');rejected(scene,'approach');
act(scene,'ground_resist','loser');act(scene,'lock');assert.equal(s.validate(scene),true);
// 引き込みの下からいきなり上からの絞め技は使えず、スイープが必要。
scene=near();act(scene,'hold_arm');act(scene,'pull_guard');
rejected(scene,'choke');act(scene,'ground_resist','loser');act(scene,'sweep');act(scene,'choke');
assert.equal(scene.state.top,'winner');assert.equal(s.validate(scene),true);
// 膝蹴りは接近/姿勢の崩れが必要。腕を捕られた状態での命中も拒否。
scene=near();rejected(scene,'knee_ko');act(scene,'hold_arm','loser');rejected(scene,'knee_ko');
act(scene,'separate');act(scene,'step_in','loser');act(scene,'knee_ko');assert.equal(s.validate(scene),true);
// 不整合な候補は全文を破棄し、最初から組み立てた別の筋を選ぶ。
const valid=scene;let attempted=0;
const selected=s.choose([
 ()=>{attempted++;const bad=s.create();act(bad,'throw_pin');return bad;},
 ()=>{attempted++;return valid;}
]);
assert.equal(attempted,2);assert.equal(selected,valid);assert.equal(selected.events.some(e=>e.action==='throw_pin'),false);
assert.throws(()=>s.choose([()=>{throw new TypeError('実装エラー');}]),TypeError);
// 保存された前後の状態が改変されても、再生検証で検出する。
const altered=JSON.parse(JSON.stringify(scene));altered.events[0].after.distance='grapple';
assert.throws(()=>s.validate(altered),s.SceneError);
assert.equal(s.choose([()=>altered,()=>valid]),valid,'生成後の検証に失敗した候補も全文を破棄する');
// 5重点対戦すべてで両勝者×複数展開を確認。膝は組み付き型/再接近型の両方がある。
const {CHARACTERS:characters,HumanityBattle:b}=context.window;
const pairs=[['samurai','muay-thai'],['heavyweight-boxer','heavyweight-judoka'],['oil-wrestler','spartan'],['mma-fighter','bjj-fighter'],['us-office-worker','heavyweight-boxer']];
for(const [a,c]of pairs)for(const winner of ['player','cpu']){
 const playerCard=characters.find(card=>card.id===a),cpuCard=characters.find(card=>card.id===c);
 const patterns=new Set(),routes=new Set();
 for(let i=0;i<12;i++){
  const decision=b.resolveRound(playerCard,cpuCard,()=>winner==='player'?.001+i*.002:.96+i*.003);
  const story=generateStory({playerCard,cpuCard,decision,winner:decision.winner,round:i%3+1,firstSide:i%2?'player':'cpu'});
  assert.equal(story.winnerId,winner==='player'?a:c);assert.equal(s.validate(story.scene),true);
  patterns.add(story.body);routes.add(story.scene.events.map(e=>`${e.actor}:${e.action}`).join('|'));
 }
 assert.ok(patterns.size>=3,`${a}/${c}/${winner}: ${patterns.size}文章 / ${routes.size}動作列`);assert.ok(routes.size>=2,`${a}/${c}/${winner}: 少なくとも2つの整合した動作列`);
}
// 既存候補を1つに絞るテスト用フィクスチャで、全対戦相手×各決まり手を確認。
// 本体データは書き換えず、このVM内の候補だけを一時的に差し替えて必ず復元する。
let combinations=0;
const profiles=context.window.COMBAT_STYLES;
for(const playerCard of characters)for(const cpuCard of characters){
 if(playerCard.id===cpuCard.id)continue;
 for(const winner of ['player','cpu']){
  const card=winner==='player'?playerCard:cpuCard,profile=profiles[card.id],original=profile.finishes;
  try{
   for(const finish of original){
    profile.finishes=[finish];
    const decision=b.resolveRound(playerCard,cpuCard,()=>winner==='player'?0:.999999);
    const story=generateStory({playerCard,cpuCard,decision,winner:decision.winner,round:1,firstSide:'player'});
    assert.equal(story.finish,finish.label);assert.equal(s.validate(story.scene),true);combinations++;
   }
  }finally{profile.finishes=original;}
 }
}
console.log(`PASS: ${combinations}件の全対戦相手/既存決まり手の状態遷移`);
console.log('PASS: 距離/姿勢/つかむ手/寝技の上下/決着後の発動条件・不正遷移拒否・候補の全文破棄/再構築・状態改変検出・重点5対戦両勝者の複数動作列');
