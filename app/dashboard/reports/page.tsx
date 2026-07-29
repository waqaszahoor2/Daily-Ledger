'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, PieChart, Calendar, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';
import { useTransactions } from '@/hooks/useTransactions';
import { getCategoryById, DEFAULT_CATEGORIES } from '@/config/categories';
import { formatMoney, fromMinorUnits } from '@/lib/utils/money';
import { getMonthRange, getWeekRange, todayISO } from '@/lib/utils/dates';
import { useAppStore } from '@/store/useAppStore';
import type { TransactionType, ReportPeriod } from '@/types';

const CHART_COLORS = ['#1a5c2e', '#b11f30', '#c48928', '#3b82f6', '#a855f7', '#ec4899', '#06b6d4', '#78716c'];

export default function ReportsPage() {
  const { transactions, loading } = useTransactions();
  const settings = useAppStore((s) => s.settings);
  const currency = settings.currency || 'PKR';
  const [period, setPeriod] = useState<ReportPeriod>('monthly');

  // Filter transactions by period
  const filteredTxns = useMemo(() => {
    const now = new Date();
    const today = todayISO();
    
    return transactions.filter((tx) => {
      if (period === 'daily') return tx.date === today;
      if (period === 'weekly') {
        const { start, end } = getWeekRange();
        return tx.date >= start && tx.date <= end;
      }
      const { start, end } = getMonthRange();
      return tx.date >= start && tx.date <= end;
    });
  }, [transactions, period]);

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

  // Category breakdown pie chart (expenses only)
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
        <div className="flex items-center gap-2 bg-surface rounded-xl p-1 border border-border">
          {(['daily', 'weekly', 'monthly'] as ReportPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                period === p ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
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
                  formatter={(value) => [`PKR ${Number(value).toLocaleString()}`, '']}
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
                  formatter={(value) => [`PKR ${Number(value).toLocaleString()}`, '']}
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
