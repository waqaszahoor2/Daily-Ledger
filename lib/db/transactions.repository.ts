// ============================================================
// DailyLedger — lib/db/transactions.repository.ts
// Repository pattern for transaction CRUD
// ============================================================

import { getDB, getCurrentUserId } from './dexie';
import type { Transaction, TransactionType, DashboardMetrics } from '@/types';
import { toMinorUnits, fromMinorUnits } from '@/lib/utils/money';
import { generateId } from '@/lib/utils/id';

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

    const totalIncome    = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense   = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const totalGiven     = txns.filter(t => t.type === 'money_given').reduce((s, t) => s + t.amount, 0);
    const totalReceived  = txns.filter(t => t.type === 'money_received').reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome + totalReceived - totalExpense - totalGiven;

    return {
      totalIncome,
      totalExpense,
      totalGiven,
      totalReceived,
      balance,
      period: startDate ? 'month' : 'all',
    };
  }

  async getPersonBalances(): Promise<import('@/types').PersonBalance[]> {
    const all = await this.getAll();
    const map: Record<string, { totalGiven: number; totalReceived: number; count: number; lastDate: string }> = {};

    for (const t of all) {
      if (!t.personName || !t.personName.trim()) continue;
      const name = t.personName.trim();

      if (!map[name]) {
        map[name] = { totalGiven: 0, totalReceived: 0, count: 0, lastDate: t.date };
      }

      map[name].count += 1;
      if (t.date > map[name].lastDate) {
        map[name].lastDate = t.date;
      }

      if (t.type === 'money_given') {
        map[name].totalGiven += t.amount;
      } else if (t.type === 'money_received') {
        map[name].totalReceived += t.amount;
      }
    }

    return Object.entries(map).map(([personName, data]) => ({
      personName,
      totalGiven: data.totalGiven,
      totalReceived: data.totalReceived,
      netBalance: data.totalGiven - data.totalReceived,
      transactionCount: data.count,
      lastTransactionDate: data.lastDate,
    }));
  }
}

// Singleton instance
export const txRepo = new TransactionRepository();
