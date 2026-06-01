// Profile Settings page — allows any authenticated user to update their name and territory
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "../services/api";
import { User, MapPin, Save, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

export default function ProfileSettings() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || "");
  const [district, setDistrict] = useState(user?.district || user?.territory || "");
  const [state, setState] = useState(user?.state || "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', msg }

  const handleSave = async () => {
    if (!name.trim()) {
      setStatus({ type: "error", msg: "Name cannot be empty." });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const res = await updateProfile({ name: name.trim(), district, state });
      if (res?.success) {
        const savedDistrict = res.user?.district || district;
        const savedState    = res.user?.state    || state;
        // Update AuthContext so navbar reflects change immediately
        setUser(prev => ({
          ...prev,
          name: res.user?.name || name.trim(),
          district: savedDistrict,
          territory: savedDistrict,
          state: savedState,
        }));
        // Persist territory to localStorage so AlertFeed and Dashboard pick it up
        localStorage.setItem("agronav_district", savedDistrict);
        localStorage.setItem("agronav_rep_territory", JSON.stringify({
          district: savedDistrict, territory: savedDistrict, state: savedState
        }));
        // Clear recommendation cache so Dashboard re-fetches for the new territory
        localStorage.removeItem("agronav_recommendations");
        localStorage.removeItem("agronav_last_prefetch");
        setStatus({ type: "success", msg: "Profile updated successfully!" });
      }
    } catch (err) {
      setStatus({ type: "error", msg: err.message || "Update failed. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="page-container page-enter"
      style={{ maxWidth: 520, margin: "0 auto", padding: "16px 16px 100px" }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6,
            fontSize: 14, padding: 0
          }}
        >
          <ArrowLeft size={18} /> Back
        </button>
      </div>

      <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 600, fontFamily: "var(--font-heading)", display: "flex", alignItems: "center", gap: 8 }}>
        <User size={22} /> Profile Settings
      </h1>
      <p style={{ margin: "0 0 28px", fontSize: 13, color: "var(--text-secondary)" }}>
        Update your display name and territory
      </p>

      {/* Form card */}
      <div className="glass-card-strong" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Name field */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
            Display Name
          </label>
          <div style={{ position: "relative" }}>
            <User size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10, padding: "12px 12px 12px 38px",
                color: "var(--text-primary)", fontSize: 15,
                outline: "none", fontFamily: "var(--font-body)",
                transition: "border-color 0.2s"
              }}
              onFocus={e => { e.target.style.borderColor = "var(--color-primary, #1D9E75)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
            />
          </div>
        </div>

        {/* District / Territory field */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
            District / Territory
          </label>
          <div style={{ position: "relative" }}>
            <MapPin size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              value={district}
              onChange={e => setDistrict(e.target.value)}
              placeholder="e.g. Jalgaon, Indore, Nalgonda"
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10, padding: "12px 12px 12px 38px",
                color: "var(--text-primary)", fontSize: 15,
                outline: "none", fontFamily: "var(--font-body)",
                transition: "border-color 0.2s"
              }}
              onFocus={e => { e.target.style.borderColor = "var(--color-primary, #1D9E75)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
            />
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            This determines which retailers appear in your Today's Priority List
          </p>
        </div>

        {/* State field */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
            State
          </label>
          <input
            value={state}
            onChange={e => setState(e.target.value)}
            placeholder="e.g. Maharashtra, Madhya Pradesh"
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, padding: "12px",
              color: "var(--text-primary)", fontSize: 15,
              outline: "none", fontFamily: "var(--font-body)",
              transition: "border-color 0.2s"
            }}
            onFocus={e => { e.target.style.borderColor = "var(--color-primary, #1D9E75)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
          />
        </div>

        {/* Status message */}
        {status && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 16px", borderRadius: 10,
            background: status.type === "success" ? "rgba(29,158,117,0.12)" : "rgba(255,107,122,0.12)",
            border: `1px solid ${status.type === "success" ? "rgba(29,158,117,0.3)" : "rgba(255,107,122,0.3)"}`,
            fontSize: 13, color: status.type === "success" ? "var(--color-success, #1D9E75)" : "#FF6B7A"
          }}>
            {status.type === "success"
              ? <CheckCircle size={16} />
              : <AlertCircle size={16} />
            }
            {status.msg}
          </div>
        )}

        {/* Info box */}
        <div style={{
          padding: "12px 16px", borderRadius: 10,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6
        }}>
          <strong style={{ color: "var(--text-secondary)" }}>Note for Reps:</strong> Changing your territory reloads your priority list with retailers from the new district. Your visit history is preserved.
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: saving ? "rgba(29,158,117,0.4)" : "var(--color-primary, #1D9E75)",
            color: "#fff", border: "none", borderRadius: 12,
            padding: "14px", fontSize: 15, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            transition: "opacity 0.2s", fontFamily: "var(--font-body)"
          }}
        >
          <Save size={18} />
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* Current info card */}
      <div className="glass-card" style={{ marginTop: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Current Profile</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "Name", value: user?.name },
            { label: "Rep ID", value: user?.sub || user?.rep_id },
            { label: "Role", value: user?.role },
            { label: "Territory", value: user?.district || user?.territory || "Not set" },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--text-muted)" }}>{row.label}</span>
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{row.value || "—"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
