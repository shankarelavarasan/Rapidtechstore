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
    "subscriptionCount" INTEGER NOT NULL DEFAULT 0,
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
INSERT INTO "new_apps" ("bannerImage", "category", "conversionConfig", "createdAt", "description", "developerId", "downloadCount", "features", "icon", "id", "isPublished", "lastUpdated", "metadata", "minAndroidVersion", "name", "packageName", "permissions", "price", "pricing", "publishedAt", "rating", "rejectionReason", "reviewCount", "screenshots", "shortDescription", "status", "subcategory", "subscriptionPlans", "targetSdkVersion", "updatedAt", "version", "views", "website") SELECT "bannerImage", "category", "conversionConfig", "createdAt", "description", "developerId", "downloadCount", "features", "icon", "id", "isPublished", "lastUpdated", "metadata", "minAndroidVersion", "name", "packageName", "permissions", "price", "pricing", "publishedAt", "rating", "rejectionReason", "reviewCount", "screenshots", "shortDescription", "status", "subcategory", "subscriptionPlans", "targetSdkVersion", "updatedAt", "version", "views", "website" FROM "apps";
DROP TABLE "apps";
ALTER TABLE "new_apps" RENAME TO "apps";
CREATE UNIQUE INDEX "apps_packageName_key" ON "apps"("packageName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
