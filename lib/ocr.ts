import { createWorker, PSM } from 'tesseract.js';
import { OcrResult } from '@/types/expense';
import { extractAmount, extractDate, extractStoreName } from './classifier';
import { createRotatedVersions } from './image-processing';

/**
 * 画像からテキストを抽出するOCR処理（高精度版）
 */
export const performOCR = async (
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<OcrResult> => {
  // 進捗状況の管理
  const updateProgress = (stage: string, progress: number) => {
    if (onProgress) {
      // 画像処理: 0-30%
      // OCR認識: 30-100%
      if (stage === 'preprocessing') {
        onProgress(Math.round(progress * 0.3));
      } else if (stage === 'recognizing') {
        onProgress(30 + Math.round(progress * 0.7));
      }
    }
  };

  try {
    // ステップ1: 画像の回転バージョンを作成
    updateProgress('preprocessing', 0);
    console.log('🔄 画像の回転バージョンを作成中（0°, 90°, 180°, 270°）...');
    const rotatedVersions = await createRotatedVersions(imageFile);
    console.log(`✅ 4方向の画像を作成完了`);

    updateProgress('preprocessing', 100);
    console.log('画像前処理完了');

    // ステップ2: Tesseract Workerの作成（日本語＋英語）
    console.log('OCR初期化中...');
    const worker = await createWorker(['jpn', 'eng'], 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          updateProgress('recognizing', m.progress * 0.25); // 全体の25%ずつ
        }
      },
    });

    console.log('⚙️ 複数の戦略でOCR実行...');

    const results = [];
    let progressStep = 0;
    const totalSteps = 4 * 2; // 4方向 × 2戦略

    // 4方向それぞれで2つの戦略を試す
    for (let i = 0; i < rotatedVersions.length; i++) {
      const rotation = i * 90;
      const rotatedFile = rotatedVersions[i];

      // 戦略A: AUTO + LSTM
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        tessedit_ocr_engine_mode: '1',
      });
      console.log(`📝 ${rotation}度回転 + AUTO + LSTM`);
      const resultA = await worker.recognize(rotatedFile);
      results.push({
        name: `${rotation}度+AUTO`,
        result: resultA,
        rotation,
      });
      console.log(`✅ 信頼度 ${resultA.data.confidence.toFixed(1)}%, 文字数 ${resultA.data.text.length}`);
      progressStep++;
      updateProgress('recognizing', (progressStep / totalSteps) * 100);

      // 戦略B: SINGLE_BLOCK + LSTM
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        tessedit_ocr_engine_mode: '1',
      });
      console.log(`📝 ${rotation}度回転 + SINGLE_BLOCK + LSTM`);
      const resultB = await worker.recognize(rotatedFile);
      results.push({
        name: `${rotation}度+BLOCK`,
        result: resultB,
        rotation,
      });
      console.log(`✅ 信頼度 ${resultB.data.confidence.toFixed(1)}%, 文字数 ${resultB.data.text.length}`);
      progressStep++;
      updateProgress('recognizing', (progressStep / totalSteps) * 100);
    }

    // 最も良い結果を選択
    let bestResult = results[0];
    let bestScore = 0;

    for (const item of results) {
      // スコア計算: 信頼度 + 文字数ボーナス + 日本語文字ボーナス
      const jpnCount = (item.result.data.text.match(/[ぁ-んァ-ヶー一-龠]/g) || []).length;
      const score =
        item.result.data.confidence * 0.5 +
        (item.result.data.text.length > 10 ? 20 : 0) +
        (jpnCount > 5 ? 30 : 0);

      console.log(`${item.name}: スコア ${score.toFixed(1)} (信頼度 ${item.result.data.confidence.toFixed(1)}%, 日本語 ${jpnCount}文字)`);

      if (score > bestScore) {
        bestScore = score;
        bestResult = item;
      }
    }

    console.log(`🏆 採用: ${bestResult.name} (スコア: ${bestScore.toFixed(1)})`);
    const { text, confidence } = bestResult.result.data;

    console.log('OCR認識完了:', { textLength: text.length, confidence });
    console.log('========================================');
    console.log('📄 OCR認識結果（生テキスト）:');
    console.log(text);
    console.log('========================================');

    // Workerを終了
    await worker.terminate();

    // テキストから情報を抽出
    const amount = extractAmount(text);
    const date = extractDate(text);
    const storeName = extractStoreName(text);

    console.log('💰 抽出された金額:', amount);
    console.log('📅 抽出された日付:', date);
    console.log('🏪 抽出された店舗名:', storeName);

    return {
      text: text.trim(),
      confidence,
      amount: amount || undefined,
      date: date || undefined,
      storeName: storeName || undefined,
    };
  } catch (error) {
    console.error('OCRエラー:', error);
    throw error;
  }
};

/**
 * 画像ファイルをBase64データURLに変換
 */
export const imageToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      reject(new Error('画像の読み込みに失敗しました'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * 画像ファイルの検証
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  // ファイルサイズチェック (10MB以下)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'ファイルサイズが大きすぎます（10MB以下にしてください）',
    };
  }

  // ファイル形式チェック
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: '対応していない画像形式です（JPEG、PNG、WebPのみ対応）',
    };
  }

  return { valid: true };
};
