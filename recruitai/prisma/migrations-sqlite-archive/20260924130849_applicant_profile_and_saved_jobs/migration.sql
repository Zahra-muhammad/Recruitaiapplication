-- AlterTable
ALTER TABLE "Applicant" ADD COLUMN "desiredTitle" TEXT;
ALTER TABLE "Applicant" ADD COLUMN "location" TEXT;
ALTER TABLE "Applicant" ADD COLUMN "noticePeriod" TEXT;
ALTER TABLE "Applicant" ADD COLUMN "remotePreference" TEXT;
ALTER TABLE "Applicant" ADD COLUMN "salaryExpectation" TEXT;
ALTER TABLE "Applicant" ADD COLUMN "workAuthorization" TEXT;
ALTER TABLE "Applicant" ADD COLUMN "yearsOfExperience" INTEGER;

-- CreateTable
CREATE TABLE "SavedJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedJob_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SavedJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedJob_applicantId_jobId_key" ON "SavedJob"("applicantId", "jobId");
