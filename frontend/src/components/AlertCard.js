import React from "react";

const BORDER = { high: "#e11d48", medium: "#d97706", info: "#3b82f6" };
const BADGE_BG = { high: "#ffe4e6", medium: "#fef3c7", info: "#dbeafe" };
const BADGE_COLOR = { high: "#e11d48", medium: "#d97706", info: "#3b82f6" };

function AlertCard({ alert, onDismiss }) {
  return (
    <div
      className="card mb-2 d-flex flex-row"
      style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.4)",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.04)",
        transition: "transform 0.3s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateX(4px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
    >
      {/* Colored left strip */}
      <div
        style={{
          width: 5, flexShrink: 0,
          background: BORDER[alert.severity] || "#94a3b8"
        }}
      />

      <div className="p-3 flex-fill">
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
          {alert.message}
        </div>
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <span
              style={{
                fontSize: 10, fontWeight: 700,
                textTransform: "uppercase",
                padding: "3px 8px", borderRadius: 12,
                background: BADGE_BG[alert.severity] || "#f1f5f9",
                color: BADGE_COLOR[alert.severity] || "#64748b"
              }}
            >
              {alert.severity}
            </span>
            <small style={{ color: "#94a3b8" }}>
              {alert.created_at?.slice(0, 10)}
            </small>
          </div>
          <button
            className="btn btn-sm"
            style={{ fontSize: 12, color: "#94a3b8" }}
            onClick={onDismiss}
          >
            ✕ Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export default AlertCard;
