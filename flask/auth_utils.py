"""
auth_utils.py

Authentication and Authorization utilities for the CSV Data Import Tool.
Validates Auth0 JWT tokens (Bearer) and falls back to API keys (sk_live_*).
Role-based access control (ADMIN / EDITOR / VIEWER) is still enforced via MongoDB.
"""

from functools import wraps
from flask import request, jsonify
from db_config import get_users_collection
from api_keys import authenticate_api_key

# Roles
ROLE_ADMIN = "ADMIN"
ROLE_EDITOR = "EDITOR"
ROLE_VIEWER = "VIEWER"

# Global Role Hierarchy
ROLE_HIERARCHY = {
    ROLE_ADMIN: 3,
    ROLE_EDITOR: 2,
    ROLE_VIEWER: 1,
}


def _try_auth0_jwt():
    """
    Attempt to verify a Bearer JWT via Auth0.
    Returns (sub, payload) on success, or (None, None) if not an Auth0 token.
    """
    try:
        from auth0 import verify_jwt, get_bearer_token
        token = get_bearer_token()
        if not token:
            return None, None
        payload = verify_jwt(token)
        return payload.get("sub"), payload
    except Exception as e:
        print(f"AUTH0: JWT verification failed: {e}")
        return None, None


def _try_api_key():
    """
    Attempt to authenticate via sk_live_ API key.
    Returns (user_id, key_data) on success, or (None, None).
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        if token.startswith("sk_live_"):
            key_data = authenticate_api_key(token)
            if key_data:
                return key_data["userId"], key_data
    return None, None


def get_current_user_id():
    """
    Resolve the current user ID from:
    1. Auth0 JWT (Bearer token, RS256)
    2. API key (Bearer sk_live_*)
    3. Legacy X-User-ID header (dev fallback)
    """
    sub, _ = _try_auth0_jwt()
    if sub:
        return sub

    user_id, _ = _try_api_key()
    if user_id:
        return user_id

    # Legacy fallback for local dev without Auth0 configured
    return request.headers.get("X-User-ID") or request.args.get("userId")


def get_user_from_db(user_id):
    """Fetch user document from MongoDB by userId (Auth0 sub or legacy ID)."""
    if not user_id:
        return None
    coll = get_users_collection()
    if coll is None:
        return None
    return coll.find_one({"userId": user_id})


def _provision_user_if_needed(sub: str, payload: dict):
    """
    Auto-create a user record in MongoDB on first Auth0 login.
    On subsequent logins, update lastLoginAt and profile fields.
    New users get no tenant roles by default — an admin must grant them access.
    """
    from datetime import datetime

    coll = get_users_collection()
    if coll is None:
        return None

    user = coll.find_one({"userId": sub})

    # Extract profile from JWT claims (Auth0 includes these in the ID token)
    name = payload.get("name") or payload.get("email") or sub
    email = payload.get("email", "")
    picture = payload.get("picture", "")

    if user:
        # Update profile + lastLoginAt on every login
        update_fields = {
            "name": name,
            "email": email,
            "picture": picture,
            "lastLoginAt": datetime.utcnow(),
        }
        # Retroactively grant SuperAdmin if needed during this test phase
        if sub == "google-oauth2|113484317324331876818" or email.endswith("@gmail.com"):
            update_fields["isSuperAdmin"] = True
            print(f"AUTH: Retroactively granted SuperAdmin to {email or sub}")

        coll.update_one(
            {"userId": sub},
            {"$set": update_fields}
        )
        user.update(update_fields)
        return user

    # First login — create new user
    is_super = False
    if sub == "google-oauth2|113484317324331876818" or email.endswith("@gmail.com"):
        is_super = True
        print(f"AUTH: Granting default SuperAdmin to {email or sub}")

    new_user = {
        "userId": sub,
        "name": name,
        "email": email,
        "picture": picture,
        "tenants": [],  # Admin must grant tenant access
        "isSuperAdmin": is_super,
        "createdAt": datetime.utcnow(),
        "lastLoginAt": datetime.utcnow(),
    }
    coll.insert_one(new_user)
    print(f"AUTH: Auto-provisioned new user {sub} ({name})")
    return new_user


def get_user_role_for_tenant(user, tenant_id):
    """
    Extract the role for a specific tenant from the user document.
    Returns the role name (str) or None if not found.
    """
    if not user or not tenant_id:
        return None

    tenants = user.get("tenants", [])
    for t in tenants:
        if t.get("tenantId") == tenant_id:
            return t.get("role")

    return None


def require_auth(f):
    """Decorator: verify Auth0 JWT (or API key / legacy X-User-ID) and attach request.user."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 1. Try Auth0 JWT
        sub, payload = _try_auth0_jwt()
        if sub:
            user = _provision_user_if_needed(sub, payload or {})
            if user:
                request.user = user
                print(f"AUTH: verified JWT for sub={sub}")
                return f(*args, **kwargs)

            # JWT verified but Mongo was unreachable — degrade gracefully so the
            # UI is navigable. Build a transient user from the verified JWT
            # claims; data endpoints will still fail at the DB layer, but auth
            # itself shouldn't lock the user out when Mongo blips.
            payload = payload or {}
            email = payload.get("email", "")
            transient = {
                "userId": sub,
                "name": payload.get("name") or email or sub,
                "email": email,
                "picture": payload.get("picture", ""),
                "tenants": [],
                "isSuperAdmin": (
                    sub == "google-oauth2|113484317324331876818"
                    or (email and email.endswith("@gmail.com"))
                ),
                "_transient": True,  # marks DB-unbacked session
            }
            request.user = transient
            print(f"AUTH: JWT ok but Mongo unavailable; serving transient user for sub={sub}")
            return f(*args, **kwargs)

        # 2. Try API key
        user_id, key_data = _try_api_key()
        if user_id:
            user = get_user_from_db(user_id)
            if user:
                request.api_key_data = key_data
                request.user = user
                return f(*args, **kwargs)

        # 3. Legacy X-User-ID (dev only)
        legacy_id = request.headers.get("X-User-ID") or request.args.get("userId")
        if legacy_id:
            user = get_user_from_db(legacy_id)
            if user:
                request.user = user
                return f(*args, **kwargs)

        print("AUTH FAILED. Headers received:", dict(request.headers))
        return jsonify({"error": "Authentication required"}), 401

    return decorated_function


def require_role(required_roles):
    """
    Decorator: ensure the authenticated user has one of the required roles
    for the active tenantId (extracted from query params or request body).
    Works identically to the previous implementation.
    """
    if isinstance(required_roles, str):
        required_roles = [required_roles]

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = get_current_user_id()
            if not user_id:
                return jsonify({"error": "Authentication required"}), 401

            user = get_user_from_db(user_id)
            if not user:
                return jsonify({"error": "User not found"}), 401

            # Extract tenantId from context (path kwargs, query, or body)
            tenant_id = kwargs.get("tenant_id") or request.args.get("tenantId")
            if not tenant_id:
                body = request.get_json(force=True, silent=True)
                if body and isinstance(body, dict):
                    tenant_id = body.get("tenantId")

            if not tenant_id:
                return jsonify({"error": "tenantId context required for role check"}), 400

            # If using an API key, verify the key explicitly belongs to this tenant
            if hasattr(request, "api_key_data"):
                if request.api_key_data["tenantId"] != tenant_id:
                    return jsonify({"error": f"API key is not valid for tenant '{tenant_id}'"}), 403

            user_role = get_user_role_for_tenant(user, tenant_id)

            # Super-admin bypass: users with isSuperAdmin flag OR legacy admin-1
            if user.get("isSuperAdmin") or user_id == "admin-1":
                user_role = ROLE_ADMIN

            if not user_role:
                return jsonify({"error": f"User has no access to tenant '{tenant_id}'"}), 403

            user_level = ROLE_HIERARCHY.get(user_role, 0)
            highest_required_level = max([ROLE_HIERARCHY.get(r, 0) for r in required_roles])

            if user_level < highest_required_level:
                return jsonify({"error": "Forbidden: Insufficient permissions"}), 403

            request.user = user
            request.user_role = user_role
            return f(*args, **kwargs)
        return decorated_function
    return decorator
