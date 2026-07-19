// Currency comes from the logged-in tenant (login response → mudir_session in
// localStorage: tenant.currency / tenant.currencySymbol, e.g. PKR / ₨).
// Falls back to PKR when no session exists (login screen, SSR).
export const DEFAULT_CURRENCY = {
  code: 'PKR',
  symbol: '₨',
  name: 'Pakistani Rupee',
}

const SESSION_KEY = 'mudir_session'

// Cheap memo: re-parse the session only when the raw string actually changes
// (money() runs hundreds of times per table render).
let lastRaw: string | null = null
let cached: { code: string; symbol: string } = DEFAULT_CURRENCY

function tenantCurrency(): { code: string; symbol: string } {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY
  const raw = localStorage.getItem(SESSION_KEY)
  if (raw === lastRaw) return cached
  lastRaw = raw
  cached = DEFAULT_CURRENCY
  if (raw) {
    try {
      const tenant = JSON.parse(raw)?.tenant
      if (tenant?.currency || tenant?.currencySymbol) {
        cached = {
          code: tenant.currency ?? DEFAULT_CURRENCY.code,
          symbol: tenant.currencySymbol ?? tenant.currency ?? DEFAULT_CURRENCY.symbol,
        }
      }
    } catch {
      // Corrupt session — keep the default.
    }
  }
  return cached
}

export function currencyCode(): string {
  return tenantCurrency().code
}

export function currencySymbol(): string {
  return tenantCurrency().symbol
}

export function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0' : n.toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

export function money(val: string | number | undefined): string {
  return `${tenantCurrency().symbol} ${fmt(val)}`
}

// Backward-compatible alias (static default — prefer currencySymbol())
export const CURRENCY_SYMBOL = DEFAULT_CURRENCY.symbol
