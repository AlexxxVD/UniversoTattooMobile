import { getPasswordStrength } from '@/lib/passwordStrength';
import { supabase } from '@/lib/supabase';
import { ensureUserRow } from '@/lib/userProfile';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Toast from 'react-native-toast-message';

export default function RegisterScreen() {
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
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const { strength, checks } = useMemo(() => getPasswordStrength(values.password), [values.password]);

  const onChange = (k: keyof typeof values, v: string | boolean) => {
    setValues((s) => ({ ...s, [k]: v }));
  };

  const validate = () => {
    if (!values.name.trim()) return 'El nombre es requerido';
    if (!values.lastName.trim()) return 'El apellido es requerido';
    const email = values.email.trim().toLowerCase();
    if (!email) return 'El email es requerido';
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Correo inválido';
    if (!values.password || values.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (!/[a-z]/.test(values.password)) return 'La contraseña debe incluir una letra minúscula';
    if (!/[A-Z]/.test(values.password)) return 'La contraseña debe incluir una letra mayúscula';
    if (!/\d/.test(values.password)) return 'La contraseña debe incluir un número';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(values.password)) return 'La contraseña debe incluir un carácter especial';
    if (values.password !== values.confirmPassword) return 'Las contraseñas no coinciden';
    if (!values.acceptTerms) return 'Debés aceptar los términos y la política de privacidad';
    return null;
  };

  function mapSignUpError(message?: string) {
    const msg = (message || '').toLowerCase();
    if (msg.includes('user already registered')) return 'El correo ya está registrado';
    if (msg.includes('rate limit')) return 'Demasiados intentos, probá más tarde';
    return message || 'No se pudo crear la cuenta';
  }

  const handleRegister = async () => {
    const err = validate();
    if (err) {
      Toast.show({ type: 'error', text1: 'Revisá los datos', text2: err });
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
          emailRedirectTo, // apunta a tu verificador web
          data: {
            firstName: values.name.trim(),
            lastName: values.lastName.trim(),
            phone: values.phone.trim() || null,
            address: values.address.trim() || null,
            role: 'user', // por consistencia con tu dashboard
            acceptedTermsAt: new Date().toISOString(),
          },
        },
      });

      if (error) {
        Toast.show({ type: 'error', text1: 'No se pudo crear la cuenta', text2: mapSignUpError(error.message) });
        return;
      }

      // Si tu proyecto pide confirmar email, no habrá session aquí:
      if (!data.session) {
        // Notificación personalizada y pantalla “pendiente de verificación”
        Toast.show({
          type: 'success',
          text1: 'Cuenta creada',
          text2: 'Te enviamos un email para verificar tu cuenta',
        });
        router.replace({
          pathname: '/(auth)/verify-pending',
          params: { email },
        } as any);
        return;
      }

      // Si entra directo (confirmación desactivada), creamos fila y redirigimos
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear cuenta</Text>

      <TextInput style={styles.input} placeholder="Nombre" value={values.name} onChangeText={(t) => onChange('name', t)} />
      <TextInput style={styles.input} placeholder="Apellido" value={values.lastName} onChangeText={(t) => onChange('lastName', t)} />
      <TextInput style={styles.input} placeholder="Correo electrónico" autoCapitalize="none" keyboardType="email-address" value={values.email} onChangeText={(t) => onChange('email', t)} />
      <TextInput style={styles.input} placeholder="Teléfono (opcional)" keyboardType="phone-pad" value={values.phone} onChangeText={(t) => onChange('phone', t)} />
      <TextInput style={styles.input} placeholder="Dirección (opcional)" value={values.address} onChangeText={(t) => onChange('address', t)} />

      {/* Contraseña + ojo */}
      <View style={styles.inputWithIcon}>
        <TextInput
          style={[styles.input, styles.inputFlex]}
          placeholder="Contraseña"
          secureTextEntry={!showPwd}
          value={values.password}
          onChangeText={(t) => onChange('password', t)}
        />
        <Pressable onPress={() => setShowPwd((s) => !s)} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name={showPwd ? 'eye-off' : 'eye'} size={22} color="#7c3aed" />
        </Pressable>
      </View>

      {/* Medidor de fortaleza y checklist */}
      {values.password.length > 0 && (
        <View style={styles.meterBox}>
          <View style={styles.meterRow}>
            <Text style={styles.meterTitle}>Fortaleza de la contraseña</Text>
            <Text style={[styles.meterBadge, strength >= 80 ? styles.strong : strength >= 60 ? styles.medium : styles.weak]}>
              {strength >= 80 ? 'Muy fuerte' : strength >= 60 ? 'Fuerte' : strength >= 40 ? 'Media' : 'Débil'}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${strength}%`, backgroundColor: strength >= 80 ? '#22c55e' : strength >= 60 ? '#eab308' : '#ef4444' }]} />
          </View>
          <View style={styles.checkGrid}>
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
                  <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={16} color={ok ? '#22c55e' : '#ef4444'} style={{ marginRight: 6 }} />
                  <Text style={{ color: ok ? '#86efac' : '#9ca3af' }}>{label}</Text>
                </View>
              );
            })}
          </View>
          {/* Requisitos faltantes */}
          {(() => {
            const missing: string[] = [];
            if (!checks.length) missing.push('La contraseña debe tener al menos 8 caracteres');
            if (!checks.uppercase) missing.push('Debe incluir al menos una letra mayúscula');
            if (!checks.number) missing.push('Debe incluir al menos un número');
            if (!checks.special) missing.push('Debe incluir al menos un carácter especial');
            return missing.length ? (
              <View style={styles.missingBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Ionicons name="alert-circle" size={16} color="#fbbf24" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#fde68a', fontWeight: '600' }}>Requisitos faltantes:</Text>
                </View>
                {missing.map((m, i) => (
                  <Text key={i} style={{ color: '#fcd34d', fontSize: 12, marginBottom: 2 }}>• {m}</Text>
                ))}
              </View>
            ) : null;
          })()}
        </View>
      )}

      {/* Confirmar contraseña + ojo */}
      <View style={styles.inputWithIcon}>
        <TextInput
          style={[styles.input, styles.inputFlex]}
          placeholder="Confirmar contraseña"
          secureTextEntry={!showConfirmPwd}
          value={values.confirmPassword}
          onChangeText={(t) => onChange('confirmPassword', t)}
        />
        <Pressable onPress={() => setShowConfirmPwd((s) => !s)} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name={showConfirmPwd ? 'eye-off' : 'eye'} size={22} color="#7c3aed" />
        </Pressable>
      </View>
      {values.confirmPassword.length > 0 && values.password !== values.confirmPassword && (
        <View style={styles.errorBox}>
          <Ionicons name="close-circle" size={16} color="#ef4444" style={{ marginRight: 6 }} />
          <Text style={{ color: '#fca5a5' }}>Las contraseñas no coinciden</Text>
        </View>
      )}

      <Pressable onPress={() => onChange('acceptTerms', !values.acceptTerms)} style={styles.checkboxRow}>
        <View style={[styles.checkbox, values.acceptTerms && styles.checkboxChecked]} />
        <Text style={styles.checkboxText}>
          Acepto los <Text style={styles.link} onPress={openTerms}>Términos</Text> y la <Text style={styles.link} onPress={openPrivacy}>Política de privacidad</Text>
        </Text>
      </Pressable>

      <Pressable onPress={handleRegister} disabled={submitting} style={[styles.btn, submitting && { opacity: 0.7 }]}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Registrarse</Text>}
      </Pressable>

      <Pressable onPress={() => router.replace('/(auth)')} style={{ marginTop: 12 }}>
        <Text style={styles.linkCentered}>¿Ya tenés cuenta? Iniciar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center', backgroundColor: '#0b0b0b' },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 12, textAlign: 'center' },
  input: { height: 50, borderWidth: 1, borderColor: '#2a2a2a', backgroundColor: '#121212', borderRadius: 12, paddingHorizontal: 14, color: '#fff', marginBottom: 10 },
  inputWithIcon: { position: 'relative', marginBottom: 10 },
  inputFlex: { paddingRight: 44 },
  iconBtn: { position: 'absolute', right: 12, top: 14 },
  meterBox: { backgroundColor: '#111111', borderWidth: 1, borderColor: '#27272a', borderRadius: 12, padding: 12, marginBottom: 10 },
  meterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  meterTitle: { color: '#e5e7eb', fontWeight: '600' },
  meterBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, color: '#111', fontWeight: '700', overflow: 'hidden' },
  strong: { backgroundColor: '#22c55e' }, medium: { backgroundColor: '#eab308' }, weak: { backgroundColor: '#ef4444' },
  progressBar: { height: 6, borderRadius: 9999, backgroundColor: '#27272a', overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%' },
  checkGrid: { marginTop: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  missingBox: { marginTop: 8, backgroundColor: '#451a03', borderColor: '#78350f', borderWidth: 1, borderRadius: 10, padding: 8 },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3f1313', borderColor: '#7f1d1d', borderWidth: 1, borderRadius: 10, padding: 8, marginTop: 2, marginBottom: 6 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#6b7280', marginRight: 8 },
  checkboxChecked: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  checkboxText: { color: '#d1d5db' },
  btn: { backgroundColor: '#111827', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600' },
  link: { color: '#7c3aed' },
  linkCentered: { color: '#7c3aed', textAlign: 'center' },
});