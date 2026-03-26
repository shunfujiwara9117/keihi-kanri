import { getSupabase } from './supabase';
import { ExpenseRecord } from '@/types/expense';

const TABLE_NAME = 'expenses';

// 経費を追加
export const addExpenseToSupabase = async (
  expense: Omit<ExpenseRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const supabase = getSupabase();
  const user = await supabase.auth.getUser();

  if (!user.data.user) {
    throw new Error('ログインが必要です');
  }

  const newExpense = {
    ...expense,
    user_id: user.data.user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert([newExpense])
    .select()
    .single();

  if (error) throw error;
  return data.id;
};

// 経費を更新
export const updateExpenseInSupabase = async (
  id: string,
  updates: Partial<ExpenseRecord>
): Promise<void> => {
  const supabase = getSupabase();

  const { error } = await supabase
    .from(TABLE_NAME)
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
};

// 経費を削除
export const deleteExpenseFromSupabase = async (id: string): Promise<void> => {
  const supabase = getSupabase();

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// すべての経費を取得
export const getAllExpensesFromSupabase = async (): Promise<ExpenseRecord[]> => {
  const supabase = getSupabase();
  const user = await supabase.auth.getUser();

  if (!user.data.user) {
    return [];
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', user.data.user.id)
    .order('date', { ascending: false });

  if (error) throw error;

  // Supabaseのデータを ExpenseRecord 型に変換
  return (data || []).map((item: any) => ({
    id: item.id,
    date: new Date(item.date),
    category: item.category,
    amount: item.amount,
    description: item.description,
    storeName: item.store_name,
    imageUrl: item.image_url,
    ocrText: item.ocr_text,
    createdAt: new Date(item.created_at),
    updatedAt: new Date(item.updated_at),
  }));
};

// 年次の経費を取得
export const getExpensesByYearFromSupabase = async (year: number): Promise<ExpenseRecord[]> => {
  const supabase = getSupabase();
  const user = await supabase.auth.getUser();

  if (!user.data.user) {
    return [];
  }

  const startDate = new Date(year, 0, 1).toISOString();
  const endDate = new Date(year, 11, 31, 23, 59, 59).toISOString();

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', user.data.user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) throw error;

  return (data || []).map((item: any) => ({
    id: item.id,
    date: new Date(item.date),
    category: item.category,
    amount: item.amount,
    description: item.description,
    storeName: item.store_name,
    imageUrl: item.image_url,
    ocrText: item.ocr_text,
    createdAt: new Date(item.created_at),
    updatedAt: new Date(item.updated_at),
  }));
};
