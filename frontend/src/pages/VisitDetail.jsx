import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, TrendingUp, Zap, BarChart3, CheckCircle, AlertTriangle } from "lucide-react";
import { api, getCachedRecommendations, FALLBACK_NBA } from "../services/api";

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
      const found = cached.recommendations.find(item => item.retailer_id === retailer_id);
      if (found) setRec(found);
    }
    api.getNBA(retailer_id).then(setNba).catch(() => setNba(FALLBACK_NBA)).finally(() => setLoading(false));
  }, [retailer_id]);

  const advice = nba || FALLBACK_NBA;
  const shopName = rec?.retailer_name || retailer_id;
  const product = advice?.product || rec?.product_recommended || "Tilt 250 EC";
  const score = rec?.priority_score || 0;
  const pLabel = score > 0.8 ? "Urgent" : score > 0.6 ? "Important" : "Routine";
  const pClass = score > 0.8 ? "urgent" : score > 0.6 ? "important" : "routine";
  const points = [advice?.tip, advice?.promotion, ...(rec?.reasons || [])].filter(Boolean).slice(0, 4);

  if (loading && !rec) {
    return (
      <div className="page-container" style={{ display: "grid", placeItems: "center" }}>
        <div className="glass-card" style={{ padding: 24, color: "var(--text-secondary)" }}>
          <Zap size={20} className="ai-pulse" style={{ marginRight: 8 }} />Loading AI briefing...
        </div>
      </div>
    );
  }

  return (
    <div className="page-container page-enter" style={{ paddingBottom: 120 }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
        {/* Header */}
        <div className="glass-card-strong" style={{ position: "sticky", top: 76, zIndex: 80, padding: "14px 18px", marginBottom: 18, display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => navigate("/dashboard")} style={{ width: 42, height: 42, borderRadius: "50%", border: "1px solid var(--glass-border)", background: "var(--glass-bg)", color: "var(--text-primary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={20} />
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>Next Best Action</p>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{shopName}</h1>
          </div>
          <span className={`priority-pill ${pClass}`}>{Math.round(score * 100)}% · {pLabel}</span>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {/* Why This Visit */}
          <section className="glass-card" style={{ borderLeft: "3px solid var(--color-primary)" }}>
            <h2 style={{ margin: "0 0 14px", fontSize: 18, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-heading)", display: "flex", alignItems: "center", gap: 8 }}>
              <TrendingUp size={20} color="var(--color-primary)" /> Why AgroNav ranked this visit
            </h2>
            {(rec?.reasons || ["AI confidence signal", "Territory pattern match", "Seasonal timing"]).slice(0, 3).map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: "var(--text-primary)", marginBottom: 8 }}>
                <CheckCircle size={16} color="var(--color-primary)" /> {r}
              </div>
            ))}
          </section>

          {/* NBA */}
          <section className="glass-card-strong">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Next Best Action</h2>
              <Zap size={20} className="ai-pulse" color="var(--color-primary)" />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: 4 }}>Product to Pitch</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--font-heading)", marginBottom: 14 }}>{product}</div>
            <div style={{ borderLeft: "3px solid var(--glass-border)", paddingLeft: 14, fontStyle: "italic", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 16 }}>
              {advice?.pitch || "Position this product based on inventory and crop stage signals."}
            </div>
            <ol style={{ margin: 0, padding: "0 0 0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
              {(points.length ? points : ["Open with crop-stage risk.", "Anchor on replenishment timing.", "Close with margin offer."]).map((p, i) => (
                <li key={i} style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.55 }}>{p}</li>
              ))}
            </ol>
            {advice?.promotion && (
              <div style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 6, background: "var(--color-warning-dim)", borderRadius: 99, padding: "6px 14px", fontSize: 13, fontWeight: 600, color: "var(--color-warning)" }}>
                <AlertTriangle size={14} /> {advice.promotion}
              </div>
            )}
          </section>

          {/* Context */}
          <section className="glass-card">
            <h2 style={{ margin: "0 0 14px", fontSize: 18, fontWeight: 600, fontFamily: "var(--font-heading)", display: "flex", alignItems: "center", gap: 8 }}>
              <BarChart3 size={20} color="var(--text-secondary)" /> Current Situation
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Last visited", value: "7 days ago" },
                { label: "Stock level", value: "Low" },
                { label: "Last purchase", value: product },
                { label: "Revenue trend", value: score > 0.6 ? "↑ Rising" : "→ Stable" },
              ].map((item, i) => (
                <div key={i} style={{ padding: 12, background: "var(--glass-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, fontFamily: "var(--font-heading)" }}>{item.value}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Fixed bottom */}
        <div style={{ position: "fixed", left: "50%", bottom: 18, transform: "translateX(-50%)", width: "min(860px, calc(100% - 32px))", zIndex: 120, background: "var(--glass-bg-strong)", backdropFilter: "blur(20px)", border: "1px solid var(--glass-border-strong)", borderRadius: 28, padding: 14 }}>
          <button className="btn-primary" style={{ fontSize: 15, padding: "15px 22px" }} onClick={() => navigate("/log", { state: { retailer: rec } })}>
            Log Visit Outcome →
          </button>
        </div>
      </div>
    </div>
  );
}

export default VisitDetail;
