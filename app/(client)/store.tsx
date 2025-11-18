import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Card } from '@/components/ui/Card';
import { useCartStore } from '../../lib/cart-store';
import { Tables } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';

type CategoriaRow = Tables<'Categoria'>;

type Product = {
  id_producto: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number; // stock visible (padre vs variantes activas)
  img: string | null;
  sku?: string | null;
  peso?: number | null;
  variantes?: Array<{ stock: number | null; es_activa: boolean | null }>;
  categoria: { id_categoria: number | null; nombre: string };
};

const C = {
  bg: '#0E1116',
  card: '#151823',
  border: '#272C36',
  text: '#F3F4F6',
  muted: '#9AA4AF',
  primary: '#7C3AED',
  primarySoft: 'rgba(124,58,237,0.14)',
  green: '#22C55E',
  amber: '#F59E0B',
  red: '#EF4444',
};

const CARD_HEIGHT = 300;     // altura consistente del “rectangulito”
const IMAGE_HEIGHT = 170;    // alto fijo de la caja de imagen (no se corta)

export default function ShopScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ categoria?: string | string[] }>();

  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [items, setItems] = useState<Product[]>([]);
  const [categorias, setCategorias] = useState<CategoriaRow[]>([]);
  const [favSet, setFavSet] = useState<Set<number>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  // Filtros/orden/búsqueda
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'Todos' | string>('Todos');
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [sort, setSort] = useState<'price-asc' | 'price-desc' | 'name-asc'>('price-asc');
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Lee y normaliza ?categoria=... del querystring
  const desiredCategoryFromUrl = useMemo(() => {
    const raw = params?.categoria;
    const val = Array.isArray(raw) ? raw[0] : raw;
    if (!val) return null;
    try {
      return decodeURIComponent(val);
    } catch {
      return val;
    }
  }, [params?.categoria]);

  // Aplica el filtro inicial (y si la URL cambia mientras estás en la pantalla)
  useEffect(() => {
    if (desiredCategoryFromUrl && desiredCategoryFromUrl !== categoryFilter) {
      setCategoryFilter(desiredCategoryFromUrl);
      setCurrentPage(1); // Reset página al cambiar categoría
    }
    // Si viene "Todos" en la URL (poco probable), lo soportamos también
    if (desiredCategoryFromUrl === 'Todos' && categoryFilter !== 'Todos') {
      setCategoryFilter('Todos');
      setCurrentPage(1); // Reset página
    }
  }, [desiredCategoryFromUrl]);

  // Cargar sesión + favoritos del usuario
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: favs, error } = await supabase
          .from('Favoritos')
          .select('producto_id')
          .eq('user_id', uid);
        if (!error) setFavSet(new Set((favs ?? []).map((f) => f.producto_id)));
      }
    })();
  }, []);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const { data, error } = await supabase
        .from('Categoria')
        .select('id_categoria,nombre,es_activa,orden')
        .eq('es_activa', true)
        .order('orden', { ascending: true });
      if (error) throw error;
      setCategorias((data ?? []) as any);
    } catch (e: any) {
      console.warn('[shop] categories error:', e?.message ?? e);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Traer variantes activas para computar stock visible
      const { data, error } = await supabase
        .from('Producto')
        .select(`
          id_producto,
          nombre,
          descripcion,
          precio_base,
          stock_total,
          sku,
          peso,
          categoriaId,
          ProductoImagen(url_imagen,es_principal),
          Categoria(id_categoria,nombre),
          ProductoVariante(stock,es_activa)
        `)
        .eq('es_activo', true)
        .order('fecha_actualizacion', { ascending: false })
        .limit(200);

      if (error) throw error;

      const mapped: Product[] = (data ?? []).map((r: any) => {
        const imgs: any[] = Array.isArray(r.ProductoImagen) ? r.ProductoImagen : [];
        const principal = imgs.find((im) => im?.es_principal) ?? imgs[0];

        const variantes: Array<{ stock: number | null; es_activa: boolean | null }> = Array.isArray(r.ProductoVariante)
          ? r.ProductoVariante
          : [];
        const activeVarStock = variantes
          .filter((v) => v?.es_activa)
          .reduce((acc, v) => acc + Number(v?.stock ?? 0), 0);

        const stockPadre = Number(r.stock_total ?? 0);
        const stockVisible = Math.max(stockPadre, activeVarStock);

        return {
          id_producto: r.id_producto,
          nombre: r.nombre,
          descripcion: r.descripcion,
          precio: Number(r.precio_base ?? 0),
          stock: stockVisible,
          img: principal?.url_imagen ?? null,
          sku: r.sku ?? null,
          peso: r.peso ?? null,
          variantes,
          categoria: {
            id_categoria: r.Categoria?.id_categoria ?? r.categoriaId ?? null,
            nombre: r.Categoria?.nombre ?? 'Sin categoría',
          },
        };
      });

      setItems(mapped);

      if (mapped.length) {
        const prices = mapped.map((p) => p.precio);
        setMinPrice(Math.min(...prices));
        setMaxPrice(Math.max(...prices));
      } else {
        setMinPrice('');
        setMaxPrice('');
      }
    } catch (e: any) {
      console.error('[shop] products error:', e?.message ?? e);
      Toast.show({ type: 'error', text1: 'No se pudieron cargar productos' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, [loadCategories, loadProducts]);

  const filtered = useMemo(() => {
    let arr = [...items];

    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          (p.descripcion || '').toLowerCase().includes(q) ||
          (p.categoria?.nombre || '').toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'Todos') {
      console.log('[store] Filtrando por categoría:', categoryFilter);
      console.log('[store] Categorías disponibles:', [...new Set(items.map(p => p.categoria?.nombre))]);
      arr = arr.filter((p) => {
        const match = p.categoria?.nombre === categoryFilter;
        if (!match && p.categoria?.nombre) {
          console.log('[store] No coincide:', p.categoria.nombre, '!==', categoryFilter);
        }
        return match;
      });
      console.log('[store] Productos después del filtro:', arr.length);
    }

    const min = typeof minPrice === 'number' ? minPrice : -Infinity;
    const max = typeof maxPrice === 'number' ? maxPrice : Infinity;
    arr = arr.filter((p) => p.precio >= min && p.precio <= max);

    if (sort === 'price-asc') arr.sort((a, b) => a.precio - b.precio);
    else if (sort === 'price-desc') arr.sort((a, b) => b.precio - a.precio);
    else if (sort === 'name-asc') arr.sort((a, b) => a.nombre.localeCompare(b.nombre));

    return arr;
  }, [items, search, categoryFilter, minPrice, maxPrice, sort]);

  // Productos paginados
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filtered.slice(startIndex, endIndex);
  }, [filtered, currentPage, ITEMS_PER_PAGE]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  // Reset página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, minPrice, maxPrice, sort]);

  const requireAuth = useCallback(async () => {
    // Refresca sesión por si caducó
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id ?? null;
    if (!uid) {
      Toast.show({ type: 'info', text1: 'Iniciá sesión para usar favoritos' });
      return null;
    }
    setUserId(uid);
    return uid;
  }, []);

  const toggleFavorite = useCallback(
    async (productId: number) => {
      const uid = userId ?? (await requireAuth());
      if (!uid) return;

      const isFav = favSet.has(productId);

      // Optimista
      setFavSet((prev) => {
        const n = new Set(prev);
        if (isFav) n.delete(productId);
        else n.add(productId);
        return n;
      });

      try {
        if (isFav) {
          const { error } = await supabase
            .from('Favoritos')
            .delete()
            .eq('user_id', uid)
            .eq('producto_id', productId);
          if (error) throw error;
          Toast.show({
            type: 'info',
            text1: 'Eliminado de favoritos',
          });
        } else {
          const { error } = await supabase
            .from('Favoritos')
            .insert({ user_id: uid, producto_id: productId });
          if (error) throw error;
          Toast.show({
            type: 'success',
            text1: 'Agregado a favoritos ❤️',
          });
        }
      } catch (e: any) {
        // revertir
        setFavSet((prev) => {
          const n = new Set(prev);
          if (isFav) n.add(productId);
          else n.delete(productId);
          return n;
        });
        console.error('[favorites] error:', e);
        Toast.show({
          type: 'error',
          text1: 'Error al actualizar favoritos',
          text2: e?.message ?? 'Revisá las políticas RLS de Favoritos',
        });
      }
    },
    [userId, favSet, requireAuth]
  );

  const openProduct = useCallback(
    (id: number) => {
      router.push(`/(client)/product/${id}` as any);
    },
    [router]
  );

  const addToCart = (p: Product) => {
    if (p.stock <= 0) {
      Toast.show({ type: 'info', text1: 'Sin stock' });
      return;
    }
    useCartStore.getState().addItem({
      id: String(p.id_producto),
      nombre: p.nombre,
      precio: p.precio,
      imagen: p.img,
      stock: p.stock,
      categoria: p.categoria?.nombre,
      sku: p.sku ?? null,
      peso: p.peso ?? null,
      cantidad: 1,
      quantity: 1,
    } as any);
    Toast.show({ type: 'success', text1: 'Agregado al carrito' });
  };

  // Al tocar un chip, setea filtro y sincroniza URL (?categoria=...)
  const handleCategoryPress = useCallback(
    (name: 'Todos' | string) => {
      setCategoryFilter(name);
      setCurrentPage(1); // Reset página al cambiar categoría
      // Actualizamos solo los parámetros de la URL sin reemplazar la pantalla completa
      try {
        if (name === 'Todos') {
          router.setParams({ categoria: undefined } as any);
        } else {
          router.setParams({ categoria: name } as any);
        }
      } catch {
        // silent
      }
    },
    [router]
  );

  const header = (
    <View style={{ gap: 12 }}>
      {/* Título + acceso a Favoritos en perfil */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: '#C4B5FD', fontWeight: '900', fontSize: 22 }}>Tienda</Text>
          <Text style={{ color: C.muted, marginTop: 2 }}>Descubrí nuestra selección</Text>
        </View>
        <Pressable
          onPress={() => router.push({ pathname: '/(client)/profile', params: { tab: 'favorites' } } as any)}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.85 }]}
          hitSlop={8}
        >
          <Ionicons name="heart" size={18} color="#F472B6" />
        </Pressable>
      </View>

      {/* Stats rápidos */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
        <Stat label="Productos" value={String(items.length)} />
        <Stat label="Mostrados" value={String(filtered.length)} />
        <Stat label="Categorías" value={String(categorias.length)} />
      </View>

      {/* Paginación */}
      {filtered.length > ITEMS_PER_PAGE && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Pressable
            onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={({ pressed }) => [
              styles.pageBtn,
              currentPage === 1 && styles.pageBtnDisabled,
              pressed && { opacity: 0.7 }
            ]}
          >
            <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? C.muted : C.text} />
          </Pressable>
          
          <Text style={{ color: C.text, fontWeight: '700' }}>
            Página {currentPage} de {totalPages}
          </Text>
          
          <Pressable
            onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={({ pressed }) => [
              styles.pageBtn,
              currentPage === totalPages && styles.pageBtnDisabled,
              pressed && { opacity: 0.7 }
            ]}
          >
            <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages ? C.muted : C.text} />
          </Pressable>
        </View>
      )}

      {/* Filtros básicos */}
      <View style={{ gap: 8 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar productos…"
          placeholderTextColor={C.muted}
          style={styles.input}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={minPrice === '' ? '' : String(minPrice)}
            onChangeText={(t) => setMinPrice(t === '' ? '' : Number(t))}
            placeholder="Min $"
            placeholderTextColor={C.muted}
            keyboardType="numeric"
            style={[styles.input, { flex: 1 }]}
          />
          <TextInput
            value={maxPrice === '' ? '' : String(maxPrice)}
            onChangeText={(t) => setMaxPrice(t === '' ? '' : Number(t))}
            placeholder="Max $"
            placeholderTextColor={C.muted}
            keyboardType="numeric"
            style={[styles.input, { flex: 1 }]}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SegBtn label="Precio ↑" active={sort === 'price-asc'} onPress={() => setSort('price-asc')} />
          <SegBtn label="Precio ↓" active={sort === 'price-desc'} onPress={() => setSort('price-desc')} />
          <SegBtn label="Nombre A-Z" active={sort === 'name-asc'} onPress={() => setSort('name-asc')} />
        </View>

        {/* Chips de categorías (scrollable) */}
        <View style={{ height: 40 }}>
          <FlatList
            data={[{ id_categoria: -1, nombre: 'Todos' } as any, ...categorias]}
            keyExtractor={(c) => String(c.id_categoria)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => (
              <Chip
                label={item.nombre}
                active={categoryFilter === item.nombre || (item.id_categoria === -1 && categoryFilter === 'Todos')}
                onPress={() => handleCategoryPress(item.id_categoria === -1 ? 'Todos' : item.nombre)}
              />
            )}
          />
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Product }) => {
    const isLow = item.stock > 0 && item.stock <= 5;
    const out = item.stock === 0;
    const isFav = favSet.has(item.id_producto);

    return (
      <Card>
        {/* RECTÁNGULO ANCHO COMPLETO */}
        <Pressable onPress={() => openProduct(item.id_producto)} style={[styles.cardRect, { height: CARD_HEIGHT }]}>
          {/* Imagen: no se corta (contain) */}
          <View style={styles.imageBox}>
            {out ? <View style={styles.imageOverlay} /> : null}
            {item.img ? (
              <Image source={{ uri: item.img }} style={styles.image} resizeMode="contain" />
            ) : (
              <View style={[styles.image, { alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="cube-outline" size={28} color={C.muted} />
              </View>
            )}

            {/* Badges */}
            {out ? (
              <View style={[styles.badge, { backgroundColor: 'rgba(239,68,68,0.95)' }]}>
                <Text style={[styles.badgeText, { color: '#fff' }]}>Sin stock</Text>
              </View>
            ) : isLow ? (
              <View style={[styles.badge, { backgroundColor: 'rgba(245,158,11,0.95)' }]}>
                <Text style={styles.badgeText}>¡Últimas unidades!</Text>
              </View>
            ) : null}

            {/* Acciones sobre imagen */}
            <View style={styles.overlayActions}>
              <Pressable onPress={() => openProduct(item.id_producto)} style={styles.overlayBtn} hitSlop={8}>
                <Ionicons name="eye-outline" size={16} color="#fff" />
              </Pressable>
              <Pressable onPress={() => toggleFavorite(item.id_producto)} style={styles.overlayBtn} hitSlop={8}>
                <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={16} color={isFav ? '#F472B6' : '#fff'} />
              </Pressable>
            </View>
          </View>

          {/* Contenido uniforme */}
          <View style={styles.content}>
            <View style={styles.rowBetween}>
              <Text numberOfLines={1} style={styles.catPill}>
                {item.categoria?.nombre}
              </Text>
              <Text style={[styles.stockText, out ? styles.stockRed : isLow ? styles.stockAmber : styles.stockGreen]}>
                {out ? 'Agotado' : `Stock: ${item.stock}`}
              </Text>
            </View>

            <Text style={styles.title} numberOfLines={2}>
              {item.nombre}
            </Text>

            <View style={styles.footerRow}>
              <Text style={styles.price}>{toCurrency(item.precio)}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => openProduct(item.id_producto)}
                  style={[styles.ctaIcon, { backgroundColor: C.primary }]}
                  hitSlop={6}
                >
                  <Ionicons name="eye-outline" size={16} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={() => addToCart(item)}
                  style={[styles.ctaIcon, { backgroundColor: out ? 'rgba(255,255,255,0.08)' : '#10B981' }]}
                  disabled={out}
                  hitSlop={6}
                >
                  <Ionicons name="cart-outline" size={16} color="#fff" />
                </Pressable>
              </View>
            </View>
          </View>
        </Pressable>
      </Card>
    );
  };

  if (loading) {
    return (
      <RNSafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'right', 'bottom', 'left']}>
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={{ color: C.muted, marginTop: 8 }}>Cargando productos…</Text>
        </View>
      </RNSafeAreaView>
    );
  }

  return (
    <RNSafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'right', 'bottom', 'left']}>
      <FlatList
        data={paginatedProducts}
        keyExtractor={(p) => String(p.id_producto)}
        renderItem={renderItem}
        // UNA SOLA COLUMNA → rectángulos anchos apilados (como tu dibujo)
        numColumns={1}
        contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 28 }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 32, gap: 6 }}>
            <Ionicons name="cube-outline" size={36} color={C.muted} />
            <Text style={{ color: C.muted }}>No hay productos para mostrar.</Text>
          </View>
        }
        ListFooterComponent={
          filtered.length > ITEMS_PER_PAGE ? (
            <View style={{ paddingVertical: 20, alignItems: 'center', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable
                  onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={({ pressed }) => [
                    styles.pageBtn,
                    currentPage === 1 && styles.pageBtnDisabled,
                    pressed && { opacity: 0.7 }
                  ]}
                >
                  <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? C.muted : C.text} />
                </Pressable>
                
                <Text style={{ color: C.text, fontWeight: '700' }}>
                  Página {currentPage} de {totalPages}
                </Text>
                
                <Pressable
                  onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={({ pressed }) => [
                    styles.pageBtn,
                    currentPage === totalPages && styles.pageBtnDisabled,
                    pressed && { opacity: 0.7 }
                  ]}
                >
                  <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages ? C.muted : C.text} />
                </Pressable>
              </View>
              <Text style={{ color: C.muted, fontSize: 12 }}>
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} de {filtered.length}
              </Text>
            </View>
          ) : null
        }
      />
    </RNSafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ backgroundColor: '#11151B', borderColor: C.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
      <Text style={{ color: '#A78BFA', fontWeight: '800', textAlign: 'center' }}>{value}</Text>
      <Text style={{ color: C.muted, fontSize: 12, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? 'rgba(124,58,237,0.6)' : C.border,
        backgroundColor: active ? C.primarySoft : '#11151B',
      }}
    >
      <Text style={{ color: active ? C.text : C.muted, fontWeight: active ? '800' : '600' }}>{label}</Text>
    </Pressable>
  );
}

function SegBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 10,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: C.border,
          backgroundColor: '#11151B',
        },
        active && { backgroundColor: C.primarySoft, borderColor: 'rgba(124,58,237,0.5)' },
      ]}
    >
      <Text style={{ color: active ? C.text : C.muted, fontWeight: active ? '800' : '600' }}>{label}</Text>
    </Pressable>
  );
}

function toCurrency(n: number) {
  try {
    return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
  } catch {
    return `$ ${Math.round(n).toLocaleString('es-AR')}`;
  }
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  input: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#11151B',
    paddingHorizontal: 12,
    color: C.text,
  },

  // Botón Heart en header
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#11151B',
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Card rectangular ancho completo
  cardRect: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },

  // Caja de imagen uniforme (no se corta)
  imageBox: {
    height: IMAGE_HEIGHT,
    backgroundColor: '#0B0F14',
    borderBottomWidth: 1,
    borderColor: C.border,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },

  // Badges e iconos sobre la imagen
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#1F2937' },

  overlayActions: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 6 },
  overlayBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Contenido con layout consistente
  content: { padding: 12, justifyContent: 'space-between', flex: 1, gap: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  catPill: {
    color: '#A78BFA',
    backgroundColor: C.primarySoft,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: '800',
    maxWidth: '65%',
  },

  stockText: { fontSize: 12, fontWeight: '800' },
  stockGreen: { color: '#34D399' },
  stockAmber: { color: '#F59E0B' },
  stockRed: { color: '#FCA5A5' },

  title: { color: C.text, fontWeight: '800', fontSize: 15 },

  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { color: '#C4B5FD', fontWeight: '900', fontSize: 18 },

  ctaIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Paginación
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#11151B',
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
});