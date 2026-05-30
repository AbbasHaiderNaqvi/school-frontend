export interface Currency {
  code: string
  name: string
  symbol: string
  region: string
}

export const CURRENCIES: Currency[] = [
  // Popular International Currencies
  { code: 'USD', name: 'US Dollar', symbol: '$', region: 'United States' },
  { code: 'EUR', name: 'Euro', symbol: '€', region: 'Europe' },
  { code: 'GBP', name: 'British Pound', symbol: '£', region: 'United Kingdom' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', region: 'Japan' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', region: 'Switzerland' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', region: 'Canada' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', region: 'Australia' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', region: 'New Zealand' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', region: 'Singapore' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', region: 'Hong Kong' },
  
  // South Asian Currencies
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', region: 'Pakistan' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', region: 'India' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', region: 'Bangladesh' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', region: 'Sri Lanka' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: '₨', region: 'Nepal' },
  
  // Middle Eastern Currencies
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', region: 'United Arab Emirates' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', region: 'Saudi Arabia' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', region: 'Kuwait' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', region: 'Qatar' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع.', region: 'Oman' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب', region: 'Bahrain' },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.ا', region: 'Jordan' },
  { code: 'LBP', name: 'Lebanese Pound', symbol: 'ل.ل', region: 'Lebanon' },
  { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د', region: 'Iraq' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', region: 'Egypt' },
  { code: 'TND', name: 'Tunisian Dinar', symbol: 'د.ت', region: 'Tunisia' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.', region: 'Morocco' },
  
  // Southeast Asian Currencies
  { code: 'THB', name: 'Thai Baht', symbol: '฿', region: 'Thailand' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', region: 'Malaysia' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', region: 'Philippines' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', region: 'Indonesia' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', region: 'Vietnam' },
  
  // Other Popular Currencies
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', region: 'China' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', region: 'South Korea' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', region: 'South Africa' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', region: 'Brazil' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', region: 'Mexico' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', region: 'Turkey' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', region: 'Russia' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', region: 'Sweden' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', region: 'Norway' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', region: 'Denmark' },
]

export const currencyService = {
  getCurrency(code: string): Currency | undefined {
    return CURRENCIES.find(c => c.code === code)
  },

  getCurrencySymbol(code: string): string {
    const currency = this.getCurrency(code)
    return currency?.symbol || code
  },

  formatCurrency(amount: number, currencyCode: string): string {
    const currency = this.getCurrency(currencyCode)
    if (!currency) {
      return `${amount.toFixed(2)} ${currencyCode}`
    }
    
    return `${currency.symbol} ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  },

  getAllCurrencies(): Currency[] {
    return CURRENCIES
  },

  getCurrenciesByRegion(region: string): Currency[] {
    return CURRENCIES.filter(c => c.region === region)
  },

  getRegions(): string[] {
    return [...new Set(CURRENCIES.map(c => c.region))].sort()
  },
}
