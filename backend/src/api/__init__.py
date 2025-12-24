from .auth import router as auth_router
from .oauth import router as oauth_router
from .applications import router as applications_router
from .admin import router as admin_router
from .prompts import router as prompts_router
from .chat import router as chat_router
from .tools import router as tools_router

__all__ = ["auth_router", "oauth_router", "applications_router", "admin_router", "prompts_router", "chat_router", "tools_router"]
