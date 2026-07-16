// ローカルデータ(IndexedDB)のバックアップ/リストア
// 姉妹アプリ freeemodel_keiri の lib/backup.ts の設計を踏襲(2026-07-16 移植)
// - エクスポート: expenses 全件を {version, exportedAt, expenses} 形式の JSON で保存
// - リストア: バージョン検証の上「全クリア→bulkAdd」(呼び出し側で確認ダイアログを出すこと)
// - 純関数(シリアライズ/デシリアライズ)は DB に依存せず、vitest で単体テスト可能

import type { ExpenseRecord } from '@/types/expense';

export const BACKUP_VERSION = 1;

// Date フィールドを ISO 文字列にしたエクスポート表現
export type SerializedExpense = Omit<
  ExpenseRecord,
  'date' | 'createdAt' | 'updatedAt'
> & {
  date: string;
  createdAt: string;
  updatedAt: string;
};

export interface BackupFile {
  version: number;
  exportedAt: string;
  expenses: SerializedExpense[];
}

// ---------- 純関数(テスト対象) ----------

export function serializeExpense(expense: ExpenseRecord): SerializedExpense {
  return {
    ...expense,
    date: new Date(expense.date).toISOString(),
    createdAt: new Date(expense.createdAt).toISOString(),
    updatedAt: new Date(expense.updatedAt).toISOString(),
  };
}

export function createBackup(
  expenses: ExpenseRecord[],
  now: Date = new Date()
): BackupFile {
  return {
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    expenses: expenses.map(serializeExpense),
  };
}

export function serializeBackup(
  expenses: ExpenseRecord[],
  now: Date = new Date()
): string {
  return JSON.stringify(createBackup(expenses, now), null, 2);
}

function parseDateStrict(value: unknown, field: string, index: number): Date {
  if (typeof value !== 'string' && !(value instanceof Date)) {
    throw new Error(
      `バックアップファイルの形式が不正です (expenses[${index}].${field})`
    );
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error(
      `バックアップファイルの形式が不正です (expenses[${index}].${field} が日付として読めません)`
    );
  }
  return d;
}

// JSON 文字列を検証し、Date を復元した ExpenseRecord[] を返す
export function parseBackup(text: string): ExpenseRecord[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('バックアップファイルが JSON として読めません');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('バックアップファイルの形式が不正です');
  }
  const file = parsed as Partial<BackupFile>;
  if (typeof file.version !== 'number' || !Array.isArray(file.expenses)) {
    throw new Error('バックアップファイルの形式が不正です');
  }
  if (file.version > BACKUP_VERSION) {
    throw new Error(
      `バックアップのバージョン (v${file.version}) が新しすぎます。アプリをアップデートしてください`
    );
  }

  return file.expenses.map((row, i) => {
    if (typeof row !== 'object' || row === null) {
      throw new Error(`バックアップファイルの形式が不正です (expenses[${i}])`);
    }
    const r = row as Record<string, unknown>;
    if (typeof r.id !== 'string' || typeof r.amount !== 'number') {
      throw new Error(`バックアップファイルの形式が不正です (expenses[${i}])`);
    }
    return {
      ...(r as unknown as ExpenseRecord),
      date: parseDateStrict(r.date, 'date', i),
      createdAt: parseDateStrict(r.createdAt, 'createdAt', i),
      updatedAt: parseDateStrict(r.updatedAt, 'updatedAt', i),
    };
  });
}

export function buildBackupFilename(now: Date = new Date()): string {
  return `keihi-backup-${now.toISOString().slice(0, 10)}.json`;
}

// ---------- 最終バックアップ日時 (localStorage) ----------

export const LAST_BACKUP_KEY = 'keihi_last_backup_at';
// setLastBackupAt 時に同一タブへ通知するイベント名(storage イベントは他タブのみのため)
export const BACKUP_UPDATED_EVENT = 'keihi-backup-updated';

export function getLastBackupAt(): Date | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(LAST_BACKUP_KEY);
  return v ? new Date(v) : null;
}

export function setLastBackupAt(date = new Date()): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LAST_BACKUP_KEY, date.toISOString());
  window.dispatchEvent(new Event(BACKUP_UPDATED_EVENT));
}

// ---------- ブラウザ + DB 操作 ----------

// バックアップ JSON をダウンロードする。
// expenses を渡せばそのデータ(例: Supabase 表示中のデータ)を、
// 省略時はローカル IndexedDB の全件をエクスポートする。
export async function downloadBackup(
  expenses?: ExpenseRecord[]
): Promise<void> {
  let rows = expenses;
  if (!rows) {
    const { db } = await import('@/lib/db');
    rows = await db.expenses.toArray();
  }
  const blob = new Blob([serializeBackup(rows)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = buildBackupFilename();
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setLastBackupAt();
}

// バックアップからローカル IndexedDB へ復元(全クリア→bulkAdd)。
// 破壊的操作のため、呼び出し側で必ずユーザー確認を取ること。
// 復元先はローカルモード(IndexedDB)のみ対応。復元件数を返す。
export async function restoreFromBackup(file: File): Promise<number> {
  const text = await file.text();
  const expenses = parseBackup(text);
  const { db } = await import('@/lib/db');
  await db.transaction('rw', db.expenses, async () => {
    await db.expenses.clear();
    if (expenses.length > 0) {
      await db.expenses.bulkAdd(expenses);
    }
  });
  return expenses.length;
}
