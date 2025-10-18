import { useRouter } from 'expo-router';
import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ajustes</Text>
      <Button title="Cerrar sesión" onPress={handleSignOut} color="#d00" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: '700' },
});