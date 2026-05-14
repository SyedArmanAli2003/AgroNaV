import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import OutletCard from "../components/OutletCard";
import StatsRow from "../components/StatsRow";
import MapView from "../components/MapView";
import { api } from "../services/api";

function Dashboard() {
  const [outlets, setOutlets] = useState([]);
  const [stats, setStats] = useState([]);
  const [recalMsg, setRecalMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Read from cache first (works offline)
    const cached = localStorage.getItem("agronav_daily");
    if (cached) {
      try {
        const data = JSON.parse(cached);
        setOutlets(data.outlets || []);
        setStats(data.weekly_stats || []);
      } catch {}
    }
  }, []);

  const handleRecalibrate = async () => {
    setLoading(true);
    try {
      const data = await api.recalibrate();
      if (data.updated_outlets) {
        setOutlets(data.updated_outlets);
        setRecalMsg("✓ Rankings updated!");
        setTimeout(() => setRecalMsg(""), 3000);
      }
    } catch {
      setRecalMsg("Could not recalibrate. Try again.");
      setTimeout(() => setRecalMsg(""), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="page-enter">
      <StatsRow outlets={outlets} stats={stats} />

      {/* Recalibrate button */}
      <div className="d-flex align-items-center gap-2 mb-3">
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
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(29,158,117,0.45)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "";
            e.currentTarget.style.boxShadow = "0 4px 15px rgba(29,158,117,0.3)";
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = "translateY(0)"}
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

      {/* Map */}
      <MapView outlets={outlets} />

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

      {outlets.length === 0 && (
        <div className="text-center py-4" style={{ color: "var(--text-muted)" }}>
          <div style={{ fontSize: "36px" }}>📋</div>
          <div style={{ marginTop: "8px" }}>No outlets loaded — check your connection</div>
        </div>
      )}

      {outlets.map((outlet, i) => (
        <OutletCard
          key={outlet.id}
          outlet={outlet}
          rank={i + 1}
          onClick={() => navigate(`/visit/${outlet.id}`)}
        />
      ))}
    </div>
  );
}

export default Dashboard;
