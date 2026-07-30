// ============================================================
// DailyLedger — lib/db/dexie.ts
// Partitioned IndexedDB schema per authenticated user subject ID
// ============================================================

import Dexie, { type EntityTable } from 'dexie';
import type { Transaction, AppSettings } from '@/types';

class DailyLedgerDB extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>;
  settings!: EntityTable<{ key: string; value: unknown }, 'key'>;

  constructor(dbName: string) {
    super(dbName);

    this.version(1).stores({
      transactions: 'id, userId, type, date, categoryId, createdAt',
      settings: 'key',
    });
  }
}

export function getCurrentUserId(): string {
  if (typeof window === 'undefined') return 'guest_user';
  try {
    const stored = localStorage.getItem('dl_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.id) return parsed.id;
      if (parsed.email) return `user_${btoa(parsed.email.toLowerCase()).replace(/=/g, '')}`;
    }
  } catch {}
  return 'guest_user';
}

// Map of open database instances per user ID
const _dbMap = new Map<string, DailyLedgerDB>();

export function getDB(): DailyLedgerDB {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser');
  }
  const userId = getCurrentUserId();
  const dbName = `dailyledger-db-${userId}`;

  if (!_dbMap.has(userId)) {
    const db = new DailyLedgerDB(dbName);
    _dbMap.set(userId, db);
  }
  return _dbMap.get(userId)!;
}

export async function closeAndLockUserDB(): Promise<void> {
  for (const [userId, db] of _dbMap.entries()) {
    try {
      db.close();
    } catch {}
    _dbMap.delete(userId);
  }
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
