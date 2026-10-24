const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const tags=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)];assert.equal(tags.length,6);
assert.equal(new Set(tags.map(([,s])=>s.split('?v=')[1])).size,1);
const content=html.replace("url('./assets/backgrounds/colosseum.webp')",()=>"url('data:image/webp;base64,"+fs.readFileSync(path.join(root,'assets/backgrounds/colosseum.webp')).toString('base64')+"')")
 .replace(/<script src="([^"]+)" defer><\/script>/g,(_,src)=>'<script>'+fs.readFileSync(path.join(root,src.split('?')[0]),'utf8')+'</script>');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-crashpad-for-testing']});
 try{
 for(const width of (process.env.WIDTHS||'320,375,390,430,768,1280').split(',').map(Number)){
 const context=await browser.newContext({viewport:{width,height:812},isMobile:width<768,hasTouch:width<768,reducedMotion:process.env.REDUCED_MOTION?'reduce':'no-preference'});
 const page=await context.newPage();page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const idle=()=>page.waitForFunction(()=>document.querySelector('#hand-screen').getAttribute('aria-busy')!=='true');
 await page.setContent(content);
 await page.evaluate(()=>{
  const deal=HumanityMatch.deal,resolve=HumanityBattle.resolveRound,story=HumanityStory.generateStory,animate=Element.prototype.animate;
  document.addEventListener('click',event=>{if(event.target.closest('#hand .card'))window.__tapScroll=scrollY;},true);
  window.__resolve=resolve;window.__first='player';window.__draws=0;window.__stories=0;window.__animations=[];
  HumanityMatch.deal=chars=>window.__match=deal([...chars].sort((a,b)=>b.name.length-a.name.length),()=>window.__first==='player'?0:.999999);
  HumanityBattle.resolveRound=(p,c)=>resolve(p,c,()=>[0,.999999,0][window.__draws++]);
  HumanityStory.generateStory=r=>{window.__stories++;return story(r);};
  Element.prototype.animate=function(frames,options){window.__animations.push({id:this.id,frames,duration:options.duration});return animate.call(this,frames,options);};
 });
 for(const first of ['player','cpu']){
  await page.evaluate(first=>{window.__first=first;window.__draws=0;window.__stories=0;},first);
  await page.getByRole('button',{name:first==='player'?'ゲーム開始':'新しい試合',exact:true}).click();await idle();
  for(let round=1;round<=3;round++){
   await idle();assert.equal(await page.locator('#hand .card').count(),3);assert.equal(await page.locator('#cpu-hand .card').count(),3);
   const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,profiles:[...document.querySelectorAll('#hand .card,#cpu-hand .card')].every(c=>{
    const r=c.getBoundingClientRect(),name=c.querySelector('.card-name'),profile=c.querySelector('.card-profile');
    return r.width>=70&&r.height>=56&&r.left>=0&&r.right<=innerWidth&&name.scrollWidth<=name.clientWidth&&profile.textContent.includes('歳')&&profile.textContent.includes('cm')&&profile.textContent.includes('kg');
   })}));assert.equal(geometry.overflow,false);assert.equal(geometry.profiles,true);
   const side=await page.evaluate(()=>__match.firstSide);
   assert.equal(await page.locator('#cpu-fighter .card-name').count(),side==='cpu'?1:0);
   assert.equal(await page.locator('#fight-button,#confirm-button').count(),0);
   const card=page.locator('#hand .card:not(:disabled)').first();
   const picked=await card.getAttribute('data-character-id');
   if(round===3){if(width<768)await card.tap();else await card.click();}
   else await card.evaluate(el=>{
    el.click();for(let i=0;i<10;i++)for(const c of document.querySelectorAll('#hand .card'))c.dispatchEvent(new MouseEvent('click',{bubbles:true}));
   });
   if(!process.env.REDUCED_MOTION){
    await page.waitForFunction(()=>document.querySelector('#hand-screen').dataset.phase==='burning');
    assert.equal(await page.locator('#round-result').isVisible(),false);
    const winner=await page.evaluate(()=>__match.rounds.at(-1).winner),loserId=winner==='player'?'cpu-fighter':'player-fighter';
    const top=()=>page.locator('#'+loserId).evaluate(el=>parseFloat(getComputedStyle(el).clipPath.match(/inset\(([^%]+)/)[1]));
    const before=await top();await page.waitForTimeout(220);const after=await top();assert.ok(after>before&&after<100);
    assert.equal(await page.locator('#'+(winner==='player'?'player-fighter':'cpu-fighter')).evaluate(el=>getComputedStyle(el).clipPath),'none');
    assert.equal(await page.evaluate(()=>scrollY),await page.evaluate(()=>__tapScroll));
    if(process.env.SCREENSHOT_DIR&&width===375&&first==='player'&&round===1){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'burning.png')});}
    if(round===2)await page.getByRole('button',{name:'演出をスキップ'}).click();
    else {
      await page.waitForFunction(()=>document.querySelector('#hand-screen').dataset.phase==='win');
      assert.equal(await page.locator('#round-result').isVisible(),false);
      if(process.env.SCREENSHOT_DIR&&width===375&&first==='player'&&round===1)await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'win.png')});
    }
   }
   await idle();
   assert.equal(await page.evaluate(()=>__draws),round);assert.equal(await page.evaluate(()=>__stories),round);
   assert.equal(await page.evaluate(()=>__match.rounds.at(-1).playerCard.id),picked);
   const expected=await page.evaluate(()=>{const r=__match.rounds.at(-1);return {winner:r.winner,body:r.story.body,finish:r.story.finish,probability:`対戦前の勝率：あなた ${r.decision.playerWinPercent}% ／ CPU ${100-r.decision.playerWinPercent}%`};});
   assert.equal(await page.locator('#result-reason').textContent(),expected.body);assert.equal(await page.locator('#result-finish').textContent(),`決まり手：${expected.finish}`);
   assert.equal(await page.locator('#result-probability').textContent(),expected.probability);assert.equal(await page.locator('#result-stats tr').count(),6);
   const expectedRows=await page.evaluate(()=>{const d=__match.rounds.at(-1).decision;return HumanityBattle.STATS.map(k=>[HumanityBattle.STAT_LABELS[k],String(d.playerStats[k]),String(d.cpuStats[k])]);});
   assert.deepEqual(await page.locator('#result-stats tr').evaluateAll(rows=>rows.map(r=>[...r.children].map(c=>c.textContent))),expectedRows);
   assert.equal(await page.locator('#win-banner').textContent(),expected.winner==='player'?'WIN！ あなた':'WIN！ CPU');
   assert.equal(await page.locator('#'+(expected.winner==='player'?'cpu-fighter':'player-fighter')).evaluate(el=>getComputedStyle(el).visibility),'hidden');
   assert.equal(await page.locator('#'+(expected.winner==='player'?'player-fighter':'cpu-fighter')).evaluate(el=>getComputedStyle(el).visibility),'visible');
   assert.equal(await page.locator('#hand .used').count(),round);assert.equal(await page.locator('#cpu-hand .used').count(),round);
   if(round<3)await page.getByRole('button',{name:'次のラウンドへ'}).click();
  }
  assert.equal(await page.evaluate(()=>__match.phase),'finished');assert.equal(await page.evaluate(()=>__match.playerWins),2);
 }
 // CPU先攻の配置をスキップし、選択後にページを非表示にしても同じ確定結果へ進む。
 await page.evaluate(()=>{window.__first='cpu';window.__draws=0;window.__stories=0;});await page.getByRole('button',{name:'新しい試合',exact:true}).click();
 if(await page.getByRole('button',{name:'演出をスキップ'}).isVisible())await page.getByRole('button',{name:'演出をスキップ'}).click();await idle();
 await page.locator('#hand .card:not(:disabled)').first().evaluate(el=>{el.click();Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await idle();assert.equal(await page.evaluate(()=>__draws),1);assert.equal(await page.locator('#round-result').isVisible(),true);
 await page.evaluate(()=>{HumanityBattle.resolveRound=(p,c)=>{__draws++;return __resolve(p,c,()=>0);};});
 await page.getByRole('button',{name:'次のラウンドへ'}).click();await idle();await page.locator('#hand .card:not(:disabled)').first().click();await idle();
 assert.equal(await page.evaluate(()=>__match.rounds.length),2);assert.equal(await page.evaluate(()=>__match.phase),'finished');assert.equal(await page.locator('#return-button').isVisible(),false);
 if(process.env.REDUCED_MOTION)assert.equal(await page.evaluate(()=>__animations.length),0);
 assert.deepEqual(errors,[]);
 console.log(`PASS ${width}px: 両先攻1タップ/3ラウンド・連打・燃焼境界上→下/敗者のみ・WIN/保存結果・スキップ/非表示・スクロール不変・手札各3枚${process.env.REDUCED_MOTION?'・reduced-motion':''}`);
 await context.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
