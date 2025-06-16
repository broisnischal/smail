-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_email_aliases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alias" TEXT NOT NULL,
    "domain" TEXT NOT NULL DEFAULT 'snehaa.store',
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "email_aliases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_email_aliases" ("alias", "createdAt", "emailCount", "expiresAt", "id", "isActive", "updatedAt", "userId") SELECT "alias", "createdAt", "emailCount", "expiresAt", "id", "isActive", "updatedAt", "userId" FROM "email_aliases";
DROP TABLE "email_aliases";
ALTER TABLE "new_email_aliases" RENAME TO "email_aliases";
CREATE UNIQUE INDEX "email_aliases_alias_key" ON "email_aliases"("alias");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
