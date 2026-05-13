// What it does: Dashboard screen — shows outlet list sorted by priority
// Input: API data from morningSync
// Output: FlatList of outlet cards with priority colors
// Called by: Navigation stack (App.js)

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../services/api';

const priorityColors = {
  HIGH: { bg: '#FCEBEB', text: '#A32D2D' },
  MEDIUM: { bg: '#FAEEDA', text: '#633806' },
  LOW: { bg: '#EAF3DE', text: '#27500A' },
};

export default function DashboardScreen({ navigation }) {
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await api.morningSync();
      if (data && data.outlets) {
        setOutlets(data.outlets);
      }
    } catch (e) {
      console.log('[Dashboard] Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const renderOutlet = ({ item, index }) => {
    const colors = priorityColors[item.label] || priorityColors.LOW;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Visit', { outlet: item })}
      >
        <View style={styles.cardRow}>
          <View style={styles.rankCircle}>
            <Text style={styles.rankText}>{index + 1}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardOwner}>{item.owner_name}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>{item.label}</Text>
          </View>
        </View>
        {item.reasons && item.reasons.length > 0 && (
          <View style={styles.reasons}>
            {item.reasons.slice(0, 3).map((r, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{r}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1D9E75" />
      </View>
    );
  }

  return (
    <FlatList
      data={outlets}
      renderItem={renderOutlet}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e8e8e8' },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  rankCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rankText: { fontSize: 12, fontWeight: '600', color: '#666' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600' },
  cardOwner: { fontSize: 12, color: '#888', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginLeft: 40 },
  chip: { backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, marginRight: 4, marginBottom: 4, borderWidth: 1, borderColor: '#e0e0e0' },
  chipText: { fontSize: 10, color: '#444' },
});
