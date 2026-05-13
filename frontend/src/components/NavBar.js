import React from "react";
import { Link, useLocation } from "react-router-dom";

function NavBar() {
  const loc = useLocation();
  const active = (path) =>
    loc.pathname === path ? "nav-link active fw-semibold" : "nav-link";

  const tabStyle = (path) =>
    loc.pathname === path
      ? { color: "#1D9E75", borderBottom: "3px solid #1D9E75" }
      : { color: "#666" };

  return (
    <>
      {/* Top bar */}
      <nav
        style={{
          background: "linear-gradient(135deg, #1D9E75, #117855)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
        }}
        className="px-3 py-2 d-flex justify-content-between align-items-center"
      >
        <span className="text-white fw-bold fs-5" style={{ letterSpacing: "-0.5px" }}>
          📍 AgroNav
        </span>
        <span className="text-white opacity-75" style={{ fontSize: 13 }}>
          Arjun Kumar — Nalgonda
        </span>
      </nav>

      {/* Tab bar */}
      <div className="border-bottom bg-white px-2">
        <ul className="nav nav-tabs border-0">
          <li className="nav-item">
            <Link to="/dashboard" className={active("/dashboard")} style={tabStyle("/dashboard")}>
              Today's Route
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/alerts" className={active("/alerts")} style={tabStyle("/alerts")}>
              Alerts
              <span className="ms-1 badge bg-danger" style={{ fontSize: 9 }}>!</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/outcomes" className={active("/outcomes")} style={tabStyle("/outcomes")}>
              Outcomes
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/manager" className={active("/manager")} style={tabStyle("/manager")}>
              Manager
            </Link>
          </li>
        </ul>
      </div>
    </>
  );
}

export default NavBar;
