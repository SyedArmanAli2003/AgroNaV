import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import NBACard from "../components/NBACard";
import { api, FALLBACK_NBA } from "../services/api";
import { queueOutcome } from "../services/offline";
import { Leaf, MessageSquare, AlertTriangle, Navigation, Clock } from "lucide-react";

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
  const [farmerPlan, setFarmerPlan] = useState(null);
  const [farmerLoading, setFarmerLoading] = useState(false);

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

      {/* ── Farmer Intel Card ─────────────────────────────────── */}
      <div style={{ marginTop: 16, marginBottom: 8 }}>
        <button
          id="farmer-intel-btn"
          onClick={async () => {
            if (farmerPlan) { setFarmerPlan(null); return; }
            setFarmerLoading(true);
            try {
              await api.seedDemoFarmers();
              const grower = {
                grower_id:          `G_${outlet.id}`,
                farmer_name:        outlet.owner_name || "Farmer",
                village:            outlet.district   || "Village",
                tehsil:             outlet.district   || "",
                district:           outlet.district   || "Jalgaon",
                farm_acres:         2.5,
                crop_type:          (outlet.crop_stage || "").toLowerCase().includes("kharif") ? "cotton" : "soybean",
                growth_stage:       outlet.crop_stage || "vegetative",
                last_product:       outlet.last_visit_date ? "Tilt 250 EC" : null,
                last_purchase_date: outlet.last_visit_date || null,
              };
              const plan = await api.getFarmerVisitPlan(grower);
              setFarmerPlan(plan);
            } catch (e) { console.error("[farmer-intel]", e); }
            finally { setFarmerLoading(false); }
          }}
          style={{
            width: "100%", padding: "10px", borderRadius: "var(--radius-pill)",
            background: farmerPlan ? "transparent" : "rgba(29,158,117,0.1)",
            border: "1px solid rgba(29,158,117,0.35)",
            color: "#1D9E75", fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <Leaf size={14} />
          {farmerLoading ? "Fetching farmer intel..." : farmerPlan ? "Hide Farmer Intel" : "Farmer Intel"}
        </button>

        {farmerPlan && (
          <div style={{
            marginTop: 12,
            background: "var(--bg-card)", borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)", padding: 16,
            animation: "toastIn 0.25s ease forwards",
            borderLeft: `3px solid ${
              farmerPlan.visit_type === "priority_visit"  ? "#ef4444" :
              farmerPlan.visit_type === "warm_lead_visit" ? "#818CF8" :
              farmerPlan.visit_type === "free_visit"      ? "#1D9E75" : "var(--border-subtle)"
            }`
          }}>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
                padding: "3px 10px", borderRadius: 99, border: "1px solid currentColor",
                color:
                  farmerPlan.visit_type === "priority_visit"  ? "#ef4444" :
                  farmerPlan.visit_type === "warm_lead_visit" ? "#818CF8" :
                  farmerPlan.visit_type === "free_visit"      ? "#1D9E75" : "var(--text-muted)",
                background:
                  farmerPlan.visit_type === "priority_visit"  ? "rgba(239,68,68,0.1)" :
                  farmerPlan.visit_type === "warm_lead_visit" ? "rgba(129,140,248,0.1)" :
                  farmerPlan.visit_type === "free_visit"      ? "rgba(29,158,117,0.1)" : "rgba(100,116,139,0.1)",
              }}>
                {(farmerPlan.visit_type || "").replace(/_/g, " ")}
              </span>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>via {farmerPlan.source}</span>
            </div>

            {/* Signal chips */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {[
                { icon: <Navigation size={10}/>, label: `${farmerPlan.distance_km}km from route`, show: farmerPlan.distance_km != null },
                { icon: <Clock size={10}/>,       label: `${farmerPlan.detour_minutes}min detour`,  show: farmerPlan.detour_minutes != null },
                { icon: <MessageSquare size={10}/>, label: `WhatsApp: ${farmerPlan.message_status}`, show: !!farmerPlan.message_status },
              ].filter(s => s.show).map((s, i) => (
                <span key={i} style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 4,
                  padding: "2px 8px", borderRadius: 99,
                  background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)",
                  color: "var(--text-muted)" }}>{s.icon} {s.label}</span>
              ))}
            </div>

            {/* Conversation starter */}
            {farmerPlan.conversation_starter && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 4 }}>Conversation Starter</div>
                <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5, fontStyle: "italic" }}>"{farmerPlan.conversation_starter}"</div>
              </div>
            )}

            {/* Agronomic advice */}
            {farmerPlan.agronomic_advice && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 4 }}>Agronomic Advice</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{farmerPlan.agronomic_advice}</div>
              </div>
            )}

            {/* Product + value */}
            {farmerPlan.recommended_product && (
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <div style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.2)" }}>
                  <div style={{ fontSize: 10, color: "#1D9E75", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Recommend</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{farmerPlan.recommended_product}</div>
                </div>
                {farmerPlan.estimated_value && (
                  <div style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Est. Value</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{farmerPlan.estimated_value}</div>
                  </div>
                )}
              </div>
            )}

            {farmerPlan.visit_type === "skip_today" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                <AlertTriangle size={12} /> {farmerPlan.visit_reason}
              </div>
            )}
          </div>
        )}
      </div>


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
