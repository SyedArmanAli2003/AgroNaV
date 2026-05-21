import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Leaf, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { login as apiLogin, cacheRepProfile } from "../services/api";
import "../css/auth.css";
import "../css/landing.css";

function SignIn() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const authContext = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isManagerLogin = searchParams.get("role") === "manager";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiLogin(identifier, password);
      cacheRepProfile(data);
      authContext.login(data.token);
      // Role-based redirect
      const role = data.role || data.user?.role || "rep";
      if (role === "manager" || role === "admin") {
        navigate("/manager");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError("Invalid credentials. Check your Rep ID or email and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <Leaf size={24} color="var(--color-primary, #1D9E75)" />
          <span className="auth-logo-text">AgroNav</span>
        </div>

        {/* Heading */}
        <h1 className="auth-heading">Welcome Back</h1>
        <p className="auth-subheading">
          {isManagerLogin
            ? "Sign in to your manager dashboard"
            : "Sign in to your field intelligence account"}
        </p>

        {/* Error */}
        {error && (
          <div className="auth-error" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <label className="auth-label">Email or Rep ID</label>
            <input
              id="signin-email"
              className="auth-input"
              type="text"
              placeholder="you@syngenta.com or REP_0203"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete="username"
            />
            {identifier.startsWith("REP_") && (
              <small style={{ color: "var(--text-muted)", marginTop: "4px", display: "block", fontSize: "11px" }}>
                Using your Rep ID — password still required
              </small>
            )}
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Password</label>
            <div style={{ position: "relative" }}>
              <input
                id="signin-password"
                className="auth-input"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-muted)", padding: 4
                }}
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            id="signin-submit"
            className="auth-btn-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Footer links */}
        <div className="auth-footer">
          Don't have an account?{" "}
          <Link to="/signup">Create one</Link>
        </div>
        {!isManagerLogin && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <Link to="/signin?role=manager" style={{
              color: "var(--text-muted)", fontSize: 13, textDecoration: "none",
              fontFamily: "var(--font-body)"
            }}>
              Sign in as Manager
            </Link>
          </div>
        )}

        {/* Tagline */}
        <div style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          Syngenta Field Force Intelligence · IITM Hackathon 2026
        </div>

        {/* Demo quick-login */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--glass-border)" }}>
          <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Try a demo account</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {[
              { label: "Rep", email: "rep@agronav.com", pw: "Rep1234!", color: "var(--color-primary)" },
              { label: "Manager", email: "manager@agronav.com", pw: "Manager1234!", color: "#3b82f6" },
              { label: "Admin", email: "admin@agronav.com", pw: "Admin1234!", color: "#7c3aed" },
            ].map(d => (
              <button key={d.label} type="button" onClick={() => { setIdentifier(d.email); setPassword(d.pw); }} style={{ padding: "6px 14px", borderRadius: 99, border: `1px solid ${d.color}`, background: "transparent", color: d.color, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                {d.label}
              </button>
            ))}
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", margin: "8px 0 0" }}>Fills credentials · then press Sign In</p>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
