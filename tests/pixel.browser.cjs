const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {open,configure,idle}=require('./helpers/browser.cjs');
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-crashpad-for-testing']});
  try{
    for(const width of (process.env.WIDTHS||'375,390,430,1280').split(',').map(Number)){
      const context=await browser.newContext({viewport:{width,height:812},hasTouch:width<768,isMobile:width<768}),page=await context.newPage(),errors=[];
      page.setDefaultTimeout(22000);page.on('pageerror',e=>errors.push(e.message));await open(page);await configure(page);
      await page.evaluate(()=>{
        const deal=HumanityMatch.deal,create=HumanityPixelBattle.createRenderer;
        window.__reverse=false;window.__fallback=false;window.__scenes=[];
        HumanityMatch.deal=chars=>{
          const m=deal(chars),find=id=>chars.find(c=>c.id===id);
          m.playerHand=[find(__fallback?'hacker':__reverse?'sumo':'spartan'),find('nakameguro-barber')];
          m.cpuHand=[find(__fallback?'neanderthal':__reverse?'spartan':'sumo')];m.cpuCard=m.cpuHand[0];return m;
        };
        HumanityPixelBattle.createRenderer=options=>{
          const renderer=create(options),play=renderer.play;
          renderer.play=(canvas,options)=>play(canvas,{...options,onScene(scene){__scenes.push(scene);options.onScene?.(scene);}});return renderer;
        };
      });
      await page.selectOption('#battle-mode','pixel');await page.getByRole('button',{name:'ゲーム開始',exact:true}).click();
      for(let n=0;n<3;n++){
        if(n){
          await page.evaluate(n=>{__reverse=n===1;__fallback=n===2;__winner=n===1?'cpu':'player';},n);
          await page.getByRole('button',{name:'次の対戦',exact:true}).click();
        }
        assert.equal(await page.locator('#cpu-hand .card:visible').count(),1);assert.equal(await page.locator('#hand .card:visible').count(),2);
        assert.equal(await page.locator('#cpu-fighter .card-name').count(),1);assert.equal(await page.locator('#pixel-canvas').isVisible(),false);
        await page.selectOption('#pixel-speed',n===2?'2':'1');
        await page.locator('#hand .card:not(:disabled)').first().evaluate(el=>{el.click();for(let i=0;i<8;i++)el.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
        await page.waitForFunction(()=>document.querySelector('#hand-screen').dataset.phase==='pixel-battle');const started=Date.now();
        assert.equal(await page.locator('#round-result').isVisible(),false);assert.equal(await page.locator('#battle-mode').isDisabled(),true);
        assert.equal(await page.locator('#pixel-speed').isEnabled(),true);assert.equal(await page.locator('#hand .card:not(:disabled)').count(),0);
        assert.equal(await page.locator('#next-match-button').isVisible(),false);
        assert.equal(await page.locator('#cpu-fighter').isVisible(),false);assert.equal(await page.locator('#player-fighter').isVisible(),false);
        const geometry=await page.locator('#pixel-canvas').evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,right:r.right,width:r.width,height:r.height,overflow:document.documentElement.scrollWidth>innerWidth};});
        assert.ok(geometry.x>=0&&geometry.right<=width&&geometry.width>300&&geometry.height>180);assert.equal(geometry.overflow,false);
        if(n===2)await page.getByRole('button',{name:'演出をスキップ'}).click();
        else{
          if(n===1){await page.waitForTimeout(800);await page.selectOption('#pixel-speed','2');}
          await page.waitForFunction(()=>document.querySelector('#pixel-canvas').dataset.scene==='exchange');
          await page.waitForFunction(()=>document.querySelector('#pixel-canvas').dataset.scene==='victory');
          assert.equal(await page.locator('#round-result').isVisible(),false);
        }
        await idle(page);
        if(n<2)assert.ok(Date.now()-started>=(n===0?9000:4400),'指定速度より早く結果を出さない');
        const result=await page.evaluate(()=>{
          const r=__match.rounds[0],canvas=document.querySelector('#pixel-canvas');
          return {player:r.playerCard.id,cpu:r.cpuCard.id,shownPlayer:canvas.dataset.playerCharacterId,shownCpu:canvas.dataset.cpuCharacterId,winner:r.winner,shownWinner:canvas.dataset.winner,
            playerFallback:canvas.dataset.playerFallback,cpuFallback:canvas.dataset.cpuFallback,story:r.story.body,finish:r.story.finish};
        });
        assert.equal(result.player,result.shownPlayer);assert.equal(result.cpu,result.shownCpu);assert.equal(result.winner,result.shownWinner);
        assert.equal(result.playerFallback,n===2?'true':'false');assert.equal(result.cpuFallback,n===2?'true':'false');
        assert.equal(await page.locator('#result-reason').textContent(),result.story);assert.equal(await page.locator('#result-finish').textContent(),`決まり手：${result.finish}`);
        assert.equal(await page.locator('#result-stats tr').count(),6);assert.equal(await page.evaluate(()=>__draws),n+1);assert.equal(await page.evaluate(()=>__stories),n+1);
        assert.equal(await page.evaluate(()=>__match.rounds.length),1);assert.equal(await page.evaluate(()=>__match.phase),'finished');
        assert.equal(await page.locator('#current-streak').textContent(),n===1?'0':'1');assert.equal(await page.locator('#best-streak').textContent(),'1');
        await page.selectOption('#battle-mode','card');assert.equal(await page.locator('#pixel-canvas').isVisible(),false);
        await page.selectOption('#battle-mode','pixel');await page.waitForFunction(()=>!document.querySelector('#pixel-canvas').hidden);
        assert.equal(await page.locator('#pixel-canvas').getAttribute('data-player-character-id'),result.player);
        assert.equal(await page.evaluate(()=>__draws),n+1);assert.equal(await page.locator('#current-streak').textContent(),n===1?'0':'1');
      }
      await page.getByRole('button',{name:'次の対戦',exact:true}).click();await page.locator('#hand .card:not(:disabled)').first().click();
      await page.waitForFunction(()=>document.querySelector('#hand-screen').dataset.phase==='pixel-battle');
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
      await idle(page);assert.equal(await page.locator('#round-result').isVisible(),true);assert.equal(await page.evaluate(()=>__draws),4);
      assert.ok(await page.evaluate(()=>__scenes.some(s=>s.phase==='entry')&&__scenes.some(s=>s.phase==='exchange')&&__scenes.some(s=>s.phase==='fall')));
      assert.deepEqual(errors,[]);await context.close();
      console.log(`PASS ${width}px: CPU公開1/候補2・単発対戦×4・両配役/ID連携・1倍10秒/途中2倍・スキップ/非表示・勝敗/保存結果/連勝・再表示で加算なし`);
    }
    // Identical random input yields identical decisions, stories, and streaks in either mode.
    const transcripts=[];
    for(const mode of ['card','pixel']){
      const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();await open(page);
      await page.evaluate(()=>{
        let seed=12345;window.__calls=0;window.__trace=[];
        Math.random=()=>{__calls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
        const deal=HumanityMatch.deal,play=HumanityMatch.playRound;
        HumanityMatch.deal=chars=>window.__match=deal(chars);
        HumanityMatch.playRound=(...args)=>{const result=play(...args);__trace.push(result);return result;};
      });
      await page.selectOption('#battle-mode',mode);await page.getByRole('button',{name:'ゲーム開始',exact:true}).click();
      for(let i=0;i<3;i++){
        await page.locator('#hand .card:not(:disabled)').nth(i%2).click();await idle(page);
        if(i<2)await page.getByRole('button',{name:'次の対戦',exact:true}).click();
      }
      transcripts.push(await page.evaluate(()=>({results:JSON.stringify(__trace),calls:__calls,current:document.querySelector('#current-streak').textContent,best:localStorage.getItem(HumanityStreak.STORAGE_KEY)})));
      await context.close();
    }
    assert.deepEqual(transcripts[0],transcripts[1]);
    console.log('PASS: 同じ乱数列で両モードの全カード・勝率・勝敗・保存ストーリー・乱数呼出回数・連勝記録が一致');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
