// What it does: Alerts view — displays active anomaly alerts with dismiss functionality
// Input: Alerts from API or localStorage cache
// Output: List of AlertCard components
// Called by: Vue Router (/alerts)

const Alerts = {
  name: 'Alerts',
  components: { AlertCard },
  template: `
    <div class="container-fluid px-3 py-3">
      <div class="section-title">Active alerts — Nalgonda territory</div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border spinner-agronav" role="status"></div>
      </div>

      <!-- Empty state -->
      <div v-else-if="alerts.length === 0" class="text-center text-muted py-5">
        <i class="bi bi-check-circle fs-3"></i>
        <div class="mt-2">No active alerts</div>
      </div>

      <!-- Alert list -->
      <AlertCard
        v-else
        v-for="alert in alerts"
        :key="alert.id"
        :alert="alert"
        @dismiss="onDismiss"
      />
    </div>
  `,
  data() {
    return {
      alerts: [],
      loading: true
    };
  },
  async mounted() {
    try {
      // Try API first
      const data = await api.getAlerts();
      if (data && data.length > 0) {
        this.alerts = data;
      } else {
        // Fallback to cached data
        const cached = localStorage.getItem('agronav_daily_data');
        if (cached) {
          const parsed = JSON.parse(cached);
          this.alerts = (parsed.alerts || []).filter(a => !a.dismissed);
        }
      }
    } catch (e) {
      console.log('[Alerts] Load error:', e);
      try {
        const cached = localStorage.getItem('agronav_daily_data');
        if (cached) {
          const parsed = JSON.parse(cached);
          this.alerts = (parsed.alerts || []).filter(a => !a.dismissed);
        }
      } catch (e2) {
        console.log('[Alerts] Cache fallback also failed');
      }
    } finally {
      this.loading = false;
    }
  },
  methods: {
    onDismiss(alertId) {
      this.alerts = this.alerts.filter(a => a.id !== alertId);
    }
  }
};
