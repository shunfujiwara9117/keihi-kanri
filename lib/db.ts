import Dexie, { Table } from 'dexie';
import { ExpenseRecord } from '@/types/expense';

// Dexieデータベースクラス
export class ExpenseDatabase extends Dexie {
  expenses!: Table<ExpenseRecord, string>;

  constructor() {
    super('ExpenseDB');

    // データベーススキーマの定義
    this.version(1).stores({
      expenses: 'id, date, category, amount, storeName, createdAt, updatedAt',
    });
  }
}

// データベースインスタンスをエクスポート
export const db = new ExpenseDatabase();

// データベース操作用のヘルパー関数

// 経費を追加
export const addExpense = async (expense: Omit<ExpenseRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const id = crypto.randomUUID();
  const now = new Date();

  const newExpense: ExpenseRecord = {
    ...expense,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await db.expenses.add(newExpense);
  return id;
};

// 経費を更新
export const updateExpense = async (id: string, updates: Partial<ExpenseRecord>): Promise<void> => {
  await db.expenses.update(id, {
    ...updates,
    updatedAt: new Date(),
  });
};

// 経費を削除
export const deleteExpense = async (id: string): Promise<void> => {
  await db.expenses.delete(id);
};

// すべての経費を取得
export const getAllExpenses = async (): Promise<ExpenseRecord[]> => {
  return await db.expenses.orderBy('date').reverse().toArray();
};

// IDで経費を取得
export const getExpenseById = async (id: string): Promise<ExpenseRecord | undefined> => {
  return await db.expenses.get(id);
};

// カテゴリで経費を取得
export const getExpensesByCategory = async (category: string): Promise<ExpenseRecord[]> => {
  return await db.expenses.where('category').equals(category).toArray();
};

// 期間で経費を取得
export const getExpensesByDateRange = async (startDate: Date, endDate: Date): Promise<ExpenseRecord[]> => {
  return await db.expenses
    .where('date')
    .between(startDate, endDate, true, true)
    .toArray();
};

// 月次の経費を取得
export const getExpensesByMonth = async (year: number, month: number): Promise<ExpenseRecord[]> => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  return await getExpensesByDateRange(startDate, endDate);
};

// 年次の経費を取得
export const getExpensesByYear = async (year: number): Promise<ExpenseRecord[]> => {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);

  return await getExpensesByDateRange(startDate, endDate);
};

// データベースをクリア（すべての経費を削除）
export const clearAllExpenses = async (): Promise<void> => {
  await db.expenses.clear();
};
