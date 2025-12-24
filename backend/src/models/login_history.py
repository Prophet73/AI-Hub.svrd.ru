import uuid
from sqlalchemy import Column, DateTime, String, Boolean, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..db.base import Base


class LoginHistory(Base):
    """Login history for tracking user authentication events."""

    __tablename__ = "login_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    login_type = Column(String(20), nullable=False)  # "sso", "dev", "oauth_authorize"
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    success = Column(Boolean, default=True)
    failure_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index("ix_login_history_user_id", "user_id"),
        Index("ix_login_history_login_type", "login_type"),
        Index("ix_login_history_created_at", "created_at"),
        Index("ix_login_history_success", "success"),
    )

    def __repr__(self) -> str:
        return f"<LoginHistory {self.login_type} user={self.user_id}>"
