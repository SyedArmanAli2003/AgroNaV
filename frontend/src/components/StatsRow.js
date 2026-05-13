import React from "react";

function StatsRow({ outlets = [], stats = [] }) {
  const highCount = outlets.filter((o) => o.label === "HIGH").length;
  const lastStat = stats.length ? stats[stats.length - 1] : null;
  const acceptance = lastStat
    ? lastStat.acceptance_rate.toFixed(1) + "%"
    : "—";

  const cards = [
    { label: "Visits planned", value: outlets.length, color: "#1D9E75" },
    { label: "High priority", value: highCount, color: "#A32D2D" },
    { label: "Acceptance rate", value: acceptance, color: "#1D9E75" }
  ];

  return (
    <div className="row g-2 mb-3">
      {cards.map((card) => (
        <div key={card.label} className="col-4">
          <div
            className="p-3 rounded-3 text-center"
            style={{
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.4)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.04)",
              borderRadius: 16
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: card.color,
                lineHeight: 1
              }}
            >
              {card.value}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: 1,
                fontWeight: 600,
                marginTop: 6
              }}
            >
              {card.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StatsRow;
