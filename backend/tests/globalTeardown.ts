import { PrismaClient } from '@prisma/client';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');

  try {
    const prisma = new PrismaClient();

    // Clean up test data
    console.log('🗑️ Cleaning test data...');
    
    // Delete in correct order to respect foreign key constraints
    await prisma.reviewHelpful.deleteMany();
    await prisma.reviewReport.deleteMany();
    await prisma.appReport.deleteMany();
    await prisma.refundRequest.deleteMany();
    await prisma.paymentOrder.deleteMany();
    await prisma.purchase.deleteMany();
    await prisma.download.deleteMany();
    await prisma.review.deleteMany();
    await prisma.app.deleteMany();
    await prisma.user.deleteMany();
    await prisma.category.deleteMany();

    await prisma.$disconnect();
    console.log('✅ Test environment cleanup complete!');
  } catch (error) {
    console.error('❌ Failed to cleanup test environment:', error);
  }
}