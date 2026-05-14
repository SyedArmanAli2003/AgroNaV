import React from "react";

function AlertCard({ alert, onDismiss }) {
  const getStripColor = (severity) => {
    switch (severity) {
      case "high": return "#FF6B7A";
      case "medium": return "#FFD166";
      case "info": return "#818CF8";
      default: return "#8B90A7";
    }
  };

  return (
    <div
      className="d-flex flex-row"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "14px 16px",
        marginBottom: "10px",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Left strip */}
      <div
        style={{
          position: "absolute",
          left: 0, top: "14px", bottom: "14px",
          width: "3px", borderRadius: "0 3px 3px 0",
          background: getStripColor(alert.severity)
        }}
      />

      <div style={{ paddingLeft: "12px", width: "100%" }}>
        <div style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: 500, marginBottom: "8px" }}>
          {alert.message}
        </div>
        
        <div className="d-flex justify-content-between align-items-center">
          <small style={{ color: "var(--text-muted)", fontSize: "11px" }}>
            {alert.created_at?.slice(0, 10)}
          </small>
          
          <button
            style={{
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
              borderRadius: "var(--radius-pill)",
              padding: "4px 12px",
              fontSize: "11px",
              cursor: "pointer",
              transition: "all var(--transition-fast)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-active)";
              e.currentTarget.style.color = "var(--green-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
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
