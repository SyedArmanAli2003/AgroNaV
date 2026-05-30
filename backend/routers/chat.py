"""
POST /api/chat  — Role-aware AI chatbot powered by GLM-5.1 via NVIDIA NIM.

Input:  { message, role ("rep"|"manager"|"admin"), user_id, context? }
Output: { reply, context }

Special message "__greeting__" returns the opening greeting for the chat panel.
"""

import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from db.database import get_db

router = APIRouter()

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")


# ── DB context loaders ────────────────────────────────────────────────────────

async def _rep_context(user_id: str, db) -> dict:
    today = datetime.now().strftime("%Y-%m-%d")
    district = None

    async with db.execute(
        "SELECT district FROM users WHERE rep_id = ?", (user_id,)
    ) as cur:
        row = await cur.fetchone()
        if row:
            district = row["district"]

    if not district:
        async with db.execute(
            "SELECT district FROM reps_territory WHERE rep_id = ?", (user_id,)
        ) as cur:
            row = await cur.fetchone()
            if row:
                district = row["district"]

    # Visit count today
    async with db.execute(
        "SELECT COUNT(*) as cnt FROM visit_logs WHERE rep_id = ? AND date = ?",
        (user_id, today)
    ) as cur:
        row = await cur.fetchone()
    visit_count = row["cnt"] if row else 0

    # Outlets in territory
    outlets = []
    if district:
        async with db.execute(
            "SELECT * FROM outlets WHERE district = ?", (district,)
        ) as cur:
            rows = await cur.fetchall()
        outlets = [dict(r) for r in rows]

    if not outlets:
        async with db.execute("SELECT * FROM outlets LIMIT 30") as cur:
            rows = await cur.fetchall()
        outlets = [dict(r) for r in rows]

    top_outlet = "N/A"
    if outlets:
        try:
            from services.scoring import rank_outlets
            scored = rank_outlets(outlets)
            if scored:
                top_outlet = scored[0].get("name", "N/A")
        except Exception:
            top_outlet = outlets[0].get("name", "N/A") if outlets else "N/A"

    total_outlets = len(outlets)
    pending = max(0, total_outlets - visit_count)

    return {
        "visit_count_today": visit_count,
        "total_outlets": total_outlets,
        "pending_visits": pending,
        "top_priority_outlet": top_outlet,
        "district": district or "your territory",
    }


async def _manager_context(db) -> dict:
    today = datetime.now().strftime("%Y-%m-%d")
    week_start = (
        datetime.now() - timedelta(days=datetime.now().weekday())
    ).strftime("%Y-%m-%d")

    async with db.execute(
        "SELECT COUNT(*) as cnt FROM users WHERE role = 'rep'"
    ) as cur:
        row = await cur.fetchone()
    total_reps = row["cnt"] if row else 0

    async with db.execute(
        "SELECT COUNT(DISTINCT rep_id) as cnt FROM visit_logs WHERE date = ?", (today,)
    ) as cur:
        row = await cur.fetchone()
    reps_visited_today = row["cnt"] if row else 0

    async with db.execute(
        """SELECT COUNT(*) as total,
           SUM(CASE WHEN outcome IN ('sale','order') THEN 1 ELSE 0 END) as accepted
           FROM visit_logs WHERE date >= ?""",
        (week_start,)
    ) as cur:
        row = await cur.fetchone()
    total_w = row["total"] if row else 0
    accepted_w = row["accepted"] if row else 0
    acceptance_rate = round(accepted_w / total_w * 100, 1) if total_w > 0 else 0

    top_alert = "None"
    try:
        async with db.execute(
            "SELECT message FROM alerts WHERE severity = 'HIGH' AND dismissed = 0 "
            "ORDER BY created_at DESC LIMIT 1"
        ) as cur:
            row = await cur.fetchone()
        if row:
            top_alert = row["message"]
    except Exception:
        pass

    cutoff = (datetime.now() - timedelta(days=14)).strftime("%Y-%m-%d")
    try:
        async with db.execute(
            """SELECT COUNT(*) as cnt FROM outlets o
               WHERE NOT EXISTS (
                 SELECT 1 FROM visit_logs v WHERE v.outlet_id = o.id AND v.date >= ?
               )""",
            (cutoff,)
        ) as cur:
            row = await cur.fetchone()
        underperforming = row["cnt"] if row else 0
    except Exception:
        underperforming = 0

    return {
        "total_reps": total_reps,
        "reps_visited_today": reps_visited_today,
        "acceptance_rate": acceptance_rate,
        "top_alert": top_alert,
        "underperforming_outlets": underperforming,
    }


async def _admin_context(db) -> dict:
    today = datetime.now().strftime("%Y-%m-%d")
    week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    month_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

    async with db.execute(
        "SELECT COUNT(*) as cnt FROM visit_logs WHERE date = ?", (today,)
    ) as cur:
        row = await cur.fetchone()
    total_visits_today = row["cnt"] if row else 0

    async with db.execute(
        "SELECT COUNT(DISTINCT rep_id) as cnt FROM visit_logs WHERE date >= ?", (week_ago,)
    ) as cur:
        row = await cur.fetchone()
    active_reps = row["cnt"] if row else 0

    async with db.execute(
        """SELECT COUNT(*) as total,
           SUM(CASE WHEN outcome IN ('sale','order') THEN 1 ELSE 0 END) as accepted
           FROM visit_logs WHERE date >= ?""",
        (month_ago,)
    ) as cur:
        row = await cur.fetchone()
    total_m = row["total"] if row else 0
    accepted_m = row["accepted"] if row else 0
    acceptance_rate = round(accepted_m / total_m * 100, 1) if total_m > 0 else 0

    high_alert = "None"
    try:
        async with db.execute(
            "SELECT message FROM alerts WHERE severity = 'HIGH' AND dismissed = 0 "
            "ORDER BY created_at DESC LIMIT 1"
        ) as cur:
            row = await cur.fetchone()
        if row:
            high_alert = row["message"]
    except Exception:
        pass

    return {
        "total_visits_today": total_visits_today,
        "active_reps": active_reps,
        "acceptance_rate": acceptance_rate,
        "high_alert": high_alert,
    }


# ── System prompts ────────────────────────────────────────────────────────────

def _system_prompt(role: str, ctx: dict) -> str:
    if role == "rep":
        ctx_str = (
            f"Visit count today: {ctx.get('visit_count_today', 0)}. "
            f"Total outlets in territory: {ctx.get('total_outlets', 0)}. "
            f"Pending visits: {ctx.get('pending_visits', 0)}. "
            f"Top priority outlet: {ctx.get('top_priority_outlet', 'N/A')}. "
            f"District: {ctx.get('district', 'N/A')}."
        )
        return (
            "You are a helpful field assistant for a Syngenta India sales rep. "
            "You have access to their today's visit plan and outlet data. "
            "Answer questions about which outlet to visit next, why an outlet "
            "is high priority, what product to pitch, and agronomic advice. "
            "Keep answers under 3 sentences. Be direct and practical. "
            f"Context: {ctx_str}"
        )
    elif role == "manager":
        ctx_str = (
            f"Total reps: {ctx.get('total_reps', 0)}. "
            f"Reps visited today: {ctx.get('reps_visited_today', 0)}. "
            f"Acceptance rate this week: {ctx.get('acceptance_rate', 0)}%. "
            f"Top alert: {ctx.get('top_alert', 'None')}. "
            f"Outlets unvisited in 14+ days: {ctx.get('underperforming_outlets', 0)}."
        )
        return (
            "You are a sales operations assistant for a Syngenta India field manager. "
            "You have access to district-level performance data and rep activity. "
            "Answer questions about team performance, which rep needs coaching, "
            "which district is underperforming, and weekly plan status. "
            "Keep answers under 4 sentences. Use numbers from the context. "
            f"Context: {ctx_str}"
        )
    else:  # admin
        ctx_str = (
            f"Total visits today: {ctx.get('total_visits_today', 0)}. "
            f"Active reps (last 7 days): {ctx.get('active_reps', 0)}. "
            f"Acceptance rate (last 30 days): {ctx.get('acceptance_rate', 0)}%. "
            f"HIGH severity alert: {ctx.get('high_alert', 'None')}."
        )
        return (
            "You are a business intelligence assistant for a Syngenta India admin. "
            "You have access to system-wide operational data. "
            "Answer questions about overall performance, rep coverage, "
            "anomaly alerts, and system health. "
            "Keep answers under 4 sentences. Always cite specific numbers. "
            f"Context: {ctx_str}"
        )


def _greeting(role: str, name: str, ctx: dict) -> str:
    if role == "rep":
        pending = ctx.get("pending_visits", ctx.get("total_outlets", 0))
        top = ctx.get("top_priority_outlet", "N/A")
        return (
            f"Hi {name}! You have {pending} outlets to visit today. "
            f"Your top priority is {top}. How can I help?"
        )
    elif role == "manager":
        visited = ctx.get("reps_visited_today", 0)
        total = ctx.get("total_reps", 0)
        rate = ctx.get("acceptance_rate", 0)
        return (
            f"Hello {name}. {visited} of your {total} reps have visited today. "
            f"Acceptance rate this week: {rate}%. What do you need?"
        )
    else:
        visits = ctx.get("total_visits_today", 0)
        reps = ctx.get("active_reps", 0)
        return (
            f"Hello. System status: {visits} visits logged today "
            f"across {reps} active reps. Any questions?"
        )


# ── LLM call with fallback ────────────────────────────────────────────────────

def _call_glm_sync(system: str, message: str):
    """Blocking NVIDIA NIM call — must be run in a thread via asyncio.to_thread."""
    if not NVIDIA_API_KEY or NVIDIA_API_KEY.startswith("your_"):
        return None
    try:
        from openai import OpenAI
        client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=NVIDIA_API_KEY,
            timeout=12.0,
        )
        resp = client.chat.completions.create(
            model="z-ai/glm-5.1",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": message},
            ],
            temperature=0.3,
            max_tokens=300,
            stream=False,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"[chat] GLM call failed: {e}")
        return None


async def _call_glm(system: str, message: str):
    """Non-blocking wrapper — runs sync OpenAI client in a thread pool."""
    import asyncio
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_call_glm_sync, system, message),
            timeout=14.0
        )
    except Exception as e:
        print(f"[chat] GLM async wrapper failed: {e}")
        return None


def _fallback_reply(role: str, ctx: dict) -> str:
    if role == "rep":
        return (
            f"You have {ctx.get('visit_count_today', 0)} visits logged today "
            f"with {ctx.get('pending_visits', 0)} outlets still pending. "
            f"Your top priority outlet is {ctx.get('top_priority_outlet', 'N/A')}."
        )
    elif role == "manager":
        return (
            f"Team status: {ctx.get('reps_visited_today', 0)} of "
            f"{ctx.get('total_reps', 0)} reps have visited today. "
            f"Acceptance rate this week: {ctx.get('acceptance_rate', 0)}%."
        )
    else:
        return (
            f"System: {ctx.get('total_visits_today', 0)} visits today, "
            f"{ctx.get('active_reps', 0)} active reps, "
            f"{ctx.get('acceptance_rate', 0)}% acceptance rate (30-day)."
        )


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/api/chat")
async def chat(body: dict, db=Depends(get_db)):
    message = str(body.get("message", "")).strip()
    role = str(body.get("role", "rep")).lower()
    user_id = str(body.get("user_id", "")).strip()
    user_name = str(body.get("name", "there")).strip() or "there"
    extra_ctx = body.get("context") or {}

    if role not in ("rep", "manager", "admin"):
        role = "rep"

    # Load role-specific DB context
    try:
        if role == "rep":
            ctx = await _rep_context(user_id, db)
        elif role == "manager":
            ctx = await _manager_context(db)
        else:
            ctx = await _admin_context(db)
        ctx.update(extra_ctx)
    except Exception as e:
        print(f"[chat] context load error: {e}")
        ctx = dict(extra_ctx)

    # Special greeting init message
    if message == "__greeting__":
        return {"reply": _greeting(role, user_name, ctx), "context": ctx}

    if not message:
        return {"reply": "Please send a message.", "context": ctx}

    system = _system_prompt(role, ctx)
    reply = await _call_glm(system, message) or _fallback_reply(role, ctx)

    return {"reply": reply, "context": ctx}
