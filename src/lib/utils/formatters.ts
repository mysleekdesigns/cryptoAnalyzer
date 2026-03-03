import type { SignalType } from '@/types/signals';

/**
 * Format a number as locale-aware currency
 */
export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 6 : 2,
  }).format(value);
}

/**
 * Format a number as a percentage with +/- sign and color class
 */
export function formatPercent(value: number): { text: string; colorClass: string } {
  const sign = value >= 0 ? '+' : '';
  const text = `${sign}${value.toFixed(2)}%`;
  const colorClass = value > 0 ? 'text-chart-up' : value < 0 ? 'text-chart-down' : 'text-muted-foreground';
  return { text, colorClass };
}

/**
 * Abbreviate large numbers: K, M, B, T
 */
export function formatLargeNumber(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(2)}K`;
  return `${sign}${abs.toFixed(2)}`;
}

/**
 * Format a date as relative ("2h ago") or absolute
 */
export function formatDate(date: Date | number, format: 'relative' | 'short' | 'long' = 'relative'): string {
  const d = typeof date === 'number' ? new Date(date) : date;

  if (format === 'relative') {
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    // Fall through to short format
  }

  if (format === 'short' || format === 'relative') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Map a composite score (0-100) to its signal label and Tailwind color classes
 */
export function formatSignalScore(score: number): {
  label: string;
  signalType: SignalType;
  colorClass: string;
  bgClass: string;
} {
  if (score >= 80) return { label: 'STRONG BUY', signalType: 'strong_buy', colorClass: 'text-strong-buy', bgClass: 'bg-strong-buy-muted' };
  if (score >= 60) return { label: 'BUY', signalType: 'buy', colorClass: 'text-buy', bgClass: 'bg-buy-muted' };
  if (score >= 40) return { label: 'HOLD', signalType: 'hold', colorClass: 'text-hold', bgClass: 'bg-hold-muted' };
  if (score >= 20) return { label: 'SELL', signalType: 'sell', colorClass: 'text-sell', bgClass: 'bg-sell-muted' };
  return { label: 'STRONG SELL', signalType: 'strong_sell', colorClass: 'text-strong-sell', bgClass: 'bg-strong-sell-muted' };
}
