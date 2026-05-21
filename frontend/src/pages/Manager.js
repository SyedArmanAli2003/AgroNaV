import React, { useState, useEffect } from "react";
import { IndianRupee, TrendingUp, Users, AlertTriangle, RefreshCw, UserPlus, Download, Map } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const FALLBACK = { visits_completed: 38, acceptance_rate: 67.4, revenue_this_week: 284000, active_alerts: 9 };
const DEMO_REPS = [
  { rep_id: "REP_0201", name: "Arjun Kumar", territory: "Nalgonda", visits_today: 5, acceptance: 72, status: "active" },
  { rep_id: "REP_0202", name: "Priya Sharma", territory: "Miryalaguda", visits_today: 3, acceptance: 68, status: "active" },
  { rep_id: "REP_0203", name: "Rajesh Patel", territory: "Devarakonda", visits_today: 0, acceptance: 55, status: "offline" },
  { rep_id: "REP_0204", name: "Sunita Devi", territory: "Suryapet", visits_today: 7, acceptance: 81, status: "active" },
];

function Manager() {
  const [kpis, setKpis] = useState(null);
  const { user } = useAuth();

  useEffect(() => { api.getManagerKPIs("Nalgonda").then(setKpis).catch(() => setKpis(FALLBACK)); }, []);

  const data = kpis?.kpis || kpis || FALLBACK;
  const cards = [
    { title: "Total Visits Today", value: data.visits_completed || data.visits_today || 0, sub: "across 4 reps", trend: "+12%", icon: Users, color: "var(--color-primary)" },
    { title: "Acceptance Rate", value: `${Number(data.acceptance_rate || data.acceptance_rate_this_week || 0).toFixed(1)}%`, sub: "recommendations followed", trend: "+5%", icon: TrendingUp, color: "var(--color-primary)" },
    { title: "High Priority Missed", value: data.high_priority_pending || 3, sub: "outlets not visited", trend: null, icon: AlertTriangle, color: "var(--color-urgent)" },
    { title: "Revenue Signals", value: `₹${Number(data.revenue_this_week || 0).toLocaleString("en-IN")}`, sub: "estimated today", trend: "+8%", icon: IndianRupee, color: "var(--color-success)" },
  ];

  return (
    <div className="page-container page-enter" style={{ padding: "20px 16px 100px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Manager Portal</p>
        <h1 style={{ margin: "4px 0 24px", fontFamily: "var(--font-heading)", fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 600 }}>
          {user?.territory || user?.district || "Nalgonda"} Territory
        </h1>

        {/* KPI Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
          {cards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="glass-card-strong" style={{ padding: 20, minHeight: 140 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-secondary)" }}>{card.title}</span>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--glass-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={16} color={card.color} />
                  </div>
                </div>
                <div style={{ fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 700, fontFamily: "var(--font-heading)", lineHeight: 1, color: card.color }}>{card.value}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{card.sub}</div>
                {card.trend && (
                  <span style={{ display: "inline-flex", alignItems: "center", marginTop: 8, borderRadius: 99, background: "var(--color-primary-dim)", border: "1px solid var(--color-primary)", color: "var(--color-primary)", fontSize: 12, fontWeight: 700, padding: "4px 10px" }}>
                    {card.trend}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Rep Status Table */}
        <div className="glass-card" style={{ marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Your Field Team</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body)", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  {["Rep Name", "Territory", "Visits Today", "Acceptance %", "Status"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DEMO_REPS.map(rep => (
                  <tr key={rep.rep_id} style={{ borderBottom: "1px solid var(--glass-border)", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--glass-bg)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "12px", fontWeight: 600 }}>{rep.name}</td>
                    <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{rep.territory}</td>
                    <td style={{ padding: "12px" }}>{rep.visits_today}</td>
                    <td style={{ padding: "12px" }}>{rep.acceptance}%</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: rep.status === "active" ? "var(--color-success)" : rep.status === "alert" ? "var(--color-urgent)" : "var(--text-muted)" }} />
                        <span style={{ fontSize: 12, textTransform: "capitalize" }}>{rep.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Territory Heatmap */}
        <div className="glass-card" style={{ marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 600, fontFamily: "var(--font-heading)", display: "flex", alignItems: "center", gap: 8 }}>
            <Map size={18} /> Territory Alert Heatmap
          </h2>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-secondary)" }}>High-priority areas requiring attention</p>
          <div style={{ minHeight: 200, borderRadius: "var(--radius-md)", display: "flex", flexWrap: "wrap", gap: 10, padding: 16, background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
            {["Nalgonda", "Miryalaguda", "Devarakonda", "Suryapet", "Kodad", "Huzurnagar"].map((dist, i) => {
              const severity = i < 2 ? "urgent" : i < 4 ? "warning" : "primary";
              return (
                <span key={dist} style={{ padding: "8px 16px", borderRadius: 99, fontSize: 13, fontWeight: 600, background: `var(--color-${severity}-dim)`, color: `var(--color-${severity})`, border: `1px solid var(--color-${severity})` }}>
                  {dist}
                </span>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn-primary" style={{ width: "auto", padding: "12px 20px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <UserPlus size={16} /> Add New Rep
          </button>
          <button style={{ padding: "12px 20px", borderRadius: 99, border: "1px solid var(--glass-border)", background: "var(--glass-bg)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)", display: "flex", alignItems: "center", gap: 6 }}
            onClick={() => api.recalibrate()}>
            <RefreshCw size={14} /> Trigger Recalibration
          </button>
          <button style={{ padding: "12px 20px", borderRadius: 99, border: "1px solid var(--glass-border)", background: "var(--glass-bg)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)", display: "flex", alignItems: "center", gap: 6 }}>
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>
    </div>
  );
}

export default Manager;
