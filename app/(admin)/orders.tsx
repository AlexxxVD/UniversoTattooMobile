import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
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
type Cliente = Tables<'Cliente'>;
type EstadoPedido = Pedido['estado'];
type EstadoPago = Pedido['estado_pago'];

interface PedidoConCliente extends Pedido {
  cliente?: Cliente | null;
  producto_count?: number;
}

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
const EstadoMap: Record<Exclude<FilterKey, 'todos'>, EstadoPedido> = {
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
  const [items, setItems] = useState<PedidoConCliente[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [filter, setFilter] = useState<FilterKey>('todos');
  const [q, setQ] = useState('');
  
  // Modal de detalles
  const [selectedOrder, setSelectedOrder] = useState<PedidoConCliente | null>(null);
  const [showDetails, setShowDetails] = useState(false);

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
        .select(`
          *,
          cliente:Cliente!Pedido_clienteId_fkey(*)
        `)
        .order('fecha_pedido', { ascending: false })
        .range(from, to);

      // Filtro por estado (solo columna estado)
      if (filter !== 'todos') {
        const est = EstadoMap[filter];
        query = query.eq('estado', est);
      }

      // Búsqueda por número de pedido, nombre o email del comprador
      const term = q.trim();
      if (term) {
        const like = `%${term}%`;
        query = query.or(`numero_pedido.ilike.${like},nombre_comprador.ilike.${like},email_comprador.ilike.${like}`);
      }

      const { data, error } = await query;
      if (error) {
        Toast.show({ type: 'error', text1: 'Error cargando pedidos', text2: error.message });
        return;
      }

      const rows = (data ?? []) as PedidoConCliente[];
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
          renderItem={({ item }) => (
            <OrderCard 
              item={item} 
              onPress={() => {
                setSelectedOrder(item);
                setShowDetails(true);
              }}
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
      )}
      
      {/* Modal de detalles */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          visible={showDetails}
          onClose={() => {
            setShowDetails(false);
            setSelectedOrder(null);
          }}
          onUpdate={() => {
            fetchPage(0, true);
          }}
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
  if (e === 'PENDIENTE') return { bg: 'rgba(245,158,11,0.15)', fg: '#F59E0B', br: 'rgba(245,158,11,0.35)', label: 'Pendiente' };
  if (e === 'CONFIRMADO') return { bg: 'rgba(59,130,246,0.15)', fg: '#3B82F6', br: 'rgba(59,130,246,0.35)', label: 'Confirmado' };
  if (e === 'PREPARANDO') return { bg: 'rgba(124,58,237,0.15)', fg: '#7C3AED', br: 'rgba(124,58,237,0.35)', label: 'Preparando' };
  if (e === 'ENVIADO') return { bg: 'rgba(14,165,233,0.15)', fg: '#0EA5E9', br: 'rgba(14,165,233,0.35)', label: 'Enviado' };
  if (e === 'ENTREGADO') return { bg: 'rgba(34,197,94,0.15)', fg: '#22C55E', br: 'rgba(34,197,94,0.35)', label: 'Entregado' };
  if (e === 'CANCELADO' || e === 'DEVUELTO') return { bg: 'rgba(239,68,68,0.15)', fg: '#EF4444', br: 'rgba(239,68,68,0.35)', label: 'Cancelado' };
  return { bg: 'rgba(156,163,175,0.15)', fg: '#E5E7EB', br: 'rgba(156,163,175,0.35)', label: e };
}

function paymentBadge(estado?: string | null) {
  const e = (estado || '').toString().toUpperCase();
  if (e === 'PENDIENTE') return { bg: 'rgba(245,158,11,0.15)', fg: '#F59E0B', br: 'rgba(245,158,11,0.35)', label: 'Pendiente' };
  if (e === 'PAGADO') return { bg: 'rgba(34,197,94,0.15)', fg: '#22C55E', br: 'rgba(34,197,94,0.35)', label: 'Pagado' };
  if (e === 'FALLIDO') return { bg: 'rgba(239,68,68,0.15)', fg: '#EF4444', br: 'rgba(239,68,68,0.35)', label: 'Fallido' };
  if (e === 'REEMBOLSADO') return { bg: 'rgba(168,85,247,0.15)', fg: '#A855F7', br: 'rgba(168,85,247,0.35)', label: 'Reembolsado' };
  if (e === 'PARCIAL') return { bg: 'rgba(251,146,60,0.15)', fg: '#FB923C', br: 'rgba(251,146,60,0.35)', label: 'Parcial' };
  return { bg: 'rgba(156,163,175,0.15)', fg: '#E5E7EB', br: 'rgba(156,163,175,0.35)', label: e };
}

function OrderCard({ item, onPress }: { item: PedidoConCliente; onPress: () => void }) {
  const statusStyle = statusBadge(item.estado);
  const paymentStyle = paymentBadge(item.estado_pago);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Header: Número de pedido y estados */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="receipt-outline" size={16} color={C.primary} />
          <Text style={styles.orderNumber}>#{item.numero_pedido}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.br }]}>
            <Text style={[styles.badgeText, { color: statusStyle.fg }]} numberOfLines={1}>
              {statusStyle.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Cliente */}
      <View style={{ marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Ionicons name="person-outline" size={14} color={C.primary} />
          <Text style={styles.clientName}>
            {item.cliente 
              ? `${item.cliente.nombre} ${item.cliente.apellido}` 
              : (item.nombre_comprador || 'Sin nombre')}
          </Text>
        </View>
        <Text style={styles.metaText} numberOfLines={1}>
          {item.cliente?.email || item.email_comprador || 'Sin email'}
        </Text>
        {(item.cliente?.telefono || item.telefono_comprador) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Ionicons name="call-outline" size={12} color={C.muted} />
            <Text style={styles.metaText}>{item.cliente?.telefono || item.telefono_comprador}</Text>
          </View>
        )}
      </View>

      {/* Información del pedido */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="calendar-outline" size={14} color={C.muted} />
          <Text style={styles.metaText}>{formatDate(item.fecha_pedido)}</Text>
        </View>
        
        {item.metodo_pago && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="card-outline" size={14} color={C.muted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.metodo_pago}
            </Text>
          </View>
        )}
        
        {item.tracking_number && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="checkmark-circle" size={14} color={C.success} />
            <Text style={[styles.metaText, { color: C.success }]}>Con tracking</Text>
          </View>
        )}
      </View>

      {/* Footer: Total y estado de pago */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="cash-outline" size={16} color={C.success} />
          <Text style={styles.totalText}>{formatCurrency(item.total)}</Text>
        </View>
        
        <View style={[styles.badge, { backgroundColor: paymentStyle.bg, borderColor: paymentStyle.br }]}>
          <Text style={[styles.badgeText, { color: paymentStyle.fg }]} numberOfLines={1}>
            {paymentStyle.label}
          </Text>
        </View>
      </View>

      {/* Indicador de "ver más" */}
      <View style={{ position: 'absolute', right: 8, top: 8 }}>
        <Ionicons name="chevron-forward" size={16} color={C.muted} />
      </View>
    </Pressable>
  );
}

function OrderDetailsModal({
  order,
  visible,
  onClose,
  onUpdate,
}: {
  order: PedidoConCliente;
  visible: boolean;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [editData, setEditData] = useState({
    estado: order.estado,
    estado_pago: order.estado_pago,
    tracking_number: order.tracking_number || '',
    metodo_pago: order.metodo_pago || '',
  });
  const [saving, setSaving] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('Pedido')
        .update({
          estado: editData.estado,
          estado_pago: editData.estado_pago,
          tracking_number: editData.tracking_number || null,
          metodo_pago: editData.metodo_pago || null,
          fecha_actualizacion: new Date().toISOString(),
        })
        .eq('id_pedido', order.id_pedido);

      if (error) throw error;

      Toast.show({ type: 'success', text1: 'Pedido actualizado' });
      onUpdate();
      onClose();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error al actualizar', text2: error.message });
    } finally {
      setSaving(false);
    }
  };

  const statusStyle = statusBadge(editData.estado);
  const paymentStyle = paymentBadge(editData.estado_pago);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.modalTitle}>Pedido #{order.numero_pedido}</Text>
              <Text style={styles.metaText}>{formatDate(order.fecha_pedido)}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={28} color={C.text} />
            </Pressable>
          </View>

          {/* Cliente */}
          <View style={styles.detailCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ionicons name="person" size={18} color={C.primary} />
              <Text style={styles.detailCardTitle}>Información del Cliente</Text>
            </View>
            <Text style={styles.detailText}>
              <Text style={{ fontWeight: '700' }}>Nombre: </Text>
              {order.cliente 
                ? `${order.cliente.nombre} ${order.cliente.apellido}` 
                : (order.nombre_comprador || 'N/A')}
            </Text>
            <Text style={styles.detailText}>
              <Text style={{ fontWeight: '700' }}>Email: </Text>
              {order.cliente?.email || order.email_comprador || 'N/A'}
            </Text>
            {(order.cliente?.telefono || order.telefono_comprador) && (
              <Text style={styles.detailText}>
                <Text style={{ fontWeight: '700' }}>Teléfono: </Text>
                {order.cliente?.telefono || order.telefono_comprador}
              </Text>
            )}
            {(order.cliente?.dni || order.dni_comprador) && (
              <Text style={styles.detailText}>
                <Text style={{ fontWeight: '700' }}>DNI: </Text>
                {order.cliente?.dni || order.dni_comprador}
              </Text>
            )}
          </View>

          {/* Dirección de envío */}
          {order.direccion_envio && (
            <View style={styles.detailCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Ionicons name="location" size={18} color={C.primary} />
                <Text style={styles.detailCardTitle}>Dirección de Envío</Text>
              </View>
              <Text style={styles.detailText}>{order.direccion_envio}</Text>
              {order.ciudad_envio && (
                <Text style={styles.detailText}>
                  {order.ciudad_envio}, {order.provincia_envio || ''} {order.codigo_postal_envio || ''}
                </Text>
              )}
            </View>
          )}

          {/* Estado del Pedido - Editable */}
          <View style={styles.detailCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ionicons name="cube" size={18} color={C.primary} />
              <Text style={styles.detailCardTitle}>Estado del Pedido</Text>
            </View>
            
            <View style={{ gap: 8 }}>
              {['PENDIENTE', 'CONFIRMADO', 'PREPARANDO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'].map((estado) => (
                <Pressable
                  key={estado}
                  onPress={() => setEditData({ ...editData, estado: estado as EstadoPedido })}
                  style={[
                    styles.radioButton,
                    editData.estado === estado && styles.radioButtonSelected,
                  ]}
                >
                  <View style={styles.radioCircle}>
                    {editData.estado === estado && <View style={styles.radioCircleInner} />}
                  </View>
                  <Text style={[styles.radioText, editData.estado === estado && styles.radioTextSelected]}>
                    {statusBadge(estado).label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Estado de Pago - Editable */}
          <View style={styles.detailCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ionicons name="card" size={18} color={C.primary} />
              <Text style={styles.detailCardTitle}>Estado de Pago</Text>
            </View>
            
            <View style={{ gap: 8, marginBottom: 12 }}>
              {['PENDIENTE', 'PAGADO', 'FALLIDO', 'REEMBOLSADO', 'PARCIAL'].map((estado) => (
                <Pressable
                  key={estado}
                  onPress={() => setEditData({ ...editData, estado_pago: estado as EstadoPago })}
                  style={[
                    styles.radioButton,
                    editData.estado_pago === estado && styles.radioButtonSelected,
                  ]}
                >
                  <View style={styles.radioCircle}>
                    {editData.estado_pago === estado && <View style={styles.radioCircleInner} />}
                  </View>
                  <Text style={[styles.radioText, editData.estado_pago === estado && styles.radioTextSelected]}>
                    {paymentBadge(estado).label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={[styles.detailText, { marginBottom: 6 }]}>Método de Pago</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Transferencia, Efectivo, Mercado Pago"
                placeholderTextColor={C.muted}
                value={editData.metodo_pago}
                onChangeText={(text) => setEditData({ ...editData, metodo_pago: text })}
              />
            </View>
          </View>

          {/* Información de Envío */}
          <View style={styles.detailCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ionicons name="car" size={18} color={C.primary} />
              <Text style={styles.detailCardTitle}>Información de Envío</Text>
            </View>
            
            <Text style={[styles.detailText, { marginBottom: 6 }]}>Número de Tracking</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresá el número de seguimiento"
              placeholderTextColor={C.muted}
              value={editData.tracking_number}
              onChangeText={(text) => setEditData({ ...editData, tracking_number: text })}
            />
            
            {order.tipo_envio && (
              <Text style={[styles.detailText, { marginTop: 8 }]}>
                <Text style={{ fontWeight: '700' }}>Tipo: </Text>
                {order.tipo_envio}
              </Text>
            )}
            {order.metodo_envio && (
              <Text style={styles.detailText}>
                <Text style={{ fontWeight: '700' }}>Método: </Text>
                {order.metodo_envio}
              </Text>
            )}
          </View>

          {/* Resumen de Costos */}
          <View style={styles.detailCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ionicons name="cash" size={18} color={C.primary} />
              <Text style={styles.detailCardTitle}>Resumen de Costos</Text>
            </View>
            
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.detailText}>Subtotal:</Text>
                <Text style={styles.detailText}>{formatCurrency(order.subtotal)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.detailText}>Envío:</Text>
                <Text style={styles.detailText}>{formatCurrency(order.envio)}</Text>
              </View>
              {order.descuento > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[styles.detailText, { color: C.success }]}>Descuento:</Text>
                  <Text style={[styles.detailText, { color: C.success }]}>-{formatCurrency(order.descuento)}</Text>
                </View>
              )}
              <View style={{ height: 1, backgroundColor: C.border, marginVertical: 4 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[styles.detailText, { fontWeight: '800', fontSize: 16 }]}>Total:</Text>
                <Text style={[styles.detailText, { fontWeight: '800', fontSize: 16, color: C.success }]}>
                  {formatCurrency(order.total)}
                </Text>
              </View>
            </View>
          </View>

          {/* Notas */}
          {order.notas_cliente && (
            <View style={styles.detailCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Ionicons name="chatbox" size={18} color={C.primary} />
                <Text style={styles.detailCardTitle}>Notas del Cliente</Text>
              </View>
              <Text style={styles.detailText}>{order.notas_cliente}</Text>
            </View>
          )}

          {/* Botones de acción */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <Pressable
              style={[styles.actionButton, { flex: 1, backgroundColor: C.border }]}
              onPress={onClose}
            >
              <Text style={[styles.actionButtonText, { color: C.text }]}>Cancelar</Text>
            </Pressable>
            
            <Pressable
              style={[styles.actionButton, { flex: 1, backgroundColor: C.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#FFF" />
                  <Text style={styles.actionButtonText}>Guardar Cambios</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
  tabText: { color: C.muted, fontWeight: '600', fontSize: 12 },
  tabTextActive: { color: C.text, fontWeight: '800' },

  // Card
  card: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  orderNumber: { color: C.text, fontWeight: '800', fontSize: 15 },
  clientName: { color: C.text, fontWeight: '700', fontSize: 15 },
  metaText: { color: C.muted, fontSize: 13 },
  totalText: { color: C.success, fontWeight: '800', fontSize: 16 },

  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Modal
  modalTitle: { color: C.text, fontSize: 20, fontWeight: '800' },
  
  detailCard: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  detailCardTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  detailText: { color: C.text, fontSize: 14, marginBottom: 4 },
  
  input: {
    backgroundColor: '#11151B',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.text,
    fontSize: 14,
  },

  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#11151B',
  },
  radioButtonSelected: {
    borderColor: C.primary,
    backgroundColor: C.primarySoft,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: C.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary,
  },
  radioText: { color: C.muted, fontSize: 14, fontWeight: '600' },
  radioTextSelected: { color: C.text, fontWeight: '700' },

  actionButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});