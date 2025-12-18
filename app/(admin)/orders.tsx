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
   
  // Modal de creación manual
  const [showCreateModal, setShowCreateModal] = useState(false);

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
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.title}>Pedidos</Text>
              </View>

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
       
      {/* Modal de creación manual */}
      <CreateManualOrderModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onOrderCreated={() => {
          fetchPage(0, true);
        }}
      />
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

// ===========================
// CREAR PEDIDO MANUAL MODAL
// ===========================
interface Producto {
  id_producto: number;
  nombre: string;
  precio_base: number;
  stock_total: number;
  imagen_url?: string;
  Categoria?: { 
    id_categoria: number;
    nombre: string;
  };
  ProductoVariante?: Array<{
    id_variante: number;
    stock: number;
    color?: string;
    volumen?: string;
    grosor?: string;
    numero_agujas?: string;
    configuracion_aguja?: string;
  }>;
}

interface OrderItem {
  producto: Producto;
  cantidad: number;
  variante_id?: number;
  variante?: any;
}

function CreateManualOrderModal({
  visible,
  onClose,
  onOrderCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onOrderCreated?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(false);
   
  // Productos y categorías
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filteredProductos, setFilteredProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
   
  // Items del carrito
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
   
  // Datos del cliente
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteApellido, setClienteApellido] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [estadoPedido, setEstadoPedido] = useState<EstadoPedido>('PENDIENTE');
  const [estadoPago, setEstadoPago] = useState<EstadoPago>('PENDIENTE');
   
  // Modal de selección de variantes
  const [selectingVariantFor, setSelectingVariantFor] = useState<Producto | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  // Cargar productos y categorías
  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    setLoadingProductos(true);
    try {
      // Cargar categorías
      const { data: cats, error: catsError } = await supabase
        .from('Categoria')
        .select('*')
        .order('nombre');
      if (!catsError && cats) setCategorias(cats);

      // Cargar productos con variantes (igual que en la web)
      const { data: prods, error: prodsError } = await supabase
        .from('Producto')
        .select(`
          id_producto,
          nombre,
          precio_base,
          stock_total,
          es_activo,
          Categoria(id_categoria, nombre),
          ProductoVariante(
            id_variante,
            stock,
            color,
            volumen,
            grosor,
            numero_agujas,
            configuracion_aguja,
            atributos_personalizados,
            es_activa
          )
        `)
        .eq('es_activo', true)
        .order('nombre');

      if (prodsError) {
        console.error('❌ Error cargando productos:', prodsError);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: prodsError.message || 'No se pudieron cargar los productos',
        });
        setProductos([]);
        setFilteredProductos([]);
      } else if (prods) {
        // Calcular stock total sumando todas las variantes
        const prodsConStock = prods.map((prod: any) => {
          const stockCalculado = prod.ProductoVariante?.reduce(
            (total: number, variante: any) => total + (variante.stock || 0),
            0
          ) || prod.stock_total || 0;
           
          return {
            ...prod,
            stock_total: stockCalculado,
          };
        });
        
        setProductos(prodsConStock as any);
        setFilteredProductos(prodsConStock as any);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudieron cargar los productos',
      });
    } finally {
      setLoadingProductos(false);
    }
  };

  // Filtrar productos
  useEffect(() => {
    let filtered = productos;

    if (selectedCategoria && selectedCategoria !== 'todos') {
      filtered = filtered.filter((p) => p.Categoria?.id_categoria?.toString() === selectedCategoria);
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((p) =>
        p.nombre.toLowerCase().includes(search) ||
        p.Categoria?.nombre?.toLowerCase().includes(search)
      );
    }

    setFilteredProductos(filtered);
  }, [selectedCategoria, searchTerm, productos]);

  const getVarianteLabel = (variante: any) => {
    if (!variante) return null;
    const parts: string[] = [];
    if (variante.color) parts.push(variante.color);
    if (variante.volumen) parts.push(variante.volumen);
    if (variante.grosor) parts.push(variante.grosor);
    if (variante.numero_agujas) parts.push(variante.numero_agujas);
    if (variante.configuracion_aguja) parts.push(variante.configuracion_aguja);
    return parts.length > 0 ? parts.join(' • ') : `Variante ${variante.id_variante}`;
  };

  const addProductToOrder = (producto: Producto, varianteId?: number) => {
    // Si tiene variantes y no se seleccionó una, abrir selector
    if (producto.ProductoVariante && producto.ProductoVariante.length > 0 && !varianteId) {
      setSelectingVariantFor(producto);
      setSelectedVariantId(null);
      return;
    }

    const variante = varianteId
      ? producto.ProductoVariante?.find((v) => v.id_variante === varianteId)
      : undefined;

    const existingItem = orderItems.find(
      (item) =>
        item.producto.id_producto === producto.id_producto &&
        item.variante_id === varianteId
    );

    if (existingItem) {
      setOrderItems(
        orderItems.map((item) =>
          item.producto.id_producto === producto.id_producto &&
          item.variante_id === varianteId
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      );
    } else {
      setOrderItems([
        ...orderItems,
        {
          producto,
          cantidad: 1,
          variante_id: varianteId,
          variante: variante,
        },
      ]);
    }

    const varianteLabel = variante ? getVarianteLabel(variante) : '';
    const varianteText = varianteLabel ? ` (${varianteLabel})` : '';
     
    Toast.show({
      type: 'success',
      text1: 'Producto agregado',
      text2: `${producto.nombre}${varianteText}`,
    });

    setSelectingVariantFor(null);
  };

  const confirmVariantSelection = () => {
    if (selectingVariantFor && selectedVariantId) {
      addProductToOrder(selectingVariantFor, selectedVariantId);
    }
  };

  const updateQuantity = (productoId: number, cantidad: number, varianteId?: number) => {
    if (cantidad <= 0) {
      removeProduct(productoId, varianteId);
      return;
    }

    setOrderItems(
      orderItems.map((item) =>
        item.producto.id_producto === productoId && item.variante_id === varianteId
          ? { ...item, cantidad }
          : item
      )
    );
  };

  const removeProduct = (productoId: number, varianteId?: number) => {
    setOrderItems(
      orderItems.filter(
        (item) =>
          !(item.producto.id_producto === productoId && item.variante_id === varianteId)
      )
    );
  };

  const calculateTotal = () => {
    return orderItems.reduce(
      (sum, item) => sum + item.producto.precio_base * item.cantidad,
      0
    );
  };

  const generateOrderNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${year}${month}${day}-${random}`;
  };

  const handleCreateOrder = async () => {
    // Validaciones
    if (!clienteNombre.trim() || !clienteApellido.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'El nombre y apellido son obligatorios',
      });
      return;
    }

    if (orderItems.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Debes agregar al menos un producto',
      });
      return;
    }

    // Verificar stock
    for (const item of orderItems) {
      const stockDisponible = item.variante
        ? item.variante.stock
        : item.producto.stock_total;

      if (stockDisponible < item.cantidad) {
        const varianteText = item.variante
          ? ` (${getVarianteLabel(item.variante)})`
          : '';
        Toast.show({
          type: 'error',
          text1: 'Stock insuficiente',
          text2: `${item.producto.nombre}${varianteText}`,
        });
        return;
      }
    }

    try {
      setLoading(true);

      // 1. Buscar o crear cliente
      let clienteId: number;

      if (clienteEmail.trim()) {
        // Buscar cliente existente por email
        const { data: existingCliente } = await supabase
          .from('Cliente')
          .select('id_cliente')
          .eq('email', clienteEmail.trim())
          .limit(1)
          .maybeSingle();

        if (existingCliente) {
          clienteId = existingCliente.id_cliente;
        } else {
          // Crear nuevo cliente
          const { data: newCliente, error: clienteError } = await supabase
            .from('Cliente')
            .insert({
              nombre: clienteNombre.trim(),
              apellido: clienteApellido.trim(),
              email: clienteEmail.trim(),
              telefono: clienteTelefono.trim() || null,
              acepta_marketing: false,
              total_gastado: 0,
            })
            .select('id_cliente')
            .single();

          if (clienteError) throw clienteError;
          clienteId = newCliente.id_cliente;
        }
      } else {
        // Sin email, crear cliente básico
        const { data: newCliente, error: clienteError } = await supabase
          .from('Cliente')
          .insert({
            nombre: clienteNombre.trim(),
            apellido: clienteApellido.trim(),
            email: `cliente_${Date.now()}@temp.com`, // Email temporal
            telefono: clienteTelefono.trim() || null,
            acepta_marketing: false,
            total_gastado: 0,
          })
          .select('id_cliente')
          .single();

        if (clienteError) throw clienteError;
        clienteId = newCliente.id_cliente;
      }

      // 2. Crear pedido
      const orderNumber = generateOrderNumber();
      const total = calculateTotal();

      const { data: pedido, error: pedidoError } = await supabase
        .from('Pedido')
        .insert({
          numero_pedido: orderNumber,
          clienteId: clienteId,
          estado: estadoPedido,
          estado_pago: estadoPago,
          metodo_pago: metodoPago,
          subtotal: total,
          total: total,
          envio: 0,
          descuento: 0,
          impuestos: 0,
          nombre_comprador: clienteNombre.trim(),
          apellido_comprador: clienteApellido.trim(),
          email_comprador: clienteEmail.trim() || null,
          telefono_comprador: clienteTelefono.trim() || null,
          fecha_pedido: new Date().toISOString(),
        })
        .select('id_pedido')
        .single();

      if (pedidoError) throw pedidoError;

      // 3. Crear PedidoProducto
      const pedidoProductos = orderItems.map((item) => ({
        pedidoId: pedido.id_pedido,
        productoId: item.producto.id_producto,
        varianteId: item.variante_id || null,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio_base,
        descuento: 0,
      }));

      const { error: ppError } = await supabase
        .from('PedidoProducto')
        .insert(pedidoProductos);

      if (ppError) throw ppError;

      Toast.show({
        type: 'success',
        text1: '¡Pedido creado!',
        text2: `#${orderNumber}`,
      });

      // Resetear formulario
      setClienteNombre('');
      setClienteApellido('');
      setClienteEmail('');
      setClienteTelefono('');
      setOrderItems([]);
      setSelectedCategoria('');
      setSearchTerm('');
      setEstadoPedido('PENDIENTE');
      setEstadoPago('PENDIENTE');
      setMetodoPago('efectivo');

      if (onOrderCreated) onOrderCreated();
      onClose();
    } catch (error) {
      console.error('Error creando pedido:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo crear el pedido',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: C.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '90%',
            padding: 14,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>
              Crear Pedido Manual
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={C.text} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 550 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 10 }}>
              {/* Datos del Cliente */}
              <View style={{ backgroundColor: '#11151B', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 8 }}>
                  Datos del Cliente
                </Text>
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Nombre *</Text>
                      <TextInput
                        style={styles.input}
                        value={clienteNombre}
                        onChangeText={setClienteNombre}
                        placeholder="Juan"
                        placeholderTextColor={C.muted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Apellido *</Text>
                      <TextInput
                        style={styles.input}
                        value={clienteApellido}
                        onChangeText={setClienteApellido}
                        placeholder="Pérez"
                        placeholderTextColor={C.muted}
                      />
                    </View>
                  </View>
                  <View>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={styles.input}
                      value={clienteEmail}
                      onChangeText={setClienteEmail}
                      placeholder="cliente@email.com"
                      placeholderTextColor={C.muted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  <View>
                    <Text style={styles.label}>Teléfono</Text>
                    <TextInput
                      style={styles.input}
                      value={clienteTelefono}
                      onChangeText={setClienteTelefono}
                      placeholder="+598 99 123 456"
                      placeholderTextColor={C.muted}
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View>
                    <Text style={styles.label}>Método de Pago</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {['efectivo', 'debito', 'credito', 'transferencia'].map((metodo) => (
                        <Pressable
                          key={metodo}
                          onPress={() => setMetodoPago(metodo)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: metodoPago === metodo ? C.primary : C.border,
                            backgroundColor: metodoPago === metodo ? C.primarySoft : 'transparent',
                          }}
                        >
                          <Text style={{ fontSize: 11, color: metodoPago === metodo ? C.primary : C.muted, fontWeight: '600' }}>
                            {metodo.charAt(0).toUpperCase() + metodo.slice(1)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                   
                  <View>
                    <Text style={styles.label}>Estado del Pedido</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {[
                        { value: 'PENDIENTE', label: 'Pendiente', emoji: '⏳' },
                        { value: 'CONFIRMADO', label: 'Confirmado', emoji: '✅' },
                        { value: 'PREPARANDO', label: 'Preparando', emoji: '📦' },
                        { value: 'ENVIADO', label: 'Enviado', emoji: '🚚' },
                        { value: 'ENTREGADO', label: 'Entregado', emoji: '🎉' },
                      ].map((estado) => (
                        <Pressable
                          key={estado.value}
                          onPress={() => setEstadoPedido(estado.value as EstadoPedido)}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 5,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: estadoPedido === estado.value ? C.primary : C.border,
                            backgroundColor: estadoPedido === estado.value ? C.primarySoft : 'transparent',
                          }}
                        >
                          <Text style={{ fontSize: 10, color: estadoPedido === estado.value ? C.primary : C.muted, fontWeight: '600' }}>
                            {estado.emoji} {estado.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                   
                  <View>
                    <Text style={styles.label}>Estado del Pago</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {[
                        { value: 'PENDIENTE', label: 'Pendiente', emoji: '⏳' },
                        { value: 'PAGADO', label: 'Pagado', emoji: '✅' },
                        { value: 'FALLIDO', label: 'Fallido', emoji: '❌' },
                        { value: 'REEMBOLSADO', label: 'Reembolsado', emoji: '🔄' },
                      ].map((pago) => (
                        <Pressable
                          key={pago.value}
                          onPress={() => setEstadoPago(pago.value as EstadoPago)}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 5,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: estadoPago === pago.value ? C.primary : C.border,
                            backgroundColor: estadoPago === pago.value ? C.primarySoft : 'transparent',
                          }}
                        >
                          <Text style={{ fontSize: 10, color: estadoPago === pago.value ? C.primary : C.muted, fontWeight: '600' }}>
                            {pago.emoji} {pago.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
              </View>

              {/* Carrito */}
              <View style={{ backgroundColor: '#11151B', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 8 }}>
                  Carrito ({orderItems.length})
                </Text>
                {orderItems.length === 0 ? (
                  <Text style={{ fontSize: 12, color: C.muted, textAlign: 'center', paddingVertical: 10 }}>
                    Sin productos. Agrega productos desde abajo.
                  </Text>
                ) : (
                  <View style={{ gap: 6 }}>
                    {orderItems.map((item, index) => {
                      const varianteLabel = item.variante ? getVarianteLabel(item.variante) : null;
                      return (
                        <View
                          key={`${item.producto.id_producto}-${item.variante_id || 'sin-variante'}-${index}`}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 8,
                            backgroundColor: C.bg,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: C.border,
                          }}
                        >
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }} numberOfLines={1}>
                              {item.producto.nombre}
                            </Text>
                            {varianteLabel && (
                              <Text style={{ fontSize: 10, color: C.muted }} numberOfLines={1}>
                                {varianteLabel}
                              </Text>
                            )}
                            <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                              ${item.producto.precio_base.toLocaleString()}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Pressable
                              onPress={() =>
                                updateQuantity(
                                  item.producto.id_producto,
                                  item.cantidad - 1,
                                  item.variante_id
                                )
                              }
                              style={{
                                width: 28,
                                height: 28,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 6,
                                backgroundColor: C.border,
                              }}
                            >
                              <Ionicons name="remove" size={14} color={C.text} />
                            </Pressable>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, minWidth: 24, textAlign: 'center' }}>
                              {item.cantidad}
                            </Text>
                            <Pressable
                              onPress={() =>
                                updateQuantity(
                                  item.producto.id_producto,
                                  item.cantidad + 1,
                                  item.variante_id
                                )
                              }
                              style={{
                                width: 28,
                                height: 28,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 6,
                                backgroundColor: C.primary,
                              }}
                            >
                              <Ionicons name="add" size={14} color="#FFF" />
                            </Pressable>
                            <Pressable
                              onPress={() => removeProduct(item.producto.id_producto, item.variante_id)}
                              style={{ marginLeft: 4 }}
                            >
                              <Ionicons name="trash-outline" size={16} color={C.danger} />
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                    <View
                      style={{
                        paddingTop: 8,
                        marginTop: 4,
                        borderTopWidth: 1,
                        borderTopColor: C.border,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: C.muted }}>Total:</Text>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: C.primary }}>
                        ${calculateTotal().toLocaleString()}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Productos Disponibles */}
              <View style={{ backgroundColor: '#11151B', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 8 }}>
                  Productos Disponibles
                </Text>

                {/* Buscador */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: C.border }}>
                    <Ionicons name="search-outline" size={14} color={C.muted} />
                    <TextInput
                      style={{ flex: 1, color: C.text, fontSize: 12, paddingVertical: 8 }}
                      placeholder="Buscar producto..."
                      placeholderTextColor={C.muted}
                      value={searchTerm}
                      onChangeText={setSearchTerm}
                    />
                    {searchTerm && (
                      <Pressable onPress={() => setSearchTerm('')}>
                        <Ionicons name="close-circle" size={16} color={C.muted} />
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Filtro por Categoría */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 8 }}
                  contentContainerStyle={{ gap: 4 }}
                >
                  <Pressable
                    onPress={() => setSelectedCategoria('todos')}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: selectedCategoria === 'todos' || !selectedCategoria ? C.primary : C.border,
                      backgroundColor: selectedCategoria === 'todos' || !selectedCategoria ? C.primarySoft : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 11, color: selectedCategoria === 'todos' || !selectedCategoria ? C.primary : C.muted, fontWeight: '600' }}>
                      Todos
                    </Text>
                  </Pressable>
                  {categorias.map((cat) => (
                    <Pressable
                      key={cat.id_categoria}
                      onPress={() => setSelectedCategoria(cat.id_categoria.toString())}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: selectedCategoria === cat.id_categoria.toString() ? C.primary : C.border,
                        backgroundColor: selectedCategoria === cat.id_categoria.toString() ? C.primarySoft : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: 11, color: selectedCategoria === cat.id_categoria.toString() ? C.primary : C.muted, fontWeight: '600' }}>
                        {cat.nombre}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {/* Lista de Productos */}
                {loadingProductos ? (
                  <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={C.primary} />
                  </View>
                ) : filteredProductos.length === 0 ? (
                  <Text style={{ fontSize: 12, color: C.muted, textAlign: 'center', paddingVertical: 10 }}>
                    No hay productos disponibles
                  </Text>
                ) : (
                  <ScrollView 
                    style={{ maxHeight: 300 }} 
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                  >
                    <View style={{ gap: 4 }}>
                      {filteredProductos.map((producto) => {
                        const enCarrito = orderItems.find((item) => item.producto.id_producto === producto.id_producto);
                        const tieneVariantes = producto.ProductoVariante && producto.ProductoVariante.length > 0;
                       
                      return (
                        <Pressable
                          key={producto.id_producto}
                          onPress={() => addProductToOrder(producto)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 8,
                            backgroundColor: enCarrito ? C.primarySoft : C.bg,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: enCarrito ? C.primary : C.border,
                          }}
                        >
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }} numberOfLines={1}>
                              {producto.nombre}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              {producto.Categoria && (
                                <Text style={{ fontSize: 10, color: C.muted }} numberOfLines={1}>
                                  {producto.Categoria.nombre}
                                </Text>
                              )}
                              {tieneVariantes && (
                                <View style={{ backgroundColor: '#3B82F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 9, color: '#FFF', fontWeight: '600' }}>
                                    {producto.ProductoVariante?.length || 0} variantes
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 2 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: C.primary }}>
                              ${producto.precio_base.toLocaleString()}
                            </Text>
                            <Text style={{ fontSize: 10, color: producto.stock_total > 0 ? C.success : C.danger }}>
                              Stock: {producto.stock_total}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                    </View>
                  </ScrollView>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Botones de acción */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Pressable
              onPress={onClose}
              disabled={loading}
              style={{
                flex: 1,
                backgroundColor: C.border,
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={handleCreateOrder}
              disabled={loading || orderItems.length === 0 || !clienteNombre.trim()}
              style={{
                flex: 1,
                backgroundColor: C.primary,
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: 'center',
                opacity: loading || orderItems.length === 0 || !clienteNombre.trim() ? 0.5 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>
                  Crear Pedido (${calculateTotal().toLocaleString()})
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* Modal de Selección de Variantes */}
      {selectingVariantFor && (
        <Modal visible transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ backgroundColor: C.card, borderRadius: 12, padding: 16, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: C.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>
                  Seleccionar Variante
                </Text>
                <Pressable onPress={() => setSelectingVariantFor(null)}>
                  <Ionicons name="close" size={24} color={C.text} />
                </Pressable>
              </View>
               
              <Text style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
                {selectingVariantFor.nombre}
              </Text>

              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 6 }}>
                  {selectingVariantFor.ProductoVariante?.map((variante) => {
                    const varianteLabel = getVarianteLabel(variante);
                    const sinStock = variante.stock <= 0;
                    const selected = selectedVariantId === variante.id_variante;

                    return (
                      <Pressable
                        key={variante.id_variante}
                        onPress={() => !sinStock && setSelectedVariantId(variante.id_variante)}
                        disabled={sinStock}
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: selected ? C.primary : C.border,
                          backgroundColor: selected ? C.primarySoft : sinStock ? '#11151B' : C.bg,
                          opacity: sinStock ? 0.5 : 1,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: sinStock ? C.muted : C.text, textDecorationLine: sinStock ? 'line-through' : 'none' }}>
                              {varianteLabel}
                            </Text>
                            <Text style={{ fontSize: 11, color: sinStock ? '#EF4444' : C.muted, marginTop: 2 }}>
                              Stock: {variante.stock} unidades {sinStock && '(Sin stock)'}
                            </Text>
                          </View>
                          {selected && !sinStock && (
                            <Ionicons name="checkmark-circle" size={20} color={C.primary} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <Pressable
                  onPress={() => setSelectingVariantFor(null)}
                  style={{
                    flex: 1,
                    backgroundColor: C.border,
                    paddingVertical: 10,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={confirmVariantSelection}
                  disabled={!selectedVariantId}
                  style={{
                    flex: 1,
                    backgroundColor: C.primary,
                    paddingVertical: 10,
                    borderRadius: 8,
                    alignItems: 'center',
                    opacity: selectedVariantId ? 1 : 0.5,
                  }}
                >
                  <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 13 }}>Agregar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
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

// ===========================
// ORDER CARD MODIFICADO
// ===========================
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
      {/* Header: Número de pedido y Fecha (La fecha sube aquí para ahorrar espacio) */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <Ionicons name="receipt-outline" size={16} color={C.primary} />
          {/* numberOfLines y flex: 1 aseguran que si es muy largo no rompa el diseño */}
          <Text style={styles.orderNumber} numberOfLines={1} ellipsizeMode="middle">
            #{item.numero_pedido}
          </Text>
        </View>
        {/* Movemos la fecha aquí arriba para balancear */}
        <Text style={[styles.metaText, { fontSize: 11 }]}>{formatDate(item.fecha_pedido)}</Text>
      </View>

      {/* Cliente */}
      <View style={{ marginBottom: 12 }}>
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
      </View>

      {/* Separador visual */}
      <View style={{ height: 1, backgroundColor: C.border, marginBottom: 10 }} />

      {/* Footer: Total a la izquierda, Estados detallados a la derecha */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        
        {/* Izquierda: Total y Método de pago */}
        <View style={{ gap: 4 }}>
          {item.metodo_pago && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="card-outline" size={12} color={C.muted} />
              <Text style={[styles.metaText, { fontSize: 11 }]} numberOfLines={1}>
                {item.metodo_pago}
              </Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="cash-outline" size={18} color={C.success} />
            <Text style={styles.totalText}>{formatCurrency(item.total)}</Text>
          </View>
        </View>
        
        {/* Derecha: Estados con etiquetas claras */}
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          
          {/* Fila Estado PEDIDO */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 10, color: C.muted, fontWeight: '700', letterSpacing: 0.5 }}>PEDIDO</Text>
            <View style={[styles.badge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.br, minWidth: 85, alignItems: 'center' }]}>
              <Text style={[styles.badgeText, { color: statusStyle.fg }]}>
                {statusStyle.label}
              </Text>
            </View>
          </View>

          {/* Fila Estado PAGO */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 10, color: C.muted, fontWeight: '700', letterSpacing: 0.5 }}>PAGO</Text>
            <View style={[styles.badge, { backgroundColor: paymentStyle.bg, borderColor: paymentStyle.br, minWidth: 85, alignItems: 'center' }]}>
              <Text style={[styles.badgeText, { color: paymentStyle.fg }]}>
                {paymentStyle.label}
              </Text>
            </View>
          </View>

        </View>
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
    metodo_pago: order.metodo_pago || '',
  });
  const [saving, setSaving] = useState(false);
  const [productos, setProductos] = useState<any[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(true);

  // Cargar productos del pedido
  useEffect(() => {
    if (visible) {
      loadProductos();
    }
  }, [visible, order.id_pedido]);

  const loadProductos = async () => {
    setLoadingProductos(true);
    try {
      const { data, error } = await supabase
        .from('PedidoProducto')
        .select(`
          *,
          Producto(
            id_producto,
            nombre,
            sku,
            ProductoImagen(url_imagen, es_principal)
          )
        `)
        .eq('pedidoId', order.id_pedido);

      if (error) throw error;
      setProductos(data || []);
    } catch (error: any) {
      console.error('Error cargando productos:', error);
      Toast.show({ type: 'error', text1: 'Error cargando productos' });
    } finally {
      setLoadingProductos(false);
    }
  };

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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: 4 }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.modalTitle}>Pedido #{order.numero_pedido}</Text>
              <Text style={styles.metaText}>{formatDate(order.fecha_pedido)}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={{ marginTop: -4 }}>
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

          {/* Estado del Pedido - Solo lectura */}
          <View style={styles.detailCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ionicons name="cube" size={18} color={C.primary} />
              <Text style={styles.detailCardTitle}>Estado del Pedido</Text>
            </View>
             
            <View style={{ padding: 12, backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border }}>
              <Text style={[styles.detailText, { fontSize: 16, fontWeight: '600' }]}>
                {statusBadge(order.estado).label}
              </Text>
            </View>
          </View>

          {/* Estado de Pago - Solo lectura */}
          <View style={styles.detailCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ionicons name="card" size={18} color={C.primary} />
              <Text style={styles.detailCardTitle}>Estado de Pago</Text>
            </View>
             
            <View style={{ padding: 12, backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, marginBottom: 12 }}>
              <Text style={[styles.detailText, { fontSize: 16, fontWeight: '600' }]}>
                {paymentBadge(order.estado_pago).label}
              </Text>
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={[styles.detailText, { marginBottom: 6 }]}>Método de Pago</Text>
              <View style={{ padding: 12, backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border }}>
                <Text style={styles.detailText}>{order.metodo_pago || 'No especificado'}</Text>
              </View>
            </View>
          </View>

          {/* Productos del Pedido */}
          <View style={styles.detailCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ionicons name="cube" size={18} color={C.primary} />
              <Text style={styles.detailCardTitle}>Productos ({productos.length})</Text>
            </View>
             
            {loadingProductos ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator color={C.primary} />
              </View>
            ) : productos.length === 0 ? (
              <Text style={[styles.detailText, { color: C.muted, textAlign: 'center', padding: 20 }]}>
                No hay productos en este pedido
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {productos.map((item: any, index: number) => (
                  <View 
                    key={index}
                    style={{
                      flexDirection: 'row',
                      padding: 10,
                      backgroundColor: C.bg,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: C.border,
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.detailText, { fontWeight: '700', marginBottom: 4 }]}>
                        {item.Producto?.nombre || 'Producto sin nombre'}
                      </Text>
                      {item.Producto?.sku && (
                        <Text style={[styles.detailText, { fontSize: 11, color: C.muted }]}>
                          SKU: {item.Producto.sku}
                        </Text>
                      )}
                      <Text style={[styles.detailText, { fontSize: 12, marginTop: 4 }]}>
                        Cantidad: {item.cantidad} × {formatCurrency(item.precio_unitario)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                      <Text style={[styles.detailText, { fontWeight: '800', color: C.success }]}>
                        {formatCurrency(item.cantidad * item.precio_unitario)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Información de Envío */}
          <View style={styles.detailCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ionicons name="car" size={18} color={C.primary} />
              <Text style={styles.detailCardTitle}>Información de Envío</Text>
            </View>
             
            {order.tipo_envio && (
              <Text style={[styles.detailText, { marginBottom: 8 }]}>
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
            {order.direccion_envio && (
              <Text style={[styles.detailText, { marginTop: 8 }]}>
                <Text style={{ fontWeight: '700' }}>Dirección: </Text>
                {order.direccion_envio}
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
  orderNumber: { color: C.text, fontWeight: '800', fontSize: 15, flex: 1 },
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
   
  label: {
    color: C.text,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
   
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