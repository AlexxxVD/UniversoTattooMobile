import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Tables } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';

type Pedido = Tables<'Pedido'>;

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
  info: '#60A5FA',
};

const PAGE_SIZE = 30;

type FilterKey = 'todos' | 'pendiente' | 'preparando' | 'enviado' | 'entregado' | 'cancelado';
const EstadoMap: Record<Exclude<FilterKey, 'todos'>, string> = {
  pendiente: 'PENDIENTE',
  preparando: 'PREPARANDO',
  enviado: 'ENVIADO',
  entregado: 'ENTREGADO',
  cancelado: 'CANCELADO',
};

export default function OrdersScreen() {
  const router = useRouter();

  // Auth/role gating
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // UI/data
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<Pedido[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [filter, setFilter] = useState<FilterKey>('todos');
  const [q, setQ] = useState('');

  // Admin gating (consistente con otras pantallas)
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

  const fetchPage = useCallback(
    async (nextPage: number, replace = false) => {
      const from = nextPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('Pedido')
        .select('*')
        .order('fecha_pedido', { ascending: false })
        .range(from, to);

      // Filtro por estado (tanto por columna estado como estado_pago si aplica)
      if (filter !== 'todos') {
        const est = EstadoMap[filter];
        query = query.or(`estado.eq.${est},estado_pago.eq.${est}`);
      }

      // Búsqueda por número de pedido o nombre del comprador
      const term = q.trim();
      if (term) {
        const like = `%${term}%`;
        query = query.or(`numero_pedido.ilike.${like},nombre_comprador.ilike.${like}`);
      }

      const { data, error } = await query;
      if (error) {
        Toast.show({ type: 'error', text1: 'Error cargando pedidos', text2: error.message });
        return;
      }

      const rows = (data ?? []) as Pedido[];
      setHasMore(rows.length === PAGE_SIZE);
      if (replace) setItems(rows);
      else setItems((prev) => [...prev, ...rows]);
      setPage(nextPage);
    },
    [filter, q]
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

  // Re-aplicar carga cuando cambian filtros o búsqueda
  useEffect(() => {
    if (isAdmin && !checkingAuth) {
      fetchPage(0, true);
    }
  }, [filter, q, isAdmin, checkingAuth, fetchPage]);

  if (checkingAuth) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['right', 'bottom', 'left']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ color: C.muted, marginTop: 8 }}>Verificando permisos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['right', 'bottom', 'left']} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['right', 'bottom', 'left']}>
      {loading ? (
        <View style={[styles.center, { padding: 16 }]}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ color: C.muted, marginTop: 8 }}>Cargando pedidos...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id_pedido)}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          ListHeaderComponent={
            <View style={{ gap: 12 }}>
              <Text style={styles.title}>Pedidos</Text>

              {/* Buscador */}
              <View style={styles.searchRow}>
                <Ionicons name="search-outline" size={18} color={C.muted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar por #pedido o comprador"
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

              {/* Tabs de estado (paridad con web) */}
              <TabsBar value={filter} onChange={setFilter} />
            </View>
          }
          renderItem={({ item }) => <OrderCard item={item} />}
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
    { key: 'pendiente', label: 'Pend.' },
    { key: 'preparando', label: 'Prep.' },
    { key: 'enviado', label: 'Env.' },
    { key: 'entregado', label: 'Entr.' },
    { key: 'cancelado', label: 'Canc.' },
  ];
  return (
    <View style={styles.tabsBar}>
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={[styles.tabBtn, active && styles.tabActive]}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function statusBadge(estado?: string | null) {
  const e = (estado || '').toString().toUpperCase();
  if (e === 'PENDIENTE') return { bg: 'rgba(245,158,11,0.15)', fg: '#F59E0B', br: 'rgba(245,158,11,0.35)' };
  if (e === 'PREPARANDO') return { bg: 'rgba(96,165,250,0.15)', fg: '#60A5FA', br: 'rgba(96,165,250,0.35)' };
  if (e === 'ENVIADO') return { bg: 'rgba(14,165,233,0.15)', fg: '#0EA5E9', br: 'rgba(14,165,233,0.35)' };
  if (e === 'ENTREGADO') return { bg: 'rgba(34,197,94,0.15)', fg: '#22C55E', br: 'rgba(34,197,94,0.35)' };
  if (e === 'CANCELADO') return { bg: 'rgba(239,68,68,0.15)', fg: '#EF4444', br: 'rgba(239,68,68,0.35)' };
  return { bg: 'rgba(156,163,175,0.15)', fg: '#E5E7EB', br: 'rgba(156,163,175,0.35)' };
}

function OrderCard({ item }: { item: Pedido }) {
  const est = (item as any).estado ?? (item as any).estado_envio ?? (item as any).estado_pago ?? 'PENDIENTE';
  const s = statusBadge(est);

  const totalNum = Number((item as any).total ?? 0);
  const numero = (item as any).numero_pedido ?? item.id_pedido;

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={styles.orderNumber}>#{numero}</Text>
        <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.br }]}>
          <Text style={[styles.badgeText, { color: s.fg }]} numberOfLines={1}>
            {String(est)}
          </Text>
        </View>
      </View>

      <Text style={styles.name}>{(item as any).nombre_comprador ?? 'Cliente'}</Text>

      <View style={{ flexDirection: 'row', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
        <Text style={styles.meta}>Total: $ {totalNum.toLocaleString('es-AR')}</Text>
        {!!item.fecha_pedido && (
          <Text style={styles.metaDim}>{new Date(item.fecha_pedido as any).toLocaleString()}</Text>
        )}
      </View>
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
  orderNumber: { color: C.text, fontWeight: '800' },
  name: { color: C.text, fontWeight: '700' },
  meta: { color: C.text, fontWeight: '600' },
  metaDim: { color: C.muted },

  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    maxWidth: '60%',
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
});