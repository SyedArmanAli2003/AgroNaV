import React from "react";

function OutletCard({ outlet, rank, onClick }) {
  const getBadgeStyle = (label) => {
    switch (label) {
      case "HIGH": return { bg: "var(--high-bg)", color: "var(--high-text)" };
      case "MEDIUM": return { bg: "var(--medium-bg)", color: "var(--medium-text)" };
      case "LOW": return { bg: "var(--low-bg)", color: "var(--low-text)" };
      default: return { bg: "var(--low-bg)", color: "var(--low-text)" };
    }
  };

  const ps = getBadgeStyle(outlet.label);

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "16px",
        marginBottom: "10px",
        transition: "all var(--transition-med)",
        cursor: "pointer",
        position: "relative"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-card-hover)";
        e.currentTarget.style.borderColor = "var(--border-active)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "var(--shadow-card)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--bg-card)";
        e.currentTarget.style.borderColor = "var(--border-subtle)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Top row */}
      <div className="d-flex align-items-center gap-2 mb-2">
        <div
          style={{
            width: "28px", height: "28px", borderRadius: "50%",
            background: "var(--bg-glass)", border: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)", fontSize: "12px",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0
          }}
        >
          {rank}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: "15px", color: "var(--text-primary)" }}>
            {outlet.name}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            {outlet.owner_name}
          </div>
        </div>
        <span
          style={{
            background: ps.bg, color: ps.color,
            padding: "4px 12px", borderRadius: "var(--radius-pill)",
            fontSize: "11px", fontWeight: 600,
            textTransform: "uppercase"
          }}
        >
          {outlet.label}
        </span>
      </div>

      {/* Reason chips */}
      <div className="d-flex flex-wrap gap-1" style={{ marginLeft: "36px" }}>
        {(outlet.reasons || []).map((r, i) => (
          <span
            key={i}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              borderRadius: "var(--radius-pill)",
              padding: "3px 10px", fontSize: "11px"
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
