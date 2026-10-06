-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Evaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "verdict" TEXT NOT NULL,
    "rangeScore" INTEGER NOT NULL,
    "buildingScore" INTEGER NOT NULL,
    "startupToleranceScore" INTEGER NOT NULL,
    "stackOverlapScore" INTEGER NOT NULL,
    "redFlagScore" INTEGER NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "strengths" TEXT NOT NULL,
    "concerns" TEXT NOT NULL,
    "potential" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "manualVerdictOverride" TEXT,
    "evaluatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Evaluation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Evaluation" ("buildingScore", "candidateId", "concerns", "evaluatedAt", "id", "manualVerdictOverride", "notes", "rangeScore", "redFlagScore", "stackOverlapScore", "startupToleranceScore", "strengths", "totalScore", "verdict") SELECT "buildingScore", "candidateId", "concerns", "evaluatedAt", "id", "manualVerdictOverride", "notes", "rangeScore", "redFlagScore", "stackOverlapScore", "startupToleranceScore", "strengths", "totalScore", "verdict" FROM "Evaluation";
DROP TABLE "Evaluation";
ALTER TABLE "new_Evaluation" RENAME TO "Evaluation";
CREATE UNIQUE INDEX "Evaluation_candidateId_key" ON "Evaluation"("candidateId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
