"""
Add LinkedIn recommendations to testimonials database
Eliminates duplicates based on author name
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

# Authors we already have in database (to check for duplicates)
EXISTING_AUTHORS = [
    "David Guido Pietroni",
    "Guido Bernardinelli", 
    "Luca Rusconi",
    "Gabriele Gresta",
    "Bibop Gresta",  # Same as Gabriele Gresta
    "Silvana Carcano",
    "Fabio Sormani",
    "Marco Rossi"  # Test entry
]

# New LinkedIn recommendations to add
NEW_TESTIMONIALS = [
    {
        "text": "Aiuto professionisti in digital marketing a usare al meglio AI, funnel, adv e marketing automation per semplificare i processi, ottenere più risultati e ottimizzare budget pubblicitari e tempi di esecuzione. Ho incontrato Steve a un corso e ne ho subito apprezzato la competenza. Preciso, puntuale, valido e chiaro, mi ha accompagnato alla comprensione dei miei errori e, senza mai annoiare, è riuscito a migliorare le mie competenze in tempi molto stretti. Anche imparare e migliorare una nuova lingua può essere 'gradevole' se lo si fa con metodo. Bravo Steve",
        "author": "Giovanni Perilli",
        "role": "Digital Marketing Professional",
        "company": "",
        "location": "",
        "language": "it",
        "featured": True
    },
    {
        "text": "Persona solare un super professionista dalle qualità poliedriche a presto Steve!!!",
        "author": "Katia Ferrante",
        "role": "Psicologa clinica",
        "company": "",
        "location": "",
        "language": "it",
        "featured": True
    },
    {
        "text": "Ho conosciuto Steve ad un evento e mi ha affascinato il suo carisma sul palco e il suo approccio scientifico alla lingua inglese. Da tempo cercavo un insegnante così! Steve coniuga la simpatia con la tecnica passando anche a volte attraverso la durezza di un insegnante. Il risultato che ci si può aspettare con un vocal coach di questo livello? Padroneggiare un inglese non solo fluente ma quasi da madrelingua!",
        "author": "Heidi Iuliano",
        "role": "Time Engineering - Increases your productivity without stress",
        "company": "",
        "location": "",
        "language": "it",
        "featured": True
    },
    {
        "text": "Steve Dapper is amazing to work with, and has outstanding expertise in English teaching. He helps people gain the confidence needed to upgrade and master their conversations and pronunciation in English, in just 10 lessons! He provides training to improve vowel and consonant sounds by taking full advantage of the diaphragm.",
        "author": "Genevieve Mascarinas",
        "role": "Social Media Manager | Digital Content Creator",
        "company": "",
        "location": "",
        "language": "en",
        "featured": True
    },
    {
        "text": "Affidabile, concreto, efficace e creativo. Un professionista al di fuori del comune. Lo raccomando fortemente.",
        "author": "Pamela Bongini",
        "role": "Dodo Arslan | Studio",
        "company": "",
        "location": "",
        "language": "it",
        "featured": False
    },
    {
        "text": "Un entusiasmante professionista che contagia positivamente le persone con cui entra in contatto",
        "author": "Silvia Margoni",
        "role": "Socia fondatrice Links4Brain e Links4Talent",
        "company": "Confindustria Trento",
        "location": "",
        "language": "it",
        "featured": False
    },
    {
        "text": "Steve oltre che un grande professionista è una persona generosa e sincera. Take Care.",
        "author": "Tonello Corrado",
        "role": "CEO",
        "company": "Ennevolte Srl",
        "location": "",
        "language": "it",
        "featured": False
    },
    {
        "text": "Great guy, reliable professional!",
        "author": "Alex Peroni",
        "role": "Radio Professional",
        "company": "",
        "location": "",
        "language": "en",
        "featured": False
    },
    {
        "text": "I've been working on some projects with Steve and he's been a great professionist with high level skills in strategy development for companies and personal coaching. He's not just a great professionist but also a highly cultured man.",
        "author": "Emanuele Liboni",
        "role": "Solution Development Manager",
        "company": "Electric Mobility and Renewable Energy sectors",
        "location": "",
        "language": "en",
        "featured": True
    },
    {
        "text": "Steve is a dynamic communicator and an inspiring instructor of the language arts. His contagious personality pulls you in, by commanding your attention while lifting your talents to a higher plane. I have known Steve over 10+ years and he is consistent in his attention to detail and his love of people the world over. Why I find Steve to be unique, in that he is adept at combining the technical aspects of language- the mechanics of phonation- with the charisma and quirks of culture and personality. You will fall in love with him and his instruction, once you see him in action.",
        "author": "Alvin Chea",
        "role": "Recording Artist Take 6/Voice-Over Artist/Pro Session Singer",
        "company": "Self Employed",
        "location": "",
        "language": "en",
        "featured": True
    },
    {
        "text": "Steve ha un approccio veramente unico all'insegnamento della fonetica e della lingua inglese. Sono madrelingua inglese, e ad oggi, il metodo di Steve e con Steve è il miglior metodo per imparare a parlare con la pronuncia inglese o americana (in base a quale si sceglie). Inoltre Steve è un vero e proprio personaggio.. e ci si diverte.. imparando.",
        "author": "Samuele Mura",
        "role": "FIFA Agent | Entrepreneur",
        "company": "Life As a Football Agent on Youtube",
        "location": "",
        "language": "it",
        "featured": True
    },
    {
        "text": "Steve è un'ottimo coach! Grazie a lui ho avuto modo di migliorare il mio livello di inglese. Le sue lezione sono entusiasmanti e formative!",
        "author": "Guido Barraco",
        "role": "Coordinatore Rete Commerciale",
        "company": "",
        "location": "",
        "language": "it",
        "featured": False
    },
    {
        "text": "In short, Steve is the language master.",
        "author": "Luca Senatore",
        "role": "Senior Sales Leader",
        "company": "Google",
        "location": "",
        "language": "en",
        "featured": True
    },
    {
        "text": "Steve è uno forte! Non posso che iniziare così questa raccomandazione. Mi ha affiancato per diversi mesi e il suo modo di lavorare è impeccabile. Professionale e attento ai dettagli, ma senza mai prendersi troppo sul serio.",
        "author": "Raffaele Gaito",
        "role": "Entrepreneur Content Creator Speaker",
        "company": "",
        "location": "",
        "language": "it",
        "featured": True
    },
    {
        "text": "Conosce bene la sua materia, ne è appassionato e riesce a trasmettere questa passione ad ogni singola occasione.",
        "author": "Mario Licini",
        "role": "Branch Manager",
        "company": "Eurocover Commerciale Srl",
        "location": "",
        "language": "it",
        "featured": False
    },
    {
        "text": "Reliable, creative and professional; I definitely recommend him!",
        "author": "Ludovico Bongini",
        "role": "Chief Legal Officer",
        "company": "FACI GROUP",
        "location": "",
        "language": "en",
        "featured": False
    },
    {
        "text": "Ottimo professionista. Offre un metodo d'apprendimento diretto, efficace e adatto a chi ha necessità di utilizzare l'inglese (anche) a livello professionale. Consigliato!",
        "author": "Vincenzo Perillo",
        "role": "Avvocato",
        "company": "Izzi - Toniatti - Martini & Partners",
        "location": "",
        "language": "it",
        "featured": False
    },
    {
        "text": "ottimo maestro di madre lingua ... metodo semplice e chiaro...",
        "author": "Pietro Leanza",
        "role": "Facility & Purchasing Manager, Security Coordinator",
        "company": "Yusen Logistics (Italy) spa",
        "location": "",
        "language": "it",
        "featured": False
    },
    {
        "text": "A vivid, creative, and warm professional, I truly admire Steve for the energy, passion, and enthusiasm that he spreads around him. His insights regarding how to use your voice not just to transfer information, but to connect with the people around you are precious enough so that I recommend him in case you need him as a trainer, or speaker at your event.",
        "author": "Valentin Radu",
        "role": "Omniconvert: we help e-Commerce & retailers grow with AI, experimentation & data",
        "company": "",
        "location": "",
        "language": "en",
        "featured": True
    },
    {
        "text": "Ti fa venire Voglia di fare cose belle ed è un vulcano di nuove iniziative: tutti dovrebbero prendere qualcosa da Lui.",
        "author": "Pier Luigi Brogi",
        "role": "Founder - Name Partner",
        "company": "BGSM & Partners",
        "location": "",
        "language": "it",
        "featured": False
    },
    {
        "text": "Steve parla inglese come un attore iper erariale Poesia per le orecchie",
        "author": "Davide Cavalieri",
        "role": "Chief Executive Officer",
        "company": "Cavalieri Retailing",
        "location": "",
        "language": "it",
        "featured": False
    },
    {
        "text": "Serio, competente e divertente. Un perfetto insegnante e vocal coach.",
        "author": "Avv. Stefano Colombetti",
        "role": "Titolare dello Studio Legale Colombetti",
        "company": "Patrocinante in Cassazione",
        "location": "",
        "language": "it",
        "featured": False
    },
    {
        "text": "La prima volta che mi sono imbattuto in Steve fu a seguito di un'intervista che ebbi occasione di ascoltare su Strategia Digitale, un podcast sul business development molto famoso sulla rete. In meno di due mesi sono riuscito a creare un discorso connesso in native english! Steve, you're a goddamn genius. Thanks for having impacted my life in such a marvellous and poignant way. Nothing will ever be the same for me in my life and profession.",
        "author": "Mario Santagostino",
        "role": "Head of Manufacturing and Mobility",
        "company": "Microsoft",
        "location": "",
        "language": "it",
        "featured": True
    }
]

async def add_new_testimonials():
    """Add new testimonials from LinkedIn, avoiding duplicates"""
    
    print("Starting to add LinkedIn testimonials...")
    print(f"Total LinkedIn recommendations: {len(NEW_TESTIMONIALS)}")
    
    # Get existing testimonials
    existing = await db.testimonials.find({}, {"_id": 0, "author": 1}).to_list(1000)
    existing_authors_db = [t['author'] for t in existing]
    all_existing = EXISTING_AUTHORS + existing_authors_db
    
    print(f"Existing authors in database: {len(existing_authors_db)}")
    
    added_count = 0
    skipped_count = 0
    
    for testimonial in NEW_TESTIMONIALS:
        author = testimonial['author']
        
        # Check if author already exists
        if author in all_existing:
            print(f"✗ Skipping duplicate: {author}")
            skipped_count += 1
            continue
        
        # Add new testimonial
        testimonial_doc = {
            "id": str(uuid.uuid4()),
            "text": testimonial['text'],
            "author": testimonial['author'],
            "role": testimonial['role'],
            "company": testimonial['company'],
            "location": testimonial['location'],
            "language": testimonial['language'],
            "featured": testimonial['featured'],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.testimonials.insert_one(testimonial_doc)
        print(f"✓ Added: {author} ({testimonial['language']})")
        added_count += 1
    
    print(f"\n{'='*60}")
    print(f"✓ Added {added_count} new testimonials")
    print(f"✗ Skipped {skipped_count} duplicates")
    print(f"Total testimonials in database: {len(existing_authors_db) + added_count}")
    print(f"{'='*60}\n")
    
    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(add_new_testimonials())
