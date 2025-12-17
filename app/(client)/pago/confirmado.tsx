import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';

const C = {
  bg: '#0E1116',
  card: '#141821',
  border: '#2A2F3A',
  text: '#F3F4F6',
  muted: '#A0A8B0',
  primary: '#7C3AED',
  primarySoft: 'rgba(124,58,237,0.14)',
  success: '#22C55E',
  successSoft: 'rgba(34,197,94,0.14)',
  warning: '#F59E0B',
  danger: '#EF4444',
};

function money(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PagoConfirmadoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderNumber = params.order_number as string;
  const paymentId = params.payment_id as string;
  const collectionStatus = params.collection_status as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOrder();
  }, [orderNumber]);

  const loadOrder = async () => {
    if (!orderNumber) {
      setError('No se encontró el número de pedido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: pedido, error: pedidoErr } = await supabase
        .from('Pedido')
        .select(`
          *,
          cliente:Cliente!Pedido_clienteId_fkey(*),
          productos:PedidoProducto(
            *,
            producto:Producto!PedidoProducto_productoId_fkey(
              *,
              imagenes:ProductoImagen(*)
            ),
            variante:ProductoVariante(*)
          )
        `)
        .eq('numero_pedido', orderNumber)
        .maybeSingle();

      if (pedidoErr) {
        console.error('[confirmado] Error cargando pedido:', pedidoErr);
        setError('Error al cargar el pedido');
        setLoading(false);
        return;
      }

      if (!pedido) {
        setError('Pedido no encontrado');
        setLoading(false);
        return;
      }

      setOrder(pedido);
      setLoading(false);
    } catch (e: any) {
      console.error('[confirmado] Error:', e);
      setError(e?.message || 'Error al cargar el pedido');
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `¡Mi pedido #${orderNumber} fue confirmado! 🎉\n\nTotal: ${money(order?.total || 0)}\n\nGracias por tu compra en Universo Tattoo.`,
      });
    } catch (e: any) {
      console.warn('[confirmado] Error al compartir:', e);
    }
  };

  const handleContactSupport = () => {
    const phone = '5493442407641';
    const message = `Hola! Tengo una consulta sobre mi pedido #${orderNumber}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const getPaymentStatusBadge = () => {
    const status = order?.estado_pago || 'PENDIENTE';
    switch (status) {
      case 'PAGADO':
        return { label: 'Pago confirmado', color: C.success, bg: C.successSoft };
      case 'PENDIENTE':
        return { label: 'Pago pendiente', color: C.warning, bg: 'rgba(245,158,11,0.14)' };
      case 'FALLIDO':
        return { label: 'Pago fallido', color: C.danger, bg: 'rgba(239,68,68,0.14)' };
      default:
        return { label: status, color: C.muted, bg: 'rgba(160,168,176,0.14)' };
    }
  };

  const getOrderStatusBadge = () => {
    const status = order?.estado || 'PENDIENTE';
    switch (status) {
      case 'CONFIRMADO':
        return { label: 'Confirmado', color: C.success, bg: C.successSoft };
      case 'PREPARANDO':
        return { label: 'Preparando', color: '#60A5FA', bg: 'rgba(96,165,250,0.14)' };
      case 'ENVIADO':
        return { label: 'Enviado', color: '#8B5CF6', bg: 'rgba(139,92,246,0.14)' };
      case 'ENTREGADO':
        return { label: 'Entregado', color: C.success, bg: C.successSoft };
      case 'PENDIENTE':
        return { label: 'Pendiente', color: C.warning, bg: 'rgba(245,158,11,0.14)' };
      case 'CANCELADO':
        return { label: 'Cancelado', color: C.danger, bg: 'rgba(239,68,68,0.14)' };
      default:
        return { label: status, color: C.muted, bg: 'rgba(160,168,176,0.14)' };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'right', 'bottom', 'left']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Cargando pedido...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'right', 'bottom', 'left']}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={48} color={C.danger} />
          </View>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error || 'No se pudo cargar el pedido'}</Text>
          <Pressable
            onPress={() => router.replace('/(client)')}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.primaryBtnText}>Volver al inicio</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const paymentBadge = getPaymentStatusBadge();
  const orderBadge = getOrderStatusBadge();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'right', 'bottom', 'left']}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Success Header */}
        <View style={styles.successHeader}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={64} color={C.success} />
          </View>
          <Text style={styles.successTitle}>¡Pedido confirmado!</Text>
          <Text style={styles.successSubtitle}>
            Tu pedido #{orderNumber} fue recibido correctamente
          </Text>
        </View>

        {/* Status Badges */}
        <View style={styles.badgesRow}>
          <View style={[styles.badge, { backgroundColor: orderBadge.bg }]}>
            <Text style={[styles.badgeText, { color: orderBadge.color }]}>{orderBadge.label}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: paymentBadge.bg }]}>
            <Text style={[styles.badgeText, { color: paymentBadge.color }]}>{paymentBadge.label}</Text>
          </View>
        </View>

        {/* Order Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detalles del pedido</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Número de pedido</Text>
            <Text style={styles.detailValue}>{order.numero_pedido}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fecha</Text>
            <Text style={styles.detailValue}>
              {new Date(order.fecha_pedido).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          {order.metodo_pago && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Método de pago</Text>
              <Text style={styles.detailValue}>
                {order.metodo_pago === 'MERCADOPAGO' ? 'Mercado Pago' : 
                 order.metodo_pago === 'TRANSFERENCIA' ? 'Transferencia bancaria' :
                 order.metodo_pago === 'EFECTIVO' ? 'Efectivo' : order.metodo_pago}
              </Text>
            </View>
          )}
          {paymentId && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ID de pago</Text>
              <Text style={styles.detailValue}>{paymentId}</Text>
            </View>
          )}
        </View>

        {/* Payment Info for Transferencia */}
        {order.metodo_pago === 'TRANSFERENCIA' && order.estado_pago === 'PENDIENTE' && (
          <View style={[styles.card, { borderColor: C.primary, backgroundColor: 'rgba(124,58,237,0.05)' }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="card-outline" size={20} color={C.primary} />
              <Text style={[styles.cardTitle, { color: C.primary }]}>Datos para transferencia</Text>
            </View>
            
            <View style={{ gap: 8, marginTop: 4 }}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Banco</Text>
                <Text style={styles.detailValue}>Mercado Pago</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Titular</Text>
                <Text style={styles.detailValue}>Maria Carolina Roude</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>CUIT</Text>
                <Text style={styles.detailValue}>27-26306559-5</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>CBU</Text>
                <Text style={styles.detailValue}>0000003100035600129127</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Alias</Text>
                <Text style={styles.detailValue}>amoruniverso859</Text>
              </View>
              <View style={[styles.detailRow, { marginTop: 4 }]}>
                <Text style={styles.detailLabel}>Monto a transferir</Text>
                <Text style={[styles.detailValue, { color: C.primary, fontSize: 16 }]}>{money(order.total)}</Text>
              </View>
            </View>

            <View style={{ marginTop: 12, padding: 10, backgroundColor: 'rgba(124,58,237,0.1)', borderRadius: 8 }}>
              <Text style={[styles.text, { fontSize: 12, color: C.primary }]}>
                Por favor enviá el comprobante por WhatsApp indicando tu número de pedido #{order.numero_pedido}
              </Text>
            </View>
          </View>
        )}

        {/* Products */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Productos ({order.productos?.length || 0})</Text>
          {order.productos?.map((pp: any, idx: number) => (
            <View key={idx} style={styles.productRow}>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {pp.producto?.nombre || 'Producto'}
                </Text>
                {pp.variante && (
                  <Text style={styles.productVariant}>
                    {pp.variante.nombre}
                  </Text>
                )}
                <Text style={styles.productMeta}>
                  Cantidad: {pp.cantidad} × {money(pp.precio_unitario)}
                </Text>
              </View>
              <Text style={styles.productTotal}>
                {money(pp.cantidad * pp.precio_unitario)}
              </Text>
            </View>
          ))}
        </View>

        {/* Shipping Info */}
        {order.metodo_envio && order.metodo_envio !== 'PICKUP' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="navigate-outline" size={20} color="#C4B5FD" />
              <Text style={styles.cardTitle}>Información de envío</Text>
            </View>
            
            {order.metodo_envio === 'DELIVERY' && order.direccion_envio && (
              <View>
                <Text style={styles.text}>Envío a domicilio</Text>
                <Text style={styles.mutedText}>{order.direccion_envio}</Text>
                {order.ciudad_envio && (
                  <Text style={styles.mutedText}>
                    {order.ciudad_envio}, {order.provincia_envio} ({order.cp_envio})
                  </Text>
                )}
              </View>
            )}

            {order.metodo_envio === 'BRANCH' && order.sucursal_envio && (
              <View>
                <Text style={styles.text}>Retiro en sucursal OCA</Text>
                <Text style={styles.mutedText}>{order.sucursal_envio}</Text>
                {order.ciudad_envio && (
                  <Text style={styles.mutedText}>
                    {order.ciudad_envio}, {order.provincia_envio}
                  </Text>
                )}
              </View>
            )}

            {order.tracking_number && (
              <View style={styles.trackingBox}>
                <Text style={styles.trackingLabel}>Número de seguimiento</Text>
                <Text style={styles.trackingNumber}>{order.tracking_number}</Text>
              </View>
            )}
          </View>
        )}

        {order.metodo_envio === 'PICKUP' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="bag-handle-outline" size={20} color="#C4B5FD" />
              <Text style={styles.cardTitle}>Retiro en tienda</Text>
            </View>
            <Text style={styles.text}>Retirá tu pedido en nuestra sucursal</Text>
            <Text style={styles.mutedText}>Bartolomé Mitre 587, Concepción del Uruguay, Entre Ríos</Text>
            <Text style={[styles.mutedText, { marginTop: 4 }]}>
              Te avisaremos cuando esté listo para retirar
            </Text>
          </View>
        )}

        {/* Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumen</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.mutedText}>Subtotal</Text>
            <Text style={styles.text}>{money(order.subtotal || 0)}</Text>
          </View>
          {order.envio > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.mutedText}>Envío</Text>
              <Text style={styles.text}>{money(order.envio)}</Text>
            </View>
          )}
          {order.descuento > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.mutedText}>Descuento</Text>
              <Text style={styles.text}>-{money(order.descuento)}</Text>
            </View>
          )}
          <View style={styles.separator} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{money(order.total)}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsCard}>
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="share-social-outline" size={20} color={C.primary} />
            <Text style={styles.actionText}>Compartir pedido</Text>
          </Pressable>

          <Pressable
            onPress={handleContactSupport}
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="logo-whatsapp" size={20} color={C.primary} />
            <Text style={styles.actionText}>Contactar soporte</Text>
          </Pressable>
        </View>

        {/* Bottom CTA */}
        <Pressable
          onPress={() => router.replace('/(client)')}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name="home-outline" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Volver al inicio</Text>
        </Pressable>

        <Text style={styles.footerNote}>
          Recibirás un email con toda la información de tu pedido
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: C.text,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(239,68,68,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    color: C.text,
    fontSize: 24,
    fontWeight: '800',
  },
  errorText: {
    color: C.muted,
    textAlign: 'center',
  },
  successHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  successIconWrap: {
    marginBottom: 8,
  },
  successTitle: {
    color: C.text,
    fontSize: 28,
    fontWeight: '800',
  },
  successSubtitle: {
    color: C.muted,
    textAlign: 'center',
    fontSize: 16,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  warningCard: {
    borderColor: C.warning,
    backgroundColor: 'rgba(245,158,11,0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '800',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: C.muted,
    fontSize: 14,
  },
  detailValue: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
  },
  text: {
    color: C.text,
    fontSize: 14,
  },
  mutedText: {
    color: C.muted,
    fontSize: 13,
    marginTop: 2,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
  },
  productVariant: {
    color: C.muted,
    fontSize: 12,
  },
  productMeta: {
    color: C.muted,
    fontSize: 12,
  },
  productTotal: {
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
  },
  trackingBox: {
    backgroundColor: C.primarySoft,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  trackingLabel: {
    color: C.muted,
    fontSize: 12,
    marginBottom: 4,
  },
  trackingNumber: {
    color: C.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 4,
  },
  totalLabel: {
    color: C.text,
    fontSize: 18,
    fontWeight: '800',
  },
  totalValue: {
    color: C.text,
    fontSize: 18,
    fontWeight: '800',
  },
  actionsCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 8,
    gap: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: C.primarySoft,
  },
  actionText: {
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footerNote: {
    color: C.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
});
