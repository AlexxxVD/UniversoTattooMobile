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
  section: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, gap: 8 },
  title: { fontWeight: '800', fontSize: 16 },
});