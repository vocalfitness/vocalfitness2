"""Messages — member/admin two-way chat.

Endpoints:

* ``GET    /admin/messages/conversations``          — admin: list all conversations w/ unread counts
* ``GET    /admin/messages/{user_id}``              — admin: fetch messages w/ a specific user
* ``POST   /admin/messages``                        — admin: send message to a user
* ``GET    /members/messages``                      — client: fetch own messages w/ admin
* ``POST   /members/messages``                      — client: send message to admin
* ``GET    /members/messages/unread-count``         — client: unread count
* ``POST   /members/messages/{msg_id}/complete-task`` — client: mark task as done
* ``DELETE /admin/messages/{msg_id}``               — admin: delete own message
* ``DELETE /messages/{msg_id}``                     — client: delete own message

The router receives ``get_conversation_id`` (deterministic hash of both
user ids) and ``send_notification_email`` (SMTP notifier) via the factory
so it stays free of ``server.py`` internals.
"""

from __future__ import annotations

import threading
import uuid
from datetime import datetime, timezone
from typing import Callable

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel


# --------------------------------------------------------------------------- #
# Models
# --------------------------------------------------------------------------- #
class MessageCreate(BaseModel):
    recipient_id: str
    content: str = ""
    content_html: str = ""
    message_type: str = "text"          # "text", "audio", "video", "task", "file"
    media_url: str = ""
    embed_code: str = ""
    task_description: str = ""
    task_due_date: str = ""
    file_name: str = ""


# --------------------------------------------------------------------------- #
# Router factory
# --------------------------------------------------------------------------- #
def build_messages_router(
    db,
    get_admin_user: Callable,
    get_current_user: Callable,
    get_conversation_id: Callable[[str, str], str],
    send_notification_email: Callable,
) -> APIRouter:
    router = APIRouter()

    # ---- ADMIN ---- #
    @router.get("/admin/messages/conversations")
    async def get_admin_conversations(admin: dict = Depends(get_admin_user)):
        """Get all conversations for admin."""
        admin_id = admin["id"]
        pipeline = [
            {"$match": {"$or": [{"sender_id": admin_id}, {"recipient_id": admin_id}]}},
            {"$sort": {"created_at": -1}},
            {"$group": {
                "_id": "$conversation_id",
                "last_message": {"$first": "$$ROOT"},
                "unread_count": {"$sum": {"$cond": [
                    {"$and": [{"$eq": ["$recipient_id", admin_id]}, {"$eq": ["$read", False]}]}, 1, 0]}},
            }},
            {"$sort": {"last_message.created_at": -1}},
        ]
        conversations = await db.messages.aggregate(pipeline).to_list(100)
        result = []
        for conv in conversations:
            msg = conv["last_message"]
            msg.pop("_id", None)
            partner_id = msg["sender_id"] if msg["sender_id"] != admin_id else msg["recipient_id"]
            partner = await db.users.find_one({"id": partner_id}, {"_id": 0, "hashed_password": 0})
            result.append({
                "conversation_id": conv["_id"],
                "partner": partner,
                "last_message": msg,
                "unread_count": conv["unread_count"],
            })
        return result

    @router.get("/admin/messages/{user_id}")
    async def get_admin_messages_with_user(user_id: str, admin: dict = Depends(get_admin_user)):
        """Get all messages between admin and a specific user."""
        admin_id = admin["id"]
        conv_id = get_conversation_id(admin_id, user_id)
        messages = await db.messages.find(
            {"conversation_id": conv_id}, {"_id": 0},
        ).sort("created_at", 1).to_list(500)
        await db.messages.update_many(
            {"conversation_id": conv_id, "recipient_id": admin_id, "read": False},
            {"$set": {"read": True}},
        )
        return messages

    @router.post("/admin/messages")
    async def send_admin_message(msg: MessageCreate, admin: dict = Depends(get_admin_user)):
        """Send a message from admin to a user."""
        admin_id = admin["id"]
        recipient = await db.users.find_one({"id": msg.recipient_id}, {"_id": 0, "hashed_password": 0})
        if not recipient:
            raise HTTPException(status_code=404, detail="Destinatario non trovato")

        conv_id = get_conversation_id(admin_id, msg.recipient_id)
        message_doc = {
            "id":              str(uuid.uuid4()),
            "conversation_id": conv_id,
            "sender_id":       admin_id,
            "sender_name":     admin.get("full_name") or admin.get("username", "Admin"),
            "recipient_id":    msg.recipient_id,
            "content":         msg.content,
            "content_html":    msg.content_html,
            "message_type":    msg.message_type,
            "media_url":       msg.media_url,
            "embed_code":      msg.embed_code,
            "task_description": msg.task_description,
            "task_due_date":   msg.task_due_date,
            "task_completed":  False,
            "file_name":       msg.file_name,
            "read":            False,
            "created_at":      datetime.now(timezone.utc),
        }
        await db.messages.insert_one(message_doc)
        message_doc.pop("_id", None)

        # Fire-and-forget email notification
        threading.Thread(target=send_notification_email, args=(
            recipient.get("email", ""),
            admin.get("full_name") or "VocalFitness Admin",
            msg.content or msg.task_description or f"Nuovo {msg.message_type}",
            msg.message_type,
            msg.content_html,
        )).start()

        return message_doc

    @router.delete("/admin/messages/{message_id}")
    async def delete_admin_message(message_id: str, admin: dict = Depends(get_admin_user)):
        """Delete a message sent by admin."""
        result = await db.messages.delete_one({"id": message_id, "sender_id": admin["id"]})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Messaggio non trovato o non autorizzato")
        return {"message": "Messaggio eliminato"}

    # ---- MEMBER ---- #
    @router.get("/members/messages")
    async def get_member_messages(current_user: dict = Depends(get_current_user)):
        """Get all messages for the current user (with admin)."""
        user_id = current_user["id"]
        admin_user = await db.users.find_one({"role": "admin"}, {"_id": 0, "id": 1})
        if not admin_user:
            return []
        admin_id = admin_user["id"]
        conv_id = get_conversation_id(admin_id, user_id)
        messages = await db.messages.find(
            {"conversation_id": conv_id}, {"_id": 0},
        ).sort("created_at", 1).to_list(500)
        await db.messages.update_many(
            {"conversation_id": conv_id, "recipient_id": user_id, "read": False},
            {"$set": {"read": True}},
        )
        return messages

    @router.post("/members/messages")
    async def send_member_message(msg: MessageCreate, current_user: dict = Depends(get_current_user)):
        """Send a message from client to admin."""
        user_id = current_user["id"]
        admin_user = await db.users.find_one({"role": "admin"}, {"_id": 0})
        if not admin_user:
            raise HTTPException(status_code=404, detail="Admin non trovato")

        conv_id = get_conversation_id(admin_user["id"], user_id)
        message_doc = {
            "id":              str(uuid.uuid4()),
            "conversation_id": conv_id,
            "sender_id":       user_id,
            "sender_name":     current_user.get("full_name") or current_user.get("username", ""),
            "recipient_id":    admin_user["id"],
            "content":         msg.content,
            "content_html":    msg.content_html,
            "message_type":    msg.message_type,
            "media_url":       msg.media_url,
            "embed_code":      msg.embed_code,
            "task_description": msg.task_description,
            "task_due_date":   msg.task_due_date,
            "task_completed":  False,
            "file_name":       msg.file_name,
            "read":            False,
            "created_at":      datetime.now(timezone.utc),
        }
        await db.messages.insert_one(message_doc)
        message_doc.pop("_id", None)

        threading.Thread(target=send_notification_email, args=(
            admin_user.get("email", ""),
            current_user.get("full_name") or current_user.get("username", "Cliente"),
            msg.content or f"Nuovo {msg.message_type}",
            msg.message_type,
            msg.content_html,
        )).start()

        return message_doc

    @router.get("/members/messages/unread-count")
    async def get_member_unread_count(current_user: dict = Depends(get_current_user)):
        """Unread message count for the current user."""
        count = await db.messages.count_documents({"recipient_id": current_user["id"], "read": False})
        return {"unread_count": count}

    @router.post("/members/messages/{message_id}/complete-task")
    async def complete_task(message_id: str, current_user: dict = Depends(get_current_user)):
        """Mark a task-type message as completed."""
        result = await db.messages.update_one(
            {"id": message_id, "recipient_id": current_user["id"], "message_type": "task"},
            {"$set": {"task_completed": True}},
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Compito non trovato")
        return {"message": "Compito completato"}

    @router.delete("/messages/{message_id}")
    async def delete_member_message(message_id: str, current_user: dict = Depends(get_current_user)):
        """Delete a message sent by member."""
        result = await db.messages.delete_one({"id": message_id, "sender_id": current_user["id"]})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Messaggio non trovato o non autorizzato")
        return {"message": "Messaggio eliminato"}

    return router
