-- AlterTable
ALTER TABLE "Applicant" ADD COLUMN "headline" TEXT;
ALTER TABLE "Applicant" ADD COLUMN "linkedinUrl" TEXT;
ALTER TABLE "Applicant" ADD COLUMN "portfolioUrl" TEXT;
ALTER TABLE "Applicant" ADD COLUMN "seniority" TEXT;
ALTER TABLE "Applicant" ADD COLUMN "skills" TEXT;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "about" TEXT;
ALTER TABLE "Company" ADD COLUMN "industry" TEXT;
ALTER TABLE "Company" ADD COLUMN "size" TEXT;
ALTER TABLE "Company" ADD COLUMN "website" TEXT;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT,
    "applicantId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "query" TEXT,
    "location" TEXT,
    "seniority" TEXT,
    "skill" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedSearch_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
