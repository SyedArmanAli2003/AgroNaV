// Queues outcomes when offline, auto-sends when back online
import { api } from "./api";

export function queueOutcome(outlet_id, result, order_value = 0) {
  const q = JSON.parse(localStorage.getItem("outcome_queue") || "[]");
  q.push({ outlet_id, result, order_value, ts: Date.now() });
  localStorage.setItem("outcome_queue", JSON.stringify(q));
}

export async function flushQueue() {
  const q = JSON.parse(localStorage.getItem("outcome_queue") || "[]");
  if (!q.length) return;
  for (const item of q) {
    try {
      await api.logOutcome(item.outlet_id, item.result, item.order_value);
    } catch {
      break;
    }
  }
  localStorage.removeItem("outcome_queue");
}

// Auto flush when internet returns
window.addEventListener("online", flushQueue);
