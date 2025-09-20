-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "name" TEXT,
    "phoneNumber" TEXT,
    "profileImage" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpires" DATETIME,
    "lastLoginAt" DATETIME,
    "stripeCustomerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "developers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "businessEmail" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "gstNumber" TEXT,
    "taxId" TEXT,
    "address" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "domainVerificationMethod" TEXT,
    "domainVerificationToken" TEXT,
    "isDomainVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "approvedAt" DATETIME,
    "approvedBy" TEXT,
    "bankDetails" TEXT,
    "payoutMethod" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
    "payoneerEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "apps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "developerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" TEXT,
    "website" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "icon" TEXT,
    "screenshots" TEXT NOT NULL,
    "bannerImage" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "packageName" TEXT NOT NULL,
    "minAndroidVersion" TEXT NOT NULL DEFAULT '5.0',
    "targetSdkVersion" TEXT NOT NULL DEFAULT '34',
    "permissions" TEXT NOT NULL,
    "features" TEXT,
    "pricing" TEXT NOT NULL,
    "price" REAL DEFAULT 0,
    "subscriptionPlans" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "rating" REAL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "metadata" TEXT,
    "conversionConfig" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "apps_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "planId" TEXT,
    "status" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "googlePlayToken" TEXT,
    "googlePlayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpayOrderId" TEXT,
    "paymentMethod" TEXT,
    "lastPaymentDate" DATETIME,
    "nextBillingDate" DATETIME,
    "cancelledAt" DATETIME,
    "cancellationReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "subscriptions_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriptionId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentGateway" TEXT NOT NULL,
    "gatewayTransactionId" TEXT,
    "gatewayOrderId" TEXT,
    "gatewayResponse" TEXT,
    "developerShare" REAL,
    "platformFee" REAL,
    "taxes" REAL,
    "netAmount" REAL,
    "processedAt" DATETIME,
    "failureReason" TEXT,
    "refundAmount" REAL,
    "refundedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "appId" TEXT,
    CONSTRAINT "transactions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transactions_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "developerId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "bankDetails" TEXT,
    "payoneerEmail" TEXT,
    "gatewayPayoutId" TEXT,
    "gatewayResponse" TEXT,
    "processedAt" DATETIME,
    "failureReason" TEXT,
    "transactionIds" TEXT NOT NULL,
    "taxDeducted" REAL,
    "netAmount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payouts_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isHelpful" INTEGER NOT NULL DEFAULT 0,
    "isReported" BOOLEAN NOT NULL DEFAULT false,
    "reportReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reviews_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "downloads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "appId" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "downloads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "downloads_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "favorites_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "app_analytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "newSubscriptions" INTEGER NOT NULL DEFAULT 0,
    "revenue" REAL NOT NULL DEFAULT 0,
    "rating" REAL,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "crashCount" INTEGER NOT NULL DEFAULT 0,
    "sessionDuration" REAL,
    "retentionRate" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "app_analytics_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "developer_analytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "developerId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "totalDownloads" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" REAL NOT NULL DEFAULT 0,
    "activeApps" INTEGER NOT NULL DEFAULT 0,
    "newSubscriptions" INTEGER NOT NULL DEFAULT 0,
    "averageRating" REAL,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "developer_analytics_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "stripePaymentIntentId" TEXT,
    "purchaseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refundedAt" DATETIME,
    "refundAmount" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchases_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MODERATOR',
    "permissions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "unified_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "developerId" TEXT,
    "appId" TEXT,
    "subscriptionId" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT,
    "gateway" TEXT NOT NULL,
    "gatewayTransactionId" TEXT,
    "gatewayOrderId" TEXT,
    "gatewayResponse" TEXT,
    "country" TEXT,
    "region" TEXT,
    "ipAddress" TEXT,
    "detectedLocation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentType" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "grossAmount" REAL NOT NULL,
    "platformFee" REAL,
    "gatewayFee" REAL,
    "taxes" REAL,
    "netAmount" REAL,
    "originalCurrency" TEXT,
    "originalAmount" REAL,
    "exchangeRate" REAL,
    "initiatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    "completedAt" DATETIME,
    "failedAt" DATETIME,
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "refundAmount" REAL,
    "refundedAt" DATETIME,
    "refundReason" TEXT,
    "refundGatewayId" TEXT,
    "metadata" TEXT,
    "clientSecret" TEXT,
    "returnUrl" TEXT,
    "cancelUrl" TEXT,
    "webhookReceived" BOOLEAN NOT NULL DEFAULT false,
    "webhookData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "transactionId" TEXT,
    CONSTRAINT "unified_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "unified_payments_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "unified_payments_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "unified_payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "unified_payments_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" TEXT,
    "gatewayResponse" TEXT,
    "errorMessage" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "unified_payments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payment_retries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "retryNumber" INTEGER NOT NULL,
    "gateway" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "gatewayResponse" TEXT,
    "errorMessage" TEXT,
    "retriedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "payment_retries_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "unified_payments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "gateway_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gateway" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "supportedRegions" TEXT NOT NULL,
    "supportedCurrencies" TEXT NOT NULL,
    "supportsPayments" BOOLEAN NOT NULL DEFAULT true,
    "supportsPayouts" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "minAmount" REAL,
    "maxAmount" REAL,
    "apiEndpoint" TEXT,
    "apiVersion" TEXT,
    "webhookEndpoint" TEXT,
    "isHealthy" BOOLEAN NOT NULL DEFAULT true,
    "lastHealthCheck" DATETIME,
    "healthCheckData" TEXT,
    "rateLimit" INTEGER,
    "rateLimitWindow" INTEGER,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "currency_rates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "validFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gateway" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "paymentId" TEXT,
    "rawPayload" TEXT NOT NULL,
    "signature" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" DATETIME,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "geo_location_cache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ipAddress" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "city" TEXT,
    "timezone" TEXT,
    "currency" TEXT,
    "source" TEXT NOT NULL,
    "confidence" REAL,
    "cachedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "payment_analytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "gateway" TEXT NOT NULL,
    "region" TEXT,
    "currency" TEXT NOT NULL,
    "totalTransactions" INTEGER NOT NULL DEFAULT 0,
    "successfulTransactions" INTEGER NOT NULL DEFAULT 0,
    "failedTransactions" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "successfulAmount" REAL NOT NULL DEFAULT 0,
    "averageAmount" REAL NOT NULL DEFAULT 0,
    "successRate" REAL NOT NULL DEFAULT 0,
    "averageProcessingTime" REAL,
    "totalFees" REAL NOT NULL DEFAULT 0,
    "gatewayFees" REAL NOT NULL DEFAULT 0,
    "platformFees" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "review_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "review_reports_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "review_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "app_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "app_reports_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "app_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "developers_email_key" ON "developers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "apps_packageName_key" ON "apps"("packageName");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_userId_appId_key" ON "reviews"("userId", "appId");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_appId_key" ON "favorites"("userId", "appId");

-- CreateIndex
CREATE UNIQUE INDEX "app_analytics_appId_date_key" ON "app_analytics"("appId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "developer_analytics_developerId_date_key" ON "developer_analytics"("developerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_stripePaymentIntentId_key" ON "purchases"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "unified_payments_gateway_status_idx" ON "unified_payments"("gateway", "status");

-- CreateIndex
CREATE INDEX "unified_payments_userId_status_idx" ON "unified_payments"("userId", "status");

-- CreateIndex
CREATE INDEX "unified_payments_developerId_status_idx" ON "unified_payments"("developerId", "status");

-- CreateIndex
CREATE INDEX "unified_payments_country_region_idx" ON "unified_payments"("country", "region");

-- CreateIndex
CREATE INDEX "unified_payments_currency_gateway_idx" ON "unified_payments"("currency", "gateway");

-- CreateIndex
CREATE INDEX "unified_payments_createdAt_idx" ON "unified_payments"("createdAt");

-- CreateIndex
CREATE INDEX "payment_events_paymentId_eventType_idx" ON "payment_events"("paymentId", "eventType");

-- CreateIndex
CREATE INDEX "payment_events_timestamp_idx" ON "payment_events"("timestamp");

-- CreateIndex
CREATE INDEX "payment_retries_paymentId_retryNumber_idx" ON "payment_retries"("paymentId", "retryNumber");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_configs_gateway_key" ON "gateway_configs"("gateway");

-- CreateIndex
CREATE INDEX "currency_rates_fromCurrency_toCurrency_isActive_idx" ON "currency_rates"("fromCurrency", "toCurrency", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "currency_rates_fromCurrency_toCurrency_validFrom_key" ON "currency_rates"("fromCurrency", "toCurrency", "validFrom");

-- CreateIndex
CREATE INDEX "webhook_events_gateway_eventType_idx" ON "webhook_events"("gateway", "eventType");

-- CreateIndex
CREATE INDEX "webhook_events_paymentId_idx" ON "webhook_events"("paymentId");

-- CreateIndex
CREATE INDEX "webhook_events_isProcessed_receivedAt_idx" ON "webhook_events"("isProcessed", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_gateway_eventId_key" ON "webhook_events"("gateway", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "geo_location_cache_ipAddress_key" ON "geo_location_cache"("ipAddress");

-- CreateIndex
CREATE INDEX "geo_location_cache_ipAddress_idx" ON "geo_location_cache"("ipAddress");

-- CreateIndex
CREATE INDEX "geo_location_cache_country_region_idx" ON "geo_location_cache"("country", "region");

-- CreateIndex
CREATE INDEX "geo_location_cache_expiresAt_idx" ON "geo_location_cache"("expiresAt");

-- CreateIndex
CREATE INDEX "payment_analytics_date_gateway_idx" ON "payment_analytics"("date", "gateway");

-- CreateIndex
CREATE INDEX "payment_analytics_gateway_region_idx" ON "payment_analytics"("gateway", "region");

-- CreateIndex
CREATE UNIQUE INDEX "payment_analytics_date_gateway_region_currency_key" ON "payment_analytics"("date", "gateway", "region", "currency");
