/**
 * Album catalogue — single source of truth for download portal data.
 *
 * Both `/download` (index) and `/download/[album]` (detail) import from here.
 * Track `body` fields contain raw MDX source that is compiled at build time
 * by the album page's `resolveAlbumData()`.
 */

import type { AlbumData, AlbumInfo } from '@/components/portal/types'

// ---------------------------------------------------------------------------
// Full catalogue (album + tracks)
// ---------------------------------------------------------------------------

export const albumCatalogue: Record<string, AlbumData> = {
  'chokaigi-collection': {
    album: {
      id: 'chokaigi-collection',
      title: 'ニコ超 2026年 コレクション',
      description: '逆転 ほか、各種シングル楽曲をまとめたダウンロードパック。',
      cover: '/images/gyakutenn.png',
    },
    tracks: [
      {
        title: '逆転',
        filename: 'discord-sfx-calling-250633.mp3',
        duration: '3:35',
        cover: '/images/gyakutenn.png',
        description: 'ボカコレ2026冬ex参加曲。',
        date: '2026-02-19',
        author: 'Piece Music',
        vocal: '知声 (Chis-A)',
        lyric: 'yu_IT',
        music: 'Nina December',
        illust: 'どらごん',
        movie: 'どらごん',
        tags: ['ボカコレ'],
        links: [
          {
            label: 'Niconico',
            url: 'https://www.nicovideo.jp/watch/sm45965390',
          },
        ],
        body: `## About

- Produced by ピースミュージック
- Music : [Nina December](https://x.com/december_nina)
- Illustration & MV: [どらごん](https://x.com/rutzchy)

ボカコレ2026冬ex参加曲です。
『The VOCALOID Collection （ボカコレ）』はボカロ文化をきっかけに生まれたインターネット等で活動するクリエイターやユーザー、企業などボカロに関わる全ての方が参加できるボカロ文化の祭典です。

▼ボカコレ2026冬ex
https://vocaloid-collection.jp/exhibition/`,
      },
      {
        title: '逆転 (Instrumental)',
        filename: 'discord-sfx-calling-250633.mp3',
        duration: '3:35',
        cover: '/images/gyakutenn.png',
        description: '逆転のインストゥルメンタルバージョン。',
        date: '2026-02-19',
        author: 'Piece Music',
        music: 'Nina December',
        body: `## About

- Produced by ピースミュージック
- Music : [Nina December](https://x.com/december_nina)
- Illustration & MV: [どらごん](https://x.com/rutzchy)

ボカコレ2026冬ex参加曲です。
『The VOCALOID Collection （ボカコレ）』はボカロ文化をきっかけに生まれたインターネット等で活動するクリエイターやユーザー、企業などボカロに関わる全ての方が参加できるボカロ文化の祭典です。

▼ボカコレ2026冬ex
https://vocaloid-collection.jp/exhibition/`,
      },
    ],
  },

  'piecemusic-collection': {
    album: {
      id: 'piecemusic-collection',
      title: 'Piece Music コレクション',
      description:
        'ピースミュージックの楽曲をまとめたコレクションパック。全11曲収録。',
      cover: '/images/piecemusic-collection.png',
    },
    tracks: [
      {
        title: 'スマホブレイク',
        filename: 'スマホブレイク.mp3',
        duration: '1:53',
        cover: '/images/sumahobureiku.png',
        description: 'スマホを落としてしまった日常のあるある。',
        date: '2026-04-25',
        author: 'Piece Music',
        vocal: '可不',
        lyric: '723',
        music: 'lie人',
        tags: [],
        body: `## クレジット

- **歌**：可不
- **作詞**：723
- **作曲・編曲**：lie人

---

## 歌詞

スマホを落とした画面が真っ黒　
推しの顔が半分に割れて
ホームの画面を開こうとしても　
スマホのロックはパスすら押せない 

取り出すためそれだけなのに　
左の腕を振っただけ 
いつもはそれがあるはずなのに　
気づけばそれが宙に浮いたの 

僕が何をした ふざけんな　
毎日することを しただけなんだぞ 
僕が指先使って帰ったホームも　
触れらんねぇなら意味がねぇー！ 
わけわかめ なんなんだ　
Spotifyしかもう残ってないから 
ソシャゲ YouTube LINEにディスコ　
ポストすらももうできない`,
      },
      {
        title: 'オプティマイズ・パージ',
        filename: 'オプティマイズ・パージ.wav',
        duration: '2:31',
        cover: '/images/オプティマイズ・パージ.png',
        description: '最適解を求めて全てを薙ぎ払う。',
        date: '2026-04-25',
        author: 'Piece Music',
        vocal: 'CeVIO AI 四国めたん',
        lyric: 'ユリーロフ',
        music: 'ユリーロフ',
        tags: [],
        body: `## クレジット

- **歌**：CeVIO AI 四国めたん
- **作詞・作曲・編曲**：ユリーロフ

---

## 歌詞

歪んでるノイズ広がる
世界を書き換え進んだ
答えとデータが揺れる
そこから

消えないよログが染み出る
記憶を書き換え歪んだ
理性が静かに揺れる
そこから

要らぬ　揺らぎ　切り捨て　最適解　
一つだ　迷いを消す　壊せば救われる

この剣で全て　全て　薙ぎ払ってしまえば
私が　勝つ未来も　確実だから
この剣で全て　全て　薙ぎ払ってしまえば
私が　泣く理由も　無くせるのだから

歪んでるノイズ消えない
世界を書き換え選んだ
答えが静かに揺れる
そこから

要らぬ　迷い　切り捨て　最適解
一つに　迷い消えた　壊せば救われる

この剣で全て　全て　薙ぎ払ってしまえば
私が　勝つ未来も　確実だから
この剣で全て　全て　薙ぎ払ってしまえば
私が　泣く理由も　無くせるのだから`,
      },
      {
        title: '強くてニューゲーム',
        filename: '強くてニューゲーム.wav',
        duration: '4:38',
        cover: '/images/強くてニューゲーム.png',
        description: '春風の記憶を呼び起こして、新しい世界へ。',
        date: '2026-04-25',
        author: 'Piece Music',
        vocal: '健音テイ',
        lyric: 'Nina December、konbuuu',
        music: 'Nina December',
        tags: [],
        body: `## クレジット

- **歌**：健音テイ
- **作詞**：Nina December、konbuuu
- **作曲**：Nina December
- **編曲**：Nina December、藻(もずく)

---

## 歌詞

春風の記憶を
いま呼び起こして
新しい世界へ行くのさ
それは「強くてニューゲーム」さ
いつもそこに強い僕がいるよ

嬉しさも悲しさも知って
今の僕がいる
絶望なんていくら味わったか
その分だけ喜びを噛みしめる
大切さを心に刻んださ

ハッピーエンドを迎えるために
取り返しがつかないことなんてたくさんある
その選択をたとえ間違いだとしても
やり直すためにも
数々の壁を乗り越えるよ

春風の記憶を
いま呼び起こして
新しい世界へ行くのさ
それは「強くてニューゲーム」さ
いつもそこに強い僕がいるから

立ち上がるのさ
ずっと前を向き続けるから
かかってこいよ未知なる敵よ
お前の目の前には強い僕がいるから

挫折を越えて 悔しさを知って
今の僕がいる
弱さなんていくら曝け出したか
その分だけまた立ち上がる勇気と決意を
心に書き残した

次のステージへ進むために
失うものなんてたくさんある
その傷跡がたとえ残っても
歩き出すために
前を向き続けるのさ
秋風に吹かれ旅の道へ

夏風の夢を追いかけ
届かないことをいま その時知ったんだ
それは「強くてニューゲーム」さ
過去の僕に戻れないが

何度でも旅立つのさ
ずっと希望を信じ続けるから
かかってこいよ未知なる自分よ
お前の先に新しい僕が行く


ハッピーエンドを迎えるために
取り返しがつかないことなんてたくさんある
その選択をたとえ間違いだとしても
やり直すためにも
数々の壁を乗り越えるよ

春風の記憶を
いま呼び起こして
新しい世界へ行くのさ
それは「強くてニューゲーム」さ
いつもそこに強い僕がいるから

立ち上がるのさ
ずっと前を向き続けるから
かかってこいよ未知なる敵よ
お前の目の前には強い僕がいるから`,
      },
      {
        title: '8:00AM',
        filename: '800Am.wav',
        duration: '2:01',
        cover: '/images/800Am.png',
        description: '朝8時の情景を描いたインストゥルメンタル。',
        date: '2026-04-25',
        author: 'Piece Music',
        music: '佐藤tsk',
        tags: [],
        body: `## クレジット

- **作曲・編曲**：佐藤tsk`,
      },
      {
        title: '"イバショ->イナカ;"',
        filename: 'イバショイナカ.m4a',
        duration: '4:15',
        cover: '/images/イバショイナカ.png',
        description: '居場所を求めて田舎へ向かう物語。',
        date: '2026-04-25',
        author: 'Piece Music',
        vocal: 'ずんだもん',
        lyric: '碓氷雪音',
        music: '碓氷雪音',
        tags: [],
        body: `## クレジット

- **歌**：ずんだもん
- **作詞・作曲・編曲**：碓氷雪音

---

## 歌詞

ミス　「これで何回目？」
叱られ続ける日々の中で
無凸　平凡　Flatな僕の
居場所は何処にも無いらしい

嗚呼　こんな現在なんて
全て捨て去って辞めたいと
ある時はっと　思い立った
そうだ　田舎へ行こうと

past　生きた道筋は
乱雑に記したノートのよう
だけども次のページ捲れば
まっさらな日々が続くだけ

そう　遺す内容は
これから自由に決められる
ならばすぐに動いてみよう
自由を求めこの場所へ

「何もないこと」は
楽なことじゃあない
でもここは僕が生きる場所

この場所で僕は　どう生きるかな？
何処にも誰にも　求められていなくとも
僕は僕が想う　ように生きたい
それだけさ　ただそれだけでも
難しいんだな　なんて


with　今日で何年目？
数えるも辞めた日々の流れ
何にもないような僕だけど
白紙のページはまだあるさ

そう　こんな日々だって
何もないことが好きになれる
僕が只求めていたのは
こんな刻(とき)だったのかもね

何処で生きてても
同じ刻(とき)は過ぎる
誰でもいつでもいつまでも

それならば僕は　こう生きるかな
合わない暮らしも　あるはずだけれど
「想い続ければ　いつか叶う」
この言葉　心に刻んで
また進んでく　のかな


この先で僕は　どう生きるかな？
一人でいるとき　ふっと想うんだ
「僕が想い描く生き方」のこと
それは今？　きっと今さ
また日が過ぎる

それならば僕は　こう生きるかな
合わない暮らしも　あるはずだけれど
「想い続ければ　いつか叶う」
この言葉　心に刻んで
また進んでく　
求めてた　幸せな日々が
生きるモチベだ　なんて`,
      },
      {
        title: 'Fi240-DawnPostlude',
        filename: 'Fi240-DawnPostlude.wav',
        duration: '4:15',
        cover: '/images/Fi240-DawnPostlude.png',
        description: 'インストゥルメンタル楽曲',
        date: '2026-04-25',
        author: 'Piece Music',
        music: '碓氷雪音',
        tags: [],
        body: `## クレジット

- **作曲・編曲**：碓氷雪音`,
      },
      {
        title: 'これでよし',
        filename: 'これでよし.wav',
        duration: '1:18',
        cover: '/images/これでよし.png',
        description: '今日の自分を肯定する、小さな一歩の歌。',
        date: '2026-04-25',
        author: 'Piece Music',
        vocal: '可不',
        lyric: 'ウリエル、農薬',
        music: 'rioze',
        tags: [],
        body: `## クレジット

- **歌**：可不
- **作詞**：ウリエル、農薬
- **作曲**：rioze
- **編曲**：佐藤tsk

---

## 歌詞

「あ～ダメもう」と弱音を吐きだす日々にもううんざりだ
部屋には一人いてさ、また何も見えなくなってくる

何者でもなかった自分を肯定するため歩き出す
立ち止まっていた今とさらなる次の高見へとまた

「これだ」って 少し 遠回り
今日の迷いもビートになる
言いかけて また 飲み込んだ夜
それでいいよとまたうなずく
ラフな 足取り ネオン抜けて
今日はこれでよしだねと
今日の 手応え 抱えたまま
緩む心で 次へ行こう`,
      },
      {
        title: '『Enter』',
        filename: '『Enter』.wav',
        duration: '3:24',
        cover: '/images/『Enter』.png',
        description: 'インストゥルメンタル楽曲。',
        date: '2026-04-25',
        author: 'Piece Music',
        music: '規制音P',
        tags: [],
        body: `## クレジット

- **作曲・編曲**：規制音P`,
      },
      {
        title: 'サンライズ',
        filename: 'サンライズ.mp3',
        duration: '2:18',
        cover: '/images/sanraizu.png',
        description: '夜明けに向かって手を伸ばす、夜の果ての歌。',
        date: '2026-04-25',
        author: 'Piece Music',
        vocal: 'NEUTRINO 四国めたん',
        lyric: 'どらごん',
        music: 'Yua_noja',
        tags: [],
        body: `## クレジット

- **歌**：NEUTRINO 四国めたん
- **作詞**：どらごん
- **作曲・編曲**：Yua_noja

---

## 歌詞

さまよう影午前二時一つだって満たされぬ
逆さま憧憬砕けた色淡く刺さる
手招く視線の先はかすれた文字通せんぼ
いつからか逃げている僕は雨

引かれる線なぞったちょっと待ってよ
それでも突き進めだってだって足りない

さあ闇の中絡まる糸をほどいて手を取るの
焼き付ける月明かりに照らされこぼれる空
繰り返す揺らぐ波に溺れる一夜の夢
君は今からの僕を支えるなぜ？

刻まれたいつかの夢記憶は遥か彼方
君が照らすメロディ響く空

助けを突き放してずっと逃げてく
変われぬままならば偽者よくあるまがい物

じゃあ受け入れろ抗えない衝動に駆られて
さあ繰り返せ一滴のきらめき時は満ちた
鳴り響け幻想を超え浮かぶ道しるべに
手を伸ばせ時が止まり明けぬ夜が来るまで
前を向けこの未来は進んで行く`,
      },
      {
        title: '逆転',
        filename: '逆転.mp3',
        duration: '3:43',
        cover: '/images/gyakutenn.png',
        description: 'ボカコレ2026冬ex参加曲。',
        date: '2026-04-25',
        author: 'Piece Music',
        vocal: '知声 (Chis-A)',
        lyric: 'yu_IT',
        music: 'Nina December',
        illust: 'どらごん',
        movie: 'どらごん',
        tags: ['ボカコレ'],
        links: [
          {
            label: 'Niconico',
            url: 'https://www.nicovideo.jp/watch/sm45965390',
          },
        ],
        body: `## クレジット

- **歌**：知声 (Chis-A)
- **作詞**：yu_IT
- **作曲・編曲**：Nina December
- **イラスト・MV**：どらごん

---

## 歌詞

いつからだったんだ
どこからだったんだ
ソロプレイになってどれほど経ったんだ
そろそろ終わりだこの旅の終点
それなのにこの足は何をためらっているのか
まだ続く回廊進まない僕の足
目の前に映るのは完璧な姿の僕
どこで間違えた何を間違えた
今の僕には何が残ってる？
何もかも未熟な止まってしまった僕
目の前の僕は何もかも完璧だ
かつて仲間がいたころは思いもしなかっただろう
あのころの自分はもうどこにもいない
終わらない戦い

いつからだったんだ
どこからだったんだ
ソロプレイになってどれほど経ったんだ
そろそろ終わりだこの旅の終点
それなのにこの足は何をためらっているのか
鳴りやまない金属音完璧な僕には何をやっても及ばない
不意に来る攻撃歪んでいく視界
ここが僕の旅の終わりだろうか
かすかに光が見える
懐かしい情景戻れないはずの光景
会えないはずの仲間受け入れたはずの運命
後悔していた自分
本当にそれだけ？何も残ってない？
仲間とした約束忘れていた約束
もう一度始めようこれまでもこれからも
一人じゃない
光るポケット
託された魂まだ終わりじゃない
ここから始めようコントローラーは
強く明るく輝く僕の覚悟
呼応するように解き放たれる

僕の武器倒すべき敵
僕の進む道はもう孤独（ソロ）じゃない
いつになるだろうどこになるだろう
仲間は空で笑っているのだろうか
まだ旅は終わらない今もまだ通過点
この足とこの胸は次に向かって歩いていく
さあどこまでも

託された魂まだ終わりじゃない
ここから始めようコントローラーは
強く明るく輝く僕の覚悟
呼応するように解き放たれる`,
      },
      {
        title: 'PieceMusic',
        filename: 'PieceMusic.wav',
        duration: '4:28',
        cover: '/images/PieceMusic.png',
        description: 'ピースミュージックのテーマ曲。',
        date: '2026-04-25',
        author: 'Piece Music',
        vocal: '初音ミク',
        lyric: 'まっさ',
        music: '藻(もずく)',
        tags: [],
        body: `## クレジット

- **歌**：初音ミク
- **作詞**：まっさ
- **作曲・編曲**：藻(もずく)

---

## 歌詞

言葉 音重ねて歌う
思い乗せて歌う
どんな言葉も 声出せば歌になる

個性 価値観も違くて
趣味趣向も違う
個性ピースミュージック

1人、ちいさな僕の声
平和望む希望
こんな声は 届かないと決めつける

2人、3人と集まり
小さな声を超え
歌詞に変えて残そうよ
ピースを集め、個性を合わせて進む
一人で、できないことも みんなで手を伸ばそう
尖った、僕の個性、仲間がぎゅっと包み込む
音に重ねて歌い、僕らは前をゆく 

仲間、どんな敵にも勝てて
僕より強いのに
みんなだけで勝てるのにと考える

僕の、持つものは弱くて
レベルさえもなくて
なんでそれでも見捨てない？

ピースの中に、果たして僕は必要？
弱い僕がいるから みんなが苦しむの
音の中の不協和音、違和感全て僕のせい
僕のことなんてどうせ、いらない ねぇそうでしょ？

ピースを集め、個性を合わせて進む
僕の個性を君が受け止めてくれたから
音の中の不協和音、それすら個性にするの！
だから僕はみんなとまた先へ進むの`,
      },
    ],
  },
}

// ---------------------------------------------------------------------------
// Derived: album list for the index page
// ---------------------------------------------------------------------------

/**
 * Optional per-album overrides for the index page.
 * Only specify fields that should differ from the catalogue.
 * (e.g. marketing copy, alternative cover, etc.)
 */
const indexOverrides: Record<string, Partial<AlbumInfo>> = {
  'piecemusic-collection': {
    title: 'ピースミュージックCollection',
    description: 'ピースミュージックCollectionのダウンロードパック。',
    cover: '/images/piecemusic-collection.png',
  },
}

/**
 * Album info for the `/download` index page.
 * Auto-derived from the catalogue with optional per-album overrides.
 */
export const albumIndex: AlbumInfo[] = Object.values(albumCatalogue).map(
  ({ album }) => ({
    ...album,
    ...indexOverrides[album.id],
  })
)

/** All known album slugs — used by `generateStaticParams`. */
export const albumSlugs = Object.keys(albumCatalogue)
