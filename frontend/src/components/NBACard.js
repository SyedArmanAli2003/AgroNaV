import React from "react";

function NBACard({ nba }) {
  const sections = [
    { label: "WHAT TO SAY", value: nba.pitch },
    { label: "AGRONOMIC TIP", value: nba.tip },
    { label: "PROMOTION", value: nba.promotion }
  ];

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "20px",
        marginBottom: "16px"
      }}
    >
      <p
        style={{
          fontSize: "10px", textTransform: "uppercase",
          letterSpacing: "1px", color: "var(--text-muted)",
          fontWeight: 700, marginBottom: "8px"
        }}
      >
        Next best action
      </p>

      <h5
        style={{
          background: "linear-gradient(135deg, #1D9E75, #4ECDC4)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontSize: "22px", fontWeight: 700, marginBottom: "16px"
        }}
      >
        {nba.product}
      </h5>

      {sections.map((s) => (
        <div
          key={s.label}
          style={{
            background: "var(--bg-glass)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "12px 14px",
            marginBottom: "10px"
          }}
        >
          <div
            style={{
              color: "var(--text-muted)", fontSize: "10px",
              textTransform: "uppercase", letterSpacing: "1px",
              marginBottom: "4px"
            }}
          >
            {s.label}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: 1.6 }}>
            {s.value}
          </div>
        </div>
      ))}

      {/* WHY NOW box */}
      <div
        style={{
          background: "rgba(29,158,117,0.1)",
          border: "1px solid rgba(29,158,117,0.25)",
          borderLeft: "3px solid var(--green-primary)",
          borderRadius: "var(--radius-md)",
          padding: "14px 16px",
          color: "#4ECDC4",
          fontSize: "13px",
          lineHeight: 1.6,
          marginTop: "10px"
        }}
      >
        <strong style={{ color: "var(--green-primary)" }}>Why now: </strong>
        {nba.why}
      </div>
    </div>
  );
}

export default NBACard;
