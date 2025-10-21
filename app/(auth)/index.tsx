import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Screen from '../../components/ui/Screen';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/color';

const USER_TABLE = 'User' as const;

export default function AuthScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      return Alert.alert('Campos requeridos', 'Ingresá email y contraseña.');
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('No se pudo obtener el usuario.');

      const { data: userRow, error: userErr } = await supabase
        .from(USER_TABLE)
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (userErr) {
        console.warn('Supabase select role error:', {
          message: userErr.message,
          details: (userErr as any).details,
          hint: (userErr as any).hint,
          code: (userErr as any).code,
        });
      }

      const role = (userRow?.role as 'admin' | 'client' | undefined) ?? 'client';
      if (role === 'admin') router.replace('/(admin)' as Href);
      else router.replace('/(client)' as Href);
    } catch (e: any) {
      Alert.alert('Error de inicio de sesión', e?.message ?? 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padded center>
      <View style={styles.card}>
        <Text style={styles.title}>Universo Tattoo</Text>
        <Text style={styles.subtitle}>Iniciá sesión para continuar</Text>

        <View style={{ gap: 12, marginTop: 20 }}>
          <Input
            placeholder="correo@ejemplo.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            textContentType="username"
            autoComplete="email"
          />
          <Input
            placeholder="Contraseña"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            textContentType="password"
            autoComplete="password"
          />
          <Button title="Iniciar sesión" onPress={handleLogin} loading={loading} />
        </View>

        <View style={styles.links}>
          <TouchableOpacity onPress={() => router.push('/(auth)/sign-up' as Href)}>
            <Text style={styles.linkPrimary}>Crear cuenta</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password' as Href)}>
            <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(17,18,22,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.25)',
    padding: 20,
    borderRadius: 18,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  links: {
    marginTop: 16,
    alignItems: 'center',
    gap: 8,
  },
  linkPrimary: {
    color: colors.primary,
    fontWeight: '700',
  },
  link: {
    color: colors.textSecondary,
  },
});