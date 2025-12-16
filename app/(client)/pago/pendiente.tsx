import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Pressable,
    ScrollView,
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
  warning: '#F59E0B',
  warningSoft: 'rgba(245,158,11,0.14)',
};

function money(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PagoPendienteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderNumber = params.order_number as string;
  const paymentId = params.payment_id as string;

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
        console.error('[pendiente] Error cargando pedido:', pedidoErr);
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
      console.error('[pendiente] Error:', e);
      setError(e?.message || 'Error al cargar el pedido');
      setLoading(false);
    }
  };

  const handleContactSupport = () => {
    const phone = '5493442407641';
    const message = `Hola! Tengo una consulta sobre mi pedido #${orderNumber}. El pago está pendiente.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
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
            <Ionicons name="alert-circle-outline" size={48} color={C.warning} />
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'right', 'bottom', 'left']}>
      {/* Header con gradiente */}
      <View style={styles.headerGradient}>
        <Pressable onPress={() => router.replace('/(client)')} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerContent}>
          <View style={styles.iconCircle}>
            <Ionicons name="time-outline" size={48} color="#FFF" />
          </View>
          <Text style={styles.headerTitle}>Pago Pendiente</Text>
          <Text style={styles.headerSubtitle}>Pedido #{orderNumber}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Badge */}
        <View style={styles.badgeContainer}>
          <View style={[styles.badge, { backgroundColor: C.warningSoft, borderColor: C.warning }]}>
            <Ionicons name="hourglass-outline" size={16} color={C.warning} />
            <Text style={[styles.badgeText, { color: C.warning }]}>Esperando confirmación</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={[styles.card, styles.warningCard]}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={20} color={C.warning} />
            <Text style={[styles.cardTitle, { color: C.warning }]}>¿Qué significa esto?</Text>
          </View>
          <Text style={styles.text}>
            Tu pago está siendo procesado. Esto puede suceder cuando:
          </Text>
          <View style={styles.reasonsList}>
            <View style={styles.reasonRow}>
              <Ionicons name="ellipse" size={6} color={C.muted} />
              <Text style={styles.reasonText}>Pagaste con efectivo en un punto de pago</Text>
            </View>
            <View style={styles.reasonRow}>
              <Ionicons name="ellipse" size={6} color={C.muted} />
              <Text style={styles.reasonText}>Elegiste pagar con transferencia bancaria</Text>
            </View>
            <View style={styles.reasonRow}>
              <Ionicons name="ellipse" size={6} color={C.muted} />
              <Text style={styles.reasonText}>El banco está verificando la transacción</Text>
            </View>
          </View>
          <View style={styles.infoBox}>
            <Ionicons name="mail-outline" size={16} color={C.warning} style={{ marginRight: 8 }} />
            <Text style={styles.infoText}>
              Te avisaremos por email cuando tu pago sea confirmado
            </Text>
          </View>
        </View>

        {/* Payment Method Info */}
        {order.metodo_pago === 'TRANSFERENCIA' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="swap-vertical-outline" size={20} color="#C4B5FD" />
              <Text style={styles.cardTitle}>Datos para transferencia</Text>
            </View>
            <Text style={styles.text}>
              Te enviamos los datos bancarios a tu email para completar la transferencia.
            </Text>
            <View style={styles.bankDetails}>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Banco</Text>
                <Text style={styles.bankValue}>Banco Ejemplo</Text>
              </View>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Titular</Text>
                <Text style={styles.bankValue}>Universo Tattoo</Text>
              </View>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>CBU/Alias</Text>
                <Text style={styles.bankValue}>Ver en el email</Text>
              </View>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Monto</Text>
                <Text style={[styles.bankValue, { color: C.warning, fontWeight: '800' }]}>
                  {money(order.total)}
                </Text>
              </View>
            </View>
            <Text style={styles.noteText}>
              Una vez realizada la transferencia, envianos el comprobante por WhatsApp
            </Text>
          </View>
        )}

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
        <View style={styles.actionsContainer}>
          <Pressable
            onPress={handleContactSupport}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Contactar por WhatsApp</Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace('/(client)/profile')}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="receipt-outline" size={20} color={C.primary} />
            <Text style={styles.secondaryBtnText}>Ver mis pedidos</Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace('/(client)')}
            style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.ghostBtnText}>Volver al inicio</Text>
          </Pressable>
        </View>

        <Text style={styles.footerNote}>
          Recibirás una notificación cuando tu pago sea confirmado
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
    backgroundColor: C.warningSoft,
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
  headerGradient: {
    backgroundColor: C.warning,
    paddingTop: 16,
    paddingBottom: 32,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
    marginTop: -16,
    paddingBottom: 32,
  },
  pendingHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  pendingIconWrap: {
    marginBottom: 8,
  },
  pendingTitle: {
    color: C.text,
    fontSize: 28,
    fontWeight: '800',
  },
  pendingSubtitle: {
    color: C.muted,
    textAlign: 'center',
    fontSize: 16,
  },
  badgeContainer: {
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    backgroundColor: C.warningSoft,
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
  text: {
    color: C.text,
    fontSize: 14,
    lineHeight: 20,
  },
  reasonsList: {
    gap: 8,
    marginTop: 4,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 8,
  },
  reasonText: {
    color: C.muted,
    fontSize: 14,
  },
  infoBox: {
    backgroundColor: 'rgba(245,158,11,0.2)',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    color: C.text,
    fontSize: 13,
    lineHeight: 18,
  },
  bankDetails: {
    backgroundColor: C.bg,
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginTop: 4,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankLabel: {
    color: C.muted,
    fontSize: 14,
  },
  bankValue: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
  },
  noteText: {
    color: C.muted,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mutedText: {
    color: C.muted,
    fontSize: 14,
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
  actionsContainer: {
    gap: 10,
    marginTop: 8,
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
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primarySoft,
    borderWidth: 1,
    borderColor: C.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  secondaryBtnText: {
    color: C.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  ghostBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  ghostBtnText: {
    color: C.muted,
    fontSize: 15,
    fontWeight: '600',
  },
  footerNote: {
    color: C.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
});
