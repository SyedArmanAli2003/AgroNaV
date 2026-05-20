// What it does: API client for React Native — same endpoints as web
// Input: Function calls with parameters
// Output: JSON responses from backend
// Called by: All mobile screens

import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your Cloud Run URL for production
const BASE = "http://localhost:8000";

/**
 * Get the stored auth token from AsyncStorage.
 */
async function getAuthToken() {
  try {
    return await AsyncStorage.getItem("agronav_token");
  } catch {
    return null;
  }
}

/**
 * Build headers with auth token if available.
 */
async function authHeaders(extra = {}) {
  const token = await getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra
  };
}

export const api = {
  morningSync: async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BASE}/api/sync/morning`, { headers });
      return await res.json();
    } catch (e) {
      console.log('[api] morningSync failed:', e);
      return null;
    }
  },

  getNBA: async (outlet_id) => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BASE}/api/nba/${outlet_id}`, { headers });
      return await res.json();
    } catch (e) {
      console.log('[api] getNBA failed:', e);
      return FALLBACK_NBA;
    }
  },

  logOutcome: async (outlet_id, result, notes = "") => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BASE}/api/visits/log`, {
        method: "POST",
        headers,
        body: JSON.stringify({ outlet_id, result, notes })
      });
      return await res.json();
    } catch (e) {
      console.log('[api] logOutcome failed:', e);
      return null;
    }
  },

  getAlerts: async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BASE}/api/alerts`, { headers });
      return await res.json();
    } catch (e) {
      return [];
    }
  },

  dismissAlert: async (alert_id) => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BASE}/api/alerts/${alert_id}/dismiss`, {
        method: "POST",
        headers
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  getVisitLog: async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BASE}/api/visits/log`, { headers });
      return await res.json();
    } catch (e) {
      return [];
    }
  },

  getWeeklyStats: async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BASE}/api/visits/weekly-stats`, { headers });
      return await res.json();
    } catch (e) {
      return [];
    }
  },

  demoReset: async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BASE}/api/demo/reset`, { headers });
      return await res.json();
    } catch (e) {
      return null;
    }
  }
};

export const FALLBACK_NBA = {
  product: "Ampligo 150 ZC",
  pitch: "Bollworm pressure is high. Ampligo gives 21-day residual control — farmers need this now.",
  tip: "Spray within 72 hours of first bollworm sighting at boll stage.",
  promotion: "Buy 20+ units — 5% extra dealer margin this week.",
  why: "Pest alert active + low stock + boll formation window = act today."
};
