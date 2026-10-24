const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
let now = 0, serial = 0, timers = new Map(), frames = new Map();
const math = Object.create(Math); math.random = () => { throw new Error('演出による乱数消費'); };
const context = vm.createContext({ window: {}, Math: math, performance: { now: () => now },
  Image: class { set src(value) { this.source = value; this.onload(); } },
  requestAnimationFrame: cb => { const id = ++serial; frames.set(id, cb); return id; },
  cancelAnimationFrame: id => frames.delete(id),
  setTimeout: (cb, ms) => { const id = ++serial; timers.set(id, { cb, at: now + ms }); return id; },
  clearTimeout: id => timers.delete(id)
});
vm.runInContext(fs.readFileSync('js/pixel-battle.js', 'utf8'), context);
const api = context.window.HumanityPixelBattle;
const walking = { pose:'walk', moving:true, direction:1 };
assert.deepEqual([0,150,300,450,600].map(t => api.spriteFrame('player', walking, t).index), [0,1,2,3,0]);
assert.equal(api.spriteFrame('player', { ...walking, moving:false }, 450).animated, false);
assert.equal(api.spriteFrame('player', { ...walking, pose:'idle' }, 450).animated, false);
assert.equal(api.spriteFrame('player', { ...walking, direction:-1 }, 450).flip, false);
assert.equal(api.spriteFrame('player', walking, 450).flip, false);
assert.equal(api.spriteFrame('cpu', walking, 450).animated, true);
assert.deepEqual([0,170,340,510,680].map(t=>api.spriteFrame('cpu',walking,t).index),[0,1,2,3,0]);
assert.equal(api.spriteFrame('cpu',{...walking,moving:false},510).animated,false);
assert.equal(api.spriteFrame('cpu',{...walking,direction:-1},510).flip,false);
assert.equal(api.spriteFrame('cpu',walking,510).flip,false);
for (let t=0;t<3000;t+=10) {
  const actor=api.projectActor(api.sampleScene(t,'player').player,'player');
  for(const frame of api.SPRITES.player.poses.walk.frames) {
    const height=api.SPRITES.player.height*api.LAYOUT.spriteScale, width=height*frame[2]/frame[3];
    assert.ok(actor.x-width/2>=0 && actor.x+width/2<=api.WIDTH && actor.y-height>=0);
  }
}
for (const winner of ['player', 'cpu']) {
  const poses = { player: new Set(), cpu: new Set() }, phases = new Set();
  for (let t = 0; t <= 10000; t += 10) {
    const s = api.sampleScene(t, winner); phases.add(s.phase);
    assert.ok(s.player.x < s.cpu.x, '左右を入れ替えない');
    assert.equal(s.player.y, s.cpu.y, '共通の地面基準');
    const bounds = {};
    for (const side of ['cpu', 'player']) {
      const a = api.projectActor(s[side], side); poses[side].add(a.pose);
      // スプライト全体と横倒し時の余白を含めて砂地の内側に収める。
      assert.ok(a.x >= 0 && a.x <= 320 && a.y === api.GROUND_Y);
      const config = api.SPRITES[side], h = config.height * api.LAYOUT.spriteScale, w = h * config.frame[2] / config.frame[3];
      const fallen = ['fall', 'defeated'].includes(a.pose);
      const direction = side === 'player' ? 1 : -1;
      const angle = fallen ? -direction * a.fall * .18 : a.pose === 'attack' && !config.poses.attack?.once ? direction * .07 : a.pose === 'damage' ? -direction * .08 : 0;
      const scaleX = a.pose === 'attack' && !config.poses.attack?.once ? 1.04 : 1;
      const scaleY = fallen ? 1 - a.fall * .60 : (a.pose === 'attack' && !config.poses.attack?.once) || (a.pose === 'walk' && a.frame && !config.poses.walk) ? .98 : 1;
      const xs = [];
      for (const x of [-w / 2, w / 2]) for (const rawY of [-h, 0]) {
        const y = rawY * scaleY, xx = x * scaleX;
        const px = Math.round(a.x) + xx * Math.cos(angle) - y * Math.sin(angle);
        const py = Math.round(a.y) - (fallen ? w / 2 * Math.abs(Math.sin(angle)) : 0) + xx * Math.sin(angle) + y * Math.cos(angle);
        xs.push(px);
        assert.ok(px >= 0 && px <= 320 && py >= 0 && py <= api.HEIGHT, '画像の四隅が切れない');
      }
      bounds[side] = { left:Math.min(...xs), right:Math.max(...xs) };
      if (['fall', 'defeated'].includes(a.pose)) assert.notEqual(side, winner);
      if (a.pose === 'victory') assert.equal(side, winner);
    }
    assert.ok(bounds.cpu.left - bounds.player.right >= 2, '装備を含めた画像が重なりすぎない');
    if (s.player.pose === 'attack' || s.cpu.pose === 'attack') {
      assert.ok(Math.hypot(s.player.x - s.cpu.x, s.player.y - s.cpu.y) < 90, '離れたまま攻撃しない');
    }
  }
  assert.ok(phases.has('entry') && phases.has('approach'));
  for (const side of ['cpu', 'player']) for (const pose of ['idle', 'walk', 'attack', 'damage']) assert.ok(poses[side].has(pose));
  assert.equal(api.sampleScene(10000, winner)[winner].pose, 'victory');
  assert.equal(api.sampleScene(10000, winner)[winner === 'player' ? 'cpu' : 'player'].pose, 'defeated');
}
const draws = [];
for (const [time, phase] of [[0,'entry'],[999,'entry'],[1000,'approach'],[2999,'approach'],[3000,'exchange'],[6999,'exchange'],[7000,'finish'],[7999,'finish'],[8000,'fall'],[8999,'fall'],[9000,'victory']]) {
  assert.equal(api.sampleScene(time, 'player').phase, phase);
}
assert.ok(api.sampleScene(1000,'player').player.x > api.sampleScene(0,'player').player.x);
assert.ok(api.sampleScene(1000,'player').cpu.x < api.sampleScene(0,'player').cpu.x);
assert.ok(api.sampleScene(3500,'player').cpu.x > api.sampleScene(3000,'player').cpu.x, '被弾時の後退');
assert.ok(api.sampleScene(4500,'player').player.x < api.sampleScene(3000,'player').player.x, '反撃でプレイヤーも後退');
const ctx = new Proxy({ drawImage: (...args) => draws.push(args) }, { get: (o, p) => p in o ? o[p] : (() => {}) });
const canvas = { dataset: {}, getContext: () => ctx };
const reset = () => { now = 0; timers.clear(); frames.clear(); };
const step = time => { now = time; const calls = [...frames.values()]; frames.clear(); calls.forEach(cb => cb(time)); };
(async () => {
  for (const [speed, duration] of [[1, 10000], [2, 5000]]) {
    reset(); const run = api.play(canvas, { winner: 'cpu', speed }); let done = false;
    run.finished.then(() => { done = true; });
    step(duration - 1); await Promise.resolve(); assert.equal(done, false);
    step(duration); await run.finished;
    assert.equal(canvas.dataset.winner, 'cpu'); assert.equal(frames.size + timers.size, 0);
  }
  reset();
  const changing = api.play(canvas, { winner: 'player' });
  let changingDone = false; changing.finished.then(() => { changingDone = true; });
  step(2000); changing.setSpeed(2); step(4000); changing.setSpeed(1);
  step(7999); await Promise.resolve(); assert.equal(changingDone, false);
  // 2秒×1 + 2秒×2 + 4秒×1 = 10秒の演出時間。
  step(8000); await changing.finished; assert.equal(canvas.dataset.winner, 'player');
  reset();
  const dropped = api.play(canvas, { winner: 'cpu' }); step(9800); assert.equal(canvas.dataset.scene, 'victory');
  step(15000); await dropped.finished; assert.equal(frames.size + timers.size, 0);
  reset();
  const watchdog = api.play(canvas, { winner: 'player', speed: 2 });
  now = 5250; [...timers.values()][0].cb(); await watchdog.finished; assert.equal(frames.size + timers.size, 0);
  reset();
  const skipped = api.play(canvas, { winner: 'cpu' }); skipped.skip(); skipped.skip(); await skipped.finished;
  assert.equal(canvas.dataset.winner, 'cpu'); assert.equal(frames.size + timers.size, 0);
  reset();
  await api.play(canvas, { winner: 'player', instant: true }).finished;
  assert.equal(frames.size + timers.size, 0);
  await api.play({ dataset: {}, getContext: () => null }, { winner: 'cpu' }).finished;
  await api.play({ dataset: {}, getContext: () => { throw new Error('Canvas unavailable'); } }, { winner: 'cpu' }).finished;
  assert.equal(frames.size + timers.size, 0);
  for(const [i,t] of [3200,3325,3450,3575].entries()) {
    const scene=api.sampleScene(t,'player');
    api.drawScene(canvas,scene);
    assert.equal(canvas.dataset.playerAttacking,'true');
    assert.equal(Number(canvas.dataset.playerFrame),i);
  }
  api.drawScene(canvas,api.sampleScene(3700,'player'));
  assert.equal(canvas.dataset.playerAttacking,'false');
  const impact=api.sampleScene(3500,'player');
  assert.ok(impact.hit>0); assert.equal(impact.cpu.pose,'damage');
  assert.equal(api.spriteFrame('player',impact.player,3500).index,2);
  assert.equal(api.sampleScene(3325,'player').hit,0);
  assert.equal(api.sampleScene(3575,'player').hit,0);
  const tip=api.projectActor(impact.player,'player').x+94;
  const target=api.projectActor(impact.cpu,'cpu').x;
  const targetHalf=api.SPRITES.cpu.height*api.LAYOUT.spriteScale*142/109/2;
  assert.ok(tip>=target-targetHalf && tip<=target+targetHalf, '槍先が相手に届く');
  assert.equal(api.spriteFrame('player',{...impact.player,facing:Math.PI},3500).flip,true);
  assert.equal(api.spriteFrame('player',{...impact.player,attackTime:500},3700).animated,false);
  for(const [i,t]of [4200,4325,4450,4575].entries()) {
    api.drawScene(canvas,api.sampleScene(t,'cpu'));
    assert.equal(canvas.dataset.cpuAttacking,'true'); assert.equal(Number(canvas.dataset.cpuFrame),i);
  }
  api.drawScene(canvas,api.sampleScene(4700,'cpu')); assert.equal(canvas.dataset.cpuAttacking,'false');
  api.drawScene(canvas,api.sampleScene(4800,'cpu'));
  assert.equal(canvas.dataset.cpuWalking,'true');assert.equal(canvas.dataset.cpuFlipped,'true');
  const slap=api.sampleScene(4500,'cpu');
  assert.ok(slap.hit>0);assert.equal(slap.player.pose,'damage');
  assert.equal(api.spriteFrame('cpu',slap.cpu,4500).index,2);
  assert.equal(api.spriteFrame('cpu',slap.cpu,4500).flip,true);
  for(const t of [1100,1250,1400,1550]) api.drawScene(canvas,api.sampleScene(t,'player'));
  assert.ok(draws.length > 0);
  for (const [image, sx, sy, sw, sh, dx, dy, dw, dh] of draws) {
    assert.match(image.source, /assets\/characters\/(spartan_idle|sumo_idle|spartan_walk_4f|spartan_thrust_4f|sumo_walk_4f|sumo_slap_4f)\.png/);
    assert.ok(sw > 0 && sh > 0 && sx >= 0 && sy >= 0 && sx + sw <= (image.source.includes("sumo_slap") ? 2816 : image.source.includes("sumo_walk") ? 1280 : image.source.includes("thrust") ? 3328 : image.source.includes("walk_4f") ? 768 : 192) && sy + sh <= (image.source.includes("sumo_slap") ? 496 : image.source.includes("sumo_walk") ? 336 : image.source.includes("thrust") ? 480 : 192));
    if(image.source.includes('sumo_walk')) {assert.ok(Math.abs(dy/dh+316/336)<1e-10);assert.ok(Math.abs(dx/dw+160/320)<1e-10);} else if(image.source.includes('sumo_slap')) {assert.ok(Math.abs(dy/dh+476/496)<1e-10);assert.ok(Math.abs(dx/dw+256/704)<1e-10);} else if(image.source.includes('thrust')) { assert.ok(Math.abs(dy/dh+460/480)<1e-10); assert.ok(Math.abs(dx/dw+240/832)<1e-10); } else if(image.source.includes('walk_4f')) { const clip=api.SPRITES.player.poses.walk;const i=clip.frames.findIndex(f=>f[0]===sx);assert.equal(dy,-dh);assert.ok(Math.abs(dx + clip.anchors[i][0]*dh/sh)<1e-10);assert.ok(Math.abs(dh/sh-api.SPRITES.player.height*api.LAYOUT.spriteScale/144)<1e-10); } else { assert.equal(dy, -dh); assert.equal(dx, -dw / 2); } // 下端中央を足元に固定
    assert.ok(Math.abs(dw / dh - sw / sh) < 1e-10); // 元の縦横比
  }
  assert.equal(ctx.imageSmoothingEnabled, false);
  console.log('PASS: 2002時点の砂地内/攻撃距離・6ポーズ・確定勝者/敗者のみ転倒・乱数消費ゼロ・1倍10秒/2倍5秒・途中の速度変更・遅延フレーム/期限・スキップ/Canvas未対応');
})().catch(e => { console.error(e); process.exitCode = 1; });
