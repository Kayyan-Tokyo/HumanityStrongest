const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// ライブラリなしのテスト用DOM。実画面のレイアウト検証は含まない。
class Element {
  constructor(tag = 'div', id = '') {
    this.tag = tag; this.id = id; this.children = []; this.dataset = {};
    this.attributes = {}; this.listeners = {}; this.textContent = '';
    this.className = ''; this.hidden = false; this.disabled = false;
    this.classList = {
      add: value => { this.className += ' ' + value; },
      remove: value => { this.className = this.className.split(' ').filter(c => c !== value).join(' '); }
    };
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; this.textContent = ''; }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(event, handler) { this.listeners[event] = handler; }
  click() { if (!this.disabled) this.listeners.click?.(); }
  focus() { this.focused = true; }
  scrollIntoView() { this.scrolled = true; }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [
      ...(child.className.split(' ').includes(selector.slice(1)) ? [child] : []),
      ...child.querySelectorAll(selector)
    ]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0]; }
}
const html = fs.readFileSync('index.html', 'utf8');
const ids = {};
for (const tag of html.matchAll(/<([a-z0-9]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
  const element = new Element(tag[1], tag[2]);
  element.hidden = /\bhidden\b/.test(tag[0]);
  element.disabled = /\bdisabled\b/.test(tag[0]);
  ids[tag[2]] = element;
}
const main = new Element('main');
const context = vm.createContext({window: {scrollTo() {}}, Math: Object.create(Math), document: {
  getElementById: id => { assert.ok(ids[id], `HTMLに ${id} が存在する`); return ids[id]; },
  createElement: tag => new Element(tag), querySelector: () => main, body: new Element('body')
}});
for (const file of ['js/characters.js', 'js/battle.js', 'js/match.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
const api = context.window.HumanityMatch;
const originalDeal = api.deal;
let currentMatch, dealCount = 0, nextWinner = 'player', firstRoll = 0;
api.deal = data => { dealCount++; currentMatch = originalDeal(data, () => firstRoll); return currentMatch; };
let draws=0;
const resolve=context.window.HumanityBattle.resolveRound;
context.window.HumanityBattle.resolveRound=(p,c)=>resolve(p,c,()=>{draws++;return nextWinner==='player'?0:0.999999;});
vm.runInContext(fs.readFileSync('js/game.js', 'utf8'), context);
const cards = () => ids.hand.querySelectorAll('.card');
const cpuCards = () => ids['cpu-hand'].querySelectorAll('.card');
const textTree = element => [element.textContent, ...Object.values(element.attributes), ...Object.values(element.dataset), ...element.children.map(textTree)].join(' ');
function assertNoStats() {
  for(const id of ['hand','cpu-hand','player-fighter','cpu-fighter']) assert.doesNotMatch(textTree(ids[id]), /STR|SPD|END|STK|GRP|SUB/);
}
ids['start-button'].click();
assert.equal(cards().length,3); assert.equal(cpuCards().length,3);
assert.equal(ids['fight-button'].disabled,true);
ids['fight-button'].listeners.click();
assert.equal(currentMatch.rounds.length,0);
assert.equal(ids['cpu-fighter'].querySelectorAll('.card-back').length,1);
for(let i=0;i<3;i++){
  const c=currentMatch.cpuHand[i];
  assert.equal(cpuCards()[i].querySelector('.card-name').textContent,c.name);
  assert.equal(cpuCards()[i].querySelector('.card-profile').textContent,`${c.age}歳 / ${c.height}cm / ${c.weight}kg`);
}
function fight(winner){
  nextWinner=winner;
  const card=cards().find(c=>!c.disabled);
  const chosenId=card.dataset.characterId;
  card.click();
  assert.equal(ids['player-fighter'].querySelector('.card-name').textContent,currentMatch.playerHand.find(c=>c.id===chosenId).name);
  if(currentMatch.firstSide==='player'){
    assert.equal(ids['cpu-fighter'].querySelectorAll('.card-back').length,1);
    assert.equal(currentMatch.cpuCard,null);
    ids['confirm-button'].click();
    assert.equal(currentMatch.phase,'ready');assert.equal(ids['fight-button'].disabled,false);
    const locked=currentMatch.cpuCard;
    ids['confirm-button'].listeners.click();assert.equal(currentMatch.cpuCard,locked);
    assert.ok(cards().every(c=>c.disabled));
    assert.equal(ids['cpu-fighter'].querySelectorAll('.card-back').length,1);
  }else{
    assert.equal(ids['cpu-fighter'].querySelector('.card-name').textContent,currentMatch.cpuCard.name);
    assert.equal(ids['confirm-button'].hidden,true);
  }
  const before=currentMatch.rounds.length;
  const beforeDraws=draws;
  ids['fight-button'].click();
  assert.equal(draws,beforeDraws+1);
  assert.equal(ids['round-result'].hidden,false);
  const result=currentMatch.rounds.at(-1);
  assert.equal(ids['result-stats'].children.length,6);
  assert.equal(ids['result-reason'].textContent,context.window.HumanityBattle.describeResult(result.decision));
  assert.equal(currentMatch.rounds.length,before+1);
  const front=ids['cpu-fighter'].children[0];
  for(let i=0;i<10;i++)ids['fight-button'].listeners.click();
  assert.equal(currentMatch.rounds.length,before+1);assert.equal(ids['cpu-fighter'].children[0],front);assert.equal(draws,beforeDraws+1);
  assert.ok(cards().every(c=>c.disabled));
  assert.ok(currentMatch.usedPlayerIds.includes(chosenId));
  assertNoStats();
}
function next(){
  const saved=currentMatch,used=[...currentMatch.usedPlayerIds];
  ids['return-button'].click();
  assert.equal(currentMatch,saved);assert.equal(ids['fight-button'].disabled,true);
  assert.equal(ids['round-result'].hidden,true);assert.equal(ids['result-stats'].children.length,0);
  for(const card of cards()) assert.equal(card.disabled,used.includes(card.dataset.characterId));
  if(currentMatch.firstSide==='player')assert.equal(ids['cpu-fighter'].querySelectorAll('.card-back').length,1);
  else assert.equal(ids['cpu-fighter'].querySelector('.card-name').textContent,currentMatch.cpuCard.name);
  assert.match(ids['turn-status'].textContent,currentMatch.firstSide==='player'?/あなたが先攻/:/あなたが後攻/);
  const count=currentMatch.rounds.length;
  for(const card of cards().filter(c=>c.disabled))card.click();
  ids['fight-button'].listeners.click();assert.equal(currentMatch.rounds.length,count);
}
fight('player'); assert.equal(currentMatch.playerWins,1);next();
fight('cpu'); assert.equal(currentMatch.cpuWins,1);next();
fight('player'); assert.equal(currentMatch.phase,'finished');assert.equal(currentMatch.winner,'player');
assert.equal(currentMatch.rounds.length,3);assert.equal(ids['return-button'].hidden,true);
ids['return-button'].listeners.click();assert.equal(currentMatch.rounds.length,3);
assert.equal(dealCount,1);
firstRoll=0.999999;ids['redeal-button'].click();assert.match(ids['turn-status'].textContent,/あなたが後攻/);assert.equal(dealCount,2);assert.equal(currentMatch.usedPlayerIds.length,0);
fight('cpu');next();fight('cpu');
assert.equal(currentMatch.phase,'finished');assert.equal(currentMatch.rounds.length,2);
assert.equal(currentMatch.winner,'cpu');assert.equal(ids['return-button'].hidden,true);
assert.equal(cards().filter(c=>c.className.includes('used')).length,2);
assert.equal(cpuCards().filter(c=>c.className.includes('used')).length,2);
console.log('PASS: 両者3枚公開・能力値非表示・1回公開・連打防止・使用済み選択禁止・次ラウンド・2勝終了・3ラウンド決着・新しい試合');
