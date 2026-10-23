(() => {
  'use strict';

  const STATS = Object.freeze(['STR', 'SPD', 'END', 'STK', 'GRP', 'SUB']);
  // 暫定バランス設定。全能力値の重みは1、勝率の単位はパーセント。
  const BALANCE = Object.freeze({ basePercent: 50, differenceFactor: 0.5, minPercent: 5, maxPercent: 95 });

  function calculatePower(character) {
    return STATS.reduce((sum, key) => {
      const value = character.stats[key];
      if (!Number.isFinite(value)) throw new Error(`能力値${key}が不正です。`);
      return sum + value;
    }, 0);
  }

  function calculatePlayerWinPercent(playerPower, cpuPower, balance = BALANCE) {
    const percent = balance.basePercent + (playerPower - cpuPower) * balance.differenceFactor;
    return Math.max(balance.minPercent, Math.min(balance.maxPercent, percent));
  }

  function resolveRound(playerCard, cpuCard, random = Math.random) {
    const playerPower = calculatePower(playerCard);
    const cpuPower = calculatePower(cpuCard);
    const playerWinPercent = calculatePlayerWinPercent(playerPower, cpuPower);
    const roll = random(); // 各ラウンドの勝敗用乱数はここで1回だけ取得する。
    if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error('乱数は0以上1未満である必要があります。');
    const playerStats = Object.freeze(Object.fromEntries(STATS.map(key => [key, playerCard.stats[key]])));
    const cpuStats = Object.freeze(Object.fromEntries(STATS.map(key => [key, cpuCard.stats[key]])));
    return Object.freeze({
      winner: roll < playerWinPercent / 100 ? 'player' : 'cpu',
      playerPower, cpuPower, playerWinPercent, roll, playerStats, cpuStats
    });
  }

  function describeResult(decision) {
    const { playerPower, cpuPower, playerWinPercent, roll, winner } = decision;
    const difference = playerPower - cpuPower;
    const signed = number => number > 0 ? `+${number}` : String(number);
    const differences = STATS.map(key => `${key} ${signed(decision.playerStats[key] - decision.cpuStats[key])}`).join('、');
    const winnerName = winner === 'player' ? 'PLAYER' : 'CPU';
    const comparison = winner === 'player' ? 'より小さい' : '以上の';
    let outcome;
    if (difference === 0) outcome = '戦闘力は同じで、50%の抽選で決着しました。';
    else if ((difference < 0 && winner === 'player') || (difference > 0 && winner === 'cpu')) {
      outcome = '戦闘力が低い側が抽選で勝利する番狂わせとなりました。';
    } else outcome = '戦闘力が高い側が抽選でも勝利しました。';
    return `戦闘力はPLAYER ${playerPower}、CPU ${cpuPower}（差${signed(difference)}）。能力値の差（PLAYER−CPU）は${differences}です。PLAYERの事前勝率は${playerWinPercent}%。抽選値${roll}が判定境界${playerWinPercent / 100}${comparison}ため、${winnerName}の勝ちです。${outcome}`;
  }

  window.HumanityBattle = { STATS, BALANCE, calculatePower, calculatePlayerWinPercent, resolveRound, describeResult };
})();
