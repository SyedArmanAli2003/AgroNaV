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
    <div>
      <StatsRow outlets={outlets} stats={stats} />

      {/* Recalibrate button */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <button
          className="btn btn-sm"
          style={{
            background: "linear-gradient(135deg, #1D9E75, #34d399)",
            color: "white", border: "none", borderRadius: 10,
            padding: "8px 18px", fontWeight: 600, fontSize: 13,
            boxShadow: "0 4px 12px rgba(29,158,117,0.3)",
            transition: "transform 0.2s"
          }}
          onClick={handleRecalibrate}
          disabled={loading}
          onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
          onMouseLeave={(e) => (e.target.style.transform = "")}
        >
          {loading ? "Recalibrating..." : "⟳ Recalibrate"}
        </button>
        {recalMsg && (
          <span style={{ fontSize: 13, color: "#1D9E75", fontWeight: 600 }}>
            {recalMsg}
          </span>
        )}
      </div>

      {/* Map */}
      <MapView outlets={outlets} />

      {/* Visit plan */}
      <p
        style={{
          fontSize: 12, textTransform: "uppercase",
          color: "#64748b", fontWeight: 700,
          letterSpacing: 1.5, marginBottom: 12
        }}
      >
        Today's visit plan
      </p>

      {outlets.length === 0 && (
        <div className="text-center text-muted py-4">
          <div style={{ fontSize: 36 }}>📋</div>
          <div style={{ marginTop: 8 }}>No outlets loaded — check your connection</div>
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
