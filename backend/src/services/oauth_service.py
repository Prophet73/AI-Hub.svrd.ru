"""OAuth2 Provider Service - issues tokens to client applications."""
import base64
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.security import create_oauth_access_token
from ..models.application import Application
from ..models.oauth_token import OAuthCode, OAuthToken
from ..models.user import User


class OAuthService:
    """Service for OAuth2 provider functionality."""

    @staticmethod
    def hash_secret(secret: str) -> str:
        """Hash client secret using SHA256."""
        return hashlib.sha256(secret.encode()).hexdigest()

    @staticmethod
    def verify_secret(secret: str, hashed: str) -> bool:
        """Verify client secret against hash."""
        return hashlib.sha256(secret.encode()).hexdigest() == hashed

    @staticmethod
    def generate_code() -> str:
        """Generate authorization code."""
        return secrets.token_urlsafe(32)

    @staticmethod
    def verify_pkce(
        code_verifier: str,
        code_challenge: str,
        code_challenge_method: str
    ) -> bool:
        """
        Verify PKCE code_verifier against stored code_challenge.

        RFC 7636:
        - S256: BASE64URL(SHA256(code_verifier)) == code_challenge
        - plain: code_verifier == code_challenge
        """
        if code_challenge_method == "S256":
            # SHA256 hash of verifier, then base64url encode (no padding)
            digest = hashlib.sha256(code_verifier.encode('ascii')).digest()
            computed = base64.urlsafe_b64encode(digest).rstrip(b'=').decode('ascii')
            return computed == code_challenge
        elif code_challenge_method == "plain":
            return code_verifier == code_challenge
        return False

    @staticmethod
    async def get_application_by_client_id(
        db: AsyncSession,
        client_id: str
    ) -> Optional[Application]:
        """Get active application by client_id."""
        result = await db.execute(
            select(Application).where(
                Application.client_id == client_id,
                Application.is_active == True
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def validate_redirect_uri(
        application: Application,
        redirect_uri: str
    ) -> bool:
        """Check if redirect_uri is allowed for this application."""
        return redirect_uri in (application.redirect_uris or [])

    @staticmethod
    async def create_authorization_code(
        db: AsyncSession,
        user: User,
        application: Application,
        redirect_uri: str,
        scopes: list[str],
        state: Optional[str] = None,
        code_challenge: Optional[str] = None,
        code_challenge_method: Optional[str] = None,
    ) -> str:
        """Create and store authorization code with optional PKCE support."""
        code = OAuthService.generate_code()

        oauth_code = OAuthCode(
            code=code,
            user_id=user.id,
            application_id=application.id,
            redirect_uri=redirect_uri,
            scopes=scopes,
            state=state,
            code_challenge=code_challenge,
            code_challenge_method=code_challenge_method,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
        db.add(oauth_code)
        await db.commit()

        return code

    @staticmethod
    async def exchange_code_for_tokens(
        db: AsyncSession,
        code: str,
        client_id: str,
        client_secret: Optional[str],
        redirect_uri: str,
        code_verifier: Optional[str] = None,
    ) -> Tuple[Optional[dict], Optional[str]]:
        """
        Exchange authorization code for tokens with PKCE support.
        Returns (tokens_dict, error_message).

        PKCE flow allows client_secret to be omitted if code_verifier is provided.
        """
        # Find the code
        result = await db.execute(
            select(OAuthCode).where(OAuthCode.code == code)
        )
        oauth_code = result.scalar_one_or_none()

        if not oauth_code:
            return None, "invalid_grant"

        # Check if already used
        if oauth_code.used:
            return None, "invalid_grant"

        # Check expiration
        if datetime.now(timezone.utc) > oauth_code.expires_at:
            return None, "invalid_grant"

        # Check redirect_uri matches
        if oauth_code.redirect_uri != redirect_uri:
            return None, "invalid_grant"

        # Verify application
        app = await OAuthService.get_application_by_client_id(db, client_id)
        if not app or app.id != oauth_code.application_id:
            return None, "invalid_client"

        # PKCE validation: if code was issued with code_challenge, verify code_verifier
        if oauth_code.code_challenge:
            if not code_verifier:
                return None, "invalid_grant"  # code_verifier required
            if not OAuthService.verify_pkce(
                code_verifier,
                oauth_code.code_challenge,
                oauth_code.code_challenge_method or "plain"
            ):
                return None, "invalid_grant"  # PKCE verification failed
        else:
            # No PKCE - require client_secret
            if not client_secret:
                return None, "invalid_client"
            if not OAuthService.verify_secret(client_secret, app.client_secret_hash):
                return None, "invalid_client"

        # Mark code as used
        oauth_code.used = datetime.now(timezone.utc)

        # Create tokens
        expires_in = 3600  # 1 hour
        access_token = create_oauth_access_token(
            user_id=oauth_code.user_id,
            application_id=app.id,
            scopes=oauth_code.scopes,
            expires_delta=timedelta(seconds=expires_in)
        )
        refresh_token = secrets.token_urlsafe(32)

        # Store token record
        token_record = OAuthToken(
            user_id=oauth_code.user_id,
            application_id=app.id,
            access_token=access_token,
            refresh_token=refresh_token,
            scopes=oauth_code.scopes,
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
        )
        db.add(token_record)
        await db.commit()

        return {
            "access_token": access_token,
            "token_type": "Bearer",
            "expires_in": expires_in,
            "refresh_token": refresh_token,
            "scope": " ".join(oauth_code.scopes),
        }, None

    @staticmethod
    async def refresh_tokens(
        db: AsyncSession,
        refresh_token: str,
        client_id: str,
        client_secret: str,
    ) -> Tuple[Optional[dict], Optional[str]]:
        """
        Refresh access token using refresh token.
        Returns (tokens_dict, error_message).
        """
        # Find the token record
        result = await db.execute(
            select(OAuthToken).where(
                OAuthToken.refresh_token == refresh_token,
                OAuthToken.revoked_at == None
            )
        )
        token_record = result.scalar_one_or_none()

        if not token_record:
            return None, "invalid_grant"

        # Verify application
        app = await OAuthService.get_application_by_client_id(db, client_id)
        if not app or app.id != token_record.application_id:
            return None, "invalid_client"

        # Verify client secret
        if not OAuthService.verify_secret(client_secret, app.client_secret_hash):
            return None, "invalid_client"

        # Revoke old token
        token_record.revoked_at = datetime.now(timezone.utc)

        # Create new tokens
        expires_in = 3600
        new_access_token = create_oauth_access_token(
            user_id=token_record.user_id,
            application_id=app.id,
            scopes=token_record.scopes,
            expires_delta=timedelta(seconds=expires_in)
        )
        new_refresh_token = secrets.token_urlsafe(32)

        # Store new token record
        new_token_record = OAuthToken(
            user_id=token_record.user_id,
            application_id=app.id,
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            scopes=token_record.scopes,
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
        )
        db.add(new_token_record)
        await db.commit()

        return {
            "access_token": new_access_token,
            "token_type": "Bearer",
            "expires_in": expires_in,
            "refresh_token": new_refresh_token,
            "scope": " ".join(token_record.scopes),
        }, None

    @staticmethod
    async def get_user_by_access_token(
        db: AsyncSession,
        access_token: str
    ) -> Optional[User]:
        """Get user from OAuth access token."""
        result = await db.execute(
            select(OAuthToken).where(
                OAuthToken.access_token == access_token,
                OAuthToken.revoked_at == None
            )
        )
        token_record = result.scalar_one_or_none()

        if not token_record:
            return None

        if token_record.is_expired:
            return None

        # Get user
        result = await db.execute(
            select(User).where(User.id == token_record.user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def revoke_token(
        db: AsyncSession,
        token: str,
        application_id: UUID,
        token_type_hint: Optional[str] = None,
    ) -> bool:
        """
        Revoke an access or refresh token.

        Per RFC 7009, this should always succeed even if token is invalid.
        Returns True if a token was actually revoked, False otherwise.

        Args:
            db: Database session
            token: The token string to revoke
            application_id: The application that owns the token
            token_type_hint: Optional hint - "access_token" or "refresh_token"
        """
        token_record = None

        # If hint provided, try that type first
        if token_type_hint == "access_token":
            result = await db.execute(
                select(OAuthToken).where(
                    OAuthToken.access_token == token,
                    OAuthToken.application_id == application_id,
                    OAuthToken.revoked_at == None
                )
            )
            token_record = result.scalar_one_or_none()

            # If not found, try refresh_token as fallback
            if not token_record:
                result = await db.execute(
                    select(OAuthToken).where(
                        OAuthToken.refresh_token == token,
                        OAuthToken.application_id == application_id,
                        OAuthToken.revoked_at == None
                    )
                )
                token_record = result.scalar_one_or_none()

        elif token_type_hint == "refresh_token":
            result = await db.execute(
                select(OAuthToken).where(
                    OAuthToken.refresh_token == token,
                    OAuthToken.application_id == application_id,
                    OAuthToken.revoked_at == None
                )
            )
            token_record = result.scalar_one_or_none()

            # If not found, try access_token as fallback
            if not token_record:
                result = await db.execute(
                    select(OAuthToken).where(
                        OAuthToken.access_token == token,
                        OAuthToken.application_id == application_id,
                        OAuthToken.revoked_at == None
                    )
                )
                token_record = result.scalar_one_or_none()

        else:
            # No hint - try access_token first, then refresh_token
            result = await db.execute(
                select(OAuthToken).where(
                    OAuthToken.access_token == token,
                    OAuthToken.application_id == application_id,
                    OAuthToken.revoked_at == None
                )
            )
            token_record = result.scalar_one_or_none()

            if not token_record:
                result = await db.execute(
                    select(OAuthToken).where(
                        OAuthToken.refresh_token == token,
                        OAuthToken.application_id == application_id,
                        OAuthToken.revoked_at == None
                    )
                )
                token_record = result.scalar_one_or_none()

        if token_record:
            token_record.revoked_at = datetime.now(timezone.utc)
            await db.commit()
            return True

        return False


oauth_service = OAuthService()
