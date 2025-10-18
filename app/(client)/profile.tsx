import { useRouter } from 'expo-router';
import React from 'react';
import { Button, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, padding: 16, gap: 10 }}>
      <Text>Perfil</Text>
      <Button title="Cerrar sesión" onPress={async () => { await supabase.auth.signOut(); router.replace('/(auth)'); }} />
    </View>
  );
}