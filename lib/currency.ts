// Single source of truth for currency — swap this out when the API provides it
export const DEFAULT_CURRENCY = {
  code: 'PKR',
  symbol: '₨',
  name: 'Pakistani Rupee',
}

export function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0' : n.toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

export function money(val: string | number | undefined): string {
  return `${DEFAULT_CURRENCY.symbol} ${fmt(val)}`
}

// Backward-compatible alias
export const CURRENCY_SYMBOL = DEFAULT_CURRENCY.symbol
