// All API calls go here. Nothing else imports fetch directly.
// Base URL reads from env so it works locally and on Cloud Run.

// REACT_APP_API_URL="" → same-origin (Cloud Run: frontend + backend share the service)
// REACT_APP_API_URL="https://..." → absolute URL (separate backend deployment)
// undefined → local dev fallback
const BASE = process.env.REACT_APP_API_URL !== undefined
  ? process.env.REACT_APP_API_URL
  : "http://localhost:8000";

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

const BASE_URL = BASE;

export const login = async (identifier, password) => {
  /**
   * identifier: email address OR Rep ID (e.g. REP_0203)
   * If identifier starts with "REP_" treat as rep_id, else treat as email.
   * Either way, password is REQUIRED — never skip it.
   */
  const body = identifier.startsWith("REP_")
    ? { rep_id: identifier, password }
    : { email: identifier, password };

  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // returns { token, rep_id, name, territory, district }
};

export const signup = async (name, email, repId, password) => {
  const res = await fetch(`${BASE_URL}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, rep_id: repId, password })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getRecommendations = async (repId, date) => {
  const token = localStorage.getItem("agronav_token");
  const dateStr = date || new Date().toISOString().split("T")[0];
  const res = await fetch(
    `${BASE_URL}/recommendations?rep_id=${repId}&date=${dateStr}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const postVisitLog = async (data) => {
  const token = localStorage.getItem("agronav_token");
  const res = await fetch(`${BASE_URL}/visit_log`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const cacheRepProfile = (profile) => {
  // profile = { rep_id, name, territory, district, retailers[] }
  localStorage.setItem("agronav_rep_profile", JSON.stringify({
    ...profile,
    cached_at: new Date().toISOString()
  }));
};

export const getCachedRepProfile = () => {
  const raw = localStorage.getItem("agronav_rep_profile");
  return raw ? JSON.parse(raw) : null;
};

export const cacheRecommendations = (data) => {
  localStorage.setItem("agronav_recommendations", JSON.stringify({
    ...data,
    cached_at: new Date().toISOString()
  }));
};

export const getCachedRecommendations = () => {
  const raw = localStorage.getItem("agronav_recommendations");
  return raw ? JSON.parse(raw) : null;
};

// --- API functions ---

export const api = {
  login,
  signup,
  getRecommendations,
  postVisitLog,
  cacheRepProfile,
  getCachedRepProfile,
  cacheRecommendations,
  getCachedRecommendations,
  getMorningSync: async (rep_id) => api.morningSync(rep_id),
  getLogs: async () => api.getVisitLog(),

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
