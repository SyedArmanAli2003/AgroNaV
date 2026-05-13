// What it does: Outcomes screen — shows stats and recent visit log table
// Input: Weekly stats and visit logs from API
// Output: Stats cards and scrollable table
// Called by: Navigation stack

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../services/api';

export default function OutcomesScreen() {
  const [weeklyStats, setWeeklyStats] = useState([]);
  const [visitLog, setVisitLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [logs, stats] = await Promise.all([
        api.getVisitLog(),
        api.getWeeklyStats()
      ]);
      setVisitLog(logs || []);
      setWeeklyStats(stats || []);
    } catch (e) {
      console.log('[Outcomes] Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const currentWeek = weeklyStats.length > 0 ? weeklyStats[weeklyStats.length - 1] : {};

  const outcomeColor = (outcome) => {
    if (outcome === 'sale') return '#27500A';
    if (outcome === 'order') return '#0d6efd';
    return '#999';
  };

  const renderLog = ({ item }) => (
    <View style={styles.logRow}>
      <Text style={styles.logOutlet}>{item.outlet_name}</Text>
      <Text style={[styles.logOutcome, { color: outcomeColor(item.outcome) }]}>{item.outcome}</Text>
      <Text style={styles.logDate}>{item.date}</Text>
      <View style={[styles.syncBadge, { backgroundColor: item.synced ? '#EAF3DE' : '#FAEEDA' }]}>
        <Text style={{ fontSize: 10, color: item.synced ? '#27500A' : '#633806' }}>
          {item.synced ? 'Synced' : 'Pending'}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1D9E75" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{currentWeek.visits || 0}</Text>
          <Text style={styles.statLabel}>Visits</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#0d6efd' }]}>{currentWeek.accepted || 0}</Text>
          <Text style={styles.statLabel}>Sales+Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{currentWeek.acceptance_rate || 0}%</Text>
          <Text style={styles.statLabel}>Rate</Text>
        </View>
      </View>

      {/* Visit Log */}
      <Text style={styles.sectionTitle}>RECENT VISIT LOG</Text>
      {visitLog.length === 0 ? (
        <Text style={styles.empty}>No visits logged yet</Text>
      ) : (
        <FlatList
          data={visitLog}
          renderItem={renderLog}
          keyExtractor={item => String(item.id)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', color: '#888', marginTop: 20 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: '#1D9E75' },
  statLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  sectionTitle: { fontSize: 10, letterSpacing: 1, color: '#888', fontWeight: '600', marginBottom: 8 },
  logRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 4 },
  logOutlet: { flex: 1, fontSize: 13, fontWeight: '500' },
  logOutcome: { fontSize: 12, fontWeight: '600', marginRight: 8 },
  logDate: { fontSize: 11, color: '#888', marginRight: 8 },
  syncBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
});
