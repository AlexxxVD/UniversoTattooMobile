import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import Card from '../../components/ui/Card';
import Screen from '../../components/ui/Screen';
import SectionHeader from '../../components/ui/SectionHeader';
import { Tables } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/color';

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

  if (loading) {
    return (
      <Screen padded>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id_cliente)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={{ marginBottom: 8 }}>
            <SectionHeader
              title="Clientes"
              subtitle={items.length > 0 ? `Mostrando ${items.length} recientes` : 'Sin clientes recientes'}
            />
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <Card>
            <Text style={styles.muted}>No hay clientes para mostrar.</Text>
          </Card>
        }
        renderItem={({ item }) => {
          const totalGastado = (item as any)?.total_gastado;
          return (
            <Card style={styles.card}>
              <Text style={styles.name}>
                {item.nombre} {item.apellido}
              </Text>
              <Text style={styles.email}>{item.email}</Text>
              {typeof totalGastado !== 'undefined' && totalGastado !== null && (
                <Text style={styles.total}>Total gastado: $ {Number(totalGastado).toLocaleString()}</Text>
              )}
            </Card>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingVertical: 12, gap: 0 }, // separador lo maneja ItemSeparatorComponent
  card: {
    backgroundColor: 'rgba(17,18,22,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(38,38,38,0.9)',
  },
  name: { color: colors.textPrimary, fontWeight: '800', fontSize: 16 },
  email: { color: colors.textSecondary, marginTop: 2 },
  total: { color: colors.textPrimary, marginTop: 6, fontWeight: '700' },
  muted: { color: colors.textSecondary },
});