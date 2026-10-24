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
  let pixelRun = null;
  const pending = new Set();
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
    get('return-button').disabled = value;
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
    pixelRun?.skip(); pixelRun = null;
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
  function showPixelScene(result) {
    get('battle-arena').classList.add('pixel-active');
    get('pixel-canvas').hidden = false; get('pixel-legend').hidden = false;
    get('pixel-canvas').setAttribute('aria-label', `あなた：${result.playerCard.name}（スパルタ兵の仮画像）、CPU：${result.cpuCard.name}（力士の仮画像）の自動戦闘`);
  }

  async function pixelEffects(result) {
    await window.HumanityPixelBattle.ready;
    showPixelScene(result);
    get('hand-screen').dataset.phase = 'pixel-battle';
    pixelRun = window.HumanityPixelBattle.play(get('pixel-canvas'), {
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

  function cardBack() {
    const back = document.createElement('div'); back.className = 'card-back';
    back.setAttribute('role', 'img'); back.setAttribute('aria-label', 'CPUが選んだ裏向きカード');
    const emblem = document.createElement('span'); emblem.textContent = '?'; emblem.setAttribute('aria-hidden', 'true');
    const caption = document.createElement('span'); caption.textContent = 'CPU';
    back.append(emblem, caption); return back;
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

  function concealCpuFighter() {
    get('cpu-fighter').classList.remove('revealed');
    get('cpu-fighter').replaceChildren(cardBack());
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
          label.textContent = used ? '使用済み' : selectedId === character.id ? '選択中' : 'タップして選択';
          card.append(label);
        }
        (side === 'player' ? handList : get('cpu-hand')).append(item);
        item.append(card);
      }
    }
    get('redeal-button').disabled = moving || !['hand','finished'].includes(stage);
  }

  function renderScore() {
    const prefix = match.phase === 'finished' ? '試合終了' : `第${match.round}/3ラウンド`;
    get('match-score').textContent = `${prefix}　あなた ${match.playerWins}勝 — CPU ${match.cpuWins}勝`;
  }

  function renderTurn() {
    const playerFirst = match.firstSide === 'player';
    get('turn-status').textContent = playerFirst
      ? 'あなたが先攻・カードを選択'
      : 'あなたが後攻・相手を見てカードを選択';
    if (playerFirst) concealCpuFighter();
    else {
      showCpuFighter(match.cpuCard, false);
      get('cpu-fighter').style.visibility='hidden';
      stage = 'cpu-entry'; busy(true); fast = reduced() || Boolean(document.hidden);
      get('turn-status').textContent = 'CPUが選択中';
      Promise.resolve().then(async () => {
        const source=[...get('cpu-hand').querySelectorAll('.card')].find(card=>card.dataset.characterId===match.cpuCard.id);
        await moveCard(source,get('cpu-fighter'),()=>{showCpuFighter(match.cpuCard,false);get('cpu-fighter').style.visibility='';});
        stage='hand'; busy(false);
        get('turn-status').textContent='あなたが後攻・相手を見てカードを選択';
      });
    }
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
      if(match.firstSide==='player') {
        window.HumanityMatch.commitPlayerCard(match,selectedId);
        get('turn-status').textContent='CPUが選択中';
        const cpuSource=[...get('cpu-hand').querySelectorAll('.card')].find(card=>card.dataset.characterId===match.cpuCard.id);
        await moveCard(cpuSource,get('cpu-fighter'),()=>{showCpuFighter(match.cpuCard,false);get('cpu-fighter').style.visibility='';});
      }
      stage='battling';
      result=window.HumanityMatch.playRound(match,selectedId);
      if (mode === 'pixel') await pixelEffects(result);
      else await battleEffects(result);
    } finally {
      // 演出だけが失敗しても、確定済みの結果を失わない。
      if(result) finishRound(result);
      busy(false);
    }
  }

  function newMatch() {
    clearEffects();
    match = window.HumanityMatch.deal(window.CHARACTERS);
    selectedId = null; stage = 'hand';
    renderHands(); renderScore(); renderPlayerFighter(); renderTurn();
    get('return-button').hidden = true;
    get('battle-status').textContent = '';
    clearResult();
    get('status').textContent = '両者に3枚ずつ配りました。2勝先取で試合終了です。';
  }

  function finishRound(result) {
    const roundText = result.winner === 'player' ? 'あなたの勝利' : 'あなたの敗北';
    if (match.phase === 'finished') {
      stage = 'finished'; get('return-button').hidden = true;
      const finalText = match.winner === 'player' ? 'あなたの勝利です！' : 'CPUの勝利です。';
      get('battle-status').textContent = `第${result.round}ラウンド：${roundText}。${finalText}`;
    } else {
      stage = 'result'; get('return-button').hidden = false;
      get('battle-status').textContent = `第${result.round}ラウンド：${roundText}。次は残りの手札から選んでください。`;
    }
    renderHands(); renderScore(); renderResult(result);
    get('turn-status').textContent = `第${result.round}ラウンドは、あなたが${match.firstSide === 'player' ? '先攻' : '後攻'}でした。`;
    get('status').textContent = match.phase === 'finished' ? '新しい試合で遊べます。' : '使用済みカードはこの試合では使えません。';
    get('hand-screen').dataset.phase='result';
    (match.phase==='finished'?get('redeal-button'):get('return-button')).focus({preventScroll:true});
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
    get('result-title').textContent = `第${result.round}ラウンドの結果`;
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
  get('redeal-button').addEventListener('click', () => {
    if (!moving && (stage === 'hand' || stage === 'finished')) newMatch();
  });
  get('skip-button').addEventListener('click', skipEffects);
  get('pixel-speed').addEventListener('change', () => pixelRun?.setSpeed(Number(get('pixel-speed').value)));
  get('battle-mode').addEventListener('change', () => {
    if (moving) { get('battle-mode').value = mode; return; }
    mode = get('battle-mode').value === 'pixel' ? 'pixel' : 'card';
    get('pixel-speed-label').hidden = mode !== 'pixel';
    if (['result', 'finished'].includes(stage)) {
      const result = match.rounds.at(-1);
      clearEffects();
      get('hand-screen').dataset.phase = 'result';
      if (mode === 'pixel') {
        showPixelScene(result);
        window.HumanityPixelBattle.drawScene(get('pixel-canvas'), window.HumanityPixelBattle.sampleScene(window.HumanityPixelBattle.DURATION, result.winner));
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
  get('return-button').addEventListener('click', () => {
    if (moving || stage !== 'result') return;
    clearEffects();
    window.HumanityMatch.nextRound(match);
    stage = 'hand'; selectedId = null;
    renderHands(); renderScore(); renderPlayerFighter(); renderTurn();
    get('return-button').hidden = true; get('battle-status').textContent = ''; clearResult();
    get('status').textContent = '残りの手札からカードを1枚選んでください。';
    const card = [...handList.querySelectorAll('.card')].find(c => !c.disabled) || handList.querySelector('.card:not(.used)');
    card?.focus({ preventScroll: true });

  });
})();
