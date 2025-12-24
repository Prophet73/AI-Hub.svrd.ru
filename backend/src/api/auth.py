"""Auth API - SSO login/logout endpoints."""
import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

logger = logging.getLogger(__name__)
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..core.dependencies import get_current_user, get_current_user_optional
from ..core.security import create_access_token
from ..db.base import get_db
from ..models.user import User
from ..schemas.user import UserResponse
from ..services.sso_service import sso_service
from ..services.audit_service import AuditService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/sso/login")
async def sso_login(request: Request, redirect_to: str = "/"):
    """Initiate SSO login via ADFS."""
    # Generate state and store in session
    state = sso_service.generate_state()

    # Store state and redirect_to in a temporary way
    # In production, use Redis or encrypted cookie
    combined_state = f"{state}|{redirect_to}"

    authorization_url = await sso_service.get_authorization_url(combined_state)
    return RedirectResponse(url=authorization_url)


@router.get("/sso/callback")
async def sso_callback(
    code: str,
    state: str,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Handle ADFS callback after successful authentication."""
    # Parse state
    parts = state.split("|", 1)
    original_state = parts[0]
    redirect_to = parts[1] if len(parts) > 1 else "/"

    try:
        # Exchange code for tokens
        tokens = await sso_service.exchange_code_for_tokens(code)

        # Parse claims from id_token
        id_token = tokens.get("id_token", "")
        claims = sso_service.parse_id_token_claims(id_token)

        if not claims:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not parse ID token"
            )

        # Log all claims from ADFS for debugging
        logger.info("=" * 50)
        logger.info("ADFS CLAIMS RECEIVED:")
        for key, value in sorted(claims.items()):
            logger.info(f"  {key}: {value}")
        logger.info("=" * 50)

        # Extract user info from claims
        # ADFS claims mapping (OpenID Connect standard)
        sso_id = claims.get("sub") or claims.get("oid") or claims.get("upn")
        email = claims.get("email") or claims.get("upn") or claims.get("unique_name")
        first_name = claims.get("given_name")
        last_name = claims.get("family_name")
        middle_name = claims.get("middle_name")
        # display_name = ФИО или name из claims
        display_name = claims.get("name") or f"{last_name or ''} {first_name or ''} {middle_name or ''}".strip()
        department = claims.get("department")
        job_title = claims.get("jobTitle") or claims.get("title")
        groups = claims.get("groups", [])

        # Log extracted values
        logger.info("EXTRACTED USER DATA:")
        logger.info(f"  sso_id: {sso_id}")
        logger.info(f"  email: {email}")
        logger.info(f"  display_name: {display_name}")
        logger.info(f"  first_name: {first_name}")
        logger.info(f"  last_name: {last_name}")
        logger.info(f"  middle_name: {middle_name}")
        logger.info(f"  department: {department}")
        logger.info(f"  job_title: {job_title}")
        logger.info(f"  groups: {groups}")
        logger.info("=" * 50)

        if not sso_id or not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required claims (sub/email)"
            )

        # Get or create user
        user, created = await sso_service.get_or_create_user(
            db=db,
            sso_id=sso_id,
            email=email,
            display_name=display_name,
            first_name=first_name,
            last_name=last_name,
            middle_name=middle_name,
            department=department,
            job_title=job_title,
            ad_groups=groups,
        )

        # Log successful SSO login
        await AuditService.log_login(
            db=db,
            user_id=user.id,
            login_type="sso",
            success=True,
            request=request,
        )
        await db.commit()

        # Create Hub session token
        access_token = create_access_token(
            user_id=user.id,
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        # Redirect to frontend with session cookie
        redirect_response = RedirectResponse(
            url=redirect_to,
            status_code=status.HTTP_302_FOUND
        )

        # Determine if request came via HTTPS (check X-Forwarded-Proto from reverse proxy)
        forwarded_proto = request.headers.get("x-forwarded-proto", "http")
        is_secure = forwarded_proto == "https" or request.url.scheme == "https"

        redirect_response.set_cookie(
            key="hub_session",
            value=access_token,
            httponly=True,
            secure=is_secure,
            samesite="lax",
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

        return redirect_response

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SSO authentication failed: {str(e)}"
        )


@router.post("/logout")
async def logout(response: Response):
    """Clear session and logout."""
    response.delete_cookie("hub_session")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current authenticated user info."""
    return current_user


@router.get("/check")
async def check_auth(
    current_user: User = Depends(get_current_user_optional)
):
    """Check if user is authenticated."""
    if current_user:
        return {"authenticated": True, "user_id": str(current_user.id)}
    return {"authenticated": False}


@router.get("/dev-login")
async def dev_login(
    request: Request,
    response: Response,
    redirect_to: str = "http://localhost:5173/",
    role: str = "admin",  # 'admin' or 'user'
    db: AsyncSession = Depends(get_db),
):
    """Dev-only: Create test user and login (bypasses SSO)."""
    from ..services.sso_service import sso_service

    # Different users based on role
    is_super_admin = False
    if role == "holder":
        sso_id = "dev-holder-001"
        email = "holder@example.com"
        display_name = "Dev Holder"
        is_admin = True
        is_super_admin = True
    elif role == "admin":
        sso_id = "dev-admin-001"
        email = "admin@example.com"
        display_name = "Dev Admin"
        is_admin = True
    else:
        sso_id = "dev-user-001"
        email = "user@example.com"
        display_name = "Dev User"
        is_admin = False

    # Create or get test user
    user, created = await sso_service.get_or_create_user(
        db=db,
        sso_id=sso_id,
        email=email,
        display_name=display_name,
        department="Development",
        job_title="Developer" if role == "user" else ("Super Admin" if role == "holder" else "Admin"),
        ad_groups=["Developers"],
    )

    # Set admin status
    user.is_admin = is_admin
    user.is_super_admin = is_super_admin

    # Log dev login
    await AuditService.log_login(
        db=db,
        user_id=user.id,
        login_type="dev",
        success=True,
        request=request,
    )
    await db.commit()

    # Create session
    access_token = create_access_token(
        user_id=user.id,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    # Use redirect_to parameter or try to get origin from request
    redirect_url = redirect_to
    origin = request.headers.get("origin") or request.headers.get("referer", "").rstrip("/")
    if origin and redirect_to == "http://localhost:5173/":
        from urllib.parse import urlparse
        parsed = urlparse(origin)
        redirect_url = f"{parsed.scheme}://{parsed.netloc}/"

    # Redirect to dashboard
    redirect_response = RedirectResponse(url=redirect_url, status_code=302)
    redirect_response.set_cookie(
        key="hub_session",
        value=access_token,
        httponly=True,
        secure=False,  # Dev mode
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return redirect_response
