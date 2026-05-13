// What it does: Creates and mounts the Vue 3 application
// Input: All components, views, and router defined in global scope
// Output: Mounted Vue app at #app
// Called by: index.html script load

const App = {
  name: 'App',
  components: { NavBar },
  template: `
    <div>
      <NavBar :alertCount="alertCount" />
      <router-view></router-view>
    </div>
  `,
  data() {
    return {
      alertCount: 0
    };
  },
  async created() {
    try {
      // Morning sync — fetch everything and cache
      const data = await api.morningSync();
      if (data) {
        localStorage.setItem('agronav_daily_data', JSON.stringify(data));
        this.alertCount = (data.alerts || []).filter(a => !a.dismissed).length;
      }
    } catch (e) {
      console.log('[App] Morning sync failed, using cached data');
      try {
        const cached = localStorage.getItem('agronav_daily_data');
        if (cached) {
          const data = JSON.parse(cached);
          this.alertCount = (data.alerts || []).filter(a => !a.dismissed).length;
        }
      } catch (e2) {
        console.log('[App] No cached data available');
      }
    }

    // Flush any queued offline outcomes
    offline.flushQueue();
  }
};

// Create and mount the app
const app = Vue.createApp(App);
app.use(router);
app.mount('#app');
