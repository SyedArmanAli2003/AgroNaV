import React from "react";

function StatsRow({ outlets = [], stats = [] }) {
  const highCount = outlets.filter((o) => o.label === "HIGH").length;
  const lastStat = stats.length ? stats[stats.length - 1] : null;
  const acceptance = lastStat
    ? lastStat.acceptance_rate.toFixed(1) + "%"
    : "—";

  const cards = [
    { label: "Visits planned", value: outlets.length, accent: "var(--green-primary)", valColor: "var(--text-primary)" },
    { label: "High priority", value: highCount, accent: "var(--high-text)", valColor: "var(--high-text)" },
    { label: "Acceptance rate", value: acceptance, accent: "#4ECDC4", valColor: "var(--text-primary)" }
  ];

  return (
    <div className="row g-2 mb-3">
      {cards.map((card) => (
        <div key={card.label} className="col-4">
          <div
            className="text-center"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderLeft: `3px solid ${card.accent}`,
              borderRadius: "var(--radius-lg)",
              padding: "16px"
            }}
          >
            <div
              style={{
                fontSize: "24px",
                fontWeight: 600,
                color: card.valColor,
                lineHeight: 1
              }}
            >
              {card.value}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                marginTop: "6px"
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
