-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "category" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isOriginal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "templateId" TEXT,
ADD COLUMN     "usageCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AgentRating" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "isHelpful" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentUsage" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usageType" TEXT NOT NULL,
    "conversationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentRating_agentId_idx" ON "AgentRating"("agentId");

-- CreateIndex
CREATE INDEX "AgentRating_userId_idx" ON "AgentRating"("userId");

-- CreateIndex
CREATE INDEX "AgentRating_rating_idx" ON "AgentRating"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "AgentRating_agentId_userId_key" ON "AgentRating"("agentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentCategory_name_key" ON "AgentCategory"("name");

-- CreateIndex
CREATE INDEX "AgentCategory_name_idx" ON "AgentCategory"("name");

-- CreateIndex
CREATE INDEX "AgentCategory_sortOrder_idx" ON "AgentCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "AgentUsage_agentId_idx" ON "AgentUsage"("agentId");

-- CreateIndex
CREATE INDEX "AgentUsage_userId_idx" ON "AgentUsage"("userId");

-- CreateIndex
CREATE INDEX "AgentUsage_createdAt_idx" ON "AgentUsage"("createdAt");

-- CreateIndex
CREATE INDEX "AgentUsage_usageType_idx" ON "AgentUsage"("usageType");

-- CreateIndex
CREATE INDEX "Agent_isPublic_idx" ON "Agent"("isPublic");

-- CreateIndex
CREATE INDEX "Agent_category_idx" ON "Agent"("category");

-- CreateIndex
CREATE INDEX "Agent_rating_idx" ON "Agent"("rating");

-- CreateIndex
CREATE INDEX "Agent_usageCount_idx" ON "Agent"("usageCount");

-- CreateIndex
CREATE INDEX "Agent_templateId_idx" ON "Agent"("templateId");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRating" ADD CONSTRAINT "AgentRating_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRating" ADD CONSTRAINT "AgentRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentUsage" ADD CONSTRAINT "AgentUsage_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentUsage" ADD CONSTRAINT "AgentUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentUsage" ADD CONSTRAINT "AgentUsage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
