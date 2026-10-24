(() => {
  'use strict';
  const get = id => document.getElementById(id);
  const handList = get('hand');
  let match = null;
  let selectedId = null;
  let stage = 'title';
  let moving = false;
  let fast = false;
  let mode = 'card';
  let pixelRun = null, pixelRenderer = null;
  const pending = new Set();
  let storage;
  try { storage = window.localStorage; } catch { /* 保存を拒否されても対戦は続行する。 */ }
  const streak = window.HumanityStreak.create(storage);
  const reduced = () => !get('player-fighter').animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function skipEffects() { fast = true; pixelRun?.skip(); for (const finish of [...pending]) finish(); }
  const wait = ms => new Promise(resolve => {
    if (fast || reduced() || document.hidden) { resolve(); return; }
    let timer; const finish = () => { clearTimeout(timer); pending.delete(finish); resolve(); };
    pending.add(finish); timer = setTimeout(finish, ms);
  });
  function effect(element, frames, duration, easing = 'ease-out') {
    if (fast || reduced() || document.hidden) return Promise.resolve();
    return new Promise(resolve => {
      let animation, timer;
      const finish = () => { clearTimeout(timer); pending.delete(finish); animation?.cancel(); resolve(); };
      pending.add(finish);
      try {
        animation = element.animate(frames, {duration, easing, fill:'forwards'});
        animation.finished.then(finish, finish);
        timer = setTimeout(finish, duration + 300); // finishedが返らない環境でも止まらない。
      } catch { finish(); }
    });
  }
  function busy(value) {
    moving = value; get('hand-screen').setAttribute('aria-busy', String(value));
    get('skip-button').hidden = !value;
    get('next-match-button').disabled = value;
    get('battle-mode').disabled = value;
    document.body.style.overflow = value ? 'hidden' : '';
    renderHands();
  }
  async function moveCard(source, target, render) {
    if (fast || reduced() || document.hidden) { render(); return; }
    const origin = source.getBoundingClientRect();
    source.classList.add('motion-choice');
    await effect(source, [{transform:'translateY(0)'},{transform:'translateY(-6px)'}], 150);
    render();
    const hand = target === get('player-fighter') ? 'hand' : 'cpu-hand';
    const placeholder = [...get(hand).querySelectorAll('.card')].find(card=>card.dataset.characterId===source.dataset.characterId);
    if (placeholder) placeholder.style.visibility = 'hidden';
    const destination = target.getBoundingClientRect();
    try {
      target.classList.add('moving-card');
      await effect(target, [
        {transform:`translate(${origin.x-destination.x}px, ${origin.y-6-destination.y}px) scale(${origin.width/destination.width}, ${origin.height/destination.height})`},
        {transform:'translate(0,0) scale(1,1)'}
      ],400,'cubic-bezier(.22,.7,.25,1)');
    } finally {
      source.classList.remove('motion-choice'); target.classList.remove('moving-card');
      if (placeholder) placeholder.style.visibility = '';
    }
  }
  function clearEffects() {
    pixelRun?.skip(); pixelRun = null; pixelRenderer = null;
    get('battle-arena').classList.remove('pixel-active');
    get('pixel-canvas').hidden = true; get('pixel-legend').hidden = true;
    get('hand-screen').dataset.phase='selecting';
    get('burn-effects').replaceChildren(); get('win-banner').hidden = true;
    get('impact-flash').style.opacity = '0';
    for (const id of ['cpu-fighter','player-fighter']) {
      get(id).style.transform = ''; get(id).style.clipPath = ''; get(id).style.visibility = '';
      get(id).classList.remove('winner-card'); get(id).setAttribute('aria-hidden','false');
    }
  }
  function createPixelRenderer(result) {
    pixelRenderer = window.HumanityPixelBattle.createRenderer({
      playerId:result.playerCard.id, cpuId:result.cpuCard.id
    });
    return pixelRenderer;
  }
  function showPixelScene(result, renderer) {
    get('battle-arena').classList.add('pixel-active');
    get('pixel-canvas').hidden = false; get('pixel-legend').hidden = false;
    const labels = {};
    for (const side of ['player','cpu']) {
      const card = side === 'player' ? result.playerCard : result.cpuCard;
      const missing = !renderer.spriteFrame(side, { pose:'idle' }, 0).image;
      labels[side] = `${side === 'player' ? 'あなた' : 'CPU'}：${card.name}${missing ? '（仮表示）' : ''}`;
    }
    get('pixel-legend').querySelector('.blue').textContent = labels.player;
    get('pixel-legend').querySelector('.red').textContent = labels.cpu;
    get('pixel-canvas').setAttribute('aria-label', `${labels.player}、${labels.cpu}の自動戦闘`);
  }

  async function pixelEffects(result) {
    const renderer = createPixelRenderer(result);
    await renderer.ready;
    showPixelScene(result, renderer);
    get('hand-screen').dataset.phase = 'pixel-battle';
    pixelRun = renderer.play(get('pixel-canvas'), {
      winner: result.winner, speed: Number(get('pixel-speed').value) || 1,
      instant: fast || reduced() || Boolean(document.hidden),
      onScene(scene) {
        const messages = { entry:'闘技場へ登場', approach:'接近中', exchange:'攻撃と反撃', circle:'横へ回り込む', retreat:'一度距離を取る', finish:'最後の攻防', fall:'決着', victory:result.winner==='player'?'WIN！ あなた':'WIN！ CPU' };
        const message = messages[scene.phase];
        if(get('turn-status').textContent !== message) get('turn-status').textContent = message;
      }
    });
    try { await pixelRun.finished; } finally { pixelRun = null; }
  }
  async function battleEffects(result) {
    const cpu = get('cpu-fighter'), player = get('player-fighter');
    get('hand-screen').dataset.phase = 'faceoff';
    get('turn-status').textContent = 'カードがそろいました・バトル開始';
    await wait(220);
    get('hand-screen').dataset.phase = 'collision';
    if (!fast && !reduced() && !document.hidden) {
      const a=cpu.getBoundingClientRect(), b=player.getBoundingClientRect();
      const middle=(a.bottom+b.top)/2;
      const cpuImpact=`translateY(${middle-(a.top+a.height/2)}px)`,playerImpact=`translateY(${middle-(b.top+b.height/2)}px)`;
      cpu.style.transform=cpuImpact;player.style.transform=playerImpact;
      await Promise.all([
        effect(cpu,[{transform:'translateY(0)'},{transform:cpuImpact}],220,'cubic-bezier(.6,0,.9,.4)'),
        effect(player,[{transform:'translateY(0)'},{transform:playerImpact}],220,'cubic-bezier(.6,0,.9,.4)')
      ]);
      await Promise.all([
        effect(get('impact-flash'),[{opacity:0},{opacity:.65,offset:.25},{opacity:0}],140),
        effect(get('battle-arena'),[{transform:'translate(0)'},{transform:'translate(-3px,2px)'},{transform:'translate(3px,-2px)'},{transform:'translate(0)'}],180)
      ]);
      cpu.style.transform='';player.style.transform='';
      await Promise.all([effect(cpu,[{transform:cpuImpact},{transform:'translateY(0)'}],180),effect(player,[{transform:playerImpact},{transform:'translateY(0)'}],180)]);
    }
    const winner = result.winner==='player'?player:cpu, loser=result.winner==='player'?cpu:player;
    get('hand-screen').dataset.phase = 'burning';
    loser.dataset.burning = 'true';
    // マスクの上辺が下へ進む。単純な透明度変更ではない。
    loser.style.clipPath = 'inset(100% 0 0 0)';
    const layer=get('burn-effects'), rect=loser.getBoundingClientRect(), arena=get('battle-arena').getBoundingClientRect();
    const flame=document.createElement('div'); flame.className='burn-edge';
    flame.style.left=`${rect.left-arena.left}px`; flame.style.top=`${rect.top-arena.top}px`; flame.style.width=`${rect.width}px`;
    layer.append(flame);
    const sparks=[];
    if (!fast && !reduced() && !document.hidden) for(let i=0;i<10;i++) {
      const spark=document.createElement('span'); spark.className='ember'; spark.style.left=`${(i*37)%100}%`; flame.append(spark);
      sparks.push(effect(spark,[{transform:'translate(0,0)',opacity:0},{opacity:1,offset:.25},{transform:`translate(${i%2?12:-12}px,-28px)`,opacity:0}],650+i*25));
    }
    await Promise.all([
      effect(loser,[{clipPath:'inset(0% 0 0 0)'},{clipPath:'inset(100% 0 0 0)'}],1000,'linear'),
      effect(flame,[{transform:'translateY(0)'},{transform:`translateY(${rect.height}px)`}],1000,'linear'),...sparks
    ]);
    layer.replaceChildren(); loser.style.visibility='hidden'; loser.setAttribute('aria-hidden','true'); loser.dataset.burning='false';
    get('hand-screen').dataset.phase = 'win';
    winner.classList.add('winner-card');
    get('win-banner').textContent = result.winner==='player'?'WIN！ あなた':'WIN！ CPU';
    get('win-banner').hidden = false;
    await wait(450);
  }


  function profileContent(card, character) {
    const name = document.createElement('span');
    name.className = 'card-name'; name.textContent = character.name;
    const profile = document.createElement('span');
    profile.className = 'card-profile';
    profile.textContent = `${character.age}歳 / ${character.height}cm / ${character.weight}kg`;
    card.append(name, profile);
  }

  function renderPlayerFighter() {
    get('player-fighter').replaceChildren();
    const character = match.playerHand.find(c => c.id === selectedId);
    if (character) profileContent(get('player-fighter'), character);
    else {
      const empty = document.createElement('span'); empty.className = 'empty-fighter';
      empty.textContent = '手札からカードを選んでください'; get('player-fighter').append(empty);
    }
  }

  function renderHands() {
    handList.replaceChildren(); get('cpu-hand').replaceChildren();
    for (const [side, hand, usedIds] of [
      ['cpu', match.cpuHand, match.usedCpuIds], ['player', match.playerHand, match.usedPlayerIds]
    ]) {
      for (const character of hand) {
        const used = usedIds.includes(character.id);
        const item = document.createElement('li');
        const card = document.createElement(side === 'player' ? 'button' : 'article');
        card.className = used ? 'card used' : 'card';
        card.dataset.characterId = character.id;
        profileContent(card, character);
        if (side === 'player') {
          card.type = 'button'; card.dataset.characterId = character.id;
          card.setAttribute('aria-pressed', String(!used && selectedId === character.id));
          card.disabled = used || stage !== 'hand' || moving;
          card.addEventListener('click', () => selectCard(character));
        }
        if (used || side === 'player') {
          const label = document.createElement('span');
          label.className = side === 'player' ? 'selection-label' : 'used-label';
          label.textContent = used ? '対戦済み' : stage === 'finished' ? '未選択' : selectedId === character.id ? '選択中' : 'タップして選択';
          card.append(label);
        }
        (side === 'player' ? handList : get('cpu-hand')).append(item);
        item.append(card);
      }
    }
    get('next-match-button').hidden = stage !== 'finished';
    get('next-match-button').disabled = moving || stage !== 'finished';
  }

  function renderStreak() {
    const score = streak.snapshot();
    get('current-streak').textContent = String(score.current);
    get('best-streak').textContent = String(score.best);
    get('best-streak').title = score.storageAvailable ? '最高連勝数を保存しています' : '保存を利用できないため、このページ内で記録します';
  }

  async function streakEffects(update) {
    const notice = get('streak-notice');
    notice.hidden = false;
    notice.className = update.milestone ? 'streak-notice milestone' : 'streak-notice';
    notice.dataset.milestone = update.milestone ? String(update.milestone) : '';
    if (update.winner === 'draw') { notice.textContent = '引き分け・連勝数はそのまま！'; return; }
    if (update.winner !== 'player') { notice.hidden = true; return; }
    const celebrations = {5:'5連勝！快進撃！',10:'10連勝！止まらない！',20:'20連勝！伝説の連勝！'};
    notice.textContent = celebrations[update.milestone] || `${update.current}連勝！`;
    get('hand-screen').dataset.phase = 'streak';
    const duration = update.milestone ? 750 : 300;
    await Promise.all([
      effect(get('current-streak'),[{transform:'scale(1)'},{transform:'scale(1.3)',color:'#fff5be',offset:.45},{transform:'scale(1)'}],duration),
      effect(notice,update.milestone
        ? [{transform:'scale(.94)',boxShadow:'0 0 0 #ffc45e00'},{transform:'scale(1.03)',boxShadow:'0 0 24px #ffc45eaa',offset:.5},{transform:'scale(1)',boxShadow:'0 0 8px #ffc45e55'}]
        : [{opacity:.3,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],duration)
    ]);
  }

  function renderTurn() {
    get('turn-status').textContent = 'CPUのカードを見て、1枚選んでください';
    showCpuFighter(match.cpuCard, false);
  }

  function showCpuFighter(character, animate = true) {
    get('cpu-fighter').classList.remove('revealed');
    const front = document.createElement('div'); front.className = 'card fighter-card';
    profileContent(front, character);
    get('cpu-fighter').replaceChildren(front);
    if (animate) get('cpu-fighter').classList.add('revealed');
  }

  async function selectCard(character) {
    if (moving || stage !== 'hand' || match.usedPlayerIds.includes(character.id)) return;
    const source=[...handList.querySelectorAll('.card')].find(card=>card.dataset.characterId===character.id);
    selectedId=character.id; stage='placing'; fast=reduced() || Boolean(document.hidden);
    source.setAttribute('aria-pressed','true'); busy(true);
    get('hand-screen').dataset.phase='placing';
    get('turn-status').textContent='あなたのカードを配置中';
    // 判定は一度だけ。以降の演出は同じ保存結果を使う。
    let result;
    try {
      await moveCard([...handList.querySelectorAll('.card')].find(card=>card.dataset.characterId===character.id),get('player-fighter'),()=>{renderHands();renderPlayerFighter();});
      stage='battling';
      result=window.HumanityMatch.playRound(match,selectedId);
      if (result.winner === 'draw') {
        get('turn-status').textContent = '引き分け';
        await wait(300);
      } else if (mode === 'pixel') await pixelEffects(result);
      else await battleEffects(result);
    } finally {
      // 演出だけが失敗しても、確定済みの結果を失わない。
      try { if(result) await finishRound(result); } finally {
        busy(false);
        if (result) get('next-match-button').focus({preventScroll:true});
      }
    }
  }

  function newMatch() {
    clearEffects();
    match = window.HumanityMatch.deal(window.CHARACTERS);
    selectedId = null; stage = 'hand';
    renderHands(); renderPlayerFighter(); renderTurn();
    get('next-match-button').hidden = true;
    get('streak-notice').hidden = true;
    get('battle-status').textContent = '';
    clearResult();
    get('status').textContent = '1試合で勝敗が決まります。';
  }

  async function finishRound(result) {
    stage = 'finished';
    const update = streak.record(result);
    renderStreak();
    await streakEffects(update);
    const outcome = result.winner === 'player' ? 'あなたの勝利！' : result.winner === 'cpu' ? 'CPUの勝利。' : '引き分け。';
    get('battle-status').textContent = outcome;
    renderHands(); renderResult(result);
    get('turn-status').textContent = '対戦終了';
    get('status').textContent = '「次の対戦」で新しい組み合わせに挑戦できます。';
    get('hand-screen').dataset.phase = 'result';
  }

  function clearResult() {
    get('round-result').hidden = true;
    get('result-stats').replaceChildren();
    get('result-probability').textContent = '';
    get('result-reason').textContent = '';
    get('result-finish').textContent = '';
    get('result-headline').textContent = '';
  }

  function renderResult(result) {
    const decision = result.decision;
    get('result-title').textContent = result.winner === 'player' ? '勝利' : result.winner === 'cpu' ? '敗北' : '引き分け';
    get('result-probability').textContent = `対戦前の勝率：あなた ${decision.playerWinPercent}% ／ CPU ${100 - decision.playerWinPercent}%`;
    get('result-stats').replaceChildren();
    for (const stat of window.HumanityBattle.STATS) {
      const row = document.createElement('tr');
      const label = document.createElement('th'); label.setAttribute('scope', 'row'); label.textContent = window.HumanityBattle.STAT_LABELS[stat];
      row.append(label);
      for (const value of [decision.playerStats[stat], decision.cpuStats[stat]]) {
        const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
      }
      get('result-stats').append(row);
    }
    const commentary = result.story;
    get('result-headline').textContent = commentary.headline;
    get('result-reason').textContent = commentary.body;
    get('result-finish').textContent = `決まり手：${commentary.finish}`;
    get('round-result').hidden = false;
  }

  get('start-button').addEventListener('click', () => {
    if (stage !== 'title') return;
    newMatch(); document.querySelector('main').classList.add('playing'); document.body.classList.add('in-game');
    get('title-screen').hidden = true; get('hand-screen').hidden = false;
    get('hand-title').focus(); window.scrollTo({ top: 0, behavior: 'instant' });
  });
  get('skip-button').addEventListener('click', skipEffects);
  get('pixel-speed').addEventListener('change', () => pixelRun?.setSpeed(Number(get('pixel-speed').value)));
  get('battle-mode').addEventListener('change', async () => {
    if (moving) { get('battle-mode').value = mode; return; }
    mode = get('battle-mode').value === 'pixel' ? 'pixel' : 'card';
    get('pixel-speed-label').hidden = mode !== 'pixel';
    if (['result', 'finished'].includes(stage)) {
      const result = match.rounds.at(-1);
      clearEffects();
      get('hand-screen').dataset.phase = 'result';
      if (result.winner === 'draw') {
        get('win-banner').hidden = true;
      } else if (mode === 'pixel') {
        const renderer = createPixelRenderer(result);
        await renderer.ready;
        if (pixelRenderer !== renderer) return;
        showPixelScene(result, renderer);
        renderer.drawScene(get('pixel-canvas'), renderer.sampleScene(renderer.DURATION, result.winner));
      } else {
        const winner = get(result.winner === 'player' ? 'player-fighter' : 'cpu-fighter');
        const loser = get(result.winner === 'player' ? 'cpu-fighter' : 'player-fighter');
        loser.style.visibility = 'hidden'; loser.setAttribute('aria-hidden', 'true');
        winner.classList.add('winner-card');
        get('win-banner').textContent = result.winner === 'player' ? 'WIN！ あなた' : 'WIN！ CPU';
        get('win-banner').hidden = false;
      }
    }
  });
  document.addEventListener?.('keydown', event=>{if(event.key==='Escape'&&moving)skipEffects();});
  document.addEventListener?.('visibilitychange', () => { if(document.hidden) skipEffects(); });
  if(window.matchMedia) window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', event=>{if(event.matches)skipEffects();});
  get('next-match-button').addEventListener('click', () => {
    if (moving || stage !== 'finished') return;
    newMatch();
    get('hand-title').focus({preventScroll:true});
    window.scrollTo({top:0,behavior:'instant'});
  });
  renderStreak();
})();
