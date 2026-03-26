# Supabase セットアップガイド

他の人に配布する場合、Supabaseを設定することで各ユーザーが独立したアカウントを持つことができます。

## 1. Supabaseプロジェクトを作成

1. [https://supabase.com](https://supabase.com) にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでサインイン
4. 「New project」をクリック
5. プロジェクト名、データベースパスワードを設定
6. リージョンは「Tokyo (ap-northeast-1)」を選択
7. 「Create new project」をクリック

## 2. データベーステーブルを作成

プロジェクトが作成されたら、以下のSQLを実行してテーブルを作成します。

1. 左メニューの「SQL Editor」をクリック
2. 「New query」をクリック
3. 以下のSQLをコピー&ペースト

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

4. 「Run」をクリック

## 3. API キーを取得

1. 左メニューの「Project Settings」（歯車アイコン）をクリック
2. 「API」をクリック
3. 以下の値をコピー：
   - Project URL
   - anon public (公開キー)

## 4. 環境変数を設定

プロジェクトルートに `.env.local` ファイルを作成し、以下を記載：

```bash
NEXT_PUBLIC_SUPABASE_URL=あなたのProject URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのanon public キー
```

**重要**: `.env.local` はGitにコミットしないでください（`.gitignore` に含まれています）

## 5. メール認証を設定（オプション）

デフォルトでは、ユーザー登録時に確認メールが送信されます。

開発中にメール確認をスキップしたい場合：

1. 左メニューの「Authentication」をクリック
2. 「Providers」タブをクリック
3. 「Email」をクリック
4. 「Confirm email」をOFFにする

## 6. アプリを起動

```bash
npm run dev
```

http://localhost:3000 にアクセスすると、ログイン/サインアップ画面が表示されます。

## 7. Vercelにデプロイ

1. プロジェクトをGitHubにプッシュ
2. [Vercel](https://vercel.com) にアクセス
3. 「New Project」をクリック
4. GitHubリポジトリを選択
5. 環境変数を設定：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. 「Deploy」をクリック

## トラブルシューティング

### ログインできない

- Supabaseの「Authentication」→「Users」でユーザーが作成されているか確認
- メール確認が必要な場合は、メールを確認

### データが表示されない

- ブラウザのコンソールでエラーを確認
- Supabaseの「Table Editor」で`expenses`テーブルにデータが入っているか確認
- Row Level Security (RLS) が正しく設定されているか確認

### 環境変数が反映されない

- `.env.local` ファイル名が正しいか確認
- Next.jsを再起動（`Ctrl+C` → `npm run dev`）

## ローカルモード（認証なし）

環境変数を設定しない場合は、自動的にIndexedDB（ローカルストレージ）を使用します。
この場合、認証なしで使用できますが、データはブラウザに保存されます。
