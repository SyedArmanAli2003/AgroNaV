// What it does: Top navigation bar with app branding and route tabs
// Input: alertCount prop for badge display
// Output: Rendered navbar with navigation tabs and dark mode toggle
// Called by: App (main.js)

const NavBar = {
  name: 'NavBar',
  props: {
    alertCount: { type: Number, default: 0 }
  },
  data() {
    return {
      isDark: false
    };
  },
  mounted() {
    // Check initial system preference or saved preference
    const savedTheme = localStorage.getItem('agronav_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.isDark = true;
      document.documentElement.setAttribute('data-bs-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-bs-theme', 'light');
    }
  },
  methods: {
    toggleTheme() {
      this.isDark = !this.isDark;
      const theme = this.isDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-bs-theme', theme);
      localStorage.setItem('agronav_theme', theme);
    }
  },
  template: `
    <nav class="navbar navbar-agronav px-3 py-2">
      <div class="container-fluid align-items-center">
        <span class="navbar-brand mb-0 text-white fw-bold fs-5">
          <i class="bi bi-geo-alt-fill me-1"></i> AgroNav
        </span>
        <div class="d-flex align-items-center gap-3">
          <span class="text-white-50 small d-none d-sm-inline">Arjun Kumar — Nalgonda</span>
          <button @click="toggleTheme" class="theme-toggle" aria-label="Toggle Dark Mode">
            <i class="bi" :class="isDark ? 'bi-sun-fill' : 'bi-moon-stars-fill'"></i>
          </button>
        </div>
      </div>
    </nav>
    <div class="border-bottom" style="background: var(--card-bg);">
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
