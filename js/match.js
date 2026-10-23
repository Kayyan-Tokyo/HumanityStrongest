(() => {
  'use strict';

  // 同じシャッフル結果から8人を配り、両者の重複を防ぐ。
  // オブジェクトは能力値を含む元データを保持し、表示処理とは分離する。
  function deal(characters, random = Math.random) {
    if (characters.length < 8 || new Set(characters.map(c => c.id)).size !== characters.length) {
      throw new Error('8人以上の一意なキャラクターデータが必要です。');
    }
    const shuffled = [...characters];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const playerHand = shuffled.slice(0, 4);
    const cpuHand = shuffled.slice(4, 8);
    return {
      playerHand,
      cpuHand,
      // 配布時に決め、準備画面への移動や戻る操作では選び直さない。
      cpuCard: cpuHand[Math.floor(random() * cpuHand.length)]
    };
  }

  window.HumanityMatch = { deal };
})();
