import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { postVisitLog, getCachedRecommendations } from "../services/api";
import { queueVisitLog } from "../services/offline";
import "../css/landing.css";
import "../css/app.css";

const SYNGENTA_PRODUCTS = [
  "Tilt 250 EC", "Score 250 EC", "Kavach 75 WP", "Amistar 250 SC",
  "Alto 5 SC", "Actara 25 WG", "Cruiser 350 FS", "Vibrance Integral",
  "Topik 15 WP", "Axial 50 EC", "Vertimec 1.8 EC", "Movondo"
];

const VISIT_TYPES = [
  { value: "retailer_meeting", label: "Retailer Meeting" },
  { value: "campaign_conducted", label: "Campaign" },
  { value: "grower_meeting", label: "Grower Meeting" }
];

const OUTCOMES = [
  { value: "Order placed", label: "Order Placed", icon: "✅" },
  { value: "Interested", label: "Interested", icon: "🤝" },
  { value: "Rejected", label: "Rejected", icon: "❌" }
];

function PostVisitLog() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const preselected = location.state?.retailer;

  const [retailers, setRetailers] = useState([]);
  const [retailerId, setRetailerId] = useState(preselected?.retailer_id || "");
  const [visitType, setVisitType] = useState("");
  const [product, setProduct] = useState(preselected?.product_recommended || "");
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const cached = getCachedRecommendations();
    if (cached?.recommendations) {
      setRetailers(cached.recommendations);
    }
  }, []);

  const isReady = retailerId && visitType && product && outcome;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isReady) return;

    setSubmitting(true);
    const repId = user?.sub || user?.rep_id || "REP_0000";

    const payload = {
      rep_id: repId,
      retailer_id: retailerId,
      visit_type: visitType,
      product_discussed: product,
      outcome,
      notes
    };

    try {
      await postVisitLog(payload);
      setToast("Visit logged ✓ Outcome saved");
    } catch {
      queueVisitLog(payload);
      setToast("Saved offline — syncs when you reconnect");
    }

    setTimeout(() => {
      navigate("/dashboard", { state: { toastMessage: toast || "Visit logged ✓" } });
    }, 1800);
    setSubmitting(false);
  };

  return (
    <div className="app-page page-enter">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "var(--glass-light-bg)", border: "1px solid var(--glass-border, rgba(255,255,255,0.10))",
            borderRadius: 99, padding: "8px 16px", color: "var(--text-primary)",
            cursor: "pointer", fontSize: 13, fontFamily: "inherit"
          }}
        >
          ←
        </button>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>Log Outcome</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Your feedback improves next week's recommendations</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Retailer */}
        <div className="glass-card">
          <p className="section-label">Retailer</p>
          <select
            id="log-retailer"
            value={retailerId}
            onChange={e => setRetailerId(e.target.value)}
            required
            style={{
              width: "100%", background: "var(--glass-strong-bg)", border: "1px solid var(--glass-border, rgba(255,255,255,0.12))",
              borderRadius: 10, padding: "12px 14px", color: "var(--text-primary)",
              fontSize: 14, fontFamily: "inherit", cursor: "pointer"
            }}
          >
            <option value="">— Select retailer —</option>
            {preselected && (
              <option value={preselected.retailer_id}>{preselected.retailer_name}</option>
            )}
            {retailers.filter(r => r.retailer_id !== preselected?.retailer_id).map(r => (
              <option key={r.retailer_id} value={r.retailer_id}>{r.retailer_name}</option>
            ))}
          </select>
        </div>

        {/* Visit type */}
        <div className="glass-card">
          <p className="section-label">Visit Type</p>
          <div className="toggle-group">
            {VISIT_TYPES.map(vt => (
              <button
                key={vt.value}
                type="button"
                className={`toggle-btn ${visitType === vt.value ? "active" : ""}`}
                onClick={() => setVisitType(vt.value)}
              >
                {vt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product discussed */}
        <div className="glass-card">
          <p className="section-label">Product Discussed</p>
          <select
            id="log-product"
            value={product}
            onChange={e => setProduct(e.target.value)}
            required
            style={{
              width: "100%", background: "var(--glass-strong-bg)", border: "1px solid var(--glass-border, rgba(255,255,255,0.12))",
              borderRadius: 10, padding: "12px 14px", color: "var(--text-primary)",
              fontSize: 14, fontFamily: "inherit", cursor: "pointer"
            }}
          >
            <option value="">— Select product —</option>
            {SYNGENTA_PRODUCTS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Outcome */}
        <div className="glass-card">
          <p className="section-label">Outcome</p>
          <div className="toggle-group">
            {OUTCOMES.map(o => (
              <button
                key={o.value}
                type="button"
                className={`toggle-btn ${outcome === o.value ? "active" : ""}`}
                onClick={() => setOutcome(o.value)}
                style={{ fontSize: 15 }}
              >
                {o.icon} {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="glass-card">
          <p className="section-label">Notes <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></p>
          <textarea
            id="log-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any context for this visit…"
            rows={3}
            style={{
              width: "100%", background: "var(--glass-strong-bg)", border: "1px solid var(--glass-border, rgba(255,255,255,0.12))",
              borderRadius: 10, padding: "12px 14px", color: "var(--text-primary)",
              fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box"
            }}
          />
        </div>

        {/* Submit */}
        <button
          id="log-submit"
          type="submit"
          disabled={!isReady || submitting}
          style={{
            width: "100%", padding: 16, borderRadius: 99, border: "none",
            background: isReady ? "linear-gradient(135deg, #1D9E75, #0F6E56)" : "var(--glass-light-bg)",
            color: isReady ? "#fff" : "var(--text-muted)",
            fontWeight: 700, fontSize: 15, cursor: isReady ? "pointer" : "not-allowed",
            boxShadow: isReady ? "0 4px 20px rgba(29,158,117,0.35)" : "none",
            fontFamily: "inherit", transition: "all 0.2s ease"
          }}
        >
          {submitting ? "Saving…" : "Submit Outcome →"}
        </button>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          ℹ️ This outcome is used in Sunday's model retraining
        </p>
      </form>

      {/* Toast */}
      {toast && (
        <div className="toast-pill" style={{ borderColor: toast.includes("offline") ? "#f97316" : "#22c55e" }}>
          {toast.includes("offline") ? "📶 " : "✓ "}{toast}
        </div>
      )}
    </div>
  );
}

export default PostVisitLog;
