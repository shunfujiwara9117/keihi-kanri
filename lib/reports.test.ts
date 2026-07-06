import { describe, expect, it } from 'vitest';
import type { ExpenseRecord } from '@/types/expense';
import { generateMonthlyReport, summarizeByCategory } from './reports';

const exp = (category: ExpenseRecord['category'], amount: number): ExpenseRecord =>
  ({
    id: String(Math.abs(amount)) + category,
    date: new Date('2026-07-01'),
    category,
    amount,
    description: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as ExpenseRecord;

describe('summarizeByCategory', () => {
  it('カテゴリ別合計・件数・構成比が正しい(金額降順)', () => {
    const s = summarizeByCategory([
      exp('旅費交通費', 3000),
      exp('旅費交通費', 1000),
      exp('通信費', 6000),
    ]);
    expect(s[0]).toMatchObject({ category: '通信費', totalAmount: 6000, count: 1, percentage: 60 });
    expect(s[1]).toMatchObject({ category: '旅費交通費', totalAmount: 4000, count: 2, percentage: 40 });
  });
  it('0件なら空配列(0除算しない)', () => {
    expect(summarizeByCategory([])).toEqual([]);
  });
});

describe('generateMonthlyReport', () => {
  it('合計・件数・内訳が揃う', () => {
    const r = generateMonthlyReport([exp('消耗品費', 2500), exp('通信費', 4980)], 2026, 7);
    expect(r).toMatchObject({ year: 2026, month: 7, totalAmount: 7480, recordCount: 2 });
    expect(r.categoryBreakdown).toHaveLength(2);
  });
});
