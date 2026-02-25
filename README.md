# 更新マニュアル

### サークルのWebサイトは、みんなで協力して更新できるようになっています！

> 変更 -> 管理者 (Rioze) が承認 -> サイトに自動反映

あなたの変更は管理者が確認してから公開されるので、間違えてもすぐに反映されません。安心して編集してください。

> GitHubのユーザー名（名前）によっては、匿名で更新できますよ。

---

## 1. 記事の追加・編集の手順

記事の中身（書き方）は後述します。

### 初めてやる場合

> GitHubアカウントにログインしている状態であることを確認してから、以下の手順をやります。

1. **[サイトのリポジトリ]** (ここ ([https://github.com/riozee/piecemusic.party](https://github.com/riozee/piecemusic.party))) にアクセスします。
2. `content` フォルダに入って:
   - 編集したいファイルを開いて、**鉛筆アイコン**をクリックする
   - か、**[Add file]** → **[Create new file]** で新規作成します。
3. **[Fork this repository...]** という画面が出たら、緑ボタンを押します。
4. 編集・記入が終わったら、右上の **[Commit changes...]** をクリック。
   - **[Commit message]** (必須): 「ライブの告知を追加」など、何をしたか一言で書く。
   - **"Create a new branch for this commit and start a pull request"** をそのまま選択して **[Propose changes]** をクリック。
5. ページが切り替わったら、緑色の **[Create pull request]** ボタンを押して完了。

### 2回目以降

2回目からは、あなたのプロフィールから作業を始めます。

1. GitHub右上のアイコン → **[Your repositories]** をクリック。
2. 前回作業したリポジトリ `piecemusic.party` を開く。
3. **作業前に必ず [Sync fork] を確認！**
   - 「This branch is out of date」と出ていたら **[Update branch]** をクリックして最新にします。
4. 編集・記入が終わったら、右上の **[Commit changes...]** をクリック。
   - **[Commit message]**: 内容を書く。
   - そのまま緑の **[Commit changes]** ボタンを押す
5. 画面上部に「This branch is ahead of...」という表示が出るので、右側の **[Contribute]** → **[Open pull request]** をクリック。
6. 緑色の **[Create pull request]** ボタンを押して完了。

> ### 難しいなと思ったら❗
>
> テキストと画像を送ってくれれば、代わりに更新するので、遠慮なく連絡してください。
>
> - Discord: メンションまたはDM
> - Email: contact@rioze.dev

---

## 2. 記事の書き方・テンプレート

このサイトには3種類のコンテンツがあります。

> それぞれ保存場所（フォルダ）と書き方が異なるので注意してください。

- 📅 **Events (`content/events`)**: ライブ、交流会などのイベント告知。
- 💿 **Works (`content/works`)**: 作品（楽曲など）の紹介。
- 📝 **Posts (`content/posts`)**: ブログ、機材紹介、活動報告など。

### 画像の貼り方

画像を使いたい場合は、記事を書く前にアップロードしておくとスムーズです。

> 初めてやる場合、「初めてやる場合」とほぼ同じ手順でやります。ただ、対象はファイルじゃなくて画像です。

1. `public` フォルダの中の `images` フォルダを開く。
2. **[Add file]** → **[Upload files]** で画像をアップロード。
3. **ファイル名**をコピーしておく。
4. 記事の中で `![画像の説明](/images/ファイル名.jpg)` と書く。

---

### 記事の書き方

新規作成時は、ファイル名の末尾を必ず `.mdx` にしてください（例: `sanraizu.mdx`）。

> ファイル名はリンクになるので、おしゃれに書きしましょう
>
> (例： sanraizu.mdx -> piecemusic.party/works/sanraizu)

### テンプレート集

以下の枠内をコピーして、中身を書き換えて使いましょう。

> `---`で囲っている上の部分は情報、その下は本文っていう形になっています

#### 📅 Events用 (`content/events/... .mdx`)

```yaml
---
title: 'イベント名'
date: '2025-12-25'
time: '13:00 – 18:30'
location: '場所・住所'
description: '一覧に表示される短い説明文'
links:
  - label: '詳細ページなど'
    url: 'https://...'
cover: '/images/フライヤー画像.jpg'
---

## 見出し
![フライヤー](/images/フライヤー画像.jpg)

ここに告知文を書いてください。

```

#### 💿 Works用 (`content/works/... .mdx`)

```yaml
---
title: '曲のタイトル'
date: '2025-12-25'
description: '曲の紹介文'
author: '作曲者名'
tags: ['ニコ超', 'ボーマス']
cover: '/images/ジャケット画像.jpg'

# /download ページでグループ化しますので
# この曲が武笠先輩の作ったDLサイトのリンクを持っている場合
# リンクをここに貼って、accessCardを false から true に書き換えます
# なければ消してOK
download: 'https://ダウンロードURL...'
accessCard: false

# クレジット（不要な行は消してOK）
vocal: 'ボーカル'
lyric: '作詞'
music: '作曲'
arrangement: '編曲'
illust: 'イラスト'
movie: '動画'

# 不要なリンクは label と url の２行を必ず消してください
links:
  - label: 'YouTube'
    url: 'https://youtube.com/...'
  - label: 'ニコニコ'
    url: 'https://niconico.jp/...'
highlight: false
---
## ライナーノーツ
ここに楽曲への思いや解説を書いてください。
```

#### 📝 Posts用 (`content/posts/... .mdx`)

```yaml
---
title: '記事のタイトル'
date: '2025-12-25'
tags: ['機材', '日記']
description: '記事の要約'
author: '執筆者名'
cover: '/images/サムネイル画像.jpg'
---
## 今日の活動報告
ここにブログ本文を書いてください。
```

---

## 書き方の注意点（Frontmatter & Markdown）

### 1. 先頭の `---` ブロック（Frontmatter）

記事の一番上にある設定エリアです。ここが壊れると表示されません。

- `項目名: '内容'` の形式を守る（コロンの後の半角スペースを消さない）。
- `'`（シングルクオテーション）で囲むのを忘れない。

### 2. 本文の書き方（Markdown）

- **見出し**: `#` の数で大きさを変えます。
- `## 大きな見出し`
- `### 中くらいの見出し`

- **太字**: `**強調したい文字**`
- **リンク**: `[表示する文字](URL)`
- **リスト**: `- リストの項目`

---

Copyright © 2026 [PIECE MUSIC](https://piecemusic.party). All rights reserved.

Site by [STELLAR DRAGOON](https://github.com/stellardragoon) ([Rioze](https://github.com/riozee))
