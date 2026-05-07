# Test Credentials — VocalFitness Platform

## Admin Account
- **Username**: `admin`
- **Password**: `VocalFitness2026!`
- **Login URL**: `/login`
- **Access**: full admin panel (CRM, messages, bookings, popup management)

## Client Account (test client)
- **Username**: `mario.rossi`
- **Password**: `password`
- **Login URL**: `/login`
- **Access**: Members Area / client chat with admin

## Backend
- MongoDB: local, configured via `MONGO_URL` and `DB_NAME` in `/app/backend/.env`
- API base URL: read from `REACT_APP_BACKEND_URL` in `/app/frontend/.env`

## Notes
- Onboarding Wizard (iteration 11) submits to `POST /api/booking` and stores extra structured fields:
  `role`, `nativeLanguage`, `motivation`, `source` ("onboarding_wizard" | "booking_form").
- Backward compatible: legacy `BookingFormModal` payload still works without those fields (defaults to empty + source="booking_form").
