(() => {
  'use strict';

  const statNames = ['STR', 'SPD', 'END', 'STK', 'GRP', 'SUB'];
  const titleScreen = document.getElementById('title-screen');
  const handScreen = document.getElementById('hand-screen');
  const handList = document.getElementById('hand');
  const status = document.getElementById('status');
  let selectedId = null;

  // Fisher–Yates: データ本体を変更せず、重複なしで4人を抽選する。
  function drawHand() {
    const shuffled = [...window.CHARACTERS];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 4);
  }

  function selectCard(id, name) {
    selectedId = selectedId === id ? null : id;
    for (const card of handList.querySelectorAll('.card')) {
      card.setAttribute('aria-pressed', String(card.dataset.characterId === selectedId));
      card.querySelector('.selection-label').textContent =
        card.dataset.characterId === selectedId ? '選択中' : 'タップして選択';
    }
    status.textContent = selectedId ? `${name}を選択しました。対戦機能は準備中です。` : '選択を解除しました。';
  }

  function deal() {
    selectedId = null;
    handList.replaceChildren();
    for (const character of drawHand()) {
      const item = document.createElement('li');
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card';
      card.dataset.characterId = character.id;
      card.setAttribute('aria-pressed', 'false');

      const name = document.createElement('span');
      name.className = 'card-name';
      name.textContent = character.name;
      const profile = document.createElement('span');
      profile.className = 'card-profile';
      profile.textContent = `${character.age}歳 / ${character.height}cm / ${character.weight}kg`;
      const stats = document.createElement('span');
      stats.className = 'card-stats';
      for (const stat of statNames) {
        const row = document.createElement('span');
        const label = document.createElement('span');
        const value = document.createElement('strong');
        label.textContent = stat;
        value.textContent = character.stats[stat];
        row.append(label, value);
        stats.append(row);
      }
      const selection = document.createElement('span');
      selection.className = 'selection-label';
      selection.textContent = 'タップして選択';
      card.append(name, profile, stats, selection);
      card.addEventListener('click', () => selectCard(character.id, character.name));
      item.append(card);
      handList.append(item);
    }
    status.textContent = '4人の戦士を配りました。カードを選択できます。';
  }

  document.getElementById('start-button').addEventListener('click', () => {
    deal();
    document.querySelector('main').classList.add('playing');
    titleScreen.hidden = true;
    handScreen.hidden = false;
    document.getElementById('hand-title').focus();
  });
  document.getElementById('redeal-button').addEventListener('click', deal);
})();
