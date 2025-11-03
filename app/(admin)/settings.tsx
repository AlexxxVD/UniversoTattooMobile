import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme';

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
};

type PickerOption = { label: string; value: string };

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme?.() ?? {
    colors: { text: '#fff', textMuted: C.muted },
    spacing: (n: number) => 4 * n,
  };

  // Auth/role gating
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // General
  const [shopName, setShopName] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'MXN' | 'ARS'>('ARS');
  const [about, setAbout] = useState('');

  // Shipping
  const [stdShipping, setStdShipping] = useState('');
  const [freeFrom, setFreeFrom] = useState('');
  const [processing, setProcessing] = useState<'1-2' | '3-5' | '5-7'>('3-5');

  // Payments
  const [payCards, setPayCards] = useState(true);
  const [payPaypal, setPayPaypal] = useState(false);

  // Notifications
  const [notifOrders, setNotifOrders] = useState(true);
  const [notifOOS, setNotifOOS] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(false);

  // Pickers
  const currencyOptions: PickerOption[] = useMemo(
    () => [
      { label: 'ARS - Peso Argentino', value: 'ARS' },
      { label: 'USD - Dólar', value: 'USD' },
      { label: 'EUR - Euro', value: 'EUR' },
      { label: 'MXN - Peso Mexicano', value: 'MXN' },
    ],
    []
  );
  const processingOptions: PickerOption[] = useMemo(
    () => [
      { label: '1-2 días hábiles', value: '1-2' },
      { label: '3-5 días hábiles', value: '3-5' },
      { label: '5-7 días hábiles', value: '5-7' },
    ],
    []
  );
  const [currencyPicker, setCurrencyPicker] = useState(false);
  const [processingPicker, setProcessingPicker] = useState(false);

  // Simular carga inicial de settings (sin romper lógica: no persistimos aún)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Gating
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

  useEffect(() => {
    if (!isAdmin || checkingAuth) return;
    // Preload: valores iniciales (mock locales para no tocar backend)
    setShopName('Mi Tienda Online');
    setCurrency('ARS');
    setAbout('Describe tu tienda...');
    setStdShipping('0');
    setFreeFrom('150000');
    setProcessing('3-5');
    setLoading(false);
  }, [isAdmin, checkingAuth]);

  if (checkingAuth) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['right', 'bottom', 'left']}>
        <HeaderBar title="Configuración" />
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={{ color: C.muted, marginTop: 8 }}>Verificando permisos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['right', 'bottom', 'left']} />;
  }

  const handleSaveGeneral = () => {
    // Aquí iría tu persistencia real (Supabase) si corresponde
    Toast.show({ type: 'success', text1: 'Guardado', text2: 'Configuración general actualizada' });
  };
  const handleSaveStore = () => {
    Toast.show({ type: 'success', text1: 'Guardado', text2: 'Ajustes de tienda actualizados' });
  };
  const handleSaveShipping = () => {
    Toast.show({ type: 'success', text1: 'Guardado', text2: 'Ajustes de envío actualizados' });
  };
  const handleSavePayments = () => {
    Toast.show({ type: 'success', text1: 'Guardado', text2: 'Métodos de pago actualizados' });
  };
  const handleSaveNotifications = () => {
    Toast.show({ type: 'success', text1: 'Guardado', text2: 'Preferencias de notificaciones actualizadas' });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['right', 'bottom', 'left']}>
      <HeaderBar title="Configuración" />
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={C.primary} />
              <Text style={{ color: C.muted, marginTop: 8 }}>Cargando configuración...</Text>
            </View>
          ) : (
            <>
              {/* General */}
              <Card>
                <View style={{ gap: 8 }}>
                  <SectionHeader icon="settings-outline" title="Configuración general" subtitle="Configura los aspectos básicos de tu tienda" />
                  <LabeledInput label="Nombre de la tienda" value={shopName} onChangeText={setShopName} placeholder="Mi Tienda Online" />
                  <LabeledSelect
                    label="Moneda"
                    value={currencyOptions.find((c) => c.value === currency)?.label ?? 'Elegir moneda'}
                    onPress={() => setCurrencyPicker(true)}
                  />
                  <LabeledTextArea label="Descripción" value={about} onChangeText={setAbout} placeholder="Describe tu tienda..." />
                  <Button title="Guardar" onPress={handleSaveGeneral} />
                </View>
              </Card>

              {/* Tienda (apariencia/funcionamiento básicos) */}
              <Card>
                <View style={{ gap: 8 }}>
                  <SectionHeader icon="storefront-outline" title="Tienda" subtitle="Personaliza la apariencia y funcionamiento" />
                  <LabeledInput label="Nombre público" value={shopName} onChangeText={setShopName} placeholder="Mi Tienda Online" />
                  <LabeledSelect
                    label="Moneda"
                    value={currencyOptions.find((c) => c.value === currency)?.label ?? 'Elegir moneda'}
                    onPress={() => setCurrencyPicker(true)}
                  />
                  <LabeledTextArea label="Descripción" value={about} onChangeText={setAbout} placeholder="Describe tu tienda..." />
                  <Button title="Guardar" onPress={handleSaveStore} />
                </View>
              </Card>

              {/* Envíos */}
              <Card>
                <View style={{ gap: 8 }}>
                  <SectionHeader icon="car-outline" title="Envíos" subtitle="Configura las opciones de envío" />
                  <LabeledInput
                    label="Costo de envío estándar"
                    value={stdShipping}
                    onChangeText={(t) => setStdShipping(t.replace(/[^0-9.]/g, ''))}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                  <LabeledInput
                    label="Envío gratis desde"
                    value={freeFrom}
                    onChangeText={(t) => setFreeFrom(t.replace(/\D/g, ''))}
                    placeholder="150000"
                    keyboardType="number-pad"
                  />
                  <LabeledSelect
                    label="Tiempo de procesamiento"
                    value={processingOptions.find((p) => p.value === processing)?.label ?? 'Seleccionar'}
                    onPress={() => setProcessingPicker(true)}
                  />
                  <Button title="Guardar" onPress={handleSaveShipping} />
                </View>
              </Card>

              {/* Pagos */}
              <Card>
                <View style={{ gap: 8 }}>
                  <SectionHeader icon="card-outline" title="Pagos" subtitle="Configura los métodos de pago" />
                  <ToggleRow
                    icon="card-outline"
                    title="Tarjetas de Crédito/Débito"
                    subtitle="Visa, Mastercard, American Express"
                    value={payCards}
                    onValueChange={setPayCards}
                  />
                  <ToggleRow
                    icon="shield-checkmark-outline"
                    title="PayPal"
                    subtitle="Pagos seguros con PayPal"
                    value={payPaypal}
                    onValueChange={setPayPaypal}
                  />
                  <Button title="Guardar" onPress={handleSavePayments} />
                </View>
              </Card>

              {/* Notificaciones */}
              <Card>
                <View style={{ gap: 8 }}>
                  <SectionHeader icon="notifications-outline" title="Notificaciones" subtitle="Ajustá las alertas de tu tienda" />
                  <ToggleRow
                    icon="notifications-outline"
                    title="Nuevos pedidos"
                    subtitle="Aviso cuando llegue un nuevo pedido"
                    value={notifOrders}
                    onValueChange={setNotifOrders}
                  />
                  <ToggleRow
                    icon="alert-circle-outline"
                    title="Productos agotados"
                    subtitle="Notificar cuando un producto se quede sin stock"
                    value={notifOOS}
                    onValueChange={setNotifOOS}
                  />
                  <ToggleRow
                    icon="mail-outline"
                    title="Reportes semanales"
                    subtitle="Resumen semanal de ventas por email"
                    value={notifWeekly}
                    onValueChange={setNotifWeekly}
                  />
                  <Button title="Guardar" onPress={handleSaveNotifications} />
                </View>
              </Card>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Currency Picker */}
      <PickerModal
        visible={currencyPicker}
        title="Seleccionar moneda"
        options={currencyOptions}
        value={currency}
        onClose={() => setCurrencyPicker(false)}
        onSelect={(opt) => {
          setCurrency(opt.value as any);
          setCurrencyPicker(false);
        }}
      />

      {/* Processing Picker */}
      <PickerModal
        visible={processingPicker}
        title="Tiempo de procesamiento"
        options={processingOptions}
        value={processing}
        onClose={() => setProcessingPicker(false)}
        onSelect={(opt) => {
          setProcessing(opt.value as any);
          setProcessingPicker(false);
        }}
      />
    </SafeAreaView>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={icon} size={18} color="#C4B5FD" />
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{title}</Text>
      </View>
      {!!subtitle && <Text style={{ color: C.muted }}>{subtitle}</Text>}
    </View>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: C.text, fontSize: 12, fontWeight: '600' }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        keyboardType={keyboardType}
        style={styles.input}
      />
    </View>
  );
}

function LabeledTextArea({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: C.text, fontSize: 12, fontWeight: '600' }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        multiline
        style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

function LabeledSelect({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: C.text, fontSize: 12, fontWeight: '600' }}>{label}</Text>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.select, pressed && { opacity: 0.95 }]}>
        <Text style={{ color: C.text }} numberOfLines={1}>{value}</Text>
        <Ionicons name="chevron-down" size={18} color={C.muted} />
      </Pressable>
    </View>
  );
}

function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        <Ionicons name={icon} size={18} color="#C4B5FD" />
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontWeight: '700' }}>{title}</Text>
          {!!subtitle && <Text style={{ color: C.muted }}>{subtitle}</Text>}
        </View>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function PickerModal({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: PickerOption[];
  value: string;
  onSelect: (opt: PickerOption) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{title}</Text>
          <ScrollView style={{ maxHeight: 360, marginTop: 10 }}>
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => onSelect(opt)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    active && { backgroundColor: C.primarySoft, borderColor: C.primary },
                    pressed && { opacity: 0.95 },
                  ]}
                >
                  <Ionicons
                    name={active ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={active ? C.primary : C.muted}
                  />
                  <Text style={{ color: C.text, flex: 1 }}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.9 }]}>
            <Ionicons name="close-outline" size={18} color={C.muted} />
            <Text style={{ color: C.muted, fontWeight: '700' }}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },

  input: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#11151B',
    paddingHorizontal: 12,
    color: C.text,
  },
  select: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#11151B',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  toggleRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#11151B',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '92%', borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, padding: 12, gap: 10 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  closeBtn: { alignSelf: 'center', flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)' },
});