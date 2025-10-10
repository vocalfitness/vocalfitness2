"""
Seed script to populate VocalFitness database with real testimonials and clients
from www.vocalfitness.org
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Real testimonials from www.vocalfitness.org
TESTIMONIALS = [
    {
        "id": str(uuid.uuid4()),
        "text": "Steve non è semplice un coach. Ti fa vivere un'esperienza artistica all'interno della didattica. Ci vorrebbe un po' più di Steve Dapper nelle aziende Italiane per essere più forti e competitivi sui mercati internazionali con il nostro Made in Italy.",
        "author": "David Guido Pietroni",
        "role": "Executive Producer",
        "company": "Tribeca Film",
        "location": "New York",
        "language": "it",
        "featured": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "text": "His teachings are unprecedented and extremely functional not just at getting to quickly learn English but at becoming bilingual without even having to move to an English speaking country. Steve has also a very human approach that makes him a fun and an interesting individual to hangout with. We have used Steve services quite a lot at our company with satisfaction.",
        "author": "Guido Bernardinelli",
        "role": "CEO",
        "company": "La Marzocco LLC",
        "location": "Seattle",
        "language": "en",
        "featured": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "text": "Capace, diretto e sempre molto concentrato al raggiungimento dell'obiettivo. Fissane uno preciso e, con lui, lo raggiungerai bene e presto! Affidabile, unico e sempre molto attento a farti ben figurare...per ben figurare con lui.",
        "author": "Luca Rusconi",
        "role": "CEO",
        "company": "La Rusconi S.p.A",
        "location": "Milan",
        "language": "it",
        "featured": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "text": "Steve is an excellent professional and awesome human being! God gave Steve the rhythm, Steve did the rest...",
        "author": "Gabriele Gresta",
        "role": "Founder",
        "company": "Hyperloop TT",
        "location": "Los Angeles",
        "language": "en",
        "featured": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "text": "Steve è una delle persone più dinamiche e innovative che io conosca. Una garanzia professionale!",
        "author": "Silvana Carcano",
        "role": "Commissione Antimafia",
        "company": "Senato della Repubblica",
        "location": "Roma",
        "language": "it",
        "featured": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "text": "I rarely come across real talents who stand out like Steve! He's simply the best language specialist I've ever met.",
        "author": "Fabio Sormani",
        "role": "CFO",
        "company": "Yamazaki Mazak",
        "location": "Milan",
        "language": "en",
        "featured": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
]

# Real client companies from www.vocalfitness.org
CLIENTS = [
    {
        "id": str(uuid.uuid4()),
        "name": "Dell Technologies",
        "logo_url": "https://logo.clearbit.com/dell.com",
        "website": "https://www.dell.com",
        "sector": "Technology",
        "featured": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "name": "La Marzocco",
        "logo_url": "https://logo.clearbit.com/lamarzoccousa.com",
        "website": "https://www.lamarzoccousa.com",
        "sector": "Manufacturing",
        "featured": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Yamazaki Mazak",
        "logo_url": "https://logo.clearbit.com/mazakusa.com",
        "website": "https://www.mazakusa.com",
        "sector": "Manufacturing",
        "featured": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Tribeca Film",
        "logo_url": "https://logo.clearbit.com/tribecafilm.com",
        "website": "https://www.tribecafilm.com",
        "sector": "Entertainment",
        "featured": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Hyperloop TT",
        "logo_url": "https://logo.clearbit.com/hyperlooptt.com",
        "website": "https://www.hyperlooptt.com",
        "sector": "Transportation",
        "featured": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Università E-Campus",
        "logo_url": "https://logo.clearbit.com/uniecampus.it",
        "website": "https://www.uniecampus.it",
        "sector": "Education",
        "featured": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Education First (EF)",
        "logo_url": "https://logo.clearbit.com/ef.com",
        "website": "https://www.ef.com",
        "sector": "Education",
        "featured": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "name": "MIUR",
        "logo_url": "https://logo.clearbit.com/miur.gov.it",
        "website": "https://www.miur.gov.it",
        "sector": "Government",
        "featured": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Oxford University",
        "logo_url": "https://logo.clearbit.com/ox.ac.uk",
        "website": "https://www.ox.ac.uk",
        "sector": "Education",
        "featured": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
]

async def seed_database():
    """Seed the database with testimonials and clients"""
    
    print("Starting database seeding...")
    
    # Clear existing data (optional - comment out if you want to keep existing data)
    print("Clearing existing testimonials and clients...")
    await db.testimonials.delete_many({})
    await db.clients.delete_many({})
    
    # Insert testimonials
    print(f"Inserting {len(TESTIMONIALS)} testimonials...")
    result = await db.testimonials.insert_many(TESTIMONIALS)
    print(f"✓ Inserted {len(result.inserted_ids)} testimonials")
    
    # Insert clients
    print(f"Inserting {len(CLIENTS)} clients...")
    result = await db.clients.insert_many(CLIENTS)
    print(f"✓ Inserted {len(result.inserted_ids)} clients")
    
    print("\n✓ Database seeding completed successfully!")
    
    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
