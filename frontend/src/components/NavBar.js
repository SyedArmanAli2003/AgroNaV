import React from "react";
import { Link, useLocation } from "react-router-dom";

function NavBar() {
  const loc = useLocation();
  const isActive = (path) => loc.pathname === path;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(15,17,23,0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "12px 20px"
      }}
    >
      {/* Top row */}
      <div className="d-flex justify-content-between align-items-center">
        <span
          style={{
            background: "linear-gradient(135deg, #1D9E75, #4ECDC4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: "20px",
            fontWeight: 700
          }}
        >
          AgroNav
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
          Arjun Kumar — Nalgonda
        </span>
      </div>

      {/* Capsule tab bar */}
      <div
        style={{
          display: "inline-flex",
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-pill)",
          padding: "4px",
          marginTop: "10px",
          border: "1px solid var(--border-subtle)",
          maxWidth: "100%",
          overflowX: "auto",
          whiteSpace: "nowrap",
          scrollbarWidth: "none" /* Firefox */
        }}
      >
        <style>{`.nav-capsule::-webkit-scrollbar { display: none; }`}</style>
        <div className="nav-capsule" style={{ display: "flex", gap: "4px" }}>
          {[
            { path: "/dashboard", label: "Today's Route" },
            { path: "/alerts", label: "Alerts", badge: true },
            { path: "/outcomes", label: "Outcomes" },
            { path: "/manager", label: "Manager" }
          ].map((tab) => {
            const active = isActive(tab.path);
            return (
              <Link
                key={tab.path}
                to={tab.path}
                style={{
                  padding: "8px 20px",
                  borderRadius: "var(--radius-pill)",
                  fontSize: "13px",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "all var(--transition-fast)",
                  background: active ? "var(--green-primary)" : "transparent",
                  color: active ? "white" : "var(--text-secondary)",
                  boxShadow: active ? "0 2px 12px rgba(29,158,117,0.4)" : "none",
                  position: "relative"
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = "var(--text-primary)";
                    e.currentTarget.style.background = "var(--bg-glass)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {tab.label}
                {tab.badge && (
                  <span
                    style={{
                      position: "absolute",
                      top: "6px",
                      right: "10px",
                      width: "6px",
                      height: "6px",
                      backgroundColor: "var(--high-text)",
                      borderRadius: "50%"
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default NavBar;
