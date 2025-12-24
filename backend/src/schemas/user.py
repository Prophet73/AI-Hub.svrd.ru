from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    display_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None


class UserResponse(UserBase):
    id: UUID
    sso_id: str
    ad_groups: List[str] = []
    is_active: bool
    is_admin: bool
    is_super_admin: bool = False
    last_login_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserInfoResponse(BaseModel):
    """OAuth2 /userinfo response (OpenID Connect)."""
    sub: str  # user id
    email: str
    name: Optional[str] = None
    preferred_username: Optional[str] = None
    groups: List[str] = []
