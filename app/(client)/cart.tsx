import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCartStore } from '../../lib/cart-store';

const FREE_SHIPPING_MIN = 150_000;

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getCategoryName(categoria: any): string {
  if (!categoria) return 'Sin categoría';
  if (typeof categoria === 'string') return categoria;
  if (typeof categoria === 'object' && categoria.nombre) return categoria.nombre;
  return 'Sin categoría';
}

function getImageUrl(item: any): string {
  if (item?.ProductoImagen && Array.isArray(item.ProductoImagen) && item.ProductoImagen.length > 0) {
    const principal = item.ProductoImagen.find((img: any) => img.es_principal);
    const first = item.ProductoImagen[0];
    const sel = principal || first;
    if (sel?.url_imagen) return sel.url_imagen;
  }
  if (item?.imagenes && Array.isArray(item.imagenes) && item.imagenes.length > 0) {
    const principal = item.imagenes.find((img: any) => img.es_principal);
    const first = item.imagenes[0];
    const sel = principal || first;
    if (sel?.url_imagen) return sel.url_imagen;
  }
  const direct = item?.imagen_url || item?.imagen || item?.image || item?.url_imagen;
  if (direct && !String(direct).includes('placeholder')) return direct;
  return 'https://via.placeholder.com/80';
}

export default function CartScreen() {
  const router = useRouter();
  const {
    items,
    getTotalItems,
    getTotalPrice,
    updateQuantity,
    removeItem,
    clearCart,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    getDiscountAmount,
  } = useCartStore();

  const [couponCode, setCouponCode] = useState('');
  const subtotal = getTotalPrice();
  const discount = getDiscountAmount();
  const count = getTotalItems();
  const isFreeShipping = subtotal >= FREE_SHIPPING_MIN;
  const total = subtotal - discount; // Envío se calcula en checkout

  const header = useMemo(() => {
    return (
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Ionicons name="cart-outline" size={22} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Mi Carrito</Text>
            <Text style={styles.headerSubtitle}>{count} productos en tu carrito</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.85 }]}>
            <Ionicons name="arrow-back-outline" size={16} color="#A78BFA" />
            <Text style={styles.ghostText}>Seguir comprando</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert('Vaciar carrito', '¿Seguro que querés vaciar el carrito?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Vaciar', style: 'destructive', onPress: clearCart },
              ]);
            }}
            style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="trash-outline" size={16} color="#E5E7EB" />
            <Text style={styles.ghostText}>Vaciar carrito</Text>
          </Pressable>
        </View>

        <View style={styles.freeShipCard}>
          {isFreeShipping ? (
            <Text style={styles.freeShipOk}>¡Ya tenés envío gratis! 🎉</Text>
          ) : (
            <Text style={styles.freeShipText}>
              Te faltan <Text style={styles.freeShipNum}>{money(Math.max(0, FREE_SHIPPING_MIN - subtotal))}</Text> para conseguir
              <Text style={styles.freeShipNum}> envío gratis</Text>.
            </Text>
          )}
          <View style={styles.progress}>
            <View style={[styles.progressFill, { width: `${Math.min(100, (subtotal / FREE_SHIPPING_MIN) * 100)}%` }]} />
          </View>
        </View>
      </View>
    );
    // Dependencias: que se re-renderice al cambiar conteo o subtotal/envío gratis
  }, [count, isFreeShipping, subtotal, router, clearCart]);

  if (items.length === 0) {
    return (
      <View style={styles.emptyRoot}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="cart-outline" size={48} color="#9CA3AF" />
        </View>
        <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
        <Text style={styles.emptyText}>Explorá nuestro catálogo y encontrá lo que necesitás.</Text>
        <Pressable onPress={() => router.push('/(client)/store')} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}>
          <Ionicons name="cube-outline" size={16} color="#fff" />
          <Text style={styles.primaryText}>Explorar productos</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListHeaderComponent={header}
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={({ item }) => {
          const qty = item.quantity ?? item.cantidad ?? 1;
          const maxStock = item.stock ?? 999;
          const isAtMax = qty >= maxStock;
          const img = getImageUrl(item);
          return (
            <View style={styles.card}>
              <View style={styles.row}>
                <Image source={{ uri: img }} style={styles.thumb} resizeMode="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.nombre || 'Producto sin nombre'}
                  </Text>
                  <View style={styles.badges}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{getCategoryName(item.categoria)}</Text>
                    </View>
                    {maxStock <= 5 && maxStock > 0 ? (
                      <View style={[styles.badge, { borderColor: 'rgba(245,158,11,0.4)' }]}>
                        <Text style={[styles.badgeText, { color: '#FBBF24' }]}>⚠️ Últimas {maxStock}</Text>
                      </View>
                    ) : null}
                    {isAtMax && maxStock < 999 ? (
                      <View style={[styles.badge, { borderColor: 'rgba(239,68,68,0.4)' }]}>
                        <Text style={[styles.badgeText, { color: '#F87171' }]}>🚫 Stock máximo</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.itemBottom}>
                    <View style={styles.qtyWrap}>
                      <Pressable
                        onPress={() => updateQuantity(item.id, qty - 1)}
                        disabled={qty <= 1}
                        style={({ pressed }) => [styles.qtyBtn, pressed && { opacity: 0.8 }]}
                      >
                        <Ionicons name="remove-outline" size={16} color="#E5E7EB" />
                      </Pressable>
                      <Text style={styles.qtyValue}>{qty}</Text>
                      <Pressable
                        onPress={() => updateQuantity(item.id, qty + 1)}
                        disabled={isAtMax}
                        style={({ pressed }) => [styles.qtyBtn, pressed && { opacity: 0.8 }]}
                      >
                        <Ionicons name="add-outline" size={16} color="#E5E7EB" />
                      </Pressable>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.priceEach}>{money(item.precio || 0)} c/u</Text>
                      <Text style={styles.priceTotal}>{money((item.precio || 0) * qty)}</Text>
                    </View>
                  </View>
                </View>

                <Pressable
                  onPress={() => removeItem(item.id)}
                  style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.8 }]}
                >
                  <Ionicons name="trash-outline" size={18} color="#FCA5A5" />
                </Pressable>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <View style={styles.footer}>
            {/* Cupón */}
            <View style={styles.couponCard}>
              <View style={styles.couponHeader}>
                <Ionicons name="pricetag-outline" size={18} color="#C4B5FD" />
                <Text style={styles.couponTitle}>Cupón de descuento</Text>
              </View>

              {!appliedCoupon ? (
                <View style={styles.couponRow}>
                  <TextInput
                    value={couponCode}
                    onChangeText={setCouponCode}
                    placeholder="Código de cupón"
                    placeholderTextColor="#9CA3AF"
                    style={styles.couponInput}
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={() => {
                      const code = couponCode.trim().toLowerCase();
                      if (code === 'juliansosuncapo91218') {
                        applyCoupon({ code: couponCode, discount: 10 });
                        setCouponCode('');
                        Alert.alert('¡Cupón aplicado! 🎉', '10% de descuento aplicado');
                        return;
                      }
                      if (code === 'eastereggnadiepodrasaberestecupondepruba') {
                        applyCoupon({ code: couponCode, discount: 20 });
                        setCouponCode('');
                        Alert.alert('¡Cupón aplicado! 🎉', '20% de descuento aplicado');
                        return;
                      }
                      Alert.alert('Cupón inválido', 'El código ingresado no es válido');
                    }}
                    style={({ pressed }) => [styles.applyBtn, pressed && { opacity: 0.9 }]}
                  >
                    <Text style={styles.applyText}>Aplicar</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.appliedRow}>
                  <Text style={styles.appliedText}>
                    {appliedCoupon.code} - {appliedCoupon.discount}% OFF
                  </Text>
                  <Pressable onPress={removeCoupon} style={({ pressed }) => [styles.removeCouponBtn, pressed && { opacity: 0.8 }]}>
                    <Ionicons name="trash-outline" size={16} color="#34D399" />
                    <Text style={styles.removeCouponText}>Quitar</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Resumen */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal ({count} productos)</Text>
                <Text style={styles.summaryValue}>{money(subtotal)}</Text>
              </View>
              {appliedCoupon ? (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#34D399' }]}>Descuento ({appliedCoupon.discount}%)</Text>
                  <Text style={[styles.summaryValue, { color: '#34D399' }]}>-{money(discount)}</Text>
                </View>
              ) : null}
              <View style={styles.separator} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotal}>Total</Text>
                <Text style={styles.summaryTotal}>{money(total)}</Text>
              </View>

              <Text style={styles.shippingNote}>El costo de envío se calcula en el checkout.</Text>

              <Pressable
                onPress={() => router.push('../(client)/checkout')}
                disabled={items.length === 0}
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }, items.length === 0 && { opacity: 0.6 }]}
              >
                <Text style={styles.primaryText}>Proceder al checkout</Text>
                <Ionicons name="arrow-forward-outline" size={16} color="#fff" />
              </Pressable>
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0B0F' },
  header: { gap: 10, marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSubtitle: { color: '#9CA3AF' },
  headerActions: { flexDirection: 'row', gap: 10 },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: 'rgba(124,58,237,0.1)' },
  ghostText: { color: '#E5E7EB', fontWeight: '600' },

  freeShipCard: { marginTop: 4, borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)', backgroundColor: 'rgba(24,24,27,0.6)', padding: 10, borderRadius: 12 },
  freeShipOk: { color: '#34D399', fontWeight: '700' },
  freeShipText: { color: '#E5E7EB' },
  freeShipNum: { color: '#34D399', fontWeight: '700' },
  progress: { height: 8, borderRadius: 999, backgroundColor: '#27272A', marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#22C55E' },

  emptyRoot: { flex: 1, backgroundColor: '#0B0B0F', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  emptyIconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(39,39,42,0.6)', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  emptyText: { color: '#9CA3AF', textAlign: 'center', marginBottom: 8 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7C3AED', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, alignSelf: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },

  card: { backgroundColor: 'rgba(24,24,27,0.7)', borderWidth: 1, borderColor: '#27272A', borderRadius: 12, padding: 10 },
  row: { flexDirection: 'row', gap: 10 },
  thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#18181B' },
  itemName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  badge: { borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#C4B5FD', fontSize: 12, fontWeight: '600' },

  itemBottom: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qtyWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#3F3F46', borderRadius: 8 },
  qtyBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  qtyValue: { color: '#fff', minWidth: 36, textAlign: 'center', fontWeight: '700' },
  priceEach: { color: '#9CA3AF', fontSize: 12, textAlign: 'right' },
  priceTotal: { color: '#fff', fontWeight: '800', fontSize: 16 },

  removeBtn: { padding: 6, alignSelf: 'flex-start' },

  footer: { gap: 12, marginTop: 8 },
  couponCard: { borderWidth: 1, borderColor: '#27272A', backgroundColor: 'rgba(24,24,27,0.7)', borderRadius: 12, padding: 12 },
  couponHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  couponTitle: { color: '#fff', fontWeight: '800' },
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: { flex: 1, height: 44, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(168,85,247,0.35)', color: '#fff', backgroundColor: 'rgba(24,24,27,0.6)' },
  applyBtn: { height: 44, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#6D28D9', alignItems: 'center', justifyContent: 'center' },
  applyText: { color: '#fff', fontWeight: '700' },
  appliedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(34,197,94,0.35)', backgroundColor: 'rgba(16,185,129,0.12)' },
  appliedText: { color: '#A7F3D0', fontWeight: '700' },
  removeCouponBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  removeCouponText: { color: '#A7F3D0', fontWeight: '700' },

  summaryCard: { borderWidth: 1, borderColor: '#27272A', backgroundColor: 'rgba(24,24,27,0.7)', borderRadius: 12, padding: 12, gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: '#E5E7EB' },
  summaryValue: { color: '#E5E7EB', fontWeight: '700' },
  summaryTotal: { color: '#fff', fontSize: 18, fontWeight: '800' },
  separator: { height: 1, backgroundColor: '#27272A', marginVertical: 8 },
  shippingNote: { color: '#9CA3AF', fontSize: 12, marginTop: -2, marginBottom: 6, textAlign: 'center' },
});