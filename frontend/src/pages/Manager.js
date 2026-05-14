import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function Manager() {
  const [kpis, setKpis] = useState(null);

  useEffect(() => {
    api.getManagerKPIs("Nalgonda")
      .then(setKpis)
      .catch(() => {});
  }, []);

  if (!kpis) {
    return (
      <div className="text-center mt-5" style={{ color: "var(--text-muted)" }}>
        <div className="spinner-border" style={{ color: "var(--green-primary)" }} role="status" />
        <div style={{ marginTop: "8px" }}>Loading territory data...</div>
      </div>
    );
  }

  const cards = [
    { label: "Visits planned", value: kpis.visits_planned, gradient: "linear-gradient(90deg, #1D9E75, #4ECDC4)" },
    { label: "Completed today", value: kpis.visits_completed, gradient: "linear-gradient(90deg, #1D9E75, #4ECDC4)" },
    { label: "Acceptance rate", value: kpis.acceptance_rate.toFixed(1) + "%", gradient: "linear-gradient(90deg, #6366F1, #818CF8)" },
    { label: "Revenue this week", value: "₹" + kpis.revenue_this_week, gradient: "linear-gradient(90deg, #6366F1, #818CF8)" },
    { label: "Active alerts", value: kpis.active_alerts, gradient: "linear-gradient(90deg, #F59E0B, #FFD166)" },
    { label: "Coverage efficiency", value: kpis.coverage_efficiency.toFixed(0) + "%", gradient: "linear-gradient(90deg, #F59E0B, #FFD166)" }
  ];

  return (
    <div className="page-enter">
      <h5 style={{ fontWeight: 700, marginBottom: "4px", color: "var(--text-primary)" }}>Manager Overview</h5>
      <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "20px" }}>Territory: Nalgonda</p>

      <div className="row g-3 mb-4">
        {cards.map((c, i) => (
          <div key={i} className="col-6">
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                padding: "18px",
                position: "relative",
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0, left: 0, right: 0,
                  height: "4px",
                  background: c.gradient
                }}
              />
              <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                {c.value}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                {c.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          height: "220px",
          background: "var(--bg-card)",
          border: "1px dashed var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          color: "var(--text-muted)", fontSize: "13px",
          backgroundImage: `linear-gradient(var(--border-subtle) 1px, transparent 1px),
                            linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)`,
          backgroundSize: "40px 40px"
        }}
      >
        <div style={{ fontSize: "24px", marginBottom: "8px" }}>🗺️</div>
        Territory Heatmap loads when GOOGLE_MAPS_KEY is added
      </div>
    </div>
  );
}

export default Manager;
