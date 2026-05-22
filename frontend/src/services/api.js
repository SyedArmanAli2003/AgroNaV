// All API calls centralised. Nothing else imports fetch directly.
// BASE reads REACT_APP_API_URL env so it works locally and on Cloud Run.
const BASE = process.env.REACT_APP_API_URL !== undefined
  ? process.env.REACT_APP_API_URL
  : "http://localhost:8000";

// --- Auth helpers ---
function getAuthHeader() {
  const token = localStorage.getItem("agronav_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function authHeaders() {
  return { "Content-Type": "application/json", ...getAuthHeader() };
}

// --- Fallback NBA (offline) ---
export const FALLBACK_NBA = {
  product: "Tilt 250 EC",
  pitch: "Fungal disease pressure is high. Stock up now before farmers start asking.",
  tip: "Kharif crop at critical stage — recommend preventive spray within 72 hours.",
  promotion: "Buy 20+ units — 5% extra dealer margin this week.",
  why: "Pest alert active + stock running low + crop stage = act today."
};

// --- Auth ---
export const login = async (identifier, password) => {
  /** Supports email address OR Rep ID (e.g. REP_0203). Password always required. */
  const body = { email: identifier, password };
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { token, user: { rep_id, name, territory, … } }
};

export const signup = async (name, email, repId, password, role = "rep", district = null, state = null, territory_id = null) => {
  const res = await fetch(`${BASE}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, rep_id: repId, password, role, district, state, territory_id })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// --- Recommendations ---
export const getRecommendations = async (repId, date) => {
  const token = localStorage.getItem("agronav_token");
  const dateStr = date || new Date().toISOString().split("T")[0];
  const res = await fetch(
    `${BASE}/recommendations?rep_id=${repId}&date=${dateStr}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// --- Visit Logs ---
export const postVisitLog = async (data) => {
  const token = localStorage.getItem("agronav_token");
  const res = await fetch(`${BASE}/visit_log`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// --- Outcomes ---
export const getOutcomes = async (repId) => {
  const res = await fetch(`${BASE}/api/outcomes?rep_id=${repId}`, {
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { logs: [...] }
};

// --- Territory ---
export const updateTerritory = async (repId, state, district, territoryId = "") => {
  const res = await fetch(`${BASE}/api/rep/territory`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ rep_id: repId, state, district, territory_id: territoryId })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// --- Profile (name + territory) ---
export const updateProfile = async ({ name, district, state }) => {
  const res = await fetch(`${BASE}/api/rep/profile`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ name, district, state })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { success, user }
};

// --- Rep profile cache ---
export const cacheRepProfile = (profile) => {
  localStorage.setItem("agronav_rep_profile", JSON.stringify({
    ...profile, cached_at: new Date().toISOString()
  }));
};
export const getCachedRepProfile = () => {
  const raw = localStorage.getItem("agronav_rep_profile");
  return raw ? JSON.parse(raw) : null;
};

// --- Recommendation cache ---
export const cacheRecommendations = (data) => {
  localStorage.setItem("agronav_recommendations", JSON.stringify({
    ...data, cached_at: new Date().toISOString()
  }));
};
export const getCachedRecommendations = () => {
  const raw = localStorage.getItem("agronav_recommendations");
  return raw ? JSON.parse(raw) : null;
};

// --- api object (backward compat for existing pages) ---
export const api = {
  login, getRecommendations, postVisitLog, getOutcomes,
  cacheRepProfile, getCachedRepProfile, cacheRecommendations, getCachedRecommendations,
  getMorningSync: async (rep_id) => api.morningSync(rep_id),
  getLogs: async (repId) => getOutcomes(repId),

  morningSync: async (rep_id = 1) => {
    const res = await fetch(`${BASE}/api/sync/morning?rep_id=${rep_id}`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error("Sync failed");
    return res.json();
  },

  getNBA: async (outlet_id) => {
    try {
      const res = await fetch(`${BASE}/api/nba/${outlet_id}`, { headers: getAuthHeader() });
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
      body: JSON.stringify({ outlet_id, rep_id: 1, result, order_value, rejection_reason, notes })
    });
    return res.json();
  },

  recalibrate: async () => {
    const res = await fetch(`${BASE}/api/recalibrate?rep_id=1`, {
      method: "POST", headers: getAuthHeader()
    });
    return res.json();
  },

  getAlerts: async () => {
    const res = await fetch(`${BASE}/api/alerts`, { headers: getAuthHeader() });
    return res.json();
  },

  dismissAlert: async (id) => {
    await fetch(`${BASE}/api/alerts/${id}/dismiss`, {
      method: "POST", headers: getAuthHeader()
    });
  },

  getWeeklyStats: async () => {
    const res = await fetch(`${BASE}/api/visits/weekly-stats`, { headers: getAuthHeader() });
    return res.json();
  },

  getManagerKPIs: async (territory = "Nalgonda") => {
    const res = await fetch(`${BASE}/api/manager/kpis?territory=${territory}`, {
      headers: getAuthHeader()
    });
    return res.json();
  },

  demoReset: async () => {
    const res = await fetch(`${BASE}/api/demo/reset`, { headers: getAuthHeader() });
    return res.json();
  }
};
