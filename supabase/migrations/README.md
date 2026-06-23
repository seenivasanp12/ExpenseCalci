# Database Migrations

## How to apply
Open Supabase → SQL Editor → paste the file → Run.

| File | When to run |
|------|-------------|
| `001_initial_schema.sql` | Once, on first setup |
| `002_rls_backend_only.sql` | Once, after switching to the Express backend |

## Rules for safe future migrations (your data will NEVER be lost)

1. **Only ADD columns** — never rename or drop an existing column.
   ```sql
   ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '';
   ```
2. **Give new columns a DEFAULT** — so existing rows get a value automatically.
3. **Number new files** — `003_add_category.sql`, `004_add_notes.sql`, etc.
4. **Code changes never touch the DB** — pushing new React or Node code to the server
   only updates the app logic; the database stays exactly as it is.
5. **Test on a copy first** — duplicate the Supabase project and run the migration there
   before applying to the real family data.
