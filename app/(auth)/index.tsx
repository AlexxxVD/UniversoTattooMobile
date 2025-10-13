import React, { useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../lib/supabase';
// --- PASO DE DIAGNÓSTICO 1: Importar los tipos directamente ---
import { Tables } from '../../lib/database.types';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error("No se pudo obtener la información del usuario.");

      // --- PASO DE DIAGNÓSTICO 2: Forzar el tipo de la variable ---
      // Vamos a definir explícitamente que 'userData' debe ser un objeto del tipo 'User' o null.
      let userData: Tables<'User'> | null = null;

      const { data, error: userError } = await supabase
        .from('User')
        .select('*') // Seleccionamos todo para que coincida con el tipo 'Tables<'User'>'
        .eq('id', authData.user.id)
        .single();
      
      if (userError) throw new Error("No se pudo verificar el rol del usuario.");

      // Asignamos el resultado a nuestra variable tipada.
      // Si hay un error aquí, nos dirá por qué los tipos son incompatibles.
      userData = data;


      // La lógica de comprobación sigue siendo la misma.
      if (!userData) {
        await supabase.auth.signOut();
        const message = "No se encontró un perfil de usuario asociado a esta cuenta.";
        setError(message);
        Alert.alert("Error de Perfil", message);
        return;
      }

      if (userData.role !== 'admin') {
        await supabase.auth.signOut();
        const message = "Acceso denegado. Esta aplicación es solo para administradores.";
        setError(message);
        Alert.alert("Acceso Denegado", message);
        return;
      }

    } catch (e: any) {
      const errorMessage = e instanceof Error ? e.message : "Ocurrió un error inesperado";
      setError(errorMessage);
      Alert.alert("Error de inicio de sesión", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Universo Tattoo - Admin</Text>
      
      <TextInput
        style={styles.input}
        onChangeText={setEmail}
        value={email}
        placeholder="correo@ejemplo.com"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        onChangeText={setPassword}
        value={password}
        placeholder="Contraseña"
        secureTextEntry
      />

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : (
        <Button title="Iniciar Sesión" onPress={handleLogin} disabled={loading} />
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  loader: {
    marginTop: 20,
  },
  errorText: {
    marginTop: 15,
    color: 'red',
    textAlign: 'center',
  },
});