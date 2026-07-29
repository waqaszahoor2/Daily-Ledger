'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Eye, EyeOff,
  Plus, Minus, ArrowLeftRight, Users, ChevronRight, Search, Calendar,
  Lock, Clock, Sun, Moon
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTransactions } from '@/hooks/useTransactions';
import { useDebts } from '@/hooks/useDebts';
import { formatMoney } from '@/lib/utils/money';
import { formatDate } from '@/lib/utils/dates';
import { getCategoryById, DEFAULT_CATEGORIES } from '@/config/categories';
import { useAppStore } from '@/store/useAppStore';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import Link from 'next/link';
import type { TransactionType } from '@/types';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4 } }),
};

export default function DashboardPage() {
  const { transactions, metrics, loading } = useTransactions();
  const { personBalances } = useDebts();
  const { theme, setTheme } = useTheme();
  const settings = useAppStore((s) => s.settings);
  const setShowTransactionModal = useAppStore((s) => s.setShowTransactionModal);
  const showTransactionModal = useAppStore((s) => s.showTransactionModal);
  const setModalInitialData = useAppStore((s) => s.setModalInitialData);
  const [showBalance, setShowBalance] = useState(true);
  const [defaultType, setDefaultType] = useState<TransactionType>('expense');
  const [currentTime, setCurrentTime] = useState<string>('');
  const currency = settings.currency || 'PKR';

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }) + ' • ' + now.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      );
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const recentTxns = transactions.slice(0, 5);
  const pendingDebts = personBalances.filter((p) => p.netBalance !== 0).slice(0, 3);

  const openModalWithType = (type: TransactionType) => {
    setDefaultType(type);
    setShowTransactionModal(true);
  };

  return (
    <div className="page-container space-y-6">
      {/* Live Status & Theme Control Bar */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="flex items-center justify-between gap-3 flex-wrap bg-card/60 backdrop-blur-md border border-border p-3.5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Live Pulsing Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live
          </div>

          {/* Live Device Timestamp */}
          {currentTime && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-foreground bg-surface-hover/80 border border-border">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>{currentTime}</span>
            </div>
          )}

          {/* Encrypted Local Storage Badge */}
          <span className="badge-encrypted">
            <Lock className="w-3.5 h-3.5" /> Encrypted Local Storage
          </span>
        </div>

        {/* Dark/Light Mode Switcher */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-all active:scale-95 border border-primary/20 cursor-pointer"
          title="Toggle Light/Dark Theme"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" /> Light Mode
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-400" /> Dark Mode
            </>
          )}
        </button>
      </motion.div>

      {/* Balance Card */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
        <div className="gradient-balance rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm text-white/80">Total Balance</p>
              <button onClick={() => setShowBalance(!showBalance)} className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center">
                {showBalance ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl sm:text-4xl font-bold tracking-tight">
                  {showBalance ? formatMoney(metrics?.balance ?? 0, currency) : '••••••'}
                </p>
                <p className="text-xs text-white/60 mt-1.5">Current Month Balance</p>
              </div>
              <ChevronRight className="w-6 h-6 text-white/40" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Income / Expense Summary Cards */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2} className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs text-muted">Total Income</span>
          </div>
          <p className="text-xl font-bold text-primary">{formatMoney(metrics?.totalIncome ?? 0, currency)}</p>
          <p className="text-xs text-primary/70 mt-1">This Month</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4 text-danger" />
            </div>
            <span className="text-xs text-muted">Total Expenses</span>
          </div>
          <p className="text-xl font-bold text-danger">{formatMoney(metrics?.totalExpense ?? 0, currency)}</p>
          <p className="text-xs text-danger/70 mt-1">This Month</p>
        </div>
      </motion.div>

      {/* Money Given / Received */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-warning" />
            </div>
            <span className="text-xs text-muted">Money Given</span>
          </div>
          <p className="text-lg font-bold text-warning">{formatMoney(metrics?.totalGiven ?? 0, currency)}</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs text-muted">Money Received</span>
          </div>
          <p className="text-lg font-bold text-primary">{formatMoney(metrics?.totalReceived ?? 0, currency)}</p>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4} className="glass-card p-4">
        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => openModalWithType('expense')} className="quick-action">
            <div className="quick-action-icon bg-danger/10">
              <Minus className="w-5 h-5 text-danger" />
            </div>
            <span className="text-xs font-medium text-foreground">Expense</span>
          </button>
          <button onClick={() => openModalWithType('income')} className="quick-action">
            <div className="quick-action-icon bg-primary/10">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground">Income</span>
          </button>
          <button onClick={() => openModalWithType('money_given')} className="quick-action">
            <div className="quick-action-icon bg-warning/10">
              <ArrowLeftRight className="w-5 h-5 text-warning" />
            </div>
            <span className="text-xs font-medium text-foreground">Given</span>
          </button>
          <button onClick={() => openModalWithType('money_received')} className="quick-action">
            <div className="quick-action-icon bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground">Received</span>
          </button>
        </div>
      </motion.div>

      {/* Debt Reminders Card (Matching Reference Design) */}
      {pendingDebts.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4.5} className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title">Debt Reminders</h3>
            <Link href="/dashboard/debts" className="text-xs font-medium text-primary flex items-center gap-1 hover:underline">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {pendingDebts.map((debt) => {
              const owesYou = debt.netBalance > 0;
              return (
                <div key={debt.personName} className="flex items-center justify-between p-3 rounded-xl bg-surface-hover/60">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-700 font-bold text-sm">
                      {debt.personName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{debt.personName}</p>
                      <p className="text-xs text-muted">
                        {owesYou ? `You lent ${formatMoney(debt.totalGiven, currency)}` : `You borrowed ${formatMoney(debt.totalReceived, currency)}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${owesYou ? 'text-warning' : 'text-primary'}`}>
                      {formatMoney(Math.abs(debt.netBalance), currency)}
                    </p>
                    <button
                      onClick={() => {
                        setModalInitialData({
                          personName: debt.personName,
                          type: owesYou ? 'money_received' : 'money_given',
                          categoryId: owesYou ? 'repaid_in' : 'lent',
                        });
                        setShowTransactionModal(true);
                      }}
                      className="text-[11px] font-semibold text-primary hover:underline mt-0.5"
                    >
                      {owesYou ? 'Record Repayment' : 'Record Payment'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Recent Transactions */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5} className="glass-card">
        <div className="flex items-center justify-between p-4 pb-2">
          <h3 className="section-title">Recent Transactions</h3>
          <a href="/dashboard/transactions" className="text-xs font-medium text-primary flex items-center gap-1 hover:underline">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted text-sm">Loading...</div>
        ) : recentTxns.length === 0 ? (
          <div className="empty-state py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <ArrowLeftRight className="w-8 h-8 text-primary/40" />
            </div>
            <h4 className="font-semibold text-foreground mb-1">No Transactions Yet</h4>
            <p className="text-sm text-muted mb-4">Start by recording your first income or expense</p>
            <button onClick={() => openModalWithType('expense')} className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> Add First Transaction
            </button>
          </div>
        ) : (
          <div className="px-2 pb-2">
            {recentTxns.map((tx) => {
              const cat = getCategoryById(tx.categoryId);
              const isPositive = tx.type === 'income' || tx.type === 'money_received';
              return (
                <div key={tx.id} className="transaction-row">
                  <div className="category-icon" style={{ background: `${cat?.color}15` }}>
                    {cat?.icon || '📌'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {tx.personName || cat?.name || 'Transaction'}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {cat?.name}{tx.notes ? ` • ${tx.notes}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${isPositive ? 'text-primary' : 'text-danger'}`}>
                      {isPositive ? '+' : '-'}{formatMoney(tx.amount, currency)}
                    </p>
                    <p className="text-xs text-muted">{formatDate(tx.date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Floating Add Button (Mobile) */}
      <button
        onClick={() => openModalWithType('expense')}
        className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 w-14 h-14 rounded-full gradient-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center hover:shadow-xl hover:shadow-primary/40 transition-all active:scale-95 z-30"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Transaction Modal */}
      {showTransactionModal && (
        <TransactionModal defaultType={defaultType} />
      )}
    </div>
  );
}
