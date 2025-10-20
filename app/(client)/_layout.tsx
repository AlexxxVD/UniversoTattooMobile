import { Stack } from 'expo-router';
import React from 'react';
import { HeaderBurger, MenuDrawerProvider } from '../../components/MenuDrawer';
import { supabase } from '../../lib/supabase';

export default function ClientLayout() {
  const items = [
    { label: 'Tienda', href: '/(client)', icon: { name: 'home-outline' } },
    { label: 'Carrito', href: '/(client)/cart', icon: { name: 'cart-outline' } },
    { label: 'Favoritos', href: '/(client)/favorites', icon: { name: 'heart-outline' } },
    { label: 'Perfil', href: '/(client)/profile', icon: { name: 'person-outline' } },
  ];
  const handleLogout = async () => { await supabase.auth.signOut(); };

  return (
    <MenuDrawerProvider items={items} groupBase="/(client)" onLogout={handleLogout}>
      <Stack screenOptions={{ headerLeft: () => <HeaderBurger /> }}>
        <Stack.Screen name="index" options={{ title: 'Tienda' }} />
        <Stack.Screen name="cart" options={{ title: 'Carrito' }} />
        <Stack.Screen name="favorites" options={{ title: 'Favoritos' }} />
        <Stack.Screen name="profile" options={{ title: 'Perfil' }} />
        <Stack.Screen name="product/[id]" options={{ title: 'Producto' }} />
      </Stack>
    </MenuDrawerProvider>
  );
}