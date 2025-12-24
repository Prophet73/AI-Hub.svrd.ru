"""Chat schemas for API requests/responses."""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# Available models
AVAILABLE_MODELS = [
    {"id": "gemini-2.5-flash-lite", "name": "2.5 Flash Lite", "description": "Лёгкая экономичная модель"},
    {"id": "gemini-2.5-flash", "name": "2.5 Flash", "description": "Оптимизированная по скорости модель"},
    {"id": "gemini-2.5-pro", "name": "2.5 Pro", "description": "Продвинутая модель с расширенными возможностями"},
    {"id": "gemini-3-flash-preview", "name": "3 Flash", "description": "Быстрая модель для повседневных задач"},
    {"id": "gemini-3-pro-preview", "name": "3 Pro", "description": "Мощная модель для сложных задач"},
]


class ChatMessageRequest(BaseModel):
    """Request to send a message."""
    message: str = Field(..., min_length=1, max_length=32000)
    session_id: Optional[UUID] = None  # If None, new session created


class ChatMessageResponse(BaseModel):
    """Response with assistant message."""
    session_id: UUID
    role: str = "assistant"
    content: str
    created_at: datetime


class ChatHistoryItem(BaseModel):
    """Single message in chat history."""
    id: UUID
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSession(BaseModel):
    """Chat session with messages."""
    session_id: UUID
    messages: List[ChatHistoryItem]
    created_at: datetime


class ChatUsageInfo(BaseModel):
    """User's chat usage info."""
    messages_today: int
    daily_limit: int
    remaining: int


class ChatSettingsResponse(BaseModel):
    """Chat settings for admin."""
    id: int
    model_name: str
    system_prompt: str
    daily_message_limit: int
    max_tokens: int
    is_enabled: bool
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ChatSettingsUpdate(BaseModel):
    """Update chat settings."""
    model_name: Optional[str] = None
    system_prompt: Optional[str] = None
    daily_message_limit: Optional[int] = Field(None, ge=1, le=10000)
    max_tokens: Optional[int] = Field(None, ge=100, le=32000)
    is_enabled: Optional[bool] = None


class AvailableModel(BaseModel):
    """Available AI model."""
    id: str
    name: str
    description: str
