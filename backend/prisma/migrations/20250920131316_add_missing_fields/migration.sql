-- CreateTable
CREATE TABLE "review_helpful" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "helpful" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "review_helpful_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "review_helpful_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_apps" (
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
    "views" INTEGER NOT NULL DEFAULT 0,
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
INSERT INTO "new_apps" ("bannerImage", "category", "conversionConfig", "createdAt", "description", "developerId", "downloadCount", "features", "icon", "id", "isPublished", "lastUpdated", "metadata", "minAndroidVersion", "name", "packageName", "permissions", "price", "pricing", "publishedAt", "rating", "rejectionReason", "reviewCount", "screenshots", "shortDescription", "status", "subcategory", "subscriptionPlans", "targetSdkVersion", "updatedAt", "version", "website") SELECT "bannerImage", "category", "conversionConfig", "createdAt", "description", "developerId", "downloadCount", "features", "icon", "id", "isPublished", "lastUpdated", "metadata", "minAndroidVersion", "name", "packageName", "permissions", "price", "pricing", "publishedAt", "rating", "rejectionReason", "reviewCount", "screenshots", "shortDescription", "status", "subcategory", "subscriptionPlans", "targetSdkVersion", "updatedAt", "version", "website" FROM "apps";
DROP TABLE "apps";
ALTER TABLE "new_apps" RENAME TO "apps";
CREATE UNIQUE INDEX "apps_packageName_key" ON "apps"("packageName");
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "name" TEXT,
    "phoneNumber" TEXT,
    "profileImage" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "country" TEXT,
    "emailVerificationToken" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpires" DATETIME,
    "lastLoginAt" DATETIME,
    "stripeCustomerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("createdAt", "email", "emailVerificationToken", "firstName", "id", "isEmailVerified", "lastLoginAt", "lastName", "name", "password", "passwordResetExpires", "passwordResetToken", "phoneNumber", "profileImage", "stripeCustomerId", "updatedAt") SELECT "createdAt", "email", "emailVerificationToken", "firstName", "id", "isEmailVerified", "lastLoginAt", "lastName", "name", "password", "passwordResetExpires", "passwordResetToken", "phoneNumber", "profileImage", "stripeCustomerId", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "review_helpful_reviewId_userId_key" ON "review_helpful"("reviewId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");
