'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, ArrowLeftRight, Users } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useTransactions } from '@/hooks/useTransactions';
import { getCategoriesByType } from '@/config/categories';
import { toMinorUnits } from '@/lib/utils/money';
import { todayISO, nowTime } from '@/lib/utils/dates';
import { toast } from 'sonner';
import type { TransactionType } from '@/types';

const typeConfig: Record<TransactionType, { label: string; color: string; icon: typeof Plus }> = {
  income: { label: 'Income', color: 'text-primary bg-primary/10', icon: Plus },
  expense: { label: 'Expense', color: 'text-danger bg-danger/10', icon: Minus },
  money_given: { label: 'Money Given', color: 'text-warning bg-warning/10', icon: ArrowLeftRight },
  money_received: { label: 'Money Received', color: 'text-primary bg-primary/10', icon: Users },
};

export function TransactionModal({ defaultType = 'expense' }: { defaultType?: TransactionType }) {
  const setShow = useAppStore((s) => s.setShowTransactionModal);
  const editingTx = useAppStore((s) => s.editingTransaction);
  const setEditingTx = useAppStore((s) => s.setEditingTransaction);
  const modalInitialData = useAppStore((s) => s.modalInitialData);
  const setModalInitialData = useAppStore((s) => s.setModalInitialData);
  const { addTransaction, updateTransaction } = useTransactions();

  const initialType = editingTx?.type || modalInitialData?.type || defaultType;
  const initialCategory = editingTx?.categoryId || modalInitialData?.categoryId || (initialType === 'money_given' ? 'lent' : initialType === 'money_received' ? 'repaid_in' : '');

  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState(editingTx ? String(editingTx.amount / 100) : '');
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [personName, setPersonName] = useState(editingTx?.personName || modalInitialData?.personName || '');
  const [notes, setNotes] = useState(editingTx?.notes || '');
  const [date, setDate] = useState(editingTx?.date || todayISO());
  const [time, setTime] = useState(editingTx?.time || nowTime());
  const [saving, setSaving] = useState(false);

  const categories = getCategoriesByType(type);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'money_given') setCategoryId('lent');
    else if (newType === 'money_received') setCategoryId('repaid_in');
    else setCategoryId('');
  };

  const handleClose = () => {
    setEditingTx(null);
    setModalInitialData(null);
    setShow(false);
  };

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!categoryId) {
      toast.error('Please select a category');
      return;
    }
    if ((type === 'money_given' || type === 'money_received') && !personName.trim()) {
      toast.error('Please enter the person name');
      return;
    }

    setSaving(true);
    try {
      const txData = {
        type,
        amount: toMinorUnits(parseFloat(amount)),
        categoryId,
        personName: personName.trim() || undefined,
        notes: notes.trim() || undefined,
        date,
        time,
      };

      if (editingTx) {
        await updateTransaction(editingTx.id, txData);
        toast.success('Transaction updated');
      } else {
        await addTransaction(txData);
        toast.success('Transaction saved');
      }
      handleClose();
    } catch {
      toast.error('Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card rounded-t-3xl z-10">
            <h2 className="text-lg font-semibold text-foreground">
              {editingTx ? 'Edit Transaction' : 'New Transaction'}
            </h2>
            <button onClick={handleClose} className="p-2 rounded-xl hover:bg-surface-hover transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Type Selector */}
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(typeConfig) as TransactionType[]).map((t) => {
                const cfg = typeConfig[t];
                const isActive = type === t;
                return (
                  <button
                    key={t}
                    onClick={() => handleTypeChange(t)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all text-xs font-medium ${
                      isActive
                        ? `${cfg.color} ring-2 ring-current/20`
                        : 'bg-surface-hover text-muted hover:bg-surface'
                    }`}
                  >
                    <cfg.icon className="w-5 h-5" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Amount *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted">PKR</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="input-field pl-14 text-lg font-semibold"
                  step="0.01"
                  min="0"
                  autoFocus
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Category *</label>
              <div
                className={`grid gap-2 ${
                  categories.length <= 2
                    ? 'grid-cols-2'
                    : categories.length === 3
                    ? 'grid-cols-3'
                    : 'grid-cols-3 sm:grid-cols-4'
                }`}
              >
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-all ${
                      categoryId === cat.id
                        ? 'bg-primary/10 text-primary ring-2 ring-primary/20 font-semibold'
                        : 'bg-surface-hover text-muted hover:bg-surface'
                    }`}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-xs font-medium text-center leading-tight break-words w-full">
                      {cat.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Person Name — shown for Money Given / Received */}
            {(type === 'money_given' || type === 'money_received') && (
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Person Name *</label>
                <input
                  type="text"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="e.g. Ali Raza"
                  className="input-field"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a note..."
                className="input-field"
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Time</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input-field" />
              </div>
            </div>

            {/* Save Button */}
            <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-3.5 text-base">
              {saving ? 'Saving...' : editingTx ? 'Update Transaction' : 'Save Transaction'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
