import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ShieldCheck, ChevronRight, Leaf } from "lucide-react";
import { api } from "../services/api";

const MOCK_ALERTS = [
  { id: "m1", type: "demand_spike", outlet_name: "Sharma Krishi Kendra", message: "Score 250 EC sales up 3x this week — stock running low.", severity: "high", timestamp: new Date(Date.now() - 2*3600000).toISOString() },
  { id: "m2", type: "pest_outbreak", outlet_name: "Territory: Jalgaon", message: "Fungal disease alert active in district. Recommend Tilt 250 EC.", severity: "critical", timestamp: new Date(Date.now() - 5*3600000).toISOString() },
  { id: "m3", type: "stock_out_risk", outlet_name: "Kisan Traders", message: "Actara 25 WG stock at 2-day level. Urgent reorder.", severity: "high", timestamp: new Date(Date.now() - 1*3600000).toISOString() },
  { id: "m4", type: "sales_drop", outlet_name: "Agro Solutions — Nashik", message: "Kavach 75 WP sales dropped 40% below 4-week average.", severity: "medium", timestamp: new Date(Date.now() - 8*3600000).toISOString() },
];

const SEV_COLORS = { critical: "var(--color-urgent)", high: "var(--color-warning)", medium: "#eab308", low: "var(--color-primary)" };
const TYPE_LABELS = { demand_spike: "Demand Spike", pest_outbreak: "Pest Outbreak", stock_out_risk: "Stock-Out Risk", competitor_move: "Competitor Move", sales_drop: "Sales Drop" };

function timeAgo(iso) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d/60)} min ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}

function AlertFeed() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAlerts().then(data => {
      const list = Array.isArray(data) ? data : (data?.alerts || []);
      if (list.length === 0) { setAlerts(MOCK_ALERTS); setIsMock(true); }
      else { setAlerts(list); setIsMock(false); }
    }).catch(() => { setAlerts(MOCK_ALERTS); setIsMock(true); }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container page-enter" style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 100px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, fontFamily: "var(--font-heading)", display: "flex", alignItems: "center", gap: 8 }}>
            <Bell size={22} /> Territory Alerts
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>Anomaly & Opportunity Detection</p>
        </div>
        {alerts.length > 0 && (
          <span style={{ background: "var(--color-urgent-dim)", color: "var(--color-urgent)", borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
            {alerts.length} active
          </span>
        )}
      </div>

      {isMock && (
        <div className="glass-card" style={{ marginBottom: 16, padding: "10px 16px", fontSize: 13, color: "var(--color-info)", borderLeft: "3px solid var(--color-info)" }}>
          Demo data — connect backend for live alerts
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          <Leaf size={28} style={{ animation: "spin 1.2s linear infinite" }} />
        </div>
      )}

      {!loading && alerts.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          <ShieldCheck size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
          <div>No active alerts for your territory</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {alerts.map(alert => {
          const color = SEV_COLORS[alert.severity] || SEV_COLORS.low;
          return (
            <div key={alert.id || alert.outlet_name} className="glass-card" style={{ borderLeft: `3px solid ${color}`, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
                <span style={{ background: `${color}20`, color, borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {TYPE_LABELS[alert.type] || alert.type}
                </span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>
                  {timeAgo(alert.timestamp || alert.created_at || new Date().toISOString())}
                </span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, fontFamily: "var(--font-heading)" }}>{alert.outlet_name}</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{alert.message}</div>
              <button onClick={() => navigate("/log", { state: { alert } })} style={{ alignSelf: "flex-start", marginTop: 8, background: "transparent", border: `1px solid ${color}`, color, borderRadius: 99, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)", display: "flex", alignItems: "center", gap: 4 }}>
                Take Action <ChevronRight size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AlertFeed;
