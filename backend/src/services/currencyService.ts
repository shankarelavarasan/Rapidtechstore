import { logger } from '../utils/logger';

// Currency conversion interfaces
export interface CurrencyRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
  source: string;
}

export interface ConversionRequest {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  preferredProvider?: 'fixer' | 'exchangerate' | 'openexchange';
}

export interface ConversionResponse {
  success: boolean;
  originalAmount: number;
  convertedAmount: number;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  provider: string;
  timestamp: Date;
  error?: string;
}

export interface CurrencyConfig {
  fixerApiKey?: string;
  exchangeRateApiKey?: string;
  openExchangeApiKey?: string;
  cacheTtlMinutes: number;
  fallbackRates: Record<string, Record<string, number>>;
}

// Supported currencies by region
export const SUPPORTED_CURRENCIES = {
  US: ['USD'],
  EU: ['EUR', 'GBP'],
  INDIA: ['INR'],
  AFRICA: ['USD', 'EUR', 'ZAR', 'NGN', 'KES', 'GHS'],
  LATAM: ['USD', 'BRL', 'MXN', 'ARS', 'CLP', 'COP'],
  ASIA: ['USD', 'SGD', 'HKD', 'JPY', 'KRW'],
  DEFAULT: ['USD', 'EUR']
};

// Currency cache for rate limiting
class CurrencyCache {
  private cache = new Map<string, { rate: CurrencyRate; expiry: Date }>();
  private ttlMinutes: number;

  constructor(ttlMinutes: number = 60) {
    this.ttlMinutes = ttlMinutes;
  }

  get(key: string): CurrencyRate | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (new Date() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.rate;
  }

  set(key: string, rate: CurrencyRate): void {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + this.ttlMinutes);
    this.cache.set(key, { rate, expiry });
  }

  clear(): void {
    this.cache.clear();
  }
}

export class CurrencyService {
  private config: CurrencyConfig;
  private cache: CurrencyCache;

  constructor(config: CurrencyConfig) {
    this.config = config;
    this.cache = new CurrencyCache(config.cacheTtlMinutes);
  }

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(request: ConversionRequest): Promise<ConversionResponse> {
    try {
      // Same currency, no conversion needed
      if (request.fromCurrency === request.toCurrency) {
        return {
          success: true,
          originalAmount: request.amount,
          convertedAmount: request.amount,
          fromCurrency: request.fromCurrency,
          toCurrency: request.toCurrency,
          exchangeRate: 1,
          provider: 'none',
          timestamp: new Date(),
        };
      }

      // Get exchange rate
      const rate = await this.getExchangeRate(
        request.fromCurrency,
        request.toCurrency,
        request.preferredProvider
      );

      const convertedAmount = Math.round(request.amount * rate.rate * 100) / 100;

      return {
        success: true,
        originalAmount: request.amount,
        convertedAmount,
        fromCurrency: request.fromCurrency,
        toCurrency: request.toCurrency,
        exchangeRate: rate.rate,
        provider: rate.source,
        timestamp: rate.timestamp,
      };
    } catch (error) {
      logger.error('Currency conversion failed:', error);
      return {
        success: false,
        originalAmount: request.amount,
        convertedAmount: 0,
        fromCurrency: request.fromCurrency,
        toCurrency: request.toCurrency,
        exchangeRate: 0,
        provider: 'error',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get exchange rate between two currencies
   */
  private async getExchangeRate(
    from: string,
    to: string,
    preferredProvider?: string
  ): Promise<CurrencyRate> {
    const cacheKey = `${from}_${to}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Try providers in order of preference
    const providers = preferredProvider 
      ? [preferredProvider, 'fixer', 'exchangerate', 'openexchange', 'fallback']
      : ['fixer', 'exchangerate', 'openexchange', 'fallback'];

    for (const provider of providers) {
      try {
        const rate = await this.fetchRateFromProvider(from, to, provider);
        if (rate) {
          this.cache.set(cacheKey, rate);
          return rate;
        }
      } catch (error) {
        logger.warn(`Failed to get rate from ${provider}:`, error);
        continue;
      }
    }

    throw new Error(`Unable to get exchange rate for ${from} to ${to}`);
  }

  /**
   * Fetch rate from specific provider
   */
  private async fetchRateFromProvider(
    from: string,
    to: string,
    provider: string
  ): Promise<CurrencyRate | null> {
    switch (provider) {
      case 'fixer':
        return this.fetchFromFixer(from, to);
      case 'exchangerate':
        return this.fetchFromExchangeRate(from, to);
      case 'openexchange':
        return this.fetchFromOpenExchange(from, to);
      case 'fallback':
        return this.getFallbackRate(from, to);
      default:
        return null;
    }
  }

  /**
   * Fetch from Fixer.io API
   */
  private async fetchFromFixer(from: string, to: string): Promise<CurrencyRate | null> {
    if (!this.config.fixerApiKey) return null;

    const response = await fetch(
      `https://api.fixer.io/latest?access_key=${this.config.fixerApiKey}&base=${from}&symbols=${to}`
    );
    
    const data = await response.json();
    
    if (!data.success || !data.rates[to]) {
      throw new Error('Fixer API error');
    }

    return {
      from,
      to,
      rate: data.rates[to],
      timestamp: new Date(),
      source: 'fixer',
    };
  }

  /**
   * Fetch from ExchangeRate-API
   */
  private async fetchFromExchangeRate(from: string, to: string): Promise<CurrencyRate | null> {
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${from}`
    );
    
    const data = await response.json();
    
    if (!data.rates[to]) {
      throw new Error('ExchangeRate API error');
    }

    return {
      from,
      to,
      rate: data.rates[to],
      timestamp: new Date(),
      source: 'exchangerate',
    };
  }

  /**
   * Fetch from Open Exchange Rates
   */
  private async fetchFromOpenExchange(from: string, to: string): Promise<CurrencyRate | null> {
    if (!this.config.openExchangeApiKey) return null;

    const response = await fetch(
      `https://openexchangerates.org/api/latest.json?app_id=${this.config.openExchangeApiKey}&base=${from}&symbols=${to}`
    );
    
    const data = await response.json();
    
    if (!data.rates[to]) {
      throw new Error('Open Exchange Rates API error');
    }

    return {
      from,
      to,
      rate: data.rates[to],
      timestamp: new Date(),
      source: 'openexchange',
    };
  }

  /**
   * Get fallback rate from config
   */
  private getFallbackRate(from: string, to: string): CurrencyRate | null {
    const fromRates = this.config.fallbackRates[from];
    if (!fromRates || !fromRates[to]) {
      return null;
    }

    return {
      from,
      to,
      rate: fromRates[to],
      timestamp: new Date(),
      source: 'fallback',
    };
  }

  /**
   * Get supported currencies for a region
   */
  getSupportedCurrencies(region: string): string[] {
    return SUPPORTED_CURRENCIES[region as keyof typeof SUPPORTED_CURRENCIES] || SUPPORTED_CURRENCIES.DEFAULT;
  }

  /**
   * Check if currency is supported in region
   */
  isCurrencySupported(currency: string, region: string): boolean {
    const supported = this.getSupportedCurrencies(region);
    return supported.includes(currency);
  }

  /**
   * Get preferred currency for region
   */
  getPreferredCurrency(region: string): string {
    const supported = this.getSupportedCurrencies(region);
    return supported[0] || 'USD';
  }
}

/**
 * Create currency service instance
 */
export function createCurrencyService(config?: Partial<CurrencyConfig>): CurrencyService {
  const defaultConfig: CurrencyConfig = {
    fixerApiKey: process.env.FIXER_API_KEY,
    exchangeRateApiKey: process.env.EXCHANGE_RATE_API_KEY,
    openExchangeApiKey: process.env.OPEN_EXCHANGE_API_KEY,
    cacheTtlMinutes: 60,
    fallbackRates: {
      USD: { EUR: 0.85, GBP: 0.73, INR: 83.0, BRL: 5.2, MXN: 17.5 },
      EUR: { USD: 1.18, GBP: 0.86, INR: 97.6, BRL: 6.1, MXN: 20.6 },
      GBP: { USD: 1.37, EUR: 1.16, INR: 113.4, BRL: 7.1, MXN: 24.0 },
      INR: { USD: 0.012, EUR: 0.010, GBP: 0.009, BRL: 0.063, MXN: 0.21 },
    },
  };

  return new CurrencyService({ ...defaultConfig, ...config });
}