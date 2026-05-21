import React, { useEffect } from "react";

/**
 * Toast notification component.
 * @param {string} message - Text to display
 * @param {"success"|"error"|"offline"|"info"} type
 * @param {number} duration - Auto-dismiss in ms (default 3000)
 * @param {Function} onClose - Called when dismissed
 */
function Toast({ message, type = "success", duration = 3000, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  const colors = {
    success: "#22c55e",
    error:   "#ef4444",
    offline: "#f97316",
    info:    "#3b82f6"
  };

  const icons = {
    success: "✓ ",
    error:   "✗ ",
    offline: "⚡ ",
    info:    "i "
  };

  const color = colors[type] || colors.info;

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        bottom: "80px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(15,17,23,0.92)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${color}`,
        borderRadius: "99px",
        padding: "12px 24px",
        color: "#fff",
        fontSize: "14px",
        zIndex: 9999,
        boxShadow: `0 4px 24px ${color}33`,
        animation: "toastIn 0.25s ease forwards",
        whiteSpace: "nowrap",
        fontFamily: "inherit"
      }}
    >
      {icons[type]}{message}
    </div>
  );
}

export default Toast;
