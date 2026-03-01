"""
auth0.py

Validates Auth0 JWT Bearer tokens using the JWKS endpoint.
Caches the JWKS keys in memory to avoid a network call on every request.
"""

import os
import requests as http_requests
from jose import jwt, JWTError
from flask import request
from functools import lru_cache

AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN", "")
AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE", "")
ALGORITHMS = ["RS256"]


@lru_cache(maxsize=1)
def _get_jwks():
    """Fetch and cache the Auth0 JWKS public keys."""
    url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
    resp = http_requests.get(url, timeout=10)
    resp.raise_for_status()
    return resp.json()


def _find_rsa_key(jwks, unverified_header):
    """Find the matching RSA key from JWKS for the given token header kid."""
    for key in jwks.get("keys", []):
        if key.get("kid") == unverified_header.get("kid"):
            return {
                "kty": key["kty"],
                "kid": key["kid"],
                "use": key["use"],
                "n":   key["n"],
                "e":   key["e"],
            }
    return None


def verify_jwt(token: str) -> dict:
    """
    Verify an Auth0 JWT and return the decoded payload.
    Raises ValueError with a message if verification fails.
    """
    if not AUTH0_DOMAIN or not AUTH0_AUDIENCE:
        raise ValueError("AUTH0_DOMAIN and AUTH0_AUDIENCE must be set in .env")

    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError as e:
        raise ValueError(f"Invalid token header: {e}")

    jwks = _get_jwks()
    rsa_key = _find_rsa_key(jwks, unverified_header)

    if not rsa_key:
        # JWKS may have rotated — bust cache and retry once
        _get_jwks.cache_clear()
        jwks = _get_jwks()
        rsa_key = _find_rsa_key(jwks, unverified_header)

    if not rsa_key:
        raise ValueError("Unable to find appropriate key in Auth0 JWKS")

    try:
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=ALGORITHMS,
            audience=AUTH0_AUDIENCE,
            issuer=f"https://{AUTH0_DOMAIN}/",
        )
        return payload
    except JWTError as e:
        raise ValueError(f"Token verification failed: {e}")


def get_bearer_token() -> str | None:
    """Extract Bearer token from the Authorization header."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        # Skip API keys (they start with sk_live_)
        if not token.startswith("sk_live_"):
            return token
    return None
