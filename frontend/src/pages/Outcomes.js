import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { RefreshCw, ClipboardList, CheckCircle, Clock, Leaf, Plus, Edit2, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getOutcomes } from "../services/api";

// Maps both backend-normalized values (sale/order/none) AND original frontend labels
const OUTCOME_STYLES = {
  "sale":  { bg: "rgba(29,158,117,0.15)", color: "var(--color-primary)",   label: "Order Placed" },
  "order": { bg: "rgba(245,158,11,0.15)", color: "var(--color-warning)",   label: "Interested"   },
  "none":  { bg: "rgba(239,68,68,0.12)",  color: "var(--text-muted)",      label: "Rejected"     },
  "Order placed": { bg: "rgba(29,158,117,0.15)", color: "var(--color-primary)",   label: "Order Placed" },
  "Interested":   { bg: "rgba(245,158,11,0.15)", color: "var(--color-warning)",   label: "Interested"   },
  "Rejected":     { bg: "rgba(239,68,68,0.12)",  color: "var(--text-muted)",      label: "Rejected"     },
};

const EDIT_OUTCOMES = [
  { value: "sale",  label: "Order Placed" },
  { value: "order", label: "Interested" },
  { value: "none",  label: "Rejected" },
];

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
  const location = useLocation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [editLog, setEditLog] = useState(null);
  const [editOutcome, setEditOutcome] = useState("");
  const [saving, setSaving] = useState(false);
  const repId = user?.sub || user?.rep_id;
  const hasMounted = useRef(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const fetchLogs = useCallback(() => {
    const localQueue = (() => { try { return JSON.parse(localStorage.getItem("agronav_visit_log_queue") || "[]"); } catch { return []; } })();
    if (repId) {
      return getOutcomes(repId).then(data => {
        const serverLogs = data?.logs || [];
        const queuedLogs = localQueue.map(item => ({ ...item, outlet_name: item.retailer_id, outcome: item.outcome, pending: true }));
        setLogs([...queuedLogs, ...serverLogs]);
      }).catch(() => {
        setLogs(localQueue.map(item => ({ ...item, outlet_name: item.retailer_id, pending: true })));
      }).finally(() => setLoading(false));
    } else {
      setLogs(localQueue.map(item => ({ ...item, outlet_name: item.retailer_id, pending: true })));
      setLoading(false);
      return Promise.resolve();
    }
  }, [repId]);

  // Initial fetch
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      fetchLogs();
    }
  }, [fetchLogs]);

  // Show toast + refresh when navigated back from PostVisitLog
  useEffect(() => {
    if (location.state?.toastMessage) {
      showToast(location.state.toastMessage);
      window.history.replaceState({}, document.title);
      setLoading(true);
      fetchLogs();
    }
  }, [location.state]); // eslint-disable-line

  // Refresh when window regains focus
  useEffect(() => {
    const onFocus = () => { if (repId) fetchLogs(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchLogs, repId]);

  const handleSaveEdit = async () => {
    if (!editLog || !editOutcome) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("agronav_token");
      const res = await fetch(`/api/outcomes/${editLog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ outcome: editOutcome }),
      });
      if (res.ok) {
        setLogs(prev => prev.map(l => l.id === editLog.id ? { ...l, outcome: editOutcome } : l));
        showToast("Outcome updated");
      } else {
        showToast("Failed to update outcome");
      }
    } catch {
      showToast("Network error — outcome not saved");
    } finally {
      setSaving(false);
      setEditLog(null);
    }
  };

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
        <div style={{ height: 6, background: "var(--glass-bg)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: "var(--color-success)", borderRadius: 99, transition: "width 0.5s" }} />
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
          {thisWeek.length}/10 visits logged this week
        </p>
      </div>

      {/* Action bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button className="btn-primary" onClick={() => navigate("/log")} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Plus size={16} /> Log New Visit
        </button>
        <button
          onClick={() => { setLoading(true); fetchLogs(); }}
          style={{ padding: "10px 16px", borderRadius: 99, border: "1px solid var(--glass-border)", background: "var(--glass-bg)", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

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
          const rawOutcome = (log.outcome || "").toLowerCase().trim();
          const style = OUTCOME_STYLES[log.outcome] || OUTCOME_STYLES[rawOutcome] || OUTCOME_STYLES["none"];
          return (
            <div key={log.id || i} className="glass-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "var(--font-heading)" }}>
                  {log.retailer_name || log.outlet_name || log.retailer_id || "Unknown Retailer"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 6, alignItems: "center" }}>
                  <span>{timeAgo(log.date || log.queued_at)}</span>
                  {(log.product_discussed || log.visit_type) && <span style={{ opacity: 0.5 }}>·</span>}
                  {log.product_discussed && <span>{log.product_discussed}</span>}
                  {log.visit_type && !log.product_discussed && <span style={{ textTransform: "capitalize" }}>{log.visit_type.replace(/_/g, " ")}</span>}
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
              {/* Edit button — available to all logged-in users for their synced logs */}
              {!log.pending && log.id && (
                <button
                  onClick={() => { setEditLog(log); setEditOutcome(log.outcome || "none"); }}
                  style={{ flexShrink: 0, background: "none", border: "1px solid var(--glass-border)", borderRadius: 8, padding: "4px 8px", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }}
                  title="Edit outcome"
                >
                  <Edit2 size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Outcome Modal */}
      {editLog && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setEditLog(null)}
        >
          <div className="glass-card-strong" style={{ width: "100%", maxWidth: 380, padding: 28 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Edit Outcome</h2>
              <button onClick={() => setEditLog(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}><X size={18} /></button>
            </div>
            <p style={{ margin: "0 0 6px", fontSize: 12, color: "var(--text-muted)" }}>Retailer</p>
            <p style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 600 }}>{editLog.retailer_name || editLog.outlet_name || editLog.retailer_id}</p>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>New Outcome</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
              {EDIT_OUTCOMES.map(o => (
                <button key={o.value} type="button"
                  onClick={() => setEditOutcome(o.value)}
                  style={{
                    padding: "11px 16px", borderRadius: 10,
                    border: `1px solid ${editOutcome === o.value ? "var(--color-primary)" : "var(--glass-border)"}`,
                    background: editOutcome === o.value ? "var(--color-primary-dim)" : "var(--glass-bg)",
                    color: editOutcome === o.value ? "var(--color-primary)" : "var(--text-secondary)",
                    fontWeight: 600, fontSize: 13, cursor: "pointer", textAlign: "left", fontFamily: "var(--font-body)"
                  }}
                >{o.label}</button>
              ))}
            </div>
            <button
              className="btn-primary"
              disabled={saving || editOutcome === (editLog.outcome || "none")}
              onClick={handleSaveEdit}
              style={{ width: "100%", opacity: (saving || editOutcome === (editLog.outcome || "none")) ? 0.5 : 1 }}
            >
              {saving ? "Saving…" : "Save Change"}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 70, right: 20,
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(10,20,14,0.97)", backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)", borderRadius: 12, padding: "12px 18px",
          fontSize: 13, fontWeight: 600, zIndex: 9999, animation: "toastIn 0.3s ease forwards",
          whiteSpace: "nowrap", border: "1px solid rgba(29,158,117,0.4)",
          color: "var(--color-primary)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>
          <CheckCircle size={14} style={{ flexShrink: 0 }} />
          {toast}
        </div>
      )}
    </div>
  );
}

export default Outcomes;
