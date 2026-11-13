from __future__ import annotations

import os
import uuid
from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from chatbot_logic.graph import invoke_once


app = FastAPI(title="Chat Bot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    # Comma-separated list of allowed frontend origins, e.g. "http://localhost:5173"
    allow_origins=[o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str = Field(..., description="user|assistant")
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    history: Optional[List[ChatMessage]] = None


class ChatResponse(BaseModel):
    conversation_id: str
    answer: str


@app.get("/healthz")
def healthz() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> Any:
    conversation_id = req.conversation_id or str(uuid.uuid4())
    history_msgs = []
    for m in (req.history or []):
        if m.role == "user":
            from langchain_core.messages import HumanMessage

            history_msgs.append(HumanMessage(content=m.content))
        elif m.role == "assistant":
            from langchain_core.messages import AIMessage

            history_msgs.append(AIMessage(content=m.content))

    answer, _updated = invoke_once(req.message, history=history_msgs)
    return ChatResponse(conversation_id=conversation_id, answer=answer)

