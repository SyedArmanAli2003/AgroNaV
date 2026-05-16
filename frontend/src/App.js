import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import NavBar from "./components/NavBar";
import Dashboard from "./pages/Dashboard";
import Visit from "./pages/Visit";
import Alerts from "./pages/Alerts";
import Outcomes from "./pages/Outcomes";
import Manager from "./pages/Manager";
import Landing from "./pages/Landing";
import { api } from "./services/api";
import "./App.css";

function MainLayout() {
  const location = useLocation();
  const isLanding = location.pathname === "/";

  return (
    <>
      {!isLanding && <NavBar />}
      <div style={!isLanding ? { maxWidth: 900, margin: "0 auto", padding: "12px" } : {}}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/visit/:id" element={<Visit />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/outcomes" element={<Outcomes />} />
          <Route path="/manager" element={<Manager />} />
        </Routes>
      </div>
    </>
  );
}

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
      <MainLayout />
    </BrowserRouter>
  );
}

export default App;
