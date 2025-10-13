import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase'; // OJO: La ruta de importación es ../../

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡Bienvenido, Admin!</Text>
      <Text style={styles.subtitle}>Dashboard en construcción.</Text>
      <Button title="Cerrar Sesión" onPress={() => supabase.auth.signOut()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: 'gray',
    marginTop: 8,
    marginBottom: 20,
  },
});