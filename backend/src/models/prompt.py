import uuid
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from ..db.base import Base


class Prompt(Base):
    """Prompt model - pre-made prompts for AI assistant."""

    __tablename__ = "prompts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=True)
    category = Column(String(100), nullable=False, index=True)
    prompt_text = Column(Text, nullable=False)
    icon = Column(String(100), nullable=True)  # Lucide icon name
    is_active = Column(Boolean, default=True, index=True)
    sort_order = Column(Integer, default=0)
    usage_count = Column(Integer, default=0)  # Track how many times prompt was used
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<Prompt {self.name}>"
