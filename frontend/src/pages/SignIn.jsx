import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Leaf } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { login as apiLogin, cacheRepProfile } from "../services/api";
import "../css/auth.css";
import "../css/landing.css";

function SignIn() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const authContext = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiLogin(identifier, password);
      cacheRepProfile(data);
      authContext.login(data.token);
      // Territory check happens in AuthContext after login
      navigate("/dashboard");
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
          <Leaf size={24} color="white" />
          <span className="auth-logo-text">AgroNav</span>
        </div>

        {/* Heading */}
        <h1 className="auth-heading">Welcome Back</h1>
        <p className="auth-subheading">
          Sign in to access your field intelligence dashboard
        </p>

        {/* Error */}
        {error && <div className="auth-error">{error}</div>}

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
            <input
              id="signin-password"
              className="auth-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
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

        {/* Footer */}
        <div className="auth-footer">
          Don't have an account?{" "}
          <Link to="/signup">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
