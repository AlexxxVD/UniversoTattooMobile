import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { Tables } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';

type Producto = Tables<'Producto'>;

export default function ShopScreen() {
  const [items, setItems] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('Producto')
        .select('*')
        .eq('es_activo', true)
        .order('fecha_actualizacion', { ascending: false })
        .limit(50);
      if (!error) setItems(data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 20 }} />;

  return (
    <FlatList
      contentContainerStyle={{ padding: 16, gap: 10 }}
      data={items}
      keyExtractor={(p) => String(p.id_producto)}
      renderItem={({ item }) => (
        <Link
          href={{
            pathname: './(client)/product/[id]',
            params: { id: String(item.id_producto) },
          }}
          asChild
        >
          <Pressable style={styles.card}>
            <Text style={{ fontWeight: '700' }}>{item.nombre}</Text>
            <Text style={{ color: '#6B7280' }}>Precio desde: $ {item.precio_base.toLocaleString()}</Text>
            <Text>Stock: {item.stock_total}</Text>
            <Text style={{ color: '#007AFF', marginTop: 4 }}>Ver detalle</Text>
          </Pressable>
        </Link>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', padding: 12, borderRadius: 10, gap: 4 },
});