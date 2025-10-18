import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function AuthScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('No se pudo obtener el usuario.');

      const { data: userRow, error: userErr } = await supabase.from('User').select('*').eq('id', data.user.id).single();
      if (userErr || !userRow) throw new Error('No se pudo verificar el rol del usuario.');

      if (userRow.role === 'admin') router.replace('/(admin)' as Href);
      else router.replace('/(client)' as Href);
    } catch (e: any) {
      Alert.alert('Error de inicio de sesión', e?.message ?? 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Universo Tattoo</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="correo@ejemplo.com" autoCapitalize="none" />
      <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Contraseña" secureTextEntry />
      {loading ? <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} /> : <Button title="Iniciar sesión" onPress={handleLogin} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 40 },
  input: { height: 50, borderColor: '#ccc', borderWidth: 1, borderRadius: 8, marginBottom: 15, paddingHorizontal: 15, backgroundColor: '#fff' },
});