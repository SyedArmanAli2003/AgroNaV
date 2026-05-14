import React, { useState, useEffect } from "react";
import { Chart } from "react-google-charts";
import { api } from "../services/api";

function Outcomes() {
  const [stats, setStats] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Attempt offline read first for stats
    const cached = localStorage.getItem("agronav_daily");
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (data.weekly_stats) setStats(data.weekly_stats);
      } catch {}
    }

    // Refresh from API if online
    api.getMorningSync(1).then((data) => {
      if (data.weekly_stats) setStats(data.weekly_stats);
    }).catch(() => {});

    // Get logs and map cache
    api.getLogs().then((dbLogs) => {
      const q = JSON.parse(localStorage.getItem("agronav_queue") || "[]");
      setLogs([...q.map((x) => ({ ...x, pending: true })), ...dbLogs]);
    }).catch(() => {
      const q = JSON.parse(localStorage.getItem("agronav_queue") || "[]");
      setLogs(q.map((x) => ({ ...x, pending: true })));
    });
  }, []);

  const chartData = [
    ["Week", "Acceptance Rate"],
    ...stats.map((s) => [s.week_label, s.acceptance_rate])
  ];

  return (
    <div className="page-enter">
      <h5 style={{ fontWeight: 700, marginBottom: "16px", color: "var(--text-primary)" }}>Your Performance</h5>

      {/* Chart container */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "20px",
          marginBottom: "24px"
        }}
      >
        <p
          style={{
            fontSize: "12px", textTransform: "uppercase",
            color: "var(--text-muted)", fontWeight: 700,
            letterSpacing: "1px", marginBottom: "16px"
          }}
        >
          Recommendation acceptance rate — 6 weeks
        </p>
        
        {stats.length > 0 ? (
          <Chart
            chartType="LineChart"
            width="100%"
            height="220px"
            data={chartData}
            options={{
              backgroundColor: "transparent",
              colors: ["#1D9E75"],
              chartArea: { width: "85%", height: "70%", backgroundColor: "transparent" },
              hAxis: {
                textStyle: { color: "#8B90A7" },
                gridlines: { color: "rgba(255,255,255,0.05)" }
              },
              vAxis: {
                textStyle: { color: "#8B90A7" },
                gridlines: { color: "rgba(255,255,255,0.05)" },
                minValue: 0,
                maxValue: 100
              },
              legend: "none",
              curveType: "function",
              lineWidth: 3,
              pointSize: 5
            }}
          />
        ) : (
          <div className="text-center py-5" style={{ color: "var(--text-muted)", fontSize: "13px" }}>
            No stats available
          </div>
        )}
      </div>

      <h6 style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>Recent Visit Logs</h6>
      
      <div style={{ overflowX: "auto" }}>
        <table className="table" style={{ background: "transparent", margin: 0 }}>
          <thead>
            <tr>
              <th style={{ color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", borderBottom: "1px solid var(--border-subtle)", background: "transparent" }}>Date</th>
              <th style={{ color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", borderBottom: "1px solid var(--border-subtle)", background: "transparent" }}>Outlet ID</th>
              <th style={{ color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", borderBottom: "1px solid var(--border-subtle)", background: "transparent" }}>Result</th>
              <th style={{ color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", borderBottom: "1px solid var(--border-subtle)", background: "transparent" }}>Score</th>
              <th style={{ color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", borderBottom: "1px solid var(--border-subtle)", background: "transparent" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-4" style={{ color: "var(--text-muted)", borderBottom: "none", background: "transparent" }}>
                  No recent logs
                </td>
              </tr>
            ) : (
              logs.map((l, i) => (
                <tr
                  key={i}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-glass)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  style={{ transition: "background var(--transition-fast)" }}
                >
                  <td style={{ color: "var(--text-secondary)", fontSize: "13px", borderBottom: "1px solid var(--border-subtle)", background: "transparent" }}>
                    {l.timestamp ? new Date(l.timestamp).toLocaleDateString() : new Date().toLocaleDateString()}
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "13px", borderBottom: "1px solid var(--border-subtle)", background: "transparent" }}>#{l.outlet_id}</td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "13px", borderBottom: "1px solid var(--border-subtle)", background: "transparent" }}>
                    <span
                      style={{
                        padding: "2px 8px", borderRadius: "100px", fontSize: "11px",
                        background: l.result === "sale" ? "var(--low-bg)" : l.result === "order" ? "rgba(99,102,241,0.12)" : "var(--high-bg)",
                        color: l.result === "sale" ? "var(--low-text)" : l.result === "order" ? "#818CF8" : "var(--high-text)"
                      }}
                    >
                      {l.result}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: 600, borderBottom: "1px solid var(--border-subtle)", background: "transparent" }}>{l.outcome_score || "—"}</td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "13px", borderBottom: "1px solid var(--border-subtle)", background: "transparent" }}>
                    {l.pending ? <span style={{ color: "var(--medium-text)" }}>Pending...</span> : <span style={{ color: "var(--low-text)" }}>✓ Synced</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Outcomes;
