import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Store, Megaphone, Users, CheckCircle, Handshake, XCircle, WifiOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { postVisitLog } from "../services/api";
import { queueVisitLog } from "../services/offline";
import { Select } from "../components/ui/Select";

const SYNGENTA_PRODUCTS = [
  "Tilt 250 EC", "Score 250 EC", "Kavach 75 WP", "Amistar 250 SC",
  "Alto 5 SC", "Actara 25 WG", "Cruiser 350 FS", "Vibrance Integral",
  "Topik 15 WP", "Axial 50 EC", "Vertimec 1.8 EC", "Movondo",
  "Ampligo 150 ZC", "Amistar Top", "Curacron 500 EC", "Pegasus 500 SC",
  "Revus 250 SC", "Proclaim 5 SG", "Karate Zeon", "Virtako 40 WG"
];

const VISIT_TYPES = [
  { value: "retailer_meeting", label: "Retailer Meeting", Icon: Store },
  { value: "campaign_conducted", label: "Campaign", Icon: Megaphone },
  { value: "grower_meeting", label: "Grower Meeting", Icon: Users }
];

const OUTCOMES = [
  { value: "Order placed", label: "Order Placed", Icon: CheckCircle, activeClass: "active-success" },
  { value: "Interested", label: "Interested", Icon: Handshake, activeClass: "active-warning" },
  { value: "Rejected", label: "Rejected", Icon: XCircle, activeClass: "active-danger" }
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

  // Load retailers from cache + API fallback
  const loadRetailers = async () => {
    const sources = [];

    // Source 1: cached recommendations
    try {
      const cached = localStorage.getItem("agronav_recommendations");
      if (cached) {
        const data = JSON.parse(cached);
        const fromCache = (data.recommendations || []).map(r => ({
          value: r.retailer_id,
          label: `${r.retailer_name} — ${r.tehsil || r.district || ""}`
        }));
        sources.push(...fromCache);
      }
    } catch (e) { /* ignore */ }

    // Source 2: fetch fresh if cache is empty
    if (sources.length === 0) {
      try {
        const repId = user?.sub || user?.rep_id || "";
        const token = localStorage.getItem("agronav_token");
        const today = new Date().toISOString().split("T")[0];
        const res = await fetch(
          `/recommendations?rep_id=${repId}&date=${today}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        const fromAPI = (data.recommendations || []).map(r => ({
          value: r.retailer_id,
          label: `${r.retailer_name} — ${r.tehsil || ""}`
        }));
        sources.push(...fromAPI);
        // Update cache
        localStorage.setItem("agronav_recommendations",
          JSON.stringify({ ...data, cached_at: new Date().toISOString() }));
      } catch (e) {
        console.error("[PostVisitLog] Could not load retailers:", e);
      }
    }

    // Deduplicate by value
    const seen = new Set();
    const unique = sources.filter(s => {
      if (seen.has(s.value)) return false;
      seen.add(s.value);
      return true;
    });

    setRetailers(unique);

    // Pre-select from router state
    if (preselected?.retailer_id) {
      setRetailerId(preselected.retailer_id);
    }
  };

  useEffect(() => { loadRetailers(); }, []); // eslint-disable-line

  const isReady = retailerId && visitType && product && outcome;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isReady) return;
    setSubmitting(true);
    const repId = user?.sub || user?.rep_id || "REP_0000";
    const selectedRetailerLabel = retailers.find(r => r.value === retailerId)?.label || "";
    const retailerName = selectedRetailerLabel.split(" — ")[0] || retailerId;

    const payload = {
      rep_id: repId,
      retailer_id: retailerId,
      retailer_name: retailerName,
      visit_type: visitType,
      product_discussed: product,
      outcome,
      notes,
      date: new Date().toISOString().split("T")[0],
      submitted_at: new Date().toISOString()
    };

    let msg = "Visit logged successfully";
    try {
      await postVisitLog(payload);
    } catch {
      queueVisitLog(payload);
      msg = "Saved offline — syncs when you reconnect";
    }
    setToast(msg);
    setTimeout(() => navigate("/dashboard", { state: { toastMessage: msg } }), 1800);
    setSubmitting(false);
  };

  const productOptions = SYNGENTA_PRODUCTS.map(p => ({ value: p, label: p }));

  return (
    <div className="page-container page-enter" style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 100px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} style={{ width: 38, height: 38, borderRadius: "50%", border: "1px solid var(--glass-border)", background: "var(--glass-bg)", color: "var(--text-primary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={18} />
        </button>
        <div>
          <div style={{ fontWeight: 700, fontSize: 22, fontFamily: "var(--font-heading)" }}>Log Outcome</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Your feedback improves next week's recommendations</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Retailer */}
        <div className="glass-card">
          <p className="section-label">Retailer</p>
          {retailers.length > 0 ? (
            <Select options={retailers} value={retailerId} onChange={setRetailerId} placeholder="— Select retailer —" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ padding: "10px 14px", background: "var(--glass-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)", fontSize: 13, color: "var(--text-muted)" }}>
                Loading retailers… (check your dashboard first to load today's plan)
              </div>
              <input
                id="manual-retailer-id"
                className="glass-input"
                type="text"
                placeholder="Or enter retailer ID manually (e.g. RTL_001)"
                value={retailerId}
                onChange={e => setRetailerId(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Visit type */}
        <div className="glass-card">
          <p className="section-label">Visit Type</p>
          <div className="toggle-group">
            {VISIT_TYPES.map(vt => {
              const Icon = vt.Icon;
              return (
                <button key={vt.value} type="button" className={`toggle-btn ${visitType === vt.value ? "active" : ""}`} onClick={() => setVisitType(vt.value)}>
                  <Icon size={15} /> {vt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product */}
        <div className="glass-card">
          <p className="section-label">Product Discussed</p>
          <Select options={productOptions} value={product} onChange={setProduct} placeholder="— Select product —" />
        </div>

        {/* Outcome */}
        <div className="glass-card">
          <p className="section-label">Outcome</p>
          <div className="toggle-group">
            {OUTCOMES.map(o => {
              const Icon = o.Icon;
              return (
                <button key={o.value} type="button" className={`toggle-btn ${outcome === o.value ? o.activeClass : ""}`} onClick={() => setOutcome(o.value)} style={{ fontSize: 15 }}>
                  <Icon size={16} /> {o.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="glass-card">
          <p className="section-label">Notes <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></p>
          <textarea className="glass-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any context for this visit…" rows={3} style={{ resize: "vertical" }} />
        </div>

        <button type="submit" className="btn-primary" disabled={!isReady || submitting} style={{ opacity: isReady ? 1 : 0.4 }}>
          {submitting ? "Saving…" : "Submit Visit Log"}
        </button>
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          Logged outcomes are used in Sunday's model retraining
        </p>
      </form>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 82, left: "50%", transform: "translateX(-50%)", background: "var(--glass-bg-strong)", backdropFilter: "blur(12px)", borderRadius: 99, padding: "12px 24px", fontSize: 14, zIndex: 9999, animation: "toastIn 0.25s ease forwards", whiteSpace: "nowrap", border: `1px solid ${toast.includes("offline") ? "var(--color-warning-dim)" : "var(--color-primary-dim)"}`, color: toast.includes("offline") ? "var(--color-warning)" : "var(--color-primary)" }}>
          {toast.includes("offline") ? <WifiOff size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} /> : <CheckCircle size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />}
          {toast}
        </div>
      )}
    </div>
  );
}

export default PostVisitLog;
