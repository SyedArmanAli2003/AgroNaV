import React, { useState, useEffect } from "react";
import { Activity, IndianRupee, Map, TrendingUp, Users } from "lucide-react";
import { api } from "../services/api";

const FALLBACK_KPIS = {
  visits_completed: 38,
  acceptance_rate: 67.4,
  revenue_this_week: 284000,
  active_alerts: 9
};

function Manager() {
  const [kpis, setKpis] = useState(null);

  useEffect(() => {
    api.getManagerKPIs("Nalgonda")
      .then(setKpis)
      .catch(() => setKpis(FALLBACK_KPIS));
  }, []);

  const data = kpis || FALLBACK_KPIS;
  const cards = [
    {
      title: "Total Revenue",
      value: `₹${Number(data.revenue_this_week || 0).toLocaleString("en-IN")}`,
      trend: "+12%",
      icon: IndianRupee
    },
    {
      title: "Visits Completed",
      value: data.visits_completed || 0,
      trend: "+8%",
      icon: Users
    },
    {
      title: "Acceptance Rate",
      value: `${Number(data.acceptance_rate || 0).toFixed(1)}%`,
      trend: "+5%",
      icon: TrendingUp
    },
    {
      title: "Active Alerts",
      value: data.active_alerts || 0,
      trend: "-3%",
      icon: Activity
    }
  ];

  return (
    <div className="liquid-app-page page-enter">
      <div className="liquid-app-shell">
        <p className="liquid-page-subtitle" style={{ marginTop: 0 }}>Manager KPI dashboard</p>
        <h1 className="liquid-page-title">Nalgonda Territory</h1>

        <section className="manager-kpi-grid">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="liquid-kpi-card" key={card.title}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
                  <span className="liquid-kpi-title">{card.title}</span>
                  <div className="icon-circle"><Icon size={16} /></div>
                </div>
                <div className="liquid-kpi-value" style={{ position: "relative", zIndex: 1 }}>{card.value}</div>
                <span className="trend-pill" style={{ position: "relative", zIndex: 1 }}>{card.trend}</span>
              </article>
            );
          })}
        </section>

        <section className="liquid-panel territory-heatmap">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, position: "relative", zIndex: 1 }}>
            <div>
              <h2 style={{ color: "var(--text-primary)", fontSize: 22, fontWeight: 600, margin: 0 }}>Territory Heatmap</h2>
              <p className="liquid-page-subtitle">Revenue, alert pressure, and coverage intensity by route cluster</p>
            </div>
            <div className="icon-circle"><Map size={17} /></div>
          </div>
          <div className="heatmap-canvas" />
        </section>
      </div>
    </div>
  );
}

export default Manager;
