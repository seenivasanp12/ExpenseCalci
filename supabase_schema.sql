-- ============================================================
--  Family Expenses — PostgreSQL Schema
--  Run this entire file in Supabase → SQL Editor → Run
-- ============================================================

-- Family members (custom auth — no Supabase Auth needed)
CREATE TABLE IF NOT EXISTS family_users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT UNIQUE NOT NULL,
  password     TEXT NOT NULL,          -- SHA-256 hash
  color_index  INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly income entries
CREATE TABLE IF NOT EXISTS earnings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES family_users(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  amount       NUMERIC(12, 2) NOT NULL,
  is_salary    BOOLEAN DEFAULT FALSE,
  month        SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year         SMALLINT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_earnings_user_ym ON earnings(user_id, year, month);

-- Daily expense rows (one row per user per day — UPSERT-safe)
CREATE TABLE IF NOT EXISTS expenses (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES family_users(id) ON DELETE CASCADE,
  day      SMALLINT NOT NULL CHECK (day BETWEEN 1 AND 31),
  month    SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year     SMALLINT NOT NULL,
  amount   NUMERIC(12, 2) DEFAULT 0,
  remark   TEXT DEFAULT '',
  UNIQUE(user_id, day, month, year)
);
CREATE INDEX IF NOT EXISTS idx_expenses_user_ym ON expenses(user_id, year, month);

-- Savings / investment entries
CREATE TABLE IF NOT EXISTS achievements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES family_users(id) ON DELETE CASCADE,
  entry_date  DATE NOT NULL,
  month       SMALLINT NOT NULL,
  year        SMALLINT NOT NULL,
  amount      NUMERIC(12, 2) NOT NULL,
  remark      TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_achievements_user_ym ON achievements(user_id, year, month);

-- ============================================================
--  Row Level Security
--  NOTE: Disabled for development. Enable + configure RLS
--  before making this app public on the internet.
-- ============================================================
ALTER TABLE family_users  DISABLE ROW LEVEL SECURITY;
ALTER TABLE earnings       DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses       DISABLE ROW LEVEL SECURITY;
ALTER TABLE achievements   DISABLE ROW LEVEL SECURITY;
