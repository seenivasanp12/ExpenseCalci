-- Migration 003 — Category-tagged expense entries
-- Run once in Supabase SQL Editor.
--
-- Converts `expenses` from "one row per user per day" to
-- "many rows per user per day" (one row per category entry added).
-- Existing rows are kept and backfilled into the 'others' category —
-- no data is lost.

-- 1. Drop the old one-row-per-day unique constraint (name may vary by
--    how Postgres auto-generated it, so look it up instead of hardcoding it).
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'expenses'::regclass AND contype = 'u';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE expenses DROP CONSTRAINT %I', cname);
  END IF;
END $$;

-- 2. Add the category + created_at columns.
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category   TEXT NOT NULL DEFAULT 'others';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_expenses_user_ym_category ON expenses(user_id, year, month, category);
