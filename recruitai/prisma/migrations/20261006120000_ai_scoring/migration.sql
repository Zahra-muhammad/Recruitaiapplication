-- CreateEnum
CREATE TYPE "ScoringStatus" AS ENUM ('PENDING', 'SCORED', 'FAILED');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "scoringRubric" TEXT;

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "formName" TEXT,
ADD COLUMN     "scoringError" TEXT,
ADD COLUMN     "scoringStartedAt" TIMESTAMP(3),
ADD COLUMN     "scoringStatus" "ScoringStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Evaluation" ADD COLUMN     "details" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN     "experienceScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "inputHash" TEXT,
ADD COLUMN     "keywordStuffing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mustHaveScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "niceToHaveScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "otherScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "overqualified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scoringVersion" TEXT NOT NULL DEFAULT 'legacy',
ALTER COLUMN "stackOverlapScore" SET DEFAULT 0,
ALTER COLUMN "buildingScore" SET DEFAULT 0,
ALTER COLUMN "startupToleranceScore" SET DEFAULT 0,
ALTER COLUMN "rangeScore" SET DEFAULT 0,
ALTER COLUMN "redFlagScore" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "Evaluation_inputHash_idx" ON "Evaluation"("inputHash");


-- Existing candidates were scored synchronously by the old keyword scorer.
UPDATE "Candidate" SET "scoringStatus" = 'SCORED'
WHERE "id" IN (SELECT "candidateId" FROM "Evaluation");
UPDATE "Candidate" SET "scoringStatus" = 'FAILED', "scoringError" = 'No score was saved for this CV.'
WHERE "id" NOT IN (SELECT "candidateId" FROM "Evaluation");
