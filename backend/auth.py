# What it does: Auth logic — JWT creation/verification, password hashing, RBAC
# Input: User credentials or JWT tokens
# Output: JWT tokens, validated user dicts, role-based FastAPI dependencies
# Called by: routers/auth.py and all protected routers

import os
import secrets
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError
import bcrypt

# JWT configuration
JWT_SECRET = os.getenv("JWT_SECRET", "")
if not JWT_SECRET:
    JWT_SECRET = secrets.token_urlsafe(32)
    print("[auth] WARNING: No JWT_SECRET in .env — generated random secret (changes on restart)")

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7


# ---- Password hashing ----

def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception as e:
        print(f"[auth] Password verification failed: {e}")
        return False


# ---- JWT ----

def create_jwt(rep_id: str, email: str, name: str,
               territory: str = "Nalgonda", role: str = "rep") -> str:
    """Create a signed JWT with rep_id, email, name, territory, role, 7-day expiry."""
    payload = {
        "sub": rep_id,
        "email": email,
        "name": name,
        "territory": territory or "Nalgonda",
        "role": role,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRY_DAYS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_jwt(token: str) -> dict:
    """Verify and decode a JWT. Returns payload dict or raises JWTError."""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


# ---- FastAPI Dependencies ----

def get_token_from_header(authorization: str = Header(None)) -> str:
    """Extract Bearer token from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    return authorization.split(" ", 1)[1]


async def get_current_user(token: str = Depends(get_token_from_header)) -> dict:
    """FastAPI dependency: decode and return the current user from JWT."""
    try:
        payload = verify_jwt(token)
        return payload
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


def require_role(*roles: str):
    """Factory: returns a FastAPI dependency that enforces role membership."""
    async def checker(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("role", "rep")
        if user_role not in roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Requires role: {', '.join(roles)}. Your role: {user_role}"
            )
        return current_user
    return checker


# Convenience role dependencies
require_any     = require_role("rep", "manager", "admin")
require_manager = require_role("manager", "admin")
require_admin   = require_role("admin")
