# What it does: FastAPI application entry point with all routers mounted
# Input: HTTP requests
# Output: JSON API responses
# Called by: uvicorn main:app

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import outlets, visits, alerts, nba, sync, demo, recalibrate, manager
import uvicorn
import os

app = FastAPI(title="AgroNav API", description="Syngenta field sales rep assistant")

# CORS — allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(outlets.router, prefix="/api/outlets", tags=["outlets"])
app.include_router(visits.router, prefix="/api/visits", tags=["visits"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(nba.router, prefix="/api/nba", tags=["nba"])
app.include_router(sync.router, prefix="/api/sync", tags=["sync"])
app.include_router(demo.router, prefix="/api/demo", tags=["demo"])
app.include_router(recalibrate.router, prefix="/api", tags=["recalibrate"])
app.include_router(manager.router, prefix="/api", tags=["manager"])

# Serve frontend static files
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.isdir(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")


@app.on_event("startup")
async def startup():
    """Initialize database tables on app startup."""
    from db.database import init_tables
    await init_tables()
    print("[AgroNav] API ready at http://localhost:8000")
    print("[AgroNav] Docs at http://localhost:8000/docs")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
