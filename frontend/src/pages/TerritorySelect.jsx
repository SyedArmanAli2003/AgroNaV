import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateTerritory } from "../services/api";
import { Select } from "../components/ui/Select";
import { Leaf } from "lucide-react";
import "../css/auth.css";

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

  const stateOptions = Object.keys(STATE_DISTRICTS).map(s => ({ value: s, label: s }));
  const districtOptions = selectedState
    ? (STATE_DISTRICTS[selectedState] || []).map(d => ({ value: d, label: d }))
    : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedState || !selectedDistrict) return;
    setLoading(true);
    setError("");
    const repId = user?.sub || user?.rep_id;
    try {
      if (repId) await updateTerritory(repId, selectedState, selectedDistrict, territoryId);
    } catch { /* Non-fatal */ }
    const territoryData = { state: selectedState, district: selectedDistrict, territory: selectedDistrict, territory_id: territoryId };
    localStorage.setItem("agronav_rep_territory", JSON.stringify(territoryData));
    if (token) login(token);
    setLoading(false);
    navigate("/dashboard");
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 440 }}>
        <div className="auth-logo">
          <Leaf size={22} color="var(--color-primary)" />
          <span className="auth-logo-text">AgroNav</span>
        </div>
        <h1 className="auth-heading">Set Your Territory</h1>
        <p className="auth-subheading">This helps us rank the right retailers for your field area</p>
        {error && <div className="auth-error">{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <label className="auth-label">State</label>
            <Select options={stateOptions} value={selectedState} onChange={(v) => { setSelectedState(v); setSelectedDistrict(""); }} placeholder="— Select state —" />
          </div>
          <div className="auth-input-group">
            <label className="auth-label">District</label>
            <Select options={districtOptions} value={selectedDistrict} onChange={setSelectedDistrict} placeholder="— Select district —" disabled={!selectedState} />
          </div>
          <div className="auth-input-group">
            <label className="auth-label">Territory ID <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></label>
            <input id="territory-id" className="auth-input" type="text" placeholder="e.g. TERR_042 (leave blank if unknown)" value={territoryId} onChange={e => setTerritoryId(e.target.value)} autoComplete="off" />
            <small style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4, display: "block" }}>Ask your area manager for your Territory ID</small>
          </div>
          <button id="territory-confirm" className="auth-btn-primary" type="submit" disabled={!selectedState || !selectedDistrict || loading} style={{ opacity: (!selectedState || !selectedDistrict) ? 0.5 : 1 }}>
            {loading ? "Saving…" : "Confirm Territory →"}
          </button>
        </form>
        <div className="auth-footer" style={{ marginTop: 16 }}>
          <button onClick={() => navigate("/dashboard")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}>Skip for now</button>
        </div>
      </div>
    </div>
  );
}

export default TerritorySelect;
