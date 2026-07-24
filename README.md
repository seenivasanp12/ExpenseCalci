# Family Expenses — Multi-Family Budget Tracker

A mobile budget tracker (React + Vite + Capacitor for Android) where **any household can
sign up as its own family**, add its members, and track earnings, expenses, savings, and
monthly targets — fully isolated from every other family using the app.

## How it works

### 1. Create your family (one time, done by whoever manages the budget)
Open the app → **"New family? Sign up"** on the first screen → fill in:
- Family Name
- Accountant Name (this becomes the family's admin)
- Email and Mobile Number (stored for contact purposes; not verified yet — that's a
  planned future step)
- Password + Confirm Password

On success you'll get a short **Family Code** (e.g. `PF1001`) — save it. This code is
what identifies your family; share it with your household so they can log in too.

### 2. Sign in
Every visit starts with the **Family Code** screen. Enter your code and continue — you'll
land on your family's profile grid.

- **Family members** tap their own name and enter their personal password.
- **The admin** taps "Admin Panel — Family Budget" and enters the admin password set at
  signup.

### 3. Admin adds family members
From the Admin Panel → **Users** tab, the admin creates a profile (name + password) for
each family member, one at a time — exactly like adding a user to a shared household
app. Members then log in with those credentials from the Family Code screen.

### Data isolation
Every family's members, earnings, expenses, and achievements are scoped to that family
only — no family can see or modify another family's data or members, enforced on the
backend for every request.

## Project structure

```
src/               React frontend (Vite)
  components/      Screens: FamilyGate, FamilySignup, Welcome, Login, Dashboard,
                   AdminLogin, AdminDashboard, and the tab components inside them
  utils/api.js     All calls to the Express backend
backend/           Express API (Node), talking to Supabase (Postgres)
  routes/          families.js (signup/lookup), auth.js, users.js, data.js
android/           Capacitor-generated native Android project
```

## Development setup

1. **Frontend env** — copy `.env.example` to `.env` and set `VITE_API_URL` to your
   backend's URL (leave blank for local dev; Vite's dev proxy handles `/api`).
2. **Backend env** — copy `backend/.env.example` to `backend/.env` and fill in:
   - `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` (Supabase project → Settings → API →
     **service role** key — never the anon key)
   - `JWT_SECRET` (generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
   - `PORT` (defaults to 3001)
3. **Database** — the Supabase project needs two tables: `families` and `family_users`
   (with a `family_id` foreign key), plus `earnings`, `expenses`, `achievements` scoped
   by `user_id`. See git history for the exact `create table`/`alter table` statements
   used to set this up.
4. Install dependencies and run:
   ```bash
   npm install
   npm run dev:backend   # starts the Express API on :3001
   npm run dev            # starts the Vite dev server on :5173
   ```

## Building the Android APK

```bash
npm run build:android   # vite build + capacitor sync
cd android && ./gradlew assembleRelease
```
The signed APK lands in `android/app/build/outputs/apk/release/app-release.apk`. Bump
`versionCode`/`versionName` in `android/app/build.gradle` before each release build.

## Roadmap
- Email/mobile OTP verification for family signup (fields already collected, currently
  unverified).
