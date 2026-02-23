CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "password" TEXT NOT NULL,
  "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
  "verificationToken" TEXT,
  "resetToken" TEXT,
  "resetTokenExpiresAt" DATETIME,
  "role" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
  "profileId" TEXT,
  "isActivated" BOOLEAN NOT NULL DEFAULT false,
  "secretKey" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "separatedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_profileId_key" ON "User"("profileId");

CREATE TABLE IF NOT EXISTS "InviteCode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "isUsed" BOOLEAN NOT NULL DEFAULT false,
  "userId" TEXT,
  "role" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
  "email" TEXT,
  "organizationName" TEXT,
  "organizationSlug" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "InviteCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "InviteCode_code_key" ON "InviteCode"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "InviteCode_userId_key" ON "InviteCode"("userId");

CREATE TABLE IF NOT EXISTS "Tag" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "Tag_name_key" ON "Tag"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_slug_key" ON "Tag"("slug");

CREATE TABLE IF NOT EXISTS "Organization" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "logo" TEXT,
  "maxSeats" INTEGER NOT NULL DEFAULT 5,
  "adminId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Organization_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug");

CREATE TABLE IF NOT EXISTS "Profile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "displayName" TEXT,
  "bio" TEXT,
  "avatarUrl" TEXT,
  "bannerUrl" TEXT,
  "position" TEXT,
  "department" TEXT,
  "companyName" TEXT,
  "companyId" TEXT,
  "isLockedByAdmin" BOOLEAN NOT NULL DEFAULT false,
  "primaryColor" TEXT DEFAULT '#0F172A',
  "secondaryColor" TEXT DEFAULT '#06B6D4',
  "publicPhone" TEXT,
  "publicEmail" TEXT,
  "website" TEXT,
  "location" TEXT,
  "views" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Profile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Profile_userId_key" ON "Profile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Profile_username_key" ON "Profile"("username");

CREATE TABLE IF NOT EXISTS "Link" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "profileId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "icon" TEXT,
  "type" TEXT NOT NULL DEFAULT 'SOCIAL',
  "category" TEXT NOT NULL DEFAULT 'PERSONAL',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Link_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Link_profileId_idx" ON "Link"("profileId");

CREATE TABLE IF NOT EXISTS "Contact" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "profileId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "notes" TEXT,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Contact_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Contact_profileId_idx" ON "Contact"("profileId");

CREATE TABLE IF NOT EXISTS "Document" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "profileId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'PDF',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Document_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Document_profileId_idx" ON "Document"("profileId");

CREATE TABLE IF NOT EXISTS "SystemSetting" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "value" TEXT NOT NULL
);

