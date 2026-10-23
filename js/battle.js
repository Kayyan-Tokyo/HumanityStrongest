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

  const STAT_LABELS = Object.freeze({
    STR: 'パワー', SPD: 'スピード', END: 'スタミナ', STK: '打撃', GRP: '組み技', SUB: '関節技'
  });

  // 保存結果から文章だけを組み立てる。追加の抽選や、架空の攻防の描写は行わない。
  function createCommentary(decision) {
    const difference = decision.playerPower - decision.cpuPower;
    const close = Math.abs(difference) <= 20;
    const dominant = Math.abs(difference) >= 90;
    const upset = (difference < 0 && decision.winner === 'player') || (difference > 0 && decision.winner === 'cpu');
    const winner = decision.winner === 'player' ? 'あなた' : 'CPU';
    const favorite = difference > 0 ? 'あなた' : 'CPU';
    // 同じ結果は同じ文章。保存された数値を使い、テンプレートだけを切り替える。
    const variant = (decision.playerPower + decision.cpuPower + Math.floor(decision.roll * 1000000)) % 3;
    const strongest = stats => {
      const maximum = Math.max(...STATS.map(key => stats[key]));
      const tied = STATS.filter(key => stats[key] === maximum);
      return STAT_LABELS[tied[variant % tied.length]];
    };
    const playerSkill = strongest(decision.playerStats);
    const cpuSkill = strongest(decision.cpuStats);
    const features = [
      `あなたの持ち味は${playerSkill}、CPUの持ち味は${cpuSkill}。`,
      `能力に注目！あなたは${playerSkill}、CPUは${cpuSkill}がいちばん高い。`,
      `あなたの${playerSkill}と、CPUの${cpuSkill}。それぞれの力が目を引く組み合わせだ。`
    ];
    let context;
    if (difference === 0) context = [
      '全体の力がぴったり同じ。勝つチャンスも五分五分の、予想がつかない勝負だ。',
      '全体の力は互角で、勝つチャンスも同じ。どちらにも十分に可能性がある勝負だった。',
      '全体の力は同じで、勝つチャンスも五分五分。どちらに決まるか楽しみな組み合わせだ。'
    ];
    else if (close) context = [
      '六つの力を見くらべると、どちらが勝ってもおかしくない接戦の予想だった。',
      '全体の力はほぼ互角で、どちらにも十分な勝つチャンスがあった。',
      '力の差が小さく、勝つチャンスも近い。結果を予想しにくい組み合わせだった。'
    ];
    else if (dominant) context = [
      `全体の力では${favorite}が大きく上回り、勝つチャンスにもはっきり差があった。`,
      `${favorite}が全体の力で大きくリード。数字を見くらべると、かなり有利な予想だった。`,
      `能力を合わせて見れば${favorite}がかなり有利。相手にはきびしい組み合わせだった。`
    ];
    else context = [
      `全体の力では${favorite}が上回り、勝つチャンスでも有利な見込みだった。`,
      `能力を合わせて見くらべると${favorite}が優勢。それが勝ちやすさにつながる組み合わせだった。`,
      `${favorite}が全体の力でリードしていた。相手にもチャンスはあるけれど、有利な予想だった。`
    ];
    let ending;
    if (upset) ending = [
      `けれど、今回は${winner}が勝利！不利な予想をくつがえす番狂わせだ。強さの数字だけでは、勝負の答えは決まらない！`,
      `そこで勝利をつかんだのは${winner}！予想をこえる番狂わせになった。残されたチャンスにも、勝利の可能性があるんだね！`,
      `今回は${winner}が勝利！有利な側の予想をひっくり返す番狂わせだ。勝ちにくい組み合わせでも、チャンスはなくならない！`
    ];
    else if (close) ending = [
      `今回は${winner}が勝利！どちらにもチャンスがある勝負だった。次の対戦も、それぞれの力の組み合わせに注目しよう！`,
      `勝利をつかんだのは${winner}！ほぼ互角の見込みだけでは読めない勝負だ。次はどんな組み合わせが見られるかな！`,
      `${winner}が勝利をつかんだ！互いにチャンスを持った組み合わせだったね。能力を見くらべて、次の対戦も楽しもう！`
    ];
    else ending = [
      `今回は${winner}が勝利！有利な見込みを生かした結果になった。でも、相手にも勝つチャンスは残されていたんだ。`,
      `勝利をつかんだのは${winner}！全体の力で有利だった側が勝つ結果になったね。それでも、勝負はいつも予想どおりとは限らない！`,
      `${winner}の勝利！能力の強みが勝ちやすさにつながった組み合わせだった。相手にもチャンスがあったからこそ、うれしい一勝だね！`
    ];
    const headlines = upset
      ? ['予想をこえる番狂わせ！', 'チャンスをつかむ番狂わせ！', 'まさかの結果にびっくり！']
      : close ? ['互角の勝負を制した！', 'どちらもチャンスの接戦！', '予想がむずかしい勝負！']
      : dominant ? ['大きな強みが勝利につながった！', '得意な力でつかんだ一勝！', '有利な予想にこたえる勝利！']
      : ['それぞれの強みが光る勝負！', '勝つチャンスをつかんだ！', '力を見くらべて楽しむ一戦！'];
    return Object.freeze({ headline: headlines[variant], body: features[variant] + context[variant] + ending[variant] });
  }

  function describeResult(decision) {
    return createCommentary(decision).body;
  }

  window.HumanityBattle = { STATS, BALANCE, calculatePower, calculatePlayerWinPercent, resolveRound, describeResult, createCommentary, STAT_LABELS };
})();
