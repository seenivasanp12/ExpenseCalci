-- Migration 001 — Initial Schema
-- Run once in Supabase SQL Editor to create all tables.
-- SAFE TO RE-RUN: uses IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS family_users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT UNIQUE NOT NULL,
  password     TEXT NOT NULL,              -- bcrypt hash (or SHA-256 for legacy rows)
  color_index  INT  NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS earnings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES family_users(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_salary    BOOLEAN NOT NULL DEFAULT false,
  month        INT NOT NULL,
  year         INT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES family_users(id) ON DELETE CASCADE,
  day          INT NOT NULL,
  month        INT NOT NULL,
  year         INT NOT NULL,
  amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  remark       TEXT NOT NULL DEFAULT '',
  UNIQUE (user_id, day, month, year)
);

CREATE TABLE IF NOT EXISTS achievements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES family_users(id) ON DELETE CASCADE,
  entry_date   DATE NOT NULL,
  month        INT NOT NULL,
  year         INT NOT NULL,
  amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  remark       TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast monthly queries
CREATE INDEX IF NOT EXISTS idx_earnings_user_month      ON earnings     (user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_expenses_user_month      ON expenses     (user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_achievements_user_month  ON achievements (user_id, year, month);
