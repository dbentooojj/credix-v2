-- Remove avatar URL from the user profile (feature reverted).
ALTER TABLE "User" DROP COLUMN IF EXISTS "avatarUrl";

