(() => {
  'use strict';

  const get = id => document.getElementById(id);
  const screens = [get('title-screen'), get('hand-screen')];
  const handList = get('hand');
  const fightButton = get('fight-button');
  let match = null;
  let selectedId = null;
  let stage = 'title';

  function showScreen(id, heading) {
    for (const screen of screens) screen.hidden = screen.id !== id;
    get(heading).focus();
    // 長い手札画面の下部から遷移しても、画面の先頭を見せる。
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function profileContent(card, character) {
    const name = document.createElement('span');
    name.className = 'card-name';
    name.textContent = character.name;
    const profile = document.createElement('span');
    profile.className = 'card-profile';
    profile.textContent = `${character.age}歳 / ${character.height}cm / ${character.weight}kg`;
    // 能力値はデータに保持するが、DOMやアクセシブル名には出力しない。
    card.append(name, profile);
  }

  function cardBack(label) {
    const back = document.createElement('div');
    back.className = 'card-back';
    back.setAttribute('role', 'img');
    back.setAttribute('aria-label', label);
    const emblem = document.createElement('span');
    emblem.textContent = '?';
    emblem.setAttribute('aria-hidden', 'true');
    const caption = document.createElement('span');
    caption.textContent = 'CPU';
    back.append(emblem, caption);
    return back;
  }

  function renderPlayerFighter() {
    get('player-fighter').replaceChildren();
    const character = match.playerHand.find(c => c.id === selectedId);
    if (character) {
      profileContent(get('player-fighter'), character);
    } else {
      const empty = document.createElement('span');
      empty.className = 'empty-fighter';
      empty.textContent = '手札からカードを選んでください';
      get('player-fighter').append(empty);
    }
  }

  function concealCpuFighter() {
    get('cpu-fighter').classList.remove('revealed');
    get('cpu-fighter').replaceChildren(cardBack('CPUが選んだ裏向きカード'));
  }

  function lockHand(locked) {
    for (const card of handList.querySelectorAll('.card')) card.disabled = locked;
    get('redeal-button').disabled = locked;
    fightButton.disabled = locked || !selectedId;
  }

  function selectCard(character) {
    if (stage !== 'hand') return;
    selectedId = selectedId === character.id ? null : character.id;
    for (const card of handList.querySelectorAll('.card')) {
      const selected = card.dataset.characterId === selectedId;
      card.setAttribute('aria-pressed', String(selected));
      card.querySelector('.selection-label').textContent = selected ? '選択中' : 'タップして選択';
    }
    fightButton.disabled = !selectedId;
    renderPlayerFighter();
    get('status').textContent = selectedId
      ? `${character.name}を選択しました。「このキャラで戦う」でCPUのカードを公開します。`
      : '選択を解除しました。カードを1枚選んでください。';
  }

  function deal() {
    match = window.HumanityMatch.deal(window.CHARACTERS);
    selectedId = null;
    stage = 'hand';
    fightButton.disabled = true;
    handList.replaceChildren();
    get('cpu-hand').replaceChildren();
    // 裏面にはID・プロフィール・能力値を一切埋め込まない。
    for (let i = 0; i < match.cpuHand.length; i++) {
      const item = document.createElement('li');
      item.append(cardBack(`CPUの裏向きカード${i + 1}`));
      get('cpu-hand').append(item);
    }
    for (const character of match.playerHand) {
      const item = document.createElement('li');
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card';
      card.dataset.characterId = character.id;
      card.setAttribute('aria-pressed', 'false');
      profileContent(card, character);
      const selection = document.createElement('span');
      selection.className = 'selection-label';
      selection.textContent = 'タップして選択';
      card.append(selection);
      card.addEventListener('click', () => selectCard(character));
      item.append(card);
      handList.append(item);
    }
    lockHand(false);
    renderPlayerFighter();
    concealCpuFighter();
    get('return-button').hidden = true;
    get('battle-status').textContent = '';
    get('status').textContent = '両者に4枚ずつ配りました。あなたのカードを1枚選んでください。';
  }

  get('start-button').addEventListener('click', () => {
    deal();
    document.querySelector('main').classList.add('playing');
    document.body.classList.add('in-game');
    showScreen('hand-screen', 'hand-title');
  });
  get('redeal-button').addEventListener('click', () => {
    if (stage === 'hand') deal();
  });
  // 対戦開始の唯一の入口。将来の勝敗判定・バトル演出もここから接続する。
  function startBattle() {
    if (stage !== 'hand' || !selectedId) return;
    const battle = {
      playerCard: match.playerHand.find(c => c.id === selectedId),
      cpuCard: match.cpuCard
    };
    // 描画や将来の非同期処理より先にロックし、連打・直接イベント送出も拒否する。
    stage = 'battling';
    lockHand(true);
    renderPlayerFighter();
    revealCpuCard(battle.cpuCard);
    // 将来: battle.playerCard / battle.cpuCard の能力値を使い、ここで勝敗・演出を処理する。
    stage = 'revealed';
    get('return-button').hidden = false;
    get('battle-status').textContent = `CPUは${battle.cpuCard.name}を選びました。今回はカードの公開までです。勝敗計算はまだ行いません。`;
    get('battle-title').focus({ preventScroll: true });
    get('battle-area').scrollIntoView({ block: 'start', behavior: 'instant' });
    get('return-button').focus({ preventScroll: true });
  }

  function revealCpuCard(character) {
    const front = document.createElement('div');
    front.className = 'card fighter-card';
    profileContent(front, character);
    get('cpu-fighter').replaceChildren(front);
    get('cpu-fighter').classList.add('revealed');
  }

  fightButton.addEventListener('click', startBattle);
  get('return-button').addEventListener('click', () => {
    if (stage !== 'revealed') return;
    stage = 'hand';
    concealCpuFighter();
    lockHand(false);
    get('return-button').hidden = true;
    get('battle-status').textContent = 'カードを選び直すか、同じカードで再び対戦できます。';
    const selected = [...handList.querySelectorAll('.card')].find(card => card.dataset.characterId === selectedId);
    selected.focus({ preventScroll: true });
    selected.scrollIntoView({ block: 'center', behavior: 'instant' });
    // 再配布を呼ばず、両者の手札と選択をそのまま保持。
    get('status').textContent = '手札に戻りました。両者の手札と選択は変わっていません。';
  });
})();
