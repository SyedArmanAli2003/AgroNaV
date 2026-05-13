// What it does: Defines Vue Router routes for all 4 views
// Input: URL path changes
// Output: Renders the matched view component
// Called by: main.js

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: Dashboard, name: 'Dashboard' },
  { path: '/visit/:id', component: Visit, name: 'Visit' },
  { path: '/alerts', component: Alerts, name: 'Alerts' },
  { path: '/outcomes', component: Outcomes, name: 'Outcomes' },
];

const router = VueRouter.createRouter({
  history: VueRouter.createWebHashHistory(),
  routes
});
