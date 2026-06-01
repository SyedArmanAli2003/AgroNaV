import React, { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";

const DISMISS_KEY = "agronav_pwa_dismissed";

/**
 * PWA install prompt banner.
 * - Listens for the `beforeinstallprompt` event (Chrome/Edge/Android).
 * - Shows a green bottom banner with Install + dismiss.
 * - Remembers dismissal in localStorage so it only appears once.
 * - Hidden when already running as an installed PWA (standalone display mode).
 */
export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already installed / running standalone — never show
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    // Previously dismissed
    if (localStorage.getItem(DISMISS_KEY) === "true") return;

    const handler = (e) => {
      e.preventDefault();           // stop the mini-infobar
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch { /* user closed prompt */ }
    localStorage.setItem(DISMISS_KEY, "true");
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: "calc(76px + env(safe-area-inset-bottom, 0px))", // above bottom tab bar
        width: "min(440px, calc(100vw - 24px))",
        zIndex: 1300,
        background: "linear-gradient(135deg, #1D9E75, #0e7a55)",
        borderRadius: 16,
        boxShadow: "0 12px 40px rgba(29,158,117,0.45), 0 0 0 1px rgba(255,255,255,0.1)",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        animation: "fadeSlideUp 0.35s ease forwards",
        fontFamily: "var(--font-body, 'Inter', sans-serif)",
      }}
    >
      <div
        style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: "rgba(255,255,255,0.18)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Smartphone size={20} color="#fff" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.25 }}>
          Install AgroNav on your phone
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
          Works offline — no app store needed.
        </div>
      </div>

      <button
        onClick={install}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "#fff", border: "none", borderRadius: 10,
          padding: "9px 14px", fontSize: 13, fontWeight: 700,
          color: "#0e7a55", cursor: "pointer", flexShrink: 0,
          fontFamily: "inherit",
        }}
      >
        <Download size={14} /> Install
      </button>

      <button
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        style={{
          background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8,
          width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0,
        }}
      >
        <X size={15} color="#fff" />
      </button>
    </div>
  );
}
