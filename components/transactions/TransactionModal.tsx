'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Minus, ArrowLeftRight, Users, Calculator, Check,
  User, FileText, Calendar, Clock, Sparkles, RefreshCw
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useTransactions } from '@/hooks/useTransactions';
import { useDebts } from '@/hooks/useDebts';
import { getCategoriesByType } from '@/config/categories';
import { toMinorUnits } from '@/lib/utils/money';
import { todayISO, nowTime } from '@/lib/utils/dates';
import { toast } from 'sonner';
import type { TransactionType } from '@/types';

const typeConfig: Record<TransactionType, { label: string; activeBg: string; activeText: string; icon: typeof Plus }> = {
  income: { label: 'Income', activeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20', activeText: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30', icon: Plus },
  expense: { label: 'Expense', activeBg: 'bg-rose-500/10 dark:bg-rose-500/20', activeText: 'text-rose-600 dark:text-rose-400 border-rose-500/30', icon: Minus },
  money_given: { label: 'Money Given', activeBg: 'bg-amber-500/10 dark:bg-amber-500/20', activeText: 'text-amber-600 dark:text-amber-400 border-amber-500/30', icon: ArrowLeftRight },
  money_received: { label: 'Money Received', activeBg: 'bg-teal-500/10 dark:bg-teal-500/20', activeText: 'text-teal-600 dark:text-teal-400 border-teal-500/30', icon: Users },
};

export function TransactionModal({ defaultType = 'expense' }: { defaultType?: TransactionType }) {
  const setShow = useAppStore((s) => s.setShowTransactionModal);
  const editingTx = useAppStore((s) => s.editingTransaction);
  const setEditingTx = useAppStore((s) => s.setEditingTransaction);
  const modalInitialData = useAppStore((s) => s.modalInitialData);
  const setModalInitialData = useAppStore((s) => s.setModalInitialData);
  const { addTransaction, updateTransaction } = useTransactions();
  const { personBalances } = useDebts();

  const initialType = editingTx?.type || modalInitialData?.type || defaultType;
  const initialCategory = editingTx?.categoryId || modalInitialData?.categoryId || (initialType === 'money_given' ? 'lent' : initialType === 'money_received' ? 'repaid_in' : '');

  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState(editingTx ? String(editingTx.amount / 100) : '');
  const [deductAmount, setDeductAmount] = useState('');
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [personName, setPersonName] = useState(editingTx?.personName || modalInitialData?.personName || '');
  const [notes, setNotes] = useState(editingTx?.notes || '');
  const [date, setDate] = useState(editingTx?.date || todayISO());
  const [time, setTime] = useState(editingTx?.time || nowTime());
  const [saving, setSaving] = useState(false);

  const categories = getCategoriesByType(type);

  const numAmount = parseFloat(amount) || 0;
  const numDeduct = parseFloat(deductAmount) || 0;
  const newAmount = Math.max(0, numAmount - numDeduct);
  const pctDeducted = numAmount > 0 ? Math.min(100, Math.round((numDeduct / numAmount) * 100)) : 0;
  const pctRemaining = 100 - pctDeducted;

  const handleApplyDeduction = () => {
    if (numDeduct > 0 && numAmount > 0) {
      const updated = Math.max(0, numAmount - numDeduct);
      setAmount(updated.toFixed(2));
      setDeductAmount('');
      toast.success(`Updated total amount to PKR ${updated.toFixed(2)}`);
    }
  };

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
        toast.success('Transaction updated successfully');
      } else {
        await addTransaction(txData);
        toast.success('Transaction saved successfully');
      }
      handleClose();
    } catch {
      toast.error('Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  // Recent contact names for quick selection
  const recentPersons = personBalances.map((p) => p.personName).filter(Boolean);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: '100%', opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="w-full max-w-lg bg-card rounded-t-[2rem] sm:rounded-[2rem] border border-border/80 shadow-2xl max-h-[90vh] overflow-y-auto my-auto flex flex-col"
        >
          {/* Professional Header Bar */}
          <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur-md rounded-t-[2rem] z-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground tracking-tight">
                  {editingTx ? 'Edit Transaction' : 'New Transaction'}
                </h2>
                <p className="text-xs text-muted">
                  {editingTx ? 'Update financial ledger entry' : 'Record new ledger entry'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-xl bg-surface-hover/80 hover:bg-surface border border-border/60 flex items-center justify-center text-muted hover:text-foreground transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-5 flex-1">
            {/* Segmented Type Selector */}
            <div className="p-1.5 rounded-2xl bg-surface-hover/80 border border-border/60 grid grid-cols-4 gap-1">
              {(Object.keys(typeConfig) as TransactionType[]).map((t) => {
                const cfg = typeConfig[t];
                const isActive = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl transition-all text-xs font-semibold cursor-pointer ${
                      isActive
                        ? `${cfg.activeBg} ${cfg.activeText} border shadow-sm`
                        : 'text-muted hover:text-foreground hover:bg-card/50 border border-transparent'
                    }`}
                  >
                    <cfg.icon className="w-4 h-4" />
                    <span className="text-[11px] leading-none">{cfg.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Amount Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  Total Amount <span className="text-danger">*</span>
                </label>
                {amount && (
                  <button
                    type="button"
                    onClick={() => setAmount('')}
                    className="text-[11px] font-medium text-muted hover:text-foreground transition cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Main Amount Input Hero */}
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                  <span>PKR</span>
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-14 pl-20 pr-4 text-2xl font-bold bg-card border border-border hover:border-primary/40 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl outline-none transition-all text-foreground"
                  step="0.01"
                  min="0"
                  autoFocus
                />
              </div>

              {/* Professional Partial Payment / Deduction Engine */}
              <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-primary" /> Partial Payment / Deduction Calculator
                  </span>
                  {numAmount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDeductAmount((numAmount / 2).toFixed(2))}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition cursor-pointer"
                      >
                        ½ Half (50%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeductAmount((numAmount * 0.25).toFixed(2))}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-surface-hover text-muted hover:bg-surface border border-border/60 transition cursor-pointer"
                      >
                        25%
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeductAmount((numAmount * 0.75).toFixed(2))}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-surface-hover text-muted hover:bg-surface border border-border/60 transition cursor-pointer"
                      >
                        75%
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">Deduct PKR</span>
                  <input
                    type="number"
                    value={deductAmount}
                    onChange={(e) => setDeductAmount(e.target.value)}
                    placeholder="Enter amount paid or deducted..."
                    className="w-full h-11 pl-28 pr-16 text-sm font-semibold bg-surface-hover/50 border border-border hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/10 rounded-xl outline-none transition-all text-foreground"
                    step="0.01"
                    min="0"
                  />
                  {deductAmount && (
                    <button
                      type="button"
                      onClick={() => setDeductAmount('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted hover:text-foreground cursor-pointer px-1.5 py-0.5 rounded bg-surface border border-border"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {numDeduct > 0 && numAmount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl bg-surface-hover/70 border border-primary/25 space-y-2.5"
                  >
                    {/* Visual Progress Split Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-medium text-muted">
                        <span>Deducted ({pctDeducted}%)</span>
                        <span>Remaining ({pctRemaining}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-surface overflow-hidden flex">
                        <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${pctDeducted}%` }} />
                        <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${pctRemaining}%` }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="p-2 rounded-lg bg-card border border-border">
                        <p className="text-[10px] text-muted font-medium">Original Balance</p>
                        <p className="font-bold text-foreground">PKR {numAmount.toFixed(2)}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-card border border-border">
                        <p className="text-[10px] text-muted font-medium">Payment / Deducted</p>
                        <p className="font-bold text-danger">− PKR {numDeduct.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
                      <span className="font-semibold text-foreground">New Remaining Balance:</span>
                      <span className="font-extrabold text-primary text-base">PKR {newAmount.toFixed(2)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyDeduction}
                      className="w-full py-2.5 px-3 rounded-xl gradient-primary text-white text-xs font-bold hover:shadow-lg hover:shadow-primary/20 transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer border border-primary/30"
                    >
                      <Check className="w-4 h-4" /> Apply New Amount (PKR {newAmount.toFixed(2)})
                    </button>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Category Section */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                Category <span className="text-danger">*</span>
              </label>
              <div
                className={`grid gap-2 ${
                  categories.length <= 2
                    ? 'grid-cols-2'
                    : categories.length === 3
                    ? 'grid-cols-3'
                    : 'grid-cols-3 sm:grid-cols-4'
                }`}
              >
                {categories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-primary/10 border-2 border-primary text-primary font-bold shadow-sm'
                          : 'bg-surface-hover/70 border border-border/70 text-muted hover:text-foreground hover:bg-surface'
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-xs font-semibold text-center leading-tight break-words w-full">
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Person Name (for Money Given / Received) */}
            {(type === 'money_given' || type === 'money_received') && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Person Name <span className="text-danger">*</span></span>
                  <span className="text-[11px] text-muted font-normal">Who is this transaction with?</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder="e.g. Ali Raza, Zahid Khan"
                    className="w-full h-11 pl-10 pr-4 text-sm font-medium bg-card border border-border hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/10 rounded-xl outline-none transition-all text-foreground"
                  />
                </div>
                {/* Recent Contacts Quick Chips */}
                {recentPersons.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-muted font-medium">Recent Contacts:</span>
                    {Array.from(new Set(recentPersons)).slice(0, 5).map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setPersonName(name)}
                        className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition cursor-pointer ${
                          personName === name
                            ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                            : 'bg-surface-hover border-border/60 text-muted hover:text-foreground'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Notes (optional)</label>
              <div className="relative">
                <FileText className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a detailed note or reference..."
                  className="w-full h-11 pl-10 pr-4 text-sm font-medium bg-card border border-border hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/10 rounded-xl outline-none transition-all text-foreground"
                />
              </div>
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted" /> Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-11 px-3 text-xs font-semibold bg-card border border-border hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/10 rounded-xl outline-none transition-all text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-muted" /> Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full h-11 px-3 text-xs font-semibold bg-card border border-border hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/10 rounded-xl outline-none transition-all text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Sticky Save Action Footer */}
          <div className="p-5 border-t border-border/60 bg-card/95 backdrop-blur-md rounded-b-[2rem] sticky bottom-0 z-20">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-13 rounded-2xl gradient-primary text-white text-base font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer border border-primary/30 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" /> Saving Entry...
                </>
              ) : editingTx ? (
                'Update Ledger Entry'
              ) : (
                'Save Ledger Entry'
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
