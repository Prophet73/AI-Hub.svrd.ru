from datetime import datetime
from typing import Optional, Any
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


# ============== Tool Server Schemas ==============

class ToolServerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    base_url: str = Field(..., min_length=1, max_length=500)
    health_check_endpoint: str = "/health"
    timeout_seconds: int = Field(default=30, ge=5, le=300)
    is_active: bool = True


class ToolServerCreate(ToolServerBase):
    pass


class ToolServerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    base_url: Optional[str] = Field(None, min_length=1, max_length=500)
    health_check_endpoint: Optional[str] = None
    timeout_seconds: Optional[int] = Field(None, ge=5, le=300)
    is_active: Optional[bool] = None


class ToolServerResponse(ToolServerBase):
    id: UUID
    api_key: str
    is_healthy: bool
    last_health_check: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ToolServerListResponse(BaseModel):
    id: UUID
    name: str
    base_url: str
    is_active: bool
    is_healthy: bool
    last_health_check: Optional[datetime] = None
    tools_count: int = 0

    class Config:
        from_attributes = True


# ============== Tool Schemas ==============

class ToolBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=100, pattern=r'^[a-z0-9-]+$')
    description: Optional[str] = None
    icon: str = "Wrench"
    color: str = "#6366F1"
    server_id: Optional[UUID] = None
    endpoint: Optional[str] = None
    http_method: str = "POST"
    request_schema: Optional[dict] = None
    response_type: str = "json"
    is_active: bool = True
    is_public: bool = True
    allowed_departments: list[str] = []
    sort_order: int = 0


class ToolCreate(ToolBase):
    pass


class ToolUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    slug: Optional[str] = Field(None, min_length=1, max_length=100, pattern=r'^[a-z0-9-]+$')
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    server_id: Optional[UUID] = None
    endpoint: Optional[str] = None
    http_method: Optional[str] = None
    request_schema: Optional[dict] = None
    response_type: Optional[str] = None
    is_active: Optional[bool] = None
    is_public: Optional[bool] = None
    allowed_departments: Optional[list[str]] = None
    sort_order: Optional[int] = None


class ToolResponse(ToolBase):
    id: UUID
    usage_count: int
    last_used_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    server: Optional[ToolServerListResponse] = None

    class Config:
        from_attributes = True


class ToolPublicResponse(BaseModel):
    """Public tool info for regular users."""
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    icon: str
    color: str
    is_available: bool = True  # True if server is healthy or no server needed

    class Config:
        from_attributes = True


# ============== Tool Execution Schemas ==============

class ToolExecuteRequest(BaseModel):
    """Request to execute a tool."""
    input_data: Optional[dict] = None


class ToolExecutionResponse(BaseModel):
    id: UUID
    tool_id: UUID
    user_id: UUID
    status: str
    input_data: Optional[dict] = None
    output_data: Optional[dict] = None
    error_message: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None

    class Config:
        from_attributes = True


class ToolExecutionListResponse(BaseModel):
    id: UUID
    tool_name: str
    user_email: str
    status: str
    started_at: datetime
    duration_ms: Optional[int] = None

    class Config:
        from_attributes = True
