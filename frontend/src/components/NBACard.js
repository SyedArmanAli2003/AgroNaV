import React from "react";

function NBACard({ nba }) {
  const sections = [
    { label: "WHAT TO SAY", value: nba.pitch },
    { label: "AGRONOMIC TIP", value: nba.tip },
    { label: "PROMOTION", value: nba.promotion }
  ];

  return (
    <div
      className="card mb-3"
      style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.4)",
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.04)"
      }}
    >
      <div className="card-body">
        <p
          style={{
            fontSize: 10, textTransform: "uppercase",
            letterSpacing: 1.5, color: "#64748b",
            fontWeight: 700, marginBottom: 8
          }}
        >
          Next best action
        </p>

        <h5 style={{ color: "#1D9E75", fontWeight: 700, fontSize: 24, marginBottom: 16 }}>
          {nba.product}
        </h5>

        {sections.map((s) => (
          <div
            key={s.label}
            className="rounded-3 p-3 mb-2"
            style={{
              background: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(255,255,255,0.4)"
            }}
          >
            <div
              style={{
                fontSize: 10, textTransform: "uppercase",
                letterSpacing: 1, color: "#64748b",
                fontWeight: 700, marginBottom: 6
              }}
            >
              {s.label}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>{s.value}</div>
          </div>
        ))}

        {/* WHY NOW — non-negotiable */}
        <div
          style={{
            background: "#d1fae5", color: "#065f46",
            padding: "14px 18px", borderRadius: 12,
            fontSize: 14, lineHeight: 1.6, marginTop: 4,
            border: "1px solid rgba(16,185,129,0.2)"
          }}
        >
          <strong>Why now: </strong>
          {nba.why}
        </div>
      </div>
    </div>
  );
}

export default NBACard;
