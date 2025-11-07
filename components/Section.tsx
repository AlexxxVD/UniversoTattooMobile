import React, { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { 
    backgroundColor: '#1E1B2E',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: { fontWeight: '800', fontSize: 16, color: '#F3F4F6' },
});