// What it does: Outcomes view — shows visit stats, acceptance rate chart, and visit log table
// Input: Weekly stats and visit logs from API
// Output: Stats row, Google Chart line chart, and visit log table
// Called by: Vue Router (/outcomes)

const Outcomes = {
  name: 'Outcomes',
  template: `
    <div class="container-fluid px-3 py-3">
      <!-- Stats Row -->
      <div class="row g-3 mb-4">
        <div class="col-4">
          <div class="card stat-card p-3 text-center">
            <div class="stat-value">{{ currentWeek.visits || 0 }}</div>
            <div class="stat-label">Visits This Week</div>
          </div>
        </div>
        <div class="col-4">
          <div class="card stat-card p-3 text-center">
            <div class="stat-value" style="color:#0d6efd">{{ currentWeek.accepted || 0 }}</div>
            <div class="stat-label">Sales + Orders</div>
          </div>
        </div>
        <div class="col-4">
          <div class="card stat-card p-3 text-center">
            <div class="stat-value">{{ currentWeek.acceptance_rate || 0 }}%</div>
            <div class="stat-label">Acceptance Rate</div>
          </div>
        </div>
      </div>

      <!-- Chart -->
      <div class="section-title">Acceptance rate trend</div>
      <div class="card stat-card p-3 mb-4">
        <div id="acceptance-chart" style="width:100%; height:250px;"></div>
        <div v-if="chartError" class="text-center text-muted py-3 small">
          <i class="bi bi-bar-chart"></i> Chart unavailable
        </div>
      </div>

      <!-- Visit Log -->
      <div class="section-title">Recent visit log</div>

      <div v-if="visitLog.length === 0" class="text-center text-muted py-4">
        <i class="bi bi-journal fs-3"></i>
        <div class="mt-2 small">No visits logged yet</div>
      </div>

      <div v-else class="card stat-card">
        <div class="table-responsive">
          <table class="table table-agronav mb-0">
            <thead>
              <tr>
                <th>Outlet</th>
                <th>Outcome</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in visitLog" :key="log.id">
                <td class="fw-medium">{{ log.outlet_name }}</td>
                <td>
                  <span :class="outcomeClass(log.outcome)">{{ log.outcome }}</span>
                </td>
                <td class="text-muted small">{{ log.date }}</td>
                <td>
                  <span :class="log.synced ? 'badge-synced' : 'badge-pending'">
                    {{ log.synced ? 'Synced' : 'Pending' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      weeklyStats: [],
      visitLog: [],
      chartError: false
    };
  },
  computed: {
    currentWeek() {
      if (this.weeklyStats.length === 0) return {};
      return this.weeklyStats[this.weeklyStats.length - 1];
    }
  },
  async mounted() {
    try {
      // Fetch visit log and weekly stats in parallel
      const [logs, stats] = await Promise.all([
        api.getVisitLog(),
        api.getWeeklyStats()
      ]);

      this.visitLog = logs || [];
      this.weeklyStats = stats || [];

      // Draw chart after data loads
      this.$nextTick(() => this.drawChart());
    } catch (e) {
      console.log('[Outcomes] Load error:', e);
      // Try cached weekly stats
      try {
        const cached = localStorage.getItem('agronav_daily_data');
        if (cached) {
          const data = JSON.parse(cached);
          this.weeklyStats = data.weekly_stats || [];
          this.$nextTick(() => this.drawChart());
        }
      } catch (e2) {
        console.log('[Outcomes] Cache fallback also failed');
      }
    }
  },
  methods: {
    outcomeClass(outcome) {
      const classes = {
        sale: 'outcome-sale',
        order: 'outcome-order',
        none: 'outcome-none'
      };
      return classes[outcome] || 'outcome-none';
    },

    drawChart() {
      if (this.weeklyStats.length === 0) return;

      try {
        if (typeof google === 'undefined' || typeof google.charts === 'undefined') {
          this.chartError = true;
          return;
        }

        google.charts.load('current', { packages: ['corechart'] });
        google.charts.setOnLoadCallback(() => {
          const chartEl = document.getElementById('acceptance-chart');
          if (!chartEl) return;

          const dataArr = [['Week', 'Acceptance Rate (%)']];
          this.weeklyStats.forEach(s => {
            dataArr.push([s.week_label, s.acceptance_rate]);
          });

          const data = google.visualization.arrayToDataTable(dataArr);

          const options = {
            curveType: 'function',
            legend: { position: 'none' },
            colors: ['#1D9E75'],
            lineWidth: 3,
            pointSize: 6,
            chartArea: { width: '85%', height: '75%' },
            vAxis: {
              minValue: 0,
              maxValue: 100,
              format: '#\'%\'',
              textStyle: { color: '#888', fontSize: 11 },
              gridlines: { color: '#f0f0f0' }
            },
            hAxis: {
              textStyle: { color: '#888', fontSize: 11 }
            },
            backgroundColor: 'transparent',
            animation: { startup: true, duration: 800, easing: 'out' }
          };

          const chart = new google.visualization.LineChart(chartEl);
          chart.draw(data, options);
        });
      } catch (e) {
        console.log('[Outcomes] Chart error:', e);
        this.chartError = true;
      }
    }
  }
};
