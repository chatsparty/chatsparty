/*
  Warnings:

  - You are about to drop the column `voiceConfig` on the `Agent` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Agent" DROP COLUMN "voiceConfig",
ADD COLUMN     "voiceConnectionId" TEXT,
ADD COLUMN     "voiceEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Agent_voiceConnectionId_idx" ON "Agent"("voiceConnectionId");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_voiceConnectionId_fkey" FOREIGN KEY ("voiceConnectionId") REFERENCES "VoiceConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
