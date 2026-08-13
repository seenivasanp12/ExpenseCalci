-- Step-up SIP — an optional annual percentage increase to a SIP's monthly
-- amount, set once at SIP creation (there's no "edit SIP" flow in this app;
-- changing it means stopping the SIP and starting a new one, same
-- convention as changing the amount itself already required).
--
-- NULL means no step-up (the SIP amount never changes, today's behavior).
-- The actual per-month effective amount is computed, not stored here — see
-- effectiveSipAmount() in backend/routes/mutualFunds.js and the mirrored
-- util in src/utils/mutualFundCalc.js.

ALTER TABLE mf_sips ADD COLUMN IF NOT EXISTS step_up_percent NUMERIC(5,2) CHECK (step_up_percent > 0 AND step_up_percent <= 100);

NOTIFY pgrst, 'reload schema';
