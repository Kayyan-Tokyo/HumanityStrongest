(() => {
  'use strict';
  // 描画専用。能力値・判定API・乱数は参照しない。
  const WIDTH = 320, HEIGHT = 240, DURATION = 10000;
  // 演出専用の固定配役。正式キャラクターのIDや能力とは対応させない。
  // frameは透過余白を除いた矩形。将来はposesにスプライトシートのコマを追加する。
  const SPRITES = {
    player: { sourceFacing:1, src:'./assets/characters/spartan_idle.png', height:56, frame:[22,45,147,139], poses:{ attack:{ src:'./assets/characters/spartan_thrust_4f.png', once:true, duration:500, hitOffset:[94,48], anchor:[240,460], referenceHeight:453, frames:[[0,0,832,480],[832,0,832,480],[1664,0,832,480],[2496,0,832,480]] }, walk:{ src:'./assets/characters/spartan_walk_4f.png', fps:7, referenceHeight:144, anchors:[[80.5,142],[87,142],[81.5,145],[85.5,144]], frames:[[31,34,153,142],[202,35,160,142],[414,14,150,145],[593,16,160,144]] } } },
    cpu: { sourceFacing:1, src:'./assets/characters/sumo_idle.png', height:52, frame:[25,75,142,109], poses:{ walk:{ src:'./assets/characters/sumo_walk_4f.png', fps:6, anchor:[160,316], referenceHeight:300, frames:[[0,0,320,336],[320,0,320,336],[640,0,320,336],[960,0,320,336]] }, attack:{ src:'./assets/characters/sumo_slap_4f.png', once:true, duration:500, hitOffset:[61,47], anchor:[256,476], referenceHeight:458, frames:[[0,0,704,496],[704,0,704,496],[1408,0,704,496],[2112,0,704,496]] } } }
  };
  // 表示専用。元の移動軌道・演出時間は変えず、拡大した画像の余白を確保する。
  const LAYOUT = { spriteScale:1.35, separation:18, edgePadding:8 };
  function projectActor(actor, side) {
    const config = SPRITES[side];
    const halfWidth = config.height * LAYOUT.spriteScale * config.frame[2] / config.frame[3] / 2;
    const margin = halfWidth + LAYOUT.edgePadding;
    const attackOffset = side === 'cpu' && actor.pose === 'attack' ? 8 * Math.sin(actor.attackTime / 500 * Math.PI) : 0;
    return { ...actor, x:Math.max(margin, Math.min(WIDTH - margin, actor.x + (side === 'player' ? -LAYOUT.separation : LAYOUT.separation) - attackOffset)) };
  }
  // 向きは移動速度や陣営から独立。完全な同座標では直前の向きを保つ。
  function resolveFacing(character, opponent, previous = 1) {
    return opponent.x > character.x ? 1 : opponent.x < character.x ? -1 : previous === -1 ? -1 : 1;
  }
  const facingStates = new WeakMap();
  const images = {};
  const sources = Object.entries(SPRITES).flatMap(([side, config]) => [
    [side, config.src], ...Object.entries(config.poses).map(([pose, clip]) => [side + ':' + pose, clip.src])
  ]);
  const ready = Promise.all(sources.map(([key, src]) => new Promise(resolve => {
    if (typeof Image === 'undefined') { resolve(); return; }
    const image = new Image();
    const timer = setTimeout(() => resolve(), 5000);
    image.onload = () => { clearTimeout(timer); images[key] = image; resolve(); };
    image.onerror = () => { clearTimeout(timer); resolve(); };
    image.src = src;
  })));
  // 経過時間でコマを選ぶ共通処理。速度変更は既存の演出時間に追従する。
  function spriteFrame(side, actor, time) {
    const config = SPRITES[side], clip = config.poses[actor.pose] && (actor.moving || config.poses[actor.pose].once) && config.poses[actor.pose];
    const animated = Boolean(clip && images[side + ':' + actor.pose] && (!clip.once || (actor.attackTime >= 0 && actor.attackTime < clip.duration)));
    const index = animated ? clip.once ? Math.min(clip.frames.length - 1, Math.floor(actor.attackTime / (clip.duration / clip.frames.length))) : Math.floor(time * clip.fps / 1000) % clip.frames.length : 0;
    return { image:animated ? images[side + ':' + actor.pose] : images[side],
      frame:animated ? clip.frames[index] : config.frame, index, animated, clip:animated ? clip : null,
      flip:(actor.facingDirection ?? (actor.facing === Math.PI ? -1 : 1)) !== (animated && clip.sourceFacing || config.sourceFacing || 1) };
  }
  const GROUND_Y = 212;
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const ease = n => { const p = clamp(n, 0, 1); return p * p * (3 - 2 * p); };

  function sampleScene(milliseconds, winner) {
    if (!['player', 'cpu'].includes(winner)) throw new Error('確定済みの勝者が必要です。');
    const t = clamp(milliseconds, 0, DURATION);
    const loser = winner === 'player' ? 'cpu' : 'player';
    const entry = ease(t / 1000), approach = ease((t - 1000) / 2000);
    const actors = {
      player: { x:36 + 56 * entry + 30 * approach, y:GROUND_Y, pose:t < 3000 ? 'walk' : 'idle' },
      cpu: { x:284 - 56 * entry - 30 * approach, y:GROUND_Y, pose:t < 3000 ? 'walk' : 'idle' }
    };
    let phase = t < 1000 ? 'entry' : 'approach', attack = null, hit = 0;
    if (t >= 3000 && t < 8000) {
      phase = t < 7000 ? 'exchange' : 'finish';
      const progress = ((t - 3000) % 1000) / 1000;
      attack = t >= 7000 ? winner : Math.floor((t - 3000) / 1000) % 2 === 0 ? 'player' : 'cpu';
      const defender = attack === 'player' ? 'cpu' : 'player';
      const direction = attack === 'player' ? 1 : -1;
      const lunge = Math.sin(progress * Math.PI);
      hit = progress >= .40 && progress < .70 ? Math.sin((progress - .40) / .30 * Math.PI) : 0;
      actors[attack].x += direction * lunge * (t >= 7000 ? 16 : 12);
      actors[defender].x += direction * Math.sin(clamp((progress - .4) / .6, 0, 1) * Math.PI) * 8;
      actors[attack].pose = 'attack';
      actors[defender].pose = progress >= .4 ? 'damage' : 'idle';
      if (attack === 'player') {
        actors.player.attackTime = progress * 1000 - 200;
        actors.player.pose = progress >= .2 && progress < .7 ? 'attack' : 'idle';
        actors.cpu.pose = progress >= .45 && progress < .7 ? 'damage' : 'idle';
        hit = progress >= .45 && progress < .575 ? Math.sin((progress - .45) / .125 * Math.PI) : 0;
      } else {
        actors.cpu.attackTime = progress * 1000 - 200;
        actors.cpu.pose = progress >= .2 && progress < .7 ? 'attack' : 'idle';
        actors.player.pose = progress >= .45 && progress < .7 ? 'damage' : 'idle';
        hit = progress >= .45 && progress < .575 ? Math.sin((progress - .45) / .125 * Math.PI) : 0;
      }

    }
    if (t >= 8000) {
      actors[loser].x += loser === 'cpu' ? 10 : -10;
      actors[loser].pose = t < 9000 ? 'fall' : 'defeated';
      actors[winner].pose = t < 9000 ? 'idle' : 'victory';
      phase = t < 9000 ? 'fall' : 'victory';
    }
    for (const side of ['cpu', 'player']) {
      actors[side].facing = resolveFacing(actors[side], actors[side === 'player' ? 'cpu' : 'player']) === 1 ? 0 : Math.PI;
      actors[side].frame = Math.floor(t / 120) % 2;
      actors[side].fall = actors[side].pose === 'defeated' ? 1 : clamp((t - 8000) / 1000, 0, 1);
    }
    return { time:t, phase, winner, loser, hit, ...actors };
  }

  // 16×24ピクセルの仮キャラを1.5倍で描く。足元を基準に奥から描画する。
  function drawActor(ctx, actor, side, time) {
    if (images[side]) { drawSprite(ctx, actor, side, time); return; }
    const fallen = actor.pose === 'fall' || actor.pose === 'defeated';
    const walk = actor.pose === 'walk' ? actor.frame * 2 - 1 : 0;
    const bob = actor.pose === 'idle' ? Math.floor(time / 400) % 2 : 0;
    ctx.fillStyle = '#00000066';
    ctx.beginPath(); ctx.ellipse(actor.x, actor.y + 1, fallen ? 18 : 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(Math.round(actor.x), Math.round(actor.y));
    if (fallen) { ctx.rotate(-actor.facingDirection * actor.fall * Math.PI / 2); ctx.scale(1, 1 - actor.fall * .25); }
    ctx.scale(1.5, 1.5);
    ctx.translate(-8, -24 + bob);
    const suit = side === 'player' ? '#439dff' : '#f36162';
    const dark = side === 'player' ? '#173e89' : '#8a252d';
    const skin = actor.pose === 'damage' && actor.frame ? '#fff1cf' : '#e9b888';
    ctx.fillStyle = '#111727'; // 輪郭・靴
    ctx.fillRect(3, 2, 10, 9); ctx.fillRect(2, 11, 12, 9);
    ctx.fillRect(3, 21 + walk, 4, 3); ctx.fillRect(9, 21 - walk, 4, 3);
    ctx.fillStyle = skin; ctx.fillRect(4, 4, 8, 6);
    ctx.fillStyle = dark; ctx.fillRect(3, 2, 10, 3);
    ctx.fillStyle = '#171b28'; ctx.fillRect(5, 6, 1, 1); ctx.fillRect(10, 6, 1, 1);
    ctx.fillStyle = actor.pose === 'damage' && actor.frame ? '#ffe0a1' : suit;
    ctx.fillRect(4, 11, 8, 8); ctx.fillStyle = dark;
    ctx.fillRect(4, 19, 3, 3 + walk); ctx.fillRect(9, 19, 3, 3 - walk);
    ctx.fillStyle = skin;
    if (actor.pose === 'victory') {
      ctx.fillRect(1, 7, 3, 7); ctx.fillRect(12, 7, 3, 7);
      ctx.fillRect(0, 5, 4, 3); ctx.fillRect(12, 5, 4, 3);
    } else {
      ctx.fillRect(1, 12 - walk, 3, 6); ctx.fillRect(12, 12 + walk, 3, 6);
    }
    if (actor.pose === 'attack') {
      const reach = 6 + actor.frame * 4;
      ctx.fillStyle = suit;
      ctx.fillRect(6 + Math.round(Math.cos(actor.facing) * reach), 12 + Math.round(Math.sin(actor.facing) * reach), 4, 4);
      ctx.fillStyle = '#f8d6a5';
      ctx.fillRect(6 + Math.round(Math.cos(actor.facing) * (reach + 3)), 12 + Math.round(Math.sin(actor.facing) * (reach + 3)), 4, 4);
    }
    if (actor.pose === 'damage') {
      ctx.fillStyle = '#ffdf80';
      ctx.fillRect(0, 9, 3, 2); ctx.fillRect(13, 8, 3, 2);
    }
    ctx.restore();
  }

  function drawSprite(ctx, actor, side, time) {
    const config = SPRITES[side];
    const selected = spriteFrame(side, actor, time), frame = selected.frame;
    const height = config.height * LAYOUT.spriteScale * (selected.clip?.referenceHeight ? frame[3] / selected.clip.referenceHeight : 1), width = height * frame[2] / frame[3];
    const anchor = selected.clip?.anchors?.[selected.index] || selected.clip?.anchor;
    const dx = anchor ? -anchor[0] * height / frame[3] : -width / 2;
    const dy = anchor ? -anchor[1] * height / frame[3] : -height;
    const fallen = actor.pose === 'fall' || actor.pose === 'defeated';
    // 影と画像が同じ足元座標を使う。歩行中も上下へ浮かせない。
    ctx.fillStyle = '#00000066';
    ctx.beginPath(); ctx.ellipse(actor.x, actor.y + 1, config.height * LAYOUT.spriteScale * config.frame[2] / config.frame[3] * .30, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(Math.round(actor.x), Math.round(actor.y) - (fallen ? width / 2 * Math.sin(actor.fall * .18) : 0));
    if (fallen) { ctx.rotate(-actor.facingDirection * actor.fall * .18); ctx.scale(1, 1 - actor.fall * .60); }
    if (actor.pose === 'walk' && !selected.animated && !config.poses.walk) ctx.scale(1, actor.frame ? .98 : 1);
    if (actor.pose === 'attack' && !selected.clip?.once) { ctx.rotate(actor.facingDirection * .07); ctx.scale(1.04, .98); }
    if (actor.pose === 'damage') ctx.rotate(-actor.facingDirection * .08);
    if (selected.flip) ctx.scale(-1, 1);
    ctx.drawImage(selected.image, ...frame, dx, dy, width, height);
    if ((actor.pose === 'attack' && !selected.clip?.once) || actor.pose === 'damage') {
      ctx.fillStyle = actor.pose === 'attack' ? '#ffe2a2' : '#ffb476';
      ctx.fillRect(config.sourceFacing === -1 ? -width / 2 - 3 : width / 2, -height / 2, 3, 3);
    }
    if (actor.pose === 'victory') {
      ctx.fillStyle = '#ffe2a2'; ctx.fillRect(-width / 2 - 4, -height + 5, 3, 3);
      ctx.fillRect(width / 2 + 1, -height + 5, 3, 3);
    }
    ctx.restore();
  }

  function drawScene(canvas, scene) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.imageSmoothingEnabled = false;
    let state = facingStates.get(canvas);
    if (!state || scene.time < state.time) { state = { time:scene.time, directions:{} }; facingStates.set(canvas,state); }
    state.time = scene.time;
    const actors = { player:projectActor(scene.player,'player'), cpu:projectActor(scene.cpu,'cpu') };
    for (const side of ['cpu', 'player']) {
      const actor = actors[side], opponent = actors[side === 'player' ? 'cpu' : 'player'];
      actor.facingDirection = resolveFacing(actor,opponent,state.directions[side]);
      state.directions[side] = actor.facingDirection;
      actor.facing = actor.facingDirection === 1 ? 0 : Math.PI;
    }
    for (const side of ['cpu', 'player'].sort((a, b) => scene[a].y - scene[b].y)) {
      const actor = actors[side];
      const a = projectActor(sampleScene(Math.max(0, scene.time - 5), scene.winner)[side], side);
      const b = projectActor(sampleScene(Math.min(DURATION, scene.time + 5), scene.winner)[side], side);
      // 力士の構えへの戻りも、移動している間は歩行画像を使う。軌道は変更しない。
      if (side === 'cpu' && actor.pose === 'idle' && Math.abs(b.x - a.x) > .001) actor.pose = 'walk';
      actor.moving = actor.pose === 'walk' && Math.abs(b.x - a.x) > .001;
      actor.direction = Math.sign(b.x - a.x);
      const selected = spriteFrame(side, actor, scene.time);
      canvas.dataset[side + 'Frame'] = String(selected.index);
      canvas.dataset[side + 'Walking'] = String(selected.animated && actor.pose === 'walk');
      canvas.dataset[side + 'Attacking'] = String(selected.animated && actor.pose === 'attack');
      canvas.dataset[side + 'Flipped'] = String(selected.flip);
      canvas.dataset[side + 'Facing'] = String(actor.facingDirection);
      drawActor(ctx, actor, side, scene.time);
    }
    if (scene.hit > 0) {
      const attacker = ['player','cpu'].find(side => actors[side].pose === 'attack');
      const offset = attacker && SPRITES[attacker].poses.attack?.hitOffset;
      const x = offset ? actors[attacker].x + actors[attacker].facingDirection * offset[0] : (actors.player.x + actors.cpu.x) / 2;
      const y = GROUND_Y - (offset ? offset[1] : 30);
      ctx.globalAlpha = scene.hit; ctx.fillStyle = '#ffe8a1';
      ctx.fillRect(x - 6, y - 1, 12, 2); ctx.fillRect(x - 1, y - 6, 2, 12);
      ctx.globalAlpha = 1;
    }
    canvas.dataset.scene = scene.phase;
    canvas.dataset.winner = scene.phase === 'victory' ? scene.winner : '';
    canvas.dataset.playerPose = scene.player.pose;
    canvas.dataset.cpuPose = scene.cpu.pose;
    if (scene.phase === 'victory') {
      ctx.fillStyle = '#100e19df'; ctx.fillRect(64, 14, 192, 27);
      ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe2a2'; ctx.fillText(`WIN！ ${scene.winner === 'player' ? 'あなた' : 'CPU'}`, 160, 33);
    }
    return true;
  }

  function play(canvas, { winner, speed = 1, instant = false, onScene = () => {} }) {
    let elapsed = 0, last = performance.now(), rate = speed === 2 ? 2 : 1;
    let frameId, timerId, stopped = false, resolve;
    const finished = new Promise(done => { resolve = done; });
    const paint = () => {
      const scene = sampleScene(elapsed, winner);
      onScene(scene);
      return drawScene(canvas, scene);
    };
    const advance = now => { elapsed = Math.min(DURATION, elapsed + Math.max(0, now - last) * rate); last = now; };
    const finish = () => {
      if (stopped) return;
      stopped = true; elapsed = DURATION;
      if (frameId !== undefined) cancelAnimationFrame(frameId);
      clearTimeout(timerId);
      try { paint(); } catch { /* Canvasが利用できなくても保存済み結果へ進む。 */ } finally { resolve(); }
    };
    const armDeadline = () => {
      clearTimeout(timerId);
      // rAFが停止しても、壁時計の期限で同じ確定結果へ進む。
      timerId = setTimeout(finish, (DURATION - elapsed) / rate + 250);
    };
    const tick = now => {
      if (stopped) return;
      advance(now);
      if (elapsed >= DURATION) { finish(); return; }
      try { paint(); } catch { finish(); return; }
      frameId = requestAnimationFrame(tick);
    };
    const control = {
      finished, skip: finish,
      setSpeed(value) {
        if (stopped || ![1, 2].includes(value)) return;
        advance(performance.now()); rate = value;
        if (elapsed >= DURATION) finish(); else armDeadline();
      }
    };
    try {
      if (instant || !paint()) finish();
      else { armDeadline(); frameId = requestAnimationFrame(tick); }
    } catch { finish(); }
    return control;
  }

  window.HumanityPixelBattle = { WIDTH, HEIGHT, DURATION, GROUND_Y, SPRITES, LAYOUT, projectActor, resolveFacing, spriteFrame, ready, sampleScene, drawScene, play };
})();
