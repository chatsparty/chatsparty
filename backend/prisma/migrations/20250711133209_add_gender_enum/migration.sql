-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'NEUTRAL');

-- Update existing data to use uppercase values
UPDATE "Agent" SET "gender" = 'MALE' WHERE "gender" = 'male';
UPDATE "Agent" SET "gender" = 'FEMALE' WHERE "gender" = 'female';
UPDATE "Agent" SET "gender" = 'NEUTRAL' WHERE "gender" = 'neutral';

-- AlterTable
ALTER TABLE "Agent" ALTER COLUMN "gender" DROP DEFAULT;
ALTER TABLE "Agent" ALTER COLUMN "gender" TYPE "Gender" USING "gender"::"Gender";
ALTER TABLE "Agent" ALTER COLUMN "gender" SET DEFAULT 'NEUTRAL';