# Rapid Tech Store - Payment Orchestration Backend

A comprehensive payment orchestration system supporting multiple payment gateways, currencies, and regions.

## Features

### Payment Processing
- **Multi-Gateway Support**: Stripe, Razorpay, Payoneer, Wise
- **Regional Optimization**: Automatic gateway selection based on user region
- **Currency Conversion**: Real-time exchange rates with multiple providers
- **Unified API**: Single interface for all payment operations

### Supported Payment Methods
- **Stripe**: Credit/Debit cards, Digital wallets (US, CA, GB, EU, AU, SG, JP)
- **Razorpay**: UPI, Net Banking, Cards, Wallets (India)
- **Payoneer**: Global payouts and transfers
- **Wise**: International money transfers

### Analytics & Monitoring
- Payment success/failure rates by gateway
- Regional payment performance
- Revenue analytics and trends
- Real-time transaction monitoring

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+
- Payment gateway accounts (Stripe, Razorpay, etc.)

### Installation

1. **Clone and install dependencies**
```bash
cd backend
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Database Setup**
```bash
npx prisma generate
npx prisma db push
```

4. **Start the server**
```bash
npm run dev
```

## Environment Configuration

### Required Environment Variables

#### Database & Cache
```env
DATABASE_URL="postgresql://username:password@localhost:5432/rapidtechstore"
REDIS_URL="redis://localhost:6379"
```

#### Payment Gateways
```env
# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Razorpay (India)
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."

# Payoneer (Global Payouts)
PAYONEER_PROGRAM_ID="..."
PAYONEER_USERNAME="..."
PAYONEER_API_PASSWORD="..."
PAYONEER_PARTNER_ID="..."

# Wise (International)
WISE_API_TOKEN="..."
WISE_PROFILE_ID="..."
WISE_WEBHOOK_SECRET="..."
```

#### Currency Conversion
```env
FIXER_API_KEY="..."
EXCHANGERATE_API_KEY="..."
OPENEXCHANGE_APP_ID="..."
```

See `.env.example` for complete configuration options.

## API Endpoints

### Payment Operations
```
POST   /api/payments/create          # Create payment
POST   /api/payments/payout          # Create payout
GET    /api/payments/status/:id      # Get payment status
GET    /api/payments/methods/:region # Get supported methods
```

### Currency Conversion
```
POST   /api/currency/convert         # Convert currency
GET    /api/currency/rates           # Get exchange rates
GET    /api/currency/supported       # Get supported currencies
POST   /api/currency/batch-convert   # Batch conversion
```

### Webhooks
```
POST   /api/webhooks/stripe          # Stripe webhooks
POST   /api/webhooks/razorpay        # Razorpay webhooks
POST   /api/webhooks/payoneer        # Payoneer webhooks
POST   /api/webhooks/wise            # Wise webhooks
```

### Analytics
```
GET    /api/analytics/payments/overview     # Payment overview
GET    /api/analytics/payments/by-gateway   # Gateway performance
GET    /api/analytics/payments/by-region    # Regional performance
```

## Payment Flow

### 1. Create Payment
```javascript
POST /api/payments/create
{
  "amount": 1000,
  "currency": "USD",
  "region": "US",
  "paymentMethod": "card",
  "metadata": {
    "orderId": "order_123",
    "customerId": "cust_456"
  }
}
```

### 2. Handle Response
```javascript
{
  "success": true,
  "transactionId": "txn_789",
  "gateway": "stripe",
  "clientSecret": "pi_xxx_secret_xxx",
  "status": "requires_payment_method"
}
```

### 3. Process Webhooks
The system automatically handles webhooks from all gateways and updates payment status in real-time.

## Regional Gateway Selection

The system automatically selects the optimal payment gateway based on:

- **User Region**: Geographic location
- **Currency**: Local currency support
- **Payment Method**: Available methods per region
- **Gateway Performance**: Success rates and reliability

### Regional Mapping
- **US/CA/EU/AU**: Stripe (primary)
- **India**: Razorpay (primary), Stripe (fallback)
- **Global Payouts**: Payoneer, Wise
- **International Transfers**: Wise

## Currency Conversion

### Supported Providers
1. **Fixer.io** (Primary)
2. **ExchangeRate-API** (Fallback)
3. **Open Exchange Rates** (Fallback)

### Features
- Real-time exchange rates
- Automatic fallback between providers
- Rate caching (1-hour TTL)
- Batch conversion support
- 170+ currencies supported

## Error Handling

### Payment Errors
```javascript
{
  "success": false,
  "error": {
    "code": "PAYMENT_FAILED",
    "message": "Payment was declined",
    "gateway": "stripe",
    "gatewayError": {
      "code": "card_declined",
      "decline_code": "insufficient_funds"
    }
  }
}
```

### Gateway Fallback
If the primary gateway fails, the system automatically:
1. Logs the failure
2. Selects fallback gateway
3. Retries the payment
4. Updates analytics

## Security

### Webhook Verification
All webhooks are verified using:
- Signature validation
- Timestamp tolerance (5 minutes)
- IP allowlisting (optional)

### Data Protection
- PCI DSS compliance considerations
- No sensitive card data storage
- Encrypted database connections
- Rate limiting on all endpoints

## Monitoring & Logging

### Health Checks
```
GET /health
```
Returns system status including:
- Database connectivity
- Redis connectivity
- Gateway availability
- System uptime

### Logging Levels
- **ERROR**: Payment failures, system errors
- **WARN**: Gateway fallbacks, rate limits
- **INFO**: Successful payments, system events
- **DEBUG**: Detailed request/response data

## Development

### Running Tests
```bash
npm test                 # Run all tests
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests
npm run test:coverage   # Coverage report
```

### Database Migrations
```bash
npx prisma migrate dev   # Create and apply migration
npx prisma studio       # Database GUI
npx prisma generate     # Regenerate client
```

### Code Quality
```bash
npm run lint            # ESLint
npm run format          # Prettier
npm run type-check      # TypeScript
```

## Production Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Use production gateway credentials
3. Configure proper CORS origins
4. Set up SSL/TLS certificates
5. Configure monitoring and alerting

### Performance Optimization
- Enable Redis caching
- Configure connection pooling
- Set up CDN for static assets
- Implement horizontal scaling

### Security Checklist
- [ ] Update all default secrets
- [ ] Enable HTTPS only
- [ ] Configure rate limiting
- [ ] Set up monitoring
- [ ] Regular security audits

## Support

### Common Issues

**Payment Gateway Connection Errors**
- Verify API credentials
- Check network connectivity
- Validate webhook endpoints

**Currency Conversion Failures**
- Check API key validity
- Verify rate limits
- Test fallback providers

**Database Connection Issues**
- Verify connection string
- Check database server status
- Review connection pool settings

### Getting Help
- Check the logs for detailed error messages
- Review the API documentation
- Contact support with transaction IDs for specific issues

## License

This project is proprietary software for Rapid Tech Store.