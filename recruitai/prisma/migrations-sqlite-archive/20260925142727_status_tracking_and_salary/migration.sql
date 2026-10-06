-- CreateTable
CREATE TABLE "CandidateStatusChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedById" TEXT,
    "changedByName" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CandidateStatusChange_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CandidateStatusChange_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OutboundEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "candidateId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME
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
    "qualifications" TEXT,
    "cvFileUrl" TEXT NOT NULL,
    "extractedText" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'RECRUITER_UPLOADED',
    "applicantId" TEXT,
    "applicantStatus" TEXT NOT NULL DEFAULT 'RECEIVED',
    "statusUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusToken" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Candidate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Candidate_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- Hand-edited: backfill a random status token per existing candidate, carry
-- the status timestamp over from uploadedAt, and rename the old enum values
-- (UNDER_REVIEW -> IN_REVIEW, REJECTED -> NOT_MOVING_FORWARD).
INSERT INTO "new_Candidate" ("applicantId", "applicantStatus", "statusUpdatedAt", "statusToken", "coverNote", "cvFileUrl", "email", "extractedText", "id", "jobId", "name", "phone", "qualifications", "source", "uploadedAt") SELECT "applicantId", CASE "applicantStatus" WHEN 'UNDER_REVIEW' THEN 'IN_REVIEW' WHEN 'REJECTED' THEN 'NOT_MOVING_FORWARD' ELSE "applicantStatus" END, "uploadedAt", lower(hex(randomblob(24))), "coverNote", "cvFileUrl", "email", "extractedText", "id", "jobId", "name", "phone", "qualifications", "source", "uploadedAt" FROM "Candidate";
DROP TABLE "Candidate";
ALTER TABLE "new_Candidate" RENAME TO "Candidate";
CREATE UNIQUE INDEX "Candidate_statusToken_key" ON "Candidate"("statusToken");
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
    "companyId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Job" ("companyId", "createdAt", "createdBy", "description", "id", "location", "seniority", "stackContext", "stage", "stageContext", "status", "title", "whatTheyOwnFirst") SELECT "companyId", "createdAt", "createdBy", "description", "id", "location", "seniority", "stackContext", "stage", "stageContext", "status", "title", "whatTheyOwnFirst" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
