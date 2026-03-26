/**
 * 経費管理システム用スプレッドシート作成API (v2)
 */
function doPost(e) {
  try {
    // POSTデータを取得
    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter && e.parameter.data) {
      // URLデコードしてからJSONパース
      data = JSON.parse(decodeURIComponent(e.parameter.data));
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
 * GETリクエストを処理（データをURLパラメータで受け取る）
 */
function doGet(e) {
  try {
    // URLパラメータからデータを取得
    if (e.parameter && e.parameter.expenses) {
      const expenses = JSON.parse(decodeURIComponent(e.parameter.expenses));
      const year = parseInt(e.parameter.year) || new Date().getFullYear();

      // スプレッドシートを作成
      const spreadsheet = SpreadsheetApp.create(`経費管理_${year}年度確定申告`);
      const spreadsheetUrl = spreadsheet.getUrl();

      const categories = [
        '旅費交通費', '接待交際費', '通信費', '消耗品費',
        '地代家賃', '水道光熱費', 'その他'
      ];

      createSummarySheet(spreadsheet, year, categories);

      for (let month = 1; month <= 12; month++) {
        createMonthSheet(spreadsheet, year, month, expenses, categories);
      }

      const defaultSheet = spreadsheet.getSheetByName('シート1');
      if (defaultSheet) {
        spreadsheet.deleteSheet(defaultSheet);
      }

      const summarySheet = spreadsheet.getSheetByName('サマリー');
      spreadsheet.setActiveSheet(summarySheet);
      spreadsheet.moveActiveSheet(1);

      // リダイレクトHTML
      return HtmlService.createHtmlOutput(`
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
    }

    return ContentService.createTextOutput('経費管理システム用API - 正常に動作しています');

  } catch (error) {
    return HtmlService.createHtmlOutput(`
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
            <p style="font-size: 0.8em; margin-top: 20px;">スタック: ${error.stack}</p>
          </div>
        </body>
      </html>
    `);
  }
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

  sheet.getRange(row, 1, 1, 3).merge();
  sheet.getRange(row, 1).setValue(`${year}年度 確定申告サマリー`);
  sheet.getRange(row, 1).setFontSize(16).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(row, 1).setBackground('#E3F2FD');
  sheet.setRowHeight(row, 40);
  row++;

  row++;

  sheet.getRange(row, 1, 1, 3).merge();
  sheet.getRange(row, 1).setValue('【収入】');
  sheet.getRange(row, 1).setFontSize(14).setFontWeight('bold').setBackground('#E8F4F8');
  row++;

  sheet.getRange(row, 1).setValue('売上合計');
  sheet.getRange(row, 3).setValue(0).setNumberFormat('#,##0').setBackground('#FFFF9E').setFontWeight('bold');
  const salesCellRow = row;
  row++;

  row++;

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

  sheet.getRange(row, 1).setValue('経費合計');
  sheet.getRange(row, 1).setFontSize(12).setFontWeight('bold');
  sheet.getRange(row, 3).setFormula(`=SUM(C${expenseStartRow}:C${expenseStartRow + categories.length - 1})`);
  sheet.getRange(row, 3).setNumberFormat('#,##0').setFontWeight('bold').setBackground('#FFCCCC');
  const totalExpenseRow = row;
  row++;

  row++;

  sheet.getRange(row, 1, 1, 3).merge();
  sheet.getRange(row, 1).setValue('【所得】');
  sheet.getRange(row, 1).setFontSize(14).setFontWeight('bold').setBackground('#E8F5E9');
  row++;

  sheet.getRange(row, 1).setValue('所得金額（売上 - 経費）');
  sheet.getRange(row, 1).setFontSize(12).setFontWeight('bold');
  sheet.getRange(row, 3).setFormula(`=C${salesCellRow}-C${totalExpenseRow}`);
  sheet.getRange(row, 3).setNumberFormat('#,##0').setFontSize(14).setFontWeight('bold').setBackground('#C8E6C9');
  row++;

  sheet.getRange(1, 1, row, 3).setBorder(true, true, true, true, true, true);

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

  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 300);

  let row = 1;

  sheet.getRange(row, 1, 1, 5).merge();
  sheet.getRange(row, 1).setValue(`${year}年${month}月 経費一覧`);
  sheet.getRange(row, 1).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center').setBackground('#E3F2FD');
  sheet.setRowHeight(row, 30);
  row++;

  row++;

  sheet.getRange(row, 1).setValue('カテゴリ別合計（自動計算）');
  row++;

  const categoryStartRow = row;
  categories.forEach((category) => {
    sheet.getRange(row, 1).setValue(category);
    sheet.getRange(row, 3).setFormula(`=SUMIF(D10:D100,"${category}",C10:C100)`);
    sheet.getRange(row, 3).setNumberFormat('#,##0');
    row++;
  });

  row += 2;

  const headerRow = row;
  const headers = ['日付', '店舗名', '金額', 'カテゴリ', 'メモ'];
  headers.forEach((header, i) => {
    sheet.getRange(headerRow, i + 1).setValue(header);
  });
  sheet.getRange(headerRow, 1, 1, 5).setFontWeight('bold').setBackground('#1976D2').setFontColor('#FFFFFF').setHorizontalAlignment('center');
  sheet.setRowHeight(headerRow, 25);
  row++;

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

  const dataStartRow = headerRow + 1;
  for (let i = 0; i < 30; i++) {
    const currentRow = row + i;
    sheet.getRange(currentRow, 3).setNumberFormat('#,##0');

    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(categories, true)
      .build();
    sheet.getRange(currentRow, 4).setDataValidation(rule);
  }

  const lastDataRow = row + 30;
  sheet.getRange(headerRow, 1, lastDataRow - headerRow + 1, 5).setBorder(true, true, true, true, true, true);

  row = lastDataRow + 2;
  sheet.getRange(row, 2).setValue('月合計');
  sheet.getRange(row, 2).setFontWeight('bold').setFontSize(12);
  sheet.getRange(row, 3).setFormula(`=SUM(C${dataStartRow}:C${lastDataRow})`);
  sheet.getRange(row, 3).setNumberFormat('#,##0').setFontWeight('bold').setBackground('#FFF9C4');
  sheet.getRange(row, 1, 1, 5).setBackground('#FFF9C4');
}
