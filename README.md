# Rapid Tech Store

## ⚠️ COPYRIGHT NOTICE ⚠️
**ALL RIGHTS RESERVED - RAPID TECH - SHANKAR ELAVARASAN**
**UNAUTHORIZED USE, COPYING, OR DISTRIBUTION IS STRICTLY PROHIBITED**

An AI-powered app marketplace platform built with Node.js, TypeScript, and modern cloud technologies.

**PROPRIETARY SOFTWARE - NOT FOR PUBLIC USE**

## 🚀 Features

### Core Platform
- **AI-Powered App Discovery**: Intelligent app recommendations using OpenAI
- **Multi-Platform Support**: Android, iOS, Web, and Desktop applications
- **Advanced Search & Filtering**: Category-based browsing with smart filters
- **Real-time Analytics**: Comprehensive tracking and reporting
- **Automated Payouts**: Multi-gateway payment processing with RazorpayX and Payoneer

### Developer Features
- **Developer Dashboard**: Complete analytics and earnings tracking
- **App Management**: Upload, update, and manage applications
- **Revenue Analytics**: Detailed financial reporting and insights
- **Automated Payouts**: Scheduled and on-demand payment processing
- **API Integration**: RESTful APIs for third-party integrations

### User Experience
- **Personalized Recommendations**: AI-driven app suggestions
- **Social Features**: Reviews, ratings, and user interactions
- **Wishlist & Collections**: Organize favorite apps
- **Cross-Platform Sync**: Seamless experience across devices
- **Advanced Security**: OAuth integration and secure transactions

### Admin Panel
- **Platform Analytics**: Real-time dashboard with key metrics
- **User Management**: Comprehensive user administration
- **Content Moderation**: App review and approval workflows
- **Financial Management**: Revenue tracking and payout administration
- **System Monitoring**: Health checks and performance metrics

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with comprehensive middleware
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for session management and caching
- **Authentication**: JWT with Google OAuth integration
- **File Storage**: Google Cloud Storage
- **Email**: SendGrid for transactional emails
- **AI**: OpenAI GPT integration for recommendations

### Infrastructure
- **Cloud Platform**: Google Cloud Platform (GCP)
- **Container**: Docker with multi-stage builds
- **Orchestration**: Kubernetes (GKE) with auto-scaling
- **CI/CD**: Google Cloud Build with automated deployments
- **Infrastructure as Code**: Terraform for resource management
- **Monitoring**: Google Cloud Monitoring with Sentry integration

### Payment Processing
- **Primary Gateway**: Razorpay for Indian market
- **International**: Payoneer for global transactions
- **Automated Payouts**: RazorpayX integration
- **Compliance**: PCI DSS compliant payment handling

## 📋 Prerequisites

- Node.js 18 or later
- PostgreSQL 12 or later
- Redis 6 or later
- Docker and Docker Compose (for local development)
- Google Cloud SDK (for deployment)
- Terraform (for infrastructure management)

## 🚀 Quick Start

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rapid-tech-store
   ```

2. **Run the setup script**
   ```bash
   chmod +x scripts/setup-local.sh
   ./scripts/setup-local.sh
   ```

3. **Configure environment variables**
   ```bash
   # Edit the generated .env file
   nano backend/.env
   ```

4. **Start development services**
   ```bash
   npm run docker:up
   npm run dev
   ```

5. **Access the application**
   - API: http://localhost:3000
   - API Documentation: http://localhost:3000/api/docs
   - Database Admin: http://localhost:8080
   - Redis Admin: http://localhost:8081
   - Email Testing: http://localhost:8025

### Manual Setup

If you prefer manual setup or the script doesn't work:

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Setup database**
   ```bash
   # Start PostgreSQL and Redis
   docker-compose -f docker-compose.dev.yml up -d postgres redis
   
   # Run migrations
   npx prisma migrate dev
   npx prisma generate
   
   # Seed database (optional)
   npx prisma db seed
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
rapid-tech-store/
├── backend/                    # Backend application
│   ├── src/
│   │   ├── controllers/        # Route controllers
│   │   ├── middleware/         # Express middleware
│   │   ├── models/            # Database models
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── types/             # TypeScript type definitions
│   │   ├── utils/             # Utility functions
│   │   └── index.ts           # Application entry point
│   ├── prisma/                # Database schema and migrations
│   ├── tests/                 # Test files
│   └── package.json
├── k8s/                       # Kubernetes manifests
├── terraform/                 # Infrastructure as Code
├── scripts/                   # Deployment and setup scripts
├── nginx/                     # Nginx configuration
├── docker-compose.dev.yml     # Development environment
├── Dockerfile                 # Container configuration
├── cloudbuild.yaml           # CI/CD pipeline
└── README.md
```

## 🔧 Configuration

### Environment Variables

The application requires several environment variables. Copy `backend/.env.example` to `backend/.env` and configure:

#### Database
```env
DATABASE_URL="postgresql://user:password@localhost:5432/rapidtechstore_dev"
```

#### Authentication
```env
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
```

#### Payment Gateways
```env
# Razorpay
RAZORPAY_KEY_ID="your-razorpay-key-id"
RAZORPAY_KEY_SECRET="your-razorpay-key-secret"

# Payoneer
PAYONEER_API_KEY="your-payoneer-api-key"
PAYONEER_API_SECRET="your-payoneer-api-secret"
```

#### External Services
```env
OPENAI_API_KEY="your-openai-api-key"
SENDGRID_API_KEY="your-sendgrid-api-key"
GOOGLE_CLOUD_STORAGE_BUCKET="your-storage-bucket"
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.ts
```

### Test Structure
- **Unit Tests**: Individual function and method testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Complete workflow testing
- **Performance Tests**: Load and stress testing

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/google` - Google OAuth login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

### App Management
- `GET /api/apps` - List apps with filtering
- `GET /api/apps/:id` - Get app details
- `POST /api/apps` - Create new app (developers)
- `PUT /api/apps/:id` - Update app (developers)
- `DELETE /api/apps/:id` - Delete app (developers)

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/wishlist` - Get user wishlist
- `POST /api/users/wishlist/:appId` - Add to wishlist

### Analytics
- `GET /api/analytics/dashboard` - Platform analytics
- `GET /api/analytics/apps/:id` - App-specific analytics
- `GET /api/analytics/revenue` - Revenue analytics
- `GET /api/analytics/users` - User analytics

### Payouts
- `GET /api/payouts/earnings` - Developer earnings
- `POST /api/payouts/request` - Request payout
- `GET /api/payouts/history` - Payout history
- `GET /api/payouts/status/:id` - Payout status

For complete API documentation, visit `/api/docs` when running the server.

## 🚀 Deployment

### Google Cloud Platform

1. **Setup GCP Project**
   ```bash
   # Set project ID
   export PROJECT_ID="your-project-id"
   gcloud config set project $PROJECT_ID
   
   # Enable required APIs
   gcloud services enable container.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable sqladmin.googleapis.com
   ```

2. **Deploy Infrastructure**
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

3. **Deploy Application**
   ```bash
   ./scripts/deploy.sh --environment production
   ```

### Kubernetes Deployment

1. **Apply Kubernetes manifests**
   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/secrets.yaml
   kubectl apply -f k8s/deployment.yaml
   kubectl apply -f k8s/ingress.yaml
   ```

2. **Monitor deployment**
   ```bash
   kubectl get pods -n rapid-tech-store
   kubectl logs -f deployment/backend -n rapid-tech-store
   ```

### CI/CD Pipeline

The project includes automated CI/CD with Google Cloud Build:

1. **Trigger builds on push to main**
2. **Run tests and linting**
3. **Build and push Docker images**
4. **Deploy to staging environment**
5. **Run integration tests**
6. **Deploy to production (manual approval)**

## 📈 Monitoring and Observability

### Health Checks
- `/health` - Basic health check
- `/health/detailed` - Detailed system status
- `/metrics` - Prometheus metrics

### Logging
- Structured JSON logging
- Log levels: error, warn, info, debug
- Request/response logging
- Performance metrics

### Monitoring
- Google Cloud Monitoring integration
- Sentry for error tracking
- Custom dashboards for business metrics
- Alerting for critical issues

## 🔒 Security

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Google OAuth integration
- Session management with Redis

### Data Protection
- Input validation and sanitization
- SQL injection prevention with Prisma
- XSS protection with helmet
- CORS configuration
- Rate limiting

### Infrastructure Security
- HTTPS enforcement
- Security headers
- Container security scanning
- Secrets management with Google Secret Manager

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests**
   ```bash
   npm test
   npm run lint
   ```
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Follow conventional commit messages
- Ensure code passes linting and tests

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Documentation](http://localhost:3000/api/docs)
- [Database Schema](./backend/prisma/schema.prisma)
- [Deployment Guide](./docs/deployment.md)

### Getting Help
- Create an issue for bugs or feature requests
- Check existing issues for solutions
- Review the troubleshooting guide

### Common Issues

#### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.dev.yml ps postgres

# Reset database
npm run db:reset
```

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

#### Environment Variables Not Loading
```bash
# Verify .env file exists
ls -la backend/.env

# Check environment variables
npm run dev -- --debug
```

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Core platform development
- ✅ Authentication system
- ✅ App management
- ✅ Payment integration
- ✅ Analytics engine

### Phase 2 (Next)
- [ ] Mobile applications (React Native)
- [ ] Advanced AI recommendations
- [ ] Social features enhancement
- [ ] Multi-language support
- [ ] Advanced analytics dashboard

### Phase 3 (Future)
- [ ] Blockchain integration
- [ ] NFT marketplace
- [ ] Advanced ML models
- [ ] Global expansion
- [ ] Enterprise features

---

**Built with ❤️ by the Rapid Tech Store Team**

A complete marketplace platform that converts web applications into mobile experiences and provides a unified subscription management system.

## 🏗️ Architecture Overview

The Rapid Tech Store consists of four core modules:

### Module 1: Onboarding & Verification Engine
- **Developer Console** (`console.rapidtech.store`)
- Email verification and domain ownership validation
- Human review queue for application approval
- DNS/Meta tag verification system

### Module 2: AI Conversion & Publishing Engine
- Automated web-to-mobile conversion
- Branding extraction and optimization
- Compliance pre-checks
- Staging and preview system

### Module 3: Flagship App (User Experience)
- Mobile marketplace storefront
- Discovery features (Top Charts, Categories, Featured)
- Google Play Billing integration
- Unified subscription management

### Module 4: Payout & Analytics Engine
- Real-time analytics dashboard
- Automated monthly payout system
- Multi-currency support (Bank transfers, Payoneer)
- Revenue reconciliation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Google Cloud Account
- Google Play Console Account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/shankarelavarasan/Rapidtechstore.git
cd Rapidtechstore
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Initialize the database:
```bash
npm run db:migrate
npm run db:seed
```

5. Start development servers:
```bash
npm run dev
```

## 📁 Project Structure

```
rapid-tech-store/
├── backend/                 # Node.js API server
├── frontend/               # React Native mobile app
├── developer-console/      # React.js developer portal
├── shared/                 # Shared utilities and types
├── database/              # Database migrations and seeds
├── docs/                  # Documentation
└── deployment/            # Google Cloud deployment configs
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rapidtech
REDIS_URL=redis://localhost:6379

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Google Play Billing
GOOGLE_PLAY_DEVELOPER_API_KEY=your-api-key
GOOGLE_PLAY_PACKAGE_NAME=com.rapidtech.store

# Payment Gateways
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
PAYONEER_API_KEY=your-payoneer-key

# Email Service
SENDGRID_API_KEY=your-sendgrid-key
FROM_EMAIL=noreply@rapidtech.store

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific module tests
npm run test:backend
npm run test:frontend
```

## 🚢 Deployment

### Google Cloud Deployment

1. Build the project:
```bash
npm run build
```

2. Deploy to Google Cloud:
```bash
npm run deploy
```

## 📊 Monitoring

- **Backend API**: Health checks at `/health`
- **Database**: Connection monitoring
- **Payment Processing**: Transaction logging
- **User Analytics**: Real-time metrics

## 🔒 Security

- JWT-based authentication
- Rate limiting on all APIs
- Input validation and sanitization
- Secure payment processing
- Domain ownership verification

## 📈 Scaling

- Horizontal scaling with Google Cloud Run
- Database read replicas
- Redis caching layer
- CDN for static assets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is proprietary software owned by Rapid Tech Store. All rights reserved.

## 📞 Support

For support, email support@rapidtech.store or create an issue in this repository.