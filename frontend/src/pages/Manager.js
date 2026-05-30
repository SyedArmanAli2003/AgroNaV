import React, { useState, useEffect, useCallback } from "react";
import {
  IndianRupee, TrendingUp, Users, RefreshCw,
  UserPlus, Download, Map, Store, PlusCircle,
  ToggleLeft, ToggleRight, CheckCircle, X, Cpu, Zap,
  BarChart2, BookOpen, AlertTriangle, ArrowUpRight, ArrowDownRight, Award,
  CalendarDays, Play, ThumbsUp, Clock, ChevronDown, ChevronRight
} from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

// ── Helpers ────────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16
    }} onClick={onClose}>
      <div className="glass-card-strong" style={{ width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", position: "relative" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, fontFamily: "var(--font-heading)" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InputField({ label, id, ...props }) {
  return (
    <div className="auth-input-group" style={{ marginBottom: 14 }}>
      <label className="auth-label" htmlFor={id}>{label}</label>
      <input id={id} className="glass-input auth-input" {...props} />
    </div>
  );
}

// ── Manager Page ───────────────────────────────────────────────────────────────

function Manager() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [retailers, setRetailers] = useState([]);
  const [reps, setReps] = useState([]);
  const [modelInfo, setModelInfo] = useState(null);
  const [tab, setTab] = useState("retailers");
  const [weeklyStats, setWeeklyStats]     = useState(null);
  const [weeklyLearning, setWeeklyLearning] = useState(null);
  const [learningLoading, setLearningLoading] = useState(false);

  // Weekly Plans state
  const [weeklyPlans, setWeeklyPlans] = useState({});        // keyed by rep_id
  const [planGenerating, setPlanGenerating] = useState(null); // rep_id being generated
  const [planApproving, setPlanApproving] = useState(null);   // plan_id being approved
  const [planExpanded, setPlanExpanded] = useState({});       // { planId: true/false }

  // Modal state
  const [addRetailerOpen, setAddRetailerOpen] = useState(false);
  const [addRepOpen, setAddRepOpen] = useState(false);
  const [toast, setToast] = useState("");

  // Form state
  const [newRetailer, setNewRetailer] = useState({ retailer_name: "", contact_name: "", phone: "", tehsil: "" });
  const [newRep, setNewRep] = useState({ name: "", email: "", rep_id: "", password: "" });
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("agronav_token");
  const authHeader = { Authorization: `Bearer ${token}` };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  // Load all data
  const loadData = useCallback(async () => {
    // KPIs
    api.getManagerKPIs().then(setKpis).catch(() => {});

    // Retailers
    fetch("/api/manager/retailers", { headers: authHeader })
      .then(r => r.json())
      .then(d => setRetailers(d.retailers || []))
      .catch(() => {});

    // Reps
    fetch("/api/manager/reps", { headers: authHeader })
      .then(r => r.json())
      .then(d => setReps(d.reps || []))
      .catch(() => {});

    // Model info
    fetch("/api/debug/model")
      .then(r => r.json())
      .then(setModelInfo)
      .catch(() => {});

    // Weekly stats (fast, no LLM)
    const dist = user?.district || "Jalgaon";
    api.getWeeklyStats(dist, "Maharashtra").then(setWeeklyStats).catch(() => {});
  }, []); // eslint-disable-line

  useEffect(() => { loadData(); }, [loadData]);

  const data = kpis?.kpis || kpis || {};
  const kpiCards = [
    { title: "Active Retailers", value: retailers.filter(r => r.is_active !== 0).length || data.total_retailers || 0, Icon: Store, color: "var(--color-primary)" },
    { title: "Reps in Team", value: reps.length || data.reps_count || 0, Icon: Users, color: "var(--color-primary)" },
    { title: "Visits Today", value: data.visits_completed || 0, Icon: TrendingUp, color: "var(--color-success)" },
    { title: "Acceptance Rate", value: `${Number(data.acceptance_rate_this_week || 0).toFixed(1)}%`, Icon: IndianRupee, color: "var(--color-warning)" }
  ];

  // ── Add Retailer Submit ──
  const handleAddRetailer = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/manager/retailers", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(newRetailer)
      });
      const d = await res.json();
      if (d.success) {
        showToast(`Retailer "${newRetailer.retailer_name}" added`);
        setAddRetailerOpen(false);
        setNewRetailer({ retailer_name: "", contact_name: "", phone: "", tehsil: "" });
        loadData();
      }
    } catch { showToast("Failed to add retailer"); }
    setSaving(false);
  };

  // ── Deactivate Retailer ──
  const handleDeactivate = async (retailer_id) => {
    if (!window.confirm("Deactivate this retailer?")) return;
    await fetch(`/api/manager/retailers/${retailer_id}`, { method: "DELETE", headers: authHeader });
    showToast("Retailer deactivated");
    loadData();
  };

  // ── Add Rep Submit ──
  const handleAddRep = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newRep, role: "rep", manager_id: null })
      });
      const d = await res.json();
      if (d.token) {
        showToast(`Rep "${newRep.name}" created`);
        setAddRepOpen(false);
        setNewRep({ name: "", email: "", rep_id: "", password: "" });
        loadData();
      } else {
        showToast(d.detail || "Failed to create rep");
      }
    } catch { showToast("Failed to create rep"); }
    setSaving(false);
  };

  // ── Weekly Plan helpers ──
  const handleGeneratePlan = async (rep_id) => {
    setPlanGenerating(rep_id);
    try {
      const monday = new Date();
      monday.setDate(monday.getDate() - monday.getDay() + 1);
      const week_start_date = monday.toISOString().split("T")[0];
      const res = await api.generateWeeklyPlan(rep_id, week_start_date, user?.rep_id || "manager");
      if (res.success) {
        setWeeklyPlans(prev => ({ ...prev, [rep_id]: res.plan }));
        setPlanExpanded(prev => ({ ...prev, [res.plan.id]: true }));
        showToast(`Plan generated for ${rep_id}`);
      } else {
        showToast(res.error || "Failed to generate plan");
      }
    } catch {
      showToast("Failed to generate plan");
    }
    setPlanGenerating(null);
  };

  const handleApprovePlan = async (plan_id, rep_id) => {
    setPlanApproving(plan_id);
    try {
      const res = await api.approveWeeklyPlan(plan_id);
      if (res.success) {
        setWeeklyPlans(prev => ({
          ...prev,
          [rep_id]: { ...(prev[rep_id] || {}), status: "approved" }
        }));
        showToast("Plan approved — rep can now see their week");
      } else {
        showToast(res.error || "Approval failed");
      }
    } catch {
      showToast("Approval failed");
    }
    setPlanApproving(null);
  };

  const TABS = ["retailers", "reps", "plans", "learning", "model", "heatmap"];
  const TAB_LABELS = { retailers: "Retailers", reps: "My Team", plans: "Weekly Plans", learning: "Weekly Learning", model: "AI Status", heatmap: "Territory" };

  return (
    <div className="page-container page-enter" style={{ padding: "20px 16px 100px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Manager Portal</p>
        <h1 style={{ margin: "4px 0 24px", fontFamily: "var(--font-heading)", fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 600 }}>
          {user?.territory || user?.district || "Jalgaon"} Territory
        </h1>

        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 28 }}>
          {kpiCards.map(card => {
            const Icon = card.Icon;
            return (
              <div key={card.title} className="glass-card-strong" style={{ padding: 18, minHeight: 120 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)" }}>{card.title}</span>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--glass-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={15} color={card.color} />
                  </div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "var(--font-heading)", color: card.color }}>{card.value}</div>
              </div>
            );
          })}
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: "1px solid var(--glass-border)", paddingBottom: 0 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: "none", border: "none", cursor: "pointer", padding: "10px 18px",
              fontSize: 14, fontWeight: 600, fontFamily: "var(--font-body)",
              color: tab === t ? "var(--color-primary)" : "var(--text-muted)",
              borderBottom: tab === t ? "2px solid var(--color-primary)" : "2px solid transparent",
              transition: "all 0.15s"
            }}>{TAB_LABELS[t]}</button>
          ))}
        </div>

        {/* ── RETAILERS TAB ── */}
        {tab === "retailers" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Territory Retailers</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                  Retailers your reps can visit. Add, edit, or deactivate.
                </p>
              </div>
              <button className="btn-primary" style={{ width: "auto", padding: "10px 18px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }} onClick={() => setAddRetailerOpen(true)}>
                <PlusCircle size={15} /> Add Retailer
              </button>
            </div>

            {retailers.length === 0 ? (
              <div className="glass-card" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
                <Store size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                <div style={{ fontWeight: 600, marginBottom: 8 }}>No retailers yet</div>
                <div style={{ fontSize: 13 }}>Add your first retailer above. Without retailers, your reps see an empty app.</div>
              </div>
            ) : (
              <div className="glass-card" style={{ overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, fontFamily: "var(--font-body)" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                      {["Retailer Name", "Contact", "Tehsil", "District", "Active", "Actions"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {retailers.map(r => (
                      <tr key={r.retailer_id} style={{ borderBottom: "1px solid var(--glass-border)" }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--glass-bg)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "12px", fontWeight: 600 }}>{r.retailer_name}</td>
                        <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{r.contact_name || "—"}</td>
                        <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{r.tehsil}</td>
                        <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{r.district}</td>
                        <td style={{ padding: "12px" }}>
                          {r.is_active !== 0
                            ? <ToggleRight size={20} color="var(--color-primary)" />
                            : <ToggleLeft size={20} color="var(--text-muted)" />}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <button
                            onClick={() => handleDeactivate(r.retailer_id)}
                            style={{ background: "none", border: "1px solid var(--glass-border)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "var(--color-urgent, #ef4444)", fontSize: 12 }}
                          >
                            Deactivate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── REPS TAB ── */}
        {tab === "reps" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Your Field Team</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>Reps assigned to your territory</p>
              </div>
              <button className="btn-primary" style={{ width: "auto", padding: "10px 18px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }} onClick={() => setAddRepOpen(true)}>
                <UserPlus size={15} /> Add Rep
              </button>
            </div>
            {reps.length === 0 ? (
              <div className="glass-card" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
                <Users size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                <div style={{ fontWeight: 600, marginBottom: 8 }}>No reps yet</div>
                <div style={{ fontSize: 13 }}>Add reps to your team. They will see the daily plan for your territory.</div>
              </div>
            ) : (
              <div className="glass-card" style={{ overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                      {["Name", "Rep ID", "Territory", "Visits Today", "Status"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reps.map(rep => (
                      <tr key={rep.rep_id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                        <td style={{ padding: 12, fontWeight: 600 }}>{rep.name}</td>
                        <td style={{ padding: 12, color: "var(--text-secondary)", fontFamily: "monospace", fontSize: 12 }}>{rep.rep_id}</td>
                        <td style={{ padding: 12, color: "var(--text-secondary)" }}>{rep.territory_id || rep.district || "—"}</td>
                        <td style={{ padding: 12 }}>{rep.visits_today || 0}</td>
                        <td style={{ padding: 12 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-success)" }} />
                            <span style={{ fontSize: 12 }}>Active</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── WEEKLY PLANS TAB ── */}
        {tab === "plans" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, fontFamily: "var(--font-heading)", display: "flex", alignItems: "center", gap: 8 }}>
                <CalendarDays size={18} color="var(--color-primary)" /> Weekly Visit Plans
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                Generate and approve a 5-day visit plan for each rep. Reps see their approved plan under "My Week".
              </p>
            </div>

            {reps.length === 0 ? (
              <div className="glass-card" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
                <Users size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                <div style={{ fontWeight: 600, marginBottom: 8 }}>No reps in your team yet</div>
                <div style={{ fontSize: 13 }}>Add reps under "My Team" first.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {reps.map(rep => {
                  const plan = weeklyPlans[rep.rep_id];
                  const isExpanded = plan ? !!planExpanded[plan.id] : false;
                  const statusColor = {
                    pending:  "var(--color-warning)",
                    approved: "var(--color-primary)",
                    active:   "var(--color-success, #22c55e)",
                  }[plan?.status] || "var(--text-muted)";

                  return (
                    <div key={rep.rep_id} className="glass-card-strong" style={{ padding: 20 }}>
                      {/* Rep header row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: plan ? 16 : 0 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, fontFamily: "var(--font-heading)" }}>{rep.name}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace", marginTop: 2 }}>{rep.rep_id} · {rep.territory_id || rep.district || "—"}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          {plan && (
                            <>
                              <span style={{
                                fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 700,
                                background: `${statusColor}22`, color: statusColor,
                                border: `1px solid ${statusColor}55`, textTransform: "uppercase"
                              }}>{plan.status}</span>
                              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{plan.week_label}</span>
                              {plan.status === "pending" && (
                                <button
                                  className="btn-primary"
                                  style={{ width: "auto", padding: "8px 14px", fontSize: 12, opacity: planApproving === plan.id ? 0.6 : 1, display: "flex", alignItems: "center", gap: 5 }}
                                  disabled={planApproving === plan.id}
                                  onClick={() => handleApprovePlan(plan.id, rep.rep_id)}
                                >
                                  <ThumbsUp size={12} />
                                  {planApproving === plan.id ? "Approving..." : "Approve Plan"}
                                </button>
                              )}
                              {plan.status === "approved" && (
                                <span style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, color: "var(--color-primary)" }}>
                                  <CheckCircle size={13} /> Approved — rep can see this
                                </span>
                              )}
                              <button
                                onClick={() => setPlanExpanded(prev => ({ ...prev, [plan.id]: !isExpanded }))}
                                style={{ background: "none", border: "1px solid var(--glass-border)", borderRadius: 6, padding: "6px 10px", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
                              >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                {isExpanded ? "Hide" : "View"} Plan
                              </button>
                            </>
                          )}
                          <button
                            style={{ padding: "8px 14px", borderRadius: 99, border: "1px solid var(--glass-border)", background: "var(--glass-bg)", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, opacity: planGenerating === rep.rep_id ? 0.6 : 1 }}
                            disabled={planGenerating === rep.rep_id}
                            onClick={() => handleGeneratePlan(rep.rep_id)}
                          >
                            <Play size={12} />
                            {planGenerating === rep.rep_id ? "Generating..." : plan ? "Regenerate Plan" : "Generate Plan"}
                          </button>
                        </div>
                      </div>

                      {/* Plan day-by-day breakdown */}
                      {plan && isExpanded && (
                        <div style={{ marginTop: 4 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                            {["monday","tuesday","wednesday","thursday","friday"].map(day => {
                              const outlets = plan.daily_split?.[day] || [];
                              return (
                                <div key={day} style={{ background: "var(--glass-bg)", borderRadius: 10, border: "1px solid var(--glass-border)", padding: "12px 14px" }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-primary)", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                                    <Clock size={11} /> {day}
                                    <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)", fontWeight: 400 }}>{outlets.length} visits</span>
                                  </div>
                                  {outlets.length === 0 ? (
                                    <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>No visits</div>
                                  ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                      {outlets.map((o, i) => (
                                        <div key={o.id || i} style={{ fontSize: 12 }}>
                                          <div style={{ fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>{o.name || `Outlet #${o.id}`}</div>
                                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                                            <span style={{
                                              fontSize: 10, padding: "1px 7px", borderRadius: 99, fontWeight: 700,
                                              background: o.label === "HIGH" ? "rgba(239,68,68,0.1)" : o.label === "MEDIUM" ? "rgba(245,158,11,0.1)" : "var(--color-primary-dim)",
                                              color: o.label === "HIGH" ? "#ef4444" : o.label === "MEDIUM" ? "var(--color-warning)" : "var(--color-primary)",
                                            }}>{o.label}</span>
                                            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{o.score}/100</span>
                                          </div>
                                          {o.reasons?.[0] && (
                                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.4 }}>{o.reasons[0]}</div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
                            {plan.total_outlets || "—"} outlets assigned · Mon–Tue: top priority · Wed: mid · Thu–Fri: remaining
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── WEEKLY LEARNING TAB ── */}
        {tab === "learning" && (
          <div>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, fontFamily: "var(--font-heading)", display: "flex", alignItems: "center", gap: 8 }}>
                  <BarChart2 size={18} color="var(--color-primary)" /> Weekly Outcome Learning
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                  {weeklyStats ? `${weeklyStats.week_label} · ${weeklyStats.total_visits} visits analysed` : "Loading weekly data..."}
                </p>
              </div>
              <button
                id="run-weekly-learning-btn"
                className="btn-primary"
                style={{ width: "auto", padding: "10px 18px", fontSize: 12, opacity: learningLoading ? 0.7 : 1 }}
                disabled={learningLoading}
                onClick={async () => {
                  setLearningLoading(true);
                  setWeeklyLearning(null);
                  try {
                    const dist  = user?.district || "Jalgaon";
                    const state = user?.state    || "Maharashtra";
                    const data  = await api.getWeeklyLearning(dist, state);
                    setWeeklyLearning(data);
                  } catch (e) { console.error(e); }
                  finally { setLearningLoading(false); }
                }}
              >
                <BookOpen size={13} style={{ marginRight: 5, verticalAlign: "-1px" }} />
                {learningLoading ? "Analysing..." : "Run AI Analysis"}
              </button>
            </div>

            {/* Conversion KPI strip */}
            {weeklyStats && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Total Visits",     value: weeklyStats.total_visits,       color: "var(--color-primary)" },
                  { label: "Sales Rate",       value: `${weeklyStats.sales_pct}%`,    color: "var(--color-success, #22c55e)" },
                  { label: "Orders Rate",      value: `${weeklyStats.orders_pct}%`,   color: "var(--color-warning)" },
                  { label: "No Outcome",       value: `${weeklyStats.no_outcome_pct}%`, color: weeklyStats.no_outcome_pct > 40 ? "#ef4444" : "var(--text-muted)" },
                  { label: "vs Last Week",     value: weeklyStats.delta,              color: String(weeklyStats.delta).startsWith("+") ? "var(--color-success, #22c55e)" : "#ef4444" },
                ].map((c, i) => (
                  <div key={i} className="glass-card-strong" style={{ padding: "14px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-heading)", color: c.color }}>{c.value}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>{c.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Product pitch table */}
            {weeklyStats?.product_rows?.length > 0 && (
              <div className="glass-card" style={{ marginBottom: 16 }}>
                <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Products Pitched vs Accepted</p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                        {["Product", "Pitched", "Accepted", "Rate"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyStats.product_rows.map((r, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                          <td style={{ padding: "10px", fontWeight: 600 }}>{r.product}</td>
                          <td style={{ padding: "10px", color: "var(--text-secondary)" }}>{r.pitched}</td>
                          <td style={{ padding: "10px", color: "var(--color-primary)" }}>{r.accepted}</td>
                          <td style={{ padding: "10px" }}>
                            <span style={{
                              padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                              background: r.rate >= 40 ? "rgba(34,197,94,0.1)" : r.rate >= 20 ? "var(--color-primary-dim)" : "rgba(239,68,68,0.1)",
                              color:      r.rate >= 40 ? "#22c55e"              : r.rate >= 20 ? "var(--color-primary)"   : "#ef4444"
                            }}>{r.rate}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* AI Analysis panel */}
            {weeklyLearning && (
              <div style={{ display: "grid", gap: 14, animation: "toastIn 0.3s ease forwards" }}>

                {/* Manager Alert */}
                {weeklyLearning.manager_alert && (
                  <div className="glass-card" style={{ borderLeft: "3px solid var(--color-warning)", display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <AlertTriangle size={16} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-warning)", marginBottom: 4 }}>Manager Alert</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{weeklyLearning.manager_alert}</div>
                    </div>
                  </div>
                )}

                {/* Insight + Action row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div className="glass-card">
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 8 }}>Insight Summary</div>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{weeklyLearning.insight_summary}</p>
                  </div>
                  <div className="glass-card" style={{ borderLeft: "3px solid var(--color-primary)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-primary)", marginBottom: 8 }}>Learning Action</div>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6, fontWeight: 500 }}>{weeklyLearning.learning_action}</p>
                  </div>
                </div>

                {/* Best product + Reps coaching row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div className="glass-card">
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <Award size={14} color="var(--color-primary)" />
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Best Product Next Week</span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-primary)", fontFamily: "var(--font-heading)", marginBottom: 6 }}>{weeklyLearning.best_product_next_week}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{weeklyLearning.best_product_reason}</div>
                  </div>

                  <div className="glass-card">
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: weeklyLearning.reps_needing_coaching?.length > 0 ? "#ef4444" : "var(--text-muted)", marginBottom: 8 }}>
                      Reps Needing Coaching ({weeklyLearning.reps_needing_coaching?.length || 0})
                    </div>
                    {weeklyLearning.reps_needing_coaching?.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {weeklyLearning.reps_needing_coaching.map(r => (
                          <span key={r} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", fontFamily: "monospace" }}>{r}</span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-primary)" }}>
                        <CheckCircle size={14} /> All reps above 30% threshold
                      </div>
                    )}
                  </div>
                </div>

                {/* Source badge */}
                <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "right" }}>via {weeklyLearning.source}</div>
              </div>
            )}

            {!weeklyStats && (
              <div className="glass-card" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
                <BarChart2 size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
                <div>Loading weekly stats...</div>
              </div>
            )}
          </div>
        )}

        {/* ── AI STATUS TAB ── */}
        {tab === "model" && (
          <div>
            <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600, fontFamily: "var(--font-heading)", display: "flex", alignItems: "center", gap: 8 }}>
              <Cpu size={20} color="var(--color-primary)" /> AI Model Status
            </h2>
            {modelInfo ? (
              <div style={{ display: "grid", gap: 14 }}>
                <div className="glass-card-strong" style={{ borderLeft: `3px solid ${modelInfo.status === "ok" ? "var(--color-primary)" : "var(--color-urgent)"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <Zap size={20} className="ai-pulse" color="var(--color-primary)" />
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                      {modelInfo.status === "ok" ? "CatBoost Model Running" : "Model Unavailable"}
                    </h3>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                    {[
                      { label: "Status", value: modelInfo.status === "ok" ? "Live" : "Error" },
                      { label: "AUC Score", value: modelInfo.auc || "0.7869" },
                      { label: "Training Samples", value: (modelInfo.training_samples || 23862).toLocaleString() },
                      { label: "Feature Count", value: modelInfo.feature_count || 28 },
                      { label: "Test Prediction", value: modelInfo.test_prediction?.toFixed(4) || "—" },
                      { label: "Inference Time", value: modelInfo.inference_ms ? `${modelInfo.inference_ms}ms` : "—" },
                    ].map(stat => (
                      <div key={stat.label} style={{ padding: 12, background: "var(--glass-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)" }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>{stat.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>
                  <p style={{ margin: "16px 0 0", fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic" }}>
                    {modelInfo.message}
                  </p>
                </div>
              </div>
            ) : (
              <div className="glass-card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                <Cpu size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
                <div>Loading model status...</div>
              </div>
            )}
          </div>
        )}

        {/* ── TERRITORY HEATMAP TAB ── */}
        {tab === "heatmap" && (
          <div>
            <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600, fontFamily: "var(--font-heading)", display: "flex", alignItems: "center", gap: 8 }}>
              <Map size={18} /> Territory Alert Heatmap
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-secondary)" }}>Retail coverage across your territory</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {[
                { name: "Jalgaon", severity: "urgent", count: 3 },
                { name: "Amalner", severity: "warning", count: 2 },
                { name: "Dharangaon", severity: "primary", count: 1 },
                { name: "Bhusawal", severity: "primary", count: 1 },
                { name: "Pachora", severity: "success", count: 0 },
                { name: "Erandol", severity: "success", count: 0 },
              ].map(dist => (
                <div key={dist.name} style={{
                  padding: "14px 20px", borderRadius: 14,
                  background: `var(--color-${dist.severity}-dim)`,
                  border: `1px solid var(--color-${dist.severity}, var(--color-primary))`,
                  color: `var(--color-${dist.severity}, var(--color-primary))`,
                  fontWeight: 700, fontSize: 15, minWidth: 120, textAlign: "center"
                }}>
                  <div>{dist.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 400, marginTop: 4 }}>
                    {dist.count > 0 ? `${dist.count} alert${dist.count > 1 ? "s" : ""}` : "No alerts"}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              {[["urgent", "High alert"], ["warning", "Medium alert"], ["primary", "Low alert"], ["success", "Clear"]].map(([sev, label]) => (
                <div key={sev} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: `var(--color-${sev}, var(--color-primary))` }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
          <button
            onClick={() => { api.recalibrate(); showToast("Recalibration triggered"); }}
            style={{ padding: "11px 18px", borderRadius: 99, border: "1px solid var(--glass-border)", background: "var(--glass-bg)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)", display: "flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={14} /> Trigger Recalibration
          </button>
          <button style={{ padding: "11px 18px", borderRadius: 99, border: "1px solid var(--glass-border)", background: "var(--glass-bg)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)", display: "flex", alignItems: "center", gap: 6 }}>
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* ── ADD RETAILER MODAL ── */}
      <Modal open={addRetailerOpen} onClose={() => setAddRetailerOpen(false)} title="Add Retailer">
        <form onSubmit={handleAddRetailer}>
          <InputField label="Retailer Name *" id="r-name" required placeholder="e.g. Sharma Krishi Kendra" value={newRetailer.retailer_name} onChange={e => setNewRetailer(p => ({ ...p, retailer_name: e.target.value }))} />
          <InputField label="Contact Name" id="r-contact" placeholder="Owner's name" value={newRetailer.contact_name} onChange={e => setNewRetailer(p => ({ ...p, contact_name: e.target.value }))} />
          <InputField label="Phone" id="r-phone" placeholder="Mobile number" value={newRetailer.phone} onChange={e => setNewRetailer(p => ({ ...p, phone: e.target.value }))} />
          <InputField label="Tehsil *" id="r-tehsil" required placeholder="e.g. Jalgaon" value={newRetailer.tehsil} onChange={e => setNewRetailer(p => ({ ...p, tehsil: e.target.value }))} />
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 16px" }}>District and state will be auto-filled from your profile.</p>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Add Retailer"}</button>
        </form>
      </Modal>

      {/* ── ADD REP MODAL ── */}
      <Modal open={addRepOpen} onClose={() => setAddRepOpen(false)} title="Add Field Rep">
        <form onSubmit={handleAddRep}>
          <InputField label="Full Name *" id="rep-name" required placeholder="Rep's full name" value={newRep.name} onChange={e => setNewRep(p => ({ ...p, name: e.target.value }))} />
          <InputField label="Email *" id="rep-email" type="email" required placeholder="rep@syngenta.com" value={newRep.email} onChange={e => setNewRep(p => ({ ...p, email: e.target.value }))} />
          <InputField label="Rep ID *" id="rep-id" required placeholder="e.g. REP_0204" value={newRep.rep_id} onChange={e => setNewRep(p => ({ ...p, rep_id: e.target.value }))} />
          <InputField label="Temporary Password *" id="rep-pw" type="text" required placeholder="Min 6 characters" value={newRep.password} onChange={e => setNewRep(p => ({ ...p, password: e.target.value }))} />
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 16px" }}>Share these credentials with the rep. They can change password after first login.</p>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Creating…" : "Create Rep Account"}</button>
        </form>
      </Modal>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 82, left: "50%", transform: "translateX(-50%)", background: "var(--glass-bg-strong)", backdropFilter: "blur(12px)", borderRadius: 99, padding: "12px 24px", fontSize: 14, zIndex: 9999, animation: "toastIn 0.25s ease forwards", whiteSpace: "nowrap", border: "1px solid var(--color-primary-dim)", color: "var(--color-primary)" }}>
          <CheckCircle size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
          {toast}
        </div>
      )}
    </div>
  );
}

export default Manager;
