import { ExpenseRecord, ExpenseSummary, MonthlyReport, ExpenseCategory } from '@/types/expense';
import { EXPENSE_CATEGORIES } from './categories';

/**
 * 経費レコードをカテゴリ別に集計
 */
export const summarizeByCategory = (expenses: ExpenseRecord[]): ExpenseSummary[] => {
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  // カテゴリごとの集計
  const categoryMap = new Map<ExpenseCategory, { total: number; count: number }>();

  for (const expense of expenses) {
    const current = categoryMap.get(expense.category) || { total: 0, count: 0 };
    categoryMap.set(expense.category, {
      total: current.total + expense.amount,
      count: current.count + 1,
    });
  }

  // 集計結果を配列に変換
  const summaries: ExpenseSummary[] = [];

  for (const category of EXPENSE_CATEGORIES) {
    const data = categoryMap.get(category.name);
    if (data && data.total > 0) {
      summaries.push({
        category: category.name,
        totalAmount: data.total,
        count: data.count,
        percentage: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0,
      });
    }
  }

  // 金額の降順でソート
  summaries.sort((a, b) => b.totalAmount - a.totalAmount);

  return summaries;
};

/**
 * 月次レポートを生成
 */
export const generateMonthlyReport = (
  expenses: ExpenseRecord[],
  year: number,
  month: number
): MonthlyReport => {
  const categoryBreakdown = summarizeByCategory(expenses);
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return {
    year,
    month,
    totalAmount,
    categoryBreakdown,
    recordCount: expenses.length,
  };
};

/**
 * 経費データをCSV形式でエクスポート
 */
export const exportToCSV = (expenses: ExpenseRecord[]): string => {
  const headers = ['日付', 'カテゴリ', '金額', '摘要', '店舗名'];
  const rows = expenses.map((expense) => [
    expense.date.toLocaleDateString('ja-JP'),
    expense.category,
    expense.amount.toString(),
    expense.description,
    expense.storeName || '',
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
};

/**
 * CSVデータをダウンロード
 */
export const downloadCSV = (csvContent: string, filename: string = '経費データ.csv'): void => {
  const bom = '\uFEFF'; // UTF-8 BOM
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * 確定申告用のサマリーを生成
 */
export const generateTaxReport = (expenses: ExpenseRecord[], year: number): string => {
  const yearExpenses = expenses.filter((expense) => expense.date.getFullYear() === year);
  const summaries = summarizeByCategory(yearExpenses);

  let report = `=== ${year}年 確定申告用 経費サマリー ===\n\n`;

  for (const summary of summaries) {
    report += `${summary.category}: ${summary.totalAmount.toLocaleString()}円 (${summary.count}件)\n`;
  }

  const total = summaries.reduce((sum, s) => sum + s.totalAmount, 0);
  report += `\n合計: ${total.toLocaleString()}円\n`;

  return report;
};

/**
 * 月別の推移データを生成
 */
export const generateMonthlyTrend = (expenses: ExpenseRecord[], year: number) => {
  const monthlyData: { month: number; amount: number }[] = [];

  for (let month = 1; month <= 12; month++) {
    const monthExpenses = expenses.filter(
      (expense) =>
        expense.date.getFullYear() === year && expense.date.getMonth() + 1 === month
    );

    const amount = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    monthlyData.push({ month, amount });
  }

  return monthlyData;
};
