from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import shutil
import re
import asyncio
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


ROOT_DIR = Path(__file__).parent
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== DATABASE INDEXES ====================
async def create_indexes():
    """Create MongoDB indexes for better query performance"""
    try:
        # Users collection indexes
        await db.users.create_index("username", unique=True)
        await db.users.create_index("id", unique=True)
        await db.users.create_index("email")
        await db.users.create_index("role")
        
        # Member content indexes
        await db.member_content.create_index("id", unique=True)
        await db.member_content.create_index("category")
        await db.member_content.create_index("content_type")
        await db.member_content.create_index("order")
        await db.member_content.create_index([("category", 1), ("order", 1)])
        
        # Newsletter subscribers indexes
        await db.newsletter_subscribers.create_index("email", unique=True)
        await db.newsletter_subscribers.create_index("is_active")
        await db.newsletter_subscribers.create_index("subscribed_at")
        
        # Leads collection indexes (for chatbot)
        await db.leads.create_index("session_id", unique=True)
        await db.leads.create_index("created_at")
        await db.leads.create_index("email")
        
        # Contacts collection indexes
        await db.contacts.create_index("id", unique=True)
        await db.contacts.create_index("email")
        await db.contacts.create_index("created_at")
        await db.contacts.create_index("status")
        
        # Bookings collection indexes
        await db.bookings.create_index("id", unique=True)
        await db.bookings.create_index("email")
        await db.bookings.create_index("created_at")
        await db.bookings.create_index("status")
        
        # Corporate quotes indexes
        await db.corporate_quotes.create_index("id", unique=True)
        await db.corporate_quotes.create_index("contactEmail")
        await db.corporate_quotes.create_index("created_at")
        
        # Testimonials indexes
        await db.testimonials.create_index("id", unique=True)
        await db.testimonials.create_index("language")
        await db.testimonials.create_index("featured")
        await db.testimonials.create_index([("language", 1), ("featured", 1)])
        
        # Clients indexes
        await db.clients.create_index("id", unique=True)
        await db.clients.create_index("featured")
        
        # Folders indexes
        await db.folders.create_index("id", unique=True)
        await db.folders.create_index("is_public")
        await db.folders.create_index("assigned_users")
        await db.folders.create_index("order")
        
        # YouTube playlists indexes
        await db.youtube_playlists.create_index("id", unique=True)
        await db.youtube_playlists.create_index("playlist_id", unique=True)
        await db.youtube_playlists.create_index("folder_id")
        await db.youtube_playlists.create_index("last_sync")
        
        logging.info("✅ MongoDB indexes created successfully")
    except Exception as e:
        logging.error(f"Error creating indexes: {e}")

@app.on_event("startup")
async def startup_event():
    """Initialize database indexes on startup"""
    await create_indexes()


# ==================== AUTHENTICATION CONFIG ====================
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'vocalfitness-secret-key-change-in-production-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Token non valido")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token non valido")
    
    user = await db.users.find_one({"username": username}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    return user

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accesso riservato agli amministratori")
    return current_user

# ==================== USER MODELS ====================
class UserCreate(BaseModel):
    username: str
    password: str
    email: str = ""
    full_name: str = ""
    role: str = "client"  # "client" or "admin"

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    username: str
    email: str = ""
    full_name: str = ""
    role: str = "client"
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ==================== CONTENT MODELS ====================
class ContentCreate(BaseModel):
    title: str
    description: str = ""
    content_type: str  # "video", "pdf", "audio", "link"
    url: str
    thumbnail_url: str = ""
    folder_id: Optional[str] = None  # Which folder it belongs to
    is_public: bool = True  # Visible to all clients or only assigned
    assigned_users: List[str] = []  # List of user IDs
    order: int = 0
    hide_origin: bool = False  # Hide source URL from clients
    embed_code: str = ""  # Custom embed code (optional)

class ContentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str = ""
    content_type: str
    url: str
    thumbnail_url: str = ""
    folder_id: Optional[str] = None
    folder_name: Optional[str] = None
    is_public: bool = True
    assigned_users: List[str] = []
    order: int = 0
    hide_origin: bool = False  # Hide source URL from clients
    embed_code: str = ""  # Custom embed code (optional)
    created_at: datetime
    updated_at: Optional[datetime] = None

class ContentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content_type: Optional[str] = None
    url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    folder_id: Optional[str] = None
    is_public: Optional[bool] = None
    assigned_users: Optional[List[str]] = None
    order: Optional[int] = None
    hide_origin: Optional[bool] = None
    embed_code: Optional[str] = None

# ==================== FOLDER MODELS ====================
class FolderCreate(BaseModel):
    name: str
    description: str = ""
    thumbnail_url: str = ""
    is_public: bool = True  # Visible to all clients or only assigned
    assigned_users: List[str] = []  # List of user IDs
    order: int = 0

class FolderResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: str = ""
    thumbnail_url: str = ""
    is_public: bool = True
    assigned_users: List[str] = []
    order: int = 0
    content_count: int = 0
    created_at: datetime

class FolderUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_public: Optional[bool] = None
    assigned_users: Optional[List[str]] = None
    order: Optional[int] = None

class AssignUsersRequest(BaseModel):
    user_ids: List[str]

# ==================== PASSWORD CHANGE MODEL ====================
class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

# ==================== NEWSLETTER MODEL ====================
class NewsletterSubscription(BaseModel):
    email: str
    name: str = ""
    language: str = "it"

class NewsletterResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str = ""
    language: str = "it"
    subscribed_at: datetime
    is_active: bool = True

# ==================== YOUTUBE PLAYLIST MODELS ====================
class YouTubePlaylistImport(BaseModel):
    playlist_url: str  # YouTube playlist URL
    assigned_users: List[str] = []  # Users to assign all videos to
    is_public: bool = False  # Whether videos are public to all clients

class YouTubePlaylistResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    playlist_id: str  # YouTube playlist ID
    playlist_title: str
    folder_id: str  # Created folder ID
    folder_name: str
    video_count: int
    assigned_users: List[str] = []
    is_public: bool = False
    last_sync: datetime
    created_at: datetime

class YouTubeVideoInfo(BaseModel):
    video_id: str
    title: str
    description: str = ""
    thumbnail_url: str = ""
    duration: str = ""
    position: int = 0

# ==================== STORAGE LIMITS CONFIG ====================
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB per file (ridotto da 500MB)
MAX_TOTAL_STORAGE = 2 * 1024 * 1024 * 1024  # 2GB totale

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
    
    # Import SMTP libraries
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
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

# ==================== AUTHENTICATION ENDPOINTS ====================
@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login and get access token"""
    user = await db.users.find_one({"username": credentials.username}, {"_id": 0})
    
    if not user or not verify_password(credentials.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username o password non corretti",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user["username"]})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user["id"],
            username=user["username"],
            email=user.get("email", ""),
            full_name=user.get("full_name", ""),
            role=user.get("role", "client"),
            created_at=datetime.fromisoformat(user["created_at"]) if isinstance(user["created_at"], str) else user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=current_user["id"],
        username=current_user["username"],
        email=current_user.get("email", ""),
        full_name=current_user.get("full_name", ""),
        role=current_user.get("role", "client"),
        created_at=datetime.fromisoformat(current_user["created_at"]) if isinstance(current_user["created_at"], str) else current_user["created_at"]
    )

@api_router.post("/auth/change-password")
async def change_password(request: PasswordChangeRequest, current_user: dict = Depends(get_current_user)):
    """Change password for the current user"""
    # Get user with hashed password from DB
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Verify current password
    if not verify_password(request.current_password, user.get("hashed_password", "")):
        raise HTTPException(status_code=400, detail="Password attuale non corretta")
    
    # Validate new password
    if len(request.new_password) < 8:
        raise HTTPException(status_code=400, detail="La nuova password deve avere almeno 8 caratteri")
    
    if request.current_password == request.new_password:
        raise HTTPException(status_code=400, detail="La nuova password deve essere diversa dalla precedente")
    
    # Update password
    new_hashed = get_password_hash(request.new_password)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"hashed_password": new_hashed, "password_changed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Password aggiornata con successo"}

# ==================== NEWSLETTER ENDPOINTS ====================
@api_router.post("/newsletter/subscribe", response_model=NewsletterResponse, status_code=201)
async def subscribe_newsletter(subscription: NewsletterSubscription):
    """Subscribe to the newsletter"""
    import re
    
    # Validate email
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, subscription.email):
        raise HTTPException(status_code=400, detail="Email non valida")
    
    # Check if already subscribed
    existing = await db.newsletter_subscribers.find_one({"email": subscription.email.lower()})
    if existing:
        if existing.get("is_active"):
            raise HTTPException(status_code=400, detail="Email già iscritta alla newsletter")
        else:
            # Reactivate subscription
            await db.newsletter_subscribers.update_one(
                {"email": subscription.email.lower()},
                {"$set": {"is_active": True, "resubscribed_at": datetime.now(timezone.utc).isoformat()}}
            )
            return NewsletterResponse(
                id=existing["id"],
                email=existing["email"],
                name=existing.get("name", ""),
                language=existing.get("language", "it"),
                subscribed_at=datetime.fromisoformat(existing["subscribed_at"]) if isinstance(existing["subscribed_at"], str) else existing["subscribed_at"],
                is_active=True
            )
    
    # Create new subscription
    sub_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    sub_doc = {
        "id": sub_id,
        "email": subscription.email.lower(),
        "name": subscription.name,
        "language": subscription.language,
        "subscribed_at": now.isoformat(),
        "is_active": True
    }
    
    await db.newsletter_subscribers.insert_one(sub_doc)
    
    return NewsletterResponse(
        id=sub_id,
        email=subscription.email.lower(),
        name=subscription.name,
        language=subscription.language,
        subscribed_at=now,
        is_active=True
    )

@api_router.post("/newsletter/unsubscribe")
async def unsubscribe_newsletter(email: str):
    """Unsubscribe from the newsletter"""
    result = await db.newsletter_subscribers.update_one(
        {"email": email.lower()},
        {"$set": {"is_active": False, "unsubscribed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Email non trovata")
    
    return {"success": True, "message": "Disiscrizione completata"}

@api_router.get("/admin/newsletter/subscribers")
async def list_newsletter_subscribers(admin: dict = Depends(get_admin_user), active_only: bool = True):
    """List newsletter subscribers (admin only)"""
    query = {"is_active": True} if active_only else {}
    subscribers = await db.newsletter_subscribers.find(query, {"_id": 0}).to_list(10000)
    return {"subscribers": subscribers, "count": len(subscribers)}

# ==================== ADMIN USER MANAGEMENT ENDPOINTS ====================
@api_router.post("/admin/users", response_model=UserResponse, status_code=201)
async def create_user(user_data: UserCreate, admin: dict = Depends(get_admin_user)):
    """Create a new user (admin only)"""
    # Check if username already exists
    existing = await db.users.find_one({"username": user_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username già esistente")
    
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    
    user_doc = {
        "id": user_id,
        "username": user_data.username,
        "hashed_password": hashed_password,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin["username"]
    }
    
    await db.users.insert_one(user_doc)
    
    return UserResponse(
        id=user_id,
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        created_at=datetime.now(timezone.utc)
    )

@api_router.get("/admin/users", response_model=List[UserResponse])
async def list_users(admin: dict = Depends(get_admin_user)):
    """List all users (admin only)"""
    users = await db.users.find({}, {"_id": 0, "hashed_password": 0}).to_list(1000)
    
    return [
        UserResponse(
            id=u["id"],
            username=u["username"],
            email=u.get("email", ""),
            full_name=u.get("full_name", ""),
            role=u.get("role", "client"),
            created_at=datetime.fromisoformat(u["created_at"]) if isinstance(u["created_at"], str) else u["created_at"]
        )
        for u in users
    ]

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a user (admin only)"""
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return {"message": "Utente eliminato con successo"}

# ==================== FOLDER MANAGEMENT ENDPOINTS (Admin) ====================
@api_router.post("/admin/folders", response_model=FolderResponse, status_code=201)
async def create_folder(folder: FolderCreate, admin: dict = Depends(get_admin_user)):
    """Create a new folder (admin only)"""
    folder_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    folder_doc = {
        "id": folder_id,
        "name": folder.name,
        "description": folder.description,
        "thumbnail_url": folder.thumbnail_url,
        "is_public": folder.is_public,
        "assigned_users": folder.assigned_users,
        "order": folder.order,
        "created_at": now.isoformat(),
        "created_by": admin["username"]
    }
    
    await db.folders.insert_one(folder_doc)
    
    return FolderResponse(
        id=folder_id,
        name=folder.name,
        description=folder.description,
        thumbnail_url=folder.thumbnail_url,
        is_public=folder.is_public,
        assigned_users=folder.assigned_users,
        order=folder.order,
        content_count=0,
        created_at=now
    )

@api_router.get("/admin/folders", response_model=List[FolderResponse])
async def list_all_folders(admin: dict = Depends(get_admin_user)):
    """List all folders (admin only)"""
    folders = await db.folders.find({}, {"_id": 0}).sort("order", 1).to_list(1000)
    
    result = []
    for f in folders:
        # Count content in this folder
        content_count = await db.member_content.count_documents({"folder_id": f["id"]})
        result.append(FolderResponse(
            id=f["id"],
            name=f["name"],
            description=f.get("description", ""),
            thumbnail_url=f.get("thumbnail_url", ""),
            is_public=f.get("is_public", True),
            assigned_users=f.get("assigned_users", []),
            order=f.get("order", 0),
            content_count=content_count,
            created_at=datetime.fromisoformat(f["created_at"]) if isinstance(f["created_at"], str) else f["created_at"]
        ))
    
    return result

@api_router.put("/admin/folders/{folder_id}", response_model=FolderResponse)
async def update_folder(folder_id: str, update: FolderUpdate, admin: dict = Depends(get_admin_user)):
    """Update a folder (admin only)"""
    existing = await db.folders.find_one({"id": folder_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Cartella non trovata")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    await db.folders.update_one({"id": folder_id}, {"$set": update_data})
    
    updated = await db.folders.find_one({"id": folder_id}, {"_id": 0})
    content_count = await db.member_content.count_documents({"folder_id": folder_id})
    
    return FolderResponse(
        id=updated["id"],
        name=updated["name"],
        description=updated.get("description", ""),
        thumbnail_url=updated.get("thumbnail_url", ""),
        is_public=updated.get("is_public", True),
        assigned_users=updated.get("assigned_users", []),
        order=updated.get("order", 0),
        content_count=content_count,
        created_at=datetime.fromisoformat(updated["created_at"]) if isinstance(updated["created_at"], str) else updated["created_at"]
    )

@api_router.delete("/admin/folders/{folder_id}")
async def delete_folder(folder_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a folder (admin only) - contents are not deleted, just unassigned"""
    result = await db.folders.delete_one({"id": folder_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cartella non trovata")
    
    # Remove folder_id from contents
    await db.member_content.update_many({"folder_id": folder_id}, {"$set": {"folder_id": None}})
    
    return {"message": "Cartella eliminata con successo"}

@api_router.post("/admin/folders/{folder_id}/assign")
async def assign_users_to_folder(folder_id: str, request: AssignUsersRequest, admin: dict = Depends(get_admin_user)):
    """Assign users to a folder (admin only)"""
    existing = await db.folders.find_one({"id": folder_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Cartella non trovata")
    
    await db.folders.update_one(
        {"id": folder_id},
        {"$set": {"assigned_users": request.user_ids}}
    )
    
    return {"message": f"Utenti assegnati alla cartella", "assigned_users": request.user_ids}

# ==================== CONTENT MANAGEMENT ENDPOINTS (Admin) ====================
@api_router.post("/admin/content", response_model=ContentResponse, status_code=201)
async def create_content(content: ContentCreate, admin: dict = Depends(get_admin_user)):
    """Create new content for the members area (admin only)"""
    content_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    # Get folder name if folder_id is provided
    folder_name = None
    if content.folder_id:
        folder = await db.folders.find_one({"id": content.folder_id}, {"_id": 0, "name": 1})
        if folder:
            folder_name = folder["name"]
    
    content_doc = {
        "id": content_id,
        "title": content.title,
        "description": content.description,
        "content_type": content.content_type,
        "url": content.url,
        "thumbnail_url": content.thumbnail_url,
        "folder_id": content.folder_id,
        "is_public": content.is_public,
        "assigned_users": content.assigned_users,
        "order": content.order,
        "hide_origin": content.hide_origin,
        "embed_code": content.embed_code,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "created_by": admin["username"]
    }
    
    await db.member_content.insert_one(content_doc)
    
    return ContentResponse(
        id=content_id,
        title=content.title,
        description=content.description,
        content_type=content.content_type,
        url=content.url,
        thumbnail_url=content.thumbnail_url,
        folder_id=content.folder_id,
        folder_name=folder_name,
        is_public=content.is_public,
        assigned_users=content.assigned_users,
        order=content.order,
        hide_origin=content.hide_origin,
        embed_code=content.embed_code,
        created_at=now,
        updated_at=now
    )

@api_router.get("/admin/content", response_model=List[ContentResponse])
async def list_all_content(admin: dict = Depends(get_admin_user)):
    """List all content (admin only)"""
    contents = await db.member_content.find({}, {"_id": 0}).sort("order", 1).to_list(1000)
    
    # Get all folders for name lookup
    folders = await db.folders.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    folder_map = {f["id"]: f["name"] for f in folders}
    
    return [
        ContentResponse(
            id=c["id"],
            title=c["title"],
            description=c.get("description", ""),
            content_type=c["content_type"],
            url=c["url"],
            thumbnail_url=c.get("thumbnail_url", ""),
            folder_id=c.get("folder_id"),
            folder_name=folder_map.get(c.get("folder_id")) if c.get("folder_id") else None,
            is_public=c.get("is_public", True),
            assigned_users=c.get("assigned_users", []),
            order=c.get("order", 0),
            hide_origin=c.get("hide_origin", False),
            embed_code=c.get("embed_code", ""),
            created_at=datetime.fromisoformat(c["created_at"]) if isinstance(c["created_at"], str) else c["created_at"],
            updated_at=datetime.fromisoformat(c["updated_at"]) if isinstance(c.get("updated_at"), str) else c.get("updated_at")
        )
        for c in contents
    ]

@api_router.put("/admin/content/{content_id}", response_model=ContentResponse)
async def update_content(content_id: str, update: ContentUpdate, admin: dict = Depends(get_admin_user)):
    """Update content (admin only)"""
    existing = await db.member_content.find_one({"id": content_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Contenuto non trovato")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.member_content.update_one({"id": content_id}, {"$set": update_data})
    
    updated = await db.member_content.find_one({"id": content_id}, {"_id": 0})
    
    # Get folder name
    folder_name = None
    if updated.get("folder_id"):
        folder = await db.folders.find_one({"id": updated["folder_id"]}, {"_id": 0, "name": 1})
        if folder:
            folder_name = folder["name"]
    
    return ContentResponse(
        id=updated["id"],
        title=updated["title"],
        description=updated.get("description", ""),
        content_type=updated["content_type"],
        url=updated["url"],
        thumbnail_url=updated.get("thumbnail_url", ""),
        folder_id=updated.get("folder_id"),
        folder_name=folder_name,
        is_public=updated.get("is_public", True),
        assigned_users=updated.get("assigned_users", []),
        order=updated.get("order", 0),
        hide_origin=updated.get("hide_origin", False),
        embed_code=updated.get("embed_code", ""),
        created_at=datetime.fromisoformat(updated["created_at"]) if isinstance(updated["created_at"], str) else updated["created_at"],
        updated_at=datetime.fromisoformat(updated["updated_at"]) if isinstance(updated.get("updated_at"), str) else updated.get("updated_at")
    )

@api_router.post("/admin/content/{content_id}/assign")
async def assign_users_to_content(content_id: str, request: AssignUsersRequest, admin: dict = Depends(get_admin_user)):
    """Assign users to a content (admin only)"""
    existing = await db.member_content.find_one({"id": content_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Contenuto non trovato")
    
    await db.member_content.update_one(
        {"id": content_id},
        {"$set": {"assigned_users": request.user_ids}}
    )
    
    return {"message": f"Utenti assegnati al contenuto", "assigned_users": request.user_ids}

@api_router.delete("/admin/content/{content_id}")
async def delete_content(content_id: str, admin: dict = Depends(get_admin_user)):
    """Delete content (admin only)"""
    result = await db.member_content.delete_one({"id": content_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contenuto non trovato")
    return {"message": "Contenuto eliminato con successo"}

# ==================== FILE UPLOAD ENDPOINT (Admin) ====================
ALLOWED_EXTENSIONS = {
    'video': ['.mp4', '.webm', '.mov', '.avi', '.mkv'],
    'audio': ['.mp3', '.wav', '.ogg', '.m4a', '.aac'],
    'pdf': ['.pdf'],
    'image': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
}

# Storage limits (overridden from models section if defined there)
UPLOAD_MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB per file
UPLOAD_MAX_TOTAL_STORAGE = 2 * 1024 * 1024 * 1024  # 2GB totale

def get_total_storage_used():
    """Calculate total storage used in uploads directory"""
    total = 0
    if UPLOADS_DIR.exists():
        for f in UPLOADS_DIR.iterdir():
            if f.is_file():
                total += f.stat().st_size
    return total

def format_size(size_bytes):
    """Format bytes to human readable string"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"

@api_router.get("/admin/storage/stats")
async def get_storage_stats(admin: dict = Depends(get_admin_user)):
    """Get storage statistics (admin only)"""
    total_used = get_total_storage_used()
    file_count = len(list(UPLOADS_DIR.iterdir())) if UPLOADS_DIR.exists() else 0
    
    return {
        "total_used_bytes": total_used,
        "total_used_formatted": format_size(total_used),
        "max_storage_bytes": UPLOAD_MAX_TOTAL_STORAGE,
        "max_storage_formatted": format_size(UPLOAD_MAX_TOTAL_STORAGE),
        "usage_percentage": round((total_used / UPLOAD_MAX_TOTAL_STORAGE) * 100, 1),
        "remaining_bytes": UPLOAD_MAX_TOTAL_STORAGE - total_used,
        "remaining_formatted": format_size(UPLOAD_MAX_TOTAL_STORAGE - total_used),
        "file_count": file_count,
        "max_file_size_bytes": UPLOAD_MAX_FILE_SIZE,
        "max_file_size_formatted": format_size(UPLOAD_MAX_FILE_SIZE)
    }

@api_router.get("/admin/database/stats")
async def get_database_stats(admin: dict = Depends(get_admin_user)):
    """Get database statistics and index information (admin only)"""
    try:
        stats = {}
        
        # Collection counts
        collections = ['users', 'member_content', 'newsletter_subscribers', 'leads', 
                      'contacts', 'bookings', 'corporate_quotes', 'testimonials', 'clients']
        
        for coll_name in collections:
            coll = db[coll_name]
            count = await coll.count_documents({})
            indexes = await coll.index_information()
            stats[coll_name] = {
                "document_count": count,
                "index_count": len(indexes),
                "indexes": list(indexes.keys())
            }
        
        # Get database stats
        db_stats = await db.command("dbStats")
        
        return {
            "database_name": db.name,
            "collections": stats,
            "total_size_bytes": db_stats.get("dataSize", 0),
            "total_size_formatted": format_size(db_stats.get("dataSize", 0)),
            "storage_size_bytes": db_stats.get("storageSize", 0),
            "storage_size_formatted": format_size(db_stats.get("storageSize", 0)),
            "index_size_bytes": db_stats.get("indexSize", 0),
            "index_size_formatted": format_size(db_stats.get("indexSize", 0)),
            "total_collections": db_stats.get("collections", 0),
            "total_indexes": db_stats.get("indexes", 0)
        }
    except Exception as e:
        return {
            "error": str(e),
            "message": "Errore nel recupero delle statistiche database"
        }

@api_router.post("/admin/database/reindex")
async def reindex_database(admin: dict = Depends(get_admin_user)):
    """Recreate all database indexes (admin only)"""
    try:
        await create_indexes()
        return {"success": True, "message": "Indici database ricreati con successo"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nella reindicizzazione: {str(e)}")

@api_router.post("/admin/upload")
async def upload_file(
    file: UploadFile = File(...),
    admin: dict = Depends(get_admin_user)
):
    """Upload a file for member content (admin only)"""
    
    # Check total storage before upload
    current_storage = get_total_storage_used()
    if current_storage >= UPLOAD_MAX_TOTAL_STORAGE:
        raise HTTPException(
            status_code=400,
            detail=f"Spazio di archiviazione esaurito. Usati: {format_size(current_storage)} / {format_size(UPLOAD_MAX_TOTAL_STORAGE)}. Elimina alcuni file prima di caricarne altri."
        )
    
    # Get file extension
    file_ext = Path(file.filename).suffix.lower()
    
    # Determine file type
    file_type = None
    for ftype, extensions in ALLOWED_EXTENSIONS.items():
        if file_ext in extensions:
            file_type = ftype
            break
    
    if not file_type:
        allowed = []
        for exts in ALLOWED_EXTENSIONS.values():
            allowed.extend(exts)
        raise HTTPException(
            status_code=400, 
            detail=f"Tipo file non supportato. Estensioni permesse: {', '.join(allowed)}"
        )
    
    # Generate unique filename
    unique_id = str(uuid.uuid4())[:8]
    safe_filename = f"{unique_id}_{file.filename.replace(' ', '_')}"
    file_path = UPLOADS_DIR / safe_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nel salvataggio del file: {str(e)}")
    
    # Get file size
    file_size = file_path.stat().st_size
    
    # Check file size limit
    if file_size > UPLOAD_MAX_FILE_SIZE:
        file_path.unlink()  # Delete the file
        raise HTTPException(
            status_code=400, 
            detail=f"File troppo grande ({format_size(file_size)}). Massimo consentito: {format_size(UPLOAD_MAX_FILE_SIZE)}"
        )
    
    # Check if this upload exceeds total storage
    new_total = current_storage + file_size
    if new_total > UPLOAD_MAX_TOTAL_STORAGE:
        file_path.unlink()  # Delete the file
        raise HTTPException(
            status_code=400,
            detail=f"Upload rifiutato: supererebbe il limite di storage. Spazio rimanente: {format_size(UPLOAD_MAX_TOTAL_STORAGE - current_storage)}"
        )
    
    # Build URL - will be served via static files
    file_url = f"/api/uploads/{safe_filename}"
    
    return {
        "success": True,
        "filename": safe_filename,
        "original_filename": file.filename,
        "file_type": file_type,
        "file_size": file_size,
        "file_size_formatted": format_size(file_size),
        "url": file_url,
        "storage_used": format_size(new_total),
        "storage_remaining": format_size(UPLOAD_MAX_TOTAL_STORAGE - new_total)
    }

@api_router.delete("/admin/upload/{filename}")
async def delete_uploaded_file(filename: str, admin: dict = Depends(get_admin_user)):
    """Delete an uploaded file (admin only)"""
    file_path = UPLOADS_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File non trovato")
    
    # Security check - prevent path traversal
    if not file_path.resolve().parent == UPLOADS_DIR.resolve():
        raise HTTPException(status_code=400, detail="Percorso file non valido")
    
    try:
        file_path.unlink()
        return {"success": True, "message": "File eliminato con successo"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nell'eliminazione: {str(e)}")

# ==================== MEMBERS AREA ENDPOINTS (Authenticated Users) ====================
@api_router.get("/members/folders")
async def get_member_folders(current_user: dict = Depends(get_current_user)):
    """Get folders visible to the authenticated member"""
    user_id = current_user["id"]
    is_admin = current_user.get("role") == "admin"
    
    if is_admin:
        # Admin sees all folders
        folders = await db.folders.find({}, {"_id": 0}).sort("order", 1).to_list(1000)
    else:
        # Client sees public folders OR folders assigned to them
        folders = await db.folders.find({
            "$or": [
                {"is_public": True},
                {"assigned_users": user_id}
            ]
        }, {"_id": 0}).sort("order", 1).to_list(1000)
    
    result = []
    for f in folders:
        # Count content visible to user in this folder
        if is_admin:
            content_count = await db.member_content.count_documents({"folder_id": f["id"]})
        else:
            content_count = await db.member_content.count_documents({
                "folder_id": f["id"],
                "$or": [
                    {"is_public": True},
                    {"assigned_users": user_id}
                ]
            })
        
        result.append({
            "id": f["id"],
            "name": f["name"],
            "description": f.get("description", ""),
            "thumbnail_url": f.get("thumbnail_url", ""),
            "content_count": content_count,
            "order": f.get("order", 0)
        })
    
    return result

@api_router.get("/members/content", response_model=List[ContentResponse])
async def get_member_content(current_user: dict = Depends(get_current_user), folder_id: str = None):
    """Get available content for authenticated members (filtered by visibility)"""
    user_id = current_user["id"]
    is_admin = current_user.get("role") == "admin"
    
    # Build query based on user role and folder
    if is_admin:
        # Admin sees all content
        query = {}
        if folder_id:
            query["folder_id"] = folder_id
    else:
        # Client sees: public content OR content assigned to them OR content in assigned folders
        # First get folders assigned to user
        assigned_folders = await db.folders.find(
            {"assigned_users": user_id},
            {"_id": 0, "id": 1}
        ).to_list(1000)
        assigned_folder_ids = [f["id"] for f in assigned_folders]
        
        query = {
            "$or": [
                {"is_public": True},
                {"assigned_users": user_id},
                {"folder_id": {"$in": assigned_folder_ids}} if assigned_folder_ids else {"folder_id": "__none__"}
            ]
        }
        if folder_id:
            query = {"$and": [query, {"folder_id": folder_id}]}
    
    contents = await db.member_content.find(query, {"_id": 0}).sort("order", 1).to_list(1000)
    
    # Get folder names
    folders = await db.folders.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    folder_map = {f["id"]: f["name"] for f in folders}
    
    return [
        ContentResponse(
            id=c["id"],
            title=c["title"],
            description=c.get("description", ""),
            content_type=c["content_type"],
            url=c["url"] if not c.get("hide_origin") else "",  # Hide URL if hide_origin is true
            thumbnail_url=c.get("thumbnail_url", ""),
            folder_id=c.get("folder_id"),
            folder_name=folder_map.get(c.get("folder_id")) if c.get("folder_id") else None,
            is_public=c.get("is_public", True),
            assigned_users=c.get("assigned_users", []) if is_admin else [],  # Only admin sees assignments
            order=c.get("order", 0),
            hide_origin=c.get("hide_origin", False),
            embed_code=c.get("embed_code", ""),
            created_at=datetime.fromisoformat(c["created_at"]) if isinstance(c["created_at"], str) else c["created_at"],
            updated_at=datetime.fromisoformat(c["updated_at"]) if isinstance(c.get("updated_at"), str) else c.get("updated_at")
        )
        for c in contents
    ]

@api_router.get("/members/content/{content_id}", response_model=ContentResponse)
async def get_single_content(content_id: str, current_user: dict = Depends(get_current_user)):
    """Get single content item for authenticated members"""
    user_id = current_user["id"]
    is_admin = current_user.get("role") == "admin"
    
    content = await db.member_content.find_one({"id": content_id}, {"_id": 0})
    if not content:
        raise HTTPException(status_code=404, detail="Contenuto non trovato")
    
    # Check access permission (unless admin)
    if not is_admin:
        is_public = content.get("is_public", True)
        is_assigned = user_id in content.get("assigned_users", [])
        
        # Check if in assigned folder
        in_assigned_folder = False
        if content.get("folder_id"):
            folder = await db.folders.find_one({"id": content["folder_id"]}, {"_id": 0})
            if folder and user_id in folder.get("assigned_users", []):
                in_assigned_folder = True
        
        if not (is_public or is_assigned or in_assigned_folder):
            raise HTTPException(status_code=403, detail="Non hai accesso a questo contenuto")
    
    # Get folder name
    folder_name = None
    if content.get("folder_id"):
        folder = await db.folders.find_one({"id": content["folder_id"]}, {"_id": 0, "name": 1})
        if folder:
            folder_name = folder["name"]
    
    return ContentResponse(
        id=content["id"],
        title=content["title"],
        description=content.get("description", ""),
        content_type=content["content_type"],
        url=content["url"],
        thumbnail_url=content.get("thumbnail_url", ""),
        folder_id=content.get("folder_id"),
        folder_name=folder_name,
        is_public=content.get("is_public", True),
        assigned_users=content.get("assigned_users", []) if is_admin else [],
        order=content.get("order", 0),
        created_at=datetime.fromisoformat(content["created_at"]) if isinstance(content["created_at"], str) else content["created_at"],
        updated_at=datetime.fromisoformat(content["updated_at"]) if isinstance(content.get("updated_at"), str) else content.get("updated_at")
    )

# ==================== SETUP/INITIALIZATION ENDPOINT ====================
@api_router.post("/setup/admin")
async def setup_admin():
    """Create initial admin user if none exists (one-time setup)"""
    existing_admin = await db.users.find_one({"role": "admin"})
    if existing_admin:
        raise HTTPException(status_code=400, detail="Admin già configurato")
    
    admin_id = str(uuid.uuid4())
    admin_password = os.environ.get('ADMIN_PASSWORD', 'VocalFitness2024!')
    
    admin_doc = {
        "id": admin_id,
        "username": "admin",
        "hashed_password": get_password_hash(admin_password),
        "email": "admissions@vocalfitness.org",
        "full_name": "Administrator",
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin_doc)
    
    return {
        "message": "Admin creato con successo",
        "username": "admin",
        "note": "Cambia la password dopo il primo accesso"
    }

# ==================== YOUTUBE PLAYLIST ENDPOINTS ====================
YOUTUBE_API_KEY = os.environ.get('YOUTUBE_API_KEY', '')

def get_youtube_service():
    """Get YouTube Data API service"""
    if not YOUTUBE_API_KEY:
        raise HTTPException(status_code=500, detail="YouTube API key non configurata")
    return build("youtube", "v3", developerKey=YOUTUBE_API_KEY, cache_discovery=False)

def extract_playlist_id(url: str) -> str:
    """Extract playlist ID from YouTube URL"""
    patterns = [
        r'[?&]list=([a-zA-Z0-9_-]+)',
        r'playlist\?list=([a-zA-Z0-9_-]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise HTTPException(status_code=400, detail="URL playlist non valido. Assicurati che contenga un parametro 'list='")

async def fetch_playlist_videos(playlist_id: str) -> tuple[str, List[dict]]:
    """Fetch all videos from a YouTube playlist"""
    youtube = get_youtube_service()
    videos = []
    
    try:
        # Get playlist info
        playlist_response = youtube.playlists().list(
            part="snippet",
            id=playlist_id
        ).execute()
        
        if not playlist_response.get("items"):
            raise HTTPException(status_code=404, detail="Playlist non trovata o non accessibile")
        
        playlist_title = playlist_response["items"][0]["snippet"]["title"]
        
        # Fetch all videos in the playlist
        next_page_token = None
        position = 0
        
        while True:
            playlist_items = youtube.playlistItems().list(
                part="snippet,contentDetails",
                playlistId=playlist_id,
                maxResults=50,
                pageToken=next_page_token
            ).execute()
            
            for item in playlist_items.get("items", []):
                snippet = item["snippet"]
                video_id = snippet["resourceId"]["videoId"]
                
                # Get best thumbnail
                thumbnails = snippet.get("thumbnails", {})
                thumbnail_url = (
                    thumbnails.get("maxres", {}).get("url") or
                    thumbnails.get("high", {}).get("url") or
                    thumbnails.get("medium", {}).get("url") or
                    thumbnails.get("default", {}).get("url", "")
                )
                
                videos.append({
                    "video_id": video_id,
                    "title": snippet.get("title", ""),
                    "description": snippet.get("description", "")[:500],  # Limit description
                    "thumbnail_url": thumbnail_url,
                    "position": position
                })
                position += 1
            
            next_page_token = playlist_items.get("nextPageToken")
            if not next_page_token:
                break
        
        return playlist_title, videos
        
    except HttpError as e:
        if "quotaExceeded" in str(e):
            raise HTTPException(status_code=429, detail="Quota API YouTube superata. Riprova domani.")
        elif "playlistNotFound" in str(e):
            raise HTTPException(status_code=404, detail="Playlist non trovata")
        else:
            raise HTTPException(status_code=400, detail=f"Errore YouTube API: {str(e)}")

@api_router.post("/admin/youtube/import")
async def import_youtube_playlist(
    data: YouTubePlaylistImport,
    background_tasks: BackgroundTasks,
    admin: dict = Depends(get_admin_user)
):
    """Import a YouTube playlist: creates folder and content entries for all videos"""
    
    # Extract playlist ID
    playlist_id = extract_playlist_id(data.playlist_url)
    
    # Check if playlist already imported
    existing = await db.youtube_playlists.find_one({"playlist_id": playlist_id})
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Playlist già importata nella cartella '{existing.get('folder_name', 'N/A')}'. Usa 'Sincronizza' per aggiornare."
        )
    
    # Fetch videos from YouTube
    playlist_title, videos = await fetch_playlist_videos(playlist_id)
    
    if not videos:
        raise HTTPException(status_code=400, detail="Playlist vuota o non accessibile")
    
    # Create folder for the playlist
    folder_id = str(uuid.uuid4())
    folder_doc = {
        "id": folder_id,
        "name": playlist_title,
        "description": f"Importata da YouTube - {len(videos)} video",
        "thumbnail_url": videos[0]["thumbnail_url"] if videos else "",
        "is_public": data.is_public,
        "assigned_users": data.assigned_users,
        "order": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.folders.insert_one(folder_doc)
    
    # Create content entries for each video
    content_docs = []
    for video in videos:
        content_id = str(uuid.uuid4())
        content_doc = {
            "id": content_id,
            "title": video["title"],
            "description": video["description"],
            "content_type": "video",
            "url": f"https://www.youtube.com/watch?v={video['video_id']}",
            "thumbnail_url": video["thumbnail_url"],
            "folder_id": folder_id,
            "is_public": data.is_public,
            "assigned_users": data.assigned_users,
            "order": video["position"],
            "youtube_video_id": video["video_id"],  # Track original YouTube ID
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        content_docs.append(content_doc)
    
    if content_docs:
        await db.member_content.insert_many(content_docs)
    
    # Save playlist tracking info
    playlist_doc = {
        "id": str(uuid.uuid4()),
        "playlist_id": playlist_id,
        "playlist_title": playlist_title,
        "playlist_url": data.playlist_url,
        "folder_id": folder_id,
        "folder_name": playlist_title,
        "video_count": len(videos),
        "assigned_users": data.assigned_users,
        "is_public": data.is_public,
        "last_sync": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.youtube_playlists.insert_one(playlist_doc)
    
    return {
        "success": True,
        "message": f"Playlist '{playlist_title}' importata con successo",
        "folder_id": folder_id,
        "folder_name": playlist_title,
        "video_count": len(videos),
        "playlist_id": playlist_id
    }

@api_router.get("/admin/youtube/playlists")
async def get_youtube_playlists(admin: dict = Depends(get_admin_user)):
    """Get all imported YouTube playlists"""
    playlists = await db.youtube_playlists.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Get current video counts
    for p in playlists:
        p["current_video_count"] = await db.member_content.count_documents({"folder_id": p["folder_id"]})
        # Convert datetime strings if needed
        if isinstance(p.get("last_sync"), str):
            p["last_sync"] = datetime.fromisoformat(p["last_sync"])
        if isinstance(p.get("created_at"), str):
            p["created_at"] = datetime.fromisoformat(p["created_at"])
    
    return playlists

@api_router.post("/admin/youtube/sync/{playlist_doc_id}")
async def sync_youtube_playlist(playlist_doc_id: str, admin: dict = Depends(get_admin_user)):
    """Sync a playlist - add new videos that were added to YouTube"""
    
    # Get playlist doc
    playlist_doc = await db.youtube_playlists.find_one({"id": playlist_doc_id}, {"_id": 0})
    if not playlist_doc:
        raise HTTPException(status_code=404, detail="Playlist non trovata")
    
    playlist_id = playlist_doc["playlist_id"]
    folder_id = playlist_doc["folder_id"]
    
    # Fetch current videos from YouTube
    playlist_title, youtube_videos = await fetch_playlist_videos(playlist_id)
    
    # Get existing video IDs in our database
    existing_content = await db.member_content.find(
        {"folder_id": folder_id, "youtube_video_id": {"$exists": True}},
        {"_id": 0, "youtube_video_id": 1}
    ).to_list(1000)
    existing_video_ids = {c["youtube_video_id"] for c in existing_content}
    
    # Find new videos
    new_videos = [v for v in youtube_videos if v["video_id"] not in existing_video_ids]
    
    # Add new videos
    if new_videos:
        content_docs = []
        max_order = await db.member_content.count_documents({"folder_id": folder_id})
        
        for idx, video in enumerate(new_videos):
            content_id = str(uuid.uuid4())
            content_doc = {
                "id": content_id,
                "title": video["title"],
                "description": video["description"],
                "content_type": "video",
                "url": f"https://www.youtube.com/watch?v={video['video_id']}",
                "thumbnail_url": video["thumbnail_url"],
                "folder_id": folder_id,
                "is_public": playlist_doc.get("is_public", False),
                "assigned_users": playlist_doc.get("assigned_users", []),
                "order": max_order + idx,
                "youtube_video_id": video["video_id"],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            content_docs.append(content_doc)
        
        await db.member_content.insert_many(content_docs)
    
    # Update playlist doc
    await db.youtube_playlists.update_one(
        {"id": playlist_doc_id},
        {"$set": {
            "last_sync": datetime.now(timezone.utc).isoformat(),
            "video_count": len(youtube_videos),
            "playlist_title": playlist_title
        }}
    )
    
    return {
        "success": True,
        "message": f"Sincronizzazione completata",
        "new_videos_added": len(new_videos),
        "total_videos": len(youtube_videos)
    }

@api_router.post("/admin/youtube/sync-all")
async def sync_all_youtube_playlists(admin: dict = Depends(get_admin_user)):
    """Sync all imported YouTube playlists"""
    playlists = await db.youtube_playlists.find({}, {"_id": 0}).to_list(1000)
    
    results = []
    for playlist in playlists:
        try:
            result = await sync_youtube_playlist(playlist["id"], admin)
            results.append({
                "playlist": playlist["playlist_title"],
                "status": "success",
                "new_videos": result["new_videos_added"]
            })
        except Exception as e:
            results.append({
                "playlist": playlist.get("playlist_title", "Unknown"),
                "status": "error",
                "error": str(e)
            })
    
    total_new = sum(r.get("new_videos", 0) for r in results if r["status"] == "success")
    
    return {
        "success": True,
        "message": f"Sincronizzazione completata. {total_new} nuovi video aggiunti.",
        "results": results
    }

@api_router.delete("/admin/youtube/playlist/{playlist_doc_id}")
async def delete_youtube_playlist(playlist_doc_id: str, delete_content: bool = False, admin: dict = Depends(get_admin_user)):
    """Delete a YouTube playlist tracking (optionally delete folder and content too)"""
    
    playlist_doc = await db.youtube_playlists.find_one({"id": playlist_doc_id}, {"_id": 0})
    if not playlist_doc:
        raise HTTPException(status_code=404, detail="Playlist non trovata")
    
    folder_id = playlist_doc["folder_id"]
    
    if delete_content:
        # Delete all content in the folder
        await db.member_content.delete_many({"folder_id": folder_id})
        # Delete the folder
        await db.folders.delete_one({"id": folder_id})
    
    # Delete playlist tracking
    await db.youtube_playlists.delete_one({"id": playlist_doc_id})
    
    return {
        "success": True,
        "message": "Playlist eliminata" + (" con tutti i contenuti" if delete_content else " (cartella e contenuti mantenuti)")
    }

@api_router.put("/admin/youtube/playlist/{playlist_doc_id}/users")
async def update_playlist_users(playlist_doc_id: str, data: AssignUsersRequest, admin: dict = Depends(get_admin_user)):
    """Update assigned users for a playlist (updates folder and all content)"""
    
    playlist_doc = await db.youtube_playlists.find_one({"id": playlist_doc_id}, {"_id": 0})
    if not playlist_doc:
        raise HTTPException(status_code=404, detail="Playlist non trovata")
    
    folder_id = playlist_doc["folder_id"]
    
    # Update playlist doc
    await db.youtube_playlists.update_one(
        {"id": playlist_doc_id},
        {"$set": {"assigned_users": data.user_ids}}
    )
    
    # Update folder
    await db.folders.update_one(
        {"id": folder_id},
        {"$set": {"assigned_users": data.user_ids}}
    )
    
    # Update all content in the folder
    await db.member_content.update_many(
        {"folder_id": folder_id},
        {"$set": {"assigned_users": data.user_ids}}
    )
    
    return {
        "success": True,
        "message": "Utenti aggiornati per la playlist e tutti i contenuti"
    }

# Include the router in the main app
app.include_router(api_router)

# Mount uploads directory as static files
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

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