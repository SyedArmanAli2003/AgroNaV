import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Leaf } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { signup as apiSignup } from "../services/api";
import "../css/auth.css";
import "../css/landing.css";

function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [repId, setRepId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
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
          <Leaf size={24} color="white" />
          <span className="auth-logo-text">AgroNav</span>
        </div>

        {/* Heading */}
        <h1 className="auth-heading">Create Account</h1>
        <p className="auth-subheading">
          Join AgroNav to unlock AI-guided field intelligence
        </p>

        {/* Error */}
        {error && <div className="auth-error">{error}</div>}

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <label className="auth-label">Full Name</label>
            <input
              id="signup-name"
              className="auth-input"
              type="text"
              placeholder="Arjun Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Email</label>
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
              placeholder="REP_0203"
              value={repId}
              onChange={(e) => setRepId(e.target.value)}
              required
            />
            <span className="auth-helper">Ask your manager for your Rep ID</span>
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Password</label>
            <input
              id="signup-password"
              className="auth-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

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
