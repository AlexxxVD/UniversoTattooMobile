import { Screen } from '@/components/layout/Screen';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function DevolucionesScreen() {
  return (
    <Screen>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Política de Devoluciones</Text>
          <Text style={styles.text}>Contenido pendiente...</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  text: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
});
