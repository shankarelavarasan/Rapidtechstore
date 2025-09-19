import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

export default async function globalSetup() {
  console.log('🔧 Setting up test environment...');

  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/rapidtechstore_test';

  try {
    // Create test database if it doesn't exist
    console.log('📦 Creating test database...');
    execSync('npx prisma db push --force-reset', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
    });

    // Run migrations
    console.log('🔄 Running database migrations...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
    });

    // Generate Prisma client
    console.log('⚡ Generating Prisma client...');
    execSync('npx prisma generate', {
      stdio: 'inherit',
    });

    // Seed test data if needed
    console.log('🌱 Seeding test data...');
    const prisma = new PrismaClient();
    
    // Create test categories
    await prisma.category.createMany({
      data: [
        {
          name: 'PRODUCTIVITY',
          description: 'Productivity apps',
          iconUrl: 'https://example.com/productivity.png',
        },
        {
          name: 'GAMES',
          description: 'Gaming apps',
          iconUrl: 'https://example.com/games.png',
        },
        {
          name: 'EDUCATION',
          description: 'Educational apps',
          iconUrl: 'https://example.com/education.png',
        },
        {
          name: 'ENTERTAINMENT',
          description: 'Entertainment apps',
          iconUrl: 'https://example.com/entertainment.png',
        },
        {
          name: 'BUSINESS',
          description: 'Business apps',
          iconUrl: 'https://example.com/business.png',
        },
      ],
      skipDuplicates: true,
    });

    await prisma.$disconnect();
    console.log('✅ Test environment setup complete!');
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    process.exit(1);
  }
}