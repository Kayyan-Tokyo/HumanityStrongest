const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const inline=code=>code.replace(/\.\/assets\/characters\/(spartan_idle|sumo_idle|spartan_walk_4f|spartan_thrust_4f|spartan_hit_4f|sumo_walk_4f|sumo_slap_4f)\.png/g,(_,name)=>'data:image/png;base64,'+fs.readFileSync('assets/characters/'+name+'.png').toString('base64'));
const data=name=>'data:image/webp;base64,'+fs.readFileSync('assets/backgrounds/'+name+'.webp').toString('base64');
const old=data('colosseum'),side=data('colosseum_side');
const html=fs.readFileSync('index.html','utf8').replace("url('./assets/backgrounds/colosseum.webp')",()=>`url('${old}')`).replace("url('./assets/backgrounds/colosseum_side.webp')",()=>`url('${side}')`).replace(/<script src="([^"]+)" defer><\/script>/g,(_,src)=>'<script>'+inline(fs.readFileSync(src.split('?')[0],'utf8'))+'</script>');
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/sprite-native-facing.json','utf8'));
const oracle=Object.fromEntries(Object.entries(fixture).map(([name,e])=>['data:image/png;base64,'+fs.readFileSync('assets/characters/'+name).toString('base64'),{name,native:e.nativeFacing}]));
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-crashpad-for-testing']});try{for(const width of [375,390,430,1280]){const page=await browser.newPage({viewport:{width,height:812}});await page.setContent(html);const count=await page.evaluate(async oracle=>{
 const api=HumanityPixelBattle;await api.ready;const canvas=document.querySelector('#pixel-canvas'),ctx=canvas.getContext('2d'),original=ctx.drawImage;let expected={},draws=0;const sources=new Set(),states=new Set();
 ctx.drawImage=function(image,...args){const known=oracle[image.src];if(!known)throw Error('未確認の画像');const who=known.name.startsWith('spartan')?'player':'cpu';const m=this.getTransform();if(Math.sign(m.a)*known.native!==expected[who])throw Error(`${known.name}: 描画が逆向き`);draws++;sources.add(known.name);return original.call(this,image,...args);};
 const boundaries=[3199,3200,3201,3324,3325,3449,3450,3574,3575,3699,3700,3701,4199,4200,4201,4324,4325,4449,4450,4574,4575,4699,4700,4701];
 for(const speed of [1,2])for(const swapped of [false,true])for(let round=0;round<3;round++){
  const times=new Set(boundaries);for(let t=0;t<=10000;t+=8*speed)times.add(t);times.add(10000);
  for(const time of [...times].sort((a,b)=>a-b)){
   const s=api.sampleScene(time,round===1?'cpu':'player');if(swapped){const x=s.player.x;s.player.x=s.cpu.x;s.cpu.x=x;}
   const p=api.projectActor(s.player,'player'),c=api.projectActor(s.cpu,'cpu');expected={player:p.x<c.x?1:-1,cpu:c.x<p.x?1:-1};states.add(s.player.pose);states.add(s.cpu.pose);api.drawScene(canvas,s);
  }
 }
 for(const pose of ['idle','walk','attack','damage','fall','victory','defeated'])if(!states.has(pose))throw Error('状態の検証不足');
 if(sources.size!==Object.keys(oracle).length)throw Error('全素材を検証していない');
 // 同座標は直前の向きを保つ。
 const s=api.sampleScene(6000,'player');s.player.pose=s.cpu.pose='idle';s.player.x=235;s.cpu.x=85;expected={player:-1,cpu:1};api.drawScene(canvas,s);s.time++;s.player.x=178;s.cpu.x=142;api.drawScene(canvas,s);s.time++;api.drawScene(canvas,s);
 return draws;
},oracle);assert.ok(count>20000);console.log(`PASS ${width}px: 実PNGの元向き×実Canvas行列を${count}描画で検証・左右/1倍2倍/3ラウンド・攻撃開始/終了±1ms・全素材/全状態・同座標保持`);await page.close();}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
