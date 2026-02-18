-- AlterTable: make email optional on users
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable: add new columns to patient_profiles
-- Step 1: Add columns as nullable first
ALTER TABLE "patient_profiles" ADD COLUMN "memberId" TEXT;
ALTER TABLE "patient_profiles" ADD COLUMN "nrc" TEXT;
ALTER TABLE "patient_profiles" ADD COLUMN "nationality" TEXT;

-- Step 2: Backfill memberId for existing rows using a subquery
UPDATE "patient_profiles" AS pp
SET "memberId" = sub."new_id"
FROM (
  SELECT id, 'NDP-2026-' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt")::TEXT, 5, '0') AS "new_id"
  FROM "patient_profiles"
) AS sub
WHERE pp.id = sub.id AND pp."memberId" IS NULL;

-- Step 3: Make memberId required now that all rows have a value
ALTER TABLE "patient_profiles" ALTER COLUMN "memberId" SET NOT NULL;

-- Step 4: Add unique constraints
CREATE UNIQUE INDEX "patient_profiles_memberId_key" ON "patient_profiles"("memberId");
CREATE UNIQUE INDEX "patient_profiles_nrc_key" ON "patient_profiles"("nrc");
