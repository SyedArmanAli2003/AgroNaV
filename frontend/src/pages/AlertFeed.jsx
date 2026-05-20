import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import "../css/landing.css";
import "../css/app.css";

const MOCK_ALERTS = [
  {
    id: "mock-1",
    type: "demand_spike",
    outlet_name: "Sharma Krishi Kendra",
    message: "Score 250 EC sales up 3x this week — stock running low. Visit today to fulfil demand.",
    severity: "high",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "mock-2",
    type: "pest_outbreak",
    outlet_name: "Territory: Jalgaon",
    message: "Fungal disease alert active in district. Recommend Tilt 250 EC to retailers with crop at flag-leaf stage.",
    severity: "critical",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "mock-3",
    type: "stock_out_risk",
    outlet_name: "Kisan Traders",
    message: "Actara 25 WG stock at 2-day level. Urgent reorder before farmers arrive.",
    severity: "high",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "mock-4",
    type: "sales_drop",
    outlet_name: "Agro Solutions — Nashik",
    message: "Kavach 75 WP sales dropped 40% below 4-week average. Investigate competitor activity.",
    severity: "medium",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
  }
];

const SEVERITY_COLORS = {
  critical: "#ef4444",
  high:     "#f97316",
  medium:   "#eab308",
  low:      "#22c55e"
};

const TYPE_LABELS = {
  demand_spike:   "Demand Spike",
  pest_outbreak:  "Pest Outbreak",
  stock_out_risk: "Stock-Out Risk",
  competitor_move:"Competitor Move",
  sales_drop:     "Sales Drop"
};

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

function AlertFeed() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAlerts().then(data => {
      const list = Array.isArray(data) ? data : (data?.alerts || []);
      if (list.length === 0) {
        setAlerts(MOCK_ALERTS);
        setIsMock(true);
      } else {
        setAlerts(list);
        setIsMock(false);
      }
    }).catch(() => {
      setAlerts(MOCK_ALERTS);
      setIsMock(true);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-page page-enter">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
            🔔 Alert Feed
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
            Anomalies & opportunities in your territory
          </p>
        </div>
        {alerts.length > 0 && (
          <span style={{
            background: "rgba(239,68,68,0.15)", color: "#ef4444",
            borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 700
          }}>
            {alerts.length} active
          </span>
        )}
      </div>

      {/* Mock banner */}
      {isMock && (
        <div style={{
          background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.25)",
          borderRadius: 12, padding: "10px 16px", marginBottom: 16,
          fontSize: 13, color: "#93c5fd"
        }}>
          📡 Demo data — connect backend for live alerts
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          <span style={{ fontSize: 28, animation: "spin 1.2s linear infinite", display: "inline-block" }}>🌿</span>
        </div>
      )}

      {!loading && alerts.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌿</div>
          <div>No active alerts for your territory today</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {alerts.map(alert => {
          const color = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.low;
          return (
            <div
              key={alert.id || alert.outlet_name}
              className="alert-card"
              style={{ borderLeft: `3px solid ${color}` }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: color, display: "inline-block", flexShrink: 0
                }} />
                <span style={{
                  background: `${color}20`, color: color,
                  borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: 0.5
                }}>
                  {TYPE_LABELS[alert.type] || alert.type}
                </span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>
                  {timeAgo(alert.timestamp || alert.created_at || new Date().toISOString())}
                </span>
              </div>

              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                {alert.outlet_name}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {alert.message}
              </div>

              <button
                onClick={() => navigate("/log", { state: { alert } })}
                style={{
                  alignSelf: "flex-start", marginTop: 8,
                  background: `${color}15`, border: `1px solid ${color}40`,
                  color, borderRadius: 99, padding: "7px 16px",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit"
                }}
              >
                Take Action →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AlertFeed;
