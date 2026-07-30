'use client';

// ============================================================
// DailyLedger — app/dashboard/reports/page.tsx
// Financial analytics, yearly reporting, and safe CSV/Excel/PDF exports.
// PDF export uses jsPDF for real binary PDF generation (XSS-safe).
// Excel export generates valid OOXML .xlsx files.
// ============================================================

import { useState, useMemo } from 'react';
import { BarChart3, PieChart, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';
import { useTransactions } from '@/hooks/useTransactions';
import { getCategoryById } from '@/config/categories';
import { formatMoney, fromMinorUnits } from '@/lib/utils/money';
import { getMonthRange, getWeekRange, todayISO } from '@/lib/utils/dates';
import { useAppStore } from '@/store/useAppStore';
import { formatCurrency } from '@/lib/domain/ledger';
import { generateXlsxBuffer } from '@/lib/utils/xlsx';
import jsPDF from 'jspdf';
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

/**
 * Sanitizes plain text input for PDF generation, removing null bytes or control characters
 */
function sanitizePlainText(val: string): string {
  if (!val) return '';
  return val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
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

  // Safe Genuine Excel (.xlsx) Export
  const handleExportExcel = async () => {
    if (filteredTxns.length === 0) {
      toast.error('No transactions available for export in this period');
      return;
    }

    try {
      const columns = [
        { header: 'ID', key: 'id', type: 'string' as const },
        { header: 'Date', key: 'date', type: 'string' as const },
        { header: 'Time', key: 'time', type: 'string' as const },
        { header: 'Type', key: 'type', type: 'string' as const },
        { header: 'Category', key: 'category', type: 'string' as const },
        { header: 'Person Name', key: 'personName', type: 'string' as const },
        { header: `Amount (${currency})`, key: 'amount', type: 'number' as const },
        { header: 'Notes', key: 'notes', type: 'string' as const },
      ];

      const rows = filteredTxns.map((t) => {
        const cat = getCategoryById(t.categoryId);
        return {
          id: t.id,
          date: t.date,
          time: t.time || '',
          type: t.type,
          category: cat?.name || t.categoryId,
          personName: t.personName || '',
          amount: t.amount / 100,
          notes: t.notes || '',
        };
      });

      const buffer = await generateXlsxBuffer(columns, rows);
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dailyledger_report_${period}_${todayISO()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Excel (.xlsx) Report exported successfully!');
    } catch (err) {
      console.error('Excel export error:', err);
      toast.error('Failed to generate Excel report');
    }
  };

  // Safe Genuine Binary PDF Export (jsPDF — no innerHTML/XSS vulnerability)
  const handleExportPDF = () => {
    if (filteredTxns.length === 0) {
      toast.error('No transactions available for export in this period');
      return;
    }

    try {
      const doc = new jsPDF();

      // Title & Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('DailyLedger Financial Report', 14, 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        `Period: ${period.toUpperCase()}  |  Generated: ${new Date().toLocaleString()}`,
        14,
        28
      );

      // Table Header
      let y = 40;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0);

      doc.text('Date', 14, y);
      doc.text('Type', 42, y);
      doc.text('Category', 75, y);
      doc.text('Person / Notes', 115, y);
      doc.text(`Amount (${currency})`, 195, y, { align: 'right' });

      doc.setDrawColor(200);
      doc.line(14, y + 2, 195, y + 2);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      // Rows
      filteredTxns.forEach((t) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }

        const cat = getCategoryById(t.categoryId);
        const safeDate = sanitizePlainText(t.date);
        const safeType = sanitizePlainText(t.type);
        const safeCat = sanitizePlainText(cat?.name || t.categoryId);
        const safePersonNotes = sanitizePlainText(
          [t.personName, t.notes].filter(Boolean).join(' - ') || '-'
        );
        const safeAmount = (t.amount / 100).toFixed(2);

        doc.text(safeDate, 14, y);
        doc.text(safeType, 42, y);
        doc.text(safeCat.slice(0, 18), 75, y);
        doc.text(safePersonNotes.slice(0, 35), 115, y);
        doc.text(safeAmount, 195, y, { align: 'right' });

        y += 6;
      });

      doc.save(`dailyledger_report_${period}_${todayISO()}.pdf`);
      toast.success('Genuine PDF Report generated & downloaded!');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Failed to generate PDF report');
    }
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
          <p className="text-sm text-muted mt-1">Financial analytics &amp; insights</p>
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
              title="Export report as Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> Excel (.xlsx)
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-surface-hover text-foreground flex items-center gap-1.5 transition cursor-pointer"
              title="Export report as genuine PDF"
            >
              <FileText className="w-3.5 h-3.5 text-amber-500" /> PDF (.pdf)
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
