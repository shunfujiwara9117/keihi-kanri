import { Expense } from '@/types/expense';

/**
 * Google Apps ScriptのWebアプリURLを取得
 */
function getGoogleAppsScriptUrl(): string | null {
  return process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL || null;
}

/**
 * Googleスプレッドシートを自動作成する(hidden form POST方式)。
 *
 * 仕組み: 新規タブをtargetにしたフォームPOSTでGAS(API-script-v2.gs doPost)へ送信し、
 * GASがシート作成後にリダイレクトHTMLを返す → ユーザーは新タブで実際の結果
 * (完成したシート or エラーページ)を見る。
 *
 * この方式を使う理由:
 * - 旧GET方式(URLパラメータにJSON)は経費が数百件になるとURL長上限を超えて壊れる
 * - fetch+no-cors方式はレスポンスを読めず「成功と仮定」するしかない(成功偽装になる)
 * - フォームPOSTはCORS制約を受けず、データ量制限も実質なく、結果はタブで本人が確認できる
 *
 * 戻り値のsuccessは「送信を開始できたか」であり、シート作成の成否は新タブに表示される。
 */
export function createGoogleSheetViaForm(
  expenses: Expense[],
  year: number = new Date().getFullYear()
): { success: boolean; error?: string } {
  const scriptUrl = getGoogleAppsScriptUrl();
  if (!scriptUrl) {
    return {
      success: false,
      error:
        'Google Apps Script URLが設定されていません。.env.local に NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL を設定してください(手順: SETUP_QUICK_GUIDE.md)。',
    };
  }

  const serializedExpenses = expenses.map((exp) => ({
    id: exp.id,
    amount: exp.amount,
    date: exp.date.toISOString(),
    category: exp.category,
    storeName: exp.storeName || '',
    description: exp.description || '',
  }));

  try {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = scriptUrl;
    form.target = '_blank';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'data';
    // GAS側は decodeURIComponent(e.parameter.data) で読むため、ここでencodeしておく。
    // (生JSONのまま送ると、摘要に「%」を含む経費で decodeURIComponent が例外になる)
    input.value = encodeURIComponent(JSON.stringify({ expenses: serializedExpenses, year }));
    form.appendChild(input);

    document.body.appendChild(form);
    form.submit();
    form.remove();
    return { success: true };
  } catch (error) {
    console.error('Google Sheets作成エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

/**
 * 方法2: あらかじめ作成したテンプレートをコピーするリンクを開く。
 * 戻り値のsuccessは「リンクを開けたか」。
 */
export function openGoogleSheetsTemplate(): { success: boolean; error?: string } {
  const templateId = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_TEMPLATE_ID;
  if (!templateId) {
    return {
      success: false,
      error:
        'テンプレートIDが設定されていません。.env.local に NEXT_PUBLIC_GOOGLE_SHEETS_TEMPLATE_ID を設定してください(手順: CREATE_TEMPLATE.md)。',
    };
  }
  window.open(`https://docs.google.com/spreadsheets/d/${templateId}/copy`, '_blank');
  return { success: true };
}
