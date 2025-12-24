"""SSO Service - integration with ADFS via OIDC."""
import secrets
from datetime import datetime, timezone
from typing import Optional, Tuple
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..models.user import User


class OIDCConfig:
    """Cached OIDC configuration from discovery endpoint."""

    def __init__(self):
        self._config: Optional[dict] = None
        self._loaded_at: Optional[datetime] = None

    async def get_config(self) -> dict:
        """Fetch OIDC configuration (cached for 1 hour)."""
        now = datetime.now(timezone.utc)

        if self._config and self._loaded_at:
            age = (now - self._loaded_at).total_seconds()
            if age < 3600:  # Cache for 1 hour
                return self._config

        async with httpx.AsyncClient() as client:
            response = await client.get(settings.OIDC_DISCOVERY_URL)
            response.raise_for_status()
            self._config = response.json()
            self._loaded_at = now
            return self._config

    async def get_authorization_endpoint(self) -> str:
        config = await self.get_config()
        return config["authorization_endpoint"]

    async def get_token_endpoint(self) -> str:
        config = await self.get_config()
        return config["token_endpoint"]

    async def get_userinfo_endpoint(self) -> str:
        config = await self.get_config()
        return config.get("userinfo_endpoint", "")


oidc_config = OIDCConfig()


class SSOService:
    """Service for SSO authentication via ADFS/OIDC."""

    @staticmethod
    def generate_state() -> str:
        """Generate random state for CSRF protection."""
        return secrets.token_urlsafe(32)

    @staticmethod
    async def get_authorization_url(state: str) -> str:
        """Build ADFS authorization URL."""
        auth_endpoint = await oidc_config.get_authorization_endpoint()

        params = {
            "client_id": settings.OIDC_CLIENT_ID,
            "response_type": "code",
            "scope": settings.OIDC_SCOPES,
            "redirect_uri": settings.OIDC_REDIRECT_URI,
            "state": state,
        }

        return f"{auth_endpoint}?{urlencode(params)}"

    @staticmethod
    async def exchange_code_for_tokens(code: str) -> dict:
        """Exchange authorization code for tokens."""
        token_endpoint = await oidc_config.get_token_endpoint()

        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.OIDC_REDIRECT_URI,
            "client_id": settings.OIDC_CLIENT_ID,
            "client_secret": settings.OIDC_CLIENT_SECRET,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_endpoint,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            response.raise_for_status()
            return response.json()

    @staticmethod
    async def get_user_info(access_token: str) -> dict:
        """Get user info from ADFS userinfo endpoint."""
        userinfo_endpoint = await oidc_config.get_userinfo_endpoint()

        if not userinfo_endpoint:
            # ADFS may not have userinfo, parse from id_token instead
            return {}

        async with httpx.AsyncClient() as client:
            response = await client.get(
                userinfo_endpoint,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            response.raise_for_status()
            return response.json()

    @staticmethod
    def parse_id_token_claims(id_token: str) -> dict:
        """Parse claims from ID token (without verification for now)."""
        import base64
        import json

        # Split JWT: header.payload.signature
        parts = id_token.split(".")
        if len(parts) != 3:
            return {}

        # Decode payload (add padding if needed)
        payload = parts[1]
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += "=" * padding

        try:
            decoded = base64.urlsafe_b64decode(payload)
            return json.loads(decoded)
        except Exception:
            return {}

    @staticmethod
    async def get_or_create_user(
        db: AsyncSession,
        sso_id: str,
        email: str,
        display_name: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        middle_name: Optional[str] = None,
        department: Optional[str] = None,
        job_title: Optional[str] = None,
        ad_groups: Optional[list] = None,
    ) -> Tuple[User, bool]:
        """
        Get existing user or create new one.
        Returns (user, created) tuple.
        """
        # Try to find by sso_id first
        result = await db.execute(
            select(User).where(User.sso_id == sso_id)
        )
        user = result.scalar_one_or_none()

        if user:
            # Update user info from AD
            user.email = email
            user.display_name = display_name or user.display_name
            user.first_name = first_name or user.first_name
            user.last_name = last_name or user.last_name
            user.middle_name = middle_name or user.middle_name
            user.department = department or user.department
            user.job_title = job_title or user.job_title
            if ad_groups is not None:
                user.ad_groups = ad_groups
            user.last_login_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(user)
            return user, False

        # Create new user
        user = User(
            sso_id=sso_id,
            email=email,
            display_name=display_name,
            first_name=first_name,
            last_name=last_name,
            middle_name=middle_name,
            department=department,
            job_title=job_title,
            ad_groups=ad_groups or [],
            last_login_at=datetime.now(timezone.utc),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user, True


sso_service = SSOService()
