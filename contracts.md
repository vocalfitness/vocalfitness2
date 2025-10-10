# VocalFitness Full-Stack Application - API Contracts

## Overview
Complete implementation of VocalFitness website with backend API integration, real testimonials, and corporate client data from www.vocalfitness.org.

## Frontend Updates Needed
### 1. Replace Mock Testimonials with Real Data
**Current Mock Data to Replace:**
- Generic testimonials in `mockData.testimonials`

**Real Testimonials from vocalfitness.org:**
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

### 2. Add Corporate Clients Section
**Major Companies/Logos:**
- Dell Technologies
- La Marzocco
- Yamazaki Mazak
- Tribeca Film
- Hyperloop TT
- Università E-Campus
- Education First (EF)
- MIUR (Ministero Università e Ricerca)
- Oxford University (Business Courses)

### 3. Add Pricing Information
**Real Pricing from Site:**
- Group Class: 389 CHF (14 lessons x 60')
- Individual Class: 1790 CHF (14 lessons x 60')

### 4. Add Business Courses
**Oxford University Business Courses:**
- Negotiating
- Presentations  
- Customer Care
- Telephoning
- Emails

### 5. Add Student Highlights
- Mario Santagostino (Global Executive Dell Technologies)
- Elisa Scheffler (actress, model, tv personality)
- Irene Cioni (ex velina, model, tv personality)

## Backend API Endpoints Needed

### 1. Contact & Consultation System
```
POST /api/consultations
- Book consultation requests
- Fields: name, email, phone, company, message, preferred_date, course_type

GET /api/consultations
- Admin view of consultation requests

POST /api/contact
- General contact form
- Fields: name, email, subject, message, contact_reason
```

### 2. Newsletter & Marketing
```
POST /api/newsletter
- Newsletter signup
- Fields: email, language_preference

POST /api/course-inquiry
- Course-specific inquiries
- Fields: name, email, course_type, level, format (group/individual)
```

### 3. Testimonials Management
```
GET /api/testimonials
- Fetch real testimonials data
- Support for language filtering (IT/EN)

POST /api/testimonials (Admin only)
- Add new testimonials
```

### 4. Courses & Pricing
```
GET /api/courses
- List all available courses with pricing

GET /api/courses/:id
- Detailed course information
```

### 5. Analytics & Tracking
```
POST /api/analytics/page-view
- Track page views and user engagement

POST /api/analytics/consultation-interest
- Track consultation button clicks and user interest
```

## Database Schema

### Collections Needed:
1. **consultations** - Consultation booking requests
2. **contacts** - General contact form submissions
3. **newsletter_subscribers** - Email list management
4. **testimonials** - Real client testimonials
5. **courses** - Course catalog with pricing
6. **analytics** - User engagement tracking

## Integration Points

### Frontend → Backend Integration:
1. Replace all mock testimonials with API calls to `/api/testimonials`
2. All contact forms connect to respective endpoints
3. Consultation booking system with real database storage
4. Newsletter signup functionality
5. Course inquiry system

### Email Integration:
- Consultation requests trigger email notifications
- Welcome emails for newsletter signups
- Confirmation emails for course inquiries

### Third-Party Services:
- Email service (SendGrid/Mailgun) for transactional emails
- WhatsApp integration (+39 351 576 5749) for immediate contact
- Instagram integration (@stevedapper, @chillhouseita)

## Implementation Priority:
1. ✅ Real testimonials integration (HIGH)
2. ✅ Consultation booking system (HIGH) 
3. ✅ Contact forms backend (HIGH)
4. ✅ Newsletter system (MEDIUM)
5. ✅ Course catalog API (MEDIUM)
6. ✅ Analytics tracking (LOW)
7. ✅ Email notifications (MEDIUM)

## Testing Requirements:
- Backend API testing with all endpoints
- Frontend integration testing
- Email functionality testing
- Mobile responsiveness testing
- Form validation testing
- Real data flow testing (consultation → email → confirmation)