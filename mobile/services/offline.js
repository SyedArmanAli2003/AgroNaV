// What it does: Offline queue for React Native using expo-sqlite
// Input: Outcome data when offline
// Output: Stored in SQLite, flushed when online
// Called by: VisitScreen when network is unavailable

import * as SQLite from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';
import { api } from './api';

const db = SQLite.openDatabase('agronav_offline.db');

// Initialize offline queue table
db.transaction(tx => {
  tx.executeSql(
    'CREATE TABLE IF NOT EXISTS outcome_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, outlet_id INTEGER, result TEXT, notes TEXT, timestamp INTEGER)'
  );
});

export const offline = {
  // Queue an outcome when offline
  queueOutcome: (outlet_id, result, notes = "") => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO outcome_queue (outlet_id, result, notes, timestamp) VALUES (?, ?, ?, ?)',
        [outlet_id, result, notes, Date.now()]
      );
    });
    console.log('[offline] Outcome queued:', { outlet_id, result });
  },

  // Flush all queued outcomes when back online
  flushQueue: async () => {
    return new Promise((resolve) => {
      db.transaction(tx => {
        tx.executeSql('SELECT * FROM outcome_queue', [], async (_, { rows }) => {
          const items = rows._array;
          if (items.length === 0) { resolve(); return; }

          console.log(`[offline] Flushing ${items.length} queued outcomes...`);
          for (const item of items) {
            await api.logOutcome(item.outlet_id, item.result, item.notes);
          }

          db.transaction(tx2 => {
            tx2.executeSql('DELETE FROM outcome_queue');
          });
          console.log('[offline] Queue flushed successfully');
          resolve();
        });
      });
    });
  }
};

// Auto-flush when coming back online
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    offline.flushQueue();
  }
});
