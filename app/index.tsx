import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../lib/supabase';

async function getUserRole(userId: string): Promise<'admin' | 'client' | null> {
  const { data, error } = await supabase
    .from('User')
    .select('role')
    .eq('id', userId)
    .single();
  if (error) {
    console.warn('No se pudo obtener rol:', error.message);
    return null;
  }
  return (data?.role as 'admin' | 'client') ?? null;
}

export default function RootEntry() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!mounted) return;

      if (!session) {
        router.replace('/(auth)' as Href);
        setChecking(false);
        return;
      }

      const role = await getUserRole(session.user.id);
      if (role === 'admin') router.replace('/(admin)' as Href);
      else router.replace('/(client)' as Href);

      setChecking(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[RootEntry] Auth event:', event);
      
      if (event === 'SIGNED_OUT') {
        router.replace('/(auth)' as Href);
        return;
      }
      
      // Ignorar SIGNED_IN si estamos en la pantalla de auth
      if (event === 'SIGNED_IN' && session) {
        // Pequeño delay para evitar race conditions con signOut
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verificar si realmente hay sesión activa
        const { data: currentSession } = await supabase.auth.getSession();
        if (!currentSession.session) {
          console.log('[RootEntry] No hay sesión activa, ignorando SIGNED_IN');
          return;
        }
        
        const role = await getUserRole(session.user.id);
        if (role === 'admin') router.replace('/(admin)' as Href);
        else router.replace('/(client)' as Href);
      }
      // Ignoramos TOKEN_REFRESHED/USER_UPDATED para evitar saltos
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return null;
}