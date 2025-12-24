import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..db.base import Base


class ApplicationAccess(Base):
    """
    Access control: links users or groups to applications.

    Either user_id OR group_id must be set (not both, not neither).
    """

    __tablename__ = "application_access"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # One of these must be set
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=True, index=True)
    group_id = Column(UUID(as_uuid=True), ForeignKey('user_groups.id', ondelete='CASCADE'), nullable=True, index=True)

    # Target application
    application_id = Column(UUID(as_uuid=True), ForeignKey('applications.id', ondelete='CASCADE'), nullable=False, index=True)

    # Audit
    granted_at = Column(DateTime(timezone=True), server_default=func.now())
    granted_by = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    # Constraints
    __table_args__ = (
        # Either user_id or group_id must be set, but not both
        CheckConstraint(
            '(user_id IS NOT NULL AND group_id IS NULL) OR (user_id IS NULL AND group_id IS NOT NULL)',
            name='check_user_or_group'
        ),
        # Unique access per user-app or group-app pair
        UniqueConstraint('user_id', 'application_id', name='unique_user_app_access'),
        UniqueConstraint('group_id', 'application_id', name='unique_group_app_access'),
    )

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="application_access")
    group = relationship("UserGroup", back_populates="application_access")
    application = relationship("Application", back_populates="access_rules")
    granted_by_user = relationship("User", foreign_keys=[granted_by])

    def __repr__(self) -> str:
        target = f"user={self.user_id}" if self.user_id else f"group={self.group_id}"
        return f"<ApplicationAccess {target} -> app={self.application_id}>"
