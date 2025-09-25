import { Request, Response } from 'express';
import crypto from 'crypto';
import { stripe } from './stripeService';
import { logger } from '../utils/logger';

// Webhook event interfaces
export interface WebhookEvent {
  id: string;
  type: string;
  gateway: string;
  data: any;
  timestamp: Date;
  verified: boolean;
}

export interface PaymentWebhookData {
  transactionId: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
  failureReason?: string;
}

export interface PayoutWebhookData {
  payoutId: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
  failureReason?: string;
}

// Webhook configuration
export interface WebhookConfig {
  stripeWebhookSecret?: string;
  razorpayWebhookSecret?: string;
  payoneerWebhookSecret?: string;
  wiseWebhookSecret?: string;
}

export class WebhookHandler {
  private config: WebhookConfig;

  constructor(config: WebhookConfig) {
    this.config = config;
  }

  /**
   * Handle Stripe webhooks
   */
  async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    try {
      const sig = req.headers['stripe-signature'] as string;
      
      if (!this.config.stripeWebhookSecret) {
        logger.error('Stripe webhook secret not configured');
        res.status(400).send('Webhook secret not configured');
        return;
      }

      if (!stripe) {
        logger.error('Stripe not initialized');
        res.status(500).send('Stripe not initialized');
        return;
      }

      // Verify webhook signature
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        this.config.stripeWebhookSecret
      );

      const webhookEvent: WebhookEvent = {
        id: event.id,
        type: event.type,
        gateway: 'stripe',
        data: event.data.object,
        timestamp: new Date(event.created * 1000),
        verified: true,
      };

      await this.processWebhookEvent(webhookEvent);
      res.status(200).send('Webhook processed');
    } catch (error) {
      logger.error('Stripe webhook processing failed:', error);
      res.status(400).send('Webhook processing failed');
    }
  }

  /**
   * Handle Razorpay webhooks
   */
  async handleRazorpayWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      
      if (!this.config.razorpayWebhookSecret) {
        logger.error('Razorpay webhook secret not configured');
        res.status(400).send('Webhook secret not configured');
        return;
      }

      // Verify webhook signature
      const expectedSignature = crypto
        .createHmac('sha256', this.config.razorpayWebhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      const verified = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!verified) {
        logger.error('Razorpay webhook signature verification failed');
        res.status(400).send('Invalid signature');
        return;
      }

      const webhookEvent: WebhookEvent = {
        id: req.body.event.id || `razorpay_${Date.now()}`,
        type: req.body.event,
        gateway: 'razorpay',
        data: req.body.payload,
        timestamp: new Date(),
        verified: true,
      };

      await this.processWebhookEvent(webhookEvent);
      res.status(200).send('Webhook processed');
    } catch (error) {
      logger.error('Razorpay webhook processing failed:', error);
      res.status(400).send('Webhook processing failed');
    }
  }

  /**
   * Handle Payoneer webhooks
   */
  async handlePayoneerWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-payoneer-signature'] as string;
      
      if (!this.config.payoneerWebhookSecret) {
        logger.error('Payoneer webhook secret not configured');
        res.status(400).send('Webhook secret not configured');
        return;
      }

      // Verify webhook signature (Payoneer-specific logic)
      const expectedSignature = crypto
        .createHmac('sha256', this.config.payoneerWebhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      const verified = crypto.timingSafeEqual(
        Buffer.from(signature || ''),
        Buffer.from(expectedSignature)
      );

      const webhookEvent: WebhookEvent = {
        id: req.body.id || `payoneer_${Date.now()}`,
        type: req.body.type || req.body.event_type,
        gateway: 'payoneer',
        data: req.body.data || req.body,
        timestamp: new Date(req.body.timestamp || Date.now()),
        verified,
      };

      await this.processWebhookEvent(webhookEvent);
      res.status(200).send('Webhook processed');
    } catch (error) {
      logger.error('Payoneer webhook processing failed:', error);
      res.status(400).send('Webhook processing failed');
    }
  }

  /**
   * Handle Wise webhooks
   */
  async handleWiseWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-signature'] as string;
      
      if (!this.config.wiseWebhookSecret) {
        logger.error('Wise webhook secret not configured');
        res.status(400).send('Webhook secret not configured');
        return;
      }

      // Verify webhook signature (Wise-specific logic)
      const expectedSignature = crypto
        .createHmac('sha1', this.config.wiseWebhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      const verified = crypto.timingSafeEqual(
        Buffer.from(signature || ''),
        Buffer.from(`sha1=${expectedSignature}`)
      );

      const webhookEvent: WebhookEvent = {
        id: req.body.data?.resource?.id || `wise_${Date.now()}`,
        type: req.body.event_type,
        gateway: 'wise',
        data: req.body.data,
        timestamp: new Date(req.body.timestamp || Date.now()),
        verified,
      };

      await this.processWebhookEvent(webhookEvent);
      res.status(200).send('Webhook processed');
    } catch (error) {
      logger.error('Wise webhook processing failed:', error);
      res.status(400).send('Webhook processing failed');
    }
  }

  /**
   * Process webhook event based on type and gateway
   */
  private async processWebhookEvent(event: WebhookEvent): Promise<void> {
    try {
      logger.info(`Processing ${event.gateway} webhook:`, {
        id: event.id,
        type: event.type,
        verified: event.verified,
      });

      // Route to appropriate handler based on event type
      if (this.isPaymentEvent(event.type)) {
        await this.handlePaymentEvent(event);
      } else if (this.isPayoutEvent(event.type)) {
        await this.handlePayoutEvent(event);
      } else if (this.isRefundEvent(event.type)) {
        await this.handleRefundEvent(event);
      } else {
        logger.info(`Unhandled webhook event type: ${event.type}`);
      }

      // Log webhook event to database
      await this.logWebhookEvent(event);
    } catch (error) {
      logger.error('Webhook event processing failed:', error);
      throw error;
    }
  }

  /**
   * Handle payment-related webhook events
   */
  private async handlePaymentEvent(event: WebhookEvent): Promise<void> {
    const paymentData = this.extractPaymentData(event);
    
    logger.info(`Payment ${paymentData.status}:`, {
      transactionId: paymentData.transactionId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      gateway: event.gateway,
    });

    // Update payment status in database
    // TODO: Implement database update logic
    // await this.updatePaymentStatus(paymentData);

    // Send notifications if needed
    if (paymentData.status === 'completed') {
      await this.sendPaymentSuccessNotification(paymentData);
    } else if (paymentData.status === 'failed') {
      await this.sendPaymentFailureNotification(paymentData);
    }
  }

  /**
   * Handle payout-related webhook events
   */
  private async handlePayoutEvent(event: WebhookEvent): Promise<void> {
    const payoutData = this.extractPayoutData(event);
    
    logger.info(`Payout ${payoutData.status}:`, {
      payoutId: payoutData.payoutId,
      amount: payoutData.amount,
      currency: payoutData.currency,
      gateway: event.gateway,
    });

    // Update payout status in database
    // TODO: Implement database update logic
    // await this.updatePayoutStatus(payoutData);

    // Send notifications if needed
    if (payoutData.status === 'completed') {
      await this.sendPayoutSuccessNotification(payoutData);
    } else if (payoutData.status === 'failed') {
      await this.sendPayoutFailureNotification(payoutData);
    }
  }

  /**
   * Handle refund-related webhook events
   */
  private async handleRefundEvent(event: WebhookEvent): Promise<void> {
    logger.info(`Refund processed:`, {
      gateway: event.gateway,
      eventId: event.id,
    });

    // TODO: Implement refund handling logic
  }

  /**
   * Check if event is payment-related
   */
  private isPaymentEvent(eventType: string): boolean {
    const paymentEvents = [
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'charge.succeeded',
      'charge.failed',
      'payment.captured',
      'payment.failed',
      'order.paid',
      'transaction.completed',
      'transaction.failed',
    ];
    
    return paymentEvents.some(type => eventType.includes(type));
  }

  /**
   * Check if event is payout-related
   */
  private isPayoutEvent(eventType: string): boolean {
    const payoutEvents = [
      'payout.paid',
      'payout.failed',
      'payout.canceled',
      'transfer.created',
      'transfer.completed',
      'transfer.failed',
    ];
    
    return payoutEvents.some(type => eventType.includes(type));
  }

  /**
   * Check if event is refund-related
   */
  private isRefundEvent(eventType: string): boolean {
    const refundEvents = [
      'charge.dispute.created',
      'refund.created',
      'refund.updated',
      'payment.refunded',
    ];
    
    return refundEvents.some(type => eventType.includes(type));
  }

  /**
   * Extract payment data from webhook event
   */
  private extractPaymentData(event: WebhookEvent): PaymentWebhookData {
    switch (event.gateway) {
      case 'stripe':
        return this.extractStripePaymentData(event);
      case 'razorpay':
        return this.extractRazorpayPaymentData(event);
      case 'payoneer':
        return this.extractPayoneerPaymentData(event);
      case 'wise':
        return this.extractWisePaymentData(event);
      default:
        throw new Error(`Unsupported gateway: ${event.gateway}`);
    }
  }

  /**
   * Extract payout data from webhook event
   */
  private extractPayoutData(event: WebhookEvent): PayoutWebhookData {
    switch (event.gateway) {
      case 'stripe':
        return this.extractStripePayoutData(event);
      case 'razorpay':
        return this.extractRazorpayPayoutData(event);
      case 'payoneer':
        return this.extractPayoneerPayoutData(event);
      case 'wise':
        return this.extractWisePayoutData(event);
      default:
        throw new Error(`Unsupported gateway: ${event.gateway}`);
    }
  }

  // Gateway-specific data extraction methods
  private extractStripePaymentData(event: WebhookEvent): PaymentWebhookData {
    const data = event.data;
    return {
      transactionId: data.id,
      status: this.mapStripeStatus(data.status),
      amount: data.amount / 100, // Convert from cents
      currency: data.currency.toUpperCase(),
      metadata: data.metadata,
      failureReason: data.last_payment_error?.message,
    };
  }

  private extractRazorpayPaymentData(event: WebhookEvent): PaymentWebhookData {
    const data = event.data.payment || event.data.order;
    return {
      transactionId: data.id,
      status: this.mapRazorpayStatus(data.status),
      amount: data.amount / 100, // Convert from paise
      currency: data.currency,
      metadata: data.notes,
      failureReason: data.error_description,
    };
  }

  private extractPayoneerPaymentData(event: WebhookEvent): PaymentWebhookData {
    const data = event.data;
    return {
      transactionId: data.id || data.transaction_id,
      status: this.mapPayoneerStatus(data.status),
      amount: data.amount,
      currency: data.currency,
      metadata: data.metadata,
      failureReason: data.error_message,
    };
  }

  private extractWisePaymentData(event: WebhookEvent): PaymentWebhookData {
    const data = event.data.resource;
    return {
      transactionId: data.id,
      status: this.mapWiseStatus(data.status),
      amount: data.source_value || data.target_value,
      currency: data.source_currency || data.target_currency,
      metadata: data.reference,
      failureReason: data.cancellation_comment,
    };
  }

  // Similar methods for payout data extraction...
  private extractStripePayoutData(event: WebhookEvent): PayoutWebhookData {
    const data = event.data;
    return {
      payoutId: data.id,
      status: this.mapStripePayoutStatus(data.status),
      amount: data.amount / 100,
      currency: data.currency.toUpperCase(),
      metadata: data.metadata,
      failureReason: data.failure_message,
    };
  }

  private extractRazorpayPayoutData(event: WebhookEvent): PayoutWebhookData {
    const data = event.data.payout;
    return {
      payoutId: data.id,
      status: this.mapRazorpayPayoutStatus(data.status),
      amount: data.amount / 100,
      currency: data.currency,
      metadata: data.notes,
      failureReason: data.failure_reason,
    };
  }

  private extractPayoneerPayoutData(event: WebhookEvent): PayoutWebhookData {
    const data = event.data;
    return {
      payoutId: data.id || data.payout_id,
      status: this.mapPayoneerPayoutStatus(data.status),
      amount: data.amount,
      currency: data.currency,
      metadata: data.metadata,
      failureReason: data.error_message,
    };
  }

  private extractWisePayoutData(event: WebhookEvent): PayoutWebhookData {
    const data = event.data.resource;
    return {
      payoutId: data.id,
      status: this.mapWisePayoutStatus(data.status),
      amount: data.source_value,
      currency: data.source_currency,
      metadata: { reference: data.reference },
      failureReason: data.cancellation_comment,
    };
  }

  // Status mapping methods
  private mapStripeStatus(status: string): PaymentWebhookData['status'] {
    const statusMap: Record<string, PaymentWebhookData['status']> = {
      'succeeded': 'completed',
      'pending': 'pending',
      'failed': 'failed',
      'canceled': 'cancelled',
      'refunded': 'refunded',
    };
    return statusMap[status] || 'pending';
  }

  private mapStripePayoutStatus(status: string): PayoutWebhookData['status'] {
    const statusMap: Record<string, PayoutWebhookData['status']> = {
      'succeeded': 'completed',
      'pending': 'pending',
      'failed': 'failed',
      'canceled': 'cancelled',
      'refunded': 'failed', // Map refunded to failed for payouts
    };
    return statusMap[status] || 'pending';
  }

  private mapRazorpayStatus(status: string): PaymentWebhookData['status'] {
    const statusMap: Record<string, PaymentWebhookData['status']> = {
      'captured': 'completed',
      'authorized': 'pending',
      'failed': 'failed',
      'refunded': 'refunded',
    };
    return statusMap[status] || 'pending';
  }

  private mapRazorpayPayoutStatus(status: string): PayoutWebhookData['status'] {
    const statusMap: Record<string, PayoutWebhookData['status']> = {
      'captured': 'completed',
      'authorized': 'pending',
      'failed': 'failed',
      'refunded': 'failed', // Map refunded to failed for payouts
    };
    return statusMap[status] || 'pending';
  }

  private mapPayoneerStatus(status: string): PaymentWebhookData['status'] {
    const statusMap: Record<string, PaymentWebhookData['status']> = {
      'completed': 'completed',
      'pending': 'pending',
      'failed': 'failed',
      'cancelled': 'cancelled',
    };
    return statusMap[status] || 'pending';
  }

  private mapPayoneerPayoutStatus(status: string): PayoutWebhookData['status'] {
    const statusMap: Record<string, PayoutWebhookData['status']> = {
      'completed': 'completed',
      'pending': 'pending',
      'failed': 'failed',
      'cancelled': 'cancelled',
    };
    return statusMap[status] || 'pending';
  }

  private mapWiseStatus(status: string): PaymentWebhookData['status'] {
    const statusMap: Record<string, PaymentWebhookData['status']> = {
      'outgoing_payment_sent': 'completed',
      'processing': 'pending',
      'cancelled': 'cancelled',
      'funds_refunded': 'refunded',
    };
    return statusMap[status] || 'pending';
  }

  private mapWisePayoutStatus(status: string): PayoutWebhookData['status'] {
    const statusMap: Record<string, PayoutWebhookData['status']> = {
      'outgoing_payment_sent': 'completed',
      'processing': 'pending',
      'cancelled': 'cancelled',
      'funds_refunded': 'failed', // Map refunded to failed since PayoutWebhookData doesn't support refunded
    };
    return statusMap[status] || 'pending';
  }

  // Notification methods (stubs)
  private async sendPaymentSuccessNotification(data: PaymentWebhookData): Promise<void> {
    logger.info('Sending payment success notification:', data.transactionId);
    // TODO: Implement notification logic
  }

  private async sendPaymentFailureNotification(data: PaymentWebhookData): Promise<void> {
    logger.info('Sending payment failure notification:', data.transactionId);
    // TODO: Implement notification logic
  }

  private async sendPayoutSuccessNotification(data: PayoutWebhookData): Promise<void> {
    logger.info('Sending payout success notification:', data.payoutId);
    // TODO: Implement notification logic
  }

  private async sendPayoutFailureNotification(data: PayoutWebhookData): Promise<void> {
    logger.info('Sending payout failure notification:', data.payoutId);
    // TODO: Implement notification logic
  }

  // Database logging
  private async logWebhookEvent(event: WebhookEvent): Promise<void> {
    logger.info('Logging webhook event to database:', {
      id: event.id,
      type: event.type,
      gateway: event.gateway,
      verified: event.verified,
    });
    // TODO: Implement database logging
  }
}

/**
 * Create webhook handler instance
 */
export function createWebhookHandler(config?: WebhookConfig): WebhookHandler {
  const defaultConfig: WebhookConfig = {
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    payoneerWebhookSecret: process.env.PAYONEER_WEBHOOK_SECRET,
    wiseWebhookSecret: process.env.WISE_WEBHOOK_SECRET,
  };

  return new WebhookHandler({ ...defaultConfig, ...config });
}