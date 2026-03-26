import ExcelJS from 'exceljs';
import { Expense, ExpenseCategory } from '@/types/expense';

/**
 * 2026年度確定申告用のExcelファイルを生成
 */
export async function generateTaxReportExcel(expenses: Expense[], year: number = 2026): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '経費管理システム';
  workbook.created = new Date();

  // カテゴリの定義
  const categories: ExpenseCategory[] = [
    '旅費交通費',
    '接待交際費',
    '通信費',
    '消耗品費',
    '地代家賃',
    '水道光熱費',
    'その他',
  ];

  // 1. サマリーシートを作成
  await createSummarySheet(workbook, year, categories);

  // 2. 各月のシートを作成（1月〜12月）
  for (let month = 1; month <= 12; month++) {
    await createMonthSheet(workbook, year, month, expenses, categories);
  }

  // Excelファイルをblobとして出力
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * サマリーシートを作成
 */
async function createSummarySheet(
  workbook: ExcelJS.Workbook,
  year: number,
  categories: ExpenseCategory[]
) {
  const sheet = workbook.addWorksheet('サマリー', {
    views: [{ showGridLines: false }],
  });

  // 列幅を設定
  sheet.columns = [
    { width: 25 },
    { width: 20 },
    { width: 15 },
  ];

  // タイトル
  const titleRow = sheet.addRow([`${year}年度 確定申告サマリー`]);
  titleRow.font = { size: 16, bold: true };
  titleRow.height = 30;
  sheet.mergeCells('A1:C1');
  titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.addRow([]);

  // 収入セクション
  const incomeHeaderRow = sheet.addRow(['【収入】']);
  incomeHeaderRow.font = { size: 14, bold: true };
  incomeHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8F4F8' },
  };

  sheet.addRow(['売上合計', '', '¥0']);
  sheet.getCell('C4').numFmt = '#,##0';
  sheet.getCell('C4').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFF9E' },
  };
  sheet.getCell('C4').font = { bold: true };

  sheet.addRow([]);

  // 経費セクション
  const expenseHeaderRow = sheet.addRow(['【経費】']);
  expenseHeaderRow.font = { size: 14, bold: true };
  expenseHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFCE4EC' },
  };

  let currentRow = 7;
  categories.forEach((category) => {
    const row = sheet.addRow([category, '', 0]);
    currentRow++;

    // 各月のシートから合計を計算する数式
    const formula = `SUM(${Array.from({ length: 12 }, (_, i) => {
      const monthName = `${i + 1}月`;
      return `'${monthName}'!$C$${categories.indexOf(category) + 4}`;
    }).join(',')})`;

    sheet.getCell(`C${currentRow}`).value = { formula };
    sheet.getCell(`C${currentRow}`).numFmt = '#,##0';
  });

  sheet.addRow([]);
  currentRow++;

  // 経費合計
  const totalExpenseRow = sheet.addRow(['経費合計', '', 0]);
  currentRow++;
  const expenseStartRow = 7;
  const expenseEndRow = expenseStartRow + categories.length - 1;
  sheet.getCell(`C${currentRow}`).value = { formula: `SUM(C${expenseStartRow}:C${expenseEndRow})` };
  sheet.getCell(`C${currentRow}`).numFmt = '#,##0';
  sheet.getCell(`C${currentRow}`).font = { bold: true, size: 12 };
  sheet.getCell(`C${currentRow}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFCCCC' },
  };
  totalExpenseRow.font = { bold: true, size: 12 };

  sheet.addRow([]);
  currentRow++;

  // 所得セクション
  const incomeCalcHeaderRow = sheet.addRow(['【所得】']);
  currentRow++;
  incomeCalcHeaderRow.font = { size: 14, bold: true };
  incomeCalcHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8F5E9' },
  };

  const profitRow = sheet.addRow(['所得金額（売上 - 経費）', '', 0]);
  currentRow++;
  const totalExpenseRowNum = expenseStartRow + categories.length + 1;
  sheet.getCell(`C${currentRow}`).value = { formula: `C4-C${totalExpenseRowNum}` };
  sheet.getCell(`C${currentRow}`).numFmt = '#,##0';
  sheet.getCell(`C${currentRow}`).font = { bold: true, size: 14 };
  sheet.getCell(`C${currentRow}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC8E6C9' },
  };
  profitRow.font = { bold: true, size: 12 };

  // 罫線を追加
  for (let i = 1; i <= currentRow; i++) {
    ['A', 'B', 'C'].forEach((col) => {
      const cell = sheet.getCell(`${col}${i}`);
      if (i >= 3) {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    });
  }

  // 使い方の説明を追加
  sheet.addRow([]);
  sheet.addRow([]);
  const instructionRow = sheet.addRow(['使い方：']);
  instructionRow.font = { bold: true, color: { argb: 'FF666666' } };
  sheet.addRow(['1. 各月のシート（1月〜12月）に経費を入力してください']);
  sheet.addRow(['2. このサマリーシートに自動的に集計されます']);
  sheet.addRow(['3. 売上合計（C4セル）に年間売上を入力してください']);
}

/**
 * 各月のシートを作成
 */
async function createMonthSheet(
  workbook: ExcelJS.Workbook,
  year: number,
  month: number,
  expenses: Expense[],
  categories: ExpenseCategory[]
) {
  const sheet = workbook.addWorksheet(`${month}月`);

  // 列幅を設定
  sheet.columns = [
    { width: 12 }, // 日付
    { width: 20 }, // 店舗名
    { width: 15 }, // 金額
    { width: 20 }, // カテゴリ
    { width: 30 }, // メモ
  ];

  // タイトル
  const titleRow = sheet.addRow([`${year}年${month}月 経費一覧`]);
  titleRow.font = { size: 14, bold: true };
  titleRow.height = 25;
  sheet.mergeCells('A1:E1');
  titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
  titleRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE3F2FD' },
  };

  sheet.addRow([]);

  // カテゴリ別合計（サマリーシートで参照される）
  sheet.addRow(['カテゴリ別合計（自動計算）']);
  categories.forEach((category, index) => {
    const row = sheet.addRow([category, '', 0]);
    const rowNum = 4 + index;

    // この月のカテゴリ別合計を計算（データ行から集計）
    sheet.getCell(`C${rowNum}`).value = {
      formula: `SUMIF($D$10:$D$100,"${category}",$C$10:$C$100)`,
    };
    sheet.getCell(`C${rowNum}`).numFmt = '#,##0';
  });

  sheet.addRow([]);
  sheet.addRow([]);

  // ヘッダー行
  const headerRow = sheet.addRow(['日付', '店舗名', '金額', 'カテゴリ', 'メモ']);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1976D2' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 20;

  // 既存のデータを追加（該当月のデータのみ）
  const monthExpenses = expenses.filter((exp) => {
    const expDate = new Date(exp.date);
    return expDate.getFullYear() === year && expDate.getMonth() + 1 === month;
  });

  monthExpenses.forEach((expense) => {
    sheet.addRow([
      new Date(expense.date).toLocaleDateString('ja-JP'),
      expense.storeName || '',
      expense.amount,
      expense.category,
      expense.description || '',
    ]);
  });

  // 空行を追加（手入力用）
  for (let i = 0; i < 20; i++) {
    const row = sheet.addRow(['', '', '', '', '']);
    // カテゴリ列にドロップダウンを追加
    const categoryCell = row.getCell(4);
    categoryCell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${categories.join(',')}"`],
    };
  }

  // 罫線を追加
  const lastRow = sheet.rowCount;
  for (let i = 9; i <= lastRow; i++) {
    ['A', 'B', 'C', 'D', 'E'].forEach((col) => {
      const cell = sheet.getCell(`${col}${i}`);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  }

  // 金額列の書式設定
  for (let i = 10; i <= lastRow; i++) {
    sheet.getCell(`C${i}`).numFmt = '#,##0';
  }

  // 月合計行を追加
  sheet.addRow([]);
  const totalRow = sheet.addRow(['', '月合計', 0, '', '']);
  totalRow.font = { bold: true, size: 12 };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFF9C4' },
  };
  const totalRowNum = sheet.rowCount;
  sheet.getCell(`C${totalRowNum}`).value = { formula: `SUM(C10:C${totalRowNum - 1})` };
  sheet.getCell(`C${totalRowNum}`).numFmt = '#,##0';
}

/**
 * 経費データをExcelファイルとしてダウンロード
 */
export async function downloadTaxReportExcel(expenses: Expense[], year: number = 2026) {
  const blob = await generateTaxReportExcel(expenses, year);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `経費管理_${year}年度確定申告.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
