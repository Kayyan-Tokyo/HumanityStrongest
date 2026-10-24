# IDから選択キャラクターの画像を表示する

`data/HumanityStrongest_characters_v1.csv` の公式IDと `js/characters.js` のIDは同一です。ゲームは既存の `js/characters.js` を読み込み、選択カードを `HumanityMatch.playRound` の保存済み結果 `playerCard` / `cpuCard` に渡します。描画側はその `.id` だけで `js/sprite-registry.js` を参照します。名前・ファイル名・プレイヤー/CPUの役割で人物を推測しません。

登録表には全30IDがあり、現リポジトリに素材が存在するのは次の2人です。他の28人は `src:null` として、画像を創作したり別人物を割り当てたりしません。

| CSVのID | 対象 | 待機画像 | モーション |
| --- | --- | --- | --- |
| `spartan` | 古代ギリシャのスパルタ兵 | `assets/characters/spartan_idle.png` | 歩行・槍突き・被弾 |
| `sumo` | 大相撲の力士 | `assets/characters/sumo_idle.png` | 歩行・張り手・被弾 |

`meiji-sumo`（明治時代の力士）には `sumo` の素材を流用しません。

## 新しいマスター画像を追加する

1. 公式CSVで対象人物のIDを確認する。IDは振り直さない。
2. 透過画像を `assets/characters/` に保存する。新素材は `<公式ID>_idle.png` を推奨するが、ファイル名では自動判定しない。既存のファイル名はそのまま使用できる。
3. `js/sprite-registry.js` の該当IDの設定だけを更新する。`src` はHTMLからの相対パス、`frame` は画像上の描画矩形 `[左,上,幅,高さ]`。矩形の下辺が接地位置となるよう、透明余白を除いた範囲を指定する。`height` はその矩形のCanvas表示高さ（共通拡大率1.35を掛ける前）、`sourceFacing` は画像本来の向き（右=1、左=-1）。体格・装備に応じて矩形と高さを調整する。
4. モーション未制作なら `poses:{}` にする。歩行は静止画を移動し、攻撃は軽い前進・傾き、被弾は既存のノックバックで表現する。別人物のモーションは借りない。
5. 下のテストで表示を確認し、画像差し替え時は `index.html` のスクリプトのキャッシュ更新値も揃える。バトル処理の分岐や描画コードを追加する必要はない。

設定例（数値は素材ごとに調整）：

```js
'hacker': {
  src:'./assets/characters/hacker_idle.png',
  sourceFacing:1,
  height:54,
  frame:[12,8,96,140],
  poses:{}
},
```

この例の画像は同梱していません。マスターを追加した段階で静止画のままバトルへ参加できます。

## 後からモーションを追加する

同じIDの `poses.walk` / `poses.attack` / `poses.damage` に設定する。`damage` が被弾です。

- 共通：`src`、`frames:[[x,y,w,h],...]`、必要に応じて `sourceFacing`、`anchor:[足元X,足元Y]` またはフレームごとの `anchors`、`referenceHeight`（共通縮尺の基準高さ）。素材が違っても体格が急変しないよう調整する。
- 歩行：`fps`。移動中だけ経過時間でループする。
- 攻撃：`once:true, duration:500`。演出タイムラインの `attackTime` で1回再生し、3コマ目をヒット時刻に合わせる。`hitOffset:[X,Y]` は足元基準のヒット光の位置。`lunge` は任意の追加踏み込み量。
- 被弾：`once:true, timeField:'hitTime', duration:400`。`knockback` は任意の追加後退量。
- `recoveryWalk:true` は、構えに戻る移動にも歩行を適用する設定。現在の力士の挙動を役割に依存せず維持するためのもの。

スパルタ兵・力士の素材、描画矩形、足元基準、56/52の高さ、7/6fps、攻撃500ms、被弾400msは従来の値を維持しています。共通の相対位置判定と、マスター/各モーションの `sourceFacing` を比較して一度だけ反転します。移動方向で向きを上書きしません。

## 読み込み・フォールバック

`game.js` は各ラウンドで `HumanityPixelBattle.createRenderer({playerId,cpuId})` を作り、画像読み込み後に既存の10秒タイムラインを再生します。結果画面のモード切り替えでも同じ保存済みカードIDを渡します。非同期の画像読み込み中に別画面へ移った場合、古い描画を表示しません。

画像はURL単位で共有キャッシュし、役割や前ラウンドの人物の画像を混同しません。選択された2人の画像だけを読み込みます。読み込みエラーと5秒の期限は必ず完了扱いになり、期限後の遅い読み込みで途中から画像を切り替えません。

- ID/マスター未登録、またはマスター読み込み失敗：青/赤の汎用ピクセル人形を表示し、名前に「仮表示」を付ける。画像付きの別人物には置き換えない。
- モーション未登録：その人物自身のマスターで簡易演出する。
- モーション読み込み失敗：その人物自身のマスターへ戻す。マスターも失敗していたら汎用人形を使う。
- `console.warn` にIDと理由、読み込み失敗時はモーション・URLも出す。同じ警告は毎フレーム繰り返さない。

判定・勝率・乱数・ストーリーを描画側から呼びません。画像がなくても同じ確定結果へ進みます。カードモード、背景、タイトル、メニュー、各3枚の手札、ゲームルールは変更していません。ピクセルモードの凡例だけを実際の選択名に更新し、長い名前を折り返します。

## 検証

```sh
node tests/sprite-registry.test.cjs
node tests/sprite-registry.browser.cjs
for test in tests/*.test.cjs; do node "$test" || exit; done
python tests/characters.test.py
node tests/pixel.browser.cjs
node tests/facing.browser.cjs
node tests/walk-footing.browser.cjs
node tests/hit-reaction.browser.cjs
node tests/sumo-hit.browser.cjs
node tests/sumo.browser.cjs
node tests/side-view.browser.cjs
WIDTHS=375,390,430,1280 node tests/mobile.browser.cjs
node tests/background.browser.cjs
```

Chromiumの375/390/430/1280pxで検証。新テストでは各幅6,416回の実画像描画で、両配役・左右入れ替え・向き・不透明領域の収まり・接地座標を確認。マスターのみ/壊れた画像、両先攻と3ラウンド、結果の再表示、手札3枚ずつ、長い名前も確認します。単体テストは全30IDの一致、未登録28人、未知ID、画像エラー/期限、警告、URLキャッシュ、前の画像が漏れないこと、描画の乱数消費ゼロを検証します。

既存テストで、1/2倍速・途中変更・スキップ・非表示時の終了を確認。同一乱数列のカード/ピクセル両モードで、全ラウンドのカード・勝率・勝敗・保存ストーリー・乱数呼び出し回数が完全一致しています。既存画像8枚もハッシュで一致を確認します。

ブラウザ検証は実ファイルをテスト時だけdata URLへ変換しています。製品はGitHub Pages対応の相対パスです。実機Safari・公開Pages配信は未確認です。新たな人物の画像と専用技アニメーションは今回制作していません。

配役を入れ替えたスマホ/PCの確認画像は、次のコマンドで任意のフォルダーへ保存できます。通常のテストは画像ファイルを生成しません。

```sh
SCREENSHOT_DIR=/tmp/sprite-registry-screenshots node tests/sprite-registry.browser.cjs
```
