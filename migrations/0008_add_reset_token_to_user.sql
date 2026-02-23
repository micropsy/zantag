-- Migration number: 0008 	 2024-02-23T00:00:00.000Z
ALTER TABLE "User" ADD COLUMN "resetToken" TEXT;
ALTER TABLE "User" ADD COLUMN "resetTokenExpiresAt" DATETIME;
