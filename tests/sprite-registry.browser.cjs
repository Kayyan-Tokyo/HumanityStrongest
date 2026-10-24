const fs = require('node:fs'), assert = require('node:assert/strict'), {chromium} = require('playwright');
const asset = file => 'data:image/' + (file.endsWith('.png')?'png':'webp') + ';base64,' + fs.readFileSync(file).toString('base64');
const content = fs.readFileSync('index.html','utf8')
  .replace(/url\('\.\/(assets\/backgrounds\/[^']+)'\)/g,(_,file)=>`url('${asset(file)}')`)
  .replace(/<script src="([^"]+)" defer><\/script>/g,(_,src)=>'<script>'+fs.readFileSync(src.split('?')[0],'utf8')
    .replace(/\.\/(assets\/characters\/[^'"]+\.png)/g,(_,file)=>asset(file))+'</script>');
const oracle=Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync('tests/fixtures/sprite-native-facing.json','utf8'))).map(([name,entry])=>[asset('assets/characters/'+name),{name,native:entry.nativeFacing}]));
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-crashpad-for-testing']});
  try{
    for(const width of [375,390,430,1280]){
      const page=await browser.newPage({viewport:{width,height:812},reducedMotion:'reduce'}),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.setContent(content);
      const count=await page.evaluate(async oracle=>{
        const canvas=document.querySelector('#pixel-canvas'),ctx=canvas.getContext('2d'),original=ctx.drawImage;
        let expected,renderer,draws=0;
        const opaqueBounds=new Map();
        ctx.drawImage=function(image,...args){
          const known=oracle[image.src],m=this.getTransform(),[sx,sy,sw,sh,dx,dy,dw,dh]=args;
          if(!known)throw Error('Unexpected asset');
          const side=known.name.startsWith('spartan')?expected.spartan:expected.sumo;
          const facing=Number(canvas.dataset[side+'Facing']);
          if(Math.sign(m.a)*known.native!==facing)throw Error('Native art points away from opponent');
          // Check the actual opaque pixels, not the transparent margin of a sheet frame.
          const key=known.name+':'+sx+':'+sy;
          if(!opaqueBounds.has(key)){
            const probe=document.createElement('canvas');probe.width=sw;probe.height=sh;
            const read=probe.getContext('2d');read.drawImage(image,sx,sy,sw,sh,0,0,sw,sh);
            const data=read.getImageData(0,0,sw,sh).data;
            let left=sw,right=0,top=sh,bottom=0;
            for(let y=0;y<sh;y++)for(let x=0;x<sw;x++)if(data[(y*sw+x)*4+3]>32){left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
            opaqueBounds.set(key,{left,right,top,bottom});
          }
          const b=opaqueBounds.get(key);
          for(const x of [b.left,b.right])for(const y of [b.top,b.bottom]){
            const point=new DOMPoint(dx+x*dw/sw,dy+y*dh/sh).matrixTransform(m);
            if(point.x<-.5||point.x>320.5||point.y<-.5||point.y>240.5)throw Error(`Clipped ${known.name}: ${point.x},${point.y}`);
          }
          // Every non-fallen frame uses the configured, shared foot baseline (within pixel rounding).
          if(!['fall','defeated'].includes(canvas.dataset[side+'TestPose']) && Math.abs(m.f-renderer.GROUND_Y)>.001)throw Error('Floating base');
          draws++;return original.call(this,image,...args);
        };
        for(const swappedIds of [false,true]){
          const playerId=swappedIds?'sumo':'spartan',cpuId=swappedIds?'spartan':'sumo';
          renderer=HumanityPixelBattle.createRenderer({playerId,cpuId});await renderer.ready;
          expected=swappedIds?{sumo:'player',spartan:'cpu'}:{spartan:'player',sumo:'cpu'};
          for(const reversePositions of [false,true])for(const winner of ['player','cpu'])for(let t=0;t<=10000;t+=25){
            const scene=renderer.sampleScene(t,winner);
            if(reversePositions){[scene.player.x,scene.cpu.x]=[scene.cpu.x,scene.player.x];}
            for(const side of ['player','cpu'])canvas.dataset[side+'TestPose']=scene[side].pose;
            renderer.drawScene(canvas,scene);
            if(canvas.dataset.playerCharacterId!==playerId||canvas.dataset.cpuCharacterId!==cpuId)throw Error('Wrong selected ID');
          }
        }
        ctx.drawImage=original;
        // A future master-only asset, defined only in the registry. No battle code change.
        const own=document.createElement('canvas');own.width=24;own.height=40;
        own.getContext('2d').fillRect(2,0,20,40);
        const master={src:own.toDataURL(),sourceFacing:1,height:54,frame:[0,0,24,40],poses:{}};
        const only=HumanityPixelBattle.createRenderer({playerId:'hacker',cpuId:'sumo',registry:{...HumanitySprites,hacker:master}});await only.ready;
        for(const t of [0,1500,3500,4500,8500,10000]){
          only.drawScene(canvas,only.sampleScene(t,'player'));
          if(canvas.dataset.playerFallback!=='false'||canvas.dataset.playerImage!==master.src)throw Error('Master-only failed');
        }
        const bad=HumanityPixelBattle.createRenderer({playerId:'hacker',cpuId:'sumo',registry:{...HumanitySprites,hacker:{...master,src:'data:image/png;base64,AAAA'}}});await bad.ready;
        bad.drawScene(canvas,bad.sampleScene(10000,'cpu'));
        if(canvas.dataset.playerFallback!=='true'||canvas.dataset.winner!=='cpu')throw Error('Broken image stopped the match');
        return draws;
      },oracle);
      assert.ok(count>6000);
      // Run the real game wiring, alternating which selected official ID belongs to which side.
      await page.evaluate(()=>{
        const deal=HumanityMatch.deal,resolve=HumanityBattle.resolveRound;
        window.__reverse=false;window.__first='player';window.__roundDraws=0;
        HumanityMatch.deal=chars=>{
          const m=deal(chars,()=>.25),find=id=>chars.find(c=>c.id===id);
          const player=__reverse?'sumo':'spartan',cpu=__reverse?'spartan':'sumo';
          m.playerHand=[find(player),find('hacker'),find('nakameguro-barber')];
          m.cpuHand=[find(cpu),find('neanderthal'),find('japanese-office-worker')];
          m.firstSide=__first;m.cpuCard=__first==='cpu'?m.cpuHand[0]:null;
          window.__match=m;return m;
        };
        // Controlled test selection/result; production logic remains unchanged.
        Math.random=()=>0;
        HumanityBattle.resolveRound=(p,c)=>resolve(p,c,()=>[0,.999999,0][window.__roundDraws++]);
      });
      const idle=()=>page.waitForFunction(()=>document.querySelector('#hand-screen').getAttribute('aria-busy')!=='true');
      await page.selectOption('#battle-mode','pixel');
      for(const reverse of [false,true])for(const first of ['player','cpu']){
        await page.evaluate(({reverse,first})=>{__reverse=reverse;__first=first;__roundDraws=0;},{reverse,first});
        if(await page.locator('#title-screen').isVisible())await page.getByRole('button',{name:'ゲーム開始',exact:true}).click();
        else await page.getByRole('button',{name:'新しい試合',exact:true}).click();
        await idle();
        for(let round=1;round<=3;round++){
          await page.locator('#hand .card:not(:disabled)').first().click();await idle();
          const actual=await page.evaluate(()=>{
            const r=__match.rounds.at(-1),canvas=document.querySelector('#pixel-canvas');
            return {player:r.playerCard.id,cpu:r.cpuCard.id,shownPlayer:canvas.dataset.playerCharacterId,shownCpu:canvas.dataset.cpuCharacterId,
              playerFallback:canvas.dataset.playerFallback,cpuFallback:canvas.dataset.cpuFallback,winner:r.winner,shownWinner:canvas.dataset.winner,
              count:__match.rounds.length,legend:document.querySelector('#pixel-legend').textContent,names:[r.playerCard.name,r.cpuCard.name]};
          });
          assert.equal(actual.shownPlayer,actual.player);assert.equal(actual.shownCpu,actual.cpu);
          assert.equal(actual.shownWinner,actual.winner);assert.equal(actual.count,round);
          assert.equal(actual.playerFallback,round===1?'false':'true');assert.equal(actual.cpuFallback,round===1?'false':'true');
          for(const name of actual.names)assert.ok(actual.legend.includes(name));
          assert.equal(await page.locator('#hand .card:visible').count(),3);assert.equal(await page.locator('#cpu-hand .card:visible').count(),3);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
          if(round===1){
            await page.selectOption('#battle-mode','card');await page.selectOption('#battle-mode','pixel');
            await page.waitForFunction(()=>!document.querySelector('#pixel-canvas').hidden);
            assert.equal(await page.locator('#pixel-canvas').getAttribute('data-player-character-id'),actual.player);
          }
          if(process.env.SCREENSHOT_DIR && round===1 && reverse && first==='cpu' && (width===375||width===1280)){
            fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});
            await page.evaluate(async()=>{
              const r=__match.rounds.at(-1);window.__preview=HumanityPixelBattle.createRenderer({playerId:r.playerCard.id,cpuId:r.cpuCard.id});await __preview.ready;
              __preview.drawScene(document.querySelector('#pixel-canvas'),__preview.sampleScene(1500,r.winner));
            });
            await page.locator('#battle-arena').screenshot({path:`${process.env.SCREENSHOT_DIR}/swapped-${width}.png`});
            await page.evaluate(()=>__preview.drawScene(document.querySelector('#pixel-canvas'),__preview.sampleScene(10000,__match.rounds.at(-1).winner)));
          }
          if(round<3)await page.getByRole('button',{name:'次のラウンドへ'}).click();
          await idle();
        }
        assert.equal(await page.evaluate(()=>__match.phase),'finished');
      }
      assert.deepEqual(errors,[]);
      console.log(`PASS ${width}px: ${count} real sprite draws / both ID assignments and positions / master-only and failed image / both first turns, 3 rounds / hands, names and result replay`);
      await page.close();
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
