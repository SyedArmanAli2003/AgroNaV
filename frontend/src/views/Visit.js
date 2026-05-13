// What it does: Visit view — shows outlet details, NBA card, and outcome logging
// Input: Route param :id (outlet_id)
// Output: Outlet info, NBA recommendation, and outcome buttons
// Called by: Vue Router (/visit/:id)

const Visit = {
  name: 'Visit',
  components: { NBACard },
  template: `
    <div class="container-fluid px-3 py-3">
      <!-- Back link -->
      <a href="#" class="back-link mb-3 d-inline-block" @click.prevent="$router.push('/dashboard')">
        <i class="bi bi-arrow-left"></i> Back to route
      </a>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border spinner-agronav" role="status"></div>
        <div class="text-muted mt-2 small">Loading visit details...</div>
      </div>

      <div v-else-if="outlet">
        <!-- Outlet Header -->
        <div class="d-flex align-items-center mb-3 mt-2">
          <div class="flex-grow-1">
            <h5 class="fw-bold mb-0">{{ outlet.name }}</h5>
            <div class="text-muted small">{{ outlet.type }} · {{ outlet.owner_name }}</div>
          </div>
          <span :class="priorityClass">{{ outlet.label }}</span>
        </div>

        <!-- Reason chips -->
        <div class="mb-3" v-if="outlet.reasons && outlet.reasons.length">
          <span v-for="(reason, i) in outlet.reasons" :key="i" class="reason-chip">
            {{ reason }}
          </span>
        </div>

        <!-- NBA Card -->
        <NBACard v-if="nba" :nba="nba" />

        <!-- Log Outcome -->
        <div class="mt-4">
          <div class="section-title">How did this visit go?</div>
          <div class="d-flex gap-2 flex-wrap">
            <button
              class="btn btn-outline-success outcome-btn"
              :disabled="outcomeLogged"
              @click="logOutcome('sale')"
            >
              <i class="bi bi-check-circle me-1"></i> Sale made
            </button>
            <button
              class="btn btn-outline-primary outcome-btn"
              :disabled="outcomeLogged"
              @click="logOutcome('order')"
            >
              <i class="bi bi-cart-plus me-1"></i> Order placed
            </button>
            <button
              class="btn btn-outline-danger outcome-btn"
              :disabled="outcomeLogged"
              @click="logOutcome('none')"
            >
              <i class="bi bi-x-circle me-1"></i> No purchase
            </button>
          </div>
          <div v-if="outcomeLogged" class="text-success small mt-2">
            <i class="bi bi-check2-circle"></i> Outcome saved
          </div>
        </div>
      </div>

      <div v-else class="text-center text-muted py-5">
        <i class="bi bi-exclamation-circle fs-3"></i>
        <div class="mt-2">Outlet not found</div>
      </div>

      <!-- Toast -->
      <div class="toast-container position-fixed bottom-0 end-0 p-3">
        <div ref="toastEl" class="toast align-items-center text-bg-success border-0" role="alert">
          <div class="d-flex">
            <div class="toast-body">
              <i class="bi bi-check-circle-fill me-1"></i> Outcome saved
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      outlet: null,
      nba: null,
      loading: true,
      outcomeLogged: false
    };
  },
  computed: {
    priorityClass() {
      if (!this.outlet) return '';
      const classes = {
        HIGH: 'priority-high',
        MEDIUM: 'priority-medium',
        LOW: 'priority-low'
      };
      return classes[this.outlet.label] || 'priority-low';
    }
  },
  async mounted() {
    const id = parseInt(this.$route.params.id);

    try {
      // Find outlet from localStorage cache
      const cached = localStorage.getItem('agronav_daily_data');
      if (cached) {
        const data = JSON.parse(cached);
        this.outlet = (data.outlets || []).find(o => o.id === id) || null;
      }

      // Fetch NBA card
      try {
        this.nba = await api.getNBA(id);
      } catch (e) {
        console.log('[Visit] NBA fetch failed, using fallback');
        this.nba = FALLBACK_NBA;
      }

      if (!this.nba) {
        this.nba = FALLBACK_NBA;
      }
    } catch (e) {
      console.log('[Visit] Load error:', e);
      this.nba = FALLBACK_NBA;
    } finally {
      this.loading = false;
    }
  },
  methods: {
    async logOutcome(result) {
      if (this.outcomeLogged) return;

      try {
        const response = await api.logOutcome(this.outlet.id, result);
        if (!response) {
          // Offline — queue it
          offline.queueOutcome(this.outlet.id, result);
        }
      } catch (e) {
        // Offline — queue it
        offline.queueOutcome(this.outlet.id, result);
      }

      this.outcomeLogged = true;

      // Show toast
      try {
        const toastEl = this.$refs.toastEl;
        if (toastEl) {
          const toast = new bootstrap.Toast(toastEl);
          toast.show();
        }
      } catch (e) {
        console.log('[Visit] Toast error:', e);
      }
    }
  }
};
