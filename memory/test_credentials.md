# Test Credentials — VocalFitness Platform

## Admin Account (PREVIEW)
- **Username**: `admin`
- **Password**: `VocalFitness2026!`
- **Login URL**: `/login`
- **Access**: full admin panel (CRM, messages, bookings, popup management)

## Client Account (test client)
- **Username**: `mario.rossi`
- **Password**: `VocalTest2026!`
- **Login URL**: `/login`
- **Access**: Members Area / client chat with admin
- **Role**: `client`

## Backend Environment Variables (PREVIEW `/app/backend/.env`)
- `MONGO_URL`, `DB_NAME` (protected, do not modify)
- `FRONTEND_URL=https://vocalfitness.org`
- `SMTP_*` (Zoho)
- `ADMIN_USERNAME=admin`
- `ADMIN_PASSWORD=VocalFitness2026!` — used by idempotent `seed_admin()` at backend startup
- `ADMIN_EMAIL=admissions@vocalfitness.org`
- `JWT_SECRET_KEY=...` — DO NOT rotate (would invalidate all sessions)

## Auth architecture notes (after 05/06/2026)
- `seed_admin()` runs at FastAPI startup (`/app/backend/server.py`). It is **idempotent**:
  - If admin row missing → creates it using `ADMIN_PASSWORD` env.
  - If admin row exists and password hash matches → no-op.
  - If env password rotated → refreshes the hash to the new env value.
  - If `ADMIN_PASSWORD` env unset → entire seed is skipped (no auto admin).
  - Never touches non-admin users.
- Tests: `/app/backend/tests/test_seed_admin.py` (5 tests).

## PRODUCTION recovery procedure (vocalfitness.org)
If admin/client login stops working in production:
1. Set in Emergent production env vars:
   - `ADMIN_USERNAME=admin`
   - `ADMIN_PASSWORD=<desired-admin-password>`
   - `ADMIN_EMAIL=admissions@vocalfitness.org`
   - `JWT_SECRET_KEY=<random-long-string-NEVER-rotate-after-first-set>`
2. Redeploy.
3. Backend startup will refresh the admin hash to match the env. Login with the env password.
4. Re-create lost client accounts from the admin panel (clients are NOT auto-seeded by design).

## Notes
- Onboarding Wizard (iteration 11) submits to `POST /api/booking` and stores extra structured fields:
  `role`, `nativeLanguage`, `motivation`, `source` ("onboarding_wizard" | "booking_form").
- Backward compatible: legacy `BookingFormModal` payload still works without those fields.
- Admin messages chat (since 05/06/2026) accepts `content_html` (rich text from TipTap editor)
  alongside legacy `content` plain text. Email notifications render HTML when available,
  fallback to escaped plain text + nl2br.
