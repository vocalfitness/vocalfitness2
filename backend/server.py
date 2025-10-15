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