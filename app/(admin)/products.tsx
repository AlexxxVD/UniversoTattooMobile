import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Tables } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';

type Producto = Tables<'Producto'>;
type ProductoVariante = Tables<'ProductoVariante'>;

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

// Meta calculada por producto a partir de variantes
type VariantMeta = {
  sumStockActive: number;
  types: Set<string>;
};

export default function ProductsScreen() {
  const router = useRouter();

  // Auth/role gating
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // UI/estado
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [items, setItems] = useState<Producto[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Filtros
  const [filter, setFilter] = useState<FilterKey>('todos');
  const [q, setQ] = useState('');

  // Filtro por tipo de producto (proveniente de variantes)
  const [typeFilter, setTypeFilter] = useState<'Todos' | string>('Todos');
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);

  // Meta de variantes por producto
  const [variantMetaMap, setVariantMetaMap] = useState<Map<number, VariantMeta>>(new Map());

  // Gating de admin
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (!user) {
          Toast.show({ type: 'error', text1: 'Iniciá sesión', text2: 'Necesitás iniciar sesión para acceder' });
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

  // Merge único por id + orden determinista
  const mergeByIdAndSort = useCallback((prev: Producto[], next: Producto[]) => {
    const map = new Map<number, Producto>();
    for (const p of prev) map.set((p as any).id_producto, p);
    for (const n of next) map.set((n as any).id_producto, n);
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      const fa = new Date((a as any).fecha_actualizacion ?? 0).getTime();
      const fb = new Date((b as any).fecha_actualizacion ?? 0).getTime();
      if (fb !== fa) return fb - fa;
      return Number((b as any).id_producto) - Number((a as any).id_producto);
    });
    return arr;
  }, []);

  // Construye meta de variantes para una página, y la fusiona al map global
  const buildAndMergeVariantMeta = useCallback(async (rows: Producto[], replace: boolean) => {
    if (!rows.length) {
      if (replace) setVariantMetaMap(new Map());
      return;
    }
    const productIds = rows.map((r: any) => r.id_producto);

    const { data: vars, error: varErr } = await supabase
      .from('ProductoVariante')
      .select('producto_id, stock, es_activa, tipo_producto')
      .in('producto_id', productIds);

    if (varErr) {
      console.warn('[admin/products] variantes error:', varErr.message);
      // no aborta; seguimos sin meta
      if (replace) setVariantMetaMap(new Map());
      return;
    }

    const pageMeta = new Map<number, VariantMeta>();
    (vars ?? []).forEach((v: any) => {
      const pid = Number(v.producto_id);
      if (!pageMeta.has(pid)) pageMeta.set(pid, { sumStockActive: 0, types: new Set() });
      const m = pageMeta.get(pid)!;
      if (v.es_activa) {
        m.sumStockActive += Number(v.stock ?? 0);
      }
      const t = (v.tipo_producto ?? '').toString().trim();
      if (t) m.types.add(t);
    });

    setVariantMetaMap((prev) => {
      const merged = replace ? new Map<number, VariantMeta>() : new Map(prev);
      // Sobrescribimos/actualizamos solo los pids de esta página
      for (const [pid, meta] of pageMeta.entries()) {
        const existing = merged.get(pid);
        if (!existing || replace) {
          merged.set(pid, meta);
        } else {
          // merge sets y sum
          merged.set(pid, {
            sumStockActive: meta.sumStockActive, // los datos de esta página prevalecen
            types: new Set([...existing.types, ...meta.types]),
          });
        }
      }
      return merged;
    });

    // Actualizar lista global de tipos disponibles (para chips)
    setAvailableTypes((prev) => {
      const set = new Set(prev);
      for (const meta of pageMeta.values()) {
        meta.types.forEach((t) => set.add(t));
      }
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    });
  }, []);

  const fetchPage = useCallback(
    async (nextPage: number, replace = false) => {
      const from = nextPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('Producto')
        .select('*')
        .order('fecha_actualizacion', { ascending: false })
        .order('id_producto', { ascending: false })
        .range(from, to);

      if (error) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudieron cargar los productos' });
        return;
      }

      const rows = data ?? [];
      setHasMore(rows.length === PAGE_SIZE);

      if (replace) {
        setItems((_) => mergeByIdAndSort([], rows));
      } else {
        setItems((prev) => mergeByIdAndSort(prev, rows));
      }

      // Meta de variantes para esta página
      await buildAndMergeVariantMeta(rows, replace);

      setPage(nextPage);
    },
    [mergeByIdAndSort, buildAndMergeVariantMeta]
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
    setTypeFilter('Todos'); // reset tipo al refrescar
    await fetchPage(0, true);
    setRefreshing(false);
  }, [fetchPage]);

  const onEndReached = useCallback(async () => {
    if (loading || refreshing || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await fetchPage(page + 1);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, refreshing, loadingMore, hasMore, page, fetchPage]);

  // Stock "real" por producto: suma de variantes activas (si las hay) o stock_total
  const getRealStock = useCallback(
    (p: Producto) => {
      const pid = Number((p as any).id_producto);
      const meta = variantMetaMap.get(pid);
      if (!meta) return Number((p as any).stock_total ?? 0);
      const sum = meta.sumStockActive ?? 0;
      // Si el padre tiene stock_total > 0 pero variantes suman más, mostramos el mayor (paridad con front)
      const padre = Number((p as any).stock_total ?? 0);
      return Math.max(padre, sum);
    },
    [variantMetaMap]
  );

  // Filtro por texto + tabs + tipo de producto
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    // Texto
    let base = term
      ? items.filter((p) => {
          const name = (p as any).nombre?.toString().toLowerCase() ?? '';
          const sku = (p as any).sku?.toString().toLowerCase() ?? '';
          return name.includes(term) || sku.includes(term);
        })
      : items;

    // Tabs (estado)
    base = base.filter((p) => {
      const destacado = (p as any).destacado ?? (p as any).es_destacado;
      const esActivo = (p as any).es_activo ?? (p as any).activo; // compat
      const estado = (p as any).estado?.toString().toUpperCase?.();
      const stockReal = getRealStock(p);

      switch (filter) {
        case 'destacados':
          return destacado === true;
        case 'activos':
          // activo por flag o con stock disponible
          return esActivo === true || estado === 'ACTIVO' || stockReal > 0;
        case 'agotados':
          return stockReal <= 0;
        case 'descontinuados':
          return esActivo === false || estado === 'DESCONTINUADO';
        case 'todos':
        default:
          return true;
      }
    });

    // Tipo de producto (desde variantes)
    if (typeFilter !== 'Todos') {
      base = base.filter((p) => {
        const pid = Number((p as any).id_producto);
        const meta = variantMetaMap.get(pid);
        if (!meta) return false;
        return meta.types.has(typeFilter);
      });
    }

    return base;
  }, [items, q, filter, typeFilter, variantMetaMap, getRealStock]);

  if (checkingAuth) {
    return (
      <RNSafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'right', 'bottom', 'left']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ color: C.muted, marginTop: 8 }}>Verificando permisos...</Text>
        </View>
      </RNSafeAreaView>
    );
  }

  if (!isAdmin) {
    return <RNSafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'right', 'bottom', 'left']} />;
  }

  return (
    <RNSafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'right', 'bottom', 'left']}>
      {loading ? (
        <View style={[styles.center, { padding: 16 }]}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ color: C.muted, marginTop: 8 }}>Cargando productos...</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={filtered}
            keyExtractor={(item) => `prod-${String((item as any).id_producto)}`}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 96 }}
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

                {/* Tabs de estado */}
                <TabsBar value={filter} onChange={setFilter} />

                {/* Filtro por Tipo de Producto (desde variantes activas) */}
                <TypesBar
                  types={availableTypes}
                  value={typeFilter}
                  onChange={setTypeFilter}
                />
              </View>
            }
            renderItem={({ item }) => (
              <ProductCard
                item={item}
                stockReal={getRealStock(item)}
              />
            )}
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

          {/* Botón flotante "Añadir producto" */}
          <Pressable
            onPress={() => {
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
    </RNSafeAreaView>
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

// Chips para filtrar por tipo de producto (variante.tipo_producto)
function TypesBar({
  types,
  value,
  onChange,
}: {
  types: string[];
  value: 'Todos' | string;
  onChange: (v: 'Todos' | string) => void;
}) {
  const all = ['Todos', ...types];
  return (
    <View style={styles.typesBar}>
      {all.map((t) => {
        const active = value === t;
        return (
          <Pressable
            key={`type-${t}`}
            onPress={() => onChange(t)}
            style={[
              styles.typeChip,
              active && { backgroundColor: C.primarySoft, borderColor: 'rgba(124,58,237,0.6)' },
            ]}
          >
            <Text style={{ color: active ? C.text : C.muted, fontWeight: active ? '800' : '600' }}>
              {t}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ProductCard({ item, stockReal }: { item: Producto; stockReal: number }) {
  const isFeatured = (item as any).destacado === true || (item as any).es_destacado === true;
  const estado = (item as any).estado?.toString().toUpperCase?.();
  const esActivo = (item as any).es_activo ?? (item as any).activo;
  const isDiscontinued = esActivo === false || estado === 'DESCONTINUADO';

  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={styles.name}>{(item as any).nombre ?? 'Producto'}</Text>
          {isFeatured && <Badge color={C.success} label="Destacado" />}
          {isDiscontinued && <Badge color={C.warning} label="Desc." />}
          {stockReal <= 0 && <Badge color={C.danger} label="Sin stock" />}
        </View>

        {!!(item as any).sku && <Text style={styles.sku}>SKU: {(item as any).sku}</Text>}

        <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
          <Text style={styles.meta}>Stock: {stockReal}</Text>
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

  // Types
  typesBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#11151B',
  },

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