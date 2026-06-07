import type { Language, Translations } from './i18n';

export function formatMoney(value: number, digits = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatPrice(value: number): string {
  const digits = value > 10000 ? 2 : 4;
  return formatMoney(value, digits);
}

export function parseApiDateTime(value: string): Date {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  // SQLite returns timezone-aware Python datetimes as naive strings.
  // Treat naive API datetimes as UTC, then Intl displays them in the device timezone.
  return new Date(hasTimezone ? normalized : `${normalized}Z`);
}

export function formatDateTime(value: string, language: Language = 'en'): string {
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(parseApiDateTime(value));
}

export function intervalToMs(interval: string): number {
  const map: Record<string, number> = {
    '1m': 60_000,
    '3m': 3 * 60_000,
    '5m': 5 * 60_000,
    '10m': 10 * 60_000,
    '15m': 15 * 60_000,
    '1h': 60 * 60_000,
  };
  return map[interval] ?? 0;
}

export function countdown(expiry: string, t: Translations): string {
  const ms = parseApiDateTime(expiry).getTime() - Date.now();
  if (ms <= 0) return t.settling;
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}${t.minutesSuffix} ${seconds.toString().padStart(2, '0')}s`;
}

