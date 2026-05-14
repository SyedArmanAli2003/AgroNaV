import React, { useState, useEffect } from "react";
import AlertCard from "../components/AlertCard";

function Alerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const cached = localStorage.getItem("agronav_daily");
    if (cached) {
      try {
        const data = JSON.parse(cached);
        setAlerts(data.alerts || []);
      } catch {}
    }
  }, []);

  const dismiss = (id) => {
    setAlerts(alerts.filter((a) => a.id !== id));
  };

  return (
    <div className="page-enter">
      <h5 style={{ fontWeight: 700, marginBottom: "16px", color: "var(--text-primary)" }}>Active Alerts</h5>
      
      {alerts.length === 0 ? (
        <div className="text-center py-5" style={{ color: "var(--text-muted)" }}>
          <div style={{ fontSize: "36px", marginBottom: "8px" }}>🎉</div>
          <div>No active alerts in your territory</div>
        </div>
      ) : (
        alerts.map((a) => (
          <AlertCard key={a.id} alert={a} onDismiss={() => dismiss(a.id)} />
        ))
      )}
    </div>
  );
}

export default Alerts;
