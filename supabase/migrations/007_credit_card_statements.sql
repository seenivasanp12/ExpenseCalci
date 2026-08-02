-- Migration 007 — Credit card bill-cycle change cooldown + payment tracking
-- Run once in Supabase SQL Editor, after 006_emi_deferred_discount.sql.

ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS cycle_changed_at DATE;

-- Deliberately independent of expenses/earnings — marking a statement paid
-- never inserts into either table, so the existing Earned/Spent/Calculate-tab
-- math stays untouched (the underlying purchases were already counted as
-- Spent when they happened; this just tracks which statements are settled).
CREATE TABLE IF NOT EXISTS credit_card_payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id          UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  statement_year   SMALLINT NOT NULL,
  statement_month  SMALLINT NOT NULL CHECK (statement_month BETWEEN 1 AND 12),
  amount_paid      NUMERIC(12, 2) NOT NULL,
  paid_day         SMALLINT NOT NULL CHECK (paid_day BETWEEN 1 AND 31),
  paid_month       SMALLINT NOT NULL CHECK (paid_month BETWEEN 1 AND 12),
  paid_year        SMALLINT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(card_id, statement_year, statement_month)
);
CREATE INDEX IF NOT EXISTS idx_cc_payments_card ON credit_card_payments(card_id);

ALTER TABLE credit_card_payments DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE credit_card_payments TO service_role;
NOTIFY pgrst, 'reload schema';
