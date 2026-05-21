import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MapPin, RefreshCw, Route, Store, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  api,
  getRecommendations,
  cacheRecommendations,
  getCachedRecommendations
} from "../services/api";

const FALLBACK_SHOPS = [
  {
    retailer_id: "DEMO_101",
    retailer_name: "Sri Lakshmi Agro Traders",
    tehsil: "Nalgonda",
    product_recommended: "Tilt 250 EC",
    priority_score: 0.91,
    reasons: ["Stock running low", "Active pest alert nearby", "High conversion likelihood"]
  },
  {
    retailer_id: "DEMO_102",
    retailer_name: "Kisan Crop Care",
    tehsil: "Miryalaguda",
    product_recommended: "Amistar Top",
    priority_score: 0.72,
    reasons: ["Strong demand signal", "Rice crop stage aligned"]
  },
  {
    retailer_id: "DEMO_103",
    retailer_name: "Green Field Seeds",
    tehsil: "Devarakonda",
    product_recommended: "Actara",
    priority_score: 0.48,
    reasons: ["Routine follow-up", "Good visit history"]
  }
];

function Dashboard() {
  const authContext = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [recommendations, setRecommendations] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recalMsg, setRecalMsg] = useState("");
  const [toast, setToast] = useState("");
  const [banner, setBanner] = useState(null);

  const scoreColor = (score) => {
    if (score > 0.8) return "#ef4444";
    if (score > 0.6) return "#f97316";
    return "#22c55e";
  };

  const priorityLabel = (score) => {
    if (score > 0.8) return "High";
    if (score > 0.6) return "Medium";
    return "Low";
  };

  useEffect(() => {
    if (location.state?.toastMessage) {
      setToast(location.state.toastMessage);
      window.history.replaceState({}, document.title);
      setTimeout(() => setToast(""), 4000);
    }

    const cachedStats = localStorage.getItem("agronav_weekly_stats");
    if (cachedStats) {
      try {
        setStats(JSON.parse(cachedStats));
      } catch {}
    }

    const loadDashboardData = async () => {
      const repId = authContext.user?.sub || authContext.user?.rep_id || "REP_0203";
      const today = new Date().toISOString().split("T")[0];
      const cached = getCachedRecommendations();

      if (cached?.recommendations) {
        const cachedAt = new Date(cached.cached_at);
        const hoursAgo = (new Date() - cachedAt) / (1000 * 60 * 60);
        setRecommendations([...cached.recommendations].sort((a, b) => a.rank - b.rank));
        setBanner({
          text: hoursAgo > 8
            ? "Plan may be outdated. Last synced more than 8 hours ago."
            : `Cached plan synced at ${cachedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          tone: hoursAgo > 8 ? "high" : "low"
        });
      }

      setLoading(true);
      try {
        const freshData = await getRecommendations(repId, today);
        if (freshData?.recommendations) {
          const sortedFresh = [...freshData.recommendations].sort((a, b) => a.rank - b.rank);
          setRecommendations(sortedFresh);
          cacheRecommendations(freshData);
          setBanner(null);
        }

        const syncData = await api.morningSync(repId);
        if (syncData.weekly_stats) {
          setStats(syncData.weekly_stats);
          localStorage.setItem("agronav_weekly_stats", JSON.stringify(syncData.weekly_stats));
        }
      } catch (err) {
        if (err.message.includes("Unauthorized") || err.message.includes("Token") || err.message.includes("401")) {
          authContext.logout();
          navigate("/signin");
          return;
        }
        setBanner({
          text: cached?.recommendations
            ? "Offline mode. Displaying cached visit plan."
            : "Offline preview. Connect to internet to load your live route.",
          tone: "medium"
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [authContext, navigate, location.state]);

  const handleRecalibrate = async () => {
    setLoading(true);
    try {
      const data = await api.recalibrate();
      if (data.updated_outlets) {
        const repId = authContext.user?.sub || authContext.user?.rep_id || "REP_0203";
        const today = new Date().toISOString().split("T")[0];
        const freshData = await getRecommendations(repId, today);
        if (freshData?.recommendations) {
          setRecommendations(freshData.recommendations.sort((a, b) => a.rank - b.rank));
          cacheRecommendations(freshData);
        }
        setRecalMsg("Rankings updated");
        setTimeout(() => setRecalMsg(""), 3000);
      }
    } catch {
      setRecalMsg("Could not recalibrate");
      setTimeout(() => setRecalMsg(""), 3000);
    }
    setLoading(false);
  };

  const displayRecommendations = recommendations.length ? recommendations : FALLBACK_SHOPS;
  const lastStat = stats.length ? stats[stats.length - 1] : null;
  const completedToday = lastStat?.visits_completed || 0;
  const highPriority = displayRecommendations.filter((rec) => (rec.priority_score || 0) > 0.8).length;
  const quickStats = [
    { label: "Visits Today", value: completedToday || displayRecommendations.length },
    { label: "Pending", value: Math.max(displayRecommendations.length - completedToday, 0) },
    { label: "High Priority", value: highPriority }
  ];

  return (
    <div className="liquid-app-page page-enter">
      <div className="liquid-app-shell">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p className="liquid-page-subtitle" style={{ marginTop: 0 }}>Field sales route</p>
            <h1 className="liquid-page-title">Today&apos;s priority shops</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {recalMsg && <span style={{ color: "#1D9E75", fontSize: 13, fontWeight: 600 }}>{recalMsg}</span>}
            <button className="liquid-pill-button" onClick={handleRecalibrate} disabled={loading}>
              <RefreshCw size={15} style={{ marginRight: 8, verticalAlign: "-2px" }} />
              {loading ? "Syncing" : "Recalibrate"}
            </button>
          </div>
        </div>

        {banner && (
          <div
            className="liquid-panel"
            style={{
              marginTop: 16,
              padding: "12px 16px",
              color: banner.tone === "high" ? "#ef4444" : banner.tone === "medium" ? "#f97316" : "var(--text-secondary)"
            }}
          >
            {banner.text}
          </div>
        )}

        <div className="liquid-two-column">
          <section className="liquid-panel">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, position: "relative", zIndex: 1 }}>
              <div>
                <h2 style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 600, margin: 0 }}>Territory Map</h2>
                <p className="liquid-page-subtitle">Nalgonda field route and shop density</p>
              </div>
              <div className="icon-circle"><Route size={16} /></div>
            </div>

            <div className="liquid-map-placeholder">
              <div style={{ textAlign: "center" }}>
                <MapPin size={34} color="#1D9E75" style={{ filter: "drop-shadow(0 0 16px rgba(29,158,117,0.7))" }} />
                <div style={{ marginTop: 10, fontWeight: 600, color: "var(--text-primary)" }}>Map Placeholder</div>
                <div style={{ marginTop: 4 }}>Priority clusters ready for field routing</div>
              </div>
            </div>

            <div className="liquid-stats-grid">
              {quickStats.map((stat) => (
                <div className="liquid-stat-card" key={stat.label}>
                  <div className="liquid-stat-value">{stat.value}</div>
                  <div className="liquid-stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="liquid-list-panel" aria-label="Shop priority list">
            {displayRecommendations.map((rec) => {
              const score = rec.priority_score || 0;
              const label = priorityLabel(score);
              const color = scoreColor(score);

              return (
                <article
                  key={rec.retailer_id}
                  className="liquid-shop-card"
                  onClick={() => navigate(`/visit/${rec.retailer_id}`, { state: { retailer: rec } })}
                >
                  <div className="liquid-shop-top">
                    <div>
                      <h3 className="liquid-shop-name">{rec.retailer_name}</h3>
                      <div className="liquid-shop-meta">
                        <MapPin size={13} style={{ marginRight: 5, verticalAlign: "-2px" }} />
                        {rec.tehsil || rec.district || "Field territory"}
                      </div>
                    </div>
                    <span className={`priority-pill ${label.toLowerCase()}`}>
                      {label} {Math.round(score * 100)}
                    </span>
                  </div>

                  <div className="liquid-priority-bar">
                    <div
                      className="liquid-priority-fill"
                      style={{ width: `${Math.max(score * 100, 8)}%`, background: color, color }}
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, position: "relative", zIndex: 1 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600 }}>
                        <Store size={14} style={{ marginRight: 7, verticalAlign: "-2px" }} />
                        {rec.product_recommended || "Recommended product pending"}
                      </div>
                      <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 5 }}>
                        {(rec.reasons || []).slice(0, 2).join(" · ") || "AI-ranked visit opportunity"}
                      </div>
                    </div>
                    <button
                      className="liquid-pill-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate("/log", { state: { retailer: rec } });
                      }}
                    >
                      <CheckCircle2 size={15} style={{ marginRight: 8, verticalAlign: "-2px" }} />
                      Mark as Visited
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        </div>

        {toast && (
          <div className="toast-pill" style={{ bottom: 82, color: "#1D9E75", border: "1px solid rgba(29,158,117,0.35)" }}>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
