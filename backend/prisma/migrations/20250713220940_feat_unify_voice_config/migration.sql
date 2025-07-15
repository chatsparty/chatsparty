/*
  Warnings:

  - You are about to drop the column `gender` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `podcastSettings` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `voiceConnectionId` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `voiceEnabled` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the `PodcastJob` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Agent" DROP CONSTRAINT "Agent_voiceConnectionId_fkey";

-- DropForeignKey
ALTER TABLE "PodcastJob" DROP CONSTRAINT "PodcastJob_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "PodcastJob" DROP CONSTRAINT "PodcastJob_userId_fkey";

-- DropIndex
DROP INDEX "Agent_voiceConnectionId_idx";

-- AlterTable
ALTER TABLE "Agent" DROP COLUMN "gender",
DROP COLUMN "podcastSettings",
DROP COLUMN "voiceConnectionId",
DROP COLUMN "voiceEnabled",
ADD COLUMN     "voiceConfig" JSONB;

-- DropTable
DROP TABLE "PodcastJob";

-- DropEnum
DROP TYPE "Gender";
