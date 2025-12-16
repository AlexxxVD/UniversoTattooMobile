import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Tables } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { getTodayStartISO } from '../../lib/time';

type Cliente = Tables<'Cliente'>;

const C = {
  bg: '#0E1116',
  card: '#141821',
  border: '#2A2F3A',
  text: '#F3F4F6',
  muted: '#A0A8B0',
  primary: '#7C3AED',
  green: '#22C55E',
  pulse: 'rgba(124,58,237,0.25)',
};

const PAGE_SIZE = 20;

export default function CustomersScreen() {
  const router = useRouter();

  // Auth/role gating (igual que en el dashboard admin)
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Stats
  const [statsLoading, setStatsLoading] = useState(true);
  const [totalClientes, setTotalClientes] = useState(0);
  const [clientesHoy, setClientesHoy] = useState(0);

  // Lista de clientes
  const [items, setItems] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const todayStart = useMemo(() => getTodayStartISO(), []);

  // Gating: verificar sesión + rol admin
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
        const { data: userRow, error: roleErr } = await supabase
          .from('User')
          .select('role')
          .eq('id', user.id)
          .limit(1)
          .maybeSingle();

        if (roleErr || userRow?.role !== 'admin') {
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

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      // totalClientes
      const { count: totalCount, error: totalErr } = await supabase
        .from('Cliente')
        .select('id_cliente', { count: 'exact', head: true });
      if (totalErr) throw totalErr;

      // clientesHoy
      const { count: todayCount, error: todayErr } = await supabase
        .from('Cliente')
        .select('id_cliente', { count: 'exact', head: true })
        .gte('fecha_registro', todayStart);
      if (todayErr) throw todayErr;

      setTotalClientes(totalCount ?? 0);
      setClientesHoy(todayCount ?? 0);
    } catch (e: any) {
      // No bloquear UI por stats
      console.warn('[admin/customers] stats error:', e?.message ?? e);
    } finally {
      setStatsLoading(false);
    }
  }, [todayStart]);

  const fetchPage = useCallback(
    async (nextPage: number, replace = false) => {
      const from = nextPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('Cliente')
        .select('*')
        .order('fecha_registro', { ascending: false })
        .range(from, to);

      if (error) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudieron cargar los clientes' });
        return;
      }

      const rows = data ?? [];
      setHasMore(rows.length === PAGE_SIZE);

      // Si no hay clientes, no hacer queries adicionales
      if (rows.length === 0) {
        if (replace) {
          setItems([]);
        }
        setPage(nextPage);
        return;
      }

      // Obtener IDs de clientes para las queries de estadísticas
      const clienteIds = rows.map((c) => c.id_cliente);

      // Hacer 3 queries en paralelo para obtener estadísticas (igual que en la web)
      const [pedidosData, pedidosTotalesData, ultimosPedidosData] = await Promise.all([
        // 1. Contar pedidos por cliente
        supabase
          .from('Pedido')
          .select('clienteId')
          .in('clienteId', clienteIds),

        // 2. Sumar totales de pedidos por cliente
        supabase
          .from('Pedido')
          .select('clienteId, total')
          .in('clienteId', clienteIds),

        // 3. Obtener último pedido por cliente
        supabase
          .from('Pedido')
          .select('clienteId, fecha_pedido')
          .in('clienteId', clienteIds)
          .order('fecha_pedido', { ascending: false }),
      ]);

      // Crear mapas de estadísticas por clienteId
      const pedidosCountMap = new Map<number, number>();
      const gastoTotalMap = new Map<number, number>();
      const ultimoPedidoMap = new Map<number, string>();

      // Contar pedidos por cliente
      if (pedidosData.data) {
        pedidosData.data.forEach((pedido: any) => {
          const count = pedidosCountMap.get(pedido.clienteId) || 0;
          pedidosCountMap.set(pedido.clienteId, count + 1);
        });
      }

      // Sumar totales por cliente
      if (pedidosTotalesData.data) {
        pedidosTotalesData.data.forEach((pedido: any) => {
          const currentTotal = gastoTotalMap.get(pedido.clienteId) || 0;
          gastoTotalMap.set(pedido.clienteId, currentTotal + (pedido.total || 0));
        });
      }

      // Obtener último pedido por cliente
      if (ultimosPedidosData.data) {
        ultimosPedidosData.data.forEach((pedido: any) => {
          if (!ultimoPedidoMap.has(pedido.clienteId)) {
            ultimoPedidoMap.set(pedido.clienteId, pedido.fecha_pedido);
          }
        });
      }

      // Agregar estadísticas a cada cliente
      const rowsWithStats = rows.map((cliente) => ({
        ...cliente,
        total_pedidos: pedidosCountMap.get(cliente.id_cliente) || 0,
        total_gastado: gastoTotalMap.get(cliente.id_cliente) || 0,
        ultimo_pedido: ultimoPedidoMap.get(cliente.id_cliente) || null,
      }));

      if (replace) {
        setItems(rowsWithStats);
      } else {
        setItems((prev) => [...prev, ...rowsWithStats]);
      }
      setPage(nextPage);
    },
    []
  );

  const initialLoad = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchPage(0, true)]);
    setLoading(false);
  }, [fetchStats, fetchPage]);

  useEffect(() => {
    if (isAdmin && !checkingAuth) {
      initialLoad();
    }
  }, [isAdmin, checkingAuth, initialLoad]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setHasMore(true);
    await Promise.all([fetchStats(), fetchPage(0, true)]);
    setRefreshing(false);
  }, [fetchStats, fetchPage]);

  const onEndReached = useCallback(async () => {
    if (loading || refreshing || !hasMore) return;
    await fetchPage(page + 1);
  }, [loading, refreshing, hasMore, page, fetchPage]);

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
          <Text style={{ color: C.muted, marginTop: 8 }}>Cargando clientes...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id_cliente)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          ListHeaderComponent={
            <View style={{ gap: 12 }}>
              <Text style={styles.title}>Clientes</Text>

              {/* Stats Cards (paridad con la web) */}
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <View style={styles.statHeaderRow}>
                    <Text style={styles.statTitle}>Total Clientes</Text>
                    <View style={styles.dot} />
                  </View>
                  {statsLoading ? (
                    <View style={styles.skeleton} />
                  ) : (
                    <>
                      <Text style={styles.statValue}>{totalClientes}</Text>
                      <Text style={styles.statHint}>Clientes registrados</Text>
                    </>
                  )}
                </View>

                <View style={styles.statCard}>
                  <View style={styles.statHeaderRow}>
                    <Text style={styles.statTitle}>Nuevos Hoy</Text>
                    <View style={[styles.dot, { backgroundColor: C.green }]} />
                  </View>
                  {statsLoading ? (
                    <View style={styles.skeleton} />
                  ) : (
                    <>
                      <Text style={styles.statValue}>{clientesHoy}</Text>
                      <Text style={styles.statHint}>Registrados hoy</Text>
                    </>
                  )}
                </View>
              </View>

              <Text style={styles.sectionTitle}>Lista de clientes</Text>
            </View>
          }
          renderItem={({ item }) => <ClientCard item={item} />}
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

function ClientCard({ item }: { item: Cliente }) {
  const fecha = item.fecha_registro ? new Date(item.fecha_registro) : null;
  const ultimoPedido = (item as any).ultimo_pedido ? new Date((item as any).ultimo_pedido) : null;
  const totalPedidos = (item as any).total_pedidos ?? 0;
  const totalGastado = (item as any).total_gastado ?? 0;

  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>
          {item.nombre} {item.apellido}
        </Text>
        {!!item.email && <Text style={styles.email}>{item.email}</Text>}
        
        {/* Estadísticas principales */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Pedidos</Text>
            <Text style={styles.statNumber}>{totalPedidos}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Gasto Total</Text>
            <Text style={styles.statNumber}>$ {totalGastado.toLocaleString('es-AR')}</Text>
          </View>
          {ultimoPedido && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Último Pedido</Text>
                <Text style={styles.statDate}>{ultimoPedido.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</Text>
              </View>
            </>
          )}
        </View>

        {/* Badges de información adicional */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {!!item.telefono && <Badge label={item.telefono} />}
          {!!item.provincia && <Badge label={item.provincia} />}
          {!!fecha && <Badge label={fecha.toLocaleDateString('es-AR')} />}
        </View>
      </View>
    </View>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  title: { color: C.text, fontSize: 22, fontWeight: '800' },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginTop: 4 },

  // Stats
  statsGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  statCard: {
    flexGrow: 1,
    flexBasis: '48%',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 12,
  },
  statHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statTitle: { color: '#D9D6FE', fontSize: 12, fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#A78BFA' },
  skeleton: { height: 28, width: 60, borderRadius: 8, backgroundColor: C.pulse },
  statValue: { color: C.text, fontSize: 22, fontWeight: '800', marginTop: 4 },
  statHint: { color: '#C4B5FD', fontSize: 12 },

  // Cliente card
  card: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  name: { color: C.text, fontWeight: '800', fontSize: 16 },
  email: { color: C.muted, fontSize: 13, marginTop: 2 },
  
  // Stats row dentro de cada card
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0D12',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: '#A0A8B0',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statNumber: {
    color: C.text,
    fontSize: 15,
    fontWeight: '700',
  },
  statDate: {
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: C.border,
  },

  badge: {
    backgroundColor: '#11151B',
    borderColor: C.border,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { color: C.muted, fontSize: 12 },
});