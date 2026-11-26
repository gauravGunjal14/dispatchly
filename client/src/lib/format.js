import { DEFAULT_CURRENCY, CURRENCY_LOCALES } from './config';

// Centralized formatting helper for currency and timestamps

const CURRENCY_STORAGE_KEY = 'dispatchly_platform_currency';
let platformCurrency = DEFAULT_CURRENCY;

export function setPlatformCurrency(currencyCode) {
  if (!currencyCode || typeof currencyCode !== 'string') return;
  const normalized = currencyCode.trim().toUpperCase();
  platformCurrency = normalized;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, normalized);
    } catch {
      // Ignore storage errors
    }
  }
}

export function getPlatformCurrency() {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (stored) {
        platformCurrency = stored.toUpperCase();
      }
    } catch {
      // Ignore storage errors
    }
  }
  return platformCurrency || DEFAULT_CURRENCY;
}

export function getLocaleForCurrency(currencyCode) {
  const code = (currencyCode || getPlatformCurrency() || DEFAULT_CURRENCY).toUpperCase();
  return CURRENCY_LOCALES[code] || 'en-US';
}

export function formatMoney(amount, currency) {
  const resolvedCurrency = (currency || getPlatformCurrency() || DEFAULT_CURRENCY).toUpperCase();
  const locale = getLocaleForCurrency(resolvedCurrency);
  const numericAmount = Number(amount);

  if (amount === undefined || amount === null || Number.isNaN(numericAmount)) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: resolvedCurrency,
      minimumFractionDigits: resolvedCurrency === 'INR' ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(0);
  }

  const isWholeInr = resolvedCurrency === 'INR' && Number.isInteger(numericAmount);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: resolvedCurrency,
    minimumFractionDigits: isWholeInr ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
