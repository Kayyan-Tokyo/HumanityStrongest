// 開発時のみ使用するPlaywrightによる表示回帰テスト。ゲーム本体に依存は追加しない。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scriptTags = [...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)];
assert.equal(scriptTags.length, 3);
// 過去の無版番号URLとは別のキャッシュキーで全スクリプトを読み込む。
const versions = scriptTags.map(([, src]) => new URL(src, 'https://test.invalid/').searchParams.get('v'));
assert.ok(versions.every(Boolean));
assert.equal(new Set(versions).size, 1);
// ネットワークもサーバーも使わず、実際のファイルを記載順にブラウザへ読み込む。
const withScripts = html.replace(/<script src="([^"]+)" defer><\/script>/g, (_, src) => {
  const file = src.split('?')[0];
  return '<script>' + fs.readFileSync(path.join(root, file), 'utf8') + '</script>';
});

(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
    args: ['--no-sandbox', '--disable-crashpad-for-testing']});
  try {
    for (const width of [320, 375, 390, 430, 768, 1280]) {
      const context = await browser.newContext({viewport: {width, height: 812}, isMobile: width < 768, hasTouch: width < 768});
      const page = await context.newPage();
      page.setDefaultTimeout(5000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setContent(withScripts);
      // 表示検証では長い名前の4人を確実に配る。抽選のランダム性はdeal.test.cjsで検証する。
      await page.evaluate(() => {
        const ranked = [...window.CHARACTERS].sort((a,b) => b.name.length - a.name.length);
        let deals = 0;
        window.HumanityMatch.deal = () => {
          const swap = deals++ % 2 === 1;
          const playerHand = swap ? ranked.slice(4,8) : ranked.slice(0,4);
          const cpuHand = swap ? ranked.slice(0,4) : ranked.slice(4,8);
          return {playerHand,cpuHand,cpuCard:cpuHand[0]};
        };
      });
      await page.getByRole('button', {name: 'ゲーム開始', exact: true}).click();
      assert.doesNotMatch(await page.locator('#hand-screen').innerText(), /あなたのカードを選ぶと左側に表示されます。|カードを1枚選んでください。能力値は非公開です。|キャラクターデータ v1/);
      assert.equal(await page.getByRole('heading', {name:'あなたの手札',exact:true}).count(), 1);
      assert.equal(await page.locator('#fight-button').isDisabled(), true);
      await page.locator('#fight-button').evaluate(button => button.dispatchEvent(new MouseEvent('click',{bubbles:true})));
      assert.equal(await page.locator('#cpu-fighter .card-back').count(), 1);
      const emptyStatus = await page.locator('#battle-status').boundingBox();
      assert.equal(emptyStatus.height, 0);
      const measure = await page.evaluate(() => {
        const backs = [...document.querySelectorAll('#cpu-hand .card')].map(el => {
          const r = el.getBoundingClientRect();
          return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};
        });
        const player = [...document.querySelectorAll('#hand .card')].map(el => {
          const r = el.getBoundingClientRect(); return {x:r.x,y:r.y,right:r.right,width:r.width,height:r.height};
        });
        return {backs,player,overflow:document.documentElement.scrollWidth > innerWidth,
          statsVisible:/STR|SPD|END|STK|GRP|SUB/.test(document.querySelector('#hand-screen').innerText),
          contentFits:[...document.querySelectorAll('#hand .card-name, #hand .card-profile, #hand .selection-label, #cpu-hand .card-name, #cpu-hand .card-profile')].every(el => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight + 1),
          handFits:['#hand','#cpu-hand'].every(selector => {const el=document.querySelector(selector);return el.scrollWidth <= el.clientWidth;}),
          profileCount:document.querySelectorAll('#hand .card-profile').length,
          columns:getComputedStyle(document.querySelector('#hand')).gridTemplateColumns.split(' ').length,
          statsRetained:window.CHARACTERS.every(c => Object.keys(c.stats).length === 6)};
      });
      assert.equal(measure.backs.length, 4);
      assert.ok(measure.backs.every(r => r.width > 0 && r.height >= 96 && r.x >= 0 && r.right <= width && r.y >= 0 && r.bottom <= 812));
      assert.ok(measure.backs.every(r => Math.abs(r.y - measure.backs[0].y) < 1));
      assert.equal(measure.overflow, false);
      assert.equal(measure.statsVisible, false);
      assert.equal(measure.profileCount, 4);
      assert.equal(measure.columns, 4);
      assert.equal(measure.handFits, true);
      assert.equal(measure.contentFits, true);
      assert.ok(measure.player.every(r => Math.abs(r.y - measure.player[0].y) < 1));
      assert.ok(measure.player.every(r => r.width >= 44 && r.height >= 44 && r.x >= 0 && r.right <= width));
      const cardsMatchData = await page.locator('#hand .card').evaluateAll(cards => cards.every(card => {
        const character = window.CHARACTERS.find(c => c.id === card.dataset.characterId);
        return card.querySelector('.card-name').textContent === character.name &&
          card.querySelector('.card-profile').textContent === `${character.age}歳 / ${character.height}cm / ${character.weight}kg`;
      }));
      assert.equal(cardsMatchData, true);
      const cpuProfiles = await page.locator('#cpu-hand .card').evaluateAll(cards => cards.every(card => {
        const character = window.CHARACTERS.find(c => c.name === card.querySelector('.card-name').textContent);
        return character && card.querySelector('.card-profile').textContent === `${character.age}歳 / ${character.height}cm / ${character.weight}kg` &&
          card.children.length === 2 && card.tagName === 'ARTICLE' && Object.keys(card.dataset).length === 0 && !card.hasAttribute('aria-pressed');
      }));
      assert.equal(cpuProfiles, true);
      assert.equal(await page.locator('#cpu-hand button, #cpu-hand .card-back').count(), 0);
      assert.equal(await page.locator('#cpu-fighter .card-name').count(), 0);
      assert.equal(measure.statsRetained, true);
      const handIds = await page.locator('#hand .card').evaluateAll(cards => cards.map(c => c.dataset.characterId));
      const sides = await page.evaluate(() => {
        const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}; };
        return {player:rect('#player-fighter'),cpu:rect('#cpu-fighter'),vs:rect('.battle-arena > .vs'),
          topHand:rect('#cpu-hand'),arena:rect('.battle-arena'),bottomHand:rect('#hand'),
          direction:[document.querySelector('.battle-side--player').dataset.attackDirection,document.querySelector('.battle-side--cpu').dataset.attackDirection]};
      });
      assert.ok(sides.cpu.bottom <= sides.vs.top && sides.vs.bottom <= sides.player.top);
      assert.ok(Math.abs((sides.player.left+sides.player.right)/2 - (sides.cpu.left+sides.cpu.right)/2) < 1);
      assert.ok(sides.topHand.bottom <= sides.arena.top && sides.arena.bottom <= sides.bottomHand.top);
      const compactSpacing = await page.evaluate(() => {
        const battle = document.querySelector('#battle-area').getBoundingClientRect();
        const handHeading = document.querySelector('#hand-screen > h3').getBoundingClientRect();
        const cards = document.querySelector('#hand').getBoundingClientRect();
        return {afterBattle:handHeading.top-battle.bottom,beforeCards:cards.top-handHeading.bottom};
      });
      assert.ok(compactSpacing.afterBattle <= 16 && compactSpacing.beforeCards <= 12);
      assert.deepEqual(sides.direction, ['up','down']);
      await page.locator('#hand .card').first().click();
      const playerName = await page.locator('#hand .card').first().locator('.card-name').textContent();
      assert.equal(await page.locator('#player-fighter .card-name').textContent(), playerName);
      assert.equal(await page.getByRole('button', {name:'バトル開始',exact:true}).count(), 0);
      assert.equal(await page.locator('#cpu-fighter .card-back').count(), 1);
      const fight = page.getByRole('button', {name:'このキャラで戦う',exact:true});
      if (width < 768) await fight.tap(); else await fight.click();
      assert.equal(await fight.isDisabled(), true);
      const duplicateRejected = await page.evaluate(() => {
        const front = document.querySelector('#cpu-fighter').firstElementChild;
        const button = document.querySelector('#fight-button');
        for(let n=0;n<10;n++) button.dispatchEvent(new MouseEvent('click',{bubbles:true}));
        return document.querySelector('#cpu-fighter').firstElementChild === front;
      });
      assert.equal(duplicateRejected,true);
      assert.equal(await page.locator('#cpu-hand .card:visible').count(), 4);
      assert.equal(await page.locator('#hand .card:visible').count(), 4);
      assert.equal(await page.locator('#hand .card:disabled').count(), 4);
      const cpuName = await page.locator('#cpu-fighter .card-name').textContent();
      assert.ok(cpuName);
      const revealedSides = await page.evaluate(() => {
        const player=document.querySelector('#player-fighter').getBoundingClientRect();
        const cpu=document.querySelector('#cpu-fighter').getBoundingClientRect();
        const vs=document.querySelector('.battle-arena > .vs').getBoundingClientRect();
        return {vertical:cpu.bottom <= vs.top && vs.bottom <= player.top,centered:Math.abs((player.left+player.right)/2-(cpu.left+cpu.right)/2)<1,overflow:document.documentElement.scrollWidth>innerWidth};
      });
      assert.deepEqual(revealedSides,{vertical:true,centered:true,overflow:false});
      if (process.env.SCREENSHOT_DIR && width === 375) {
        await page.locator('#cpu-fighter .fighter-card').evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
        fs.mkdirSync(process.env.SCREENSHOT_DIR, {recursive:true});
        await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR, 'mobile-battle.png'),fullPage:true});
      }
      assert.doesNotMatch(await page.locator('#battle-area').innerText(), /STR|SPD|END|STK|GRP|SUB/);
      await page.getByRole('button', {name:'手札に戻る',exact:true}).click();
      assert.deepEqual(await page.locator('#hand .card').evaluateAll(cards => cards.map(c => c.dataset.characterId)), handIds);
      assert.equal(await page.locator('#hand .card[aria-pressed="true"]').count(), 1);
      await page.getByRole('button', {name:'このキャラで戦う',exact:true}).click();
      assert.equal(await page.locator('#cpu-fighter .card-name').textContent(), cpuName);
      await page.getByRole('button', {name:'手札に戻る',exact:true}).click();
      // 旧描画が能力値DOMを追加しても、見た目とアクセシビリティから除かれる。
      await page.evaluate(() => {
        const legacy = document.createElement('span');
        legacy.className = 'card-stats'; legacy.textContent = 'STR 99 SPD 99 END 99 STK 99 GRP 99 SUB 99';
        document.querySelector('#hand .card').append(legacy);
        document.querySelector('#cpu-hand .card').append(legacy.cloneNode(true));
      });
      assert.equal(await page.locator('#hand .card-stats').isVisible(), false);
      assert.equal(await page.locator('#cpu-hand .card-stats').isVisible(), false);
      assert.doesNotMatch(await page.locator('#cpu-hand').ariaSnapshot(), /STR|SPD|END|STK|GRP|SUB/);
      assert.doesNotMatch(await page.locator('#hand').innerText(), /STR|SPD|END|STK|GRP|SUB/);
      assert.doesNotMatch(await page.locator('#hand').ariaSnapshot(), /STR|SPD|END|STK|GRP|SUB/);
      await page.getByRole('button', {name:'配り直す',exact:true}).click();
      const cpuFitsAfterRedeal = await page.locator('#cpu-hand .card').evaluateAll(cards => cards.every(card => {
        const r = card.getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth && Math.abs(r.top-cards[0].getBoundingClientRect().top)<1 &&
          [...card.children].every(child => child.scrollWidth <= child.clientWidth && child.scrollHeight <= child.clientHeight+1);
      }));
      assert.equal(cpuFitsAfterRedeal,true);
      assert.equal(await page.locator('#cpu-fighter .card-name').count(),0);
      assert.equal(await page.locator('#cpu-fighter .card-back').count(),1);
      assert.equal(await page.locator('#cpu-hand .card:visible').count(), 4);
      assert.equal(await page.locator('#hand .card[aria-pressed="true"]').count(), 0);
      assert.equal(await page.locator('#battle-status').textContent(), '');
      assert.equal((await page.locator('#battle-status').boundingBox()).height, 0);
      if (process.env.SCREENSHOT_DIR && width === 375) {
        fs.mkdirSync(process.env.SCREENSHOT_DIR, {recursive:true});
        await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR, 'mobile-hand.png'),fullPage:true});
      }
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: CPU表向き横4枚・出場者は開始時公開、プレイヤー手札横4枚・長い名前も収まる、CPU上/VS/PLAYER下、能力値非表示、1回タップ公開/多重実行防止/戻る/再配布`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
