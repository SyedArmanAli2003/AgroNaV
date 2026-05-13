// What it does: Queues visit outcomes in localStorage when offline, retries when online
// Input: outcome data (outlet_id, result, notes)
// Output: Stored in localStorage queue, flushed when online
// Called by: Visit.vue when network is unavailable

const offline = {

  // Queue an outcome when offline
  queueOutcome: (outlet_id, result, notes = "") => {
    try {
      const queue = JSON.parse(localStorage.getItem("outcome_queue") || "[]");
      queue.push({ outlet_id, result, notes, timestamp: Date.now() });
      localStorage.setItem("outcome_queue", JSON.stringify(queue));
      console.log('[offline] Outcome queued:', { outlet_id, result });
    } catch (e) {
      console.log('[offline] Queue failed:', e);
    }
  },

  // Flush all queued outcomes when back online
  flushQueue: async () => {
    try {
      const queue = JSON.parse(localStorage.getItem("outcome_queue") || "[]");
      if (queue.length === 0) return;

      console.log(`[offline] Flushing ${queue.length} queued outcomes...`);
      for (const item of queue) {
        await api.logOutcome(item.outlet_id, item.result, item.notes);
      }
      localStorage.removeItem("outcome_queue");
      console.log('[offline] Queue flushed successfully');
    } catch (e) {
      console.log('[offline] Flush failed, will retry:', e);
    }
  },

  // Get queue size for UI indicators
  getQueueSize: () => {
    try {
      const queue = JSON.parse(localStorage.getItem("outcome_queue") || "[]");
      return queue.length;
    } catch (e) {
      return 0;
    }
  }
};

// Auto-flush when coming back online
window.addEventListener("online", () => {
  console.log('[offline] Back online — flushing queue');
  offline.flushQueue();
});
