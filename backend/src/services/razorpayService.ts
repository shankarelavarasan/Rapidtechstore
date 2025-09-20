import Razorpay from 'razorpay';
import crypto from 'crypto';
import { 
  PaymentRequest, 
  PaymentResponse, 
  PayoutRequest, 
  PayoutResponse 
} from './paymentOrchestrator';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  isTestMode: boolean;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  created_at: number;
}

export interface RazorpayPaymentResponse {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string;
  method: string;
  captured: boolean;
  description: string;
  created_at: number;
}

export interface RazorpayContactResponse {
  id: string;
  entity: string;
  name: string;
  email: string;
  contact: string;
  type: string;
  reference_id: string;
  batch_id: string;
  active: boolean;
  created_at: number;
}

export interface RazorpayFundAccountResponse {
  id: string;
  entity: string;
  contact_id: string;
  account_type: string;
  bank_account?: {
    name: string;
    ifsc: string;
    account_number: string;
  };
  vpa?: {
    address: string;
  };
  active: boolean;
  created_at: number;
}

export interface RazorpayPayoutResponse {
  id: string;
  entity: string;
  fund_account_id: string;
  amount: number;
  currency: string;
  fees: number;
  tax: number;
  status: string;
  purpose: string;
  utr: string;
  mode: string;
  reference_id: string;
  narration: string;
  batch_id: string;
  failure_reason: string;
  created_at: number;
}

export class RazorpayService {
  private razorpay: Razorpay;
  private config: RazorpayConfig;

  constructor(config: RazorpayConfig) {
    this.config = config;
    this.razorpay = new Razorpay({
      key_id: config.keyId,
      key_secret: config.keySecret,
    });
  }

  /**
   * Create a payment order in Razorpay
   */
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      console.log('Creating Razorpay payment order:', request);

      // Convert amount to smallest currency unit (paise for INR)
      const amountInPaise = Math.round(request.amount * 100);

      // Create order in Razorpay
      const orderOptions = {
        amount: amountInPaise,
        currency: request.currency || 'INR',
        receipt: `order_${request.userId}_${Date.now()}`,
        payment_capture: 1, // Auto capture
        notes: {
          userId: request.userId,
          description: request.description || '',
          metadata: JSON.stringify(request.metadata || {}),
        },
      };

      const order: RazorpayOrderResponse = await this.razorpay.orders.create(orderOptions);

      return {
        success: true,
        transactionId: order.id,
        orderId: order.id,
        amount: request.amount,
        currency: request.currency || 'INR',
        status: 'PENDING',
        gatewayResponse: JSON.stringify(order),
        clientSecret: order.id, // Razorpay uses order ID as client secret
        metadata: {
          razorpayOrderId: order.id,
          receipt: order.receipt,
          amountInPaise: order.amount,
        },
      };
    } catch (error: any) {
      console.error('Razorpay payment creation failed:', error);
      return {
        success: false,
        error: error.message || 'Payment creation failed',
        errorCode: error.error?.code || 'RAZORPAY_ERROR',
        gatewayResponse: JSON.stringify(error),
      };
    }
  }

  /**
   * Verify payment signature from Razorpay webhook
   */
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    try {
      const body = orderId + '|' + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', this.config.keySecret)
        .update(body.toString())
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(payload)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Capture a payment (if not auto-captured)
   */
  async capturePayment(paymentId: string, amount?: number): Promise<RazorpayPaymentResponse> {
    try {
      const captureData: any = {};
      if (amount) {
        captureData.amount = Math.round(amount * 100); // Convert to paise
      }

      return await this.razorpay.payments.capture(paymentId, captureData);
    } catch (error: any) {
      console.error('Payment capture failed:', error);
      throw new Error(error.message || 'Payment capture failed');
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(
    paymentId: string, 
    amount?: number, 
    reason?: string
  ): Promise<any> {
    try {
      const refundData: any = {
        notes: {
          reason: reason || 'Refund requested',
        },
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to paise
      }

      return await this.razorpay.payments.refund(paymentId, refundData);
    } catch (error: any) {
      console.error('Refund failed:', error);
      throw new Error(error.message || 'Refund failed');
    }
  }

  /**
   * Create a contact for payouts
   */
  async createContact(
    name: string,
    email: string,
    contact: string,
    type: string = 'vendor',
    referenceId?: string
  ): Promise<RazorpayContactResponse> {
    try {
      const contactData = {
        name,
        email,
        contact,
        type,
        reference_id: referenceId || `contact_${Date.now()}`,
      };

      return await this.razorpay.contacts.create(contactData);
    } catch (error: any) {
      console.error('Contact creation failed:', error);
      throw new Error(error.message || 'Contact creation failed');
    }
  }

  /**
   * Create a fund account for payouts
   */
  async createFundAccount(
    contactId: string,
    accountType: 'bank_account' | 'vpa',
    accountDetails: {
      name?: string;
      ifsc?: string;
      account_number?: string;
      vpa_address?: string;
    }
  ): Promise<RazorpayFundAccountResponse> {
    try {
      const fundAccountData: any = {
        contact_id: contactId,
        account_type: accountType,
      };

      if (accountType === 'bank_account') {
        fundAccountData.bank_account = {
          name: accountDetails.name,
          ifsc: accountDetails.ifsc,
          account_number: accountDetails.account_number,
        };
      } else if (accountType === 'vpa') {
        fundAccountData.vpa = {
          address: accountDetails.vpa_address,
        };
      }

      return await this.razorpay.fundAccount.create(fundAccountData);
    } catch (error: any) {
      console.error('Fund account creation failed:', error);
      throw new Error(error.message || 'Fund account creation failed');
    }
  }

  /**
   * Create a payout
   */
  async createPayout(request: PayoutRequest): Promise<PayoutResponse> {
    try {
      console.log('Creating Razorpay payout:', request);

      // Convert amount to smallest currency unit (paise for INR)
      const amountInPaise = Math.round(request.amount * 100);

      // For demo purposes, we'll create a simple payout
      // In production, you'd need to create contact and fund account first
      const payoutData = {
        account_number: process.env.RAZORPAY_ACCOUNT_NUMBER || '2323230000000000', // Test account
        fund_account_id: request.metadata?.fundAccountId || 'fa_test_fund_account',
        amount: amountInPaise,
        currency: request.currency || 'INR',
        mode: request.metadata?.mode || 'IMPS',
        purpose: 'payout',
        queue_if_low_balance: true,
        reference_id: `payout_${request.recipientId}_${Date.now()}`,
        narration: request.description || 'Payout from Rapid Tech Store',
        notes: {
          recipientId: request.recipientId,
          description: request.description || '',
          metadata: JSON.stringify(request.metadata || {}),
        },
      };

      const payout: RazorpayPayoutResponse = await this.razorpay.payouts.create(payoutData);

      return {
        success: true,
        transactionId: payout.id,
        amount: request.amount,
        currency: request.currency || 'INR',
        status: this.mapPayoutStatus(payout.status),
        gatewayResponse: JSON.stringify(payout),
        metadata: {
          razorpayPayoutId: payout.id,
          utr: payout.utr,
          mode: payout.mode,
          fees: payout.fees / 100, // Convert back to rupees
          tax: payout.tax / 100,
        },
      };
    } catch (error: any) {
      console.error('Razorpay payout creation failed:', error);
      return {
        success: false,
        error: error.message || 'Payout creation failed',
        errorCode: error.error?.code || 'RAZORPAY_PAYOUT_ERROR',
        gatewayResponse: JSON.stringify(error),
      };
    }
  }

  /**
   * Get payment details
   */
  async getPayment(paymentId: string): Promise<RazorpayPaymentResponse> {
    try {
      return await this.razorpay.payments.fetch(paymentId);
    } catch (error: any) {
      console.error('Failed to fetch payment:', error);
      throw new Error(error.message || 'Failed to fetch payment');
    }
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<RazorpayOrderResponse> {
    try {
      return await this.razorpay.orders.fetch(orderId);
    } catch (error: any) {
      console.error('Failed to fetch order:', error);
      throw new Error(error.message || 'Failed to fetch order');
    }
  }

  /**
   * Get payout details
   */
  async getPayout(payoutId: string): Promise<RazorpayPayoutResponse> {
    try {
      return await this.razorpay.payouts.fetch(payoutId);
    } catch (error: any) {
      console.error('Failed to fetch payout:', error);
      throw new Error(error.message || 'Failed to fetch payout');
    }
  }

  /**
   * Map Razorpay payment status to unified status
   */
  private mapPaymentStatus(razorpayStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'created': 'PENDING',
      'authorized': 'PROCESSING',
      'captured': 'COMPLETED',
      'refunded': 'REFUNDED',
      'failed': 'FAILED',
    };

    return statusMap[razorpayStatus] || 'PENDING';
  }

  /**
   * Map Razorpay payout status to unified status
   */
  private mapPayoutStatus(razorpayStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'queued': 'PENDING',
      'pending': 'PROCESSING',
      'processing': 'PROCESSING',
      'processed': 'COMPLETED',
      'cancelled': 'CANCELLED',
      'rejected': 'FAILED',
      'failed': 'FAILED',
    };

    return statusMap[razorpayStatus] || 'PENDING';
  }

  /**
   * Get supported currencies for Razorpay
   */
  getSupportedCurrencies(): string[] {
    return [
      'INR', // Primary currency
      'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'MYR', 'THB'
    ];
  }

  /**
   * Get supported payment methods
   */
  getSupportedPaymentMethods(): string[] {
    return [
      'card',
      'netbanking',
      'wallet',
      'upi',
      'emi',
      'paylater',
      'cardless_emi',
      'bank_transfer'
    ];
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
      'INR': { min: 1, max: 1000000 }, // ₹1 to ₹10,00,000
      'USD': { min: 0.5, max: 50000 }, // $0.5 to $50,000
      'EUR': { min: 0.5, max: 50000 }, // €0.5 to €50,000
      'GBP': { min: 0.3, max: 50000 }, // £0.3 to £50,000
    };

    return limits[currency.toUpperCase()] || { min: 1, max: 100000 };
  }
}

// Export default instance factory
export const createRazorpayService = (config: RazorpayConfig): RazorpayService => {
  return new RazorpayService(config);
};

export default RazorpayService;