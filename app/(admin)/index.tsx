import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Section } from '../../components/Section';
import { StatCard } from '../../components/StatCard';
import { Tables } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { getMonthStartISO, getTodayStartISO } from '../../lib/time';

type Pedido = Tables<'Pedido'>;

const C = {
  bg: '#0E1116',
  card: '#141821',
  border: '#2A2F3A',
  text: '#F3F4F6',
  muted: '#A0A8B0',
  primary: '#7C3AED',
  successBg: '#DCFCE7',
  successText: '#166534',
  warnBg: '#FEF9C3',
  warnText: '#854D0E',
  dangerBg: '#FEE2E2',
  dangerText: '#991B1B',
  neutralBg: '#E5E7EB',
  neutralText: '#111827',
};

export default function AdminDashboard() {
  const router = useRouter();

  // Auth/role gating (igual que en la web, pero en mobile)
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Métricas
  const [ingresosMes, setIngresosMes] = useState<number>(0);
  const [pedidosHoy, setPedidosHoy] = useState<number>(0);
  const [pendientes, setPendientes] = useState<number>(0);
  const [clientesMes, setClientesMes] = useState<number>(0);
  const [ultimosPedidos, setUltimosPedidos] = useState<Pedido[]>([]);

  const monthStart = useMemo(() => getMonthStartISO(), []);
  const todayStart = useMemo(() => getTodayStartISO(), []);

  // Chequear sesión + rol admin (gating)
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

        if (roleErr) {
          // Si falla la lectura, negamos acceso por seguridad
          Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo verificar tu rol' });
          router.replace('/(client)');
          return;
        }

        if (userRow?.role !== 'admin') {
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
        .or('estado_pago.eq.PENDIENTE,estado.eq.PENDIENTE'); // ajustá si el campo difiere
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
    if (isAdmin && !checkingAuth) {
      load();
    }
  }, [isAdmin, checkingAuth, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMetrics();
    setRefreshing(false);
  }, [fetchMetrics]);

  // Loading de verificación de rol
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

  // Si no es admin, el efecto ya navegó; devolvemos un contenedor vacío por seguridad
  if (!isAdmin) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['right', 'bottom', 'left']} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['right', 'bottom', 'left']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        <Text style={styles.title}>Dashboard</Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={{ color: C.muted, marginTop: 8 }}>Cargando métricas...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={load} style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.9 }]}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Grid de métricas principales (StatCard es tu componente) */}
            <View style={styles.grid}>
              <StatCard label="Ingresos del mes" value={`$ ${ingresosMes.toLocaleString()}`} />
              <StatCard label="Pedidos hoy" value={`${pedidosHoy}`} />
              <StatCard label="Pendientes" value={`${pendientes}`} />
              <StatCard label="Clientes nuevos" value={`${clientesMes}`} />
            </View>

            {/* Últimos pedidos */}
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
    </SafeAreaView>
  );
}

function badgeColor(estado: Pedido['estado_pago']) {
  switch (estado) {
    case 'PAGADO':
      return { backgroundColor: C.successBg, color: C.successText };
    case 'PENDIENTE':
      return { backgroundColor: C.warnBg, color: C.warnText };
    case 'FALLIDO':
    case 'REEMBOLSADO':
      return { backgroundColor: C.dangerBg, color: C.dangerText };
    default:
      return { backgroundColor: C.neutralBg, color: C.neutralText };
  }
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  title: { fontSize: 22, fontWeight: '800', color: C.text },

  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  orderTitle: { fontWeight: '700', fontSize: 16, color: C.text },
  orderSub: { color: C.muted },
  orderTotal: { fontWeight: '700', color: C.text },

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

  muted: { color: C.muted },

  errorBox: {
    backgroundColor: '#3f1313',
    borderColor: '#7f1d1d',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  errorText: { color: '#fca5a5', marginBottom: 8, textAlign: 'center' },
  retryBtn: {
    alignSelf: 'center',
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});