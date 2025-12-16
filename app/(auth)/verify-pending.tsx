import { sendVerificationEmail } from '@/lib/email-service';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

const C = {
  bg: '#0E1116',
  card: '#141821',
  border: '#2A2F3A',
  text: '#F3F4F6',
  muted: '#9CA3AF',
  primary: '#7C3AED',
  primarySoft: 'rgba(124,58,237,0.15)',
  success: '#22C55E',
  warning: '#F59E0B',
};

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
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="mail-outline" size={48} color={C.primary} />
      </View>
      
      <Text style={styles.title}>¡Casi listo!</Text>
      <Text style={styles.subtitle}>Te enviamos emails a:</Text>
      <Text style={styles.email}>{email}</Text>

      <View style={styles.stepsCard}>
        <Text style={styles.stepsTitle}>Completá estos pasos:</Text>
        
        <View style={styles.step}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Verificá tu email</Text>
            <Text style={styles.stepDesc}>Hacé clic en "Confirmar mi Cuenta" en el primer email</Text>
          </View>
        </View>
        
        <View style={styles.step}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Establecé tu contraseña</Text>
            <Text style={styles.stepDesc}>Hacé clic en "Restablecer contraseña" en el segundo email para poder usar la web</Text>
          </View>
        </View>
        
        <View style={styles.step}>
          <View style={[styles.stepNumber, { backgroundColor: C.success }]}><Text style={styles.stepNumberText}>✓</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>¡Listo!</Text>
            <Text style={styles.stepDesc}>Ya podés iniciar sesión en la app y en la web</Text>
          </View>
        </View>
      </View>

      <View style={styles.noteCard}>
        <Ionicons name="information-circle-outline" size={20} color={C.warning} />
        <Text style={styles.noteText}>Revisá también tu carpeta de spam si no encontrás los emails</Text>
      </View>

      <Pressable onPress={resend} disabled={loading} style={[styles.btn, loading && { opacity: 0.7 }]}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Reenviar email de verificación</Text>}
      </Pressable>

      <Pressable onPress={() => router.replace('/(auth)')} style={styles.linkBtn}>
        <Text style={styles.link}>Ya verifiqué, ir al login</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  iconWrap: { 
    width: 96, height: 96, borderRadius: 48, 
    backgroundColor: 'rgba(124,58,237,0.15)', 
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 20 
  },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#9CA3AF', textAlign: 'center', fontSize: 15 },
  email: { color: '#A78BFA', textAlign: 'center', fontWeight: '700', fontSize: 16, marginTop: 4, marginBottom: 24 },
  
  stepsCard: { 
    backgroundColor: '#141821', 
    borderWidth: 1, borderColor: '#2A2F3A', 
    borderRadius: 16, padding: 16, gap: 16, marginBottom: 16 
  },
  stepsTitle: { color: '#fff', fontWeight: '700', fontSize: 16, marginBottom: 4 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNumber: { 
    width: 28, height: 28, borderRadius: 14, 
    backgroundColor: '#7C3AED', 
    alignItems: 'center', justifyContent: 'center' 
  },
  stepNumberText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  stepTitle: { color: '#F3F4F6', fontWeight: '600', fontSize: 15 },
  stepDesc: { color: '#9CA3AF', fontSize: 13, marginTop: 2, lineHeight: 18 },
  
  noteCard: { 
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.1)', 
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: 12, padding: 12, marginBottom: 20 
  },
  noteText: { color: '#FCD34D', fontSize: 13, flex: 1 },
  
  btn: { backgroundColor: '#7C3AED', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  linkBtn: { marginTop: 16, paddingVertical: 12 },
  link: { color: '#A78BFA', textAlign: 'center', fontWeight: '600' },
});