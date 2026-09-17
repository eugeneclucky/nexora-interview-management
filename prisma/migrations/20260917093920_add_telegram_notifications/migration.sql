-- AlterTable
ALTER TABLE "Interview" ADD COLUMN     "reminder10SentAt" TIMESTAMP(3),
ADD COLUMN     "reminder30SentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "telegramChatId" TEXT,
ADD COLUMN     "telegramUsername" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramChatId_key" ON "User"("telegramChatId");

