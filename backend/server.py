from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, BackgroundTasks, Request
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
import subprocess
from pdf2image import convert_from_path
from PIL import Image
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


ROOT_DIR = Path(__file__).parent
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)
THUMBNAILS_DIR = UPLOADS_DIR / 'thumbnails'
THUMBNAILS_DIR.mkdir(exist_ok=True)

load_dotenv(ROOT_DIR / '.env')

# Emergent Object Storage (persistent across deploys)
from storage_helper import init_storage as _init_emergent_storage, put_object as emergent_put, get_object as emergent_get, guess_content_type as guess_mime

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
        
        # Popup messages indexes
        await db.popup_messages.create_index("id", unique=True)
        await db.popup_messages.create_index("is_active")
        await db.popup_messages.create_index("target_users")
        await db.popup_messages.create_index("created_at")
        
        # Popup dismissals indexes (track which users dismissed which popups)
        await db.popup_dismissals.create_index([("user_id", 1), ("popup_id", 1)], unique=True)
        await db.popup_dismissals.create_index("user_id")
        await db.popup_dismissals.create_index("popup_id")
        
        # Popup views indexes (track which users viewed which popups)
        await db.popup_views.create_index([("user_id", 1), ("popup_id", 1)], unique=True)
        await db.popup_views.create_index("popup_id")
        
        # Messages indexes
        await db.messages.create_index("id", unique=True)
        await db.messages.create_index([("conversation_id", 1), ("created_at", 1)])
        await db.messages.create_index("sender_id")
        await db.messages.create_index("recipient_id")
        
        logging.info("MongoDB indexes created successfully")
    except Exception as e:
        logging.error(f"Error creating indexes: {e}")

@app.on_event("startup")
async def startup_event():
    """Initialize database indexes and persistent object storage on startup"""
    await create_indexes()
    try:
        await seed_admin()
    except Exception as e:
        logging.warning(f"Admin seeding at startup failed (non-fatal): {e}")
    try:
        _init_emergent_storage()
    except Exception as e:
        logging.warning(f"Emergent storage init at startup failed (will retry on first use): {e}")
    try:
        from routers.phoneme_cards import ensure_phoneme_seed
        result = await ensure_phoneme_seed(db)
        logging.info(f"Phoneme cards seed: inserted={result['inserted']} skipped={result['skipped']} patched={result.get('patched', [])}")
    except Exception as e:
        logging.warning(f"Phoneme cards seed failed (non-fatal): {e}")
    try:
        from routers.canonical_phonemes import ensure_canonical_seed
        result = await ensure_canonical_seed(db)
        logging.info(f"Canonical phoneme inventory seed: upserted={result['upserted']} total={result['total']}")
    except Exception as e:
        logging.warning(f"Canonical phoneme seed failed (non-fatal): {e}")
    try:
        from routers.phoneme_formants import ensure_formant_references
        result = await ensure_formant_references(db)
        logging.info(f"Formant references seed: inserted={result['inserted']} total={result['total']}")
    except Exception as e:
        logging.warning(f"Formant references seed failed (non-fatal): {e}")


# ==================== AUTHENTICATION CONFIG ====================
# Security / JWT primitives extracted to utils/security.py
# ``seed_admin`` still lives here because it depends on ``db`` and runs at
# startup (see ``@app.on_event("startup")`` below).
from utils.security import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    pwd_context,
    security,
    verify_password,
    get_password_hash,
    create_access_token,
    build_user_deps,
)

async def seed_admin():
    """Idempotent admin seeding (per Emergent auth playbook).

    Runs at startup. Ensures an admin user matching ADMIN_USERNAME / ADMIN_PASSWORD
    env vars exists. If the admin row was lost (e.g. DB volume re-created on
    redeploy) it is re-created. If the env password rotated, the hash is updated
    so the configured credentials are always the source of truth.

    Safe behaviour:
      - Only touches the admin user (role == "admin" AND username matches env).
      - Never re-hashes if the current stored hash already matches the env password.
      - Never resets other users' passwords.
      - If ADMIN_PASSWORD env is missing/empty, the seed is a no-op (we don't want
        an accidental empty-password admin in production).
    """
    admin_username = (os.environ.get('ADMIN_USERNAME') or '').strip() or 'admin'
    admin_password = (os.environ.get('ADMIN_PASSWORD') or '').strip()
    admin_email = (os.environ.get('ADMIN_EMAIL') or '').strip() or 'admissions@vocalfitness.org'

    if not admin_password:
        logging.warning("seed_admin: ADMIN_PASSWORD env not set — skipping idempotent admin seeding")
        return

    try:
        existing = await db.users.find_one({"username": admin_username})
        if existing is None:
            admin_doc = {
                "id": str(uuid.uuid4()),
                "username": admin_username,
                "hashed_password": get_password_hash(admin_password),
                "email": admin_email,
                "full_name": "Administrator",
                "role": "admin",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "client_status": "active",
                "country": "Italia",
            }
            await db.users.insert_one(admin_doc)
            logging.info(f"seed_admin: created admin user '{admin_username}' from ADMIN_PASSWORD env")
        else:
            try:
                matches = verify_password(admin_password, existing.get("hashed_password", ""))
            except Exception:
                matches = False
            updates = {}
            if not matches:
                updates["hashed_password"] = get_password_hash(admin_password)
                updates["password_changed_at"] = datetime.now(timezone.utc).isoformat()
            if existing.get("role") != "admin":
                updates["role"] = "admin"
            if updates:
                await db.users.update_one({"username": admin_username}, {"$set": updates})
                logging.info(f"seed_admin: refreshed admin '{admin_username}' password from env (hash mismatch detected)")
    except Exception as e:
        logging.error(f"seed_admin failed: {e}")


get_current_user, get_admin_user = build_user_deps(db)

# ==================== USER MODELS ====================
class UserCreate(BaseModel):
    username: str
    password: str
    email: str = ""
    full_name: str = ""
    role: str = "client"
    # Personal
    phone: str = ""
    whatsapp: str = ""
    date_of_birth: str = ""
    address: str = ""
    city: str = ""
    province: str = ""
    postal_code: str = ""
    country: str = "Italia"
    fiscal_code: str = ""
    # Business
    client_type: str = "private"  # "private", "business", "foreign"
    company_name: str = ""
    vat_number: str = ""
    sdi_code: str = ""
    pec: str = ""
    website: str = ""
    # Social & Digital
    instagram: str = ""
    facebook: str = ""
    linkedin: str = ""
    tiktok: str = ""
    youtube: str = ""
    twitter: str = ""
    telegram: str = ""
    # Marketing & CRM
    lead_source: str = ""  # come ci ha trovato
    referral: str = ""  # chi lo ha referenziato
    client_status: str = "active"  # lead, prospect, active, inactive, vip
    preferred_contact: str = ""  # email, phone, whatsapp, instagram, etc
    interests: str = ""  # interessi/obiettivi
    tags: str = ""  # tag per segmentazione (comma-separated)
    marketing_email_consent: bool = False
    marketing_sms_consent: bool = False
    follows_instagram: bool = False
    follows_facebook: bool = False
    follows_youtube: bool = False
    follows_tiktok: bool = False
    engagement_level: str = ""  # cold, warm, hot
    last_contact_date: str = ""
    # Admin
    notes: str = ""
    purchase_history: str = ""

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    fiscal_code: Optional[str] = None
    client_type: Optional[str] = None
    company_name: Optional[str] = None
    vat_number: Optional[str] = None
    sdi_code: Optional[str] = None
    pec: Optional[str] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    linkedin: Optional[str] = None
    tiktok: Optional[str] = None
    youtube: Optional[str] = None
    twitter: Optional[str] = None
    telegram: Optional[str] = None
    lead_source: Optional[str] = None
    referral: Optional[str] = None
    client_status: Optional[str] = None
    preferred_contact: Optional[str] = None
    interests: Optional[str] = None
    tags: Optional[str] = None
    marketing_email_consent: Optional[bool] = None
    marketing_sms_consent: Optional[bool] = None
    follows_instagram: Optional[bool] = None
    follows_facebook: Optional[bool] = None
    follows_youtube: Optional[bool] = None
    follows_tiktok: Optional[bool] = None
    engagement_level: Optional[str] = None
    last_contact_date: Optional[str] = None
    notes: Optional[str] = None
    purchase_history: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None  # lead, client, collaborator, editor, manager, admin

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
    phone: str = ""
    whatsapp: str = ""
    date_of_birth: str = ""
    address: str = ""
    city: str = ""
    province: str = ""
    postal_code: str = ""
    country: str = "Italia"
    fiscal_code: str = ""
    client_type: str = "private"
    company_name: str = ""
    vat_number: str = ""
    sdi_code: str = ""
    pec: str = ""
    website: str = ""
    instagram: str = ""
    facebook: str = ""
    linkedin: str = ""
    tiktok: str = ""
    youtube: str = ""
    twitter: str = ""
    telegram: str = ""
    lead_source: str = ""
    referral: str = ""
    client_status: str = "active"
    preferred_contact: str = ""
    interests: str = ""
    tags: str = ""
    marketing_email_consent: bool = False
    marketing_sms_consent: bool = False
    follows_instagram: bool = False
    follows_facebook: bool = False
    follows_youtube: bool = False
    follows_tiktok: bool = False
    engagement_level: str = ""
    last_contact_date: str = ""
    notes: str = ""
    purchase_history: str = ""
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

# ==================== POPUP MESSAGES MODELS ====================
class PopupMessageCreate(BaseModel):
    title: str
    message_type: str  # "text", "audio", "video"
    content: str = ""  # Text content or description
    media_url: str = ""  # URL for audio/video
    embed_code: str = ""  # For video embeds (YouTube, etc.)
    target_users: List[str] = []  # Empty = all users
    is_active: bool = True
    button_text: str = ""  # Optional CTA button text
    button_url: str = ""  # Optional CTA button URL
    thumbnail_url: str = ""  # Optional thumbnail/cover image

class PopupMessageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    message_type: str
    content: str = ""
    media_url: str = ""
    embed_code: str = ""
    target_users: List[str] = []
    is_active: bool = True
    button_text: str = ""
    button_url: str = ""
    thumbnail_url: str = ""
    created_at: datetime
    created_by: str = ""

class PopupMessageUpdate(BaseModel):
    title: Optional[str] = None
    message_type: Optional[str] = None
    content: Optional[str] = None
    media_url: Optional[str] = None
    embed_code: Optional[str] = None
    target_users: Optional[List[str]] = None
    is_active: Optional[bool] = None
    button_text: Optional[str] = None
    button_url: Optional[str] = None
    thumbnail_url: Optional[str] = None

# ==================== STORAGE LIMITS CONFIG ====================
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB per file (ridotto da 500MB)
MAX_TOTAL_STORAGE = 2 * 1024 * 1024 * 1024  # 2GB totale

# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== MESSAGING MODELS ====================
class MessageCreate(BaseModel):
    recipient_id: str  # User ID of the recipient
    content: str = ""
    content_html: str = ""  # Optional sanitized rich-text HTML version of content (admin rich editor)
    message_type: str = "text"  # "text", "audio", "video", "task", "file"
    media_url: str = ""
    embed_code: str = ""
    task_description: str = ""
    task_due_date: str = ""
    file_name: str = ""  # Name to display for file links

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


# =========================================================================
# Proposal Open Tracking & Send-by-Email
# -------------------------------------------------------------------------
# Endpoints extracted to routers/proposals.py — wired below via
# ``build_proposals_router`` (see the router include section at the
# bottom of this file). ``PROPOSAL_PDFS`` and models live inside the
# router module.
# =========================================================================

# ``_EMAIL_RE`` is still used by the LMS Premium Interest endpoint below,
# so keep it as a module-level constant.
_EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")


# =========================================================================
# LMS Premium Interest — lead capture from the paywall modal
# -------------------------------------------------------------------------
# A visitor who lands on a premium phoneme card (without an active
# membership) is shown a paywall. They can submit their email + chosen tier
# so the team can follow up manually. Stripe wiring will plug into the same
# collection later — keep the schema permissive on purpose.
# =========================================================================
class LmsInterestCreate(BaseModel):
    email: str
    name: Optional[str] = None
    card_id: Optional[str] = None
    tier: Optional[str] = None       # 'monthly' | 'annual' | (future tier slugs)
    source: Optional[str] = None     # e.g. 'paywall_modal'

@api_router.post("/lms/interest")
async def lms_interest(payload: LmsInterestCreate, request: Request, background: BackgroundTasks):
    email_to = (payload.email or "").strip()
    if not _EMAIL_RE.match(email_to):
        raise HTTPException(status_code=400, detail="Indirizzo email non valido")

    xff = request.headers.get("x-forwarded-for", "")
    client_ip = (xff.split(",")[0].strip() if xff else (request.client.host if request.client else "")) or ""

    doc = {
        "id": str(uuid.uuid4()),
        "email": email_to,
        "name": (payload.name or "").strip() or None,
        "card_id": payload.card_id or None,
        "tier": payload.tier or None,
        "source": payload.source or None,
        "client_ip": client_ip,
        "user_agent": request.headers.get("user-agent", "")[:512],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "new",  # new | contacted | converted | declined
    }
    await db.lms_interests.insert_one(doc)

    # Notify the seller via SMTP — non-blocking so the public endpoint
    # responds within a few hundred ms even if Zoho takes seconds.
    def _send_notification() -> None:
        try:
            import smtplib
            from email.mime.text import MIMEText

            smtp_server   = os.environ.get('SMTP_SERVER', '')
            smtp_port     = int(os.environ.get('SMTP_PORT', '587'))
            smtp_user     = os.environ.get('SMTP_USER', '')
            smtp_password = os.environ.get('SMTP_PASSWORD', '')
            if not (smtp_server and smtp_user and smtp_password):
                return
            label_tier = {'monthly': '€19/mese', 'annual': '€149/anno'}.get(payload.tier or '', payload.tier or '—')
            body = (
                "🎓 New LMS Premium Interest\n\n"
                f"Email:    {email_to}\n"
                f"Name:     {payload.name or '—'}\n"
                f"Card:     {payload.card_id or '—'}\n"
                f"Tier:     {label_tier}\n"
                f"Source:   {payload.source or '—'}\n"
                f"IP:       {client_ip}\n\n"
                "— sent automatically from vocalfitness.org/lms paywall\n"
            )
            msg = MIMEText(body, 'plain', 'utf-8')
            msg['From']    = smtp_user
            msg['To']      = 'steve@vocalfitness.org'
            msg['Subject'] = f"[LMS] Interesse Premium · {email_to}"
            with smtplib.SMTP(smtp_server, smtp_port, timeout=15) as srv:
                srv.starttls()
                srv.login(smtp_user, smtp_password)
                srv.sendmail(smtp_user, ['steve@vocalfitness.org'], msg.as_string())
        except Exception as e:
            print(f"[lms_interest] notify email failed: {e}")

    background.add_task(_send_notification)
    return {"ok": True}

@api_router.get("/admin/lms/interests")
async def list_lms_interests(
    status_filter: Optional[str] = None,
    limit: int = 200,
    _admin: dict = Depends(get_admin_user),
):
    q = {}
    if status_filter:
        q["status"] = status_filter
    items = await db.lms_interests.find(q, {"_id": 0}).sort("created_at", -1).to_list(max(1, min(limit, 1000)))
    return {"total": len(items), "items": items}


# Testimonials Endpoints
# Contact Form Endpoint





# ==================== ADMIN USER MANAGEMENT ENDPOINTS ====================
@api_router.post("/admin/users", response_model=UserResponse, status_code=201)
async def create_user(user_data: UserCreate, admin: dict = Depends(get_admin_user)):
    """Create a new user (admin only)"""
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
        "phone": user_data.phone,
        "whatsapp": user_data.whatsapp,
        "date_of_birth": user_data.date_of_birth,
        "address": user_data.address,
        "city": user_data.city,
        "province": user_data.province,
        "postal_code": user_data.postal_code,
        "country": user_data.country,
        "fiscal_code": user_data.fiscal_code,
        "client_type": user_data.client_type,
        "company_name": user_data.company_name,
        "vat_number": user_data.vat_number,
        "sdi_code": user_data.sdi_code,
        "pec": user_data.pec,
        "website": user_data.website,
        "instagram": user_data.instagram,
        "facebook": user_data.facebook,
        "linkedin": user_data.linkedin,
        "tiktok": user_data.tiktok,
        "youtube": user_data.youtube,
        "twitter": user_data.twitter,
        "telegram": user_data.telegram,
        "lead_source": user_data.lead_source,
        "referral": user_data.referral,
        "client_status": user_data.client_status,
        "preferred_contact": user_data.preferred_contact,
        "interests": user_data.interests,
        "tags": user_data.tags,
        "marketing_email_consent": user_data.marketing_email_consent,
        "marketing_sms_consent": user_data.marketing_sms_consent,
        "follows_instagram": user_data.follows_instagram,
        "follows_facebook": user_data.follows_facebook,
        "follows_youtube": user_data.follows_youtube,
        "follows_tiktok": user_data.follows_tiktok,
        "engagement_level": user_data.engagement_level,
        "last_contact_date": user_data.last_contact_date,
        "notes": user_data.notes,
        "purchase_history": user_data.purchase_history,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin["username"]
    }
    
    await db.users.insert_one(user_doc)
    user_doc.pop("_id", None)
    user_doc.pop("hashed_password", None)
    user_doc["created_at"] = datetime.now(timezone.utc)
    return UserResponse(**user_doc)

@api_router.get("/admin/users")
async def list_users(admin: dict = Depends(get_admin_user)):
    """List all users (admin only)"""
    users = await db.users.find({}, {"_id": 0, "hashed_password": 0}).to_list(1000)
    return users

@api_router.put("/admin/users/{user_id}")
async def update_user(user_id: str, update: UserUpdate, admin: dict = Depends(get_admin_user)):
    """Update a user (admin only)"""
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # Hash password if being updated
    if "password" in update_data and update_data["password"]:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    else:
        update_data.pop("password", None)
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    return updated

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


@api_router.post("/admin/content/{content_id}/regenerate-thumbnail")
async def regenerate_content_thumbnail(content_id: str, admin: dict = Depends(get_admin_user)):
    """Regenerate thumbnail for a single content item"""
    content = await db.member_content.find_one({"id": content_id}, {"_id": 0})
    if not content:
        raise HTTPException(status_code=404, detail="Contenuto non trovato")

    url = content.get("url", "")
    content_type = content.get("content_type", "")
    thumbnail_url = None

    # Try URL-based thumbnail (YouTube, Google Drive)
    yt_thumb = get_youtube_thumbnail(url)
    if yt_thumb:
        thumbnail_url = yt_thumb
    else:
        drive_match = re.search(r'drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)', url)
        if drive_match:
            thumbnail_url = f"https://drive.google.com/thumbnail?id={drive_match.group(1)}&sz=w480"

    # Try file-based thumbnail (uploaded video/PDF)
    if not thumbnail_url and url:
        filename = url.split("/api/uploads/")[-1] if "/api/uploads/" in url else ""
        if filename:
            file_path = UPLOADS_DIR / filename
            if file_path.exists():
                thumbnail_url = auto_generate_thumbnail(file_path, content_type=content_type)

    if thumbnail_url:
        await db.member_content.update_one({"id": content_id}, {"$set": {"thumbnail_url": thumbnail_url}})
        return {"success": True, "thumbnail_url": thumbnail_url}

    return {"success": False, "thumbnail_url": "", "message": "Impossibile generare anteprima per questo contenuto"}


@api_router.post("/admin/content/regenerate-all-thumbnails")
async def regenerate_all_thumbnails(admin: dict = Depends(get_admin_user)):
    """Regenerate thumbnails for all content items without one"""
    contents = await db.member_content.find({}, {"_id": 0}).to_list(1000)
    updated = 0
    for c in contents:
        if c.get("thumbnail_url"):
            continue
        url = c.get("url", "")
        content_type = c.get("content_type", "")
        thumbnail_url = None

        yt_thumb = get_youtube_thumbnail(url)
        if yt_thumb:
            thumbnail_url = yt_thumb
        else:
            drive_match = re.search(r'drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)', url)
            if drive_match:
                thumbnail_url = f"https://drive.google.com/thumbnail?id={drive_match.group(1)}&sz=w480"

        if not thumbnail_url and url:
            filename = url.split("/api/uploads/")[-1] if "/api/uploads/" in url else ""
            if filename:
                file_path = UPLOADS_DIR / filename
                if file_path.exists():
                    thumbnail_url = auto_generate_thumbnail(file_path, content_type=content_type)

        if thumbnail_url:
            await db.member_content.update_one({"id": c["id"]}, {"$set": {"thumbnail_url": thumbnail_url}})
            updated += 1

    return {"success": True, "updated": updated, "total": len(contents)}


# ==================== FILE UPLOAD ENDPOINT (Admin) ====================
# Constants + helpers extracted to utils/storage.py.
# Upload / delete / serve endpoints extracted to routers/uploads.py.
# Re-import the constants + helpers so the remaining endpoints in this
# file (content thumbnail regeneration, popup media upload, DB stats)
# can keep referring to them unchanged.
from utils.storage import (
    UPLOAD_MAX_FILE_SIZE,
    UPLOAD_MAX_TOTAL_STORAGE,
    auto_generate_thumbnail,
    format_size,
    get_total_storage_used,
    get_youtube_thumbnail,
)


# Storage stats / upload / thumbnail endpoints extracted to routers/uploads.py
# (see the router include section at the bottom of this file).


# ==================== ADMIN LEADS / CRM ====================
# Endpoints extracted to routers/admin_leads.py — wired below via
# ``build_admin_leads_router`` (see the router include section at the
# bottom of this file).


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
        url=content["url"] if not content.get("hide_origin") else "",  # Hide URL if hide_origin
        thumbnail_url=content.get("thumbnail_url", ""),
        folder_id=content.get("folder_id"),
        folder_name=folder_name,
        is_public=content.get("is_public", True),
        assigned_users=content.get("assigned_users", []) if is_admin else [],
        order=content.get("order", 0),
        hide_origin=content.get("hide_origin", False),
        embed_code=content.get("embed_code", ""),
        created_at=datetime.fromisoformat(content["created_at"]) if isinstance(content["created_at"], str) else content["created_at"],
        updated_at=datetime.fromisoformat(content["updated_at"]) if isinstance(content.get("updated_at"), str) else content.get("updated_at")
    )

# ==================== ELEVENLABS TTS / VOICE CLONING ====================
# Endpoints extracted to routers/elevenlabs.py — wired below via
# ``build_elevenlabs_router`` (see the router include section at the
# bottom of this file).


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

# ==================== MESSAGING ENDPOINTS ====================

def send_notification_email(recipient_email: str, sender_name: str, message_preview: str, message_type: str = "text", message_html: str = ""):
    """Send email notification for new message.
    
    If `message_html` is provided, it is rendered as-is inside the email body
    (already produced by a trusted client-side rich text editor; we still wrap
    it inside our branded template). Otherwise we fall back to escaping the
    plain `message_preview` and converting newlines to <br>.
    """
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    if not recipient_email:
        return False
    
    try:
        smtp_server = os.environ.get('SMTP_SERVER', 'smtp.zoho.eu')
        smtp_port = int(os.environ.get('SMTP_PORT', '587'))
        smtp_user = os.environ.get('SMTP_USER', '')
        smtp_password = os.environ.get('SMTP_PASSWORD', '')
        
        if not smtp_password:
            return False
        
        type_label = {"text": "Messaggio", "audio": "Audio", "video": "Video", "task": "Compito"}.get(message_type, "Messaggio")
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"VocalFitness - Nuovo {type_label} da {sender_name}"
        msg['From'] = smtp_user
        msg['To'] = recipient_email
        
        # Render full message: prefer rich HTML (already sanitized by editor) ‒ fallback to escaped plain text
        if message_html and message_html.strip():
            full_message_html = message_html
        else:
            from html import escape as _html_escape
            full_message_html = _html_escape(message_preview or "").replace("\n", "<br>")
        
        html_body = f"""
        <html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;padding:20px;">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
            <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:20px;text-align:center;">
                <h2 style="color:#f59e0b;margin:0;">VocalFitness</h2>
            </div>
            <div style="padding:24px;">
                <p style="color:#64748b;font-size:14px;">Hai ricevuto un nuovo {type_label.lower()} da <strong>{sender_name}</strong>:</p>
                <div style="background:#f8fafc;border-left:4px solid #f59e0b;padding:16px 20px;margin:16px 0;border-radius:0 8px 8px 0;">
                    <p style="margin:0;color:#1e293b;white-space:pre-wrap;word-break:break-word;">{full_message_html}</p>
                </div>
                <a href="{os.environ.get('FRONTEND_URL', 'https://vocalfitness.org').rstrip('/')}/area-clienti" 
                   style="display:inline-block;background:#f59e0b;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px;">
                    Vai all'Area Riservata
                </a>
            </div>
        </div>
        </body></html>"""
        
        msg.attach(MIMEText(html_body, 'html'))
        
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        return True
    except Exception as e:
        logging.warning(f"Email notification failed: {e}")
        return False


def get_conversation_id(user1_id: str, user2_id: str) -> str:
    """Generate a consistent conversation ID between two users"""
    ids = sorted([user1_id, user2_id])
    return f"conv_{ids[0][:8]}_{ids[1][:8]}"






# ``GET /uploads/{file_path:path}`` extracted to routers/uploads.py.


# Include the router in the main app
# Register modular routers under the shared /api prefix
from routers.phoneme_cards import build_phoneme_cards_router, ensure_phoneme_seed
from routers.elevenlabs import build_elevenlabs_router
from routers.admin_leads import build_admin_leads_router
from routers.proposals import build_proposals_router
from routers.uploads import build_uploads_router
from routers.testimonials_clients import build_testimonials_clients_router
from routers.messages import build_messages_router
from routers.popups import build_popups_router
from routers.leads_forms import build_leads_forms_router
from routers.chat_alice import build_chat_alice_router
from routers.auth import build_auth_router
from routers.canonical_phonemes import build_canonical_phonemes_router
from routers.phoneme_recordings import build_phoneme_recordings_router
from routers.phoneme_formants import build_phoneme_formants_router, ensure_formant_references
api_router.include_router(build_phoneme_formants_router(db, get_current_user, emergent_put, UPLOADS_DIR))
api_router.include_router(build_phoneme_cards_router(db, get_admin_user, build_user_deps.optional_admin))
api_router.include_router(build_phoneme_recordings_router(db, get_current_user, emergent_put, UPLOADS_DIR))
api_router.include_router(build_elevenlabs_router(get_admin_user, emergent_put, UPLOADS_DIR))
api_router.include_router(build_admin_leads_router(db, get_admin_user))
api_router.include_router(build_proposals_router(db, get_admin_user))
api_router.include_router(build_uploads_router(get_admin_user, emergent_put, emergent_get, guess_mime))
api_router.include_router(build_testimonials_clients_router(db))
api_router.include_router(build_messages_router(db, get_admin_user, get_current_user, get_conversation_id, send_notification_email))
api_router.include_router(build_popups_router(db, get_admin_user, get_current_user, emergent_put, guess_mime))
api_router.include_router(build_leads_forms_router(db, get_password_hash, create_access_token))
api_router.include_router(build_chat_alice_router(db))
api_router.include_router(build_auth_router(db, get_current_user, get_admin_user, UserResponse, NewsletterResponse))
api_router.include_router(build_canonical_phonemes_router(db))

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