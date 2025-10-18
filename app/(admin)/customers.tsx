import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Tables } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';

type Cliente = Tables<'Cliente'>;

export default function CustomersScreen() {
  const [items, setItems] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('Cliente')
        .select('*')
        .order('fecha_registro', { ascending: false })
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
      keyExtractor={(item) => String(item.id_cliente)}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={{ fontWeight: '700' }}>
            {item.nombre} {item.apellido}
          </Text>
          <Text style={{ color: '#6B7280' }}>{item.email}</Text>
          {'total_gastado' in item && (
            <Text>Total gastado: $ {(item as any).total_gastado?.toLocaleString?.() ?? 0}</Text>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', padding: 12, borderRadius: 10, gap: 4 },
});