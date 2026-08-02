-- Migration 006 — Real-world "No Cost"/Deferred EMI + monthly GST-on-interest
-- Run once in Supabase SQL Editor, after 005_emi.sql.
--
-- Corrects the EMI model against real bank behavior (No Cost EMI is really an
-- interest-bearing EMI plus a separate delayed discount refund, not a flat
-- interest-free split) and adds monthly GST on each installment's interest
-- component. No existing emi_plans/emi_installments rows exist yet, so these
-- are safe additive/constraint changes.

ALTER TABLE emi_plans DROP CONSTRAINT IF EXISTS emi_plans_emi_type_check;
ALTER TABLE emi_plans ADD CONSTRAINT emi_plans_emi_type_check
  CHECK (emi_type IN ('interest', 'deferred', 'upfront_discount'));

ALTER TABLE emi_plans ADD COLUMN IF NOT EXISTS deferred_discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE emi_plans ADD COLUMN IF NOT EXISTS discount_expected_day    SMALLINT CHECK (discount_expected_day BETWEEN 1 AND 31);
ALTER TABLE emi_plans ADD COLUMN IF NOT EXISTS discount_expected_month  SMALLINT CHECK (discount_expected_month BETWEEN 1 AND 12);
ALTER TABLE emi_plans ADD COLUMN IF NOT EXISTS discount_expected_year   SMALLINT;
ALTER TABLE emi_plans ADD COLUMN IF NOT EXISTS discount_confirmed_day   SMALLINT CHECK (discount_confirmed_day BETWEEN 1 AND 31);
ALTER TABLE emi_plans ADD COLUMN IF NOT EXISTS discount_confirmed_month SMALLINT CHECK (discount_confirmed_month BETWEEN 1 AND 12);
ALTER TABLE emi_plans ADD COLUMN IF NOT EXISTS discount_confirmed_year  SMALLINT;
ALTER TABLE emi_plans ADD COLUMN IF NOT EXISTS discount_status TEXT NOT NULL DEFAULT 'not_applicable'
  CHECK (discount_status IN ('not_applicable', 'pending', 'confirmed'));

-- due_day: precise day for every installment (previously only month/year were
-- stored; the discount-refund row needs day-level precision since the user
-- picks the exact date it posts).
ALTER TABLE emi_installments ADD COLUMN IF NOT EXISTS due_day SMALLINT NOT NULL DEFAULT 1 CHECK (due_day BETWEEN 1 AND 31);
-- gst_component: monthly GST on this installment's interest (0 for the
-- one-time processing-fee row and for interest-free upfront_discount plans).
ALTER TABLE emi_installments ADD COLUMN IF NOT EXISTS gst_component NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- installment_no can now also be -1, reserved for the confirmed deferred-
-- discount credit row (0 = processing fee, 1..N = real installments).

-- New columns on already-granted tables don't need fresh GRANTs, but
-- PostgREST's schema cache still needs telling about them.
NOTIFY pgrst, 'reload schema';
