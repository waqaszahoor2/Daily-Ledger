// ============================================================
// DailyLedger — hooks/useTransactions.ts
// React hook for transaction CRUD operations
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { txRepo } from '@/lib/db/transactions.repository';
import { useAppStore } from '@/store/useAppStore';
import type { Transaction, TransactionType, DashboardMetrics } from '@/types';
import { getMonthRange } from '@/lib/utils/dates';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshKey = useAppStore((s) => s.refreshKey);
  const triggerRefresh = useAppStore((s) => s.triggerRefresh);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await txRepo.getAll();
      setTransactions(data);
      
      const { start, end } = getMonthRange();
      const m = await txRepo.getMetrics(start, end);
      setMetrics(m);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll, refreshKey]);

  const addTransaction = async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    await txRepo.create(data);
    triggerRefresh();
  };

  const updateTransaction = async (id: string, data: Partial<Transaction>) => {
    await txRepo.update(id, data);
    triggerRefresh();
  };

  const deleteTransaction = async (id: string) => {
    await txRepo.delete(id);
    triggerRefresh();
  };

  const searchTransactions = async (query: string) => {
    if (!query.trim()) {
      const data = await txRepo.getAll();
      setTransactions(data);
      return;
    }
    const results = await txRepo.search(query);
    setTransactions(results);
  };

  const filterByType = async (type: TransactionType | 'all') => {
    if (type === 'all') {
      const data = await txRepo.getAll();
      setTransactions(data);
    } else {
      const data = await txRepo.getByType(type);
      setTransactions(data);
    }
  };

  const filterByDateRange = async (start: string, end: string) => {
    const data = await txRepo.getByDateRange(start, end);
    setTransactions(data);
  };

  return {
    transactions,
    metrics,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    searchTransactions,
    filterByType,
    filterByDateRange,
    refresh: fetchAll,
  };
}
