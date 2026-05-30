# What it does: FastAPI application entry point with all routers mounted
# Input: HTTP requests
# Output: JSON API responses
# Called by: uvicorn main:app

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: init DB tables, seed demo data, warm up ML models."""
    from db.database import init_tables, get_db
    from db.seed_demo import seed_demo_data

    # 1. Init tables
    await init_tables()
    print("[AgroNav] Database tables initialized")

    # 2. Seed demo data (no-op if already seeded)
    try:
        import aiosqlite
        db_path = os.path.join(os.path.dirname(__file__), "agronav.db")
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            await seed_demo_data(db)
    except Exception as e:
        print(f"[AgroNav] Seed warning: {e}")

    # 3. Warm up CatBoost model
    try:
        from services.inference import get_model
        get_model()
        print("[AgroNav] CatBoost model loaded")
    except Exception as e:
        print(f"[AgroNav] WARNING: CatBoost model failed to load: {e}")

    # 4. Warm up SHAP explainer
    try:
        from services.shap_service import get_explainer
        get_explainer()
        print("[AgroNav] SHAP TreeExplainer initialized")
    except Exception as e:
        print(f"[AgroNav] WARNING: SHAP explainer failed to init: {e}")

    # 5. Warm up Model 2 (XGBoost ranking + IsolationForest anomaly)
    try:
        from services.model2_inference import get_ranking_model
        get_ranking_model()
        print("[AgroNav] Model 2 (XGBoost) loaded")
    except Exception as e:
        print(f"[AgroNav] WARNING: Model 2 failed to load: {e}")

    print("[AgroNav] API ready")
    yield


app = FastAPI(
    title="AgroNav API",
    description="Syngenta field sales rep assistant — AI-guided visit intelligence",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3002", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Core routers ───────────────────────────────────────────────────────────────
from routers import auth as auth_router
from routers import recommendations as reco_router
from routers import visit_log as visit_log_router
from routers import outcomes as outcomes_router
from routers import debug as debug_router

app.include_router(auth_router.router)
app.include_router(reco_router.router)
app.include_router(visit_log_router.router)
app.include_router(outcomes_router.router)
app.include_router(debug_router.router)

# Model inference router (Model 1 + Model 2 endpoints)
from routers import model_inference as inference_router
app.include_router(inference_router.router)

# ── Legacy / compatibility routers ────────────────────────────────────────────
from routers import outlets, visits, alerts, nba, sync, demo, recalibrate, manager

app.include_router(outlets.router,    prefix="/api/outlets",    tags=["outlets"])
app.include_router(visits.router,     prefix="/api/visits",     tags=["visits"])
app.include_router(alerts.router,     prefix="/api/alerts",     tags=["alerts"])
app.include_router(nba.router,        prefix="/api/nba",        tags=["nba"])
app.include_router(sync.router,       prefix="/api/sync",       tags=["sync"])
app.include_router(demo.router,       prefix="/api/demo",       tags=["demo"])
app.include_router(recalibrate.router)
app.include_router(manager.router,    prefix="/api",            tags=["manager"])

# Competitor intelligence router
from routers import competitor as competitor_router
app.include_router(competitor_router.router, tags=["competitor"])

# Route optimization + morning briefing router
from routers import route as route_router
app.include_router(route_router.router, tags=["route"])

# Weekly outcome learning router
from routers import learning as learning_router
app.include_router(learning_router.router, tags=["learning"])

# Farmer visit planner router (Gap 6)
from routers import farmers as farmers_router
app.include_router(farmers_router.router, tags=["farmers"])

# ── Serve React Frontend ───────────────────────────────────────────────────────
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_build_dir = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../frontend/build")
)

# API path prefixes that must NOT be caught by the React fallback
_API_PREFIXES = (
    "api/", "login", "signup", "recommendations", "visit_log",
    "recalibrate", "health", "docs", "openapi.json"
)

if os.path.exists(frontend_build_dir):
    static_dir = os.path.join(frontend_build_dir, "static")
    if os.path.exists(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/{catchall:path}")
    async def serve_react_app(catchall: str):
        if catchall.startswith(_API_PREFIXES):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = os.path.join(frontend_build_dir, catchall)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_build_dir, "index.html"))

    @app.get("/health")
    async def health():
        return {"status": "ok", "service": "AgroNav"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
