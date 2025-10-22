import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Tables } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';

type Producto = Tables<'Producto'>;

export default function ProductsScreen() {
  const [items, setItems] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('Producto')
        .select('*')
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
      keyExtractor={(item) => String(item.id_producto)}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={{ fontWeight: '700' }}>{item.nombre}</Text>
          <Text style={{ color: '#6B7280' }}>SKU: {item.sku ?? '-'}</Text>
          <Text>Stock total: {item.stock_total}</Text>
          <Text>Precio base: $ {item.precio_base.toLocaleString()}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', padding: 12, borderRadius: 10, gap: 4 },
});