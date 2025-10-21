import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
// Ajusta esta ruta según tu proyecto:
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const onUpdatePassword = async () => {
    if (!password) return Alert.alert('Completar', 'Ingresa la nueva contraseña')
    if (password !== confirm) return Alert.alert('Atención', 'Las contraseñas no coinciden')

    try {
      setLoading(true)
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      Alert.alert('Éxito', 'Tu contraseña fue actualizada. Ya puedes iniciar sesión.')
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '600' }}>Nueva contraseña</Text>
      <TextInput
        placeholder="Nueva contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
      />
      <TextInput
        placeholder="Confirmar nueva contraseña"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
      />
      <TouchableOpacity onPress={onUpdatePassword} disabled={loading} style={{ backgroundColor: '#6D28D9', padding: 14, borderRadius: 10 }}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>Actualizar</Text>}
      </TouchableOpacity>

      <Link href="/(auth)" style={{ color: '#6D28D9', textAlign: 'center', marginTop: 8 }}>
        Volver a iniciar sesión
      </Link>
    </View>
  )
}