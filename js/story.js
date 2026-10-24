(() => {
  'use strict';
  // 演出専用の動作表現。既存のスタイル・技の範囲内で、攻撃と追撃を対にする。
  // 攻撃はまだ決着していない動作に限定し、勝者の反撃へつなげる。
  const ATTACKS = {
    neanderthal: ['rush', '肩から勢いよく突っ込んだ', '両腕を伸ばし、胴を抱え込もうと迫る'],
    'paleolithic-hunter': ['distance', '左右に動き、隙を見つけて打撃を放った', '踏み込みながらもう一撃を狙う'],
    spartan: ['clinch', '打撃を放ちながら懐へ踏み込んだ', '腕を伸ばして組み付き、押し込もうとする'],
    gladiator: ['distance', '間合いを変え、鋭い打撃を放った', '打撃の後を追い、胴へ腕を伸ばす'],
    samurai: ['clinch', '体を横へさばき、相手の腕をつかんだ', '足を踏み替え、重心を崩そうと引く'],
    'medieval-knight': ['clinch', '肩をぶつけるように力強く組み付いた', '肩を寄せ、体勢を崩そうと押し込む'],
    'mongol-cavalry': ['distance', '素早く踏み込み、一撃を放って身を引いた', '横へ回り、間合いを変えて打撃を狙う'],
    'edo-farmer': ['rush', '足を踏ん張り、体当たりを仕掛けた', '押し戻されても足を止めず、体を寄せる'],
    viking: ['distance', '大きく腕を振り、豪快な打撃を放った', '打撃に続けて腕を伸ばし、組み付こうとする'],
    'meiji-sumo': ['clinch', '突っ張りを続け、前へ押し出した', '四つに組もうと腕を差し入れる'],
    'ww2-japanese-soldier': ['clinch', '打撃を交え、組み付ける距離へ踏み込んだ', '腕をつかみ、体勢を崩そうとする'],
    'ww2-us-soldier': ['clinch', '打撃を放ちながら前へ押し込んだ', '胴に腕を回し、さらに体を寄せる'],
    'us-office-worker': ['wild', 'ぎこちなく拳を振り、必死に前へ出た', '空振りしても踏みとどまり、体当たりを狙う'],
    sumo: ['clinch', '突っ張りで押し込み、四つに組もうと迫った', '腕を差し入れ、足を進めて寄ろうとする'],
    'heavyweight-boxer': ['distance', 'ジャブを伸ばし、距離を保った', 'ジャブの後にストレートを伸ばす'],
    'heavyweight-judoka': ['clinch', '腕をつかみ、大外刈りで崩そうとした', '足を踏み替え、内股で投げようと引き寄せる'],
    'mma-fighter': ['shot', 'パンチでけん制し、低くタックルを仕掛けた', '踏み込み直して両脚へ腕を伸ばす'],
    'bjj-fighter': ['ground', '腕を取り、寝技へ引き込もうとした', '腕をつかみ直し、引き込もうと腰を落とす'],
    'japanese-delinquent': ['clinch', '大振りのパンチから服をつかんで引いた', 'つかんだ服を離さず、前へ押し込む'],
    'nakameguro-barber': ['wild', '大きく腕を振って打撃を仕掛けた', '体を寄せ、必死に組み付こうと腕を伸ばす'],
    'modern-us-soldier': ['clinch', '打撃を交え、相手の腕をつかんだ', '重心を崩そうと足を進め、体を寄せる'],
    hacker: ['wild', '後ずさりしながら、とっさにパンチを出した', '距離を取ろうと下がりつつ、必死に拳を伸ばす'],
    'american-rapper': ['wild', 'とっさのパンチを放って前へ出た', '拳が届かないと近づき、両手で押そうとする'],
    'chinese-man': ['wild', '顔を守りながら、不器用な反撃を繰り出した', '腕を下げず、体当たりで押し返そうとする'],
    'muay-thai': ['kick', '鋭いローキックで前足を狙った', '間合いを詰め、ミドルキックを蹴り込む'],
    'oil-wrestler': ['clinch', '胴に腕を回し、力強く組み付いた', '足を掛けようと踏み込み、体を揺さぶる'],
    'rugby-player': ['shot', '低い姿勢から突進し、タックルを仕掛けた', '足を止めず、肩を押し付けて前へ進む'],
    'japanese-office-worker': ['clinch', '顔を守りながら、必死に相手の腕をつかんだ', 'つかんだ腕を離さず、とっさに押し返す'],
    bodybuilder: ['clinch', '太い腕を伸ばし、力強く胴に組み付いた', '腕に力を込め、体ごと押し込もうとする'],
    'female-mma-fighter': ['shot', '素早い打撃からタックルへ飛び込んだ', '姿勢を低くし直し、腕を伸ばして押し込む']
  };

  // 決まり手ごとに、反撃で作る体勢→相手の抵抗→空いた箇所を固定する。
  // 技名のランダムな連結で立ち位置が飛ばないよう、一つの流れとして選ぶ。
  const FINISHES = {
    '組み付きからの押し倒し': ['clinch', '両腕で胴を抱え、ぐっと体を寄せた', '相手が足を踏ん張るほど、上体が後ろへ反る', 'その傾きを逃さず、全身で押し倒した', '突進からの押し倒し！'],
    '打撃からの押し倒し': ['strike', '打撃を返し、相手をのけぞらせた', '相手は腕を上げて守り、足元が緩む', '空いた胴へ飛び込み、そのまま押し倒した', '一撃で開いた勝利への道！'],
    '投げからの押さえ込み': ['clinch', '打撃で腕を上げさせ、懐でがっちり組み付いた', '相手が押し返した力で、重心が前へ移る', 'その勢いを使って投げ、上から押さえ込んだ', '組み付いて一気に投げる！'],
    '打撃からの制圧': ['strike', '打撃を返し、ひるんだ相手の胴へ組み付いた', '相手は体を起こそうとするが、足がそろう', 'その足元を崩して組み伏せ、動きを封じた', '打撃から一気に制圧！'],
    '崩しからの投げ': ['clinch', '体をさばいて腕を取り、斜めに引き寄せた', '相手は踏ん張り直そうと片足を浮かせる', '浮いた瞬間に重心を崩し、投げて押さえ込んだ', '体さばきから鮮やかな投げ！'],
    '組み倒し': ['clinch', '肩を寄せて組み付き、上体を横へ押した', '相手が押し返すと、踏ん張る足がそろう', 'その一瞬に体をひねり、組み倒した', '肩を寄せて豪快な組み倒し！'],
    '素早い反撃': ['evade', '足を細かく動かし、相手の正面を外した', '相手は向き直りながら、拳を伸ばして追う', '伸びた腕の外へ回り、素早い反撃を決めた', '足運びから鋭い反撃！'],
    '体当たりからの押し倒し': ['rush', '足を広げて踏みとどまり、肩を低く構えた', '相手は押し切ろうと前へ体重をかける', '踏み出したところへ体当たりを合わせ、押し倒した', '踏ん張りから体当たり！'],
    '強打からの組み倒し': ['strike', '強打を返し、腕で守る相手の胴を抱えた', '相手は必死に腰を引くが、片足が浮く', '足が戻る前に体を寄せ、豪快に組み倒した', '強打から豪快な組み倒し！'],
    '四つ組みからの投げ': ['clinch', '腕を差し入れて四つに組み、腰をぴたりと寄せた', '相手が押し返すと、片足に体重が乗る', '重さが移った瞬間に腰を回し、投げを決めた', '腰を寄せて堂々の投げ！'],
    '突っ張りからの押し倒し': ['clinch', '突っ張りを返し、相手を一歩ずつ後ろへ下げた', '相手は踏ん張り直すが、上体が起きる', 'そこへ続けて突っ張りを浴びせ、押し倒した', '止まらない突っ張り！'],
    '打撃からの組み倒し': ['strike', '打撃で守りを上げさせ、腕を回して組み付いた', '相手が腕をほどこうとすると、体が横を向く', 'その向きに合わせて重心を崩し、組み倒した', '打撃が開いた組み倒し！'],
    '寄りからの押し倒し': ['clinch', '腕を差し入れて四つに組み、足を進めて寄った', '相手は腰を引いて耐えるが、かかとが浮く', '踏ん張りが切れたところへ寄り切り、押し倒した', '四つに組んで押し切れ！'],
    'フックによるKO': ['punch', 'ジャブで間合いを取り戻し、ストレートを伸ばした', '相手は顔の前で腕をそろえ、正面を守る', 'その腕の横から鋭いフックを決め、KOを奪った', '間合いを制するフック！'],
    '大外刈りからの押さえ込み': ['clinch', '腕をつかんで懐へ引き寄せ、足を前へ置いた', '相手が投げをこらえると、後ろ足に体重が乗る', 'その足を大外刈りで払い、倒して押さえ込んだ', '一瞬の隙を突く大外刈り！'],
    '寝技からの関節技': ['ground', '腕を引き寄せ、寝技で相手の体を抱え込んだ', '相手は上体を起こそうと、片腕を伸ばす', 'その腕を逃さず関節技に取り、降参を引き出した', '伸びた腕を逃さない関節技！'],
    'スイープからの絞め技': ['ground', '足をからめて引き込み、下から腰を浮かせた', '相手は上に残ろうと手をつくが、体が傾く', 'スイープで上下を返し、絞め技で降参を引き出した', '下から返す鮮やかなスイープ！'],
    'パンチからの押し倒し': ['strike', '必死にパンチを返し、ひるんだ相手につかみかかった', '相手は腕を外そうとするが、足元がもつれる', 'その隙に体を寄せ、押し倒した', '必死のパンチが道を開く！'],
    'とっさの反撃': ['evade', '逃げるように下がりながら、震える拳を構え直した', '相手は届くと思い、一気に腕を伸ばしてくる', 'とっさに出したパンチを合わせ、相手の足を止めた', 'とっさの一撃が届いた！'],
    'とっさの一撃': ['evade', '腕で顔を守り、足を踏ん張って拳を握り直した', '相手は守りを崩そうと、大きく腕を伸ばす', '空いた脇へとっさの一撃を入れ、相手の足を止めた', '守り抜いて、とっさの一撃！'],
    '膝蹴りによるKO': ['knee', '踏ん張って間合いを詰め、相手の上体を引き寄せた', '相手は押し返そうと、さらに前へ体を乗り出す', '低くなった上体へ膝蹴りを突き上げ、KOを奪った', '踏み込んだ膝蹴り一閃！'],
    '足掛けからの押さえ込み': ['clinch', '腕をくぐらせて胴を抱え、左右に体を揺さぶった', '相手が踏ん張り直すと、片足に体重が集まる', 'その足に足掛けを合わせ、倒して押さえ込んだ', '足掛けで一気に決着！'],
    'タックルからの制圧': ['shot', '姿勢を低くして、肩から胴へ飛び込んだ', '相手は腕で肩を押すが、後ろへ足が流れる', '足を止めずタックルで倒し、上から動きを封じた', '止まらないタックル！'],
    'とっさの反撃からの押し倒し': ['rush', '押し込まれる体を必死に押し返し、両手を突き出した', '相手はつかもうと両腕を伸ばし、身を乗り出す', 'とっさの押し返しがうまく合い、そのまま押し倒した', '必死の押し返しで決着！'],
    '力による押し倒し': ['clinch', '両腕で胴を抱え、足を開いて腰を落とした', '相手が腕をほどこうとしても、体が離れない', '逃げようと浮いた体を力強く押し倒した', '逃がさない、力の押し倒し！'],
    'タックルからの関節技': ['shot', '低く飛び込んでタックルを決め、上から体を押さえた', '相手は起き上がろうと、片腕を床につく', 'ついた腕をすかさず関節技に取り、降参を引き出した', 'タックルから腕を取れ！'],
    '打撃によるKO': ['strike', '打撃を素早く返し、相手の守りを左右に動かした', '相手は受け止めようと腕を上げるが、動きが遅れる', '戻りきらない守りの隙へ打撃を続け、KOを奪った', '守りの隙へ連続打撃！']
  };

  // 入ってくる攻撃と、勝者が必要とする距離を組み合わせた受け方。
  function receive(incoming, target, variant) {
    if (incoming === 'shot') return ['腰を引き、両腕で肩を押さえてこらえた', '足を広げ、飛び込んでくる体を受け止めた', '腰を落とし、肩を押して倒されるのをこらえた'][variant];
    if (incoming === 'ground') return target === 'ground' ? '腰を落とし、腕を取られたまま体勢を保った' : '腰を引いて腕を突っ張り、引き込まれるのをこらえた';
    if (incoming === 'clinch' || incoming === 'rush') return ['足を開いて踏ん張り、押し込まれるのをこらえた', '腰を落とし、腕を突っ張って体を支えた', '足を引いて体を支え、倒れるのをこらえた'][variant];
    if (incoming === 'kick') return '腕とすねで蹴りを受け、足を踏み替えて耐えた';
    if (target === 'clinch' || target === 'shot' || target === 'ground') return '腕で顔を守り、一歩ずつ近づく機会をうかがった';
    return ['腕で打撃を受け、半歩下がって構え直した', '上体を引き、伸びてくる拳をぎりぎりで外した', '顔を守って一歩下がり、相手の腕を見据えた'][variant];
  }

  // 接触中→離れる、遠い→踏み込む、寝技へ入る、の接続を明示する。
  function connect(incoming, target, winnerId) {
    const contact = ['clinch', 'rush', 'shot', 'ground'].includes(incoming);
    if (target === 'ground') {
      if (winnerId === 'bjj-fighter') return incoming === 'kick'
        ? '蹴りを受けて近づき、腕を取り座り込み、' : '相手の腕をつかんだまま座り込み、';
      if (incoming === 'kick') return '蹴った足が戻る瞬間に踏み込み、';
      return contact ? '押し返す腕を引きながら体を寄せ、' : '伸びた腕の内側へ入り、';
    }
    if (target === 'punch' || target === 'evade' || target === 'strike') return contact ? '肩を押して体を離すと、' : '攻撃が戻る瞬間を狙い、';
    if (target === 'knee') return contact ? '押し合う腕の内側に手を入れ、' : '蹴りの間合いから一歩踏み込み、';
    if (target === 'clinch' || target === 'shot') {
      if (incoming === 'kick') return '蹴った足が戻る前に懐へ入り、';
      return contact ? '押し合う力が緩んだ瞬間、' : '伸びてきた腕の内側へ入り、';
    }
    return '相手の足が前へ出るのを待ち、';
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
    const w = `「${winCard.name}」`, l = `「${loseCard.name}」`;
    const setup = finish.label === '寝技からの関節技' && winCard.id === 'mma-fighter'
      ? 'タックルで倒して上に回り、相手の片腕を押さえた' : plan[1];
    const opening = `${l}が${attack[1]}！${w}は${receive(attack[0], plan[0], variant)}。`;
    const pursuit = [ `${attack[2]}相手に、`, `なおも${attack[2]}相手を前に、`, `${attack[2]}相手の動きに合わせ、` ][variant];
    const middle = `${pursuit}${w}は${connect(attack[0], plan[0], winCard.id)}${setup}。${plan[2]}。`;
    const endings = upset ? (close
      ? ['接戦から番狂わせの勝利だ！', '接戦を制し、不利な予想を覆した勝利！', '接戦の末、番狂わせの勝利！']
      : ['番狂わせの勝利だ！', '不利な予想を覆して勝利！', 'まさかの番狂わせで勝利！'])
      : close ? ['わずかな隙をつき、接戦に勝利！', '競り合った接戦を制し、勝利！', 'ゆずらない接戦を制して勝利！']
      : kind === 'dominant' ? ['相手に立て直す間を与えず勝利！', '押し返す間を与えず勝利！', '最後は相手を動かさない、堂々の勝利だ！']
      : ['踏み込む一歩で勝利をつかんだ！', '抵抗を振り切り、勝利をつかんだ！', '一瞬の反撃で勝利をつかんだ！'];
    const ending = `${w}は${plan[3]}。${endings[variant]}`;
    return Object.freeze({ headline: upset ? `${finish.label}で逆転！` : plan[4], opening, middle, ending, kind, close,
      finish: finish.label, playerSkill: winner === 'player' ? finish.stat : profiles[playerCard.id].techniques[0].stat,
      cpuSkill: winner === 'cpu' ? finish.stat : profiles[cpuCard.id].techniques[0].stat,
      winnerId: winCard.id, loserId: loseCard.id,
      body: `${opening}\n\n${middle}\n\n${ending}` });
  }
  window.HumanityStory = { generateStory };
})();
