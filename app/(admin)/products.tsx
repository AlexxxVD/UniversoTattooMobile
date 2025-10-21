import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import Card from '../../components/ui/Card';
import Screen from '../../components/ui/Screen';
import SectionHeader from '../../components/ui/SectionHeader';
import { Tables } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/color';

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
        keyExtractor={(item) => String(item.id_producto)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={{ marginBottom: 8 }}>
            <SectionHeader
              title="Productos"
              subtitle={items.length > 0 ? `Mostrando ${items.length} recientes` : 'Sin productos para mostrar'}
            />
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <Card>
            <Text style={styles.muted}>No hay productos para mostrar.</Text>
          </Card>
        }
        renderItem={({ item }) => {
          const stock = Number(item.stock_total ?? 0);
          const precio = Number(item.precio_base ?? 0);

          return (
            <Card style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.name}>{item.nombre}</Text>
                <Text style={styles.price}>$ {precio.toLocaleString()}</Text>
              </View>

              <Text style={styles.sku}>SKU: {item.sku ?? '-'}</Text>

              <View style={styles.metaRow}>
                <Text style={styles.meta}>Stock total: {stock}</Text>
                <Text style={[styles.badge, stockBadgeStyle(stock)]}>
                  {stock <= 0 ? 'Sin stock' : stock < 5 ? 'Stock bajo' : 'Disponible'}
                </Text>
              </View>

              {item.fecha_actualizacion && (
                <Text style={styles.updatedAt}>
                  Actualizado: {new Date(item.fecha_actualizacion).toLocaleString()}
                </Text>
              )}
            </Card>
          );
        }}
      />
    </Screen>
  );
}

function stockBadgeStyle(stock: number) {
  if (stock <= 0) {
    return { backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444', borderColor: 'rgba(239,68,68,0.35)' };
  }
  if (stock < 5) {
    return { backgroundColor: 'rgba(250,204,21,0.15)', color: '#F59E0B', borderColor: 'rgba(245,158,11,0.35)' };
  }
  return { backgroundColor: 'rgba(168,85,247,0.12)', color: colors.primary, borderColor: 'rgba(168,85,247,0.35)' };
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
  name: { color: colors.textPrimary, fontWeight: '800', fontSize: 16 },
  price: { color: colors.textPrimary, fontWeight: '800' },
  sku: { color: colors.textSecondary, marginTop: 2 },
  metaRow: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { color: colors.textSecondary },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700',
    borderWidth: 1,
  } as any,
  updatedAt: { color: colors.textSecondary, marginTop: 6, fontSize: 12 },
  muted: { color: colors.textSecondary },
});