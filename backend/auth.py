# What it does: Auth logic — JWT creation/verification, password hashing, Google OAuth
# Input: User credentials or Google OAuth tokens
# Output: JWT tokens for authenticated sessions
# Called by: routers/auth.py

import os
import secrets
from datetime import datetime, timedelta
from jose import jwt, JWTError
import bcrypt

# JWT configuration
JWT_SECRET = os.getenv("JWT_SECRET", "")
if not JWT_SECRET:
    JWT_SECRET = secrets.token_urlsafe(32)
    print(f"[auth] WARNING: No JWT_SECRET in .env — generated random secret (will change on restart)")

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

# Password hashing using bcrypt directly (avoids passlib compatibility bugs)
def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password_bytes, salt)
    return hashed_bytes.decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        plain_bytes = plain.encode('utf-8')
        hashed_bytes = hashed.encode('utf-8')
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception as e:
        print(f"[auth] Password verification failed: {e}")
        return False


def create_jwt(rep_id: str, email: str, name: str, territory: str = "Nalgonda") -> str:
    """Create a JWT token with rep_id, email, name, territory, and 24h expiry."""
    payload = {
        "sub": rep_id,
        "email": email,
        "name": name,
        "territory": territory or "Nalgonda",
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_jwt(token: str) -> dict:
    """Verify and decode a JWT token. Returns payload dict or raises."""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


async def get_current_user(token: str) -> dict:
    """FastAPI dependency: extract user from Authorization header."""
    try:
        payload = verify_jwt(token)
        return payload
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}")
