import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { createAppError } from '../middleware/errorHandler';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface PayoutRequest {
  developerId: string;
  amount: number;
  currency: string;
  method: 'razorpay' | 'payoneer' | 'bank_transfer';
  accountDetails: any;
}

interface PayoutResult {
  payoutId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  transactionId?: string;
  error?: string;
}

interface DeveloperEarnings {
  developerId: string;
  totalEarnings: number;
  availableBalance: number;
  pendingPayouts: number;
  lastPayoutDate?: Date;
  monthlyEarnings: { month: string; earnings: number }[];
}

export class PayoutService {
  private razorpayApiKey: string;
  private razorpayApiSecret: string;
  private payoneerApiKey: string;
  private payoneerApiSecret: string;
  private platformFeePercentage: number = 20; // 20% platform fee

  constructor() {
    this.razorpayApiKey = process.env.RAZORPAY_API_KEY!;
    this.razorpayApiSecret = process.env.RAZORPAY_API_SECRET!;
    this.payoneerApiKey = process.env.PAYONEER_API_KEY!;
    this.payoneerApiSecret = process.env.PAYONEER_API_SECRET!;
  }

  /**
   * Calculate developer earnings from transactions
   */
  async calculateDeveloperEarnings(
    developerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<DeveloperEarnings> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);

      // Get all completed transactions for developer's apps
      const transactions = await prisma.transaction.findMany({
        where: {
          app: { developerId },
          status: 'COMPLETED',
          createdAt: dateFilter,
        },
        include: {
          app: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Calculate total earnings (after platform fee)
      const totalRevenue = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      const platformFee = totalRevenue * (this.platformFeePercentage / 100);
      const totalEarnings = totalRevenue - platformFee;

      // Get pending payouts
      const pendingPayouts = await prisma.payout.aggregate({
        where: {
          developerId,
          status: {
            in: ['PENDING', 'PROCESSING'],
          },
        },
        _sum: { amount: true },
      });

      // Get completed payouts
      const completedPayouts = await prisma.payout.aggregate({
        where: {
          developerId,
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      });

      const availableBalance = totalEarnings - (completedPayouts._sum.amount || 0) - (pendingPayouts._sum.amount || 0);

      // Get last payout date
      const lastPayout = await prisma.payout.findFirst({
        where: {
          developerId,
          status: 'COMPLETED',
        },
        orderBy: { completedAt: 'desc' },
      });

      // Get monthly earnings for the last 12 months
      const monthlyEarnings = await this.getMonthlyEarnings(developerId, 12);

      return {
        developerId,
        totalEarnings,
        availableBalance: Math.max(0, availableBalance),
        pendingPayouts: pendingPayouts._sum.amount || 0,
        lastPayoutDate: lastPayout?.completedAt,
        monthlyEarnings,
      };
    } catch (error) {
      logger.error('Failed to calculate developer earnings:', error);
      throw createAppError('Failed to calculate earnings', 500);
    }
  }

  /**
   * Request a payout
   */
  async requestPayout(payoutRequest: PayoutRequest): Promise<string> {
    try {
      const { developerId, amount, currency, method, accountDetails } = payoutRequest;

      // Validate developer
      const developer = await prisma.developer.findUnique({
        where: { id: developerId },
      });

      if (!developer || developer.status !== 'VERIFIED') {
        throw createAppError('Developer not found or not verified', 404);
      }

      // Check available balance
      const earnings = await this.calculateDeveloperEarnings(developerId);
      if (amount > earnings.availableBalance) {
        throw createAppError('Insufficient balance for payout', 400);
      }

      // Minimum payout amount check
      const minimumPayout = method === 'payoneer' ? 50 : 10; // USD
      if (amount < minimumPayout) {
        throw createAppError(`Minimum payout amount is $${minimumPayout}`, 400);
      }

      // Create payout record
      const payout = await prisma.payout.create({
        data: {
          developerId,
          amount,
          currency,
          method,
          accountDetails,
          status: 'PENDING',
          requestedAt: new Date(),
        },
      });

      // Process payout based on method
      let result: PayoutResult;
      switch (method) {
        case 'razorpay':
          result = await this.processRazorpayPayout(payout.id, amount, currency, accountDetails);
          break;
        case 'payoneer':
          result = await this.processPayoneerPayout(payout.id, amount, currency, accountDetails);
          break;
        case 'bank_transfer':
          result = await this.processBankTransferPayout(payout.id, amount, currency, accountDetails);
          break;
        default:
          throw createAppError('Invalid payout method', 400);
      }

      // Update payout record with result
      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: result.status,
          transactionId: result.transactionId,
          error: result.error,
          processedAt: result.status !== 'PENDING' ? new Date() : null,
        },
      });

      logger.info(`Payout requested: ${payout.id} for developer: ${developerId}`);
      return payout.id;
    } catch (error) {
      logger.error('Failed to request payout:', error);
      throw error;
    }
  }

  /**
   * Process RazorpayX payout
   */
  private async processRazorpayPayout(
    payoutId: string,
    amount: number,
    currency: string,
    accountDetails: any
  ): Promise<PayoutResult> {
    try {
      const auth = Buffer.from(`${this.razorpayApiKey}:${this.razorpayApiSecret}`).toString('base64');

      const payoutData = {
        account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
        amount: amount * 100, // Convert to paise
        currency: currency.toUpperCase(),
        mode: accountDetails.mode || 'IMPS',
        purpose: 'payout',
        fund_account: {
          account_type: accountDetails.account_type || 'bank_account',
          bank_account: {
            name: accountDetails.account_holder_name,
            ifsc: accountDetails.ifsc_code,
            account_number: accountDetails.account_number,
          },
          contact: {
            name: accountDetails.contact_name,
            email: accountDetails.email,
            contact: accountDetails.phone,
            type: 'vendor',
          },
        },
        queue_if_low_balance: true,
        reference_id: payoutId,
      };

      const response = await axios.post(
        'https://api.razorpay.com/v1/payouts',
        payoutData,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        payoutId,
        status: this.mapRazorpayStatus(response.data.status),
        transactionId: response.data.id,
      };
    } catch (error: any) {
      logger.error('RazorpayX payout failed:', error.response?.data || error.message);
      return {
        payoutId,
        status: 'FAILED',
        error: error.response?.data?.error?.description || error.message,
      };
    }
  }

  /**
   * Process Payoneer payout
   */
  private async processPayoneerPayout(
    payoutId: string,
    amount: number,
    currency: string,
    accountDetails: any
  ): Promise<PayoutResult> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = this.generatePayoneerSignature(payoutId, amount, timestamp);

      const payoutData = {
        program_id: process.env.PAYONEER_PROGRAM_ID,
        partner_id: process.env.PAYONEER_PARTNER_ID,
        timestamp,
        signature,
        payee_id: accountDetails.payee_id,
        amount,
        currency: currency.toUpperCase(),
        description: `App Store Payout - ${payoutId}`,
        payment_id: payoutId,
      };

      const response = await axios.post(
        'https://api.sandbox.payoneer.com/v2/payments',
        payoutData,
        {
          headers: {
            'Authorization': `Bearer ${this.payoneerApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        payoutId,
        status: this.mapPayoneerStatus(response.data.status),
        transactionId: response.data.payment_id,
      };
    } catch (error: any) {
      logger.error('Payoneer payout failed:', error.response?.data || error.message);
      return {
        payoutId,
        status: 'FAILED',
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Process bank transfer payout (manual processing)
   */
  private async processBankTransferPayout(
    payoutId: string,
    amount: number,
    currency: string,
    accountDetails: any
  ): Promise<PayoutResult> {
    // For bank transfers, we'll mark as pending for manual processing
    // In a real implementation, this could integrate with banking APIs
    
    logger.info(`Bank transfer payout queued for manual processing: ${payoutId}`);
    
    return {
      payoutId,
      status: 'PENDING',
    };
  }

  /**
   * Get payout status
   */
  async getPayoutStatus(payoutId: string): Promise<any> {
    try {
      const payout = await prisma.payout.findUnique({
        where: { id: payoutId },
        include: {
          developer: {
            select: {
              companyName: true,
              email: true,
            },
          },
        },
      });

      if (!payout) {
        throw createAppError('Payout not found', 404);
      }

      // If payout is processing, check status with payment provider
      if (payout.status === 'PROCESSING' && payout.transactionId) {
        const updatedStatus = await this.checkPaymentProviderStatus(
          payout.method,
          payout.transactionId
        );

        if (updatedStatus !== payout.status) {
          await prisma.payout.update({
            where: { id: payoutId },
            data: {
              status: updatedStatus,
              completedAt: updatedStatus === 'COMPLETED' ? new Date() : null,
            },
          });

          payout.status = updatedStatus;
        }
      }

      return payout;
    } catch (error) {
      logger.error('Failed to get payout status:', error);
      throw createAppError('Failed to retrieve payout status', 500);
    }
  }

  /**
   * Get developer payouts
   */
  async getDeveloperPayouts(
    developerId: string,
    status?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    try {
      const skip = (page - 1) * limit;
      const where: any = { developerId };

      if (status) {
        where.status = status;
      }

      const [payouts, total] = await Promise.all([
        prisma.payout.findMany({
          where,
          orderBy: { requestedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.payout.count({ where }),
      ]);

      return {
        payouts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to get developer payouts:', error);
      throw createAppError('Failed to retrieve payouts', 500);
    }
  }

  /**
   * Process automatic payouts (scheduled job)
   */
  async processAutomaticPayouts(): Promise<void> {
    try {
      logger.info('Starting automatic payout processing...');

      // Get developers with automatic payout enabled and sufficient balance
      const developers = await prisma.developer.findMany({
        where: {
          status: 'VERIFIED',
          autoPayoutEnabled: true,
          autoPayoutThreshold: { gt: 0 },
        },
      });

      for (const developer of developers) {
        try {
          const earnings = await this.calculateDeveloperEarnings(developer.id);

          // Check if balance exceeds threshold
          if (earnings.availableBalance >= developer.autoPayoutThreshold!) {
            // Check if last payout was more than the minimum interval ago
            const lastPayout = await prisma.payout.findFirst({
              where: {
                developerId: developer.id,
                status: 'COMPLETED',
              },
              orderBy: { completedAt: 'desc' },
            });

            const daysSinceLastPayout = lastPayout
              ? Math.floor((Date.now() - lastPayout.completedAt!.getTime()) / (1000 * 60 * 60 * 24))
              : Infinity;

            const minimumInterval = developer.autoPayoutInterval || 7; // Default 7 days

            if (daysSinceLastPayout >= minimumInterval) {
              // Get developer's preferred payout method
              const payoutMethod = developer.preferredPayoutMethod || 'razorpay';
              const accountDetails = developer.payoutAccountDetails;

              if (accountDetails) {
                await this.requestPayout({
                  developerId: developer.id,
                  amount: earnings.availableBalance,
                  currency: 'USD',
                  method: payoutMethod as any,
                  accountDetails,
                });

                logger.info(`Automatic payout processed for developer: ${developer.id}`);
              } else {
                logger.warn(`No payout account details for developer: ${developer.id}`);
              }
            }
          }
        } catch (error) {
          logger.error(`Failed to process automatic payout for developer ${developer.id}:`, error);
        }
      }

      logger.info('Automatic payout processing completed');
    } catch (error) {
      logger.error('Failed to process automatic payouts:', error);
      throw error;
    }
  }

  /**
   * Update payout account details
   */
  async updatePayoutAccountDetails(
    developerId: string,
    method: string,
    accountDetails: any
  ): Promise<void> {
    try {
      await prisma.developer.update({
        where: { id: developerId },
        data: {
          preferredPayoutMethod: method,
          payoutAccountDetails: accountDetails,
        },
      });

      logger.info(`Payout account details updated for developer: ${developerId}`);
    } catch (error) {
      logger.error('Failed to update payout account details:', error);
      throw createAppError('Failed to update account details', 500);
    }
  }

  /**
   * Enable/disable automatic payouts
   */
  async updateAutoPayoutSettings(
    developerId: string,
    enabled: boolean,
    threshold?: number,
    interval?: number
  ): Promise<void> {
    try {
      const updateData: any = {
        autoPayoutEnabled: enabled,
      };

      if (threshold !== undefined) {
        updateData.autoPayoutThreshold = threshold;
      }

      if (interval !== undefined) {
        updateData.autoPayoutInterval = interval;
      }

      await prisma.developer.update({
        where: { id: developerId },
        data: updateData,
      });

      logger.info(`Auto payout settings updated for developer: ${developerId}`);
    } catch (error) {
      logger.error('Failed to update auto payout settings:', error);
      throw createAppError('Failed to update auto payout settings', 500);
    }
  }

  /**
   * Get payout analytics for admin
   */
  async getPayoutAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);

      const [
        totalPayouts,
        completedPayouts,
        pendingPayouts,
        failedPayouts,
        totalAmount,
        payoutsByMethod,
        monthlyPayouts,
      ] = await Promise.all([
        // Total payouts count
        prisma.payout.count({
          where: { requestedAt: dateFilter },
        }),

        // Completed payouts
        prisma.payout.count({
          where: {
            status: 'COMPLETED',
            requestedAt: dateFilter,
          },
        }),

        // Pending payouts
        prisma.payout.count({
          where: {
            status: {
              in: ['PENDING', 'PROCESSING'],
            },
            requestedAt: dateFilter,
          },
        }),

        // Failed payouts
        prisma.payout.count({
          where: {
            status: 'FAILED',
            requestedAt: dateFilter,
          },
        }),

        // Total payout amount
        prisma.payout.aggregate({
          where: {
            status: 'COMPLETED',
            requestedAt: dateFilter,
          },
          _sum: { amount: true },
        }),

        // Payouts by method
        prisma.payout.groupBy({
          by: ['method'],
          where: { requestedAt: dateFilter },
          _count: true,
          _sum: { amount: true },
        }),

        // Monthly payout trends
        this.getMonthlyPayoutTrends(12),
      ]);

      return {
        summary: {
          totalPayouts,
          completedPayouts,
          pendingPayouts,
          failedPayouts,
          totalAmount: totalAmount._sum.amount || 0,
          successRate: totalPayouts > 0 ? (completedPayouts / totalPayouts) * 100 : 0,
        },
        payoutsByMethod,
        monthlyPayouts,
      };
    } catch (error) {
      logger.error('Failed to get payout analytics:', error);
      throw createAppError('Failed to retrieve payout analytics', 500);
    }
  }

  // Helper methods

  private buildDateFilter(startDate?: Date, endDate?: Date): any {
    if (!startDate && !endDate) return undefined;

    const filter: any = {};
    if (startDate) filter.gte = startDate;
    if (endDate) filter.lte = endDate;

    return filter;
  }

  private async getMonthlyEarnings(
    developerId: string,
    months: number
  ): Promise<{ month: string; earnings: number }[]> {
    const result = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const revenue = await prisma.transaction.aggregate({
        where: {
          app: { developerId },
          status: 'COMPLETED',
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: { amount: true },
      });

      const totalRevenue = revenue._sum.amount || 0;
      const earnings = totalRevenue * (1 - this.platformFeePercentage / 100);

      result.unshift({
        month: monthStart.toISOString().slice(0, 7), // YYYY-MM format
        earnings,
      });
    }

    return result;
  }

  private async getMonthlyPayoutTrends(months: number): Promise<{ month: string; amount: number; count: number }[]> {
    const result = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const [amount, count] = await Promise.all([
        prisma.payout.aggregate({
          where: {
            status: 'COMPLETED',
            completedAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          _sum: { amount: true },
        }),
        prisma.payout.count({
          where: {
            status: 'COMPLETED',
            completedAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        }),
      ]);

      result.unshift({
        month: monthStart.toISOString().slice(0, 7),
        amount: amount._sum.amount || 0,
        count,
      });
    }

    return result;
  }

  private mapRazorpayStatus(status: string): 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' {
    switch (status) {
      case 'queued':
      case 'pending':
        return 'PENDING';
      case 'processing':
        return 'PROCESSING';
      case 'processed':
        return 'COMPLETED';
      case 'failed':
      case 'cancelled':
        return 'FAILED';
      default:
        return 'PENDING';
    }
  }

  private mapPayoneerStatus(status: string): 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' {
    switch (status) {
      case 'pending':
        return 'PENDING';
      case 'processing':
        return 'PROCESSING';
      case 'completed':
        return 'COMPLETED';
      case 'failed':
      case 'cancelled':
        return 'FAILED';
      default:
        return 'PENDING';
    }
  }

  private generatePayoneerSignature(payoutId: string, amount: number, timestamp: number): string {
    const data = `${payoutId}${amount}${timestamp}`;
    return crypto
      .createHmac('sha256', this.payoneerApiSecret)
      .update(data)
      .digest('hex');
  }

  private async checkPaymentProviderStatus(method: string, transactionId: string): Promise<string> {
    try {
      switch (method) {
        case 'razorpay':
          return await this.checkRazorpayStatus(transactionId);
        case 'payoneer':
          return await this.checkPayoneerStatus(transactionId);
        default:
          return 'PROCESSING';
      }
    } catch (error) {
      logger.error('Failed to check payment provider status:', error);
      return 'PROCESSING';
    }
  }

  private async checkRazorpayStatus(transactionId: string): Promise<string> {
    const auth = Buffer.from(`${this.razorpayApiKey}:${this.razorpayApiSecret}`).toString('base64');

    const response = await axios.get(
      `https://api.razorpay.com/v1/payouts/${transactionId}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      }
    );

    return this.mapRazorpayStatus(response.data.status);
  }

  private async checkPayoneerStatus(transactionId: string): Promise<string> {
    const response = await axios.get(
      `https://api.sandbox.payoneer.com/v2/payments/${transactionId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.payoneerApiKey}`,
        },
      }
    );

    return this.mapPayoneerStatus(response.data.status);
  }
}

export const payoutService = new PayoutService();