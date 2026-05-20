# What it does: FastAPI application entry point with all routers mounted
# Input: HTTP requests
# Output: JSON API responses
# Called by: uvicorn main:app

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load .env FIRST — before any module reads os.getenv
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Preload ML models at startup so first request isn't slow."""
    from db.database import init_tables

    # Initialize database tables
    await init_tables()
    print("[AgroNav] Database tables initialized")

    # Warm up CatBoost model
    try:
        from services.inference import get_model
        get_model()
        print("[AgroNav] CatBoost model loaded")
    except Exception as e:
        print(f"[AgroNav] WARNING: CatBoost model failed to load: {e}")
        print("[AgroNav] Recommendations endpoint will not work until model is available")

    # Warm up SHAP explainer
    try:
        from services.shap_service import get_explainer
        get_explainer()
        print("[AgroNav] SHAP TreeExplainer initialized")
    except Exception as e:
        print(f"[AgroNav] WARNING: SHAP explainer failed to init: {e}")

    print("[AgroNav] API ready at http://localhost:8000")
    print("[AgroNav] Docs at http://localhost:8000/docs")
    yield


app = FastAPI(
    title="AgroNav API",
    description="Syngenta field sales rep assistant — AI-guided visit intelligence",
    lifespan=lifespan
)

# CORS — allow frontend and mobile origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3002",
        "http://localhost:3000",
        "http://localhost:19006",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- New routers (CatBoost + auth system) ---
from routers import auth as auth_router
from routers import recommendations as reco_router
from routers import visit_log as visit_log_router

app.include_router(auth_router.router)
app.include_router(reco_router.router)
app.include_router(visit_log_router.router)

# --- Existing routers (backward compatibility for current frontend) ---
from routers import outlets, visits, alerts, nba, sync, demo, recalibrate, manager

app.include_router(outlets.router, prefix="/api/outlets", tags=["outlets"])
app.include_router(visits.router, prefix="/api/visits", tags=["visits"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(nba.router, prefix="/api/nba", tags=["nba"])
app.include_router(sync.router, prefix="/api/sync", tags=["sync"])
app.include_router(demo.router, prefix="/api/demo", tags=["demo"])
app.include_router(recalibrate.router)  # has both /api/recalibrate and /recalibrate
app.include_router(manager.router, prefix="/api", tags=["manager"])

# --- Serve React Frontend ---
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_build_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/build"))
if os.path.exists(frontend_build_dir):
    static_dir = os.path.join(frontend_build_dir, "static")
    if os.path.exists(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/{catchall:path}")
    async def serve_react_app(catchall: str):
        # Exclude API endpoints from static file serving
        if catchall.startswith("api/") or catchall in ["login", "recommendations", "visit_log", "recalibrate"]:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not Found")

        file_path = os.path.join(frontend_build_dir, catchall)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
            
        index_file = os.path.join(frontend_build_dir, "index.html")
        return FileResponse(index_file)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

