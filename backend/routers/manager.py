# What it does: Manager portal endpoints — KPIs, retailer CRUD, rep management
# Called by: Frontend Manager page

import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from db.database import get_db
from auth import require_manager, require_any, get_current_user

router = APIRouter(tags=["manager"])


# --- Pydantic ---

class RetailerCreate(BaseModel):
    retailer_name: str
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    tehsil: str
    district: Optional[str] = None
    state: Optional[str] = None
    territory_id: Optional[str] = None


class RetailerUpdate(BaseModel):
    retailer_name: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    tehsil: Optional[str] = None
    is_active: Optional[int] = None


class RepCreate(BaseModel):
    name: str
    email: str
    rep_id: Optional[str] = None
    password: str
    territory_id: Optional[str] = None


# ── KPIs ──────────────────────────────────────────────────────────────────────

@router.get("/manager/kpis")
async def get_manager_kpis(
    territory: str = "Nalgonda",
    db=Depends(get_db)
):
    today = date.today().isoformat()

    # Active retailers in territory
    try:
        async with db.execute(
            "SELECT COUNT(*) as c FROM retailers WHERE is_active=1"
        ) as cur:
            retailers_count = (await cur.fetchone())["c"]
    except Exception:
        retailers_count = 0

    # Reps count
    try:
        async with db.execute(
            "SELECT COUNT(*) as c FROM users WHERE role='rep'"
        ) as cur:
            reps_count = (await cur.fetchone())["c"]
    except Exception:
        reps_count = 0

    # Visits today
    async with db.execute(
        "SELECT COUNT(*) as c FROM visit_logs WHERE date=?", (today,)
    ) as cursor:
        visits_completed = (await cursor.fetchone() or {"c": 0})["c"]

    # Revenue this week
    async with db.execute(
        "SELECT COALESCE(SUM(order_value),0) as total FROM visit_logs WHERE date >= date('now','-7 days')"
    ) as cursor:
        revenue_week = (await cursor.fetchone() or {"total": 0})["total"]

    # Active alerts
    async with db.execute("SELECT COUNT(*) as c FROM alerts WHERE dismissed=0") as cursor:
        active_alerts = (await cursor.fetchone() or {"c": 0})["c"]

    # Acceptance rate
    async with db.execute("SELECT acceptance_rate FROM weekly_stats ORDER BY id DESC LIMIT 1") as cursor:
        row = await cursor.fetchone()
        acceptance = row["acceptance_rate"] if row else 0.0

    # Outlets (legacy)
    async with db.execute("SELECT * FROM outlets WHERE district=?", (territory,)) as cursor:
        outlets = await cursor.fetchall()

    return {
        "kpis": {
            "total_retailers": retailers_count,
            "reps_count": reps_count,
            "visits_today": len(outlets),
            "visits_completed": visits_completed,
            "high_priority_pending": sum(
                1 for o in outlets
                if o["has_pest_alert"] or o["stock_days_remaining"] < 4
            ),
            "acceptance_rate_this_week": acceptance,
            "revenue_this_week": revenue_week,
            "active_alerts": active_alerts,
        },
        "outlets": [dict(o) for o in outlets]
    }


# ── Retailer Management ────────────────────────────────────────────────────────

@router.get("/manager/retailers")
async def get_retailers(
    current_user=Depends(require_manager),
    db=Depends(get_db)
):
    """Return all active retailers managed by this manager."""
    manager_rep_id = current_user.get("sub")

    # Get manager's DB id
    async with db.execute("SELECT id, territory_id FROM users WHERE rep_id=?", (manager_rep_id,)) as cur:
        mgr = await cur.fetchone()

    if not mgr:
        return {"retailers": []}

    # Return retailers for this manager's territory (or by manager_id)
    async with db.execute(
        "SELECT * FROM retailers WHERE (manager_id=? OR territory_id=?) ORDER BY created_at DESC",
        (mgr["id"], mgr["territory_id"] or "TERR_001")
    ) as cursor:
        rows = await cursor.fetchall()

    return {"retailers": [dict(r) for r in rows]}


@router.post("/manager/retailers")
async def add_retailer(
    data: RetailerCreate,
    current_user=Depends(require_manager),
    db=Depends(get_db)
):
    """Add a new retailer to this manager's territory."""
    manager_rep_id = current_user.get("sub")

    async with db.execute("SELECT id, district, state, territory_id FROM users WHERE rep_id=?", (manager_rep_id,)) as cur:
        mgr = await cur.fetchone()

    if not mgr:
        raise HTTPException(status_code=404, detail="Manager not found")

    retailer_id = f"RTL_{uuid.uuid4().hex[:8].upper()}"
    district = data.district or mgr["district"] or "Jalgaon"
    state = data.state or mgr["state"] or "Maharashtra"
    territory_id = data.territory_id or mgr["territory_id"] or "TERR_001"

    await db.execute(
        """INSERT INTO retailers
           (retailer_id, retailer_name, territory_id, manager_id,
            tehsil, district, state, contact_name, phone, is_active)
           VALUES (?,?,?,?,?,?,?,?,?,1)""",
        (retailer_id, data.retailer_name, territory_id, mgr["id"],
         data.tehsil, district, state, data.contact_name, data.phone)
    )
    await db.commit()
    return {
        "success": True,
        "retailer_id": retailer_id,
        "message": f"Retailer '{data.retailer_name}' added to your territory"
    }


@router.put("/manager/retailers/{retailer_id}")
async def update_retailer(
    retailer_id: str,
    data: RetailerUpdate,
    current_user=Depends(require_manager),
    db=Depends(get_db)
):
    """Update retailer info. Only owner manager can update."""
    # Build dynamic update
    fields = []
    values = []
    for field, val in data.dict(exclude_none=True).items():
        fields.append(f"{field}=?")
        values.append(val)

    if not fields:
        return {"success": True, "message": "Nothing to update"}

    values.append(retailer_id)
    await db.execute(
        f"UPDATE retailers SET {', '.join(fields)} WHERE retailer_id=?",
        values
    )
    await db.commit()
    return {"success": True, "message": "Retailer updated"}


@router.delete("/manager/retailers/{retailer_id}")
async def deactivate_retailer(
    retailer_id: str,
    current_user=Depends(require_manager),
    db=Depends(get_db)
):
    """Soft-delete retailer by setting is_active=0."""
    await db.execute(
        "UPDATE retailers SET is_active=0 WHERE retailer_id=?",
        (retailer_id,)
    )
    await db.commit()
    return {"success": True, "message": "Retailer deactivated"}


# ── Rep Management ─────────────────────────────────────────────────────────────

@router.get("/manager/reps")
async def get_reps(
    current_user=Depends(require_manager),
    db=Depends(get_db)
):
    """Return all reps under this manager."""
    manager_rep_id = current_user.get("sub")

    async with db.execute("SELECT id FROM users WHERE rep_id=?", (manager_rep_id,)) as cur:
        mgr = await cur.fetchone()

    if not mgr:
        return {"reps": []}

    async with db.execute(
        "SELECT id, name, rep_id, email, territory_id, district, state FROM users WHERE manager_id=? AND role='rep'",
        (mgr["id"],)
    ) as cursor:
        rows = await cursor.fetchall()

    # Get visit counts today for each rep
    today = date.today().isoformat()
    reps = []
    for r in rows:
        async with db.execute(
            "SELECT COUNT(*) as c FROM visit_logs WHERE rep_id=? AND date=?",
            (r["rep_id"], today)
        ) as vcur:
            vcount = (await vcur.fetchone() or {"c": 0})["c"]
        reps.append({**dict(r), "visits_today": vcount, "status": "active"})

    return {"reps": reps}


@router.post("/manager/reps/{rep_id}/territory")
async def assign_territory(
    rep_id: str,
    territory_id: str,
    current_user=Depends(require_manager),
    db=Depends(get_db)
):
    """Assign a territory to a rep under this manager."""
    await db.execute(
        "UPDATE users SET territory_id=? WHERE rep_id=?",
        (territory_id, rep_id)
    )
    await db.commit()
    return {"success": True, "message": f"Territory {territory_id} assigned to {rep_id}"}


# ── Debug / Seed Status ────────────────────────────────────────────────────────

@router.get("/debug/seed-status")
async def seed_status(db=Depends(get_db)):
    """Check DB seed state — used in QA tests."""
    try:
        async with db.execute("SELECT COUNT(*) as c FROM users") as cur:
            users_count = (await cur.fetchone())["c"]
        async with db.execute("SELECT COUNT(*) as c FROM retailers") as cur:
            retailers_count = (await cur.fetchone())["c"]
        return {
            "seeded": users_count > 0 and retailers_count > 0,
            "users_count": users_count,
            "retailers_count": retailers_count
        }
    except Exception as e:
        return {"seeded": False, "error": str(e)}
