"""Rate limiting middleware for FastAPI."""
import time
from collections import defaultdict
from typing import Dict, Tuple
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiting middleware.

    Limits:
    - /auth/* - 10 req/min (brute force protection)
    - /oauth/token - 20 req/min (token endpoint)
    - /api/admin/* - 100 req/min (admin operations)
    - General - 200 req/min (all other endpoints)
    """

    def __init__(self, app):
        super().__init__(app)
        # Store: {client_ip: {path_prefix: (count, window_start)}}
        self.requests: Dict[str, Dict[str, Tuple[int, float]]] = defaultdict(dict)

        # Rate limits: (max_requests, window_seconds)
        self.limits = {
            '/auth/': (10, 60),          # 10 req/min for auth
            '/oauth/token': (20, 60),    # 20 req/min for token exchange
            '/api/admin/': (100, 60),    # 100 req/min for admin
            'default': (200, 60),        # 200 req/min general
        }

    def _get_client_ip(self, request: Request) -> str:
        """Get client IP, considering X-Forwarded-For header."""
        forwarded = request.headers.get('X-Forwarded-For')
        if forwarded:
            return forwarded.split(',')[0].strip()
        return request.client.host if request.client else 'unknown'

    def _get_limit_key(self, path: str) -> str:
        """Determine which rate limit applies to this path."""
        if path.startswith('/auth/'):
            return '/auth/'
        if path == '/oauth/token':
            return '/oauth/token'
        if path.startswith('/api/admin/'):
            return '/api/admin/'
        return 'default'

    def _check_rate_limit(self, client_ip: str, limit_key: str) -> Tuple[bool, int]:
        """
        Check if request is within rate limit.
        Returns (is_allowed, retry_after_seconds)
        """
        max_requests, window_seconds = self.limits[limit_key]
        now = time.time()

        if limit_key not in self.requests[client_ip]:
            self.requests[client_ip][limit_key] = (1, now)
            return True, 0

        count, window_start = self.requests[client_ip][limit_key]

        # Check if window has expired
        if now - window_start > window_seconds:
            self.requests[client_ip][limit_key] = (1, now)
            return True, 0

        # Check if within limit
        if count < max_requests:
            self.requests[client_ip][limit_key] = (count + 1, window_start)
            return True, 0

        # Rate limited
        retry_after = int(window_seconds - (now - window_start)) + 1
        return False, retry_after

    def _cleanup_old_entries(self):
        """Remove expired entries to prevent memory growth."""
        now = time.time()
        for client_ip in list(self.requests.keys()):
            for limit_key in list(self.requests[client_ip].keys()):
                _, window_start = self.requests[client_ip][limit_key]
                max_window = max(limit[1] for limit in self.limits.values())
                if now - window_start > max_window * 2:
                    del self.requests[client_ip][limit_key]
            if not self.requests[client_ip]:
                del self.requests[client_ip]

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks and static files
        path = request.url.path
        if path in ('/', '/health', '/docs', '/openapi.json'):
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        limit_key = self._get_limit_key(path)

        is_allowed, retry_after = self._check_rate_limit(client_ip, limit_key)

        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please slow down.",
                headers={'Retry-After': str(retry_after)}
            )

        # Periodic cleanup (every ~100 requests roughly)
        if hash(client_ip + str(time.time())) % 100 == 0:
            self._cleanup_old_entries()

        response = await call_next(request)
        return response
