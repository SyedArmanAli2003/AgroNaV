import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MapPin, RefreshCw, AlertTriangle, WifiOff, CheckCircle, Zap, Package } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SkeletonCard } from "../components/ui/Skeleton";
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
  const [loading, setLoading] = useState(true);
  const [recalMsg, setRecalMsg] = useState("");
  const [toast, setToast] = useState("");
  const [banner, setBanner] = useState(null);

  const scoreColor = (score) => {
    if (score > 0.8) return "var(--color-urgent)";
    if (score > 0.6) return "var(--color-warning)";
    return "var(--color-primary)";
  };

  const priorityLabel = (score) => {
    if (score > 0.8) return "Urgent";
    if (score > 0.6) return "Important";
    return "Routine";
  };

  const priorityClass = (score) => {
    if (score > 0.8) return "urgent";
    if (score > 0.6) return "important";
    return "routine";
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  useEffect(() => {
    if (location.state?.toastMessage) {
      setToast(location.state.toastMessage);
      window.history.replaceState({}, document.title);
      setTimeout(() => setToast(""), 4000);
    }

    const loadDashboardData = async () => {
      const repId = authContext.user?.sub || authContext.user?.rep_id || "REP_0203";
      const todayStr = new Date().toISOString().split("T")[0];
      const cached = getCachedRecommendations();

      if (cached?.recommendations) {
        const cachedAt = new Date(cached.cached_at);
        const hoursAgo = (new Date() - cachedAt) / (1000 * 60 * 60);
        setRecommendations([...cached.recommendations].sort((a, b) => a.rank - b.rank));
        setLoading(false);
        setBanner({
          text: hoursAgo > 8
            ? "Plan may be outdated. Last synced more than 8 hours ago."
            : `Cached plan synced at ${cachedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          tone: hoursAgo > 8 ? "warning" : "info"
        });
      }

      try {
        const freshData = await getRecommendations(repId, todayStr);
        if (freshData?.recommendations) {
          const sortedFresh = [...freshData.recommendations].sort((a, b) => a.rank - b.rank);
          setRecommendations(sortedFresh);
          cacheRecommendations(freshData);
          setBanner(null);
        }
      } catch (err) {
        if (err.message?.includes("Unauthorized") || err.message?.includes("401")) {
          authContext.logout();
          navigate("/signin");
          return;
        }
        if (!cached?.recommendations) {
          setBanner({
            text: "Offline preview. Connect to internet to load your live route.",
            tone: "offline"
          });
        }
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [authContext, navigate, location.state]);

  const handleRecalibrate = async () => {
    setRecalMsg("Syncing...");
    try {
      await api.recalibrate();
      const repId = authContext.user?.sub || authContext.user?.rep_id || "REP_0203";
      const todayStr = new Date().toISOString().split("T")[0];
      const freshData = await getRecommendations(repId, todayStr);
      if (freshData?.recommendations) {
        setRecommendations(freshData.recommendations.sort((a, b) => a.rank - b.rank));
        cacheRecommendations(freshData);
      }
      setRecalMsg("Rankings updated");
    } catch {
      setRecalMsg("Could not recalibrate");
    }
    setTimeout(() => setRecalMsg(""), 3000);
  };

  const displayRecommendations = recommendations.length ? recommendations : (loading ? [] : FALLBACK_SHOPS);
  const alertCount = displayRecommendations.filter(r => (r.priority_score || 0) > 0.6).length;

  return (
    <div className="page-container page-enter" style={{
      background: `radial-gradient(ellipse at 85% 5%, rgba(29,158,117,0.08) 0%, transparent 50%), var(--bg-base)`,
      padding: "0 0 80px 0",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              {dateStr}
            </p>
            <h1 style={{ margin: "4px 0 0", fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              Today's Priority List
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
              Ranked by conversion probability · Tap to see full brief
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {recalMsg && <span style={{ color: "var(--color-primary)", fontSize: 13, fontWeight: 600 }}>{recalMsg}</span>}
            <button className="btn-primary" style={{ width: "auto", padding: "10px 20px", fontSize: 13 }} onClick={handleRecalibrate}>
              <RefreshCw size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
              Recalibrate
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
          {[
            { icon: <MapPin size={16} />, label: "Visits Planned", value: displayRecommendations.length },
            { icon: <AlertTriangle size={16} color={alertCount > 0 ? "var(--color-warning)" : undefined} />, label: "Alerts", value: alertCount },
            { icon: <RefreshCw size={16} />, label: banner ? "Cached" : "Synced", value: banner ? "Offline" : "Live" },
          ].map((s, i) => (
            <div key={i} className="glass-card" style={{ flex: "1 0 120px", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--glass-bg-strong)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-heading)", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Offline banner */}
        {banner && (
          <div className="glass-card" style={{
            marginBottom: 16, padding: "12px 16px",
            display: "flex", alignItems: "center", gap: 10,
            borderLeft: `3px solid ${banner.tone === "warning" ? "var(--color-warning)" : banner.tone === "offline" ? "var(--color-warning)" : "var(--color-primary)"}`,
          }}>
            <WifiOff size={16} color="var(--color-warning)" />
            <span style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
              {banner.text}
            </span>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && displayRecommendations.length === 0 && (
          Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />)
        )}

        {/* Recommendation cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {displayRecommendations.map((rec, idx) => {
            const score = rec.priority_score || 0;
            const label = priorityLabel(score);
            const pillClass = priorityClass(score);
            const color = scoreColor(score);
            const nba = rec.nba;

            return (
              <article
                key={rec.retailer_id}
                className="glass-card"
                onClick={() => navigate(`/visit/${rec.retailer_id}`, { state: { retailer: rec } })}
                style={{ cursor: "pointer", transition: "transform 0.18s, box-shadow 0.18s", padding: "20px" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(29,158,117,0.18)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
              >
                {/* Row 1: Rank + Name + Tehsil */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: "var(--color-primary-dim)", border: "1px solid var(--color-primary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: "var(--color-primary)", flexShrink: 0, marginTop: 2
                    }}>
                      #{rec.rank || idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)", fontFamily: "var(--font-heading)", lineHeight: 1.3 }}>
                        {rec.retailer_name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                        <MapPin size={12} />
                        {rec.tehsil || rec.district || "Field territory"}
                      </div>
                    </div>
                  </div>
                  <span className={`priority-pill ${pillClass}`}>
                    {Math.round(score * 100)}% · {label}
                  </span>
                </div>

                {/* Row 2: Priority bar */}
                <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden", margin: "10px 0" }}>
                  <div style={{ height: "100%", width: `${Math.max(score * 100, 8)}%`, background: color, borderRadius: 99, boxShadow: `0 0 12px ${color}`, transition: "width 0.5s ease" }} />
                </div>

                {/* Row 3: Product chip */}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--color-primary-dim)", borderRadius: 99, padding: "5px 12px", marginBottom: 10, fontSize: 13, fontWeight: 500 }}>
                  <Package size={14} color="var(--color-primary)" />
                  <span style={{ color: "var(--text-primary)" }}>{rec.product_recommended || "Pending"}</span>
                </div>

                {/* Row 4: Reasons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                  {(rec.reasons || []).slice(0, 3).map((r, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                      <CheckCircle size={13} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                      {r}
                    </div>
                  ))}
                </div>

                {/* Row 5: NBA preview */}
                {nba?.one_line_summary && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", marginBottom: 12, fontFamily: "var(--font-body)" }}>
                    <Zap size={13} color="var(--color-primary)" className="ai-pulse" style={{ flexShrink: 0 }} />
                    {nba.one_line_summary}
                  </div>
                )}

                {/* Row 6: Action buttons */}
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/visit/${rec.retailer_id}`, { state: { retailer: rec } }); }}
                    style={{
                      flex: 1, padding: "10px", borderRadius: 99,
                      border: "1px solid var(--glass-border)", background: "transparent",
                      color: "var(--color-primary)", fontWeight: 600, fontSize: 13,
                      cursor: "pointer", fontFamily: "var(--font-body)", transition: "background 0.15s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--glass-bg)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    View Full Brief →
                  </button>
                  <button
                    className="btn-primary"
                    style={{ flex: 1, padding: "10px", fontSize: 13 }}
                    onClick={(e) => { e.stopPropagation(); navigate("/log", { state: { retailer: rec } }); }}
                  >
                    Mark Visited
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", bottom: 82, left: "50%", transform: "translateX(-50%)",
            background: "var(--glass-bg-strong)", backdropFilter: "blur(12px)",
            borderRadius: 99, padding: "12px 24px",
            color: "var(--color-primary)", fontSize: 14, zIndex: 9999,
            animation: "toastIn 0.25s ease forwards", whiteSpace: "nowrap",
            border: "1px solid var(--color-primary-dim)",
            fontFamily: "var(--font-body)"
          }}>
            <CheckCircle size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
