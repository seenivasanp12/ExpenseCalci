-- Migration 004 — Credit cards + payment method on expenses
-- Run once in Supabase SQL Editor.
--
-- Adds a credit_cards table (one row per card a family member owns) and
-- tags each expense with how it was paid. Existing expense rows default
-- to payment_method='cash' — no data is lost or reinterpreted.

CREATE TABLE IF NOT EXISTS credit_cards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES family_users(id) ON DELETE CASCADE,
  bank            TEXT NOT NULL,
  card_name       TEXT NOT NULL,
  nickname        TEXT DEFAULT '',
  credit_limit    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  statement_day   SMALLINT NOT NULL CHECK (statement_day BETWEEN 1 AND 28),
  due_day         SMALLINT NOT NULL CHECK (due_day BETWEEN 1 AND 28),
  joining_fee     NUMERIC(12, 2) DEFAULT 0,
  annual_fee      NUMERIC(12, 2) DEFAULT 0,
  fee_waiver_note TEXT DEFAULT '',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_credit_cards_user ON credit_cards(user_id);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash';
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_payment_method_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_payment_method_check
  CHECK (payment_method IN ('cash', 'upi', 'debit_card', 'credit_card', 'other'));

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_card ON expenses(card_id) WHERE card_id IS NOT NULL;

-- RLS is disabled for this project (see supabase_schema.sql) — the Express
-- layer scopes every query by user_id/family_id instead.
ALTER TABLE credit_cards DISABLE ROW LEVEL SECURITY;
