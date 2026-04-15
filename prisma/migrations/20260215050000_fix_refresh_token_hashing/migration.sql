-- Drop the old token column and add new lookupHash and bcryptHash columns
ALTER TABLE "RefreshToken" DROP COLUMN IF EXISTS "token";
ALTER TABLE "RefreshToken" ADD COLUMN "lookupHash" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "bcryptHash" TEXT;

-- Create unique index on lookupHash
CREATE UNIQUE INDEX "RefreshToken_lookupHash_key" ON "RefreshToken"("lookupHash");
