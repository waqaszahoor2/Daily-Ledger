// ============================================================
// DailyLedger — app/dashboard/reports/page.tsx
// Financial analytics, yearly reporting, and safe CSV/Excel/PDF exports
// ============================================================

'use client';

import { useState, useMemo } from 'react';
import { BarChart3, PieChart, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';
import { useTransactions } from '@/hooks/useTransactions';
import { getCategoryById } from '@/config/categories';
import { formatMoney, fromMinorUnits } from '@/lib/utils/money';
import { getMonthRange, getWeekRange, todayISO } from '@/lib/utils/dates';
import { useAppStore } from '@/store/useAppStore';
import { formatCurrency } from '@/lib/domain/ledger';
import { toast } from 'sonner';
import type { ReportPeriod } from '@/types';

const CHART_COLORS = ['#1a5c2e', '#b11f30', '#c48928', '#3b82f6', '#a855f7', '#ec4899', '#06b6d4', '#78716c'];

/**
 * Escapes values to prevent CSV spreadsheet formula injection (=, +, -, @)
 */
function sanitizeCsvCell(val: string): string {
  if (!val) return '""';
  const clean = val.replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(clean)) {
    return `"'${clean}"`;
  }
  return `"${clean}"`;
}

export default function ReportsPage() {
  const { transactions } = useTransactions();
  const settings = useAppStore((s) => s.settings);
  const currency = settings.currency || 'PKR';
  const [period, setPeriod] = useState<ReportPeriod>('monthly');

  // Filter transactions by period (daily, weekly, monthly, yearly)
  const filteredTxns = useMemo(() => {
    const now = new Date();
    const today = todayISO();
    const currentYear = now.getFullYear().toString();

    return transactions.filter((tx) => {
      if (period === 'daily') return tx.date === today;
      if (period === 'weekly') {
        const { start, end } = getWeekRange();
        return tx.date >= start && tx.date <= end;
      }
      if (period === 'yearly') {
        return tx.date.startsWith(currentYear);
      }
      const { start, end } = getMonthRange();
      return tx.date >= start && tx.date <= end;
    });
  }, [transactions, period]);

  // Safe CSV Export
  const handleExportCSV = () => {
    if (filteredTxns.length === 0) {
      toast.error('No transactions available for export in this period');
      return;
    }

    const headers = ['ID', 'Date', 'Time', 'Type', 'Category', 'Person Name', 'Amount', 'Notes'];
    const rows = filteredTxns.map((t) => {
      const cat = getCategoryById(t.categoryId);
      return [
        sanitizeCsvCell(t.id),
        sanitizeCsvCell(t.date),
        sanitizeCsvCell(t.time || ''),
        sanitizeCsvCell(t.type),
        sanitizeCsvCell(cat?.name || t.categoryId),
        sanitizeCsvCell(t.personName || ''),
        (t.amount / 100).toFixed(2),
        sanitizeCsvCell(t.notes || ''),
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dailyledger_report_${period}_${todayISO()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('CSV Report exported safely!');
  };

  // Safe Excel Export
  const handleExportExcel = () => {
    if (filteredTxns.length === 0) {
      toast.error('No transactions available for export in this period');
      return;
    }

    const headers = ['ID', 'Date', 'Time', 'Type', 'Category', 'Person Name', `Amount (${currency})`, 'Notes'];
    const rows = filteredTxns.map((t) => {
      const cat = getCategoryById(t.categoryId);
      return [
        t.id,
        t.date,
        t.time || '',
        t.type,
        cat?.name || t.categoryId,
        t.personName || '',
        (t.amount / 100).toFixed(2),
        t.notes || '',
      ].join('\t');
    });

    const content = [headers.join('\t'), ...rows].join('\n');
    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dailyledger_report_${period}_${todayISO()}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success('Excel Report exported successfully!');
  };

  // PDF Export
  const handleExportPDF = () => {
    if (filteredTxns.length === 0) {
      toast.error('No transactions available for export in this period');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Could not open print window. Please allow popups.');
      return;
    }

    const rowsHtml = filteredTxns
      .map((t) => {
        const cat = getCategoryById(t.categoryId);
        return `<tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${t.date}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${t.type}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${cat?.name || t.categoryId}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${t.personName || '-'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrency(t.amount / 100, currency)}</td>
        </tr>`;
      })
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>DailyLedger Financial Report - ${period.toUpperCase()}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 24px; margin-bottom: 4px; }
            p { color: #555; font-size: 14px; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
            th { background: #f3f4f6; text-align: left; padding: 10px; border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <h1>DailyLedger Financial Report</h1>
          <p>Period: ${period.toUpperCase()} • Generated: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Person</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
    toast.success('PDF Print Report generated!');
  };

  // Summary metrics
  const income = filteredTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = filteredTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const given = filteredTxns.filter(t => t.type === 'money_given').reduce((s, t) => s + t.amount, 0);
  const received = filteredTxns.filter(t => t.type === 'money_received').reduce((s, t) => s + t.amount, 0);
  const balance = income + received - expense - given;

  // Income vs Expense bar chart
  const barData = useMemo(() => {
    return [
      { name: 'Income', amount: fromMinorUnits(income), fill: '#1a5c2e' },
      { name: 'Expenses', amount: fromMinorUnits(expense), fill: '#b11f30' },
      { name: 'Given', amount: fromMinorUnits(given), fill: '#c48928' },
      { name: 'Received', amount: fromMinorUnits(received), fill: '#3b82f6' },
    ];
  }, [income, expense, given, received]);

  // Category breakdown pie chart
  const pieData = useMemo(() => {
    const catMap: Record<string, number> = {};
    filteredTxns
      .filter(t => t.type === 'expense')
      .forEach(t => {
        catMap[t.categoryId] = (catMap[t.categoryId] || 0) + t.amount;
      });

    return Object.entries(catMap).map(([catId, amount], i) => {
      const cat = getCategoryById(catId);
      return {
        name: cat?.name || 'Other',
        value: fromMinorUnits(amount),
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
  }, [filteredTxns]);

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reports</h2>
          <p className="text-sm text-muted mt-1">Financial analytics & insights</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Action Buttons */}
          <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-surface-hover text-foreground flex items-center gap-1.5 transition cursor-pointer"
              title="Export report as CSV"
            >
              <Download className="w-3.5 h-3.5 text-primary" /> CSV
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-surface-hover text-foreground flex items-center gap-1.5 transition cursor-pointer"
              title="Export report as Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-surface-hover text-foreground flex items-center gap-1.5 transition cursor-pointer"
              title="Export report as PDF / Print"
            >
              <FileText className="w-3.5 h-3.5 text-amber-500" /> PDF
            </button>
          </div>

          {/* Period Selector including Yearly */}
          <div className="flex items-center gap-1 bg-surface rounded-xl p-1 border border-border">
            {(['daily', 'weekly', 'monthly', 'yearly'] as ReportPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize cursor-pointer ${
                  period === p ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-foreground'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs text-muted">Income</span>
          </div>
          <p className="text-xl font-bold text-primary mt-2">{formatMoney(income, currency)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4 text-danger" />
            </div>
            <span className="text-xs text-muted">Expenses</span>
          </div>
          <p className="text-xl font-bold text-danger mt-2">{formatMoney(expense, currency)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-warning" />
            </div>
            <span className="text-xs text-muted">Given</span>
          </div>
          <p className="text-xl font-bold text-warning mt-2">{formatMoney(given, currency)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs text-muted">Balance</span>
          </div>
          <p className={`text-xl font-bold mt-2 ${balance >= 0 ? 'text-primary' : 'text-danger'}`}>
            {formatMoney(balance, currency)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Income vs Expense Bar Chart */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="section-title">Income vs Expense</h3>
          </div>
          {filteredTxns.length === 0 ? (
            <div className="empty-state py-12">
              <BarChart3 className="w-10 h-10 text-muted/30 mb-3" />
              <p className="text-sm text-muted">No data for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--color-muted)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--color-muted)" />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [formatCurrency(Number(value), currency), '']}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Breakdown Pie */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-primary" />
            <h3 className="section-title">Category Breakdown</h3>
          </div>
          {pieData.length === 0 ? (
            <div className="empty-state py-12">
              <PieChart className="w-10 h-10 text-muted/30 mb-3" />
              <p className="text-sm text-muted">No expense data for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <RePieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [formatCurrency(Number(value), currency), '']}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </RePieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
