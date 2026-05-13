// What it does: Renders a single outlet card with rank, name, priority badge, and reason chips
// Input: outlet (ScoredOutlet object) and rank (number)
// Output: Clickable card that navigates to Visit view
// Called by: Dashboard.vue

const OutletCard = {
  name: 'OutletCard',
  props: {
    outlet: { type: Object, required: true },
    rank: { type: Number, required: true }
  },
  template: `
    <div class="outlet-card p-3 mb-2" @click="goToVisit">
      <div class="d-flex align-items-center">
        <div class="rank-circle me-3">{{ rank }}</div>
        <div class="flex-grow-1">
          <div class="fw-semibold">{{ outlet.name }}</div>
          <div class="text-muted small">{{ outlet.owner_name }}</div>
        </div>
        <span :class="priorityClass">{{ outlet.label }}</span>
      </div>
      <div class="mt-2 ms-5" v-if="outlet.reasons && outlet.reasons.length">
        <span v-for="(reason, i) in outlet.reasons.slice(0, 3)" :key="i" class="reason-chip">
          {{ reason }}
        </span>
      </div>
    </div>
  `,
  computed: {
    priorityClass() {
      const classes = {
        HIGH: 'priority-high',
        MEDIUM: 'priority-medium',
        LOW: 'priority-low'
      };
      return classes[this.outlet.label] || 'priority-low';
    }
  },
  methods: {
    goToVisit() {
      this.$router.push('/visit/' + this.outlet.id);
    }
  }
};
