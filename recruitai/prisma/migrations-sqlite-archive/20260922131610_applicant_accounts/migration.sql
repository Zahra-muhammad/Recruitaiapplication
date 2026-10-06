-- CreateTable
CREATE TABLE "Applicant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "savedCvFileUrl" TEXT,
    "savedCvText" TEXT,
    "savedCoverNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
    "applicantId" TEXT,
    "applicantStatus" TEXT NOT NULL DEFAULT 'RECEIVED',
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Candidate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Candidate_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Candidate" ("coverNote", "cvFileUrl", "email", "extractedText", "id", "jobId", "name", "phone", "source", "uploadedAt") SELECT "coverNote", "cvFileUrl", "email", "extractedText", "id", "jobId", "name", "phone", "source", "uploadedAt" FROM "Candidate";
DROP TABLE "Candidate";
ALTER TABLE "new_Candidate" RENAME TO "Candidate";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_email_key" ON "Applicant"("email");
