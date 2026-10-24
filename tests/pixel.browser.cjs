const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..'), html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const content = html.replace("url('./assets/backgrounds/colosseum.webp')", () => "url('data:image/webp;base64," + fs.readFileSync(path.join(root, 'assets/backgrounds/colosseum.webp')).toString('base64') + "')")
  .replace("url('./assets/backgrounds/colosseum_side.webp')", () => "url('data:image/webp;base64," + fs.readFileSync(path.join(root, 'assets/backgrounds/colosseum_side.webp')).toString('base64') + "')")
  .replace(/<script src="([^"]+)" defer><\/script>/g, (_, src) => '<script>' + fs.readFileSync(path.join(root, src.split('?')[0]), 'utf8').replace(/\.\/assets\/characters\/(spartan_idle|sumo_idle)\.png/g, (_, name) => 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'assets/characters', name + '.png')).toString('base64')) + '</script>');

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-crashpad-for-testing'] });
  try {
    for (const width of (process.env.WIDTHS || '375,390,430,1280').split(',').map(Number)) {
      const context = await browser.newContext({ viewport: { width, height: 812 }, isMobile: width < 768, hasTouch: width < 768 });
      const page = await context.newPage(), errors = []; page.setDefaultTimeout(20000);
      page.on('pageerror', e => errors.push(e.message));
      await page.setContent(content);
      await page.evaluate(() => {
        const deal = HumanityMatch.deal, resolve = HumanityBattle.resolveRound, story = HumanityStory.generateStory;
        const play = HumanityPixelBattle.play;
        window.__first = 'player'; window.__draws = 0; window.__stories = 0; window.__scenes = [];
        HumanityMatch.deal = chars => window.__match = deal([...chars].sort((a, b) => b.name.length - a.name.length), () => __first === 'player' ? 0 : .999999);
        HumanityBattle.resolveRound = (p, c) => resolve(p, c, () => [0, .999999, 0][window.__draws++]);
        HumanityStory.generateStory = result => { window.__stories++; return story(result); };
        HumanityPixelBattle.play = (canvas, options) => play(canvas, { ...options, onScene(scene) { window.__scenes.push(scene); options.onScene?.(scene); } });
      });
      const idle = () => page.waitForFunction(() => document.querySelector('#hand-screen').getAttribute('aria-busy') !== 'true');
      for (const first of ['player', 'cpu']) {
        await page.evaluate(first => { window.__first = first; window.__draws = 0; window.__stories = 0; window.__scenes = []; }, first);
        await page.selectOption('#battle-mode', 'pixel');
        await page.getByRole('button', { name: first === 'player' ? 'ゲーム開始' : '新しい試合', exact: true }).click();
        await idle();
        for (let round = 1; round <= 3; round++) {
          await idle();
          assert.equal(await page.locator('#cpu-hand .card:visible').count(), 3);
          assert.equal(await page.locator('#hand .card:visible').count(), 3);
          const cpuFirst = await page.evaluate(() => __match.firstSide === 'cpu');
          assert.equal(await page.locator('#cpu-fighter .card-name').count(), cpuFirst ? 1 : 0);
          if (cpuFirst) assert.equal(await page.locator('#cpu-fighter').isVisible(), true);
          assert.equal(await page.locator('#pixel-canvas').isVisible(), false);
          const normal = width === 375 && first === 'player' && round === 1;
          await page.selectOption('#pixel-speed', normal || round === 2 ? '1' : '2');
          const button = page.locator('#hand .card:not(:disabled)').first(), selected = await button.getAttribute('data-character-id');
          await button.evaluate(el => { el.click(); for (let i = 0; i < 5; i++) el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
          await page.waitForFunction(() => document.querySelector('#hand-screen').dataset.phase === 'pixel-battle');
          const started = Date.now();
          assert.equal(await page.locator('#battle-mode').isDisabled(), true);
          assert.equal(await page.locator('#pixel-speed').isEnabled(), true);
          assert.equal(await page.locator('#player-fighter').isVisible(), false);
          assert.equal(await page.locator('#cpu-fighter').isVisible(), false);
          assert.equal(await page.locator('#round-result').isVisible(), false);
          assert.equal(await page.locator('#hand .card:not(:disabled)').count(), 0);
          const geometry = await page.locator('#pixel-canvas').evaluate(el => {
            const r = el.getBoundingClientRect();
            return { width: r.width, height: r.height, x: r.x, right: r.right, overflow: document.documentElement.scrollWidth > innerWidth };
          });
          assert.ok(geometry.width > 300 && geometry.height > 180 && geometry.x >= 0 && geometry.right <= width);
          assert.equal(geometry.overflow, false);
          if (round === 3) await page.getByRole('button', { name: '演出をスキップ' }).click();
          else {
            if (round === 2) { await page.waitForTimeout(800); await page.selectOption('#pixel-speed', '2'); }
            await page.waitForFunction(() => document.querySelector('#pixel-canvas').dataset.scene === 'exchange');
            if (process.env.SCREENSHOT_DIR && width === 375 && first === 'player' && round === 1) {
              fs.mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true });
              await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'pixel-exchange-375.png'), fullPage: true });
            }
            await page.waitForFunction(() => document.querySelector('#pixel-canvas').dataset.scene === 'victory');
            assert.equal(await page.locator('#round-result').isVisible(), false);
          }
          await idle();
          if (round === 1) assert.ok(Date.now() - started >= (normal ? 9000 : 4400), '指定速度より早く結果を出さない');
          assert.equal(await page.evaluate(() => __draws), round);
          assert.equal(await page.evaluate(() => __stories), round);
          const result = await page.evaluate(() => {
            const r = __match.rounds.at(-1);
            return { winner: r.winner, id: r.playerCard.id, story: r.story.body, finish: r.story.finish,
              chance: `対戦前の勝率：あなた ${r.decision.playerWinPercent}% ／ CPU ${100 - r.decision.playerWinPercent}%` };
          });
          assert.equal(result.id, selected);
          assert.equal(await page.locator('#pixel-canvas').getAttribute('data-winner'), result.winner);
          assert.equal(await page.locator('#pixel-canvas').getAttribute('data-' + result.winner + '-pose'), 'victory');
          assert.equal(await page.locator('#pixel-canvas').getAttribute('data-' + (result.winner === 'player' ? 'cpu' : 'player') + '-pose'), 'defeated');
          assert.equal(await page.locator('#result-reason').textContent(), result.story);
          assert.equal(await page.locator('#result-finish').textContent(), `決まり手：${result.finish}`);
          assert.equal(await page.locator('#result-probability').textContent(), result.chance);
          assert.equal(await page.locator('#result-stats tr').count(), 6);
          assert.equal(await page.locator('#hand .used').count(), round);
          assert.equal(await page.locator('#cpu-hand .used').count(), round);
          if (round === 1) {
            await page.selectOption('#battle-mode', 'card'); assert.equal(await page.locator('#pixel-canvas').isVisible(), false);
            await page.selectOption('#battle-mode', 'pixel'); assert.equal(await page.locator('#pixel-canvas').getAttribute('data-winner'), result.winner);
            assert.equal(await page.evaluate(() => __draws), round); assert.equal(await page.evaluate(() => __stories), round);
          }
          if (round < 3) await page.getByRole('button', { name: '次のラウンドへ' }).click();
        }
        assert.equal(await page.evaluate(() => __match.phase), 'finished');
        assert.equal(await page.evaluate(() => __match.playerWins), 2);
        const scenes = await page.evaluate(() => __scenes);
        assert.ok(scenes.some(s => s.phase === 'entry') && scenes.some(s => s.phase === 'approach'));
        assert.ok(scenes.every(s => ['cpu', 'player'].every(side => s[side].x >= 30 && s[side].x <= 290 && s[side].y === 212)));
      }
      // ページが非表示になっても、同じ確定結果に着地する。
      await page.evaluate(() => { window.__draws = 0; window.__stories = 0; });
      await page.getByRole('button', { name: '新しい試合', exact: true }).click(); await idle();
      await page.locator('#hand .card:not(:disabled)').first().evaluate(el => el.click());
      await page.waitForFunction(() => document.querySelector('#hand-screen').dataset.phase === 'pixel-battle');
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
      await idle(); assert.equal(await page.locator('#round-result').isVisible(), true);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: ドット絵モード・両先攻/3ラウンド・1/2倍速/途中変更・スキップ/非表示・敗者のみ転倒/WIN整合・手札/結果/物語保存・モード切替`);
      await context.close();
    }
    // 同じ乱数列でカード/ドット絵のゲーム結果を比較する（演出は短縮）。
    const transcripts = [];
    for (const mode of ['card', 'pixel']) {
      const context = await browser.newContext({ reducedMotion: 'reduce' }); const page = await context.newPage();
      await page.setContent(content);
      await page.evaluate(() => {
        let seed = 12345; window.__randomCalls = 0;
        Math.random = () => { window.__randomCalls++; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
        const deal = HumanityMatch.deal; HumanityMatch.deal = chars => window.__match = deal(chars);
      });
      await page.selectOption('#battle-mode', mode); await page.getByRole('button', { name: 'ゲーム開始', exact: true }).click();
      for (let i = 0; i < 3; i++) {
        await page.waitForFunction(() => document.querySelector('#hand-screen').getAttribute('aria-busy') !== 'true');
        await page.locator('#hand .card:not(:disabled)').first().click();
        await page.waitForFunction(() => document.querySelector('#hand-screen').getAttribute('aria-busy') !== 'true');
        if (await page.evaluate(() => __match.phase === 'finished')) break;
        await page.getByRole('button', { name: '次のラウンドへ' }).click();
      }
      transcripts.push(await page.evaluate(() => ({ rounds: JSON.stringify(__match.rounds), calls: __randomCalls, player: __match.playerWins, cpu: __match.cpuWins })));
      await context.close();
    }
    assert.deepEqual(transcripts[0], transcripts[1]);
    console.log('PASS: 同じ乱数列で両モードの全ラウンド・カード・勝率・勝敗・ストーリー・乱数呼出回数が完全一致');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
