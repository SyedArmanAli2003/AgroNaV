import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getOutcomes } from "../services/api";
import "../css/landing.css";
import "../css/app.css";

const OUTCOME_STYLES = {
  "Order placed": { bg: "rgba(34,197,94,0.15)", color: "#22c55e", label: "Order Placed" },
  "Interested":   { bg: "rgba(249,115,22,0.15)", color: "#f97316", label: "Interested" },
  "Rejected":     { bg: "rgba(255,255,255,0.08)", color: "var(--text-muted)", label: "Rejected" }
};

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 86400) return "Today";
  if (diff < 172800) return "Yesterday";
  return `${Math.floor(diff / 86400)} days ago`;
}

function getNextSunday() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = day === 0 ? 7 : 7 - day;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  return next.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function Outcomes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const repId = user?.sub || user?.rep_id;

  useEffect(() => {
    const localQueue = (() => {
      try {
        return JSON.parse(localStorage.getItem("agronav_visit_log_queue") || "[]");
      } catch { return []; }
    })();

    if (repId) {
      getOutcomes(repId).then(data => {
        const serverLogs = data?.logs || [];
        const queuedLogs = localQueue.map(item => ({
          ...item,
          outlet_name: item.retailer_id,
          outcome: item.outcome,
          pending: true
        }));
        setLogs([...queuedLogs, ...serverLogs]);
      }).catch(() => {
        const queuedLogs = localQueue.map(item => ({
          ...item,
          outlet_name: item.retailer_id,
          outcome: item.outcome,
          pending: true
        }));
        setLogs(queuedLogs);
      }).finally(() => setLoading(false));
    } else {
      setLogs(localQueue.map(item => ({ ...item, outlet_name: item.retailer_id, pending: true })));
      setLoading(false);
    }
  }, [repId]);

  const thisWeek = logs.filter(l => {
    const diff = (Date.now() - new Date(l.date || l.queued_at || 0).getTime()) / 86400000;
    return diff < 7;
  });

  const fedToModel = thisWeek.filter(l => !l.pending).length;

  return (
    <div className="app-page page-enter">
      <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
        📋 Visit History
      </h1>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-secondary)" }}>
        Your outcomes & learning loop status
      </p>

      {/* Learning loop status card */}
      <div className="glass-card" style={{ marginBottom: 24, borderLeft: "3px solid #22c55e" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", marginBottom: 12 }}>
          🔄 Your Feedback Loop
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
          {[
            { label: "Visits this week", value: thisWeek.length },
            { label: "Fed to model", value: fedToModel },
            { label: "Next retraining", value: `Sun ${getNextSunday()}` }
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#22c55e" }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Every outcome you log improves Monday's recommendations.
        </p>
      </div>

      {/* Log a visit button */}
      <button
        onClick={() => navigate("/log")}
        style={{
          width: "100%", padding: "13px 16px", borderRadius: 99, border: "none",
          background: "linear-gradient(135deg, #1D9E75, #0F6E56)",
          color: "#fff", fontWeight: 700, fontSize: 14,
          cursor: "pointer", marginBottom: 20,
          boxShadow: "0 4px 16px rgba(29,158,117,0.3)", fontFamily: "inherit"
        }}
      >
        + Log New Visit
      </button>

      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          <span style={{ fontSize: 28, animation: "spin 1.2s linear infinite", display: "inline-block" }}>🌿</span>
        </div>
      )}

      {!loading && logs.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
          <div>No visits logged yet.</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>
            Mark your first visit as complete to start building your recommendation history.
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {logs.map((log, i) => {
          const style = OUTCOME_STYLES[log.outcome] || OUTCOME_STYLES["Rejected"];
          return (
            <div key={log.id || i} className="glass-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {log.outlet_name || log.retailer_id || "Unknown Retailer"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {timeAgo(log.date || log.queued_at)} · {log.product_discussed || log.notes || "—"}
                </div>
              </div>
              <div style={{
                background: style.bg, color: style.color,
                borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 600,
                whiteSpace: "nowrap", flexShrink: 0
              }}>
                {style.label}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: log.pending ? "#f97316" : "#22c55e"
                }} />
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {log.pending ? "Pending" : "Synced"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Outcomes;
