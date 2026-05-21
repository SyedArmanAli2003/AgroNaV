# What it does: Auth routes — signup, login (supports email and Rep ID login)
# Input: POST bodies with credentials
# Output: JWT tokens with role claim
# Called by: Frontend SignIn/SignUp pages

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from db.database import get_db
from auth import hash_password, verify_password, create_jwt, get_current_user

router = APIRouter(tags=["auth"])


# --- Pydantic models ---

class SignUpRequest(BaseModel):
    email: str
    password: str
    rep_id: str
    name: str
    role: Optional[str] = "rep"
    district: Optional[str] = None
    state: Optional[str] = None
    territory_id: Optional[str] = None
    manager_id: Optional[int] = None


class LoginRequest(BaseModel):
    email: str  # Can be email or rep_id
    password: str


# --- Routes ---

@router.post("/signup")
async def signup(req: SignUpRequest, db=Depends(get_db)):
    """Register a new user with email/password and optional role."""
    # Check if email already exists
    async with db.execute("SELECT id FROM users WHERE email=?", (req.email,)) as cursor:
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")

    # Check if rep_id already exists
    async with db.execute("SELECT id FROM users WHERE rep_id=?", (req.rep_id,)) as cursor:
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Rep ID already registered")

    pw_hash = hash_password(req.password)
    role = req.role if req.role in ("rep", "manager", "admin") else "rep"

    await db.execute(
        """INSERT INTO users
           (email, password_hash, name, rep_id, role, district, state, territory_id, manager_id)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (req.email, pw_hash, req.name, req.rep_id, role,
         req.district, req.state, req.territory_id, req.manager_id)
    )
    await db.commit()

    territory = req.district or "Nalgonda"
    token = create_jwt(req.rep_id, req.email, req.name, territory, role)
    return {
        "token": token,
        "role": role,
        "user": {
            "email": req.email,
            "name": req.name,
            "rep_id": req.rep_id,
            "territory": territory,
            "role": role,
        }
    }


@router.post("/login")
async def login(req: LoginRequest, db=Depends(get_db)):
    """Login with email or Rep ID. Returns JWT with role."""
    async with db.execute(
        """SELECT id, password_hash, name, rep_id, role,
                  state, district, territory_id, manager_id
           FROM users WHERE email=? OR rep_id=?""",
        (req.email, req.email)
    ) as cursor:
        user = await cursor.fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email/Rep ID or password")
    if not user["password_hash"] or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email/Rep ID or password")

    territory = user["district"] or "Nalgonda"
    role = user["role"] or "rep"

    token = create_jwt(user["rep_id"], req.email, user["name"], territory, role)
    return {
        "token": token,
        "role": role,
        "user": {
            "email": req.email,
            "name": user["name"],
            "rep_id": user["rep_id"],
            "territory": territory,
            "role": role,
            "state": user["state"],
            "district": user["district"],
            "territory_id": user["territory_id"],
            "manager_id": user["manager_id"],
        }
    }


@router.patch("/api/rep/territory")
async def update_territory(
    req: dict,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Allow reps and managers to update their territory."""
    rep_id = req.get("rep_id") or current_user.get("sub")
    district = req.get("district")
    state = req.get("state")
    territory_id = req.get("territory_id")
    await db.execute(
        "UPDATE users SET district=?, state=?, territory_id=? WHERE rep_id=?",
        (district, state, territory_id, rep_id)
    )
    await db.commit()
    return {"success": True, "message": "Territory updated"}
