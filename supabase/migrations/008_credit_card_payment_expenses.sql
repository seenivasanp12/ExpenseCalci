-- Migration 008 — Partial credit-card bill payments + real payment entries
-- Run once in Supabase SQL Editor, after 007_credit_card_statements.sql.
--
-- Allows multiple (partial) payments against the same statement — drops the
-- old one-payment-per-statement UNIQUE constraint (name looked up dynamically
-- since Postgres auto-generates/truncates it, same approach as migration 003).
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
  WHERE conrelid = 'credit_card_payments'::regclass AND contype = 'u';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE credit_card_payments DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE credit_card_payments ADD COLUMN IF NOT EXISTS expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL;
ALTER TABLE credit_card_payments ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'debit_card';
ALTER TABLE credit_card_payments DROP CONSTRAINT IF EXISTS credit_card_payments_payment_method_check;
ALTER TABLE credit_card_payments ADD CONSTRAINT credit_card_payments_payment_method_check
  CHECK (payment_method IN ('cash', 'upi', 'debit_card', 'other'));

NOTIFY pgrst, 'reload schema';
