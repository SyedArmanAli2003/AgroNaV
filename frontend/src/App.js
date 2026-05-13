import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import Dashboard from "./pages/Dashboard";
import Visit from "./pages/Visit";
import Alerts from "./pages/Alerts";
import Outcomes from "./pages/Outcomes";
import Manager from "./pages/Manager";
import { api } from "./services/api";
import "./App.css";

function App() {
  // Morning sync: download plan, cache in localStorage
  useEffect(() => {
    api.morningSync()
      .then((data) => {
        localStorage.setItem("agronav_daily", JSON.stringify(data));
      })
      .catch(() => {
        console.log("Offline: using cached daily plan");
      });
  }, []);

  return (
    <BrowserRouter>
      <NavBar />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "12px" }}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/visit/:id" element={<Visit />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/outcomes" element={<Outcomes />} />
          <Route path="/manager" element={<Manager />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
