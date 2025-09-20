/*
  Warnings:

  - Added the required column `country` to the `developers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `developers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `developers` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_developers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "businessEmail" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "gstNumber" TEXT,
    "taxId" TEXT,
    "address" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "emailVerificationExpires" DATETIME,
    "passwordResetToken" TEXT,
    "passwordResetExpires" DATETIME,
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
INSERT INTO "new_developers" ("address", "approvedAt", "approvedBy", "bankDetails", "businessEmail", "companyName", "createdAt", "domainVerificationMethod", "domainVerificationToken", "email", "emailVerificationToken", "gstNumber", "id", "isActive", "isDomainVerified", "isEmailVerified", "password", "payoneerEmail", "payoutMethod", "phoneNumber", "rejectionReason", "taxId", "updatedAt", "verificationStatus", "website") SELECT "address", "approvedAt", "approvedBy", "bankDetails", "businessEmail", "companyName", "createdAt", "domainVerificationMethod", "domainVerificationToken", "email", "emailVerificationToken", "gstNumber", "id", "isActive", "isDomainVerified", "isEmailVerified", "password", "payoneerEmail", "payoutMethod", "phoneNumber", "rejectionReason", "taxId", "updatedAt", "verificationStatus", "website" FROM "developers";
DROP TABLE "developers";
ALTER TABLE "new_developers" RENAME TO "developers";
CREATE UNIQUE INDEX "developers_email_key" ON "developers"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
