import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getRecommendations, cacheRecommendations } from "../services/api";

const AuthContext = createContext(null);

/**
 * Decode a JWT token payload without a library dependency.
 */
function decodeJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/** Pre-fetch recommendations in background after login so Dashboard loads instantly. */
async function prefetchRecs(repId) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const data = await getRecommendations(repId, today);
    if (data && data.recommendations) {
      cacheRecommendations(data);
    }
  } catch {
    /* silent — dashboard handles missing cache gracefully */
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const login = useCallback((newToken) => {
    localStorage.setItem("agronav_token", newToken);
    setToken(newToken);

    const decoded = decodeJwt(newToken);

    // Merge stored territory into user object (set during TerritorySelect)
    const storedTerritory = (() => {
      try {
        return JSON.parse(localStorage.getItem("agronav_rep_territory") || "{}");
      } catch {
        return {};
      }
    })();

    const mergedUser = decoded ? { ...decoded, ...storedTerritory } : null;
    setUser(mergedUser);

    // Pre-fetch recommendations in background
    const repId = decoded?.sub || decoded?.rep_id;
    if (repId) {
      prefetchRecs(repId);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("agronav_token");
    setToken(null);
    setUser(null);
  }, []);

  // On mount: restore from localStorage if token exists and not expired
  useEffect(() => {
    const stored = localStorage.getItem("agronav_token");
    if (stored) {
      const decoded = decodeJwt(stored);
      if (decoded && decoded.exp * 1000 > Date.now()) {
        const storedTerritory = (() => {
          try {
            return JSON.parse(localStorage.getItem("agronav_rep_territory") || "{}");
          } catch {
            return {};
          }
        })();
        setToken(stored);
        setUser({ ...decoded, ...storedTerritory });
      } else {
        localStorage.removeItem("agronav_token");
      }
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, setUser, token, isAuthenticated: !!token, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
