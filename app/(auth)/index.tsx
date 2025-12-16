import Ionicons from '@expo/vector-icons/Ionicons';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { supabase } from '../../lib/supabase';
import { ensureUserRow } from '../../lib/userProfile';

const C = {
  bg: '#0E1116',
  card: '#141821',
  border: '#2A2F3A',
  text: '#F3F4F6',
  muted: '#A0A8B0',
  primary: '#7C3AED',
  primarySoft: 'rgba(124,58,237,0.14)',
  info: '#60A5FA',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
};

function mapLoginError(message?: string) {
  const msg = (message || '').toLowerCase();
  if (msg.includes('email not confirmed')) return 'Debés confirmar tu correo antes de ingresar';
  if (msg.includes('invalid login credentials')) return 'Credenciales incorrectas';
  if (msg.includes('rate limit')) return 'Demasiados intentos, probá de nuevo más tarde';
  if (msg.includes('network')) return 'Problema de red, revisá tu conexión';
  return message || 'No se pudo iniciar sesión';
}

export default function AuthScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState('');
  const [resendOk, setResendOk] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Nuevo: detectar teclado para centrar o alinear arriba
  const [kbVisible, setKbVisible] = useState(false);
  useEffect(() => {
    const sh = Keyboard.addListener('keyboardDidShow', () => setKbVisible(true));
    const hd = Keyboard.addListener('keyboardDidHide', () => setKbVisible(false));
    return () => {
      sh.remove();
      hd.remove();
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        console.log('[login] Verificando sesión...');
        const { data, error } = await supabase.auth.getSession();
        console.log('[login] getSession result:', { 
          hasSession: !!data.session, 
          hasUser: !!data.session?.user,
          hasToken: !!data.session?.access_token,
          error: error?.message 
        });
        
        // Si hay error o no hay sesión válida, no redirigir
        if (error || !data.session?.user || !data.session?.access_token) {
          console.log('[login] No hay sesión válida, mostrando login');
          setChecking(false);
          return;
        }
        const user = data.session.user;
        
        // Verificar que el token no esté expirado
        const expiresAt = data.session.expires_at;
        if (expiresAt && expiresAt * 1000 < Date.now()) {
          console.log('[login] Sesión expirada, haciendo signOut');
          await supabase.auth.signOut();
          setChecking(false);
          return;
        }

        console.log('[login] Sesión válida encontrada, buscando rol...');
        const { data: userRow } = await supabase
          .from('User')
          .select('role')
          .eq('id', user.id)
          .limit(1)
          .maybeSingle();
        const role = userRow?.role === 'admin' ? 'admin' : 'client';

        console.log('[login] Redirigiendo a:', role);
        Toast.show({
          type: 'success',
          text1: 'Sesión activa',
          text2: 'Redirigiendo...',
        });

        if (role === 'admin') router.replace('/(admin)' as Href);
        else router.replace('/(client)' as Href);
        return;
      } catch (e) {
        console.warn('[login] session check error:', (e as any)?.message ?? e);
        setChecking(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const validate = () => {
    if (!email.trim() || !password) {
      Toast.show({ type: 'error', text1: 'Campos incompletos', text2: 'Ingresá tu correo y contraseña' });
      return false;
    }
    const isEmail = /^\S+@\S+\.\S+$/.test(email.trim());
    if (!isEmail) {
      Toast.show({ type: 'error', text1: 'Correo inválido', text2: 'Revisá el formato del correo' });
      return false;
    }
    return true;
  };

  const disabledResend = useMemo(() => resending || countdown > 0, [resending, countdown]);

  const handleLogin = useCallback(async () => {
    if (!validate()) return;
    setLoading(true);
    setRequiresVerification(false);
    setResendOk(false);
    setResendError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        const msg = mapLoginError(error.message);
        Toast.show({ type: 'error', text1: 'Error de inicio de sesión', text2: msg });
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setRequiresVerification(true);
        }
        return;
      }
      if (!data.user) {
        Toast.show({ type: 'error', text1: 'Error de inicio de sesión', text2: 'No se pudo obtener el usuario' });
        return;
      }

      await ensureUserRow({ defaultRole: 'client' });

      const { data: userRow, error: roleErr } = await supabase
        .from('User')
        .select('role')
        .eq('id', data.user.id)
        .limit(1)
        .maybeSingle();
      if (roleErr) console.warn('[login] role select error:', roleErr.message);

      const role = userRow?.role === 'admin' ? 'admin' : 'client';

      Toast.show({
        type: 'success',
        text1: '¡Bienvenido!',
        text2: role === 'admin' ? 'Ingresaste como Admin' : 'Ingresaste como Cliente',
      });

      if (role === 'admin') router.replace('/(admin)' as Href);
      else router.replace('/(client)' as Href);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error inesperado', text2: e?.message ?? 'Intentá nuevamente' });
    } finally {
      setLoading(false);
    }
  }, [email, password, router]);

  const handleResendVerification = useCallback(async () => {
    if (!email.trim()) {
      setResendError('Por favor ingresá tu email');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setResendError('Correo inválido');
      return;
    }
    setResending(true);
    setResendError('');
    setResendOk(false);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
      if (error) {
        setResendError(error.message || 'No se pudo reenviar el email');
      } else {
        setResendOk(true);
        setCountdown(60 * 5);
        Toast.show({ type: 'success', text1: 'Email reenviado', text2: 'Revisá tu bandeja o spam' });
        setTimeout(() => setResendOk(false), 5000);
      }
    } catch (e: any) {
      setResendError(e?.message ?? 'Error al reenviar el email');
    } finally {
      setResending(false);
    }
  }, [email]);

  const goToForgot = () => router.push('/(auth)/forgot-password' as Href);
  const goToRegister = () => router.push('/(auth)/register' as Href);

  if (checking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={[styles.center, { gap: 8 }]}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ color: C.muted }}>Verificando sesión...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            { padding: 20, paddingBottom: 28, flexGrow: 1 },
            // Centrado vertical si el teclado NO está visible
            { justifyContent: kbVisible ? 'flex-start' : 'center' },
          ]}
        >
          <View style={[styles.card, { padding: 16, gap: 14 }]}>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text style={{ color: C.text, fontSize: 22, fontWeight: '800' }}>Ingresa a Universo Tattoo</Text>
              <Text style={{ color: C.muted, textAlign: 'center' }}>Accedé a tu cuenta para explorar el mundo de los tatuajes</Text>
            </View>

            {requiresVerification ? (
              <View style={[styles.notice, { borderColor: 'rgba(251,191,36,0.35)', backgroundColor: 'rgba(120,53,15,0.3)' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.badgeAmber}>
                    <Ionicons name="mail-outline" size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FDE68A', fontWeight: '700' }}>Verificá tu email</Text>
                    <Text style={{ color: '#FCD34D' }}>Debés verificar tu correo antes de iniciar sesión.</Text>
                  </View>
                </View>

                <View style={[styles.separator, { marginVertical: 10 }]} />

                <Pressable
                  onPress={handleResendVerification}
                  disabled={disabledResend}
                  style={({ pressed }) => [
                    styles.btnPrimary,
                    disabledResend && { opacity: 0.6 },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  {resending ? (
                    <>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.btnText}>Reenviando email...</Text>
                    </>
                  ) : countdown > 0 ? (
                    <>
                      <Ionicons name="refresh-outline" size={16} color="#fff" />
                      <Text style={styles.btnText}>
                        Reenviar en {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="refresh-outline" size={16} color="#fff" />
                      <Text style={styles.btnText}>Reenviar email de verificación</Text>
                    </>
                  )}
                </Pressable>

                {resendOk ? (
                  <View style={[styles.chip, { borderColor: 'rgba(34,197,94,0.35)', backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#34D399" />
                    <Text style={{ color: '#A7F3D0', fontWeight: '700' }}>Email reenviado correctamente</Text>
                  </View>
                ) : null}
                {!!resendError && (
                  <View style={[styles.chip, { borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(127,29,29,0.35)' }]}>
                    <Ionicons name="alert-circle-outline" size={16} color="#FCA5A5" />
                    <Text style={{ color: '#FCA5A5' }}>{resendError}</Text>
                  </View>
                )}
              </View>
            ) : null}

            <View style={{ gap: 10 }}>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={18} color="#C4B5FD" />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    if (requiresVerification) setRequiresVerification(false);
                  }}
                  placeholder="Correo electrónico"
                  placeholderTextColor={C.muted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="username"
                />
              </View>

              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color="#C4B5FD" />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    if (requiresVerification) setRequiresVerification(false);
                  }}
                  placeholder="Contraseña"
                  placeholderTextColor={C.muted}
                  secureTextEntry
                  textContentType="password"
                />
              </View>
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.btnPrimary,
                { marginTop: 4 },
                (loading || pressed) && { opacity: 0.85 },
              ]}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.btnText}>Iniciando...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                  <Text style={styles.btnText}>Iniciar sesión</Text>
                </>
              )}
            </Pressable>

            <Pressable onPress={goToForgot} hitSlop={8} style={{ alignSelf: 'center', marginTop: 10 }}>
              <Text style={{ color: C.info, fontWeight: '600' }}>¿Olvidaste tu contraseña?</Text>
            </Pressable>
            <Pressable onPress={goToRegister} hitSlop={8} style={{ alignSelf: 'center' }}>
              <Text style={{ color: C.primary, fontWeight: '700' }}>¿No tenés cuenta? Crear cuenta</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },

  inputRow: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#11151B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    color: C.text,
    paddingVertical: 10,
  },

  btnPrimary: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnText: { color: '#fff', fontWeight: '700' },

  notice: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  badgeAmber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  separator: { height: 1, backgroundColor: C.border },

  errorText: { color: C.danger, fontSize: 12, marginTop: 4 },
  warnText: { color: C.warning, fontSize: 12, marginTop: 4 },
});