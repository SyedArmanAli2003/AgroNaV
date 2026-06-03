import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Zap, AlertTriangle, RefreshCw, Leaf, Trophy, ChevronLeft, Smartphone, Wifi, Download } from "lucide-react";
import "../css/landing.css";
import "../css/app.css";

const TRACK2_FEATURES = [
  { Icon: MapPin, color: "var(--color-primary, #1D9E75)", title: "Dynamic Prioritization", desc: "AgroNav ranks every retailer in your territory each morning using a CatBoost model trained on 30,000 real field visits. Visit the right shops, in the right order, before you leave home." },
  { Icon: Zap, color: "#FFD166", title: "Next Best Action", desc: "At every outlet, the app tells you which product to recommend, what agronomic advice to give, and what promotion to offer — powered by Gemini AI from live inventory, crop stage, and pest alerts." },
  { Icon: AlertTriangle, color: "var(--color-urgent, #ef4444)", title: "Anomaly Detection", desc: "Z-score analysis on sales velocity and inventory data detects demand spikes, stock-out risks, and pest outbreak windows — pushed as actionable alerts before they become missed opportunities." },
  { Icon: RefreshCw, color: "var(--color-success, #22c55e)", title: "Outcome Learning", desc: "Every visit outcome — Sale, Interested, or Rejected — feeds back into next week's recommendations. The system gets measurably smarter with every field day." }
];

const TECH_STACK = ["CatBoost (AUC 0.79)", "SHAP TreeExplainer", "FastAPI", "React PWA", "Gemini AI", "SQLite", "Optuna", "scikit-learn"];

function About() {
  const navigate = useNavigate();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div style={{ background: "var(--bg-base, #0f1a14)", minHeight: "100vh", color: "var(--text-primary)", fontFamily: "var(--font-body, 'Inter', sans-serif)" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", padding: "72px 24px 48px", background: "linear-gradient(180deg, rgba(29,158,117,0.08) 0%, transparent 100%)" }}>
        <Leaf size={48} color="var(--color-primary)" style={{ marginBottom: 12 }} />
        <h1 style={{ margin: "0 0 12px", fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 700, fontFamily: "var(--font-heading)" }}>AgroNav</h1>
        <p style={{ margin: "0 0 28px", fontSize: 17, color: "var(--text-secondary)", maxWidth: 480, marginInline: "auto" }}>AI Field Intelligence for Syngenta</p>
        <button onClick={() => navigate("/")} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 99, padding: "10px 24px", color: "var(--text-primary)", cursor: "pointer", fontSize: 14, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ChevronLeft size={16} /> Back to Home
        </button>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 80px" }}>
        {/* The Problem */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, fontFamily: "var(--font-heading)" }}>The Problem</h2>
          <div className="glass-card" style={{ lineHeight: 1.8, color: "var(--text-secondary)", fontSize: 15 }}>
            Syngenta reps in rural India make daily visit decisions based on habit and experience — with no data on which retailers need attention, no context for what to recommend, and no signal when opportunities arise. The agricultural context changes constantly: pest outbreaks, rainfall shifts, inventory gaps, and competitor moves require daily recalibration that humans cannot do manually.
          </div>
        </section>

        {/* Our Solution */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, fontFamily: "var(--font-heading)" }}>Our Solution</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {TRACK2_FEATURES.map(f => {
              const Icon = f.Icon;
              return (
                <div key={f.title} className="glass-card" style={{ borderTop: "2px solid rgba(29,158,117,0.4)" }}>
                  <Icon size={28} color={f.color} style={{ marginBottom: 10 }} />
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, fontFamily: "var(--font-heading)" }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* The Model */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, fontFamily: "var(--font-heading)" }}>The Model</h2>
          <div className="glass-card" style={{ lineHeight: 1.8, color: "var(--text-secondary)", fontSize: 15 }}>
            <p style={{ margin: "0 0 16px" }}>AgroNav uses a <strong style={{ color: "var(--text-primary)" }}>CatBoost binary classifier</strong> with a test AUC of <strong style={{ color: "var(--color-success)" }}>0.7869</strong>, trained on <strong style={{ color: "var(--text-primary)" }}>23,862 real field visit records</strong> from the Rabi 2025–26 season.</p>
            <p style={{ margin: 0 }}><strong style={{ color: "var(--text-primary)" }}>SHAP values</strong> generate plain-language reasons for every recommendation.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 16 }}>
            {[{ val: "0.79", sub: "AUC Score" }, { val: "28", sub: "Feature Inputs" }, { val: "23.8K", sub: "Training Records" }, { val: "4", sub: "AI Layers" }].map(stat => (
              <div key={stat.sub} className="glass-card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-success)" }}>{stat.val}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", marginTop: 4 }}>{stat.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Tech stack */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, fontFamily: "var(--font-heading)" }}>Tech Stack</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {TECH_STACK.map(tech => (
              <span key={tech} style={{ background: "var(--glass-bg-strong)", border: "1px solid var(--glass-border)", borderRadius: 99, padding: "8px 18px", fontSize: 13, color: "var(--text-secondary)" }}>{tech}</span>
            ))}
          </div>
        </section>

        {/* Built for Rural India — rural access section (TASK 10) */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, fontFamily: "var(--font-heading)" }}>
            Built for Rural India
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {[
              {
                icon: "📵",
                title: "Works Offline in Zero-Signal Areas",
                desc: "Visit plans and outlet data are cached on the device. Log your visits offline — they sync automatically when you get signal.",
              },
              {
                icon: "📶",
                title: "Smart on 2G/3G",
                desc: "Detects slow connections automatically. Loads a lite version using 90% less data — no weather maps, no heavy NBA calls.",
              },
              {
                icon: "📲",
                title: "Install on Your Phone",
                desc: "Add to home screen — works like a native app without an app store download. Opens in seconds even from a weak connection.",
              },
              {
                icon: "💬",
                title: "Share via WhatsApp",
                desc: "Send today's visit plan to your manager in one tap. Field reps in rural India live on WhatsApp — so does AgroNav.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="glass-card"
                style={{ borderTop: "2px solid rgba(29,158,117,0.4)" }}
              >
                <div style={{ fontSize: 28, marginBottom: 10 }}>{card.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, fontFamily: "var(--font-heading)" }}>
                  {card.title}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  {card.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Works on any device — mobile story (TASK 7) */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, fontFamily: "var(--font-heading)" }}>Works on any device</h2>
          <div style={{
            display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap",
            justifyContent: "center"
          }}>
            {/* CSS phone frame */}
            <div style={{
              width: 200, height: 410, flexShrink: 0,
              borderRadius: 34, padding: 10,
              background: "linear-gradient(160deg, #1a2a20, #0c140e)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
              position: "relative",
            }}>
              {/* notch */}
              <div style={{
                position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)",
                width: 70, height: 18, borderRadius: 99, background: "#000", zIndex: 2,
              }} />
              {/* screen */}
              <div style={{
                width: "100%", height: "100%", borderRadius: 26, overflow: "hidden",
                background: "radial-gradient(ellipse at 80% 0%, rgba(29,158,117,0.18), transparent 55%), #0f1a14",
                display: "flex", flexDirection: "column", padding: "30px 14px 14px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                  <Leaf size={16} color="var(--color-primary)" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>AgroNav</span>
                </div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Today's Priority</div>
                {/* mock cards */}
                {[
                  { n: "Krishi Suppliers", s: 91, c: "#ef4444" },
                  { n: "Bharat Kendra", s: 84, c: "#f59e0b" },
                  { n: "Green Field Agro", s: 67, c: "#22c55e" },
                ].map(card => (
                  <div key={card.n} style={{
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10, padding: "8px 10px", marginBottom: 8,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>{card.n}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: card.c }}>{card.s}%</span>
                  </div>
                ))}
                <div style={{ marginTop: "auto", height: 34, borderRadius: 99, background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                  View Route →
                </div>
              </div>
            </div>

            {/* Feature points */}
            <div style={{ flex: "1 1 280px", maxWidth: 380, display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { Icon: Download, title: "Install on Android or iOS", desc: "Add to home screen — no app store needed. One tap to install." },
                { Icon: Zap, title: "Loads instantly", desc: "Opens straight from your home screen like a native app." },
                { Icon: Wifi, title: "Works offline", desc: "Cached recommendations keep working in low- or no-signal field areas." },
              ].map(f => {
                const Icon = f.Icon;
                return (
                  <div key={f.title} className="glass-card" style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: 16 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: "rgba(29,158,117,0.15)", border: "1px solid rgba(29,158,117,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon size={18} color="var(--color-primary)" />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-heading)", marginBottom: 4 }}>{f.title}</div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>{f.desc}</div>
                    </div>
                  </div>
                );
              })}
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                <Smartphone size={14} color="var(--color-primary)" />
                Progressive Web App · installable · offline-first
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section style={{ textAlign: "center" }}>
          <div className="glass-card" style={{ display: "inline-block", padding: "24px 40px" }}>
            <Trophy size={32} color="var(--color-primary)" style={{ marginBottom: 8 }} />
            <div style={{ fontWeight: 700, fontSize: 16, fontFamily: "var(--font-heading)" }}>Built for IITM Syngenta Hackathon 2026</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>AgroNav Team · Track 2: AI-Guided Field Force Intelligence</div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default About;
