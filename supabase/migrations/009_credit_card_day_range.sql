-- Migration 009 — Allow statement/due day up to 31, not just 28
-- Run once in Supabase SQL Editor, after 008_credit_card_payment_expenses.sql.
--
-- Some cards' real statement/due dates fall late in the month (29-31).
-- Widens the two CHECK constraints — constraint names looked up dynamically
-- since Postgres auto-generates them, same approach as migration 003.

DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
  WHERE conrelid = 'credit_cards'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%statement_day%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE credit_cards DROP CONSTRAINT %I', cname);
  END IF;
END $$;
ALTER TABLE credit_cards ADD CONSTRAINT credit_cards_statement_day_check CHECK (statement_day BETWEEN 1 AND 31);

DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
  WHERE conrelid = 'credit_cards'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%due_day%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE credit_cards DROP CONSTRAINT %I', cname);
  END IF;
END $$;
ALTER TABLE credit_cards ADD CONSTRAINT credit_cards_due_day_check CHECK (due_day BETWEEN 1 AND 31);
