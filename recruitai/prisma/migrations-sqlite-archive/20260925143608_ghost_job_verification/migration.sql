-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'Remote',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "seniority" TEXT NOT NULL DEFAULT 'MID',
    "stage" TEXT NOT NULL DEFAULT 'pre_product',
    "stackContext" TEXT NOT NULL,
    "stageContext" TEXT NOT NULL,
    "whatTheyOwnFirst" TEXT NOT NULL,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryCurrency" TEXT NOT NULL DEFAULT 'USD',
    "lastVerifiedActive" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autoClosedAt" DATETIME,
    "companyId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- Hand-edited: existing jobs start verified as of their creation date.
INSERT INTO "new_Job" ("companyId", "createdAt", "createdBy", "lastVerifiedActive", "description", "id", "location", "salaryCurrency", "salaryMax", "salaryMin", "seniority", "stackContext", "stage", "stageContext", "status", "title", "whatTheyOwnFirst") SELECT "companyId", "createdAt", "createdBy", "createdAt", "description", "id", "location", "salaryCurrency", "salaryMax", "salaryMin", "seniority", "stackContext", "stage", "stageContext", "status", "title", "whatTheyOwnFirst" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
