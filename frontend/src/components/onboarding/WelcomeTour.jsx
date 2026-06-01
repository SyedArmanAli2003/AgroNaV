import React, { useState, useEffect, useRef } from "react";
import { X, ChevronRight, Leaf } from "lucide-react";

// sessionStorage key so the tour resets every browser session (shows once per login)
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

// Spotlight retries finding the element for up to 3s so it works even after
// async data loads (recommendation cards appear after the fetch completes).
function Spotlight({ selector }) {
  const [rect, setRect] = useState(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!selector) { setRect(null); return; }
    attemptsRef.current = 0;

    const tryFind = () => {
      attemptsRef.current += 1;
      const el = document.querySelector(selector);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 });
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return true;
      }
      return false;
    };

    if (!tryFind() && attemptsRef.current < 12) {
      // Retry every 500ms up to ~6s total to handle async-loaded cards
      const id = setInterval(() => {
        if (tryFind() || attemptsRef.current >= 12) clearInterval(id);
      }, 500);
      return () => clearInterval(id);
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
    // Use sessionStorage so tour resets each browser session / fresh login
    const done = sessionStorage.getItem(TOUR_KEY);
    if (!done) {
      // Delay start: give recommendation cards time to render after data fetch
      const id = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(id);
    }
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(TOUR_KEY, "true");
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
      {/* Lightweight semi-transparent overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1050,
        background: "rgba(0,0,0,0.35)",
      }} onClick={dismiss} />

      {/* Spotlight ring — retries until element is in DOM */}
      {current.highlight && <Spotlight selector={current.highlight} />}

      {/* Compact hint card */}
      <div style={{
        position: "fixed",
        bottom: 100,
        right: 24,
        zIndex: 1200,
        width: "min(88vw, 360px)",
        background: "rgba(10,20,15,0.97)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(29,158,117,0.3)",
        borderRadius: 16,
        padding: "18px 20px 16px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(29,158,117,0.15)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Leaf size={13} color="var(--color-primary)" />
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Quick Tour · {step + 1}/{steps.length}
            </span>
          </div>
          <button onClick={dismiss} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2, lineHeight: 1 }}>
            <X size={15} />
          </button>
        </div>

        <h3 style={{ margin: "0 0 6px", fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
          {current.title}
        </h3>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          {current.body}
        </p>

        {/* Progress bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              height: 3, flex: i === step ? 2 : 1, borderRadius: 99,
              background: i <= step ? "var(--color-primary)" : "rgba(255,255,255,0.1)",
              transition: "all 0.3s ease"
            }} />
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={dismiss} style={{ background: "none", border: "none", fontSize: 12, color: "var(--text-muted)", cursor: "pointer", padding: 0 }}>
            Skip
          </button>
          <button
            onClick={next}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "var(--color-primary)", border: "none", borderRadius: 8,
              padding: "8px 16px", fontSize: 13, fontWeight: 600,
              color: "#fff", cursor: "pointer"
            }}
          >
            {current.cta} {step < steps.length - 1 && <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </>
  );
}

export default WelcomeTour;
export { TOUR_KEY };
