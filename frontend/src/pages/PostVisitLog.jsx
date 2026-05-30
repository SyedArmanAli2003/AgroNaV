import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Store, Megaphone, Users, CheckCircle, Handshake, XCircle, WifiOff, Shield, AlertTriangle, TrendingUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api, postVisitLog } from "../services/api";
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
  // Competitor intelligence
  const [compObs, setCompObs] = useState("");
  const [compAnalyzing, setCompAnalyzing] = useState(false);
  const [compResult, setCompResult] = useState(null);

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
      competitor_observation: compObs || "",
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

        {/* Competitor Observation */}
        <div className="glass-card">
          <p className="section-label">
            <Shield size={13} style={{ verticalAlign: "-1px", marginRight: 5 }} />
            Competitor Observation <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span>
          </p>
          <textarea
            id="competitor-observation"
            className="glass-input"
            value={compObs}
            onChange={e => { setCompObs(e.target.value); setCompResult(null); }}
            placeholder="e.g. Bayer rep was here yesterday, offering 10% discount on fungicide…"
            rows={3}
            style={{ resize: "vertical", marginBottom: 10 }}
          />
          <button
            type="button"
            id="analyze-threat-btn"
            disabled={!compObs.trim() || compAnalyzing || !retailerId}
            onClick={async () => {
              setCompAnalyzing(true);
              setCompResult(null);
              try {
                const selectedRec = (JSON.parse(localStorage.getItem("agronav_recommendations") || "{}").recommendations || [])
                  .find(r => r.retailer_id === retailerId) || {};
                const result = await api.analyzeCompetitor({
                  retailer_id: retailerId,
                  outlet_name: selectedRec.retailer_name || retailerId,
                  district: selectedRec.district || localStorage.getItem("agronav_district") || "Jalgaon",
                  tehsil: selectedRec.tehsil || "",
                  rep_text_input: compObs,
                  stock_days_remaining: selectedRec.stock_days_remaining || 14,
                  days_since_purchase: selectedRec.days_since_last_visit || 7,
                  crop_stage: selectedRec.crop_stage || "vegetative",
                });
                setCompResult(result);
              } catch (e) {
                setCompResult({ threat_type: "error", immediate_action: "Could not analyze. Please try again." });
              } finally {
                setCompAnalyzing(false);
              }
            }}
            style={{
              padding: "8px 20px", borderRadius: 99,
              background: compObs.trim() && retailerId ? "var(--color-primary-dim)" : "transparent",
              border: "1px solid var(--color-primary)",
              color: "var(--color-primary)", fontSize: 12, fontWeight: 600,
              cursor: compObs.trim() && retailerId ? "pointer" : "not-allowed",
              opacity: compObs.trim() && retailerId ? 1 : 0.4,
              fontFamily: "var(--font-body)"
            }}
          >
            {compAnalyzing ? "Analyzing…" : "⚡ Analyze Threat"}
          </button>

          {/* Intel Result Card */}
          {compResult && compResult.threat_type !== "none" && compResult.threat_type !== "error" && (
            <div style={{
              marginTop: 14, padding: "14px 16px", borderRadius: 10,
              border: `1px solid ${compResult.threat_level === "HIGH" ? "var(--color-warning)" : "var(--color-primary)"}`,
              background: compResult.threat_level === "HIGH" ? "rgba(245,158,11,0.07)" : "var(--glass-bg)",
              animation: "toastIn 0.25s ease forwards",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                {compResult.opportunity_flag
                  ? <TrendingUp size={14} color="var(--color-primary)" />
                  : <AlertTriangle size={14} color={compResult.threat_level === "HIGH" ? "var(--color-warning)" : "var(--color-primary)"} />}
                <span style={{
                  fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                  color: compResult.opportunity_flag ? "var(--color-primary)" :
                         compResult.threat_level === "HIGH" ? "var(--color-warning)" : "var(--color-primary)"
                }}>
                  {compResult.threat_type?.replace(/_/g, " ")} · {compResult.threat_level}
                </span>
                {compResult.escalate_to_manager && (
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--color-warning)", border: "1px solid var(--color-warning)", borderRadius: 99, padding: "2px 8px" }}>
                    Escalate to Manager
                  </span>
                )}
              </div>

              {compResult.nearby_stores && compResult.nearby_stores !== "None detected" && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "monospace" }}>
                  📍 Nearby: {compResult.nearby_stores}
                </div>
              )}

              {compResult.defensive_talking_point && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Talking Point</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{compResult.defensive_talking_point}</div>
                </div>
              )}

              {compResult.immediate_action && (
                <div style={{ marginTop: 4, padding: "8px 12px", background: "var(--color-primary-dim)", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Immediate Action</div>
                  <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>{compResult.immediate_action}</div>
                </div>
              )}

              {compResult.at_risk_syngenta_products?.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {compResult.at_risk_syngenta_products.map(sku => (
                    <span key={sku} style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, background: "rgba(245,158,11,0.12)", color: "var(--color-warning)", border: "1px solid rgba(245,158,11,0.3)" }}>
                      {sku}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 8, fontSize: 10, color: "var(--text-muted)" }}>via {compResult.source}</div>
            </div>
          )}

          {compResult && compResult.threat_type === "none" && (
            <div style={{ marginTop: 12, fontSize: 13, color: "var(--color-primary)", display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle size={14} /> No competitive threat detected in this observation.
            </div>
          )}
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
