# API Contracts - VocalFitness Backend

## Base URL
All API endpoints are prefixed with `/api`

---

## Real Data from www.vocalfitness.org

### Testimonials
1. **David Guido Pietroni** - Executive Producer, Tribeca Film (New York)
   - "Steve non è semplice un coach. Ti fa vivere un'esperienza artistica all'interno della didattica. Ci vorrebbe un po' più di Steve Dapper nelle aziende Italiane per essere più forti e competitivi sui mercati internazionali con il nostro Made in Italy."

2. **Guido Bernardinelli** - CEO, La Marzocco LLC (Seattle)
   - "His teachings are unprecedented and extremely functional not just at getting to quickly learn English but at becoming bilingual without even having to move to an English speaking country. Steve has also a very human approach that makes him a fun and an interesting individual to hangout with. We have used Steve services quite a lot at our company with satisfaction."

3. **Luca Rusconi** - CEO, La Rusconi S.p.A (Milan)
   - "Capace, diretto e sempre molto concentrato al raggiungimento dell'obiettivo. Fissane uno preciso e, con lui, lo raggiungerai bene e presto! Affidabile, unico e sempre molto attento a farti ben figurare...per ben figurare con lui."

4. **Gabriele Gresta** - Founder, Hyperloop TT (Los Angeles)
   - "Steve is an excellent professional and awesome human being! God gave Steve the rhythm, Steve did the rest..."

5. **Silvana Carcano** - Commissione Antimafia, Senato della Repubblica (Roma)
   - "Steve è una delle persone più dinamiche e innovative che io conosca. Una garanzia professionale!"

6. **Fabio Sormani** - CFO, Yamazaki Mazak (Milan)
   - "I rarely come across real talents who stand out like Steve! He's simply the best language specialist I've ever met."

### Corporate Clients/Logos
- Dell Technologies
- La Marzocco
- Yamazaki Mazak
- Tribeca Film
- Hyperloop TT
- Università E-Campus
- Education First (EF)
- MIUR (Ministero Università e Ricerca)
- Oxford University (Business Courses)

---

## 1. Testimonials API

### GET /api/testimonials
**Description:** Retrieve all testimonials

**Query Parameters:**
- `language`: Optional filter by language ("en" or "it")
- `featured`: Optional filter by featured status (true/false)

**Response:**
```json
{
  "testimonials": [
    {
      "id": "uuid-string",
      "text": "string",
      "author": "string",
      "role": "string",
      "company": "string",
      "location": "string",
      "language": "en | it",
      "featured": "boolean",
      "created_at": "ISO datetime string"
    }
  ]
}
```

**Status Codes:**
- 200: Success
- 500: Server error

---

### POST /api/testimonials
**Description:** Create a new testimonial (Admin functionality)

**Request Body:**
```json
{
  "text": "string (required)",
  "author": "string (required)",
  "role": "string (required)",
  "company": "string (optional)",
  "location": "string (optional)",
  "language": "en | it (default: en)",
  "featured": "boolean (default: false)"
}
```

**Response:**
```json
{
  "id": "uuid-string",
  "text": "string",
  "author": "string",
  "role": "string",
  "company": "string",
  "location": "string",
  "language": "en | it",
  "featured": "boolean",
  "created_at": "ISO datetime string"
}
```

**Status Codes:**
- 201: Created successfully
- 400: Validation error
- 500: Server error

---

## 2. Company Logos / Clients API

### GET /api/clients
**Description:** Retrieve all client companies

**Query Parameters:**
- `featured`: Optional filter by featured status (true/false)

**Response:**
```json
{
  "clients": [
    {
      "id": "uuid-string",
      "name": "string",
      "logo_url": "string",
      "website": "string",
      "sector": "string",
      "featured": "boolean",
      "created_at": "ISO datetime string"
    }
  ]
}
```

**Status Codes:**
- 200: Success
- 500: Server error

---

### POST /api/clients
**Description:** Add a new client company (Admin functionality)

**Request Body:**
```json
{
  "name": "string (required)",
  "logo_url": "string (required)",
  "website": "string (optional)",
  "sector": "string (optional)",
  "featured": "boolean (default: false)"
}
```

**Response:**
```json
{
  "id": "uuid-string",
  "name": "string",
  "logo_url": "string",
  "website": "string",
  "sector": "string",
  "featured": "boolean",
  "created_at": "ISO datetime string"
}
```

**Status Codes:**
- 201: Created successfully
- 400: Validation error
- 500: Server error

---

## 3. Contact Form API

### POST /api/contact
**Description:** Submit a contact form inquiry

**Request Body:**
```json
{
  "name": "string (required)",
  "email": "string (required, valid email)",
  "phone": "string (optional)",
  "company": "string (optional)",
  "message": "string (required)",
  "preferred_language": "en | it (optional)",
  "inquiry_type": "consultation | general | partnership (optional)"
}
```

**Response:**
```json
{
  "id": "uuid-string",
  "name": "string",
  "email": "string",
  "phone": "string",
  "company": "string",
  "message": "string",
  "preferred_language": "en | it",
  "inquiry_type": "string",
  "status": "pending",
  "created_at": "ISO datetime string",
  "email_sent": "boolean"
}
```

**Status Codes:**
- 201: Created and email sent successfully
- 400: Validation error
- 500: Server error

---

## 4. Newsletter Subscription API

### POST /api/newsletter/subscribe
**Description:** Subscribe to newsletter

**Request Body:**
```json
{
  "email": "string (required, valid email)",
  "name": "string (optional)",
  "language": "en | it (default: en)"
}
```

**Response:**
```json
{
  "id": "uuid-string",
  "email": "string",
  "name": "string",
  "language": "en | it",
  "subscribed": "boolean",
  "created_at": "ISO datetime string"
}
```

**Status Codes:**
- 201: Subscribed successfully
- 400: Validation error (e.g., already subscribed)
- 500: Server error

---

### DELETE /api/newsletter/unsubscribe
**Description:** Unsubscribe from newsletter

**Request Body:**
```json
{
  "email": "string (required)"
}
```

**Response:**
```json
{
  "message": "Successfully unsubscribed",
  "email": "string"
}
```

**Status Codes:**
- 200: Unsubscribed successfully
- 404: Email not found
- 500: Server error

---

## 5. Consultation Booking API

### POST /api/consultations/book
**Description:** Book a consultation appointment

**Request Body:**
```json
{
  "name": "string (required)",
  "email": "string (required, valid email)",
  "phone": "string (optional)",
  "company": "string (optional)",
  "preferred_date": "ISO date string (required)",
  "preferred_time": "HH:MM format (required)",
  "timezone": "string (required, e.g., 'Europe/Rome')",
  "consultation_type": "initial | follow-up | premium (default: initial)",
  "message": "string (optional)",
  "language": "en | it (default: en)"
}
```

**Response:**
```json
{
  "id": "uuid-string",
  "name": "string",
  "email": "string",
  "phone": "string",
  "company": "string",
  "preferred_date": "ISO date string",
  "preferred_time": "HH:MM",
  "timezone": "string",
  "consultation_type": "string",
  "message": "string",
  "language": "en | it",
  "status": "pending | confirmed | cancelled",
  "google_calendar_event_id": "string (optional)",
  "created_at": "ISO datetime string",
  "confirmed_at": "ISO datetime string (optional)"
}
```

**Status Codes:**
- 201: Booking created successfully
- 400: Validation error (e.g., invalid date/time, slot already taken)
- 500: Server error

---

### GET /api/consultations/availability
**Description:** Check available time slots for consultation booking

**Query Parameters:**
- `date`: ISO date string (required) - e.g., "2025-01-15"
- `timezone`: string (optional) - default: "Europe/Rome"

**Response:**
```json
{
  "date": "ISO date string",
  "timezone": "string",
  "available_slots": [
    {
      "time": "HH:MM",
      "available": "boolean"
    }
  ]
}
```

**Status Codes:**
- 200: Success
- 400: Invalid date format
- 500: Server error

---

### GET /api/consultations
**Description:** Get all consultation bookings (Admin functionality)

**Response:**
```json
{
  "consultations": [
    {
      "id": "uuid-string",
      "name": "string",
      "email": "string",
      "phone": "string",
      "company": "string",
      "preferred_date": "ISO date string",
      "preferred_time": "HH:MM",
      "timezone": "string",
      "consultation_type": "string",
      "message": "string",
      "language": "en | it",
      "status": "pending | confirmed | cancelled",
      "google_calendar_event_id": "string",
      "created_at": "ISO datetime string",
      "confirmed_at": "ISO datetime string"
    }
  ]
}
```

**Status Codes:**
- 200: Success
- 500: Server error

---

## Database Collections

### testimonials
```
{
  id: string (uuid),
  text: string,
  author: string,
  role: string,
  company: string,
  location: string,
  language: string,
  featured: boolean,
  created_at: string (ISO datetime)
}
```

### clients
```
{
  id: string (uuid),
  name: string,
  logo_url: string,
  website: string,
  sector: string,
  featured: boolean,
  created_at: string (ISO datetime)
}
```

### contacts
```
{
  id: string (uuid),
  name: string,
  email: string,
  phone: string,
  company: string,
  message: string,
  preferred_language: string,
  inquiry_type: string,
  status: string,
  created_at: string (ISO datetime),
  email_sent: boolean
}
```

### newsletter_subscribers
```
{
  id: string (uuid),
  email: string (unique),
  name: string,
  language: string,
  subscribed: boolean,
  created_at: string (ISO datetime),
  unsubscribed_at: string (ISO datetime, optional)
}
```

### consultations
```
{
  id: string (uuid),
  name: string,
  email: string,
  phone: string,
  company: string,
  preferred_date: string (ISO date),
  preferred_time: string (HH:MM),
  timezone: string,
  consultation_type: string,
  message: string,
  language: string,
  status: string,
  google_calendar_event_id: string,
  created_at: string (ISO datetime),
  confirmed_at: string (ISO datetime, optional)
}
```

---

## Error Response Format
All error responses follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

---

## Integration Notes

### Email Notifications (Custom SMTP)
- Contact form submissions trigger email to admin
- Consultation bookings send confirmation to user + notification to admin
- Newsletter subscriptions send welcome email

### Google Calendar Integration
- Consultation bookings automatically create Google Calendar events
- Calendar event ID stored in consultation record
- Used for managing appointments and avoiding double-bookings

### LLM Integration (Emergent LLM Key)
- Can be used for intelligent email response suggestions
- Potential use for chatbot or FAQ automation (future enhancement)

---

## Implementation Priority

**Phase 1 (Current):**
1. ✅ Testimonials API (GET, POST)
2. ✅ Clients API (GET, POST)
3. ✅ Seed database with real data from vocalfitness.org

**Phase 2:**
4. Contact Form API
5. Newsletter API
6. Custom SMTP email integration

**Phase 3:**
7. Consultation Booking API
8. Google Calendar integration
9. Availability checking logic

**Phase 4:**
10. Frontend integration (replace mock data)
11. Full E2E testing