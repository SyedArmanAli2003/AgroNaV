# What it does: Auth routes — signup, login, Google OAuth
# Input: POST bodies with credentials, GET for OAuth flow
# Output: JWT tokens
# Called by: Frontend SignIn/SignUp pages

import os
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel, EmailStr
from db.database import get_db
from auth import hash_password, verify_password, create_jwt

router = APIRouter(tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3002")


# --- Pydantic models ---

class SignUpRequest(BaseModel):
    email: str
    password: str
    rep_id: str
    name: str


class LoginRequest(BaseModel):
    email: str
    password: str


# --- Routes ---

@router.post("/signup")
async def signup(req: SignUpRequest, db=Depends(get_db)):
    """Register a new user with email/password."""
    # Check if email already exists
    async with db.execute("SELECT id FROM users WHERE email=?", (req.email,)) as cursor:
        existing = await cursor.fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash password and insert
    pw_hash = hash_password(req.password)
    await db.execute(
        "INSERT INTO users (email, password_hash, name, rep_id) VALUES (?,?,?,?)",
        (req.email, pw_hash, req.name, req.rep_id)
    )
    await db.commit()

    # Find territory for the rep
    territory = "Nalgonda"
    try:
        clean_rep_id = "".join(filter(str.isdigit, req.rep_id))
        rep_id_int = int(clean_rep_id) if clean_rep_id else 1
        async with db.execute("SELECT territory FROM reps WHERE id=?", (rep_id_int,)) as cursor:
            rep_row = await cursor.fetchone()
            if rep_row:
                territory = rep_row["territory"]
    except Exception:
        pass

    # Generate JWT
    token = create_jwt(req.rep_id, req.email, req.name, territory)
    return {"token": token, "user": {"email": req.email, "name": req.name, "rep_id": req.rep_id, "territory": territory}}


@router.post("/login")
async def login(req: LoginRequest, db=Depends(get_db)):
    """Login with email/password."""
    async with db.execute(
        "SELECT password_hash, name, rep_id FROM users WHERE email=?",
        (req.email,)
    ) as cursor:
        user = await cursor.fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user["password_hash"] or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Find territory for the rep
    territory = "Nalgonda"
    try:
        clean_rep_id = "".join(filter(str.isdigit, user["rep_id"]))
        rep_id_int = int(clean_rep_id) if clean_rep_id else 1
        async with db.execute("SELECT territory FROM reps WHERE id=?", (rep_id_int,)) as cursor:
            rep_row = await cursor.fetchone()
            if rep_row:
                territory = rep_row["territory"]
    except Exception:
        pass

    token = create_jwt(user["rep_id"], req.email, user["name"], territory)
    return {"token": token, "user": {"email": req.email, "name": user["name"], "rep_id": user["rep_id"], "territory": territory}}


@router.get("/auth/google")
async def google_auth(request: Request):
    """Redirect to Google OAuth consent screen."""
    if not GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID.startswith("your_"):
        raise HTTPException(
            status_code=501,
            detail="Google OAuth not configured. Use email/password login."
        )

    # Use BASE_URL env var in production (Cloud Run).
    # Falls back to request.base_url for local dev (localhost:8000).
    base_url = os.getenv("BASE_URL", "").rstrip("/") or str(request.base_url).rstrip("/")
    redirect_uri = f"{base_url}/auth/google/callback"
    print(f"[auth/google] redirect_uri = {redirect_uri}", flush=True)

    from urllib.parse import urlencode
    params = urlencode({
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent"
    })
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/auth/google/callback")
async def google_callback(request: Request, code: str = "", error: str = "", db=Depends(get_db)):
    """Exchange Google OAuth code for token, upsert user, return JWT."""
    if error or not code:
        return RedirectResponse("/signin?error=oauth_failed")

    try:
        import httpx

        # Use BASE_URL env var in production (Cloud Run).
        # Falls back to request.base_url for local dev (localhost:8000).
        base_url = os.getenv("BASE_URL", "").rstrip("/") or str(request.base_url).rstrip("/")
        redirect_uri = f"{base_url}/auth/google/callback"

        # Exchange code for tokens
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code"
                }
            )
            tokens = token_response.json()

            if "error" in tokens:
                return RedirectResponse("/signin?error=token_exchange_failed")

            # Get user info
            userinfo_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {tokens['access_token']}"}
            )
            userinfo = userinfo_response.json()

        email = userinfo.get("email", "")
        name = userinfo.get("name", email.split("@")[0])
        google_id = userinfo.get("id", "")

        # Check if user exists
        async with db.execute("SELECT rep_id FROM users WHERE email=?", (email,)) as cursor:
            existing = await cursor.fetchone()

        if existing:
            rep_id = existing["rep_id"]
            await db.execute(
                "UPDATE users SET google_id=?, name=? WHERE email=?",
                (google_id, name, email)
            )
        else:
            rep_id = f"REP_{google_id[:4].upper()}"
            await db.execute(
                "INSERT INTO users (email, name, rep_id, google_id) VALUES (?,?,?,?)",
                (email, name, rep_id, google_id)
            )
        await db.commit()

        # Find territory for the rep
        territory = "Nalgonda"
        try:
            clean_rep_id = "".join(filter(str.isdigit, rep_id))
            rep_id_int = int(clean_rep_id) if clean_rep_id else 1
            async with db.execute("SELECT territory FROM reps WHERE id=?", (rep_id_int,)) as cursor:
                rep_row = await cursor.fetchone()
                if rep_row:
                    territory = rep_row["territory"]
        except Exception:
            pass

        token = create_jwt(rep_id, email, name, territory)

        frontend_url = os.getenv("BASE_URL", "").rstrip("/") or str(request.base_url).rstrip("/")
        return RedirectResponse(f"{frontend_url}/signin?token={token}")

    except Exception as e:
        print(f"[auth] Google OAuth error: {e}")
        return RedirectResponse("/signin?error=oauth_error")

