# Google Apps Script セットアップガイド

このガイドでは、経費管理システムからGoogleスプレッドシートを自動作成する機能を有効化します。

## 📋 手順

### ステップ1: Google Apps Scriptを開く

1. ブラウザで https://script.google.com/ を開く
2. 「新しいプロジェクト」をクリック

### ステップ2: スクリプトをコピー

以下のコードをコピーして、`コード.gs`に貼り付けてください：

```javascript
/**
 * 経費管理システム用スプレッドシート作成API
 */
function doPost(e) {
  try {
    // POSTデータを取得
    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter && e.parameter.data) {
      data = JSON.parse(e.parameter.data);
    } else {
      throw new Error('データが見つかりません');
    }

    const expenses = data.expenses || [];
    const year = data.year || new Date().getFullYear();

    // 新しいスプレッドシートを作成
    const spreadsheet = SpreadsheetApp.create(`経費管理_${year}年度確定申告`);
    const spreadsheetId = spreadsheet.getId();
    const spreadsheetUrl = spreadsheet.getUrl();

    // カテゴリの定義
    const categories = [
      '旅費交通費',
      '接待交際費',
      '通信費',
      '消耗品費',
      '地代家賃',
      '水道光熱費',
      'その他'
    ];

    // 1. サマリーシートを作成
    createSummarySheet(spreadsheet, year, categories);

    // 2. 各月のシートを作成（1月〜12月）
    for (let month = 1; month <= 12; month++) {
      createMonthSheet(spreadsheet, year, month, expenses, categories);
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

    // 作成されたスプレッドシートにリダイレクトするHTMLを返す
    const html = HtmlService.createHtmlOutput(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>スプレッドシート作成完了</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              text-align: center;
              background: rgba(255, 255, 255, 0.1);
              padding: 40px;
              border-radius: 20px;
              backdrop-filter: blur(10px);
            }
            h1 { font-size: 2em; margin-bottom: 20px; }
            p { font-size: 1.2em; margin: 10px 0; }
            .spinner {
              border: 4px solid rgba(255,255,255,0.3);
              border-radius: 50%;
              border-top: 4px solid white;
              width: 50px;
              height: 50px;
              animation: spin 1s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
          <script>
            setTimeout(function() {
              window.location.href = "${spreadsheetUrl}";
            }, 1500);
          </script>
        </head>
        <body>
          <div class="container">
            <h1>✅ スプレッドシート作成完了！</h1>
            <div class="spinner"></div>
            <p>スプレッドシートを開いています...</p>
            <p style="font-size: 0.9em; margin-top: 20px;">
              自動的に開かない場合は
              <a href="${spreadsheetUrl}" style="color: #FFD700; text-decoration: underline;">ここをクリック</a>
            </p>
          </div>
        </body>
      </html>
    `);

    return html;

  } catch (error) {
    const errorHtml = HtmlService.createHtmlOutput(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>エラー</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              color: white;
            }
            .container {
              text-align: center;
              background: rgba(255, 255, 255, 0.1);
              padding: 40px;
              border-radius: 20px;
              backdrop-filter: blur(10px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ エラーが発生しました</h1>
            <p>${error.message}</p>
          </div>
        </body>
      </html>
    `);
    return errorHtml;
  }
}

/**
 * サマリーシートを作成
 */
function createSummarySheet(spreadsheet, year, categories) {
  const sheet = spreadsheet.getSheets()[0];
  sheet.setName('サマリー');

  // 列幅を設定
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

  row++; // 空行

  // 収入セクション
  sheet.getRange(row, 1, 1, 3).merge();
  sheet.getRange(row, 1).setValue('【収入】');
  sheet.getRange(row, 1).setFontSize(14).setFontWeight('bold').setBackground('#E8F4F8');
  row++;

  sheet.getRange(row, 1).setValue('売上合計');
  sheet.getRange(row, 3).setValue(0).setNumberFormat('#,##0').setBackground('#FFFF9E').setFontWeight('bold');
  const salesCellRow = row;
  row++;

  row++; // 空行

  // 経費セクション
  sheet.getRange(row, 1, 1, 3).merge();
  sheet.getRange(row, 1).setValue('【経費】');
  sheet.getRange(row, 1).setFontSize(14).setFontWeight('bold').setBackground('#FCE4EC');
  row++;

  const expenseStartRow = row;
  categories.forEach((category, index) => {
    sheet.getRange(row, 1).setValue(category);

    // 各月のシートから合計を計算する数式
    const formulas = [];
    for (let m = 1; m <= 12; m++) {
      formulas.push(`'${m}月'!C${4 + index}`);
    }
    sheet.getRange(row, 3).setFormula(`=SUM(${formulas.join(',')})`);
    sheet.getRange(row, 3).setNumberFormat('#,##0');
    row++;
  });

  row++; // 空行

  // 経費合計
  sheet.getRange(row, 1).setValue('経費合計');
  sheet.getRange(row, 1).setFontSize(12).setFontWeight('bold');
  sheet.getRange(row, 3).setFormula(`=SUM(C${expenseStartRow}:C${expenseStartRow + categories.length - 1})`);
  sheet.getRange(row, 3).setNumberFormat('#,##0').setFontWeight('bold').setBackground('#FFCCCC');
  const totalExpenseRow = row;
  row++;

  row++; // 空行

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

  // 罫線を追加
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
function createMonthSheet(spreadsheet, year, month, expenses, categories) {
  const sheet = spreadsheet.insertSheet(`${month}月`);

  // 列幅を設定
  sheet.setColumnWidth(1, 120); // 日付
  sheet.setColumnWidth(2, 200); // 店舗名
  sheet.setColumnWidth(3, 120); // 金額
  sheet.setColumnWidth(4, 150); // カテゴリ
  sheet.setColumnWidth(5, 300); // メモ

  let row = 1;

  // タイトル
  sheet.getRange(row, 1, 1, 5).merge();
  sheet.getRange(row, 1).setValue(`${year}年${month}月 経費一覧`);
  sheet.getRange(row, 1).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center').setBackground('#E3F2FD');
  sheet.setRowHeight(row, 30);
  row++;

  row++; // 空行

  // カテゴリ別合計（サマリーシートで参照される）
  sheet.getRange(row, 1).setValue('カテゴリ別合計（自動計算）');
  row++;

  const categoryStartRow = row;
  categories.forEach((category, index) => {
    sheet.getRange(row, 1).setValue(category);
    sheet.getRange(row, 3).setFormula(`=SUMIF(D10:D100,"${category}",C10:C100)`);
    sheet.getRange(row, 3).setNumberFormat('#,##0');
    row++;
  });

  row += 2; // 空行

  // ヘッダー行
  const headerRow = row;
  const headers = ['日付', '店舗名', '金額', 'カテゴリ', 'メモ'];
  headers.forEach((header, i) => {
    sheet.getRange(headerRow, i + 1).setValue(header);
  });
  sheet.getRange(headerRow, 1, 1, 5).setFontWeight('bold').setBackground('#1976D2').setFontColor('#FFFFFF').setHorizontalAlignment('center');
  sheet.setRowHeight(headerRow, 25);
  row++;

  // 既存のデータを追加（該当月のデータのみ）
  const monthExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate.getFullYear() === year && expDate.getMonth() + 1 === month;
  });

  monthExpenses.forEach(expense => {
    sheet.getRange(row, 1).setValue(new Date(expense.date));
    sheet.getRange(row, 1).setNumberFormat('yyyy/mm/dd');
    sheet.getRange(row, 2).setValue(expense.storeName || '');
    sheet.getRange(row, 3).setValue(expense.amount).setNumberFormat('#,##0');
    sheet.getRange(row, 4).setValue(expense.category);
    sheet.getRange(row, 5).setValue(expense.description || '');
    row++;
  });

  // 空行を追加（手入力用）
  const dataStartRow = headerRow + 1;
  for (let i = 0; i < 30; i++) {
    const currentRow = row + i;
    sheet.getRange(currentRow, 3).setNumberFormat('#,##0');

    // カテゴリ列にドロップダウンを追加
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(categories, true)
      .build();
    sheet.getRange(currentRow, 4).setDataValidation(rule);
  }

  // 罫線を追加
  const lastDataRow = row + 30;
  sheet.getRange(headerRow, 1, lastDataRow - headerRow + 1, 5).setBorder(true, true, true, true, true, true);

  // 月合計行を追加
  row = lastDataRow + 2;
  sheet.getRange(row, 2).setValue('月合計');
  sheet.getRange(row, 2).setFontWeight('bold').setFontSize(12);
  sheet.getRange(row, 3).setFormula(`=SUM(C${dataStartRow}:C${lastDataRow})`);
  sheet.getRange(row, 3).setNumberFormat('#,##0').setFontWeight('bold').setBackground('#FFF9C4');
  sheet.getRange(row, 1, 1, 5).setBackground('#FFF9C4');
}

/**
 * テスト用
 */
function doGet() {
  return ContentService.createTextOutput('経費管理システム用API - 正常に動作しています');
}
```

### ステップ3: デプロイ

1. 画面上部の「デプロイ」→「新しいデプロイ」をクリック
2. 「種類の選択」→「ウェブアプリ」を選択
3. 設定：
   - **説明**: 経費管理システムAPI
   - **次のユーザーとして実行**: 自分
   - **アクセスできるユーザー**: 全員
4. 「デプロイ」をクリック
5. 権限の承認画面が出たら、「アクセスを承認」
6. **ウェブアプリのURL**をコピー（`https://script.google.com/macros/s/...`）

### ステップ4: URLを設定

コピーしたURLを、経費管理アプリの環境変数に設定します：

1. `/Users/fujiwarashun/0204youtube/keihi-kanri/.env.local` ファイルを開く
2. 以下を追加：

```bash
NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL=ここにコピーしたURLを貼り付け
```

3. 保存してブラウザをリロード

---

## ✅ 完了！

これで、「Googleスプレッドシート作成」ボタンをクリックすると、自動的にスプレッドシートが作成され、ブラウザで開かれます！
