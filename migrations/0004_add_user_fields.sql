-- AlterTable
ALTER TABLE "User" ADD COLUMN "shortCode" TEXT;
ALTER TABLE "User" ADD COLUMN "status" TEXT DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN "separatedAt" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX "User_shortCode_key" ON "User"("shortCode");