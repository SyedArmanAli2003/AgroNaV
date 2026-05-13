// What it does: Top navigation bar with app branding and route tabs
// Input: alertCount prop for badge display
// Output: Rendered navbar with navigation tabs
// Called by: App (main.js)

const NavBar = {
  name: 'NavBar',
  props: {
    alertCount: { type: Number, default: 0 }
  },
  template: `
    <nav class="navbar navbar-agronav px-3 py-2">
      <div class="container-fluid">
        <span class="navbar-brand mb-0 text-white fw-bold fs-5">
          <i class="bi bi-geo-alt-fill me-1"></i> AgroNav
        </span>
        <span class="text-white-50 small">Arjun Kumar — Nalgonda</span>
      </div>
    </nav>
    <div class="bg-white border-bottom">
      <div class="container-fluid px-3">
        <ul class="nav nav-tabs border-0">
          <li class="nav-item">
            <router-link to="/dashboard" class="nav-link" active-class="active">
              <i class="bi bi-house-door me-1"></i> Dashboard
            </router-link>
          </li>
          <li class="nav-item">
            <router-link to="/alerts" class="nav-link" active-class="active">
              <i class="bi bi-bell me-1"></i> Alerts
              <span v-if="alertCount > 0" class="alert-dot"></span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link to="/outcomes" class="nav-link" active-class="active">
              <i class="bi bi-bar-chart me-1"></i> Outcomes
            </router-link>
          </li>
        </ul>
      </div>
    </div>
  `
};
