// What it does: Renders the Next Best Action recommendation card
// Input: nba object with product, pitch, tip, promotion, why
// Output: Styled card with product, pitch sections, and WHY NOW box
// Called by: Visit.vue

const NBACard = {
  name: 'NBACard',
  props: {
    nba: { type: Object, required: true }
  },
  template: `
    <div class="nba-card mb-3">
      <div class="card-header">
        <span class="section-title mb-0">Next Best Action</span>
      </div>
      <div class="card-body">
        <div class="nba-product mb-3">{{ nba.product }}</div>

        <div class="nba-section">
          <div class="nba-section-label">What to say</div>
          <div>{{ nba.pitch }}</div>
        </div>

        <div class="nba-section">
          <div class="nba-section-label">Agronomic tip</div>
          <div>{{ nba.tip }}</div>
        </div>

        <div class="nba-section">
          <div class="nba-section-label">Promotion</div>
          <div>{{ nba.promotion }}</div>
        </div>
      </div>
    </div>

    <div class="why-box">
      <strong>Why now:</strong> {{ nba.why }}
    </div>
  `
};
