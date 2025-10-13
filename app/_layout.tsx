import { Session } from '@supabase/supabase-js';
import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { supabase } from '../lib/supabase';

// Este hook personalizado protegerá nuestras rutas
function useProtectedRoute(session: Session | null) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // --- INICIO DE LA CORRECCIÓN FINAL ---
    // En lugar de comprobar 'segments.length', vamos a comprobar la longitud del array
    // de una manera que es menos propensa a errores de tipo.
    // Si el array de segmentos no tiene longitud (es decir, su longitud es 0),
    // la condición !segments.length será verdadera.
    if (!segments.length) {
      return; // Salimos y esperamos al siguiente render.
    }
    // --- FIN DE LA CORRECCIÓN FINAL ---

    const inAuthGroup = segments[0] === '(auth)';

    if (session && inAuthGroup) {
      router.replace('/(dashboard)');
    } else if (!session && !inAuthGroup) {
      router.replace('/(auth)');
    }
  }, [session, segments]);
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Es buena práctica devolver la función de limpieza
    return () => {
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  useProtectedRoute(session);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});