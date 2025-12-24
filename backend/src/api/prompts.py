"""Prompts API - manage pre-made prompts for AI assistant."""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.dependencies import get_current_user, get_current_admin
from ..db.base import get_db
from ..models.prompt import Prompt
from ..models.user import User
from ..schemas.prompt import (
    PromptCreate,
    PromptUpdate,
    PromptResponse,
    PromptListItem,
)

router = APIRouter(prefix="/api/prompts", tags=["prompts"])


@router.get("", response_model=List[PromptListItem])
async def list_prompts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all active prompts (for services page)."""
    result = await db.execute(
        select(Prompt)
        .where(Prompt.is_active == True)
        .order_by(Prompt.sort_order, Prompt.name)
    )
    return result.scalars().all()


@router.get("/admin/all", response_model=List[PromptResponse])
async def list_all_prompts(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all prompts including inactive (admin only)."""
    result = await db.execute(
        select(Prompt).order_by(Prompt.sort_order, Prompt.name)
    )
    return result.scalars().all()


@router.get("/{prompt_id}", response_model=PromptResponse)
async def get_prompt(
    prompt_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get prompt details with full text."""
    result = await db.execute(
        select(Prompt).where(Prompt.id == prompt_id)
    )
    prompt = result.scalar_one_or_none()

    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prompt not found"
        )

    return prompt


@router.post("/", response_model=PromptResponse, status_code=status.HTTP_201_CREATED)
async def create_prompt(
    data: PromptCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new prompt (admin only)."""
    prompt = Prompt(**data.model_dump())

    db.add(prompt)
    await db.commit()
    await db.refresh(prompt)

    return prompt


@router.put("/{prompt_id}", response_model=PromptResponse)
async def update_prompt(
    prompt_id: UUID,
    data: PromptUpdate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update prompt (admin only)."""
    result = await db.execute(
        select(Prompt).where(Prompt.id == prompt_id)
    )
    prompt = result.scalar_one_or_none()

    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prompt not found"
        )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(prompt, field, value)

    await db.commit()
    await db.refresh(prompt)
    return prompt


@router.delete("/{prompt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prompt(
    prompt_id: UUID,
    hard: bool = False,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete prompt (admin only). Use hard=true for permanent deletion."""
    result = await db.execute(
        select(Prompt).where(Prompt.id == prompt_id)
    )
    prompt = result.scalar_one_or_none()

    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prompt not found"
        )

    if hard:
        await db.delete(prompt)
    else:
        prompt.is_active = False
    await db.commit()
