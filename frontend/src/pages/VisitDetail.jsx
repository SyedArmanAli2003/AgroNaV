import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Boxes, PackageCheck, Sparkles } from "lucide-react";
import { api, getCachedRecommendations, FALLBACK_NBA } from "../services/api";
import "../css/app.css";

function VisitDetail() {
  const { retailer_id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [rec, setRec] = useState(location.state?.retailer || null);
  const [nba, setNba] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = getCachedRecommendations();
    if (cached?.recommendations) {
      const found = cached.recommendations.find((item) => item.retailer_id === retailer_id);
      if (found) setRec(found);
    }

    api.getNBA(retailer_id)
      .then(setNba)
      .catch(() => setNba(FALLBACK_NBA))
      .finally(() => setLoading(false));
  }, [retailer_id]);

  const advice = nba || FALLBACK_NBA;
  const shopName = rec?.retailer_name || retailer_id;
  const product = advice?.product || rec?.product_recommended || "Tilt 250 EC";
  const talkingPoints = [
    advice?.tip,
    advice?.promotion,
    ...(rec?.reasons || [])
  ].filter(Boolean).slice(0, 4);

  if (loading && !rec) {
    return (
      <div className="liquid-app-page" style={{ display: "grid", placeItems: "center" }}>
        <div className="liquid-panel" style={{ padding: "24px 28px", color: "var(--text-secondary)" }}>
          Loading AI advice...
        </div>
      </div>
    );
  }

  return (
    <div className="liquid-app-page detail-page page-enter">
      <div className="liquid-app-shell" style={{ maxWidth: 900 }}>
        <header className="liquid-header">
          <button className="liquid-icon-button" onClick={() => navigate("/dashboard")} aria-label="Back to dashboard">
            <ArrowLeft size={20} />
          </button>
          <div style={{ position: "relative", zIndex: 1 }}>
            <p className="liquid-page-subtitle" style={{ marginTop: 0 }}>Next Best Action</p>
            <h1 style={{ color: "var(--text-primary)", fontSize: 22, fontWeight: 600, margin: 0 }}>{shopName}</h1>
          </div>
          <Sparkles className="sparkle-pulse" size={20} style={{ marginLeft: "auto", position: "relative", zIndex: 1 }} />
        </header>

        <main className="detail-card-grid">
          <section className="liquid-detail-card">
            <h2 className="detail-card-title">Context</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, position: "relative", zIndex: 1 }}>
              <div className="recommendation-product" style={{ background: "rgba(255,255,255,0.045)", boxShadow: "none", borderColor: "rgba(255,255,255,0.10)" }}>
                <Boxes size={20} color="#1D9E75" />
                <div style={{ color: "var(--text-primary)", fontWeight: 700, marginTop: 12 }}>Inventory</div>
                <div style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>
                  {rec?.product_recommended || product} stock is flagged for replenishment before the next demand spike.
                </div>
              </div>
              <div className="recommendation-product" style={{ background: "rgba(239,68,68,0.10)", boxShadow: "0 0 28px rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.22)" }}>
                <AlertTriangle size={20} color="#ef4444" />
                <div style={{ color: "var(--text-primary)", fontWeight: 700, marginTop: 12 }}>Pest Alerts</div>
                <div style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>
                  {advice?.why || "District-level pest pressure is elevated, so the visit should focus on preventive crop protection."}
                </div>
              </div>
            </div>
          </section>

          <section className="liquid-detail-card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, position: "relative", zIndex: 1 }}>
              <h2 className="detail-card-title" style={{ margin: 0 }}>Recommendation</h2>
              <Sparkles className="sparkle-pulse" size={18} />
            </div>
            <div className="recommendation-product" style={{ position: "relative", zIndex: 1 }}>
              <PackageCheck size={24} color="#1D9E75" />
              <div style={{ color: "#1D9E75", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 14 }}>
                Product to pitch
              </div>
              <div style={{ color: "var(--text-primary)", fontSize: 28, fontWeight: 700, lineHeight: 1.1, marginTop: 6 }}>
                {product}
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7, margin: "14px 0 0" }}>
                {advice?.pitch || "Position this as the highest-likelihood product for the shop based on inventory, crop stage, and local alert signals."}
              </p>
            </div>
          </section>

          <section className="liquid-detail-card">
            <h2 className="detail-card-title">Talking Points</h2>
            <ul className="talking-list" style={{ position: "relative", zIndex: 1 }}>
              {(talkingPoints.length ? talkingPoints : [
                "Open with the current crop-stage risk in this territory.",
                "Anchor the pitch on faster replenishment and preventive spray timing.",
                "Close with today's margin or bundle offer if the shop is ready."
              ]).map((point, index) => (
                <li key={`${point}-${index}`}>{point}</li>
              ))}
            </ul>
          </section>
        </main>

        <div className="liquid-action-bar">
          <button
            className="liquid-pill-button"
            onClick={() => navigate("/log", { state: { retailer: rec } })}
          >
            Log Outcome
          </button>
        </div>
      </div>
    </div>
  );
}

export default VisitDetail;
