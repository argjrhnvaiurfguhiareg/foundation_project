from __future__ import annotations

import hashlib
import json
import os
import re
import sqlite3
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import solution as core

load_dotenv()

STATE: Dict[str, Any] = {
    "index": None,
    "docs": {},
    "by_name": {},
}

DB_PATH = Path(os.getenv("CHATS_DB_PATH", "data/chats.db"))


def get_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS chats (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                subtitle TEXT NOT NULL DEFAULT 'Юридическая консультация',
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chat_id TEXT NOT NULL,
                role TEXT NOT NULL,
                text TEXT NOT NULL,
                time_str TEXT NOT NULL,
                sources_json TEXT NOT NULL DEFAULT '[]',
                created_at REAL NOT NULL,
                FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
            );
            """
        )





def make_doc_id(name: str) -> str:
    return hashlib.md5(name.encode("utf-8")).hexdigest()[:10]


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    kb = core.find_file("kb.zip", "knowledge-base.zip", "knowledge_base.zip")
    docs = core.load_documents(kb)
    parents, children = core.build_chunks(docs)
    index = core.build_hybrid_index(parents, children)

    reg: Dict[str, Dict[str, Any]] = {}
    by_name: Dict[str, str] = {}

    for fn, text in docs:
        name = Path(fn).stem.replace("_", " ").replace("/", " ").strip()
        did = make_doc_id(name)
        raw_sections = core._kb_sections(text)
        sections_list = []
        for crumb, body in raw_sections:
            header = f"{name} > {crumb}" if crumb else name
            sections_list.append({"header": header, "text": body})

        if not sections_list:
            sections_list.append({"header": name, "text": text})

        reg[did] = {
            "id": did,
            "doc_name": name,
            "title": name,
            "date": "2026",
            "edition": "Действующая редакция",
            "filename": fn,
            "sections": sections_list,
        }
        by_name[name] = did
        by_name[name.lower()] = did


    STATE["index"] = index
    STATE["docs"] = reg
    STATE["by_name"] = by_name
    print("[startup] документов:", len(reg), "чанков:", len(children), flush=True)
    yield
    STATE["index"] = None
    STATE["docs"] = {}
    STATE["by_name"] = {}



app = FastAPI(title="Право AI API", version="1.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HistoryMessage(BaseModel):
    role: Optional[str] = None
    sender: Optional[str] = None
    text: str


class ChatCreateRequest(BaseModel):
    title: Optional[str] = "Новый диалог"
    subtitle: Optional[str] = "Юридическая консультация"


class ChatRequest(BaseModel):
    chat_id: Optional[str] = None
    message: str = Field(..., min_length=1, max_length=4000)
    history: List[HistoryMessage] = Field(default_factory=list)


@app.get("/api/health")
def health() -> Dict[str, Any]:
    i = STATE.get("index")
    return {
        "status": "ok",
        "documents": len(STATE.get("docs", {})),
        "chunks": len(i.children) if i else 0,
        "vector_search": bool(i and i.faiss_index is not None),
    }


@app.get("/api/chats")
def list_chats() -> Dict[str, List[Dict[str, Any]]]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, title, subtitle, created_at, updated_at FROM chats ORDER BY updated_at DESC"
        ).fetchall()
    return {"chats": [dict(r) for r in rows]}


@app.post("/api/chats")
def create_chat(req: ChatCreateRequest) -> Dict[str, Any]:
    chat_id = str(uuid.uuid4())
    now = time.time()
    title = (req.title or "Новый диалог").strip()
    subtitle = (req.subtitle or "Юридическая консультация").strip()

    with get_db() as conn:
        conn.execute(
            "INSERT INTO chats (id, title, subtitle, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (chat_id, title, subtitle, now, now),
        )
    return {
        "id": chat_id,
        "title": title,
        "subtitle": subtitle,
        "created_at": now,
        "updated_at": now,
        "messages": [],
    }


@app.get("/api/chats/{chat_id}")
def get_chat(chat_id: str) -> Dict[str, Any]:
    with get_db() as conn:
        chat = conn.execute(
            "SELECT id, title, subtitle, created_at, updated_at FROM chats WHERE id = ?",
            (chat_id,),
        ).fetchone()
        if not chat:
            raise HTTPException(status_code=404, detail="Диалог не найден")

        rows = conn.execute(
            "SELECT id, role, text, time_str, sources_json FROM messages WHERE chat_id = ? ORDER BY id ASC",
            (chat_id,),
        ).fetchall()

    messages = [
        {
            "id": r["id"],
            "role": r["role"],
            "text": r["text"],
            "time": r["time_str"],
            "sources": json.loads(r["sources_json"] or "[]"),
        }
        for r in rows
    ]

    result = dict(chat)
    result["messages"] = messages
    return result


@app.delete("/api/chats/{chat_id}")
def delete_chat(chat_id: str) -> Dict[str, str]:
    with get_db() as conn:
        cursor = conn.execute("DELETE FROM chats WHERE id = ?", (chat_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Диалог не найден")
    return {"status": "deleted", "id": chat_id}


@app.get("/api/documents/{did}")
def get_document(did: str) -> Dict[str, Any]:
    d = STATE.get("docs", {}).get(did)
    if not d:
        raise HTTPException(status_code=404, detail="Документ не найден")
    return d


def _make_chat_title(text: str) -> str:
    cleaned = " ".join(text.strip().split())
    return cleaned if len(cleaned) <= 44 else f"{cleaned[:41]}..."


@app.post("/api/chat")
def chat(req: ChatRequest) -> Dict[str, Any]:
    index = STATE.get("index")
    if index is None:
        raise HTTPException(status_code=503, detail="Индекс базы знаний ещё не загружен")

    msg = (req.message or "").strip()
    if not msg:
        raise HTTPException(status_code=400, detail="Пустой вопрос")

    now = time.time()
    time_str = time.strftime("%H:%M")

    with get_db() as conn:
        chat_id = req.chat_id
        chat_row = None

        if chat_id:
            chat_row = conn.execute("SELECT id, title FROM chats WHERE id = ?", (chat_id,)).fetchone()

        if not chat_row:
            chat_id = str(uuid.uuid4())
            title = _make_chat_title(msg)
            conn.execute(
                "INSERT INTO chats (id, title, subtitle, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (chat_id, title, "Юридическая консультация", now, now),
            )
        else:
            msg_count = conn.execute(
                "SELECT COUNT(*) AS cnt FROM messages WHERE chat_id = ?", (chat_id,)
            ).fetchone()["cnt"]
            title = _make_chat_title(msg) if msg_count == 0 else chat_row["title"]
            conn.execute(
                "UPDATE chats SET title = ?, updated_at = ? WHERE id = ?",
                (title, now, chat_id),
            )

        conn.execute(
            "INSERT INTO messages (chat_id, role, text, time_str, sources_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (chat_id, "user", msg, time_str, "[]", now),
        )

    # Формируем контекст диалога для query rewrite в solution.py
    q = msg
    if req.history:
        lines = []
        for m in req.history[-6:]:
            is_user = (m.role == "user") or (m.sender == "user")
            role_label = "Пользователь" if is_user else "Ассистент"
            t = (m.text or "").strip()
            if t:
                lines.append(f"{role_label}: {t}")
        lines.append(f"Пользователь: {msg}")
        q = "\n".join(lines)

    with httpx.Client(timeout=180.0) as client:
        chunks = core.retrieve_context(client, q, index)
        answer = core.generate_answer(client, q, chunks)

    sources: List[Dict[str, str]] = []
    seen = set()
    for idx, ch in enumerate(chunks):
        did = (
            STATE["by_name"].get(ch.doc_name)
            or STATE["by_name"].get(ch.doc_name.lower())
            or make_doc_id(ch.doc_name)
        )
        if did not in STATE["docs"]:
            STATE["docs"][did] = {
                "id": did,
                "doc_name": ch.doc_name,
                "title": ch.doc_name,
                "filename": ch.doc_name,
                "content": ch.text,
            }

        key = (did, ch.header)
        if key not in seen:
            seen.add(key)
            tail = ch.header.split(">")[-1].strip()
            article = tail if tail and tail != ch.doc_name else "Основной текст"
            clean_quote = re.sub(r"^\[Документ:[^\]]+\]\s*", "", ch.text).strip()
            sources.append(
                {
                    "id": f"{did}-{idx}",
                    "docId": did,
                    "title": ch.doc_name,
                    "article": article,
                    "header": ch.header,
                    "quote": clean_quote[:450] + ("..." if len(clean_quote) > 450 else ""),
                }
            )


    with get_db() as conn:
        conn.execute(
            "INSERT INTO messages (chat_id, role, text, time_str, sources_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (chat_id, "ai", answer, time_str, json.dumps(sources, ensure_ascii=False), time.time()),
        )
        conn.execute("UPDATE chats SET updated_at = ? WHERE id = ?", (time.time(), chat_id))

    return {
        "chat_id": chat_id,
        "title": title,
        "answer": answer,
        "sources": sources,
    }

