import React, { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import NavBar from "./components/NavBar";
import "./index.css";
import "./css/landing.css";
import "./css/app.css";

// Eager (critical path — load immediately)
import Landing from "./pages/Landing";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";

// Lazy (non-critical — code split)
const Dashboard       = lazy(() => import("./pages/Dashboard"));
const TerritorySelect = lazy(() => import("./pages/TerritorySelect"));
const VisitDetail     = lazy(() => import("./pages/VisitDetail"));
const PostVisitLog    = lazy(() => import("./pages/PostVisitLog"));
const AlertFeed       = lazy(() => import("./pages/AlertFeed"));
const Outcomes        = lazy(() => import("./pages/Outcomes"));
const About           = lazy(() => import("./pages/About"));
const Manager         = lazy(() => import("./pages/Manager"));

// ---- Loading screen ----
function LoadingScreen() {
  return (
    <div style={{
      display: "flex", height: "100vh", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#050a08", color: "#1D9E75", gap: 16,
      fontFamily: "'Outfit','Inter',sans-serif"
    }}>
      <span style={{ fontSize: 40, animation: "spin 1.2s linear infinite", display: "inline-block" }}>🌿</span>
      <span style={{ fontSize: 16 }}>Loading AgroNav…</span>
    </div>
  );
}

// ---- Scroll to top on route change ----
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// ---- Protected route wrapper ----
function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  return <Outlet />;
}

// ---- Pages that should NOT show NavBar ----
const PUBLIC_PATHS = ["/", "/signin", "/signup", "/about"];

function MainLayout() {
  const location = useLocation();
  const isPublic = PUBLIC_PATHS.includes(location.pathname);

  return (
    <>
      {!isPublic && <NavBar />}
      <div style={!isPublic ? { paddingBottom: 72 } : {}}>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Public routes */}
            <Route path="/"        element={<Landing />} />
            <Route path="/signin"  element={<SignIn />} />
            <Route path="/signup"  element={<SignUp />} />
            <Route path="/about"   element={<About />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard"          element={<Dashboard />} />
              <Route path="/select-territory"   element={<TerritorySelect />} />
              <Route path="/visit/:retailer_id" element={<VisitDetail />} />
              <Route path="/log"                element={<PostVisitLog />} />
              <Route path="/alerts"             element={<AlertFeed />} />
              <Route path="/outcomes"           element={<Outcomes />} />
              <Route path="/manager"            element={<Manager />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
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
