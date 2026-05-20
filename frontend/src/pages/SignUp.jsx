import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Leaf } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
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
      const data = await api.signup(name, email, repId, password);
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

  const handleGoogleSignUp = () => {
    const apiBase = process.env.REACT_APP_API_URL || "http://localhost:8000";
    window.location.href = `${apiBase}/auth/google`;
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

        {/* OR Divider */}
        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span className="auth-divider-text">OR</span>
          <div className="auth-divider-line" />
        </div>

        {/* Google Sign-Up */}
        <button
          id="signup-google"
          className="auth-btn-google"
          onClick={handleGoogleSignUp}
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

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
