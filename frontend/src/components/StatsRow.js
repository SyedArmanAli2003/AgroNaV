// What it does: Displays 3 stat cards in a row (visits planned, high priority, acceptance rate)
// Input: stats object with visits, highCount, acceptanceRate
// Output: Rendered row of stat cards
// Called by: Dashboard.vue

const StatsRow = {
  name: 'StatsRow',
  props: {
    stats: { type: Object, default: () => ({ visits: 0, highCount: 0, acceptanceRate: 0 }) }
  },
  template: `
    <div class="row g-3 mb-4">
      <div class="col-4">
        <div class="card stat-card p-3 text-center">
          <div class="stat-value">{{ stats.visits }}</div>
          <div class="stat-label">Visits Planned</div>
        </div>
      </div>
      <div class="col-4">
        <div class="card stat-card p-3 text-center">
          <div class="stat-value" style="color:#A32D2D">{{ stats.highCount }}</div>
          <div class="stat-label">High Priority</div>
        </div>
      </div>
      <div class="col-4">
        <div class="card stat-card p-3 text-center">
          <div class="stat-value">{{ stats.acceptanceRate }}%</div>
          <div class="stat-label">Acceptance Rate</div>
        </div>
      </div>
    </div>
  `
};
