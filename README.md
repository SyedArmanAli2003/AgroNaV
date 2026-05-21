<div align="center">

# 🌿 AgroNav

### AI-Guided Field Sales Intelligence for Syngenta Reps

**IITM × Syngenta Hackathon 2026**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Cloud%20Run-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://agronav-730909394840.us-central1.run.app)
[![Backend](https://img.shields.io/badge/FastAPI-0.136-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Frontend](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![ML](https://img.shields.io/badge/CatBoost-AUC%200.79-FF6600?style=for-the-badge)](https://catboost.ai)
[![ML](https://img.shields.io/badge/XGBoost-3.2.0-FF6600?style=for-the-badge)](https://xgboost.readthedocs.io)

</div>

---

## 📖 Table of Contents

1. [What is AgroNav?](#what-is-agronav)
2. [Core Features](#core-features)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [ML Models](#ml-models)
6. [API Reference](#api-reference)
7. [Project Structure](#project-structure)
8. [Local Setup](#local-setup)
9. [Environment Variables](#environment-variables)
10. [Deployment](#deployment)
11. [Demo Credentials](#demo-credentials)
12. [Team](#team)

---

## What is AgroNav?

AgroNav is a production-grade **AI field sales assistant** built for Syngenta's territory representatives in rural India. Field reps visit dozens of retail agro-outlets every day — with no data, no AI guidance, and no visibility into which visits actually convert.

AgroNav solves this with a **three-layer AI system**:

| Layer | What it does |
|-------|-------------|
| **Priority Routing** | Every morning, ranks all outlets in the rep's territory by purchase probability using CatBoost (AUC 0.79) trained on 23,862 real field visits |
| **Next Best Action** | At every outlet, Gemini AI + LLaMA generate a tailored product pitch, agronomic advice, and talking points from live crop stage, pest alerts, and inventory data |
| **Outcome Learning** | Reps log visit results; outcomes feed into next Sunday's model retraining — a closed-loop learning system |

---

## Core Features

### 👨‍💼 For Field Reps
- **Daily visit plan** — 10 AI-ranked outlets delivered before 8 AM
- **SHAP-powered explanations** — "Why is this retailer ranked #1?" answered in plain English
- **Visit brief** — Product to pitch, agronomic advice, talking points (Gemini-generated)
- **Log outcomes** — One-tap visit logging (Order Placed / Interested / Rejected)
- **Visit history** — Full log of past visits with outcome tracking

### 🧑‍💼 For Managers
- **Team KPI dashboard** — Active retailers, reps, visits, AI score
- **Territory analytics** — Per-rep performance, outlet coverage maps
- **AI status monitor** — Live health of both ML models (AUC, inference time, feature count)
- **Retailer leaderboard** — Ranked by conversion probability

### 🤖 AI & ML
- Dual model stack: **CatBoost (primary)** → **XGBoost (fallback)** — automatic handoff
- **Anomaly detection** — IsolationForest flags demand spikes in retailer-SKU sales
- **SHAP TreeExplainer** — Feature-level explanations for every recommendation
- **LLM coaching** — Gemini 2.0 Flash + LLaMA 3.3 70B (OpenRouter) as backup

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   React SPA (Frontend)                  │
│  Landing → SignIn → Dashboard → Visit → Log → History   │
│                  Manager Portal                         │
└────────────────────────┬────────────────────────────────┘
                         │  HTTP / REST
┌────────────────────────▼────────────────────────────────┐
│              FastAPI Backend (Python 3.12)               │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Auth      │  │  Recommend  │  │  Model Inference │  │
│  │   JWT       │  │  Engine     │  │  Router          │  │
│  └─────────────┘  └──────┬──────┘  └────────┬────────┘  │
│                          │                  │            │
│  ┌───────────────────────▼──────────────────▼─────────┐ │
│  │              ML Services Layer                      │ │
│  │                                                     │ │
│  │  ┌────────────────┐    ┌──────────────────────────┐ │ │
│  │  │  Model 1       │    │  Model 2                 │ │ │
│  │  │  CatBoost      │───▶│  XGBoost Pipeline        │ │ │
│  │  │  AUC: 0.7869   │    │  (Fallback)              │ │ │
│  │  │  + SHAP        │    │  + IsolationForest       │ │ │
│  │  └────────────────┘    └──────────────────────────┘ │ │
│  │                                                     │ │
│  │  ┌────────────────┐    ┌──────────────────────────┐ │ │
│  │  │  Gemini AI     │    │  LLaMA 3.3 70B           │ │ │
│  │  │  (Primary NBA) │    │  (OpenRouter Fallback)   │ │ │
│  │  └────────────────┘    └──────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │           SQLite (aiosqlite async)                  │ │
│  │   users · visit_logs · retailers · alerts           │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                         │
                 Google Cloud Run
              us-central1 · 2 vCPU · 2GiB
```

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18 | UI framework |
| React Router | v6 | Client-side routing |
| Lucide React | latest | Icon system |
| Poppins / Source Serif 4 | Google Fonts | Typography |
| CSS Variables + Glassmorphism | — | Design system |
| React Portal | built-in | Dropdown overlay fix |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | 3.12 | Runtime |
| FastAPI | 0.136 | REST API framework |
| Uvicorn | 0.47 | ASGI server |
| Pydantic | v2 | Request/response validation |
| aiosqlite | 0.22 | Async SQLite driver |
| SQLAlchemy | 2.0 | ORM (async) |
| python-jose | 3.3 | JWT authentication |
| bcrypt | 5.0 | Password hashing |
| httpx | 0.28 | Async HTTP client (LLM calls) |
| python-dotenv | 1.2 | Environment variable loading |

### ML & AI
| Technology | Version | Purpose |
|-----------|---------|---------|
| CatBoost | 1.2.10 | Model 1 — visit outcome classifier |
| XGBoost | 3.2.0 | Model 2 — retailer ranking pipeline |
| scikit-learn | **1.6.1** (pinned) | Preprocessing pipeline (Model 2) |
| SHAP | 0.51 | TreeSHAP explainer for CatBoost |
| joblib | 1.5 | Model artifact serialization |
| pandas | 3.0 | Feature engineering |
| numpy | 2.4 | Numerical ops |
| Google Generative AI | 0.8.6 | Gemini 2.0 Flash NBA generation |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| Google Cloud Run | Container hosting (serverless) |
| Google Cloud Build | CI/CD container builds |
| Google Container Registry | Docker image storage |
| Docker | Multi-stage build (Node → Python) |
| GitHub | Source control |

---

## ML Models

### Model 1 — CatBoost Visit Outcome Classifier

> **Primary scoring model. Used by default.**

| Property | Value |
|----------|-------|
| Algorithm | CatBoostClassifier (Optuna-tuned) |
| Task | Binary classification — will visit convert? |
| Test AUC | **0.7869** |
| Training samples | 23,862 real Syngenta field visits |
| Features | 28 (visit signals + territory + crop signals) |
| Explainability | SHAP TreeExplainer (top-3 reasons per outlet) |
| Artifact | `ml/model_1/models/catboost_optuna_best.cbm` |

**Key input features:**
- `prev_order_amount_*` — historical SKU-level purchase amounts  
- `sku_qty_pre_visit` — current stock level
- `days_since_last_visit` — visit recency
- `is_critical_period` — pest outbreak flag
- `is_harvest_approaching` — crop stage flag
- `rep_diversity_score` — product mix breadth
- Territory signals: `state`, `district`, `tehsil`

---

### Model 2 — XGBoost Retailer Ranking Pipeline

> **Fallback model. Activates automatically if Model 1 fails.**

| Property | Value |
|----------|-------|
| Algorithm | XGBClassifier wrapped in sklearn Pipeline |
| Task | Binary classification — retailer worth visiting? |
| Estimated AUC | ~0.78 |
| Positive target rate | 30% |
| Features | 28 aggregate commercial signals |
| Anomaly detection | IsolationForest (demand spike detection) |
| Serialization | sklearn 1.6.1 joblib (version-pinned) |
| Artifacts | `ml/model_2/models/ranking_model.joblib` · `anomaly_detector.joblib` |

**Additional Model 2 capabilities:**
- `detect_anomalies()` — flags retailers with unusual demand spikes (IsolationForest)
- Returns `justification_triggers[]` — human-readable reasons without SHAP
- Covers all 10 retailers in territory when Model 1 is unavailable

---

### Fallback Chain

```
GET /recommendations
        │
        ▼
  Model 1 (CatBoost)  ──── OK ────▶ SHAP reasons + NBA
        │
      FAIL
        │
        ▼
  Model 2 (XGBoost)  ───── OK ────▶ XGBoost triggers + NBA
        │
      FAIL
        │
        ▼
   Empty list + error log
```

Both models are **warm-loaded at startup** via the FastAPI `lifespan` hook — zero cold-start latency on first request.

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/login` | Login — returns JWT token |
| `POST` | `/signup` | Register new rep |
| `GET` | `/api/rep/me` | Get current rep profile |
| `PATCH` | `/api/rep/territory` | Update rep territory |

### Recommendations
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/recommendations?rep_id=&date=` | Get 10 AI-ranked retailers for rep's territory |

**Response shape:**
```json
{
  "rep_id": "REP_0001",
  "date": "2026-05-21",
  "model_used": "model1_catboost",
  "recommendations": [
    {
      "rank": 1,
      "retailer_id": "RTL_001",
      "retailer_name": "Kisan Agro Store",
      "tehsil": "Jalgaon",
      "product_recommended": "Ampligo 150 ZC",
      "priority_score": 0.87,
      "reasons": ["Strong sales momentum", "Critical pest period", "High inventory gap"],
      "nba": {
        "product_to_pitch": "Ampligo 150 ZC",
        "agronomic_advice": "...",
        "talking_points": ["...", "..."],
        "one_line_summary": "..."
      },
      "model_used": "model1_catboost"
    }
  ]
}
```

### ML Inference Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/score/health` | Health check — both model statuses |
| `POST` | `/api/score/auto` | Auto-scoring with Model 1 → Model 2 fallback |
| `POST` | `/api/score/model1` | Score using CatBoost only |
| `POST` | `/api/score/model2` | Score using XGBoost only |
| `POST` | `/api/anomalies` | IsolationForest demand spike detection |

### Visit Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/visit_log` | Submit a visit outcome |
| `GET` | `/api/outcomes?rep_id=` | Fetch rep's visit history |

### Debug / Dev
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/debug/model` | CatBoost status, inference time, test prediction |
| `GET` | `/api/debug/features` | List all 28 feature names |

### Manager Portal
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/manager/stats` | Team KPIs |
| `GET` | `/api/manager/retailers` | All retailers with scores |
| `GET` | `/api/manager/reps` | Rep performance list |

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/alerts` | Territory alerts (pest, stock, anomaly) |

---

## Project Structure

```
AgroNaV/
│
├── Dockerfile                  # Multi-stage: Node (React build) → Python (FastAPI)
├── requirements.txt            # Python backend dependencies
│
├── frontend/                   # React 18 SPA
│   └── src/
│       ├── pages/
│       │   ├── Landing.js          # Public landing page
│       │   ├── SignIn.jsx           # Auth / demo login
│       │   ├── Dashboard.js         # Rep daily plan + recommendations
│       │   ├── Visit.js             # Visit card list view
│       │   ├── VisitDetail.jsx      # Single visit brief + NBA
│       │   ├── PostVisitLog.jsx     # Log outcome form
│       │   ├── Outcomes.js          # Visit history
│       │   ├── Alerts.js            # Territory alerts
│       │   ├── Manager.js           # Manager portal
│       │   └── UserGuide.jsx        # In-app guide
│       ├── components/
│       │   ├── RecommendationCard.jsx
│       │   ├── ui/Select.jsx        # Custom dropdown (React Portal)
│       │   └── Footer.jsx
│       ├── context/AuthContext.js   # Global auth state
│       ├── services/
│       │   ├── api.js               # All API calls
│       │   └── offline.js           # Local queue for offline logging
│       └── css/
│           ├── global.css           # Design tokens, glassmorphism
│           └── landing.css          # Landing page layout
│
├── backend/                    # FastAPI application
│   ├── main.py                     # App entry point, router mounts, lifespan
│   ├── auth.py                     # JWT helpers
│   ├── settings.py                 # Config constants
│   ├── db/
│   │   ├── database.py             # aiosqlite connection + table init
│   │   ├── schema.sql              # DB schema (visit_logs, users, retailers, alerts)
│   │   └── seed_demo.py            # Demo data seeder
│   ├── routers/
│   │   ├── auth.py                 # /login · /signup · /api/rep/*
│   │   ├── recommendations.py      # GET /recommendations (core ML pipeline)
│   │   ├── model_inference.py      # /api/score/* endpoints
│   │   ├── visit_log.py            # POST /visit_log
│   │   ├── outcomes.py             # GET /api/outcomes · PATCH /api/rep/territory
│   │   ├── manager.py              # /api/manager/* (KPIs, retailers, reps)
│   │   ├── alerts.py               # /api/alerts
│   │   ├── debug.py                # /api/debug/*
│   │   └── nba.py                  # /api/nba/*
│   └── services/
│       ├── inference.py            # CatBoost model loader + predict
│       ├── model2_inference.py     # XGBoost loader + batch scoring + anomaly detection
│       ├── shap_service.py         # SHAP TreeExplainer + top-3 reasons
│       ├── feature_builder.py      # 28-feature engineering pipeline
│       ├── nba_service.py          # Gemini + OpenRouter NBA generation
│       ├── gemini.py               # Gemini API client
│       ├── anomaly_service.py      # IsolationForest wrapper
│       └── scoring.py              # Score aggregation utilities
│
└── ml/                         # ML training artifacts
    ├── model_1/
    │   ├── models/
    │   │   ├── catboost_optuna_best.cbm   # Trained CatBoost model
    │   │   ├── catboost_optuna_best.pkl   # Pickle backup
    │   │   └── deployed.json              # Model metadata + AUC
    │   ├── notebooks/                     # Training notebooks
    │   ├── src/                           # Training scripts
    │   └── reports/                       # Evaluation reports
    └── model_2/
        ├── models/
        │   ├── ranking_model.joblib       # XGBoost sklearn Pipeline
        │   ├── anomaly_detector.joblib    # IsolationForest
        │   ├── anomaly_scaler.joblib      # Scaler for anomaly features
        │   ├── model_schema.json          # 28 feature definitions + types
        │   ├── metadata.json              # Training environment versions
        │   └── sample_api_response.json   # Example output
        ├── notebook/                      # Training notebook
        └── src/                           # Training scripts
```

---

## Local Setup

### Prerequisites
- **Python** 3.12+
- **Node.js** 18+
- **Git**

### 1. Clone

```bash
git clone https://github.com/SyedArmanAli2003/AgroNaV.git
cd AgroNaV
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r ../requirements.txt

# Create environment file
copy .env.local .env
# Edit .env and add your API keys (see Environment Variables section)

# Run backend
uvicorn main:app --reload --port 8000
```

Backend runs at: `http://localhost:8000`  
API docs available at: `http://localhost:8000/docs`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm start
```

Frontend runs at: `http://localhost:3000`

> **Note:** The frontend automatically proxies API calls to `localhost:8000` via the `proxy` field in `package.json`.

### 4. Quick Full-Stack Start (single command)

```bash
# From project root — runs both backend and frontend
# Terminal 1:
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2:
cd frontend && npm start
```

---

## Environment Variables

Create `backend/.env` with the following:

```env
# ── AI Keys ────────────────────────────────────────────────
GEMINI_API_KEY=your_gemini_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here

# ── Auth ───────────────────────────────────────────────────
SECRET_KEY=your_jwt_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# ── Environment ────────────────────────────────────────────
ENVIRONMENT=development
```

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ | Google AI Studio key — for NBA generation |
| `OPENROUTER_API_KEY` | ✅ | OpenRouter key — LLaMA 3.3 70B fallback |
| `SECRET_KEY` | ✅ | JWT signing secret (any long random string) |
| `ALGORITHM` | optional | JWT algorithm (default: `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | optional | Token TTL (default: 7 days) |

> ⚠️ **Never commit `.env` to Git.** It is already in `.gitignore`.

---

## Deployment

### Docker (local)

```bash
# Build multi-stage image
docker build -t agronav .

# Run container
docker run -p 8080:8080 \
  -e GEMINI_API_KEY=your_key \
  -e OPENROUTER_API_KEY=your_key \
  -e SECRET_KEY=your_secret \
  agronav
```

### Google Cloud Run

```bash
# Authenticate
gcloud auth login
gcloud config set project agronav-496820

# Build and push image
gcloud builds submit \
  --tag gcr.io/agronav-496820/agronav:latest \
  --timeout=25m .

# Deploy to Cloud Run
gcloud run deploy agronav \
  --image gcr.io/agronav-496820/agronav:latest \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --cpu 2 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "GEMINI_API_KEY=...,OPENROUTER_API_KEY=...,SECRET_KEY=..."
```

**Live deployment:** https://agronav-730909394840.us-central1.run.app

---

## Demo Credentials

The app ships with seeded demo accounts. Use these to explore without signing up:

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Rep** | `rep@agronav.com` | `Rep1234!` | Dashboard, Visit briefs, Log, History, Alerts |
| **Manager** | `manager@agronav.com` | `Manager1234!` | Manager portal, KPIs, AI Status, Retailer list |

> These are also available as one-click buttons on the Sign In page under **Quick Demo Login**.

---

## Team

| Name | Role | Contribution |
|------|------|-------------|
| **Syed Arman Ali** | Fullstack Developer | React frontend, FastAPI backend, Cloud Run deployment, ML API integration, auth system, UI/UX |
| **Md Ehtesham Ansari** | Fullstack Developer | Frontend components, API services, UI implementation, visit logging system |
| **Dweep** | AI/ML Engineer | Model 1 (CatBoost) training, Model 2 (XGBoost) training, SHAP integration, anomaly detection, feature engineering |
| **Himanshu Sengar** | Project Manager | Product roadmap, requirements, coordination, presentation, demo scripting |

---

## License

MIT License — see [LICENSE](./LICENSE)

---

<div align="center">

Built with ❤️ for **IITM × Syngenta Hackathon 2026**

*Bringing AI-guided intelligence to every field visit across rural India*

</div>
