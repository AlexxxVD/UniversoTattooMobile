import { sendVerificationEmail } from '@/lib/email-service';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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
      
      const result = await sendVerificationEmail(email);

      if (!result.success) {
        if (result.remainingMinutes) {
          Toast.show({ 
            type: 'error', 
            text1: 'Esperá un momento', 
            text2: `Podés reenviar en ${result.remainingMinutes} minuto${result.remainingMinutes > 1 ? 's' : ''}` 
          });
        } else {
          Toast.show({ type: 'error', text1: 'No se pudo reenviar', text2: result.error });
        }
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center', backgroundColor: '#0b0b0b' },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 6 },
  subtitle: { color: '#d1d5db', textAlign: 'center' },
  email: { color: '#a78bfa', textAlign: 'center', fontWeight: '600', marginTop: 2, marginBottom: 16 },
  btn: { backgroundColor: '#7c3aed', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  link: { color: '#7c3aed', textAlign: 'center' },
});