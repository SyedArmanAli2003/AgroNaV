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
    """[DISABLED] Public registration is closed. Use POST /api/manager/create-rep instead."""
    raise HTTPException(
        status_code=403,
        detail="Registration is closed. Contact your manager to get access."
    )


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


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None


@router.patch("/api/rep/profile")
async def update_profile(
    req: ProfileUpdateRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Update the authenticated rep's display name and/or territory."""
    rep_id = current_user.get("sub")
    if not rep_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    ALLOWED_FIELDS = {"name", "district", "state"}
    fields, values = [], []
    if req.name and req.name.strip():
        fields.append("name=?")
        values.append(req.name.strip())
    if req.district:
        fields.append("district=?")
        values.append(req.district)
    if req.state:
        fields.append("state=?")
        values.append(req.state)

    if not fields:
        raise HTTPException(status_code=400, detail="Nothing to update")

    values.append(rep_id)
    await db.execute(f"UPDATE users SET {', '.join(fields)} WHERE rep_id=?", values)
    await db.commit()

    # Return updated user
    async with db.execute(
        "SELECT name, rep_id, email, role, district, state, territory_id FROM users WHERE rep_id=?",
        (rep_id,)
    ) as cursor:
        updated = await cursor.fetchone()

    return {
        "success": True,
        "user": {
            "name": updated["name"],
            "rep_id": updated["rep_id"],
            "email": updated["email"],
            "role": updated["role"],
            "territory": updated["district"],
            "district": updated["district"],
            "state": updated["state"],
        }
    }
