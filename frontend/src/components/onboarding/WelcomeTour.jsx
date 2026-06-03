import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, ChevronLeft, Zap, Store, BarChart2, FileText, CheckCircle } from "lucide-react";

// sessionStorage key — tour resets each browser session / fresh login
const TOUR_KEY = "agronav_tour_done";

// ── Inject keyframes once ────────────────────────────────────────────────────
const STYLE_ID = "agronav-tour-styles";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes tourDropIn {
      from { opacity: 0; transform: translateY(-10px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes tourRingPulse {
      0%,100% { box-shadow: 0 0 0 3px rgba(29,158,117,0.6), 0 0 0 7px rgba(29,158,117,0.2); }
      50%      { box-shadow: 0 0 0 5px rgba(29,158,117,0.8), 0 0 0 14px rgba(29,158,117,0.1); }
    }
    .tour-card-enter { animation: tourDropIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both; }
    .tour-ring       { animation: tourRingPulse 1.8s ease-in-out infinite; }
  `;
  document.head.appendChild(s);
}

// ── Helper: find a tour target element ──────────────────────────────────────
// data-tour attributes are unique per page, so we can use querySelector directly.
// Falls back to class-based scoped query for the .shop-card step.
function getScopedElement(sel) {
  if (!sel) return null;
  // For the full-card highlight, find first shop-card
  if (sel === ".shop-card") return document.querySelector(".shop-card");
  // All other steps use data-tour attributes (unique on page)
  return document.querySelector(sel);
}

// ── Step definitions ─────────────────────────────────────────────────────────
const REP_STEPS = [
  {
    id: "welcome",
    icon: Zap,
    label: "Welcome",
    title: "Welcome to AgroNav",
    body: "Your AI-powered field sales companion. Every day, the model ranks your territory's retailers by conversion probability so you always visit the highest-value outlet first.",
    hint: null,
    highlight: null,
    cta: "Show me around",
  },
  {
    id: "card",
    icon: Store,
    label: "Priority Card",
    title: "Your #1 Visit Today",
    body: "This card is your top-ranked retailer. CatBoost scored it using inventory levels, days since last visit, crop stage, weather, and pest alerts — all live data.",
    hint: "Tap the card to open the full visit brief.",
    highlight: ".shop-card",
    cta: "Next",
  },
  {
    id: "score",
    icon: BarChart2,
    label: "AI Score",
    title: "What the Score Means",
    body: "Red 80%+ = visit today. Orange 60-80% = visit this week. Green = routine. The score is from a CatBoost model trained on 23,862 real Syngenta field visits (AUC 0.79).",
    hint: null,
    highlight: "[data-tour='priority-pill']",
    cta: "Next",
  },
  {
    id: "reasons",
    icon: FileText,
    label: "SHAP Reasons",
    title: "Why This Retailer?",
    body: "These three signals are the exact SHAP features that pushed this retailer to the top — not guesses. Inventory data, visit cadence, pest alerts, and live weather.",
    hint: null,
    highlight: "[data-tour='reasons-list']",
    cta: "Next",
  },
  {
    id: "log",
    icon: CheckCircle,
    label: "Log Visit",
    title: "Log Every Visit",
    body: 'Tap "Mark Visited" after each call and log the outcome in 4 taps. Your feedback directly trains next week\'s recommendations — the model learns from you.',
    hint: "Try tapping the button now!",
    highlight: "[data-tour='mark-visited']",
    cta: "Got it!",
  },
];

const MANAGER_STEPS = [
  {
    id: "welcome",
    icon: Zap,
    label: "Welcome",
    title: "Welcome, Manager!",
    body: "Your portal lets you add retailers, manage reps, generate weekly visit plans, and see live territory KPIs — all powered by real Syngenta field data.",
    hint: null,
    highlight: null,
    cta: "Show me around",
  },
  {
    id: "retailers",
    icon: Store,
    label: "Retailers",
    title: "Step 1 — Add Retailers",
    body: "Go to Portal → Retailers → Add Retailer. Without retailers configured, your reps will see an empty dashboard. Aim for 8–15 shops per territory.",
    hint: null,
    highlight: null,
    cta: "Understood",
  },
  {
    id: "reps",
    icon: CheckCircle,
    label: "Reps",
    title: "Step 2 — Add Your Reps",
    body: "Portal → My Team → Add Rep. Once reps are assigned to a territory the AI starts generating daily priority lists for them automatically.",
    hint: null,
    highlight: null,
    cta: "Let's go!",
  },
];

// ── Overlay: four semi-transparent panels framing the spotlight hole ──────────
function Overlay({ rect, onDismiss }) {
  const base = {
    position: "fixed",
    background: "rgba(5,12,8,0.75)",
    zIndex: 1055,
    transition: "all 0.3s ease",
  };

  if (!rect) {
    return (
      <div
        style={{ ...base, inset: 0, cursor: "pointer" }}
        onClick={onDismiss}
      />
    );
  }

  const { top, left, width, height } = rect;
  const bottom = top + height;
  const right = left + width;

  return (
    <>
      {/* Top */}
      <div style={{ ...base, top: 0, left: 0, right: 0, height: Math.max(0, top), cursor: "pointer" }} onClick={onDismiss} />
      {/* Bottom */}
      <div style={{ ...base, top: bottom, left: 0, right: 0, bottom: 0, cursor: "pointer" }} onClick={onDismiss} />
      {/* Left */}
      <div style={{ ...base, top, left: 0, width: Math.max(0, left), height }} onClick={onDismiss} />
      {/* Right */}
      <div style={{ ...base, top, left: right, right: 0, height }} onClick={onDismiss} />
    </>
  );
}

// ── Calculate smart card position ─────────────────────────────────────────────
// Places the card BELOW the spotlight if there's room, otherwise ABOVE it.
// Always returns numeric pixel values so CSS transitions work correctly
// (mixing "50%" strings with pixel numbers breaks CSS transition interpolation).
function getCardPosition(spotRect, cardHeight = 300) {
  const PADDING = 18;
  const CARD_WIDTH = Math.min(window.innerWidth * 0.94, 420);
  const VH = window.innerHeight;
  const centeredLeft = Math.round(window.innerWidth / 2 - CARD_WIDTH / 2);

  if (!spotRect) {
    // Welcome step — card centered near top
    return { top: 80, left: centeredLeft, transform: "none" };
  }

  const spaceBelow = VH - spotRect.top - spotRect.height;
  const spaceAbove = spotRect.top;

  // Clamp helper: keep card horizontally on screen
  const clampLeft = (x) => Math.min(Math.max(x, 8), window.innerWidth - CARD_WIDTH - 8);
  const spotCenterLeft = clampLeft(spotRect.left + spotRect.width / 2 - CARD_WIDTH / 2);

  // Prefer below the spotlight
  if (spaceBelow >= cardHeight + PADDING) {
    return {
      top:       spotRect.top + spotRect.height + PADDING,
      left:      spotCenterLeft,
      transform: "none",
    };
  }

  // Try above the spotlight
  if (spaceAbove >= cardHeight + PADDING) {
    return {
      top:       spotRect.top - cardHeight - PADDING,
      left:      spotCenterLeft,
      transform: "none",
    };
  }

  // Fallback: top-center (element fills viewport, or welcome step)
  return { top: 80, left: centeredLeft, transform: "none" };
}


// ── Main component ────────────────────────────────────────────────────────────
function WelcomeTour({ userRole = "rep" }) {
  const [step, setStep]         = useState(0);
  const [visible, setVisible]   = useState(false);
  const [animKey, setAnimKey]   = useState(0);
  const [spotRect, setSpotRect] = useState(null);
  const [cardPos, setCardPos]   = useState(() => ({
    top: 80,
    left: Math.round((window.innerWidth - Math.min(window.innerWidth * 0.94, 420)) / 2),
    transform: "none",
  }));
  const cardRef                 = useRef(null);

  const steps   = userRole === "manager" ? MANAGER_STEPS : REP_STEPS;
  const current = steps[step];

  // Show tour once per session
  useEffect(() => {
    if (sessionStorage.getItem(TOUR_KEY)) return;
    const id = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(id);
  }, []);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(TOUR_KEY, "true");
    setVisible(false);
    setSpotRect(null);
  }, []);

  const advance = useCallback(() => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
      setAnimKey(k => k + 1);
    } else {
      dismiss();
    }
  }, [step, steps.length, dismiss]);

  const back = useCallback(() => {
    if (step > 0) { setStep(s => s - 1); setAnimKey(k => k + 1); }
  }, [step]);

  // ── Spotlight logic ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return undefined;
    const sel = current?.highlight;

    if (!sel) {
      setSpotRect(null);
      const CARD_WIDTH = Math.min(window.innerWidth * 0.94, 420);
      setCardPos({ top: 80, left: Math.round((window.innerWidth - CARD_WIDTH) / 2), transform: "none" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return undefined;
    }

    let active = true;
    let scrolled = false;
    let rafId = null;
    let lastRect = null; // Track last committed rect to avoid redundant setState calls

    const updatePositions = (el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        const PAD = 10;
        const top    = r.top    - PAD;
        const left   = r.left   - PAD;
        const width  = r.width  + PAD * 2;
        const height = r.height + PAD * 2;

        // Only trigger setState when position/size actually changes (≥0.5px)
        if (
          !lastRect ||
          Math.abs(lastRect.top    - top)    > 0.5 ||
          Math.abs(lastRect.left   - left)   > 0.5 ||
          Math.abs(lastRect.width  - width)  > 0.5 ||
          Math.abs(lastRect.height - height) > 0.5
        ) {
          const rect = { top, left, width, height };
          lastRect = rect;
          setSpotRect(rect);
          const cardH = cardRef.current?.offsetHeight || 290;
          setCardPos(getCardPosition(rect, cardH));
        }
      }
    };

    // requestAnimationFrame loop — runs at 60fps, always reflects current layout.
    // This is the ONLY reliable way to track elements through async layout shifts.
    const rafLoop = () => {
      if (!active) return;
      const el = getScopedElement(sel);
      if (el) {
        if (!scrolled) {
          scrolled = true;
          const r = el.getBoundingClientRect();
          const VH = window.innerHeight;
          if (r.top < 80 || r.bottom > VH - 80) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
        updatePositions(el);
      }
      rafId = requestAnimationFrame(rafLoop);
    };
    rafId = requestAnimationFrame(rafLoop);

    return () => {
      active = false;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [step, visible]); // eslint-disable-line



  // Keyboard: → / Enter = next, ← = back, Esc = dismiss
  useEffect(() => {
    if (!visible) return undefined;
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === "Enter") advance();
      else if (e.key === "ArrowLeft") back();
      else if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, advance, back, dismiss]);

  if (!visible) return null;

  const Icon    = current.icon;
  const isFirst = step === 0;
  const isLast  = step === steps.length - 1;

  const cardStyle = {
    position:  "fixed",
    top:       cardPos.top,
    left:      cardPos.left,
    transform: cardPos.transform,
    width:     "min(94vw, 420px)",
    zIndex:    1200,
    transition: "top 0.3s ease, left 0.3s ease",
  };

  return createPortal(
    <>
      {/* Quadrant overlay */}
      <Overlay rect={spotRect} onDismiss={dismiss} />

      {/* Spotlight ring */}
      {current.highlight && spotRect && (
        <div
          className="tour-ring"
          style={{
            position:      "fixed",
            top:           spotRect.top,
            left:          spotRect.left,
            width:         spotRect.width,
            height:        spotRect.height,
            borderRadius:  14,
            border:        "2.5px solid var(--color-primary)",
            zIndex:        1060,
            pointerEvents: "none",
            transition:    "top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease",
          }}
        />
      )}

      {/* Connector line: small arrow pointing from card toward spotlight */}
      {current.highlight && spotRect && (() => {
        const cardH = cardRef.current?.offsetHeight || 290;
        const cardW = Math.min(window.innerWidth * 0.94, 420);
        const cardLeft = typeof cardPos.left === "string"
          ? window.innerWidth / 2 - cardW / 2
          : cardPos.left;
        const cardTop  = cardPos.top;
        const cardBottom = cardTop + cardH;

        // Is card above or below spotlight?
        const cardAbove = cardBottom < spotRect.top;
        const cardBelow = cardTop > spotRect.top + spotRect.height;

        if (!cardAbove && !cardBelow) return null;

        const dotTop  = cardAbove ? cardBottom + 4 : spotRect.top + spotRect.height + 4;
        const dotLeft = cardLeft + cardW / 2 - 3;
        const lineH   = cardAbove
          ? spotRect.top - cardBottom - 8
          : cardTop - spotRect.top - spotRect.height - 8;

        if (lineH < 8) return null;

        return (
          <div
            style={{
              position: "fixed",
              top:      dotTop,
              left:     dotLeft,
              width:    6,
              height:   lineH,
              background: "linear-gradient(to bottom, var(--color-primary), rgba(29,158,117,0))",
              zIndex:   1059,
              pointerEvents: "none",
              borderRadius: 99,
            }}
          />
        );
      })()}

      {/* Tour card */}
      <div
        ref={cardRef}
        key={animKey}
        className="tour-card-enter"
        style={{
          ...cardStyle,
          background:          "linear-gradient(145deg, rgba(8,18,12,0.98) 0%, rgba(12,24,16,0.98) 100%)",
          backdropFilter:      "blur(24px)",
          WebkitBackdropFilter:"blur(24px)",
          border:              "1px solid rgba(29,158,117,0.35)",
          borderRadius:        20,
          boxShadow:           "0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(29,158,117,0.1), inset 0 1px 0 rgba(255,255,255,0.04)",
          overflow:            "hidden",
        }}
      >
        {/* Progress bar */}
        <div style={{
          height:     3,
          background: `linear-gradient(90deg, var(--color-primary) ${((step + 1) / steps.length) * 100}%, rgba(29,158,117,0.12) 0%)`,
          transition: "background 0.4s ease",
        }} />

        <div style={{ padding: "18px 20px 16px" }}>
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: "rgba(29,158,117,0.15)",
                border: "1px solid rgba(29,158,117,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={15} color="var(--color-primary)" />
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  Step {step + 1} of {steps.length}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>
                  {current.label}
                </div>
              </div>
            </div>
            {/* Dismiss button */}
            <button
              onClick={dismiss}
              aria-label="Close tour"
              style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, cursor: "pointer", color: "var(--text-muted)",
                width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            >
              <X size={13} />
            </button>
          </div>

          {/* Title + body */}
          <h3 style={{
            margin: "0 0 7px",
            fontFamily: "var(--font-heading, 'Poppins', sans-serif)",
            fontSize: isFirst ? 18 : 15,
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.25,
          }}>
            {current.title}
          </h3>
          <p style={{
            margin: "0 0 12px",
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            fontFamily: "var(--font-body, 'Inter', sans-serif)",
          }}>
            {current.body}
          </p>

          {/* Hint chip */}
          {current.hint && (
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 12px", borderRadius: 10, marginBottom: 12,
              background: "rgba(29,158,117,0.1)",
              border: "1px solid rgba(29,158,117,0.25)",
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--color-primary)", flexShrink: 0,
                animation: "tourRingPulse 1.5s ease-in-out infinite",
              }} />
              <span style={{ fontSize: 12, color: "var(--color-primary)", fontWeight: 600 }}>{current.hint}</span>
            </div>
          )}

          {/* Dot progress */}
          <div style={{ display: "flex", gap: 5, marginBottom: 14, justifyContent: isFirst ? "center" : "flex-start" }}>
            {steps.map((_, i) => (
              <div
                key={i}
                onClick={() => { setStep(i); setAnimKey(k => k + 1); }}
                style={{
                  width: i === step ? 20 : 6,
                  height: 6,
                  borderRadius: 99,
                  background: i === step
                    ? "var(--color-primary)"
                    : i < step
                      ? "rgba(29,158,117,0.45)"
                      : "rgba(255,255,255,0.12)",
                  transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>

          {/* Action row */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {!isFirst && (
              <button
                onClick={back}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10, padding: "9px 12px",
                  fontSize: 12, fontWeight: 600, color: "var(--text-muted)",
                  cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              >
                <ChevronLeft size={13} />
              </button>
            )}

            {isFirst && (
              <button
                onClick={dismiss}
                style={{
                  background: "none", border: "none",
                  fontSize: 12, color: "var(--text-muted)",
                  cursor: "pointer", padding: "9px 4px",
                  fontFamily: "var(--font-body)",
                }}
              >
                Skip tour
              </button>
            )}

            <button
              onClick={advance}
              style={{
                flex: 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: isLast
                  ? "linear-gradient(135deg, #1D9E75, #0e7a55)"
                  : "linear-gradient(135deg, var(--color-primary), #14845f)",
                border: "none", borderRadius: 10,
                padding: "10px 16px",
                fontSize: 13, fontWeight: 700,
                color: "#fff", cursor: "pointer",
                boxShadow: "0 4px 14px rgba(29,158,117,0.3)",
                transition: "transform 0.12s, box-shadow 0.12s",
                fontFamily: "var(--font-body)",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(29,158,117,0.45)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(29,158,117,0.3)";
              }}
            >
              {current.cta}
              {!isLast && <ChevronRight size={14} />}
            </button>
          </div>

          {/* Keyboard hint — first step only */}
          {isFirst && (
            <div style={{ textAlign: "center", marginTop: 10, fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
              → next &nbsp;·&nbsp; ← back &nbsp;·&nbsp; Esc skip
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

export default WelcomeTour;
export { TOUR_KEY };
