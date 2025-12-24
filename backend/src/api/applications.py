"""Applications API - manage registered OAuth2 clients."""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.dependencies import get_current_user, get_current_admin
from ..db.base import get_db
from ..models.application import Application, generate_client_id, generate_client_secret
from ..models.oauth_token import OAuthCode, OAuthToken
from ..models.application_access import ApplicationAccess
from ..models.user import User
from ..schemas.application import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse,
    ApplicationWithSecret,
    ApplicationListItem,
)
from ..services.oauth_service import oauth_service

router = APIRouter(prefix="/api/applications", tags=["applications"])


@router.get("", response_model=List[ApplicationListItem])
async def list_applications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List active applications filtered by user's department."""
    result = await db.execute(
        select(Application).where(Application.is_active == True)
    )
    applications = result.scalars().all()

    # Filter by department: show app if allowed_departments is empty OR user's department is in the list
    user_department = current_user.department or ""
    filtered = []
    for app in applications:
        allowed = app.allowed_departments or []
        if not allowed or user_department in allowed:
            filtered.append(app)

    return filtered


@router.get("/{app_id}", response_model=ApplicationResponse)
async def get_application(
    app_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get application details."""
    result = await db.execute(
        select(Application).where(Application.id == app_id)
    )
    application = result.scalar_one_or_none()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    return application


@router.post("/", response_model=ApplicationWithSecret, status_code=status.HTTP_201_CREATED)
async def create_application(
    data: ApplicationCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new application (admin only)."""
    # Check if slug already exists
    result = await db.execute(
        select(Application).where(Application.slug == data.slug)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application with this slug already exists"
        )

    # Generate credentials
    client_secret = generate_client_secret()
    client_secret_hash = oauth_service.hash_secret(client_secret)

    application = Application(
        name=data.name,
        slug=data.slug,
        description=data.description,
        base_url=data.base_url,
        icon_url=data.icon_url,
        redirect_uris=data.redirect_uris,
        client_secret_hash=client_secret_hash,
    )

    db.add(application)
    await db.commit()
    await db.refresh(application)

    # Return with plain client_secret (only shown once)
    app_data = ApplicationResponse.model_validate(application).model_dump()
    app_data['client_secret'] = client_secret
    return ApplicationWithSecret(**app_data)


@router.put("/{app_id}", response_model=ApplicationResponse)
async def update_application(
    app_id: UUID,
    data: ApplicationUpdate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update application (admin only)."""
    result = await db.execute(
        select(Application).where(Application.id == app_id)
    )
    application = result.scalar_one_or_none()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(application, field, value)

    await db.commit()
    await db.refresh(application)
    return application


@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(
    app_id: UUID,
    permanent: bool = False,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete application (admin only). Use permanent=true for full deletion."""
    result = await db.execute(
        select(Application).where(Application.id == app_id)
    )
    application = result.scalar_one_or_none()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    if permanent:
        # Delete related records first
        await db.execute(delete(OAuthCode).where(OAuthCode.application_id == app_id))
        await db.execute(delete(OAuthToken).where(OAuthToken.application_id == app_id))
        await db.execute(delete(ApplicationAccess).where(ApplicationAccess.application_id == app_id))
        await db.delete(application)
    else:
        application.is_active = False
    await db.commit()


@router.post("/{app_id}/regenerate-secret", response_model=ApplicationWithSecret)
async def regenerate_client_secret(
    app_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Regenerate client secret for application (admin only)."""
    result = await db.execute(
        select(Application).where(Application.id == app_id)
    )
    application = result.scalar_one_or_none()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    # Generate new secret
    client_secret = generate_client_secret()
    application.client_secret_hash = oauth_service.hash_secret(client_secret)

    await db.commit()
    await db.refresh(application)

    # Return with plain client_secret
    app_data = ApplicationResponse.model_validate(application).model_dump()
    app_data['client_secret'] = client_secret
    return ApplicationWithSecret(**app_data)
