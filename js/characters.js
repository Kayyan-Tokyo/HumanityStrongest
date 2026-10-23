// 提供された正式キャラクターデータ v1（全30人）。
// 出典: data/HumanityStrongest_characters_v1.csv。名前・数値・並び順はCSVに準拠。
// age: 歳、height: cm、weight: kg。能力値はデータとして保持し、対戦前には表示しない。
window.CHARACTERS = [
  {
    "id": "neanderthal",
    "name": "ネアンデルタール人男性",
    "age": 28,
    "height": 165,
    "weight": 78,
    "stats": {
      "STR": 85,
      "SPD": 62,
      "END": 78,
      "STK": 35,
      "GRP": 65,
      "SUB": 10
    }
  },
  {
    "id": "paleolithic-hunter",
    "name": "旧石器時代の狩人",
    "age": 27,
    "height": 171,
    "weight": 72,
    "stats": {
      "STR": 73,
      "SPD": 78,
      "END": 88,
      "STK": 48,
      "GRP": 66,
      "SUB": 12
    }
  },
  {
    "id": "spartan",
    "name": "古代ギリシャのスパルタ兵",
    "age": 30,
    "height": 173,
    "weight": 78,
    "stats": {
      "STR": 78,
      "SPD": 75,
      "END": 88,
      "STK": 72,
      "GRP": 75,
      "SUB": 20
    }
  },
  {
    "id": "gladiator",
    "name": "古代ローマの剣闘士",
    "age": 29,
    "height": 180,
    "weight": 86,
    "stats": {
      "STR": 86,
      "SPD": 77,
      "END": 87,
      "STK": 82,
      "GRP": 79,
      "SUB": 27
    }
  },
  {
    "id": "samurai",
    "name": "戦国時代の武士",
    "age": 31,
    "height": 165,
    "weight": 66,
    "stats": {
      "STR": 72,
      "SPD": 79,
      "END": 83,
      "STK": 67,
      "GRP": 68,
      "SUB": 25
    }
  },
  {
    "id": "medieval-knight",
    "name": "中世ヨーロッパの騎士",
    "age": 32,
    "height": 177,
    "weight": 84,
    "stats": {
      "STR": 83,
      "SPD": 68,
      "END": 79,
      "STK": 69,
      "GRP": 78,
      "SUB": 22
    }
  },
  {
    "id": "mongol-cavalry",
    "name": "モンゴル帝国の騎兵",
    "age": 28,
    "height": 168,
    "weight": 69,
    "stats": {
      "STR": 71,
      "SPD": 82,
      "END": 90,
      "STK": 60,
      "GRP": 69,
      "SUB": 18
    }
  },
  {
    "id": "edo-farmer",
    "name": "江戸時代の農民",
    "age": 34,
    "height": 162,
    "weight": 63,
    "stats": {
      "STR": 67,
      "SPD": 64,
      "END": 81,
      "STK": 36,
      "GRP": 53,
      "SUB": 8
    }
  },
  {
    "id": "viking",
    "name": "ヴァイキングの戦士",
    "age": 30,
    "height": 180,
    "weight": 88,
    "stats": {
      "STR": 88,
      "SPD": 70,
      "END": 85,
      "STK": 78,
      "GRP": 77,
      "SUB": 18
    }
  },
  {
    "id": "meiji-sumo",
    "name": "明治時代の力士",
    "age": 29,
    "height": 176,
    "weight": 115,
    "stats": {
      "STR": 90,
      "SPD": 54,
      "END": 72,
      "STK": 57,
      "GRP": 91,
      "SUB": 18
    }
  },
  {
    "id": "ww2-japanese-soldier",
    "name": "第二次世界大戦期の日本兵",
    "age": 25,
    "height": 165,
    "weight": 62,
    "stats": {
      "STR": 65,
      "SPD": 72,
      "END": 84,
      "STK": 62,
      "GRP": 60,
      "SUB": 18
    }
  },
  {
    "id": "ww2-us-soldier",
    "name": "第二次世界大戦期の米兵",
    "age": 25,
    "height": 176,
    "weight": 75,
    "stats": {
      "STR": 71,
      "SPD": 73,
      "END": 83,
      "STK": 65,
      "GRP": 65,
      "SUB": 20
    }
  },
  {
    "id": "us-office-worker",
    "name": "現代のアメリカ人社会人（一般男性）",
    "age": 35,
    "height": 178,
    "weight": 82,
    "stats": {
      "STR": 53,
      "SPD": 49,
      "END": 48,
      "STK": 35,
      "GRP": 33,
      "SUB": 15
    }
  },
  {
    "id": "sumo",
    "name": "大相撲の力士",
    "age": 28,
    "height": 185,
    "weight": 155,
    "stats": {
      "STR": 96,
      "SPD": 48,
      "END": 67,
      "STK": 65,
      "GRP": 96,
      "SUB": 25
    }
  },
  {
    "id": "heavyweight-boxer",
    "name": "ヘビー級プロボクサー",
    "age": 32,
    "height": 190,
    "weight": 108,
    "stats": {
      "STR": 88,
      "SPD": 85,
      "END": 88,
      "STK": 98,
      "GRP": 48,
      "SUB": 15
    }
  },
  {
    "id": "heavyweight-judoka",
    "name": "柔道重量級選手",
    "age": 28,
    "height": 185,
    "weight": 112,
    "stats": {
      "STR": 90,
      "SPD": 70,
      "END": 88,
      "STK": 62,
      "GRP": 97,
      "SUB": 78
    }
  },
  {
    "id": "mma-fighter",
    "name": "総合格闘家（MMA）",
    "age": 29,
    "height": 181,
    "weight": 84,
    "stats": {
      "STR": 83,
      "SPD": 87,
      "END": 92,
      "STK": 92,
      "GRP": 90,
      "SUB": 90
    }
  },
  {
    "id": "bjj-fighter",
    "name": "ブラジリアン柔術選手",
    "age": 30,
    "height": 177,
    "weight": 78,
    "stats": {
      "STR": 73,
      "SPD": 76,
      "END": 88,
      "STK": 52,
      "GRP": 91,
      "SUB": 99
    }
  },
  {
    "id": "japanese-delinquent",
    "name": "日本のヤンキー",
    "age": 22,
    "height": 174,
    "weight": 69,
    "stats": {
      "STR": 58,
      "SPD": 63,
      "END": 62,
      "STK": 55,
      "GRP": 43,
      "SUB": 10
    }
  },
  {
    "id": "nakameguro-barber",
    "name": "中目黒にいそうなタトゥーだらけのバーバー",
    "age": 33,
    "height": 177,
    "weight": 76,
    "stats": {
      "STR": 62,
      "SPD": 60,
      "END": 58,
      "STK": 44,
      "GRP": 40,
      "SUB": 12
    }
  },
  {
    "id": "modern-us-soldier",
    "name": "現代のアメリカ兵",
    "age": 28,
    "height": 180,
    "weight": 83,
    "stats": {
      "STR": 79,
      "SPD": 79,
      "END": 90,
      "STK": 77,
      "GRP": 76,
      "SUB": 54
    }
  },
  {
    "id": "hacker",
    "name": "ハッカー",
    "age": 26,
    "height": 173,
    "weight": 64,
    "stats": {
      "STR": 41,
      "SPD": 48,
      "END": 43,
      "STK": 23,
      "GRP": 20,
      "SUB": 8
    }
  },
  {
    "id": "american-rapper",
    "name": "アメリカのラッパー",
    "age": 29,
    "height": 181,
    "weight": 82,
    "stats": {
      "STR": 60,
      "SPD": 62,
      "END": 63,
      "STK": 42,
      "GRP": 39,
      "SUB": 11
    }
  },
  {
    "id": "chinese-man",
    "name": "中国人男性（一般人）",
    "age": 31,
    "height": 173,
    "weight": 70,
    "stats": {
      "STR": 50,
      "SPD": 51,
      "END": 51,
      "STK": 34,
      "GRP": 32,
      "SUB": 13
    }
  },
  {
    "id": "muay-thai",
    "name": "タイのムエタイ選手",
    "age": 27,
    "height": 174,
    "weight": 69,
    "stats": {
      "STR": 72,
      "SPD": 94,
      "END": 96,
      "STK": 97,
      "GRP": 78,
      "SUB": 54
    }
  },
  {
    "id": "oil-wrestler",
    "name": "トルコのオイルレスラー",
    "age": 30,
    "height": 182,
    "weight": 104,
    "stats": {
      "STR": 92,
      "SPD": 65,
      "END": 85,
      "STK": 52,
      "GRP": 98,
      "SUB": 62
    }
  },
  {
    "id": "rugby-player",
    "name": "ラグビー選手",
    "age": 27,
    "height": 186,
    "weight": 105,
    "stats": {
      "STR": 93,
      "SPD": 77,
      "END": 89,
      "STK": 67,
      "GRP": 83,
      "SUB": 17
    }
  },
  {
    "id": "japanese-office-worker",
    "name": "現代の日本人会社員",
    "age": 35,
    "height": 172,
    "weight": 68,
    "stats": {
      "STR": 48,
      "SPD": 50,
      "END": 48,
      "STK": 35,
      "GRP": 30,
      "SUB": 15
    }
  },
  {
    "id": "bodybuilder",
    "name": "現代のボディビルダー",
    "age": 30,
    "height": 180,
    "weight": 98,
    "stats": {
      "STR": 97,
      "SPD": 54,
      "END": 70,
      "STK": 43,
      "GRP": 57,
      "SUB": 12
    }
  },
  {
    "id": "female-mma-fighter",
    "name": "現代の女性MMA選手",
    "age": 28,
    "height": 168,
    "weight": 61,
    "stats": {
      "STR": 69,
      "SPD": 88,
      "END": 91,
      "STK": 91,
      "GRP": 86,
      "SUB": 89
    }
  }
];
