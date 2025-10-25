import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useCartStore } from '../../lib/cart-store';
import { Tables } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme';

type Cliente = Tables<'Cliente'>;
type Pedido = Tables<'Pedido'>;
type PedidoProducto = Tables<'PedidoProducto'>;
type Producto = Tables<'Producto'>;

type TabKey = 'overview' | 'orders' | 'favorites';

type FavoriteItem = {
  producto_id: number;
  Producto?: Partial<Producto> & {
    ProductoImagen?: { url_imagen: string | null; es_principal: boolean | null }[];
  };
};

type OrderWithTotals = Pedido & {
  _total?: number;
  _items?: (PedidoProducto & {
    Producto?: Partial<Producto> & {
      ProductoImagen?: { url_imagen: string | null; es_principal: boolean | null }[];
    };
  })[];
};

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
  pink: '#EC4899',
  blue: '#60A5FA',
  yellow: '#F59E0B',
};

export default function ProfileScreen() {
  const { colors, spacing } = useTheme?.() ?? {
    colors: { text: C.text, textMuted: C.muted, white: '#fff' },
    spacing: (n: number) => 4 * n,
  };
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('overview');
  const [userId, setUserId] = useState<string | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [orders, setOrders] = useState<OrderWithTotals[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingFavs, setLoadingFavs] = useState(true);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithTotals | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Cargar sesión y cliente por userId
  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      if (!uid) {
        Toast.show({ type: 'error', text1: 'Iniciá sesión' });
        router.replace('/(auth)');
        return;
      }
      setUserId(uid);

      const { data: clienteRow, error: clienteErr } = await supabase
        .from('Cliente')
        .select('*')
        .eq('userId', uid)
        .maybeSingle();

      if (clienteErr) throw clienteErr;
      setCliente((clienteRow as any) ?? null);
    } catch (e: any) {
      console.warn('[profile] loadProfile error:', e?.message ?? e);
      Toast.show({ type: 'error', text1: 'No se pudo cargar tu perfil' });
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Favoritos: 2 pasos (no hay FK en Favoritos)
  const loadFavorites = useCallback(async () => {
    if (!userId) return;
    setLoadingFavs(true);
    try {
      const uid = userId; // ya está garantizado arriba
      const { data: favRows, error: favErr } = await supabase
        .from('Favoritos')
        .select('producto_id')
        .eq('user_id', uid);

      if (favErr) throw favErr;

      const ids = (favRows ?? []).map((f) => f.producto_id);
      if (ids.length === 0) {
        setFavorites([]);
        return;
      }

      const { data: products, error: prodErr } = await supabase
        .from('Producto')
        .select('id_producto,nombre,descripcion,precio_base,stock_total,sku,ProductoImagen(url_imagen,es_principal)')
        .in('id_producto', ids);

      if (prodErr) throw prodErr;

      const map = new Map<number, any>();
      (products ?? []).forEach((p) => map.set((p as any).id_producto, p));
      const enriched: FavoriteItem[] = ids.map((id) => ({
        producto_id: id,
        Producto: map.get(id),
      }));
      setFavorites(enriched);
    } catch (e: any) {
      console.warn('[profile] loadFavorites error:', e?.message ?? e);
      setFavorites([]);
    } finally {
      setLoadingFavs(false);
    }
  }, [userId]);

  // Pedidos del cliente: filtrar por clienteId y sumar items
  const loadOrders = useCallback(async () => {
    if (!cliente?.id_cliente) {
      setOrders([]);
      setLoadingOrders(false);
      return;
    }
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('Pedido')
        .select('id_pedido,numero_pedido,fecha_pedido,estado,metodo_pago,tipo_envio,envio,tracking_number')
        .eq('clienteId', cliente.id_cliente)
        .order('fecha_pedido', { ascending: false })
        .limit(50);

      if (error) throw error;

      const rows = (data ?? []) as OrderWithTotals[];

      if (rows.length) {
        const ids = rows.map((r) => r.id_pedido);
        const { data: items, error: itemsErr } = await supabase
          .from('PedidoProducto')
          .select('pedidoId,cantidad,precio_unitario,descuento,Producto(id_producto,nombre,sku,stock_total,ProductoImagen(url_imagen,es_principal))')
          .in('pedidoId', ids);

        if (itemsErr) throw itemsErr;

        const byOrder = new Map<number | string, OrderWithTotals>();
        rows.forEach((r) => byOrder.set(r.id_pedido as any, { ...r, _items: [], _total: 0 }));

        (items ?? []).forEach((it: any) => {
          const ord = byOrder.get(it.pedidoId);
          if (ord) {
            const line =
              Number(it.cantidad ?? 0) * Number(it.precio_unitario ?? 0) - Number(it.descuento ?? 0);
            ord._total = Number(ord._total ?? 0) + line;
            ord._items = [...(ord._items ?? []), it];
          }
        });

        setOrders(Array.from(byOrder.values()));
      } else {
        setOrders([]);
      }
    } catch (e: any) {
      console.warn('[profile] loadOrders error:', e?.message ?? e);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [cliente?.id_cliente]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (userId != null) {
      loadFavorites();
    }
  }, [userId, loadFavorites]);

  useEffect(() => {
    if (cliente?.id_cliente) {
      loadOrders();
    }
  }, [cliente?.id_cliente, loadOrders]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => (o as any).estado?.toString().toUpperCase?.() === 'PENDIENTE').length;
    const completedOrders = orders.filter((o) => (o as any).estado?.toString().toUpperCase?.() === 'COMPLETADO').length;
    const totalSpent = orders.reduce((acc, o) => {
      const shipping = o.tipo_envio === 'retiro' ? 0 : Number((o as any).envio ?? 0);
      return acc + Number(o._total ?? 0) + shipping;
    }, 0);
    const lastOrderDate = orders[0]?.fecha_pedido ?? null;
    return { totalOrders, pendingOrders, completedOrders, totalSpent, lastOrderDate };
  }, [orders]);

  const formatCurrency = (n: number) => {
    try {
      return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
    } catch {
      return `$ ${Math.round(n).toLocaleString('es-AR')}`;
    }
  };

  const removeFavorite = useCallback(
    async (producto_id: number) => {
      if (!userId) {
        Toast.show({ type: 'error', text1: 'Sesión no válida' });
        return;
      }
      try {
        const { error } = await supabase
          .from('Favoritos')
          .delete()
          .eq('user_id', userId) // userId está garantizado por el guard anterior
          .eq('producto_id', producto_id);
        if (error) throw error;
        setFavorites((prev) => prev.filter((f) => f.producto_id !== producto_id));
        Toast.show({ type: 'success', text1: 'Quitado de favoritos' });
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'No se pudo quitar' });
      }
    },
    [userId]
  );

  const openOrderDetails = useCallback(async (order: OrderWithTotals) => {
    setSelectedOrder(order);
    setDetailsOpen(true);

    if (!order._items?.length) {
      setLoadingDetails(true);
      try {
        const { data, error } = await supabase
          .from('PedidoProducto')
          .select('pedidoId,cantidad,precio_unitario,descuento,Producto(id_producto,nombre,sku,stock_total,ProductoImagen(url_imagen,es_principal))')
          .eq('pedidoId', order.id_pedido);

        if (error) throw error;

        setSelectedOrder((prev) =>
          prev ? { ...prev, _items: (data as any) ?? [] } : prev
        );
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'No se pudo cargar el detalle' });
      } finally {
        setLoadingDetails(false);
      }
    }
  }, []);

  const reorder = useCallback(
    async (order: OrderWithTotals) => {
      if (!order._items?.length) {
        Toast.show({ type: 'info', text1: 'Abriendo pedido…', text2: 'Cargando productos del pedido' });
        await openOrderDetails(order);
        return;
      }

      let added = 0;
      let skipped = 0;

      for (const it of order._items!) {
        const pid = (it as any).Producto?.id_producto;
        if (!pid) {
          skipped++;
          continue;
        }

        try {
          const { data, error } = await supabase
            .from('Producto')
            .select('id_producto,nombre,precio_base,stock_total,sku,peso,ProductoImagen(url_imagen,es_principal)')
            .eq('id_producto', pid)
            .maybeSingle();
          if (error || !data) {
            skipped++;
            continue;
          }

          const p: any = data;
          const mainImg = Array.isArray(p.ProductoImagen)
            ? (p.ProductoImagen.find((im: any) => im.es_principal) ?? p.ProductoImagen[0])?.url_imagen
            : null;

          const qty = Math.min(Number((it as any).cantidad ?? 1), Number(p.stock_total ?? 0));
          if (qty <= 0) {
            skipped++;
            continue;
          }

          addItem({
            id: String(p.id_producto),
            nombre: p.nombre,
            precio: Number(p.precio_base ?? 0),
            imagen: mainImg ?? null,
            stock: Number(p.stock_total ?? 0),
            categoria: '',
            sku: p.sku ?? null,
            peso: p.peso ?? null,
            cantidad: qty,
            quantity: qty,
          } as any);

          added++;
        } catch {
          skipped++;
        }
      }

      if (added > 0) {
        Toast.show({
          type: 'success',
          text1: 'Productos agregados',
          text2: skipped > 0 ? `Agregados: ${added}. Sin stock/omitidos: ${skipped}.` : `Agregados: ${added}.`,
        });
        router.push('/(client)/cart');
      } else {
        Toast.show({ type: 'error', text1: 'Sin stock', text2: 'No se pudieron agregar productos' });
      }
    },
    [addItem, openOrderDetails, router]
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={{ color: C.muted, marginTop: 8 }}>Cargando perfil…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fullName = cliente ? `${cliente.nombre ?? ''} ${cliente.apellido ?? ''}`.trim() || 'Usuario' : 'Usuario';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Header del perfil */}
        <Card>
          <View style={{ padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={styles.avatar}>
              <Ionicons name="person-outline" size={28} color="#C4B5FD" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>{fullName}</Text>
              <Text style={{ color: C.muted }}>
                {cliente?.telefono ? `Tel: ${cliente.telefono}` : 'Teléfono no especificado'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Tabs */}
        <View style={styles.tabsBar}>
          {(['overview', 'orders', 'favorites'] as TabKey[]).map((t) => {
            const active = tab === t;
            const label =
              t === 'overview' ? 'Resumen' : t === 'orders' ? 'Pedidos' : 'Favoritos';
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={[styles.tabBtn, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Overview */}
        {tab === 'overview' && (
          <>
            <Card>
              <View style={{ padding: 14, gap: 12 }}>
                <Text style={{ color: C.text, fontWeight: '800' }}>Tu actividad</Text>
                <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                  <Stat label="Pedidos totales" value={String(stats.totalOrders)} icon="bag-outline" />
                  <Stat label="Favoritos" value={loadingFavs ? '—' : String(favorites.length)} icon="heart-outline" tone="pink" />
                  <Stat label="Gastado" value={formatCurrency(stats.totalSpent)} icon="cash-outline" tone="violet" />
                  <Stat label="Último pedido" value={stats.lastOrderDate ? new Date(stats.lastOrderDate as any).toLocaleDateString() : '—'} icon="time-outline" tone="blue" />
                </View>
              </View>
            </Card>

            <Card>
              <View style={{ padding: 14, gap: 10 }}>
                <Text style={{ color: C.text, fontWeight: '800' }}>Información</Text>
                <InfoRow icon="mail-outline" label="Email" value="(desde sesión)" />
                <InfoRow icon="call-outline" label="Teléfono" value={cliente?.telefono ?? 'No especificado'} />
                <InfoRow icon="id-card-outline" label="DNI" value={(cliente as any)?.dni ?? 'No especificado'} />
                <InfoRow icon="home-outline" label="Dirección" value={formatDireccion(cliente)} />
              </View>
            </Card>
          </>
        )}

        {/* Orders */}
        {tab === 'orders' && (
          <Card>
            <View style={{ padding: 14 }}>
              <Text style={{ color: C.text, fontWeight: '800', marginBottom: 10 }}>Mis pedidos</Text>
              {loadingOrders ? (
                <View style={styles.center}>
                  <ActivityIndicator color={C.primary} />
                </View>
              ) : orders.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 24, gap: 6 }}>
                  <Ionicons name="cube-outline" size={36} color={C.muted} />
                  <Text style={{ color: C.muted }}>Todavía no hiciste pedidos.</Text>
                </View>
              ) : (
                <FlatList
                  data={orders}
                  keyExtractor={(o) => String(o.id_pedido)}
                  contentContainerStyle={{ gap: 10 }}
                  renderItem={({ item }) => <OrderRow item={item} onView={() => openOrderDetails(item)} onReorder={() => reorder(item)} />}
                />
              )}
            </View>
          </Card>
        )}

        {/* Favorites */}
        {tab === 'favorites' && (
          <Card>
            <View style={{ padding: 14 }}>
              <Text style={{ color: C.text, fontWeight: '800', marginBottom: 10 }}>Mis favoritos</Text>
              {loadingFavs ? (
                <View style={styles.center}>
                  <ActivityIndicator color={C.primary} />
                </View>
              ) : favorites.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 24, gap: 6 }}>
                  <Ionicons name="heart-outline" size={36} color={C.muted} />
                  <Text style={{ color: C.muted }}>No tenés productos favoritos.</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {favorites.map((f) => (
                    <FavoriteCard
                      key={f.producto_id}
                      fav={f}
                      onRemove={() => removeFavorite(f.producto_id)}
                      onOpen={() => router.push(`/(client)/product/${f.producto_id}` as any)}
                    />
                  ))}
                </View>
              )}
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Order details modal */}
      <Modal visible={detailsOpen} transparent animationType="fade" onRequestClose={() => setDetailsOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>
                Pedido #{selectedOrder?.numero_pedido ?? selectedOrder?.id_pedido}
              </Text>
              <Pressable onPress={() => setDetailsOpen(false)} hitSlop={6}>
                <Ionicons name="close" size={20} color={C.muted} />
              </Pressable>
            </View>

            {loadingDetails ? (
              <View style={styles.center}><ActivityIndicator color={C.primary} /></View>
            ) : (
              <ScrollView contentContainerStyle={{ gap: 10 }}>
                <InfoRow icon="card-outline" label="Método de pago" value={String((selectedOrder as any)?.metodo_pago ?? '—')} />
                <InfoRow icon="navigate-outline" label="Entrega" value={String((selectedOrder as any)?.tipo_envio ?? '—')} />
                {(selectedOrder as any)?.tracking_number ? (
                  <InfoRow icon="pricetag-outline" label="Seguimiento" value={String((selectedOrder as any)?.tracking_number)} mono />
                ) : null}

                <View style={styles.divider} />

                <Text style={{ color: C.text, fontWeight: '800' }}>Productos</Text>
                {!selectedOrder?._items?.length ? (
                  <Text style={{ color: C.muted }}>No hay ítems.</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {selectedOrder._items.map((it, idx) => {
                      const p = (it as any).Producto;
                      const total = Number(it.cantidad ?? 0) * Number(it.precio_unitario ?? 0) - Number(it.descuento ?? 0);
                      const img = Array.isArray(p?.ProductoImagen)
                        ? (p.ProductoImagen.find((im: any) => im.es_principal) ?? p.ProductoImagen[0])?.url_imagen
                        : undefined;
                      return (
                        <View key={idx} style={styles.itemRow}>
                          <View style={styles.thumb}>
                            {img ? (
                              <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            ) : (
                              <Ionicons name="cube-outline" size={20} color={C.muted} />
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: C.text, fontWeight: '700' }} numberOfLines={1}>
                              {p?.nombre ?? 'Producto'}
                            </Text>
                            <Text style={{ color: C.muted, fontSize: 12 }}>
                              {it.cantidad} × {formatCurrency(Number(it.precio_unitario ?? 0))}
                            </Text>
                          </View>
                          <Text style={{ color: C.text, fontWeight: '700' }}>{formatCurrency(total)}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                <View style={styles.divider} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: C.muted }}>Total</Text>
                  <Text style={{ color: C.text, fontWeight: '800' }}>
                    {formatCurrency(
                      Number(selectedOrder?._total ?? 0) +
                        ((selectedOrder as any)?.tipo_envio === 'retiro' ? 0 : Number((selectedOrder as any)?.envio ?? 0))
                    )}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <Button title="Reordenar" onPress={() => selectedOrder && reorder(selectedOrder)} />
                  <Button title="Cerrar" variant="outline" onPress={() => setDetailsOpen(false)} />
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; tone?: 'violet' | 'pink' | 'blue' | 'yellow' }) {
  const pill = tone === 'pink' ? '#db277722' : tone === 'blue' ? '#2563eb22' : tone === 'yellow' ? '#f59e0b22' : C.primarySoft;
  const color = tone === 'pink' ? '#EC4899' : tone === 'blue' ? '#60A5FA' : tone === 'yellow' ? '#F59E0B' : '#C4B5FD';
  return (
    <View style={{ flexGrow: 1, flexBasis: '48%', backgroundColor: '#11151B', borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: pill, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text style={{ color: C.muted, fontSize: 12 }}>{label}</Text>
      </View>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 18 }}>{value}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, mono }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; mono?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Ionicons name={icon} size={16} color="#C4B5FD" />
      <Text style={{ color: C.muted, width: 120 }}>{label}</Text>
      <Text style={{ color: C.text, fontWeight: '700', flex: 1, fontFamily: mono ? 'monospace' : undefined }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function formatDireccion(c: Cliente | null): string {
  if (!c) return 'No especificada';
  const parts = [
    [c.calle, c.numero].filter(Boolean).join(' '),
    c.departamento,
    c.barrio,
    c.ciudad,
    c.provincia,
    c.codigo_postal,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'No especificada';
}

function FavoriteCard({ fav, onRemove, onOpen }: { fav: FavoriteItem; onRemove: () => void; onOpen: () => void }) {
  const p: any = fav.Producto;
  const img = Array.isArray(p?.ProductoImagen)
    ? (p.ProductoImagen.find((im: any) => im.es_principal) ?? p.ProductoImagen[0])?.url_imagen
    : undefined;

  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.favCard, pressed && { opacity: 0.95 }]}>
      <View style={styles.thumbLarge}>
        {img ? (
          <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <Ionicons name="image-outline" size={20} color={C.muted} />
        )}
      </View>
      <View style={{ gap: 4, flex: 1 }}>
        <Text style={{ color: C.text, fontWeight: '700' }} numberOfLines={1}>{p?.nombre ?? 'Producto'}</Text>
        <Text style={{ color: '#A78BFA', fontWeight: '800' }} numberOfLines={1}>
          {typeof p?.precio_base === 'number' ? p.precio_base.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) : '—'}
        </Text>
      </View>
      <Pressable onPress={(e) => { e.stopPropagation(); onRemove(); }} hitSlop={8}>
        <Ionicons name="heart-dislike-outline" size={18} color="#FCA5A5" />
      </Pressable>
    </Pressable>
  );
}

function OrderRow({ item, onView, onReorder }: { item: OrderWithTotals; onView: () => void; onReorder: () => void }) {
  const s = (item as any).estado?.toString().toUpperCase?.() ?? 'PENDIENTE';
  const badge =
    s === 'COMPLETADO'
      ? { bg: 'rgba(34,197,94,0.15)', fg: '#22C55E', br: 'rgba(34,197,94,0.35)' }
      : s === 'PROCESANDO' || s === 'PREPARANDO'
      ? { bg: 'rgba(96,165,250,0.15)', fg: '#60A5FA', br: 'rgba(96,165,250,0.35)' }
      : s === 'PENDIENTE'
      ? { bg: 'rgba(245,158,11,0.15)', fg: '#F59E0B', br: 'rgba(245,158,11,0.35)' }
      : { bg: 'rgba(156,163,175,0.15)', fg: '#E5E7EB', br: 'rgba(156,163,175,0.35)' };

  const total =
    Number(item._total ?? 0) + (item.tipo_envio === 'retiro' ? 0 : Number((item as any).envio ?? 0));

  return (
    <View style={styles.orderCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: C.text, fontWeight: '800' }}>#{item.numero_pedido ?? item.id_pedido}</Text>
        <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.br }]}>
          <Text style={{ color: badge.fg, fontWeight: '800', fontSize: 12 }}>{s}</Text>
        </View>
      </View>
      <Text style={{ color: C.muted, marginTop: 2 }}>
        {item.fecha_pedido ? new Date(item.fecha_pedido as any).toLocaleDateString() : '—'}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' }}>
        <Text style={{ color: C.text, fontWeight: '800' }}>
          {total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="Ver" variant="outline" onPress={onView} />
          <Button title="Reordenar" onPress={onReorder} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },

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

  favCard: {
    width: '48%',
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumbLarge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#1A202C',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  orderCard: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '92%', maxHeight: '86%', borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, padding: 12, gap: 10 },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 6 },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 36, height: 36, backgroundColor: '#1A202C', borderRadius: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});