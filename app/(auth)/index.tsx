import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';
import { ensureUserRow } from '../../lib/userProfile';

export default function AuthScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.trim() || !password) {
      Toast.show({
        type: 'error',
        text1: 'Campos incompletos',
        text2: 'Ingresá tu correo y contraseña',
      });
      return false;
    }
    const isEmail = /^\S+@\S+\.\S+$/.test(email.trim());
    if (!isEmail) {
      Toast.show({
        type: 'error',
        text1: 'Correo inválido',
        text2: 'Revisá el formato del correo',
      });
      return false;
    }
    return true;
  };

  function mapLoginError(message?: string) {
    const msg = (message || '').toLowerCase();
    if (msg.includes('invalid login credentials')) return 'Credenciales incorrectas';
    if (msg.includes('email not confirmed')) return 'Debés confirmar tu correo antes de ingresar';
    if (msg.includes('rate limit')) return 'Demasiados intentos, probá de nuevo más tarde';
    if (msg.includes('network')) return 'Problema de red, revisá tu conexión';
    return message || 'No se pudo iniciar sesión';
  }

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        Toast.show({
          type: 'error',
          text1: 'Error de inicio de sesión',
          text2: mapLoginError(error.message),
        });
        return;
      }
      if (!data.user) {
        Toast.show({
          type: 'error',
          text1: 'Error de inicio de sesión',
          text2: 'No se pudo obtener el usuario',
        });
        return;
      }

      // Crear fila en public."User" si no existe (name = "Nombre Apellido")
      await ensureUserRow({ defaultRole: 'client' });

      // Leer rol (robusto)
      const { data: userRow, error: userErr } = await supabase
        .from('User')
        .select('role')
        .eq('id', data.user.id)
        .limit(1)
        .maybeSingle();

      if (userErr) {
        // No bloquees el acceso por esto; caé en client por defecto
        console.warn('[login] role select error:', userErr.message);
      }

      const role = userRow?.role === 'admin' ? 'admin' : 'client';

      Toast.show({
        type: 'success',
        text1: '¡Bienvenido!',
        text2: role === 'admin' ? 'Ingresaste como Admin' : 'Ingresaste como Cliente',
      });

      if (role === 'admin') router.replace('/(admin)' as Href);
      else router.replace('/(client)' as Href);
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Error inesperado',
        text2: e?.message ?? 'Intentá nuevamente',
      });
    } finally {
      setLoading(false);
    }
  };

  const goToForgot = () => router.push('/(auth)/forgot-password' as Href);
  const goToRegister = () => router.push('/(auth)/register' as Href);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Universo Tattoo</Text>

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="correo@ejemplo.com"
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="username"
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Contraseña"
        secureTextEntry
        textContentType="password"
      />

      <Pressable
        onPress={handleLogin}
        disabled={loading}
        style={({ pressed }) => [styles.btn, { opacity: loading || pressed ? 0.7 : 1 }]}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Iniciar sesión</Text>}
      </Pressable>

      <Pressable onPress={goToForgot} hitSlop={8} style={{ marginTop: 12 }}>
        <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
      </Pressable>

      <Pressable onPress={goToRegister} hitSlop={8} style={{ marginTop: 8 }}>
        <Text style={styles.link}>¿No tenés cuenta? Crear cuenta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 40 },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  btn: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
  link: { textAlign: 'center', color: '#007AFF', fontWeight: '500' },
});