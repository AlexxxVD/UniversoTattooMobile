import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { Screen } from '../../components/layout/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { Tables } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme';

type PedidoRow = Tables<'Pedido'>;

type Envio = {
  id_envio: string | number;
  pedido_id?: string | number | null;
  estado_envio: 'PENDIENTE' | 'EN_TRANSITO' | 'ENTREGADO' | 'CANCELADO' | string;
  tracking?: string | null;
  proveedor?: string | null;
  costo?: number | null;
  fecha_envio?: string | null;
};

const estados: Array<Envio['estado_envio'] | 'TODOS'> = [
  'TODOS',
  'PENDIENTE',
  'EN_TRANSITO',
  'ENTREGADO',
  'CANCELADO',
];

// Normaliza estados para que "ENVIADO" del pedido se vea como "EN_TRANSITO" en esta vista
function normalizeShipmentState(value?: string | null): Envio['estado_envio'] {
  const v = (value ?? '').toString().toUpperCase();
  if (v === 'ENVIADO') return 'EN_TRANSITO';
  return v || 'PENDIENTE';
}

function mapPedidoToEnvio(p: PedidoRow): Envio {
  return {
    id_envio: p.id_pedido,                       // usamos id del pedido como id_envio
    pedido_id: p.id_pedido,
    estado_envio: normalizeShipmentState(p.estado_envio ?? (p as any).estado), // fallback a estado del pedido
    tracking: p.tracking_number ?? (p as any).numero_envio ?? null,            // preferimos tracking_number
    proveedor: p.metodo_envio ?? null,                                         // "transportista"/método
    costo: typeof p.envio === 'number' ? p.envio : null,                       // costo del envío
    fecha_envio: p.fecha_envio ?? p.fecha_pedido,                              // fallback a fecha del pedido
  };
}

export default function ShipmentsScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();

  // Gating admin
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Data/UI
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<Envio[]>([]);
  const [filter, setFilter] = useState<Envio['estado_envio' ] | 'TODOS'>('TODOS');

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

  const fetchAll = useCallback(async () => {
    try {
      // Solo las columnas necesarias (coinciden con tu schema)
      const { data, error } = await supabase
        .from('Pedido')
        .select('id_pedido,numero_pedido,estado_envio,tracking_number,metodo_envio,envio,fecha_envio,fecha_pedido')
        .order('fecha_envio', { ascending: false, nullsFirst: false })
        .order('fecha_pedido', { ascending: false }) // fallback de orden si no hay fecha_envio
        .limit(100);
      if (error) throw error;
      const rows = (data ?? []) as PedidoRow[];
      setItems(rows.map(mapPedidoToEnvio));
    } catch (e: any) {
      console.error('[admin shipments] fetch error:', e?.message ?? e);
      Toast.show({ type: 'error', text1: 'No se pudo cargar envíos' });
    }
  }, []);

  const initialLoad = useCallback(async () => {
    setLoading(true);
    await fetchAll();
    setLoading(false);
  }, [fetchAll]);

  useEffect(() => {
    if (isAdmin && !checkingAuth) {
      initialLoad();
    }
  }, [isAdmin, checkingAuth, initialLoad]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const filtered = useMemo(
    () =>
      filter === 'TODOS'
        ? items
        : items.filter((i) => normalizeShipmentState(i.estado_envio) === filter),
    [items, filter]
  );

  const badge = (estado?: string | null) => {
    switch (normalizeShipmentState(estado)) {
      case 'ENTREGADO':
        return { bg: 'rgba(34,197,94,0.15)', fg: '#22C55E', border: 'rgba(34,197,94,0.35)' };
      case 'EN_TRANSITO':
        return { bg: 'rgba(59,130,246,0.15)', fg: '#3B82F6', border: 'rgba(59,130,246,0.35)' };
      case 'PENDIENTE':
        return { bg: 'rgba(245,158,11,0.15)', fg: '#F59E0B', border: 'rgba(245,158,11,0.35)' };
      case 'CANCELADO':
        return { bg: 'rgba(239,68,68,0.15)', fg: '#EF4444', border: 'rgba(239,68,68,0.35)' };
      default:
        return { bg: 'rgba(156,163,175,0.15)', fg: '#E5E7EB', border: 'rgba(156,163,175,0.35)' };
    }
  };

  if (checkingAuth) {
    return (
      <Screen scroll={false}>
        <HeaderBar title="Envíos" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <ActivityIndicator />
          <Text style={{ color: colors.textMuted, marginTop: spacing(1) }}>Verificando permisos...</Text>
        </View>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen scroll={false}>
        <HeaderBar title="Envíos" />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <HeaderBar title="Envíos" />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <ActivityIndicator />
          <Text style={{ color: colors.textMuted, marginTop: spacing(1) }}>Cargando envíos...</Text>
        </View>
      ) : (
        <View style={{ flex: 1, padding: 16 }}>
          <FlatList
            data={filtered}
            keyExtractor={(i) => String(i.id_envio)}
            contentContainerStyle={{ paddingBottom: spacing(10), gap: spacing(2) }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListHeaderComponent={
              <View style={{ marginBottom: spacing(2) }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {estados.map((e) => {
                    const active = filter === e;
                    return (
                      <Pressable
                        key={e}
                        onPress={() => setFilter(e)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: active ? colors.primary : colors.surfaceBorder,
                          backgroundColor: active ? 'rgba(124,58,237,0.12)' : colors.surface,
                        }}
                      >
                        <Text style={{ color: active ? colors.white : colors.textMuted, fontWeight: '600' }}>{e}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            }
            renderItem={({ item }) => {
              const b = badge(item.estado_envio);
              return (
                <Card>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>#{item.id_envio}</Text>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: b.border,
                        backgroundColor: b.bg,
                      }}
                    >
                      <Text style={{ color: b.fg, fontWeight: '700', fontSize: 12 }}>
                        {normalizeShipmentState(item.estado_envio)}
                      </Text>
                    </View>
                  </View>

                  {item.tracking ? <Text style={{ color: colors.textMuted }}>Tracking: {item.tracking}</Text> : null}
                  <Text style={{ color: colors.textMuted }}>
                    Pedido: {item.pedido_id || '-'} • {item.proveedor || 'Sin proveedor'}
                  </Text>
                  {typeof item.costo === 'number' && (
                    <Text style={{ color: colors.textMuted }}>Costo: ${item.costo.toLocaleString('es-AR')}</Text>
                  )}
                  {item.fecha_envio && (
                    <Text style={{ color: colors.textMuted }}>
                      Fecha: {new Date(item.fecha_envio).toLocaleString()}
                    </Text>
                  )}

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing(2) }}>
                    <Button
                      title="Ver detalle"
                      variant="outline"
                      left={<Ionicons name="eye-outline" size={16} color="#fff" />}
                    />
                    <Button title="Actualizar estado" variant="ghost" />
                  </View>
                </Card>
              );
            }}
            ListEmptyComponent={
              <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing(6) }}>
                No hay envíos.
              </Text>
            }
          />
        </View>
      )}
    </Screen>
  );
}