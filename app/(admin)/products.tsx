import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Tables } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';

type Producto = Tables<'Producto'>;

const C = {
  bg: '#0E1116',
  card: '#141821',
  border: '#2A2F3A',
  text: '#F3F4F6',
  muted: '#A0A8B0',
  primary: '#7C3AED',
  primarySoft: 'rgba(124,58,237,0.14)',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
};

const PAGE_SIZE = 30;

type FilterKey = 'todos' | 'destacados' | 'activos' | 'agotados' | 'descontinuados';

export default function ProductsScreen() {
  const router = useRouter();

  // Auth/role gating (como en otras pantallas admin)
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // UI/estado
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<Producto[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('todos');
  const [q, setQ] = useState('');

  // Gating de admin
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (!user) {
          Toast.show({ type: 'error', text1: 'Inicia sesión', text2: 'Necesitás iniciar sesión para acceder' });
          router.replace('/(auth)');
          return;
        }
        const { data: row, error } = await supabase.from('User').select('role').eq('id', user.id).limit(1).maybeSingle();
        if (error || row?.role !== 'admin') {
          Toast.show({ type: 'error', text1: 'Acceso denegado', text2: 'No tenés permisos de administrador' });
          router.replace('/(client)');
          return;
        }
        setIsAdmin(true);
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, [router]);

  const fetchPage = useCallback(
    async (nextPage: number, replace = false) => {
      const from = nextPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Nota: ordenamos por fecha_actualizacion desc para paridad con web.
      const { data, error } = await supabase
        .from('Producto')
        .select('*')
        .order('fecha_actualizacion', { ascending: false })
        .range(from, to);

      if (error) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudieron cargar los productos' });
        return;
      }

      const rows = data ?? [];
      setHasMore(rows.length === PAGE_SIZE);
      if (replace) {
        setItems(rows);
      } else {
        setItems((prev) => [...prev, ...rows]);
      }
      setPage(nextPage);
    },
    []
  );

  const initialLoad = useCallback(async () => {
    setLoading(true);
    setHasMore(true);
    await fetchPage(0, true);
    setLoading(false);
  }, [fetchPage]);

  useEffect(() => {
    if (isAdmin && !checkingAuth) {
      initialLoad();
    }
  }, [isAdmin, checkingAuth, initialLoad]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setHasMore(true);
    await fetchPage(0, true);
    setRefreshing(false);
  }, [fetchPage]);

  const onEndReached = useCallback(async () => {
    if (loading || refreshing || !hasMore) return;
    await fetchPage(page + 1);
  }, [loading, refreshing, hasMore, page, fetchPage]);

  // Filtro por texto (nombre o sku) y por "tab"
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = term
      ? items.filter((p) => {
          const name = (p as any).nombre?.toString().toLowerCase() ?? '';
          const sku = (p as any).sku?.toString().toLowerCase() ?? '';
          return name.includes(term) || sku.includes(term);
        })
      : items;

    switch (filter) {
      case 'destacados':
        return base.filter((p) => {
          const destacado = (p as any).destacado ?? (p as any).es_destacado;
          return destacado === true;
        });
      case 'activos':
        return base.filter((p) => {
          const estado = (p as any).estado?.toString().toUpperCase?.();
          const activo = (p as any).activo;
          const stock = Number((p as any).stock_total ?? 0);
          // Ajustá estos campos a tu esquema real
          return estado === 'ACTIVO' || activo === true || stock > 0;
        });
      case 'agotados':
        return base.filter((p) => Number((p as any).stock_total ?? 0) <= 0);
      case 'descontinuados':
        return base.filter((p) => {
          const estado = (p as any).estado?.toString().toUpperCase?.();
          const activo = (p as any).activo;
          return estado === 'DESCONTINUADO' || activo === false;
        });
      default:
        return base;
    }
  }, [items, q, filter]);

  if (checkingAuth) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ color: C.muted, marginTop: 8 }}>Verificando permisos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {loading ? (
        <View style={[styles.center, { padding: 16 }]}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ color: C.muted, marginTop: 8 }}>Cargando productos...</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id_producto)}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 80 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
            ListHeaderComponent={
              <View style={{ gap: 12 }}>
                <Text style={styles.title}>Productos</Text>

                {/* Buscador */}
                <View style={styles.searchRow}>
                  <Ionicons name="search-outline" size={18} color={C.muted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nombre o SKU"
                    placeholderTextColor={C.muted}
                    value={q}
                    onChangeText={setQ}
                  />
                  {!!q && (
                    <Pressable onPress={() => setQ('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={C.muted} />
                    </Pressable>
                  )}
                </View>

                {/* Tabs (paridad con web) */}
                <TabsBar value={filter} onChange={setFilter} />
              </View>
            }
            renderItem={({ item }) => <ProductCard item={item} />}
            onEndReachedThreshold={0.25}
            onEndReached={onEndReached}
            ListFooterComponent={
              hasMore ? (
                <View style={{ paddingVertical: 10 }}>
                  <ActivityIndicator color={C.primary} />
                </View>
              ) : null
            }
          />

          {/* Botón flotante "Añadir producto" (paridad con web button) */}
          <Pressable
            onPress={() => {
              // Si tenés una pantalla de alta: router.push('/(admin)/product-add')
              Toast.show({ type: 'info', text1: 'Próximamente', text2: 'Alta de producto en mobile' });
            }}
            style={({ pressed }) => [
              styles.fab,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <Ionicons name="add-circle" size={26} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700' }}>Añadir</Text>
          </Pressable>
        </>
      )}
    </SafeAreaView>
  );
}

function TabsBar({
  value,
  onChange,
}: {
  value: FilterKey;
  onChange: (v: FilterKey) => void;
}) {
  const tabs: { key: FilterKey; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'destacados', label: 'Destacados' },
    { key: 'activos', label: 'Activos' },
    { key: 'agotados', label: 'Agotados' },
    { key: 'descontinuados', label: 'Desc.' },
  ];

  return (
    <View style={styles.tabsBar}>
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={({ pressed }) => [
              styles.tabBtn,
              active && styles.tabActive,
              pressed && { opacity: 0.95 },
            ]}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ProductCard({ item }: { item: Producto }) {
  const stock = Number((item as any).stock_total ?? 0);
  const isFeatured = (item as any).destacado === true || (item as any).es_destacado === true;
  const estado = (item as any).estado?.toString().toUpperCase?.();
  const isDiscontinued = estado === 'DESCONTINUADO' || (item as any).activo === false;

  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.name}>{(item as any).nombre ?? 'Producto'}</Text>
          {isFeatured && <Badge color={C.success} label="Destacado" />}
          {isDiscontinued && <Badge color={C.warning} label="Desc." />}
          {stock <= 0 && <Badge color={C.danger} label="Sin stock" />}
        </View>

        {!!(item as any).sku && <Text style={styles.sku}>SKU: {(item as any).sku}</Text>}

        <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
          <Text style={styles.meta}>Stock: {stock}</Text>
          <Text style={styles.meta}>
            Precio: ${' '}
            {Number((item as any).precio_base ?? 0).toLocaleString('es-AR')}
          </Text>
        </View>

        {!!(item as any).fecha_actualizacion && (
          <Text style={styles.metaDim}>
            Actualizado: {new Date((item as any).fecha_actualizacion).toLocaleString()}
          </Text>
        )}
      </View>
    </View>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: `${color}22` }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  title: { color: C.text, fontSize: 22, fontWeight: '800' },

  // Search
  searchRow: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#11151B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: { flex: 1, color: C.text, paddingVertical: 8 },

  // Tabs
  tabsBar: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#11151B',
    overflow: 'hidden',
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: C.primarySoft },
  tabText: { color: C.muted, fontWeight: '600' },
  tabTextActive: { color: C.text, fontWeight: '800' },

  // Card
  card: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  name: { color: C.text, fontWeight: '800', fontSize: 16 },
  sku: { color: C.muted },
  meta: { color: C.text, fontWeight: '600' },
  metaDim: { color: C.muted, marginTop: 4 },

  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  // FIX agregado:
  badgeText: { fontSize: 12, fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
});