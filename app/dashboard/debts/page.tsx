'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, ArrowDownRight, ArrowUpRight, CheckCircle2, ChevronRight, Search, HandCoins } from 'lucide-react';
import { useDebts } from '@/hooks/useDebts';
import { useAppStore } from '@/store/useAppStore';
import { formatMoney } from '@/lib/utils/money';
import { formatDate } from '@/lib/utils/dates';
import { TransactionModal } from '@/components/transactions/TransactionModal';

export default function DebtsPage() {
  const { personBalances, totalOutstandingLent, totalOutstandingBorrowed, loading } = useDebts();
  const setShowModal = useAppStore((s) => s.setShowTransactionModal);
  const showModal = useAppStore((s) => s.showTransactionModal);
  const setModalInitialData = useAppStore((s) => s.setModalInitialData);
  const settings = useAppStore((s) => s.settings);

  const [searchQuery, setSearchQuery] = useState('');
  const currency = settings.currency || 'PKR';

  const filteredPeople = personBalances.filter((p) =>
    p.personName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRecordRepayment = (personName: string, netBalance: number) => {
    const owesYou = netBalance > 0;
    setModalInitialData({
      personName,
      type: owesYou ? 'money_received' : 'money_given',
      categoryId: owesYou ? 'repaid_in' : 'repaid_out',
    });
    setShowModal(true);
  };

  const handleLendMore = (personName: string) => {
    setModalInitialData({
      personName,
      type: 'money_given',
      categoryId: 'lent',
    });
    setShowModal(true);
  };

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Debts & Lending</h2>
          <p className="text-sm text-muted mt-1">Track money given to and received from people</p>
        </div>
        <button
          onClick={() => {
            setModalInitialData({ type: 'money_given', categoryId: 'lent' });
            setShowModal(true);
          }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> Give Money
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-warning/10 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-warning" />
            </div>
            <div>
              <span className="text-xs text-muted block">You Lent (To Receive)</span>
              <span className="text-xs font-semibold text-warning">Total Outstanding</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-warning mt-2">
            {formatMoney(totalOutstandingLent, currency)}
          </p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-xs text-muted block">You Borrowed (To Pay)</span>
              <span className="text-xs font-semibold text-primary">Total Outstanding</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-primary mt-2">
            {formatMoney(totalOutstandingBorrowed, currency)}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by person name..."
          className="input-field pl-10"
        />
      </div>

      {/* People Debt Cards List */}
      <div className="space-y-4">
        {loading ? (
          <div className="glass-card p-12 text-center text-muted">Loading debt records...</div>
        ) : filteredPeople.length === 0 ? (
          <div className="glass-card empty-state py-16">
            <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mb-4">
              <HandCoins className="w-8 h-8 text-warning/40" />
            </div>
            <h4 className="font-semibold text-foreground mb-1">No Debt Records Found</h4>
            <p className="text-sm text-muted mb-4">
              {searchQuery ? 'No person matches your search' : 'Record money given to or received from people'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => {
                  setModalInitialData({ type: 'money_given', categoryId: 'lent' });
                  setShowModal(true);
                }}
                className="btn-primary text-sm"
              >
                <Plus className="w-4 h-4" /> Add First Debt Entry
              </button>
            )}
          </div>
        ) : (
          filteredPeople.map((person) => {
            const owesYou = person.netBalance > 0;
            const youOwe = person.netBalance < 0;
            const isSettled = person.netBalance === 0;

            return (
              <motion.div
                key={person.personName}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-5 space-y-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-700 font-bold text-lg">
                      {person.personName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{person.personName}</h3>
                      <p className="text-xs text-muted">
                        {person.transactionCount} transaction{person.transactionCount > 1 ? 's' : ''} • Last activity: {formatDate(person.lastTransactionDate)}
                      </p>
                    </div>
                  </div>

                  {/* Net Status Badge */}
                  <div className="text-right">
                    {owesYou && (
                      <div>
                        <span className="text-xs font-semibold text-warning bg-warning/10 px-3 py-1 rounded-full inline-block">
                          Pending Owed to You
                        </span>
                        <p className="text-lg font-bold text-warning mt-1">
                          {formatMoney(person.netBalance, currency)}
                        </p>
                      </div>
                    )}
                    {youOwe && (
                      <div>
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full inline-block">
                          You Owe
                        </span>
                        <p className="text-lg font-bold text-primary mt-1">
                          {formatMoney(Math.abs(person.netBalance), currency)}
                        </p>
                      </div>
                    )}
                    {isSettled && (
                      <div>
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Fully Settled
                        </span>
                        <p className="text-sm font-medium text-muted mt-1">PKR 0.00</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Breakdown Stats */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-hover/50 text-xs">
                  <div>
                    <span className="text-muted block">Total Money Given:</span>
                    <span className="font-semibold text-foreground">{formatMoney(person.totalGiven, currency)}</span>
                  </div>
                  <div>
                    <span className="text-muted block">Total Money Repaid:</span>
                    <span className="font-semibold text-foreground">{formatMoney(person.totalReceived, currency)}</span>
                  </div>
                </div>

                {/* Quick Repayment & Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
                  <button
                    onClick={() => handleRecordRepayment(person.personName, person.netBalance)}
                    className="btn-primary flex-1 py-2 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> {owesYou ? 'Record Repayment (Received)' : 'Record Payment (Pay Back)'}
                  </button>
                  <button
                    onClick={() => handleLendMore(person.personName)}
                    className="btn-secondary flex-1 py-2 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Give More Money
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {showModal && <TransactionModal />}
    </div>
  );
}
