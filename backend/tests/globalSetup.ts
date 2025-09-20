import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

export default async function globalSetup() {
  console.log('🔧 Setting up test environment...');

  // Load test environment variables
  dotenv.config({ path: '.env.test' });

  // Set test environment with unique test database
  process.env.NODE_ENV = 'test';
  const testDbPath = `file:./test-${Date.now()}.db`;
  process.env.DATABASE_URL = testDbPath;

  try {
    // Generate Prisma client
    console.log('⚡ Generating Prisma client...');
    execSync('npx prisma generate', {
      stdio: 'inherit',
    });

    // Create test database schema
    console.log('📦 Creating test database schema...');
    execSync('npx prisma db push --force-reset', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: testDbPath,
      },
    });

    // Seed test data if needed
    console.log('🌱 Seeding test data...');
    const prisma = new PrismaClient();
    
    // Note: Categories are stored as strings in the App model, not as separate entities
    
    await prisma.$disconnect();
    console.log('✅ Test environment setup complete!');
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    process.exit(1);
  }
}