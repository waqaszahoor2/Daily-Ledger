// ============================================================
// DailyLedger — types/index.ts
// All shared TypeScript types
// ============================================================

export type TransactionType = 'income' | 'expense' | 'money_given' | 'money_received';

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType | 'all';
};

export type Transaction = {
  id: string;
  userId?: string;
  type: TransactionType;
  amount: number; // stored in minor units (integer × 100)
  categoryId: string;
  personName?: string;
  notes?: string;
  date: string; // ISO date string YYYY-MM-DD
  time: string; // HH:MM
  createdAt: string;
  updatedAt: string;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  image?: string;
  createdAt: string;
};

export type DriveConfig = {
  connected: boolean;
  folderId?: string;
  folderName?: string;
  lastBackupAt?: string;
  fileId?: string;
};

export type AppSettings = {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  driveConfig: DriveConfig;
  driveSkipped: boolean;
};

export type DashboardMetrics = {
  totalIncome: number;
  totalExpense: number;
  totalGiven: number;
  totalReceived: number;
  balance: number;
  period: 'today' | 'week' | 'month' | 'all';
};

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type ChartDataPoint = {
  label: string;
  income: number;
  expense: number;
};

export type CategoryBreakdown = {
  categoryId: string;
  categoryName: string;
  color: string;
  amount: number;
  percentage: number;
};

export type PersonBalance = {
  personName: string;
  totalGiven: number;
  totalReceived: number;
  netBalance: number; // totalGiven - totalReceived (positive means they owe you, negative means you owe them)
  transactionCount: number;
  lastTransactionDate: string;
};
