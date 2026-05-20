import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../css/landing.css";
import "../css/app.css";

const TRACK2_FEATURES = [
  {
    icon: "📍",
    title: "Dynamic Prioritization",
    desc: "AgroNav ranks every retailer in your territory each morning using a CatBoost model trained on 30,000 real field visits. Visit the right shops, in the right order, before you leave home."
  },
  {
    icon: "💡",
    title: "Next Best Action",
    desc: "At every outlet, the app tells you which product to recommend, what agronomic advice to give, and what promotion to offer — powered by Gemini AI from live inventory, crop stage, and pest alerts."
  },
  {
    icon: "⚠️",
    title: "Anomaly Detection",
    desc: "Z-score analysis on sales velocity and inventory data detects demand spikes, stock-out risks, and pest outbreak windows — pushed as actionable alerts before they become missed opportunities."
  },
  {
    icon: "🔄",
    title: "Outcome Learning",
    desc: "Every visit outcome — Sale, Interested, or Rejected — feeds back into next week's recommendations. The system gets measurably smarter with every field day."
  }
];

const TECH_STACK = [
  "CatBoost (AUC 0.79)", "SHAP TreeExplainer", "FastAPI", "React PWA",
  "Gemini AI", "SQLite", "Optuna", "scikit-learn"
];

function About() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ background: "#050a08", minHeight: "100vh", color: "var(--text-primary)", fontFamily: "'Outfit','Inter',sans-serif" }}>

      {/* Hero */}
      <div style={{
        textAlign: "center", padding: "72px 24px 48px",
        background: "linear-gradient(180deg, rgba(29,158,117,0.08) 0%, transparent 100%)"
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
        <h1 style={{ margin: "0 0 12px", fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 800 }}>
          AgroNav
        </h1>
        <p style={{ margin: "0 0 28px", fontSize: 17, color: "var(--text-secondary)", maxWidth: 480, marginInline: "auto" }}>
          AI Field Intelligence for Syngenta
        </p>
        <button
          onClick={() => navigate("/")}
          style={{
            background: "var(--glass-light-bg)", border: "1px solid var(--glass-border, rgba(255,255,255,0.12))",
            borderRadius: 99, padding: "10px 24px", color: "var(--text-primary)",
            cursor: "pointer", fontSize: 14, fontFamily: "inherit"
          }}
        >
          ← Back to Home
        </button>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 80px" }}>

        {/* The Problem */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
            The Problem
          </h2>
          <div className="glass-card" style={{ lineHeight: 1.8, color: "var(--text-secondary)", fontSize: 15 }}>
            Syngenta reps in rural India make daily visit decisions based on habit and experience — with no data on which retailers need attention, no context for what to recommend, and no signal when opportunities arise. The agricultural context changes constantly: pest outbreaks, rainfall shifts, inventory gaps, and competitor moves require daily recalibration that humans cannot do manually.
          </div>
        </section>

        {/* 4 Track 2 features */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>
            Our Solution
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {TRACK2_FEATURES.map(f => (
              <div key={f.title} className="glass-card" style={{ borderTop: "2px solid rgba(29,158,117,0.4)" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* The Model */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
            The Model
          </h2>
          <div className="glass-card" style={{ lineHeight: 1.8, color: "var(--text-secondary)", fontSize: 15 }}>
            <p style={{ margin: "0 0 16px" }}>
              AgroNav uses a <strong style={{ color: "var(--text-primary)" }}>CatBoost binary classifier</strong> with a test AUC of <strong style={{ color: "#22c55e" }}>0.7869</strong>, trained on <strong style={{ color: "var(--text-primary)" }}>23,862 real field visit records</strong> from the Rabi 2025–26 season. The model takes 28 inputs — covering inventory, crop calendar, visit history, pest alerts, and sales velocity — and outputs the probability that a visit will lead to a sale within 7 days.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "var(--text-primary)" }}>SHAP values</strong> generate plain-language reasons for every recommendation. Model training, feature engineering, and weekly retraining are owned by the ML team.
            </p>
          </div>

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 16 }}>
            {[
              { val: "0.79", sub: "AUC Score" },
              { val: "28", sub: "Feature Inputs" },
              { val: "23.8K", sub: "Training Records" },
              { val: "4", sub: "AI Layers" }
            ].map(stat => (
              <div key={stat.sub} className="glass-card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#22c55e" }}>{stat.val}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", marginTop: 4 }}>{stat.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Tech stack */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
            Tech Stack
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {TECH_STACK.map(tech => (
              <span key={tech} style={{
                background: "var(--glass-strong-bg)",
                border: "1px solid var(--glass-border, rgba(255,255,255,0.12))",
                borderRadius: 99, padding: "8px 18px",
                fontSize: 13, color: "var(--text-secondary)"
              }}>
                {tech}
              </span>
            ))}
          </div>
        </section>

        {/* Team */}
        <section style={{ textAlign: "center" }}>
          <div className="glass-card" style={{ display: "inline-block", padding: "24px 40px" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>Built for IITM Syngenta Hackathon 2026</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>AgroNav Team · Track 2: AI-Guided Field Force Intelligence</div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default About;
