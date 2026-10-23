const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// 外部ライブラリなしでDOM操作とイベントを検証する最小テスト用DOM。
class Element {
  constructor(tag = 'div') {
    this.tag = tag; this.children = []; this.dataset = {}; this.attributes = {};
    this.listeners = {}; this.classList = { add: value => { this.className = value; } };
  }
  append(...children) { this.children.push(...children); }
  replaceChildren() { this.children = []; }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(event, handler) { this.listeners[event] = handler; }
  click() { this.listeners.click(); }
  focus() { this.focused = true; }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [
      ...(selector === '.' + child.className ? [child] : []),
      ...child.querySelectorAll(selector)
    ]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0]; }
}
const ids = Object.fromEntries(['title-screen', 'hand-screen', 'hand', 'status', 'start-button', 'redeal-button', 'hand-title'].map(id => [id, new Element()]));
ids['hand-screen'].hidden = true;
const main = new Element('main');
const context = vm.createContext({ window: {}, Math: Object.create(Math), document: {
  getElementById: id => ids[id], createElement: tag => new Element(tag), querySelector: () => main
}});
for (const file of ['js/characters.js', 'js/game.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
const characters = context.window.CHARACTERS;
assert.equal(characters.length, 30);
assert.equal(new Set(characters.map(c => c.id)).size, 30);
for (const c of characters) {
  assert.match(c.name, /^仮キャラクター/);
  for (const key of ['age', 'height', 'weight']) assert.ok(Number.isFinite(c[key]));
  assert.deepEqual(Object.keys(c.stats), ['STR', 'SPD', 'END', 'STK', 'GRP', 'SUB']);
  for (const value of Object.values(c.stats)) assert.ok(value >= 0 && value <= 100);
}
const original = JSON.stringify(characters);
ids['start-button'].click();
assert.equal(ids['title-screen'].hidden, true);
assert.equal(ids['hand-screen'].hidden, false);
assert.equal(ids['hand-title'].focused, true);
const cards = () => ids.hand.querySelectorAll('.card');
const assertHand = () => {
  assert.equal(cards().length, 4);
  assert.equal(new Set(cards().map(c => c.dataset.characterId)).size, 4);
  for (const card of cards()) {
    assert.equal(card.querySelector('.card-stats').children.length, 6);
    assert.match(card.querySelector('.card-profile').textContent, /歳 \/ \d+cm \/ \d+kg/);
    assert.equal(card.attributes['aria-pressed'], 'false');
  }
};
assertHand();
cards()[0].click();
assert.equal(cards()[0].attributes['aria-pressed'], 'true');
cards()[1].click();
assert.equal(cards()[0].attributes['aria-pressed'], 'false');
assert.equal(cards()[1].attributes['aria-pressed'], 'true');
cards()[1].click();
assert.equal(cards()[1].attributes['aria-pressed'], 'false');
cards()[2].click();
ids['redeal-button'].click();
assertHand();
for (let n = 0; n < 1000; n++) { ids['redeal-button'].click(); assertHand(); }
// 乱数の両端でも配列外参照や重複がないことを検証。
for (const value of [0, 0.9999999999999999]) {
  context.Math.random = () => value;
  ids['redeal-button'].click(); assertHand();
}
assert.equal(JSON.stringify(characters), original);
console.log('PASS: 仮データ30人、画面切替、4枚の表示、1000回の重複なし配布、選択・解除・切替、再配布の選択リセット、データ非破壊');
