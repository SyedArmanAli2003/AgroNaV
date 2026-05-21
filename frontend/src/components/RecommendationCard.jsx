import React from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Package, CheckCircle } from "lucide-react";
import "../css/app.css";

const scoreColor = (score) => {
  if (score > 0.80) return "#ef4444";
  if (score > 0.60) return "#f97316";
  return "#22c55e";
};

/**
 * RecommendationCard — extracted from Dashboard for reusability.
 *
 * Props:
 *   rec          — recommendation object from API
 *   rank         — display rank number (1-based)
 *   onMarkVisited — callback(rec)
 */
function RecommendationCard({ rec, rank, onMarkVisited }) {
  const navigate = useNavigate();
  const { retailer_id, retailer_name, tehsil, product_recommended, priority_score, reasons } = rec;
  const color = scoreColor(priority_score);

  return (
    <div
      className="shop-card"
      onClick={() => navigate(`/visit/${retailer_id}`)}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          {/* Rank badge */}
          {rank && (
            <div className="rank-badge" style={{ marginTop: 2 }}>#{rank}</div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", lineHeight: 1.3 }}>
              {retailer_name}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              <MapPin size={12} style={{ marginRight: 2 }} /> {tehsil}
            </div>
          </div>
        </div>

        {/* Score badge */}
        <div style={{
          background: color, color: "#fff",
          fontWeight: 700, fontSize: 13,
          borderRadius: "50%", width: 38, height: 38,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, boxShadow: `0 2px 8px ${color}55`
        }}>
          {Math.round(priority_score * 100)}
        </div>
      </div>

      {/* Priority bar */}
      <div className="priority-bar">
        <div className="priority-fill" style={{ width: `${priority_score * 100}%`, background: color }} />
      </div>

      {/* Product chip */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "rgba(29,158,117,0.12)", borderRadius: 99,
        padding: "5px 12px", marginBottom: 10, fontSize: 13, fontWeight: 500
      }}>
        <Package size={14} color="var(--color-primary, #1D9E75)" />
        <span style={{ color: "var(--text-primary)" }}>{product_recommended}</span>
      </div>

      {/* SHAP reasons */}
      <ul className="reasons-list" style={{ marginBottom: 12 }}>
        {(reasons || []).slice(0, 3).map((r, i) => (
          <li key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle size={13} color="var(--color-primary, #1D9E75)" style={{ flexShrink: 0 }} />
            <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{r}</span>
          </li>
        ))}
      </ul>

      {/* Mark as visited CTA */}
      <button
        className="hover-scale"
        onClick={(e) => {
          e.stopPropagation();
          onMarkVisited && onMarkVisited(rec);
          navigate("/log", { state: { retailer: rec } });
        }}
        style={{
          width: "100%", padding: "12px", borderRadius: 99,
          border: "none", background: "#1D9E75", color: "#fff",
          fontWeight: 600, fontSize: 13, cursor: "pointer",
          boxShadow: "0 4px 12px rgba(29,158,117,0.25)",
          fontFamily: "inherit", transition: "opacity 0.15s ease"
        }}
      >
        Mark as Visited →
      </button>
    </div>
  );
}

export default RecommendationCard;
