import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Home, Bell, PenLine, ClipboardList, User, Leaf, LogOut, BookOpen } from "lucide-react";
import "../css/app.css";

const REP_TABS = [
  { path: "/dashboard", icon: Home,          label: "Today"   },
  { path: "/alerts",    icon: Bell,          label: "Alerts"  },
  { path: "/log",       icon: PenLine,       label: "Log"     },
  { path: "/outcomes",  icon: ClipboardList, label: "History" }
];

const MANAGER_TABS = [
  { path: "/dashboard", icon: Home,          label: "Today"   },
  { path: "/manager",   icon: User,          label: "Portal"  },
  { path: "/alerts",    icon: Bell,          label: "Alerts"  },
  { path: "/outcomes",  icon: ClipboardList, label: "History" }
];

function NavBar() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [modelStatus, setModelStatus] = useState("checking");

  const role = user?.role || "rep";
  const TABS = (role === "manager" || role === "admin") ? MANAGER_TABS : REP_TABS;

  // AI model status ping
  useEffect(() => {
    fetch("/api/debug/model")
      .then(r => r.json())
      .then(d => setModelStatus(d.status === "ok" ? "live" : "error"))
      .catch(() => setModelStatus("offline"));
  }, []);

  const handleLogout = useCallback(() => {
    if (window.confirm("Sign out of AgroNav?")) {
      logout();
      navigate("/signin");
    }
  }, [logout, navigate]);

  const modelColor = modelStatus === "live" ? "var(--color-primary)" : "var(--color-urgent, #ef4444)";
  const modelBg   = modelStatus === "live" ? "rgba(29,158,117,0.15)" : "rgba(239,68,68,0.15)";

  return (
    <>
      {/* ── Desktop top bar ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 200,
        background: "rgba(15,26,20,0.92)", backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--glass-border)",
        padding: "10px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        {/* Brand */}
        <span onClick={() => navigate("/dashboard")} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <Leaf size={20} color="var(--color-primary)" />
          <span style={{ background: "linear-gradient(135deg, #1D9E75, #4ECDC4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: 20, fontWeight: 700, fontFamily: "var(--font-heading)" }}>
            AgroNav
          </span>
        </span>

        {/* Desktop nav links */}
        <div className="top-nav-links" style={{ gap: 4 }}>
          {TABS.map(tab => {
            const active = loc.pathname === tab.path || loc.pathname.startsWith(tab.path + "/");
            const Icon = tab.icon;
            return (
              <Link key={tab.path} to={tab.path} style={{
                padding: "7px 18px", borderRadius: 99, fontSize: 13, fontWeight: 500,
                textDecoration: "none", transition: "all 0.15s ease",
                background: active ? "var(--color-primary)" : "transparent",
                color: active ? "#fff" : "var(--text-secondary)",
                boxShadow: active ? "0 2px 12px var(--color-primary-glow)" : "none",
                display: "flex", alignItems: "center", gap: 6,
                fontFamily: "var(--font-body)"
              }}>
                <Icon size={14} />
                {tab.label}
              </Link>
            );
          })}
          {/* Guide link */}
          <Link to="/guide" style={{ padding: "7px 14px", borderRadius: 99, fontSize: 13, textDecoration: "none", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5, fontFamily: "var(--font-body)" }}>
            <BookOpen size={14} /> Guide
          </Link>
        </div>

        {/* Right side: AI status + user + logout */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* AI status pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
            background: modelBg, border: `1px solid ${modelColor}`,
            borderRadius: 99, fontSize: 11, fontWeight: 600, color: modelColor
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%", background: modelColor,
              animation: modelStatus === "live" ? "pulse-dot 2s infinite" : "none"
            }} />
            {modelStatus === "checking" ? "AI..." : modelStatus === "live" ? "AI Live" : "AI Offline"}
          </div>

          {/* User chip — click to edit profile */}
          <div
            onClick={() => navigate("/profile")}
            title="Edit profile & territory"
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
              {role !== "rep" && <span style={{ marginLeft: 4, background: role === "admin" ? "#7c3aed" : "var(--color-primary)", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 4, padding: "1px 5px", textTransform: "uppercase" }}>{role}</span>}
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 99, padding: "6px 14px", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, fontFamily: "var(--font-body)", display: "flex", alignItems: "center", gap: 6 }}
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="bottom-tab-bar">
        {TABS.map(tab => {
          const active = loc.pathname === tab.path || loc.pathname.startsWith(tab.path + "/");
          const Icon = tab.icon;
          return (
            <Link key={tab.path} to={tab.path} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3, padding: "8px 16px", border: "none", background: "transparent",
              color: active ? "var(--color-primary)" : "var(--text-muted)",
              fontSize: 10, fontFamily: "var(--font-body)", cursor: "pointer",
              transition: "color 0.15s ease", textDecoration: "none",
            }}>
              <Icon size={20} />
              {tab.label}
            </Link>
          );
        })}
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
