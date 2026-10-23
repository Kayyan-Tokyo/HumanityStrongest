(() => {
  'use strict';

  const HAND_SIZE = 3;
  const MAX_ROUNDS = 3;
  const WINS_REQUIRED = 2;

  function availableCards(hand, usedIds) {
    return hand.filter(character => !usedIds.includes(character.id));
  }

  function chooseCpuCard(match, random = Math.random) {
    const remaining = availableCards(match.cpuHand, match.usedCpuIds);
    return remaining[Math.floor(random() * remaining.length)];
  }

  function setupTurn(match, firstSide, random) {
    match.firstSide = firstSide;
    match.playerCard = null;
    match.cpuCard = firstSide === 'cpu' ? chooseCpuCard(match, random) : null;
    match.phase = 'selecting';
  }

  function commitPlayerCard(match, playerId, random = Math.random) {
    if (match.phase !== 'selecting' || match.firstSide !== 'player') throw new Error('先攻の公開は今はできません。');
    const card = availableCards(match.playerHand, match.usedPlayerIds).find(c => c.id === playerId);
    if (!card) throw new Error('未使用の手札を選んでください。');
    // 先攻の公開を確定してから、後攻CPUが未使用カードをランダムに選ぶ。
    match.playerCard = card;
    match.cpuCard = chooseCpuCard(match, random);
    match.phase = 'ready';
  }

  function deal(characters, random = Math.random) {
    if (characters.length < HAND_SIZE * 2 || new Set(characters.map(c => c.id)).size !== characters.length) {
      throw new Error('6人以上の一意なキャラクターデータが必要です。');
    }
    const shuffled = [...characters];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const match = {
      playerHand: shuffled.slice(0, HAND_SIZE),
      cpuHand: shuffled.slice(HAND_SIZE, HAND_SIZE * 2),
      usedPlayerIds: [], usedCpuIds: [], rounds: [],
      playerWins: 0, cpuWins: 0, round: 1,
      phase: 'selecting', winner: null
    };
    setupTurn(match, random() < 0.5 ? 'player' : 'cpu', random);
    return match;
  }

  // 判定方法を注入し、配布・カード消費・2勝先取の進行とは分離する。
  function playRound(match, playerId, resolveRound = window.HumanityBattle.resolveRound) {
    if (!((match.firstSide === 'cpu' && match.phase === 'selecting') || (match.firstSide === 'player' && match.phase === 'ready'))) throw new Error('このラウンドは開始できません。');
    const playerCard = availableCards(match.playerHand, match.usedPlayerIds).find(c => c.id === playerId);
    if (match.firstSide === 'player' && match.playerCard?.id !== playerId) throw new Error('公開したカードは変更できません。');
    const cpuCard = match.cpuCard;
    if (!playerCard || !cpuCard || !availableCards(match.cpuHand, match.usedCpuIds).includes(cpuCard)) {
      throw new Error('未使用の手札を選んでください。');
    }
    const previousPhase = match.phase;
    match.phase = 'resolving';
    let decision;
    try {
      decision = resolveRound(playerCard, cpuCard);
      if (!decision || !['player', 'cpu'].includes(decision.winner)) throw new Error('勝敗判定が不正です。');
    } catch (error) {
      match.phase = previousPhase;
      throw error;
    }
    const winner = decision.winner;
    const result = Object.freeze({ round: match.round, playerCard, cpuCard, winner, decision, firstSide: match.firstSide });
    match.usedPlayerIds.push(playerCard.id);
    match.usedCpuIds.push(cpuCard.id);
    match.rounds.push(result);
    if (winner === 'player') match.playerWins++;
    if (winner === 'cpu') match.cpuWins++;
    const finished = match.playerWins >= WINS_REQUIRED || match.cpuWins >= WINS_REQUIRED || match.rounds.length >= MAX_ROUNDS;
    match.phase = finished ? 'finished' : 'round-ended';
    if (finished) match.winner = match.playerWins > match.cpuWins ? 'player' : 'cpu';
    return result;
  }

  function nextRound(match, random = Math.random) {
    if (match.phase !== 'round-ended') throw new Error('次のラウンドへ進めません。');
    match.round = match.rounds.length + 1;
    setupTurn(match, match.rounds.at(-1).winner, random);
  }

  window.HumanityMatch = { deal, availableCards, commitPlayerCard, playRound, nextRound, HAND_SIZE, MAX_ROUNDS, WINS_REQUIRED };
})();
