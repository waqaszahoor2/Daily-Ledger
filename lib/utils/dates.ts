// ============================================================
// DailyLedger — lib/utils/dates.ts
// Date utility helpers
// ============================================================

import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function nowTime(): string {
  return format(new Date(), 'HH:mm');
}

export function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd MMM');
  } catch {
    return dateStr;
  }
}

export function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  return {
    start: format(startOfMonth(now), 'yyyy-MM-dd'),
    end: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
}

export function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  return {
    start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  };
}

export function getLast30Days(): { start: string; end: string } {
  return {
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: todayISO(),
  };
}
