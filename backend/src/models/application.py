import secrets
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..db.base import Base


def generate_client_id() -> str:
    """Generate a random client_id."""
    return f"hub_{secrets.token_urlsafe(16)}"


def generate_client_secret() -> str:
    """Generate a random client_secret."""
    return secrets.token_urlsafe(32)


class Application(Base):
    """Application model - registered OAuth2 client applications."""

    __tablename__ = "applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    client_id = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        default=generate_client_id
    )
    client_secret_hash = Column(String(255), nullable=False)
    redirect_uris = Column(JSON, default=list)
    icon_url = Column(String(500))
    description = Column(String(1000))
    base_url = Column(String(500))
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=False)  # Legacy: use allowed_departments instead

    # Access control by department (from ADFS)
    # Empty list = available to all, ["IT", "Finance"] = only these departments
    allowed_departments = Column(JSON, default=list)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    # Relationships
    access_rules = relationship("ApplicationAccess", back_populates="application", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Application {self.name}>"
