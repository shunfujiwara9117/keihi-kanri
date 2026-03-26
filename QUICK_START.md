# クイックスタートガイド

30分で公開できる簡易版手順

---

## 📊 全体の流れ

```
1. Supabase     → データベース作成
2. ローカル      → テスト
3. GitHub       → コードをアップロード
4. Vercel       → 公開
5. 共有         → URLを配布
```

---

## ⚡ 5ステップで完了

### ステップ1: Supabase (10分)

```bash
1. https://supabase.com でプロジェクト作成
2. SQL Editorで DEPLOY_GUIDE.md のSQLを実行
3. Project Settings → API からキーをコピー
```

### ステップ2: 環境変数 (2分)

`.env.local` ファイルを作成：

```bash
NEXT_PUBLIC_SUPABASE_URL=あなたのURL
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのキー
```

### ステップ3: テスト (3分)

```bash
npm run dev
```

http://localhost:3000 でログイン画面が表示されればOK

### ステップ4: GitHub (5分)

```bash
git init
git add .
git commit -m "初回コミット"
git push
```

### ステップ5: Vercel (5分)

```bash
1. https://vercel.com でGitHubと連携
2. keihi-kanriをインポート
3. 環境変数を2つ追加（ステップ2と同じ）
4. Deploy
```

---

## ✅ 完了！

URLを他の人に共有すれば、各自アカウント作成して使えます。

---

## 📖 詳しい手順

[DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) を参照してください。
