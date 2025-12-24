import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, String, Text, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..db.base import Base


# Many-to-many: users <-> groups
user_group_members = Table(
    'user_group_members',
    Base.metadata,
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('group_id', UUID(as_uuid=True), ForeignKey('user_groups.id', ondelete='CASCADE'), primary_key=True),
    Column('added_at', DateTime(timezone=True), server_default=func.now()),
    Column('added_by', UUID(as_uuid=True), nullable=True),  # Removed FK to avoid ambiguity
)


class UserGroup(Base):
    """User groups for batch access management."""

    __tablename__ = "user_groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(Text)
    color = Column(String(7), default='#6366f1')  # Hex color for UI
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    # Relationships
    members = relationship(
        "User",
        secondary=user_group_members,
        back_populates="groups",
        lazy="selectin"
    )
    application_access = relationship("ApplicationAccess", back_populates="group", lazy="selectin")

    def __repr__(self) -> str:
        return f"<UserGroup {self.name}>"
