'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { performOCR, validateImageFile, imageToDataURL } from '@/lib/ocr';
import { analyzeReceipt } from '@/lib/classifier';
import { addExpense } from '@/lib/db';
import { addExpenseToSupabase } from '@/lib/supabase-db';

interface ReceiptUploaderProps {
  onUploadComplete?: () => void;
}

// Supabaseが設定されているかチェック
const isSupabaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

export default function ReceiptUploader({ onUploadComplete }: ReceiptUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const processReceipt = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      // ファイル検証
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setError(validation.error || '無効なファイルです');
        setIsProcessing(false);
        return;
      }

      // プレビュー画像を生成
      const dataUrl = await imageToDataURL(file);
      setPreviewUrl(dataUrl);

      // OCR処理
      const ocrResult = await performOCR(file, (p) => setProgress(p));

      if (!ocrResult.text) {
        setError('テキストを認識できませんでした。画像を確認してください。');
        setIsProcessing(false);
        return;
      }

      // レシート情報を解析
      const analysis = analyzeReceipt(ocrResult.text);

      // デバッグ情報を表示
      const amountDisplay = analysis.amount || '認識できず';
      const needsManualInput = !analysis.amount || analysis.amount === 0;

      setDebugInfo(`
📄 OCR認識結果:
${ocrResult.text}

💰 抽出された金額: ${amountDisplay}円 ${needsManualInput ? '⚠️ 認識失敗 - 手動入力が必要です' : ''}
📅 抽出された日付: ${analysis.date?.toLocaleDateString('ja-JP') || '認識できず'}
🏪 抽出された店舗名: ${analysis.storeName || '認識できず'}
📂 カテゴリ: ${analysis.category}

💡 ヒント: 金額が認識できない場合は、経費一覧から編集できます
      `.trim());

      const expenseData = {
        date: analysis.date || new Date(),
        category: analysis.category,
        amount: analysis.amount || 0,
        description: analysis.storeName || '未設定',
        storeName: analysis.storeName || undefined,
        imageUrl: dataUrl,
        ocrText: analysis.ocrText,
      };

      // データベースに保存（Supabaseまたはindexed DB）
      if (isSupabaseConfigured()) {
        await addExpenseToSupabase(expenseData);
      } else {
        await addExpense(expenseData);
      }

      setProgress(100);
      setPreviewUrl(null);

      // 完了通知
      if (onUploadComplete) {
        onUploadComplete();
      }

      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        // デバッグ情報は10秒後にクリア
        setTimeout(() => setDebugInfo(null), 10000);
      }, 1000);
    } catch (err) {
      console.error('OCR処理エラー:', err);
      setError('レシートの処理中にエラーが発生しました');
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        processReceipt(acceptedFiles[0]);
      }
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    multiple: false,
    disabled: isProcessing,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="space-y-4">
          {previewUrl ? (
            <div className="flex justify-center">
              <img
                src={previewUrl}
                alt="レシートプレビュー"
                className="max-h-48 rounded border"
              />
            </div>
          ) : (
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}

          {isProcessing ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                {progress < 30 ? '画像を最適化中...' : 'レシートを読み取り中...'} {progress}%
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {progress < 30
                  ? '高精度モード: 画像を鮮明化しています'
                  : 'AI解析中: テキストと金額を抽出しています'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                {isDragActive
                  ? 'ここにドロップしてください'
                  : 'レシート画像をドラッグ&ドロップ、またはクリックして選択'}
              </p>
              <p className="text-xs text-gray-500">JPEG, PNG, WebP (最大10MB)</p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {debugInfo && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-bold text-blue-900 mb-2">🔍 OCR認識結果（デバッグ情報）</h3>
          <pre className="text-xs text-blue-800 whitespace-pre-wrap font-mono bg-white p-3 rounded border border-blue-100 max-h-64 overflow-y-auto">
            {debugInfo}
          </pre>
          <p className="text-xs text-blue-600 mt-2">
            ※ この情報は10秒後に自動的に消えます
          </p>
        </div>
      )}
    </div>
  );
}
