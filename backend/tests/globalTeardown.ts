import { PrismaClient } from '@prisma/client';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');

  try {
    const prisma = new PrismaClient();

    // Clean up test data
    console.log('🗑️ Cleaning test data...');
    
    // Delete in correct order to respect foreign key constraints
    await prisma.paymentAnalytics.deleteMany();
    await prisma.geoLocationCache.deleteMany();
    await prisma.webhookEvent.deleteMany();
    await prisma.currencyRate.deleteMany();
    await prisma.gatewayConfig.deleteMany();
    await prisma.paymentRetry.deleteMany();
    await prisma.paymentEvent.deleteMany();
    await prisma.unifiedPayment.deleteMany();
    await prisma.purchase.deleteMany();
    await prisma.download.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.review.deleteMany();
    await prisma.appAnalytics.deleteMany();
    await prisma.developerAnalytics.deleteMany();
    await prisma.app.deleteMany();
    await prisma.payout.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.admin.deleteMany();
    await prisma.developer.deleteMany();
    await prisma.user.deleteMany();
    await prisma.systemConfig.deleteMany();

    await prisma.$disconnect();
    console.log('✅ Test environment cleanup complete!');
  } catch (error) {
    console.error('❌ Failed to cleanup test environment:', error);
  }
}