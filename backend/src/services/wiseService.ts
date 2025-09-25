import { 
  PaymentRequest, 
  PaymentResponse, 
  PayoutRequest, 
  PayoutResponse 
} from './paymentOrchestrator';

export interface WiseConfig {
  apiToken: string;
  profileId: string;
  apiUrl: string;
  webhookSecret: string;
  isTestMode: boolean;
}

export interface WiseQuoteResponse {
  id: string;
  source: string;
  target: string;
  sourceAmount: number;
  targetAmount: number;
  rate: number;
  fee: number;
  type: string;
  status: string;
}

export interface WiseTransferResponse {
  id: string;
  user: number;
  targetAccount: number;
  sourceAccount: number;
  quote: string;
  status: string;
  reference: string;
  rate: number;
  created: string;
  business: number;
  transferRequest: string;
  details: any;
  hasActiveIssues: boolean;
  sourceCurrency: string;
  sourceValue: number;
  targetCurrency: string;
  targetValue: number;
  customerTransactionId: string;
}

export class WiseService {
  private config: WiseConfig;

  constructor(config: WiseConfig) {
    this.config = config;
  }

  /**
   * Create a payment with Wise
   * Note: This is a stub implementation for demonstration
   */
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      console.log('Creating Wise payment (STUB):', request);

      // Simulate API call delay
      await this.simulateApiDelay();

      // Validate currency support
      if (!this.isCurrencySupported(request.currency)) {
        return {
          success: false,
          transactionId: '',
          gateway: 'wise' as const,
          status: 'failed' as const,
          amount: request.amount,
          currency: request.currency,
          region: request.region || 'INTERNATIONAL',
          error: `Currency ${request.currency} not supported by Wise`,
        };
      }

      // Validate amount limits
      const limits = this.getAmountLimits(request.currency);
      if (request.amount < limits.min || request.amount > limits.max) {
        return {
          success: false,
          transactionId: '',
          gateway: 'wise' as const,
          status: 'failed' as const,
          amount: request.amount,
          currency: request.currency,
          region: request.region || 'INTERNATIONAL',
          error: `Amount must be between ${limits.min} and ${limits.max} ${request.currency}`,
        };
      }

      // Simulate quote creation
      const quote = await this.createQuote(request.amount, request.currency, 'USD');
      
      // Simulate successful payment creation
      const paymentId = `wise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        transactionId: paymentId,
        gateway: 'wise' as const,
        status: 'pending' as const,
        amount: request.amount,
        currency: request.currency,
        region: request.region || 'INTERNATIONAL',
        clientSecret: paymentId,
        metadata: {
          wisePaymentId: paymentId,
          gateway: 'wise',
          region: request.region || 'INTERNATIONAL',
          quoteId: quote.id,
          exchangeRate: quote.rate,
          estimatedFee: quote.fee,
          estimatedProcessingTime: '1-4 business days',
          quote: quote,
          description: request.description,
        },
      };
    } catch (error: any) {
      console.error('Wise payment creation failed:', error);
      return {
        success: false,
        transactionId: '',
        gateway: 'wise' as const,
        status: 'failed' as const,
        amount: request.amount,
        currency: request.currency,
        region: request.region || 'INTERNATIONAL',
        error: error.message || 'Payment creation failed',
      };
    }
  }

  /**
   * Create a payout with Wise
   * Note: This is a stub implementation for demonstration
   */
  async createPayout(request: PayoutRequest): Promise<PayoutResponse> {
    try {
      console.log('Creating Wise payout (STUB):', request);

      // Simulate API call delay
      await this.simulateApiDelay();

      // Validate currency support
      if (!this.isCurrencySupported(request.currency)) {
        return {
          success: false,
          payoutId: '',
          gateway: 'wise' as const,
          status: 'failed' as const,
          amount: request.amount,
          currency: request.currency,
          region: request.region || 'DEFAULT',
          error: `Currency ${request.currency} not supported by Wise`,
          errorCode: 'UNSUPPORTED_CURRENCY',
        };
      }

      // Validate required fields for payouts
      if (!request.bankAccount) {
        return {
          success: false,
          payoutId: '',
          gateway: 'wise' as const,
          status: 'failed' as const,
          amount: request.amount,
          currency: request.currency,
          region: request.region || 'DEFAULT',
          error: 'Bank account details required for Wise payouts',
          errorCode: 'MISSING_BANK_ACCOUNT',
        };
      }

      // Simulate quote creation for payout
      const quote = await this.createQuote(request.amount, 'USD', request.currency);
      
      // Simulate successful payout creation
      const payoutId = `wise_payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        payoutId: payoutId,
        gatewayPayoutId: payoutId,
        gateway: 'wise' as const,
        status: 'processing' as const,
        amount: request.amount,
        currency: request.currency,
        region: request.region || 'INTERNATIONAL',
        estimatedArrival: this.getEstimatedArrival(request.currency),
        transactionId: payoutId,
        gatewayResponse: JSON.stringify({
          payoutId,
          status: 'processing',
          amount: request.amount,
          currency: request.currency,
          quote: quote,
          recipientId: `wise_recipient_${Date.now()}`,
          estimatedArrival: this.getEstimatedArrival(request.currency),
        }),
        metadata: {
          wisePayoutId: payoutId,
          gateway: 'wise',
          region: request.region || 'INTERNATIONAL',
          quoteId: quote.id,
          exchangeRate: quote.rate,
          estimatedFee: quote.fee,
          estimatedArrival: this.getEstimatedArrival(request.currency),
          processingFee: this.calculateProcessingFee(request.amount, request.currency),
        },
      };
    } catch (error: any) {
      console.error('Wise payout creation failed:', error);
      return {
        success: false,
        payoutId: '',
        gateway: 'wise' as const,
        status: 'failed' as const,
        amount: request.amount,
        currency: request.currency,
        region: request.region || 'INTERNATIONAL',
        error: error.message || 'Payout creation failed',
        gatewayResponse: JSON.stringify(error),
      };
    }
  }

  /**
   * Create a quote for currency conversion
   * Note: This is a stub implementation
   */
  async createQuote(
    amount: number, 
    sourceCurrency: string, 
    targetCurrency: string
  ): Promise<WiseQuoteResponse> {
    console.log(`Creating Wise quote (STUB): ${amount} ${sourceCurrency} -> ${targetCurrency}`);
    
    await this.simulateApiDelay();
    
    // Simulate exchange rate (in real implementation, this would come from Wise API)
    const mockRates: { [key: string]: number } = {
      'USD_EUR': 0.85,
      'USD_GBP': 0.73,
      'USD_BRL': 5.20,
      'USD_MXN': 18.50,
      'USD_ZAR': 18.80,
      'USD_NGN': 460.00,
      'EUR_USD': 1.18,
      'GBP_USD': 1.37,
      'BRL_USD': 0.19,
    };
    
    const rateKey = `${sourceCurrency}_${targetCurrency}`;
    const rate = mockRates[rateKey] || 1.0;
    const targetAmount = amount * rate;
    const fee = this.calculateConversionFee(amount, sourceCurrency, targetCurrency);
    
    return {
      id: `quote_${Date.now()}`,
      source: sourceCurrency,
      target: targetCurrency,
      sourceAmount: amount,
      targetAmount: targetAmount - fee,
      rate: rate,
      fee: fee,
      type: 'BALANCE_PAYOUT',
      status: 'PENDING',
    };
  }

  /**
   * Get transfer status
   * Note: This is a stub implementation
   */
  async getTransferStatus(transferId: string): Promise<any> {
    console.log(`Getting Wise transfer status (STUB): ${transferId}`);
    
    await this.simulateApiDelay();
    
    return {
      id: transferId,
      status: 'outgoing_payment_sent',
      sourceValue: 100.00,
      sourceCurrency: 'USD',
      targetValue: 85.00,
      targetCurrency: 'EUR',
      rate: 0.85,
      created: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Cancel a transfer
   * Note: This is a stub implementation
   */
  async cancelTransfer(transferId: string): Promise<any> {
    console.log(`Cancelling Wise transfer (STUB): ${transferId}`);
    
    await this.simulateApiDelay();
    
    return {
      id: transferId,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    };
  }

  /**
   * Get supported currencies for Wise
   */
  getSupportedCurrencies(): string[] {
    return [
      // Major currencies
      'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK',
      // African currencies
      'ZAR', 'NGN', 'KES', 'GHS', 'EGP', 'MAD', 'TND', 'UGX', 'TZS',
      // LATAM currencies
      'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'PEN', 'UYU', 'BOB', 'PYG',
      // Asian currencies
      'CNY', 'INR', 'SGD', 'HKD', 'THB', 'MYR', 'IDR', 'PHP', 'VND', 'KRW',
      // Other currencies
      'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'RUB', 'TRY', 'ILS', 'AED'
    ];
  }

  /**
   * Get supported regions for Wise
   */
  getSupportedRegions(): string[] {
    return ['AFRICA', 'LATAM', 'ASIA', 'EUROPE', 'NORTH_AMERICA', 'OCEANIA', 'INTERNATIONAL'];
  }

  /**
   * Check if currency is supported
   */
  isCurrencySupported(currency: string): boolean {
    return this.getSupportedCurrencies().includes(currency.toUpperCase());
  }

  /**
   * Get minimum and maximum amounts for currency
   */
  getAmountLimits(currency: string): { min: number; max: number } {
    const limits: { [key: string]: { min: number; max: number } } = {
      'USD': { min: 1, max: 1000000 },
      'EUR': { min: 1, max: 1000000 },
      'GBP': { min: 1, max: 1000000 },
      'ZAR': { min: 10, max: 10000000 },
      'NGN': { min: 100, max: 50000000 },
      'KES': { min: 100, max: 10000000 },
      'BRL': { min: 5, max: 5000000 },
      'MXN': { min: 20, max: 20000000 },
      'ARS': { min: 100, max: 50000000 },
      'INR': { min: 50, max: 7000000 },
      'CNY': { min: 10, max: 6000000 },
    };

    return limits[currency.toUpperCase()] || { min: 1, max: 1000000 };
  }

  /**
   * Get estimated arrival time for currency
   */
  private getEstimatedArrival(currency: string): string {
    const arrivalTimes: { [key: string]: string } = {
      'EUR': 'Within 1 business day',
      'GBP': 'Within 1 business day',
      'USD': 'Within 1-2 business days',
      'BRL': '1-4 business days',
      'MXN': '1-3 business days',
      'ZAR': '1-2 business days',
      'NGN': '2-4 business days',
      'INR': '1-2 business days',
      'CNY': '1-3 business days',
    };

    return arrivalTimes[currency.toUpperCase()] || '1-4 business days';
  }

  /**
   * Calculate processing fee
   */
  private calculateProcessingFee(amount: number, currency: string): number {
    // Wise typically charges a small fixed fee + percentage
    const percentageFee = amount * 0.005; // 0.5%
    const fixedFee = currency === 'USD' ? 0.50 : 1.00;
    return Math.round((percentageFee + fixedFee) * 100) / 100;
  }

  /**
   * Calculate conversion fee
   */
  private calculateConversionFee(amount: number, sourceCurrency: string, targetCurrency: string): number {
    // Wise charges around 0.35-2% for currency conversion
    const conversionRate = 0.007; // 0.7% average
    return Math.round(amount * conversionRate * 100) / 100;
  }

  /**
   * Simulate API delay for realistic testing
   */
  private async simulateApiDelay(): Promise<void> {
    const delay = this.config.isTestMode ? 100 : 1500; // Shorter delay in test mode
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Verify webhook signature (stub)
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    console.log('Verifying Wise webhook signature (STUB)');
    // In a real implementation, this would verify the webhook signature
    return true;
  }

  /**
   * Get webhook event types
   */
  getWebhookEventTypes(): string[] {
    return [
      'transfer.state_change',
      'transfer.active_cases',
      'balance.credit',
      'balance.debit',
      'quote.created',
      'quote.expired'
    ];
  }

  /**
   * Get exchange rate for currency pair
   */
  async getExchangeRate(sourceCurrency: string, targetCurrency: string): Promise<number> {
    console.log(`Getting Wise exchange rate (STUB): ${sourceCurrency} -> ${targetCurrency}`);
    
    await this.simulateApiDelay();
    
    // Mock exchange rates
    const mockRates: { [key: string]: number } = {
      'USD_EUR': 0.85,
      'USD_GBP': 0.73,
      'USD_BRL': 5.20,
      'USD_MXN': 18.50,
      'USD_ZAR': 18.80,
      'USD_NGN': 460.00,
      'EUR_USD': 1.18,
      'GBP_USD': 1.37,
      'BRL_USD': 0.19,
    };
    
    const rateKey = `${sourceCurrency}_${targetCurrency}`;
    return mockRates[rateKey] || 1.0;
  }
}

// Export default instance factory
export const createWiseService = (config: WiseConfig): WiseService => {
  return new WiseService(config);
};

export default WiseService;