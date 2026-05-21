import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import NavBar from "./components/NavBar";
import ErrorBoundary from "./components/ErrorBoundary";
import { Leaf } from "lucide-react";
import "./index.css";
import "./css/landing.css";
import "./css/app.css";

// Eager (critical path)
import Landing from "./pages/Landing";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";

// Lazy (code split)
const Dashboard       = lazy(() => import("./pages/Dashboard"));
const TerritorySelect = lazy(() => import("./pages/TerritorySelect"));
const VisitDetail     = lazy(() => import("./pages/VisitDetail"));
const PostVisitLog    = lazy(() => import("./pages/PostVisitLog"));
const AlertFeed       = lazy(() => import("./pages/AlertFeed"));
const Outcomes        = lazy(() => import("./pages/Outcomes"));
const About           = lazy(() => import("./pages/About"));
const Manager         = lazy(() => import("./pages/Manager"));
const UserGuide       = lazy(() => import("./pages/UserGuide"));

// ---- Loading screen (no emoji) ----
function LoadingScreen() {
  return (
    <div style={{
      display: "flex", height: "100vh", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "var(--bg-base, #0f1a14)", color: "var(--color-primary, #1D9E75)", gap: 16,
      fontFamily: "var(--font-heading, 'Poppins', sans-serif)"
    }}>
      <Leaf size={36} style={{ animation: "spin 1.2s linear infinite" }} />
      <span style={{ fontSize: 16, fontFamily: "var(--font-body, 'Inter', sans-serif)" }}>Loading AgroNav…</span>
    </div>
  );
}

// ---- Scroll to top on route change ----
function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// ---- Protected route wrapper with optional role check ----
function ProtectedRoute({ requiredRole }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return <Navigate to="/dashboard" state={{ error: "You don't have permission to access that page." }} replace />;
  }
  return <Outlet />;
}

// ---- Pages that should NOT show NavBar ----
const PUBLIC_PATHS = ["/", "/signin", "/signup", "/about", "/guide"];

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
            <Route path="/about"   element={<ErrorBoundary><About /></ErrorBoundary>} />
            <Route path="/guide"   element={<ErrorBoundary><UserGuide /></ErrorBoundary>} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard"          element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
              <Route path="/select-territory"   element={<ErrorBoundary><TerritorySelect /></ErrorBoundary>} />
              <Route path="/visit/:retailer_id" element={<ErrorBoundary><VisitDetail /></ErrorBoundary>} />
              <Route path="/log"                element={<ErrorBoundary><PostVisitLog /></ErrorBoundary>} />
              <Route path="/alerts"             element={<ErrorBoundary><AlertFeed /></ErrorBoundary>} />
              <Route path="/outcomes"           element={<ErrorBoundary><Outcomes /></ErrorBoundary>} />
              <Route path="/manager"            element={<ErrorBoundary><Manager /></ErrorBoundary>} />
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
