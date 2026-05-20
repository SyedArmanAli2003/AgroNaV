import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, getCachedRecommendations } from "../services/api";
import "../css/landing.css";
import "../css/app.css";

function VisitDetail() {
  const { retailer_id } = useParams();
  const navigate = useNavigate();

  const [rec, setRec] = useState(null);
  const [nba, setNba] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load recommendation from cache
    const cached = getCachedRecommendations();
    if (cached?.recommendations) {
      const found = cached.recommendations.find(r => r.retailer_id === retailer_id);
      if (found) setRec(found);
    }

    // Fetch NBA advice
    api.getNBA(retailer_id).then(data => {
      setNba(data);
    }).catch(() => {
      setNba(null);
    }).finally(() => setLoading(false));
  }, [retailer_id]);

  const scoreColor = (score) => {
    if (score > 0.80) return "#ef4444";
    if (score > 0.60) return "#f97316";
    return "#22c55e";
  };

  if (loading && !rec) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 32, animation: "spin 1.2s linear infinite", display: "inline-block" }}>🌿</span>
        <span style={{ color: "var(--text-muted)" }}>Loading visit details…</span>
      </div>
    );
  }

  return (
    <div className="app-page page-enter">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            background: "var(--glass-light-bg)", border: "1px solid var(--glass-border, rgba(255,255,255,0.10))",
            borderRadius: 99, padding: "8px 16px", color: "var(--text-primary)",
            cursor: "pointer", fontSize: 13, fontFamily: "inherit"
          }}
        >
          ← Back
        </button>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>
            {rec?.retailer_name || retailer_id}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            📍 {rec?.tehsil || rec?.district || "Field Visit"}
          </div>
        </div>
        {rec?.priority_score && (
          <div style={{
            marginLeft: "auto",
            background: scoreColor(rec.priority_score),
            color: "#fff", fontWeight: 700, fontSize: 14,
            borderRadius: 99, padding: "6px 16px"
          }}>
            {Math.round(rec.priority_score * 100)}%
          </div>
        )}
      </div>

      {/* SHAP Reasons — Why This Visit */}
      <div style={{ marginBottom: 24 }}>
        <p className="section-label">Why AgroNav prioritized this visit</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(rec?.reasons || ["High demand signal detected", "Stock running low", "Optimal crop stage for this product"]).map((reason, i) => (
            <div key={i} className="glass-card" style={{
              borderLeft: "3px solid #22c55e",
              padding: "14px 18px"
            }}>
              <span style={{ color: "#22c55e", marginRight: 8 }}>✓</span>
              <span style={{ color: "var(--text-primary)", fontSize: 14 }}>{reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Next Best Action */}
      <div style={{ marginBottom: 24 }}>
        <p className="section-label">What to do at this visit</p>
        <div className="glass-card">
          {/* Product to pitch */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(29,158,117,0.15)", borderRadius: 99,
            padding: "8px 18px", marginBottom: 16
          }}>
            <span>📦</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
              {nba?.product || rec?.product_recommended || "Tilt 250 EC"}
            </span>
          </div>

          {/* Agronomic pitch */}
          {nba?.pitch && (
            <div style={{
              background: "var(--glass-strong-bg)", borderRadius: 12, padding: 16,
              marginBottom: 14, fontStyle: "italic", color: "var(--text-secondary)", fontSize: 14
            }}>
              "{nba.pitch}"
            </div>
          )}

          {/* Talking points */}
          {nba?.tip && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, marginBottom: 8 }}>
                TALKING POINTS
              </div>
              <div style={{ color: "var(--text-primary)", fontSize: 14, lineHeight: 1.7 }}>
                {nba.tip}
              </div>
            </div>
          )}

          {/* Promotion */}
          {nba?.promotion && (
            <div style={{
              background: "rgba(249,115,22,0.12)",
              border: "1px solid rgba(249,115,22,0.25)",
              borderRadius: 10, padding: "10px 14px",
              color: "#f97316", fontSize: 13, fontWeight: 600
            }}>
              🏷️ {nba.promotion}
            </div>
          )}
        </div>
      </div>

      {/* Why summary */}
      {nba?.why && (
        <div style={{ marginBottom: 24 }}>
          <p className="section-label">The AI's reasoning</p>
          <div className="glass-card" style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6 }}>
            {nba.why}
          </div>
        </div>
      )}

      {/* Quick stats */}
      {rec && (
        <div style={{ marginBottom: 24 }}>
          <p className="section-label">Quick stats</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Priority score", value: `${Math.round((rec.priority_score || 0) * 100)}%` },
              { label: "Territory", value: rec.district || rec.tehsil || "—" },
              { label: "Product", value: rec.product_recommended || "—" },
              { label: "Rank", value: rec.rank ? `#${rec.rank}` : "—" }
            ].map(stat => (
              <div key={stat.label} className="glass-card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, textTransform: "uppercase" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        id="visit-log-cta"
        onClick={() => navigate("/log", { state: { retailer: rec } })}
        style={{
          width: "100%", padding: "16px", borderRadius: 99, border: "none",
          background: "linear-gradient(135deg, #1D9E75, #0F6E56)",
          color: "#fff", fontWeight: 700, fontSize: 15,
          cursor: "pointer", boxShadow: "0 4px 20px rgba(29,158,117,0.35)",
          fontFamily: "inherit"
        }}
      >
        Log This Visit →
      </button>
    </div>
  );
}

export default VisitDetail;
