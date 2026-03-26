# 配布用デプロイ完全ガイド

このガイドに従えば、他の人が使えるWebアプリを公開できます。

所要時間: 約30分

---

## 📋 準備するもの

- [ ] GitHubアカウント（無料）
- [ ] Vercelアカウント（無料）
- [ ] メールアドレス

---

## ステップ1: Supabaseプロジェクトを作成（10分）

### 1-1. Supabaseにアクセス

1. ブラウザで https://supabase.com を開く
2. 右上の「Start your project」ボタンをクリック

### 1-2. アカウント作成

1. 「Sign in with GitHub」をクリック
2. GitHubアカウントでログイン
   - GitHubアカウントがない場合は先に作成（https://github.com）
3. Supabaseに権限を与える

### 1-3. プロジェクト作成

1. ログイン後、「New project」ボタンをクリック
2. 以下を入力：

```
Organization: あなたの名前（自動で作成されます）
Name: keihi-kanri（プロジェクト名）
Database Password: 強力なパスワード（例: KeiHi2024!SecurePass）
   ⚠️ このパスワードはメモしておく！
Region: Northeast Asia (Tokyo)
Pricing Plan: Free（無料プラン）
```

3. 「Create new project」ボタンをクリック
4. ⏰ プロジェクト作成に2-3分かかります。待ちましょう。

---

## ステップ2: データベーステーブルを作成（5分）

プロジェクトが作成できたら...

### 2-1. SQL Editorを開く

1. 左メニューから「SQL Editor」（📝アイコン）をクリック
2. 「New query」ボタンをクリック

### 2-2. SQLを実行

1. 以下のSQL全体をコピー
2. SQL Editorにペースト
3. 右上の「Run」ボタンをクリック

```sql
-- 経費テーブルを作成
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  store_name TEXT,
  image_url TEXT,
  ocr_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザーは自分のデータのみアクセス可能
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の経費のみ参照可能
CREATE POLICY "Users can view their own expenses"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーは自分の経費のみ追加可能
CREATE POLICY "Users can insert their own expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分の経費のみ更新可能
CREATE POLICY "Users can update their own expenses"
  ON expenses FOR UPDATE
  USING (auth.uid() = user_id);

-- ユーザーは自分の経費のみ削除可能
CREATE POLICY "Users can delete their own expenses"
  ON expenses FOR DELETE
  USING (auth.uid() = user_id);

-- インデックスを作成（パフォーマンス向上）
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);
```

4. ✅ 「Success. No rows returned」と表示されればOK

### 2-3. テーブルが作成されたか確認

1. 左メニューから「Table Editor」をクリック
2. `expenses` テーブルが表示されていればOK

---

## ステップ3: API キーを取得（3分）

### 3-1. Project Settingsを開く

1. 左下の「⚙️ Project Settings」をクリック
2. 左メニューから「API」をクリック

### 3-2. 必要な情報をコピー

以下の2つをメモ帳にコピー：

```
1. Project URL
   例: https://abcdefghijk.supabase.co

2. anon public (公開キー)
   例: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（長い文字列）
```

⚠️ **重要**: この2つは後で使うので、メモ帳に保存しておく

---

## ステップ4: 環境変数を設定（2分）

### 4-1. .env.localファイルを作成

1. VSCodeで `/Users/fujiwarashun/0204youtube/keihi-kanri` を開く
2. プロジェクトルートに新しいファイルを作成
3. ファイル名: `.env.local`
4. 以下を記載（ステップ3でコピーした値を使用）：

```bash
NEXT_PUBLIC_SUPABASE_URL=ここにProject URLをペースト
NEXT_PUBLIC_SUPABASE_ANON_KEY=ここにanon publicをペースト
```

**例:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODAwMDAwMDAsImV4cCI6MTk5NTU3NjAwMH0.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

5. ファイルを保存（⌘+S または Ctrl+S）

---

## ステップ5: ローカルでテスト（5分）

### 5-1. 開発サーバーを再起動

ターミナルで：

```bash
# 既存のサーバーを停止（Ctrl+C）
# 再起動
npm run dev
```

### 5-2. ブラウザで確認

1. http://localhost:3000 を開く
2. **ログイン画面が表示されるはずです** ← これが重要！
   - ローカルモードではなく、クラウドモードになっている証拠

### 5-3. テストアカウントで確認

1. 「アカウントをお持ちでない方はこちら」をクリック
2. テスト用のメール・パスワードを入力
   ```
   メール: test@example.com
   パスワード: Test1234!
   ```
3. 「アカウント作成」をクリック
4. 「確認メールを送信しました」と表示される

### 5-4. メール確認をスキップ（開発用）

今回はテストなので、メール確認をスキップします：

1. Supabaseに戻る
2. 左メニューから「Authentication」をクリック
3. 上部の「Email Templates」タブをクリック
4. 「Confirm signup」の右の「・・・」をクリック
5. 「Edit」をクリック
6. 下にスクロールして「Enable email confirmations」をOFFにする
7. 「Save」をクリック

もう一度ログインを試してください。今度は確認なしでログインできるはずです。

---

## ステップ6: GitHubにプッシュ（5分）

### 6-1. Gitリポジトリを初期化

ターミナルで（keihi-kanriディレクトリで実行）：

```bash
cd /Users/fujiwarashun/0204youtube/keihi-kanri
git init
git add .
git commit -m "初回コミット: 経費管理アプリ"
```

### 6-2. GitHubにリポジトリを作成

1. https://github.com を開く
2. 右上の「+」→「New repository」をクリック
3. 以下を入力：
   ```
   Repository name: keihi-kanri
   Description: 確定申告用経費管理アプリ
   Public/Private: お好みで（Publicがおすすめ）
   ```
4. 「Create repository」をクリック

### 6-3. ローカルからプッシュ

GitHubに表示されているコマンドをコピーして実行：

```bash
git remote add origin https://github.com/あなたのユーザー名/keihi-kanri.git
git branch -M main
git push -u origin main
```

✅ GitHubのページを更新して、ファイルがアップロードされていればOK

---

## ステップ7: Vercelにデプロイ（5分）

### 7-1. Vercelにログイン

1. https://vercel.com を開く
2. 「Sign Up」をクリック
3. 「Continue with GitHub」を選択
4. GitHubアカウントでログイン

### 7-2. プロジェクトをインポート

1. ダッシュボードで「Add New...」→「Project」をクリック
2. 「Import Git Repository」から `keihi-kanri` を探す
3. 「Import」をクリック

### 7-3. 環境変数を設定

⚠️ **最重要ステップ**

1. 「Environment Variables」セクションを展開
2. 以下を追加：

**1つ目:**
```
Key: NEXT_PUBLIC_SUPABASE_URL
Value: （ステップ3でコピーしたProject URL）
```

**2つ目:**
```
Key: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: （ステップ3でコピーしたanon public）
```

3. 「Deploy」ボタンをクリック

### 7-4. デプロイ完了を待つ

⏰ 2-3分待つと、デプロイが完了します。

「Congratulations!」と表示されたら成功です！

---

## ステップ8: 動作確認（3分）

### 8-1. アプリにアクセス

1. Vercelの画面で「Visit」ボタンをクリック
2. または、表示されているURL（例: https://keihi-kanri.vercel.app）を開く

### 8-2. 確認事項

- [ ] ログイン画面が表示される
- [ ] アカウント作成できる
- [ ] ログインできる
- [ ] レシートをアップロードできる
- [ ] 経費が保存される

✅ すべてOKなら、デプロイ成功です！

---

## ステップ9: URLを共有（1分）

### 9-1. URLを取得

Vercelのダッシュボードから、デプロイされたURLをコピー：

```
例: https://keihi-kanri-abc123.vercel.app
```

### 9-2. 共有方法

このURLを他の人に送るだけ！

各ユーザーは：
1. URLにアクセス
2. アカウント作成（メール・パスワード）
3. 自分専用の経費管理ができる

---

## 🎉 完了！

お疲れさまでした！これで他の人が使える経費管理アプリが完成しました。

---

## ⚠️ よくあるエラーと解決方法

### エラー1: 「環境変数が設定されていません」

**原因**: Vercelで環境変数を設定していない

**解決方法**:
1. Vercelダッシュボード → プロジェクト → Settings → Environment Variables
2. 2つの環境変数を追加
3. Deployments → 最新のデプロイ → ⋮ → Redeploy

### エラー2: 「ログインできない」

**原因**: メール確認が有効になっている

**解決方法**:
1. Supabase → Authentication → Email Templates
2. 「Enable email confirmations」をOFF

### エラー3: 「データが保存されない」

**原因**: テーブルが作成されていない、またはRLSポリシーの問題

**解決方法**:
1. Supabase → Table Editor で `expenses` テーブルを確認
2. ステップ2のSQLを再実行

---

## 📞 サポート

問題が解決しない場合は、以下を確認：

1. ブラウザのコンソール（F12）でエラーを確認
2. Vercelのログを確認
3. Supabaseのログを確認

---

## 💰 費用について

- **Vercel**: 無料（ホビープラン）
- **Supabase**: 無料（月500MBまで）
- **合計**: 完全無料

通常の使用範囲なら、ずっと無料で使えます。
