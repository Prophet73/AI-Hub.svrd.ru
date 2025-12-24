from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class PromptBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    prompt_text: str
    icon: Optional[str] = None
    sort_order: int = 0


class PromptCreate(PromptBase):
    pass


class PromptUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    prompt_text: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class PromptResponse(PromptBase):
    id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PromptListItem(BaseModel):
    """Minimal prompt info for services page."""
    id: UUID
    name: str
    description: Optional[str] = None
    category: str
    icon: Optional[str] = None

    class Config:
        from_attributes = True
