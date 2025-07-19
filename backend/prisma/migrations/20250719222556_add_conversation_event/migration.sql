/*
  Warnings:

  - You are about to drop the column `aiConfig` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `modelName` on the `Connection` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Agent" DROP COLUMN "aiConfig";

-- AlterTable
ALTER TABLE "Connection" DROP COLUMN "modelName",
ADD COLUMN     "config" JSONB;

-- CreateTable
CREATE TABLE "ConversationEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConversationEvent_eventId_key" ON "ConversationEvent"("eventId");

-- CreateIndex
CREATE INDEX "ConversationEvent_conversationId_idx" ON "ConversationEvent"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationEvent_timestamp_idx" ON "ConversationEvent"("timestamp");

-- CreateIndex
CREATE INDEX "ConversationEvent_eventType_idx" ON "ConversationEvent"("eventType");

-- CreateIndex
CREATE INDEX "Agent_connectionId_idx" ON "Agent"("connectionId");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationEvent" ADD CONSTRAINT "ConversationEvent_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
