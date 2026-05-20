import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import StatsRow from "../components/StatsRow";
import MapView from "../components/MapView";
import { useAuth } from "../context/AuthContext";
import { 
  api, 
  getRecommendations, 
  cacheRecommendations, 
  getCachedRecommendations 
} from "../services/api";

function Dashboard() {
  const authContext = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [recommendations, setRecommendations] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recalMsg, setRecalMsg] = useState("");
  const [toast, setToast] = useState("");

  // Banners state
  const [bannerText, setBannerText] = useState("");
  const [bannerBg, setBannerBg] = useState("");
  const [bannerBorder, setBannerBorder] = useState("");
  const [bannerColor, setBannerColor] = useState("");

  const scoreColor = (score) => {
    if (score > 0.80) return "#ef4444"; // red — urgent
    if (score > 0.60) return "#f97316"; // orange — important
    return "#22c55e";                    // green — routine
  };

  const mapRecommendationsToOutlets = (recs) => {
    return recs.map(r => {
      let label = "LOW";
      if (r.priority_score > 0.80) label = "HIGH";
      else if (r.priority_score > 0.60) label = "MEDIUM";

      return {
        id: r.retailer_id,
        name: r.retailer_name,
        owner_name: r.tehsil || "Owner",
        label: label,
        reasons: r.reasons,
        lat: r.lat || 17.0575 + (Math.random() - 0.5) * 0.01,
        lng: r.lng || 79.2671 + (Math.random() - 0.5) * 0.01,
        district: r.district || "Jalgaon",
        type: "Retailer"
      };
    });
  };

  useEffect(() => {
    // 1. Toast logic
    if (location.state?.toastMessage) {
      setToast(location.state.toastMessage);
      window.history.replaceState({}, document.title);
      setTimeout(() => setToast(""), 4000);
    }

    // 2. Load cached stats if they exist
    const cachedStats = localStorage.getItem("agronav_weekly_stats");
    if (cachedStats) {
      try {
        setStats(JSON.parse(cachedStats));
      } catch {}
    }

    // 3. Loading logic
    const loadDashboardData = async () => {
      const repId = authContext.user?.sub || authContext.user?.rep_id || "REP_0203";
      const today = new Date().toISOString().split("T")[0];

      // Try cache first
      const cached = getCachedRecommendations();

      if (cached && cached.recommendations) {
        const cachedAt = new Date(cached.cached_at);
        const hoursAgo = (new Date() - cachedAt) / (1000 * 60 * 60);

        // Sort by rank ascending
        const sortedCached = [...cached.recommendations].sort((a, b) => a.rank - b.rank);
        setRecommendations(sortedCached);

        if (hoursAgo > 8) {
          setBannerText("Plan may be outdated — last synced more than 8 hours ago");
          setBannerBg("rgba(239, 68, 68, 0.1)");
          setBannerBorder("rgba(239, 68, 68, 0.25)");
          setBannerColor("#ef4444");
        } else {
          const syncTime = cachedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setBannerText(`Cached — last synced at ${syncTime}`);
          setBannerBg("rgba(255, 255, 255, 0.04)");
          setBannerBorder("rgba(255, 255, 255, 0.08)");
          setBannerColor("var(--text-secondary)");
        }
      }

      setLoading(true);
      try {
        // Fetch fresh recommendations
        const freshData = await getRecommendations(repId, today);
        if (freshData && freshData.recommendations) {
          const sortedFresh = [...freshData.recommendations].sort((a, b) => a.rank - b.rank);
          setRecommendations(sortedFresh);
          cacheRecommendations(freshData);

          // Remove stale banner
          setBannerText("");
          setBannerBg("");
          setBannerBorder("");
          setBannerColor("");
        }

        // Fetch fresh weekly stats
        const syncData = await api.morningSync(repId);
        if (syncData.weekly_stats) {
          setStats(syncData.weekly_stats);
          localStorage.setItem("agronav_weekly_stats", JSON.stringify(syncData.weekly_stats));
        }
      } catch (err) {
        // Handle auth error
        if (err.message.includes("Unauthorized") || err.message.includes("Token") || err.message.includes("401")) {
          authContext.logout();
          navigate("/signin");
          return;
        }

        // Offline mode: Show offline banner if cache exists
        if (cached && cached.recommendations) {
          setBannerText("Offline mode — displaying cached plan");
          setBannerBg("rgba(249, 115, 22, 0.1)");
          setBannerBorder("rgba(249, 115, 22, 0.25)");
          setBannerColor("#f97316");
        } else {
          setBannerText("Offline — no cached plan found. Connect to internet.");
          setBannerBg("rgba(239, 68, 68, 0.1)");
          setBannerBorder("rgba(239, 68, 68, 0.25)");
          setBannerColor("#ef4444");
        }
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
        // Recalibration returns outlets, convert them back to recommendations or map
        // For simplicity, we just trigger a refresh
        const repId = authContext.user?.sub || authContext.user?.rep_id || "REP_0203";
        const today = new Date().toISOString().split("T")[0];
        const freshData = await getRecommendations(repId, today);
        if (freshData && freshData.recommendations) {
          setRecommendations(freshData.recommendations.sort((a, b) => a.rank - b.rank));
          cacheRecommendations(freshData);
        }
        setRecalMsg("✓ Rankings updated!");
        setTimeout(() => setRecalMsg(""), 3000);
      }
    } catch {
      setRecalMsg("Could not recalibrate. Try again.");
      setTimeout(() => setRecalMsg(""), 3000);
    }
    setLoading(false);
  };

  const outletsMapped = mapRecommendationsToOutlets(recommendations);

  return (
    <div className="page-enter">
      <StatsRow outlets={outletsMapped} stats={stats} />

      {/* Recalibrate button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <button
          style={{
            background: "linear-gradient(135deg, var(--green-primary), #0F6E56)",
            color: "white",
            border: "none",
            borderRadius: "var(--radius-pill)",
            padding: "10px 24px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all var(--transition-fast)",
            boxShadow: "0 4px 15px rgba(29,158,117,0.3)"
          }}
          onClick={handleRecalibrate}
          disabled={loading}
        >
          {loading ? "Recalibrating..." : "⟳ Recalibrate"}
        </button>
        
        {recalMsg && (
          <span
            style={{
              fontSize: "13px",
              color: "var(--green-primary)",
              fontWeight: 600,
              animation: "toastIn 0.3s ease forwards"
            }}
          >
            {recalMsg}
          </span>
        )}
      </div>

      {/* Status Banners */}
      {bannerText && (
        <div
          style={{
            background: bannerBg,
            border: `1px solid ${bannerBorder}`,
            borderRadius: "var(--radius-md)",
            padding: "12px 16px",
            marginBottom: "16px",
            fontSize: "13px",
            color: bannerColor,
            fontWeight: 500
          }}
        >
          {bannerText}
        </div>
      )}

      {/* Map */}
      <MapView outlets={outletsMapped} />

      {/* Visit plan */}
      <p
        style={{
          fontSize: "12px", textTransform: "uppercase",
          color: "var(--text-muted)", fontWeight: 700,
          letterSpacing: "1.5px", marginBottom: "12px"
        }}
      >
        Today's visit plan
      </p>

      {recommendations.length === 0 && (
        <div className="text-center py-4" style={{ color: "var(--text-muted)" }}>
          <div style={{ fontSize: "36px" }}>📋</div>
          <div style={{ marginTop: "8px" }}>No shops loaded — check your connection</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {recommendations.map((rec) => {
          const { retailer_id, retailer_name, tehsil, product_recommended, priority_score, reasons } = rec;
          return (
            <div key={retailer_id} className="shop-card" style={{ background: "var(--bg-card, #1E2132)", border: "1px solid var(--border-subtle, rgba(255,255,255,0.07))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "16px", color: "var(--text-primary)" }}>{retailer_name}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>📍 {tehsil}</div>
                </div>
                <div 
                  style={{ 
                    background: scoreColor(priority_score), 
                    color: "#fff", 
                    fontWeight: 700, 
                    fontSize: "13px", 
                    borderRadius: "50%", 
                    width: "36px", 
                    height: "36px", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center" 
                  }}
                >
                  {Math.round(priority_score * 100)}
                </div>
              </div>
              
              <div className="priority-bar">
                <div 
                  className="priority-fill"
                  style={{ 
                    width: `${priority_score * 100}%`,
                    background: scoreColor(priority_score) 
                  }} 
                />
              </div>
              
              <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, margin: "8px 0" }}>
                📦 Recommended: {product_recommended}
              </div>
              
              <ul className="reasons-list">
                {reasons.map((r) => (
                  <li key={r} style={{ color: "var(--text-secondary)", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: "var(--green-primary)" }}>✓</span> {r}
                  </li>
                ))}
              </ul>
              
              <button 
                className="hover-scale"
                style={{
                  width: "100%",
                  marginTop: "12px",
                  padding: "12px",
                  borderRadius: "24px",
                  border: "none",
                  background: "var(--green-primary, #1D9E75)",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(29,158,117,0.2)"
                }}
                onClick={() => navigate('/log', { state: { retailer: rec } })}
              >
                Mark as Visited
              </button>
            </div>
          );
        })}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed", bottom: "28px", right: "28px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-active)",
            borderRadius: "var(--radius-md)",
            padding: "12px 20px",
            fontSize: "13px",
            color: "var(--green-primary)",
            fontWeight: 600,
            zIndex: 9999,
            boxShadow: "var(--shadow-glow)",
            animation: "toastIn 0.2s ease forwards"
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
