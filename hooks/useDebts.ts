// ============================================================
// DailyLedger — hooks/useDebts.ts
// React hook for person debt & lending balance management
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { txRepo } from '@/lib/db/transactions.repository';
import { useAppStore } from '@/store/useAppStore';
import type { PersonBalance } from '@/types';

export function useDebts() {
  const [personBalances, setPersonBalances] = useState<PersonBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const refreshKey = useAppStore((s) => s.refreshKey);

  const fetchDebts = useCallback(async () => {
    try {
      const data = await txRepo.getPersonBalances();
      setPersonBalances(data);
    } catch (err) {
      console.error('Failed to fetch debts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    txRepo.getPersonBalances().then((data) => {
      if (!isMounted) return;
      setPersonBalances(data);
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // Overall totals
  const totalOutstandingLent = personBalances
    .filter((p) => p.netBalance > 0)
    .reduce((sum, p) => sum + p.netBalance, 0);

  const totalOutstandingBorrowed = personBalances
    .filter((p) => p.netBalance < 0)
    .reduce((sum, p) => sum + Math.abs(p.netBalance), 0);

  return {
    personBalances,
    totalOutstandingLent,
    totalOutstandingBorrowed,
    loading,
    refresh: fetchDebts,
  };
}
