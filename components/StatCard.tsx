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
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 12,
    flexBasis: '48%',
    flexGrow: 1,
    gap: 6,
  },
  label: { color: '#6B7280', fontSize: 12, fontWeight: '600' },
  value: { fontSize: 18, fontWeight: '800' },
});