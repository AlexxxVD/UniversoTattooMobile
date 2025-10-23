import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

export default function VerifyPendingScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = (params?.email as string) || '';

  const [loading, setLoading] = useState(false);

  async function resend() {
    if (!email) {
      Toast.show({ type: 'error', text1: 'Sin email', text2: 'Volvé al registro e ingresá tu correo' });
      return;
    }
    try {
      setLoading(true);
      const redirectTo = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL || undefined;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        Toast.show({ type: 'error', text1: 'No se pudo reenviar', text2: error.message });
        return;
      }
      Toast.show({ type: 'success', text1: 'Email reenviado', text2: 'Revisá bandeja de entrada y spam' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verifica tu Email</Text>
      <Text style={styles.subtitle}>Te enviamos un enlace de verificación a:</Text>
      <Text style={styles.email}>{email}</Text>

      <Pressable onPress={resend} disabled={loading} style={[styles.btn, loading && { opacity: 0.7 }]}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Reenviar email de verificación</Text>}
      </Pressable>

      <Pressable onPress={() => router.replace('/(auth)')} style={{ marginTop: 12 }}>
        <Text style={styles.link}>Ir al login</Text>
      </Pressable>
    </View>
  );
}

import { useState } from 'react';

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center', backgroundColor: '#0b0b0b' },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 6 },
  subtitle: { color: '#d1d5db', textAlign: 'center' },
  email: { color: '#a78bfa', textAlign: 'center', fontWeight: '600', marginTop: 2, marginBottom: 16 },
  btn: { backgroundColor: '#7c3aed', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  link: { color: '#7c3aed', textAlign: 'center' },
});