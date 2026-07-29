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

const typeConfig: Record<TransactionType, { label: string; urdu: string; activeBg: string; activeText: string; icon: typeof Plus }> = {
  income: { label: 'Income', urdu: 'Aamdani', activeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20', activeText: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30', icon: Plus },
  expense: { label: 'Expense', urdu: 'Kharcha', activeBg: 'bg-rose-500/10 dark:bg-rose-500/20', activeText: 'text-rose-600 dark:text-rose-400 border-rose-500/30', icon: Minus },
  money_given: { label: 'Money Given', urdu: 'Udhar Diya', activeBg: 'bg-amber-500/10 dark:bg-amber-500/20', activeText: 'text-amber-600 dark:text-amber-400 border-amber-500/30', icon: ArrowLeftRight },
  money_received: { label: 'Money Received', urdu: 'Udhar Liya / Mile', activeBg: 'bg-teal-500/10 dark:bg-teal-500/20', activeText: 'text-teal-600 dark:text-teal-400 border-teal-500/30', icon: Users },
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
  const [calcMode, setCalcMode] = useState<'subtract' | 'add'>('subtract');
  const [calcAmount, setCalcAmount] = useState('');
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [personName, setPersonName] = useState(editingTx?.personName || modalInitialData?.personName || '');
  const [notes, setNotes] = useState(editingTx?.notes || '');
  const [date, setDate] = useState(editingTx?.date || todayISO());
  const [time, setTime] = useState(editingTx?.time || nowTime());
  const [saving, setSaving] = useState(false);

  const categories = getCategoriesByType(type);

  const numAmount = parseFloat(amount) || 0;
  const numCalc = parseFloat(calcAmount) || 0;

  const calculatedTotal = calcMode === 'subtract'
    ? Math.max(0, numAmount - numCalc)
    : numAmount + numCalc;

  const pctDeducted = (calcMode === 'subtract' && numAmount > 0)
    ? Math.min(100, Math.round((numCalc / numAmount) * 100))
    : 0;
  const pctRemaining = 100 - pctDeducted;

  const handleApplyCalc = () => {
    if (numCalc > 0 && numAmount >= 0) {
      setAmount(calculatedTotal.toFixed(2));
      setCalcAmount('');
      toast.success(`Updated total amount to PKR ${calculatedTotal.toFixed(2)}`);
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
                  {editingTx ? 'Edit Transaction (Indraj Edit)' : 'New Transaction (Naya Indraj)'}
                </h2>
                <p className="text-xs text-muted">
                  {editingTx ? 'Update financial ledger entry' : 'Record new income, expense or debt entry'}
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
            {/* Segmented Type Selector with Roman Urdu */}
            <div className="p-1.5 rounded-2xl bg-surface-hover/80 border border-border/60 grid grid-cols-4 gap-1">
              {(Object.keys(typeConfig) as TransactionType[]).map((t) => {
                const cfg = typeConfig[t];
                const isActive = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1.5 rounded-xl transition-all text-xs font-semibold cursor-pointer ${
                      isActive
                        ? `${cfg.activeBg} ${cfg.activeText} border shadow-sm`
                        : 'text-muted hover:text-foreground hover:bg-card/50 border border-transparent'
                    }`}
                  >
                    <cfg.icon className="w-4 h-4 mb-0.5" />
                    <span className="text-[11px] leading-none font-bold">{cfg.label}</span>
                    <span className="text-[9px] opacity-80 font-medium leading-tight text-center">({cfg.urdu})</span>
                  </button>
                );
              })}
            </div>

            {/* Amount Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  Total Amount (Kull Raqam) <span className="text-danger">*</span>
                </label>
                {amount && (
                  <button
                    type="button"
                    onClick={() => setAmount('')}
                    className="text-[11px] font-medium text-muted hover:text-foreground transition cursor-pointer"
                  >
                    Reset (Khatam)
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

              {/* Professional Plus (+) & Minus (-) Adjustment Engine */}
              <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-primary" /> Repayment & Adjustment Calculator (Hisab Kitab)
                  </span>

                  {/* Mode Switcher: Minus (-) vs Plus (+) */}
                  <div className="p-0.5 rounded-lg bg-surface-hover border border-border flex items-center gap-0.5 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => { setCalcMode('subtract'); setCalcAmount(''); }}
                      className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                        calcMode === 'subtract'
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      <Minus className="w-3 h-3" /> Deduct (Wapas Mile)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCalcMode('add'); setCalcAmount(''); }}
                      className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                        calcMode === 'add'
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      <Plus className="w-3 h-3" /> Add (Lend More / Diye)
                    </button>
                  </div>
                </div>

                {/* Quick Action Shortcut Buttons */}
                {numAmount > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-muted font-medium">Quick Options:</span>
                    {calcMode === 'subtract' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setCalcAmount((numAmount / 2).toFixed(2))}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition cursor-pointer"
                        >
                          − 50% (Aadha)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCalcAmount((numAmount * 0.25).toFixed(2))}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-surface-hover text-muted hover:bg-surface border border-border/60 transition cursor-pointer"
                        >
                          − 25%
                        </button>
                        <button
                          type="button"
                          onClick={() => setCalcAmount((numAmount * 0.75).toFixed(2))}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-surface-hover text-muted hover:bg-surface border border-border/60 transition cursor-pointer"
                        >
                          − 75%
                        </button>
                        <button
                          type="button"
                          onClick={() => setCalcAmount(numAmount.toFixed(2))}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition cursor-pointer"
                        >
                          − Full (100% Wapas)
                        </button>
                      </>
                    ) : (
                      <>
                        {[100, 500, 1000, 5000].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setCalcAmount(String(val))}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition cursor-pointer"
                          >
                            + PKR {val}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* Amount Input for Adjustment */}
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
                    {calcMode === 'subtract' ? 'Deduct PKR' : 'Add PKR'}
                  </span>
                  <input
                    type="number"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(e.target.value)}
                    placeholder={calcMode === 'subtract' ? 'Enter amount repaid or returned (Kitne wapas mile)...' : 'Enter additional amount given (Kitne mazeed diye)...'}
                    className="w-full h-11 pl-28 pr-16 text-sm font-semibold bg-surface-hover/50 border border-border hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/10 rounded-xl outline-none transition-all text-foreground"
                    step="0.01"
                    min="0"
                  />
                  {calcAmount && (
                    <button
                      type="button"
                      onClick={() => setCalcAmount('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted hover:text-foreground cursor-pointer px-1.5 py-0.5 rounded bg-surface border border-border"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Calculation Result Preview Box */}
                {numCalc > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl bg-surface-hover/70 border border-primary/25 space-y-2.5"
                  >
                    {/* Visual Progress Split Bar for Subtract */}
                    {calcMode === 'subtract' && numAmount > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-medium text-muted">
                          <span>Wapas Mile ({pctDeducted}%)</span>
                          <span>Baqaya ({pctRemaining}%)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-surface overflow-hidden flex">
                          <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${pctDeducted}%` }} />
                          <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${pctRemaining}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="p-2 rounded-lg bg-card border border-border">
                        <p className="text-[10px] text-muted font-medium">Asal Raqam (Original)</p>
                        <p className="font-bold text-foreground">PKR {numAmount.toFixed(2)}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-card border border-border">
                        <p className="text-[10px] text-muted font-medium">
                          {calcMode === 'subtract' ? 'Wapas Lautayi (Deducted)' : 'Mazeed Diye (Added)'}
                        </p>
                        <p className={`font-bold ${calcMode === 'subtract' ? 'text-danger' : 'text-emerald-500'}`}>
                          {calcMode === 'subtract' ? '−' : '+'} PKR {numCalc.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
                      <span className="font-semibold text-foreground">Naya Baqaya (New Total):</span>
                      <span className="font-extrabold text-primary text-base">PKR {calculatedTotal.toFixed(2)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyCalc}
                      className="w-full py-2.5 px-3 rounded-xl gradient-primary text-white text-xs font-bold hover:shadow-lg hover:shadow-primary/20 transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer border border-primary/30"
                    >
                      <Check className="w-4 h-4" /> Apply New Total (Nayi Raqam Set Karein: PKR {calculatedTotal.toFixed(2)})
                    </button>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Category Section */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                Category (Qisam) <span className="text-danger">*</span>
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
                  <span>Person Name (Bande Ka Naam) <span className="text-danger">*</span></span>
                  <span className="text-[11px] text-muted font-normal">Kiske sath hisab hai?</span>
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
                    <span className="text-[10px] text-muted font-medium">Recent Contacts (Purane Naam):</span>
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
              <label className="text-xs font-semibold text-foreground">Notes / Tafseel (optional)</label>
              <div className="relative">
                <FileText className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Koi khas wazahat ya tafseel likhein..."
                  className="w-full h-11 pl-10 pr-4 text-sm font-medium bg-card border border-border hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/10 rounded-xl outline-none transition-all text-foreground"
                />
              </div>
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted" /> Date (Tareekh)
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
                  <Clock className="w-3.5 h-3.5 text-muted" /> Time (Waqt)
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
                'Update Ledger Entry (Indraj Update Karein)'
              ) : (
                'Save Ledger Entry (Indraj Mahfooz Karein)'
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
