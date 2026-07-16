'use client';

// バックアップ督促バナー(freeemodel_keiri の components/BackupReminder.tsx を踏襲)
// - 最終バックアップから WARNING_DAYS 日超過 or 未取得なら表示
// - 「閉じる」で 1 日再表示しない
// - ローカルモード(IndexedDB)専用。クラウドモードでは呼び出し側で描画しないこと

import { useEffect, useState } from 'react';
import { BACKUP_UPDATED_EVENT, LAST_BACKUP_KEY } from '@/lib/backup';

const DISMISS_KEY = 'keihi_backup_reminder_dismissed_at';
const WARNING_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

type State = { show: boolean; days: number | null };

function compute(): State {
  const last = window.localStorage.getItem(LAST_BACKUP_KEY);
  const dismissed = window.localStorage.getItem(DISMISS_KEY);
  const now = Date.now();
  if (dismissed && now - Number(dismissed) < DAY_MS) {
    return { show: false, days: null };
  }
  if (!last) return { show: true, days: null };
  const d = Math.floor((now - new Date(last).getTime()) / DAY_MS);
  return { show: d >= WARNING_DAYS, days: d };
}

export default function BackupReminder({ onBackup }: { onBackup?: () => void }) {
  const [state, setState] = useState<State>({ show: false, days: null });

  useEffect(() => {
    // ブラウザ固有の localStorage を参照するため useEffect で初期化
    setState(compute());
    const recompute = () => setState(compute());
    window.addEventListener('storage', recompute);
    window.addEventListener(BACKUP_UPDATED_EVENT, recompute);
    return () => {
      window.removeEventListener('storage', recompute);
      window.removeEventListener(BACKUP_UPDATED_EVENT, recompute);
    };
  }, []);

  if (!state.show) return null;

  return (
    <div role="alert" className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-4 flex-wrap">
        <span className="flex items-start gap-1.5 text-sm text-amber-800">
          <svg
            className="w-4 h-4 shrink-0 mt-0.5 text-amber-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          {state.days === null
            ? 'まだバックアップを取得していません。ブラウザ履歴削除で経費データが消える可能性があるため、定期的なバックアップを推奨します。'
            : `前回のバックアップから ${state.days} 日経過しています。バックアップを取得しましょう。`}
        </span>
        <div className="flex items-center gap-2 text-xs">
          {onBackup && (
            <button
              type="button"
              onClick={onBackup}
              className="px-2.5 py-1 font-medium text-amber-800 bg-amber-100 rounded hover:bg-amber-200"
            >
              今すぐバックアップ
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
              setState({ show: false, days: state.days });
            }}
            className="px-2.5 py-1 text-amber-700 hover:text-amber-900"
          >
            閉じる (1日再表示しない)
          </button>
        </div>
      </div>
    </div>
  );
}
