import secrets
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..db.base import Base


def generate_api_key() -> str:
    """Generate a random API key for tool server."""
    return f"tsrv_{secrets.token_urlsafe(32)}"


class ToolServer(Base):
    """Tool Server - remote machine that hosts tools."""

    __tablename__ = "tool_servers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Connection settings
    base_url = Column(String(500), nullable=False)  # e.g., https://tools.company.ru
    api_key = Column(String(255), nullable=False, default=generate_api_key)  # For auth
    health_check_endpoint = Column(String(255), default="/health")  # Health check path
    timeout_seconds = Column(Integer, default=30)  # Request timeout

    # Status
    is_active = Column(Boolean, default=True)
    is_healthy = Column(Boolean, default=False)
    last_health_check = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    tools = relationship("Tool", back_populates="server", lazy="selectin")

    def __repr__(self) -> str:
        return f"<ToolServer {self.name}>"


class Tool(Base):
    """Tool - utility that can be invoked via webhook."""

    __tablename__ = "tools"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Display settings
    icon = Column(String(50), default="Wrench")  # Lucide icon name
    color = Column(String(20), default="#6366F1")  # Hex color

    # Server connection
    server_id = Column(UUID(as_uuid=True), ForeignKey("tool_servers.id"), nullable=True)
    endpoint = Column(String(255), nullable=True)  # e.g., /api/v1/pdf-to-excel
    http_method = Column(String(10), default="POST")  # POST, GET, etc.

    # Configuration
    request_schema = Column(JSON, nullable=True)  # JSON Schema for input validation
    response_type = Column(String(50), default="json")  # json, file, stream

    # Access control
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=True)  # Visible to all users
    allowed_departments = Column(JSON, default=list)  # Empty = all departments

    # Statistics
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    # Ordering
    sort_order = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    server = relationship("ToolServer", back_populates="tools")

    def __repr__(self) -> str:
        return f"<Tool {self.name}>"


class ToolExecution(Base):
    """Tool execution log."""

    __tablename__ = "tool_executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tool_id = Column(UUID(as_uuid=True), ForeignKey("tools.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Execution details
    status = Column(String(20), default="pending")  # pending, running, completed, failed
    input_data = Column(JSON, nullable=True)  # Sanitized input (no files)
    output_data = Column(JSON, nullable=True)  # Response metadata
    error_message = Column(Text, nullable=True)

    # Timing
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_ms = Column(Integer, nullable=True)

    # Relationships
    tool = relationship("Tool")
    user = relationship("User")

    def __repr__(self) -> str:
        return f"<ToolExecution {self.tool_id} by {self.user_id}>"
