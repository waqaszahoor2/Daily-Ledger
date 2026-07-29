// ============================================================
// DailyLedger — config/categories.ts
// Default system categories
// ============================================================

import { Category } from '@/types';

export const DEFAULT_CATEGORIES: Category[] = [
  // Income categories
  { id: 'salary',      name: 'Salary',        icon: '💼', color: '#22c55e', type: 'income' },
  { id: 'freelance',   name: 'Freelance',      icon: '💻', color: '#16a34a', type: 'income' },
  { id: 'business',    name: 'Business',       icon: '📊', color: '#15803d', type: 'income' },
  { id: 'gift_in',     name: 'Gift Received',  icon: '🎁', color: '#86efac', type: 'income' },
  { id: 'other_in',    name: 'Other Income',   icon: '💰', color: '#4ade80', type: 'income' },

  // Expense categories
  { id: 'food',        name: 'Food & Dining',  icon: '🍽️', color: '#ef4444', type: 'expense' },
  { id: 'transport',   name: 'Transport',      icon: '🚗', color: '#f97316', type: 'expense' },
  { id: 'utilities',   name: 'Utilities',      icon: '⚡', color: '#eab308', type: 'expense' },
  { id: 'shopping',    name: 'Shopping',       icon: '🛒', color: '#a855f7', type: 'expense' },
  { id: 'health',      name: 'Health',         icon: '🏥', color: '#ec4899', type: 'expense' },
  { id: 'education',   name: 'Education',      icon: '📚', color: '#3b82f6', type: 'expense' },
  { id: 'rent',        name: 'Rent',           icon: '🏠', color: '#78716c', type: 'expense' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#06b6d4', type: 'expense' },
  { id: 'other_exp',   name: 'Other Expense',  icon: '📌', color: '#94a3b8', type: 'expense' },

  // Money Given / Received
  { id: 'lent',        name: 'Money Lent',     icon: '🤝', color: '#f59e0b', type: 'money_given' },
  { id: 'repaid_out',  name: 'Repaid to Others', icon: '↩️', color: '#d97706', type: 'money_given' },
  { id: 'borrowed',    name: 'Money Borrowed', icon: '🙏', color: '#10b981', type: 'money_received' },
  { id: 'repaid_in',   name: 'Received Back',  icon: '↪️', color: '#059669', type: 'money_received' },
];

export function getCategoryById(id: string): Category | undefined {
  return DEFAULT_CATEGORIES.find(c => c.id === id);
}

export function getCategoriesByType(type: string): Category[] {
  if (type === 'all') return DEFAULT_CATEGORIES;
  return DEFAULT_CATEGORIES.filter(c => c.type === type || c.type === 'all');
}
