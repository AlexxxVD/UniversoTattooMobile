import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Section } from '../../components/Section';
import { StatCard } from '../../components/StatCard';
import { Tables } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { getMonthStartISO, getTodayStartISO } from '../../lib/time';

type Pedido = Tables<'Pedido'>;

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [ingresosMes, setIngresosMes] = useState<number>(0);
  const [pedidosHoy, setPedidosHoy] = useState<number>(0);
  const [pendientes, setPendientes] = useState<number>(0);
  const [clientesMes, setClientesMes] = useState<number>(0);
  const [ultimosPedidos, setUltimosPedidos] = useState<Pedido[]>([]);
  const [error, setError] = useState<string | null>(null);

  const monthStart = useMemo(() => getMonthStartISO(), []);
  const todayStart = useMemo(() => getTodayStartISO(), []);

  const fetchMetrics = useCallback(async () => {
    setError(null);
    try {
      // 1) Ingresos del mes (solo pedidos pagados)
      const { data: pedidosPagadosData, error: pedidosPagadosErr } = await supabase
        .from('Pedido')
        .select('total, fecha_pedido, estado_pago')
        .eq('estado_pago', 'PAGADO')
        .gte('fecha_pedido', monthStart);

      if (pedidosPagadosErr) throw pedidosPagadosErr;
      const sumIngresos = (pedidosPagadosData ?? []).reduce((acc, p) => acc + (p.total ?? 0), 0);
      setIngresosMes(sumIngresos);

      // 2) Pedidos hoy
      const { count: countHoy, error: pedidosHoyErr } = await supabase
        .from('Pedido')
        .select('id_pedido', { count: 'exact', head: true })
        .gte('fecha_pedido', todayStart);
      if (pedidosHoyErr) throw pedidosHoyErr;
      setPedidosHoy(countHoy ?? 0);

      // 3) Pendientes (por estado de pago o estado del pedido)
      const { count: countPend, error: pendErr } = await supabase
        .from('Pedido')
        .select('id_pedido', { count: 'exact', head: true })
        .or('estado_pago.eq.PENDIENTE,estado.eq.PENDIENTE'); // ajusta si tu columna es distinta
      if (pendErr) throw pendErr;
      setPendientes(countPend ?? 0);

      // 4) Clientes nuevos este mes
      const { count: countClientes, error: clientesErr } = await supabase
        .from('Cliente')
        .select('id_cliente', { count: 'exact', head: true })
        .gte('fecha_registro', monthStart);
      if (clientesErr) throw clientesErr;
      setClientesMes(countClientes ?? 0);

      // 5) Últimos 10 pedidos
      const { data: ultPedidos, error: ultErr } = await supabase
        .from('Pedido')
        .select('*')
        .order('fecha_pedido', { ascending: false })
        .limit(10);
      if (ultErr) throw ultErr;
      setUltimosPedidos(ultPedidos ?? []);
    } catch (e: any) {
      console.error('Error obteniendo métricas del dashboard:', e?.message ?? e);
      setError('No se pudieron cargar las métricas.');
    }
  }, [monthStart, todayStart]);

  const load = useCallback(async () => {
    setLoading(true);
    await fetchMetrics();
    setLoading(false);
  }, [fetchMetrics]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMetrics();
    setRefreshing(false);
  }, [fetchMetrics]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Dashboard</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          <View style={styles.grid}>
            <StatCard label="Ingresos del mes" value={`$ ${ingresosMes.toLocaleString()}`} />
            <StatCard label="Pedidos hoy" value={`${pedidosHoy}`} />
            <StatCard label="Pendientes" value={`${pendientes}`} />
            <StatCard label="Clientes nuevos" value={`${clientesMes}`} />
          </View>

          <Section title="Últimos pedidos">
            {ultimosPedidos.length === 0 ? (
              <Text style={styles.muted}>No hay pedidos recientes.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {ultimosPedidos.map((p) => (
                  <View key={p.id_pedido} style={styles.orderItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderTitle}>#{p.numero_pedido}</Text>
                      <Text style={styles.orderSub}>
                        {p.nombre_comprador ?? 'Cliente'} — {new Date(p.fecha_pedido).toLocaleString()}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.orderTotal}>$ {p.total.toLocaleString()}</Text>
                      <Text style={[styles.badge, badgeColor(p.estado_pago)]}>{p.estado_pago}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Section>
        </>
      )}
    </ScrollView>
  );
}

function badgeColor(estado: Pedido['estado_pago']) {
  switch (estado) {
    case 'PAGADO':
      return { backgroundColor: '#DCFCE7', color: '#166534' };
    case 'PENDIENTE':
      return { backgroundColor: '#FEF9C3', color: '#854D0E' };
    case 'FALLIDO':
    case 'REEMBOLSADO':
      return { backgroundColor: '#FEE2E2', color: '#991B1B' };
    default:
      return { backgroundColor: '#E5E7EB', color: '#111827' };
  }
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#F7F7F7', gap: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  orderTitle: { fontWeight: '700', fontSize: 16 },
  orderSub: { color: '#6B7280' },
  orderTotal: { fontWeight: '700' },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  } as any,
  muted: { color: '#6B7280' },
  error: { color: '#B91C1C' },
});