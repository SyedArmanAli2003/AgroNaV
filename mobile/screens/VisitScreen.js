// What it does: Visit screen — shows outlet details, NBA card, and outcome buttons
// Input: outlet param from navigation
// Output: NBA card layout with outcome logging
// Called by: Navigation from DashboardScreen

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { api, FALLBACK_NBA } from '../services/api';
import { offline } from '../services/offline';

export default function VisitScreen({ route }) {
  const { outlet } = route.params;
  const [nba, setNba] = useState(null);
  const [outcomeLogged, setOutcomeLogged] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNBA();
  }, []);

  const loadNBA = async () => {
    try {
      const data = await api.getNBA(outlet.id);
      setNba(data || FALLBACK_NBA);
    } catch (e) {
      setNba(FALLBACK_NBA);
    } finally {
      setLoading(false);
    }
  };

  const logOutcome = async (result) => {
    if (outcomeLogged) return;
    try {
      const response = await api.logOutcome(outlet.id, result);
      if (!response) {
        offline.queueOutcome(outlet.id, result);
      }
    } catch (e) {
      offline.queueOutcome(outlet.id, result);
    }
    setOutcomeLogged(true);
    Alert.alert('Success', 'Outcome saved');
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1D9E75" /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.outletName}>{outlet.name}</Text>
      <Text style={styles.outletType}>{outlet.type} · {outlet.owner_name}</Text>

      {nba && (
        <View style={styles.nbaCard}>
          <Text style={styles.nbaHeader}>NEXT BEST ACTION</Text>
          <Text style={styles.nbaProduct}>{nba.product}</Text>

          <View style={styles.nbaSection}>
            <Text style={styles.nbaSectionLabel}>WHAT TO SAY</Text>
            <Text>{nba.pitch}</Text>
          </View>

          <View style={styles.nbaSection}>
            <Text style={styles.nbaSectionLabel}>AGRONOMIC TIP</Text>
            <Text>{nba.tip}</Text>
          </View>

          <View style={styles.nbaSection}>
            <Text style={styles.nbaSectionLabel}>PROMOTION</Text>
            <Text>{nba.promotion}</Text>
          </View>

          <View style={styles.whyBox}>
            <Text style={styles.whyText}><Text style={{ fontWeight: '700' }}>Why now: </Text>{nba.why}</Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>HOW DID THIS VISIT GO?</Text>
      <View style={styles.buttons}>
        <TouchableOpacity style={[styles.btn, styles.btnSale]} onPress={() => logOutcome('sale')} disabled={outcomeLogged}>
          <Text style={styles.btnSaleText}>Sale made</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnOrder]} onPress={() => logOutcome('order')} disabled={outcomeLogged}>
          <Text style={styles.btnOrderText}>Order placed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnNone]} onPress={() => logOutcome('none')} disabled={outcomeLogged}>
          <Text style={styles.btnNoneText}>No purchase</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  outletName: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  outletType: { fontSize: 13, color: '#888', marginBottom: 16 },
  nbaCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e8e8e8' },
  nbaHeader: { fontSize: 10, letterSpacing: 1, color: '#888', fontWeight: '600', marginBottom: 8 },
  nbaProduct: { fontSize: 20, fontWeight: '700', color: '#1D9E75', marginBottom: 12 },
  nbaSection: { backgroundColor: '#fafafa', borderRadius: 8, padding: 12, marginBottom: 8 },
  nbaSectionLabel: { fontSize: 9, letterSpacing: 0.5, color: '#999', fontWeight: '600', marginBottom: 4 },
  whyBox: { backgroundColor: '#E1F5EE', borderRadius: 8, padding: 12, marginTop: 4 },
  whyText: { color: '#0F6E56', fontSize: 13 },
  sectionTitle: { fontSize: 10, letterSpacing: 1, color: '#888', fontWeight: '600', marginBottom: 12 },
  buttons: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1.5 },
  btnSale: { borderColor: '#198754' },
  btnSaleText: { color: '#198754', fontWeight: '600', fontSize: 13 },
  btnOrder: { borderColor: '#0d6efd' },
  btnOrderText: { color: '#0d6efd', fontWeight: '600', fontSize: 13 },
  btnNone: { borderColor: '#dc3545' },
  btnNoneText: { color: '#dc3545', fontWeight: '600', fontSize: 13 },
});
