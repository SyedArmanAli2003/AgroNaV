import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import NavBar from "./components/NavBar";
import Dashboard from "./pages/Dashboard";
import Visit from "./pages/Visit";
import Alerts from "./pages/Alerts";
import Outcomes from "./pages/Outcomes";
import Manager from "./pages/Manager";
import Landing from "./pages/Landing";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import About from "./pages/About";
import PostVisitLog from "./pages/PostVisitLog";
import "./App.css";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }
  return <Outlet />;
}

function MainLayout() {
  const location = useLocation();
  const isPublicPage = ["/", "/signin", "/signup", "/about"].includes(location.pathname);

  return (
    <>
      {!isPublicPage && <NavBar />}
      <div style={!isPublicPage ? { maxWidth: 900, margin: "0 auto", padding: "12px" } : {}}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/about" element={<About />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/visit/:id" element={<Visit />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/outcomes" element={<Outcomes />} />
            <Route path="/log" element={<PostVisitLog />} />
            <Route path="/manager" element={<Manager />} />
          </Route>
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <MainLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
