import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Leaf, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { postVisitLog, getCachedRecommendations } from "../services/api";
import { queueVisitLog } from "../services/offline";
import "../css/landing.css";

const SYNGENTA_PRODUCTS = [
  "Tilt 250 EC",
  "Amistar Top",
  "Actara 25 WG",
  "Karate Zeon",
  "Ampligo",
  "Durivo",
  "Alika",
  "Ridomil Gold",
  "Score",
  "Bravo",
  "Force 3G",
  "Axial"
];

function PostVisitLog() {
  const authContext = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Load cached recommendations for pre-populating retailer select dropdown
  const [retailers, setRetailers] = useState([]);
  const [selectedRetailerId, setSelectedRetailerId] = useState("");
  const [visitType, setVisitType] = useState("");
  const [product, setProduct] = useState("");
  const [outcome, setOutcome] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const cached = getCachedRecommendations();
    const list = cached?.recommendations || [];
    setRetailers(list);

    // Check if a retailer was pre-selected from Dashboard routing state
    const preSelected = location.state?.retailer;
    if (preSelected) {
      setSelectedRetailerId(preSelected.retailer_id);
    } else if (list.length > 0) {
      setSelectedRetailerId(list[0].retailer_id);
    }
  }, [location.state]);

  const isValid = selectedRetailerId && visitType && product && outcome;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);

    const selectedRetailer = retailers.find(r => r.retailer_id === selectedRetailerId) || { retailer_id: selectedRetailerId };

    const payload = {
      rep_id: authContext.user?.sub || authContext.user?.rep_id || "REP_0203",
      retailer_id: selectedRetailer.retailer_id,
      visit_type: visitType,
      product_discussed: product,
      outcome: outcome,
      submitted_at: new Date().toISOString()
    };

    if (navigator.onLine) {
      try {
        await postVisitLog(payload);
        navigate("/dashboard", { state: { toastMessage: "Visit logged ✓" } });
      } catch (err) {
        queueVisitLog(payload);
        navigate("/dashboard", { state: { toastMessage: "Saved offline — will sync when connected" } });
      }
    } else {
      queueVisitLog(payload);
      navigate("/dashboard", { state: { toastMessage: "Saved offline — will sync when connected" } });
    }
  };

  return (
    <div style={{ padding: "24px 16px", maxWidth: "600px", margin: "0 auto", fontFamily: "'Poppins', sans-serif" }}>
      <button
        onClick={() => navigate("/dashboard")}
        style={{
          background: "none",
          border: "none",
          color: "var(--color-primary, #1D9E75)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: "24px",
          fontSize: "14px"
        }}
      >
        <ArrowLeft size={16} /> Back to dashboard
      </button>

      <div
        className="shop-card"
        style={{
          background: "var(--bg-card, #1E2132)",
          border: "1px solid var(--border-subtle, rgba(255,255,255,0.07))",
          borderRadius: "16px",
          padding: "28px 24px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <Leaf size={24} color="#1D9E75" />
          <h2 style={{ fontSize: "20px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            Log Field Visit Outcome
          </h2>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* 1. Which Retailer */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>
              1. Which retailer?
            </label>
            <select
              value={selectedRetailerId}
              onChange={(e) => setSelectedRetailerId(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle, rgba(255,255,255,0.15))",
                background: "#161924",
                color: "var(--text-primary)",
                fontSize: "14px"
              }}
            >
              {retailers.length === 0 ? (
                <option value="">No shops loaded — check connection</option>
              ) : (
                retailers.map((r) => (
                  <option key={r.retailer_id} value={r.retailer_id}>
                    {r.retailer_name} ({r.tehsil})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 2. Visit Type */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>
              2. Visit type?
            </label>
            <div className="toggle-group">
              {[
                { label: "Retailer Meeting", value: "retailer_meeting" },
                { label: "Campaign Conducted", value: "campaign_conducted" },
                { label: "Grower Meeting", value: "grower_meeting" }
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setVisitType(t.value)}
                  className={`toggle-btn ${visitType === t.value ? "active" : ""}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Product Discussed */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>
              3. Product discussed?
            </label>
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle, rgba(255,255,255,0.15))",
                background: "#161924",
                color: "var(--text-primary)",
                fontSize: "14px"
              }}
            >
              <option value="" disabled>Select Syngenta product</option>
              {SYNGENTA_PRODUCTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Outcome */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>
              4. Outcome?
            </label>
            <div className="toggle-group">
              {[
                { label: "Order Placed", value: "Order placed" },
                { label: "Interested", value: "Interested" },
                { label: "Rejected", value: "Rejected" }
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setOutcome(t.value)}
                  className={`toggle-btn ${outcome === t.value ? "active" : ""}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isValid || submitting}
            style={{
              marginTop: "12px",
              padding: "14px",
              borderRadius: "30px",
              border: "none",
              background: isValid ? "var(--color-primary, #1D9E75)" : "rgba(255,255,255,0.05)",
              color: isValid ? "#fff" : "var(--text-muted)",
              fontWeight: 600,
              fontSize: "15px",
              cursor: isValid ? "pointer" : "not-allowed",
              transition: "all 0.2s"
            }}
          >
            {submitting ? "Submitting..." : "Submit Log"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PostVisitLog;
