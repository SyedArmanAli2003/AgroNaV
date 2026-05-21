import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Leaf, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { signup as apiSignup } from "../services/api";
import "../css/auth.css";
import "../css/landing.css";

function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [repId, setRepId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState("rep");
  const [managerCode, setManagerCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPw) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (role === "manager" && !managerCode) {
      setError("Manager code is required for manager accounts");
      return;
    }

    setLoading(true);
    try {
      const data = await apiSignup(name, email, repId, password);
      if (data.token) {
        login(data.token);
        navigate("/dashboard");
      } else {
        setError(data.detail || "Sign up failed. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Sign up failed. Please try again.");
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
        <h1 className="auth-heading">Create Account</h1>
        <p className="auth-subheading">
          Join AgroNav to unlock AI-guided field intelligence
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
            <label className="auth-label">Full Name</label>
            <input
              id="signup-name"
              className="auth-input"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Email Address</label>
            <input
              id="signup-email"
              className="auth-input"
              type="email"
              placeholder="you@syngenta.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Rep ID</label>
            <input
              id="signup-repid"
              className="auth-input"
              type="text"
              placeholder="REP_0203 — ask your manager"
              value={repId}
              onChange={(e) => setRepId(e.target.value)}
              required
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Password</label>
            <div style={{ position: "relative" }}>
              <input
                id="signup-password"
                className="auth-input"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
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

          <div className="auth-input-group">
            <label className="auth-label">Confirm Password</label>
            <input
              id="signup-confirm"
              className="auth-input"
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          {/* Role toggle */}
          <div className="auth-input-group">
            <label className="auth-label">Account Type</label>
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-btn ${role === "rep" ? "active" : ""}`}
                onClick={() => setRole("rep")}
              >
                Field Rep
              </button>
              <button
                type="button"
                className={`toggle-btn ${role === "manager" ? "active" : ""}`}
                onClick={() => setRole("manager")}
              >
                Area Manager
              </button>
            </div>
          </div>

          {/* Manager code (only if manager selected) */}
          {role === "manager" && (
            <div className="auth-input-group">
              <label className="auth-label">Manager Code</label>
              <input
                className="auth-input"
                type="text"
                placeholder="Enter manager access code"
                value={managerCode}
                onChange={(e) => setManagerCode(e.target.value)}
                required
              />
              <small style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4, display: "block" }}>
                Get this from your regional head
              </small>
            </div>
          )}

          <button
            id="signup-submit"
            className="auth-btn-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        {/* Footer */}
        <div className="auth-footer">
          Already have an account?{" "}
          <Link to="/signin">Sign In</Link>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
