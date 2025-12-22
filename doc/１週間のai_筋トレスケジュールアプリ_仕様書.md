# 筋トレAIアプリ（DBなしMVP）仕様書

**アプリ名**: KAIZEN（カイゼン）

本仕様書は、**バックエンドDBを使わずに動作する「1週間筋トレメニュー生成アプリ」**の実装仕様書である。

---

## 0. 基本方針（最重要）

- バックエンドDBは **使用しない**
- ログイン・ユーザーアカウントは **不要**
- データは **端末ローカルのみ保存**（AsyncStorage）
- AIは **Cloudflare Worker経由で呼び出す**（直接APIコールしない）
- AI呼び出しは **週1回 or 再生成時のみ**

---

## 1. 技術スタック

| レイヤー | 技術 |
|---------|------|
| フレームワーク | React Native + Expo |
| ローカル保存 | **SQLite**（expo-sqlite） |
| AI連携 | Cloudflare Worker → Gemini / OpenAI / Anthropic |
| バックエンドサーバー | **なし** |
| 状態管理 | React hooks (useState, useEffect) |

---

## 2. 画面構成

### 2.1 タブ構成

| タブ | ファイル | 説明 |
|------|---------|------|
| Today | `app/(tabs)/index.tsx` | 今日のトレーニング画面 |
| Weekly | `app/(tabs)/weekly.tsx` | 週間プラン一覧 |
| History | `app/(tabs)/history.tsx` | 履歴・達成状況 |

### 2.2 その他の画面

| 画面 | ファイル | 説明 |
|------|---------|------|
| オンボーディング | `app/onboarding.tsx` | 初期プロフィール入力 |
| 週間プラン詳細 | `app/weekly-plan.tsx` | プラン詳細（未使用） |
| モーダル | `app/modal.tsx` | 汎用モーダル |

---

## 3. 画面詳細

### 3.1 オンボーディング画面（初回起動時）

**目的**: ユーザーのプロフィールを収集してパーソナライズ

**入力項目**:
- 性別（男性 / 女性 / その他）
- 年齢
- 身長・体重
- 目標（筋肥大 / 体力向上 / 体型維持）
- 環境（自宅・自重 / ジム・マシンあり）
- 1回のトレーニング時間（20分 / 40分 / 60分）

**保存先**: `AsyncStorage` → `user_profile`

---

### 3.2 Today画面（今日のトレーニング）

**目的**: 今日やるべきトレーニングを表示・実行

**表示内容**:
- 今日の部位（例: 「プル系」「脚・体幹」）
- トレーニング時間目安
- 種目リスト（チェック可能）
  - 種目名 + 日本語説明
  - セット数 × レップ数
  - 休憩時間
  - ⓘ アイコン → やり方詳細を展開

**機能**:
- 種目をタップで完了/未完了トグル
- 全種目完了で「今日は完了」ボタンが有効化
- 完了すると履歴に記録

**休息日の場合**: 休息日メッセージを表示

---

### 3.3 Weekly画面（週間プラン）

**目的**: 1週間のトレーニング計画を俯瞰

**表示内容**:
- 7日間のプラン一覧
- 各日の部位・時間・難易度
- 休息日の表示
- 再生成ボタン

**AI連携ポイント**:
- 「プランを再生成」ボタン押下時にAIを呼び出し
- プロフィール情報を元にパーソナライズされたプランを生成

---

### 3.4 History画面（履歴・達成状況）

**目的**: モチベーション維持のための可視化

**表示内容**:
- 連続達成日数（ストリーク）
- 過去7日間の達成状況（カレンダー形式）
- 完了日数 / 未完了日数
- 継続のコツ（ヒント）

---

## 4. データ構造（SQLite）

### 4.1 データベースファイル

```
makanai.db
```

### 4.2 テーブル定義

#### user_profile（ユーザープロフィール）

```sql
CREATE TABLE IF NOT EXISTS user_profile (
  id INTEGER PRIMARY KEY DEFAULT 1,
  gender TEXT NOT NULL,
  age INTEGER NOT NULL,
  height REAL NOT NULL,
  weight REAL NOT NULL,
  goal TEXT NOT NULL,
  environment TEXT NOT NULL,
  session_minutes INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### weekly_plan（週間プラン）

```sql
CREATE TABLE IF NOT EXISTS weekly_plan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  day_of_week TEXT NOT NULL,
  body_part TEXT NOT NULL,
  total_minutes INTEGER NOT NULL,
  is_rest_day INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### daily_log（日次ログ）

```sql
CREATE TABLE IF NOT EXISTS daily_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  completed INTEGER NOT NULL DEFAULT 0,
  feedback TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### app_settings（アプリ設定）

```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### 4.3 TypeScript型定義

```typescript
type UserProfile = {
  id: number;
  gender: string;
  age: number;
  height: number;
  weight: number;
  goal: string;           // '筋肥大' | '体力向上' | '体型維持'
  environment: string;    // '自宅（自重）' | 'ジム（マシンあり）'
  sessionMinutes: number; // 20 | 40 | 60
};

type DayPlan = {
  id: number;
  date: string;           // '2024-12-20' (ISO形式)
  dayOfWeek: string;      // '月', '火', ...
  bodyPart: string;       // 'プル系', '脚・体幹', '休息日'
  totalMinutes: number;
  isRestDay: boolean;
};

type DailyLog = {
  id: number;
  date: string;           // '2024-12-20' (ISO形式)
  completed: boolean;
  feedback?: string;      // 'hard' | 'normal' | 'easy'
};
```

### 4.4 データアクセス層

```typescript
// lib/database.ts

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('makanai.db');

// 初期化
export async function initDatabase(): Promise<void>;

// ユーザープロフィール
export async function getProfile(): Promise<UserProfile | null>;
export async function saveProfile(profile: UserProfile): Promise<void>;

// 週間プラン
export async function getWeeklyPlan(): Promise<DayPlan[]>;
export async function saveWeeklyPlan(plans: DayPlan[]): Promise<void>;

// 日次ログ
export async function getDailyLogs(days: number): Promise<DailyLog[]>;
export async function saveDailyLog(log: DailyLog): Promise<void>;

// 設定
export async function getSetting(key: string): Promise<string | null>;
export async function setSetting(key: string, value: string): Promise<void>;
```

---

## 5. AI連携

### 5.1 アーキテクチャ

```
[Mobile App] → [Cloudflare Worker] → [AI Provider (Gemini/OpenAI/Anthropic)]
```

### 5.2 ファイル構成

| ファイル | 説明 |
|---------|------|
| `lib/ai.ts` | AI呼び出しユーティリティ |
| `worker/src/index.ts` | Cloudflare Worker（プロキシ） |

### 5.3 AI呼び出しタイミング

| タイミング | 処理 |
|-----------|------|
| 週間プラン再生成時 | プロフィールを元にAIがプランを生成 |
| （将来）トレーニング調整時 | 体調に応じて種目を調整 |

### 5.4 使用例

```typescript
import { askAI } from '@/lib/ai';

const plan = await askAI(
  '以下のプロフィールに基づいて1週間のトレーニングプランをJSON形式で生成してください。\n' +
  JSON.stringify(profile),
  'あなたはパーソナルトレーナーです。',
  { provider: 'gemini' }
);
```

### 5.5 対応AIプロバイダー

| Provider | Models | 特徴 |
|----------|--------|------|
| gemini（デフォルト） | gemini-1.5-flash, gemini-1.5-pro | 無料枠あり |
| openai | gpt-4o-mini, gpt-4o | 高品質 |
| anthropic | claude-3-haiku, claude-3-sonnet | 長文対応 |

---

## 6. 種目データベース

### 6.1 対応部位

**自宅（自重）**:
- プッシュ系（胸・肩・三頭）
- プル系（背中・二頭）
- 脚・体幹
- 全身HIIT
- コア強化

**ジム（マシンあり）**:
- 胸・三頭筋
- 背中・二頭筋
- 脚・臀部
- 肩・腹筋

### 6.2 種目の説明

各種目には初心者向けの説明を用意:

```typescript
{
  shortDesc: '背中を引く',           // カード上に常時表示
  howTo: 'テーブルの下に...',       // 展開時に表示
  tips: '体はまっすぐキープ'         // ポイント
}
```

---

## 7. 環境変数

```env
# .env（プロジェクトルート）
EXPO_PUBLIC_AI_PROXY_URL=https://makanai-flow-ai-proxy.xxx.workers.dev
```

---

## 8. デプロイ

### 8.1 Cloudflare Worker

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npm run deploy
```

### 8.2 モバイルアプリ

```bash
# 開発
npx expo start

# ビルド（EAS）
eas build --platform ios
eas build --platform android
```

---

## 9. 今後の拡張予定

- [ ] AI生成プランの実装（現在は固定ロジック）
- [ ] 体調に応じた種目調整
- [ ] トレーニング履歴のグラフ表示
- [ ] プッシュ通知によるリマインダー
- [ ] ソーシャル機能（任意）

---

## 10. 変更履歴

| 日付 | 内容 |
|------|------|
| 2024-12-20 | 初版作成 |
| 2024-12-20 | AI連携セクション追加（Cloudflare Worker） |
| 2024-12-20 | 種目説明機能追加（初心者向け） |
