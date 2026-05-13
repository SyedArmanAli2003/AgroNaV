import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import NBACard from "../components/NBACard";
import { api, FALLBACK_NBA } from "../services/api";
import { queueOutcome } from "../services/offline";

const PRIORITY_STYLE = {
  HIGH: { bg: "#ffe4e6", color: "#e11d48" },
  MEDIUM: { bg: "#fef3c7", color: "#d97706" },
  LOW: { bg: "#dcfce7", color: "#16a34a" }
};

function Visit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [outlet, setOutlet] = useState(null);
  const [nba, setNba] = useState(null);
  const [logged, setLogged] = useState(false);
  const [toast, setToast] = useState("");
  const [score, setScore] = useState(null);

  useEffect(() => {
    // Find outlet in cached daily plan
    const cached = localStorage.getItem("agronav_daily");
    if (cached) {
      try {
        const data = JSON.parse(cached);
        const found = (data.outlets || []).find((o) => o.id === parseInt(id));
        setOutlet(found || null);
      } catch {}
    }
    // Fetch NBA card
    api.getNBA(id).then(setNba).catch(() => setNba(FALLBACK_NBA));
  }, [id]);

  const logOutcome = async (result) => {
    if (logged) return;
    setLogged(true);
    try {
      const res = await api.logOutcome(outlet.id, result);
      if (res.outcome_score !== undefined) setScore(res.outcome_score);
    } catch {
      queueOutcome(outlet.id, result);
    }
    setToast("✓ Outcome saved!");
    setTimeout(() => setToast(""), 4000);
  };

  if (!outlet) {
    return (
      <div className="text-center text-muted mt-5">
        <div className="spinner-border" style={{ color: "#1D9E75" }} role="status" />
        <div style={{ marginTop: 8 }}>Loading visit details...</div>
      </div>
    );
  }

  const ps = PRIORITY_STYLE[outlet.label] || PRIORITY_STYLE.LOW;

  return (
    <div>
      {/* Back link */}
      <button
        className="btn btn-sm btn-link text-decoration-none ps-0 mb-3"
        style={{ color: "#1D9E75", fontWeight: 600 }}
        onClick={() => navigate("/dashboard")}
      >
        ← Back to route
      </button>

      {/* Outlet header */}
      <div className="d-flex align-items-center gap-2 mb-2">
        <div style={{ flex: 1 }}>
          <h5 style={{ marginBottom: 2, fontWeight: 700 }}>{outlet.name}</h5>
          <small style={{ color: "#64748b" }}>
            {outlet.type} · {outlet.owner_name} · {outlet.district}
          </small>
        </div>
        <span
          style={{
            background: ps.bg, color: ps.color,
            padding: "4px 12px", borderRadius: 20,
            fontSize: 11, fontWeight: 700, textTransform: "uppercase"
          }}
        >
          {outlet.label}
        </span>
      </div>

      {/* Reason chips */}
      <div className="d-flex flex-wrap gap-1 mb-3">
        {(outlet.reasons || []).map((r, i) => (
          <span
            key={i}
            style={{
              fontSize: 11, padding: "4px 10px", borderRadius: 20,
              background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)",
              color: "#475569", fontWeight: 500
            }}
          >
            {r}
          </span>
        ))}
      </div>

      {/* NBA Card */}
      {nba && <NBACard nba={nba} />}

      {/* Outcome buttons */}
      <div className="mt-3">
        <p
          style={{
            fontSize: 12, textTransform: "uppercase",
            letterSpacing: 1.5, color: "#64748b",
            fontWeight: 700, marginBottom: 12
          }}
        >
          How did this visit go?
        </p>
        <div className="d-flex gap-2">
          {[
            { label: "Sale Made", val: "sale", cls: "btn-outline-success" },
            { label: "Order Placed", val: "order", cls: "btn-outline-primary" },
            { label: "No Purchase", val: "none", cls: "btn-outline-danger" }
          ].map((btn) => (
            <button
              key={btn.val}
              className={`btn ${btn.cls} flex-fill`}
              style={{
                borderRadius: 12, padding: "12px", fontWeight: 600,
                transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)"
              }}
              disabled={logged}
              onClick={() => logOutcome(btn.val)}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {logged && score !== null && (
          <div
            className="mt-2 text-center"
            style={{
              fontSize: 13, color: "#1D9E75", fontWeight: 600,
              background: "#d1fae5", padding: "8px 12px", borderRadius: 10
            }}
          >
            Outcome score: {score} / 100
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed", bottom: 24, right: 24,
            background: "linear-gradient(135deg, #1D9E75, #34d399)",
            color: "white", padding: "12px 24px",
            borderRadius: 12, fontSize: 14, fontWeight: 600,
            zIndex: 9999,
            boxShadow: "0 8px 24px rgba(29,158,117,0.4)"
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

export default Visit;
