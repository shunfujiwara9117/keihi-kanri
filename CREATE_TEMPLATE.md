# 📋 Googleスプレッドシート テンプレート作成ガイド

このガイドでは、一度だけ実行してテンプレートスプレッドシートを作成します。
作成後は、いつでもコピーして使えます。

## 🚀 手順

### ステップ1: Google Apps Scriptを開く

1. ブラウザで https://script.google.com/ を開く
2. 「新しいプロジェクト」をクリック
3. プロジェクト名を「テンプレート作成」に変更

### ステップ2: 以下のコードをコピー＆貼り付け

```javascript
/**
 * 経費管理テンプレートを作成（1回だけ実行）
 */
function createTemplate() {
  const year = new Date().getFullYear();
  const spreadsheet = SpreadsheetApp.create(`【テンプレート】経費管理_${year}年度確定申告`);

  const categories = [
    '旅費交通費',
    '接待交際費',
    '通信費',
    '消耗品費',
    '地代家賃',
    '水道光熱費',
    'その他'
  ];

  // サマリーシートを作成
  createSummarySheet(spreadsheet, year, categories);

  // 各月のシートを作成（1月〜12月）
  for (let month = 1; month <= 12; month++) {
    createMonthSheet(spreadsheet, year, month, categories);
  }

  // デフォルトのSheet1を削除
  const defaultSheet = spreadsheet.getSheetByName('シート1');
  if (defaultSheet) {
    spreadsheet.deleteSheet(defaultSheet);
  }

  // サマリーシートを最初に移動
  const summarySheet = spreadsheet.getSheetByName('サマリー');
  spreadsheet.setActiveSheet(summarySheet);
  spreadsheet.moveActiveSheet(1);

  // 作成完了
  const url = spreadsheet.getUrl();
  const id = spreadsheet.getId();

  Logger.log('✅ テンプレート作成完了！');
  Logger.log('URL: ' + url);
  Logger.log('ID: ' + id);
  Logger.log('');
  Logger.log('次のステップ：');
  Logger.log('1. このスプレッドシートを開く: ' + url);
  Logger.log('2. 「ファイル」→「共有」→「リンクを知っている全員が閲覧可能」に設定');
  Logger.log('3. このIDを.env.localに設定:');
  Logger.log('   NEXT_PUBLIC_GOOGLE_SHEETS_TEMPLATE_ID=' + id);

  return {
    url: url,
    id: id
  };
}

/**
 * サマリーシートを作成
 */
function createSummarySheet(spreadsheet, year, categories) {
  const sheet = spreadsheet.getSheets()[0];
  sheet.setName('サマリー');

  sheet.setColumnWidth(1, 250);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 150);

  let row = 1;

  // タイトル
  sheet.getRange(row, 1, 1, 3).merge();
  sheet.getRange(row, 1).setValue(`${year}年度 確定申告サマリー`);
  sheet.getRange(row, 1).setFontSize(16).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(row, 1).setBackground('#E3F2FD');
  sheet.setRowHeight(row, 40);
  row++;

  row++;

  // 収入セクション
  sheet.getRange(row, 1, 1, 3).merge();
  sheet.getRange(row, 1).setValue('【収入】');
  sheet.getRange(row, 1).setFontSize(14).setFontWeight('bold').setBackground('#E8F4F8');
  row++;

  sheet.getRange(row, 1).setValue('売上合計');
  sheet.getRange(row, 3).setValue(0).setNumberFormat('#,##0').setBackground('#FFFF9E').setFontWeight('bold');
  const salesCellRow = row;
  row++;

  row++;

  // 経費セクション
  sheet.getRange(row, 1, 1, 3).merge();
  sheet.getRange(row, 1).setValue('【経費】');
  sheet.getRange(row, 1).setFontSize(14).setFontWeight('bold').setBackground('#FCE4EC');
  row++;

  const expenseStartRow = row;
  categories.forEach((category, index) => {
    sheet.getRange(row, 1).setValue(category);

    const formulas = [];
    for (let m = 1; m <= 12; m++) {
      formulas.push(`'${m}月'!C${4 + index}`);
    }
    sheet.getRange(row, 3).setFormula(`=SUM(${formulas.join(',')})`);
    sheet.getRange(row, 3).setNumberFormat('#,##0');
    row++;
  });

  row++;

  // 経費合計
  sheet.getRange(row, 1).setValue('経費合計');
  sheet.getRange(row, 1).setFontSize(12).setFontWeight('bold');
  sheet.getRange(row, 3).setFormula(`=SUM(C${expenseStartRow}:C${expenseStartRow + categories.length - 1})`);
  sheet.getRange(row, 3).setNumberFormat('#,##0').setFontWeight('bold').setBackground('#FFCCCC');
  const totalExpenseRow = row;
  row++;

  row++;

  // 所得セクション
  sheet.getRange(row, 1, 1, 3).merge();
  sheet.getRange(row, 1).setValue('【所得】');
  sheet.getRange(row, 1).setFontSize(14).setFontWeight('bold').setBackground('#E8F5E9');
  row++;

  sheet.getRange(row, 1).setValue('所得金額（売上 - 経費）');
  sheet.getRange(row, 1).setFontSize(12).setFontWeight('bold');
  sheet.getRange(row, 3).setFormula(`=C${salesCellRow}-C${totalExpenseRow}`);
  sheet.getRange(row, 3).setNumberFormat('#,##0').setFontSize(14).setFontWeight('bold').setBackground('#C8E6C9');
  row++;

  // 罫線
  sheet.getRange(1, 1, row, 3).setBorder(true, true, true, true, true, true);

  // 使い方の説明
  row += 2;
  sheet.getRange(row, 1).setValue('使い方：').setFontWeight('bold').setFontColor('#666666');
  row++;
  sheet.getRange(row, 1).setValue('1. 各月のシート（1月〜12月）に経費を入力してください');
  row++;
  sheet.getRange(row, 1).setValue('2. このサマリーシートに自動的に集計されます');
  row++;
  sheet.getRange(row, 1).setValue('3. 売上合計（C4セル）に年間売上を入力してください');
}

/**
 * 各月のシートを作成
 */
function createMonthSheet(spreadsheet, year, month, categories) {
  const sheet = spreadsheet.insertSheet(`${month}月`);

  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 300);

  let row = 1;

  // タイトル
  sheet.getRange(row, 1, 1, 5).merge();
  sheet.getRange(row, 1).setValue(`${year}年${month}月 経費一覧`);
  sheet.getRange(row, 1).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center').setBackground('#E3F2FD');
  sheet.setRowHeight(row, 30);
  row++;

  row++;

  // カテゴリ別合計
  sheet.getRange(row, 1).setValue('カテゴリ別合計（自動計算）');
  row++;

  categories.forEach((category) => {
    sheet.getRange(row, 1).setValue(category);
    sheet.getRange(row, 3).setFormula(`=SUMIF(D10:D100,"${category}",C10:C100)`);
    sheet.getRange(row, 3).setNumberFormat('#,##0');
    row++;
  });

  row += 2;

  // ヘッダー
  const headerRow = row;
  const headers = ['日付', '店舗名', '金額', 'カテゴリ', 'メモ'];
  headers.forEach((header, i) => {
    sheet.getRange(headerRow, i + 1).setValue(header);
  });
  sheet.getRange(headerRow, 1, 1, 5).setFontWeight('bold').setBackground('#1976D2').setFontColor('#FFFFFF').setHorizontalAlignment('center');
  sheet.setRowHeight(headerRow, 25);
  row++;

  // 空行（手入力用）
  const dataStartRow = row;
  for (let i = 0; i < 30; i++) {
    const currentRow = row + i;
    sheet.getRange(currentRow, 3).setNumberFormat('#,##0');

    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(categories, true)
      .build();
    sheet.getRange(currentRow, 4).setDataValidation(rule);
  }

  // 罫線
  const lastDataRow = row + 30;
  sheet.getRange(headerRow, 1, lastDataRow - headerRow + 1, 5).setBorder(true, true, true, true, true, true);

  // 月合計
  row = lastDataRow + 2;
  sheet.getRange(row, 2).setValue('月合計');
  sheet.getRange(row, 2).setFontWeight('bold').setFontSize(12);
  sheet.getRange(row, 3).setFormula(`=SUM(C${dataStartRow}:C${lastDataRow})`);
  sheet.getRange(row, 3).setNumberFormat('#,##0').setFontWeight('bold').setBackground('#FFF9C4');
  sheet.getRange(row, 1, 1, 5).setBackground('#FFF9C4');
}
```

### ステップ3: 実行

1. 画面上部の関数選択で「**createTemplate**」を選択
2. 「実行」ボタン（▶️）をクリック
3. 権限の承認（初回のみ）：
   - 「権限を確認」をクリック
   - アカウントを選択
   - 「詳細」→「移動」→「許可」

### ステップ4: 実行ログを確認

1. 画面下部の「実行ログ」を開く
2. 以下のような情報が表示されます：

```
✅ テンプレート作成完了！
URL: https://docs.google.com/spreadsheets/d/...
ID: 1AbC2DeF3GhI...

次のステップ：
1. このスプレッドシートを開く
2. 「ファイル」→「共有」→「リンクを知っている全員が閲覧可能」に設定
3. このIDを.env.localに設定
```

### ステップ5: スプレッドシートを共有設定

1. 実行ログに表示されたURLをクリック
2. スプレッドシートが開いたら、右上の「共有」をクリック
3. 「リンクを知っている全員が閲覧可能」に変更
4. 「完了」をクリック

### ステップ6: テンプレートIDを設定

実行ログに表示された **ID** をコピーして、`.env.local` に追加：

```bash
NEXT_PUBLIC_GOOGLE_SHEETS_TEMPLATE_ID=ここにIDを貼り付け
```

### 完了！

これで、「テンプレートをコピー」ボタンをクリックするだけで、いつでも新しいスプレッドシートが作成できます。
