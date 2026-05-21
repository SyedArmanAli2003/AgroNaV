import React, { useState, useEffect } from "react";
import { X, ChevronRight, Leaf } from "lucide-react";

const TOUR_KEY = "agronav_tour_done";

const REP_STEPS = [
  {
    title: "Welcome to AgroNav",
    body: "You're now part of Syngenta's AI-powered field force. Let me show you how this works in 4 quick steps.",
    highlight: null,
    cta: "Let's go →"
  },
  {
    title: "Your #1 Priority Visit",
    body: "This is your top-ranked retailer today. The AI analyzed every retailer in your territory overnight and ranked this one highest — it has the highest predicted conversion probability.",
    highlight: ".shop-card",
    cta: "Got it →"
  },
  {
    title: "The Priority Score",
    body: "This score comes from a CatBoost ML model trained on 23,862 real Syngenta field visits. Red = urgent (visit today), Orange = important, Green = routine.",
    highlight: ".priority-pill",
    cta: "Got it →"
  },
  {
    title: "SHAP Reasons",
    body: "These are the REAL reasons the AI chose this retailer — not guesses. Actual signals from inventory, sales data, and local pest alerts.",
    highlight: ".reasons-list",
    cta: "Got it →"
  },
  {
    title: "Log Every Visit",
    body: "After each visit, tap 'Mark as Visited' and log the outcome in 4 taps. Your logs train next week's model — the more you log, the smarter your recommendations get.",
    highlight: "button.hover-scale",
    cta: "Start planning my day!"
  }
];

const MANAGER_STEPS = [
  {
    title: "Welcome, Manager!",
    body: "Before your reps see any data, you need to set up your territory. It takes about 5 minutes.",
    highlight: null,
    cta: "Show me →"
  },
  {
    title: "Step 1: Add Retailers",
    body: "Go to Manager Portal → Retailers → Add Retailer. Without retailers added, your reps see an empty app. Add all shops in your territory (typically 8–15).",
    highlight: null,
    cta: "Understood →"
  },
  {
    title: "Step 2: Add Your Reps",
    body: "Go to Manager Portal → My Team → Add Rep. Once you add reps and assign territory, their dashboard will show the AI daily plan.",
    highlight: null,
    cta: "Let's do it!"
  }
];

function Spotlight({ selector }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!selector) return;
    const el = document.querySelector(selector);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 });
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selector]);

  if (!rect) return null;
  return (
    <div style={{
      position: "fixed",
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      borderRadius: 12,
      boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
      zIndex: 1100,
      pointerEvents: "none",
      border: "2px solid var(--color-primary)",
      animation: "pulse-glow 2s ease-in-out infinite"
    }} />
  );
}

function WelcomeTour({ userRole = "rep" }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  const steps = userRole === "manager" ? MANAGER_STEPS : REP_STEPS;

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) {
      // Small delay so the dashboard has time to render
      setTimeout(() => setVisible(true), 800);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, "true");
    setVisible(false);
  };

  const next = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const current = steps[step];

  return (
    <>
      {/* Dim overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1050,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: step === 0 ? "blur(4px)" : "none"
      }} onClick={dismiss} />

      {/* Spotlight ring */}
      {current.highlight && <Spotlight selector={current.highlight} />}

      {/* Tooltip card */}
      <div style={{
        position: "fixed",
        bottom: 100,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1200,
        width: "min(90vw, 440px)",
        background: "rgba(10,20,15,0.96)",
        backdropFilter: "blur(24px)",
        border: "1px solid var(--glass-border-strong)",
        borderRadius: 20,
        padding: "24px 24px 20px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(29,158,117,0.2)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Leaf size={16} color="var(--color-primary)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              AgroNav Tour {step + 1}/{steps.length}
            </span>
          </div>
          <button onClick={dismiss} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }}>
            <X size={18} />
          </button>
        </div>

        <h3 style={{ margin: "0 0 10px", fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
          {current.title}
        </h3>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65 }}>
          {current.body}
        </p>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 5, marginBottom: 16 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              height: 4, flex: i === step ? 2 : 1,
              borderRadius: 99,
              background: i <= step ? "var(--color-primary)" : "var(--glass-border)",
              transition: "all 0.3s ease"
            }} />
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={next}
          className="btn-primary"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", fontSize: 14 }}
        >
          {current.cta} {step < steps.length - 1 && <ChevronRight size={16} />}
        </button>

        <button onClick={dismiss} style={{ display: "block", margin: "10px auto 0", background: "none", border: "none", fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>
          Skip tour
        </button>
      </div>
    </>
  );
}

export default WelcomeTour;
export { TOUR_KEY };
