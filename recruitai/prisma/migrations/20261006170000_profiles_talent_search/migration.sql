-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'JOB_INVITE';

-- AlterTable
ALTER TABLE "Applicant" ADD COLUMN     "about" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "languages" TEXT,
ADD COLUMN     "openToWork" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profileUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ApplicantExperience" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ApplicantExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicantEducation" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "field" TEXT,
    "startYear" INTEGER,
    "endYear" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ApplicantEducation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobInvite" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicantExperience_applicantId_idx" ON "ApplicantExperience"("applicantId");

-- CreateIndex
CREATE INDEX "ApplicantEducation_applicantId_idx" ON "ApplicantEducation"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "JobInvite_jobId_applicantId_key" ON "JobInvite"("jobId", "applicantId");

-- AddForeignKey
ALTER TABLE "ApplicantExperience" ADD CONSTRAINT "ApplicantExperience_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicantEducation" ADD CONSTRAINT "ApplicantEducation_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobInvite" ADD CONSTRAINT "JobInvite_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobInvite" ADD CONSTRAINT "JobInvite_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

