import { Expense } from '@/types/expense';

/**
 * Google Apps ScriptのWebアプリURLを取得
 */
function getGoogleAppsScriptUrl(): string | null {
  return process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL || null;
}

/**
 * Googleスプレッドシートを作成して開く
 */
export async function createAndOpenGoogleSheet(
  expenses: Expense[],
  year: number = new Date().getFullYear()
): Promise<{ success: boolean; url?: string; error?: string }> {
  const scriptUrl = getGoogleAppsScriptUrl();

  if (!scriptUrl) {
    throw new Error(
      'Google Apps Script URLが設定されていません。\n.env.localファイルに NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL を設定してください。'
    );
  }

  try {
    // 経費データをシリアライズ可能な形式に変換
    const serializedExpenses = expenses.map((exp) => ({
      id: exp.id,
      amount: exp.amount,
      date: exp.date.toISOString(),
      category: exp.category,
      storeName: exp.storeName || '',
      description: exp.description || '',
      imageUrl: exp.imageUrl || '',
    }));

    // Google Apps ScriptのWebアプリにPOSTリクエストを送信
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expenses: serializedExpenses,
        year,
      }),
      mode: 'no-cors', // Google Apps Scriptは通常のCORSをサポートしていないため
    });

    // no-corsモードでは、レスポンスの内容を読み取れないため、
    // リダイレクト方式を使用
    // 代わりに、Google Apps Scriptでリダイレクトを返すようにする

    // 一旦、成功と仮定（実際にはGoogle Apps Scriptの改善が必要）
    return {
      success: true,
      url: undefined, // no-corsモードではURLを取得できない
    };
  } catch (error) {
    console.error('Google Sheets作成エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

/**
 * より簡単な方法：テンプレートをコピーするリンクを開く
 */
export function openGoogleSheetsTemplate() {
  // あらかじめ作成したテンプレートのID
  const templateId = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_TEMPLATE_ID;

  if (!templateId) {
    alert(
      'テンプレートIDが設定されていません。\nまず、Google Apps Scriptをセットアップしてください。'
    );
    return;
  }

  // テンプレートをコピーするリンクを開く
  const copyUrl = `https://docs.google.com/spreadsheets/d/${templateId}/copy`;
  window.open(copyUrl, '_blank');
}

/**
 * Google Sheets APIを使ってスプレッドシートを作成（将来の実装）
 */
export async function createGoogleSheetWithAPI(
  expenses: Expense[],
  year: number = new Date().getFullYear()
): Promise<string> {
  // TODO: Google Sheets API v4を使った実装
  // OAuth認証が必要
  throw new Error('Google Sheets API実装は未完成です');
}
