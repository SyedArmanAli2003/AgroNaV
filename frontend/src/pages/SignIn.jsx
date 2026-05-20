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
      navigate("/dashboard");
    } catch (err) {
      setError("Invalid credentials. Check your Rep ID or email and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    window.location.href = "http://localhost:8000/auth/google";
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
              <small style={{ color: "var(--medium-text)", marginTop: "4px", display: "block", fontSize: "11px" }}>
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

        {/* OR Divider */}
        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span className="auth-divider-text">OR</span>
          <div className="auth-divider-line" />
        </div>

        {/* Google Sign-In */}
        <button
          id="signin-google"
          className="auth-btn-google"
          onClick={handleGoogleSignIn}
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
          Don't have an account?{" "}
          <Link to="/signup">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
