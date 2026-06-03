import React from "react";
import { Link } from "react-router-dom";
import { Leaf, Lock, ArrowLeft, ShieldCheck } from "lucide-react";
import "../css/auth.css";
import "../css/landing.css";

/**
 * SignUp — Registration is invite-only / admin-controlled.
 * Public self-signup is disabled on the backend (POST /signup → 403).
 * This page explains the flow and directs users back to Sign In.
 */
function SignUp() {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>

        {/* Logo */}
        <div className="auth-logo">
          <Leaf size={24} color="var(--color-primary, #1D9E75)" />
          <span className="auth-logo-text">AgroNav</span>
        </div>

        {/* Lock icon + heading */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          textAlign: "center", padding: "8px 0 24px"
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "rgba(29,158,117,0.12)",
            border: "1px solid rgba(29,158,117,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16
          }}>
            <Lock size={28} color="var(--color-primary, #1D9E75)" />
          </div>

          <h1 className="auth-heading" style={{ marginBottom: 8 }}>
            Registration Closed
          </h1>
          <p className="auth-subheading" style={{ marginBottom: 0 }}>
            AgroNav accounts are created by your manager or admin.
            <br />Self-registration is not available.
          </p>
        </div>

        {/* Info steps */}
        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--glass-border)",
          borderRadius: 12, padding: "18px 20px", marginBottom: 24
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>
            How to get access
          </p>
          {[
            { icon: "1", text: "Contact your Syngenta area manager" },
            { icon: "2", text: "They create your account via the Manager Portal" },
            { icon: "3", text: "You receive your Rep ID, email & temporary password" },
            { icon: "4", text: "Sign in and start your field visits" },
          ].map(step => (
            <div key={step.icon} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
              <div style={{
                minWidth: 22, height: 22, borderRadius: "50%",
                background: "rgba(29,158,117,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: "var(--color-primary, #1D9E75)", flexShrink: 0
              }}>
                {step.icon}
              </div>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {step.text}
              </span>
            </div>
          ))}
        </div>

        {/* Manager info badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
          background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: 10, marginBottom: 24
        }}>
          <ShieldCheck size={18} color="#3b82f6" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            <strong style={{ color: "#3b82f6" }}>Managers & Admins:</strong> Create rep accounts from the{" "}
            <strong>Manager Portal → Create Rep</strong> tab.
          </span>
        </div>

        {/* Back to sign in */}
        <Link
          to="/signin"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", padding: "13px",
            background: "var(--color-primary, #1D9E75)",
            color: "#fff", borderRadius: 12, textDecoration: "none",
            fontSize: 15, fontWeight: 600, fontFamily: "var(--font-body)",
            transition: "opacity 0.15s", boxSizing: "border-box"
          }}
          onMouseOver={e => e.currentTarget.style.opacity = "0.88"}
          onMouseOut={e => e.currentTarget.style.opacity = "1"}
        >
          <ArrowLeft size={16} />
          Back to Sign In
        </Link>

        {/* Tagline */}
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          Syngenta Field Force Intelligence · IITM Hackathon 2026
        </div>
      </div>
    </div>
  );
}

export default SignUp;
