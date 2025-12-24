from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field


# ============ User Group Schemas ============

class UserGroupBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    color: str = Field(default='#6366f1', pattern=r'^#[0-9a-fA-F]{6}$')


class UserGroupCreate(UserGroupBase):
    member_ids: List[UUID] = []


class UserGroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9a-fA-F]{6}$')


class UserGroupMemberInfo(BaseModel):
    id: UUID
    email: str
    display_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    department: Optional[str] = None

    class Config:
        from_attributes = True


class UserGroupResponse(UserGroupBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    member_count: int = 0
    members: List[UserGroupMemberInfo] = []

    class Config:
        from_attributes = True


class UserGroupListResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    color: str
    member_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Application Access Schemas ============

class AccessGrantRequest(BaseModel):
    """Grant access to an application."""
    application_id: UUID
    user_ids: List[UUID] = []
    group_ids: List[UUID] = []


class AccessRevokeRequest(BaseModel):
    """Revoke access from an application."""
    application_id: UUID
    user_ids: List[UUID] = []
    group_ids: List[UUID] = []


class ApplicationAccessInfo(BaseModel):
    id: UUID
    application_id: UUID
    application_name: str
    granted_at: datetime
    access_type: str  # 'direct' or 'group'
    group_name: Optional[str] = None


class UserAccessResponse(BaseModel):
    user_id: UUID
    email: str
    display_name: Optional[str] = None
    applications: List[ApplicationAccessInfo] = []


class ApplicationAccessResponse(BaseModel):
    application_id: UUID
    application_name: str
    is_public: bool
    direct_users: List[UserGroupMemberInfo] = []
    groups: List[UserGroupListResponse] = []


# ============ Admin Stats Schemas ============

class AdminStatsResponse(BaseModel):
    users: dict
    applications: dict
    groups: dict
    tokens: dict
    database: dict
    generated_at: datetime


# ============ Admin User Management ============

class UserListResponse(BaseModel):
    id: UUID
    email: str
    display_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    is_active: bool
    is_admin: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    groups: List[str] = []  # Group names
    app_count: int = 0  # Number of accessible apps

    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class BulkUserActionRequest(BaseModel):
    user_ids: List[UUID]
    action: str  # 'activate', 'deactivate', 'make_admin', 'remove_admin'


class BulkGroupMembershipRequest(BaseModel):
    user_ids: List[UUID]
    group_id: UUID
    action: str  # 'add' or 'remove'
