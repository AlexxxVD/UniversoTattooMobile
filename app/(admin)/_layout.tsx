import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import React, { useCallback } from 'react';
import { HeaderBurger, MenuDrawerProvider } from '../../components/MenuDrawer';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/color';

export default function AdminLayout() {
  const items = [
    { label: 'Dashboard', href: '/(admin)', icon: { name: 'speedometer-outline' } },
    { label: 'Pedidos', href: '/(admin)/orders', icon: { name: 'document-text-outline' } },
    { label: 'Productos', href: '/(admin)/products', icon: { name: 'cube-outline' } },
    { label: 'Clientes', href: '/(admin)/customers', icon: { name: 'people-outline' } },
    { label: 'Ajustes', href: '/(admin)/settings', icon: { name: 'settings-outline' } },
  ];

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <MenuDrawerProvider
      items={items}
      groupBase="/(admin)"
      onLogout={handleLogout}
      disableEdgeSwipe  // desactiva edge-swipe en admin para evitar cualquier interferencia
    >
      <Stack
        screenOptions={{
          headerLeft: ({ tintColor }) => <HeaderBurger color={tintColor ?? '#fff'} />,
          headerTitleAlign: 'center',
          headerTintColor: '#fff',
          headerTitleStyle: { color: '#fff', fontWeight: '800' },
          headerShadowVisible: false,
          headerBackground: () => (
            <LinearGradient
              pointerEvents="none"
              colors={['#0B0B0E', '#1A0E26', '#0B0B0E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          ),
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/* Podés ocultar el título si querés */}
        <Stack.Screen name="index" options={{ headerTitle: () => null }} />
        <Stack.Screen name="orders" options={{ title: 'Pedidos' }} />
        <Stack.Screen name="products" options={{ title: 'Productos' }} />
        <Stack.Screen name="customers" options={{ title: 'Clientes' }} />
        <Stack.Screen name="settings" options={{ title: 'Ajustes' }} />
      </Stack>
    </MenuDrawerProvider>
  );
}