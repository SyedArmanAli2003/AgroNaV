# AgroNav — Backend

## Quick Setup

```bash
cd backend
pip install -r requirements.txt
python db/init_db.py
python db/seed.py
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## Environment Variables

Copy `.env` and fill in your keys:

```
GEMINI_API_KEY=your_key_from_aistudio.google.com
GOOGLE_MAPS_KEY=your_key_from_console.cloud.google.com
DATABASE_URL=sqlite:///agronav.db
ENVIRONMENT=development
```

**App works without API keys** — shows fallback data for everything.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sync/morning` | Full daily data (outlets + alerts + stats) |
| GET | `/api/outlets/ranked` | All outlets scored and sorted |
| GET | `/api/outlets/{id}` | Single outlet |
| GET | `/api/nba/{outlet_id}` | Next Best Action recommendation |
| POST | `/api/visits/log` | Log a visit outcome |
| GET | `/api/visits/log` | Recent visit logs |
| GET | `/api/visits/weekly-stats` | Weekly performance stats |
| GET | `/api/alerts` | Active alerts |
| POST | `/api/alerts/{id}/dismiss` | Dismiss an alert |
| GET | `/api/demo/reset` | Reset to seed data |

## Deploy to GCP Cloud Run

```bash
gcloud run deploy agronav-backend \
  --source . \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=xxx,GOOGLE_MAPS_KEY=xxx
```

## Demo Reset

Before each judge demo:
```
GET http://localhost:8000/api/demo/reset
```

## For ML Team

See `ml/README.md` for instructions.
Run: `python ml/pipeline.py` to train the model.
