const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const base = 'https://humanity.test/HumanityStrongest/';
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const assetURL = base + 'assets/backgrounds/colosseum.webp';
const asset = fs.readFileSync(path.join(root, 'assets/backgrounds/colosseum.webp'));
const assetData = 'data:image/webp;base64,' + asset.toString('base64');
assert.ok(html.includes("--arena-background-image: url('./assets/backgrounds/colosseum.webp')"));
const content = html.replace('<head>', `<head><base href="${base}">`)
  .replace("url('./assets/backgrounds/colosseum.webp')", `url('${assetData}')`)
  .replace(/<script src="([^"]+)" defer><\/script>/g,
    (_, src) => '<script>' + fs.readFileSync(path.join(root, src.split('?')[0]), 'utf8') + '</script>');
assert.equal(asset.toString('ascii', 0, 4), 'RIFF');
assert.equal(asset.toString('ascii', 8, 12), 'WEBP');

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-crashpad-for-testing'] });
  try {
    for (const width of [375, 390, 430, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 812 }, reducedMotion: 'reduce' });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      // 実行環境ではURLへのページ遷移/リクエストが制限されるため、実ファイルをインライン化。
      // Pagesの配信ではなく、プロジェクト配下の相対URL解決を検証する。
      await page.setContent(content);
      const dimensions = await page.evaluate(async url => {
        const image = new Image();
        image.src = url;
        await image.decode();
        return [image.naturalWidth, image.naturalHeight];
      }, assetData);
      assert.deepEqual(dimensions, [1280, 720]);
      await page.evaluate(() => {
        const deal = HumanityMatch.deal;
        HumanityMatch.deal = chars => deal([...chars].sort((a, b) => b.name.length - a.name.length), () => 0);
      });
      await page.getByRole('button', { name: 'ゲーム開始', exact: true }).click();
      const idle = () => page.waitForFunction(() => document.querySelector('#hand-screen').getAttribute('aria-busy') !== 'true');
      await idle();
      const geometry = () => page.evaluate(() => {
        const el = document.querySelector('#battle-arena'), r = el.getBoundingClientRect();
        const bg = getComputedStyle(el, '::before');
        return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height,
          inset: bg.inset, position: bg.position, size: bg.backgroundSize,
          image: bg.backgroundImage, center: bg.backgroundPosition, layer: bg.zIndex, pointer: bg.pointerEvents };
      });
      const initial = await geometry();
      assert.ok(initial.image.includes(assetData));
      assert.equal(initial.position, 'absolute');
      assert.equal(initial.inset, '0px');
      assert.equal(initial.layer, '-1');
      assert.equal(initial.pointer, 'none');
      assert.ok(initial.image.includes('0.6')); // 画像の上に60%の暗幕。
      assert.equal(await page.locator('#hand .card').count(), 3);
      assert.equal(await page.locator('#cpu-hand .card').count(), 3);
      assert.ok(await page.locator('#hand .card, #cpu-hand .card').evaluateAll(cards => cards.every(c => {
        const n = c.querySelector('.card-name'), p = c.querySelector('.card-profile');
        return n.scrollWidth <= n.clientWidth && /歳/.test(p.textContent) && /cm/.test(p.textContent) && /kg/.test(p.textContent)
          && ['rgb(33, 30, 48)', 'rgb(48, 40, 63)'].includes(getComputedStyle(c).backgroundColor);
      })));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (process.env.SCREENSHOT_DIR && [375, 1280].includes(width)) {
        fs.mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `colosseum-${width}.png`), fullPage: true });
      }
      await page.evaluate(() => {
        // 非表示の要素でURLを解決する。未提供のファイルへ実際にはアクセスしない。
        const probe = document.createElement('div');
        probe.hidden = true;
        probe.style.backgroundImage = "url('./assets/backgrounds/colosseum.webp')";
        document.body.append(probe);
        window.__resolvedBackgroundURL = getComputedStyle(probe).backgroundImage;
        probe.remove();
      });
      assert.equal(await page.evaluate(() => __resolvedBackgroundURL), `url("${assetURL}")`);
      const configured = await geometry();
      assert.ok(configured.image.includes(assetData));
      assert.ok(configured.size.split(', ').every(size => size === 'cover'));
      assert.ok(configured.center.split(', ').every(position => position === '50% 50%'));
      assert.deepEqual([configured.x, configured.y, configured.width, configured.height], [initial.x, initial.y, initial.width, initial.height]);
      await page.evaluate(() => scrollTo(0, 120));
      assert.deepEqual(await geometry(), configured); // 文書内の中心を保ち、viewportに固定しない。
      await page.locator('#hand .card:not(:disabled)').first().click();
      await idle();
      assert.equal(await page.locator('#round-result').isVisible(), true);
      const result = await geometry();
      await page.locator('#round-result').evaluate(el => { el.hidden = true; });
      assert.deepEqual(await geometry(), result);
      await page.locator('#round-result').evaluate(el => { el.hidden = false; });
      const beforeScroll = { ...result };
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      assert.deepEqual(await geometry(), beforeScroll);
      assert.equal(result.x, initial.x);
      assert.equal(result.width, initial.width);
      // 使用済みラベルで手札の高さが変わることは許容。物語の表示/非表示では変わらない。
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: 実WebP読込1280×720/相対パス・cover/暗幕・手札各3枚・長い名前・横はみ出しなし・スクロール/結果表示後の固定基準`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
