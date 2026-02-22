-- Migration number: 0007 	 2024-05-24T00:00:00.000Z
ALTER TABLE "Profile" ADD COLUMN "bannerUrl" TEXT;
ALTER TABLE "Profile" ADD COLUMN "position" TEXT;
ALTER TABLE "Profile" ADD COLUMN "department" TEXT;
ALTER TABLE "Profile" ADD COLUMN "companyName" TEXT;
ALTER TABLE "Link" ADD COLUMN "category" TEXT DEFAULT 'PERSONAL';
