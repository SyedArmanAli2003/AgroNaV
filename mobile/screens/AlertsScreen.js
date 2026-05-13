// What it does: Alerts screen — displays active alerts with dismiss
// Input: Alerts from API
// Output: FlatList of alert cards
// Called by: Navigation stack

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../services/api';

const severityColors = {
  high: '#dc3545',
  medium: '#ffc107',
  info: '#0d6efd',
};

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const data = await api.getAlerts();
      setAlerts(data || []);
    } catch (e) {
      console.log('[Alerts] Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const dismissAlert = async (id) => {
    await api.dismissAlert(id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const renderAlert = ({ item }) => {
    const color = severityColors[item.severity] || '#0d6efd';
    return (
      <View style={[styles.card, { borderLeftColor: color }]}>
        <View style={styles.cardContent}>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.severity}>{item.severity.toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={() => dismissAlert(item.id)} style={styles.dismissBtn}>
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1D9E75" /></View>;
  }

  if (alerts.length === 0) {
    return <View style={styles.center}><Text style={styles.empty}>No active alerts</Text></View>;
  }

  return (
    <FlatList
      data={alerts}
      renderItem={renderAlert}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { color: '#888', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderLeftWidth: 4, flexDirection: 'row', alignItems: 'center' },
  cardContent: { flex: 1 },
  message: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  severity: { fontSize: 11, color: '#888' },
  dismissBtn: { padding: 8 },
  dismissText: { fontSize: 16, color: '#999' },
});
