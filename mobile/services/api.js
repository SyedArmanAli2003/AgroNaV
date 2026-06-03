// What it does: API client for React Native — same endpoints as web
// Input: Function calls with parameters
// Output: JSON responses from backend
// Called by: All mobile screens

import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ CHANGE THIS before demo — point at the machine running the backend.
// On a physical phone use your computer's LAN IP (e.g. http://192.168.1.20:8000),
// NOT localhost. On Android emulator use http://10.0.2.2:8000.
const BASE_URL = 'http://YOUR_BACKEND_URL:8000'; // CHANGE THIS before demo
const BASE = BASE_URL;

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

/** Public helper — read the stored JWT (used by screens to gate navigation). */
export async function getToken() {
  return getAuthToken();
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
  // FIX 4: authenticate against the backend and persist the JWT.
  login: async (identifier, password) => {
    const res = await fetch(`${BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // backend accepts email OR rep_id in the `email` field
      body: JSON.stringify({ email: identifier, password }),
    });
    if (!res.ok) {
      throw new Error("Invalid credentials");
    }
    const data = await res.json();
    const token = data.token || data.access_token;
    if (token) {
      await AsyncStorage.setItem("agronav_token", token);
      if (data.role) await AsyncStorage.setItem("agronav_role", data.role);
    }
    return { token, role: data.role || "rep", ...data };
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem("agronav_token");
      await AsyncStorage.removeItem("agronav_role");
    } catch {}
  },

  getToken,

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
