"""Chat Alice — AI-powered lead qualification chatbot.

Endpoint:
    POST /chat  — conversational lead-capture assistant "Alice" backed by
                  GPT-4o-mini via the Emergent LLM key. Sessions are keyed
                  by ``session_id`` (frontend-generated UUID). The bot:

                  1. Adds the user turn to ``leads.conversation_history``
                  2. Sends the turn to GPT-4o-mini with a language-specific
                     system prompt describing collection rules + WhatsApp
                     hand-off logic
                  3. Runs a second LLM pass to extract structured fields
                     (name / email / english_level / goal / urgency)
                  4. Flags the session complete when enough data was
                     collected *or* the user showed hesitation for ≥3 turns

Uses ``emergentintegrations.llm.chat`` — key comes from the
``EMERGENT_LLM_KEY`` env var.
"""

from __future__ import annotations

import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# Models
# --------------------------------------------------------------------------- #
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


# --------------------------------------------------------------------------- #
# System prompts
# --------------------------------------------------------------------------- #
def _build_system_prompt(lang: str, lead: dict) -> str:
    """Return the language-specific system prompt reflecting current lead state."""
    if lang == "it":
        return f"""Sei Alice, l'assistente virtuale di VocalFitness. Sei cordiale, professionale e NON invasiva.

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

    return f"""You are Alice, the VocalFitness virtual assistant. You are friendly, professional, and NOT pushy.

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


_HESITATION_KEYWORDS = [
    'no', 'non voglio', "don't want", 'preferisco', 'prefer',
    'parlare con', 'talk to', 'chiamare', 'call', 'esitante',
    'hesitant', 'forse', 'maybe', 'non so', "don't know",
]


def _extract_field(pattern: str, text: str) -> str:
    """Regex-extract a labeled field from the extraction LLM output.
    Returns the stripped value or '' if not found / NOT_FOUND."""
    m = re.search(pattern, text)
    if not m:
        return ""
    val = m.group(1).strip()
    return "" if val == "NOT_FOUND" or not val else val


# --------------------------------------------------------------------------- #
# Router factory
# --------------------------------------------------------------------------- #
def build_chat_alice_router(db) -> APIRouter:
    router = APIRouter()

    @router.post("/chat", response_model=ChatResponse)
    async def chat_with_alice(payload: ChatRequest):
        # Lazy-import so the module load doesn't fail when
        # emergentintegrations isn't installed (e.g. in unit-test envs).
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        # --- 1. Fetch or create lead session ------------------------------
        lead = await db.leads.find_one({"session_id": payload.session_id})
        if not lead:
            lead = {
                "id":                   str(uuid.uuid4()),
                "session_id":           payload.session_id,
                "name":                 "",
                "email":                "",
                "english_level":        "",
                "goal":                 "",
                "urgency":              "",
                "language":             payload.language,
                "conversation_history": [],
                "created_at":           datetime.now(timezone.utc).isoformat(),
                "completed_at":         None,
            }
            await db.leads.insert_one(lead)

        # --- 2. Log user turn ---------------------------------------------
        lead["conversation_history"].append({
            "role":      "user",
            "content":   payload.message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        # --- 3. Main Alice reply (GPT-4o-mini) -----------------------------
        emergent_key = os.environ.get("EMERGENT_LLM_KEY")
        chat = LlmChat(
            api_key=emergent_key,
            session_id=payload.session_id,
            system_message=_build_system_prompt(payload.language, lead),
        )
        chat.with_model("openai", "gpt-4o-mini")
        ai_response = await chat.send_message(UserMessage(text=payload.message))

        lead["conversation_history"].append({
            "role":      "assistant",
            "content":   ai_response,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        # --- 4. Structured-field extraction (second LLM pass) --------------
        prev_ai = (
            lead["conversation_history"][-2]["content"]
            if len(lead["conversation_history"]) >= 2 else ""
        )
        extraction_prompt = f"""Analyze this user message and extract information if present. Return ONLY the values found, or "NOT_FOUND" if not present.

User message: "{payload.message}"
Previous AI question: "{prev_ai}"

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

        try:
            extraction_chat = LlmChat(
                api_key=emergent_key,
                session_id=f"{payload.session_id}_extract",
                system_message="You are a data extraction assistant. Extract information precisely as requested.",
            )
            extraction_chat.with_model("openai", "gpt-4o-mini")
            extraction_result = await extraction_chat.send_message(UserMessage(text=extraction_prompt))

            # Only update fields not yet filled
            if not lead.get("name"):
                v = _extract_field(r"NAME:\s*(.+)", extraction_result)
                if v:
                    lead["name"] = v
            if not lead.get("email"):
                v = _extract_field(r"EMAIL:\s*(.+)", extraction_result)
                if v and "@" in v:
                    lead["email"] = v
            if not lead.get("english_level"):
                v = _extract_field(r"ENGLISH_LEVEL:\s*(.+)", extraction_result)
                if v:
                    lead["english_level"] = v
            if not lead.get("goal"):
                v = _extract_field(r"GOAL:\s*(.+)", extraction_result)
                if v:
                    lead["goal"] = v
            if not lead.get("urgency"):
                v = _extract_field(r"URGENCY:\s*(.+)", extraction_result)
                if v:
                    lead["urgency"] = v
        except Exception as e:
            logger.warning(f"[chat_alice] Data extraction failed: {e}")

        # --- 5. Determine completion + WhatsApp handoff -------------------
        user_lower = payload.message.lower()
        is_hesitant = any(k in user_lower for k in _HESITATION_KEYWORDS)
        can_offer_whatsapp = is_hesitant or lead.get("name") or lead.get("email")

        history_len = len(lead["conversation_history"])
        is_complete = bool(
            all([lead.get("name"), lead.get("email"), lead.get("english_level"),
                 lead.get("goal"), lead.get("urgency")])
            or (is_hesitant and history_len >= 3)
            or (can_offer_whatsapp and history_len >= 5)
        )
        if is_complete and not lead.get("completed_at"):
            lead["completed_at"] = datetime.now(timezone.utc).isoformat()

        # --- 6. Persist and respond ---------------------------------------
        await db.leads.update_one({"session_id": payload.session_id}, {"$set": lead})

        return ChatResponse(
            session_id=payload.session_id,
            message=ai_response,
            is_complete=is_complete,
            collected_data={
                "name":          lead.get("name", ""),
                "email":         lead.get("email", ""),
                "english_level": lead.get("english_level", ""),
                "goal":          lead.get("goal", ""),
                "urgency":       lead.get("urgency", ""),
            },
        )

    return router
