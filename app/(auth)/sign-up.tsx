import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
// Ajusta esta ruta según tu proyecto:
import { supabase } from '../../lib/supabase';

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const onSignUp = async () => {
    if (!email || !password) return Alert.alert('Completar', 'Email y contraseña son requeridos')
    if (password !== confirm) return Alert.alert('Atención', 'Las contraseñas no coinciden')

    try {
      setLoading(true)
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Opcional: volver a la app después de confirmar email
          emailRedirectTo: 'universotattoomobile://auth-callback',
        },
      })
      if (error) throw error
      Alert.alert('Revisa tu correo', 'Te enviamos un email para confirmar tu cuenta.')
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '600' }}>Crear cuenta</Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
      />
      <TextInput
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
      />
      <TextInput
        placeholder="Confirmar contraseña"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
      />

      <TouchableOpacity onPress={onSignUp} disabled={loading} style={{ backgroundColor: '#6D28D9', padding: 14, borderRadius: 10 }}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>Registrarme</Text>}
      </TouchableOpacity>
    </View>
  )
}