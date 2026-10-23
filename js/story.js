(() => {
  'use strict';

  // 勝敗を変えず、確定した結果を格闘漫画風の物語へ変換する。
  // 技の命中・ダメージを計算するシミュレーションではない。
  const ACTIONS = Object.freeze({
    STR: ['力強い押し合いで前に出る。', 'パワーを生かして相手にせまる。', '力いっぱいに間合いをつめる。'],
    SPD: ['すばやい動きで間合いを変える。', '軽やかな足さばきで動き回る。', 'スピードを生かしてチャンスを探す。'],
    END: ['あせらずねばって機会を待つ。', 'スタミナを生かして動き続ける。', 'ねばり強く相手の動きを追う。'],
    STK: ['打撃をねらって間合いをはかる。', '打撃のチャンスをじっくりうかがう。', 'するどい打撃を意識してせまる。'],
    GRP: ['組み技をねらって近づく。', '組み合うチャンスを探して前へ出る。', '得意な組み技で流れをつかもうとする。'],
    SUB: ['関節技につなぐ機会をうかがう。', '関節技をねらって相手の動きを読む。', '得意な関節技への道を探す。']
  });

  function generateStory(result) {
    const { playerCard, cpuCard, winner, decision, firstSide, round } = result;
    const battle = window.HumanityBattle;
    const playerStats = decision.playerStats || playerCard.stats;
    const cpuStats = decision.cpuStats || cpuCard.stats;
    const playerPower = decision.playerPower ?? battle.calculatePower(playerCard);
    const cpuPower = decision.cpuPower ?? battle.calculatePower(cpuCard);
    const difference = playerPower - cpuPower;
    const upset = (difference > 0 && winner === 'cpu') || (difference < 0 && winner === 'player');
    const kind = upset ? 'upset' : Math.abs(difference) <= 20 ? 'close' : Math.abs(difference) >= 90 ? 'dominant' : 'balanced';
    // 保存結果を種にした切り替え。新たな乱数は取得しない。
    let seed = 0;
    for (const char of `${playerCard.id}|${cpuCard.id}|${round}|${winner}|${decision.roll ?? 0}`) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
    const variant = seed % 3;
    const strongest = (stats, offset) => {
      const best = Math.max(...battle.STATS.map(key => stats[key]));
      const tied = battle.STATS.filter(key => stats[key] === best);
      return tied[(variant + offset) % tied.length];
    };
    const playerSkill = strongest(playerStats, 0), cpuSkill = strongest(cpuStats, 1);
    const playerName = playerCard.name, cpuName = cpuCard.name;
    const winnerName = winner === 'player' ? playerName : cpuName;
    const firstName = firstSide === 'player' ? 'あなた' : 'CPU';
    const openings = [
      `「${playerName}」と「${cpuName}」が向かい合う！先攻は${firstName}。あなたは${battle.STAT_LABELS[playerSkill]}、CPUは${battle.STAT_LABELS[cpuSkill]}を武器に勝負へ！`,
      `先攻の${firstName}がカードを公開！「${playerName}」対「${cpuName}」、いよいよ開幕だ。あなたの${battle.STAT_LABELS[playerSkill]}とCPUの${battle.STAT_LABELS[cpuSkill]}に注目！`,
      `「${playerName}」と「${cpuName}」の勝負が始まる！先攻は${firstName}だ。あなたは${battle.STAT_LABELS[playerSkill]}、CPUは${battle.STAT_LABELS[cpuSkill]}を生かして構える。`
    ];
    const contexts = {
      close: ['互いにゆずらず、流れはまだ読めない！', '両者の力はほぼ互角。緊張が高まる！', 'どちらにもチャンスがある接戦だ！'],
      dominant: ['大きな力の差が、勝負の流れに表れる！', '有利な側の勢いがぐんぐん強まる！', '得意な力を押し出し、一気に流れをつかむ！'],
      upset: ['有利な予想にも負けず、挑戦が続く！', '不利な側もチャンスをあきらめない！', '予想どおりには終わらない気配だ！'],
      balanced: ['それぞれの強みがぶつかり合う！', '互いの得意な力を生かした勝負が続く！', 'チャンスをねらう両者に目が離せない！']
    };
    const middle = `あなたは${ACTIONS[playerSkill][variant]}CPUは${ACTIONS[cpuSkill][(variant + 1) % 3]}${contexts[kind][variant]}`;
    const endings = {
      close: [
        `最後のチャンスをつかんだのは「${winnerName}」！ゆずらない接戦を制して勝利だ。見ているこちらまで力が入る一戦だった！`,
        `勝利をつかんだのは「${winnerName}」！どちらが勝ってもおかしくない勝負に決着だ。両者のねばりに大きな拍手を送りたい！`,
        `「${winnerName}」が接戦を制して勝利！最後まで目が離せない組み合わせだった。次の勝負では、どんな流れが生まれるだろう！`
      ],
      dominant: [
        `「${winnerName}」が勢いそのままに勝利！圧勝を思わせる強さが光った。相手の挑戦も受け止めた、堂々の決着だ！`,
        `勝利は「${winnerName}」！得意な力を押し出す、圧倒するような勢いだった。大きな期待にこたえた一勝に拍手だ！`,
        `「${winnerName}」が勝利をつかんだ！力の強みを生かした圧勝のような幕切れだ。それでも、相手の挑戦する姿も忘れられない！`
      ],
      upset: [
        `なんと「${winnerName}」が勝利！不利な予想をくつがえす番狂わせだ。残されたチャンスから、会場がわくような結末が生まれた！`,
        `勝ったのは「${winnerName}」！予想をこえる番狂わせにびっくりだ。最後まであきらめない姿が、漫画の一場面のように心に残る！`,
        `「${winnerName}」が勝利！有利な側の予想をひっくり返す番狂わせだ。どんな勝負にもチャンスがあると感じさせる、熱い決着だった！`
      ],
      balanced: [
        `勝利をつかんだのは「${winnerName}」！それぞれの強みが光る一戦に決着だ。次はどんな組み合わせになるのか、また楽しみになる！`,
        `「${winnerName}」が勝利！得意な力を生かし合う勝負は、最後までわくわくさせてくれた。相手の強みにも拍手を送りたい！`,
        `この勝負は「${winnerName}」の勝利！持ち味をぶつけ合った両者に拍手だ。一つの力だけでは読めない勝負のおもしろさが光った！`
      ]
    };
    const headlines = {
      close: ['ゆずれない接戦の決着！', '互角の力がぶつかり合う！', '最後まで目が離せない！'],
      dominant: ['強みが光る堂々の勝利！', '圧倒するような勢い！', '得意な力を押し出せ！'],
      upset: ['まさかの番狂わせ！', '予想をこえる熱い決着！', 'チャンスをつかんだ挑戦者！'],
      balanced: ['それぞれの持ち味で勝負！', '得意な力がぶつかる一戦！', '勝利をつかむのはどっち！']
    };
    const opening = openings[variant], ending = endings[kind][variant];
    return Object.freeze({
      headline: headlines[kind][variant], opening, middle, ending, kind, playerSkill, cpuSkill,
      body: `序盤：${opening}\n\n中盤：${middle}\n\n決着：${ending}`
    });
  }

  window.HumanityStory = { generateStory };
})();
