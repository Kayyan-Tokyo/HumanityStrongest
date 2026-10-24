(() => {
  'use strict';
  // 勝敗確定後だけ呼ぶ演出。技の命中や勝敗を再計算しない。
  function generateStory(result) {
    const { playerCard, cpuCard, winner, decision, round, firstSide } = result;
    const battle = window.HumanityBattle;
    const cards = { player: playerCard, cpu: cpuCard };
    const loser = winner === 'player' ? 'cpu' : 'player';
    const stats = { player: decision.playerStats || playerCard.stats, cpu: decision.cpuStats || cpuCard.stats };
    const profiles = { player: window.COMBAT_STYLES[playerCard.id], cpu: window.COMBAT_STYLES[cpuCard.id] };
    const gap = (decision.playerPower ?? battle.calculatePower(playerCard)) - (decision.cpuPower ?? battle.calculatePower(cpuCard));
    const upset = gap > 0 && winner === 'cpu' || gap < 0 && winner === 'player';
    const close = Math.abs(gap) <= 20;
    const kind = upset ? 'upset' : close ? 'close' : Math.abs(gap) >= 90 ? 'dominant' : 'balanced';
    let seed = 0;
    for (const char of `${playerCard.id}|${cpuCard.id}|${round}|${winner}|${firstSide}|${decision.roll ?? 0}`) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
    const variant = seed % 3;
    // 候補は人物設定の範囲内。既存能力が高い候補ほど選ばれやすくする。
    const choose = (choices, values, salt) => {
      const total = choices.reduce((sum, choice) => sum + values[choice.stat], 0);
      let point = ((seed + salt) % 1009) / 1009 * total;
      return choices.find(choice => (point -= values[choice.stat]) < 0) || choices.at(-1);
    };
    const moves = { player: choose(profiles.player.techniques, stats.player, 17), cpu: choose(profiles.cpu.techniques, stats.cpu, 29) };
    const finish = choose(profiles[winner].finishes, stats[winner], 43);
    const first = firstSide === 'cpu' ? 'cpu' : 'player', second = first === 'player' ? 'cpu' : 'player';
    const opening = `「${cards[first].name}」は${profiles[first].style}。「${cards[second].name}」は${profiles[second].style}。`;
    const middlePatterns = [
      `「${cards[first].name}」が${moves[first].action}。「${cards[second].name}」も${moves[second].action}。どちらも引かず、熱い攻防が続く！`,
      `「${cards[first].name}」は${moves[first].action}！「${cards[second].name}」は${moves[second].action}。狙いの違う技がぶつかり、流れが揺れる！`,
      `「${cards[first].name}」が${moves[first].action}と、「${cards[second].name}」も${moves[second].action}！互いの持ち味をぶつけ合い、勝機を探る。`
    ];
    const contexts = {
      close: ['実力の近い接戦だ。', '互角の力で競り合う。', '最後まで接戦が続く。'],
      dominant: ['強みを押し出す圧巻の展開だ。', '大きな力の差が流れに表れる。', '有利な側が勢いをつかむ。'],
      upset: close ? ['接戦の末、予想を覆す番狂わせ！', '力の近い接戦から番狂わせだ！', '接戦を抜け出す番狂わせ！'] : ['不利な予想を覆す番狂わせ！', '少ない勝機をつかむ番狂わせだ！', '予想をひっくり返す番狂わせ！'],
      balanced: ['得意な動きが流れを変える。', '強みのぶつかり合いが続く。', '互いの狙いが交差する。']
    };
    // 敗者の技は中盤に必ず登場し、決着は確定した勝者の設定だけを使う。
    const ending = `${contexts[kind][variant]}「${cards[winner].name}」が${finish.action}。粘る相手を退け、勝利をつかんだ！`;
    const middle = middlePatterns[variant];
    let body = `序盤：${opening}\n\n中盤：${middle}\n\n終盤：${ending}`;
    if (body.length < 150) body += '両者の挑戦に大きな拍手だ！';
    const headlines = { close: '最後までゆずらない接戦！', dominant: '得意技でつかむ堂々の勝利！', upset: '得意技が生んだ番狂わせ！', balanced: '持ち味がぶつかる熱い勝負！' };
    return Object.freeze({ headline: headlines[kind], opening, middle, ending, kind, close,
      playerSkill: moves.player.stat, cpuSkill: moves.cpu.stat, finish: finish.label,
      winnerId: cards[winner].id, loserId: cards[loser].id, body });
  }
  window.HumanityStory = { generateStory };
})();
