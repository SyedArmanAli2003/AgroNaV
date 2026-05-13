# AgroNav — Frontend

## Quick Setup

The frontend is served by the FastAPI backend. Just start the backend:

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Then open http://localhost:8000 in your browser.

## Standalone (without backend)

```bash
cd frontend
python -m http.server 3000
```

Open http://localhost:3000

> Note: API calls will fail without the backend running, but the UI will still load with cached/fallback data.

## Change API Base URL

Edit `src/services/api.js` line 4:

```js
const BASE = "http://localhost:8000"   // ← development
const BASE = "https://your-cloud-run-url"  // ← production
```

## Tech Stack

- **Vue 3** via CDN (no build step, no Node required)
- **Vue Router 4** via CDN
- **Bootstrap 5** CSS + JS
- **Bootstrap Icons**
- **Google Charts** for line charts
- **Google Maps** JS API for map view
- **Workbox** for PWA service worker

## PWA

The app is a Progressive Web App:
- Install on mobile via "Add to Home Screen"
- Works offline with cached data
- Visit outcomes queue offline and sync when back online
