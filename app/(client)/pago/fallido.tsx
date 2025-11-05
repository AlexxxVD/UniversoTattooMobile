import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  bg: '#0E1116',
  card: '#141821',
  border: '#2A2F3A',
  text: '#F3F4F6',
  muted: '#A0A8B0',
  primary: '#7C3AED',
  primarySoft: 'rgba(124,58,237,0.14)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239,68,68,0.14)',
};

export default function PagoFallidoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderNumber = params.order_number as string;
  const paymentId = params.payment_id as string;
  const statusDetail = params.status_detail as string;

  const handleRetry = () => {
    // Volver al checkout para reintentar
    router.push('/(client)/checkout');
  };

  const handleContactSupport = () => {
    const phone = '5493442407641';
    const message = orderNumber 
      ? `Hola! Tuve un problema con el pago de mi pedido #${orderNumber}. ¿Pueden ayudarme?`
      : 'Hola! Tuve un problema con el pago. ¿Pueden ayudarme?';
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const getErrorMessage = () => {
    if (statusDetail) {
      switch (statusDetail) {
        case 'cc_rejected_insufficient_amount':
          return 'Tu tarjeta no tiene fondos suficientes';
        case 'cc_rejected_bad_filled_card_number':
          return 'Revisá el número de tarjeta ingresado';
        case 'cc_rejected_bad_filled_date':
          return 'Revisá la fecha de vencimiento';
        case 'cc_rejected_bad_filled_security_code':
          return 'Revisá el código de seguridad';
        case 'cc_rejected_call_for_authorize':
          return 'Debés autorizar el pago con tu banco';
        case 'cc_rejected_card_disabled':
          return 'Tu tarjeta está deshabilitada';
        case 'cc_rejected_duplicated_payment':
          return 'Ya realizaste un pago similar recientemente';
        case 'cc_rejected_high_risk':
          return 'El pago fue rechazado por seguridad';
        default:
          return 'El pago no pudo ser procesado';
      }
    }
    return 'El pago no pudo ser procesado';
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'right', 'bottom', 'left']}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Error Header */}
        <View style={styles.errorHeader}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="close-circle" size={64} color={C.danger} />
          </View>
          <Text style={styles.errorTitle}>Pago rechazado</Text>
          <Text style={styles.errorSubtitle}>
            {getErrorMessage()}
          </Text>
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle-outline" size={20} color="#C4B5FD" />
            <Text style={styles.cardTitle}>¿Qué pasó?</Text>
          </View>
          <Text style={styles.text}>
            El pago fue rechazado por el procesador. Esto puede deberse a diferentes motivos:
          </Text>
          <View style={styles.reasonsList}>
            <View style={styles.reasonRow}>
              <Ionicons name="ellipse" size={6} color={C.muted} />
              <Text style={styles.reasonText}>Fondos insuficientes</Text>
            </View>
            <View style={styles.reasonRow}>
              <Ionicons name="ellipse" size={6} color={C.muted} />
              <Text style={styles.reasonText}>Datos de tarjeta incorrectos</Text>
            </View>
            <View style={styles.reasonRow}>
              <Ionicons name="ellipse" size={6} color={C.muted} />
              <Text style={styles.reasonText}>Límite de compra excedido</Text>
            </View>
            <View style={styles.reasonRow}>
              <Ionicons name="ellipse" size={6} color={C.muted} />
              <Text style={styles.reasonText}>Tarjeta vencida o bloqueada</Text>
            </View>
          </View>
        </View>

        {/* Order Info */}
        {orderNumber && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="receipt-outline" size={20} color="#C4B5FD" />
              <Text style={styles.cardTitle}>Información del pedido</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Número de pedido</Text>
              <Text style={styles.detailValue}>{orderNumber}</Text>
            </View>
            {paymentId && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>ID de pago</Text>
                <Text style={styles.detailValue}>{paymentId}</Text>
              </View>
            )}
            <View style={styles.infoBox}>
              <Ionicons name="time-outline" size={16} color={C.muted} />
              <Text style={styles.infoText}>
                Tu pedido fue creado pero el pago no se completó. Podés intentar nuevamente.
              </Text>
            </View>
          </View>
        )}

        {/* What to do */}
        <View style={[styles.card, styles.suggestionCard]}>
          <View style={styles.cardHeader}>
            <Ionicons name="bulb-outline" size={20} color={C.primary} />
            <Text style={styles.cardTitle}>¿Qué puedo hacer?</Text>
          </View>
          <View style={styles.suggestionsList}>
            <View style={styles.suggestionRow}>
              <View style={styles.suggestionNumber}>
                <Text style={styles.suggestionNumberText}>1</Text>
              </View>
              <Text style={styles.suggestionText}>
                Verificá que tus datos de pago sean correctos
              </Text>
            </View>
            <View style={styles.suggestionRow}>
              <View style={styles.suggestionNumber}>
                <Text style={styles.suggestionNumberText}>2</Text>
              </View>
              <Text style={styles.suggestionText}>
                Contactá a tu banco para autorizar la compra
              </Text>
            </View>
            <View style={styles.suggestionRow}>
              <View style={styles.suggestionNumber}>
                <Text style={styles.suggestionNumberText}>3</Text>
              </View>
              <Text style={styles.suggestionText}>
                Intentá con otro medio de pago
              </Text>
            </View>
            <View style={styles.suggestionRow}>
              <View style={styles.suggestionNumber}>
                <Text style={styles.suggestionNumberText}>4</Text>
              </View>
              <Text style={styles.suggestionText}>
                Si el problema persiste, contactanos por WhatsApp
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Pressable
            onPress={handleRetry}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="refresh-outline" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Intentar nuevamente</Text>
          </Pressable>

          <Pressable
            onPress={handleContactSupport}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="logo-whatsapp" size={20} color={C.primary} />
            <Text style={styles.secondaryBtnText}>Contactar soporte</Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace('/(client)')}
            style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.ghostBtnText}>Volver al inicio</Text>
          </Pressable>
        </View>

        <Text style={styles.footerNote}>
          No te preocupes, no se realizó ningún cargo a tu cuenta
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
  errorHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  errorIconWrap: {
    marginBottom: 8,
  },
  errorTitle: {
    color: C.text,
    fontSize: 28,
    fontWeight: '800',
  },
  errorSubtitle: {
    color: C.muted,
    textAlign: 'center',
    fontSize: 16,
  },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  suggestionCard: {
    borderColor: C.primary,
    backgroundColor: C.primarySoft,
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
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(160,168,176,0.08)',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    color: C.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  suggestionsList: {
    gap: 12,
    marginTop: 4,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  suggestionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  suggestionText: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    lineHeight: 20,
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
