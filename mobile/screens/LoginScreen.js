// What it does: Login screen for the AgroNav mobile app
// Input: email/Rep ID + password
// Output: stores JWT in AsyncStorage, navigates to Dashboard
// Called by: navigation stack (App.js) — initial route

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { api } from '../services/api';

export default function LoginScreen({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      setError('Enter your email/Rep ID and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.login(identifier.trim(), password);
      // Replace so the user can't swipe back to Login
      navigation.replace('Dashboard');
    } catch (e) {
      setError('Invalid credentials. Check your email/Rep ID and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo — green circle with "AN" (no icon library needed) */}
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>AN</Text>
        </View>
        <Text style={styles.brand}>AgroNav</Text>
        <Text style={styles.subtitle}>Field Sales Intelligence</Text>

        {/* Email / Rep ID */}
        <Text style={styles.label}>Email or Rep ID</Text>
        <TextInput
          style={styles.input}
          placeholder="you@syngenta.com or REP_0203"
          placeholderTextColor="#9aa5a0"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={identifier}
          onChangeText={setIdentifier}
        />

        {/* Password */}
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#9aa5a0"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleLogin}
        />

        {/* Sign In */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>

        {/* Error */}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.hint}>Demo: rep@agronav.com / Rep1234!</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const GREEN = '#1D9E75';

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0f1a14' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: GREEN,
    alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: 1 },
  brand: { color: '#fff', fontSize: 26, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: '#9aa5a0', fontSize: 14, textAlign: 'center', marginBottom: 32 },
  label: { color: '#cfd8d3', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#17241d', borderWidth: 1, borderColor: '#2a3a31',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: '#fff', fontSize: 16, minHeight: 48,
  },
  button: {
    backgroundColor: GREEN, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center', marginTop: 26, minHeight: 52,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  error: { color: '#ff6b6b', fontSize: 13, textAlign: 'center', marginTop: 14 },
  hint: { color: '#5d6b63', fontSize: 12, textAlign: 'center', marginTop: 24 },
});
