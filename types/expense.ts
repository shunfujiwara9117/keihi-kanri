// 経費カテゴリの型定義
export type ExpenseCategory =
  | '給料賃金'
  | '外注工賃'
  | '減価償却費'
  | '貸倒金'
  | '地代家賃'
  | '利子割引料'
  | '租税公課'
  | '荷造運賃'
  | '水道光熱費'
  | '旅費交通費'
  | '通信費'
  | '広告宣伝費'
  | '接待交際費'
  | '損害保険料'
  | '修繕費'
  | '消耗品費'
  | '福利厚生費'
  | '研修費'
  | '雑費'
  | 'その他';

// カテゴリの表示名と説明
export interface CategoryInfo {
  name: ExpenseCategory;
  description: string;
  keywords: string[]; // 自動分類用のキーワード
}

// 経費レコードの型定義
export interface ExpenseRecord {
  id: string;
  date: Date;
  category: ExpenseCategory;
  amount: number;
  description: string;
  storeName?: string;
  imageUrl?: string;
  ocrText?: string;
  createdAt: Date;
  updatedAt: Date;
}

// OCR処理結果の型定義
export interface OcrResult {
  text: string;
  confidence: number;
  storeName?: string;
  amount?: number;
  date?: Date;
}

// 集計結果の型定義
export interface ExpenseSummary {
  category: ExpenseCategory;
  totalAmount: number;
  count: number;
  percentage: number;
}

// 月次レポートの型定義
export interface MonthlyReport {
  year: number;
  month: number;
  totalAmount: number;
  categoryBreakdown: ExpenseSummary[];
  recordCount: number;
}

// ExpenseRecord の別名。lib/excel-export・google-sheets-export・ExcelExporter が
// `Expense` 名で参照しており、名称不一致で本番ビルドが失敗していたため追加(2026-07-06)。
export type Expense = ExpenseRecord;
