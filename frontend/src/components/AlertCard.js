// What it does: Renders a single alert card with colored left border and dismiss button
// Input: alert object with message, severity, created_at, id
// Output: Styled alert card with dismiss functionality
// Called by: Alerts.vue

const AlertCard = {
  name: 'AlertCard',
  props: {
    alert: { type: Object, required: true }
  },
  emits: ['dismiss'],
  template: `
    <div class="alert-card p-3 mb-2" :class="borderClass">
      <div class="d-flex justify-content-between align-items-start">
        <div class="flex-grow-1">
          <div class="fw-semibold mb-1">{{ alert.message }}</div>
          <div class="text-muted small">
            <span :class="severityBadge">{{ alert.severity.toUpperCase() }}</span>
            <span class="ms-2">{{ formatTime(alert.created_at) }}</span>
          </div>
        </div>
        <button class="btn btn-sm btn-outline-secondary ms-2" @click="dismissAlert" title="Dismiss">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    </div>
  `,
  computed: {
    borderClass() {
      const classes = {
        high: 'alert-border-high',
        medium: 'alert-border-medium',
        info: 'alert-border-info'
      };
      return classes[this.alert.severity] || 'alert-border-info';
    },
    severityBadge() {
      const classes = {
        high: 'priority-high',
        medium: 'priority-medium',
        info: 'priority-low'
      };
      return classes[this.alert.severity] || 'priority-low';
    }
  },
  methods: {
    formatTime(dt) {
      if (!dt) return '';
      try {
        const d = new Date(dt);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      } catch (e) {
        return dt;
      }
    },
    async dismissAlert() {
      await api.dismissAlert(this.alert.id);
      this.$emit('dismiss', this.alert.id);
    }
  }
};
