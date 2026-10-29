# コトバパス (KotobaPass)

> **「思い出せない」を、なくしたい。**  
> 日本語の秘密のフレーズから決定論的にパスワードを生成する、ベンダーロックインゼロのステートレス・パスワードジェネレーター。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Vendor Lock-in](https://img.shields.io/badge/Vendor%20Lock--in-ZERO-emerald)](https://github.com)
[![Stateless](https://img.shields.io/badge/Storage-100%25%20Stateless-indigo)](https://github.com)
[![Build Free](https://img.shields.io/badge/Build-Vanilla%20JS%20(No%20Build)-orange)](https://github.com)

---

## 💡 コンセプト

パスワード管理アプリのマスターパスワードを忘れてしまったり、サービスごとに複雑な英数記号のパスワードを覚えておくのに疲れていませんか？

**コトバパス (KotobaPass)** は、「自分だけが知っている日本語のフレーズ」から、強力なパスワードをいつでも同じ値として導出できるツールです。

- **サーバー送信ゼロ**: 入力された文字列は一切外部に送信されません（Web Crypto APIによる完全クライアント計算）。
- **パスワード保存ゼロ**: 秘密のフレーズはサーバーにもブラウザのLocalStorageにも保存されません。
- **ベンダーロックインゼロ**: 万が一このサイトが消滅・閉鎖されても、**PCに標準搭載されているPowerShellやBashの1行コマンドで、全く同じパスワードを100%再現**できます。

---

## 🛠 緊急復旧CLIコマンド（OS標準コマンドで永久に再現）

サイトにアクセスできない環境や緊急時でも、OS標準のターミナルに以下の1行を貼り付けて実行するだけで、同一のパスワード（24文字）が即座に出力されます。

### Windows (PowerShell)

```powershell
$bytes = [System.Text.Encoding]::UTF8.GetBytes("日本語の秘密のフレーズ")
[Convert]::ToBase64String((New-Object Security.Cryptography.SHA256CryptoServiceProvider).ComputeHash($bytes)).Substring(0,24)
```

### Linux / macOS (Bash)

```bash
echo -n "日本語の秘密のフレーズ" | openssl dgst -sha256 -binary | openssl base64 | head -c 24; echo
```

> **解説**:  
> 世界標準の暗号ハッシュ関数 **SHA-256**（32バイトバイナリ）を計算し、**Base64**（64種類の英数記号）にエンコードして先頭から指定桁数を切り出しています。特殊なライブラリや独自暗号を一切使用していないため、OS標準機能のみで完全一致します。

---

## 🔐 コア機能と設計のポイント

### 1. 記号制御とCLIワンライナーの完全同期
Base64が標準で出力する記号は `+` と `/` です。サービスの要件に合わせて以下の3つのモードに対応し、CLI側とも完全一致させています。

* **標準（Base64そのまま）**: `+` と `/` を含む。
* **記号なし（英数字のみ）**: `+`, `/`, `=` を除去してから指定文字数で切り出し。
  * *PowerShell*: `.Replace("+","").Replace("/","").Replace("=","")`
  * *Bash*: `| tr -d '+/='`
* **カスタム置換**: Webサービスで使いやすい記号（例: `+` → `!`, `/` → `@`）へ置換。
  * *PowerShell*: `.Replace("+","!").Replace("/","@").Replace("=","")`
  * *Bash*: `| tr '+/' '!@' | tr -d '='`

### 2. 「記号必須」サイトへの対策（サフィックス付加）
Base64の中で記号（`+`, `/`）が現れる確率は64文字中2文字のため、短いパスワードでは記号が1つも含まれないことがあります。  
コトバパスでは「接尾辞（Suffix）」オプションをサポートしており、末尾に `!` などの固定記号を付加することで、記号必須サイトの要件を100%満たせます（CLIコマンド側にも自動反映）。

### 3. サービスごとの使い分け（ソルト / 識別子）
同じ日本語フレーズを使い回しても、Amazon用、Google用などで異なるパスワードを生成できるよう、「サービス名（任意）」入力欄を設けています。  
内部で `日本語のフレーズ:amazon` のようにセパレータ（`:`）で結合してハッシュ化します。

### 4. セキュリティ境界（LocalStorageの保存対象）
- **保存しないもの**: ユーザーが入力した「秘密のフレーズ」自体（タブを閉じれば消去）。
- **保存するもの**: パスワードの文字数、記号モード、プリセット設定などの「生成ルール（設定）」のみ。

### 5. 設定のURLクエリ共有
PCとスマートフォン間で同じ設定（文字数や記号モード）を同期できるよう、`?len=20&sym=custom&p=!&s=@` のような設定URLの生成・読み込みに対応しています。

---

## 📁 ディレクトリ構成

ソースコードの透明性を最重要視し、トランスパイルやビルドステップを一切挟まない構成にしています。GitHub上のコードとブラウザで実行されているコードが1対1で一致します。

```text
kotoba-pass/
├── .github/
│   └── workflows/
│       └── deploy.yml# GitHub Pages デプロイワークフロー
├── index.html        # メインUI（単一ページ完結・OGPタグ対応）
├── css/
│   └── style.css     # カスタムスタイル
├── js/
│   ├── app.js        # UIイベント制御・リアルタイム反映・コピー処理
│   ├── generator.js  # Web Crypto APIによるハッシュ生成・文字列変換ロジック
│   ├── cli-builder.js# Windows(PowerShell) / Linux(Bash) コマンド動的生成
│   └── storage.js    # LocalStorageへの設定・プリセット保存・URLクエリ共有
├── manifest.json     # PWA対応（ホーム画面追加）
├── sw.js             # Service Worker（完全オフラインキャッシュ動作）
├── icons/            # アイコン画像 (SVG / 192px / 512px)
├── images/           # OGP画像 (ogp.png 1200x630, ogp.svg)
├── scripts/          # OGP画像再生成スクリプト (generate-ogp.ps1)
├── test-verify.js    # Web Crypto APIとPowerShell/Bashの出力完全一致テスト
└── README.md         # ドキュメント
```

---

## 🚀 使い方

### ブラウザで使う
1. `index.html` をブラウザで直接開くか、GitHub Pagesなどの静的ホスティングにデプロイします。
2. 「秘密のフレーズ」に、自分だけが覚えている文章（例: `吾輩は猫である名前はまだ無い`）を入力します。
3. （任意）「サービス名」に `amazon` や `google` などを入力します。
4. 生成されたパスワードをコピーして利用します。

### オフライン・PWAとして使う
Service Worker（`sw.js`）により、一度読み込めばインターネット接続が切断された状態（機内モードなど）でも完全に動作します。スマートフォンの「ホーム画面に追加」やPCの「アプリとしてインストール」も可能です。

---

## 🖼 OGP画像の編集と再生成

OGP画像（1200x630px）は画像生成AIではなく、編集可能なスクリプトおよびベクターSVGとして管理されています。  
デザインやテキストを変更したい場合は、以下のいずれかで再生成できます。

```powershell
# PowerShell（Windows標準・追加ライブラリ不要）
powershell -ExecutionPolicy Bypass -File .\scripts\generate-ogp.ps1
```

また、`images/ogp.svg` を直接ベクターエディタやテキストエディタで編集して利用することも可能です。

---

## 🧪 整合性テストの実行

Web Crypto APIの出力と、PowerShell・Bashのコマンド出力が1文字の狂いもなく一致するかを以下のテストスクリプトで自動検証できます。

```bash
node test-verify.js
```

---

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照してください。

