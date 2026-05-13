// What it does: Dashboard view — shows stats, map, and today's visit plan
// Input: Cached daily data from localStorage or API
// Output: Full dashboard with stats row, map, and outlet cards
// Called by: Vue Router (/ and /dashboard routes)

const Dashboard = {
  name: 'Dashboard',
  components: { StatsRow, MapView, OutletCard },
  template: `
    <div class="container-fluid px-3 py-3">
      <!-- Loading state -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border spinner-agronav" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <div class="text-muted mt-2 small">Loading today's route...</div>
      </div>

      <div v-else>
        <!-- Stats Row -->
        <StatsRow :stats="dashStats" />

        <!-- Map -->
        <MapView :outlets="outlets" />

        <!-- Visit Plan -->
        <div class="section-title mt-4">Today's visit plan</div>

        <div v-if="outlets.length === 0" class="text-center text-muted py-4">
          <i class="bi bi-inbox fs-3"></i>
          <div class="mt-2">No outlets loaded</div>
        </div>

        <OutletCard
          v-for="(outlet, index) in outlets"
          :key="outlet.id"
          :outlet="outlet"
          :rank="index + 1"
        />
      </div>
    </div>
  `,
  data() {
    return {
      outlets: [],
      weeklyStats: [],
      loading: true
    };
  },
  computed: {
    dashStats() {
      const highCount = this.outlets.filter(o => o.label === 'HIGH').length;
      const lastStat = this.weeklyStats.length > 0
        ? this.weeklyStats[this.weeklyStats.length - 1]
        : null;
      const acceptanceRate = lastStat ? lastStat.acceptance_rate : 0;

      return {
        visits: this.outlets.length,
        highCount: highCount,
        acceptanceRate: acceptanceRate
      };
    }
  },
  async mounted() {
    try {
      // Try to read from localStorage first
      const cached = localStorage.getItem('agronav_daily_data');
      if (cached) {
        const data = JSON.parse(cached);
        this.outlets = data.outlets || [];
        this.weeklyStats = data.weekly_stats || [];
        this.loading = false;
      }

      // Fetch fresh data from API
      const data = await api.morningSync();
      if (data) {
        this.outlets = data.outlets || [];
        this.weeklyStats = data.weekly_stats || [];
        localStorage.setItem('agronav_daily_data', JSON.stringify(data));
      }
    } catch (e) {
      console.log('[Dashboard] Load error:', e);
      // Try localStorage fallback
      try {
        const cached = localStorage.getItem('agronav_daily_data');
        if (cached) {
          const data = JSON.parse(cached);
          this.outlets = data.outlets || [];
          this.weeklyStats = data.weekly_stats || [];
        }
      } catch (e2) {
        console.log('[Dashboard] Cache fallback also failed');
      }
    } finally {
      this.loading = false;
    }
  }
};
