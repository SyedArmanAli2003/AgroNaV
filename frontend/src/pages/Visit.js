import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import NBACard from "../components/NBACard";
import { api, FALLBACK_NBA } from "../services/api";
import { queueOutcome } from "../services/offline";

const PRIORITY_STYLE = {
  HIGH: { bg: "var(--high-bg)", color: "var(--high-text)" },
  MEDIUM: { bg: "var(--medium-bg)", color: "var(--medium-text)" },
  LOW: { bg: "var(--low-bg)", color: "var(--low-text)" }
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
    const cached = localStorage.getItem("agronav_daily");
    if (cached) {
      try {
        const data = JSON.parse(cached);
        const found = (data.outlets || []).find((o) => o.id === parseInt(id));
        setOutlet(found || null);
      } catch {}
    }
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
      <div className="text-center mt-5" style={{ color: "var(--text-muted)" }}>
        <div className="spinner-border" style={{ color: "var(--green-primary)" }} role="status" />
        <div style={{ marginTop: "8px" }}>Loading visit details...</div>
      </div>
    );
  }

  const ps = PRIORITY_STYLE[outlet.label] || PRIORITY_STYLE.LOW;

  return (
    <div className="page-enter">
      {/* Back link */}
      <button
        className="btn btn-sm btn-link text-decoration-none ps-0 mb-3"
        style={{ color: "var(--green-primary)", fontWeight: 600, boxShadow: "none" }}
        onClick={() => navigate("/dashboard")}
      >
        ← Back to route
      </button>

      {/* Outlet header */}
      <div className="d-flex align-items-center gap-2 mb-2">
        <div style={{ flex: 1 }}>
          <h5 style={{ marginBottom: "2px", fontWeight: 700, color: "var(--text-primary)" }}>{outlet.name}</h5>
          <small style={{ color: "var(--text-secondary)" }}>
            {outlet.type} · {outlet.owner_name} · {outlet.district}
          </small>
        </div>
        <span
          style={{
            background: ps.bg, color: ps.color,
            padding: "4px 12px", borderRadius: "var(--radius-pill)",
            fontSize: "11px", fontWeight: 600, textTransform: "uppercase"
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
              fontSize: "11px", padding: "3px 10px", borderRadius: "var(--radius-pill)",
              background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)", fontWeight: 500
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
            fontSize: "12px", textTransform: "uppercase",
            letterSpacing: "1px", color: "var(--text-muted)",
            fontWeight: 700, marginBottom: "12px"
          }}
        >
          How did this visit go?
        </p>
        
        <div className="d-flex gap-2">
          <button
            onClick={() => logOutcome("sale")}
            disabled={logged}
            style={{
              flex: 1, borderRadius: "var(--radius-pill)", padding: "12px",
              fontSize: "13px", fontWeight: 500, transition: "all var(--transition-fast)",
              background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.3)",
              color: "#1D9E75", opacity: logged ? 0.4 : 1, cursor: logged ? "not-allowed" : "pointer"
            }}
            onMouseEnter={(e) => !logged && (e.currentTarget.style.background = "rgba(29,158,117,0.25)")}
            onMouseLeave={(e) => !logged && (e.currentTarget.style.background = "rgba(29,158,117,0.12)")}
          >
            Sale Made
          </button>
          
          <button
            onClick={() => logOutcome("order")}
            disabled={logged}
            style={{
              flex: 1, borderRadius: "var(--radius-pill)", padding: "12px",
              fontSize: "13px", fontWeight: 500, transition: "all var(--transition-fast)",
              background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)",
              color: "#818CF8", opacity: logged ? 0.4 : 1, cursor: logged ? "not-allowed" : "pointer"
            }}
            onMouseEnter={(e) => !logged && (e.currentTarget.style.background = "rgba(99,102,241,0.25)")}
            onMouseLeave={(e) => !logged && (e.currentTarget.style.background = "rgba(99,102,241,0.12)")}
          >
            Order Placed
          </button>
          
          <button
            onClick={() => logOutcome("none")}
            disabled={logged}
            style={{
              flex: 1, borderRadius: "var(--radius-pill)", padding: "12px",
              fontSize: "13px", fontWeight: 500, transition: "all var(--transition-fast)",
              background: "rgba(220,53,69,0.1)", border: "1px solid rgba(220,53,69,0.25)",
              color: "#FF6B7A", opacity: logged ? 0.4 : 1, cursor: logged ? "not-allowed" : "pointer"
            }}
            onMouseEnter={(e) => !logged && (e.currentTarget.style.background = "rgba(220,53,69,0.2)")}
            onMouseLeave={(e) => !logged && (e.currentTarget.style.background = "rgba(220,53,69,0.1)")}
          >
            No Purchase
          </button>
        </div>

        {logged && score !== null && (
          <div
            className="mt-3 text-center"
            style={{
              fontSize: "13px", color: "var(--green-primary)", fontWeight: 600,
              background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.25)",
              padding: "8px 12px", borderRadius: "var(--radius-md)"
            }}
          >
            Outcome score: {score} / 100
          </div>
        )}
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

export default Visit;
