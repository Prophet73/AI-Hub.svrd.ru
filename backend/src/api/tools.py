"""Tools API endpoints."""
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..core.dependencies import get_current_user, get_current_admin, get_db
from ..models.user import User
from ..models.tool import Tool, ToolServer, ToolExecution
from ..schemas.tool import (
    ToolServerCreate, ToolServerUpdate, ToolServerResponse, ToolServerListResponse,
    ToolCreate, ToolUpdate, ToolResponse, ToolPublicResponse,
    ToolExecuteRequest, ToolExecutionResponse, ToolExecutionListResponse
)

router = APIRouter(prefix="/api/tools", tags=["tools"])


# ============== Public endpoints (for users) ==============

@router.get("", response_model=list[ToolPublicResponse])
async def list_tools(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all available tools for the current user."""
    query = (
        select(Tool)
        .options(selectinload(Tool.server))
        .where(Tool.is_active == True)
        .order_by(Tool.sort_order, Tool.name)
    )

    result = await db.execute(query)
    tools = result.scalars().all()

    # Filter by department access
    user_department = current_user.department or ""
    accessible_tools = []

    for tool in tools:
        # Check department access
        if tool.allowed_departments and len(tool.allowed_departments) > 0:
            if user_department not in tool.allowed_departments:
                continue

        # Check if tool is available (server healthy or no server)
        is_available = True
        if tool.server:
            is_available = tool.server.is_active and tool.server.is_healthy

        accessible_tools.append(ToolPublicResponse(
            id=tool.id,
            name=tool.name,
            slug=tool.slug,
            description=tool.description,
            icon=tool.icon,
            color=tool.color,
            is_available=is_available,
        ))

    return accessible_tools


@router.post("/{tool_slug}/execute", response_model=ToolExecutionResponse)
async def execute_tool(
    tool_slug: str,
    request: ToolExecuteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Execute a tool."""
    # Get tool
    result = await db.execute(
        select(Tool)
        .options(selectinload(Tool.server))
        .where(Tool.slug == tool_slug, Tool.is_active == True)
    )
    tool = result.scalar_one_or_none()

    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    # Check department access
    if tool.allowed_departments and len(tool.allowed_departments) > 0:
        user_department = current_user.department or ""
        if user_department not in tool.allowed_departments:
            raise HTTPException(status_code=403, detail="Access denied")

    # Check if server is available
    if tool.server:
        if not tool.server.is_active:
            raise HTTPException(status_code=503, detail="Tool server is disabled")
        if not tool.server.is_healthy:
            raise HTTPException(status_code=503, detail="Tool server is not available")

    # Create execution record
    execution = ToolExecution(
        tool_id=tool.id,
        user_id=current_user.id,
        status="running",
        input_data=request.input_data,
    )
    db.add(execution)
    await db.commit()
    await db.refresh(execution)

    start_time = datetime.now(timezone.utc)

    try:
        if tool.server and tool.endpoint:
            # Call remote server
            async with httpx.AsyncClient(timeout=tool.server.timeout_seconds) as client:
                url = f"{tool.server.base_url.rstrip('/')}{tool.endpoint}"
                headers = {
                    "Authorization": f"Bearer {tool.server.api_key}",
                    "Content-Type": "application/json",
                    "X-User-Id": str(current_user.id),
                    "X-User-Email": current_user.email or "",
                }

                if tool.http_method.upper() == "POST":
                    response = await client.post(url, json=request.input_data or {}, headers=headers)
                elif tool.http_method.upper() == "GET":
                    response = await client.get(url, params=request.input_data or {}, headers=headers)
                else:
                    raise HTTPException(status_code=400, detail=f"Unsupported HTTP method: {tool.http_method}")

                response.raise_for_status()
                output_data = response.json() if tool.response_type == "json" else {"raw": response.text}

        else:
            # No server configured - tool not implemented
            output_data = {"message": "Tool is not yet implemented"}

        # Update execution
        end_time = datetime.now(timezone.utc)
        duration_ms = int((end_time - start_time).total_seconds() * 1000)

        execution.status = "completed"
        execution.output_data = output_data
        execution.completed_at = end_time
        execution.duration_ms = duration_ms

        # Update tool usage
        await db.execute(
            update(Tool)
            .where(Tool.id == tool.id)
            .values(
                usage_count=Tool.usage_count + 1,
                last_used_at=end_time
            )
        )

    except httpx.HTTPStatusError as e:
        execution.status = "failed"
        execution.error_message = f"Server returned {e.response.status_code}: {e.response.text[:500]}"
        execution.completed_at = datetime.now(timezone.utc)
        execution.duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)

    except httpx.RequestError as e:
        execution.status = "failed"
        execution.error_message = f"Request failed: {str(e)}"
        execution.completed_at = datetime.now(timezone.utc)
        execution.duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)

    except Exception as e:
        execution.status = "failed"
        execution.error_message = str(e)
        execution.completed_at = datetime.now(timezone.utc)
        execution.duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)

    await db.commit()
    await db.refresh(execution)

    return ToolExecutionResponse.model_validate(execution)


# ============== Admin endpoints ==============

@router.get("/admin/servers", response_model=list[ToolServerListResponse])
async def list_servers_admin(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all tool servers (admin only)."""
    result = await db.execute(
        select(
            ToolServer,
            func.count(Tool.id).label('tools_count')
        )
        .outerjoin(Tool, Tool.server_id == ToolServer.id)
        .group_by(ToolServer.id)
        .order_by(ToolServer.name)
    )
    rows = result.all()

    return [
        ToolServerListResponse(
            id=row.ToolServer.id,
            name=row.ToolServer.name,
            base_url=row.ToolServer.base_url,
            is_active=row.ToolServer.is_active,
            is_healthy=row.ToolServer.is_healthy,
            last_health_check=row.ToolServer.last_health_check,
            tools_count=row.tools_count or 0,
        )
        for row in rows
    ]


@router.post("/admin/servers", response_model=ToolServerResponse, status_code=201)
async def create_server(
    data: ToolServerCreate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new tool server (admin only)."""
    server = ToolServer(**data.model_dump())
    db.add(server)
    await db.commit()
    await db.refresh(server)
    return ToolServerResponse.model_validate(server)


@router.get("/admin/servers/{server_id}", response_model=ToolServerResponse)
async def get_server(
    server_id: UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get tool server details (admin only)."""
    result = await db.execute(select(ToolServer).where(ToolServer.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return ToolServerResponse.model_validate(server)


@router.patch("/admin/servers/{server_id}", response_model=ToolServerResponse)
async def update_server(
    server_id: UUID,
    data: ToolServerUpdate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update tool server (admin only)."""
    result = await db.execute(select(ToolServer).where(ToolServer.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(server, key, value)

    await db.commit()
    await db.refresh(server)
    return ToolServerResponse.model_validate(server)


@router.delete("/admin/servers/{server_id}")
async def delete_server(
    server_id: UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete tool server (admin only)."""
    result = await db.execute(select(ToolServer).where(ToolServer.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    # Check if server has tools
    tools_count = await db.execute(
        select(func.count(Tool.id)).where(Tool.server_id == server_id)
    )
    if tools_count.scalar() > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete server with tools. Remove tools first."
        )

    await db.delete(server)
    await db.commit()
    return {"status": "deleted"}


@router.post("/admin/servers/{server_id}/check-health")
async def check_server_health(
    server_id: UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Check tool server health (admin only)."""
    result = await db.execute(select(ToolServer).where(ToolServer.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            url = f"{server.base_url.rstrip('/')}{server.health_check_endpoint}"
            response = await client.get(url, headers={"Authorization": f"Bearer {server.api_key}"})
            response.raise_for_status()

        server.is_healthy = True
        server.last_health_check = datetime.now(timezone.utc)
        server.last_error = None

    except Exception as e:
        server.is_healthy = False
        server.last_health_check = datetime.now(timezone.utc)
        server.last_error = str(e)

    await db.commit()
    await db.refresh(server)

    return {
        "is_healthy": server.is_healthy,
        "last_health_check": server.last_health_check,
        "last_error": server.last_error,
    }


@router.post("/admin/servers/{server_id}/regenerate-key", response_model=ToolServerResponse)
async def regenerate_server_key(
    server_id: UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Regenerate tool server API key (admin only)."""
    from ..models.tool import generate_api_key

    result = await db.execute(select(ToolServer).where(ToolServer.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    server.api_key = generate_api_key()
    await db.commit()
    await db.refresh(server)
    return ToolServerResponse.model_validate(server)


# ============== Tools admin endpoints ==============

@router.get("/admin/list", response_model=list[ToolResponse])
async def list_tools_admin(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all tools (admin only)."""
    result = await db.execute(
        select(Tool)
        .options(selectinload(Tool.server))
        .order_by(Tool.sort_order, Tool.name)
    )
    tools = result.scalars().all()

    return [ToolResponse.model_validate(tool) for tool in tools]


@router.post("/admin", response_model=ToolResponse, status_code=201)
async def create_tool(
    data: ToolCreate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new tool (admin only)."""
    # Check slug uniqueness
    existing = await db.execute(select(Tool).where(Tool.slug == data.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Tool with this slug already exists")

    # Validate server exists if provided
    if data.server_id:
        server = await db.execute(select(ToolServer).where(ToolServer.id == data.server_id))
        if not server.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Server not found")

    tool = Tool(**data.model_dump())
    db.add(tool)
    await db.commit()

    # Reload with server
    result = await db.execute(
        select(Tool)
        .options(selectinload(Tool.server))
        .where(Tool.id == tool.id)
    )
    tool = result.scalar_one()

    return ToolResponse.model_validate(tool)


@router.get("/admin/{tool_id}", response_model=ToolResponse)
async def get_tool_admin(
    tool_id: UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get tool details (admin only)."""
    result = await db.execute(
        select(Tool)
        .options(selectinload(Tool.server))
        .where(Tool.id == tool_id)
    )
    tool = result.scalar_one_or_none()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    return ToolResponse.model_validate(tool)


@router.patch("/admin/{tool_id}", response_model=ToolResponse)
async def update_tool(
    tool_id: UUID,
    data: ToolUpdate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update tool (admin only)."""
    result = await db.execute(select(Tool).where(Tool.id == tool_id))
    tool = result.scalar_one_or_none()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    update_data = data.model_dump(exclude_unset=True)

    # Check slug uniqueness if changing
    if 'slug' in update_data and update_data['slug'] != tool.slug:
        existing = await db.execute(select(Tool).where(Tool.slug == update_data['slug']))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Tool with this slug already exists")

    # Validate server if changing
    if 'server_id' in update_data and update_data['server_id']:
        server = await db.execute(select(ToolServer).where(ToolServer.id == update_data['server_id']))
        if not server.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Server not found")

    for key, value in update_data.items():
        setattr(tool, key, value)

    await db.commit()

    # Reload with server
    result = await db.execute(
        select(Tool)
        .options(selectinload(Tool.server))
        .where(Tool.id == tool.id)
    )
    tool = result.scalar_one()

    return ToolResponse.model_validate(tool)


@router.delete("/admin/{tool_id}")
async def delete_tool(
    tool_id: UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete tool (admin only)."""
    result = await db.execute(select(Tool).where(Tool.id == tool_id))
    tool = result.scalar_one_or_none()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    await db.delete(tool)
    await db.commit()
    return {"status": "deleted"}


# ============== Execution history ==============

@router.get("/admin/executions", response_model=list[ToolExecutionListResponse])
async def list_executions(
    tool_id: Optional[UUID] = None,
    user_id: Optional[UUID] = None,
    limit: int = 50,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List tool executions (admin only)."""
    query = (
        select(
            ToolExecution.id,
            ToolExecution.status,
            ToolExecution.started_at,
            ToolExecution.duration_ms,
            Tool.name.label('tool_name'),
            User.email.label('user_email'),
        )
        .join(Tool, ToolExecution.tool_id == Tool.id)
        .join(User, ToolExecution.user_id == User.id)
        .order_by(ToolExecution.started_at.desc())
        .limit(limit)
    )

    if tool_id:
        query = query.where(ToolExecution.tool_id == tool_id)
    if user_id:
        query = query.where(ToolExecution.user_id == user_id)

    result = await db.execute(query)
    rows = result.all()

    return [
        ToolExecutionListResponse(
            id=row.id,
            tool_name=row.tool_name,
            user_email=row.user_email,
            status=row.status,
            started_at=row.started_at,
            duration_ms=row.duration_ms,
        )
        for row in rows
    ]
