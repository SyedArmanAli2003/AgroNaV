// What it does: Renders Google Map with outlet markers colored by priority
// Input: outlets array of ScoredOutlet objects
// Output: Google Map with colored markers and info windows
// Called by: Dashboard.vue

const MapView = {
  name: 'MapView',
  props: {
    outlets: { type: Array, default: () => [] }
  },
  template: `
    <div class="mb-4">
      <div v-if="!mapAvailable" class="map-placeholder">
        <span><i class="bi bi-map me-2"></i>Map unavailable — add GOOGLE_MAPS_KEY to .env</span>
      </div>
      <div v-else id="gmap" class="map-container"></div>
    </div>
  `,
  data() {
    return {
      mapAvailable: false,
      map: null
    };
  },
  mounted() {
    this.initMap();
  },
  methods: {
    initMap() {
      // Check if Google Maps API is loaded
      if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        console.log('[MapView] Google Maps API not loaded — showing placeholder');
        this.mapAvailable = false;
        return;
      }

      try {
        this.mapAvailable = true;

        this.$nextTick(() => {
          const mapEl = document.getElementById('gmap');
          if (!mapEl) return;

          this.map = new google.maps.Map(mapEl, {
            center: { lat: 17.0575, lng: 79.2671 },
            zoom: 13,
            styles: [
              { featureType: "poi", stylers: [{ visibility: "off" }] },
              { featureType: "transit", stylers: [{ visibility: "off" }] }
            ],
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
          });

          this.addMarkers();
        });
      } catch (e) {
        console.log('[MapView] Map init error:', e);
        this.mapAvailable = false;
      }
    },

    addMarkers() {
      if (!this.map || !this.outlets.length) return;

      const markerColors = {
        HIGH: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        MEDIUM: 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png',
        LOW: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
      };

      const infoWindow = new google.maps.InfoWindow();

      this.outlets.forEach(outlet => {
        const marker = new google.maps.Marker({
          position: { lat: outlet.lat, lng: outlet.lng },
          map: this.map,
          title: outlet.name,
          icon: markerColors[outlet.label] || markerColors.LOW
        });

        marker.addListener('click', () => {
          const reason = (outlet.reasons && outlet.reasons[0]) || 'Scheduled visit';
          infoWindow.setContent(
            '<div style="font-family:Inter,sans-serif;padding:4px">' +
            '<b>' + outlet.name + '</b><br>' +
            '<span class="priority-' + outlet.label.toLowerCase() + '">' + outlet.label + '</span><br>' +
            '<small style="color:#666">' + reason + '</small>' +
            '</div>'
          );
          infoWindow.open(this.map, marker);
        });
      });
    }
  },
  watch: {
    outlets() {
      if (this.map) this.addMarkers();
    }
  }
};
