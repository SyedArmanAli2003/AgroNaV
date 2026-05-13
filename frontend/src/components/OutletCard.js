import React from "react";

const PRIORITY_STYLE = {
  HIGH: { bg: "#ffe4e6", color: "#e11d48" },
  MEDIUM: { bg: "#fef3c7", color: "#d97706" },
  LOW: { bg: "#dcfce7", color: "#16a34a" }
};

function OutletCard({ outlet, rank, onClick }) {
  const ps = PRIORITY_STYLE[outlet.label] || PRIORITY_STYLE.LOW;

  return (
    <div
      onClick={onClick}
      className="card mb-2 p-3"
      style={{
        cursor: "pointer",
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.4)",
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.04)",
        transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px) scale(1.01)";
        e.currentTarget.style.boxShadow = "0 12px 40px rgba(29,158,117,0.15)";
        e.currentTarget.style.borderColor = "#1D9E75";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.04)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
      }}
    >
      {/* Top row */}
      <div className="d-flex align-items-center gap-2 mb-2">
        <div
          style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "#e2e8f0", fontSize: 13, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)"
          }}
        >
          {rank}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{outlet.name}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{outlet.owner_name}</div>
        </div>
        <span
          style={{
            background: ps.bg, color: ps.color,
            padding: "4px 12px", borderRadius: 20,
            fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: 0.5
          }}
        >
          {outlet.label}
        </span>
      </div>

      {/* Reason chips */}
      <div className="d-flex flex-wrap gap-1" style={{ marginLeft: 40 }}>
        {(outlet.reasons || []).map((r, i) => (
          <span
            key={i}
            style={{
              fontSize: 11, padding: "4px 10px", borderRadius: 20,
              background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)",
              color: "#475569", fontWeight: 500
            }}
          >
            {r}
          </span>
        ))}
      </div>
    </div>
  );
}

export default OutletCard;
