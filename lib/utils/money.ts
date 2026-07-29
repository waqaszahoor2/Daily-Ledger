// ============================================================
// DailyLedger — lib/utils/money.ts
// Money formatting in minor units
// ============================================================

export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

export function fromMinorUnits(minorUnits: number): number {
  return minorUnits / 100;
}

export function formatMoney(minorUnits: number, currency = 'PKR'): string {
  const amount = fromMinorUnits(minorUnits);
  try {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'PKR' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function formatMoneyCompact(minorUnits: number, currency = 'PKR'): string {
  const amount = fromMinorUnits(minorUnits);
  if (amount >= 1_000_000) return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${currency} ${(amount / 1_000).toFixed(1)}K`;
  return formatMoney(minorUnits, currency);
}
