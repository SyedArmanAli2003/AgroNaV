import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateTerritory } from "../services/api";
import "../css/auth.css";
import "../css/landing.css";

const STATE_DISTRICTS = {
  "Maharashtra":       ["Jalgaon", "Nashik", "Pune", "Nagpur", "Aurangabad"],
  "Rajasthan":         ["Kota", "Udaipur", "Jodhpur", "Bikaner"],
  "Punjab":            ["Ludhiana", "Amritsar", "Patiala", "Jalandhar"],
  "Haryana":           ["Hisar", "Karnal", "Rohtak", "Ambala"],
  "Uttar Pradesh":     ["Agra", "Meerut", "Varanasi", "Kanpur", "Lucknow"],
  "Madhya Pradesh":    ["Indore", "Bhopal", "Jabalpur", "Gwalior"],
  "Gujarat":           ["Rajkot", "Surat", "Vadodara", "Anand"],
  "Karnataka":         ["Belgaum", "Hubli", "Mysore", "Bidar"],
  "Andhra Pradesh":    ["Guntur", "Krishna", "Nalgonda", "Kurnool"],
  "Telangana":         ["Nalgonda", "Warangal", "Nizamabad", "Karimnagar"]
};

function TerritorySelect() {
  const { user, login, token } = useAuth();
  const navigate = useNavigate();

  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [territoryId, setTerritoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const districts = selectedState ? STATE_DISTRICTS[selectedState] || [] : [];

  const handleStateChange = (e) => {
    setSelectedState(e.target.value);
    setSelectedDistrict("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedState || !selectedDistrict) return;

    setLoading(true);
    setError("");

    const repId = user?.sub || user?.rep_id;

    try {
      // Persist to backend if we have a rep_id
      if (repId) {
        await updateTerritory(repId, selectedState, selectedDistrict, territoryId);
      }
    } catch {
      // Non-fatal — continue anyway
    }

    // Always store locally
    const territoryData = {
      state: selectedState,
      district: selectedDistrict,
      territory: selectedDistrict,
      territory_id: territoryId
    };
    localStorage.setItem("agronav_rep_territory", JSON.stringify(territoryData));

    // Re-login with same token to merge territory into user object
    if (token) login(token);

    setLoading(false);
    navigate("/dashboard");
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 440 }}>
        {/* Logo */}
        <div className="auth-logo">
          <span style={{ fontSize: 22 }}>🌿</span>
          <span className="auth-logo-text">AgroNav</span>
        </div>

        <h1 className="auth-heading">Set Your Territory</h1>
        <p className="auth-subheading">
          This helps us rank the right retailers for your field area
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* State */}
          <div className="auth-input-group">
            <label className="auth-label">State</label>
            <select
              id="territory-state"
              className="auth-input"
              value={selectedState}
              onChange={handleStateChange}
              required
              style={{ cursor: "pointer" }}
            >
              <option value="">— Select state —</option>
              {Object.keys(STATE_DISTRICTS).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* District */}
          <div className="auth-input-group">
            <label className="auth-label">District</label>
            <select
              id="territory-district"
              className="auth-input"
              value={selectedDistrict}
              onChange={e => setSelectedDistrict(e.target.value)}
              required
              disabled={!selectedState}
              style={{ cursor: selectedState ? "pointer" : "default" }}
            >
              <option value="">— Select district —</option>
              {districts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Territory ID (optional) */}
          <div className="auth-input-group">
            <label className="auth-label">Territory ID <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></label>
            <input
              id="territory-id"
              className="auth-input"
              type="text"
              placeholder="e.g. TERR_042 (leave blank if unknown)"
              value={territoryId}
              onChange={e => setTerritoryId(e.target.value)}
              autoComplete="off"
            />
            <small style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: 4, display: "block" }}>
              Ask your area manager for your Territory ID
            </small>
          </div>

          <button
            id="territory-confirm"
            className="auth-btn-primary"
            type="submit"
            disabled={!selectedState || !selectedDistrict || loading}
            style={{ opacity: (!selectedState || !selectedDistrict) ? 0.5 : 1 }}
          >
            {loading ? "Saving…" : "Confirm Territory →"}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: 16 }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              background: "none", border: "none", color: "var(--text-muted)",
              cursor: "pointer", fontSize: 13, textDecoration: "underline"
            }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

export default TerritorySelect;
