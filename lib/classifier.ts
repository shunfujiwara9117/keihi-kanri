import { ExpenseCategory } from '@/types/expense';
import { EXPENSE_CATEGORIES } from './categories';

/**
 * OCRテキストから経費カテゴリを自動判定する
 * キーワードマッチングで最も適切なカテゴリを返す
 */
export const classifyExpense = (text: string, storeName?: string): ExpenseCategory => {
  const searchText = `${text} ${storeName || ''}`.toLowerCase();

  let maxScore = 0;
  let bestCategory: ExpenseCategory = 'その他';

  for (const category of EXPENSE_CATEGORIES) {
    let score = 0;

    // キーワードマッチング
    for (const keyword of category.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        score += keyword.length; // 長いキーワードほど高スコア
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestCategory = category.name;
    }
  }

  return bestCategory;
};

/**
 * テキストから金額を抽出する（領収書特化版）
 */
export const extractAmount = (text: string): number | null => {
  console.log('💵 金額抽出開始...');
  const amounts: number[] = [];

  // テキストをクリーンアップ（不要なスペース・改行を削除）
  const cleanText = text.replace(/\s+/g, ' ');

  // 領収書専用の最優先パターン（「金」「￥」などの領収書特有表現）
  const receiptPatterns = [
    /金[\s￥¥]*([\d,\s]+)円?/gi,          // 「金 ￥2,500」「金 2500円」
    /￥[\s]*([\d,\s]+)円?/gi,              // 「￥2,500」
    /金額[\s:]*¥?[\s]*([\d,\s]+)/gi,      // 「金額: 2500」
  ];

  for (const pattern of receiptPatterns) {
    const matches = cleanText.matchAll(pattern);
    for (const match of matches) {
      const amountStr = match[1].replace(/[,\s]/g, '');
      const amount = parseInt(amountStr, 10);
      console.log(`  🔍 領収書パターン検出: "${match[0]}" → ${amount}円`);
      if (!isNaN(amount) && amount >= 10 && amount <= 10000000) {
        console.log(`  ✅ 領収書パターンで確定: ${amount}円`);
        return amount;
      }
    }
  }

  // 優先度の高い金額パターン（合計・小計）
  const priorityPatterns = [
    /合計[\s:]*¥?[\s]*([\d,\s]+)/gi,
    /小計[\s:]*¥?[\s]*([\d,\s]+)/gi,
    /計[\s:]*¥?[\s]*([\d,\s]+)/gi,
    /total[\s:]*¥?[\s]*([\d,\s]+)/gi,
  ];

  for (const pattern of priorityPatterns) {
    const matches = cleanText.matchAll(pattern);
    for (const match of matches) {
      const amountStr = match[1].replace(/[,\s]/g, '');
      const amount = parseInt(amountStr, 10);
      console.log(`  🔍 優先パターン検出: "${match[0]}" → ${amount}円`);
      if (!isNaN(amount) && amount >= 10 && amount <= 10000000) {
        console.log(`  ✅ 優先パターンで確定: ${amount}円`);
        return amount;
      }
    }
  }

  // 4桁の連続した数字を探す（2500のような金額）
  const fourDigitPattern = /(?:^|[^0-9])([2-9]\d{3})(?:[^0-9]|$)/g;
  const fourDigitMatches = cleanText.matchAll(fourDigitPattern);
  for (const match of fourDigitMatches) {
    const amount = parseInt(match[1], 10);
    console.log(`  🔍 4桁数字パターン検出: "${match[1]}" → ${amount}円`);
    if (!isNaN(amount) && amount >= 1000 && amount <= 10000000) {
      amounts.push(amount);
    }
  }

  // 一般的な金額パターン
  const generalPatterns = [
    /¥[\s]*([\d,\s]{3,})/g,               // ¥記号付き
    /(\d{1,3}(?:,\d{3})+)[\s]*円/g,       // カンマ区切り+円
    /(\d{3,})[\s]*円/g,                   // 3桁以上+円
  ];

  for (const pattern of generalPatterns) {
    const matches = cleanText.matchAll(pattern);
    for (const match of matches) {
      const amountStr = match[1].replace(/[,\s]/g, '');
      const amount = parseInt(amountStr, 10);
      console.log(`  🔍 一般パターン検出: "${match[0]}" → ${amount}円`);
      if (!isNaN(amount) && amount >= 100 && amount <= 10000000) {
        amounts.push(amount);
      }
    }
  }

  // 複数の金額が見つかった場合は最大値を返す（合計金額の可能性が高い）
  if (amounts.length > 0) {
    const maxAmount = Math.max(...amounts);
    console.log(`  ✅ 複数の金額から最大値を選択: ${maxAmount}円 (候補: ${amounts.join(', ')}円)`);
    return maxAmount;
  }

  console.log('  ❌ 金額が見つかりませんでした');
  return null;
};

/**
 * テキストから日付を抽出する
 */
export const extractDate = (text: string): Date | null => {
  // 日付パターンを検索
  const patterns = [
    // YYYY/MM/DD または YYYY-MM-DD
    /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/,
    // YYYY年MM月DD日
    /(\d{4})年(\d{1,2})月(\d{1,2})日/,
    // MM/DD または MM-DD (今年とみなす)
    /(\d{1,2})[/-](\d{1,2})/,
    // MM月DD日 (今年とみなす)
    /(\d{1,2})月(\d{1,2})日/,
  ];

  const currentYear = new Date().getFullYear();

  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match) {
      let year: number, month: number, day: number;

      if (i <= 1) {
        // YYYY/MM/DD 形式
        year = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        day = parseInt(match[3], 10);
      } else {
        // MM/DD 形式（今年とみなす）
        year = currentYear;
        month = parseInt(match[1], 10);
        day = parseInt(match[2], 10);
      }

      // 日付の妥当性チェック
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
  }

  return null;
};

/**
 * テキストから店舗名を抽出する
 */
export const extractStoreName = (text: string): string | null => {
  // 一般的な店舗名パターン
  const lines = text.split('\n').map((line) => line.trim());

  // 最初の数行から店舗名らしきものを探す
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];

    // 空行や数字のみの行はスキップ
    if (!line || /^\d+$/.test(line)) {
      continue;
    }

    // 店舗名として妥当な長さ（2〜30文字）
    if (line.length >= 2 && line.length <= 30) {
      // 特定のキーワードを含む場合は店舗名として返す
      const storeKeywords = [
        'セブンイレブン', 'ローソン', 'ファミリーマート', 'ファミマ',
        'スーパー', 'マート', 'ストア', 'ショップ',
        '株式会社', '有限会社',
      ];

      for (const keyword of storeKeywords) {
        if (line.includes(keyword)) {
          return line;
        }
      }

      // 最初の比較的長い行を店舗名とみなす
      if (i === 0 && line.length >= 3) {
        return line;
      }
    }
  }

  return null;
};

/**
 * レシート情報を総合的に解析する
 */
export const analyzeReceipt = (ocrText: string) => {
  const amount = extractAmount(ocrText);
  const date = extractDate(ocrText) || new Date();
  const storeName = extractStoreName(ocrText);
  const category = classifyExpense(ocrText, storeName || undefined);

  return {
    amount,
    date,
    storeName,
    category,
    ocrText,
  };
};
