import { Stack } from 'expo-router';
import React from 'react';
import { HeaderBurger, MenuDrawerProvider } from '../../components/MenuDrawer';
import { supabase } from '../../lib/supabase';

export default function AdminLayout() {
  const items = [
    { label: 'Dashboard', href: '/(admin)', icon: { name: 'speedometer-outline' } },
    { label: 'Pedidos', href: '/(admin)/orders', icon: { name: 'document-text-outline' } },
    { label: 'Productos', href: '/(admin)/products', icon: { name: 'cube-outline' } },
    { label: 'Clientes', href: '/(admin)/customers', icon: { name: 'people-outline' } },
    { label: 'Ajustes', href: '/(admin)/settings', icon: { name: 'settings-outline' } },
  ];
  const handleLogout = async () => { await supabase.auth.signOut(); };

  return (
    <MenuDrawerProvider items={items} groupBase="/(admin)" onLogout={handleLogout}>
      <Stack screenOptions={{ headerLeft: () => <HeaderBurger /> }}>
        <Stack.Screen name="index" options={{ title: 'Dashboard' }} />
        <Stack.Screen name="orders" options={{ title: 'Pedidos' }} />
        <Stack.Screen name="products" options={{ title: 'Productos' }} />
        <Stack.Screen name="customers" options={{ title: 'Clientes' }} />
        <Stack.Screen name="settings" options={{ title: 'Ajustes' }} />
      </Stack>
    </MenuDrawerProvider>
  );
}