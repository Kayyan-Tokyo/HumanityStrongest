// 演出専用。ユーザー指定のスタイル・技をIDで対応付ける。勝敗計算には使わない。
// 苦手な状況は既存能力の最低値を参考にしたゲーム上の設定。
window.COMBAT_STYLES = {
  "neanderthal": {
    "style": "力強く突進する",
    "techniques": [
      {
        "action": "両腕でがっちり組み付く",
        "stat": "STR"
      }
    ],
    "finishes": [
      {
        "label": "組み付きからの押し倒し",
        "action": "体を寄せて押し倒す",
        "stat": "STR"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "paleolithic-hunter": {
    "style": "素早く動いて隙を探す",
    "techniques": [
      {
        "action": "隙を見つけて打撃を放つ",
        "stat": "SPD"
      }
    ],
    "finishes": [
      {
        "label": "打撃からの押し倒し",
        "action": "打撃でひるませて押し倒す",
        "stat": "SPD"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "spartan": {
    "style": "打撃を交えながら間合いを詰める",
    "techniques": [
      {
        "action": "打撃から組み付く",
        "stat": "GRP"
      }
    ],
    "finishes": [
      {
        "label": "投げからの押さえ込み",
        "action": "体勢を崩して投げ、押さえ込む",
        "stat": "GRP"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "gladiator": {
    "style": "間合いを変えて打撃を狙う",
    "techniques": [
      {
        "action": "打撃を放って組み付く",
        "stat": "STK"
      }
    ],
    "finishes": [
      {
        "label": "打撃からの制圧",
        "action": "打撃で隙を作り、組み伏せる",
        "stat": "STK"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "samurai": {
    "style": "体さばきで攻撃をかわす",
    "techniques": [
      {
        "action": "組み付いて重心を崩す",
        "stat": "GRP"
      }
    ],
    "finishes": [
      {
        "label": "崩しからの投げ",
        "action": "重心を崩して投げ、押さえ込む",
        "stat": "GRP"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "medieval-knight": {
    "style": "力強く組み付いて前へ出る",
    "techniques": [
      {
        "action": "肩を寄せて体勢を崩す",
        "stat": "GRP"
      }
    ],
    "finishes": [
      {
        "label": "組み倒し",
        "action": "体勢を崩して組み倒す",
        "stat": "GRP"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "mongol-cavalry": {
    "style": "機敏な足運びで攻撃をかわす",
    "techniques": [
      {
        "action": "素早く踏み込んで打撃を返す",
        "stat": "SPD"
      }
    ],
    "finishes": [
      {
        "label": "素早い反撃",
        "action": "攻撃をかわし、素早い反撃を決める",
        "stat": "SPD"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "edo-farmer": {
    "style": "粘り強く踏ん張る",
    "techniques": [
      {
        "action": "体当たりで押し返す",
        "stat": "END"
      }
    ],
    "finishes": [
      {
        "label": "体当たりからの押し倒し",
        "action": "踏ん張りから体当たりで押し倒す",
        "stat": "END"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "viking": {
    "style": "豪快な打撃で前へ出る",
    "techniques": [
      {
        "action": "大きな打撃を放って組み付く",
        "stat": "STR"
      }
    ],
    "finishes": [
      {
        "label": "強打からの組み倒し",
        "action": "強打で隙を作り、組み倒す",
        "stat": "STR"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "meiji-sumo": {
    "style": "四つ組みを狙って踏み込む",
    "techniques": [
      {
        "action": "突っ張りで押し込む",
        "stat": "GRP"
      }
    ],
    "finishes": [
      {
        "label": "四つ組みからの投げ",
        "action": "四つに組み、腰を寄せて投げる",
        "stat": "GRP"
      },
      {
        "label": "突っ張りからの押し倒し",
        "action": "突っ張りで押し込み、そのまま押し倒す",
        "stat": "STR"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "ww2-japanese-soldier": {
    "style": "打撃を交えて近づく",
    "techniques": [
      {
        "action": "組み付いて体勢を崩す",
        "stat": "GRP"
      }
    ],
    "finishes": [
      {
        "label": "打撃からの組み倒し",
        "action": "打撃で隙を作り、組み倒す",
        "stat": "GRP"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "ww2-us-soldier": {
    "style": "打撃を放ちながら押し込む",
    "techniques": [
      {
        "action": "打撃から胴へ組み付く",
        "stat": "STR"
      }
    ],
    "finishes": [
      {
        "label": "打撃からの制圧",
        "action": "打撃から押し込み、組み伏せる",
        "stat": "STR"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "us-office-worker": {
    "style": "とっさのパンチで応じる",
    "techniques": [
      {
        "action": "体当たりで押し返す",
        "stat": "STR"
      }
    ],
    "finishes": [
      {
        "label": "体当たりからの押し倒し",
        "action": "体当たりがうまく合い、押し倒す",
        "stat": "STR"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "sumo": {
    "style": "突っ張りで前へ出る",
    "techniques": [
      {
        "action": "四つに組んで寄る",
        "stat": "GRP"
      }
    ],
    "finishes": [
      {
        "label": "寄りからの押し倒し",
        "action": "四つに組んで寄り、押し倒す",
        "stat": "GRP"
      },
      {
        "label": "四つ組みからの投げ",
        "action": "四つに組んで体を寄せ、投げを決める",
        "stat": "GRP"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "heavyweight-boxer": {
    "style": "ジャブで間合いを作る",
    "techniques": [
      {
        "action": "ストレートからフックを放つ",
        "stat": "STK"
      }
    ],
    "finishes": [
      {
        "label": "フックによるKO",
        "action": "鋭いフックを決めてKOを奪う",
        "stat": "STK"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "heavyweight-judoka": {
    "style": "組み手を取り投げを狙う",
    "techniques": [
      {
        "action": "大外刈りで体勢を崩す",
        "stat": "GRP"
      },
      {
        "action": "内股で投げを狙う",
        "stat": "GRP"
      }
    ],
    "finishes": [
      {
        "label": "大外刈りからの押さえ込み",
        "action": "大外刈りで倒し、寝技で押さえ込む",
        "stat": "GRP"
      }
    ],
    "weakness": "打撃を続けて受ける展開",
    "weaknessStat": "STK"
  },
  "mma-fighter": {
    "style": "打撃とタックルを使い分ける",
    "techniques": [
      {
        "action": "タックルから寝技へつなぐ",
        "stat": "SUB"
      },
      {
        "action": "素早い打撃を続けて放つ",
        "stat": "STK"
      }
    ],
    "finishes": [
      {
        "label": "寝技からの関節技",
        "action": "寝技から腕を取り、関節技で降参を引き出す",
        "stat": "SUB"
      },
      {
        "label": "打撃によるKO",
        "action": "打撃を続けて決め、KOを奪う",
        "stat": "STK"
      }
    ],
    "weakness": "力比べで押し込まれる展開",
    "weaknessStat": "STR"
  },
  "bjj-fighter": {
    "style": "引き込みから寝技を狙う",
    "techniques": [
      {
        "action": "スイープで上下を入れ替える",
        "stat": "SUB"
      }
    ],
    "finishes": [
      {
        "label": "スイープからの絞め技",
        "action": "スイープで上を取り、絞め技で降参を引き出す",
        "stat": "SUB"
      },
      {
        "label": "寝技からの関節技",
        "action": "寝技から腕を取り、関節技で降参を引き出す",
        "stat": "SUB"
      }
    ],
    "weakness": "打撃を続けて受ける展開",
    "weaknessStat": "STK"
  },
  "japanese-delinquent": {
    "style": "大振りのパンチで迫る",
    "techniques": [
      {
        "action": "服をつかんで押し合う",
        "stat": "STK"
      }
    ],
    "finishes": [
      {
        "label": "パンチからの押し倒し",
        "action": "パンチで隙を作り、押し倒す",
        "stat": "STK"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "nakameguro-barber": {
    "style": "大振りの打撃で前へ出る",
    "techniques": [
      {
        "action": "打撃から組み付く",
        "stat": "STR"
      }
    ],
    "finishes": [
      {
        "label": "打撃からの押し倒し",
        "action": "打撃で隙を作り、押し倒す",
        "stat": "STR"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "modern-us-soldier": {
    "style": "打撃を交えて体勢を探る",
    "techniques": [
      {
        "action": "組み付いて重心を崩す",
        "stat": "GRP"
      }
    ],
    "finishes": [
      {
        "label": "打撃からの制圧",
        "action": "打撃から体勢を崩し、組み伏せる",
        "stat": "GRP"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "hacker": {
    "style": "距離を取りながら攻撃をかわす",
    "techniques": [
      {
        "action": "下がりながら反撃のパンチを出す",
        "stat": "SPD"
      }
    ],
    "finishes": [
      {
        "label": "とっさの反撃",
        "action": "とっさの反撃がうまく合い、勝機をつかむ",
        "stat": "SPD"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "american-rapper": {
    "style": "とっさのパンチで応じる",
    "techniques": [
      {
        "action": "近づいて押し合う",
        "stat": "STK"
      }
    ],
    "finishes": [
      {
        "label": "パンチからの押し倒し",
        "action": "パンチで隙を作り、押し倒す",
        "stat": "STK"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "chinese-man": {
    "style": "守りを固めて反撃を待つ",
    "techniques": [
      {
        "action": "反撃から体当たりを繰り出す",
        "stat": "SPD"
      }
    ],
    "finishes": [
      {
        "label": "とっさの一撃",
        "action": "反撃の一撃がうまく合い、勝機をつかむ",
        "stat": "SPD"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "muay-thai": {
    "style": "ローキックで動きを探る",
    "techniques": [
      {
        "action": "ミドルキックから膝蹴りへつなぐ",
        "stat": "STK"
      }
    ],
    "finishes": [
      {
        "label": "膝蹴りによるKO",
        "action": "踏み込んで膝蹴りを決め、KOを奪う",
        "stat": "STK"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "oil-wrestler": {
    "style": "胴に組み付いて押し合う",
    "techniques": [
      {
        "action": "足を掛けて体勢を崩す",
        "stat": "GRP"
      }
    ],
    "finishes": [
      {
        "label": "足掛けからの押さえ込み",
        "action": "足を掛けて倒し、しっかり押さえ込む",
        "stat": "GRP"
      }
    ],
    "weakness": "打撃を続けて受ける展開",
    "weaknessStat": "STK"
  },
  "rugby-player": {
    "style": "低い姿勢から突進する",
    "techniques": [
      {
        "action": "タックルで押し込む",
        "stat": "STR"
      }
    ],
    "finishes": [
      {
        "label": "タックルからの制圧",
        "action": "タックルで倒し、動きを押さえる",
        "stat": "STR"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "japanese-office-worker": {
    "style": "守りながら反撃を待つ",
    "techniques": [
      {
        "action": "つかみ合いからとっさに押し返す",
        "stat": "SPD"
      }
    ],
    "finishes": [
      {
        "label": "とっさの反撃からの押し倒し",
        "action": "とっさの反撃がうまく合い、押し倒す",
        "stat": "SPD"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "bodybuilder": {
    "style": "筋力を生かして押し込む",
    "techniques": [
      {
        "action": "力強く胴へ組み付く",
        "stat": "STR"
      }
    ],
    "finishes": [
      {
        "label": "力による押し倒し",
        "action": "組み付いたまま力強く押し倒す",
        "stat": "STR"
      }
    ],
    "weakness": "寝技で関節を狙われる展開",
    "weaknessStat": "SUB"
  },
  "female-mma-fighter": {
    "style": "素早い打撃で間合いを詰める",
    "techniques": [
      {
        "action": "タックルから腕を狙う",
        "stat": "SUB"
      },
      {
        "action": "素早い打撃を続けて放つ",
        "stat": "STK"
      }
    ],
    "finishes": [
      {
        "label": "タックルからの関節技",
        "action": "タックルで倒して腕を取り、関節技で降参を引き出す",
        "stat": "SUB"
      },
      {
        "label": "打撃によるKO",
        "action": "打撃を続けて決め、KOを奪う",
        "stat": "STK"
      }
    ],
    "weakness": "力比べで押し込まれる展開",
    "weaknessStat": "STR"
  }
};
