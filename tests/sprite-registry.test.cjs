const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const warnings = [], requests = [], deadlines = new Map();
let serial = 0;
const math = Object.create(Math);
math.random = () => { throw Error('Sprite code must not consume outcome randomness'); };
const context = vm.createContext({ window:{}, Math:math, console:{warn:message=>warnings.push(message)},
  setTimeout:(fn,ms)=>{const id=++serial;deadlines.set(id,{fn,ms});return id;}, clearTimeout:id=>deadlines.delete(id),
  Image:class { set src(src) { this.source=this.srcValue=this._src=src;requests.push(src);if(src.includes('timeout'))return;if(src.includes('broken'))this.onerror();else this.onload(); } get src(){return this._src;} }
});
for(const file of ['sprite-registry','pixel-battle'])vm.runInContext(fs.readFileSync(`js/${file}.js`,'utf8'),context);
const {HumanitySprites:registry,HumanityPixelBattle:api}=context.window;
const ids=fs.readFileSync('data/HumanityStrongest_characters_v1.csv','utf8').trim().split('\n').slice(1).map(row=>row.split(',')[0]);
assert.equal(ids.length,30);
assert.deepEqual(Object.keys(registry).sort(),ids.sort());
assert.equal(Object.values(registry).filter(entry=>entry.src).length,2);
assert.ok(registry.spartan.src.endsWith('/spartan_idle.png'));
assert.ok(registry.sumo.src.endsWith('/sumo_idle.png'));
assert.equal(registry['meiji-sumo'].src,null,'Do not assign modern sumo art to another official person');
assert.ok(Object.isFrozen(registry));
for(const entry of Object.values(registry)){
  assert.ok(entry.height>0 && entry.frame.length===4 && [1,-1].includes(entry.sourceFacing));
  for(const clip of [entry,...Object.values(entry.poses)])if(clip.src)assert.ok(fs.existsSync(clip.src));
}
const draws=[];
const ctx=new Proxy({drawImage:(image,...args)=>draws.push({src:image.src,args})},{get:(o,key)=>key in o?o[key]:()=>{}});
const canvas={dataset:{},getContext:()=>ctx};
(async()=>{
  // Two independent instances, with both role assignments. Assets cache by URL, not side.
  for(const reverse of [false,true]){
    const r=api.createRenderer({playerId:reverse?'sumo':'spartan',cpuId:reverse?'spartan':'sumo'});await r.ready;
    for(const winner of ['player','cpu'])for(let t=0;t<=10000;t+=25){
      draws.length=0;r.drawScene(canvas,r.sampleScene(t,winner));
      assert.equal(draws.length,2);assert.equal(canvas.dataset.playerFallback,'false');
      assert.equal(canvas.dataset.playerCharacterId,reverse?'sumo':'spartan');
      assert.equal(canvas.dataset.cpuCharacterId,reverse?'spartan':'sumo');
      assert.equal(canvas.dataset.playerFacing,'1');assert.equal(canvas.dataset.cpuFacing,'-1');
      assert.ok(draws[0].src.includes(reverse?'spartan':'sumo'));
      assert.ok(draws[1].src.includes(reverse?'sumo':'spartan'));
      if(t===10000)assert.equal(canvas.dataset.winner,winner);
    }
    const sumoSide=reverse?'player':'cpu';
    for(const [x,opponentX,direction] of [[100,220,1],[220,100,-1]]){
      const actor={x,y:212,pose:'attack',attackTime:250,facing:direction===1?Math.PI:0};
      const base=r.projectActor({...actor,pose:'idle'},sumoSide,{x:opponentX});
      assert.equal(r.projectActor(actor,sumoSide,{x:opponentX}).x-base.x,8*direction,'Lunge follows the opponent even if the previous facing is stale');
    }
    for(const side of ['player','cpu'])for(const pose of ['walk','attack','damage']){
      const frame=r.spriteFrame(side,{pose,moving:true,attackTime:250,hitTime:200},1500);
      assert.equal(frame.animated,true);assert.equal(frame.clip,r.SPRITES[side].poses[pose]);
    }
  }
  assert.equal(new Set(requests).size,8);assert.equal(requests.length,8,'Reuse URL cache when sides are swapped');
  // Register a future character with only its own master, not an existing person's image.
  const master={src:'./assets/characters/test-own-master.png',height:53,frame:[0,0,32,48],sourceFacing:-1,poses:{}};
  const fixtureRegistry={...registry,hacker:master};
  const only=api.createRenderer({playerId:'hacker',cpuId:'sumo',registry:fixtureRegistry});await only.ready;
  for(const pose of ['idle','walk','attack','damage','fall','defeated','victory']){
    const scene=only.sampleScene(3500,'player');scene.player.pose=pose;
    draws.length=0;only.drawScene(canvas,scene);
    assert.ok(draws[1].src.endsWith('test-own-master.png'));
    assert.equal(canvas.dataset.playerFallback,'false');
    assert.equal(only.spriteFrame('player',{pose,moving:true},500).animated,false);
  }
  // A failed motion uses the same character's master. A failed master must never use its loaded motion.
  const broken=api.createRenderer({playerId:'hacker',cpuId:'spartan',registry:{hacker:{...master,poses:{attack:{src:'broken-motion.png',once:true,duration:500,frames:[[0,0,32,48]]}}},spartan:{...registry.spartan,src:'broken-master.png'}}});await broken.ready;
  assert.equal(broken.spriteFrame('player',{pose:'attack',attackTime:250},0).image.src,master.src);
  assert.equal(broken.spriteFrame('cpu',{pose:'attack',attackTime:250},0).image,null);
  draws.length=0;broken.drawScene(canvas,broken.sampleScene(3500,'player'));
  assert.equal(draws.length,1);assert.equal(canvas.dataset.cpuFallback,'true');
  for(const id of [...ids.filter(id=>!registry[id].src),'unknown-id']){
    const missing=api.createRenderer({playerId:id,cpuId:'sumo'});await missing.ready;
    for(const t of [0,1500,3500,4500,8000,10000]){
      draws.length=0;missing.drawScene(canvas,missing.sampleScene(t,'player'));
      assert.equal(canvas.dataset.playerFallback,'true');assert.equal(draws.length,1);
      assert.ok(draws[0].src.includes('sumo'));
    }
    assert.ok(warnings.some(message=>message.includes(`${id}:`)));
  }
  const before=warnings.length;
  await api.createRenderer({playerId:'unknown-id',cpuId:'sumo'}).ready;
  assert.equal(warnings.length,before,'Do not spam warnings on every frame/round');
  const timeout=api.createRenderer({playerId:'hacker',cpuId:'sumo',registry:{hacker:{...master,src:'timeout-master.png'},sumo:registry.sumo}});
  assert.ok([...deadlines.values()].some(t=>t.ms===5000));
  for(const deadline of [...deadlines.values()])deadline.fn();await timeout.ready;
  assert.equal(timeout.spriteFrame('player',{pose:'idle'},0).image,null);
  assert.ok(warnings.some(w=>w.includes('broken-motion.png')));
  assert.ok(warnings.some(w=>w.includes('broken-master.png')));
  assert.ok(warnings.some(w=>w.includes('timeout-master.png')));
  // Character A loaded earlier must not leak into B's role (including result replay).
  const safe=api.createRenderer({playerId:'neanderthal',cpuId:'hacker'});await safe.ready;
  draws.length=0;safe.drawScene(canvas,safe.sampleScene(10000,'cpu'));assert.equal(draws.length,0);
  assert.equal(canvas.dataset.winner,'cpu');
  console.log('PASS: CSV全30ID一致・両配役/全モーション・マスターのみ・未登録/404/timeout・自身の画像へのフォールバック・URLキャッシュ・警告・乱数ゼロ');
})().catch(error=>{console.error(error);process.exitCode=1;});
