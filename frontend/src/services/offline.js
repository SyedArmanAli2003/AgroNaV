// Queues outcomes and visit logs when offline, auto-sends when back online
import { api, postVisitLog } from "./api";

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

// Visit log offline queue configuration
const QUEUE_KEY = "agronav_visit_log_queue";
let isFlushing = false;

export const queueVisitLog = (visitLogData) => {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  queue.push({ ...visitLogData, queued_at: new Date().toISOString() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const flushVisitLogQueue = async () => {
  if (isFlushing) return;
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  if (queue.length === 0) return;

  isFlushing = true;
  const failed = [];

  for (const item of queue) {
    try {
      await postVisitLog(item);
    } catch {
      failed.push(item); // keep failed items in queue
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
  isFlushing = false;
};

// Register once at module level
window.addEventListener("online", () => {
  flushQueue();
  flushVisitLogQueue();
});
