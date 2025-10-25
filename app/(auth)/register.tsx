import { getPasswordStrength } from '@/lib/passwordStrength';
import { supabase } from '@/lib/supabase';
import { ensureUserRow } from '@/lib/userProfile';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
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
  primarySoft: 'rgba(124,58,237,0.14)',
  info: '#60A5FA',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
};

type Step = 1 | 2;

export default function RegisterScreen() {
  const expoRouter = useRouter();

  const [values, setValues] = useState({
    name: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // Centrado dinámico: si hay teclado, alineamos arriba
  const [kbVisible, setKbVisible] = useState(false);
  useEffect(() => {
    const sh = Keyboard.addListener('keyboardDidShow', () => setKbVisible(true));
    const hd = Keyboard.addListener('keyboardDidHide', () => setKbVisible(false));
    return () => {
      sh.remove();
      hd.remove();
    };
  }, []);

  const { strength, checks } = useMemo(() => getPasswordStrength(values.password), [values.password]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (user) {
          const { data: row } = await supabase.from('User').select('role').eq('id', user.id).limit(1).maybeSingle();
          const role = row?.role === 'admin' ? 'admin' : 'client';
          Toast.show({ type: 'success', text1: 'Ya tenés sesión activa', text2: 'Redirigiendo...' });
          if (role === 'admin') expoRouter.replace('/(admin)');
          else expoRouter.replace('/(client)');
          return;
        }
      } catch {
        // no bloquear
      } finally {
        setCheckingSession(false);
      }
    })();
  }, [expoRouter]);

  const onChange = (k: keyof typeof values, v: string | boolean) => setValues((s) => ({ ...s, [k]: v }));

  const validateStep1 = useCallback((): string | null => {
    if (!values.name.trim()) return 'El nombre es requerido';
    if (!values.lastName.trim()) return 'El apellido es requerido';
    const email = values.email.trim().toLowerCase();
    if (!email) return 'El email es requerido';
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Email inválido';
    return null;
  }, [values.name, values.lastName, values.email]);

  const validateStep2 = useCallback((): string | null => {
    const pwd = values.password;
    if (!pwd) return 'La contraseña es requerida';
    if (pwd.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (!/[a-z]/.test(pwd)) return 'Debe incluir al menos una letra minúscula';
    if (!/[A-Z]/.test(pwd)) return 'Debe incluir al menos una letra mayúscula';
    if (!/\d/.test(pwd)) return 'Debe incluir al menos un número';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return 'Debe incluir al menos un carácter especial';
    if (values.password !== values.confirmPassword) return 'Las contraseñas no coinciden';
    if (!values.acceptTerms) return 'Debés aceptar los términos y la política de privacidad';
    return null;
  }, [values.password, values.confirmPassword, values.acceptTerms]);

  const goNext = () => {
    const err = validateStep1();
    if (err) {
      Toast.show({ type: 'error', text1: 'Revisá los datos', text2: err });
      return;
    }
    setStep(2);
  };

  const goPrev = () => setStep(1);

  function mapSignUpError(message?: string) {
    const msg = (message || '').toLowerCase();
    if (msg.includes('user already registered')) return 'El correo ya está registrado';
    if (msg.includes('rate limit')) return 'Demasiados intentos, probá más tarde';
    return message || 'No se pudo crear la cuenta';
  }

  const handleRegister = async () => {
    const err2 = validateStep2();
    if (err2) {
      Toast.show({ type: 'error', text1: 'Revisá los datos', text2: err2 });
      return;
    }

    setSubmitting(true);
    try {
      const email = values.email.trim().toLowerCase();
      const emailRedirectTo = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL || undefined;

      const { data, error } = await supabase.auth.signUp({
        email,
        password: values.password,
        options: {
          emailRedirectTo,
          data: {
            firstName: values.name.trim(),
            lastName: values.lastName.trim(),
            phone: values.phone.trim() || null,
            address: values.address.trim() || null,
            role: 'user',
            acceptedTermsAt: new Date().toISOString(),
          },
        },
      });

      if (error) {
        Toast.show({ type: 'error', text1: 'No se pudo crear la cuenta', text2: mapSignUpError(error.message) });
        return;
      }

      if (!data.session) {
        Toast.show({ type: 'success', text1: 'Cuenta creada', text2: 'Te enviamos un email para verificar tu cuenta' });
        router.replace({ pathname: '/(auth)/verify-pending', params: { email } } as any);
        return;
      }

      await ensureUserRow({ defaultRole: 'user' });
      Toast.show({ type: 'success', text1: '¡Bienvenido!', text2: 'Cuenta creada correctamente' });
      router.replace('/');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error inesperado', text2: e?.message ?? 'Intentá nuevamente' });
    } finally {
      setSubmitting(false);
    }
  };

  const openTerms = () => Linking.openURL('https://tu-dominio.com/terminos');
  const openPrivacy = () => Linking.openURL('https://tu-dominio.com/privacidad');

  if (checkingSession) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ color: C.muted, marginTop: 8 }}>Verificando sesión...</Text>
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
            { padding: 16, paddingBottom: 28, flexGrow: 1 },
            { justifyContent: kbVisible ? 'flex-start' : 'center' }, // centrado vertical si no hay teclado
          ]}
        >
          {/* Header */}
          <View style={{ alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Text style={{ color: C.text, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>Únete a Universo Tattoo</Text>
            <Text style={{ color: C.muted, textAlign: 'center' }}>Crea tu cuenta y explorá el mundo de los tatuajes</Text>
          </View>

          {/* Progreso de pasos */}
          <View style={styles.card}>
            <View style={{ padding: 12, gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[styles.stepLabel, step >= 1 && styles.stepActive]}>Información personal</Text>
                <Text style={[styles.stepLabel, step >= 2 && styles.stepActive]}>Contraseña</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${step * 50}%` }]} />
              </View>
            </View>
          </View>

          {/* Step 1 */}
          {step === 1 && (
            <View style={[styles.card, { marginTop: 12 }]}>
              <View style={{ padding: 12, gap: 10 }}>
                <Field icon="person-outline" placeholder="Nombre" value={values.name} onChangeText={(t) => onChange('name', t)} />
                <Field icon="person-outline" placeholder="Apellido" value={values.lastName} onChangeText={(t) => onChange('lastName', t)} />
                <Field icon="mail-outline" placeholder="Correo electrónico" value={values.email} onChangeText={(t) => onChange('email', t)} keyboardType="email-address" autoCapitalize="none" />
                <Field icon="call-outline" placeholder="Teléfono (opcional)" value={values.phone} onChangeText={(t) => onChange('phone', t)} keyboardType="phone-pad" />
                <Field icon="location-outline" placeholder="Dirección (opcional)" value={values.address} onChangeText={(t) => onChange('address', t)} />

                <Pressable onPress={goNext} style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.92 }]}>
                  <View style={styles.rowBtn}>
                    <Ionicons name="arrow-forward-circle-outline" size={18} color="#fff" />
                    <Text style={styles.btnText}>Continuar</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <View style={[styles.card, { marginTop: 12 }]}>
              <View style={{ padding: 12, gap: 10 }}>
                {/* Contraseña */}
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={18} color="#C4B5FD" />
                  <TextInput
                    style={styles.input}
                    placeholder="Contraseña"
                    placeholderTextColor={C.muted}
                    secureTextEntry={!showPwd}
                    value={values.password}
                    onChangeText={(t) => onChange('password', t)}
                  />
                  <Pressable onPress={() => setShowPwd((s) => !s)} hitSlop={8}>
                    <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.primary} />
                  </Pressable>
                </View>

                {/* Indicadores de fortaleza */}
                {values.password.length > 0 && (
                  <View style={styles.meterBox}>
                    <View style={styles.meterRow}>
                      <Text style={styles.meterTitle}>Fortaleza de la contraseña</Text>
                      <Text style={[styles.meterBadge, strength >= 80 ? styles.strong : strength >= 60 ? styles.medium : styles.weak]}>
                        {strength >= 80 ? 'Muy fuerte' : strength >= 60 ? 'Fuerte' : strength >= 40 ? 'Media' : 'Débil'}
                      </Text>
                    </View>
                    <View style={styles.progressBarThin}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${strength}%`, backgroundColor: strength >= 80 ? C.success : strength >= 60 ? C.warning : C.danger },
                        ]}
                      />
                    </View>
                    <View style={{ marginTop: 6 }}>
                      {[
                        { key: 'length', label: '8+ caracteres' },
                        { key: 'lowercase', label: 'Letra minúscula' },
                        { key: 'uppercase', label: 'Letra mayúscula' },
                        { key: 'number', label: 'Número' },
                        { key: 'special', label: 'Carácter especial' },
                      ].map(({ key, label }) => {
                        const ok = (checks as any)[key];
                        return (
                          <View key={key} style={styles.checkRow}>
                            <Ionicons
                              name={ok ? 'checkmark-circle-outline' : 'close-circle-outline'}
                              size={16}
                              color={ok ? C.success : C.danger}
                              style={{ marginRight: 6 }}
                            />
                            <Text style={{ color: ok ? '#86efac' : C.muted }}>{label}</Text>
                          </View>
                        );
                      })}
                    </View>
                    {(() => {
                      const missing: string[] = [];
                      if (!checks.length) missing.push('La contraseña debe tener al menos 8 caracteres');
                      if (!checks.uppercase) missing.push('Debe incluir al menos una letra mayúscula');
                      if (!checks.number) missing.push('Debe incluir al menos un número');
                      if (!checks.special) missing.push('Debe incluir al menos un carácter especial');
                      return missing.length ? (
                        <View style={styles.missingBox}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Ionicons name="alert-circle-outline" size={16} color={C.warning} style={{ marginRight: 6 }} />
                            <Text style={{ color: '#fde68a', fontWeight: '600' }}>Requisitos faltantes:</Text>
                          </View>
                          {missing.map((m, i) => (
                            <Text key={i} style={{ color: '#fcd34d', fontSize: 12, marginBottom: 2 }}>
                              • {m}
                            </Text>
                          ))}
                        </View>
                      ) : null;
                    })()}
                  </View>
                )}

                {/* Confirmar contraseña */}
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={18} color="#C4B5FD" />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirmar contraseña"
                    placeholderTextColor={C.muted}
                    secureTextEntry={!showConfirmPwd}
                    value={values.confirmPassword}
                    onChangeText={(t) => onChange('confirmPassword', t)}
                  />
                  <Pressable onPress={() => setShowConfirmPwd((s) => !s)} hitSlop={8}>
                    <Ionicons name={showConfirmPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.primary} />
                  </Pressable>
                </View>
                {values.confirmPassword.length > 0 && values.password !== values.confirmPassword && (
                  <View style={styles.errorBox}>
                    <Ionicons name="close-circle-outline" size={16} color={C.danger} style={{ marginRight: 6 }} />
                    <Text style={{ color: '#fca5a5' }}>Las contraseñas no coinciden</Text>
                  </View>
                )}

                {/* Términos */}
                <Pressable onPress={() => onChange('acceptTerms', !values.acceptTerms)} style={styles.checkboxRow}>
                  <View style={[styles.checkbox, values.acceptTerms && styles.checkboxChecked]} />
                  <Text style={styles.checkboxText}>
                    Acepto los <Text style={styles.link} onPress={openTerms}>Términos</Text> y la <Text style={styles.link} onPress={openPrivacy}>Política de privacidad</Text>
                  </Text>
                </Pressable>

                {/* Acciones */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={goPrev} style={({ pressed }) => [styles.btnGhost, pressed && { opacity: 0.9 }]}>
                    <View style={styles.rowBtn}>
                      <Ionicons name="chevron-back-outline" size={18} color={C.text} />
                      <Text style={{ color: C.text, fontWeight: '700' }}>Atrás</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={handleRegister}
                    disabled={submitting}
                    style={({ pressed }) => [styles.btnPrimary, (submitting || pressed) && { opacity: 0.9 }]}
                  >
                    {submitting ? (
                      <View style={styles.rowBtn}>
                        <ActivityIndicator color="#fff" />
                        <Text style={styles.btnText}>Registrando...</Text>
                      </View>
                    ) : (
                      <View style={styles.rowBtn}>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                        <Text style={styles.btnText}>Registrarse</Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {/* Link a login */}
          <Pressable onPress={() => router.replace('/(auth)')} style={{ marginTop: 16, alignSelf: 'center' }}>
            <Text style={{ color: C.primary, fontWeight: '700' }}>¿Ya tenés cuenta? Iniciar sesión</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={styles.inputRow}>
      <Ionicons name={icon} size={18} color="#C4B5FD" />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    borderRadius: 16,
  },

  // Progreso
  stepLabel: { color: C.muted, fontSize: 12, fontWeight: '600' },
  stepActive: { color: C.primary },
  progressBar: { height: 8, borderRadius: 999, backgroundColor: '#11151B', overflow: 'hidden' },
  progressBarThin: { height: 6, borderRadius: 999, backgroundColor: '#27272a', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.primary },

  // Inputs comunes
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

  // Fila para icono + texto dentro de botones (evita fragmentos)
  rowBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Password meter
  meterBox: { backgroundColor: '#111111', borderWidth: 1, borderColor: '#27272a', borderRadius: 12, padding: 12, marginTop: 4 },
  meterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  meterTitle: { color: C.text, fontWeight: '600' },
  meterBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, color: '#111', fontWeight: '700', overflow: 'hidden' },
  strong: { backgroundColor: C.success },
  medium: { backgroundColor: C.warning },
  weak: { backgroundColor: C.danger },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },

  // Mensajes
  missingBox: { marginTop: 8, backgroundColor: '#451a03', borderColor: '#78350f', borderWidth: 1, borderRadius: 10, padding: 8 },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3f1313', borderColor: '#7f1d1d', borderWidth: 1, borderRadius: 10, padding: 8, marginTop: 2, marginBottom: 6 },

  // Checkbox Términos
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#6b7280', marginRight: 8, backgroundColor: 'transparent' },
  checkboxChecked: { backgroundColor: C.primary, borderColor: C.primary },
  checkboxText: { color: '#d1d5db', flex: 1 },
  link: { color: C.primary },

  // Botones
  btnPrimary: { backgroundColor: C.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: '#11151B' },
  btnText: { color: '#fff', fontWeight: '700' },
});