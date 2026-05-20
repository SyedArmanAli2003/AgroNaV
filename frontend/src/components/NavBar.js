import React, { useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../css/app.css";

const TABS = [
  { path: "/dashboard", icon: "🏠", label: "Today"    },
  { path: "/alerts",    icon: "🔔", label: "Alerts"   },
  { path: "/log",       icon: "✍️", label: "Log"     },
  { path: "/outcomes",  icon: "📋", label: "History"  }
];

function NavBar() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = useCallback(() => {
    if (window.confirm("Sign out of AgroNav?")) {
      logout();
      navigate("/signin");
    }
  }, [logout, navigate]);

  return (
    <>
      {/* ---- Desktop top bar ---- */}
      <div style={{
        position: "sticky", top: 0, zIndex: 200,
        background: "rgba(15,17,23,0.9)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--glass-border, rgba(255,255,255,0.08))",
        padding: "10px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        {/* Brand */}
        <span
          onClick={() => navigate("/dashboard")}
          style={{
            background: "linear-gradient(135deg, #1D9E75, #4ECDC4)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            fontSize: 20, fontWeight: 700, cursor: "pointer"
          }}
        >
          🌿 AgroNav
        </span>

        {/* Desktop tabs */}
        <div style={{ display: "flex", gap: 4, "@media (max-width: 768px)": { display: "none" } }}>
          {TABS.map(tab => {
            const active = loc.pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                style={{
                  padding: "7px 18px", borderRadius: 99, fontSize: 13, fontWeight: 500,
                  textDecoration: "none", transition: "all 0.15s ease",
                  background: active ? "#1D9E75" : "transparent",
                  color: active ? "#fff" : "var(--text-secondary)",
                  boxShadow: active ? "0 2px 12px rgba(29,158,117,0.4)" : "none"
                }}
              >
                {tab.icon} {tab.label}
              </Link>
            );
          })}
        </div>

        {/* User + logout */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {user?.name?.split(" ")[0] || "Rep"}
            {user?.territory || user?.district ? ` · ${user.territory || user.district}` : ""}
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: "var(--glass-light-bg)", border: "1px solid var(--glass-border, rgba(255,255,255,0.10))",
              borderRadius: 99, padding: "6px 14px", color: "var(--text-muted)",
              cursor: "pointer", fontSize: 12, fontFamily: "inherit"
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* ---- Mobile bottom tab bar ---- */}
      <nav className="bottom-nav" style={{ display: "flex" }}>
        {TABS.map(tab => {
          const active = loc.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`bottom-nav-tab${active ? " active" : ""}`}
            >
              <span className="icon">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
        {/* Profile/logout tab */}
        <button
          className={`bottom-nav-tab`}
          onClick={handleLogout}
          style={{ border: "none" }}
        >
          <span className="icon">👤</span>
          {user?.name?.split(" ")[0] || "Sign out"}
        </button>
      </nav>
    </>
  );
}

export default NavBar;
