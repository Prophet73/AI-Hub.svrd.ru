from typing import Optional, List

from pydantic import BaseModel


class AuthorizeRequest(BaseModel):
    """OAuth2 authorization request parameters."""
    response_type: str  # "code"
    client_id: str
    redirect_uri: str
    scope: Optional[str] = "openid"
    state: Optional[str] = None


class TokenRequest(BaseModel):
    """OAuth2 token request."""
    grant_type: str  # "authorization_code" or "refresh_token"
    code: Optional[str] = None
    redirect_uri: Optional[str] = None
    client_id: str
    client_secret: str
    refresh_token: Optional[str] = None


class TokenResponse(BaseModel):
    """OAuth2 token response."""
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    refresh_token: Optional[str] = None
    scope: str


class OIDCDiscovery(BaseModel):
    """OpenID Connect Discovery document."""
    issuer: str
    authorization_endpoint: str
    token_endpoint: str
    userinfo_endpoint: str
    jwks_uri: str
    scopes_supported: List[str]
    response_types_supported: List[str]
    grant_types_supported: List[str]
    token_endpoint_auth_methods_supported: List[str]
    subject_types_supported: List[str]
    id_token_signing_alg_values_supported: List[str]
    code_challenge_methods_supported: Optional[List[str]] = None  # PKCE support (RFC 7636)


class ErrorResponse(BaseModel):
    """OAuth2 error response."""
    error: str
    error_description: Optional[str] = None
