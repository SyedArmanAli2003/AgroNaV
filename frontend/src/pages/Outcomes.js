import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, ClipboardList, CheckCircle, Clock, Leaf, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getOutcomes } from "../services/api";

const OUTCOME_STYLES = {
  "Order placed": { bg: "var(--color-success-dim)", color: "var(--color-success)", label: "Order Placed" },
  "Interested":   { bg: "var(--color-warning-dim)", color: "var(--color-warning)", label: "Interested" },
  "Rejected":     { bg: "var(--color-urgent-dim)",  color: "var(--text-muted)",    label: "Rejected" }
};

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 86400) return "Today";
  if (diff < 172800) return "Yesterday";
  return `${Math.floor(diff / 86400)} days ago`;
}

function getNextSunday() {
  const now = new Date();
  const day = now.getDay();
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
    const localQueue = (() => { try { return JSON.parse(localStorage.getItem("agronav_visit_log_queue") || "[]"); } catch { return []; } })();
    if (repId) {
      getOutcomes(repId).then(data => {
        const serverLogs = data?.logs || [];
        const queuedLogs = localQueue.map(item => ({ ...item, outlet_name: item.retailer_id, outcome: item.outcome, pending: true }));
        setLogs([...queuedLogs, ...serverLogs]);
      }).catch(() => {
        setLogs(localQueue.map(item => ({ ...item, outlet_name: item.retailer_id, pending: true })));
      }).finally(() => setLoading(false));
    } else {
      setLogs(localQueue.map(item => ({ ...item, outlet_name: item.retailer_id, pending: true })));
      setLoading(false);
    }
  }, [repId]);

  const thisWeek = logs.filter(l => { const diff = (Date.now() - new Date(l.date || l.queued_at || 0).getTime()) / 86400000; return diff < 7; });
  const fedToModel = thisWeek.filter(l => !l.pending).length;
  const progress = Math.min(thisWeek.length / 10, 1);

  return (
    <div className="page-container page-enter" style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 100px" }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 600, fontFamily: "var(--font-heading)", display: "flex", alignItems: "center", gap: 8 }}>
        <ClipboardList size={22} /> Visit History
      </h1>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-secondary)" }}>Your outcomes power next week's model</p>

      {/* Learning loop card */}
      <div className="glass-card-strong" style={{ marginBottom: 24, borderLeft: "3px solid var(--color-success)" }}>
        <div style={{ fontWeight: 700, fontSize: 15, fontFamily: "var(--font-heading)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <RefreshCw size={18} color="var(--color-primary)" /> Feedback Loop
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
          {[
            { label: "Visits this week", value: thisWeek.length },
            { label: "Synced outcomes", value: fedToModel },
            { label: "Next retraining", value: `Sun ${getNextSunday()}` }
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-success)", fontFamily: "var(--font-heading)" }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
        {/* Progress bar */}
        <div style={{ height: 6, background: "var(--glass-bg)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: "var(--color-success)", borderRadius: 99, transition: "width 0.5s" }} />
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
          {thisWeek.length}/10 visits logged this week
        </p>
      </div>

      {/* Log button */}
      <button className="btn-primary" onClick={() => navigate("/log")} style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <Plus size={16} /> Log New Visit
      </button>

      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          <Leaf size={28} style={{ animation: "spin 1.2s linear infinite" }} />
        </div>
      )}

      {!loading && logs.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          <ClipboardList size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div>No visits logged yet.</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>Mark your first visit to start building your recommendation history.</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {logs.map((log, i) => {
          const style = OUTCOME_STYLES[log.outcome] || OUTCOME_STYLES["Rejected"];
          return (
            <div key={log.id || i} className="glass-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "var(--font-heading)" }}>
                  {log.outlet_name || log.retailer_id || "Unknown Retailer"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {timeAgo(log.date || log.queued_at)} · {log.product_discussed || log.notes || "—"}
                </div>
              </div>
              <div style={{ background: style.bg, color: style.color, borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                {style.label}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                {log.pending
                  ? <><Clock size={12} color="var(--color-warning)" /><span style={{ fontSize: 10, color: "var(--text-muted)" }}>Pending</span></>
                  : <><CheckCircle size={12} color="var(--color-success)" /><span style={{ fontSize: 10, color: "var(--text-muted)" }}>Synced</span></>
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Outcomes;
