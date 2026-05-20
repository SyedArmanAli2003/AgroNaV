# What it does: Auth routes — signup, login (supports email and Rep ID)
# Input: POST bodies with credentials
# Output: JWT tokens
# Called by: Frontend SignIn/SignUp pages

import os
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from db.database import get_db
from auth import hash_password, verify_password, create_jwt

router = APIRouter(tags=["auth"])


# --- Pydantic models ---

class SignUpRequest(BaseModel):
    email: str
    password: str
    rep_id: str
    name: str


class LoginRequest(BaseModel):
    email: str  # Can be email or rep_id
    password: str


# --- Routes ---

@router.post("/signup")
async def signup(req: SignUpRequest, db=Depends(get_db)):
    """Register a new user with email/password."""
    # Check if email already exists
    async with db.execute("SELECT id FROM users WHERE email=?", (req.email,)) as cursor:
        existing_email = await cursor.fetchone()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check if rep_id already exists
    async with db.execute("SELECT id FROM users WHERE rep_id=?", (req.rep_id,)) as cursor:
        existing_rep = await cursor.fetchone()
    if existing_rep:
        raise HTTPException(status_code=400, detail="Rep ID already registered")

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
    return {
        "token": token,
        "user": {
            "email": req.email,
            "name": req.name,
            "rep_id": req.rep_id,
            "territory": territory
        }
    }


@router.post("/login")
async def login(req: LoginRequest, db=Depends(get_db)):
    """Login with email or Rep ID."""
    async with db.execute(
        "SELECT password_hash, name, rep_id, state, district, territory_id FROM users WHERE email=? OR rep_id=?",
        (req.email, req.email)
    ) as cursor:
        user = await cursor.fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email/Rep ID or password")

    if not user["password_hash"] or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email/Rep ID or password")

    # Determine territory
    territory = user["district"]
    if not territory:
        # Fallback to reps table lookup
        try:
            clean_rep_id = "".join(filter(str.isdigit, user["rep_id"]))
            rep_id_int = int(clean_rep_id) if clean_rep_id else 1
            async with db.execute("SELECT territory FROM reps WHERE id=?", (rep_id_int,)) as cursor:
                rep_row = await cursor.fetchone()
                if rep_row:
                    territory = rep_row["territory"]
        except Exception:
            pass
    
    if not territory:
        territory = "Nalgonda"

    token = create_jwt(user["rep_id"], req.email, user["name"], territory)
    return {
        "token": token,
        "user": {
            "email": req.email,
            "name": user["name"],
            "rep_id": user["rep_id"],
            "territory": territory,
            "state": user["state"],
            "district": user["district"],
            "territory_id": user["territory_id"]
        }
    }
