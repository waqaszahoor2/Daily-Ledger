// ============================================================
// DailyLedger — lib/domain/ledger.ts
// Centralized domain invariants for ledger calculations & debt math
// ============================================================

import type { Transaction, DashboardMetrics, PersonBalance } from '@/types';

/**
 * Calculates overall dashboard metrics given a transaction list.
 */
export function calculateDashboardMetrics(txns: Transaction[], periodLabel: 'all' | 'month' = 'all'): DashboardMetrics {
  const totalIncome   = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense  = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalGiven    = txns.filter(t => t.type === 'money_given').reduce((s, t) => s + t.amount, 0);
  const totalReceived = txns.filter(t => t.type === 'money_received').reduce((s, t) => s + t.amount, 0);
  
  // Overall liquid balance
  const balance = totalIncome + totalReceived - totalExpense - totalGiven;

  return {
    totalIncome,
    totalExpense,
    totalGiven,
    totalReceived,
    balance,
    period: periodLabel,
  };
}

/**
 * Computes person balances according to ledger debt rules.
 * Net balance > 0 means the person owes money to the user.
 * Net balance < 0 means the user owes money to the person.
 */
export function calculatePersonBalances(txns: Transaction[]): PersonBalance[] {
  const map: Record<string, { totalGiven: number; totalReceived: number; count: number; lastDate: string }> = {};

  for (const t of txns) {
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
    // netBalance > 0 means person owes user (they must repay us with money_received)
    // netBalance < 0 means user owes person (we must repay them with money_given)
    netBalance: data.totalGiven - data.totalReceived,
    transactionCount: data.count,
    lastTransactionDate: data.lastDate,
  }));
}

/**
 * Determines the correct transaction type for a debt repayment.
 * H-04 Fix:
 * - If current netBalance < 0 (user owes money to person): user is making an outgoing repayment -> type = 'money_given'
 * - If current netBalance > 0 (person owes money to user): person is making an incoming repayment -> type = 'money_received'
 */
export function determineRepaymentType(currentNetBalance: number): 'money_given' | 'money_received' {
  if (currentNetBalance < 0) {
    return 'money_given';
  }
  return 'money_received';
}

/**
 * Centralized currency formatter to prevent hardcoded PKR tooltips (M-12)
 */
export function formatCurrency(amount: number, currencyCode: string = 'PKR'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
