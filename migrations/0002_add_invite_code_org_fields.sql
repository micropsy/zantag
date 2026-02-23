-- Migration number: 0002 	 2024-05-23T00:00:00.000Z
-- Add organization fields to InviteCode table

ALTER TABLE "InviteCode" ADD COLUMN "organizationName" TEXT;
ALTER TABLE "InviteCode" ADD COLUMN "organizationSlug" TEXT;
