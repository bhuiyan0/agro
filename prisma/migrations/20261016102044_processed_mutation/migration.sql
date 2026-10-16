-- CreateTable
CREATE TABLE "ProcessedMutation" (
    "mutationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedMutation_pkey" PRIMARY KEY ("mutationId")
);

-- CreateIndex
CREATE INDEX "ProcessedMutation_createdAt_idx" ON "ProcessedMutation"("createdAt");
