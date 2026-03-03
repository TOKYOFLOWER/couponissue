# クーポン発行＆会員管理システム - Claude Code プロジェクト指示書

## プロジェクトパス
`X:\projects\couponissue`

## アーキテクチャ
- **フロントエンド**: GitHub Pages（静的HTML/CSS/JS）
- **バックエンド**: Google Apps Script（JSON API）
- **データベース**: Google Sheets

フロントエンドとバックエンドを完全に分離する。
GAS は JSON API のみを提供し、HTML は一切返さない。
フロントエンドは GitHub Pages でホストし、fetch() で GAS API を呼び出す。

## 重要ルール
- **確認なしで最後まで完成させること**。途中で質問せず、合理的なデフォルトで判断して進める。
- すべてのファイルを実際に作成し、動作する状態にする。
- GAS の制約（6分制限、グローバル関数のみ、import/export不可）を厳守する。
- GAS は doGet/doPost で JSON のみを返す（ContentService.createTextOutput + MimeType.JSON）。
- フロントエンドは純粋な HTML/CSS/JS（フレームワーク不使用、シンプルに）。
- モバイルファースト（お客様向け画面はスマホ最適化）。
- 日本語UIで構築する。

---

## ディレクトリ構成

```
X:\projects\couponissue\
├── gas\                          # GAS バックエンド（clasp管理）
│   ├── .clasp.json
│   ├── .claspignore
│   ├── appsscript.json
│   └── src\
│       ├── main.js               # doGet / doPost エントリーポイント
│       ├── config.js             # 定数・シート名・設定
│       ├── utils.js              # UUID、日付、シートCRUD
│       ├── auth.js               # 管理者認証（APIキー方式）
│       ├── memberService.js      # 会員CRUD
│       ├── couponService.js      # クーポンマスタCRUD
│       ├── couponIssueService.js # クーポン発行・利用処理
│       ├── mailService.js        # メール送信
│       ├── pointService.js       # ポイント管理
│       └── triggerService.js     # 自動トリガー
├── docs\                         # GitHub Pages フロントエンド
│   ├── index.html                # 管理画面トップ（ダッシュボード）
│   ├── members.html              # 会員管理
│   ├── coupons.html              # クーポン管理
│   ├── mail.html                 # メルマガ配信
│   ├── register.html             # 会員登録（お客様向け）
│   ├── coupon.html               # クーポン表示＆スワイプ（お客様向け）
│   ├── css\
│   │   └── style.css             # 共通CSS
│   ├── js\
│   │   ├── config.js             # API URL設定
│   │   ├── api.js                # GAS API呼び出しヘルパー
│   │   ├── admin.js              # 管理画面共通ロジック
│   │   ├── dashboard.js          # ダッシュボード
│   │   ├── members.js            # 会員管理ロジック
│   │   ├── coupons.js            # クーポン管理ロジック
│   │   ├── mail.js               # メルマガ配信ロジック
│   │   ├── register.js           # 会員登録ロジック
│   │   └── coupon-view.js        # クーポン表示＆スワイプロジック
│   └── img\
│       └── logo.svg              # ロゴ（花のアイコン、SVGで作成）
├── .gitignore
├── CLAUDE.md
└── README.md
```

---

## GAS バックエンド API 設計

### 認証方式
- **管理者API**: リクエストヘッダー or パラメータに `apiKey` を含める。config.js に `API_KEY` を定義。
- **公開API**（会員登録、クーポン表示）: apiKey 不要。トークンベースで認証。
- GAS の doGet/doPost は CORS の制約がないため、GitHub Pages から直接 fetch 可能。
  ただし GAS Web App は POST リクエストのレスポンスが opaque になる場合があるため、
  **doGet でクエリパラメータ `action` を使うアプローチ**も併用する。

### API エンドポイント設計

すべて doGet / doPost の `action` パラメータで振り分ける。

#### doGet（参照系 + 公開系）
```
GET ?action=dashboard&apiKey=XXX
  → ダッシュボード情報（会員数、誕生日、未使用クーポン数、直近ログ）

GET ?action=members&apiKey=XXX&search=キーワード&page=1&limit=20
  → 会員一覧（検索・ページネーション対応）

GET ?action=member&apiKey=XXX&id=MEMBER_ID
  → 会員詳細

GET ?action=couponMasters&apiKey=XXX
  → クーポンマスタ一覧

GET ?action=couponMaster&apiKey=XXX&id=COUPON_ID
  → クーポンマスタ詳細

GET ?action=issuedCoupons&apiKey=XXX&couponId=XXX&status=unused
  → 発行済みクーポン一覧（フィルタ対応）

GET ?action=mailLogs&apiKey=XXX&page=1&limit=20
  → メール配信ログ

GET ?action=pointHistory&apiKey=XXX&memberId=MEMBER_ID
  → ポイント履歴

GET ?action=settings&apiKey=XXX
  → システム設定一覧

--- 以下は公開API（apiKey不要）---

GET ?action=couponView&token=TOKEN
  → クーポン表示データ（お客様向け、トークン認証）

GET ?action=unsubscribe&memberId=MEMBER_ID
  → メール配信停止処理
```

#### doPost（更新系）
すべて JSON body で送信。管理系は body 内に `apiKey` を含める。

```json
POST body:
{
  "action": "createMember",
  "apiKey": "XXX",
  "data": { "name": "...", "email": "...", ... }
}

POST actions 一覧:
--- 管理者API（apiKey必須）---
createMember      → 会員登録（スタッフ）
updateMember      → 会員情報更新
deleteMember      → 会員削除（論理削除: status→inactive）
createCouponMaster → クーポンマスタ作成
updateCouponMaster → クーポンマスタ更新
issueCoupons      → クーポン一括発行（対象会員IDの配列）
useCouponByStaff  → スタッフによるクーポン利用処理
sendMail          → メール送信（一斉/個別）
adjustPoints      → ポイント手動調整
updateSettings    → 設定更新
initializeSheets  → シート初期化（初回のみ）

--- 公開API（apiKey不要）---
registerMember    → 会員登録（お客様Web登録）
useCoupon         → クーポン利用（お客様スワイプ、token必須）
```

### API レスポンス形式
```json
// 成功時
{
  "success": true,
  "data": { ... }
}

// エラー時
{
  "success": false,
  "error": "エラーメッセージ"
}
```

### GAS doGet / doPost 実装パターン

```javascript
function doGet(e) {
  var action = e.parameter.action || '';
  var apiKey = e.parameter.apiKey || '';
  var result;

  try {
    // 公開APIの振り分け
    if (action === 'couponView') {
      result = getCouponView(e.parameter.token);
    } else if (action === 'unsubscribe') {
      result = processUnsubscribe(e.parameter.memberId);
    }
    // 管理APIの振り分け（認証チェック）
    else if (!isValidApiKey(apiKey)) {
      result = { success: false, error: '認証エラー' };
    } else {
      switch (action) {
        case 'dashboard': result = getDashboard(); break;
        case 'members': result = getMembers(e.parameter); break;
        // ... 他のアクション
        default: result = { success: false, error: '不明なアクション' };
      }
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var action = body.action || '';
  var apiKey = body.apiKey || '';
  var data = body.data || {};
  var result;

  try {
    // 公開APIの振り分け
    if (action === 'registerMember') {
      result = registerMemberPublic(data);
    } else if (action === 'useCoupon') {
      result = useCouponByCustomer(body.token);
    }
    // 管理APIの振り分け
    else if (!isValidApiKey(apiKey)) {
      result = { success: false, error: '認証エラー' };
    } else {
      switch (action) {
        case 'createMember': result = createMember(data); break;
        case 'updateMember': result = updateMember(data); break;
        // ... 他のアクション
        default: result = { success: false, error: '不明なアクション' };
      }
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## データ構造（Google Sheets）

### シート1: `members`（会員マスタ）
| カラム | 型 | 説明 |
|--------|------|------|
| member_id | String | UUID |
| name | String | 会員名 |
| name_kana | String | フリガナ |
| phone | String | 電話番号 |
| email | String | メールアドレス |
| birthday | String | 誕生日（MM/DD） |
| registration_date | String | 登録日（ISO） |
| registration_method | String | `staff` / `web` |
| total_points | Number | 累計ポイント |
| available_points | Number | 利用可能ポイント |
| memo | String | 備考 |
| status | String | `active` / `inactive` / `unsubscribed` |
| mail_opt_in | Boolean | メルマガ受信許可 |

### シート2: `coupon_master`（クーポンマスタ）
| カラム | 型 | 説明 |
|--------|------|------|
| coupon_id | String | `CPN-YYYYMMDD-NNN` |
| coupon_name | String | クーポン名 |
| coupon_type | String | `percent` / `fixed` / `benefit` / `point` |
| coupon_value | String | 値 |
| description | String | 説明文 |
| expiry_type | String | `relative` / `absolute` |
| expiry_days | Number | 相対期限の日数 |
| expiry_date | String | 絶対期限の日付 |
| distribution_method | String | `mail_magazine` / `individual` / `birthday` / `qr_store` |
| usage_flow | String | `customer_swipe` / `staff_operate` |
| design_color | String | 背景色HEX |
| design_image_url | String | 画像URL |
| created_at | String | 作成日時 |
| created_by | String | 作成者 |
| is_active | Boolean | 有効/無効 |

### シート3: `coupon_issued`（発行済みクーポン）
| カラム | 型 | 説明 |
|--------|------|------|
| issue_id | String | UUID |
| coupon_id | String | クーポンマスタID |
| member_id | String | 会員ID |
| token | String | URLトークン（UUID） |
| issued_at | String | 発行日時 |
| expires_at | String | 有効期限 |
| status | String | `unused` / `used` / `expired` |
| used_at | String | 利用日時 |
| used_by | String | `customer` / スタッフ名 |

### シート4: `mail_log`（メール配信ログ）
| カラム | 型 | 説明 |
|--------|------|------|
| log_id | String | UUID |
| mail_type | String | `magazine` / `individual` / `birthday_auto` / `coupon_notify` |
| subject | String | 件名 |
| body_template | String | テンプレート名 |
| sent_to | String | member_id or `ALL` |
| sent_at | String | 送信日時 |
| sent_count | Number | 件数 |
| status | String | `success` / `partial_fail` / `failed` |

### シート5: `point_history`（ポイント履歴）
| カラム | 型 | 説明 |
|--------|------|------|
| history_id | String | UUID |
| member_id | String | 会員ID |
| change_type | String | `earn` / `use` / `expire` / `adjust` |
| points | Number | 変動ポイント |
| reason | String | 理由 |
| related_id | String | 関連ID |
| created_at | String | 日時 |

### シート6: `settings`（システム設定）
| key | value（初期値） |
|-----|-------|
| store_name | 銀座東京フラワー |
| store_email | （空欄） |
| welcome_coupon_id | （空欄） |
| birthday_coupon_id | （空欄） |
| birthday_send_day | 1 |
| webapp_url | （空欄 → GitHub PagesのURL） |
| api_url | （空欄 → GAS Web AppのURL） |

---

## フロントエンド詳細

### docs/js/config.js
```javascript
// GAS Web App の URL（デプロイ後に設定）
var CONFIG = {
  API_URL: 'https://script.google.com/macros/s/XXXXX/exec',
  API_KEY: 'YOUR_API_KEY_HERE',
  SITE_NAME: '銀座東京フラワー'
};
```

### docs/js/api.js（API呼び出しヘルパー）
```javascript
// GAS API への GET リクエスト
async function apiGet(action, params = {}) {
  var url = new URL(CONFIG.API_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('apiKey', CONFIG.API_KEY);
  Object.keys(params).forEach(key => url.searchParams.set(key, params[key]));

  var response = await fetch(url.toString());
  return await response.json();
}

// GAS API への POST リクエスト
// 注意: GAS の doPost は fetch で呼ぶと opaque response になる場合がある。
// 対策として mode: 'no-cors' は使わず、以下のパターンで対応:
// 方法1: Google Apps Script の doPost は redirect を返すため、
//        fetch の redirect: 'follow' で対応できる場合がある。
// 方法2: doGet に action パラメータとして POST データを URL エンコードして送る。
// ここでは方法2をフォールバックとして実装する。
async function apiPost(action, data = {}) {
  try {
    var response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: action,
        apiKey: CONFIG.API_KEY,
        data: data
      })
    });
    return await response.json();
  } catch (e) {
    // POST が失敗する場合は GET フォールバック
    var url = new URL(CONFIG.API_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('apiKey', CONFIG.API_KEY);
    url.searchParams.set('data', JSON.stringify(data));
    var response = await fetch(url.toString());
    return await response.json();
  }
}

// 公開API（apiKey不要）
async function apiPublicGet(action, params = {}) {
  var url = new URL(CONFIG.API_URL);
  url.searchParams.set('action', action);
  Object.keys(params).forEach(key => url.searchParams.set(key, params[key]));
  var response = await fetch(url.toString());
  return await response.json();
}

async function apiPublicPost(action, data = {}) {
  try {
    var response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: action, data: data })
    });
    return await response.json();
  } catch (e) {
    var url = new URL(CONFIG.API_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('data', JSON.stringify(data));
    var response = await fetch(url.toString());
    return await response.json();
  }
}
```

### GitHub Pages のURL構成
```
https://TOKYOFLOWER.github.io/couponissue/              → 管理画面（ダッシュボード）
https://TOKYOFLOWER.github.io/couponissue/members.html   → 会員管理
https://TOKYOFLOWER.github.io/couponissue/coupons.html   → クーポン管理
https://TOKYOFLOWER.github.io/couponissue/mail.html       → メルマガ配信
https://TOKYOFLOWER.github.io/couponissue/register.html   → 会員登録（お客様向け）
https://TOKYOFLOWER.github.io/couponissue/coupon.html?token=XXX → クーポン表示
```

---

## 機能詳細

### 1. 会員管理
- **スタッフ登録**（管理画面 members.html）: フォームから登録。apiPost('createMember', data)。
- **Web登録**（register.html）: お客様向け公開フォーム。apiPublicPost('registerMember', data)。登録後にウェルカムメール自動送信（GAS側）。
- **検索**: 名前・電話・メールで部分一致検索。
- **編集**: モーダルでインライン編集。ステータス変更、メモ追記。

### 2. クーポン発行＆利用
- **マスタ作成**（coupons.html）: タイプ・期限・利用フローを設定してフォーム送信。
- **発行**: 対象会員を選択 → issueCoupons API → token生成 → メール送信（GAS側で実行）。
- **クーポン表示画面**（coupon.html）:
  - URLパラメータ `?token=XXX` で apiPublicGet('couponView', {token}) を呼び出し。
  - レスポンスに基づいてクーポンカードを描画。
  - ステータス表示: unused（利用可能）/ used（利用済み）/ expired（期限切れ）。
  - **スワイプ利用**: TouchEvent でスワイプ検知 → 確認ダイアログ → apiPublicPost('useCoupon', {token}) → 画面更新。
  - **二重利用防止**: GAS側で LockService + ステータス再チェック。

### 3. メルマガ配信（mail.html）
- テンプレート変数: `{{name}}`, `{{coupon_url}}`, `{{store_name}}`, `{{unsubscribe_url}}`
- 一斉配信: sendMail API（type: 'magazine'）
- 個別配信: sendMail API（type: 'individual', memberIds: [...]）
- 誕生日自動配信: GAS トリガーで毎日実行（フロントエンド関与なし）

### 4. ポイント機能
- クーポンタイプ `point` の利用時にGAS側で自動加算。
- 管理画面から手動調整: adjustPoints API。
- 会員詳細で履歴表示。

### 5. GAS 自動トリガー
- `setupTriggers()`: removeTriggers() → 新規登録:
  - 毎日 9:00 JST: runBirthdayAutoSend
  - 毎日 0:00 JST: runExpireCoupons

---

## デザインガイドライン

### 共通
- フォント: Noto Sans JP（Google Fonts CDN）
- CSS変数で配色管理
- box-sizing: border-box

### お客様向け画面（register.html, coupon.html）
- モバイルファースト（max-width: 480px ベース）
- 配色: 花店らしい柔らかいピンク（#F8BBD0）〜グリーン（#C8E6C9）
- クーポンカード: 角丸16px、box-shadow、design_color を背景グラデーション
- スワイプUI: 右方向スワイプで利用。矢印アニメーションでガイド
- 利用済み: グレーアウト + 回転した「USED」赤スタンプ
- 期限切れ: グレーアウト + 「EXPIRED」スタンプ

### 管理画面（index.html, members.html, coupons.html, mail.html）
- 上部ナビゲーションバー（ダッシュボード / 会員 / クーポン / メルマガ）
- カード型レイアウト
- 配色: ダークネイビー（#1a237e）ヘッダー + ホワイト背景
- テーブルは横スクロール対応（overflow-x: auto）
- モーダルで登録・編集フォーム

---

## clasp 設定

### gas/.clasp.json（scriptIdはclasp create後に自動生成）
```json
{
  "scriptId": "YOUR_SCRIPT_ID_HERE",
  "rootDir": "./src"
}
```

### gas/appsscript.json
```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

### gas/.claspignore
```
node_modules/**
.git/**
```

### .gitignore（ルート）
```
node_modules/
gas/.clasp.json
docs/js/config.js
```

**注意: docs/js/config.js は API_KEY を含むため .gitignore に追加。
代わりに docs/js/config.example.js をコミットし、READMEに設定手順を記載する。**

---

## セキュリティ
- 管理API: API_KEY によるシンプル認証（config.js の API_KEY と GAS 側の API_KEY を一致させる）
- API_KEY は Utilities.getUuid() で生成した十分に長いランダム文字列
- 公開API: トークンベース認証（couponView, useCoupon）or 認証なし（registerMember）
- クーポン利用: LockService で排他制御
- config.js は .gitignore で除外（API_KEY漏洩防止）
- GitHub Pages は HTTPS（デフォルト）

---

## 実装の優先順位（この順番で作成すること）

### Phase 1: GAS バックエンド（gas/ 配下）
1. gas/appsscript.json
2. gas/.claspignore
3. gas/src/config.js（API_KEY、SPREADSHEET_ID、シート名、ADMIN設定）
4. gas/src/utils.js（UUID、日付、シートCRUD、initializeSheets）
5. gas/src/auth.js（isValidApiKey）
6. gas/src/main.js（doGet/doPost ルーティング）
7. gas/src/memberService.js
8. gas/src/couponService.js
9. gas/src/couponIssueService.js（LockService排他制御含む）
10. gas/src/mailService.js
11. gas/src/pointService.js
12. gas/src/triggerService.js

### Phase 2: フロントエンド（docs/ 配下）
13. docs/css/style.css（共通CSS、レスポンシブ、変数定義）
14. docs/js/config.example.js（API URL と API_KEY のテンプレート）
15. docs/js/config.js（実際の設定値 → .gitignore対象）
16. docs/js/api.js（fetch ヘルパー）
17. docs/img/logo.svg（花のアイコン SVG）
18. docs/register.html + docs/js/register.js（会員登録）
19. docs/coupon.html + docs/js/coupon-view.js（クーポン表示＆スワイプ）
20. docs/js/admin.js（管理画面共通：ナビ、認証チェック、ユーティリティ）
21. docs/index.html + docs/js/dashboard.js（ダッシュボード）
22. docs/members.html + docs/js/members.js（会員管理）
23. docs/coupons.html + docs/js/coupons.js（クーポン管理）
24. docs/mail.html + docs/js/mail.js（メルマガ配信）

### Phase 3: 設定ファイル
25. .gitignore（ルート）
26. README.md（セットアップ手順、GASデプロイ、GitHub Pages設定、初期設定）

**全26ファイルを実装し、clasp push + git push で即稼働可能な状態にすること。**
**既存の gas/ 配下以外のファイル（以前の src/ や html/ ）は削除すること。**
**途中で確認・質問はせず、最後まで一気に完成させること。**
