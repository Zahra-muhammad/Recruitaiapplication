-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN "duplicateOfId" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "duplicateSimilarity" REAL;

-- AlterTable
ALTER TABLE "Evaluation" ADD COLUMN "interviewQuestions" TEXT;
