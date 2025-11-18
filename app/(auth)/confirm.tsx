import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

const C = {
  bg: '#0E1116',
  text: '#F3F4F6',
  muted: '#A0A8B0',
  primary: '#7C3AED',
  success: '#22C55E',
  danger: '#EF4444',
};

export default function ConfirmEmailScreen() {
  const params = useLocalSearchParams<{ token_hash?: string; type?: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando tu email...');

  useEffect(() => {
    handleConfirmation();
  }, []);

  async function handleConfirmation() {
    try {
      const tokenHash = params.token_hash;
      const type = params.type;

      console.log('🔐 [Confirm] Token hash:', tokenHash?.substring(0, 10) + '...');
      console.log('🔐 [Confirm] Type:', type);

      if (!tokenHash || type !== 'email') {
        setStatus('error');
        setMessage('Link de verificación inválido');
        Toast.show({ type: 'error', text1: 'Error', text2: 'Link de verificación inválido' });
        setTimeout(() => router.replace('/(auth)'), 3000);
        return;
      }

      // Verificar email con Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'email',
      });

      if (error) {
        console.error('❌ [Confirm] Error:', error);
        setStatus('error');
        setMessage('No se pudo verificar el email');
        Toast.show({ type: 'error', text1: 'Error', text2: error.message });
        setTimeout(() => router.replace('/(auth)'), 3000);
        return;
      }

      console.log('✅ [Confirm] Email verificado exitosamente');
      setStatus('success');
      setMessage('¡Email verificado correctamente!');
      Toast.show({ type: 'success', text1: '¡Éxito!', text2: 'Tu cuenta ha sido verificada' });

      // Redirigir según el rol del usuario
      setTimeout(async () => {
        if (data.user) {
          const { data: userRow } = await supabase
            .from('User')
            .select('role')
            .eq('id', data.user.id)
            .limit(1)
            .maybeSingle();

          const role = userRow?.role === 'admin' ? 'admin' : 'client';
          router.replace(role === 'admin' ? '/(admin)' : '/(client)');
        } else {
          router.replace('/(auth)');
        }
      }, 2000);

    } catch (err: any) {
      console.error('❌ [Confirm] Error inesperado:', err);
      setStatus('error');
      setMessage('Error inesperado al verificar');
      setTimeout(() => router.replace('/(auth)'), 3000);
    }
  }

  return (
    <View style={styles.container}>
      {status === 'loading' && (
        <>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.message}>{message}</Text>
        </>
      )}

      {status === 'success' && (
        <>
          <Text style={styles.icon}>✅</Text>
          <Text style={[styles.title, { color: C.success }]}>¡Verificado!</Text>
          <Text style={styles.message}>{message}</Text>
          <Text style={styles.submessage}>Redirigiendo...</Text>
        </>
      )}

      {status === 'error' && (
        <>
          <Text style={styles.icon}>❌</Text>
          <Text style={[styles.title, { color: C.danger }]}>Error</Text>
          <Text style={styles.message}>{message}</Text>
          <Text style={styles.submessage}>Redirigiendo al login...</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: C.text,
    textAlign: 'center',
    marginTop: 8,
  },
  submessage: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    marginTop: 4,
  },
});
