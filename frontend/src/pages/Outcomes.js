import React, { useState, useEffect, useRef } from "react";
import { api } from "../services/api";

const OUTCOME_COLOR = { sale: "#065f46", order: "#1e40af", none: "#64748b" };
const OUTCOME_LABEL = { sale: "Sale made", order: "Order placed", none: "No purchase" };

function Outcomes() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState([]);
  const chartRef = useRef(null);

  useEffect(() => {
    api.getVisitLog()
      .then((d) => setLogs(d.logs || []))
      .catch(() => {});
    api.getWeeklyStats()
      .then((d) => setStats(d.stats || []))
      .catch(() => {});
  }, []);

  // Draw Google Chart when stats loaded
  useEffect(() => {
    if (!stats.length || !window.google) return;

    window.google.charts.load("current", { packages: ["corechart"] });
    window.google.charts.setOnLoadCallback(() => {
      if (!chartRef.current) return;
      const rows = stats.map((s) => [s.week_label, s.acceptance_rate]);
      const data = window.google.visualization.arrayToDataTable([
        ["Week", "Acceptance %"],
        ...rows
      ]);
      const options = {
        curveType: "function",
        legend: { position: "none" },
        colors: ["#1D9E75"],
        lineWidth: 3,
        pointSize: 6,
        chartArea: { width: "85%", height: "70%" },
        vAxis: { minValue: 0, maxValue: 100, format: "#'%'" },
        backgroundColor: "transparent",
        animation: { startup: true, duration: 800, easing: "out" }
      };
      const chart = new window.google.visualization.LineChart(chartRef.current);
      chart.draw(data, options);
    });
  }, [stats]);

  const last = stats[stats.length - 1] || {};

  return (
    <div>
      {/* Stat cards */}
      <div className="row g-2 mb-3">
        {[
          { label: "Visits this week", value: last.visits || "—", color: "#1D9E75" },
          { label: "Sales & orders", value: last.accepted || "—", color: "#1e40af" },
          {
            label: "Acceptance rate",
            value: last.acceptance_rate ? last.acceptance_rate.toFixed(1) + "%" : "—",
            color: "#1D9E75"
          }
        ].map((c) => (
          <div key={c.label} className="col-4">
            <div
              className="p-3 rounded-3 text-center"
              style={{
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.4)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.04)",
                borderRadius: 16
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.value}</div>
              <div
                style={{
                  fontSize: 10, color: "#64748b",
                  textTransform: "uppercase", letterSpacing: 1,
                  fontWeight: 600, marginTop: 4
                }}
              >
                {c.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Google Chart */}
      <div
        className="card p-3 mb-3"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.4)",
          borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.04)"
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "#334155" }}>
          Recommendation acceptance rate — 6 weeks
        </p>
        <div ref={chartRef} style={{ height: 220 }} />
        {!window.google && (
          <p className="text-center" style={{ fontSize: 12, color: "#94a3b8" }}>
            Chart loads when Google Charts CDN is available
          </p>
        )}
      </div>

      {/* Visit log table */}
      <p
        style={{
          fontSize: 12, textTransform: "uppercase",
          color: "#64748b", fontWeight: 700,
          letterSpacing: 1.5, marginBottom: 12
        }}
      >
        Recent visit log
      </p>

      {logs.length === 0 ? (
        <div className="text-center py-4" style={{ color: "#94a3b8" }}>
          <div style={{ fontSize: 32 }}>📋</div>
          <div style={{ marginTop: 8 }}>No visits logged yet</div>
        </div>
      ) : (
        <div
          className="table-responsive"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.04)"
          }}
        >
          <table className="table table-sm mb-0">
            <thead>
              <tr
                style={{
                  fontSize: 11, color: "#64748b",
                  textTransform: "uppercase", letterSpacing: 1
                }}
              >
                <th style={{ padding: "12px" }}>Outlet</th>
                <th style={{ padding: "12px" }}>Outcome</th>
                <th style={{ padding: "12px" }}>Date</th>
                <th style={{ padding: "12px" }}>Score</th>
                <th style={{ padding: "12px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i} style={{ fontSize: 13 }}>
                  <td style={{ padding: "14px 12px", fontWeight: 500 }}>{log.outlet_name}</td>
                  <td
                    style={{
                      padding: "14px 12px",
                      color: OUTCOME_COLOR[log.result] || "#64748b",
                      fontWeight: 600
                    }}
                  >
                    {OUTCOME_LABEL[log.result] || log.result}
                  </td>
                  <td style={{ padding: "14px 12px", color: "#94a3b8" }}>{log.date}</td>
                  <td style={{ padding: "14px 12px", fontWeight: 600 }}>
                    {log.outcome_score || "—"}
                  </td>
                  <td style={{ padding: "14px 12px" }}>
                    <span
                      style={{
                        fontSize: 11, padding: "4px 10px", borderRadius: 12, fontWeight: 600,
                        background: log.synced ? "#dcfce7" : "#fef3c7",
                        color: log.synced ? "#16a34a" : "#d97706"
                      }}
                    >
                      {log.synced ? "Synced" : "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Outcomes;
