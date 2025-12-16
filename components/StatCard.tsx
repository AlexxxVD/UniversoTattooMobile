import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1B2E',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    padding: 14,
    borderRadius: 12,
    flexBasis: '48%',
    flexGrow: 1,
    gap: 6,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  label: { color: '#A0A8B0', fontSize: 12, fontWeight: '600' },
  value: { fontSize: 18, fontWeight: '800', color: '#F3F4F6' },
});