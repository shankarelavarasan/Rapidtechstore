import Stripe from 'stripe';

// Initialize Stripe only if a valid API key is provided
let stripe: Stripe | null = null;

if (process.env.STRIPE_SECRET_KEY && 
    (process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') || 
     process.env.STRIPE_SECRET_KEY.startsWith('sk_live_'))) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
    typescript: true,
  });
}

export { stripe };

export interface CreatePaymentIntentParams {
  amount: number; // Amount in cents
  currency: string;
  customerId?: string;
  metadata?: Record<string, string>;
  description?: string;
}

export interface CreateCustomerParams {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export class StripeService {
  /**
   * Create a payment intent for processing payments
   */
  static async createPaymentIntent(params: CreatePaymentIntentParams): Promise<Stripe.PaymentIntent> {
    if (!stripe) {
      throw new Error('Stripe is not initialized. Please check your STRIPE_SECRET_KEY configuration.');
    }
    
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency,
        customer: params.customerId,
        metadata: params.metadata || {},
        description: params.description,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Create a Stripe customer
   */
  static async createCustomer(params: CreateCustomerParams): Promise<Stripe.Customer> {
    if (!stripe) {
      throw new Error('Stripe is not initialized. Please check your STRIPE_SECRET_KEY configuration.');
    }
    
    try {
      const customer = await stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: params.metadata || {},
      });

      return customer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  /**
   * Retrieve a payment intent
   */
  static async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    if (!stripe) {
      throw new Error('Stripe is not initialized. Please check your STRIPE_SECRET_KEY configuration.');
    }
    
    try {
      return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      throw error;
    }
  }

  /**
   * Confirm a payment intent
   */
  static async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<Stripe.PaymentIntent> {
    if (!stripe) {
      throw new Error('Stripe is not initialized. Please check your STRIPE_SECRET_KEY configuration.');
    }
    
    try {
      return await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });
    } catch (error) {
      console.error('Error confirming payment intent:', error);
      throw error;
    }
  }

  /**
   * Create a refund
   */
  static async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: Stripe.RefundCreateParams.Reason
  ): Promise<Stripe.Refund> {
    if (!stripe) {
      throw new Error('Stripe is not initialized. Please check your STRIPE_SECRET_KEY configuration.');
    }
    
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount,
        reason,
      });

      return refund;
    } catch (error) {
      console.error('Error creating refund:', error);
      throw error;
    }
  }

  /**
   * Construct webhook event from raw body and signature
   */
  static constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    endpointSecret: string
  ): Stripe.Event {
    if (!stripe) {
      throw new Error('Stripe is not initialized. Please check your STRIPE_SECRET_KEY configuration.');
    }
    
    try {
      return stripe.webhooks.constructEvent(payload, signature, endpointSecret);
    } catch (error) {
      console.error('Error constructing webhook event:', error);
      throw error;
    }
  }
}