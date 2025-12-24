"""Chat API - AI chat with Gemini."""
import asyncio
import uuid
from datetime import date
from typing import List, AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from google import genai

from ..core.config import settings
from ..core.dependencies import get_current_user, get_current_admin
from ..db.base import get_db
from ..models.chat import ChatSettings, ChatUsage, ChatMessage
from ..models.user import User
from ..schemas.chat import (
    ChatMessageRequest,
    ChatHistoryItem,
    ChatUsageInfo,
    ChatSettingsResponse,
    ChatSettingsUpdate,
    AVAILABLE_MODELS,
    AvailableModel,
)

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.get("/config")
async def get_chat_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get chat config for frontend (default model and available models)."""
    chat_settings = await get_or_create_settings(db)
    return {
        "default_model": chat_settings.model_name,
        "models": AVAILABLE_MODELS,
    }


async def get_or_create_settings(db: AsyncSession) -> ChatSettings:
    """Get chat settings or create default."""
    result = await db.execute(select(ChatSettings).where(ChatSettings.id == 1))
    chat_settings = result.scalar_one_or_none()

    if not chat_settings:
        chat_settings = ChatSettings(id=1)
        db.add(chat_settings)
        await db.commit()
        await db.refresh(chat_settings)

    return chat_settings


async def get_user_usage_today(db: AsyncSession, user_id: uuid.UUID) -> ChatUsage:
    """Get or create user's usage record for today."""
    today = date.today()
    result = await db.execute(
        select(ChatUsage).where(
            and_(
                ChatUsage.user_id == user_id,
                ChatUsage.usage_date == today
            )
        )
    )
    usage = result.scalar_one_or_none()

    if not usage:
        usage = ChatUsage(user_id=user_id, usage_date=today, message_count=0)
        db.add(usage)
        await db.commit()
        await db.refresh(usage)

    return usage


async def check_limits(db: AsyncSession, user: User) -> tuple[bool, str]:
    """Check if user can send message. Returns (can_send, error_message)."""
    chat_settings = await get_or_create_settings(db)

    if not chat_settings.is_enabled:
        return False, "Чат временно отключён администратором"

    if not settings.GEMINI_API_KEY:
        return False, "API ключ Gemini не настроен"

    usage = await get_user_usage_today(db, user.id)
    if usage.message_count >= chat_settings.daily_message_limit:
        return False, f"Достигнут дневной лимит сообщений ({chat_settings.daily_message_limit})"

    return True, ""


async def get_session_history(
    db: AsyncSession, user_id: uuid.UUID, session_id: uuid.UUID
) -> List[dict]:
    """Get chat history for session."""
    result = await db.execute(
        select(ChatMessage)
        .where(
            and_(
                ChatMessage.user_id == user_id,
                ChatMessage.session_id == session_id
            )
        )
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()
    # Convert to Gemini format
    return [{"role": "model" if msg.role == "assistant" else msg.role, "parts": [{"text": msg.content}]} for msg in messages]


def sync_generate_content(
    model_name: str,
    contents: List[dict],
    system_prompt: str,
    max_tokens: int
) -> tuple[str, int, int]:
    """Synchronously generate content using Gemini SDK.

    Returns: (response_text, input_tokens, output_tokens)
    """
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    response = client.models.generate_content(
        model=model_name,
        contents=contents,
        config={
            "system_instruction": system_prompt,
            "max_output_tokens": max_tokens,
        }
    )

    # Extract token usage from response
    input_tokens = 0
    output_tokens = 0
    if hasattr(response, 'usage_metadata') and response.usage_metadata:
        input_tokens = getattr(response.usage_metadata, 'prompt_token_count', 0) or 0
        output_tokens = getattr(response.usage_metadata, 'candidates_token_count', 0) or 0

    return response.text, input_tokens, output_tokens


@router.get("/usage", response_model=ChatUsageInfo)
async def get_usage(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's chat usage."""
    chat_settings = await get_or_create_settings(db)
    usage = await get_user_usage_today(db, current_user.id)

    return ChatUsageInfo(
        messages_today=usage.message_count,
        daily_limit=chat_settings.daily_message_limit,
        remaining=max(0, chat_settings.daily_message_limit - usage.message_count)
    )


@router.post("/send")
async def send_message(
    request: ChatMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send message and get AI response."""
    # Check limits
    can_send, error = await check_limits(db, current_user)
    if not can_send:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=error)

    chat_settings = await get_or_create_settings(db)

    # Create or use session
    session_id = request.session_id or uuid.uuid4()

    # Get history for context
    history = await get_session_history(db, current_user.id, session_id)

    # Save user message
    user_message = ChatMessage(
        user_id=current_user.id,
        session_id=session_id,
        role="user",
        content=request.message
    )
    db.add(user_message)

    # Update usage counter
    usage = await get_user_usage_today(db, current_user.id)
    usage.message_count += 1
    await db.commit()

    # Build contents with history
    contents = history + [{"role": "user", "parts": [{"text": request.message}]}]

    async def generate() -> AsyncGenerator[str, None]:
        try:
            # Run sync SDK in thread pool
            response_text, input_tokens, output_tokens = await asyncio.to_thread(
                sync_generate_content,
                chat_settings.model_name,
                contents,
                chat_settings.system_prompt,
                chat_settings.max_tokens
            )

            # Stream response word by word for better UX
            words = response_text.split(' ')
            for i, word in enumerate(words):
                if i > 0:
                    yield f"data:  {word}\n\n"
                else:
                    yield f"data: {word}\n\n"
                await asyncio.sleep(0.02)  # Small delay for streaming effect

            # Send done event
            yield f"event: done\ndata: {session_id}\n\n"

            # Save assistant message with token usage - need new session
            from ..db.base import AsyncSessionLocal
            async with AsyncSessionLocal() as new_db:
                assistant_message = ChatMessage(
                    user_id=current_user.id,
                    session_id=session_id,
                    role="assistant",
                    content=response_text,
                    model_name=chat_settings.model_name,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens
                )
                new_db.add(assistant_message)
                await new_db.commit()

        except Exception as e:
            error_msg = str(e)
            yield f"event: error\ndata: {error_msg}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Session-Id": str(session_id),
        }
    )


@router.get("/history/{session_id}", response_model=List[ChatHistoryItem])
async def get_history(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get chat history for session."""
    result = await db.execute(
        select(ChatMessage)
        .where(
            and_(
                ChatMessage.user_id == current_user.id,
                ChatMessage.session_id == session_id
            )
        )
        .order_by(ChatMessage.created_at)
    )
    return result.scalars().all()


@router.delete("/history/{session_id}")
async def clear_history(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clear chat history for session."""
    result = await db.execute(
        select(ChatMessage)
        .where(
            and_(
                ChatMessage.user_id == current_user.id,
                ChatMessage.session_id == session_id
            )
        )
    )
    messages = result.scalars().all()
    for msg in messages:
        await db.delete(msg)
    await db.commit()
    return {"status": "ok"}


@router.get("/sessions")
async def get_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get list of user's chat sessions."""
    from sqlalchemy import func, distinct
    from datetime import datetime, timedelta

    # Get unique sessions with their first message (as title) and last activity
    result = await db.execute(
        select(
            ChatMessage.session_id,
            func.min(ChatMessage.created_at).label('created_at'),
            func.max(ChatMessage.created_at).label('last_activity'),
            func.count(ChatMessage.id).label('message_count')
        )
        .where(ChatMessage.user_id == current_user.id)
        .group_by(ChatMessage.session_id)
        .order_by(func.max(ChatMessage.created_at).desc())
        .limit(50)  # Last 50 sessions
    )
    sessions = result.all()

    # Get first user message for each session as title
    session_list = []
    for session in sessions:
        # Get first user message as title
        title_result = await db.execute(
            select(ChatMessage.content)
            .where(
                and_(
                    ChatMessage.session_id == session.session_id,
                    ChatMessage.role == "user"
                )
            )
            .order_by(ChatMessage.created_at)
            .limit(1)
        )
        first_message = title_result.scalar_one_or_none()
        title = first_message[:50] + "..." if first_message and len(first_message) > 50 else first_message or "Новый чат"

        session_list.append({
            "session_id": str(session.session_id),
            "title": title,
            "created_at": session.created_at.isoformat(),
            "last_activity": session.last_activity.isoformat(),
            "message_count": session.message_count
        })

    return session_list


@router.delete("/sessions/cleanup")
async def cleanup_old_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete user's chat sessions older than 7 days."""
    from datetime import datetime, timedelta

    cutoff_date = datetime.utcnow() - timedelta(days=7)

    # Find old sessions
    result = await db.execute(
        select(ChatMessage)
        .where(
            and_(
                ChatMessage.user_id == current_user.id,
                ChatMessage.created_at < cutoff_date
            )
        )
    )
    old_messages = result.scalars().all()
    deleted_count = len(old_messages)

    for msg in old_messages:
        await db.delete(msg)

    await db.commit()
    return {"status": "ok", "deleted_messages": deleted_count}


# Admin endpoints

@router.get("/admin/settings", response_model=ChatSettingsResponse)
async def get_settings(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get chat settings (admin only)."""
    return await get_or_create_settings(db)


@router.put("/admin/settings", response_model=ChatSettingsResponse)
async def update_settings(
    data: ChatSettingsUpdate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update chat settings (admin only)."""
    chat_settings = await get_or_create_settings(db)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(chat_settings, field, value)

    chat_settings.updated_by = current_user.id
    await db.commit()
    await db.refresh(chat_settings)

    return chat_settings


@router.get("/admin/models", response_model=List[AvailableModel])
async def get_available_models(
    current_user: User = Depends(get_current_admin),
):
    """Get list of available AI models (admin only)."""
    return AVAILABLE_MODELS
