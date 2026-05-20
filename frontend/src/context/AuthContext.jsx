import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

/**
 * Decode a JWT token payload without a library dependency.
 * Works for standard base64url-encoded JWTs.
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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const login = useCallback((newToken) => {
    localStorage.setItem("agronav_token", newToken);
    setToken(newToken);
    setUser(decodeJwt(newToken));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("agronav_token");
    setToken(null);
    setUser(null);
  }, []);

  // On mount: check localStorage for existing token
  useEffect(() => {
    const stored = localStorage.getItem("agronav_token");
    if (stored) {
      const decoded = decodeJwt(stored);
      if (decoded && decoded.exp * 1000 > Date.now()) {
        setToken(stored);
        setUser(decoded);
      } else {
        localStorage.removeItem("agronav_token"); // expired
      }
    }
  }, []);

  // Handle Google OAuth callback: /signin?token=xxx
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackToken = params.get("token");
    if (callbackToken) {
      login(callbackToken);
      // Clean the URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [login]);

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
