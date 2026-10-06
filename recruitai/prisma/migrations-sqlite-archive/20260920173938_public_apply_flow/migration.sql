-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Candidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "coverNote" TEXT,
    "cvFileUrl" TEXT NOT NULL,
    "extractedText" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'RECRUITER_UPLOADED',
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Candidate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Candidate" ("cvFileUrl", "email", "extractedText", "id", "jobId", "name", "uploadedAt") SELECT "cvFileUrl", "email", "extractedText", "id", "jobId", "name", "uploadedAt" FROM "Candidate";
DROP TABLE "Candidate";
ALTER TABLE "new_Candidate" RENAME TO "Candidate";
CREATE TABLE "new_Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'Remote',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "stage" TEXT NOT NULL DEFAULT 'pre_product',
    "stackContext" TEXT NOT NULL,
    "stageContext" TEXT NOT NULL,
    "whatTheyOwnFirst" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Job" ("companyId", "createdAt", "createdBy", "description", "id", "stackContext", "stage", "stageContext", "title", "whatTheyOwnFirst") SELECT "companyId", "createdAt", "createdBy", "description", "id", "stackContext", "stage", "stageContext", "title", "whatTheyOwnFirst" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
