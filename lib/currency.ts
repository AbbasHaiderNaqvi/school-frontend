// Single source of truth for currency — will be replaced by API value later
export const CURRENCY_SYMBOL = 'PKR'

export function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function money(val: string | number | undefined): string {
  return `${CURRENCY_SYMBOL} ${fmt(val)}`
}
