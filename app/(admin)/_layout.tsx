import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Text, View } from 'react-native';
import { HeaderBurger, MenuDrawerProvider } from '../../components/MenuDrawer';
import { supabase } from '../../lib/supabase';

const C = {
  bg: '#0E1116',
  text: '#F3F4F6',
  pill: 'rgba(124,58,237,0.14)',
};

function TitlePill({ title }: { title: string }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: C.pill, maxWidth: '80%' }}>
      <Text numberOfLines={1} style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>
        {title}
      </Text>
    </View>
  );
}

export default function AdminLayout() {
  const items = [
    { label: 'Dashboard', href: '/(admin)', icon: { name: 'speedometer-outline' } },
    { label: 'Pedidos', href: '/(admin)/orders', icon: { name: 'document-text-outline' } },
    { label: 'Productos', href: '/(admin)/products', icon: { name: 'cube-outline' } },
    { label: 'Clientes', href: '/(admin)/customers', icon: { name: 'people-outline' } },
    { label: 'Envíos', href: '/(admin)/shipments', icon: { name: 'send-outline' } },
    { label: 'Categorías', href: '/(admin)/categories', icon: { name: 'pricetags-outline' } },
    { label: 'Ajustes', href: '/(admin)/settings', icon: { name: 'settings-outline' } },
  ];
  const handleLogout = async () => { await supabase.auth.signOut(); };

  return (
    <MenuDrawerProvider items={items} groupBase="/(admin)" onLogout={handleLogout}>
      <StatusBar style="light" backgroundColor={C.bg} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: '#FFFFFF',
          headerTitle: ({ children }) => <TitlePill title={String(children ?? '')} />,
          headerTitleAlign: 'left',
          headerShadowVisible: false,
          // FIX: usar contentStyle en Native Stack (no sceneContainerStyle)
          contentStyle: { backgroundColor: C.bg },
          // Si tu HeaderBurger no recibe color como prop, deja solo <HeaderBurger />
          headerLeft: () => <HeaderBurger />,
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Dashboard' }} />
        <Stack.Screen name="orders" options={{ title: 'Pedidos' }} />
        <Stack.Screen name="products" options={{ title: 'Productos' }} />
        <Stack.Screen name="customers" options={{ title: 'Clientes' }} />
        <Stack.Screen name="shipments" options={{ title: 'Envíos' }} />
        <Stack.Screen name="categories" options={{ title: 'Categorías' }} />
        <Stack.Screen name="settings" options={{ title: 'Ajustes' }} />
      </Stack>
    </MenuDrawerProvider>
  );
}