from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, HttpUrl


class ApplicationBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    base_url: Optional[str] = None
    icon_url: Optional[str] = None
    redirect_uris: List[str] = []


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    base_url: Optional[str] = None
    icon_url: Optional[str] = None
    redirect_uris: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_public: Optional[bool] = None
    allowed_departments: Optional[List[str]] = None  # Empty = all, ["IT", "Finance"] = restricted


class ApplicationResponse(ApplicationBase):
    id: UUID
    client_id: str
    is_active: bool
    is_public: bool = False
    allowed_departments: List[str] = []  # Empty = all departments
    created_at: datetime

    class Config:
        from_attributes = True


class ApplicationWithSecret(ApplicationResponse):
    """Response with client_secret (only shown on creation)."""
    client_secret: str


class ApplicationListItem(BaseModel):
    """Minimal app info for portal dashboard."""
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    base_url: Optional[str] = None
    icon_url: Optional[str] = None
    allowed_departments: List[str] = []

    class Config:
        from_attributes = True
