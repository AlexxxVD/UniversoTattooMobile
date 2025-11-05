import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

// Tus colores (copiados de la otra pantalla)
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

export default function ResetPasswordScreen() {
  const router = useRouter();
  
  // 1. ATRAPAR EL TOKEN DE LA URL
  // Expo Router nos da el token del enlace (ej: ...?token=123)
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Lógica del teclado (igual que en tu otra pantalla)
  const [kbVisible, setKbVisible] = useState(false);
  useEffect(() => {
    const sh = Keyboard.addListener('keyboardDidShow', () => setKbVisible(true));
    const hd = Keyboard.addListener('keyboardDidHide', () => setKbVisible(false));
    return () => {
      sh.remove();
      hd.remove();
    };
  }, []);

  // 2. LLAMAR A TU API WEB (Archivo 4)
  async function handleReset() {
    Keyboard.dismiss();
    
    // Validaciones
    if (!token) {
      Toast.show({ type: 'error', text1: 'Enlace inválido', text2: 'El enlace de reseteo parece estar dañado o no existe.' });
      return;
    }
    if (password.length < 6) {
      Toast.show({ type: 'error', text1: 'Contraseña muy corta', text2: 'Debe tener al menos 6 caracteres.' });
      return;
    }
    if (password !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Las contraseñas no coinciden', text2: 'Por favor, verifícalas.' });
      return;
    }

    // ⚠️ CAMBIA ESTA URL por la URL real de tu web (ej: https://universotattoo.com)
    const urlDeTuApi = 'https://universotattoo.com.ar/api/reset-password'; // <-- Tu Archivo 4

    try {
      setLoading(true);

      // Esta es la lógica CORRECTA: llamar a tu propia API web (Archivo 4)
      const response = await fetch(urlDeTuApi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Enviamos el token y la nueva contraseña
        body: JSON.stringify({
          token: token,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Errores de la API (token expirado, etc.)
        Toast.show({
          type: 'error',
          text1: 'No se pudo actualizar',
          text2: data.error || 'Ocurrió un error al actualizar tu contraseña',
        });
        return;
      }

      // ¡Éxito!
      Toast.show({
        type: 'success',
        text1: '¡Contraseña actualizada!',
        text2: 'Ya podés iniciar sesión con tu nueva contraseña.',
      });

      // Enviamos al usuario al Login
      router.replace('/(auth)');

    } catch (e: any) {
      // Error de red (ej: sin internet)
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
              <Text style={styles.title}>Crear nueva contraseña</Text>
              <Text style={{ color: C.muted, textAlign: 'center' }}>
                Ingresá tu nueva contraseña segura
              </Text>
            </View>

            {/* Input de Nueva Contraseña */}
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color="#C4B5FD" />
              <TextInput
                style={styles.input}
                placeholder="Nueva contraseña"
                placeholderTextColor={C.muted}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                secureTextEntry={!showPassword}
                textContentType="newPassword"
                returnKeyType="next"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
              </Pressable>
            </View>

            {/* Input de Confirmar Contraseña */}
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color="#C4B5FD" />
              <TextInput
                style={styles.input}
                placeholder="Confirmar contraseña"
                placeholderTextColor={C.muted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                secureTextEntry={!showConfirmPassword}
                textContentType="newPassword"
                returnKeyType="send"
                onSubmitEditing={() => !loading && handleReset()}
              />
              <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
              </Pressable>
            </View>

            {/* Botón de Enviar */}
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
                  <Text style={styles.btnText}>Actualizando...</Text>
                </View>
              ) : (
                <View style={styles.rowBtn}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={styles.btnText}>Actualizar contraseña</Text>
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

// Tus estilos (copiados y adaptados)
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
  eyeIcon: {
    padding: 4,
  },

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