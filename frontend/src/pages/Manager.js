import React, { useState, useEffect } from "react";
import MapView from "../components/MapView";
import { api } from "../services/api";

function Manager() {
  const [kpis, setKpis] = useState(null);
  const [outlets, setOutlets] = useState([]);

  useEffect(() => {
    api.getManagerKPIs()
      .then((data) => {
        setKpis(data.kpis);
        setOutlets(data.outlets || []);
      })
      .catch(() => {});
  }, []);

  if (!kpis) {
    return (
      <div className="text-center mt-5" style={{ color: "#64748b" }}>
        <div className="spinner-border" style={{ color: "#1D9E75" }} role="status" />
        <div style={{ marginTop: 8 }}>Loading manager view...</div>
      </div>
    );
  }

  const cards = [
    { label: "Visits planned", value: kpis.visits_today, color: "#1D9E75" },
    { label: "Completed today", value: kpis.visits_completed, color: "#1e40af" },
    {
      label: "Acceptance rate",
      value: kpis.acceptance_rate_this_week + "%",
      color: "#1D9E75"
    },
    {
      label: "Revenue this week",
      value: "₹" + (kpis.revenue_this_week || 0).toLocaleString(),
      color: "#059669"
    },
    {
      label: "Active alerts",
      value: kpis.active_alerts,
      color: kpis.active_alerts > 0 ? "#e11d48" : "#16a34a"
    },
    {
      label: "Coverage efficiency",
      value: kpis.coverage_efficiency + "%",
      color: "#7c3aed"
    }
  ];

  return (
    <div>
      <p
        style={{
          fontSize: 12, textTransform: "uppercase",
          color: "#64748b", fontWeight: 700,
          letterSpacing: 1.5, marginBottom: 16
        }}
      >
        Territory overview — Nalgonda
      </p>

      {/* KPI grid */}
      <div className="row g-2 mb-3">
        {cards.map((c) => (
          <div key={c.label} className="col-6 col-md-4">
            <div
              className="p-3 text-center"
              style={{
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.4)",
                borderRadius: 16,
                boxShadow: "0 8px 32px rgba(0,0,0,0.04)",
                transition: "transform 0.3s",
                cursor: "default"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
            >
              <div style={{ fontSize: 28, fontWeight: 700, color: c.color, lineHeight: 1 }}>
                {c.value}
              </div>
              <div
                style={{
                  fontSize: 10, color: "#64748b",
                  textTransform: "uppercase", letterSpacing: 1,
                  fontWeight: 600, marginTop: 6
                }}
              >
                {c.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Territory map */}
      <MapView outlets={outlets} />
    </div>
  );
}

export default Manager;
