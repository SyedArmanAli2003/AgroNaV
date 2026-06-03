import { useState, useEffect } from "react";

/**
 * Shows an orange fixed banner at the top of the screen when the device
 * goes offline. Disappears as soon as connectivity is restored.
 * No external dependencies — listens to browser online/offline events.
 */
export default function ConnectionBanner() {
  const [status, setStatus] = useState(
    typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline"
  );

  useEffect(() => {
    const goOnline  = () => setStatus("online");
    const goOffline = () => setStatus("offline");
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (status === "online") return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0,
      backgroundColor: "#FF6B35",
      color: "#fff", textAlign: "center",
      padding: "8px 16px", zIndex: 9999,
      fontSize: 13, fontWeight: 600,
      fontFamily: "var(--font-body, 'Inter', sans-serif)",
      letterSpacing: "0.01em",
    }}>
      📵 No internet — showing saved data. Visits will sync when you reconnect.
    </div>
  );
}
