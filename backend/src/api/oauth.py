"""OAuth2 Provider API - authorization, token, userinfo endpoints."""
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, Form, Header, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..core.dependencies import get_current_user_optional
from ..db.base import get_db
from ..models.user import User
from ..schemas.oauth import OIDCDiscovery, TokenResponse, ErrorResponse
from ..schemas.user import UserInfoResponse
from ..services.oauth_service import oauth_service

router = APIRouter(tags=["oauth"])


@router.get("/.well-known/openid-configuration", response_model=OIDCDiscovery)
async def openid_discovery(request: Request):
    """OpenID Connect Discovery document."""
    base_url = str(request.base_url).rstrip("/")

    return OIDCDiscovery(
        issuer=base_url,
        authorization_endpoint=f"{base_url}/oauth/authorize",
        token_endpoint=f"{base_url}/oauth/token",
        userinfo_endpoint=f"{base_url}/oauth/userinfo",
        jwks_uri=f"{base_url}/.well-known/jwks.json",
        scopes_supported=["openid", "profile", "email"],
        response_types_supported=["code"],
        grant_types_supported=["authorization_code", "refresh_token"],
        token_endpoint_auth_methods_supported=["client_secret_post", "client_secret_basic", "none"],
        subject_types_supported=["public"],
        id_token_signing_alg_values_supported=["HS256"],
        code_challenge_methods_supported=["S256", "plain"],
    )


@router.get("/oauth/authorize")
async def authorize(
    response_type: str = Query(...),
    client_id: str = Query(...),
    redirect_uri: str = Query(...),
    scope: str = Query("openid"),
    state: str = Query(None),
    # PKCE parameters (RFC 7636)
    code_challenge: str = Query(None),
    code_challenge_method: str = Query(None),
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """OAuth2 Authorization endpoint with PKCE support."""
    # Validate response_type
    if response_type != "code":
        return RedirectResponse(
            url=f"{redirect_uri}?error=unsupported_response_type&state={state or ''}"
        )

    # Validate PKCE challenge method (only S256 is recommended)
    if code_challenge_method and code_challenge_method not in ("S256", "plain"):
        return RedirectResponse(
            url=f"{redirect_uri}?error=invalid_request&error_description=invalid_code_challenge_method&state={state or ''}"
        )

    # If code_challenge is provided, method defaults to "plain" (but S256 is recommended)
    if code_challenge and not code_challenge_method:
        code_challenge_method = "plain"

    # Validate client
    application = await oauth_service.get_application_by_client_id(db, client_id)
    if not application:
        return RedirectResponse(
            url=f"{redirect_uri}?error=invalid_client&state={state or ''}"
        )

    # Validate redirect_uri
    if not await oauth_service.validate_redirect_uri(application, redirect_uri):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid redirect_uri"
        )

    # If user not authenticated, redirect to SSO login
    if not current_user:
        # Build return URL with original OAuth params (including PKCE)
        oauth_params_dict = {
            "response_type": response_type,
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": scope,
            "state": state or "",
        }
        if code_challenge:
            oauth_params_dict["code_challenge"] = code_challenge
            oauth_params_dict["code_challenge_method"] = code_challenge_method
        oauth_params = urlencode(oauth_params_dict)
        return_url = f"/oauth/authorize?{oauth_params}"
        return RedirectResponse(url=f"/auth/sso/login?redirect_to={return_url}")

    # Parse scopes
    scopes = scope.split() if scope else ["openid"]

    # Create authorization code (with PKCE if provided)
    code = await oauth_service.create_authorization_code(
        db=db,
        user=current_user,
        application=application,
        redirect_uri=redirect_uri,
        scopes=scopes,
        state=state,
        code_challenge=code_challenge,
        code_challenge_method=code_challenge_method,
    )

    # Redirect back to client with code
    params = {"code": code}
    if state:
        params["state"] = state

    return RedirectResponse(url=f"{redirect_uri}?{urlencode(params)}")


@router.post("/oauth/token")
async def token(
    grant_type: str = Form(...),
    code: str = Form(None),
    redirect_uri: str = Form(None),
    client_id: str = Form(...),
    client_secret: str = Form(None),  # Optional if PKCE is used
    refresh_token: str = Form(None),
    # PKCE parameter (RFC 7636)
    code_verifier: str = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """OAuth2 Token endpoint with PKCE support."""
    if grant_type == "authorization_code":
        if not code or not redirect_uri:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing code or redirect_uri"
            )

        tokens, error = await oauth_service.exchange_code_for_tokens(
            db=db,
            code=code,
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
            code_verifier=code_verifier,
        )

        if error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )

        return tokens

    elif grant_type == "refresh_token":
        if not refresh_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing refresh_token"
            )

        tokens, error = await oauth_service.refresh_tokens(
            db=db,
            refresh_token=refresh_token,
            client_id=client_id,
            client_secret=client_secret,
        )

        if error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )

        return tokens

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported grant_type"
        )


@router.get("/oauth/userinfo", response_model=UserInfoResponse)
async def userinfo(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """OAuth2 UserInfo endpoint."""
    # Extract token from header
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header"
        )

    access_token = authorization[7:]  # Remove "Bearer " prefix

    user = await oauth_service.get_user_by_access_token(db, access_token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    return UserInfoResponse(
        sub=str(user.id),
        email=user.email,
        name=user.display_name,
        preferred_username=user.email,
        groups=user.ad_groups or [],
    )


@router.post("/oauth/revoke")
async def revoke_token(
    token: str = Form(...),
    token_type_hint: str = Form(None),
    client_id: str = Form(...),
    client_secret: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Revoke an access or refresh token (RFC 7009).

    Per RFC 7009, this endpoint always returns 200 OK even if the token
    was not found or already revoked, to prevent token scanning attacks.
    """
    # Verify client
    application = await oauth_service.get_application_by_client_id(db, client_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_client"
        )

    if not oauth_service.verify_secret(client_secret, application.client_secret_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_client"
        )

    # Revoke the token (always returns 200 per RFC 7009)
    await oauth_service.revoke_token(
        db=db,
        token=token,
        application_id=application.id,
        token_type_hint=token_type_hint,
    )

    # RFC 7009: Return empty 200 OK response
    return {}
