import axios from 'axios';
import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { createAppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

interface PurchaseVerificationResult {
  isValid: boolean;
  purchaseData?: any;
  error?: string;
}

interface SubscriptionDetails {
  orderId: string;
  packageName: string;
  productId: string;
  purchaseTime: number;
  purchaseState: number;
  purchaseToken: string;
  autoRenewing: boolean;
  expiryTimeMillis?: number;
  startTimeMillis?: number;
  countryCode?: string;
  developerPayload?: string;
}

export class BillingService {
  private androidPublisher: any;
  private packageName: string;

  constructor() {
    this.packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || '';
    if (this.packageName && process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_FILE) {
      this.initializeGooglePlayAPI();
    } else {
      logger.warn('Google Play API credentials not configured. Billing service will have limited functionality.');
    }
  }

  /**
   * Initialize Google Play Developer API
   */
  private async initializeGooglePlayAPI() {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_FILE,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });

      this.androidPublisher = google.androidpublisher({
        version: 'v3',
        auth,
      });

      logger.info('Google Play Developer API initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Play Developer API:', error);
      logger.warn('Google Play API initialization failed. Some billing features may not work.');
    }
  }

  /**
   * Verify a purchase token with Google Play
   */
  async verifyPurchase(
    productId: string,
    purchaseToken: string,
    isSubscription: boolean = true
  ): Promise<PurchaseVerificationResult> {
    try {
      if (!this.androidPublisher) {
        await this.initializeGooglePlayAPI();
      }

      let response;

      if (isSubscription) {
        response = await this.androidPublisher.purchases.subscriptions.get({
          packageName: this.packageName,
          subscriptionId: productId,
          token: purchaseToken,
        });
      } else {
        response = await this.androidPublisher.purchases.products.get({
          packageName: this.packageName,
          productId: productId,
          token: purchaseToken,
        });
      }

      const purchaseData = response.data;

      // Check if purchase is valid
      const isValid = this.validatePurchaseData(purchaseData, isSubscription);

      return {
        isValid,
        purchaseData,
      };
    } catch (error) {
      logger.error('Purchase verification failed:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate purchase data
   */
  private validatePurchaseData(purchaseData: any, isSubscription: boolean): boolean {
    if (!purchaseData) return false;

    if (isSubscription) {
      // For subscriptions, check if it's active and not cancelled
      return (
        purchaseData.purchaseState === 0 && // Purchased
        purchaseData.paymentState === 1 && // Received
        (!purchaseData.cancelReason || purchaseData.cancelReason === 0) // Not cancelled
      );
    } else {
      // For one-time purchases, check if it's purchased
      return purchaseData.purchaseState === 0; // Purchased
    }
  }

  /**
   * Process subscription purchase
   */
  async processSubscriptionPurchase(
    userId: string,
    appId: string,
    purchaseToken: string,
    productId: string,
    orderId: string
  ): Promise<string> {
    try {
      // Verify purchase with Google Play
      const verificationResult = await this.verifyPurchase(productId, purchaseToken, true);

      if (!verificationResult.isValid) {
        throw createAppError('Invalid purchase token', 400);
      }

      const purchaseData = verificationResult.purchaseData;

      // Check if subscription already exists
      const existingSubscription = await prisma.subscription.findFirst({
        where: {
          OR: [
            { purchaseToken },
            { orderId },
          ],
        },
      });

      if (existingSubscription) {
        throw createAppError('Subscription already exists', 400);
      }

      // Calculate subscription dates
      const startDate = new Date(parseInt(purchaseData.startTimeMillis || Date.now().toString()));
      const endDate = purchaseData.expiryTimeMillis 
        ? new Date(parseInt(purchaseData.expiryTimeMillis))
        : null;

      // Create subscription record
      const subscription = await prisma.subscription.create({
        data: {
          userId,
          appId,
          purchaseToken,
          productId,
          orderId,
          status: 'ACTIVE',
          startDate,
          endDate,
          autoRenewing: purchaseData.autoRenewing || false,
          metadata: {
            googlePlayData: purchaseData,
            verifiedAt: new Date().toISOString(),
          },
        },
      });

      // Create transaction record
      await this.createTransactionRecord(
        userId,
        appId,
        subscription.id,
        purchaseData,
        'SUBSCRIPTION'
      );

      // Update app subscription count
      await prisma.app.update({
        where: { id: appId },
        data: {
          subscriptionCount: {
            increment: 1,
          },
        },
      });

      logger.info(`Subscription processed successfully: ${subscription.id}`);
      return subscription.id;
    } catch (error) {
      logger.error('Failed to process subscription purchase:', error);
      throw error;
    }
  }

  /**
   * Process one-time purchase
   */
  async processOneTimePurchase(
    userId: string,
    appId: string,
    purchaseToken: string,
    productId: string,
    orderId: string
  ): Promise<string> {
    try {
      // Verify purchase with Google Play
      const verificationResult = await this.verifyPurchase(productId, purchaseToken, false);

      if (!verificationResult.isValid) {
        throw createAppError('Invalid purchase token', 400);
      }

      const purchaseData = verificationResult.purchaseData;

      // Check if transaction already exists
      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          OR: [
            { purchaseToken },
            { orderId },
          ],
        },
      });

      if (existingTransaction) {
        throw createAppError('Transaction already exists', 400);
      }

      // Create transaction record
      const transaction = await this.createTransactionRecord(
        userId,
        appId,
        null,
        purchaseData,
        'ONE_TIME'
      );

      // Update app download count (for paid apps)
      await prisma.app.update({
        where: { id: appId },
        data: {
          downloadCount: {
            increment: 1,
          },
        },
      });

      logger.info(`One-time purchase processed successfully: ${transaction.id}`);
      return transaction.id;
    } catch (error) {
      logger.error('Failed to process one-time purchase:', error);
      throw error;
    }
  }

  /**
   * Create transaction record
   */
  private async createTransactionRecord(
    userId: string,
    appId: string,
    subscriptionId: string | null,
    purchaseData: any,
    type: 'SUBSCRIPTION' | 'ONE_TIME'
  ): Promise<any> {
    // Get app pricing information
    const app = await prisma.app.findUnique({
      where: { id: appId },
      select: { price: true, currency: true },
    });

    if (!app) {
      throw createAppError('App not found', 404);
    }

    return await prisma.transaction.create({
      data: {
        userId,
        appId,
        subscriptionId,
        purchaseToken: purchaseData.purchaseToken || purchaseData.token,
        orderId: purchaseData.orderId,
        productId: purchaseData.productId,
        amount: app.price || 0,
        currency: app.currency || 'USD',
        status: 'COMPLETED',
        type,
        metadata: {
          googlePlayData: purchaseData,
          verifiedAt: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, userId: string): Promise<void> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          id: subscriptionId,
          userId,
        },
      });

      if (!subscription) {
        throw createAppError('Subscription not found', 404);
      }

      if (subscription.status !== 'ACTIVE') {
        throw createAppError('Subscription is not active', 400);
      }

      // Cancel subscription with Google Play (if needed)
      // Note: Users typically cancel through Google Play directly
      // This is mainly for updating our records

      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'CANCELLED',
          endDate: new Date(),
          cancelledAt: new Date(),
        },
      });

      // Update app subscription count
      await prisma.app.update({
        where: { id: subscription.appId },
        data: {
          subscriptionCount: {
            decrement: 1,
          },
        },
      });

      logger.info(`Subscription cancelled: ${subscriptionId}`);
    } catch (error) {
      logger.error('Failed to cancel subscription:', error);
      throw error;
    }
  }

  /**
   * Handle Google Play webhook notifications
   */
  async handleWebhookNotification(notification: any): Promise<void> {
    try {
      const { subscriptionNotification, oneTimeProductNotification } = notification;

      if (subscriptionNotification) {
        await this.handleSubscriptionNotification(subscriptionNotification);
      }

      if (oneTimeProductNotification) {
        await this.handleOneTimeProductNotification(oneTimeProductNotification);
      }
    } catch (error) {
      logger.error('Failed to handle webhook notification:', error);
      throw error;
    }
  }

  /**
   * Handle subscription notification from Google Play
   */
  private async handleSubscriptionNotification(notification: any): Promise<void> {
    const { subscriptionId, purchaseToken, notificationType } = notification;

    const subscription = await prisma.subscription.findFirst({
      where: { purchaseToken },
    });

    if (!subscription) {
      logger.warn(`Subscription not found for purchase token: ${purchaseToken}`);
      return;
    }

    switch (notificationType) {
      case 1: // SUBSCRIPTION_RECOVERED
        await this.handleSubscriptionRecovered(subscription);
        break;
      case 2: // SUBSCRIPTION_RENEWED
        await this.handleSubscriptionRenewed(subscription);
        break;
      case 3: // SUBSCRIPTION_CANCELED
        await this.handleSubscriptionCancelled(subscription);
        break;
      case 4: // SUBSCRIPTION_PURCHASED
        // Already handled during initial purchase
        break;
      case 5: // SUBSCRIPTION_ON_HOLD
        await this.handleSubscriptionOnHold(subscription);
        break;
      case 6: // SUBSCRIPTION_IN_GRACE_PERIOD
        await this.handleSubscriptionInGracePeriod(subscription);
        break;
      case 7: // SUBSCRIPTION_RESTARTED
        await this.handleSubscriptionRestarted(subscription);
        break;
      case 8: // SUBSCRIPTION_PRICE_CHANGE_CONFIRMED
        await this.handleSubscriptionPriceChangeConfirmed(subscription);
        break;
      case 9: // SUBSCRIPTION_DEFERRED
        await this.handleSubscriptionDeferred(subscription);
        break;
      case 10: // SUBSCRIPTION_PAUSED
        await this.handleSubscriptionPaused(subscription);
        break;
      case 11: // SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED
        await this.handleSubscriptionPauseScheduleChanged(subscription);
        break;
      case 12: // SUBSCRIPTION_REVOKED
        await this.handleSubscriptionRevoked(subscription);
        break;
      case 13: // SUBSCRIPTION_EXPIRED
        await this.handleSubscriptionExpired(subscription);
        break;
      default:
        logger.warn(`Unknown subscription notification type: ${notificationType}`);
    }
  }

  /**
   * Handle one-time product notification from Google Play
   */
  private async handleOneTimeProductNotification(notification: any): Promise<void> {
    const { sku, purchaseToken, notificationType } = notification;

    const transaction = await prisma.transaction.findFirst({
      where: { purchaseToken },
    });

    if (!transaction) {
      logger.warn(`Transaction not found for purchase token: ${purchaseToken}`);
      return;
    }

    switch (notificationType) {
      case 1: // ONE_TIME_PRODUCT_PURCHASED
        // Already handled during initial purchase
        break;
      case 2: // ONE_TIME_PRODUCT_CANCELED
        await this.handleOneTimeProductCancelled(transaction);
        break;
      default:
        logger.warn(`Unknown one-time product notification type: ${notificationType}`);
    }
  }

  // Subscription notification handlers
  private async handleSubscriptionRecovered(subscription: any): Promise<void> {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'ACTIVE' },
    });
  }

  private async handleSubscriptionRenewed(subscription: any): Promise<void> {
    // Verify the renewed subscription and update end date
    const verificationResult = await this.verifyPurchase(
      subscription.productId,
      subscription.purchaseToken,
      true
    );

    if (verificationResult.isValid && verificationResult.purchaseData) {
      const newEndDate = verificationResult.purchaseData.expiryTimeMillis
        ? new Date(parseInt(verificationResult.purchaseData.expiryTimeMillis))
        : null;

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'ACTIVE',
          endDate: newEndDate,
        },
      });
    }
  }

  private async handleSubscriptionCancelled(subscription: any): Promise<void> {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });
  }

  private async handleSubscriptionOnHold(subscription: any): Promise<void> {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'ON_HOLD' },
    });
  }

  private async handleSubscriptionInGracePeriod(subscription: any): Promise<void> {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'GRACE_PERIOD' },
    });
  }

  private async handleSubscriptionRestarted(subscription: any): Promise<void> {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'ACTIVE' },
    });
  }

  private async handleSubscriptionPriceChangeConfirmed(subscription: any): Promise<void> {
    // Update subscription with new price information if needed
    logger.info(`Price change confirmed for subscription: ${subscription.id}`);
  }

  private async handleSubscriptionDeferred(subscription: any): Promise<void> {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'DEFERRED' },
    });
  }

  private async handleSubscriptionPaused(subscription: any): Promise<void> {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'PAUSED' },
    });
  }

  private async handleSubscriptionPauseScheduleChanged(subscription: any): Promise<void> {
    logger.info(`Pause schedule changed for subscription: ${subscription.id}`);
  }

  private async handleSubscriptionRevoked(subscription: any): Promise<void> {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'REVOKED',
        endDate: new Date(),
      },
    });
  }

  private async handleSubscriptionExpired(subscription: any): Promise<void> {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'EXPIRED',
        endDate: new Date(),
      },
    });
  }

  private async handleOneTimeProductCancelled(transaction: any): Promise<void> {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(subscriptionId: string): Promise<any> {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        app: {
          select: {
            name: true,
            icon: true,
          },
        },
      },
    });

    if (!subscription) {
      throw createAppError('Subscription not found', 404);
    }

    // Verify current status with Google Play
    const verificationResult = await this.verifyPurchase(
      subscription.productId,
      subscription.purchaseToken,
      true
    );

    return {
      ...subscription,
      googlePlayStatus: verificationResult.purchaseData,
      isValid: verificationResult.isValid,
    };
  }

  /**
   * Sync all subscriptions with Google Play
   */
  async syncSubscriptions(): Promise<void> {
    try {
      const activeSubscriptions = await prisma.subscription.findMany({
        where: {
          status: {
            in: ['ACTIVE', 'GRACE_PERIOD', 'ON_HOLD'],
          },
        },
      });

      for (const subscription of activeSubscriptions) {
        try {
          const verificationResult = await this.verifyPurchase(
            subscription.productId,
            subscription.purchaseToken,
            true
          );

          if (!verificationResult.isValid) {
            await prisma.subscription.update({
              where: { id: subscription.id },
              data: { status: 'EXPIRED' },
            });
          } else if (verificationResult.purchaseData) {
            const purchaseData = verificationResult.purchaseData;
            const newEndDate = purchaseData.expiryTimeMillis
              ? new Date(parseInt(purchaseData.expiryTimeMillis))
              : null;

            await prisma.subscription.update({
              where: { id: subscription.id },
              data: {
                endDate: newEndDate,
                autoRenewing: purchaseData.autoRenewing || false,
              },
            });
          }
        } catch (error) {
          logger.error(`Failed to sync subscription ${subscription.id}:`, error);
        }
      }

      logger.info('Subscription sync completed');
    } catch (error) {
      logger.error('Failed to sync subscriptions:', error);
      throw error;
    }
  }
}

export const billingService = new BillingService();