import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function DashboardLayout() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/(auth)');
    } catch (e) {
      console.warn('Error al cerrar sesión:', e);
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerRight: () => (
          <Pressable onPress={handleSignOut} style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: '#d00', fontWeight: '600' }}>Salir</Text>
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Resumen' }} />
      <Tabs.Screen name="orders" options={{ title: 'Pedidos' }} />
      <Tabs.Screen name="products" options={{ title: 'Productos' }} />
      <Tabs.Screen name="customers" options={{ title: 'Clientes' }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}