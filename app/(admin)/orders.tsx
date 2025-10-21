import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import Card from '../../components/ui/Card';
import Screen from '../../components/ui/Screen';
import SectionHeader from '../../components/ui/SectionHeader';
import { Tables } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/color';

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
        keyExtractor={(item) => String(item.id_pedido)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={{ marginBottom: 8 }}>
            <SectionHeader
              title="Pedidos"
              subtitle={items.length > 0 ? `Mostrando ${items.length} recientes` : 'Sin pedidos recientes'}
            />
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <Card>
            <Text style={styles.muted}>No hay pedidos para mostrar.</Text>
          </Card>
        }
        renderItem={({ item }) => {
          return (
            <Card style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.orderId}>#{item.numero_pedido}</Text>
                <Text style={styles.total}>$ {Number(item.total).toLocaleString()}</Text>
              </View>

              <Text style={styles.sub}>
                {item.nombre_comprador ?? 'Cliente'} — {new Date(item.fecha_pedido).toLocaleString()}
              </Text>

              <Text style={[styles.badge, badgeStyle(item.estado_pago)]}>{item.estado_pago}</Text>
            </Card>
          );
        }}
      />
    </Screen>
  );
}

function badgeStyle(estado: Pedido['estado_pago']) {
  switch (estado) {
    case 'PAGADO':
      return { backgroundColor: 'rgba(34,197,94,0.15)', color: '#22C55E', borderColor: 'rgba(34,197,94,0.35)' };
    case 'PENDIENTE':
      return { backgroundColor: 'rgba(250,204,21,0.15)', color: '#F59E0B', borderColor: 'rgba(245,158,11,0.35)' };
    case 'FALLIDO':
    case 'REEMBOLSADO':
      return { backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444', borderColor: 'rgba(239,68,68,0.35)' };
    default:
      return { backgroundColor: 'rgba(168,85,247,0.12)', color: colors.primary, borderColor: 'rgba(168,85,247,0.35)' };
  }
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingVertical: 12 },
  card: {
    backgroundColor: 'rgba(17,18,22,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(38,38,38,0.9)',
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  orderId: { color: colors.textPrimary, fontWeight: '800', fontSize: 16 },
  sub: { color: colors.textSecondary },
  total: { color: colors.textPrimary, fontWeight: '800' },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    borderWidth: 1,
  } as any,
  muted: { color: colors.textSecondary },
});