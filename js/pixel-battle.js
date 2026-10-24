(() => {
  'use strict';
  // 描画専用。能力値・判定API・乱数は参照しない。
  const WIDTH = 320, HEIGHT = 200, DURATION = 10000;
  // 演出専用の固定配役。正式キャラクターのIDや能力とは対応させない。
  // frameは透過余白を除いた矩形。将来はposesにスプライトシートのコマを追加する。
  const SPRITES = {
    player: { src:'./assets/characters/spartan_idle.png', height:46, frame:[22,45,147,139], poses:{} },
    cpu: { src:'./assets/characters/sumo_idle.png', height:42, frame:[25,75,142,109], poses:{} }
  };
  const images = {};
  const ready = Promise.all(Object.entries(SPRITES).map(([side, config]) => new Promise(resolve => {
    if (typeof Image === 'undefined') { resolve(); return; }
    const image = new Image();
    const timer = setTimeout(() => resolve(), 5000);
    image.onload = () => { clearTimeout(timer); images[side] = image; resolve(); };
    image.onerror = () => { clearTimeout(timer); resolve(); };
    image.src = config.src;
  })));
  const marks = [
    [0, .50, .38, .50, .81], [650, .50, .38, .50, .81],
    [2000, .46, .50, .54, .66], [3200, .46, .50, .54, .66],
    [4000, .62, .52, .44, .66], [4600, .55, .52, .46, .66],
    [5600, .55, .52, .46, .66], [6800, .63, .42, .35, .77],
    [8000, .53, .52, .46, .66], [10000, .53, .52, .46, .66]
  ];
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));

  function sampleScene(milliseconds, winner) {
    if (!['player', 'cpu'].includes(winner)) throw new Error('確定済みの勝者が必要です。');
    const t = clamp(milliseconds, 0, DURATION);
    const index = marks.findIndex((mark, i) => i > 0 && t <= mark[0]);
    const end = marks[index < 0 ? marks.length - 1 : index];
    const start = marks[Math.max(0, (index < 0 ? marks.length - 1 : index) - 1)];
    const ratio = clamp((t - start[0]) / (end[0] - start[0]), 0, 1);
    const blend = ratio * ratio * (3 - 2 * ratio);
    const position = column => start[column] + (end[column] - start[column]) * blend;
    const actors = {
      cpu: { x: position(1) * WIDTH, y: position(2) * HEIGHT, pose: 'idle' },
      player: { x: position(3) * WIDTH, y: position(4) * HEIGHT, pose: 'idle' }
    };
    let phase = 'entry', attack = null;
    if (t >= 650 && t < 2000) phase = 'approach';
    if (t >= 2000 && t < 3200) { phase = 'exchange'; attack = t < 2600 ? 'cpu' : 'player'; }
    if (t >= 3200 && t < 4600) phase = 'circle';
    if (t >= 4600 && t < 5600) { phase = 'exchange'; attack = t < 5100 ? 'player' : 'cpu'; }
    if (t >= 5600 && t < 6800) phase = 'retreat';
    if (t >= 6800 && t < 8000) phase = 'approach';
    if (t >= 8000 && t < 8500) { phase = 'exchange'; attack = winner === 'player' ? 'cpu' : 'player'; }
    if (t >= 8500 && t < 9000) { phase = 'finish'; attack = winner; }
    const loser = winner === 'player' ? 'cpu' : 'player';
    if (['approach', 'circle', 'retreat'].includes(phase)) {
      actors.cpu.pose = actors.player.pose = 'walk';
    }
    if (attack) {
      actors[attack].pose = 'attack';
      actors[attack === 'player' ? 'cpu' : 'player'].pose = 'damage';
    }
    if (t >= 9000) {
      phase = t < 9400 ? 'fall' : 'victory';
      actors[loser].pose = t < 9400 ? 'fall' : 'defeated';
      actors[winner].pose = t < 9400 ? 'idle' : 'victory';
    }
    for (const side of ['cpu', 'player']) {
      const actor = actors[side], other = actors[side === 'cpu' ? 'player' : 'cpu'];
      actor.facing = Math.atan2(other.y - actor.y, other.x - actor.x);
      actor.frame = Math.floor(t / 120) % 2;
      actor.fall = actor.pose === 'defeated' ? 1 : clamp((t - 9000) / 400, 0, 1);
    }
    return { time: t, phase, winner, loser, ...actors };
  }

  // 16×24ピクセルの仮キャラを1.5倍で描く。足元を基準に奥から描画する。
  function drawActor(ctx, actor, side, time) {
    if (images[side]) { drawSprite(ctx, actor, side); return; }
    const fallen = actor.pose === 'fall' || actor.pose === 'defeated';
    const walk = actor.pose === 'walk' ? actor.frame * 2 - 1 : 0;
    const bob = actor.pose === 'idle' ? Math.floor(time / 400) % 2 : 0;
    ctx.fillStyle = '#00000066';
    ctx.beginPath(); ctx.ellipse(actor.x, actor.y + 1, fallen ? 18 : 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(Math.round(actor.x), Math.round(actor.y));
    if (fallen) { ctx.rotate(actor.fall * Math.PI / 2); ctx.scale(1, 1 - actor.fall * .25); }
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

  function drawSprite(ctx, actor, side) {
    const config = SPRITES[side];
    const frames = config.poses[actor.pose] || [config.frame];
    const frame = frames[actor.frame % frames.length];
    const height = config.height, width = height * frame[2] / frame[3];
    const fallen = actor.pose === 'fall' || actor.pose === 'defeated';
    // 影と画像が同じ足元座標を使う。歩行中も上下へ浮かせない。
    ctx.fillStyle = '#00000066';
    ctx.beginPath(); ctx.ellipse(actor.x, actor.y + 1, width * .30, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(Math.round(actor.x), Math.round(actor.y));
    if (fallen) { ctx.rotate(actor.fall * Math.PI / 2); ctx.scale(1, 1 - actor.fall * .25); }
    if (side === 'cpu') ctx.scale(-1, 1);
    ctx.drawImage(images[side], ...frame, -width / 2, -height, width, height);
    if (actor.pose === 'attack' || actor.pose === 'damage') {
      ctx.fillStyle = actor.pose === 'attack' ? '#ffe2a2' : '#ffb476';
      ctx.fillRect(side === 'cpu' ? -width / 2 - 3 : width / 2, -height / 2, 3, 3);
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
    for (const side of ['cpu', 'player'].sort((a, b) => scene[a].y - scene[b].y)) drawActor(ctx, scene[side], side, scene.time);
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

  window.HumanityPixelBattle = { WIDTH, HEIGHT, DURATION, SPRITES, ready, sampleScene, drawScene, play };
})();
