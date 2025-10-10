"""
Update clients database with Global Recognitions and Corporate Clients
Clear existing data and add new organized lists
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

# Global Recognitions - Institutional partners
GLOBAL_RECOGNITIONS = [
    {
        "name": "Diesse - Associazione Nazionale Docenti",
        "logo_url": "https://logo.clearbit.com/diesse.org",
        "website": "https://www.diesse.org",
        "sector": "Education",
        "category": "recognition",
        "featured": True
    },
    {
        "name": "MUR - Ministero Università e Ricerca",
        "logo_url": "https://logo.clearbit.com/mur.gov.it",
        "website": "https://www.mur.gov.it",
        "sector": "Government",
        "category": "recognition",
        "featured": True
    },
    {
        "name": "MIUR - Ministero Istruzione",
        "logo_url": "https://logo.clearbit.com/miur.gov.it",
        "website": "https://www.miur.gov.it",
        "sector": "Government",
        "category": "recognition",
        "featured": True
    },
    {
        "name": "Università di Torino",
        "logo_url": "https://logo.clearbit.com/unito.it",
        "website": "https://www.unito.it",
        "sector": "Education",
        "category": "recognition",
        "featured": True
    },
    {
        "name": "Laboratorio di Fonetica Sperimentale LFAG",
        "logo_url": "https://logo.clearbit.com/lfag.unito.it",
        "website": "https://www.unito.it",
        "sector": "Research",
        "category": "recognition",
        "featured": True
    },
    {
        "name": "Università E-Campus",
        "logo_url": "https://logo.clearbit.com/uniecampus.it",
        "website": "https://www.uniecampus.it",
        "sector": "Education",
        "category": "recognition",
        "featured": True
    },
    {
        "name": "Oxford University Alumni",
        "logo_url": "https://logo.clearbit.com/ox.ac.uk",
        "website": "https://www.ox.ac.uk",
        "sector": "Education",
        "category": "recognition",
        "featured": True
    },
    {
        "name": "EF Education First",
        "logo_url": "https://logo.clearbit.com/ef.com",
        "website": "https://www.ef.com",
        "sector": "Education",
        "category": "recognition",
        "featured": True
    },
    {
        "name": "Cambridge Assessment Centres",
        "logo_url": "https://logo.clearbit.com/cambridgeassessment.org.uk",
        "website": "https://www.cambridgeassessment.org.uk",
        "sector": "Education",
        "category": "recognition",
        "featured": True
    },
    {
        "name": "H-Farm University",
        "logo_url": "https://logo.clearbit.com/h-farm.com",
        "website": "https://www.h-farm.com",
        "sector": "Education",
        "category": "recognition",
        "featured": True
    },
    {
        "name": "Link Campus University",
        "logo_url": "https://logo.clearbit.com/unilink.it",
        "website": "https://www.unilink.it",
        "sector": "Education",
        "category": "recognition",
        "featured": True
    },
    {
        "name": "Senato della Repubblica",
        "logo_url": "https://logo.clearbit.com/senato.it",
        "website": "https://www.senato.it",
        "sector": "Government",
        "category": "recognition",
        "featured": True
    },
    {
        "name": "Harvard Business School Roma Chapter",
        "logo_url": "https://logo.clearbit.com/hbs.edu",
        "website": "https://www.hbs.edu",
        "sector": "Education",
        "category": "recognition",
        "featured": True
    }
]

# Corporate Clients - Companies
CORPORATE_CLIENTS = [
    {
        "name": "The Boston Consulting Group",
        "logo_url": "https://logo.clearbit.com/bcg.com",
        "website": "https://www.bcg.com",
        "sector": "Consulting",
        "category": "client",
        "featured": True
    },
    {
        "name": "Accenture",
        "logo_url": "https://logo.clearbit.com/accenture.com",
        "website": "https://www.accenture.com",
        "sector": "Consulting",
        "category": "client",
        "featured": True
    },
    {
        "name": "BASF",
        "logo_url": "https://logo.clearbit.com/basf.com",
        "website": "https://www.basf.com",
        "sector": "Chemical",
        "category": "client",
        "featured": True
    },
    {
        "name": "Hitachi",
        "logo_url": "https://logo.clearbit.com/hitachi.com",
        "website": "https://www.hitachi.com",
        "sector": "Technology",
        "category": "client",
        "featured": True
    },
    {
        "name": "Dell Technologies",
        "logo_url": "https://logo.clearbit.com/dell.com",
        "website": "https://www.dell.com",
        "sector": "Technology",
        "category": "client",
        "featured": True
    },
    {
        "name": "Electrolux",
        "logo_url": "https://logo.clearbit.com/electrolux.com",
        "website": "https://www.electrolux.com",
        "sector": "Manufacturing",
        "category": "client",
        "featured": True
    },
    {
        "name": "Mediaset",
        "logo_url": "https://logo.clearbit.com/mediaset.it",
        "website": "https://www.mediaset.it",
        "sector": "Media",
        "category": "client",
        "featured": True
    },
    {
        "name": "Yamazaki Mazak",
        "logo_url": "https://logo.clearbit.com/mazakusa.com",
        "website": "https://www.mazakusa.com",
        "sector": "Manufacturing",
        "category": "client",
        "featured": True
    },
    {
        "name": "The Alfio Bardolla Group",
        "logo_url": "https://logo.clearbit.com/alfiobardolla.com",
        "website": "https://www.alfiobardolla.com",
        "sector": "Finance",
        "category": "client",
        "featured": True
    },
    {
        "name": "TEVA Pharmaceuticals",
        "logo_url": "https://logo.clearbit.com/tevapharm.com",
        "website": "https://www.tevapharm.com",
        "sector": "Pharmaceutical",
        "category": "client",
        "featured": True
    },
    {
        "name": "DIPHARMA",
        "logo_url": "https://logo.clearbit.com/dipharma.com",
        "website": "https://www.dipharma.com",
        "sector": "Pharmaceutical",
        "category": "client",
        "featured": True
    }
]

async def update_clients_database():
    """Clear old clients and add new organized data"""
    
    print("Starting database update...")
    print("="*70)
    
    # Clear existing clients
    print("\n1. Clearing existing clients...")
    delete_result = await db.clients.delete_many({})
    print(f"   ✓ Deleted {delete_result.deleted_count} old entries")
    
    # Add Global Recognitions
    print(f"\n2. Adding {len(GLOBAL_RECOGNITIONS)} Global Recognitions...")
    recognition_docs = []
    for item in GLOBAL_RECOGNITIONS:
        doc = {
            "id": str(uuid.uuid4()),
            **item,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        recognition_docs.append(doc)
        print(f"   ✓ {item['name']}")
    
    await db.clients.insert_many(recognition_docs)
    
    # Add Corporate Clients
    print(f"\n3. Adding {len(CORPORATE_CLIENTS)} Corporate Clients...")
    client_docs = []
    for item in CORPORATE_CLIENTS:
        doc = {
            "id": str(uuid.uuid4()),
            **item,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        client_docs.append(doc)
        print(f"   ✓ {item['name']}")
    
    await db.clients.insert_many(client_docs)
    
    # Summary
    print("\n" + "="*70)
    print("DATABASE UPDATE COMPLETE!")
    print("="*70)
    print(f"Total entries: {len(GLOBAL_RECOGNITIONS) + len(CORPORATE_CLIENTS)}")
    print(f"  • Global Recognitions: {len(GLOBAL_RECOGNITIONS)}")
    print(f"  • Corporate Clients: {len(CORPORATE_CLIENTS)}")
    print("="*70 + "\n")
    
    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(update_clients_database())
