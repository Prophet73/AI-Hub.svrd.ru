"""Chat models - settings and usage tracking for AI chat."""
import uuid
from datetime import datetime, date

from sqlalchemy import Boolean, Column, DateTime, String, Integer, Date, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from ..db.base import Base


class ChatSettings(Base):
    """Global chat settings - singleton table with one row."""

    __tablename__ = "chat_settings"

    id = Column(Integer, primary_key=True, default=1)

    # Model settings
    model_name = Column(String(100), default="gemini-3-flash-preview")
    system_prompt = Column(Text, default="Ты корпоративный AI-ассистент SeverinGPT. Отвечай на русском языке, будь полезным и профессиональным.")

    # Limits
    daily_message_limit = Column(Integer, default=100)  # Per user per day
    max_tokens = Column(Integer, default=8192)  # Max response tokens

    # Status
    is_enabled = Column(Boolean, default=True)

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)


class ChatUsage(Base):
    """Track daily chat usage per user."""

    __tablename__ = "chat_usage"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    usage_date = Column(Date, nullable=False, index=True, default=date.today)
    message_count = Column(Integer, default=0)

    # Unique constraint: one record per user per day
    __table_args__ = (
        {"sqlite_autoincrement": True},
    )


class ChatMessage(Base):
    """Store chat messages for history."""

    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    session_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # Group messages by session
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    model_name = Column(String(100), nullable=True)  # Model used for response
    input_tokens = Column(Integer, nullable=True)  # Tokens in prompt
    output_tokens = Column(Integer, nullable=True)  # Tokens in response
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# Model pricing per 1M tokens (in USD)
MODEL_PRICING = {
    "gemini-2.5-flash-lite": {"input": 0.10, "output": 0.40},
    "gemini-2.5-flash": {"input": 0.30, "output": 2.50},
    "gemini-2.5-pro": {"input": 1.25, "output": 10.00},
    "gemini-3-flash-preview": {"input": 0.50, "output": 3.00},
    "gemini-3-pro-preview": {"input": 2.00, "output": 12.00},
}


def calculate_cost(model_name: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost in USD for given token usage."""
    pricing = MODEL_PRICING.get(model_name, {"input": 0.10, "output": 0.40})  # Default to flash pricing
    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]
    return input_cost + output_cost
