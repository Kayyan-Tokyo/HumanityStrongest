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
for (const file of ['js/characters.js', 'js/match.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
const characters = context.window.CHARACTERS;
const deal = context.window.HumanityMatch.deal;
const original = JSON.stringify(characters);
assert.equal(characters.length, 30);
assert.equal(new Set(characters.map(c => c.id)).size, 30);
for (const c of characters) {
  assert.equal(typeof c.name, 'string');
  assert.ok(c.name.trim().length > 0);
  assert.doesNotMatch(c.name, /^仮キャラクター/);
  for (const key of ['age', 'height', 'weight']) assert.ok(Number.isFinite(c[key]));
  assert.deepEqual(Object.keys(c.stats), ['STR', 'SPD', 'END', 'STK', 'GRP', 'SUB']);
}
function assertMatch(match) {
  assert.equal(match.playerHand.length, 4);
  assert.equal(match.cpuHand.length, 4);
  assert.equal(new Set([...match.playerHand, ...match.cpuHand].map(c => c.id)).size, 8);
  assert.ok(match.cpuHand.includes(match.cpuCard));
  for (const c of [...match.playerHand, ...match.cpuHand]) {
    assert.equal(c, characters.find(source => source.id === c.id));
    assert.equal(Object.keys(c.stats).length, 6);
  }
}
const lineups = new Set();
const seenPlayer = new Set();
const seenCpu = new Set();
let seed = 20261024;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
for (let i = 0; i < 1000; i++) {
  const match = deal(characters, random); assertMatch(match);
  for (const c of match.playerHand) seenPlayer.add(c.id);
  for (const c of match.cpuHand) seenCpu.add(c.id);
  lineups.add(match.playerHand.map(c => c.id).join(','));
}
assert.ok(lineups.size > 1, '配布結果が変化する');
assert.equal(seenPlayer.size, 30, '全30人がプレイヤーに抽選される');
assert.equal(seenCpu.size, 30, '全30人がCPUに抽選される');
for (const value of [0, 0.9999999999999999]) assertMatch(deal(characters, () => value));
assert.throws(() => deal(characters.slice(0, 7)));
assert.throws(() => deal([...characters.slice(0, 8), characters[0]]));
// 実際の配布結果を観察するラッパー（本番コードにテスト用状態を公開しない）。
let currentMatch, dealCount = 0;
context.window.HumanityMatch.deal = data => { dealCount++; return currentMatch = deal(data); };
vm.runInContext(fs.readFileSync('js/game.js', 'utf8'), context);
const cards = () => ids.hand.querySelectorAll('.card');
function textTree(element) {
  return [element.textContent, ...Object.values(element.attributes), ...Object.values(element.dataset), ...element.children.map(textTree)].join(' ');
}
function assertNoStats(element) { assert.doesNotMatch(textTree(element), /STR|SPD|END|STK|GRP|SUB/); }
assert.equal(ids['hand-screen'].hidden, true);
assert.equal(ids['battle-button'], undefined, '中間のバトル開始ボタンは存在しない');
assert.equal(ids['preparation-screen'], undefined, '中間の対戦準備画面は存在しない');
ids['start-button'].click();
assert.equal(ids['title-screen'].hidden, true);
assert.equal(ids['hand-screen'].hidden, false);
assert.equal(cards().length, 4);
assert.equal(ids['cpu-hand'].children.length, 4);
assert.equal(ids['fight-button'].disabled, true);
ids['fight-button'].listeners.click(); // disabledを迂回しても未選択は拒否。
assert.equal(ids['cpu-fighter'].querySelectorAll('.card-back').length, 1);
assert.equal(ids['return-button'].hidden, true);
assertNoStats(ids.hand);
const cpuCards = () => ids['cpu-hand'].querySelectorAll('.card');
assert.equal(cpuCards().length, 4);
assertNoStats(ids['cpu-hand']);
for (let i = 0; i < 4; i++) {
  const c = currentMatch.cpuHand[i];
  const card = cpuCards()[i];
  assert.equal(card.querySelector('.card-name').textContent, c.name);
  assert.equal(card.querySelector('.card-profile').textContent, `${c.age}歳 / ${c.height}cm / ${c.weight}kg`);
  assert.deepEqual(card.dataset, {});
  assert.deepEqual(card.attributes, {});
  assert.deepEqual(card.listeners, {});
}
assert.equal(ids['cpu-fighter'].querySelectorAll('.card-name').length, 0);
for (let i = 0; i < 4; i++) {
  assert.equal(cards()[i].querySelector('.card-name').textContent, currentMatch.playerHand[i].name);
  assert.match(cards()[i].querySelector('.card-profile').textContent, /歳 \/ \d+cm \/ \d+kg/);
}
cards()[0].click(); assert.equal(cards()[0].attributes['aria-pressed'], 'true');
assert.equal(ids['player-fighter'].querySelector('.card-name').textContent, currentMatch.playerHand[0].name);
cards()[1].click(); assert.equal(cards()[0].attributes['aria-pressed'], 'false');
cards()[1].click(); assert.equal(ids['fight-button'].disabled, true);
cards()[2].click();
const selectedCard = cards()[2];
const playerNodes = [...ids.hand.children];
const cpuNodes = [...ids['cpu-hand'].children];
const savedMatch = currentMatch;
const selectedName = selectedCard.querySelector('.card-name').textContent;
assert.equal(ids['cpu-fighter'].querySelectorAll('.card-back').length, 1);
ids['fight-button'].click();
assert.equal(ids['hand-screen'].hidden, false);
assert.ok(cards().every(card => card.disabled));
assert.equal(ids['redeal-button'].disabled, true);
assert.equal(ids['fight-button'].disabled, true);
assert.equal(ids['return-button'].hidden, false);
assert.equal(ids['cpu-fighter'].querySelector('.card-name').textContent, savedMatch.cpuCard.name);
assertNoStats(ids['player-fighter']); assertNoStats(ids['cpu-fighter']);
assert.equal(ids['player-fighter'].querySelector('.card-name').textContent, selectedName);
const revealedNode = ids['cpu-fighter'].children[0];
for (let n = 0; n < 10; n++) ids['fight-button'].listeners.click();
assert.equal(ids['cpu-fighter'].children[0], revealedNode, '多重実行で再描画しない');
assert.equal(dealCount, 1);
cards()[0].click(); ids['redeal-button'].click();
assert.equal(ids['player-fighter'].querySelector('.card-name').textContent, selectedName);
assert.equal(dealCount, 1);
ids['return-button'].click();
assert.equal(ids['hand-screen'].hidden, false);
assert.ok(cards().every(card => !card.disabled));
assert.equal(ids['cpu-fighter'].querySelectorAll('.card-back').length, 1);
assert.equal(currentMatch, savedMatch);
assert.deepEqual(ids.hand.children, playerNodes);
assert.deepEqual(ids['cpu-hand'].children, cpuNodes);
assert.equal(selectedCard.attributes['aria-pressed'], 'true');
assert.equal(ids['fight-button'].disabled, false);
cards()[0].click();
assert.equal(ids['cpu-fighter'].querySelectorAll('.card-back').length, 1);
ids['fight-button'].click();
assert.equal(ids['cpu-fighter'].querySelector('.card-name').textContent, savedMatch.cpuCard.name);
ids['return-button'].click();
ids['redeal-button'].click();
assert.equal(dealCount, 2); assertMatch(currentMatch);
assert.equal(ids['fight-button'].disabled, true);
assert.ok(cards().every(c => c.attributes['aria-pressed'] === 'false'));
assert.equal(JSON.stringify(characters), original);
console.log('PASS: 正式30人・1000回抽選・未選択拒否・1回の操作でCPU公開・連打拒否・選択/中央表示/戻る/再配布');
