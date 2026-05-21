import React, { useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Home, Bell, PenLine, ClipboardList, User, Leaf, LogOut } from "lucide-react";
import "../css/app.css";

const TABS = [
  { path: "/dashboard", icon: Home,          label: "Today"   },
  { path: "/alerts",    icon: Bell,          label: "Alerts"  },
  { path: "/log",       icon: PenLine,       label: "Log"     },
  { path: "/outcomes",  icon: ClipboardList, label: "History" }
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
        background: "rgba(15,26,20,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--glass-border)",
        padding: "10px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        {/* Brand */}
        <span
          onClick={() => navigate("/dashboard")}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            cursor: "pointer"
          }}
        >
          <Leaf size={20} color="var(--color-primary)" />
          <span style={{
            background: "linear-gradient(135deg, #1D9E75, #4ECDC4)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            fontSize: 20, fontWeight: 700,
            fontFamily: "var(--font-heading)"
          }}>
            AgroNav
          </span>
        </span>

        {/* Desktop tabs — hidden on mobile via CSS class */}
        <div className="top-nav-links" style={{ gap: 4 }}>
          {TABS.map(tab => {
            const active = loc.pathname === tab.path;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                style={{
                  padding: "7px 18px", borderRadius: 99, fontSize: 13, fontWeight: 500,
                  textDecoration: "none", transition: "all 0.15s ease",
                  background: active ? "var(--color-primary)" : "transparent",
                  color: active ? "#fff" : "var(--text-secondary)",
                  boxShadow: active ? "0 2px 12px var(--color-primary-glow)" : "none",
                  display: "flex", alignItems: "center", gap: 6,
                  fontFamily: "var(--font-body)"
                }}
              >
                <Icon size={14} />
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* User + logout */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            onClick={() => navigate("/select-territory")}
            style={{
              fontSize: 12, color: "var(--text-secondary)", cursor: "pointer",
              padding: "6px 10px", borderRadius: 8, background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s",
              fontFamily: "var(--font-body)"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--glass-bg-strong)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--glass-bg)"}
          >
            <User size={14} />
            <span>
              {user?.name?.split(" ")[0] || "Rep"}
              {user?.territory || user?.district ? ` · ${user.territory || user.district}` : ""}
            </span>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            style={{
              background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
              borderRadius: 99, padding: "6px 14px", color: "var(--text-muted)",
              cursor: "pointer", fontSize: 12, fontFamily: "var(--font-body)",
              display: "flex", alignItems: "center", gap: 6
            }}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </div>

      {/* ---- Mobile bottom tab bar — shown only on mobile via CSS class ---- */}
      <nav className="bottom-tab-bar">
        {TABS.map(tab => {
          const active = loc.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 3, padding: "8px 16px", border: "none", background: "transparent",
                color: active ? "var(--color-primary)" : "var(--text-muted)",
                fontSize: 10, fontFamily: "var(--font-body)", cursor: "pointer",
                transition: "color 0.15s ease", textDecoration: "none",
              }}
            >
              <Icon size={20} />
              {tab.label}
            </Link>
          );
        })}
        {/* Profile tab */}
        <button
          onClick={() => navigate("/select-territory")}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 3, padding: "8px 16px", border: "none", background: "transparent",
            color: loc.pathname === "/select-territory" ? "var(--color-primary)" : "var(--text-muted)",
            fontSize: 10, fontFamily: "var(--font-body)", cursor: "pointer",
          }}
        >
          <User size={20} />
          {user?.name?.split(" ")[0] || "Profile"}
        </button>
      </nav>
    </>
  );
}

export default NavBar;
