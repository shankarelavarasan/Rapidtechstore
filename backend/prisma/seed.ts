import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create sample developers
  const developer1 = await prisma.developer.upsert({
    where: { email: 'contact@techcorp.com' },
    update: {},
    create: {
      id: 'dev-1',
      email: 'contact@techcorp.com',
      password: 'hashedpassword123',
      firstName: 'John',
      lastName: 'Smith',
      companyName: 'TechCorp Solutions Ltd',
      businessEmail: 'business@techcorp.com',
      website: 'https://techcorp.com',
      address: '123 Tech Street, Silicon Valley, CA',
      phoneNumber: '+1-555-0123',
      country: 'United States',
      isEmailVerified: true,
      verificationStatus: 'APPROVED',
      approvedAt: new Date(),
      payoutMethod: 'BANK_TRANSFER'
    }
  });

  const developer2 = await prisma.developer.upsert({
    where: { email: 'hello@innovatelabs.io' },
    update: {},
    create: {
      id: 'dev-2',
      email: 'hello@innovatelabs.io',
      password: 'hashedpassword456',
      firstName: 'Sarah',
      lastName: 'Johnson',
      companyName: 'InnovateLabs Inc',
      businessEmail: 'business@innovatelabs.io',
      website: 'https://innovatelabs.io',
      address: '456 Innovation Ave, Austin, TX',
      phoneNumber: '+1-555-0456',
      country: 'United States',
      isEmailVerified: true,
      verificationStatus: 'APPROVED',
      approvedAt: new Date(),
      payoutMethod: 'PAYONEER',
      payoneerEmail: 'payouts@innovatelabs.io'
    }
  });

  // Create sample users
  const user1 = await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      id: 'user-1',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      isEmailVerified: true
    }
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'jane.smith@example.com' },
    update: {},
    create: {
      id: 'user-2',
      email: 'jane.smith@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      isEmailVerified: true
    }
  });

  // Categories are stored as string enums in the schema

  // Create sample apps
  const app1 = await prisma.app.upsert({
    where: { packageName: 'com.techcorp.taskmaster' },
    update: {},
    create: {
      id: 'app-1',
      name: 'TaskMaster Pro',
      description: 'Advanced task management and project tracking tool',
      shortDescription: 'Powerful task management for teams',
      developerId: developer1.id,
      website: 'https://taskmaster.techcorp.com',
      category: 'PRODUCTIVITY',
      packageName: 'com.techcorp.taskmaster',
      version: '2.1.0',
      pricing: 'PAID',
      price: 29.99,
      isPublished: true,
      publishedAt: new Date(),
      icon: 'https://cdn.techcorp.com/icons/taskmaster.png',
      screenshots: JSON.stringify([
        'https://cdn.techcorp.com/screenshots/taskmaster-1.png',
        'https://cdn.techcorp.com/screenshots/taskmaster-2.png'
      ]),
      features: JSON.stringify([
        'Real-time collaboration',
        'Advanced reporting',
        'Custom workflows',
        'Mobile sync'
      ]),
      rating: 4.8,
      downloadCount: 15420,
      permissions: JSON.stringify(['storage', 'network']),
      status: 'PUBLISHED'
    }
  });

  const app2 = await prisma.app.upsert({
    where: { packageName: 'io.innovatelabs.aicontent' },
    update: {},
    create: {
      id: 'app-2',
      name: 'AI Content Generator',
      description: 'Generate high-quality content using advanced AI models',
      shortDescription: 'AI-powered content creation tool',
      developerId: developer2.id,
      website: 'https://ai-content.innovatelabs.io',
      category: 'AI_ML',
      packageName: 'io.innovatelabs.aicontent',
      version: '1.5.2',
      pricing: 'PAID',
      price: 49.99,
      isPublished: true,
      publishedAt: new Date(),
      icon: 'https://cdn.innovatelabs.io/icons/ai-content.png',
      screenshots: JSON.stringify([
        'https://cdn.innovatelabs.io/screenshots/ai-content-1.png',
        'https://cdn.innovatelabs.io/screenshots/ai-content-2.png'
      ]),
      features: JSON.stringify([
        'Multiple AI models',
        'Custom templates',
        'Bulk generation',
        'Export options'
      ]),
      rating: 4.6,
      downloadCount: 8750,
      permissions: JSON.stringify(['storage', 'network', 'ai']),
      status: 'PUBLISHED'
    }
  });

  const app3 = await prisma.app.upsert({
    where: { packageName: 'com.techcorp.analytics' },
    update: {},
    create: {
      id: 'app-3',
      name: 'Business Analytics Suite',
      description: 'Comprehensive business intelligence and analytics platform',
      shortDescription: 'Complete business analytics solution',
      developerId: developer1.id,
      website: 'https://analytics.techcorp.com',
      category: 'BUSINESS',
      packageName: 'com.techcorp.analytics',
      version: '3.0.1',
      pricing: 'PAID',
      price: 99.99,
      isPublished: true,
      publishedAt: new Date(),
      icon: 'https://cdn.techcorp.com/icons/analytics.png',
      screenshots: JSON.stringify([
        'https://cdn.techcorp.com/screenshots/analytics-1.png',
        'https://cdn.techcorp.com/screenshots/analytics-2.png',
        'https://cdn.techcorp.com/screenshots/analytics-3.png'
      ]),
      features: JSON.stringify([
        'Real-time dashboards',
        'Custom reports',
        'Data visualization',
        'API integration'
      ]),
      rating: 4.9,
      downloadCount: 3250,
      permissions: JSON.stringify(['storage', 'network', 'analytics']),
      status: 'PUBLISHED'
    }
  });

  // Create sample reviews
  await Promise.all([
    prisma.review.create({
      data: {
        id: 'review-1',
        userId: user1.id,
        appId: app1.id,
        rating: 5,
        comment: 'Excellent tool! Has transformed how our team manages projects.',
        isVerified: true
      }
    }),
    prisma.review.create({
      data: {
        id: 'review-2',
        userId: user2.id,
        appId: app1.id,
        rating: 4,
        comment: 'Great features, but could use better mobile app integration.',
        isVerified: true
      }
    }),
    prisma.review.create({
      data: {
        id: 'review-3',
        userId: user1.id,
        appId: app2.id,
        rating: 5,
        comment: 'Amazing AI capabilities. Saves me hours of writing time.',
        isVerified: true
      }
    })
  ]);

  console.log('✅ Database seeding completed successfully!');
  console.log(`📊 Created:`);
  console.log(`   - 2 developers`);
  console.log(`   - 2 users`);
  console.log(`   - 3 apps`);
  console.log(`   - 3 reviews`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });