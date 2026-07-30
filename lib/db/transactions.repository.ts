// ============================================================
// DailyLedger — lib/db/transactions.repository.ts
// Repository pattern for transaction CRUD with isolated DB and atomic restore
// ============================================================

import { getDB, getCurrentUserId } from './dexie';
import type { Transaction, TransactionType, DashboardMetrics, PersonBalance } from '@/types';
import { generateId } from '@/lib/utils/id';
import { calculateDashboardMetrics, calculatePersonBalances } from '@/lib/domain/ledger';

export class TransactionRepository {
  private get db() {
    return getDB();
  }

  async create(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const now = new Date().toISOString();
    const currentUserId = getCurrentUserId();
    const tx: Transaction = {
      ...data,
      userId: data.userId || currentUserId,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    await this.db.transactions.add(tx);
    return tx;
  }

  async restore(tx: Transaction): Promise<void> {
    const currentUserId = getCurrentUserId();
    await this.db.transactions.put({
      ...tx,
      userId: tx.userId || currentUserId,
      updatedAt: new Date().toISOString(),
    });
  }

  async update(id: string, data: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<void> {
    await this.db.transactions.update(id, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.transactions.delete(id);
  }

  async getAll(): Promise<Transaction[]> {
    const currentUserId = getCurrentUserId();
    const all = await this.db.transactions.orderBy('date').reverse().toArray();
    return all.filter(t => !t.userId || t.userId === currentUserId);
  }

  async getById(id: string): Promise<Transaction | undefined> {
    const tx = await this.db.transactions.get(id);
    const currentUserId = getCurrentUserId();
    if (tx && tx.userId && tx.userId !== currentUserId) return undefined;
    return tx;
  }

  async getByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    const currentUserId = getCurrentUserId();
    const items = await this.db.transactions
      .where('date')
      .between(startDate, endDate, true, true)
      .reverse()
      .toArray();
    return items.filter(t => !t.userId || t.userId === currentUserId);
  }

  async getByType(type: TransactionType): Promise<Transaction[]> {
    const currentUserId = getCurrentUserId();
    const items = await this.db.transactions
      .where('type')
      .equals(type)
      .reverse()
      .sortBy('date');
    return items.filter(t => !t.userId || t.userId === currentUserId);
  }

  async search(query: string): Promise<Transaction[]> {
    const lower = query.toLowerCase();
    const all = await this.getAll();
    return all.filter(t =>
      t.notes?.toLowerCase().includes(lower) ||
      t.personName?.toLowerCase().includes(lower)
    );
  }

  async getMetrics(startDate?: string, endDate?: string): Promise<DashboardMetrics> {
    let txns: Transaction[];
    if (startDate && endDate) {
      txns = await this.getByDateRange(startDate, endDate);
    } else {
      txns = await this.getAll();
    }
    return calculateDashboardMetrics(txns, startDate ? 'month' : 'all');
  }

  async getPersonBalances(): Promise<PersonBalance[]> {
    const all = await this.getAll();
    return calculatePersonBalances(all);
  }

  /**
   * H-03: Atomic backup restore with validation & automatic rollback snapshot
   */
  async atomicRestore(newTransactions: Transaction[], newSettings?: Array<{ key: string; value: unknown }>): Promise<void> {
    const db = this.db;

    // 1. Pre-validation
    if (!Array.isArray(newTransactions)) {
      throw new Error('Invalid backup: transactions array required');
    }
    for (const tx of newTransactions) {
      if (!tx.id || typeof tx.amount !== 'number' || !tx.type || !tx.date) {
        throw new Error('Invalid backup entity schema structure');
      }
    }

    // 2. Snapshot current data for rollback safety
    const currentTxns = await db.transactions.toArray();
    const currentSettings = await db.settings.toArray();

    try {
      // 3. Atomic replace inside one transaction block
      await db.transaction('rw', [db.transactions, db.settings], async () => {
        await db.transactions.clear();
        await db.settings.clear();

        if (newTransactions.length > 0) {
          await db.transactions.bulkAdd(newTransactions);
        }
        if (newSettings && newSettings.length > 0) {
          await db.settings.bulkAdd(newSettings);
        }
      });
    } catch (err) {
      // 4. Rollback to snapshot if failure occurs
      await db.transaction('rw', [db.transactions, db.settings], async () => {
        await db.transactions.clear();
        await db.settings.clear();
        if (currentTxns.length > 0) await db.transactions.bulkAdd(currentTxns);
        if (currentSettings.length > 0) await db.settings.bulkAdd(currentSettings);
      });
      throw new Error(`Restore failed and rolled back safely: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// Singleton instance
export const txRepo = new TransactionRepository();
