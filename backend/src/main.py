"""Hub - OAuth2/SSO Authentication Service."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from .core.config import settings
from .core.rate_limit import RateLimitMiddleware
from .api import auth_router, oauth_router, applications_router, admin_router, prompts_router, chat_router, tools_router
from .api.auth import sso_callback
from .db.base import get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    yield
    # Shutdown


app = FastAPI(
    title=settings.APP_NAME,
    description="Centralized OAuth2/SSO Authentication Service",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
app.add_middleware(RateLimitMiddleware)

# Routers
app.include_router(auth_router)
app.include_router(oauth_router)
app.include_router(applications_router)
app.include_router(admin_router)
app.include_router(prompts_router)
app.include_router(chat_router)
app.include_router(tools_router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": settings.APP_NAME}


# SSO callback alias for ADFS registered redirect_uri
@app.get("/signing-sso-019b2e1d-b49e-7926-ae0a-a5592d035bc0", include_in_schema=False)
async def sso_callback_alias(
    code: str,
    state: str,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Alias for SSO callback (ADFS registered redirect_uri)."""
    return await sso_callback(code=code, state=state, request=request, response=response, db=db)
