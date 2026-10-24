(() => {
  'use strict';
  // 演出専用の動作表現。既存のスタイル・技の範囲内で、攻撃の入り方を描く。
  // 攻撃はまだ決着していない動作に限定し、勝者の反撃へつなげる。
  const ATTACKS = {
    neanderthal: ['rush', '肩から勢いよく突っ込んだ'],
    'paleolithic-hunter': ['distance', '左右に動き、隙を見つけて打撃を放った'],
    spartan: ['clinch', '打撃から懐へ踏み込み、胴に組み付いた'],
    gladiator: ['distance', '間合いを変え、鋭い打撃を放った'],
    samurai: ['clinch', '体を横へさばき、相手の腕をつかんだ'],
    'medieval-knight': ['clinch', '肩をぶつけるように力強く組み付いた'],
    'mongol-cavalry': ['distance', '素早く踏み込み、一撃を放って身を引いた'],
    'edo-farmer': ['rush', '足を踏ん張り、体当たりを仕掛けた'],
    viking: ['distance', '大きく腕を振り、豪快な打撃を放った'],
    'meiji-sumo': ['clinch', '突っ張りを続け、前へ押し出した'],
    'ww2-japanese-soldier': ['clinch', '打撃を交えて近づき、腕をつかんだ'],
    'ww2-us-soldier': ['clinch', '打撃を放ちながら前へ押し込んだ'],
    'us-office-worker': ['wild', 'ぎこちなく拳を振り、必死に前へ出た'],
    sumo: ['clinch', '突っ張りで押し込み、四つに組もうと迫った'],
    'heavyweight-boxer': ['distance', 'ジャブを伸ばし、距離を保った'],
    'heavyweight-judoka': ['clinch', '腕をつかみ、大外刈りで崩そうとした'],
    'mma-fighter': ['shot', 'パンチでけん制し、低くタックルを仕掛けた'],
    'bjj-fighter': ['ground', '腕を取り、寝技へ引き込もうとした'],
    'japanese-delinquent': ['clinch', '大振りのパンチから服をつかんで引いた'],
    'nakameguro-barber': ['wild', '大きく腕を振って打撃を仕掛けた'],
    'modern-us-soldier': ['clinch', '打撃を交え、相手の腕をつかんだ'],
    hacker: ['wild', '後ずさりしながら、とっさにパンチを出した'],
    'american-rapper': ['wild', 'とっさのパンチを放って前へ出た'],
    'chinese-man': ['wild', '顔を守りながら、不器用な反撃を繰り出した'],
    'muay-thai': ['kick', '鋭いローキックで前足を狙った'],
    'oil-wrestler': ['clinch', '胴に腕を回し、力強く組み付いた'],
    'rugby-player': ['shot', '低い姿勢から突進し、タックルを仕掛けた'],
    'japanese-office-worker': ['clinch', '顔を守りながら、必死に相手の腕をつかんだ'],
    bodybuilder: ['clinch', '太い腕を伸ばし、力強く胴に組み付いた'],
    'female-mma-fighter': ['shot', '素早い打撃からタックルへ飛び込んだ']
  };

  // 最初だけ正式名称を使い、以降は人物を取り違えない固有の短縮名を使う。
  const ALIASES = {
    "neanderthal": "ネアンデルタール",
    "paleolithic-hunter": "狩人",
    "spartan": "スパルタ兵",
    "gladiator": "剣闘士",
    "samurai": "武士",
    "medieval-knight": "騎士",
    "mongol-cavalry": "騎兵",
    "edo-farmer": "農民",
    "viking": "ヴァイキング",
    "meiji-sumo": "明治の力士",
    "ww2-japanese-soldier": "日本兵",
    "ww2-us-soldier": "大戦期の米兵",
    "us-office-worker": "社会人",
    "sumo": "大相撲の力士",
    "heavyweight-boxer": "ボクサー",
    "heavyweight-judoka": "柔道家",
    "mma-fighter": "総合格闘家",
    "bjj-fighter": "柔術選手",
    "japanese-delinquent": "ヤンキー",
    "nakameguro-barber": "バーバー",
    "modern-us-soldier": "現代の米兵",
    "hacker": "ハッカー",
    "american-rapper": "ラッパー",
    "chinese-man": "一般男性",
    "muay-thai": "ムエタイ選手",
    "oil-wrestler": "オイルレスラー",
    "rugby-player": "ラグビー選手",
    "japanese-office-worker": "会社員",
    "bodybuilder": "ボディビルダー",
    "female-mma-fighter": "女性MMA選手"
  };

  // 決まり手を先に選び、命中→反応→最後の動作を一つの筋として生成する。
  // {w}/{l}は必ず確定済みの勝者/敗者へ置換し、動作の主体を固定する。
  const FINISHES = {
    "組み付きからの押し倒し": {
      "range": "clinch",
      "counter": "{w}は両腕で{l}の胴を抱え、足を広げた。",
      "resistance": "{l}は押し返すが、上体が後ろへ反る。",
      "finish": "{w}は体を寄せ、傾いた{l}を全身で押し倒した！",
      "headline": "突進からの押し倒し！"
    },
    "打撃からの押し倒し": {
      "range": "strike",
      "counter": "{w}の打撃が{l}の上体を揺らした！",
      "resistance": "{l}は顔を守ろうと腕を上げ、足元の構えが緩む。",
      "finish": "{w}は空いた胴へ組み付き、{l}を地面へ押し倒した！",
      "headline": "打撃の隙から押し倒せ！"
    },
    "投げからの押さえ込み": {
      "range": "clinch",
      "counter": "{w}は短い打撃から、{l}の胴へ組み付いた。",
      "resistance": "{l}は押し返そうと足を踏ん張り、体を前へ傾ける。",
      "finish": "{w}はその勢いで{l}を投げ、上から押さえ込んだ！",
      "headline": "組み付いて一気に投げる！"
    },
    "打撃からの制圧": {
      "range": "strike",
      "counter": "{w}のパンチが{l}に当たり、体勢を崩した！",
      "resistance": "{l}は顔をかばい、後ずさりしながら腕を伸ばす。",
      "finish": "{w}はその隙に{l}へ組み付き、地面へ押し倒して動きを封じた！",
      "headline": "パンチから一気に制圧！"
    },
    "崩しからの投げ": {
      "range": "clinch",
      "counter": "{w}は体をさばき、{l}の腕を斜めに引いた。",
      "resistance": "{l}は倒れまいと踏ん張り直し、片足を浮かせる。",
      "finish": "{w}は浮いた足が戻る前に{l}を投げ、押さえ込んだ！",
      "headline": "体さばきから鮮やかな投げ！"
    },
    "組み倒し": {
      "range": "clinch",
      "counter": "{w}は肩を寄せ、{l}の上体を横へ押した。",
      "resistance": "{l}は押し返すが、踏ん張る足がそろってしまう。",
      "finish": "{w}はその一瞬に体をひねり、{l}を組み倒した！",
      "headline": "肩を寄せて豪快な組み倒し！"
    },
    "素早い反撃": {
      "range": "evade",
      "counter": "{w}は細かく足を動かし、{l}の正面を外した。",
      "resistance": "{l}は向き直りながら拳を伸ばし、追いすがる。",
      "finish": "{w}は伸びた腕の外へ回り、{l}に素早い反撃を決めた！",
      "headline": "足運びから鋭い反撃！"
    },
    "体当たりからの押し倒し": {
      "range": "rush",
      "counter": "{w}は足を広げて踏みとどまり、肩を低く構えた。",
      "resistance": "{l}は押し切ろうと体重を前へかけ、踏み出す。",
      "finish": "{w}はそこへ体当たりを合わせ、{l}を押し倒した！",
      "headline": "踏ん張りから体当たり！"
    },
    "強打からの組み倒し": {
      "range": "strike",
      "counter": "{w}の強打が{l}に当たり、体をぐらつかせた！",
      "resistance": "{l}は顔を守りながら腰を引き、踏ん張ろうとする。",
      "finish": "{w}は{l}の胴を抱え、足が戻る前に組み倒した！",
      "headline": "強打から豪快な組み倒し！"
    },
    "四つ組みからの投げ": {
      "range": "clinch",
      "counter": "{w}は腕を差し入れて四つに組み、{l}へ腰を寄せた。",
      "resistance": "{l}は押し返そうとするが、片足に体重が乗る。",
      "finish": "{w}は重さが移った瞬間に腰を回し、{l}を投げた！",
      "headline": "腰を寄せて堂々の投げ！"
    },
    "突っ張りからの押し倒し": {
      "range": "clinch",
      "counter": "{w}は突っ張りを返し、{l}を一歩ずつ後ろへ下げた。",
      "resistance": "{l}は足を踏ん張り直すが、上体が起きてしまう。",
      "finish": "{w}はそこへ続けて突っ張り、{l}を押し倒した！",
      "headline": "止まらない突っ張り！"
    },
    "打撃からの組み倒し": {
      "range": "strike",
      "counter": "{w}の打撃が{l}をひるませ、守りを上げさせた！",
      "resistance": "{l}は両腕で顔を守り、近づかれるのをこらえる。",
      "finish": "{w}は{l}の胴へ組み付き、体勢を崩して組み倒した！",
      "headline": "打撃が開いた組み倒し！"
    },
    "寄りからの押し倒し": {
      "range": "clinch",
      "counter": "{w}は四つに組み、足を進めて{l}を押した。",
      "resistance": "{l}は腰を引いて耐えるが、かかとが浮き始める。",
      "finish": "{w}は踏ん張りが切れた{l}へ寄り、押し倒した！",
      "headline": "四つに組んで押し切れ！"
    },
    "フックによるKO": {
      "range": "punch",
      "counter": "{w}はジャブで距離を保ち、ストレートを伸ばした。",
      "resistance": "{l}は腕を顔の前にそろえ、正面のパンチを防ぐ。",
      "finish": "{w}のフックが守りの横から{l}をとらえ、KOを奪った！",
      "headline": "間合いを制するフック！"
    },
    "大外刈りからの押さえ込み": {
      "range": "clinch",
      "counter": "{w}は{l}の腕をつかみ、ぐっと引き寄せた。",
      "resistance": "{l}は投げをこらえようと踏ん張り、後ろ足へ体重を乗せる。",
      "finish": "{w}はその足を大外刈りで払い、倒れた{l}を押さえ込んだ！",
      "headline": "一瞬の隙を突く大外刈り！"
    },
    "寝技からの関節技": {
      "range": "ground",
      "counter": "{w}は足をからめて{l}を引き込み、寝技に持ち込んだ。",
      "resistance": "{l}は上体を起こそうと、片腕を床につく。",
      "finish": "{w}は伸びた腕を関節技に取り、{l}の降参を引き出した！",
      "headline": "伸びた腕を逃さない関節技！"
    },
    "スイープからの絞め技": {
      "range": "ground",
      "counter": "{w}は足をからめて{l}を引き込み、下から腰を浮かせた。",
      "resistance": "{l}は上に残ろうと手をつくが、体が横へ傾く。",
      "finish": "{w}はスイープで上下を返し、絞め技で{l}を降参させた！",
      "headline": "下から返す鮮やかなスイープ！"
    },
    "パンチからの押し倒し": {
      "range": "strike",
      "counter": "{w}が必死に振ったパンチが、{l}をひるませた！",
      "resistance": "{l}は顔を守ろうとして、足元がもつれる。",
      "finish": "{w}は{l}につかみかかり、そのまま地面へ押し倒した！",
      "headline": "必死のパンチが道を開く！"
    },
    "とっさの反撃": {
      "range": "evade",
      "counter": "{w}は逃げるように下がり、震える拳を構え直した。",
      "resistance": "{l}はあと一歩で届くと思い、両腕を伸ばして迫る。",
      "finish": "{w}のとっさのパンチが飛び込んできた{l}に重なり、足を止めた！",
      "headline": "とっさの一撃が届いた！"
    },
    "とっさの一撃": {
      "range": "evade",
      "counter": "{w}は顔を守り、足を踏ん張って拳を握り直した。",
      "resistance": "{l}は守りを崩そうと、大きく腕を伸ばす。",
      "finish": "{w}のとっさの一撃が空いた脇に入り、{l}の足を止めた！",
      "headline": "守り抜いて、とっさの一撃！"
    },
    "膝蹴りによるKO": {
      "range": "knee",
      "counter": "{w}は足を踏ん張り、{l}の上体を引き寄せた。",
      "resistance": "{l}は押し返そうと、肩を下げて身を乗り出す。",
      "finish": "{w}の膝蹴りが低くなった{l}の上体に命中し、KOを奪った！",
      "headline": "膝蹴り一閃！"
    },
    "足掛けからの押さえ込み": {
      "range": "clinch",
      "counter": "{w}は{l}の胴を抱え、左右に揺さぶった。",
      "resistance": "{l}は倒れまいと踏ん張り直し、片足に体重を乗せる。",
      "finish": "{w}はその足に足掛けを合わせ、倒れた{l}を押さえ込んだ！",
      "headline": "足掛けで一気に決着！"
    },
    "タックルからの制圧": {
      "range": "shot",
      "counter": "{w}は姿勢を低くし、{l}の胴へ肩から飛び込んだ。",
      "resistance": "{l}は肩を押して耐えるが、後ろへ足が流れる。",
      "finish": "{w}は足を止めずタックルで{l}を倒し、上から動きを封じた！",
      "headline": "止まらないタックル！"
    },
    "とっさの反撃からの押し倒し": {
      "range": "rush",
      "counter": "{w}は必死に踏みとどまり、両手を前へ突き出した。",
      "resistance": "{l}はつかもうと両腕を伸ばし、前へ身を乗り出す。",
      "finish": "{w}の押し返しがその踏み込みと重なり、{l}を押し倒した！",
      "headline": "必死の押し返しで決着！"
    },
    "力による押し倒し": {
      "range": "clinch",
      "counter": "{w}は{l}の胴を抱え、足を開いて腰を落とした。",
      "resistance": "{l}は腕をほどこうとするが、体を離せない。",
      "finish": "{w}は逃げようと浮いた{l}の体を、力強く押し倒した！",
      "headline": "逃がさない、力の押し倒し！"
    },
    "タックルからの関節技": {
      "range": "shot",
      "counter": "{w}はタックルで{l}を倒し、上から体を押さえた。",
      "resistance": "{l}は起き上がろうと、片腕を床につく。",
      "finish": "{w}はついた腕を関節技に取り、{l}の降参を引き出した！",
      "headline": "タックルから腕を取れ！"
    },
    "打撃によるKO": {
      "range": "strike",
      "counter": "{w}は素早い打撃で{l}の守りを左右に動かした。",
      "resistance": "{l}は腕を上げて受け止めるが、戻す動きが遅れる。",
      "finish": "{w}は戻りきらない守りの隙へ打撃を決め、{l}からKOを奪った！",
      "headline": "守りの隙へ連続打撃！"
    }
  };

  // 入ってくる攻撃と、勝者が必要とする距離を組み合わせた受け方。
  function receive(incoming, target, variant) {
    if (incoming === 'shot') return ['腰を引き、両腕で肩を押さえてこらえた', '足を広げ、飛び込んでくる体を受け止めた', '両手で肩を押し、倒されるのをこらえた'][variant];
    if (incoming === 'ground') return target === 'ground' ? '腕を取られたまま、足を開いて体勢を保った' : '腰を引いて腕を突っ張り、引き込まれるのをこらえた';
    if (incoming === 'clinch' || incoming === 'rush') return ['足を開いて踏ん張り、押し込まれるのをこらえた', '両腕で押し返し、足が滑るのをこらえた', '足を引いて体を支え、倒れるのをこらえた'][variant];
    if (incoming === 'kick') return '腕とすねで蹴りを受け、足を踏み替えて耐えた';
    if (target === 'clinch' || target === 'shot' || target === 'ground') return '腕で顔を守り、一歩ずつ近づく機会をうかがった';
    return ['腕で打撃を受け、半歩下がって構え直した', '上体を引き、伸びてくる拳をぎりぎりで外した', '顔を守って一歩下がり、相手の腕を見据えた'][variant];
  }

  // 距離を変える動作は独立した短文にし、反撃の文へ動作を詰め込まない。
  function connect(incoming, target, winnerId, w, l, variant) {
    const contact = ['clinch', 'rush', 'shot', 'ground'].includes(incoming);
    if (target === 'ground') {
      if (winnerId === 'bjj-fighter') return `${w}は${l}の腕を取り、腰を落として座り込んだ。`;
      return incoming === 'kick' ? `${w}は蹴り足が戻る瞬間に踏み込んだ。` : `${w}は${l}へ体を寄せ、腰を低く構えた。`;
    }
    if (['punch', 'evade', 'strike'].includes(target)) {
      if (contact) return `${w}は${l}の肩を押し、体を離した。`;
      return [`${w}は${l}の腕が戻る瞬間に前へ出た。`, `${w}は${l}の踏み込みに合わせて動いた。`, `${w}は一歩踏み直し、${l}に向き直った。`][variant];
    }
    if (target === 'knee') return `${w}は${l}の腕を内側から押し上げた。`;
    if (target === 'clinch' || target === 'shot') {
      if (incoming === 'kick') return `${w}は蹴った足が戻る前に懐へ入った。`;
      return contact ? `${w}は${l}の押す力が緩むと、両腕を内側へ回した。` : `${w}は${l}の腕の内側へ踏み込んだ。`;
    }
    return `${w}は${l}の腕を見つめ、体を固くした。`;
  }

  function generateStory(result) {
    const { playerCard, cpuCard, winner, decision, round, firstSide } = result;
    const battle = window.HumanityBattle;
    const cards = { player: playerCard, cpu: cpuCard }, loser = winner === 'player' ? 'cpu' : 'player';
    const winCard = cards[winner], loseCard = cards[loser];
    const profiles = window.COMBAT_STYLES;
    const stats = { player: decision.playerStats || playerCard.stats, cpu: decision.cpuStats || cpuCard.stats };
    const gap = (decision.playerPower ?? battle.calculatePower(playerCard)) - (decision.cpuPower ?? battle.calculatePower(cpuCard));
    const percent = decision.playerWinPercent ?? battle.calculatePlayerWinPercent(battle.calculatePower(playerCard), battle.calculatePower(cpuCard));
    const upset = (winner === 'player' ? percent : 100 - percent) < 50;
    const close = Math.abs(gap) <= 20;
    const kind = upset ? 'upset' : close ? 'close' : Math.abs(gap) >= 90 ? 'dominant' : 'balanced';
    let seed = 0;
    for (const char of `${playerCard.id}|${cpuCard.id}|${round}|${winner}|${firstSide}|${decision.roll ?? 0}`) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
    const variant = seed % 3;
    // 追加の乱数を消費しない。人物設定の候補と既存能力だけで決まり手を選ぶ。
    const choices = profiles[winCard.id].finishes;
    let point = (seed % 1009) / 1009 * choices.reduce((sum, move) => sum + stats[winner][move.stat], 0);
    const finish = choices.find(move => (point -= stats[winner][move.stat]) < 0) || choices.at(-1);
    const plan = FINISHES[finish.label], attack = ATTACKS[loseCard.id];
    const w = ALIASES[winCard.id], l = ALIASES[loseCard.id];
    const render = text => text.replaceAll('{w}', w).replaceAll('{l}', l);
    const counter = finish.label === '寝技からの関節技' && winCard.id === 'mma-fighter'
      ? `${w}はタックルで${l}を倒し、上から体を押さえた。` : render(plan.counter);
    const opening = `「${loseCard.name}」と「${winCard.name}」が激突。${l}が${attack[1].replaceAll('相手', w)}！${w}は${receive(attack[0], plan.range, variant).replaceAll('相手', l)}。`;
    const counterSentence = counter.startsWith(`${w}は`) ? counter.slice(w.length + 1) : counter;
    const middle = connect(attack[0], plan.range, winCard.id, w, l, variant) + counterSentence + render(plan.resistance);
    const endings = upset ? (close
      ? ['接戦から番狂わせの勝利だ！', '接戦を制し、不利な予想を覆した勝利！', '接戦の末、番狂わせの勝利！']
      : ['番狂わせの勝利だ！', '不利な予想を覆して勝利！', 'まさかの番狂わせで勝利！'])
      : close ? ['わずかな隙をつき、接戦に勝利！', '競り合った接戦を制し、勝利！', 'ゆずらない接戦を制して勝利！']
      : kind === 'dominant' ? ['相手に立て直す間を与えず勝利！', '押し返す間を与えず勝利！', '最後は相手を動かさない、堂々の勝利だ！']
      : ['踏み込む一歩で勝利をつかんだ！', '抵抗を振り切り、勝利をつかんだ！', '一瞬の反撃で勝利をつかんだ！'];
    const ending = render(plan.finish) + endings[variant].replaceAll('相手', l);
    return Object.freeze({ headline: upset ? `${finish.label}で逆転！` : plan.headline, opening, middle, ending, kind, close,
      finish: finish.label, playerSkill: winner === 'player' ? finish.stat : profiles[playerCard.id].techniques[0].stat,
      cpuSkill: winner === 'cpu' ? finish.stat : profiles[cpuCard.id].techniques[0].stat,
      winnerId: winCard.id, loserId: loseCard.id, winnerAlias: w, loserAlias: l,
      body: `${opening}\n\n${middle}\n\n${ending}` });
  }
  window.HumanityStory = { generateStory };
})();
