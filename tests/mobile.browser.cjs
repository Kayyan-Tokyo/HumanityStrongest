const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {open,reloadFixture,configure,idle}=require('./helpers/browser.cjs');
const html=fs.readFileSync('index.html','utf8'),tags=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)];
assert.equal(tags.length,9);assert.equal(new Set(tags.map(([,src])=>src.split('?v=')[1])).size,1);
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-crashpad-for-testing']});
  try{
    for(const width of (process.env.WIDTHS||'375,390,430,1280').split(',').map(Number)){
      const context=await browser.newContext({viewport:{width,height:812},hasTouch:width<768,isMobile:width<768,reducedMotion:width===375?'no-preference':'reduce'});
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
      await open(page);await configure(page);
      assert.equal(await page.locator('#current-streak').textContent(),'0');assert.equal(await page.locator('#best-streak').textContent(),'0');
      assert.equal(await page.locator('#fight-button,#confirm-button,#return-button,#redeal-button').count(),0);
      const animateLog=()=>page.evaluate(()=>{
        window.__animations=[];const original=Element.prototype.animate;
        Element.prototype.animate=function(frames,options){__animations.push({id:this.id,duration:options.duration});return original.call(this,frames,options);};
      });
      await animateLog();
      await page.getByRole('button',{name:'ゲーム開始',exact:true}).click();await idle(page);
      for(let n=0;n<5;n++){
        const winner=['player','player','cpu','player','draw'][n];
        await page.evaluate(winner=>{__winner=winner;},winner);
        assert.equal(await page.locator('#cpu-hand .card:visible').count(),1);assert.equal(await page.locator('#hand .card:visible').count(),2);
        assert.equal(await page.locator('#next-match-button').isVisible(),false);
        const geometry=await page.evaluate(()=>{
          const cpu=document.querySelector('#cpu-hand .card').getBoundingClientRect(),players=[...document.querySelectorAll('#hand .card')].map(el=>el.getBoundingClientRect());
          return {overflow:document.documentElement.scrollWidth>innerWidth,cpuCentered:Math.abs(cpu.x+cpu.width/2-innerWidth/2)<12,
            playersAligned:Math.abs(players[0].top-players[1].top)<1,profiles:[...document.querySelectorAll('#hand .card,#cpu-hand .card')].every(el=>{
              const r=el.getBoundingClientRect(),name=el.querySelector('.card-name'),profile=el.querySelector('.card-profile');
              return r.width>=90&&r.height>=56&&r.left>=0&&r.right<=innerWidth&&name.scrollWidth<=name.clientWidth&&/歳/.test(profile.textContent)&&/cm/.test(profile.textContent)&&/kg/.test(profile.textContent);
            }),ids:new Set([...document.querySelectorAll('#hand .card,#cpu-hand .card')].map(el=>el.dataset.characterId)).size,
            cpuName:document.querySelector('#cpu-fighter .card-name').textContent,expectedCpu:__match.cpuCard.name,
            noStats:[...document.querySelectorAll('#hand,#cpu-hand,#cpu-fighter,#player-fighter')].every(el=>!/(STR|SPD|END|STK|GRP|SUB)/.test(el.textContent))};
        });
        assert.equal(geometry.overflow,false);assert.equal(geometry.cpuCentered,true);assert.equal(geometry.playersAligned,true);assert.equal(geometry.profiles,true);
        assert.equal(geometry.ids,3);assert.equal(geometry.cpuName,geometry.expectedCpu);assert.equal(geometry.noStats,true);
        if(process.env.SCREENSHOT_DIR&&n===0){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`single-match-${width}.png`),fullPage:true});}
        const card=page.locator('#hand .card:not(:disabled)').nth(n%2),picked=await card.getAttribute('data-character-id');
        await card.evaluate(el=>{el.click();for(let i=0;i<10;i++)for(const c of document.querySelectorAll('#hand .card'))c.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
        if(width===375&&n===0){
          await page.waitForFunction(()=>document.querySelector('#hand-screen').dataset.phase==='burning');
          assert.equal(await page.locator('#round-result').isVisible(),false);
          const top=()=>page.locator('#cpu-fighter').evaluate(el=>parseFloat(getComputedStyle(el).clipPath.match(/inset\(([^%]+)/)[1]));
          const before=await top();await page.waitForTimeout(180);assert.ok(await top()>before);
        }
        await idle(page);
        assert.equal(await page.evaluate(()=>__draws),n+1);
        assert.equal(await page.evaluate(()=>__stories),n===4?4:n+1);
        assert.equal(await page.evaluate(()=>__match.rounds.length),1);assert.equal(await page.evaluate(()=>__match.phase),'finished');
        assert.equal(await page.evaluate(()=>__match.rounds[0].playerCard.id),picked);
        assert.equal(await page.locator('#current-streak').textContent(),String([1,2,0,1,1][n]));
        assert.equal(await page.locator('#best-streak').textContent(),n===0?'1':'2');
        assert.equal(await page.locator('#result-title').textContent(),winner==='player'?'勝利':winner==='cpu'?'敗北':'引き分け');
        assert.equal(await page.locator('#result-stats tr').count(),6);
        const saved=await page.evaluate(()=>{const r=__match.rounds[0];return {body:r.story.body,finish:r.story.finish,probability:`対戦前の勝率：あなた ${r.decision.playerWinPercent}% ／ CPU ${100-r.decision.playerWinPercent}%`};});
        assert.equal(await page.locator('#result-reason').textContent(),saved.body);assert.equal(await page.locator('#result-finish').textContent(),`決まり手：${saved.finish}`);
        assert.equal(await page.locator('#result-probability').textContent(),saved.probability);
        if(winner!=='draw')assert.equal(await page.locator('#'+(winner==='player'?'cpu-fighter':'player-fighter')).evaluate(el=>getComputedStyle(el).visibility),'hidden');
        else assert.equal(await page.locator('#win-banner').isVisible(),false);
        await page.selectOption('#battle-mode','pixel');await page.selectOption('#battle-mode','card');
        assert.equal(await page.locator('#current-streak').textContent(),String([1,2,0,1,1][n]));
        assert.equal(await page.evaluate(()=>__draws),n+1);
        await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
        assert.ok(await page.locator('.streak-bar').evaluate(el=>Math.abs(el.getBoundingClientRect().top)<1));
        if(n<4){
          const deals=await page.evaluate(()=>__deals);
          await page.locator('#next-match-button').evaluate(el=>{el.click();el.dispatchEvent(new MouseEvent('click',{bubbles:true}));});await idle(page);
          assert.equal(await page.evaluate(()=>__deals),deals+1);assert.equal(await page.locator('#round-result').isVisible(),false);
          assert.equal(await page.evaluate(()=>scrollY),0);
        }
        if(n===0)await page.emulateMedia({reducedMotion:'reduce'});
      }
      assert.equal(await page.evaluate(()=>localStorage.getItem(HumanityStreak.STORAGE_KEY)),'2');
      const restored=await reloadFixture(page);assert.equal(await restored.locator('#best-streak').textContent(),'2');assert.equal(await restored.locator('#current-streak').textContent(),'0');
      assert.equal(await restored.locator('#title-screen').isVisible(),true);assert.deepEqual(errors,[]);
      console.log(`PASS ${width}px: CPU公開1/候補2横並び・長い名前/横スクロールなし・1タップ/連打防止・1試合/次の対戦・勝率/理由・勝/負/引き分け・連勝/最高記録/保存データ復元・固定ヘッダー`);
      await context.close();
    }
    // Milestones: play quick matches, then observe the real fifth-win celebration animation.
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();
    await open(page);await configure(page);await page.evaluate(()=>{
      const animate=Element.prototype.animate;window.__celebrations=[];
      Element.prototype.animate=function(frames,options){if(this.id==='streak-notice')__celebrations.push(options.duration);return animate.call(this,frames,options);};
    });
    await page.getByRole('button',{name:'ゲーム開始',exact:true}).click();
    for(let n=1;n<=20;n++){
      if(n===5)await page.emulateMedia({reducedMotion:'no-preference'});
      await page.locator('#hand .card:not(:disabled)').first().click();
      if(n===5){
        await page.waitForFunction(()=>document.querySelector('#hand-screen').dataset.phase==='streak');
        assert.equal(await page.locator('#current-streak').textContent(),'5');
        assert.equal(await page.locator('#next-match-button').isVisible(),false);
        assert.ok(await page.locator('#streak-notice').evaluate(el=>el.getAnimations().length>0));
      }
      await idle(page);
      assert.equal(await page.locator('#current-streak').textContent(),String(n));
      const milestone=await page.locator('#streak-notice').getAttribute('data-milestone');
      assert.equal(milestone,[5,10,20].includes(n)?String(n):'');
      if([5,10,20].includes(n))assert.ok((await page.locator('#streak-notice').textContent()).includes(`${n}連勝`));
      if(n===5)await page.emulateMedia({reducedMotion:'reduce'});
      if(n<20)await page.getByRole('button',{name:'次の対戦',exact:true}).click();
    }
    assert.ok((await page.evaluate(()=>__celebrations)).includes(750));
    const restored=await reloadFixture(page);assert.equal(await restored.locator('#best-streak').textContent(),'20');await context.close();
    // Storage can be denied, corrupted, or full without blocking a match.
    for(const mode of ['denied','corrupt','full']){
      const c=await browser.newContext({reducedMotion:'reduce'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
      await open(p,{storageMode:mode});await configure(p);assert.equal(await p.locator('#best-streak').textContent(),'0');
      await p.getByRole('button',{name:'ゲーム開始',exact:true}).click();await p.locator('#hand .card:not(:disabled)').first().click();await idle(p);
      assert.equal(await p.locator('#current-streak').textContent(),'1');assert.equal(await p.locator('#next-match-button').isEnabled(),true);assert.deepEqual(errors,[]);await c.close();
    }
    console.log('PASS: 5/10/20連勝の特別表示・5連勝時の実アニメーション・保存データ復元で最高20維持・保存拒否/不正値/容量超過でも対戦継続');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
