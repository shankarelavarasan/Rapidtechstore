#!/usr/bin/env node

/**
 * GitHub Labels Setup Script for Rapid Tech Store
 * 
 * This script creates all the recommended labels for optimal workflow management.
 * Run with: node scripts/setup-github-labels.js
 * 
 * Prerequisites:
 * 1. Install GitHub CLI: https://cli.github.com/
 * 2. Authenticate: gh auth login
 * 3. Navigate to your repository directory
 */

const { execSync } = require('child_process');

// Define all labels with their colors and descriptions
const labels = [
  // Component Labels
  { name: 'backend', color: 'f1c40f', description: 'Backend API, server, database tasks' },
  { name: 'frontend', color: '3498db', description: 'React, UI/UX, client-side tasks' },
  { name: 'ai-agent', color: '9b59b6', description: 'AI chatbot, ML features' },
  { name: 'database', color: '34495e', description: 'Prisma, PostgreSQL, data models' },
  { name: 'payment', color: 'e67e22', description: 'Stripe integration, transactions' },
  { name: 'deployment', color: '1abc9c', description: 'Docker, Render, CI/CD' },

  // Priority Labels
  { name: 'urgent', color: 'e74c3c', description: 'Critical bugs, security issues' },
  { name: 'high-priority', color: 'e67e22', description: 'Important features, deadlines' },
  { name: 'medium-priority', color: 'f39c12', description: 'Standard development tasks' },
  { name: 'low-priority', color: '95a5a6', description: 'Nice-to-have, experimental' },

  // Type Labels
  { name: 'bug', color: 'e74c3c', description: 'Something isn\'t working' },
  { name: 'enhancement', color: '2ecc71', description: 'New feature or improvement' },
  { name: 'refactor', color: '3498db', description: 'Code improvement, cleanup' },
  { name: 'documentation', color: '1abc9c', description: 'Internal docs, README updates' },
  { name: 'testing', color: '9b59b6', description: 'Unit tests, integration tests' },

  // Status Labels
  { name: 'blocked', color: 'e74c3c', description: 'Waiting on dependency' },
  { name: 'in-progress', color: 'f39c12', description: 'Currently being worked on' },
  { name: 'review-needed', color: '3498db', description: 'Ready for code review' },
  { name: 'ready-to-deploy', color: '2ecc71', description: 'Tested and ready' },

  // Internal Labels
  { name: 'internal-only', color: '7f8c8d', description: 'Private team discussion' },
  { name: 'investor-demo', color: '9b59b6', description: 'Demo preparation tasks' },
  { name: 'security', color: 'e74c3c', description: 'Security-related issues' },
  { name: 'performance', color: 'f39c12', description: 'Performance optimization' }
];

console.log('🏷️  Setting up GitHub Labels for Rapid Tech Store...\n');

// Function to execute shell commands
function runCommand(command) {
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Check if GitHub CLI is installed
console.log('🔍 Checking GitHub CLI installation...');
const ghCheck = runCommand('gh --version');
if (!ghCheck.success) {
  console.error('❌ GitHub CLI is not installed. Please install it from https://cli.github.com/');
  process.exit(1);
}
console.log('✅ GitHub CLI is installed');

// Check if user is authenticated
console.log('🔐 Checking GitHub authentication...');
const authCheck = runCommand('gh auth status');
if (!authCheck.success) {
  console.error('❌ Not authenticated with GitHub. Please run: gh auth login');
  process.exit(1);
}
console.log('✅ GitHub authentication verified');

// Get current repository info
console.log('📂 Getting repository information...');
const repoInfo = runCommand('gh repo view --json owner,name');
if (!repoInfo.success) {
  console.error('❌ Not in a GitHub repository or unable to access repo info');
  process.exit(1);
}

const repo = JSON.parse(repoInfo.output);
console.log(`✅ Repository: ${repo.owner.login}/${repo.name}`);

// Create labels
console.log('\n🏷️  Creating labels...\n');
let created = 0;
let updated = 0;
let errors = 0;

for (const label of labels) {
  process.stdout.write(`Creating "${label.name}"... `);
  
  // Try to create the label
  const createResult = runCommand(
    `gh label create "${label.name}" --color "${label.color}" --description "${label.description}"`
  );
  
  if (createResult.success) {
    console.log('✅ Created');
    created++;
  } else if (createResult.error.includes('already exists')) {
    // Label exists, try to update it
    const updateResult = runCommand(
      `gh label edit "${label.name}" --color "${label.color}" --description "${label.description}"`
    );
    
    if (updateResult.success) {
      console.log('🔄 Updated');
      updated++;
    } else {
      console.log('❌ Failed to update');
      errors++;
    }
  } else {
    console.log('❌ Failed to create');
    console.error(`   Error: ${createResult.error}`);
    errors++;
  }
}

// Summary
console.log('\n📊 Summary:');
console.log(`✅ Created: ${created} labels`);
console.log(`🔄 Updated: ${updated} labels`);
console.log(`❌ Errors: ${errors} labels`);
console.log(`📝 Total: ${labels.length} labels processed`);

if (errors === 0) {
  console.log('\n🎉 All labels have been successfully set up!');
  console.log('\n📋 Next steps:');
  console.log('1. Apply labels to existing issues and PRs');
  console.log('2. Train your team on label usage guidelines');
  console.log('3. Set up issue templates with label suggestions');
  console.log('4. Use filters to organize your workflow');
  console.log('\n📖 See .github/LABELS_CONFIG.md for usage guidelines');
} else {
  console.log('\n⚠️  Some labels could not be created. Please check the errors above.');
}