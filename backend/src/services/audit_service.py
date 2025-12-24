from typing import Optional, Any
from uuid import UUID

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.audit_log import AuditLog
from ..models.login_history import LoginHistory


class AuditService:
    """Service for logging admin actions and user activity."""

    @staticmethod
    async def log_action(
        db: AsyncSession,
        user_id: UUID,
        action: str,
        entity_type: str,
        entity_id: Optional[UUID] = None,
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        request: Optional[Request] = None,
    ) -> AuditLog:
        """
        Log an admin action to the audit log.

        Args:
            db: Database session
            user_id: ID of the user performing the action
            action: Action type (e.g., "user.update", "group.create")
            entity_type: Type of entity being modified (e.g., "user", "group")
            entity_id: ID of the entity being modified
            old_values: Previous state of the entity
            new_values: New state of the entity
            request: FastAPI request object for IP/User-Agent extraction
        """
        ip_address = None
        user_agent = None

        if request:
            # Get real IP from X-Forwarded-For header if behind proxy
            forwarded_for = request.headers.get("x-forwarded-for")
            if forwarded_for:
                ip_address = forwarded_for.split(",")[0].strip()
            else:
                ip_address = request.client.host if request.client else None

            user_agent = request.headers.get("user-agent", "")[:500]

        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        db.add(audit_log)
        await db.flush()

        return audit_log

    @staticmethod
    async def log_login(
        db: AsyncSession,
        user_id: Optional[UUID],
        login_type: str,
        success: bool = True,
        failure_reason: Optional[str] = None,
        request: Optional[Request] = None,
    ) -> LoginHistory:
        """
        Log a login attempt to the login history.

        Args:
            db: Database session
            user_id: ID of the user (may be None for failed logins)
            login_type: Type of login (e.g., "sso", "dev", "oauth_authorize")
            success: Whether the login was successful
            failure_reason: Reason for failure if not successful
            request: FastAPI request object for IP/User-Agent extraction
        """
        ip_address = None
        user_agent = None

        if request:
            forwarded_for = request.headers.get("x-forwarded-for")
            if forwarded_for:
                ip_address = forwarded_for.split(",")[0].strip()
            else:
                ip_address = request.client.host if request.client else None

            user_agent = request.headers.get("user-agent", "")[:500]

        login_history = LoginHistory(
            user_id=user_id,
            login_type=login_type,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            failure_reason=failure_reason,
        )

        db.add(login_history)
        await db.flush()

        return login_history

    @staticmethod
    def extract_changes(old_obj: Any, new_data: dict, fields: list[str]) -> tuple[dict, dict]:
        """
        Extract changed values from an object update.

        Args:
            old_obj: The original object
            new_data: Dictionary of new values
            fields: List of field names to check

        Returns:
            Tuple of (old_values, new_values) containing only changed fields
        """
        old_values = {}
        new_values = {}

        for field in fields:
            if field in new_data:
                old_val = getattr(old_obj, field, None)
                new_val = new_data[field]

                if old_val != new_val:
                    old_values[field] = old_val
                    new_values[field] = new_val

        return old_values, new_values
