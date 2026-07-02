"""Public marketing lead-form endpoints.

Three high-value entry points from the marketing site:

* ``POST /contact``          — general contact form
* ``POST /booking``          — free assessment booking + onboarding wizard
                                (auto-creates a member account + magic-link email
                                for the ``onboarding_wizard`` source)
* ``POST /corporate-quote``  — B2B quote request

All three send a rich HTML Zoho SMTP notification to ``admissions@vocalfitness.org``
and persist the submission to the respective collection (``contacts`` /
``bookings`` / ``corporate_quotes``).

Auth-related callables (``get_password_hash``, ``create_access_token``) are
injected via the factory so this router stays free of ``server.py``.
"""

from __future__ import annotations

import logging
import os
import smtplib
import uuid
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Callable, List

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# Models
# --------------------------------------------------------------------------- #
class ContactFormSubmission(BaseModel):
    name: str
    email: str
    phone: str
    message: str = ""
    discount: str = ""
    language: str = "en"


class ContactFormResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str
    message: str = ""
    discount: str = ""
    language: str = "en"
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    email_sent: bool = False


class BookingFormSubmission(BaseModel):
    name: str
    email: str
    phone: str
    sector: str
    englishLevel: str = ""
    age: str
    preferredDay: str
    preferredTime: str
    message: str = ""
    type: str = "booking"
    language: str = "en"
    role: str = ""
    nativeLanguage: str = ""
    motivation: str = ""
    source: str = "booking_form"


class BookingFormResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str
    sector: str
    englishLevel: str = ""
    age: str
    preferredDay: str
    preferredTime: str
    message: str = ""
    type: str = "booking"
    language: str = "en"
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    email_sent: bool = False
    role: str = ""
    nativeLanguage: str = ""
    motivation: str = ""
    source: str = "booking_form"


class CorporateQuoteRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    companyName: str
    industry: str = ""
    numberOfEmployees: str
    contactName: str
    contactEmail: str
    contactPhone: str = ""
    levelsToTrain: List[str]
    budget: str = ""
    preferredMode: str
    location: str = ""
    notes: str = ""
    language: str = "it"


class CorporateQuoteResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    companyName: str
    contactEmail: str
    email_sent: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# --------------------------------------------------------------------------- #
# Router factory
# --------------------------------------------------------------------------- #
def build_leads_forms_router(
    db,
    get_password_hash: Callable[[str], str],
    create_access_token: Callable,
) -> APIRouter:
    router = APIRouter()


    @router.post("/contact", response_model=ContactFormResponse, status_code=201)
    async def submit_contact_form(input: ContactFormSubmission):
        """Submit contact form and send email notification"""

        contact = ContactFormResponse(**input.model_dump())

        # Send email notification
        email_sent = False
        try:
            # Email configuration
            smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
            smtp_port = int(os.environ.get('SMTP_PORT', '587'))
            smtp_user = os.environ.get('SMTP_USER', 'admissions@vocalfitness.org')
            smtp_password = os.environ.get('SMTP_PASSWORD', '')

            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"Nuova Richiesta Contatto - {input.name}" if input.language == 'it' else f"New Contact Request - {input.name}"
            msg['From'] = smtp_user
            msg['To'] = 'admissions@vocalfitness.org'

            # Email body
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
                        {"Nuova Richiesta di Contatto" if input.language == 'it' else "New Contact Request"}
                    </h2>

                    <div style="margin: 20px 0;">
                        <p><strong>Nome:</strong> {input.name}</p>
                        <p><strong>Email:</strong> <a href="mailto:{input.email}">{input.email}</a></p>
                        <p><strong>Telefono:</strong> <a href="tel:{input.phone}">{input.phone}</a></p>
                        {f'<p><strong>Sconto Richiesto:</strong> <span style="color: #059669; font-weight: bold;">{input.discount}</span></p>' if input.discount else ''}
                        {f'<p><strong>Messaggio:</strong><br/>{input.message}</p>' if input.message else ''}
                    </div>

                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                        <p>Ricevuto il: {datetime.now(timezone.utc).strftime('%d/%m/%Y alle %H:%M')} UTC</p>
                    </div>
                </div>
            </body>
            </html>
            """

            part = MIMEText(html_body, 'html')
            msg.attach(part)

            # Send email if SMTP is configured
            if smtp_password:
                with smtplib.SMTP(smtp_server, smtp_port) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.send_message(msg)
                email_sent = True
            else:
                print("SMTP not configured - Email would be sent in production")
                email_sent = False  # Set to False in development

        except Exception as e:
            print(f"Error sending email: {e}")
            email_sent = False

        contact.email_sent = email_sent

        # Save to database
        doc = contact.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()

        await db.contacts.insert_one(doc)

        return contact

    # Booking Form Endpoint
    @router.post("/booking", response_model=BookingFormResponse, status_code=201)
    async def submit_booking_form(input: BookingFormSubmission):
        """Submit booking form for free assessment and send email notification"""

        booking = BookingFormResponse(**input.model_dump())

        # Send email notification
        email_sent = False
        try:
            # Email configuration
            smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
            smtp_port = int(os.environ.get('SMTP_PORT', '587'))
            smtp_user = os.environ.get('SMTP_USER', 'admissions@vocalfitness.org')
            smtp_password = os.environ.get('SMTP_PASSWORD', '')

            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"Nuova Richiesta Valutazione Gratuita - {input.name}" if input.language == 'it' else f"New Free Assessment Request - {input.name}"
            msg['From'] = smtp_user
            msg['To'] = 'admissions@vocalfitness.org'

            # Translate sector names
            sector_labels = {
                'technology': 'Tecnologia' if input.language == 'it' else 'Technology',
                'finance': 'Finanza' if input.language == 'it' else 'Finance',
                'healthcare': 'Sanità' if input.language == 'it' else 'Healthcare',
                'pharmaceutical': 'Farmaceutico' if input.language == 'it' else 'Pharmaceutical',
                'engineering': 'Ingegneria' if input.language == 'it' else 'Engineering',
                'legal': 'Legale' if input.language == 'it' else 'Legal',
                'marketing': 'Marketing/Sales',
                'entertainment': 'Entertainment',
                'hospitality': 'Hospitality',
                'education': 'Educazione' if input.language == 'it' else 'Education',
                'consulting': 'Consulting',
                'other': 'Altro' if input.language == 'it' else 'Other'
            }

            sector_label = sector_labels.get(input.sector, input.sector)

            # Translate day names
            day_labels = {
                'monday': 'Lunedì' if input.language == 'it' else 'Monday',
                'tuesday': 'Martedì' if input.language == 'it' else 'Tuesday',
                'wednesday': 'Mercoledì' if input.language == 'it' else 'Wednesday',
                'thursday': 'Giovedì' if input.language == 'it' else 'Thursday',
                'friday': 'Venerdì' if input.language == 'it' else 'Friday',
                'saturday': 'Sabato' if input.language == 'it' else 'Saturday'
            }

            day_label = day_labels.get(input.preferredDay, input.preferredDay)

            # Email body
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 700px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
                        {"🎯 Nuova Richiesta Valutazione Gratuita" if input.language == 'it' else "🎯 New Free Assessment Request"}
                    </h2>

                    <div style="margin: 20px 0; background-color: #f8fafc; padding: 15px; border-radius: 8px;">
                        <h3 style="color: #0284c7; margin-top: 0;">{"Informazioni Personali" if input.language == 'it' else "Personal Information"}</h3>
                        <p><strong>{"Nome" if input.language == 'it' else "Name"}:</strong> {input.name}</p>
                        <p><strong>Email:</strong> <a href="mailto:{input.email}">{input.email}</a></p>
                        <p><strong>{"Telefono" if input.language == 'it' else "Phone"}:</strong> <a href="tel:{input.phone}">{input.phone}</a></p>
                        <p><strong>{"Età" if input.language == 'it' else "Age"}:</strong> {input.age} {"anni" if input.language == 'it' else "years"}</p>
                    </div>

                    <div style="margin: 20px 0; background-color: #fefce8; padding: 15px; border-radius: 8px;">
                        <h3 style="color: #ca8a04; margin-top: 0;">{"Informazioni Professionali" if input.language == 'it' else "Professional Information"}</h3>
                        <p><strong>{"Settore" if input.language == 'it' else "Sector"}:</strong> <span style="color: #2563eb; font-weight: bold;">{sector_label}</span></p>
                        {f'<p><strong>{"Livello Inglese Attuale" if input.language == "it" else "Current English Level"}:</strong> <span style="color: #059669; font-weight: bold;">{input.englishLevel}</span></p>' if input.englishLevel else ''}
                    </div>

                    <div style="margin: 20px 0; background-color: #f0fdf4; padding: 15px; border-radius: 8px;">
                        <h3 style="color: #059669; margin-top: 0;">{"Preferenze per il Contatto" if input.language == 'it' else "Contact Preferences"}</h3>
                        <p><strong>{"Giorno Preferito" if input.language == 'it' else "Preferred Day"}:</strong> <span style="color: #0284c7; font-weight: bold;">{day_label}</span></p>
                        <p><strong>{"Orario Preferito" if input.language == 'it' else "Preferred Time"}:</strong> <span style="color: #0284c7; font-weight: bold;">{input.preferredTime}</span></p>
                    </div>

                    {f'''<div style="margin: 20px 0; background-color: #fef3c7; padding: 15px; border-radius: 8px;">
                        <h3 style="color: #ca8a04; margin-top: 0;">{"Note Aggiuntive" if input.language == "it" else "Additional Notes"}</h3>
                        <p>{input.message}</p>
                    </div>''' if input.message else ''}

                    <div style="margin-top: 30px; padding: 20px; background-color: #dbeafe; border-radius: 8px; border-left: 4px solid #2563eb;">
                        <p style="margin: 0; color: #1e40af; font-weight: bold;">
                            {"⚡ Azione Richiesta: Contattare il candidato entro 24 ore" if input.language == 'it' else "⚡ Action Required: Contact candidate within 24 hours"}
                        </p>
                    </div>

                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                        <p>{"Ricevuto il" if input.language == 'it' else "Received on"}: {datetime.now(timezone.utc).strftime('%d/%m/%Y alle %H:%M' if input.language == 'it' else '%d/%m/%Y at %H:%M')} UTC</p>
                    </div>
                </div>
            </body>
            </html>
            """

            part = MIMEText(html_body, 'html')
            msg.attach(part)

            # Send email if SMTP is configured
            if smtp_password:
                with smtplib.SMTP(smtp_server, smtp_port) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.send_message(msg)
                email_sent = True
            else:
                print("SMTP not configured - Email would be sent in production")
                email_sent = False

        except Exception as e:
            print(f"Error sending booking email: {e}")
            email_sent = False

        booking.email_sent = email_sent

        # Save to database
        doc = booking.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()

        await db.bookings.insert_one(doc)

        # ===== Magic-link auto-registration (only for onboarding wizard submissions) =====
        magic_link_sent = False
        if input.source == 'onboarding_wizard' and input.email:
            try:
                existing_user = await db.users.find_one({"email": input.email})
                user_doc = existing_user
                if not existing_user:
                    # Auto-create a member account based on the lead profile
                    username_base = input.email.split('@')[0].lower().replace('.', '').replace('+', '')[:20] or f"user{uuid.uuid4().hex[:6]}"
                    username = username_base
                    # Avoid collision
                    suffix = 0
                    while await db.users.find_one({"username": username}):
                        suffix += 1
                        username = f"{username_base}{suffix}"
                    random_password = uuid.uuid4().hex
                    user_doc = {
                        "id": str(uuid.uuid4()),
                        "username": username,
                        "email": input.email,
                        "full_name": input.name,
                        "phone": input.phone,
                        "hashed_password": get_password_hash(random_password),
                        "is_admin": False,
                        "user_type": "individual",
                        "role": "client",
                        "is_active": True,
                        "english_level": input.englishLevel or "",
                        "sector": input.sector or "",
                        "native_language": input.nativeLanguage or "",
                        "professional_role": input.role or "",
                        "lead_id": doc['id'],
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }
                    await db.users.insert_one(user_doc)

                # Issue 24h magic-link token
                magic_token = create_access_token(
                    {"sub": user_doc["username"], "magic": True},
                    expires_delta=timedelta(hours=24)
                )
                frontend_base = os.environ.get('FRONTEND_URL', 'https://vocalfitness.org').rstrip('/')
                magic_link = f"{frontend_base}/login?magic={magic_token}"

                # Send magic-link email via existing Zoho SMTP
                smtp_server = os.environ.get('SMTP_SERVER', 'smtp.zoho.eu')
                smtp_port = int(os.environ.get('SMTP_PORT', 587))
                smtp_user = os.environ.get('SMTP_USER')
                smtp_password = os.environ.get('SMTP_PASSWORD')

                if smtp_password:
                    lang = input.language or 'en'
                    if lang == 'it':
                        subj = "Benvenuto in VocalFitness — Accesso alla tua Area Clienti"
                        greet = f"Ciao {input.name},"
                        intro = "Grazie per aver completato l'onboarding di VocalFitness. La tua valutazione diagnostica è in fase di pianificazione."
                        cta = "Accedi alla tua Area Clienti"
                        note = "Il link è valido 24 ore. Se non hai richiesto l'accesso, ignora questa email."
                    else:
                        subj = "Welcome to VocalFitness — Access your Members Area"
                        greet = f"Hi {input.name},"
                        intro = "Thank you for completing the VocalFitness onboarding. Your diagnostic assessment is being scheduled."
                        cta = "Access your Members Area"
                        note = "This link is valid for 24 hours. If you did not request access, please ignore this email."

                    magic_msg = MIMEMultipart('alternative')
                    magic_msg['Subject'] = subj
                    magic_msg['From'] = smtp_user
                    magic_msg['To'] = input.email
                    html = f"""
                    <html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#f8fafc;padding:20px;">
                      <div style="max-width:560px;margin:0 auto;background:white;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
                        <div style="background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%);padding:32px;text-align:center;">
                          <h1 style="color:white;margin:0;font-size:24px;font-weight:900;letter-spacing:-0.02em;">VocalFitness</h1>
                        </div>
                        <div style="padding:32px;color:#334155;">
                          <p style="font-size:16px;margin:0 0 16px;">{greet}</p>
                          <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">{intro}</p>
                          <div style="text-align:center;margin:32px 0;">
                            <a href="{magic_link}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;letter-spacing:0.02em;">{cta}</a>
                          </div>
                          <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0;">{note}</p>
                          <p style="font-size:12px;color:#94a3b8;word-break:break-all;margin:16px 0 0;">{magic_link}</p>
                        </div>
                      </div>
                    </body></html>
                    """
                    magic_msg.attach(MIMEText(html, 'html'))
                    with smtplib.SMTP(smtp_server, smtp_port) as srv:
                        srv.starttls()
                        srv.login(smtp_user, smtp_password)
                        srv.send_message(magic_msg)
                    magic_link_sent = True
            except Exception as e:
                logger.warning(f"Magic link onboarding flow failed: {e}")

        # Attach magic flag (response model ignores it but useful for logs)
        if magic_link_sent:
            logger.info(f"Magic-link email sent to {input.email}")
        return booking

    @router.post("/corporate-quote", response_model=CorporateQuoteResponse, status_code=201)
    async def submit_corporate_quote(input: CorporateQuoteRequest):
        quote_id = str(uuid.uuid4())
        email_sent = False


        # SMTP Configuration
        smtp_server = os.environ.get('SMTP_SERVER', 'smtp.zoho.eu')
        smtp_port = int(os.environ.get('SMTP_PORT', 587))
        smtp_user = os.environ.get('SMTP_USER')
        smtp_password = os.environ.get('SMTP_PASSWORD')

        # Send email notification
        if smtp_password:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"🏢 Nuova Richiesta Corporate: {input.companyName}" if input.language == 'it' else f"🏢 New Corporate Request: {input.companyName}"
            msg['From'] = smtp_user
            msg['To'] = smtp_user  # Send to admissions

            levels_labels = {
                'entry': 'Entry-level',
                'middle': 'Middle Management',
                'senior': 'Senior Leadership',
                'all': 'Tutti i livelli' if input.language == 'it' else 'All levels'
            }
            levels_str = ', '.join([levels_labels.get(level, level) for level in input.levelsToTrain])

            html_body = f"""
            <html>
            <head>
                <style>
                    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }}
                    .content {{ background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }}
                    .section {{ margin: 20px 0; padding: 15px; background-color: #f9fafb; border-radius: 8px; }}
                    .label {{ font-weight: bold; color: #374151; }}
                    .value {{ color: #059669; font-weight: bold; }}
                    .priority {{ background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 8px; margin-top: 20px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="color: white; margin: 0; font-size: 28px;">🏢 VocalFitness Corporate</h1>
                        <p style="color: #dbeafe; margin: 10px 0 0 0;">{"Nuova Richiesta di Preventivo" if input.language == 'it' else "New Quote Request"}</p>
                    </div>

                    <div class="content">
                        <div class="section">
                            <h2 style="color: #2563eb; margin-top: 0;">{"Informazioni Azienda" if input.language == 'it' else "Company Information"}</h2>
                            <p><span class="label">{"Ragione Sociale" if input.language == 'it' else "Company Name"}:</span> <span class="value">{input.companyName}</span></p>
                            {f'<p><span class="label">{"Settore" if input.language == "it" else "Industry"}:</span> <span class="value">{input.industry}</span></p>' if input.industry else ''}
                            <p><span class="label">{"Numero Dipendenti" if input.language == 'it' else "Number of Employees"}:</span> <span class="value">{input.numberOfEmployees}</span></p>
                            {f'<p><span class="label">{"Sede/Location" if input.language == "it" else "Location"}:</span> <span class="value">{input.location}</span></p>' if input.location else ''}
                        </div>

                        <div class="section" style="background-color: #eff6ff;">
                            <h2 style="color: #2563eb; margin-top: 0;">{"Referente" if input.language == 'it' else "Contact Person"}</h2>
                            <p><span class="label">{"Nome" if input.language == 'it' else "Name"}:</span> <span class="value">{input.contactName}</span></p>
                            <p><span class="label">Email:</span> <span class="value">{input.contactEmail}</span></p>
                            {f'<p><span class="label">{"Telefono" if input.language == "it" else "Phone"}:</span> <span class="value">{input.contactPhone}</span></p>' if input.contactPhone else ''}
                        </div>

                        <div class="section" style="background-color: #f0fdf4;">
                            <h2 style="color: #059669; margin-top: 0;">{"Necessità Formative" if input.language == 'it' else "Training Needs"}</h2>
                            <p><span class="label">{"Livelli da Formare" if input.language == 'it' else "Levels to Train"}:</span> <span class="value">{levels_str}</span></p>
                            <p><span class="label">{"Modalità Preferita" if input.language == 'it' else "Preferred Mode"}:</span> <span class="value">{input.preferredMode}</span></p>
                            {f'<p><span class="label">{"Budget Indicativo" if input.language == "it" else "Indicative Budget"}:</span> <span class="value">{input.budget}</span></p>' if input.budget else ''}
                        </div>

                        {f'''<div class="section" style="background-color: #fef3c7;">
                            <h2 style="color: #ca8a04; margin-top: 0;">{"Note Aggiuntive" if input.language == "it" else "Additional Notes"}</h2>
                            <p>{input.notes}</p>
                        </div>''' if input.notes else ''}

                        <div class="priority">
                            <p style="margin: 0; color: #991b1b; font-weight: bold;">
                                ⚡ {"PRIORITÀ ALTA: Rispondere entro 48 ore con preventivo personalizzato" if input.language == 'it' else "HIGH PRIORITY: Respond within 48 hours with personalized quote"}
                            </p>
                        </div>

                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                            <p>{"Ricevuto il" if input.language == 'it' else "Received on"}: {datetime.now(timezone.utc).strftime('%d/%m/%Y alle %H:%M' if input.language == 'it' else '%d/%m/%Y at %H:%M')} UTC</p>
                            <p>Request ID: {quote_id}</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """

            part = MIMEText(html_body, 'html')
            msg.attach(part)

            try:
                with smtplib.SMTP(smtp_server, smtp_port) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.send_message(msg)
                email_sent = True
            except Exception as e:
                print(f"Error sending corporate quote email: {e}")
                email_sent = False

        # Save to database
        quote_data = {
            'id': quote_id,
            'companyName': input.companyName,
            'industry': input.industry,
            'numberOfEmployees': input.numberOfEmployees,
            'contactName': input.contactName,
            'contactEmail': input.contactEmail,
            'contactPhone': input.contactPhone,
            'levelsToTrain': input.levelsToTrain,
            'budget': input.budget,
            'preferredMode': input.preferredMode,
            'location': input.location,
            'notes': input.notes,
            'language': input.language,
            'email_sent': email_sent,
            'created_at': datetime.now(timezone.utc).isoformat()
        }

        await db.corporate_quotes.insert_one(quote_data)

        return CorporateQuoteResponse(
            id=quote_id,
            companyName=input.companyName,
            contactEmail=input.contactEmail,
            email_sent=email_sent,
            created_at=datetime.now(timezone.utc)
        )

    return router
