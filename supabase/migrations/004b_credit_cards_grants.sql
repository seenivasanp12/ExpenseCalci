-- Migration 004b — Fix missing grants on credit_cards
-- Run once in Supabase SQL Editor, after 004_credit_cards.sql.
--
-- Tables created via the SQL Editor don't automatically inherit the
-- project's default privileges the way dashboard-created tables do, so
-- the service_role connection our backend uses has no access yet even
-- though the table exists (hence "permission denied for table credit_cards").

GRANT ALL ON TABLE credit_cards TO service_role;

-- PostgREST caches table/permission info — tell it to refresh.
NOTIFY pgrst, 'reload schema';
