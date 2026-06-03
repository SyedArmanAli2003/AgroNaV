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
        top: 68,                              // just below the sticky navbar
        right: 16,
        width: "min(340px, calc(100vw - 32px))",
        zIndex: 1300,
        background: "linear-gradient(135deg, #1D9E75, #0e7a55)",
        borderRadius: 14,
        boxShadow: "0 8px 32px rgba(29,158,117,0.4), 0 0 0 1px rgba(255,255,255,0.1)",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        animation: "toastIn 0.3s ease forwards",
        fontFamily: "var(--font-body, 'Inter', sans-serif)",
      }}
    >
      <div
        style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: "rgba(255,255,255,0.18)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Smartphone size={18} color="#fff" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.25 }}>
          Install AgroNav on your phone
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
          Works offline — no app store needed.
        </div>
      </div>

      <button
        onClick={install}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "#fff", border: "none", borderRadius: 8,
          padding: "7px 12px", fontSize: 12, fontWeight: 700,
          color: "#0e7a55", cursor: "pointer", flexShrink: 0,
          fontFamily: "inherit",
        }}
      >
        <Download size={13} /> Install
      </button>

      <button
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        style={{
          background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6,
          width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0,
        }}
      >
        <X size={13} color="#fff" />
      </button>
    </div>
  );
}
