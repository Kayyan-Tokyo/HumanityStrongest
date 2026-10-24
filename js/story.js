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
    sumo: ['clinch', '突っ張りで押し込み、四つに組んだ'],
    'heavyweight-boxer': ['distance', 'ジャブを伸ばし、距離を保った'],
    'heavyweight-judoka': ['clinch', '腕をつかみ、大外刈りで崩そうとした'],
    'mma-fighter': ['shot', 'パンチからタックルで胴に組み付いた'],
    'bjj-fighter': ['ground', '腕を取り、寝技へ引き込もうとした'],
    'japanese-delinquent': ['clinch', '大振りのパンチから服をつかんで引いた'],
    'nakameguro-barber': ['wild', '大きく腕を振って打撃を仕掛けた'],
    'modern-us-soldier': ['clinch', '打撃を交え、相手の腕をつかんだ'],
    hacker: ['wild', '半歩下がりながら、とっさにパンチを出した'],
    'american-rapper': ['wild', 'とっさのパンチを放って前へ出た'],
    'chinese-man': ['wild', '顔を守りながら、不器用なパンチを繰り出した'],
    'muay-thai': ['kick', '鋭いローキックで前足を狙った'],
    'oil-wrestler': ['clinch', '胴に腕を回し、力強く組み付いた'],
    'rugby-player': ['shot', '低く突進し、タックルで胴に組み付いた'],
    'japanese-office-worker': ['clinch', '顔を守りながら、必死に相手の腕をつかんだ'],
    bodybuilder: ['clinch', '太い腕を伸ばし、力強く胴に組み付いた'],
    'female-mma-fighter': ['shot', '素早い打撃からタックルで胴に組み付いた']
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
      "finish": "{w}はその勢いで{l}を投げ、地面で押さえ込んだ！",
      "headline": "組み付いて一気に投げる！"
    },
    "打撃からの制圧": {
      "range": "strike",
      "counter": "{w}のパンチが{l}に当たり、上体をのけぞらせた！",
      "resistance": "{l}は顔をかばい、後ずさりしながら腕を伸ばす。",
      "finish": "{w}はその隙に{l}へ組み付き、地面へ押し倒して動きを封じた！",
      "headline": "パンチから一気に制圧！"
    },
    "崩しからの投げ": {
      "range": "clinch",
      "counter": "{w}は体を横へさばき、{l}の手首をつかんで斜めに引いた。",
      "resistance": "{l}は倒れまいと踏ん張り直し、片足を浮かせる。",
      "finish": "{w}は浮いた足が戻る前に{l}を投げ、地面で押さえ込んだ！",
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
      "counter": "{w}は必死に両手を突き出し、肩を低く構えた。",
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
      "finish": "{w}のフックが守りの横から{l}をとらえた！{l}は崩れ落ちた！",
      "headline": "間合いを制するフック！"
    },
    "大外刈りからの押さえ込み": {
      "range": "clinch",
      "counter": "{w}は懐へ入り、{l}の腕をつかんで引き寄せた。",
      "resistance": "{l}は投げをこらえようと踏ん張り、後ろ足へ体重を乗せる。",
      "finish": "{w}はその足を大外刈りで払い、{l}を倒して押さえ込んだ！",
      "headline": "一瞬の隙を突く大外刈り！"
    },
    "寝技からの関節技": {
      "range": "ground",
      "counter": "{w}は座り込み、{l}を地面へ引き込んで足をからめた。",
      "resistance": "{l}は上体を起こそうと、片腕を床につく。",
      "finish": "{w}は伸びた腕を関節技に取り、{l}の降参を引き出した！",
      "headline": "伸びた腕を逃さない関節技！"
    },
    "スイープからの絞め技": {
      "range": "ground",
      "counter": "{w}は座って{l}を地面へ引き込み、下から腰を浮かせた。",
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
      "finish": "{w}の膝蹴りが低くなった{l}の上体に命中！{l}はその場に倒れた！",
      "headline": "膝蹴り一閃！"
    },
    "足掛けからの押さえ込み": {
      "range": "clinch",
      "counter": "{w}は{l}の胴を抱え、左右に揺さぶった。",
      "resistance": "{l}は倒れまいと踏ん張り直し、片足に体重を乗せる。",
      "finish": "{w}はその足に足掛けを合わせ、{l}を倒して押さえ込んだ！",
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
      "finish": "{w}は守りの隙へ打撃を決めた！{l}は崩れ落ちた！",
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

  // 物語専用。ゲームの状態・能力・乱数に触れない小さな状態機械。
  class SceneError extends Error {}
  const opponent = actor => actor === 'winner' ? 'loser' : 'winner';
  const snapshot = state => Object.freeze({ ...state,
    posture: Object.freeze({ ...state.posture }), holds: Object.freeze({ ...state.holds }) });
  function createScene() {
    return { state: snapshot({ distance: 'far', posture: { winner: 'standing', loser: 'standing' },
      holds: { winner: null, loser: null }, top: null, ended: null }), events: [] };
  }
  function advance(scene, action, actor, text, paragraph = 1) {
    const before = scene.state, target = opponent(actor);
    const next = { ...before, posture: { ...before.posture }, holds: { ...before.holds } };
    const need = (condition, reason) => { if (!condition) throw new SceneError(`${action}: ${reason}`); };
    need(['winner', 'loser'].includes(actor) && typeof text === 'string' && text.length > 0, '役割と動作の文章が必要');
    need(!before.ended, '決着後は動けない');
    const upright = before.posture[actor] !== 'ground' && before.posture[target] !== 'ground';
    const free = !before.holds.winner && !before.holds.loser;
    const near = () => need(before.distance === 'near' && upright, '立った近距離が必要');
    const standing = () => need(before.posture[actor] === 'standing', '動く側は立っている必要がある');
    const hands = () => need(free, 'つかむ手をほどく必要がある');
    const grip = () => need(before.distance === 'grapple' && before.holds[actor] && upright, '立って組み付く必要がある');
    const floor = () => need(before.distance === 'grapple' && before.posture.winner === 'ground' && before.posture.loser === 'ground', '二人とも寝技に入る必要がある');
    const end = () => { next.ended = actor; next.holds[target] = null; };
    switch (action) {
      case 'approach': need(before.distance === 'far' && upright && free, '離れて立っている必要がある'); next.distance = 'near'; break;
      case 'release': case 'separate':
        need(before.distance === 'grapple' && upright, '組んだ立ち姿勢からだけ手をほどける');
        next.holds = { winner: null, loser: null }; next.distance = action === 'release' ? 'near' : 'far'; break;
      case 'retreat': near(); standing(); hands(); next.distance = 'far'; break;
      case 'recover': need(before.posture[actor] === 'unbalanced', '崩れた体勢だけ立て直せる'); next.posture[actor] = 'standing'; break;
      case 'guard': need(before.posture[actor] !== 'ground', '倒れたまま立ち技の防御はできない'); break;
      case 'strike_guard': case 'kick_guard': near(); standing(); hands(); break;
      case 'strike_retreat': near(); standing(); hands(); next.distance = 'far'; break;
      case 'hold_arm': case 'hold_body': case 'shot_attempt':
        near(); standing(); hands(); next.distance = 'grapple'; next.holds[actor] = action === 'hold_arm' ? 'arm' : 'body'; break;
      case 'strike_grip':
        near(); standing(); hands(); next.distance = 'grapple'; next.holds[actor] = 'body'; break;
      case 'hit': near(); standing(); hands(); next.posture[target] = 'unbalanced'; break;
      case 'circle': near(); standing(); hands(); break;
      case 'clinch_pull':
        near(); standing(); hands(); next.distance = 'grapple'; next.holds[actor] = 'body'; next.posture[target] = 'unbalanced'; break;
      case 'offbalance': grip(); standing(); next.posture[target] = 'unbalanced'; break;
      case 'resist': need(before.posture[actor] !== 'ground', '地面では別の抵抗が必要'); break;
      case 'step_in':
        need(['far', 'near'].includes(before.distance) && upright && free, '自由な立ち姿勢から踏み込む'); standing(); next.distance = 'near'; next.posture[actor] = 'unbalanced'; break;
      case 'lean': need(before.posture[actor] !== 'ground' && before.distance !== 'far', '届く距離で踏み込む必要がある'); next.posture[actor] = 'unbalanced'; break;
      case 'stagger_back':
        need(before.posture[actor] === 'unbalanced' && before.distance === 'near' && free, '打撃で崩れた状態が必要'); next.distance = 'far'; break;
      case 'pull_guard':
        grip(); standing(); next.distance = 'grapple'; next.posture = { winner: 'ground', loser: 'ground' }; next.top = target; next.holds[actor] = 'body'; break;
      case 'shoot_ground':
        near(); standing(); hands(); next.distance = 'grapple'; next.posture = { winner: 'ground', loser: 'ground' }; next.holds[actor] = 'body'; next.top = actor; break;
      case 'ground_resist': floor(); break;
      case 'sweep': floor(); need(before.top === target, '下からだけ上下を返せる'); next.top = actor; break;
      case 'lock': case 'choke':
        floor(); need(before.holds[actor], '寝技でつかんでいる必要がある');
        if (action === 'choke') need(before.top === actor, '上を取ってから絞める');
        next.holds[actor] = action === 'lock' ? 'arm' : 'body'; end(); break;
      case 'throw_pin': case 'throw_down': case 'grapple_down':
        grip(); standing(); need(before.posture[target] === 'unbalanced', '投げる前に体勢を崩す必要がある');
        next.posture[target] = 'ground';
        if (action === 'throw_pin') { next.posture[actor] = 'ground'; next.top = actor; }
        end(); break;
      case 'clinch_down': case 'clinch_control':
        near(); standing(); hands(); need(before.posture[target] === 'unbalanced', '打撃で崩してから組み倒す');
        next.distance = 'grapple'; next.holds[actor] = 'body'; next.posture[target] = 'ground';
        if (action === 'clinch_control') { next.posture[actor] = 'ground'; next.top = actor; }
        end(); break;
      case 'charge_down':
        near(); standing(); hands(); need(before.posture[target] === 'unbalanced', '踏み込みの隙が必要'); next.posture[target] = 'ground'; end(); break;
      case 'ground_control':
        grip(); standing(); need(before.posture[target] === 'unbalanced', '抵抗で崩れた状態が必要');
        next.posture = { winner: 'ground', loser: 'ground' }; next.top = actor; end(); break;
      case 'ko': case 'counter_hit':
        near(); standing(); hands(); next.posture[target] = action === 'ko' ? 'ground' : 'unbalanced'; end(); break;
      case 'knee_ko':
        need(['near', 'grapple'].includes(before.distance) && upright, '膝蹴りが届く立ち姿勢が必要'); standing();
        need(before.posture[target] === 'unbalanced' && !before.holds[target], '踏み込むか引かれて崩れた相手が必要');
        next.posture[target] = 'ground'; next.distance = 'near'; next.holds = { winner: null, loser: null }; end(); break;
      default: throw new SceneError(`未定義の動作: ${action}`);
    }
    scene.state = snapshot(next);
    scene.events.push(Object.freeze({ action, actor, text, paragraph, before, after: scene.state }));
    return scene;
  }
  function validateScene(scene) {
    const replay = createScene();
    for (const event of scene.events) {
      if (JSON.stringify(replay.state) !== JSON.stringify(event.before)) throw new SceneError('動作前の状態が飛んでいる');
      advance(replay, event.action, event.actor, event.text, event.paragraph);
      if (JSON.stringify(replay.state) !== JSON.stringify(event.after)) throw new SceneError('動作後の状態が不正');
    }
    if (JSON.stringify(replay.state) !== JSON.stringify(scene.state)) throw new SceneError('最後の状態が不正');
    return true;
  }
  function chooseScene(builders) {
    for (const build of builders) {
      try { const scene = build(); validateScene(scene); if (scene.state.ended !== 'winner') throw new SceneError('勝者が違う'); return scene; }
      catch (error) { if (!(error instanceof SceneError)) throw error; }
    }
    throw new SceneError('整合する展開がない');
  }

  // 既存の決まり手テンプレートに、発動条件と終了状態だけを対応付ける。
  const FINISH_ACTIONS = {
    '組み付きからの押し倒し': ['hold_body', 'lean', 'grapple_down'],
    '打撃からの押し倒し': ['hit', 'resist', 'clinch_down'],
    '投げからの押さえ込み': ['strike_grip', 'lean', 'throw_pin'],
    '打撃からの制圧': ['hit', 'stagger_back', 'clinch_control'],
    '崩しからの投げ': ['hold_arm', 'lean', 'throw_pin'],
    '組み倒し': ['offbalance', 'resist', 'grapple_down'],
    '素早い反撃': ['circle', 'resist', 'counter_hit'],
    '体当たりからの押し倒し': ['guard', 'lean', 'charge_down'],
    '強打からの組み倒し': ['hit', 'resist', 'clinch_down'],
    '四つ組みからの投げ': ['hold_body', 'lean', 'throw_down'],
    '突っ張りからの押し倒し': ['hit', 'resist', 'charge_down'],
    '打撃からの組み倒し': ['hit', 'resist', 'clinch_down'],
    '寄りからの押し倒し': ['hold_body', 'lean', 'grapple_down'],
    'フックによるKO': ['strike_guard', 'resist', 'ko'],
    '大外刈りからの押さえ込み': ['hold_arm', 'lean', 'throw_pin'],
    '寝技からの関節技': ['pull_guard', 'ground_resist', 'lock'],
    'スイープからの絞め技': ['pull_guard', 'ground_resist', 'choke'],
    'パンチからの押し倒し': ['hit', 'resist', 'clinch_down'],
    'とっさの反撃': ['retreat', 'approach', 'counter_hit'],
    'とっさの一撃': ['guard', 'lean', 'counter_hit'],
    '膝蹴りによるKO': ['clinch_pull', 'lean', 'knee_ko'],
    '足掛けからの押さえ込み': ['hold_body', 'lean', 'throw_pin'],
    'タックルからの制圧': ['shot_attempt', 'lean', 'ground_control'],
    'とっさの反撃からの押し倒し': ['guard', 'lean', 'charge_down'],
    '力による押し倒し': ['hold_body', 'lean', 'grapple_down'],
    'タックルからの関節技': ['shoot_ground', 'ground_resist', 'lock'],
    '打撃によるKO': ['hit', 'resist', 'ko']
  };
  const INITIAL_GRIPS = {
    samurai: 'hold_arm', 'heavyweight-judoka': 'hold_arm', 'modern-us-soldier': 'hold_arm',
    'japanese-office-worker': 'hold_arm', 'ww2-japanese-soldier': 'hold_arm',
    'japanese-delinquent': 'hold_arm', 'bjj-fighter': 'hold_arm', spartan: 'hold_body',
    'medieval-knight': 'hold_body', 'oil-wrestler': 'hold_body', bodybuilder: 'hold_body', sumo: 'hold_body'
  };
  function composeScene(winCard, loseCard, finish, variant, suffix, compact) {
    const scene = createScene(), w = ALIASES[winCard.id], l = ALIASES[loseCard.id];
    const plan = FINISHES[finish.label], attack = ATTACKS[loseCard.id];
    const render = text => text.replaceAll('{w}', w).replaceAll('{l}', l).replaceAll('相手', l);
    // 同じ人物が続けて動くときだけ主語を引き継ぐ。段落や人物が変われば必ず戻す。
    let emphasized = false;
    const act = (action, actor, text, paragraph) => {
      const previous = scene.events.at(-1), name = actor === 'winner' ? w : l;
      if (previous?.actor === actor && previous.paragraph === paragraph && text.startsWith(`${name}は`)) text = text.slice(name.length + 1);
      // 感嘆符は決着の瞬間だけに絞る。状態と同じ文章を記録・表示する。
      text = text.replace(/！/g, () => {
        if (paragraph !== 2 || emphasized) return '。';
        emphasized = true; return '！';
      });
      return advance(scene, action, actor, text, paragraph);
    };
    const freeHands = paragraph => {
      if (scene.state.distance !== 'grapple') return;
      const own = scene.state.holds.winner;
      const far = variant !== 0 && !compact;
      const text = own ? `${w}は手を放して離れた。` : compact ? `${w}は手を振りほどいた。`
        : `${w}は${l}の手を振りほどき、${far ? '二歩' : '半歩'}離れた。`;
      act(far ? 'separate' : 'release', 'winner', text, paragraph);
    };
    const near = paragraph => {
      if (scene.state.distance === 'far') {
        const chase = variant === 2 && paragraph === 1 && !compact;
        act('approach', chase ? 'loser' : 'winner', chase ? `${l}は逃がすまいと踏み込んだ。` : `${w}は一歩踏み込んだ。`, paragraph);
      }
    };
    const freeNear = paragraph => { freeHands(paragraph); near(paragraph); };
    const hold = (kind, paragraph) => {
      if (scene.state.holds.winner) return;
      freeNear(paragraph);
      act(kind, 'winner', `${w}は${scene.events.at(-1)?.action === 'release' ? '踏み込んで' : ''}${l}の${kind === 'hold_arm' ? '手首をつかんだ' : '胴へ組み付いた'}。`, paragraph);
    };

    act('approach', 'loser', `「${loseCard.name}」と「${winCard.name}」が${compact ? '近づく' : '間合いを詰める'}。`, 0);
    let initial = INITIAL_GRIPS[loseCard.id] || (attack[0] === 'shot' ? 'shot_attempt'
      : loseCard.id === 'mongol-cavalry' ? 'strike_retreat' : attack[0] === 'kick' ? 'kick_guard' : 'strike_guard');
    const takesHit = variant === 1 && ['strike_guard', 'kick_guard'].includes(initial);
    if (takesHit) initial = 'hit';
    act(initial, 'loser', `${l}が${attack[1].replaceAll('相手', w)}！${takesHit ? `その一撃が${w}をよろめかせた。` : ''}`, 0);
    const ordinary = ['us-office-worker', 'japanese-office-worker', 'hacker', 'american-rapper', 'chinese-man', 'japanese-delinquent', 'nakameguro-barber'].includes(winCard.id);
    const defence = takesHit ? '倒れまいと足を踏ん張った'
      : initial === 'strike_retreat' ? `離れていく${l}を目で追い、構え直した`
      : initial === 'hold_arm' ? 'つかまれた腕を引き、倒れまいと踏ん張った'
      : ordinary ? ['腕で顔をかばい、必死に踏みとどまった', '体を縮め、歯を食いしばって受け止めた', 'あわてて顔をかばい、ぐっと足を踏ん張った'][variant]
      : receive(attack[0], plan.range, variant).replaceAll('相手', l);
    act('guard', 'winner', `${w}は${defence}。`, 0);

    if (scene.state.posture.winner === 'unbalanced') act('recover', 'winner', `${w}は足を踏み直し、体勢を立て直した。`, 1);
    let [setup, reaction, final] = FINISH_ACTIONS[finish.label];
    let counter = render(plan.counter), resistance = render(plan.resistance), finishText = render(plan.finish);
    if (finish.label === '寝技からの関節技' && winCard.id === 'mma-fighter') {
      setup = 'shoot_ground'; counter = `${w}はタックルで${l}を倒し、地面で体を押さえた。`;
    }
    // 近い距離で受け止める筋と、いったん離して再接近を誘う筋を切り替える。
    if (final === 'knee_ko' && variant === 1) {
      freeHands(1);
      if (scene.state.distance === 'near') act('retreat', 'winner', `${w}は一歩下がって構えた。`, 1);
      act('guard', 'winner', `${w}は足を止め、${l}の肩を見据えた。`, 1);
      act('step_in', 'loser', `${l}は身を低くして飛び込み、前のめりになった！`, 1);
    } else {
      if (setup === 'offbalance') hold('hold_body', 1);
      else if (setup === 'pull_guard') hold('hold_arm', 1);
      else freeNear(1);
      if (variant === 2 && !scene.events.some(event => event.paragraph === 1 && ['separate', 'retreat'].includes(event.action)) && (!compact || setup === 'guard') && ['hit', 'strike_guard', 'hold_body', 'hold_arm', 'shot_attempt', 'clinch_pull', 'guard'].includes(setup) && scene.state.distance === 'near' && !scene.state.holds.winner && !scene.state.holds.loser) {
        act('retreat', 'winner', setup === 'guard' ? `${w}は追われて二歩下がった。` : `${w}は二歩下がって誘った。`, 1);
        act('approach', 'loser', `${l}が間合いを詰めて追う！`, 1);
      }
      if (scene.events.at(-1)?.action === 'release' && ['hold_body', 'hold_arm', 'strike_grip', 'clinch_pull'].includes(setup) && counter.startsWith(`${w}は`) && !/踏み込|懐へ/.test(counter)) {
        counter = setup === 'clinch_pull' ? `${w}は踏み込み、${l}の上体を引き寄せた。` : counter.replace(`${w}は`, `${w}は踏み込んで`);
      }
      if (scene.events.at(-1)?.paragraph === 1 && scene.events.at(-1)?.actor === 'winner' && counter.startsWith(`${w}は`)) counter = counter.slice(w.length + 1);
      act(setup, 'winner', counter, 1);
      act(reaction, 'loser', resistance, 1);
    }

    if (['clinch_down', 'clinch_control', 'charge_down', 'ko', 'counter_hit'].includes(final)) freeNear(2);
    if (final === 'choke') {
      act('sweep', 'winner', `${w}はスイープで上下を返し、${l}の上に回った。`, 2);
      finishText = `${w}は首へ腕を回し、絞め技で${l}を降参させた！`;
    }
    if (final === 'lock') finishText = `${w}は伸びた腕を胸に抱え、肘を伸ばす関節技を決めた！${l}は逃れられず降参した。`;
    act(final, 'winner', finishText, 2);
    const paragraphs = [0, 1, 2].map(index => scene.events.filter(event => event.paragraph === index).map(event => event.text).join(''));
    const upset = /番狂わせ|不利な予想/.test(suffix), close = /接戦|競り合/.test(suffix);
    const victoryType = ['ko', 'knee_ko'].includes(final) ? 'KO' : '';
    paragraphs[2] += ['ko', 'knee_ko', 'lock', 'choke'].includes(final)
      ? upset ? `${close ? '接戦を制し、' : ''}${w}が番狂わせの${victoryType}勝利。` : `${close ? '接戦を制し、' : ''}${w}の${victoryType}勝利。`
      : suffix.replaceAll('相手', l);
    paragraphs[2] = paragraphs[2].replace(/！/g, (mark, index) => index === paragraphs[2].indexOf('！') ? mark : '。');
    const body = paragraphs.join('\n\n');
    if (body.length < 150 || body.length > 250) throw new SceneError('文字量に合う別の展開が必要');
    scene.paragraphs = Object.freeze(paragraphs);
    return scene;
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
    const plan = FINISHES[finish.label], w = ALIASES[winCard.id], l = ALIASES[loseCard.id];
    const endings = upset ? (close
      ? ['接戦から番狂わせの勝利だ！', '接戦を制し、不利な予想を覆した勝利！', '接戦の末、番狂わせの勝利！']
      : ['番狂わせの勝利だ！', '不利な予想を覆して勝利！', 'まさかの番狂わせで勝利！'])
      : close ? ['わずかな隙をつき、接戦に勝利！', '競り合った接戦を制し、勝利！', 'ゆずらない接戦を制して勝利！']
      : kind === 'dominant' ? ['相手に立て直す間を与えず勝利！', '押し返す間を与えず勝利！', '最後は相手を動かさない、堂々の勝利だ！']
      : ['踏み込む一歩で勝利をつかんだ！', '抵抗を振り切り、勝利をつかんだ！', '一瞬の反撃で勝利をつかんだ！'];
    const builders = [];
    for (let offset = 0; offset < 3; offset++) for (const compact of [false, true]) {
      const pattern = (variant + offset) % 3;
      const suffix = compact ? (upset ? (close ? '接戦の末、番狂わせの勝利！' : '番狂わせの勝利だ！') : close ? '接戦を制して勝利！' : '勝利をつかんだ！') : endings[pattern];
      builders.push(() => composeScene(winCard, loseCard, finish, pattern, suffix, compact));
    }
    const scene = chooseScene(builders), [opening, middle, ending] = scene.paragraphs;
    return Object.freeze({ headline: upset ? `${finish.label}で逆転！` : plan.headline, opening, middle, ending, kind, close,
      finish: finish.label, playerSkill: winner === 'player' ? finish.stat : profiles[playerCard.id].techniques[0].stat,
      cpuSkill: winner === 'cpu' ? finish.stat : profiles[cpuCard.id].techniques[0].stat,
      winnerId: winCard.id, loserId: loseCard.id, winnerAlias: w, loserAlias: l,
      scene: Object.freeze({ state: scene.state, events: Object.freeze(scene.events) }),
      body: `${opening}\n\n${middle}\n\n${ending}` });
  }
  window.HumanityStory = { generateStory, scene: Object.freeze({ create: createScene, advance, validate: validateScene, choose: chooseScene, SceneError }) };
})();
