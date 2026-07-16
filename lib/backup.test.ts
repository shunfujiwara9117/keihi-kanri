import { describe, it, expect } from 'vitest';
import {
  BACKUP_VERSION,
  buildBackupFilename,
  createBackup,
  parseBackup,
  serializeBackup,
  serializeExpense,
} from './backup';
import type { ExpenseRecord } from '@/types/expense';

const sampleExpense = (overrides: Partial<ExpenseRecord> = {}): ExpenseRecord => ({
  id: 'test-id-1',
  date: new Date('2026-07-01T00:00:00.000Z'),
  category: '消耗品費',
  amount: 1980,
  description: 'コピー用紙',
  storeName: 'サンプル文具店',
  ocrText: 'サンプルOCRテキスト',
  createdAt: new Date('2026-07-02T03:04:05.000Z'),
  updatedAt: new Date('2026-07-03T06:07:08.000Z'),
  ...overrides,
});

describe('serializeExpense / createBackup', () => {
  it('Date フィールドを ISO 文字列に変換する', () => {
    const s = serializeExpense(sampleExpense());
    expect(s.date).toBe('2026-07-01T00:00:00.000Z');
    expect(s.createdAt).toBe('2026-07-02T03:04:05.000Z');
    expect(s.updatedAt).toBe('2026-07-03T06:07:08.000Z');
    expect(s.amount).toBe(1980);
    expect(s.category).toBe('消耗品費');
  });

  it('{version, exportedAt, expenses} 形式で出力する', () => {
    const now = new Date('2026-07-16T12:00:00.000Z');
    const backup = createBackup([sampleExpense()], now);
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.exportedAt).toBe('2026-07-16T12:00:00.000Z');
    expect(backup.expenses).toHaveLength(1);
  });

  it('空データでもエクスポートできる', () => {
    const backup = createBackup([]);
    expect(backup.expenses).toEqual([]);
  });
});

describe('serializeBackup → parseBackup ラウンドトリップ', () => {
  it('Date が復元され、全フィールドが一致する', () => {
    const original = [
      sampleExpense(),
      sampleExpense({
        id: 'test-id-2',
        category: '旅費交通費',
        amount: 540,
        description: '電車代',
        storeName: undefined,
        ocrText: undefined,
      }),
    ];
    const restored = parseBackup(serializeBackup(original));
    expect(restored).toHaveLength(2);
    for (const [i, r] of restored.entries()) {
      expect(r.date).toBeInstanceOf(Date);
      expect(r.createdAt).toBeInstanceOf(Date);
      expect(r.updatedAt).toBeInstanceOf(Date);
      expect(r.date.getTime()).toBe(original[i].date.getTime());
      expect(r.createdAt.getTime()).toBe(original[i].createdAt.getTime());
      expect(r.updatedAt.getTime()).toBe(original[i].updatedAt.getTime());
      expect(r.id).toBe(original[i].id);
      expect(r.category).toBe(original[i].category);
      expect(r.amount).toBe(original[i].amount);
      expect(r.description).toBe(original[i].description);
      expect(r.storeName).toBe(original[i].storeName);
    }
  });

  it('空バックアップも復元できる', () => {
    expect(parseBackup(serializeBackup([]))).toEqual([]);
  });
});

describe('parseBackup バリデーション', () => {
  it('JSON でない文字列はエラー', () => {
    expect(() => parseBackup('not json')).toThrow(/JSON として読めません/);
  });

  it('version / expenses が無い形式はエラー', () => {
    expect(() => parseBackup('{}')).toThrow(/形式が不正/);
    expect(() => parseBackup('{"version":1}')).toThrow(/形式が不正/);
    expect(() => parseBackup('{"expenses":[]}')).toThrow(/形式が不正/);
    expect(() => parseBackup('null')).toThrow(/形式が不正/);
    expect(() => parseBackup('"text"')).toThrow(/形式が不正/);
  });

  it('BACKUP_VERSION より新しいバージョンは明示エラー', () => {
    const json = JSON.stringify({
      version: BACKUP_VERSION + 1,
      exportedAt: '2026-07-16T12:00:00.000Z',
      expenses: [],
    });
    expect(() => parseBackup(json)).toThrow(
      new RegExp(`v${BACKUP_VERSION + 1}.*新しすぎます`)
    );
  });

  it('不正なレコード(id/amount 欠落・日付不正)はエラー', () => {
    const base = { version: BACKUP_VERSION, exportedAt: 'x' };
    expect(() =>
      parseBackup(JSON.stringify({ ...base, expenses: [{ amount: 100 }] }))
    ).toThrow(/expenses\[0\]/);
    expect(() =>
      parseBackup(JSON.stringify({ ...base, expenses: [{ id: 'a', amount: 'x' }] }))
    ).toThrow(/expenses\[0\]/);
    const badDate = serializeExpense(sampleExpense());
    expect(() =>
      parseBackup(
        JSON.stringify({
          ...base,
          expenses: [{ ...badDate, date: 'not-a-date' }],
        })
      )
    ).toThrow(/date が日付として読めません/);
  });
});

describe('buildBackupFilename', () => {
  it('keihi-backup-YYYY-MM-DD.json 形式', () => {
    expect(buildBackupFilename(new Date('2026-07-16T12:34:56.000Z'))).toBe(
      'keihi-backup-2026-07-16.json'
    );
  });
});
