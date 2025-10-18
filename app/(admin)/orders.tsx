import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Tables } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';

type Pedido = Tables<'Pedido'>;

export default function OrdersScreen() {
  const [items, setItems] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('Pedido')
        .select('*')
        .order('fecha_pedido', { ascending: false })
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
      keyExtractor={(item) => String(item.id_pedido)}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={{ fontWeight: '700' }}>#{item.numero_pedido}</Text>
          <Text style={{ color: '#6B7280' }}>{item.nombre_comprador ?? 'Cliente'}</Text>
          <Text>Total: $ {item.total.toLocaleString()}</Text>
          <Text style={{ color: '#6B7280' }}>
            {new Date(item.fecha_pedido).toLocaleString()} — {item.estado_pago}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', padding: 12, borderRadius: 10, gap: 4 },
});