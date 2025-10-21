import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Card from '../../components/ui/Card';
import Screen from '../../components/ui/Screen';
import SectionHeader from '../../components/ui/SectionHeader';
import { Tables } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { getMonthStartISO, getTodayStartISO } from '../../lib/time';
import { colors } from '../../theme/color';

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
    <Screen padded>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Resumen de actividad y métricas</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
        ) : error ? (
          <Card style={{ padding: 16 }}>
            <Text style={styles.error}>{error}</Text>
          </Card>
        ) : (
          <>
            {/* Métricas */}
            <View style={styles.grid}>
              <MetricCard label="Ingresos del mes" value={`$ ${ingresosMes.toLocaleString()}`} />
              <MetricCard label="Pedidos hoy" value={`${pedidosHoy}`} />
              <MetricCard label="Pendientes" value={`${pendientes}`} />
              <MetricCard label="Clientes nuevos" value={`${clientesMes}`} />
            </View>

            {/* Últimos pedidos */}
            <Card style={{ marginTop: 12 }}>
              <SectionHeader title="Últimos pedidos" subtitle="Actividad reciente" />
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
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function badgeColor(estado: Pedido['estado_pago']) {
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12, gap: 12 },
  header: { marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.2 },
  subtitle: { color: colors.textSecondary, marginTop: 2 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  metricCard: {
    width: '48%',
  },
  metricLabel: { color: colors.textSecondary, fontSize: 12, marginBottom: 6 },
  metricValue: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },

  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17,18,22,0.6)',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(38,38,38,0.9)',
  },
  orderTitle: { color: colors.textPrimary, fontWeight: '800', fontSize: 16 },
  orderSub: { color: colors.textSecondary },
  orderTotal: { color: colors.textPrimary, fontWeight: '800' },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    borderWidth: 1,
  } as any,
  muted: { color: colors.textSecondary },
  error: { color: '#FCA5A5' },
});