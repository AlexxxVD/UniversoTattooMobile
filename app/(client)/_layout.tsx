import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { HeaderBurger, MenuDrawerProvider } from '../../components/MenuDrawer';
import { useCartStore } from '../../lib/cart-store';
import { supabase } from '../../lib/supabase';

const C = {
  bg: '#0E1116',               // fondo negro
  text: '#F3F4F6',             // texto claro
  pill: 'rgba(124,58,237,0.14)'// pill violeta suave para el título
};

function TitlePill({ title }: { title: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: C.pill,
        maxWidth: '80%',
      }}
    >
      <Text numberOfLines={1} style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>
        {title}
      </Text>
    </View>
  );
}

function CartHeaderButton() {
  const router = useRouter();
  const count = useCartStore((s) => s.getTotalItems());

  return (
    <Pressable
      onPress={() => router.push('/(client)/cart')}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Ir al carrito"
      style={{ paddingRight: 8 }}
    >
      <View>
        {/* Icono blanco para el header oscuro */}
        <Ionicons name="cart-outline" size={22} color="#FFFFFF" />
        {count > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: '#EF4444',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 3,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
              {count > 99 ? '99+' : String(count)}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function ClientLayout() {
  // Menú actualizado:
  // - Inicio (nuevo Home en /(client)/index)
  // - Tienda (/(client)/store)
  // - Perfil (incluye sección de Favoritos dentro)
  // - Sobre nosotros
  // - Contacto
  // Nota: devoluciones, envios, preguntas-frecuentes y terminos-y-condiciones
  // no aparecen en el menú pero son accesibles via navegación directa
  const items = [
    { label: 'Inicio', href: '/(client)', icon: { name: 'home-outline' } },
    { label: 'Tienda', href: '/(client)/store', icon: { name: 'storefront-outline' } },
    { label: 'Perfil', href: '/(client)/profile', icon: { name: 'person-outline' } },
    { label: 'Sobre nosotros', href: '/(client)/about', icon: { name: 'information-circle-outline' } },
    { label: 'Contacto', href: '/(client)/contact', icon: { name: 'mail-outline' } },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <MenuDrawerProvider items={items} groupBase="/(client)" onLogout={handleLogout}>
      {/* Status bar clara para header oscuro */}
      <StatusBar style="light" backgroundColor={C.bg} />
      <Stack
        screenOptions={{
          // Header oscuro con iconos blancos
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: '#FFFFFF',
          headerTitle: ({ children }) => <TitlePill title={String(children ?? '')} />,
          headerTitleAlign: 'left',
          headerShadowVisible: false,
          // Fondo de las pantallas en negro
          contentStyle: { backgroundColor: C.bg },
          // Hamburguesa blanca (HeaderBurger ya la dibuja en blanco por defecto en el MenuDrawer adaptado)
          headerLeft: () => <HeaderBurger />,
          // Botón de carrito blanco
          headerRight: () => <CartHeaderButton />,
        }}
      >
        {/* Nuevo Home y Tienda (store). Se quita la pantalla independiente de Favoritos */}
        <Stack.Screen name="index" options={{ title: 'Inicio' }} />
        <Stack.Screen name="store" options={{ title: 'Tienda' }} />

        <Stack.Screen name="cart" options={{ title: 'Carrito' }} />
        <Stack.Screen name="profile" options={{ title: 'Perfil' }} />
        
        {/* Pantallas informativas (no aparecen en menú hamburguesa, accesibles por navegación) */}
        <Stack.Screen name="about" options={{ title: 'Sobre nosotros' }} />
        <Stack.Screen name="contact" options={{ title: 'Contacto' }} />
        <Stack.Screen name="devoluciones" options={{ title: 'Devoluciones' }} />
        <Stack.Screen name="envios" options={{ title: 'Envíos' }} />
        <Stack.Screen name="preguntas-frecuentes" options={{ title: 'Preguntas Frecuentes' }} />
        <Stack.Screen name="terminos-y-condiciones" options={{ title: 'Términos y Condiciones' }} />
        
        <Stack.Screen name="product/[id]" options={{ title: 'Producto' }} />
        <Stack.Screen name="checkout" options={{ title: 'Finalizar compra' }} />
      </Stack>
    </MenuDrawerProvider>
  );
}