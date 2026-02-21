-- Migration number: 0006 	 2024-05-24T00:00:00.000Z
-- Add contact fields to Profile
ALTER TABLE "Profile" ADD COLUMN "publicPhone" TEXT;
ALTER TABLE "Profile" ADD COLUMN "publicEmail" TEXT;
ALTER TABLE "Profile" ADD COLUMN "website" TEXT;
ALTER TABLE "Profile" ADD COLUMN "location" TEXT;
