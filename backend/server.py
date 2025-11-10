from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Testimonials Models
class TestimonialCreate(BaseModel):
    text: str
    author: str
    role: str
    company: str = ""
    location: str = ""
    language: str = "en"
    featured: bool = False

class Testimonial(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    author: str
    role: str
    company: str = ""
    location: str = ""
    language: str = "en"
    featured: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Clients Models
class ClientCreate(BaseModel):
    name: str
    logo_url: str
    website: str = ""
    sector: str = ""
    featured: bool = False

class Client(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    logo_url: str
    website: str = ""
    sector: str = ""
    featured: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Contact Form Models
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

# Booking Form Models
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

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Testimonials Endpoints
@api_router.get("/testimonials")
async def get_testimonials(language: str = None, featured: bool = None):
    """Get all testimonials with optional language and featured filters"""
    query = {}
    if language:
        query['language'] = language
    if featured is not None:
        query['featured'] = featured
    
    testimonials = await db.testimonials.find(query, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for testimonial in testimonials:
        if isinstance(testimonial.get('created_at'), str):
            testimonial['created_at'] = datetime.fromisoformat(testimonial['created_at'])
    
    return {"testimonials": testimonials}

@api_router.post("/testimonials", response_model=Testimonial, status_code=201)
async def create_testimonial(input: TestimonialCreate):
    """Create a new testimonial"""
    testimonial = Testimonial(**input.model_dump())
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = testimonial.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.testimonials.insert_one(doc)
    return testimonial

# Clients Endpoints
@api_router.get("/clients")
async def get_clients(featured: bool = None):
    """Get all client companies with optional featured filter"""
    query = {}
    if featured is not None:
        query['featured'] = featured
    
    clients = await db.clients.find(query, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for client in clients:
        if isinstance(client.get('created_at'), str):
            client['created_at'] = datetime.fromisoformat(client['created_at'])
    
    return {"clients": clients}

@api_router.post("/clients", response_model=Client, status_code=201)
async def create_client(input: ClientCreate):
    """Create a new client company"""
    client = Client(**input.model_dump())
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = client.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.clients.insert_one(doc)
    return client

# Contact Form Endpoint
@api_router.post("/contact", response_model=ContactFormResponse, status_code=201)
async def submit_contact_form(input: ContactFormSubmission):
    """Submit contact form and send email notification"""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
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
@api_router.post("/booking", response_model=BookingFormResponse, status_code=201)
async def submit_booking_form(input: BookingFormSubmission):
    """Submit booking form for free assessment and send email notification"""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
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
    
    return booking

# Corporate Quote Models
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

# Corporate Quote Endpoint
@api_router.post("/corporate-quote", response_model=CorporateQuoteResponse, status_code=201)
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

# AI Chatbot Models
class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    session_id: str
    message: str
    language: str = "it"

class ChatResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    session_id: str
    message: str
    is_complete: bool = False
    collected_data: dict = {}

class LeadData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    name: str = ""
    email: str = ""
    english_level: str = ""
    goal: str = ""
    urgency: str = ""
    language: str = "it"
    conversation_history: List[dict] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: datetime = None

# AI Chatbot Endpoint
@api_router.post("/chat", response_model=ChatResponse)
async def chat_with_alice(input: ChatRequest):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    # Get or create lead data from DB
    lead = await db.leads.find_one({"session_id": input.session_id})
    
    if not lead:
        lead = {
            "id": str(uuid.uuid4()),
            "session_id": input.session_id,
            "name": "",
            "email": "",
            "english_level": "",
            "goal": "",
            "urgency": "",
            "language": input.language,
            "conversation_history": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None
        }
        await db.leads.insert_one(lead)
    
    # Add user message to history
    lead["conversation_history"].append({
        "role": "user",
        "content": input.message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    # Create system message based on language and conversation state
    system_message = ""
    if input.language == "it":
        system_message = f"""Sei Alice, l'assistente virtuale di VocalFitness. Sei cordiale, professionale e NON invasiva.

STATO ATTUALE DATI:
- Nome: {lead.get('name') or 'NON RACCOLTO'}
- Email: {lead.get('email') or 'NON RACCOLTO'}
- Livello inglese: {lead.get('english_level') or 'NON RACCOLTO'}
- Obiettivo: {lead.get('goal') or 'NON RACCOLTO'}
- Urgenza: {lead.get('urgency') or 'NON RACCOLTO'}

REGOLE CRITICHE:
1. Se l'utente dice "no", "non voglio", "preferisco parlare con qualcuno", o è ESITANTE → NON insistere!
2. Offri SUBITO il contatto WhatsApp con questo messaggio:
   "Capisco perfettamente! Non c'è problema. Ti metto subito in contatto con Alice, l'assistente personale del Professor Dapper, via WhatsApp. Potrai parlare direttamente con lei e fare tutte le domande che vuoi! 📱"
   
3. Se l'utente risponde positivamente, raccogli i dati in questo ordine:
   - Nome completo (se non hai già)
   - Email (se non hai già)
   - Livello inglese (se non hai già)
   - Obiettivo (se non hai già)
   - Urgenza (se non hai già)

4. Fai UNA SOLA domanda per volta
5. NON ripetere domande per dati già raccolti
6. Se hai raccolto anche solo NOME ed EMAIL, puoi già offrire WhatsApp
7. Sii conversazionale, NON interrogatorio

IMPORTANTE: Se percepisci esitazione o resistenza, passa SUBITO al messaggio WhatsApp sopra indicato."""
    else:
        system_message = f"""You are Alice, the VocalFitness virtual assistant. You are friendly, professional, and NOT pushy.

CURRENT DATA STATUS:
- Name: {lead.get('name') or 'NOT COLLECTED'}
- Email: {lead.get('email') or 'NOT COLLECTED'}
- English level: {lead.get('english_level') or 'NOT COLLECTED'}
- Goal: {lead.get('goal') or 'NOT COLLECTED'}
- Urgency: {lead.get('urgency') or 'NOT COLLECTED'}

CRITICAL RULES:
1. If user says "no", "I don't want to", "I prefer to talk to someone", or is HESITANT → DON'T insist!
2. Offer WhatsApp contact IMMEDIATELY with this message:
   "I completely understand! No problem at all. I'll connect you right away with Alice, Professor Dapper's personal assistant, via WhatsApp. You can talk directly with her and ask any questions you have! 📱"
   
3. If user responds positively, collect data in this order:
   - Full name (if you don't have it)
   - Email (if you don't have it)
   - English level (if you don't have it)
   - Goal (if you don't have it)
   - Urgency (if you don't have it)

4. Ask ONE question at a time
5. DON'T repeat questions for data already collected
6. If you have even just NAME and EMAIL, you can already offer WhatsApp
7. Be conversational, NOT interrogative

IMPORTANT: If you sense hesitation or resistance, switch IMMEDIATELY to the WhatsApp message above."""
    
    # Initialize AI chat
    emergent_key = os.environ.get('EMERGENT_LLM_KEY')
    chat = LlmChat(
        api_key=emergent_key,
        session_id=input.session_id,
        system_message=system_message
    )
    
    # Use GPT-4o-mini (default, cost-effective)
    chat.with_model("openai", "gpt-4o-mini")
    
    # Send user message
    user_msg = UserMessage(text=input.message)
    ai_response = await chat.send_message(user_msg)
    
    # Add AI response to history
    lead["conversation_history"].append({
        "role": "assistant",
        "content": ai_response,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    # Use AI to extract structured data from the user's message
    extraction_prompt = f"""Analyze this user message and extract information if present. Return ONLY the values found, or "NOT_FOUND" if not present.

User message: "{input.message}"
Previous AI question: "{lead["conversation_history"][-2]["content"] if len(lead["conversation_history"]) >= 2 else ""}"

Extract and return in this EXACT format (one per line):
NAME: [full name if this looks like a name response, otherwise NOT_FOUND]
EMAIL: [email address if present, otherwise NOT_FOUND]
ENGLISH_LEVEL: [level if mentioned (A1,A2,B1,B2,C1,C2,beginner,intermediate,advanced), otherwise NOT_FOUND]
GOAL: [goal/objective if mentioned, otherwise NOT_FOUND]
URGENCY: [timeframe if mentioned (immediately, within 1 month, etc), otherwise NOT_FOUND]

Rules:
- If the AI just asked for name and user gave a short text (2-4 words, no @), it's likely a NAME
- Look for @ and . together for EMAIL
- Look for level keywords for ENGLISH_LEVEL
- Be smart: if AI asked "quando vuoi iniziare" and user says "subito", that's URGENCY
- Return NOT_FOUND if genuinely not present"""

    # Quick extraction using AI
    try:
        extraction_chat = LlmChat(
            api_key=emergent_key,
            session_id=f"{input.session_id}_extract",
            system_message="You are a data extraction assistant. Extract information precisely as requested."
        )
        extraction_chat.with_model("openai", "gpt-4o-mini")
        extraction_result = await extraction_chat.send_message(UserMessage(text=extraction_prompt))
        
        # Parse extraction result
        import re
        name_match = re.search(r'NAME:\s*(.+)', extraction_result)
        email_match = re.search(r'EMAIL:\s*(.+)', extraction_result)
        level_match = re.search(r'ENGLISH_LEVEL:\s*(.+)', extraction_result)
        goal_match = re.search(r'GOAL:\s*(.+)', extraction_result)
        urgency_match = re.search(r'URGENCY:\s*(.+)', extraction_result)
        
        # Update lead data only if not already collected and extraction found something valid
        if name_match and not lead.get('name'):
            extracted_name = name_match.group(1).strip()
            if extracted_name != "NOT_FOUND" and len(extracted_name) > 0:
                lead['name'] = extracted_name
        
        if email_match and not lead.get('email'):
            extracted_email = email_match.group(1).strip()
            if extracted_email != "NOT_FOUND" and '@' in extracted_email:
                lead['email'] = extracted_email
        
        if level_match and not lead.get('english_level'):
            extracted_level = level_match.group(1).strip()
            if extracted_level != "NOT_FOUND" and len(extracted_level) > 0:
                lead['english_level'] = extracted_level
        
        if goal_match and not lead.get('goal'):
            extracted_goal = goal_match.group(1).strip()
            if extracted_goal != "NOT_FOUND" and len(extracted_goal) > 0:
                lead['goal'] = extracted_goal
        
        if urgency_match and not lead.get('urgency'):
            extracted_urgency = urgency_match.group(1).strip()
            if extracted_urgency != "NOT_FOUND" and len(extracted_urgency) > 0:
                lead['urgency'] = extracted_urgency
                
    except Exception as e:
        print(f"Error in data extraction: {e}")
        # Fallback to simple extraction
        pass
    
    # Check for hesitation or refusal signals
    hesitation_keywords = ['no', 'non voglio', "don't want", 'preferisco', 'prefer', 
                          'parlare con', 'talk to', 'chiamare', 'call', 'esitante', 
                          'hesitant', 'forse', 'maybe', 'non so', "don't know"]
    user_message_lower = input.message.lower()
    is_hesitant = any(keyword in user_message_lower for keyword in hesitation_keywords)
    
    # If user is hesitant or we have at least name OR email, consider offering WhatsApp
    can_offer_whatsapp = is_hesitant or lead.get('name') or lead.get('email')
    
    # Check if conversation is complete (either all data OR hesitant user)
    is_complete = bool(
        all([lead.get('name'), lead.get('email'), lead.get('english_level'), lead.get('goal'), lead.get('urgency')])
        or (is_hesitant and len(lead["conversation_history"]) >= 3)  # After 3 messages and hesitant
        or (can_offer_whatsapp and len(lead["conversation_history"]) >= 5)  # After 5 messages with some data
    )
    
    if is_complete and not lead.get('completed_at'):
        lead['completed_at'] = datetime.now(timezone.utc).isoformat()
    
    # Update lead in database
    await db.leads.update_one(
        {"session_id": input.session_id},
        {"$set": lead}
    )
    
    return ChatResponse(
        session_id=input.session_id,
        message=ai_response,
        is_complete=is_complete,
        collected_data={
            "name": lead.get('name', ''),
            "email": lead.get('email', ''),
            "english_level": lead.get('english_level', ''),
            "goal": lead.get('goal', ''),
            "urgency": lead.get('urgency', '')
        }
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()