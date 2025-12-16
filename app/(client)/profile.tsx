import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
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
  const params = useLocalSearchParams<{ tab?: string }>();

  const addItem = useCartStore((s) => s.addItem);

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('overview');
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null); // Email del usuario autenticado
  const [cliente, setCliente] = useState<Cliente | null>(null);

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [orders, setOrders] = useState<OrderWithTotals[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingFavs, setLoadingFavs] = useState(true);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithTotals | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Edit profile
  const [showEdit, setShowEdit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [edit, setEdit] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    fecha_nacimiento: '',
    acepta_marketing: false,
    dni: '',
    calle: '',
    numero: '',
    departamento: '',
    barrio: '',
    ciudad: '',
    provincia: '',
    codigo_postal: '',
  });

  // Abrir pestaña desde query (?tab=favorites)
  useEffect(() => {
    const q = typeof params?.tab === 'string' ? params.tab.toLowerCase() : '';
    if (q === 'favorites' || q === 'orders' || q === 'overview') {
      setTab(q as TabKey);
    }
  }, [params?.tab]);

  const startEdit = useCallback(() => {
    if (!cliente) {
      Toast.show({ type: 'error', text1: 'No se pudo cargar la información del perfil' });
      return;
    }
    setEdit({
      nombre: cliente.nombre ?? '',
      apellido: cliente.apellido ?? '',
      email: cliente.email ?? '',
      telefono: cliente.telefono ?? '',
      fecha_nacimiento: cliente.fecha_nacimiento ? cliente.fecha_nacimiento.split('T')[0] : '',
      acepta_marketing: !!cliente.acepta_marketing,
      dni: cliente.dni ?? '',
      calle: cliente.calle ?? '',
      numero: cliente.numero ?? '',
      departamento: cliente.departamento ?? '',
      barrio: cliente.barrio ?? '',
      ciudad: cliente.ciudad ?? '',
      provincia: cliente.provincia ?? '',
      codigo_postal: cliente.codigo_postal ?? '',
    });
    setShowEdit(true);
  }, [cliente]);

  const saveEdit = useCallback(async () => {
    if (!cliente?.id_cliente || !cliente?.userId) return;
    if (!edit.nombre.trim() || !edit.apellido.trim() || !edit.email.trim()) {
      Toast.show({ type: 'error', text1: 'Completá nombre, apellido y email' });
      return;
    }
    setSavingEdit(true);
    try {
      const payload: Partial<Cliente> = {
        nombre: edit.nombre.trim(),
        apellido: edit.apellido.trim(),
        email: edit.email.trim(),
        telefono: edit.telefono.trim() || null,
        fecha_nacimiento: edit.fecha_nacimiento ? new Date(edit.fecha_nacimiento).toISOString() : null,
        acepta_marketing: !!edit.acepta_marketing,
        dni: edit.dni.trim() || null,
        calle: edit.calle.trim() || null,
        numero: edit.numero.trim() || null,
        departamento: edit.departamento.trim() || null,
        barrio: edit.barrio.trim() || null,
        ciudad: edit.ciudad.trim() || null,
        provincia: edit.provincia.trim() || null,
        codigo_postal: edit.codigo_postal.trim() || null,
        fecha_actualizacion: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from('Cliente')
        .update(payload as any)
        .eq('userId', cliente.userId)
        .select('*')
        .maybeSingle();
      
      if (error) throw error;
      setCliente((data as any) ?? cliente);
      setShowEdit(false);
      Toast.show({ type: 'success', text1: 'Perfil actualizado' });
    } catch (e: any) {
      console.warn('[profile] saveEdit error:', e?.message ?? e);
      Toast.show({ type: 'error', text1: 'No se pudo guardar' });
    } finally {
      setSavingEdit(false);
    }
  }, [cliente, edit]);

  // Cargar sesión y cliente por userId
  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      const sessionEmail = data.session?.user?.email ?? null;
      
      if (!uid) {
        Toast.show({ type: 'error', text1: 'Iniciá sesión' });
        router.replace('/(auth)');
        return;
      }
      setUserId(uid);
      setUserEmail(sessionEmail); // Guardar email del usuario autenticado

      const { data: clienteRow, error: clienteErr } = await supabase
        .from('Cliente')
        .select('*')
        .eq('userId', uid)
        .maybeSingle();

      if (clienteErr) throw clienteErr;
      
      if (!clienteRow) {
        // No hay registro de Cliente para este usuario
        // Esto puede pasar si el usuario se registró desde mobile pero no completó
        // el perfil en la web. Mostraremos un mensaje apropiado en la UI.
        console.log('[profile] Cliente no encontrado para userId:', uid);
        setCliente(null);
      } else {
        setCliente((clienteRow as any) ?? null);
      }
    } catch (e: any) {
      console.warn('[profile] loadProfile error:', e?.message ?? e);
      Toast.show({ type: 'error', text1: 'No se pudo cargar tu perfil' });
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Favoritos
  const loadFavorites = useCallback(async () => {
    if (!userId) return;
    setLoadingFavs(true);
    try {
      const { data: favRows, error: favErr } = await supabase
        .from('Favoritos')
        .select('producto_id')
        .eq('user_id', userId);

      if (favErr) throw favErr;

      const ids = Array.from(new Set((favRows ?? []).map((f) => Number(f.producto_id)).filter(Boolean)));
      if (ids.length === 0) {
        setFavorites([]);
        return;
      }

      const { data: products, error: prodErr } = await supabase
        .from('Producto')
        .select('id_producto,nombre,descripcion,precio_base,stock_total,sku,ProductoImagen(url_imagen,es_principal)')
        .in('id_producto', ids)
        .eq('es_activo', true);

      if (prodErr) throw prodErr;

      const byId = new Map<number, any>();
      (products ?? []).forEach((p) => byId.set((p as any).id_producto, p));
      const enriched: FavoriteItem[] = ids.map((id) => ({
        producto_id: id,
        Producto: byId.get(id),
      }));
      setFavorites(enriched);
    } catch (e: any) {
      console.warn('[profile] loadFavorites error:', e?.message ?? e);
      setFavorites([]);
    } finally {
      setLoadingFavs(false);
    }
  }, [userId]);

  // Pedidos - buscar por clienteId O por email_comprador (usando email de sesión y de cliente)
  const loadOrders = useCallback(async () => {
    const emailsToSearch = new Set<string>();
    if (cliente?.email) emailsToSearch.add(cliente.email.toLowerCase());
    if (userEmail) emailsToSearch.add(userEmail.toLowerCase());
    
    if (!cliente?.id_cliente && emailsToSearch.size === 0) {
      setOrders([]);
      setLoadingOrders(false);
      return;
    }
    setLoadingOrders(true);
    try {
      // Combinar resultados de todas las queries
      const allOrders: OrderWithTotals[] = [];
      const seenIds = new Set<number>();

      // Query por clienteId
      if (cliente?.id_cliente) {
        const { data, error } = await supabase
          .from('Pedido')
          .select('id_pedido,numero_pedido,fecha_pedido,estado,metodo_pago,metodo_envio,envio,tracking_number,email_comprador,clienteId')
          .eq('clienteId', cliente.id_cliente)
          .order('fecha_pedido', { ascending: false })
          .limit(50);

        if (error) {
          console.warn('[profile] loadOrders by clienteId error:', error.message);
        } else {
          console.log('[profile] Orders found by clienteId:', data?.length ?? 0);
          for (const order of (data ?? [])) {
            if (!seenIds.has(order.id_pedido)) {
              seenIds.add(order.id_pedido);
              allOrders.push(order as OrderWithTotals);
            }
          }
        }
      }

      // Query por cada email (case insensitive)
      for (const email of emailsToSearch) {
        const { data, error } = await supabase
          .from('Pedido')
          .select('id_pedido,numero_pedido,fecha_pedido,estado,metodo_pago,metodo_envio,envio,tracking_number,email_comprador,clienteId')
          .ilike('email_comprador', email)
          .order('fecha_pedido', { ascending: false })
          .limit(50);

        if (error) {
          console.warn('[profile] loadOrders by email error:', email, error.message);
        } else {
          console.log('[profile] Orders found by email', email, ':', data?.length ?? 0);
          for (const order of (data ?? [])) {
            if (!seenIds.has(order.id_pedido)) {
              seenIds.add(order.id_pedido);
              allOrders.push(order as OrderWithTotals);
            }
          }
        }
      }

      // Ordenar por fecha descendente
      allOrders.sort((a, b) => {
        const dateA = new Date(a.fecha_pedido as any).getTime();
        const dateB = new Date(b.fecha_pedido as any).getTime();
        return dateB - dateA;
      });

      const rows = allOrders;

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
  }, [cliente?.id_cliente, cliente?.email, userEmail]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (userId != null) {
      loadFavorites();
    }
  }, [userId, loadFavorites]);

  useEffect(() => {
    if (cliente?.id_cliente || cliente?.email || userEmail) {
      loadOrders();
    }
  }, [cliente?.id_cliente, cliente?.email, userEmail, loadOrders]);

  const isPickup = (o: any) => {
    const m = (o?.metodo_envio || o?.tipo_envio || '').toString().toUpperCase();
    return m === 'PICKUP' || m === 'RETIRO';
  };

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => (o as any).estado?.toString().toUpperCase?.() === 'PENDIENTE').length;
    const completedOrders = orders.filter((o) => (o as any).estado?.toString().toUpperCase?.() === 'COMPLETADO').length;
    const totalSpent = orders.reduce((acc, o) => {
      const shipping = isPickup(o) ? 0 : Number((o as any).envio ?? 0);
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
        // Optimista
        setFavorites((prev) => prev.filter((f) => f.producto_id !== producto_id));
        const { error } = await supabase
          .from('Favoritos')
          .delete()
          .eq('user_id', userId)
          .eq('producto_id', producto_id);
        if (error) throw error;
        Toast.show({ type: 'success', text1: 'Quitado de favoritos' });
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'No se pudo quitar' });
        // refrescar para evitar inconsistencias
        loadFavorites();
      }
    },
    [userId, loadFavorites]
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
      <RNSafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'right', 'bottom', 'left']}>
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      </RNSafeAreaView>
    );
  }

  // Si no hay Cliente, mostrar mensaje para completar perfil en la web
  if (!cliente) {
    return (
      <RNSafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'right', 'bottom', 'left']}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, flex: 1, justifyContent: 'center' }}>
          <View style={{ alignItems: 'center', gap: 12 }}>
            <View style={[styles.avatar, { width: 80, height: 80, borderRadius: 40 }]}>
              <Ionicons name="person-outline" size={40} color="#C4B5FD" />
            </View>
            <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', textAlign: 'center' }}>
              ¡Hola, {userEmail?.split('@')[0] || 'Usuario'}!
            </Text>
            <Text style={{ color: C.muted, textAlign: 'center', lineHeight: 22 }}>
              Para ver y editar tu perfil completo, necesitás completar tu información en nuestra web.
            </Text>
          </View>
          
          <Card>
            <View style={{ padding: 16, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="information-circle-outline" size={24} color={C.primary} />
                <Text style={{ color: C.text, fontWeight: '700', fontSize: 16 }}>Completá tu perfil</Text>
              </View>
              <Text style={{ color: C.muted, lineHeight: 20 }}>
                Visitá www.universotattoo.com.ar e iniciá sesión para completar tu información de perfil y poder realizar pedidos.
              </Text>
              <View style={{ marginTop: 8, padding: 12, backgroundColor: C.primarySoft, borderRadius: 10 }}>
                <Text style={{ color: '#C4B5FD', fontSize: 13, textAlign: 'center' }}>
                  www.universotattoo.com.ar
                </Text>
              </View>
            </View>
          </Card>

          <Pressable
            onPress={async () => {
              await supabase.auth.signOut();
              router.replace('/(auth)');
            }}
            style={({ pressed }) => [
              { 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: 8, 
                paddingVertical: 14, 
                borderRadius: 12, 
                borderWidth: 1, 
                borderColor: C.border,
                backgroundColor: pressed ? 'rgba(255,255,255,0.05)' : 'transparent'
              }
            ]}
          >
            <Ionicons name="log-out-outline" size={18} color={C.muted} />
            <Text style={{ color: C.muted, fontWeight: '600' }}>Cerrar sesión</Text>
          </Pressable>
        </ScrollView>
      </RNSafeAreaView>
    );
  }

  const fullName = cliente ? `${cliente.nombre ?? ''} ${cliente.apellido ?? ''}`.trim() || 'Usuario' : 'Usuario';

  return (
    <RNSafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'right', 'bottom', 'left']}>
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
            {cliente ? (
              <Pressable style={styles.headerEditBtn} onPress={startEdit}>
                <Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>Editar</Text>
              </Pressable>
            ) : (
              <ActivityIndicator size="small" color={C.primary} />
            )}
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
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 18 }}>
                  Bienvenido, {cliente?.nombre || 'Usuario'}!
                </Text>
                <Text style={{ color: C.muted, marginBottom: 8 }}>
                  Aquí puedes ver un resumen de tu actividad en Universo Tattoo.
                </Text>
                <Text style={{ color: C.text, fontWeight: '700', marginTop: 4 }}>Tu actividad</Text>
                <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                  <Stat label="Pedidos totales" value={String(stats.totalOrders)} icon="bag-outline" />
                  <Stat label="Favoritos" value={loadingFavs ? '—' : String(favorites.length)} icon="heart-outline" tone="pink" />
                  <Stat label="Gastado" value={formatCurrency(stats.totalSpent)} icon="cash-outline" tone="violet" />
                  <Stat label="Último pedido" value={stats.lastOrderDate ? new Date(stats.lastOrderDate as any).toLocaleDateString() : '—'} icon="time-outline" tone="blue" />
                </View>
              </View>
            </Card>

            {/* Información adicional - estilo web */}
            <Card>
              <View style={{ padding: 14, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="settings-outline" size={18} color={C.primary} />
                  <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>Información adicional</Text>
                </View>
                
                <View style={{ gap: 10, marginTop: 4 }}>
                  <InfoRowWeb label="DNI:" value={cliente?.dni} />
                  <InfoRowWeb label="Dirección:" value={cliente?.calle ? `${cliente.calle}${cliente.numero ? ` ${cliente.numero}` : ''}` : null} />
                  <InfoRowWeb label="Ciudad:" value={cliente?.ciudad} />
                  <InfoRowWeb label="Provincia:" value={cliente?.provincia} />
                  <InfoRowWeb label="Código Postal:" value={cliente?.codigo_postal} />
                </View>

                {/* Barra de progreso del perfil */}
                <View style={{ marginTop: 12, gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: C.text, fontWeight: '600', fontSize: 14 }}>Perfil completado:</Text>
                    <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>{calcProfileCompletion(cliente)}%</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: C.border, borderRadius: 999, overflow: 'hidden' }}>
                    <View style={{ 
                      height: '100%', 
                      width: `${calcProfileCompletion(cliente)}%`, 
                      borderRadius: 999,
                      backgroundColor: 'transparent',
                    }}>
                      <View style={styles.progressGradient} />
                    </View>
                  </View>
                </View>

                {/* Botón editar perfil */}
                <Pressable 
                  style={styles.editProfileBtn} 
                  onPress={startEdit}
                >
                  <Ionicons name="create-outline" size={18} color={C.primary} />
                  <Text style={{ color: C.primary, fontWeight: '600', fontSize: 14 }}>Editar perfil</Text>
                </Pressable>
              </View>
            </Card>
          </>
        )}

        {/* Orders */}
        {tab === 'orders' && (
          <Card>
            <View style={{ padding: 14 }}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 18, marginBottom: 2 }}>Mis pedidos</Text>
              <Text style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>Historial completo de tus pedidos.</Text>
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
                <View style={{ alignItems: 'center', paddingVertical: 24, gap: 10 }}>
                  <Ionicons name="heart-outline" size={36} color={C.muted} />
                  <Text style={{ color: C.muted }}>No tenés productos favoritos.</Text>
                  <Button title="Ir a la tienda" onPress={() => router.push('../(client)/store')} />
                </View>
              ) : (
                // ===== CAMBIO CLAVE AQUÍ: Solo View con gap, sin row ni wrap =====
                <View style={{ gap: 10 }}>
                  {favorites.map((f) => (
                    <FavoriteCard
                      key={f.producto_id}
                      fav={f}
                      onRemove={() => removeFavorite(f.producto_id)}
                      onOpen={() => router.push(`/(client)/product/${f.producto_id}` as any)}
                      onAdd={() => {
                        const p: any = f.Producto;
                        if (!p) return;
                        const mainImg = Array.isArray(p.ProductoImagen)
                          ? (p.ProductoImagen.find((im: any) => im.es_principal) ?? p.ProductoImagen[0])?.url_imagen
                          : null;
                        const stock = Number(p.stock_total ?? 0);
                        if (stock <= 0) {
                          Toast.show({ type: 'info', text1: 'Sin stock' });
                          return;
                        }
                        addItem({
                          id: String(p.id_producto),
                          nombre: p.nombre,
                          precio: Number(p.precio_base ?? 0),
                          imagen: mainImg ?? null,
                          stock,
                          categoria: '',
                          sku: p.sku ?? null,
                          peso: null,
                          cantidad: 1,
                          quantity: 1,
                        } as any);
                        Toast.show({ type: 'success', text1: 'Agregado al carrito' });
                      }}
                    />
                  ))}
                </View>
              )}
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEdit} transparent animationType="fade" onRequestClose={() => setShowEdit(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: '94%', maxHeight: '90%' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <View>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 18 }}>Editar perfil</Text>
                <Text style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>Actualiza tu información personal</Text>
              </View>
              <Pressable onPress={() => setShowEdit(false)} hitSlop={8} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={C.muted} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 16, paddingTop: 16, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Ionicons name="person-outline" size={20} color={C.primary} />
                  <Section title="Información básica" />
                </View>
                <Row>
                  <LabeledInput label="Nombre *" value={edit.nombre} onChangeText={(t) => setEdit((s) => ({ ...s, nombre: t }))} />
                  <LabeledInput label="Apellido *" value={edit.apellido} onChangeText={(t) => setEdit((s) => ({ ...s, apellido: t }))} />
                </Row>
                <LabeledInput label="Email *" keyboardType="email-address" autoCapitalize="none" value={edit.email} onChangeText={(t) => setEdit((s) => ({ ...s, email: t }))} />
                <LabeledInput label="Teléfono" keyboardType="phone-pad" placeholder="+54 9 11 1234-5678" value={edit.telefono} onChangeText={(t) => setEdit((s) => ({ ...s, telefono: t }))} />
                <View style={{ gap: 4 }}>
                  <Text style={{ color: C.muted, fontSize: 13 }}>Fecha de nacimiento</Text>
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#11151B',
                      borderWidth: 1,
                      borderColor: C.border,
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <Text style={{ color: edit.fecha_nacimiento ? C.text : C.muted, fontSize: 15 }}>
                      {edit.fecha_nacimiento || 'Seleccionar fecha'}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color={C.muted} />
                  </Pressable>
                  {showDatePicker && (
                    <DateTimePicker
                      value={edit.fecha_nacimiento ? new Date(edit.fecha_nacimiento) : new Date(2000, 0, 1)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      maximumDate={new Date()}
                      minimumDate={new Date(1920, 0, 1)}
                      onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                        if (Platform.OS === 'android') {
                          setShowDatePicker(false);
                        }
                        if (event.type === 'set' && selectedDate) {
                          const year = selectedDate.getFullYear();
                          const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                          const day = String(selectedDate.getDate()).padStart(2, '0');
                          setEdit((s) => ({ ...s, fecha_nacimiento: `${year}-${month}-${day}` }));
                        }
                      }}
                    />
                  )}
                  {Platform.OS === 'ios' && showDatePicker && (
                    <Pressable
                      onPress={() => setShowDatePicker(false)}
                      style={{
                        backgroundColor: C.primary,
                        padding: 10,
                        borderRadius: 8,
                        alignItems: 'center',
                        marginTop: 8,
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '600' }}>Listo</Text>
                    </Pressable>
                  )}
                </View>
                <View style={{ backgroundColor: C.card, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border }}>
                  <ToggleRow label="Newsletter (recibir ofertas y novedades)" value={edit.acepta_marketing} onValueChange={(v) => setEdit((s) => ({ ...s, acepta_marketing: v }))} />
                </View>
              </View>

              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Ionicons name="card-outline" size={20} color={C.primary} />
                  <Section title="Documento de identidad" />
                </View>
                <LabeledInput label="DNI" placeholder="12.345.678" value={edit.dni} onChangeText={(t) => setEdit((s) => ({ ...s, dni: t }))} />
              </View>

              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Ionicons name="location-outline" size={20} color={C.primary} />
                  <Section title="Dirección de envío" />
                </View>
                <Row>
                  <LabeledInput label="Calle" placeholder="" value={edit.calle} onChangeText={(t) => setEdit((s) => ({ ...s, calle: t }))} />
                  <LabeledInput label="Número" placeholder="" value={edit.numero} onChangeText={(t) => setEdit((s) => ({ ...s, numero: t }))} />
                </Row>
                <Row>
                  <LabeledInput label="Departamento (opcional)" placeholder="" value={edit.departamento} onChangeText={(t) => setEdit((s) => ({ ...s, departamento: t }))} />
                  <LabeledInput label="Barrio (opcional)" placeholder="" value={edit.barrio} onChangeText={(t) => setEdit((s) => ({ ...s, barrio: t }))} />
                </Row>
                <Row>
                  <LabeledInput label="Ciudad" placeholder="" value={edit.ciudad} onChangeText={(t) => setEdit((s) => ({ ...s, ciudad: t }))} />
                  <LabeledInput label="Provincia" placeholder="" value={edit.provincia} onChangeText={(t) => setEdit((s) => ({ ...s, provincia: t }))} />
                </Row>
                <LabeledInput label="Código postal" placeholder="" value={edit.codigo_postal} onChangeText={(t) => setEdit((s) => ({ ...s, codigo_postal: t }))} />
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border }}>
              <View style={{ flex: 1 }}>
                <Button title="Cancelar" variant="outline" onPress={() => setShowEdit(false)} disabled={savingEdit} />
              </View>
              <View style={{ flex: 1 }}>
                <Button 
                  title={savingEdit ? 'Guardando…' : 'Guardar cambios'} 
                  onPress={saveEdit} 
                  disabled={savingEdit}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

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
                <InfoRow icon="navigate-outline" label="Entrega" value={String((selectedOrder as any)?.metodo_envio ?? (selectedOrder as any)?.tipo_envio ?? '—')} />
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
                        (isPickup(selectedOrder) ? 0 : Number((selectedOrder as any)?.envio ?? 0))
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
    </RNSafeAreaView>
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

// Componente para mostrar fila de información estilo web
function InfoRowWeb({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <Text style={{ color: C.muted, fontSize: 14 }}>{label}</Text>
      <Text 
        style={{ 
          color: value ? C.text : C.muted, 
          fontWeight: value ? '600' : '400',
          fontStyle: value ? 'normal' : 'italic',
          fontSize: 14,
          textAlign: 'right',
          flex: 1,
          marginLeft: 16,
        }}
      >
        {value || 'No especificado'}
      </Text>
    </View>
  );
}

// Calcular el porcentaje de perfil completado
function calcProfileCompletion(c: Cliente | null): number {
  if (!c) return 0;
  
  const fields = [
    c.nombre,
    c.apellido,
    c.email,
    c.telefono,
    c.dni,
    c.calle,
    c.numero,
    c.ciudad,
    c.provincia,
    c.codigo_postal,
    c.fecha_nacimiento,
  ];
  
  const filled = fields.filter(f => f != null && String(f).trim() !== '').length;
  return Math.round((filled / fields.length) * 100);
}

// === COMPONENTE CARD EDITADO ===
function FavoriteCard({
  fav,
  onRemove,
  onOpen,
  onAdd,
}: {
  fav: FavoriteItem;
  onRemove: () => void;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const p: any = fav.Producto;
  const img = Array.isArray(p?.ProductoImagen)
    ? (p.ProductoImagen.find((im: any) => im.es_principal) ?? p.ProductoImagen[0])?.url_imagen
    : undefined;
  const price =
    typeof p?.precio_base === 'number'
      ? p.precio_base.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
      : '—';

  return (
    <View style={styles.favCard}>
      <Pressable onPress={onOpen} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <View style={styles.thumbLarge}>
          {img ? (
            <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Ionicons name="image-outline" size={20} color={C.muted} />
          )}
        </View>
        <View style={{ gap: 2, flex: 1 }}>
          <Text style={{ color: C.text, fontWeight: '700', fontSize: 13 }} numberOfLines={2}>
            {p?.nombre ?? 'Producto'}
          </Text>
          <Text style={{ color: '#A78BFA', fontWeight: '800', fontSize: 12 }} numberOfLines={1}>
            {price}
          </Text>
        </View>
      </Pressable>

      {/* BOTONES CUSTOM "Ver" y "Agregar" */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Pressable style={styles.miniBtnOutline} onPress={onOpen}>
          <Text style={styles.miniBtnTextOutline}>Ver</Text>
        </Pressable>
        <Pressable style={styles.miniBtn} onPress={onAdd}>
          <Text style={styles.miniBtnText}>Agregar</Text>
        </Pressable>
        <Pressable onPress={onRemove} hitSlop={10} style={{ marginLeft: 2 }}>
          <Ionicons name="heart-dislike-outline" size={20} color="#FCA5A5" />
        </Pressable>
      </View>
    </View>
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
    Number(item._total ?? 0) + ((item as any).metodo_envio?.toString().toUpperCase?.() === 'PICKUP' ? 0 : Number((item as any).envio ?? 0));

  // Formatear fecha como en web (ej: "4 de diciembre de 2025")
  const formatDateWeb = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-AR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch {
      return '—';
    }
  };

  // Contar productos
  const productCount = item._items?.length ?? 0;

  return (
    <View style={styles.orderCard}>
      {/* Header con número de pedido y precio + badge */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>
            Pedido #ORD-{item.numero_pedido ?? item.id_pedido}
          </Text>
          <Text style={{ color: C.muted, fontSize: 13 }}>
            {formatDateWeb(item.fecha_pedido as any)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text style={{ color: C.primary, fontWeight: '800', fontSize: 16 }}>
            {total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
          </Text>
          <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.br }]}>
            <Text style={{ color: badge.fg, fontWeight: '700', fontSize: 11, textTransform: 'uppercase' }}>{s}</Text>
          </View>
        </View>
      </View>

      {/* Cantidad de productos y botones */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="cube-outline" size={16} color={C.muted} />
          <Text style={{ color: C.muted, fontSize: 13 }}>
            {productCount === 0 ? '—' : productCount === 1 ? '1 producto' : `${productCount} productos`}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable 
            style={styles.orderBtnOutline} 
            onPress={onView}
          >
            <Ionicons name="eye-outline" size={14} color={C.text} />
            <Text style={styles.orderBtnTextOutline}>Ver detalles</Text>
          </Pressable>
          <Pressable 
            style={styles.orderBtnOutline} 
            onPress={onReorder}
          >
            <Ionicons name="refresh-outline" size={14} color={C.text} />
            <Text style={styles.orderBtnTextOutline}>Reordenar</Text>
          </Pressable>
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

  // === CARD FAVORITOS AJUSTADA A FULL WIDTH ===
  favCard: {
    width: '100%', // <--- SEGURO: 100%
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    justifyContent: 'space-between',
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

  // === ESTILOS DE LOS BOTONES NUEVOS ===
  miniBtn: {
    flex: 1,
    height: 32,
    backgroundColor: C.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  miniBtnOutline: {
    flex: 1,
    height: 32,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    backgroundColor: 'transparent',
  },
  miniBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  miniBtnTextOutline: {
    fontSize: 11,
    fontWeight: '700',
    color: C.text,
  },
  
  // === ESTILO DEL BOTON EDITAR (HEADER) ===
  headerEditBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },

  // Barra de progreso con degradado violeta a rosa
  progressGradient: {
    flex: 1,
    height: '100%',
    backgroundColor: C.primary,
    borderRadius: 999,
  },

  // Botón editar perfil estilo web
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.primary,
    backgroundColor: 'rgba(124,58,237,0.1)',
  },

  orderCard: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },

  // Botones de orden estilo web
  orderBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: 'transparent',
  },
  orderBtnTextOutline: {
    fontSize: 12,
    fontWeight: '600',
    color: C.text,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '92%', maxHeight: '86%', borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, padding: 12, gap: 10 },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 6 },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 36, height: 36, backgroundColor: '#1A202C', borderRadius: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

  // Edit inputs
  label: { color: C.text, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#11151B',
    paddingHorizontal: 12,
    color: C.text,
  },
});

function Section({ title }: { title: string }) {
  return <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>{title}</Text>;
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 10 }}>{children}</View>;
}

function LabeledInput({
  label,
  value,
  onChangeText,
  keyboardType,
  placeholder,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric' | 'url';
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        autoCapitalize={autoCapitalize}
        style={styles.input}
      />
    </View>
  );
}

function ToggleRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ color: C.text, fontSize: 14, flex: 1, marginRight: 12 }}>{label}</Text>
      <Switch 
        value={value} 
        onValueChange={onValueChange}
        trackColor={{ false: C.border, true: C.primary }}
        thumbColor={value ? '#fff' : '#f4f3f4'}
      />
    </View>
  );
}