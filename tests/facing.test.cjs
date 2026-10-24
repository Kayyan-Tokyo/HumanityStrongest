const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const math=Object.create(Math);math.random=()=>{throw Error('乱数消費');};
const ctx=vm.createContext({window:{},Math:math,setTimeout,clearTimeout,Image:class{set src(value){this.srcValue=value;this.onload();}}});
vm.runInContext(fs.readFileSync(process.env.PIXEL_SCRIPT || 'js/pixel-battle.js','utf8'),ctx);const api=ctx.window.HumanityPixelBattle;
const oracle=JSON.parse(fs.readFileSync('tests/fixtures/sprite-native-facing.json','utf8'));
for(const [name,entry]of Object.entries(oracle))assert.equal(require('crypto').createHash('sha256').update(fs.readFileSync('assets/characters/'+name)).digest('hex'),entry.sha256);
const log=[];const context=new Proxy({drawImage:(image,...args)=>log.push({image,args,matrix:[...matrix]}),scale:(x,y)=>{matrix[0]*=x;matrix[1]*=y;},translate:(x,y)=>{matrix[2]+=x;matrix[3]+=y;},save:()=>{stack.push([...matrix]);},restore:()=>{matrix=stack.pop();}}, {get:(o,p)=>p in o?o[p]:()=>{}});
let matrix=[1,1,0,0],stack=[];
const canvas={dataset:{},getContext:()=>context};
for(const swapped of [false,true])for(const pose of ['idle','walk','attack','damage','victory','defeated'])for(const velocity of [-1,1]){
 const scene=api.sampleScene(3500,'player');scene.time+=velocity===-1?1:2;
 scene.player={...scene.player,x:swapped?235:85,pose,attackTime:250,direction:velocity,moving:true};
 scene.cpu={...scene.cpu,x:swapped?85:235,pose,attackTime:250,direction:-velocity,moving:true};
 log.length=0; api.drawScene(canvas,scene);
 assert.equal(canvas.dataset.playerFacing,swapped?'-1':'1');assert.equal(canvas.dataset.cpuFacing,swapped?'1':'-1');
 for(const draw of log){const name=draw.image.srcValue.split('/').pop();const isPlayer=name.startsWith('spartan');const expected=isPlayer?(swapped?-1:1):(swapped?1:-1);assert.equal(Math.sign(draw.matrix[0])*oracle[name].nativeFacing,expected,`${name}: 実画像の元向き×Canvas反転が相手を向く`);}
}
// 左右交換→同座標→同座標を保つ。重なった瞬間に向きを再計算しない。
const scene=api.sampleScene(6000,'player');scene.player.x=235;scene.cpu.x=85;scene.player.pose=scene.cpu.pose='idle';api.drawScene(canvas,scene);
scene.time=6001;scene.player.x=178;scene.cpu.x=142;api.drawScene(canvas,scene);
assert.equal(canvas.dataset.playerFacing,'-1');assert.equal(canvas.dataset.cpuFacing,'1');
scene.time=6002;api.drawScene(canvas,scene);assert.equal(canvas.dataset.playerFacing,'-1');
scene.time=6003;scene.player.x=85;scene.cpu.x=235;api.drawScene(canvas,scene);assert.equal(canvas.dataset.playerFacing,'1');assert.equal(canvas.dataset.cpuFacing,'-1');
assert.equal(api.resolveFacing({x:1},{x:1},-1),-1);assert.equal(api.resolveFacing({x:1},{x:1},1),1);
// 元から左向きの素材にも同じ計算を使用。状態毎の素材属性で上書き可能。
const config=api.SPRITES.player;config.sourceFacing=-1;
for(const pose of ['idle','walk','attack','damage','victory','defeated'])for(const facingDirection of [-1,1]){
 const frame=api.spriteFrame('player',{pose,moving:true,direction:-facingDirection,facingDirection,attackTime:250},3500);
 assert.equal(frame.flip,facingDirection===1);
}
config.sourceFacing=1;
const comparisons=[];
for(const opponent of [75,245]) {
  const s=api.sampleScene(3500,'player');s.player.x=178;s.cpu.x=opponent;s.cpu.pose='idle';
  log.length=0;const sparks=[];
  context.fillRect=(x,y,w,h)=>{if(w===12&&h===2)sparks.push(x+6);};
  api.drawScene(canvas,s);
  const draw=log.find(c=>c.image.srcValue.includes('spartan_thrust'));
  const [sx,sy,sw,sh,dx,dy,dw,dh]=draw.args;
  comparisons.push({x:draw.matrix[2]+draw.matrix[0]*(dx+240*dw/sw),y:draw.matrix[3]+draw.matrix[1]*(dy+460*dh/sh)});
  assert.ok(opponent<178?sparks[0]<160:sparks[0]>160,'ヒット光も相手側へ');
}
assert.deepEqual(comparisons[0],comparisons[1],'反転しても足元の支点は不変');
assert.ok(log.length>0);
console.log('PASS: 両キャラ左右/全6状態・前進後退・左右交換・同座標保持・元素材左右の反転・乱数ゼロ');
