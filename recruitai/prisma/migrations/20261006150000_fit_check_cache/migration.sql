-- CreateTable
CREATE TABLE "ScoringCache" (
    "inputHash" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoringCache_pkey" PRIMARY KEY ("inputHash")
);

-- CreateTable
CREATE TABLE "FitCheckLog" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FitCheckLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FitCheckLog_ipHash_createdAt_idx" ON "FitCheckLog"("ipHash", "createdAt");

