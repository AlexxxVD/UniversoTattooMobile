import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Tables } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';

type Producto = Tables<'Producto'>;
type Categoria = Tables<'Categoria'>;

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
  yellow: '#FBBF24',
};

const PAGE_SIZE = 30;

// MODIFICADO: Se eliminó 'descontinuados'
type FilterKey = 'todos' | 'destacados' | 'activos' | 'agotados';

// Meta calculada por producto a partir de variantes
type VariantMeta = {
  sumStockActive: number;
  types: Set<string>;
};

export default function ProductsScreen() {
  const router = useRouter();

  // Auth/role gating
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // UI/estado
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [items, setItems] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Filtros
  const [filter, setFilter] = useState<FilterKey>('todos');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [q, setQ] = useState('');

  // Filtro por tipo de producto (proveniente de variantes)
  const [typeFilter, setTypeFilter] = useState<'Todos' | string>('Todos');
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);

  // Meta de variantes por producto
  const [variantMetaMap, setVariantMetaMap] = useState<Map<number, VariantMeta>>(new Map());

  // Acciones
  const [togglingFeatured, setTogglingFeatured] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Modales
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: number; nombre: string } | null>(null);
  
  // Modal de creación de producto
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProduct, setNewProduct] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    categoria_id: '',
    imagen_url: '',
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Gating de admin
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

  // Cargar categorías
  const loadCategorias = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('Categoria')
        .select('*')
        .eq('es_activa', true)
        .order('nombre', { ascending: true });

      if (!error && data) {
        setCategorias(data);
      }
    } catch (e) {
      console.warn('[admin/products] categorias error:', e);
    }
  }, []);

  // Merge único por id + orden determinista
  const mergeByIdAndSort = useCallback((prev: Producto[], next: Producto[]) => {
    const map = new Map<number, Producto>();
    for (const p of prev) map.set((p as any).id_producto, p);
    for (const n of next) map.set((n as any).id_producto, n);
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      const fa = new Date((a as any).fecha_actualizacion ?? 0).getTime();
      const fb = new Date((b as any).fecha_actualizacion ?? 0).getTime();
      if (fb !== fa) return fb - fa;
      return Number((b as any).id_producto) - Number((a as any).id_producto);
    });
    return arr;
  }, []);

  // Construye meta de variantes para una página, y la fusiona al map global
  const buildAndMergeVariantMeta = useCallback(async (rows: Producto[], replace: boolean) => {
    if (!rows.length) {
      if (replace) setVariantMetaMap(new Map());
      return;
    }
    const productIds = rows.map((r: any) => r.id_producto);

    const { data: vars, error: varErr } = await supabase
      .from('ProductoVariante')
      .select('producto_id, stock, es_activa, tipo_producto')
      .in('producto_id', productIds);

    if (varErr) {
      console.warn('[admin/products] variantes error:', varErr.message);
      // no aborta; seguimos sin meta
      if (replace) setVariantMetaMap(new Map());
      return;
    }

    const pageMeta = new Map<number, VariantMeta>();
    (vars ?? []).forEach((v: any) => {
      const pid = Number(v.producto_id);
      if (!pageMeta.has(pid)) pageMeta.set(pid, { sumStockActive: 0, types: new Set() });
      const m = pageMeta.get(pid)!;
      if (v.es_activa) {
        m.sumStockActive += Number(v.stock ?? 0);
      }
      const t = (v.tipo_producto ?? '').toString().trim();
      if (t) m.types.add(t);
    });

    setVariantMetaMap((prev) => {
      const merged = replace ? new Map<number, VariantMeta>() : new Map(prev);
      // Sobrescribimos/actualizamos solo los pids de esta página
      for (const [pid, meta] of pageMeta.entries()) {
        const existing = merged.get(pid);
        if (!existing || replace) {
          merged.set(pid, meta);
        } else {
          // merge sets y sum
          merged.set(pid, {
            sumStockActive: meta.sumStockActive, // los datos de esta página prevalecen
            types: new Set([...existing.types, ...meta.types]),
          });
        }
      }
      return merged;
    });

    // Actualizar lista global de tipos disponibles (para chips)
    setAvailableTypes((prev) => {
      const set = new Set(prev);
      for (const meta of pageMeta.values()) {
        meta.types.forEach((t) => set.add(t));
      }
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    });
  }, []);

  const fetchPage = useCallback(
    async (nextPage: number, replace = false) => {
      const from = nextPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('Producto')
        .select('*')
        .order('fecha_actualizacion', { ascending: false })
        .order('id_producto', { ascending: false })
        .range(from, to);

      if (error) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudieron cargar los productos' });
        return;
      }

      const rows = data ?? [];
      setHasMore(rows.length === PAGE_SIZE);

      if (replace) {
        setItems((_) => mergeByIdAndSort([], rows));
      } else {
        setItems((prev) => mergeByIdAndSort(prev, rows));
      }

      // Meta de variantes para esta página
      await buildAndMergeVariantMeta(rows, replace);

      setPage(nextPage);
    },
    [mergeByIdAndSort, buildAndMergeVariantMeta]
  );

  const initialLoad = useCallback(async () => {
    setLoading(true);
    setHasMore(true);
    await Promise.all([loadCategorias(), fetchPage(0, true)]);
    setLoading(false);
  }, [loadCategorias, fetchPage]);

  useEffect(() => {
    if (isAdmin && !checkingAuth) {
      initialLoad();
    }
  }, [isAdmin, checkingAuth, initialLoad]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setHasMore(true);
    setTypeFilter('Todos'); // reset tipo al refrescar
    await fetchPage(0, true);
    setRefreshing(false);
  }, [fetchPage]);

  const onEndReached = useCallback(async () => {
    if (loading || refreshing || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await fetchPage(page + 1);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, refreshing, loadingMore, hasMore, page, fetchPage]);

  // Toggle destacado
  const handleToggleFeatured = useCallback(async (id: number, currentStatus: boolean) => {
    try {
      setTogglingFeatured(id);

      const { error } = await supabase
        .from('Producto')
        .update({
          es_destacado: !currentStatus,
          fecha_actualizacion: new Date().toISOString(),
        })
        .eq('id_producto', id);

      if (error) throw error;

      Toast.show({
        type: 'success',
        text1: '¡Éxito!',
        text2: `Producto ${!currentStatus ? 'marcado como destacado' : 'removido de destacados'}`,
      });

      // Recargar productos
      await onRefresh();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'No se pudo actualizar el producto',
      });
    } finally {
      setTogglingFeatured(null);
    }
  }, [onRefresh]);

  // Eliminar producto
  const handleDelete = useCallback((id: number, nombre: string) => {
    setProductToDelete({ id, nombre });
    setShowDeleteConfirm(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!productToDelete) return;

    try {
      setDeleting(productToDelete.id);

      // Intentar eliminar
      const { error } = await supabase
        .from('Producto')
        .delete()
        .eq('id_producto', productToDelete.id);

      if (error) {
        // Si falla por constraint (tiene pedidos), deshabilitar
        if (error.message.includes('foreign key') || error.code === '23503') {
          Alert.alert(
            'No se puede eliminar',
            'Este producto tiene pedidos asociados. ¿Deseas deshabilitarlo en su lugar?',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Deshabilitar',
                style: 'destructive',
                onPress: async () => {
                  const { error: disableError } = await supabase
                    .from('Producto')
                    .update({ es_activo: false, fecha_actualizacion: new Date().toISOString() })
                    .eq('id_producto', productToDelete.id);

                  if (disableError) {
                    Toast.show({
                      type: 'error',
                      text1: 'Error',
                      text2: 'No se pudo deshabilitar el producto',
                    });
                  } else {
                    Toast.show({
                      type: 'success',
                      text1: '¡Producto deshabilitado!',
                      text2: 'El producto ya no estará disponible',
                    });
                    await onRefresh();
                  }
                },
              },
            ]
          );
        } else {
          throw error;
        }
      } else {
        Toast.show({
          type: 'success',
          text1: '¡Éxito!',
          text2: 'Producto eliminado correctamente',
        });
        await onRefresh();
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'No se pudo eliminar el producto',
      });
    } finally {
      setDeleting(null);
      setShowDeleteConfirm(false);
      setProductToDelete(null);
    }
  }, [productToDelete, onRefresh]);

  // Seleccionar imagen
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permiso requerido', 'Necesitamos permiso para acceder a tu galería de fotos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // Crear producto
  const handleCreateProduct = async () => {
    // Validaciones
    if (!newProduct.nombre.trim()) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'El nombre es obligatorio' });
      return;
    }
    if (!newProduct.precio || parseFloat(newProduct.precio) <= 0) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'El precio debe ser mayor a 0' });
      return;
    }
    if (!newProduct.categoria_id) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Selecciona una categoría' });
      return;
    }
    if (!newProduct.stock || parseInt(newProduct.stock) < 0) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'El stock debe ser 0 o mayor' });
      return;
    }

    setCreating(true);
    try {
      let imagenUrl = newProduct.imagen_url;

      // Si hay imagen seleccionada, subirla a Supabase Storage
      if (selectedImage) {
        const fileName = `producto_${Date.now()}.jpg`;
        const response = await fetch(selectedImage);
        const blob = await response.blob();

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('productos')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
          });

        if (uploadError) {
          throw new Error('Error al subir la imagen: ' + uploadError.message);
        }

        // Obtener URL pública
        const { data: urlData } = supabase.storage
          .from('productos')
          .getPublicUrl(fileName);
        
        imagenUrl = urlData.publicUrl;
      }

      // Crear el producto
      const { data: producto, error: productoError } = await supabase
        .from('Producto')
        .insert({
          nombre: newProduct.nombre.trim(),
          descripcion: newProduct.descripcion.trim() || 'Sin descripción',
          precio_base: parseFloat(newProduct.precio),
          categoriaId: parseInt(newProduct.categoria_id),
          es_activo: true,
          es_destacado: false,
          fecha_actualizacion: new Date().toISOString(),
        })
        .select()
        .single();

      if (productoError) throw productoError;

      // Si hay imagen, crear registro en ProductoImagen
      if (imagenUrl) {
        await supabase.from('ProductoImagen').insert({
          producto_id: producto.id_producto,
          url_imagen: imagenUrl,
          es_principal: true,
          orden: 1,
        });
      }

      // Crear variante por defecto con el stock
      const { error: varianteError } = await supabase
        .from('ProductoVariante')
        .insert({
          producto_id: producto.id_producto,
          tipo: 'default',
          stock_actual: parseInt(newProduct.stock),
          stock_minimo: 5,
          es_activa: true,
        });

      if (varianteError) throw varianteError;

      Toast.show({
        type: 'success',
        text1: '¡Producto creado!',
        text2: `${newProduct.nombre} se agregó correctamente`,
      });

      // Resetear formulario
      setNewProduct({
        nombre: '',
        descripcion: '',
        precio: '',
        stock: '',
        categoria_id: '',
        imagen_url: '',
      });
      setSelectedImage(null);
      setShowCreateModal(false);

      // Recargar productos
      await onRefresh();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'No se pudo crear el producto',
      });
    } finally {
      setCreating(false);
    }
  };

  // Stock "real" por producto: suma de variantes activas (si las hay) o stock_total
  const getRealStock = useCallback(
    (p: Producto) => {
      const pid = Number((p as any).id_producto);
      const meta = variantMetaMap.get(pid);
      if (!meta) return Number((p as any).stock_total ?? 0);
      const sum = meta.sumStockActive ?? 0;
      // Si el padre tiene stock_total > 0 pero variantes suman más, mostramos el mayor (paridad con front)
      const padre = Number((p as any).stock_total ?? 0);
      return Math.max(padre, sum);
    },
    [variantMetaMap]
  );

  // Filtro por texto + tabs + tipo de producto + categoría
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    // Texto
    let base = term
      ? items.filter((p) => {
          const name = (p as any).nombre?.toString().toLowerCase() ?? '';
          const sku = (p as any).sku?.toString().toLowerCase() ?? '';
          return name.includes(term) || sku.includes(term);
        })
      : items;

    // Tabs (estado)
    base = base.filter((p) => {
      const destacado = (p as any).destacado ?? (p as any).es_destacado;
      const esActivo = (p as any).es_activo ?? (p as any).activo; // compat
      const estado = (p as any).estado?.toString().toUpperCase?.();
      const stockReal = getRealStock(p);

      switch (filter) {
        case 'destacados':
          return destacado === true;
        case 'activos':
          // activo por flag o con stock disponible
          return esActivo === true || estado === 'ACTIVO' || stockReal > 0;
        case 'agotados':
          return stockReal <= 0;
        case 'todos':
        default:
          return true;
      }
    });

    // Categoría
    if (selectedCategory !== 'all') {
      base = base.filter((p) => {
        const catId = (p as any).categoriaId ?? (p as any).categoria_id;
        return catId?.toString() === selectedCategory;
      });
    }

    // Tipo de producto (desde variantes)
    if (typeFilter !== 'Todos') {
      base = base.filter((p) => {
        const pid = Number((p as any).id_producto);
        const meta = variantMetaMap.get(pid);
        if (!meta) return false;
        return meta.types.has(typeFilter);
      });
    }

    return base;
  }, [items, q, filter, selectedCategory, typeFilter, variantMetaMap, getRealStock]);

  if (checkingAuth) {
    return (
      <RNSafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['right', 'bottom', 'left']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ color: C.muted, marginTop: 8 }}>Verificando permisos...</Text>
        </View>
      </RNSafeAreaView>
    );
  }

  if (!isAdmin) {
    return <RNSafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['right', 'bottom', 'left']} />;
  }

  return (
    <RNSafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['right', 'bottom', 'left']}>
      {loading ? (
        <View style={[styles.center, { padding: 16 }]}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ color: C.muted, marginTop: 8 }}>Cargando productos...</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={filtered}
            keyExtractor={(item) => `prod-${String((item as any).id_producto)}`}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 96 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
            ListHeaderComponent={
              <View style={{ gap: 12 }}>
                <Text style={styles.title}>Productos</Text>

                {/* Contador */}
                <View style={styles.statsCard}>
                  <Text style={styles.statsLabel}>Total de productos</Text>
                  <Text style={styles.statsValue}>{filtered.length}</Text>
                </View>

                {/* Buscador */}
                <View style={styles.searchRow}>
                  <Ionicons name="search-outline" size={18} color={C.muted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nombre o SKU"
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

                {/* Filtro de categoría */}
                <Pressable
                  onPress={() => setShowCategoryModal(true)}
                  style={styles.categorySelector}
                >
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="funnel-outline" size={16} color={C.muted} />
                    <Text style={styles.categorySelectorText}>
                      {selectedCategory === 'all'
                        ? 'Todas las categorías'
                        : categorias.find((c) => c.id_categoria?.toString() === selectedCategory)?.nombre ?? 'Categoría'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={C.muted} />
                </Pressable>

                {/* Tabs de estado */}
                <TabsBar value={filter} onChange={setFilter} />

                {/* Filtro por Tipo de Producto (desde variantes activas) */}
                <TypesBar
                  types={availableTypes}
                  value={typeFilter}
                  onChange={setTypeFilter}
                />
              </View>
            }
            renderItem={({ item }) => (
              <ProductCard
                item={item}
                stockReal={getRealStock(item)}
                onToggleFeatured={handleToggleFeatured}
                onDelete={handleDelete}
                togglingFeatured={togglingFeatured}
                deleting={deleting}
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
        </>
      )}

      {/* Modal de creación de producto */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => !creating && setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable
            style={{ flex: 1, justifyContent: 'flex-end' }}
            onPress={() => !creating && setShowCreateModal(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Crear Producto</Text>
                <Pressable
                  onPress={() => !creating && setShowCreateModal(false)}
                  hitSlop={8}
                  disabled={creating}
                >
                  <Ionicons name="close" size={20} color={C.text} />
                </Pressable>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false} 
                style={{ maxHeight: 500 }}
                contentContainerStyle={{ paddingBottom: 5 }}
              >
                <View style={{ gap: 8 }}>
                  {/* Imagen + Nombre en fila */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {/* Imagen - super compacta */}
                    <Pressable
                      onPress={pickImage}
                      style={[styles.imagePicker, { width: 75, height: 75 }]}
                      disabled={creating}
                    >
                      {selectedImage ? (
                        <Image
                          source={{ uri: selectedImage }}
                          style={styles.imagePreview}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.imagePickerPlaceholder}>
                          <Ionicons name="image-outline" size={20} color={C.muted} />
                        </View>
                      )}
                    </Pressable>

                    {/* Nombre */}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>
                        Nombre <Text style={{ color: C.danger }}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={newProduct.nombre}
                        onChangeText={(text) => setNewProduct({ ...newProduct, nombre: text })}
                        placeholder="Nombre del producto"
                        placeholderTextColor={C.muted}
                        editable={!creating}
                      />
                    </View>
                  </View>

                  {/* Descripción - más compacta */}
                  <View>
                    <Text style={styles.label}>Descripción</Text>
                    <TextInput
                      style={[styles.input, { minHeight: 45, textAlignVertical: 'top' }]}
                      value={newProduct.descripcion}
                      onChangeText={(text) => setNewProduct({ ...newProduct, descripcion: text })}
                      placeholder="Descripción..."
                      placeholderTextColor={C.muted}
                      multiline
                      numberOfLines={2}
                      editable={!creating}
                    />
                  </View>

                  {/* Precio y Stock */}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>
                        Precio <Text style={{ color: C.danger }}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={newProduct.precio}
                        onChangeText={(text) => setNewProduct({ ...newProduct, precio: text })}
                        placeholder="0.00"
                        placeholderTextColor={C.muted}
                        keyboardType="decimal-pad"
                        editable={!creating}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>
                        Stock <Text style={{ color: C.danger }}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={newProduct.stock}
                        onChangeText={(text) => setNewProduct({ ...newProduct, stock: text })}
                        placeholder="0"
                        placeholderTextColor={C.muted}
                        keyboardType="number-pad"
                        editable={!creating}
                      />
                    </View>
                  </View>

                  {/* Categoría */}
                  <View>
                    <Text style={styles.label}>
                      Categoría <Text style={{ color: C.danger }}>*</Text>
                    </Text>
                    <View style={styles.categorySelectContainer}>
                      {categorias.map((cat) => (
                        <Pressable
                          key={cat.id_categoria}
                          onPress={() =>
                            setNewProduct({
                              ...newProduct,
                              categoria_id: cat.id_categoria?.toString() ?? '',
                            })
                          }
                          style={[
                            styles.categoryChip,
                            newProduct.categoria_id === cat.id_categoria?.toString() &&
                              styles.categoryChipActive,
                          ]}
                          disabled={creating}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              newProduct.categoria_id === cat.id_categoria?.toString() &&
                                styles.categoryChipTextActive,
                            ]}
                          >
                            {cat.nombre}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Botones */}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                    <Pressable
                      style={[styles.deleteButton, { backgroundColor: C.border, flex: 1, minHeight: 38, paddingVertical: 8 }]}
                      onPress={() => {
                        setNewProduct({
                          nombre: '',
                          descripcion: '',
                          precio: '',
                          stock: '',
                          categoria_id: '',
                          imagen_url: '',
                        });
                        setSelectedImage(null);
                        setShowCreateModal(false);
                      }}
                      disabled={creating}
                    >
                      <Text style={[styles.deleteButtonText, { color: C.text, fontSize: 13 }]}>Cancelar</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.deleteButton, { backgroundColor: C.primary, flex: 1, minHeight: 38, paddingVertical: 8 }]}
                      onPress={handleCreateProduct}
                      disabled={creating}
                    >
                      {creating ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={14} color="#fff" />
                          <Text style={[styles.deleteButtonText, { fontSize: 13 }]}>Crear</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de categorías */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowCategoryModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrar por categoría</Text>
              <Pressable onPress={() => setShowCategoryModal(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={C.text} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <Pressable
                style={[
                  styles.categoryOption,
                  selectedCategory === 'all' && styles.categoryOptionActive,
                ]}
                onPress={() => {
                  setSelectedCategory('all');
                  setShowCategoryModal(false);
                }}
              >
                <Text
                  style={[
                    styles.categoryOptionText,
                    selectedCategory === 'all' && styles.categoryOptionTextActive,
                  ]}
                >
                  Todas las categorías
                </Text>
                {selectedCategory === 'all' && <Ionicons name="checkmark" size={20} color={C.primary} />}
              </Pressable>

              {categorias.map((cat) => (
                <Pressable
                  key={cat.id_categoria}
                  style={[
                    styles.categoryOption,
                    selectedCategory === cat.id_categoria?.toString() && styles.categoryOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat.id_categoria?.toString() ?? 'all');
                    setShowCategoryModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      selectedCategory === cat.id_categoria?.toString() && styles.categoryOptionTextActive,
                    ]}
                  >
                    {cat.nombre}
                  </Text>
                  {selectedCategory === cat.id_categoria?.toString() && (
                    <Ionicons name="checkmark" size={20} color={C.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 350 }]}>
            <View style={{ alignItems: 'center', gap: 16 }}>
              <View style={styles.deleteIcon}>
                <Ionicons name="warning" size={32} color={C.danger} />
              </View>

              <Text style={styles.deleteTitle}>¿Eliminar Producto?</Text>

              <Text style={styles.deleteMessage}>
                Estás a punto de eliminar{' '}
                <Text style={{ fontWeight: '700', color: C.text }}>"{productToDelete?.nombre}"</Text>. Esta
                acción no se puede deshacer.
              </Text>

              <View style={{ flexDirection: 'row', gap: 12, width: '100%', marginTop: 8 }}>
                <Pressable
                  style={[styles.deleteButton, { backgroundColor: C.border, flex: 1 }]}
                  onPress={() => {
                    setShowDeleteConfirm(false);
                    setProductToDelete(null);
                  }}
                  disabled={deleting !== null}
                >
                  <Text style={[styles.deleteButtonText, { color: C.text }]}>Cancelar</Text>
                </Pressable>

                <Pressable
                  style={[styles.deleteButton, { backgroundColor: C.danger, flex: 1 }]}
                  onPress={confirmDelete}
                  disabled={deleting !== null}
                >
                  {deleting !== null ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="trash" size={16} color="#fff" />
                      <Text style={styles.deleteButtonText}>Eliminar</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </RNSafeAreaView>
  );
}

function TabsBar({
  value,
  onChange,
}: {
  value: FilterKey;
  onChange: (v: FilterKey) => void;
}) {
  // MODIFICADO: Se eliminó 'Desc.'
  const tabs: { key: FilterKey; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'destacados', label: 'Destacados' },
    { key: 'activos', label: 'Activos' },
    { key: 'agotados', label: 'Agotados' },
  ];

  return (
    <View style={styles.tabsBar}>
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={({ pressed }) => [
              styles.tabBtn,
              active && styles.tabActive,
              pressed && { opacity: 0.95 },
            ]}
          >
            {/* MODIFICADO: fontSize: 11 para asegurar que entre bien */}
            <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Chips para filtrar por tipo de producto (variante.tipo_producto)
function TypesBar({
  types,
  value,
  onChange,
}: {
  types: string[];
  value: 'Todos' | string;
  onChange: (v: 'Todos' | string) => void;
}) {
  const all = ['Todos', ...types];
  return (
    <View style={styles.typesBar}>
      {all.map((t) => {
        const active = value === t;
        return (
          <Pressable
            key={`type-${t}`}
            onPress={() => onChange(t)}
            style={[
              styles.typeChip,
              active && { backgroundColor: C.primarySoft, borderColor: 'rgba(124,58,237,0.6)' },
            ]}
          >
            <Text style={{ color: active ? C.text : C.muted, fontWeight: active ? '800' : '600' }}>
              {t}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ProductCard({
  item,
  stockReal,
  onToggleFeatured,
  onDelete,
  togglingFeatured,
  deleting,
}: {
  item: Producto;
  stockReal: number;
  onToggleFeatured: (id: number, current: boolean) => void;
  onDelete: (id: number, nombre: string) => void;
  togglingFeatured: number | null;
  deleting: number | null;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const id = (item as any).id_producto;
  const nombre = (item as any).nombre ?? 'Producto';
  const sku = (item as any).sku;
  const isFeatured = (item as any).destacado === true || (item as any).es_destacado === true;
  const estado = (item as any).estado?.toString().toUpperCase?.();
  const esActivo = (item as any).es_activo ?? (item as any).activo;
  const isDiscontinued = esActivo === false || estado === 'DESCONTINUADO';

  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={styles.name}>{nombre}</Text>
              {isFeatured && <Badge color={C.success} label="Destacado" />}
              {isDiscontinued && <Badge color={C.warning} label="Desc." />}
              {stockReal <= 0 && <Badge color={C.danger} label="Sin stock" />}
            </View>

            {!!sku && <Text style={styles.sku}>SKU: {sku}</Text>}

            <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
              <Text style={styles.meta}>Stock: {stockReal}</Text>
              <Text style={styles.meta}>Precio: $ {Number((item as any).precio_base ?? 0).toLocaleString('es-AR')}</Text>
            </View>

            {!!(item as any).fecha_actualizacion && (
              <Text style={styles.metaDim}>
                Actualizado: {new Date((item as any).fecha_actualizacion).toLocaleDateString('es-AR')}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: `${color}22` }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  title: { color: C.text, fontSize: 22, fontWeight: '800' },

  // Stats card
  statsCard: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsLabel: { color: C.muted, fontSize: 12 },
  statsValue: { color: C.text, fontSize: 24, fontWeight: '800' },

  // Category selector
  categorySelector: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#11151B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  categorySelectorText: { flex: 1, color: C.text, fontWeight: '600' },

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
  tabText: { color: C.muted, fontWeight: '600', fontSize: 11 }, // MODIFICADO: fontSize 11
  tabTextActive: { color: C.text, fontWeight: '800' },

  // Types
  typesBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#11151B',
  },

  // Card
  card: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  name: { color: C.text, fontWeight: '800', fontSize: 16 },
  sku: { color: C.muted },
  meta: { color: C.text, fontWeight: '600' },
  metaDim: { color: C.muted, marginTop: 4 },

  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },

  // Menu overlay
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    minWidth: 220,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  menuItemText: { color: C.text, fontWeight: '600', fontSize: 15 },

  // Modales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    width: '100%',
    maxWidth: 500,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: '700',
  },

  // Category modal
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  categoryOptionActive: {
    backgroundColor: 'rgba(255,179,0,0.08)',
  },
  categoryOptionText: {
    color: C.text,
    fontSize: 15,
    fontWeight: '500',
  },
  categoryOptionTextActive: {
    color: C.primary,
    fontWeight: '700',
  },

  // Delete modal
  deleteIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteTitle: {
    color: C.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  deleteMessage: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  deleteButton: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Modal de creación
  label: {
    color: C.text,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 3,
  },
  input: {
    backgroundColor: '#11151B',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 8,
    color: C.text,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  imagePicker: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: '#11151B',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePickerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerText: {
    color: C.muted,
    fontSize: 10,
    fontWeight: '500',
  },
  categorySelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  categoryChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#11151B',
  },
  categoryChipActive: {
    backgroundColor: C.primarySoft,
    borderColor: C.primary,
  },
  categoryChipText: {
    color: C.text,
    fontSize: 11,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: C.primary,
    fontWeight: '700',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
});