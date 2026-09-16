/*
  Warnings:

  - You are about to drop the column `status` on the `Interview` table. All the data in the column will be lost.
  - Added the required column `statusStepId` to the `Interview` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StepKind" AS ENUM ('ACTIVE', 'CANCELLED', 'NO_SHOW');

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_managerId_fkey";

-- AlterTable
ALTER TABLE "CandidateProfile" ADD COLUMN     "city" TEXT,
ADD COLUMN     "dob" TIMESTAMP(3),
ADD COLUMN     "ssnLast4" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "zip" TEXT;

-- AlterTable
ALTER TABLE "Interview" DROP COLUMN "status",
ADD COLUMN     "durationMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "eventName" TEXT,
ADD COLUMN     "statusStepId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "secondaryTimezone" TEXT;

-- DropEnum
DROP TYPE "InterviewStatus";

-- CreateTable
CREATE TABLE "StatusStep" (
    "id" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "StepKind" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatusStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StatusStep_managerId_idx" ON "StatusStep"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "StatusStep_managerId_order_key" ON "StatusStep"("managerId", "order");

-- CreateIndex
CREATE INDEX "Interview_statusStepId_idx" ON "Interview"("statusStepId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusStep" ADD CONSTRAINT "StatusStep_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_statusStepId_fkey" FOREIGN KEY ("statusStepId") REFERENCES "StatusStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
