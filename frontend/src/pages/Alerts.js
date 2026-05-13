import React, { useState, useEffect } from "react";
import AlertCard from "../components/AlertCard";
import { api } from "../services/api";

function Alerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    api.getAlerts()
      .then((data) => {
        // Backend may return {alerts: [...]} or just [...]
        const list = Array.isArray(data) ? data : (data.alerts || []);
        setAlerts(list.filter((a) => !a.dismissed));
      })
      .catch(() => {
        const cached = localStorage.getItem("agronav_daily");
        if (cached) {
          try {
            const d = JSON.parse(cached);
            setAlerts((d.alerts || []).filter((a) => !a.dismissed));
          } catch {}
        }
      });
  }, []);

  const dismiss = (id) => {
    api.dismissAlert(id).catch(() => {});
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  if (!alerts.length) {
    return (
      <div className="text-center mt-5" style={{ color: "#64748b" }}>
        <div style={{ fontSize: 40 }}>✅</div>
        <div style={{ marginTop: 8 }}>No active alerts for your territory.</div>
      </div>
    );
  }

  return (
    <div>
      <p
        style={{
          fontSize: 12, textTransform: "uppercase",
          color: "#64748b", fontWeight: 700,
          letterSpacing: 1.5, marginBottom: 16
        }}
      >
        Active alerts — Nalgonda territory
      </p>
      {alerts.map((a) => (
        <AlertCard key={a.id} alert={a} onDismiss={() => dismiss(a.id)} />
      ))}
    </div>
  );
}

export default Alerts;
