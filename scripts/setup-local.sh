#!/bin/bash

# Rapid Tech Store Local Development Setup Script
# This script sets up the local development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18 or later."
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18 or later is required. Current version: $(node -v)"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_warning "Docker is not installed. Some features may not work without Docker."
    fi
    
    # Check if PostgreSQL is available
    if ! command -v psql &> /dev/null && ! docker ps &> /dev/null; then
        log_warning "PostgreSQL is not available. You'll need either PostgreSQL installed locally or Docker to run the database."
    fi
    
    log_success "Prerequisites check completed."
}

setup_environment() {
    log_info "Setting up environment variables..."
    
    # Create .env file if it doesn't exist
    if [ ! -f "backend/.env" ]; then
        log_info "Creating .env file from template..."
        cat > backend/.env << 'EOF'
# Database Configuration
DATABASE_URL="postgresql://rapidtechstore:password@localhost:5432/rapidtechstore_dev"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-for-development-only"
JWT_EXPIRES_IN="7d"

# OpenAI Configuration
OPENAI_API_KEY="your-openai-api-key"

# Google OAuth Configuration
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Payment Gateway Configuration (Development)
RAZORPAY_KEY_ID="your-razorpay-test-key-id"
RAZORPAY_KEY_SECRET="your-razorpay-test-key-secret"
RAZORPAY_WEBHOOK_SECRET="your-razorpay-webhook-secret"

PAYONEER_API_KEY="your-payoneer-sandbox-api-key"
PAYONEER_API_SECRET="your-payoneer-sandbox-api-secret"
PAYONEER_WEBHOOK_SECRET="your-payoneer-webhook-secret"

# Email Configuration
SENDGRID_API_KEY="your-sendgrid-api-key"
FROM_EMAIL="noreply@localhost"

# Google Play Configuration
GOOGLE_PLAY_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project"}'

# Redis Configuration (optional for development)
REDIS_URL="redis://localhost:6379"

# File Storage Configuration
GOOGLE_CLOUD_STORAGE_BUCKET="your-dev-bucket"
GOOGLE_CLOUD_PROJECT_ID="your-project-id"

# Development Configuration
NODE_ENV="development"
PORT="3000"
LOG_LEVEL="debug"

# CORS Configuration
CORS_ORIGIN="http://localhost:3000,http://localhost:3001"

# Session Configuration
SESSION_SECRET="your-session-secret-for-development"

# Rate Limiting
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX_REQUESTS="100"

# Webhook URLs
WEBHOOK_BASE_URL="http://localhost:3000"

# Monitoring (optional for development)
SENTRY_DSN=""
EOF
        
        log_warning "Please update the .env file with your actual API keys and configuration."
        log_info "Created: backend/.env"
    else
        log_info ".env file already exists."
    fi
    
    log_success "Environment setup completed."
}

setup_database() {
    log_info "Setting up database..."
    
    # Check if Docker is available for database setup
    if command -v docker &> /dev/null; then
        log_info "Setting up PostgreSQL with Docker..."
        
        # Create docker-compose.yml for development
        cat > docker-compose.dev.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: rapidtechstore-postgres-dev
    environment:
      POSTGRES_DB: rapidtechstore_dev
      POSTGRES_USER: rapidtechstore
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./prisma/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U rapidtechstore -d rapidtechstore_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: rapidtechstore-redis-dev
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
EOF
        
        # Start database services
        docker-compose -f docker-compose.dev.yml up -d
        
        # Wait for database to be ready
        log_info "Waiting for database to be ready..."
        sleep 10
        
        # Check if database is ready
        for i in {1..30}; do
            if docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U rapidtechstore -d rapidtechstore_dev &> /dev/null; then
                log_success "Database is ready!"
                break
            fi
            if [ $i -eq 30 ]; then
                log_error "Database failed to start after 30 attempts."
                exit 1
            fi
            sleep 2
        done
        
    else
        log_warning "Docker not available. Please ensure PostgreSQL is running locally."
        log_info "Database connection string: postgresql://rapidtechstore:password@localhost:5432/rapidtechstore_dev"
    fi
    
    log_success "Database setup completed."
}

install_dependencies() {
    log_info "Installing dependencies..."
    
    cd backend
    
    # Install npm dependencies
    npm install
    
    # Generate Prisma client
    npx prisma generate
    
    cd ..
    
    log_success "Dependencies installed successfully."
}

run_migrations() {
    log_info "Running database migrations..."
    
    cd backend
    
    # Run Prisma migrations
    npx prisma migrate dev --name init
    
    # Seed database with initial data
    if [ -f "prisma/seed.ts" ]; then
        log_info "Seeding database with initial data..."
        npx prisma db seed
    fi
    
    cd ..
    
    log_success "Database migrations completed."
}

setup_git_hooks() {
    log_info "Setting up Git hooks..."
    
    # Create pre-commit hook
    mkdir -p .git/hooks
    
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# Run linting and tests before commit
cd backend

echo "Running linter..."
npm run lint

echo "Running tests..."
npm run test

echo "Running type check..."
npm run type-check

if [ $? -ne 0 ]; then
    echo "Pre-commit checks failed. Please fix the issues before committing."
    exit 1
fi

echo "Pre-commit checks passed!"
EOF
    
    chmod +x .git/hooks/pre-commit
    
    log_success "Git hooks setup completed."
}

create_dev_scripts() {
    log_info "Creating development scripts..."
    
    # Create package.json scripts for root directory
    cat > package.json << 'EOF'
{
  "name": "rapid-tech-store",
  "version": "1.0.0",
  "description": "Rapid Tech Store - AI-powered app marketplace",
  "scripts": {
    "dev": "cd backend && npm run dev",
    "build": "cd backend && npm run build",
    "start": "cd backend && npm start",
    "test": "cd backend && npm test",
    "test:watch": "cd backend && npm run test:watch",
    "lint": "cd backend && npm run lint",
    "lint:fix": "cd backend && npm run lint:fix",
    "type-check": "cd backend && npm run type-check",
    "db:migrate": "cd backend && npx prisma migrate dev",
    "db:reset": "cd backend && npx prisma migrate reset",
    "db:seed": "cd backend && npx prisma db seed",
    "db:studio": "cd backend && npx prisma studio",
    "docker:up": "docker-compose -f docker-compose.dev.yml up -d",
    "docker:down": "docker-compose -f docker-compose.dev.yml down",
    "docker:logs": "docker-compose -f docker-compose.dev.yml logs -f",
    "setup": "./scripts/setup-local.sh",
    "deploy": "./scripts/deploy.sh"
  },
  "keywords": [
    "app-store",
    "marketplace",
    "ai",
    "typescript",
    "node.js"
  ],
  "author": "Rapid Tech Store Team",
  "license": "MIT",
  "devDependencies": {
    "concurrently": "^7.6.0"
  }
}
EOF
    
    log_success "Development scripts created."
}

setup_vscode() {
    log_info "Setting up VS Code configuration..."
    
    mkdir -p .vscode
    
    # Create VS Code settings
    cat > .vscode/settings.json << 'EOF'
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.env": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true
  },
  "eslint.workingDirectories": ["backend"],
  "typescript.preferences.includePackageJsonAutoImports": "on"
}
EOF
    
    # Create VS Code extensions recommendations
    cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode-remote.remote-containers",
    "ms-azuretools.vscode-docker",
    "Prisma.prisma",
    "ms-vscode.vscode-thunder-client"
  ]
}
EOF
    
    # Create VS Code launch configuration
    cat > .vscode/launch.json << 'EOF'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/dist/index.js",
      "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      },
      "envFile": "${workspaceFolder}/backend/.env",
      "console": "integratedTerminal",
      "restart": true,
      "runtimeExecutable": "node",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "envFile": "${workspaceFolder}/backend/.env.test"
    }
  ]
}
EOF
    
    log_success "VS Code configuration setup completed."
}

display_next_steps() {
    log_success "Local development environment setup completed!"
    echo
    log_info "Next steps:"
    echo "1. Update backend/.env with your actual API keys"
    echo "2. Start the development server: npm run dev"
    echo "3. Open Prisma Studio: npm run db:studio"
    echo "4. View API documentation at: http://localhost:3000/api/docs"
    echo
    log_info "Available commands:"
    echo "  npm run dev          - Start development server"
    echo "  npm run test         - Run tests"
    echo "  npm run lint         - Run linter"
    echo "  npm run db:studio    - Open Prisma Studio"
    echo "  npm run docker:up    - Start database services"
    echo "  npm run docker:down  - Stop database services"
    echo
    log_info "Database URLs:"
    echo "  PostgreSQL: postgresql://rapidtechstore:password@localhost:5432/rapidtechstore_dev"
    echo "  Redis: redis://localhost:6379"
    echo
    log_warning "Remember to:"
    echo "  - Configure your API keys in backend/.env"
    echo "  - Set up your Google OAuth credentials"
    echo "  - Configure payment gateway test credentials"
    echo "  - Set up SendGrid for email functionality"
}

# Main setup function
main() {
    log_info "Starting Rapid Tech Store local development setup..."
    
    check_prerequisites
    setup_environment
    setup_database
    install_dependencies
    run_migrations
    setup_git_hooks
    create_dev_scripts
    setup_vscode
    display_next_steps
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Rapid Tech Store Local Development Setup Script"
        echo
        echo "Usage: $0 [options]"
        echo
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --env-only          Setup environment files only"
        echo "  --db-only           Setup database only"
        echo "  --deps-only         Install dependencies only"
        echo "  --no-docker         Skip Docker setup"
        exit 0
        ;;
    --env-only)
        setup_environment
        ;;
    --db-only)
        setup_database
        run_migrations
        ;;
    --deps-only)
        install_dependencies
        ;;
    --no-docker)
        check_prerequisites
        setup_environment
        log_warning "Skipping Docker setup. Please ensure PostgreSQL and Redis are running locally."
        install_dependencies
        run_migrations
        setup_git_hooks
        create_dev_scripts
        setup_vscode
        display_next_steps
        ;;
    "")
        main
        ;;
    *)
        log_error "Unknown option: $1"
        echo "Use --help for usage information."
        exit 1
        ;;
esac