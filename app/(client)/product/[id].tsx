import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Tables } from '../../../lib/database.types';
import { supabase } from '../../../lib/supabase';

type Producto = Tables<'Producto'>;

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('Producto')
        .select('*')
        .eq('id_producto', Number(id))
        .single();
      setProducto(data ?? null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <ActivityIndicator style={{ marginTop: 20 }} />;
  if (!producto) return <View style={{ padding: 16 }}><Text>Producto no encontrado.</Text></View>;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Text style={styles.title}>{producto.nombre}</Text>
      <Text style={{ color: '#6B7280' }}>{producto.descripcion}</Text>
      <Text style={styles.price}>$ {producto.precio_base.toLocaleString()}</Text>
      <Button title="Volver" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800' },
  price: { fontSize: 22, fontWeight: '800', marginVertical: 8 },
});