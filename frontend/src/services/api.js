// All API calls go here. Nothing else imports fetch directly.
// Base URL reads from env so it works locally and on Cloud Run.

const BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const FALLBACK_NBA = {
  product: "Ampligo 150 ZC",
  pitch: "Bollworm pressure is high. Stock up now before farmers start asking.",
  tip: "Cotton at boll formation is most vulnerable. Recommend spraying within 72 hours.",
  promotion: "Buy 20+ units — 5% extra dealer margin this week.",
  why: "Pest alert active + stock running low + boll formation window = act today."
};

export const api = {
  morningSync: async (rep_id = 1) => {
    const res = await fetch(`${BASE}/api/sync/morning?rep_id=${rep_id}`);
    if (!res.ok) throw new Error("Sync failed");
    return res.json();
  },

  getNBA: async (outlet_id) => {
    try {
      const res = await fetch(`${BASE}/api/nba/${outlet_id}`);
      if (!res.ok) return FALLBACK_NBA;
      return res.json();
    } catch {
      return FALLBACK_NBA;
    }
  },

  logOutcome: async (outlet_id, result, order_value = 0, rejection_reason = null, notes = "") => {
    const res = await fetch(`${BASE}/api/visits/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const res = await fetch(`${BASE}/api/recalibrate?rep_id=1`, { method: "POST" });
    return res.json();
  },

  getAlerts: async () => {
    const res = await fetch(`${BASE}/api/alerts?district=Nalgonda`);
    return res.json();
  },

  dismissAlert: async (id) => {
    await fetch(`${BASE}/api/alerts/${id}/dismiss`, { method: "POST" });
  },

  getVisitLog: async () => {
    const res = await fetch(`${BASE}/api/visits/log?rep_id=1`);
    return res.json();
  },

  getWeeklyStats: async () => {
    const res = await fetch(`${BASE}/api/visits/weekly-stats`);
    return res.json();
  },

  getManagerKPIs: async () => {
    const res = await fetch(`${BASE}/api/manager/kpis?territory=Nalgonda`);
    return res.json();
  },

  demoReset: async () => {
    const res = await fetch(`${BASE}/api/demo/reset`);
    return res.json();
  }
};
