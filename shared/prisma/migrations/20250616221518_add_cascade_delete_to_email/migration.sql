-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_email" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "aliasId" TEXT NOT NULL,
    CONSTRAINT "email_aliasId_fkey" FOREIGN KEY ("aliasId") REFERENCES "email_aliases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_email" ("address", "aliasId", "id") SELECT "address", "aliasId", "id" FROM "email";
DROP TABLE "email";
ALTER TABLE "new_email" RENAME TO "email";
CREATE TABLE "new_subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stripeSubscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "currentPeriodStart" DATETIME NOT NULL,
    "currentPeriodEnd" DATETIME NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" DATETIME,
    "trialEnd" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_subscriptions" ("cancelAtPeriodEnd", "canceledAt", "createdAt", "currentPeriodEnd", "currentPeriodStart", "id", "interval", "planId", "status", "stripeSubscriptionId", "trialEnd", "updatedAt", "userId") SELECT "cancelAtPeriodEnd", "canceledAt", "createdAt", "currentPeriodEnd", "currentPeriodStart", "id", "interval", "planId", "status", "stripeSubscriptionId", "trialEnd", "updatedAt", "userId" FROM "subscriptions";
DROP TABLE "subscriptions";
ALTER TABLE "new_subscriptions" RENAME TO "subscriptions";
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
