import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
// Ajusta esta ruta según tu proyecto:
import { supabase } from '../../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const onSendRecovery = async () => {
    if (!email) return Alert.alert('Completar', 'Ingresa tu email')

    try {
      setLoading(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Debe usar tu scheme actual
        redirectTo: 'universotattoomobile://reset-password',
      })
      if (error) throw error
      Alert.alert('Listo', 'Te enviamos un enlace para restablecer tu contraseña.')
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo enviar el email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '600' }}>Recuperar contraseña</Text>
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
      />
      <TouchableOpacity onPress={onSendRecovery} disabled={loading} style={{ backgroundColor: '#6D28D9', padding: 14, borderRadius: 10 }}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>Enviar enlace</Text>}
      </TouchableOpacity>
    </View>
  )
}