-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "role" TEXT NOT NULL DEFAULT 'USER',
    "country" TEXT,
    "dateOfBirth" DATETIME,
    "emailVerificationToken" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpires" DATETIME,
    "lastLoginAt" DATETIME,
    "preferences" TEXT,
    "stripeCustomerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("country", "createdAt", "dateOfBirth", "email", "emailVerificationToken", "firstName", "id", "isActive", "isEmailVerified", "lastLoginAt", "lastName", "name", "password", "passwordResetExpires", "passwordResetToken", "phoneNumber", "preferences", "profileImage", "role", "stripeCustomerId", "updatedAt") SELECT "country", "createdAt", "dateOfBirth", "email", "emailVerificationToken", "firstName", "id", "isActive", "isEmailVerified", "lastLoginAt", "lastName", "name", "password", "passwordResetExpires", "passwordResetToken", "phoneNumber", "preferences", "profileImage", "role", "stripeCustomerId", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
