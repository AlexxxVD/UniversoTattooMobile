import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Toast from 'react-native-toast-message';

import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { useCartStore } from '../../../lib/cart-store';
import { Tables } from '../../../lib/database.types';
import { supabase } from '../../../lib/supabase';

type Producto = Tables<'Producto'>;
type ProductoImagen = Tables<'ProductoImagen'>;
type ProductoVariante = Tables<'ProductoVariante'>;
type Categoria = Tables<'Categoria'>;

type VariantVM = Pick<
  ProductoVariante,
  | 'id_variante'
  | 'precio_adicional'
  | 'stock'
  | 'sku_variante'
  | 'color'
  | 'volumen'
  | 'grosor'
  | 'marca_cartucho'
  | 'compatibilidad'
  | 'material_variante'
  | 'tono_color'
  | 'tamaño'
  | 'tipo_producto'
  | 'configuracion_aguja'
  | 'numero_agujas'
>;

type ProductVM = {
  id_producto: number;
  nombre: string;
  descripcion: string;
  precio_base: number;
  stock_total: number;
  sku: string | null;
  peso: number | null;
  marca: string | null;
  material: string | null;
  categoria: { id_categoria: number | null; nombre: string };
  imagenes: Array<{
    id_imagen: number;
    url_imagen: string;
    es_principal: boolean;
    orden: number;
  }>;
};

const C = {
  bg: '#0E1116',
  card: '#141821',
  border: '#2A2F3A',
  text: '#F3F4F6',
  muted: '#A0A8B0',
  primary: '#7C3AED',
  primarySoft: 'rgba(124,58,237,0.14)',
  green: '#22C55E',
  amber: '#F59E0B',
  orange: '#FB923C',
  red: '#EF4444',
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ProductVM | null>(null);
  const [variants, setVariants] = useState<VariantVM[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [userId, setUserId] = useState<string | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const pid = useMemo(() => Number(id), [id]);

  const currentVariant = useMemo(
    () => (selectedVariantId != null ? variants.find((v) => v.id_variante === selectedVariantId) ?? null : null),
    [selectedVariantId, variants]
  );

  const currentPrice = useMemo(() => {
    // Igual que en web: si hay variante seleccionada y tiene precio_adicional > 0, reemplaza el base
    if (currentVariant && Number(currentVariant.precio_adicional) > 0) return Number(currentVariant.precio_adicional);
    return Number(product?.precio_base ?? 0);
  }, [product?.precio_base, currentVariant]);

  const currentStock = useMemo(() => {
    if (currentVariant) return Number(currentVariant.stock ?? 0);
    return Number(product?.stock_total ?? 0);
  }, [product?.stock_total, currentVariant]);

  // Mantener quantity dentro del stock actual
  useEffect(() => {
    if (quantity > currentStock) setQuantity(Math.max(1, currentStock));
  }, [currentStock, quantity]);

  const images = useMemo(() => {
    const arr = product?.imagenes ?? [];
    return [...arr].sort((a, b) => {
      if (a.es_principal && !b.es_principal) return -1;
      if (!a.es_principal && b.es_principal) return 1;
      return (a.orden || 0) - (b.orden || 0);
    });
  }, [product?.imagenes]);

  const mainImage = images[selectedImageIndex]?.url_imagen ?? null;

  const stockBadge = useMemo(() => {
    if (currentStock <= 0) return { label: 'Agotado', color: C.red };
    if (currentStock < 10) return { label: 'Stock Bajo', color: C.amber };
    return { label: 'Disponible', color: C.green };
  }, [currentStock]);

  const toCurrency = (n: number) => {
    try {
      return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
    } catch {
      return `$ ${Math.round(n).toLocaleString('es-AR')}`;
    }
  };

  const getVariantName = (v: VariantVM) => {
    const parts: string[] = [];
    if (v.configuracion_aguja) parts.push(v.configuracion_aguja);
    if (v.numero_agujas) parts.push(v.numero_agujas);
    if (v.color) parts.push(v.color);
    if (v.volumen) parts.push(v.volumen);
    if (v.grosor) parts.push(v.grosor);
    if (v.marca_cartucho) parts.push(v.marca_cartucho);
    if (v.compatibilidad) parts.push(v.compatibilidad);
    if (v.material_variante) parts.push(v.material_variante);
    if (v.tono_color) parts.push(v.tono_color);
    if (v.tamaño) parts.push(v.tamaño);
    if (v.tipo_producto) parts.push(v.tipo_producto);
    return parts.join(' • ') || 'Variante';
  };

  const loadFavState = useCallback(
    async (uid: string, productId: number) => {
      const { data } = await supabase
        .from('Favoritos')
        .select('producto_id')
        .eq('user_id', uid)
        .eq('producto_id', productId)
        .maybeSingle();
      setIsFav(!!data);
    },
    []
  );

  const toggleFavorite = useCallback(async () => {
    if (!userId || !pid) {
      Toast.show({ type: 'info', text1: 'Iniciá sesión para usar favoritos' });
      return;
    }
    try {
      if (isFav) {
        const { error } = await supabase
          .from('Favoritos')
          .delete()
          .eq('user_id', userId)
          .eq('producto_id', pid);
        if (error) throw error;
        setIsFav(false);
      } else {
        const { error } = await supabase
          .from('Favoritos')
          .insert({ user_id: userId, producto_id: pid });
        if (error) throw error;
        setIsFav(true);
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'No se pudo actualizar favoritos' });
    }
  }, [userId, pid, isFav]);

  const loadProduct = useCallback(async () => {
    if (!pid) return;
    setLoading(true);
    try {
      // Sesión para favoritos
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id ?? null;
      setUserId(uid ?? null);

      // Producto con imágenes y categoría
      const { data: prod, error: prodErr } = await supabase
        .from('Producto')
        .select(
          'id_producto,nombre,descripcion,precio_base,stock_total,sku,peso,marca,material,categoriaId,ProductoImagen(id_imagen,url_imagen,es_principal,orden),Categoria(id_categoria,nombre)'
        )
        .eq('id_producto', pid)
        .maybeSingle();

      if (prodErr) throw prodErr;
      if (!prod) {
        setProduct(null);
        return;
      }

      const p = prod as unknown as Producto & {
        ProductoImagen?: Pick<ProductoImagen, 'id_imagen' | 'url_imagen' | 'es_principal' | 'orden'>[];
        Categoria?: Pick<Categoria, 'id_categoria' | 'nombre'>;
      };

      const vm: ProductVM = {
        id_producto: p.id_producto,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio_base: Number(p.precio_base ?? 0),
        stock_total: Number(p.stock_total ?? 0),
        sku: p.sku ?? null,
        peso: p.peso ?? null,
        marca: p.marca ?? null,
        material: p.material ?? null,
        categoria: {
          id_categoria: (p as any).Categoria?.id_categoria ?? (p as any).categoriaId ?? null,
          nombre: (p as any).Categoria?.nombre ?? 'Sin categoría',
        },
        imagenes: Array.isArray(p.ProductoImagen)
          ? p.ProductoImagen.map((im) => ({
              id_imagen: im.id_imagen,
              url_imagen: im.url_imagen,
              es_principal: !!im.es_principal,
              orden: Number(im.orden ?? 0),
            }))
          : [],
      };
      setProduct(vm);

      // Variantes activas (alias para "tamaño" -> tamano) y preselección de la más barata con stock
      const { data: vars, error: varErr } = await supabase
        .from('ProductoVariante')
        .select(`
          id_variante,
          precio_adicional,
          stock,
          sku_variante,
          color,
          volumen,
          grosor,
          marca_cartucho,
          compatibilidad,
          material_variante,
          tono_color,
          tamano:"tamaño",
          tipo_producto,
          configuracion_aguja,
          numero_agujas
        `)
        .eq('producto_id', pid)
        .eq('es_activa', true)
        .order('id_variante', { ascending: true });

      if (varErr) throw varErr;

      const mappedVars: VariantVM[] = (vars ?? []).map((v: any) => ({
        ...v,
        tamaño: v.tamano ?? null,
      }));
      setVariants(mappedVars);

      // Preseleccionar automáticamente la variante más barata con stock (como en web)
      if (mappedVars.length > 0) {
        const inStock = mappedVars.filter((v) => Number(v.stock ?? 0) > 0);
        if (inStock.length > 0) {
          const cheapest = inStock.reduce((min, v) =>
            Number(v.precio_adicional ?? 0) < Number(min.precio_adicional ?? 0) ? v : min
          );
          setSelectedVariantId(cheapest.id_variante);
        }
      }

      if (uid) loadFavState(uid, pid);
    } catch (e: any) {
      console.warn('[product-detail] error:', e?.message ?? e);
      Toast.show({ type: 'error', text1: 'No se pudo cargar el producto' });
    } finally {
      setLoading(false);
    }
  }, [pid, loadFavState]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const addToCart = useCallback(() => {
    if (!product) return;
    if (currentStock <= 0) {
      Toast.show({ type: 'info', text1: 'Sin stock' });
      return;
    }
    if (variants.length > 0 && selectedVariantId == null) {
      Toast.show({ type: 'info', text1: 'Seleccioná una variante para continuar' });
      return;
    }

    const imageUrl = mainImage ?? null;
    const sku = currentVariant?.sku_variante ?? product.sku ?? null;

    const addItem = useCartStore.getState().addItem;
    if (!addItem) {
      Toast.show({ type: 'error', text1: 'Carrito no disponible' });
      return;
    }

    addItem({
      id: String(product.id_producto),
      nombre: product.nombre,
      precio: currentPrice,
      imagen: imageUrl,
      stock: currentStock,
      categoria: product.categoria?.nombre ?? 'Sin categoría',
      sku,
      peso: product.peso ?? null,
      cantidad: quantity,
      quantity: quantity,
      varianteId: currentVariant?.id_variante ?? null,
    } as any);

    Toast.show({ type: 'success', text1: 'Agregado al carrito' });
    router.push('/(client)/cart');
  }, [product, currentVariant, currentPrice, currentStock, mainImage, router, variants.length, selectedVariantId, quantity]);

  const nextImage = () => setSelectedImageIndex((i) => Math.min(i + 1, Math.max(0, images.length - 1)));
  const prevImage = () => setSelectedImageIndex((i) => Math.max(0, i - 1));

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={{ color: C.muted, marginTop: 8 }}>Cargando producto…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={28} color={C.muted} />
          <Text style={{ color: C.muted, marginTop: 6 }}>Producto no encontrado</Text>
          <View style={{ marginTop: 10 }}>
            <Button title="Volver" onPress={() => router.back()} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        {/* Header actions */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={18} color={C.text} />
          </Pressable>
          <Pressable onPress={toggleFavorite} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={18} color={isFav ? '#F472B6' : C.text} />
          </Pressable>
        </View>

        <Card>
          {/* Imagen principal */}
          <View style={styles.heroWrap}>
            {mainImage ? (
              <Image source={{ uri: mainImage }} style={styles.hero} resizeMode="contain" />
            ) : (
              <View style={[styles.hero, { alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="image-outline" size={36} color={C.muted} />
              </View>
            )}

            {/* Badges */}
            <View style={styles.stockPill}>
              <View style={[styles.dot, { backgroundColor: stockBadge.color }]} />
              <Text style={{ color: C.text, fontWeight: '800' }}>{stockBadge.label}</Text>
            </View>

            {/* Navegación simple de imágenes (mobile) */}
            {images.length > 1 && (
              <View style={styles.navWrap}>
                <Pressable onPress={prevImage} style={styles.navBtn} hitSlop={8}>
                  <Ionicons name="chevron-back" size={18} color="#fff" />
                </Pressable>
                <Pressable onPress={nextImage} style={styles.navBtn} hitSlop={8}>
                  <Ionicons name="chevron-forward" size={18} color="#fff" />
                </Pressable>
              </View>
            )}
          </View>

          {/* Thumbnails */}
          {images.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 10, paddingBottom: 10, paddingTop: 8 }}
            >
              {images.map((im, idx) => (
                <Pressable
                  key={im.id_imagen}
                  onPress={() => setSelectedImageIndex(idx)}
                  style={[
                    styles.thumbSmallWrap,
                    idx === selectedImageIndex && { borderColor: 'rgba(124,58,237,0.6)' },
                  ]}
                >
                  <Image source={{ uri: im.url_imagen }} style={styles.thumbSmall} resizeMode="cover" />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </Card>

        {/* Título y categoría */}
        <Card>
          <View style={{ padding: 14, gap: 6 }}>
            <Text style={{ color: C.text, fontWeight: '900', fontSize: 20 }}>{product.nombre}</Text>
            <Text style={{ color: C.muted }}>
              Categoría: <Text style={{ color: C.text, fontWeight: '700' }}>{product.categoria?.nombre}</Text>
            </Text>
          </View>
        </Card>

        {/* Descripción */}
        {!!product.descripcion && (
          <Card>
            <View style={{ padding: 14, gap: 6 }}>
              <Text style={{ color: C.text, fontWeight: '800' }}>Descripción</Text>
              <Text style={{ color: C.muted }}>{product.descripcion}</Text>
            </View>
          </Card>
        )}

        {/* Variantes */}
        {variants.length > 0 ? (
          <Card>
            <View style={{ padding: 14, gap: 10 }}>
              <Text style={{ color: C.text, fontWeight: '800' }}>Seleccioná una variante</Text>
              <View style={{ gap: 8 }}>
                {variants.map((v) => {
                  const selected = v.id_variante === selectedVariantId;
                  const out = Number(v.stock ?? 0) <= 0;
                  return (
                    <Pressable
                      key={v.id_variante}
                      onPress={() => !out && setSelectedVariantId(v.id_variante)}
                      style={[
                        styles.variantRow,
                        selected && { backgroundColor: C.primarySoft, borderColor: 'rgba(124,58,237,0.6)' },
                        out && { opacity: 0.6 },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ color: C.text, fontWeight: '700' }} numberOfLines={2}>
                          {getVariantName(v)}
                        </Text>
                        <Text style={{ color: C.muted, fontSize: 12 }}>
                          Stock: {Number(v.stock ?? 0).toLocaleString('es-AR')}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: '#A78BFA', fontWeight: '800' }}>
                          {Number(v.precio_adicional ?? 0) > 0 ? toCurrency(Number(v.precio_adicional)) : toCurrency(product.precio_base)}
                        </Text>
                        {selected ? <Ionicons name="checkmark-circle" size={18} color="#C4B5FD" /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              {selectedVariantId == null ? (
                <Text style={{ color: C.amber, fontSize: 12 }}>Seleccioná una variante para continuar</Text>
              ) : null}
            </View>
          </Card>
        ) : null}

        {/* Precio, stock y barra */}
        <Card>
          <View style={{ padding: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: '#A78BFA' }}>Precio</Text>
                <Text style={{ color: '#A78BFA', fontWeight: '900', fontSize: 22 }}>{toCurrency(currentPrice)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#A78BFA' }}>Stock disponible</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      backgroundColor:
                        currentStock >= 10 ? C.green : currentStock > 5 ? C.amber : currentStock > 0 ? C.orange : C.red,
                    }}
                  />
                  <Text style={{ color: C.text, fontWeight: '800' }}>{currentStock.toLocaleString('es-AR')}</Text>
                </View>
              </View>
            </View>

            <View style={{ height: 8, backgroundColor: '#1f2937', borderRadius: 999, overflow: 'hidden' }}>
              <View
                style={{
                  height: 8,
                  width: `${Math.min((currentStock / 10) * 100, 100)}%`,
                  backgroundColor:
                    currentStock >= 10 ? '#22C55E' : currentStock > 5 ? '#F59E0B' : currentStock > 0 ? '#FB923C' : '#EF4444',
                }}
              />
            </View>

            <Text style={{ color: C.muted, fontSize: 12, textAlign: 'center' }}>
              {currentStock >= 10 ? 'Stock disponible' : currentStock > 5 ? 'Stock limitado' : currentStock > 0 ? '¡Últimas unidades!' : 'Sin stock'}
            </Text>
          </View>
        </Card>

        {/* Cantidad + Favorito + Agregar al carrito (mobile) */}
        <Card>
          <View style={{ padding: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Selector de cantidad */}
              <View style={styles.qtyWrap}>
                <Pressable
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  style={[styles.qtyBtn, quantity <= 1 && { opacity: 0.4 }]}
                  hitSlop={6}
                >
                  <Ionicons name="remove" size={16} color="#fff" />
                </Pressable>
                <Text style={styles.qtyValue}>{quantity}</Text>
                <Pressable
                  onPress={() => setQuantity((q) => Math.min(currentStock, q + 1))}
                  disabled={quantity >= currentStock}
                  style={[styles.qtyBtn, quantity >= currentStock && { opacity: 0.4 }]}
                  hitSlop={6}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                </Pressable>
              </View>

              {/* Favorito */}
              <Pressable onPress={toggleFavorite} style={styles.favBtn} hitSlop={6}>
                <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={18} color={isFav ? '#F472B6' : '#fff'} />
              </Pressable>
            </View>

            <Button
              title="Agregar al carrito"
              onPress={addToCart}
              disabled={currentStock <= 0 || (variants.length > 0 && selectedVariantId == null)}
              left={<Ionicons name="cart-outline" size={18} color="#fff" />}
            />
          </View>
        </Card>

        {/* Detalles adicionales */}
        <Card>
          <View style={{ padding: 14, gap: 6 }}>
            <Text style={{ color: C.text, fontWeight: '800' }}>Detalles</Text>
            <Detail label="ID del producto" value={`#${product.id_producto}`} />
            <Detail label="Política de devolución" value="30 días para devoluciones" />
            <Detail label="Tiempo de entrega" value="2-8 días hábiles" />
            <Detail label="Soporte" value="Atención al cliente 24/7" />
          </View>
        </Card>

        {/* (Opcional) Productos relacionados: podés agregar más adelante con una FlatList */}
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: C.muted }}>{label}</Text>
      <Text style={{ color: C.text, fontWeight: '700', marginLeft: 10, flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#11151B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },

  heroWrap: { height: 280, borderBottomWidth: 1, borderColor: C.border, backgroundColor: '#0B0F14', position: 'relative' },
  hero: { width: '100%', height: '100%' },

  stockPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.primarySoft,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 999 },

  navWrap: { position: 'absolute', width: '100%', top: '45%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
  navBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  thumbSmallWrap: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#1A202C',
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  thumbSmall: { width: '100%', height: '100%' },

  variantRow: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#11151B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  qtyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11151B',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 10,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: { color: C.text, fontWeight: '800', width: 40, textAlign: 'center' },

  favBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#11151B',
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});