// ============================================================
// DailyLedger — hooks/useTransactions.ts
// React hook for transaction CRUD operations with composable query state
// ============================================================

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { txRepo } from '@/lib/db/transactions.repository';
import { useAppStore } from '@/store/useAppStore';
import type { Transaction, TransactionType, DashboardMetrics } from '@/types';
import { getMonthRange } from '@/lib/utils/dates';

export function useTransactions() {
  const [allRawTransactions, setAllRawTransactions] = useState<Transaction[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Composable filter query state (Fixes M-01)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionType | 'all'>('all');
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

  const refreshKey = useAppStore((s) => s.refreshKey);
  const triggerRefresh = useAppStore((s) => s.triggerRefresh);

  const fetchAll = useCallback(async () => {
    try {
      const data = await txRepo.getAll();
      setAllRawTransactions(data);

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
    let isMounted = true;
    txRepo.getAll().then((data) => {
      if (!isMounted) return;
      setAllRawTransactions(data);
      const { start, end } = getMonthRange();
      txRepo.getMetrics(start, end).then((m) => {
        if (!isMounted) return;
        setMetrics(m);
        setLoading(false);
      });
    });
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // Derived filtered & sorted transactions
  const transactions = useMemo(() => {
    return allRawTransactions.filter((tx) => {
      // 1. Type filter
      if (selectedType !== 'all' && tx.type !== selectedType) {
        return false;
      }
      // 2. Date range filter
      if (dateRange.start && tx.date < dateRange.start) {
        return false;
      }
      if (dateRange.end && tx.date > dateRange.end) {
        return false;
      }
      // 3. Search query filter (matches notes, personName, categoryId)
      if (searchQuery.trim()) {
        const lower = searchQuery.toLowerCase();
        const matchesNotes = tx.notes?.toLowerCase().includes(lower);
        const matchesPerson = tx.personName?.toLowerCase().includes(lower);
        const matchesCategory = tx.categoryId?.toLowerCase().includes(lower);
        if (!matchesNotes && !matchesPerson && !matchesCategory) {
          return false;
        }
      }
      return true;
    });
  }, [allRawTransactions, selectedType, dateRange, searchQuery]);

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

  const restoreTransaction = async (tx: Transaction) => {
    await txRepo.restore(tx);
    triggerRefresh();
  };

  const searchTransactions = (query: string) => {
    setSearchQuery(query);
  };

  const filterByType = (type: TransactionType | 'all') => {
    setSelectedType(type);
  };

  const filterByDateRange = (start?: string, end?: string) => {
    setDateRange({ start, end });
  };

  return {
    transactions,
    allRawTransactions,
    metrics,
    loading,
    searchQuery,
    selectedType,
    dateRange,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    restoreTransaction,
    searchTransactions,
    filterByType,
    filterByDateRange,
    refresh: fetchAll,
  };
}
