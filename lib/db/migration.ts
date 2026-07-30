// ============================================================
// DailyLedger — lib/db/migration.ts
// One-time migration: unify legacy user-partitioned IndexedDB
// databases into a single "dailyledger-db-local" database.
// Runs only once; writes a migration marker afterward.
// ============================================================

const UNIFIED_DB_NAME = 'dailyledger-db-local';
const MIGRATION_MARKER_KEY = 'dl_migration_v1_done';

/**
 * Lists all IndexedDB databases whose name starts with "dailyledger-db-"
 * but is NOT the unified local database.
 */
async function listLegacyDatabases(): Promise<string[]> {
  if (typeof indexedDB === 'undefined' || !indexedDB.databases) return [];
  try {
    const all = await indexedDB.databases();
    return all
      .map((d) => d.name ?? '')
      .filter(
        (name) =>
          name.startsWith('dailyledger-db-') && name !== UNIFIED_DB_NAME
      );
  } catch {
    return [];
  }
}

/**
 * Opens a named IndexedDB and reads all records from the
 * "transactions" and "settings" object stores.
 */
async function readLegacyDB(
  dbName: string
): Promise<{ transactions: unknown[]; settings: unknown[] }> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName);
    req.onerror = () => reject(new Error(`Cannot open legacy DB: ${dbName}`));
    req.onsuccess = () => {
      const db = req.result;
      const storeNames = Array.from(db.objectStoreNames);

      const result: { transactions: unknown[]; settings: unknown[] } = {
        transactions: [],
        settings: [],
      };

      const tx = db.transaction(storeNames, 'readonly');
      let pending = 0;

      if (storeNames.includes('transactions')) {
        pending++;
        const req2 = tx.objectStore('transactions').getAll();
        req2.onsuccess = () => {
          result.transactions = req2.result;
          if (--pending === 0) { db.close(); resolve(result); }
        };
      }

      if (storeNames.includes('settings')) {
        pending++;
        const req3 = tx.objectStore('settings').getAll();
        req3.onsuccess = () => {
          result.settings = req3.result;
          if (--pending === 0) { db.close(); resolve(result); }
        };
      }

      if (pending === 0) { db.close(); resolve(result); }
    };
  });
}

/**
 * Returns true if the migration has already been run.
 */
export function isMigrationDone(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(MIGRATION_MARKER_KEY) === '1';
}

/**
 * Marks the migration as complete.
 */
export function markMigrationDone(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(MIGRATION_MARKER_KEY, '1');
  }
}

export interface MigrationResult {
  needed: boolean;
  legacyDatabases: string[];
  migratedTransactions: number;
  migratedSettings: number;
}

/**
 * Runs the migration. Returns info about what was migrated.
 * This is a best-effort migration — it does NOT delete legacy databases
 * (user can manually clear them after confirming data is intact).
 */
export async function runMigrationIfNeeded(): Promise<MigrationResult> {
  if (isMigrationDone()) {
    return { needed: false, legacyDatabases: [], migratedTransactions: 0, migratedSettings: 0 };
  }

  const legacyDbs = await listLegacyDatabases();

  if (legacyDbs.length === 0) {
    markMigrationDone();
    return { needed: false, legacyDatabases: [], migratedTransactions: 0, migratedSettings: 0 };
  }

  // Read data from all legacy databases; merge transactions (deduplicate by ID)
  const txMap = new Map<string, unknown>();
  const settingsMap = new Map<string, unknown>();

  for (const dbName of legacyDbs) {
    try {
      const data = await readLegacyDB(dbName);
      for (const tx of data.transactions) {
        const t = tx as { id?: string };
        if (t.id) txMap.set(t.id, tx);
      }
      for (const s of data.settings) {
        const setting = s as { key?: string };
        if (setting.key && !settingsMap.has(setting.key)) {
          settingsMap.set(setting.key, s);
        }
      }
    } catch (e) {
      console.warn(`[Migration] Could not read legacy DB ${dbName}:`, e);
    }
  }

  const transactions = Array.from(txMap.values());
  const settings = Array.from(settingsMap.values());

  if (transactions.length === 0 && settings.length === 0) {
    markMigrationDone();
    return { needed: true, legacyDatabases: legacyDbs, migratedTransactions: 0, migratedSettings: 0 };
  }

  // Write into the unified DB
  await writeMigratedData(transactions, settings);
  markMigrationDone();

  return {
    needed: true,
    legacyDatabases: legacyDbs,
    migratedTransactions: transactions.length,
    migratedSettings: settings.length,
  };
}

/**
 * Writes migrated data into the unified "dailyledger-db-local" database.
 * Opens the DB directly (not via Dexie) to avoid circular imports.
 */
async function writeMigratedData(
  transactions: unknown[],
  settings: unknown[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(UNIFIED_DB_NAME, 1);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('transactions')) {
        db.createObjectStore('transactions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    req.onerror = () => reject(new Error('Failed to open unified DB for migration'));

    req.onsuccess = () => {
      const db = req.result;
      const storeNames = ['transactions', 'settings'];
      const tx = db.transaction(storeNames, 'readwrite');

      const txStore = tx.objectStore('transactions');
      for (const record of transactions) {
        txStore.put(record);
      }

      const settStore = tx.objectStore('settings');
      for (const record of settings) {
        settStore.put(record);
      }

      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(new Error('Migration write transaction failed')); };
    };
  });
}
