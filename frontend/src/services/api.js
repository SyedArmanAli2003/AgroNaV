// What it does: API client for all fetch calls to FastAPI backend
// Input: Function calls with parameters
// Output: JSON responses from backend
// Called by: All Vue views and components

const BASE = window.location.origin;

const api = {

  // Fetch everything for the day in one call
  morningSync: async () => {
    try {
      const res = await fetch(`${BASE}/api/sync/morning`);
      return await res.json();
    } catch (e) {
      console.log('[api] morningSync failed:', e);
      return null;
    }
  },

  // Get NBA recommendation for an outlet
  getNBA: async (outlet_id) => {
    try {
      const res = await fetch(`${BASE}/api/nba/${outlet_id}`);
      return await res.json();
    } catch (e) {
      console.log('[api] getNBA failed:', e);
      return FALLBACK_NBA;
    }
  },

  // Log a visit outcome
  logOutcome: async (outlet_id, result, notes = "") => {
    try {
      const res = await fetch(`${BASE}/api/visits/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlet_id, result, notes })
      });
      return await res.json();
    } catch (e) {
      console.log('[api] logOutcome failed, queuing offline:', e);
      return null;
    }
  },

  // Get all active alerts
  getAlerts: async () => {
    try {
      const res = await fetch(`${BASE}/api/alerts`);
      return await res.json();
    } catch (e) {
      console.log('[api] getAlerts failed:', e);
      return [];
    }
  },

  // Dismiss a single alert
  dismissAlert: async (alert_id) => {
    try {
      const res = await fetch(`${BASE}/api/alerts/${alert_id}/dismiss`, { method: "POST" });
      return await res.json();
    } catch (e) {
      console.log('[api] dismissAlert failed:', e);
      return null;
    }
  },

  // Get recent visit logs
  getVisitLog: async () => {
    try {
      const res = await fetch(`${BASE}/api/visits/log`);
      return await res.json();
    } catch (e) {
      console.log('[api] getVisitLog failed:', e);
      return [];
    }
  },

  // Get weekly statistics
  getWeeklyStats: async () => {
    try {
      const res = await fetch(`${BASE}/api/visits/weekly-stats`);
      return await res.json();
    } catch (e) {
      console.log('[api] getWeeklyStats failed:', e);
      return [];
    }
  },

  // Reset demo data
  demoReset: async () => {
    try {
      const res = await fetch(`${BASE}/api/demo/reset`);
      return await res.json();
    } catch (e) {
      console.log('[api] demoReset failed:', e);
      return null;
    }
  }
};

// Hardcoded fallback NBA when API is unavailable
const FALLBACK_NBA = {
  product: "Ampligo 150 ZC",
  pitch: "Bollworm pressure is high. Ampligo gives 21-day residual control — farmers need this now.",
  tip: "Spray within 72 hours of first bollworm sighting at boll stage.",
  promotion: "Buy 20+ units — 5% extra dealer margin this week.",
  why: "Pest alert active + low stock + boll formation window = act today."
};
