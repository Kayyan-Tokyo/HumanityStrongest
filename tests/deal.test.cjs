const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// ライブラリなしのテスト用DOM。実画面のレイアウト検証は含まない。
class Element {
  constructor(tag = 'div', id = '') {
    this.style={}; this.tag = tag; this.id = id; this.children = []; this.dataset = {};
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
  getBoundingClientRect(){return {top:0,left:0,width:200,height:100,bottom:100};}
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
for (const file of ['js/characters.js', 'js/battle.js', 'js/combat-styles.js', 'js/story.js', 'js/match.js', 'js/streak.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
const api = context.window.HumanityMatch;
const originalDeal = api.deal;
let currentMatch, dealCount = 0, nextWinner = 'player', firstRoll = 0;
api.deal = data => { dealCount++; currentMatch = originalDeal(data, () => firstRoll); return currentMatch; };
let draws=0, stories=0;
const generateStory=context.window.HumanityStory.generateStory;
context.window.HumanityStory.generateStory=result=>{stories++;assert.ok(result.winner);return generateStory(result);};
const resolve=context.window.HumanityBattle.resolveRound;
context.window.HumanityBattle.resolveRound=(p,c)=>resolve(p,c,()=>{draws++;return nextWinner==='player'?0:0.999999;});
vm.runInContext(fs.readFileSync('js/game.js', 'utf8'), context);
const cards = () => ids.hand.querySelectorAll('.card');
const cpuCards = () => ids['cpu-hand'].querySelectorAll('.card');
const textTree = element => [element.textContent, ...Object.values(element.attributes), ...Object.values(element.dataset), ...element.children.map(textTree)].join(' ');
function assertNoStats() {
  for(const id of ['hand','cpu-hand','player-fighter','cpu-fighter']) assert.doesNotMatch(textTree(ids[id]), /STR|SPD|END|STK|GRP|SUB/);
}
const settled=async()=>{for(let i=0;i<60;i++)await Promise.resolve();};
(async()=>{
for(const winner of ['player','player','cpu','player']){
 nextWinner=winner;
 if(dealCount===0)ids['start-button'].click();else ids['next-match-button'].click();
 await settled();
 assert.equal(cards().length,2);assert.equal(cpuCards().length,1);assertNoStats();
 assert.equal(ids['next-match-button'].hidden,true);
 assert.ok(textTree(ids['cpu-fighter']).includes(currentMatch.cpuCard.name));
 const card=cards()[dealCount%2],id=card.dataset.characterId;
 card.click();for(let i=0;i<10;i++)for(const c of cards())c.listeners.click();
 assert.equal(ids['round-result'].hidden,true);await settled();
 assert.equal(currentMatch.rounds.length,1);assert.equal(currentMatch.phase,'finished');
 assert.equal(currentMatch.usedPlayerIds.length,1);
 const result=currentMatch.rounds[0];assert.equal(result.playerCard.id,id);
 assert.equal(ids['result-reason'].textContent,result.story.body);
 assert.equal(ids['result-finish'].textContent,`決まり手：${result.story.finish}`);
 assert.match(ids['win-banner'].textContent,result.winner==='player'?/あなた/:/CPU/);
 assert.equal(ids[result.winner==='player'?'cpu-fighter':'player-fighter'].style.visibility,'hidden');
 assert.equal(ids['next-match-button'].hidden,false);
 assert.equal(ids['current-streak'].textContent, String([1,2,0,1][dealCount-1]));
 assert.equal(ids['best-streak'].textContent,String(dealCount===1?1:2));
}
assert.equal(draws,4);assert.equal(stories,4);
assert.ok(!ids['fight-button']&&!ids['confirm-button']);
console.log('PASS: CPU公開1/候補2・1タップ/連打防止・1試合終了・連勝/最高記録・次の対戦・勝敗/物語保存1回・敗者のみ消滅');
})().catch(error=>{console.error(error);process.exitCode=1;});
