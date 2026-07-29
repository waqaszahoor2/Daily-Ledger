// ============================================================
// DailyLedger — lib/db/dexie.ts
// IndexedDB schema using Dexie.js
// ============================================================

import Dexie, { type EntityTable } from 'dexie';
import type { Transaction, AppSettings } from '@/types';

class DailyLedgerDB extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>;
  settings!: EntityTable<{ key: string; value: unknown }, 'key'>;

  constructor() {
    super('dailyledger-db');

    this.version(1).stores({
      transactions: 'id, type, date, categoryId, createdAt',
      settings: 'key',
    });
  }
}

// Singleton instance
let _db: DailyLedgerDB | null = null;

export function getDB(): DailyLedgerDB {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser');
  }
  if (!_db) {
    _db = new DailyLedgerDB();
  }
  return _db;
}

// ── Settings helpers ─────────────────────────────────────

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const db = getDB();
  const record = await db.settings.get(key);
  return record?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const db = getDB();
  await db.settings.put({ key, value });
}

export async function getAppSettings(): Promise<AppSettings> {
  const theme = await getSetting<AppSettings['theme']>('theme') ?? 'system';
  const currency = await getSetting<string>('currency') ?? 'PKR';
  const driveConfig = await getSetting<AppSettings['driveConfig']>('driveConfig') ?? {
    connected: false,
  };
  const driveSkipped = await getSetting<boolean>('driveSkipped') ?? false;

  return { theme, currency, driveConfig, driveSkipped };
}
