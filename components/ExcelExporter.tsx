'use client';

import { useState } from 'react';
import { Expense } from '@/types/expense';
import { createGoogleSheetViaForm, openGoogleSheetsTemplate } from '@/lib/google-sheets-export';

interface ExcelExporterProps {
  expenses: Expense[];
}

export default function ExcelExporter({ expenses }: ExcelExporterProps) {
  const [isCreating, setIsCreating] = useState(false);
  const currentYear = new Date().getFullYear();

  // 方法1: Google Apps Scriptで自動作成(hidden form POST。旧GET方式は経費が
  // 数百件になるとURL長上限で壊れるため廃止。結果は新タブに実際の成否が表示される)
  const handleCreateGoogleSheet = () => {
    setIsCreating(true);
    const result = createGoogleSheetViaForm(expenses, currentYear);
    if (!result.success) {
      alert(`⚠️ ${result.error}\n\nまたは、下の「テンプレートをコピー」ボタンを使ってください。`);
      setIsCreating(false);
      return;
    }
    setTimeout(() => {
      alert(
        '📤 スプレッドシート作成をGoogleに送信しました。\n\n新しいタブに結果が表示されます。\n・成功: 完成したシートが開きます\n・失敗: エラー内容が表示されます(その場合はお知らせください)'
      );
      setIsCreating(false);
    }, 500);
  };

  // 方法2: テンプレートをコピー
  const handleCopyTemplate = () => {
    const result = openGoogleSheetsTemplate();
    if (!result.success) {
      alert(`⚠️ ${result.error}`);
    }
  };

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 shadow-md border border-green-200">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
          <span className="text-2xl mr-2">📊</span>
          確定申告用Googleスプレッドシート
        </h3>
        <p className="text-sm text-gray-600">
          {currentYear}年度の経費管理スプレッドシートを作成します（Mac対応）
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 方法1: 自動作成 */}
        <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
          <div className="flex items-start mb-3">
            <span className="text-2xl mr-2">🚀</span>
            <div className="flex-1">
              <h4 className="font-bold text-gray-800 mb-1">方法1: 自動作成</h4>
              <p className="text-xs text-gray-600">
                ボタンクリックで自動作成（初回セットアップ10分）
              </p>
            </div>
          </div>
          <ul className="text-xs text-gray-500 space-y-1 ml-7 mb-3 list-disc">
            <li>データ自動入力</li>
            <li>新しいタブで開く</li>
            <li>完全自動化</li>
          </ul>
          <button
            onClick={handleCreateGoogleSheet}
            disabled={isCreating}
            className={`w-full px-4 py-2 rounded-lg font-bold text-white shadow transition-all ${
              isCreating
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
            }`}
          >
            {isCreating ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                作成中...
              </span>
            ) : (
              '📝 自動作成'
            )}
          </button>
        </div>

        {/* 方法2: テンプレートコピー */}
        <div className="bg-white rounded-lg p-4 border-2 border-green-200">
          <div className="flex items-start mb-3">
            <span className="text-2xl mr-2">📋</span>
            <div className="flex-1">
              <h4 className="font-bold text-gray-800 mb-1">方法2: テンプレート</h4>
              <p className="text-xs text-gray-600">
                テンプレートをコピー（セットアップ簡単）
              </p>
            </div>
          </div>
          <ul className="text-xs text-gray-500 space-y-1 ml-7 mb-3 list-disc">
            <li>手動入力</li>
            <li>すぐ使える</li>
            <li>シンプル</li>
          </ul>
          <button
            onClick={handleCopyTemplate}
            className="w-full px-4 py-2 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 shadow hover:shadow-lg transition-all"
          >
            📋 テンプレートをコピー
          </button>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="text-xs text-gray-500">
          <strong>方法1:</strong>{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.open('/SETUP_QUICK_GUIDE.md', '_blank');
            }}
            className="text-blue-600 hover:underline"
          >
            セットアップ手順 →
          </a>
        </div>
        <div className="text-xs text-gray-500">
          <strong>方法2:</strong>{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.open('/CREATE_TEMPLATE.md', '_blank');
            }}
            className="text-green-600 hover:underline"
          >
            テンプレート作成手順 →
          </a>
        </div>
      </div>
    </div>
  );
}
