import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MapPin, RefreshCw, AlertTriangle, WifiOff, CheckCircle, Zap, Package, CalendarDays, Clock, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SkeletonCard } from "../components/ui/Skeleton";
import WelcomeTour from "../components/onboarding/WelcomeTour";
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

  const [dashTab, setDashTab] = useState("today");
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalMsg, setRecalMsg] = useState("");
  const [recalLoading, setRecalLoading] = useState(false);
  const [explainPanel, setExplainPanel] = useState(null);
  const [morningBrief, setMorningBrief] = useState(null);
  const [morningLoading, setMorningLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [banner, setBanner] = useState(null);

  // My Week state
  const [weekPlan, setWeekPlan] = useState(null);
  const [weekPlanLoading, setWeekPlanLoading] = useState(false);
  const [weekPlanError, setWeekPlanError] = useState(null);

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
    setRecalLoading(true);
    setRecalMsg("Recalibrating...");
    setExplainPanel(null);
    try {
      const repId = authContext.user?.sub || authContext.user?.rep_id || "REP_0203";
      // Call the explain endpoint — gets score update + 3-line manager narrative
      const result = await api.recalibrateWithExplain(repId, 30);

      // Show explanation panel
      if (result?.explanation) {
        setExplainPanel(result.explanation);
      }

      // Refresh recommendations list
      const todayStr = new Date().toISOString().split("T")[0];
      const freshData = await getRecommendations(repId, todayStr);
      if (freshData?.recommendations) {
        setRecommendations(freshData.recommendations.sort((a, b) => a.rank - b.rank));
        cacheRecommendations(freshData);
      }

      const movedUp   = result?.moved_up?.length   || 0;
      const movedDown = result?.moved_down?.length  || 0;
      setRecalMsg(`Updated • ${movedUp} up, ${movedDown} down`);
    } catch {
      setRecalMsg("Could not recalibrate");
    } finally {
      setRecalLoading(false);
      setTimeout(() => setRecalMsg(""), 5000);
    }
  };

  // Load weekly plan when "My Week" tab is first opened
  useEffect(() => {
    if (dashTab !== "week" || weekPlan !== null || weekPlanLoading) return;
    const repId = authContext.user?.sub || authContext.user?.rep_id || "REP_0203";
    setWeekPlanLoading(true);
    setWeekPlanError(null);
    api.getRepWeeklyPlan(repId)
      .then(data => setWeekPlan(data?.plan || false))
      .catch(() => setWeekPlanError("Could not load weekly plan"))
      .finally(() => setWeekPlanLoading(false));
  }, [dashTab]); // eslint-disable-line

  const displayRecommendations = recommendations.length ? recommendations : (loading ? [] : FALLBACK_SHOPS);
  const alertCount = displayRecommendations.filter(r => (r.priority_score || 0) > 0.6).length;

  return (
    <div className="page-container page-enter" style={{
      background: `radial-gradient(ellipse at 85% 5%, rgba(29,158,117,0.08) 0%, transparent 50%), var(--bg-base)`,
      padding: "0 0 80px 0",
    }}>
      <WelcomeTour userRole={authContext.user?.role || "rep"} />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>

        {/* Tab bar: Today / My Week / Weekly Priority */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--glass-border)" }}>
          {[["today", "Today's List", null], ["week", "My Week", CalendarDays], ["priority", "Weekly Priority", Zap]].map(([key, label, Icon]) => (
            <button key={key} onClick={() => setDashTab(key)} style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "10px 18px", fontSize: 14, fontWeight: 600,
              fontFamily: "var(--font-body)",
              color: dashTab === key ? "var(--color-primary)" : "var(--text-muted)",
              borderBottom: dashTab === key ? "2px solid var(--color-primary)" : "2px solid transparent",
              display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s"
            }}>
              {Icon && <Icon size={14} />}
              {label}
            </button>
          ))}
        </div>

        {/* ── TODAY TAB ── */}
        {dashTab === "today" && (<>

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
            <button
              id="morning-brief-btn"
              className="btn-primary"
              style={{ width: "auto", padding: "10px 18px", fontSize: 12, opacity: morningLoading ? 0.7 : 1,
                background: "linear-gradient(135deg, var(--color-primary), #0e7a55)" }}
              onClick={async () => {
                setMorningLoading(true);
                setMorningBrief(null);
                try {
                  const repId = authContext.user?.sub || authContext.user?.rep_id || "REP_0203";
                  const district = authContext.user?.district || localStorage.getItem("agronav_district");
                  // Request GPS if available
                  let repLat, repLng;
                  try {
                    const pos = await new Promise((res, rej) =>
                      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
                    );
                    repLat = pos.coords.latitude;
                    repLng = pos.coords.longitude;
                  } catch { /* use district centroid */ }
                  const data = await api.getMorningBrief(repId, { repLat, repLng, district, topN: 6 });
                  if (data?.briefing) setMorningBrief(data);
                } catch (e) {
                  console.error("[morning-brief]", e);
                } finally {
                  setMorningLoading(false);
                }
              }}
              disabled={morningLoading}
            >
              <MapPin size={13} style={{ marginRight: 5, verticalAlign: "-1px" }} />
              {morningLoading ? "Planning route..." : "Today's Route"}
            </button>
            <button
              id="recalibrate-btn"
              className="btn-primary"
              style={{ width: "auto", padding: "10px 20px", fontSize: 13, opacity: recalLoading ? 0.7 : 1 }}
              onClick={handleRecalibrate}
              disabled={recalLoading}
            >
              <RefreshCw size={14} style={{ marginRight: 6, verticalAlign: "-2px", animation: recalLoading ? "spin 1s linear infinite" : "none" }} />
              {recalLoading ? "Updating..." : "Recalibrate"}
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

        {/* Morning Route Briefing Panel */}
        {morningBrief && (
          <div
            id="morning-briefing-panel"
            className="glass-card"
            style={{
              marginBottom: 16,
              borderLeft: "3px solid var(--color-primary)",
              padding: "18px 20px",
              animation: "toastIn 0.3s ease forwards",
            }}
          >
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <MapPin size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />
                Morning Route Brief
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {morningBrief.weather?.weather_risk && (
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99,
                    background: morningBrief.weather.weather_risk.includes("fungal") || morningBrief.weather.weather_risk.includes("heat")
                      ? "rgba(245,158,11,0.15)" : "var(--color-primary-dim)",
                    color: morningBrief.weather.weather_risk.includes("fungal") || morningBrief.weather.weather_risk.includes("heat")
                      ? "var(--color-warning)" : "var(--color-primary)",
                    border: "1px solid currentColor",
                  }}>
                    ☁ {morningBrief.weather.rainfall_mm}mm · {morningBrief.weather.temp_c}°C
                  </span>
                )}
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>via {morningBrief.briefing?.source}</span>
              </div>
            </div>

            {/* 3-sentence briefing */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {[morningBrief.briefing?.line1, morningBrief.briefing?.line2, morningBrief.briefing?.line3].map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{
                    flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
                    background: "var(--color-primary-dim)", border: "1px solid var(--color-primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: "var(--color-primary)", marginTop: 1
                  }}>{i + 1}</span>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, fontFamily: "var(--font-body)" }}>
                    {line}
                  </p>
                </div>
              ))}
            </div>

            {/* Route stats strip */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              {[
                { label: "Stops",    value: morningBrief.route?.outlet_count },
                { label: "Distance", value: `${morningBrief.route?.total_km}km` },
                { label: "Drive",    value: `${morningBrief.route?.total_minutes}min` },
                { label: "Source",   value: morningBrief.route?.route_source === "google-routes" ? "Google Routes ✓" : "Priority sort" },
              ].map((s, i) => (
                <div key={i} style={{
                  flex: "1 0 100px", padding: "8px 12px", borderRadius: 8,
                  background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Ordered stop list */}
            {morningBrief.route?.ordered_outlet_list && (
              <div style={{
                background: "var(--glass-bg)", borderRadius: 8,
                padding: "10px 14px", fontFamily: "monospace",
                fontSize: 11, color: "var(--text-muted)", lineHeight: 1.7,
                whiteSpace: "pre-wrap", marginBottom: 10,
                border: "1px solid var(--glass-border)",
              }}>
                {morningBrief.route.ordered_outlet_list}
              </div>
            )}

            {morningBrief.top_alert && morningBrief.top_alert !== "No alerts today" && (
              <div style={{ fontSize: 12, color: "var(--color-warning)", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <AlertTriangle size={12} /> {morningBrief.top_alert}
              </div>
            )}

            <button
              onClick={() => setMorningBrief(null)}
              style={{ background: "transparent", border: "none", fontSize: 11, color: "var(--text-muted)", cursor: "pointer", padding: 0 }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Recalibration explanation panel */}
        {explainPanel && (
          <div
            id="recalibration-explanation"
            className="glass-card"
            style={{
              marginBottom: 16,
              borderLeft: "3px solid var(--color-primary)",
              padding: "16px 20px",
              animation: "toastIn 0.3s ease forwards",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <Zap size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />
                AI Recalibration Brief
              </span>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>via {explainPanel.source}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[explainPanel.line1, explainPanel.line2, explainPanel.line3].map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{
                    flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
                    background: "var(--color-primary-dim)", border: "1px solid var(--color-primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: "var(--color-primary)", marginTop: 1
                  }}>{i + 1}</span>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, fontFamily: "var(--font-body)" }}>
                    {line}
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setExplainPanel(null)}
              style={{ marginTop: 12, background: "transparent", border: "none", fontSize: 11, color: "var(--text-muted)", cursor: "pointer", padding: 0 }}
            >
              Dismiss
            </button>
          </div>
        )}

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

        </>)}

        {/* ── MY WEEK TAB ── */}
        {dashTab === "week" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ margin: "0 0 4px", fontSize: "clamp(20px,4vw,28px)", fontWeight: 600, fontFamily: "var(--font-heading)" }}>
                My Week
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
                Your manager-approved visit plan for this week · Tap any outlet to see the full brief
              </p>
            </div>

            {weekPlanLoading && (
              <div className="glass-card" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
                <RefreshCw size={28} style={{ marginBottom: 12, opacity: 0.4, animation: "spin 1s linear infinite" }} />
                <div>Loading your weekly plan...</div>
              </div>
            )}

            {weekPlanError && (
              <div className="glass-card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", borderLeft: "3px solid var(--color-warning)" }}>
                <AlertTriangle size={28} style={{ marginBottom: 12 }} color="var(--color-warning)" />
                <div>{weekPlanError}</div>
              </div>
            )}

            {!weekPlanLoading && !weekPlanError && weekPlan === false && (
              <div className="glass-card" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
                <CalendarDays size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                <div style={{ fontWeight: 600, marginBottom: 8 }}>No approved plan for this week yet</div>
                <div style={{ fontSize: 13 }}>Ask your manager to generate and approve a plan. It will appear here once approved.</div>
              </div>
            )}

            {!weekPlanLoading && weekPlan && (() => {
              const todayDay = weekPlan.today_day;
              const days = ["monday","tuesday","wednesday","thursday","friday"];
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Plan meta */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-primary)" }}>{weekPlan.week_label}</span>
                    <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 99, background: "var(--color-primary-dim)", color: "var(--color-primary)", fontWeight: 700, textTransform: "uppercase" }}>{weekPlan.status}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{weekPlan.week_start_date} → {weekPlan.week_end_date}</span>
                  </div>

                  {days.map(day => {
                    const outlets = weekPlan.daily_split?.[day] || [];
                    const isToday = day === todayDay;
                    return (
                      <div key={day} className={isToday ? "glass-card-strong" : "glass-card"} style={{
                        borderLeft: isToday ? "3px solid var(--color-primary)" : undefined,
                        padding: "16px 20px",
                      }}>
                        {/* Day header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: outlets.length ? 14 : 0 }}>
                          <Clock size={14} color={isToday ? "var(--color-primary)" : "var(--text-muted)"} />
                          <span style={{ fontWeight: 700, fontSize: 14, textTransform: "capitalize", color: isToday ? "var(--color-primary)" : "var(--text-primary)" }}>
                            {day}
                          </span>
                          {isToday && (
                            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "var(--color-primary-dim)", color: "var(--color-primary)", fontWeight: 700 }}>
                              TODAY
                            </span>
                          )}
                          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
                            {outlets.length} {outlets.length === 1 ? "visit" : "visits"}
                          </span>
                        </div>

                        {outlets.length === 0 ? (
                          <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>No visits planned</div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {outlets.map((o, idx) => (
                              <div
                                key={o.id || idx}
                                style={{
                                  display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
                                  padding: "12px 14px", borderRadius: 10,
                                  background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                                  cursor: "pointer",
                                }}
                                onClick={() => navigate(`/visit/${o.id}`, { state: { retailer: { retailer_id: o.id, retailer_name: o.name, district: o.district } } })}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "var(--font-heading)", color: "var(--text-primary)", lineHeight: 1.3 }}>
                                    {o.name || `Outlet #${o.id}`}
                                  </div>
                                  {o.district && (
                                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                                      <MapPin size={10} /> {o.district}
                                    </div>
                                  )}
                                  {o.reasons?.[0] && (
                                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 5, lineHeight: 1.4 }}>
                                      <CheckCircle size={11} color="var(--color-primary)" style={{ verticalAlign: "-1px", marginRight: 4 }} />
                                      {o.reasons[0]}
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                                  <span style={{
                                    fontSize: 11, padding: "2px 9px", borderRadius: 99, fontWeight: 700,
                                    background: o.label === "HIGH" ? "rgba(239,68,68,0.1)" : o.label === "MEDIUM" ? "rgba(245,158,11,0.1)" : "var(--color-primary-dim)",
                                    color: o.label === "HIGH" ? "#ef4444" : o.label === "MEDIUM" ? "var(--color-warning)" : "var(--color-primary)",
                                  }}>{o.label}</span>
                                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{o.score}/100</span>
                                  {isToday && (
                                    <button
                                      className="btn-primary"
                                      style={{ fontSize: 11, padding: "5px 10px" }}
                                      onClick={e => { e.stopPropagation(); navigate("/log", { state: { retailer: { retailer_id: o.id, retailer_name: o.name } } }); }}
                                    >
                                      Mark Visited
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── WEEKLY PRIORITY TAB ── */}
        {dashTab === "priority" && (
          <div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{dateStr}</p>
                <h1 style={{ margin: "4px 0 0", fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                  Weekly Priority List
                </h1>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                  AI-ranked outlets across your full 7-day plan
                </p>
              </div>
              <span style={{ padding: "6px 14px", borderRadius: 99, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.4)", color: "#f59e0b", fontSize: 12, fontWeight: 700 }}>
                Under Development
              </span>
            </div>

            {/* Coming soon cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 24 }}>
              {[
                { icon: "📊", title: "AI-Ranked Weekly Outlets", desc: "CatBoost model will score all territory outlets across the 7-day window, surfacing the highest-conversion visits for each day." },
                { icon: "🌾", title: "Crop Stage Alignment", desc: "Visit recommendations will align with active kharif/rabi crop stages and pest alert windows from live NDVI + IMD weather data." },
                { icon: "🗺️", title: "Territory Heatmap", desc: "Visual 7-day coverage map showing which tehsils are over- or under-visited based on historical conversion data." },
                { icon: "⚡", title: "Real-Time Rebalancing", desc: "Mark a visit done and the weekly list auto-rebalances — pushing urgent stockout outlets to earlier days." },
              ].map(card => (
                <div key={card.title} className="glass-card" style={{ padding: 20, opacity: 0.75 }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{card.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6, fontFamily: "var(--font-heading)" }}>{card.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{card.desc}</div>
                </div>
              ))}
            </div>

            {/* Dataset preview note */}
            <div className="glass-card" style={{ padding: 18, borderLeft: "3px solid rgba(245,158,11,0.6)", background: "rgba(245,158,11,0.03)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>Connected to 4,000+ Retailer Dataset</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.65 }}>
                This feature will draw on the full Syngenta production dataset (23,862 visit logs, CatBoost v1 + XGBoost ranker)
                to generate 7-day prioritized outlet sequences. Daily views are live now — weekly optimization is coming in the next release.
              </div>
            </div>
          </div>
        )}


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
