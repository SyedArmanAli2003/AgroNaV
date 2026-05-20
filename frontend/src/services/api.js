// All API calls go here. Nothing else imports fetch directly.
// Base URL reads from env so it works locally and on Cloud Run.

const BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

// --- Auth helpers ---

function getAuthHeader() {
  const token = localStorage.getItem("agronav_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    ...getAuthHeader()
  };
}

// --- Fallback NBA (offline) ---

export const FALLBACK_NBA = {
  product: "Ampligo 150 ZC",
  pitch: "Bollworm pressure is high. Stock up now before farmers start asking.",
  tip: "Cotton at boll formation is most vulnerable. Recommend spraying within 72 hours.",
  promotion: "Buy 20+ units — 5% extra dealer margin this week.",
  why: "Pest alert active + stock running low + boll formation window = act today."
};

// --- API functions ---

export const api = {
  // ──── Auth ─────────────────────────────────
  login: async (email, password) => {
    const res = await fetch(`${BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail || "Login failed");
    }
    return res.json();
  },

  signup: async (name, email, repId, password) => {
    const res = await fetch(`${BASE}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, rep_id: repId, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Signup failed" }));
      throw new Error(err.detail || "Signup failed");
    }
    return res.json();
  },

  // ──── New CatBoost-powered endpoints ───────
  getRecommendations: async (repId, date) => {
    const params = new URLSearchParams({ rep_id: repId });
    if (date) params.append("date", date);
    const res = await fetch(`${BASE}/recommendations?${params}`, {
      headers: authHeaders()
    });
    if (!res.ok) return { recommendations: [] };
    return res.json();
  },

  postVisitLog: async (data) => {
    const res = await fetch(`${BASE}/visit_log`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ──── Existing endpoints (backward compat) ──
  morningSync: async (rep_id = 1) => {
    const res = await fetch(`${BASE}/api/sync/morning?rep_id=${rep_id}`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error("Sync failed");
    return res.json();
  },

  getNBA: async (outlet_id) => {
    try {
      const res = await fetch(`${BASE}/api/nba/${outlet_id}`, {
        headers: getAuthHeader()
      });
      if (!res.ok) return FALLBACK_NBA;
      return res.json();
    } catch {
      return FALLBACK_NBA;
    }
  },

  logOutcome: async (outlet_id, result, order_value = 0, rejection_reason = null, notes = "") => {
    const res = await fetch(`${BASE}/api/visits/log`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        outlet_id,
        rep_id: 1,
        result,
        order_value,
        rejection_reason,
        notes
      })
    });
    return res.json();
  },

  recalibrate: async () => {
    const res = await fetch(`${BASE}/api/recalibrate?rep_id=1`, {
      method: "POST",
      headers: getAuthHeader()
    });
    return res.json();
  },

  getAlerts: async () => {
    const res = await fetch(`${BASE}/api/alerts?district=Nalgonda`, {
      headers: getAuthHeader()
    });
    return res.json();
  },

  dismissAlert: async (id) => {
    await fetch(`${BASE}/api/alerts/${id}/dismiss`, {
      method: "POST",
      headers: getAuthHeader()
    });
  },

  getVisitLog: async () => {
    const res = await fetch(`${BASE}/api/visits/log?rep_id=1`, {
      headers: getAuthHeader()
    });
    return res.json();
  },

  getWeeklyStats: async () => {
    const res = await fetch(`${BASE}/api/visits/weekly-stats`, {
      headers: getAuthHeader()
    });
    return res.json();
  },

  getManagerKPIs: async () => {
    const res = await fetch(`${BASE}/api/manager/kpis?territory=Nalgonda`, {
      headers: getAuthHeader()
    });
    return res.json();
  },

  demoReset: async () => {
    const res = await fetch(`${BASE}/api/demo/reset`, {
      headers: getAuthHeader()
    });
    return res.json();
  }
};
