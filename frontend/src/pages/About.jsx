import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Zap, AlertTriangle, RefreshCw, Leaf, Trophy, ChevronLeft } from "lucide-react";
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
