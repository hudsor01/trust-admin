-- Historical migration. Original ALTER TABLE / DROP TYPE / CREATE TYPE
-- sequence for TrusteeStatus changes + entity column additions. The
-- baseline 0000_high_ares.sql now emits the post-migration state directly,
-- so re-applying these ALTERs on a fresh DB would either duplicate
-- columns (ADD COLUMN without IF NOT EXISTS) or fail on DROP TYPE when
-- the enum has already been dropped.
--
-- Replaced with a no-op. Existing DBs see a hash change and safely
-- re-apply this empty file; fresh DBs apply the baseline and skip this.
SELECT 1;
