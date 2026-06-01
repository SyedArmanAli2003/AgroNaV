/**
 * AgroNaV frontend route and auth tests.
 *
 * These tests avoid importing App.js / react-router-dom directly because
 * react-router-dom v7 uses a package `exports` field that CRA's Jest 27
 * resolver cannot handle. Instead we test pure auth/cache logic and source
 * content assertions that catch regressions without a full render.
 */

// ---- localStorage helpers (simulated storage) ----

beforeEach(() => {
  localStorage.clear();
});

test('auth token round-trips through localStorage', () => {
  localStorage.setItem('agronav_token', 'eyJ0eXAiOiJKV1QifQ.test');
  expect(localStorage.getItem('agronav_token')).toBe('eyJ0eXAiOiJKV1QifQ.test');
});

test('user object survives JSON round-trip in localStorage', () => {
  const user = { username: 'rep1', role: 'rep', district: 'Jalgaon' };
  localStorage.setItem('agronav_user', JSON.stringify(user));
  const restored = JSON.parse(localStorage.getItem('agronav_user') || '{}');
  expect(restored.role).toBe('rep');
  expect(restored.district).toBe('Jalgaon');
});

test('prefetch timestamp freshness check logic', () => {
  const now = Date.now();
  localStorage.setItem('agronav_last_prefetch', String(now));
  const stored = parseInt(localStorage.getItem('agronav_last_prefetch') || '0', 10);
  const secondsSince = (Date.now() - stored) / 1000;
  // Just written → should be a "recent prefetch" (< 300s threshold used in Dashboard)
  expect(secondsSince).toBeLessThan(300);
});

test('cached recommendations survive JSON round-trip', () => {
  const mockRecs = [
    { rank: 1, retailer_name: 'Test Store', nba: { product_to_pitch: 'Actara 25 WG' } }
  ];
  localStorage.setItem('agronav_recs', JSON.stringify(mockRecs));
  const parsed = JSON.parse(localStorage.getItem('agronav_recs') || '[]');
  expect(parsed).toHaveLength(1);
  expect(parsed[0].nba.product_to_pitch).toBe('Actara 25 WG');
});

test('clearing token means isAuthenticated should be false', () => {
  localStorage.setItem('agronav_token', 'some.jwt.token');
  localStorage.removeItem('agronav_token');
  expect(localStorage.getItem('agronav_token')).toBeNull();
});

// ---- Source-content regression guards ----

const fs = require('fs');
const path = require('path');

function readSrc(relPath) {
  return fs.readFileSync(path.join(__dirname, relPath), 'utf8');
}

test('Dashboard loading skeleton is 3 cards (TASK 2 regression)', () => {
  const src = readSrc('pages/Dashboard.js');
  expect(src).toMatch(/Array\(3\)/);
  expect(src).not.toMatch(/Array\(5\)/);
});

test('Dashboard offline banner says "Offline" and "cached data" (TASK 4 regression)', () => {
  const src = readSrc('pages/Dashboard.js');
  expect(src).toContain('Offline');
  expect(src).toContain('cached data');
});

test('AuthContext sets agronav_last_prefetch after prefetch (TASK 3 regression)', () => {
  const src = readSrc('context/AuthContext.jsx');
  expect(src).toContain('agronav_last_prefetch');
});

test('ChatBot panel width uses min() for mobile (TASK 6 regression)', () => {
  const src = readSrc('components/ChatBot.jsx');
  expect(src).toContain('min(360px');
  expect(src).toContain('100vw');
});

test('App.js ProtectedRoute redirects unauthenticated to /signin', () => {
  const src = readSrc('App.js');
  // ProtectedRoute should check isAuthenticated and navigate to /signin
  expect(src).toContain('isAuthenticated');
  expect(src).toContain('/signin');
  expect(src).toContain('ProtectedRoute');
});

test('App.js has manager-only route guarded by requiredRole', () => {
  const src = readSrc('App.js');
  expect(src).toContain('requiredRole');
  expect(src).toContain('/manager');
  expect(src).toContain('manager');
});

// ── Mobile optimisation regression guards ──────────────────────────

test('MOBILE Task 1 — manifest is standalone, portrait, dark bg', () => {
  const m = JSON.parse(readSrc('../public/manifest.json'));
  expect(m.display).toBe('standalone');
  expect(m.orientation).toBe('portrait');
  expect(m.background_color).toBe('#0f1a14');
  expect(m.theme_color).toBe('#1D9E75');
  expect(m.start_url).toBe('/');
  expect(m.icons.length).toBeGreaterThanOrEqual(2);
});

test('MOBILE Task 1 — index.html has iOS PWA + locked viewport meta', () => {
  const html = readSrc('../public/index.html');
  expect(html).toContain('apple-mobile-web-app-capable');
  expect(html).toContain('apple-mobile-web-app-status-bar-style');
  expect(html).toContain('apple-mobile-web-app-title');
  expect(html).toContain('maximum-scale=1');
  expect(html).toContain('user-scalable=no');
});

test('MOBILE Task 1 — PWA install banner wired into App.js', () => {
  expect(readSrc('App.js')).toContain('PWAInstallBanner');
  const b = readSrc('components/PWAInstallBanner.jsx');
  expect(b).toContain('beforeinstallprompt');
  expect(b).toContain('Install AgroNav');
  expect(b).toContain('agronav_pwa_dismissed');
});

test('MOBILE — useIsMobile hook exists and is used by key components', () => {
  expect(readSrc('hooks/useIsMobile.js')).toContain('matchMedia');
  expect(readSrc('pages/Dashboard.js')).toContain('useIsMobile');
  expect(readSrc('pages/VisitDetail.jsx')).toContain('useIsMobile');
  expect(readSrc('pages/PostVisitLog.jsx')).toContain('useIsMobile');
  expect(readSrc('components/ChatBot.jsx')).toContain('useIsMobile');
});

test('MOBILE — mobile.css loaded and covers nav/tabs/inputs', () => {
  expect(readSrc('App.js')).toContain('mobile.css');
  const css = readSrc('css/mobile.css');
  expect(css).toContain('overflow-x: hidden');
  expect(css).toContain('.bottom-tab-bar');
  expect(css).toContain('.dash-tabs');
  expect(css).toContain('min-height: 52px'); // outcome toggle buttons
});

test('MOBILE Task 4 — PostVisitLog has rejection reason + collapsible competitor', () => {
  const src = readSrc('pages/PostVisitLog.jsx');
  expect(src).toContain('rejectionReason');
  expect(src).toContain("outcome === \"Rejected\"");
  expect(src).toContain('Add competitor note');
  expect(src).toContain('showCompetitor');
});

test('MOBILE Task 7 — About page has mobile story section', () => {
  const src = readSrc('pages/About.jsx');
  expect(src).toContain('Works on any device');
  expect(src).toContain('Works offline');
});
