import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function ClientLayout() {
  const router = useRouter();
  const handleSignOut = async () => { await supabase.auth.signOut(); router.replace('/(auth)'); };

  return (
    <Tabs screenOptions={{ headerRight: () => (
      <Pressable onPress={handleSignOut} style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
        <Text style={{ color: '#d00', fontWeight: '600' }}>Salir</Text>
      </Pressable>
    )}}>
      <Tabs.Screen name="index" options={{ title: 'Tienda' }} />
      <Tabs.Screen name="cart" options={{ title: 'Carrito' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Favoritos' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}