(() => {
  'use strict';

  const HAND_SIZE = 2, CPU_HAND_SIZE = 1, MAX_ROUNDS = 1, WINS_REQUIRED = 1;
  function availableCards(hand, usedIds) {
    return hand.filter(character => !usedIds.includes(character.id));
  }

  function deal(characters, random = Math.random) {
    if (characters.length < 3 || new Set(characters.map(c => c.id)).size !== characters.length) {
      throw new Error('3人以上の一意なキャラクターデータが必要です。');
    }
    const shuffled = [...characters];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // CPUを最初に確定する。プレイヤーの選択時には追加のCPU抽選をしない。
    return {
      cpuHand:[shuffled[0]], cpuCard:shuffled[0], playerHand:shuffled.slice(1, 3), playerCard:null,
      usedPlayerIds:[], usedCpuIds:[], rounds:[], phase:'selecting', winner:null,
      // 保存済みストーリーとの互換形式。公開された相手に対して1回だけ選択する。
      round:1, firstSide:'cpu', playerWins:0, cpuWins:0
    };
  }

  function playRound(match, playerId, resolveRound = window.HumanityBattle.resolveRound) {
    if (match.phase !== 'selecting') throw new Error('この対戦はすでに開始されています。');
    const playerCard = match.playerHand.find(card => card.id === playerId);
    const cpuCard = match.cpuCard;
    if (!playerCard || !match.cpuHand.includes(cpuCard)) throw new Error('候補からカードを1枚選んでください。');
    match.phase = 'resolving';
    let decision;
    try {
      decision = resolveRound(playerCard, cpuCard);
      if (!decision || !['player','cpu','draw'].includes(decision.winner)) throw new Error('勝敗判定が不正です。');
    } catch (error) {
      match.phase = 'selecting';
      throw error;
    }
    const outcome = { round:1, firstSide:'cpu', playerCard, cpuCard, winner:decision.winner, decision };
    // 現行の計算は勝利/敗北のみ。将来引き分けを受け取っても、勝者を創作しない。
    const story = decision.winner === 'draw'
      ? Object.freeze({headline:'勝負は引き分け！', body:`${playerCard.name}と${cpuCard.name}の対戦は引き分け。今回は勝者が決まらず、連勝数はそのままです。次の対戦に挑戦しよう！`, finish:'引き分け'})
      : window.HumanityStory.generateStory(outcome);
    const result = Object.freeze({ ...outcome, story });
    match.playerCard = playerCard;
    match.usedPlayerIds.push(playerCard.id); match.usedCpuIds.push(cpuCard.id);
    match.rounds.push(result);
    match.playerWins = result.winner === 'player' ? 1 : 0;
    match.cpuWins = result.winner === 'cpu' ? 1 : 0;
    match.phase = 'finished'; match.winner = result.winner;
    return result;
  }

  window.HumanityMatch = { deal, playRound, availableCards, HAND_SIZE, CPU_HAND_SIZE, MAX_ROUNDS, WINS_REQUIRED };
})();
