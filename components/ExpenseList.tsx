'use client';

import { useState } from 'react';
import { ExpenseRecord, ExpenseCategory } from '@/types/expense';
import { deleteExpense, updateExpense } from '@/lib/db';
import { deleteExpenseFromSupabase, updateExpenseInSupabase } from '@/lib/supabase-db';
import { EXPENSE_CATEGORIES } from '@/lib/categories';

// Supabaseが設定されているかチェック
const isSupabaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

interface ExpenseListProps {
  expenses: ExpenseRecord[];
  onUpdate: () => void;
}

export default function ExpenseList({ expenses, onUpdate }: ExpenseListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExpenseRecord>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const useSupabase = isSupabaseConfigured();

  const handleEdit = (expense: ExpenseRecord) => {
    setEditingId(expense.id);
    setEditForm({
      date: expense.date,
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      storeName: expense.storeName,
    });
  };

  const handleSave = async (id: string) => {
    try {
      if (useSupabase) {
        await updateExpenseInSupabase(id, editForm);
      } else {
        await updateExpense(id, editForm);
      }
      setEditingId(null);
      setEditForm({});
      onUpdate();
    } catch (error) {
      console.error('更新エラー:', error);
      alert('更新に失敗しました');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('この経費を削除しますか？')) {
      try {
        if (useSupabase) {
          await deleteExpenseFromSupabase(id);
        } else {
          await deleteExpense(id);
        }
        onUpdate();
      } catch (error) {
        console.error('削除エラー:', error);
        alert('削除に失敗しました');
      }
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">経費データがありません</p>
        <p className="text-sm text-gray-400 mt-2">レシートをアップロードしてください</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map((expense) => {
        const isEditing = editingId === expense.id;
        const isExpanded = expandedId === expense.id;

        return (
          <div
            key={expense.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            {isEditing ? (
              // 編集モード
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      日付
                    </label>
                    <input
                      type="date"
                      value={
                        editForm.date instanceof Date
                          ? editForm.date.toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e) =>
                        setEditForm({ ...editForm, date: new Date(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      カテゴリ
                    </label>
                    <select
                      value={editForm.category}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          category: e.target.value as ExpenseCategory,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat.name} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      金額
                    </label>
                    <input
                      type="number"
                      value={editForm.amount || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, amount: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      店舗名
                    </label>
                    <input
                      type="text"
                      value={editForm.storeName || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, storeName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">摘要</label>
                  <input
                    type="text"
                    value={editForm.description || ''}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => handleSave(expense.id)}
                    className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : (
              // 表示モード
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">
                        {expense.date.toLocaleDateString('ja-JP')}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {expense.category}
                      </span>
                    </div>
                    <div className="mt-2">
                      <p className="font-semibold text-lg text-gray-900">
                        ¥{expense.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{expense.description}</p>
                      {expense.storeName && (
                        <p className="text-xs text-gray-500 mt-1">店舗: {expense.storeName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(expense)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="編集"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="削除"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    {expense.imageUrl && (
                      <button
                        onClick={() => toggleExpand(expense.id)}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                        title="画像を表示"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && expense.imageUrl && (
                  <div className="mt-4 border-t pt-4">
                    <img
                      src={expense.imageUrl}
                      alt="レシート画像"
                      className="max-w-full max-h-96 rounded border"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
