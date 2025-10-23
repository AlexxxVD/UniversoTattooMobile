import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import Toast from 'react-native-toast-message';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    const value = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      Toast.show({ type: 'error', text1: 'Correo inválido', text2: 'Ingresá un correo válido' });
      return;
    }

    try {
      setLoading(true);
      const redirectTo = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL || undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(value, {
        redirectTo,
      });

      if (error) {
        Toast.show({
          type: 'error',
          text1: 'No se pudo enviar el correo',
          text2: error.message,
        });
        return;
      }

      Toast.show({
        type: 'success',
        text1: 'Revisa tu correo',
        text2: 'Te enviamos un enlace para restablecer la contraseña',
      });
      router.replace('./(auth)/login');
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Error inesperado',
        text2: e?.message ?? 'Intentá nuevamente',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 8 }}>Recuperar contraseña</Text>

      <TextInput
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Pressable
        onPress={handleReset}
        disabled={loading}
        style={({ pressed }) => [
          styles.btn,
          { opacity: loading || pressed ? 0.7 : 1 },
        ]}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Enviar enlace</Text>}
      </Pressable>

      <Pressable onPress={() => router.replace('./(auth)/login')}>
        <Text style={{ textAlign: 'center', color: '#007aff' }}>
          Volver a iniciar sesión
        </Text>
      </Pressable>
    </View>
  );
}

const styles = {
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  btn: {
    marginTop: 8,
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  btnText: { color: '#fff', fontWeight: '600' as const },
};