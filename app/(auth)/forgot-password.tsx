import { requestPasswordReset } from '@/lib/email-service';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';

const C = {
  bg: '#0E1116',
  card: '#141821',
  border: '#2A2F3A',
  text: '#F3F4F6',
  muted: '#A0A8B0',
  primary: '#7C3AED',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
};

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Centrado vertical cuando no hay teclado
  const [kbVisible, setKbVisible] = useState(false);
  useEffect(() => {
    const sh = Keyboard.addListener('keyboardDidShow', () => setKbVisible(true));
    const hd = Keyboard.addListener('keyboardDidHide', () => setKbVisible(false));
    return () => {
      sh.remove();
      hd.remove();
    };
  }, []);

  const validateEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim().toLowerCase());

  async function handleReset() {
    const value = email.trim().toLowerCase();
    if (!validateEmail(value)) {
      Toast.show({ type: 'error', text1: 'Correo inválido', text2: 'Ingresá un correo válido' });
      return;
    }

    try {
      setLoading(true);

      const result = await requestPasswordReset(value);

      if (!result.success) {
        Toast.show({
          type: 'error',
          text1: 'No se pudo enviar el correo',
          text2: result.error || 'Ocurrió un error al solicitar el reseteo',
        });
        return;
      }

      Toast.show({
        type: 'success',
        text1: 'Revisá tu correo',
        text2: 'Te enviamos un enlace para restablecer la contraseña',
      });

      router.replace('/(auth)');
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Error de red',
        text2: e?.message ?? 'No se pudo conectar. Intentá nuevamente',
      });
    } finally {
      setLoading(false);
    }
  }


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            { padding: 16, paddingBottom: 28, flexGrow: 1 },
            { justifyContent: kbVisible ? 'flex-start' : 'center' },
          ]}
        >
          <View style={[styles.card, { padding: 16, gap: 14 }]}>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text style={styles.title}>Recuperar contraseña</Text>
              <Text style={{ color: C.muted, textAlign: 'center' }}>
                Ingresá tu correo y te enviaremos un enlace para restablecerla
              </Text>
            </View>

            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color="#C4B5FD" />
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                placeholderTextColor={C.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="username"
                returnKeyType="send"
                onSubmitEditing={() => !loading && handleReset()}
              />
            </View>

            <Pressable
              onPress={handleReset}
              disabled={loading}
              style={({ pressed }) => [
                styles.btnPrimary,
                (loading || pressed) && { opacity: 0.9 },
              ]}
            >
              {loading ? (
                <View style={styles.rowBtn}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.btnText}>Enviando enlace...</Text>
                </View>
              ) : (
                <View style={styles.rowBtn}>
                  <Ionicons name="send-outline" size={18} color="#fff" />
                  <Text style={styles.btnText}>Enviar enlace</Text>
                </View>
              )}
            </Pressable>

            <Pressable onPress={() => router.replace('/(auth)')} style={{ alignSelf: 'center', marginTop: 6 }}>
              <Text style={{ color: C.primary, fontWeight: '700' }}>Volver a iniciar sesión</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    borderRadius: 16,
  },
  title: { fontSize: 22, fontWeight: '800', color: C.text, textAlign: 'center' },

  inputRow: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#11151B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  input: { flex: 1, color: C.text, paddingVertical: 10 },

  btnPrimary: {
    backgroundColor: C.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
  rowBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});