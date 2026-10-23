(() => {
  'use strict';
  const get = id => document.getElementById(id);
  const handList = get('hand');
  const fightButton = get('fight-button');
  let match = null;
  let selectedId = null;
  let stage = 'title';

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
        profileContent(card, character);
        if (side === 'player') {
          card.type = 'button'; card.dataset.characterId = character.id;
          card.setAttribute('aria-pressed', String(!used && selectedId === character.id));
          card.disabled = used || stage !== 'hand';
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
    fightButton.disabled = stage !== 'hand' || !selectedId || match.usedPlayerIds.includes(selectedId);
    get('redeal-button').disabled = stage === 'battling' || stage === 'result';
  }

  function renderScore() {
    const prefix = match.phase === 'finished' ? '試合終了' : `第${match.round}ラウンド / 最大3`;
    get('match-score').textContent = `${prefix}　PLAYER ${match.playerWins}勝 — CPU ${match.cpuWins}勝`;
  }

  function selectCard(character) {
    if (stage !== 'hand' || match.usedPlayerIds.includes(character.id)) return;
    selectedId = selectedId === character.id ? null : character.id;
    renderHands(); renderPlayerFighter();
    [...handList.querySelectorAll('.card')].find(card => card.dataset.characterId === character.id).focus({ preventScroll: true });
    get('status').textContent = selectedId ? `${character.name}を選択しました。` : '選択を解除しました。';
  }

  function newMatch() {
    match = window.HumanityMatch.deal(window.CHARACTERS);
    selectedId = null; stage = 'hand';
    renderHands(); renderScore(); renderPlayerFighter(); concealCpuFighter();
    get('return-button').hidden = true;
    get('battle-status').textContent = '';
    clearResult();
    get('status').textContent = '両者に3枚ずつ配りました。2勝先取で試合終了です。';
  }

  function startBattle() {
    if (stage !== 'hand' || !selectedId || match.usedPlayerIds.includes(selectedId)) return;
    stage = 'battling';
    fightButton.disabled = true;
    for (const card of handList.querySelectorAll('.card')) card.disabled = true;
    get('redeal-button').disabled = true;
    // 進行・カード消費と判定関数を分離。将来のバトル演出もこの入口へ接続する。
    const result = window.HumanityMatch.playRound(match, selectedId);
    const front = document.createElement('div'); front.className = 'card fighter-card';
    profileContent(front, result.cpuCard);
    get('cpu-fighter').replaceChildren(front); get('cpu-fighter').classList.add('revealed');
    const roundText = result.winner === 'player' ? 'PLAYERの勝ち' : 'CPUの勝ち';
    if (match.phase === 'finished') {
      stage = 'finished'; get('return-button').hidden = true;
      const finalText = match.winner === 'player' ? 'PLAYERの勝利です！' : 'CPUの勝利です。';
      get('battle-status').textContent = `第${result.round}ラウンド：${roundText}。${finalText}`;
    } else {
      stage = 'result'; get('return-button').hidden = false;
      get('battle-status').textContent = `第${result.round}ラウンド：${roundText}。次は残りの手札から選んでください。`;
    }
    renderHands(); renderScore(); renderResult(result);
    get('status').textContent = match.phase === 'finished' ? '新しい試合で遊べます。' : '使用済みカードはこの試合では使えません。';
    get('battle-title').focus({ preventScroll: true });
    get('battle-area').scrollIntoView({ block: 'start', behavior: 'instant' });
    (match.phase === 'finished' ? get('redeal-button') : get('return-button')).focus({ preventScroll: true });
  }

  function clearResult() {
    get('round-result').hidden = true;
    get('result-stats').replaceChildren();
    get('result-probability').textContent = '';
    get('result-reason').textContent = '';
  }

  function renderResult(result) {
    const decision = result.decision;
    get('result-title').textContent = `第${result.round}ラウンド リザルト`;
    get('result-probability').textContent = `対戦前の勝率：PLAYER ${decision.playerWinPercent}% ／ CPU ${100 - decision.playerWinPercent}%`;
    get('result-stats').replaceChildren();
    for (const stat of window.HumanityBattle.STATS) {
      const row = document.createElement('tr');
      const label = document.createElement('th'); label.setAttribute('scope', 'row'); label.textContent = stat;
      row.append(label);
      for (const value of [decision.playerStats[stat], decision.cpuStats[stat], decision.playerStats[stat] - decision.cpuStats[stat]]) {
        const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
      }
      get('result-stats').append(row);
    }
    get('result-reason').textContent = window.HumanityBattle.describeResult(decision);
    get('round-result').hidden = false;
  }

  get('start-button').addEventListener('click', () => {
    newMatch(); document.querySelector('main').classList.add('playing'); document.body.classList.add('in-game');
    get('title-screen').hidden = true; get('hand-screen').hidden = false;
    get('hand-title').focus(); window.scrollTo({ top: 0, behavior: 'instant' });
  });
  get('redeal-button').addEventListener('click', () => {
    if (stage === 'hand' || stage === 'finished') newMatch();
  });
  fightButton.addEventListener('click', startBattle);
  get('return-button').addEventListener('click', () => {
    if (stage !== 'result') return;
    window.HumanityMatch.nextRound(match);
    stage = 'hand'; selectedId = null;
    renderHands(); renderScore(); renderPlayerFighter(); concealCpuFighter();
    get('return-button').hidden = true; get('battle-status').textContent = ''; clearResult();
    get('status').textContent = '残りの手札からカードを1枚選んでください。';
    const card = [...handList.querySelectorAll('.card')].find(c => !c.disabled);
    card.focus({ preventScroll: true }); card.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
})();
