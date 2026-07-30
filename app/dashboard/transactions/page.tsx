'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, Trash2, Pencil, ArrowUpRight, ArrowDownRight, ChevronDown } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useAppStore } from '@/store/useAppStore';
import { getCategoryById } from '@/config/categories';
import { formatMoney } from '@/lib/utils/money';
import { formatDate } from '@/lib/utils/dates';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { toast } from 'sonner';
import type { TransactionType } from '@/types';

export default function TransactionsPage() {
  const { transactions, loading, deleteTransaction, restoreTransaction, searchTransactions, filterByType } = useTransactions();
  const setShowModal = useAppStore((s) => s.setShowTransactionModal);
  const showModal = useAppStore((s) => s.showTransactionModal);
  const setEditingTx = useAppStore((s) => s.setEditingTransaction);
  const settings = useAppStore((s) => s.settings);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const currency = settings.currency || 'PKR';

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    searchTransactions(q);
  };

  const handleFilter = (type: TransactionType | 'all') => {
    setFilterType(type);
    filterByType(type);
  };

  const handleDelete = async (tx: typeof transactions[0]) => {
    await deleteTransaction(tx.id);
    toast('Transaction deleted', {
      action: {
        label: 'Undo',
        onClick: async () => {
          await restoreTransaction(tx);
          toast.success('Transaction restored');
        },
      },
      duration: 5000,
    });
  };

  const handleEdit = (tx: typeof transactions[0]) => {
    setEditingTx(tx);
    setShowModal(true);
  };

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Transactions</h2>
          <p className="text-sm text-muted mt-1">{transactions.length} total records</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add New
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search transactions..."
            className="input-field pl-10"
          />
        </div>
        <div className="relative">
          <select
            value={filterType}
            onChange={(e) => handleFilter(e.target.value as TransactionType | 'all')}
            className="select-field pr-10 min-w-[160px]"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="money_given">Money Given</option>
            <option value="money_received">Money Received</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
        </div>
      </div>

      {/* Transaction List */}
      <div className="glass-card divide-y divide-border">
        {loading ? (
          <div className="p-12 text-center text-muted">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="empty-state py-16">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Filter className="w-8 h-8 text-primary/40" />
            </div>
            <h4 className="font-semibold text-foreground mb-1">No Transactions Found</h4>
            <p className="text-sm text-muted mb-4">
              {searchQuery ? 'Try a different search term' : 'Start recording your daily finances'}
            </p>
            {!searchQuery && (
              <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
                <Plus className="w-4 h-4" /> Add First Transaction
              </button>
            )}
          </div>
        ) : (
          transactions.map((tx) => {
            const cat = getCategoryById(tx.categoryId);
            const isPositive = tx.type === 'income' || tx.type === 'money_received';
            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4 p-4 hover:bg-surface-hover transition-colors group"
              >
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
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(tx)} className="p-2 rounded-lg hover:bg-primary/10 text-muted hover:text-primary transition">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(tx)} aria-label="Delete transaction" className="p-2 rounded-lg hover:bg-danger/10 text-muted hover:text-danger transition cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
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
