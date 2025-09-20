import { stripe } from './stripeService';
import { logger } from '../utils/logger';
import { GeoRoutingService } from './geoRoutingService';
import { RazorpayService, createRazorpayService, RazorpayConfig } from './razorpayService';
import { PayoneerService, createPayoneerService, PayoneerConfig } from './payoneerService';
import { WiseService, createWiseService, WiseConfig } from './wiseService';
import { CurrencyService, createCurrencyService, ConversionRequest } from './currencyService';

// Payment Gateway Types
export type PaymentGateway = 'stripe' | 'razorpay' | 'payoneer' | 'wise' | 'paypal';
export type PaymentType = 'payment' | 'payout';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

// Unified Payment Request Interface
export interface PaymentRequest {
  userId: string;
  amount: number;
  currency: string;
  region?: string;
  country?: string;
  ipAddress?: string;
  headers?: Record<string, string>;
  paymentMethod?: string;
  description?: string;
  metadata?: Record<string, any>;
  returnUrl?: string;
  cancelUrl?: string;
}

// Unified Payment Response Interface
export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  gatewayTransactionId?: string;
  gateway: PaymentGateway;
  status: PaymentStatus;
  amount: number;
  currency: string;
  region: string;
  clientSecret?: string; // For Stripe
  paymentUrl?: string; // For redirect-based payments
  error?: string;
  metadata?: Record<string, any>;
  geoLocation?: GeoLocation;
}

// Unified Payout Request Interface
export interface PayoutRequest {
  developerId: string;
  amount: number;
  currency: string;
  region?: string;
  country?: string;
  ipAddress?: string;
  headers?: Record<string, string>;
  bankAccount?: {
    accountNumber: string;
    routingNumber?: string;
    iban?: string;
    swiftCode?: string;
    bankName: string;
    accountHolderName: string;
  };
  paypalEmail?: string;
  description?: string;
  metadata?: Record<string, any>;
}

// Unified Payout Response Interface
export interface PayoutResponse {
  success: boolean;
  payoutId: string;
  gatewayPayoutId?: string;
  gateway: PaymentGateway;
  status: PaymentStatus;
  amount: number;
  currency: string;
  region: string;
  estimatedArrival?: string;
  error?: string;
  metadata?: Record<string, any>;
  geoLocation?: GeoLocation;
}

// Gateway Configuration
interface GatewayConfig {
  enabled: boolean;
  supportedRegions: string[];
  supportedCurrencies: string[];
  supportsPayments: boolean;
  supportsPayouts: boolean;
  priority: number; // Lower number = higher priority
  minAmount?: number; // Minimum amount in cents/smallest currency unit
  maxAmount?: number; // Maximum amount in cents/smallest currency unit
}

// Gateway configurations
const GATEWAY_CONFIGS: Record<PaymentGateway, GatewayConfig> = {
  stripe: {
    enabled: true,
    supportedRegions: ['US', 'CA', 'GB', 'EU', 'DEFAULT'],
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'HKD', 'MYR', 'THB', 'PHP', 'IDR', 'VND', 'KRW', 'TWD'],
    supportsPayments: true,
    supportsPayouts: true,
    priority: 1,
    minAmount: 50, // $0.50 USD equivalent
    maxAmount: 99999999 // $999,999.99 USD equivalent
  },
  razorpay: {
    enabled: true,
    supportedRegions: ['IN'],
    supportedCurrencies: ['INR', 'USD'],
    supportsPayments: true,
    supportsPayouts: true,
    priority: 1,
    minAmount: 100, // ₹1.00 INR
    maxAmount: 1500000000 // ₹15,00,000.00 INR
  },
  payoneer: {
    enabled: true,
    supportedRegions: ['AF', 'LATAM', 'DEFAULT'],
    supportedCurrencies: ['USD', 'EUR'],
    supportsPayments: false,
    supportsPayouts: true,
    priority: 2,
    minAmount: 2000, // $20.00 USD minimum for payouts
    maxAmount: 2000000000 // $20,000,000.00 USD maximum
  },
  wise: {
    enabled: true,
    supportedRegions: ['AF', 'LATAM', 'EU', 'DEFAULT'],
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'JPY'],
    supportsPayments: false,
    supportsPayouts: true,
    priority: 3,
    minAmount: 100, // $1.00 USD minimum
    maxAmount: 1000000000 // $10,000,000.00 USD maximum
  },
  paypal: {
    enabled: false, // Disabled by default, can be enabled as fallback
    supportedRegions: ['US', 'CA', 'GB', 'EU', 'DEFAULT'],
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    supportsPayments: true,
    supportsPayouts: true,
    priority: 4,
    minAmount: 100, // $1.00 USD minimum
    maxAmount: 1000000000 // $10,000,000.00 USD maximum
  }
};

export class PaymentOrchestrator {
  private static razorpayService?: RazorpayService;
  private static payoneerService?: PayoneerService;
  private static wiseService?: WiseService;
  private static currencyService: CurrencyService;

  static {
    this.initializeGateways();
  }

  private static initializeGateways(): void {
    // Initialize Razorpay service if credentials are available
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      const razorpayConfig: RazorpayConfig = {
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET,
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
        isTestMode: process.env.NODE_ENV !== 'production',
      };
      this.razorpayService = createRazorpayService(razorpayConfig);
      logger.info('Razorpay service initialized');
    } else {
      logger.warn('Razorpay credentials not found, service not initialized');
    }

    // Initialize Payoneer service if credentials are available
    if (process.env.PAYONEER_API_USERNAME && process.env.PAYONEER_API_PASSWORD) {
      const payoneerConfig: PayoneerConfig = {
        apiUsername: process.env.PAYONEER_API_USERNAME,
        apiPassword: process.env.PAYONEER_API_PASSWORD,
        partnerId: process.env.PAYONEER_PARTNER_ID || '',
        apiUrl: process.env.PAYONEER_API_URL || 'https://api.sandbox.payoneer.com',
        isTestMode: process.env.NODE_ENV !== 'production',
      };
      this.payoneerService = createPayoneerService(payoneerConfig);
      logger.info('Payoneer service initialized');
    } else {
      logger.warn('Payoneer credentials not found, service not initialized');
    }

    // Initialize Wise service if credentials are available
    if (process.env.WISE_API_TOKEN && process.env.WISE_PROFILE_ID) {
      const wiseConfig: WiseConfig = {
        apiToken: process.env.WISE_API_TOKEN,
        profileId: process.env.WISE_PROFILE_ID,
        apiUrl: process.env.WISE_API_URL || 'https://api.sandbox.transferwise.tech',
        webhookSecret: process.env.WISE_WEBHOOK_SECRET || '',
        isTestMode: process.env.NODE_ENV !== 'production',
      };
      this.wiseService = createWiseService(wiseConfig);
      logger.info('Wise service initialized');
    } else {
      logger.warn('Wise credentials not found, service not initialized');
    }

    // Initialize currency service
    this.currencyService = createCurrencyService();
    logger.info('Currency service initialized');
  }

  /**
   * Route payment to appropriate gateway based on geo-location and currency
   */
  static async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Detect geo-location
      const geoLocation = await GeoRoutingService.getLocationInfo(
        request.ipAddress,
        request.headers,
        request.country,
        request.currency
      );

      logger.info('Processing payment request', { 
        userId: request.userId, 
        amount: request.amount, 
        currency: request.currency, 
        geoLocation 
      });

      // Validate amount and currency
      const validationResult = this.validatePaymentRequest(request, geoLocation);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      // Determine optimal gateway
      const gateway = this.selectOptimalGateway(geoLocation, request.currency, 'payment', request.amount);
      
      // Route to appropriate service
      const response = await this.routePayment(gateway, request, geoLocation);
      response.geoLocation = geoLocation;
      
      return response;
    } catch (error) {
      logger.error('Payment processing failed', error);
      return {
        success: false,
        transactionId: this.generateTransactionId(),
        gateway: 'stripe',
        status: 'failed',
        amount: request.amount,
        currency: request.currency,
        region: request.region || 'DEFAULT',
        metadata: request.metadata,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Route payout to appropriate gateway based on geo-location and currency
   */
  static async processPayout(request: PayoutRequest): Promise<PayoutResponse> {
    try {
      // Detect geo-location
      const geoLocation = await GeoRoutingService.getLocationInfo(
        request.ipAddress,
        request.headers,
        request.country,
        request.currency
      );

      logger.info('Processing payout request', { 
        developerId: request.developerId, 
        amount: request.amount, 
        currency: request.currency, 
        geoLocation 
      });

      // Validate amount and currency
      const validationResult = this.validatePayoutRequest(request, geoLocation);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      // Determine optimal gateway
      const gateway = this.selectOptimalGateway(geoLocation, request.currency, 'payout', request.amount);
      
      // Route to appropriate service
      const response = await this.routePayout(gateway, request, geoLocation);
      response.geoLocation = geoLocation;
      
      return response;
    } catch (error) {
      logger.error('Payout processing failed', error);
      return {
        success: false,
        payoutId: this.generatePayoutId(),
        gateway: 'stripe',
        status: 'failed',
        amount: request.amount,
        currency: request.currency,
        region: request.region || 'DEFAULT',
        metadata: request.metadata,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Select optimal gateway based on geo-location, currency, operation type, and amount
   */
  private static selectOptimalGateway(
    geoLocation: GeoLocation, 
    currency: string, 
    type: PaymentType,
    amount: number
  ): PaymentGateway {
    const region = geoLocation.region;
    
    // Get eligible gateways
    const eligibleGateways = this.getEligibleGateways(region, currency, type, amount);
    
    if (eligibleGateways.length === 0) {
      logger.warn(`No eligible gateways found, falling back to Stripe for ${type} in ${region} with ${currency}`);
      return 'stripe';
    }

    // Sort by priority (lower number = higher priority)
    eligibleGateways.sort((a, b) => GATEWAY_CONFIGS[a].priority - GATEWAY_CONFIGS[b].priority);
    
    const selectedGateway = eligibleGateways[0];
    logger.info(`Selected gateway: ${selectedGateway} for ${type} in ${region} with ${currency}`, {
      eligibleGateways,
      geoLocation,
      amount
    });
    
    return selectedGateway;
  }

  /**
   * Get eligible gateways based on criteria
   */
  private static getEligibleGateways(
    region: string,
    currency: string,
    type: PaymentType,
    amount: number
  ): PaymentGateway[] {
    const eligible: PaymentGateway[] = [];

    for (const [gateway, config] of Object.entries(GATEWAY_CONFIGS)) {
      const gatewayName = gateway as PaymentGateway;
      
      // Check if gateway is enabled
      if (!config.enabled) continue;
      
      // Check region support
      if (!config.supportedRegions.includes(region) && !config.supportedRegions.includes('DEFAULT')) {
        continue;
      }
      
      // Check currency support
      if (!config.supportedCurrencies.includes(currency)) continue;
      
      // Check operation type support
      if (type === 'payment' && !config.supportsPayments) continue;
      if (type === 'payout' && !config.supportsPayouts) continue;
      
      // Check amount limits
      if (config.minAmount && amount < config.minAmount) continue;
      if (config.maxAmount && amount > config.maxAmount) continue;
      
      eligible.push(gatewayName);
    }

    return eligible;
  }

  /**
   * Validate payment request
   */
  private static validatePaymentRequest(request: PaymentRequest, geoLocation: GeoLocation): { valid: boolean; error?: string } {
    if (request.amount <= 0) {
      return { valid: false, error: 'Amount must be greater than 0' };
    }

    if (!request.currency || request.currency.length !== 3) {
      return { valid: false, error: 'Invalid currency code' };
    }

    if (!GeoRoutingService.isCurrencySupportedInRegion(request.currency, geoLocation.region)) {
      const alternatives = GeoRoutingService.getAlternativeCurrenciesForRegion(geoLocation.region);
      return { 
        valid: false, 
        error: `Currency ${request.currency} not supported in region ${geoLocation.region}. Supported currencies: ${alternatives.join(', ')}` 
      };
    }

    return { valid: true };
  }

  /**
   * Validate payout request
   */
  private static validatePayoutRequest(request: PayoutRequest, geoLocation: GeoLocation): { valid: boolean; error?: string } {
    if (request.amount <= 0) {
      return { valid: false, error: 'Amount must be greater than 0' };
    }

    if (!request.currency || request.currency.length !== 3) {
      return { valid: false, error: 'Invalid currency code' };
    }

    if (!request.bankAccount && !request.paypalEmail) {
      return { valid: false, error: 'Either bank account or PayPal email is required for payouts' };
    }

    if (!GeoRoutingService.isCurrencySupportedInRegion(request.currency, geoLocation.region)) {
      const alternatives = GeoRoutingService.getAlternativeCurrenciesForRegion(geoLocation.region);
      return { 
        valid: false, 
        error: `Currency ${request.currency} not supported in region ${geoLocation.region}. Supported currencies: ${alternatives.join(', ')}` 
      };
    }

    return { valid: true };
  }

  /**
   * Route payment to specific gateway
   */
  private static async routePayment(gateway: PaymentGateway, request: PaymentRequest, geoLocation: GeoLocation): Promise<PaymentResponse> {
    switch (gateway) {
      case 'stripe':
        return await this.processStripePayment(request, geoLocation);
      case 'razorpay':
        return await this.processRazorpayPayment(request, geoLocation);
      case 'paypal':
        return await this.processPayPalPayment(request, geoLocation);
      default:
        throw new Error(`Unsupported payment gateway: ${gateway}`);
    }
  }

  /**
   * Route payout to specific gateway
   */
  private static async routePayout(gateway: PaymentGateway, request: PayoutRequest, geoLocation: GeoLocation): Promise<PayoutResponse> {
    switch (gateway) {
      case 'stripe':
        return await this.processStripePayout(request, geoLocation);
      case 'razorpay':
        return await this.processRazorpayPayout(request, geoLocation);
      case 'payoneer':
        return await this.processPayoneerPayout(request, geoLocation);
      case 'wise':
        return await this.processWisePayout(request, geoLocation);
      default:
        throw new Error(`Unsupported payout gateway: ${gateway}`);
    }
  }

  /**
   * Generate transaction ID
   */
  private static generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate payout ID
   */
  private static generatePayoutId(): string {
    return `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Main payment processing method with geo-routing
   */
  static async charge(request: PaymentRequest): Promise<PaymentResponse> {
    return this.processPayment(request);
  }

  /**
   * Main payout processing method with geo-routing
   */
  static async payout(request: PayoutRequest): Promise<PayoutResponse> {
    return this.processPayout(request);
  }

  /**
   * Stripe payment processing
   */
  private static async processStripePayment(request: PaymentRequest, geoLocation?: GeoLocation): Promise<PaymentResponse> {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(request.amount * 100), // Convert to cents
      currency: request.currency.toLowerCase(),
      metadata: {
        userId: request.userId,
        region: geoLocation?.region || request.region,
        country: geoLocation?.country,
        ...request.metadata
      }
    });

    return {
      success: true,
      transactionId: paymentIntent.id,
      gateway: 'stripe',
      status: 'pending',
      clientSecret: paymentIntent.client_secret!,
      amount: request.amount,
      currency: request.currency,
      region: geoLocation?.region || request.region || 'DEFAULT',
      metadata: request.metadata
    };
  }

  /**
   * Stripe payout processing
   */
  private static async processStripePayout(request: PayoutRequest, geoLocation?: GeoLocation): Promise<PayoutResponse> {
    // Note: This is a simplified implementation
    // In production, you'd need to handle Stripe Connect accounts
    throw new Error('Stripe payout implementation pending - requires Connect setup');
  }

  /**
   * Razorpay payment processing
   */
  private static async processRazorpayPayment(request: PaymentRequest, geoLocation?: GeoLocation): Promise<PaymentResponse> {
    if (!this.razorpayService) {
      throw new Error('Razorpay service not initialized');
    }

    try {
      const razorpayRequest = {
        amount: Math.round(request.amount * 100), // Convert to paise
        currency: request.currency,
        receipt: `receipt_${Date.now()}`,
        notes: {
          userId: request.userId,
          region: geoLocation?.region || request.region,
          country: geoLocation?.country,
          ...request.metadata
        }
      };

      const response = await this.razorpayService.createPayment(request);
       
       if (!response.success) {
         throw new Error(response.error || 'Razorpay payment creation failed');
       }
       
       return {
         success: true,
         transactionId: response.transactionId!,
         gatewayTransactionId: response.transactionId!,
         gateway: 'razorpay',
         status: response.status!,
         amount: request.amount,
         currency: request.currency,
         region: geoLocation?.region || request.region || 'DEFAULT',
         clientSecret: response.clientSecret,
         metadata: {
           ...request.metadata,
           ...response.metadata
         }
       };
    } catch (error) {
      logger.error('Razorpay payment processing failed', error);
      throw error;
    }
  }

  /**
   * Razorpay payout processing
   */
  private static async processRazorpayPayout(request: PayoutRequest, geoLocation?: GeoLocation): Promise<PayoutResponse> {
    if (!this.razorpayService) {
      throw new Error('Razorpay service not initialized');
    }

    if (!request.bankAccount) {
      throw new Error('Bank account details required for Razorpay payouts');
    }

    try {
      const razorpayPayoutRequest = {
        account_number: request.bankAccount.accountNumber,
        fund_account: {
          account_type: 'bank_account',
          bank_account: {
            name: request.bankAccount.accountHolderName,
            ifsc: request.bankAccount.routingNumber, // IFSC code for Indian banks
            account_number: request.bankAccount.accountNumber
          }
        },
        amount: Math.round(request.amount * 100), // Convert to paise
        currency: request.currency,
        mode: 'IMPS',
        purpose: 'payout',
        queue_if_low_balance: true,
        reference_id: `payout_${Date.now()}`,
        narration: request.description || 'Developer payout',
        notes: {
          developerId: request.developerId,
          region: geoLocation?.region || request.region,
          country: geoLocation?.country,
          ...request.metadata
        }
      };

      const response = await this.razorpayService.createPayout(request);
       
       if (!response.success) {
         throw new Error(response.error || 'Razorpay payout creation failed');
       }
       
       return {
         success: true,
         payoutId: response.transactionId!,
         gatewayPayoutId: response.transactionId!,
         gateway: 'razorpay',
         status: response.status!,
         amount: request.amount,
         currency: request.currency,
         region: geoLocation?.region || request.region || 'DEFAULT',
         estimatedArrival: 'Within 30 minutes',
         metadata: {
           ...request.metadata,
           ...response.metadata
         }
       };
    } catch (error) {
      logger.error('Razorpay payout processing failed', error);
      throw error;
    }
  }

  /**
   * Payoneer processing stubs
   */
  private static async processPayoneerPayment(request: PaymentRequest, geoLocation?: GeoLocation): Promise<PaymentResponse> {
    if (!this.payoneerService) {
      throw new Error('Payoneer service not initialized');
    }

    try {
      const response = await this.payoneerService.createPayment(request);
      
      if (!response.success) {
        throw new Error(response.error || 'Payoneer payment creation failed');
      }

      return {
        success: true,
        transactionId: response.transactionId!,
        gatewayTransactionId: response.transactionId!,
        gateway: 'payoneer',
        status: response.status!,
        amount: request.amount,
        currency: request.currency,
        region: geoLocation?.region || request.region || 'DEFAULT',
        clientSecret: response.clientSecret,
        metadata: {
          ...request.metadata,
          ...response.metadata
        }
      };
    } catch (error) {
      logger.error('Payoneer payment processing failed', error);
      throw error;
    }
  }

  private static async processPayoneerPayout(request: PayoutRequest, geoLocation?: GeoLocation): Promise<PayoutResponse> {
    if (!this.payoneerService) {
      throw new Error('Payoneer service not initialized');
    }

    try {
      const response = await this.payoneerService.createPayout(request);
      
      if (!response.success) {
        throw new Error(response.error || 'Payoneer payout creation failed');
      }

      return {
        success: true,
        payoutId: response.transactionId!,
        gatewayPayoutId: response.transactionId!,
        gateway: 'payoneer',
        status: response.status!,
        amount: request.amount,
        currency: request.currency,
        region: geoLocation?.region || request.region || 'DEFAULT',
        estimatedArrival: 'Within 2-5 business days',
        metadata: {
          ...request.metadata,
          ...response.metadata
        }
      };
    } catch (error) {
      logger.error('Payoneer payout processing failed', error);
      throw error;
    }
  }

  /**
   * Wise processing stubs
   */
  private static async processWisePayment(request: PaymentRequest, geoLocation?: GeoLocation): Promise<PaymentResponse> {
    if (!this.wiseService) {
      throw new Error('Wise service not initialized');
    }

    try {
      const response = await this.wiseService.createPayment(request);
      
      if (!response.success) {
        throw new Error(response.error || 'Wise payment creation failed');
      }

      return {
        success: true,
        transactionId: response.transactionId!,
        gatewayTransactionId: response.transactionId!,
        gateway: 'wise',
        status: response.status!,
        amount: request.amount,
        currency: request.currency,
        region: geoLocation?.region || request.region || 'DEFAULT',
        clientSecret: response.clientSecret,
        metadata: {
          ...request.metadata,
          ...response.metadata
        }
      };
    } catch (error) {
      logger.error('Wise payment processing failed', error);
      throw error;
    }
  }

  private static async processWisePayout(request: PayoutRequest, geoLocation?: GeoLocation): Promise<PayoutResponse> {
    if (!this.wiseService) {
      throw new Error('Wise service not initialized');
    }

    try {
      const response = await this.wiseService.createPayout(request);
      
      if (!response.success) {
        throw new Error(response.error || 'Wise payout creation failed');
      }

      return {
        success: true,
        payoutId: response.transactionId!,
        gatewayPayoutId: response.transactionId!,
        gateway: 'wise',
        status: response.status!,
        amount: request.amount,
        currency: request.currency,
        region: geoLocation?.region || request.region || 'DEFAULT',
        estimatedArrival: 'Within 1-2 business days',
        metadata: {
          ...request.metadata,
          ...response.metadata
        }
      };
    } catch (error) {
      logger.error('Wise payout processing failed', error);
      throw error;
    }
  }

  /**
   * PayPal processing stubs
   */
  private static async processPayPalPayment(request: PaymentRequest, geoLocation?: GeoLocation): Promise<PaymentResponse> {
    // TODO: Implement PayPal integration
    logger.info('PayPal payment processing (stub)', request);
    
    return {
      success: true,
      transactionId: `paypal_${Date.now()}`,
      gateway: 'paypal',
      status: 'pending',
      amount: request.amount,
      currency: request.currency,
      region: geoLocation?.region || request.region || 'DEFAULT',
      metadata: request.metadata
    };
  }

  private static async processPayPalPayout(request: PayoutRequest, geoLocation?: GeoLocation): Promise<PayoutResponse> {
    // TODO: Implement PayPal payout integration
    logger.info('PayPal payout processing (stub)', request);
    
    return {
      success: true,
      payoutId: `paypal_payout_${Date.now()}`,
      gateway: 'paypal',
      status: 'pending',
      amount: request.amount,
      currency: request.currency,
      region: geoLocation?.region || request.region || 'DEFAULT',
      metadata: request.metadata
    };
  }

  /**
   * Convert currency if needed for gateway compatibility
   */
  private static async convertCurrencyIfNeeded(
    amount: number,
    currency: string,
    targetCurrency: string,
    gateway: string
  ): Promise<{ amount: number; currency: string; exchangeRate?: number }> {
    if (currency === targetCurrency) {
      return { amount, currency };
    }

    try {
      const conversion = await this.currencyService.convertCurrency({
        amount,
        fromCurrency: currency,
        toCurrency: targetCurrency,
      });

      if (!conversion.success) {
        logger.warn(`Currency conversion failed for ${gateway}:`, conversion.error);
        return { amount, currency }; // Return original if conversion fails
      }

      logger.info(`Currency converted for ${gateway}: ${amount} ${currency} -> ${conversion.convertedAmount} ${targetCurrency} (rate: ${conversion.exchangeRate})`);
      
      return {
        amount: conversion.convertedAmount,
        currency: targetCurrency,
        exchangeRate: conversion.exchangeRate,
      };
    } catch (error) {
      logger.error(`Currency conversion error for ${gateway}:`, error);
      return { amount, currency }; // Return original if conversion fails
    }
  }

  /**
   * Get preferred currency for gateway and region
   */
  private static getGatewayPreferredCurrency(gateway: string, region: string): string {
    const preferences: Record<string, Record<string, string>> = {
      stripe: {
        US: 'USD',
        EU: 'EUR',
        DEFAULT: 'USD',
      },
      razorpay: {
        INDIA: 'INR',
        DEFAULT: 'INR',
      },
      payoneer: {
        AFRICA: 'USD',
        LATAM: 'USD',
        DEFAULT: 'USD',
      },
      wise: {
        AFRICA: 'USD',
        LATAM: 'USD',
        EU: 'EUR',
        DEFAULT: 'USD',
      },
    };

    return preferences[gateway]?.[region] || preferences[gateway]?.DEFAULT || 'USD';
  }

  /**
   * Log transaction to unified database
   */
  private static async logTransaction(transaction: {
    userId: string;
    amount: number;
    currency: string;
    gateway: string;
    transactionId: string;
    status: string;
    region: string;
    type: 'charge' | 'payout';
  }) {
    // TODO: Implement database logging
    logger.info('Transaction logged', transaction);
  }
}