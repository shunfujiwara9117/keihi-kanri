'use client';

import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import ReceiptUploader from '@/components/ReceiptUploader';
import ExpenseList from '@/components/ExpenseList';
import AuthForm from '@/components/AuthForm';
import ExcelExporter from '@/components/ExcelExporter';
import BackupReminder from '@/components/BackupReminder';
import { getAllExpenses } from '@/lib/db';
import { downloadBackup, restoreFromBackup } from '@/lib/backup';
import { getAllExpensesFromSupabase } from '@/lib/supabase-db';
import { summarizeByCategory, exportToCSV, downloadCSV, generateTaxReport } from '@/lib/reports';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from '@/lib/supabase';
import { ExpenseRecord } from '@/types/expense';

// Supabaseが設定されているかチェック
const isSupabaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

export default function Home() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [refreshKey, setRefreshKey] = useState(0);
  const [supabaseExpenses, setSupabaseExpenses] = useState<ExpenseRecord[]>([]);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const { user, loading } = useAuth();

  const useSupabase = isSupabaseConfigured();

  // IndexedDBからデータを取得（Supabase未設定時）
  const indexedDbExpenses = useLiveQuery(() => getAllExpenses(), [refreshKey]) || [];

  // Supabaseからデータを取得
  useEffect(() => {
    if (useSupabase && user) {
      loadSupabaseExpenses();
    }
  }, [user, refreshKey, useSupabase]);

  const loadSupabaseExpenses = async () => {
    try {
      const expenses = await getAllExpensesFromSupabase();
      setSupabaseExpenses(expenses);
    } catch (error) {
      console.error('データ取得エラー:', error);
    }
  };

  // 使用するデータソースを決定
  const allExpenses = useSupabase ? supabaseExpenses : indexedDbExpenses;

  // 認証が必要で、かつログインしていない場合はログインフォームを表示
  if (useSupabase && !loading && !user) {
    return <AuthForm />;
  }

  // ローディング中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 年でフィルタリング
  const yearExpenses = allExpenses.filter(
    (expense) => expense.date.getFullYear() === selectedYear
  );

  // 集計データ
  const summary = summarizeByCategory(yearExpenses);
  const totalAmount = yearExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleExportCSV = () => {
    const csv = exportToCSV(yearExpenses);
    downloadCSV(csv, `経費データ_${selectedYear}年.csv`);
  };

  const handleExportTaxReport = () => {
    const report = generateTaxReport(allExpenses, selectedYear);
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `確定申告サマリー_${selectedYear}年.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // バックアップJSONエクスポート
  // ローカルモード: IndexedDB 全件 / クラウドモード: 現在表示中の Supabase データ
  const handleBackupExport = async () => {
    try {
      await downloadBackup(useSupabase ? allExpenses : undefined);
    } catch (error) {
      console.error('バックアップエクスポートエラー:', error);
      alert('バックアップのエクスポートに失敗しました');
    }
  };

  // バックアップJSONからの復元(ローカルモード専用・全置換)
  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (
      !window.confirm(
        '現在のローカル経費データをすべて削除して、バックアップファイルの内容で置き換えます。よろしいですか？'
      )
    ) {
      return;
    }
    try {
      const count = await restoreFromBackup(file);
      alert(`${count}件の経費データを復元しました`);
      handleRefresh();
    } catch (error) {
      console.error('バックアップ復元エラー:', error);
      alert(
        error instanceof Error ? error.message : 'バックアップの復元に失敗しました'
      );
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">経費管理システム</h1>
              <p className="mt-1 text-sm text-gray-600">
                レシートをアップロードして自動で経費を計算
              </p>
            </div>
            {useSupabase && user && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-600">ログイン中</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
                >
                  ログアウト
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* バックアップ督促バナー(ローカルモード専用。クラウドモードはサーバ側に実体があるため出さない) */}
      {!useSupabase && <BackupReminder onBackup={handleBackupExport} />}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Excelエクスポート */}
        <div className="mb-8">
          <ExcelExporter expenses={allExpenses} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左側: アップロード */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                レシートアップロード
              </h2>
              <ReceiptUploader onUploadComplete={handleRefresh} />
            </div>

            {/* 集計サマリー */}
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">集計</h2>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <option key={year} value={year}>
                        {year}年
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600">年間合計</p>
                <p className="text-3xl font-bold text-gray-900">
                  ¥{totalAmount.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">{yearExpenses.length}件</p>
              </div>

              {summary.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">カテゴリ別</p>
                  {summary.slice(0, 5).map((item) => (
                    <div key={item.category} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{item.category}</span>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          ¥{item.totalAmount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                  {summary.length > 5 && (
                    <p className="text-xs text-gray-500 text-center pt-2">
                      他 {summary.length - 5} カテゴリ
                    </p>
                  )}
                </div>
              )}

              <div className="mt-6 space-y-2">
                <button
                  onClick={handleExportCSV}
                  disabled={yearExpenses.length === 0}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  CSVエクスポート
                </button>
                <button
                  onClick={handleExportTaxReport}
                  disabled={yearExpenses.length === 0}
                  className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  確定申告用サマリー
                </button>

                {/* バックアップ(JSON)導線: 既存エクスポートの下に控えめに配置 */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <button
                    onClick={handleBackupExport}
                    className="px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded"
                  >
                    バックアップ (JSON)
                  </button>
                  {!useSupabase && (
                    <button
                      onClick={() => restoreInputRef.current?.click()}
                      className="px-2 py-1 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded"
                    >
                      バックアップから復元
                    </button>
                  )}
                  <input
                    ref={restoreInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleRestoreFile}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 右側: 経費一覧 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  経費一覧 ({yearExpenses.length}件)
                </h2>
                <button
                  onClick={handleRefresh}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                  title="更新"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <ExpenseList expenses={yearExpenses} onUpdate={handleRefresh} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
