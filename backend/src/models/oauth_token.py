import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..db.base import Base


class OAuthCode(Base):
    """Temporary authorization code for OAuth2 flow."""

    __tablename__ = "oauth_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(100), unique=True, nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    application_id = Column(
        UUID(as_uuid=True),
        ForeignKey("applications.id"),
        nullable=False
    )
    redirect_uri = Column(String(500), nullable=False)
    scopes = Column(JSON, default=list)
    state = Column(String(255))
    # PKCE support (RFC 7636)
    code_challenge = Column(String(128), nullable=True)
    code_challenge_method = Column(String(10), nullable=True)  # "S256" or "plain"
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    used = Column(DateTime(timezone=True))  # Set when code is exchanged

    user = relationship("User")
    application = relationship("Application")


class OAuthToken(Base):
    """OAuth2 access/refresh tokens issued to applications."""

    __tablename__ = "oauth_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    application_id = Column(
        UUID(as_uuid=True),
        ForeignKey("applications.id"),
        nullable=False
    )
    access_token = Column(String(500), unique=True, nullable=False, index=True)
    refresh_token = Column(String(500), unique=True, index=True)
    scopes = Column(JSON, default=list)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    revoked_at = Column(DateTime(timezone=True))

    user = relationship("User")
    application = relationship("Application")

    @property
    def is_expired(self) -> bool:
        return datetime.now(self.expires_at.tzinfo) > self.expires_at

    @property
    def is_revoked(self) -> bool:
        return self.revoked_at is not None
