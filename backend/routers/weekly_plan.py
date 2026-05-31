from fastapi import APIRouter, Depends, Query
from db.database import get_db
from services.scoring import rank_outlets
from datetime import datetime, timedelta
import json

router = APIRouter()

DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"]


# FIXED BUG 5: safe outlet-id extractor — rank_outlets() may key dicts by "id",
# "outlet_id", or "retailer_id". Used consistently for daily_split AND outlet_map.
def _oid(o: dict):
    return o.get("id") or o.get("outlet_id") or o.get("retailer_id", "")


def _week_label(week_start_date: str) -> str:
    dt = datetime.strptime(week_start_date, "%Y-%m-%d")
    week_num = dt.isocalendar()[1]
    return f"Week {week_num} - {dt.strftime('%b %Y')}"


def _week_end_date(week_start_date: str) -> str:
    dt = datetime.strptime(week_start_date, "%Y-%m-%d")
    return (dt + timedelta(days=4)).strftime("%Y-%m-%d")


def _split_by_day(scored: list) -> dict:
    """Monday/Tuesday: highest 10 (5 each). Wednesday: middle 5. Thu/Fri: remaining 10."""
    top = scored[:10]
    mid = scored[10:15]
    rest = scored[15:25]
    return {
        "monday":    [_oid(o) for o in top[:5]],     # FIXED BUG 5: safe id access
        "tuesday":   [_oid(o) for o in top[5:10]],    # FIXED BUG 5: safe id access
        "wednesday": [_oid(o) for o in mid],          # FIXED BUG 5: safe id access
        "thursday":  [_oid(o) for o in rest[:5]],     # FIXED BUG 5: safe id access
        "friday":    [_oid(o) for o in rest[5:10]],   # FIXED BUG 5: safe id access
    }


def _enrich_split(daily_split: dict, outlet_map: dict, today_day: str) -> dict:
    enriched = {}
    for day, ids in daily_split.items():
        enriched[day] = []
        for oid in ids:
            o = outlet_map.get(oid)
            if o:
                enriched[day].append({
                    "id": oid,
                    "name": o.get("name", ""),
                    "district": o.get("district", ""),
                    "score": o.get("score", 0),
                    "label": o.get("label", ""),
                    "reasons": o.get("reasons", []),
                    "is_today": day == today_day,
                })
    return enriched


async def _fetch_outlets_for_rep(rep_id: str, db) -> list:
    """Fetch outlets scoped to the rep's district, falling back to all outlets."""
    district = None

    async with db.execute(
        "SELECT district FROM reps_territory WHERE rep_id = ?", (rep_id,)
    ) as cur:
        row = await cur.fetchone()
        if row:
            district = row["district"]

    if not district:
        async with db.execute(
            "SELECT district FROM users WHERE rep_id = ?", (rep_id,)
        ) as cur:
            row = await cur.fetchone()
            if row:
                district = row["district"]

    if district:
        async with db.execute(
            "SELECT * FROM outlets WHERE district = ?", (district,)
        ) as cur:
            rows = await cur.fetchall()
        outlets = [dict(r) for r in rows]
        if outlets:
            return outlets

    async with db.execute("SELECT * FROM outlets") as cur:
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("/api/manager/weekly-plan/generate")
async def generate_weekly_plan(body: dict, db=Depends(get_db)):
    """Generate a weekly visit plan for a rep.

    Fetches top 25 priority outlets via rank_outlets(), splits them across
    5 working days, saves the plan as 'pending', and returns the plan.
    """
    rep_id = body.get("rep_id", "").strip()
    week_start_date = body.get("week_start_date", "").strip()
    created_by = str(body.get("manager_id", "manager"))

    if not rep_id or not week_start_date:
        return {"success": False, "error": "rep_id and week_start_date are required"}

    try:
        datetime.strptime(week_start_date, "%Y-%m-%d")
    except ValueError:
        return {"success": False, "error": "week_start_date must be YYYY-MM-DD"}

    outlets = await _fetch_outlets_for_rep(rep_id, db)
    scored = rank_outlets(outlets)
    top25 = scored[:25]

    if not top25:
        return {"success": False, "error": "No outlets found for this rep's district"}

    assigned_ids = [_oid(o) for o in top25]  # FIXED BUG 5: safe id access
    daily_split = _split_by_day(top25)
    week_label = _week_label(week_start_date)
    week_end = _week_end_date(week_start_date)
    now = datetime.now().isoformat()

    await db.execute(
        """INSERT INTO weekly_plans
           (rep_id, week_label, week_start_date, week_end_date,
            assigned_outlets, daily_split, status, created_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)""",
        (rep_id, week_label, week_start_date, week_end,
         json.dumps(assigned_ids), json.dumps(daily_split),
         created_by, now)
    )
    await db.commit()

    async with db.execute("SELECT last_insert_rowid() AS id") as cur:
        plan_id = (await cur.fetchone())["id"]

    outlet_map = {_oid(o): o for o in top25}  # FIXED BUG 5: safe id access (aligns with daily_split)
    today_day = datetime.now().strftime("%A").lower()

    return {
        "success": True,
        "plan": {
            "id": plan_id,
            "rep_id": rep_id,
            "week_label": week_label,
            "week_start_date": week_start_date,
            "week_end_date": week_end,
            "status": "pending",
            "total_outlets": len(top25),
            "daily_split": _enrich_split(daily_split, outlet_map, today_day),
        }
    }


@router.post("/api/manager/weekly-plan/approve")
async def approve_weekly_plan(body: dict, db=Depends(get_db)):
    """Approve a pending plan — changes status from 'pending' to 'approved'."""
    plan_id = body.get("plan_id")
    if not plan_id:
        return {"success": False, "error": "plan_id is required"}

    async with db.execute(
        "SELECT id, status FROM weekly_plans WHERE id = ?", (plan_id,)
    ) as cur:
        row = await cur.fetchone()

    if not row:
        return {"success": False, "error": "Plan not found"}

    if row["status"] not in ("pending", "approved"):
        return {"success": False, "error": f"Cannot approve a plan with status '{row['status']}'"}

    await db.execute(
        "UPDATE weekly_plans SET status = 'approved' WHERE id = ?", (plan_id,)
    )
    await db.commit()
    return {"success": True, "plan_id": plan_id, "status": "approved"}


@router.get("/api/rep/weekly-plan")
async def get_rep_weekly_plan(rep_id: str = Query(...), db=Depends(get_db)):
    """Return the approved/active plan for the rep's current week, with outlet details."""
    today = datetime.now()
    monday = today - timedelta(days=today.weekday())
    week_start = monday.strftime("%Y-%m-%d")
    today_day = today.strftime("%A").lower()

    async with db.execute(
        """SELECT * FROM weekly_plans
           WHERE rep_id = ? AND week_start_date = ? AND status IN ('approved', 'active')
           ORDER BY id DESC LIMIT 1""",
        (rep_id, week_start)
    ) as cur:
        row = await cur.fetchone()

    if not row:
        return {"plan": None}

    plan = dict(row)
    assigned_ids = json.loads(plan.get("assigned_outlets") or "[]")
    daily_split_raw = json.loads(plan.get("daily_split") or "{}")

    outlet_map = {}
    if assigned_ids:
        placeholders = ",".join("?" * len(assigned_ids))
        async with db.execute(
            f"SELECT * FROM outlets WHERE id IN ({placeholders})", assigned_ids
        ) as cur:
            outlet_rows = await cur.fetchall()
        scored = rank_outlets([dict(r) for r in outlet_rows])
        outlet_map = {_oid(o): o for o in scored}  # FIXED BUG 5: safe id access (aligns with daily_split)

    plan["daily_split"] = _enrich_split(daily_split_raw, outlet_map, today_day)
    plan["assigned_outlets"] = assigned_ids
    plan["today_day"] = today_day
    return {"plan": plan}


@router.get("/api/manager/weekly-plans")
async def list_weekly_plans(rep_id: str = Query(None), db=Depends(get_db)):
    """List weekly plans, optionally filtered by rep_id."""
    if rep_id:
        async with db.execute(
            "SELECT * FROM weekly_plans WHERE rep_id = ? ORDER BY id DESC LIMIT 20",
            (rep_id,)
        ) as cur:
            rows = await cur.fetchall()
    else:
        async with db.execute(
            "SELECT * FROM weekly_plans ORDER BY id DESC LIMIT 50"
        ) as cur:
            rows = await cur.fetchall()

    return {"plans": [dict(r) for r in rows]}
