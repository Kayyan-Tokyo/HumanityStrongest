// 開発時のみPlaywrightを使用。実行時の外部依存・通信・サーバーは不要。
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const tags=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)];
assert.equal(tags.length,6);
const versions=tags.map(([,src])=>new URL(src,'https://test.invalid/').searchParams.get('v'));
assert.ok(versions.every(Boolean));assert.equal(new Set(versions).size,1);
const content=html.replace(/<script src="([^"]+)" defer><\/script>/g,(_,src)=>'<script>'+fs.readFileSync(path.join(root,src.split('?')[0]),'utf8')+'</script>');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-crashpad-for-testing']});
  try{
    for(const width of (process.env.WIDTHS?process.env.WIDTHS.split(',').map(Number):[320,375,390,430,768,1280])){
      const context=await browser.newContext({viewport:{width,height:812},reducedMotion:process.env.REDUCED_MOTION?'reduce':'no-preference',isMobile:width<768,hasTouch:width<768});
      const page=await context.newPage();page.setDefaultTimeout(5000);
      const settled=()=>page.waitForFunction(()=>document.querySelector('#hand-screen').getAttribute('aria-busy')!=='true');
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.setContent(content);
      await page.evaluate(()=>{window.__moves=[];const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){window.__moves.push({id:this.id,duration:options.duration});return animate.call(this,frames,options);};});
      // 最長名を確実に配り、実際の計算式に境界乱数を注入して進行を決定的に検証。
      await page.evaluate(()=>{
        const deal=window.HumanityMatch.deal,resolve=window.HumanityBattle.resolveRound;
        window.__outcomes=['player','cpu','player'];window.__roundDraws=0;window.__firstSide='cpu';window.__storyCount=0;
        const generate=window.HumanityStory.generateStory;
        window.HumanityStory.generateStory=result=>{window.__storyCount++;return generate(result);};
        window.HumanityMatch.deal=characters=>{
          const ranked=[...characters].sort((a,b)=>b.name.length-a.name.length);
          return window.__match=deal(ranked,()=>window.__firstSide==='player'?0:0.999999);
        };
        window.HumanityBattle.resolveRound=(p,c)=>resolve(p,c,()=>{
          const winner=window.__outcomes[window.__roundDraws++];
          return winner==='player'?0:0.999999;
        });
      });
      await page.getByRole('button',{name:'ゲーム開始',exact:true}).click();
      await settled();
      assert.equal(await page.locator('#hand .card').count(),3);assert.equal(await page.locator('#cpu-hand .card').count(),3);
      const geometry=await page.evaluate(()=>{
        const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};};
        const fits=selector=>{
          const cards=[...document.querySelectorAll(selector)];
          return cards.every(card=>{const r=card.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&Math.abs(r.top-cards[0].getBoundingClientRect().top)<1&&
            [...card.children].every(c=>c.scrollWidth<=c.clientWidth&&c.scrollHeight<=c.clientHeight+1);});
        };
        return {fits:fits('#hand .card')&&fits('#cpu-hand .card'),overflow:document.documentElement.scrollWidth>innerWidth,
          cpu:rect('#cpu-fighter'),vs:rect('.battle-arena > .vs'),player:rect('#player-fighter'),
          cpuHand:rect('#cpu-hand'),arena:rect('.battle-arena'),playerHand:rect('#hand')};
      });
      assert.equal(geometry.fits,true);assert.equal(geometry.overflow,false);
      if(width>=375&&width<=430)assert.ok(geometry.playerHand.bottom<=812,'初期表示で両者の手札が画面内に収まる');
      assert.equal(await page.locator('#match-score').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
      assert.equal(await page.locator('#hand .card').evaluateAll(cards=>cards.every(c=>c.getBoundingClientRect().height>=56)),true);
      assert.ok(geometry.cpu.bottom<=geometry.vs.top&&geometry.vs.bottom<=geometry.player.top);
      assert.ok(geometry.cpuHand.bottom<=geometry.arena.top&&geometry.arena.bottom<=geometry.playerHand.top);
      const cpuProfiles=await page.locator('#cpu-hand .card').evaluateAll(cards=>cards.every(card=>{
        const c=window.CHARACTERS.find(c=>c.name===card.querySelector('.card-name').textContent);
        return c&&card.querySelector('.card-profile').textContent===`${c.age}歳 / ${c.height}cm / ${c.weight}kg`&&card.children.length===2;
      }));assert.equal(cpuProfiles,true);
      const roster=await page.evaluate(()=>[...window.__match.playerHand,...window.__match.cpuHand].map(c=>c.id));
      assert.equal(new Set(roster).size,6);
      for(let round=1;round<=3;round++){
        await settled();
        assert.equal(await page.locator('#round-result').isVisible(),false);
        assert.equal(await page.locator('#result-finish').textContent(),'');
        assert.doesNotMatch(await page.locator('#hand-screen').innerText(),/公開/);
        assert.equal(await page.locator('#result-stats tr').count(),0);
        assert.doesNotMatch(await page.locator('#hand-screen').innerText(),/STR|SPD|END|STK|GRP|SUB/);
        const firstSide=await page.evaluate(()=>window.__match.firstSide);
        assert.equal(firstSide,round===2?'player':'cpu');
        assert.match(await page.locator('#turn-status').textContent(),firstSide==='player'?/あなたが先攻/:/あなたが後攻/);
        if(firstSide==='player'){
          assert.equal(await page.locator('#cpu-fighter .card-back').count(),1);
          assert.equal(await page.locator('#cpu-fighter .card-name').count(),0);
          assert.equal(await page.evaluate(()=>window.__match.cpuCard),null);
        }else{
          assert.equal(await page.locator('#cpu-fighter .card-name').textContent(),await page.evaluate(()=>window.__match.cpuCard.name));
        }
        assert.equal(await page.locator('#fight-button').isDisabled(),true);
        await page.locator('#fight-button').evaluate(b=>b.dispatchEvent(new MouseEvent('click',{bubbles:true})));
        assert.equal(await page.evaluate(()=>window.__roundDraws),round-1);
        const available=page.locator('#hand .card:not(:disabled)');assert.equal(await available.count(),4-round);
        const playerName=await available.first().locator('.card-name').textContent();
        if(round===1){
          const locked=await available.first().evaluate(el=>{
            el.click();
            const busy=document.querySelector('#hand-screen').getAttribute('aria-busy')==='true';
            if(busy)for(const id of ['fight-button','confirm-button','redeal-button','return-button'])for(let i=0;i<5;i++)document.getElementById(id).dispatchEvent(new MouseEvent('click',{bubbles:true}));
            if(busy)for(const other of document.querySelectorAll('#hand .card'))for(let i=0;i<5;i++)other.dispatchEvent(new MouseEvent('click',{bubbles:true}));
            return busy;
          });
          assert.equal(locked,!process.env.REDUCED_MOTION);
        }else if(width<768)await available.first().tap();else await available.first().click();
        await settled();
        assert.equal(await page.locator('#player-fighter .card-name').textContent(),playerName);
        if(firstSide==='player'){
          assert.equal(await page.locator('#fight-button').isVisible(),false);
          await page.locator('#fight-button').evaluate(b=>b.dispatchEvent(new MouseEvent('click',{bubbles:true})));
          assert.equal(await page.evaluate(()=>window.__roundDraws),round-1);
          if(width<768)await page.locator('#confirm-button').tap();else await page.locator('#confirm-button').click();
          assert.equal(await page.locator('#hand .card:disabled').count(),3);
          assert.equal(await page.locator('#cpu-fighter .card-back').count(),1);
          const locked=await page.evaluate(()=>window.__match.cpuCard.id);
          await page.locator('#confirm-button').evaluate(b=>{for(let i=0;i<10;i++)b.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
          assert.equal(await page.evaluate(()=>window.__match.cpuCard.id),locked);
          assert.equal(await page.locator('#fight-button').isDisabled(),false);
        }
        const fight=page.locator('#fight-button');if(width<768)await fight.tap();else await fight.click();
        await settled();
        assert.match(await page.locator('#turn-status').textContent(),/でした/);
        const flights=await page.evaluate(()=>window.__moves.filter(move=>move.duration===400).map(move=>move.id));
        if(process.env.REDUCED_MOTION)assert.equal(flights.length,0);
        else {
          assert.equal(flights.length,round*2);
          assert.deepEqual(flights.slice(-2),firstSide==='cpu'?['cpu-fighter','player-fighter']:['player-fighter','cpu-fighter']);
          assert.equal(await page.evaluate(()=>window.__moves.filter(move=>move.duration===150).length),round*2);
        }
        assert.equal(await page.locator('#round-result').isVisible(),true);assert.equal(await page.locator('#result-stats tr').count(),6);
        assert.equal(await page.locator('#hand .used').count(),round);assert.equal(await page.locator('#cpu-hand .used').count(),round);
        assert.equal(await page.locator('#hand .card:disabled').count(),3);
        assert.equal(await page.evaluate(()=>window.__roundDraws),round);assert.equal(await page.evaluate(()=>window.__storyCount),round);
        const expected=await page.evaluate(()=>{
          const result=window.__match.rounds.at(-1),d=result.decision;
          return {cpu:result.cpuCard.name,reason:result.story.body,finish:result.story.finish,probability:`対戦前の勝率：あなた ${d.playerWinPercent}% ／ CPU ${100-d.playerWinPercent}%`,
            rows:window.HumanityBattle.STATS.map(s=>[window.HumanityBattle.STAT_LABELS[s],String(d.playerStats[s]),String(d.cpuStats[s])]),headline:result.story.headline};
        });
        assert.equal(await page.locator('#cpu-fighter .card-name').textContent(),expected.cpu);
        assert.equal(await page.locator('#result-reason').textContent(),expected.reason);
        assert.equal(await page.locator('#result-headline').textContent(),expected.headline);
        assert.equal(await page.locator('#result-finish').textContent(),`決まり手：${expected.finish}`);
        assert.ok(expected.reason.length>=150&&expected.reason.length<=250);
        assert.equal(expected.reason.split('\n\n').length,3);
        assert.doesNotMatch(expected.reason,/序盤：|中盤：|終盤：/);
        assert.doesNotMatch(await page.locator('#hand-screen').innerText(),/PLAYER|STR|SPD|END|STK|GRP|SUB|抽選値|判定境界|戦闘力|計算式/);
        assert.equal(await page.locator('#round-result thead th').count(),3);
        assert.equal(await page.locator('#result-probability').textContent(),expected.probability);
        assert.deepEqual(await page.locator('#result-stats tr').evaluateAll(rows=>rows.map(row=>[...row.children].map(c=>c.textContent))),expected.rows);
        // アニメーション中もイベント連打も同一の保存結果を使い、再抽選しない。
        const stable=await page.evaluate(()=>{
          const result=window.__match.rounds.at(-1),node=document.querySelector('#cpu-fighter').firstElementChild;
          for(let n=0;n<10;n++)document.querySelector('#fight-button').dispatchEvent(new MouseEvent('click',{bubbles:true}));
          return result===window.__match.rounds.at(-1)&&node===document.querySelector('#cpu-fighter').firstElementChild;
        });assert.equal(stable,true);
        await page.locator('#cpu-fighter .fighter-card').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
        assert.equal(await page.evaluate(()=>window.__roundDraws),round);assert.equal(await page.evaluate(()=>window.__storyCount),round);
        assert.equal(await page.locator('#result-reason').textContent(),expected.reason);
        assert.equal(await page.locator('#result-headline').textContent(),expected.headline);
        assert.equal(await page.locator('#result-finish').textContent(),`決まり手：${expected.finish}`);
        assert.ok(expected.reason.length>=150&&expected.reason.length<=250);
        assert.equal(expected.reason.split('\n\n').length,3);
        assert.doesNotMatch(expected.reason,/序盤：|中盤：|終盤：/);
        assert.doesNotMatch(await page.locator('#hand-screen').innerText(),/PLAYER|STR|SPD|END|STK|GRP|SUB|抽選値|判定境界|戦闘力|計算式/);
        assert.equal(await page.locator('#round-result thead th').count(),3);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        if(process.env.SCREENSHOT_DIR&&width===375&&round===1){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'round-result.png'),fullPage:true});}
        if(round<3){
          await page.getByRole('button',{name:'次のラウンドへ',exact:true}).click();
          assert.equal(await page.locator('#hand .card.used:disabled').count(),round);
          assert.equal(await page.locator('#fight-button').isDisabled(),true);
          assert.deepEqual(await page.evaluate(()=>[...window.__match.playerHand,...window.__match.cpuHand].map(c=>c.id)),roster);
        }
      }
      assert.match(await page.locator('#match-score').textContent(),/試合終了.*あなた 2勝.*CPU 1勝/);
      assert.equal(await page.locator('#return-button').isVisible(),false);
      await page.evaluate(()=>{window.__outcomes=['cpu','cpu'];window.__roundDraws=0;window.__firstSide='player';window.__storyCount=0;});
      await page.getByRole('button',{name:'新しい試合',exact:true}).click();
      assert.equal(await page.locator('#hand .used').count(),0);
      for(let round=1;round<=2;round++){
        await settled();
        await page.locator('#hand .card:not(:disabled)').first().click();
        await settled();
        if(await page.locator('#confirm-button').isVisible())await page.locator('#confirm-button').click();
        await page.locator('#fight-button').click();
        await settled();
        if(round===1)await page.getByRole('button',{name:'次のラウンドへ',exact:true}).click();
      }
      assert.match(await page.locator('#match-score').textContent(),/試合終了.*あなた 0勝.*CPU 2勝/);
      assert.equal(await page.evaluate(()=>window.__match.rounds.length),2);
      assert.equal(await page.locator('#return-button').isVisible(),false);
      assert.equal(await page.locator('#fight-button').isDisabled(),true);
      assert.deepEqual(errors,[]);
      console.log(`PASS ${width}px: 先攻/後攻・順序どおりの公開・公開手札3枚・縦配置・事前能力非表示・結果6能力/勝率/保存ストーリー・抽選1回・再使用禁止・3戦決着/2連勝終了`);
      await context.close();
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
