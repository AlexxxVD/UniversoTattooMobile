import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useCartStore } from '../../lib/cart-store';
import { ocaCotizar, ocaSucursales } from '../../lib/oca';
import { supabase } from '../../lib/supabase';

const FREE_SHIPPING_MIN = 150_000;

const C = {
  bg: '#0E1116',
  card: '#141821',
  border: '#2A2F3A',
  text: '#F3F4F6',
  muted: '#A0A8B0',
  primary: '#7C3AED',
  primarySoft: 'rgba(124,58,237,0.14)',
  info: '#60A5FA',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
};

function money(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function validatePostalCode(code: string): Promise<boolean> {
  return /^\d{4}$/.test(code);
}
async function getProvinceByPostalCode(code: string): Promise<string> {
  if (!/^\d{4}$/.test(code)) return 'Consultar';
  const cp = Number(code);
  if (cp >= 1000 && cp <= 1499) return 'Ciudad Autónoma de Buenos Aires';
  if (cp >= 1500 && cp <= 1999) return 'Buenos Aires';
  if (cp >= 3100 && cp <= 3399) return 'Entre Ríos';
  if (cp >= 3400 && cp <= 3599) return 'Corrientes';
  if (cp >= 3300 && cp <= 3399) return 'Misiones';
  return 'Consultar';
}

type ShippingMethod = 'delivery' | 'branch' | 'pickup';
type PaymentMethod = 'mercadopago' | 'transfer' | 'cash';

export default function CheckoutScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < 400;

  const { items, clearCart, getTotalPrice, getDiscountAmount, getTotalItems, appliedCoupon } = useCartStore();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mercadopago');
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('delivery');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [shippingCost, setShippingCost] = useState(0);
  const [selectedShippingOption, setSelectedShippingOption] =
    useState<{ precio: number; plazoEntrega?: string; descripcion?: string } | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);

  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);

  const [provPicker, setProvPicker] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dni: '',
    calle: '',
    numero: '',
    departamento: '',
    barrio: '',
    city: '',
    province: '',
    postalCode: '',
    notes: '',
  });
  const [provinceError, setProvinceError] = useState('');
  const [postalCodeError, setPostalCodeError] = useState('');
  const [isValidatingPostalCode, setIsValidatingPostalCode] = useState(false);

  const subtotal = useMemo(() => getTotalPrice(), [getTotalPrice]);
  const discount = useMemo(() => getDiscountAmount(), [getDiscountAmount]);
  const count = useMemo(() => getTotalItems(), [getTotalItems]);
  const isFreeShippingEligible = subtotal >= FREE_SHIPPING_MIN;

  const orderSummary = useMemo(() => {
    const shipping = shippingMethod === 'pickup' ? 0 : shippingCost;
    const total = Math.max(0, subtotal - discount + shipping);
    const normalizedItems = items.map((it: any) => {
      const qty = Number(it.quantity ?? it.cantidad ?? 1);
      return {
        id: String(it.id ?? it.id_producto ?? `${Date.now()}-${Math.random()}`),
        name: it.nombre ?? it.name ?? 'Producto',
        quantity: qty,
        price: Number(it.precio ?? it.price ?? 0),
        stock: Number(it.stock ?? 999),
      };
    });
    return { items: normalizedItems, subtotal, discount, shipping, total, isFreeShippingEligible };
  }, [items, subtotal, discount, shippingCost, shippingMethod, isFreeShippingEligible]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const { data: ses } = await supabase.auth.getSession();
        const user = ses.session?.user;
        if (user) {
          setFormData((prev) => ({
            ...prev,
            email: prev.email || user.email || '',
            firstName: prev.firstName || (user.user_metadata?.name?.split?.(' ')?.[0] ?? ''),
            lastName: prev.lastName || (user.user_metadata?.name?.split?.(' ')?.slice(1).join(' ') ?? ''),
          }));
        }
        setProfileLoaded(true);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    const run = async () => {
      const cp = formData.postalCode;
      if (/^\d{4}$/.test(cp)) {
        const prov = await getProvinceByPostalCode(cp);
        setFormData((p) => ({ ...p, province: prov === 'Consultar' ? p.province : prov }));
        setProvinceError(prov === 'Consultar' ? 'No se pudo determinar la provincia. Seleccionala manualmente.' : '');
      } else if (cp && cp.length < 4) {
        setProvinceError('');
      }
    };
    run();
  }, [formData.postalCode]);

  useEffect(() => {
    const calc = async () => {
      if (shippingMethod === 'pickup') {
        setSelectedShippingOption(null);
        setShippingCost(0);
        return;
      }
      if (!/^\d{4}$/.test(formData.postalCode)) {
        setSelectedShippingOption(null);
        setShippingCost(0);
        return;
      }

      setIsCalculatingShipping(true);

      const pesoTotal = Math.max(0.1, orderSummary.items.reduce((acc, _) => acc + 0.2, 0));
      const volumenTotal = Math.max(0.001, orderSummary.items.reduce((acc, _) => acc + 0.002, 0));
      const operativa = shippingMethod === 'branch' ? '414610' : '414609';

      try {
        const cot = await ocaCotizar({
          pesoTotal,
          volumenTotal,
          codigoPostalOrigen: '3260',
          codigoPostalDestino: formData.postalCode,
          cantidadPaquetes: Math.max(1, orderSummary.items.length),
          valorDeclarado: Math.max(100, Math.round(orderSummary.subtotal)),
          operativa,
          useTest: false,
        });

        if (cot.ok && cot.data?.length) {
          const opt = cot.data[0];
          setSelectedShippingOption(opt);
          setShippingCost(isFreeShippingEligible ? 0 : (opt.precio ?? 0));
        } else {
          setSelectedShippingOption(null);
          setShippingCost(0);
        }
      } catch (e) {
        console.warn('[checkout] cotizar error:', e);
        setSelectedShippingOption(null);
        setShippingCost(0);
      } finally {
        setIsCalculatingShipping(false);
      }
    };
    calc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingMethod, formData.postalCode, orderSummary.subtotal, isFreeShippingEligible]);

  const handleInputChange = (name: keyof typeof formData, value: string) => {
    if (name === 'postalCode') {
      const cleaned = value.replace(/\D/g, '').slice(0, 4);
      setFormData((p) => ({ ...p, postalCode: cleaned }));
      if (cleaned.length < 4) {
        setPostalCodeError('');
        setSelectedShippingOption(null);
        setShippingCost(0);
        return;
      }
      setIsValidatingPostalCode(true);
      validatePostalCode(cleaned)
        .then((ok) => setPostalCodeError(ok ? '' : 'Código postal inválido'))
        .finally(() => setIsValidatingPostalCode(false));
    } else {
      setFormData((p) => ({ ...p, [name]: value }));
    }
  };

  const fetchBranches = async () => {
    if (!/^\d{4}$/.test(formData.postalCode)) {
      Alert.alert('Código postal', 'Ingresá un código postal válido (4 dígitos)');
      return;
    }
    try {
      const resp = await ocaSucursales(formData.postalCode, false);
      if (resp.ok && resp.data) {
        setBranches(resp.data);
        setBranchModalVisible(true);
      } else {
        Alert.alert('Sucursales', 'No se encontraron sucursales para ese CP.');
      }
    } catch (e) {
      console.warn('[checkout] sucursales error:', e);
      Alert.alert('Sucursales', 'No se pudieron obtener sucursales.');
    }
  };

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.dni) {
      Alert.alert('Campos requeridos', 'Completá nombre, apellido, email, teléfono y DNI.');
      return;
    }
    if (shippingMethod !== 'pickup') {
      if (!formData.calle || !formData.numero || !formData.city || !formData.province || !formData.postalCode) {
        Alert.alert('Dirección requerida', 'Completá los datos de envío.');
        return;
      }
      if (!(await validatePostalCode(formData.postalCode)) || postalCodeError) {
        Alert.alert('Código postal inválido', 'Ingresá un código postal de 4 dígitos válido.');
        return;
      }
      if (shippingMethod === 'delivery' && !isFreeShippingEligible && !selectedShippingOption) {
        Alert.alert('Envío no disponible', 'No se pudo calcular el costo de envío.');
        return;
      }
      if (shippingMethod === 'branch' && !selectedBranch) {
        Alert.alert('Sucursal requerida', 'Seleccioná una sucursal OCA.');
        return;
      }
    }
    if (paymentMethod === 'cash' && shippingMethod !== 'pickup') {
      Alert.alert('Combinación no válida', 'El pago en efectivo solo está disponible para retiro en tienda.');
      return;
    }
    if (!acceptTerms) {
      Alert.alert('Términos', 'Debés aceptar los términos y condiciones.');
      return;
    }
    if (orderSummary.items.some((i) => i.quantity > i.stock && i.stock < 999)) {
      Alert.alert('Stock insuficiente', 'Hay productos sin stock suficiente.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: ses } = await supabase.auth.getSession();
      const user = ses.session?.user;

      let cliente: any = null;
      if (user) {
        const { data: cli } = await supabase.from('Cliente').select('*').eq('userId', user.id).maybeSingle();
        if (cli) cliente = cli;
        else {
          const { data: newCli, error: cliErr } = await supabase
            .from('Cliente')
            .insert({
              userId: user.id,
              email: user.email!,
              nombre: formData.firstName || 'Cliente',
              apellido: formData.lastName || '',
              telefono: formData.phone || '',
              dni: formData.dni || '',
              direccion: formData.calle ? `${formData.calle} ${formData.numero}` : null,
              ciudad: formData.city || null,
              provincia: formData.province || null,
              codigo_postal: formData.postalCode || null,
              acepta_marketing: false,
            })
            .select('*')
            .single();
          if (cliErr) throw cliErr;
          cliente = newCli;
        }
      }

      const numeroPedido = `PED-${Date.now()}`;
      const fechaISO = new Date().toISOString();

      const { data: pedido, error: pedErr } = await supabase
        .from('Pedido')
        .insert({
          clienteId: cliente?.id_cliente ?? null,
          numero_pedido: numeroPedido,
          subtotal: orderSummary.subtotal,
          envio: orderSummary.shipping,
          impuestos: 0,
          total: orderSummary.total,
          fecha_pedido: fechaISO,
          estado_pago: 'PENDIENTE',
          estado: 'PENDIENTE',
          nombre_comprador: `${formData.firstName} ${formData.lastName}`,
          email_comprador: formData.email,
          telefono_comprador: formData.phone,
          direccion_envio: shippingMethod !== 'pickup' ? `${formData.calle} ${formData.numero}${formData.departamento ? `, ${formData.departamento}` : ''}` : null,
          ciudad_envio: shippingMethod !== 'pickup' ? formData.city : null,
          provincia_envio: shippingMethod !== 'pickup' ? formData.province : null,
          cp_envio: shippingMethod !== 'pickup' ? formData.postalCode : null,
          metodo_envio: shippingMethod.toUpperCase(),
          sucursal_envio: shippingMethod === 'branch' ? (selectedBranch?.nombre ?? null) : null,
          notas: formData.notes || null,
          metodo_pago: paymentMethod.toUpperCase(),
          cupon_descuento: appliedCoupon?.code ?? null,
          cupon_porcentaje: appliedCoupon?.discount ?? null,
        })
        .select('*')
        .single();
      if (pedErr) throw pedErr;

      const rows = orderSummary.items.map((it) => ({
        pedidoId: pedido.id_pedido,
        productoId: Number(it.id),
        varianteId: null,
        cantidad: it.quantity,
        precio_unitario: it.price,
        descuento: 0,
      }));
      const { error: ppErr } = await supabase.from('PedidoProducto').insert(rows);
      if (ppErr) throw ppErr;

      clearCart();
      Alert.alert('Pedido creado', `Tu pedido ${numeroPedido} fue generado correctamente.`);
      router.replace('/(client)');
    } catch (e: any) {
      console.error('Checkout error:', e?.message ?? e);
      Alert.alert('Error', e?.message ?? 'No se pudo completar la compra.');
    } finally {
      setIsSubmitting(false);
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={styles.emptyRoot}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="cube-outline" size={40} color={C.muted} />
          </View>
          <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
          <Text style={styles.emptyText}>Agregá productos antes de finalizar la compra.</Text>
          <Pressable onPress={() => router.replace('/(client)')} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}>
            <Ionicons name="cart-outline" size={16} color="#fff" />
            <Text style={styles.primaryText}>Explorar productos</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 28 }]}>
          <View style={[styles.headerRow, { flexWrap: 'wrap' }]}>
            <View style={styles.headerIcon}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1, minWidth: 220 }}>
              <Text style={styles.headerTitle}>Finalizar compra</Text>
              <Text style={styles.headerSubtitle}>Completá tu pedido de forma segura</Text>
              {isLoadingProfile && <Text style={styles.infoBlue}>Cargando información del perfil...</Text>}
              {profileLoaded && !isLoadingProfile && <Text style={styles.infoGreen}>Información pre-cargada desde tu perfil</Text>}
              {!isLoadingProfile && <Text style={styles.infoBlue}>Podés comprar sin crear cuenta</Text>}
            </View>
            <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.9 }]}>
              <Ionicons name="arrow-back-outline" size={16} color={C.primary} />
              <Text style={[styles.ghostText, { color: C.primary }]}>Volver</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <CardHeader icon="person-outline" title="Información personal" />
            <View style={[styles.row, isCompact && styles.stack]}>
              <Field style={styles.flex} label="Nombre *" value={formData.firstName} onChangeText={(v) => handleInputChange('firstName', v)} placeholder="Juan" />
              <Field style={styles.flex} label="Apellido *" value={formData.lastName} onChangeText={(v) => handleInputChange('lastName', v)} placeholder="Pérez" />
            </View>
            <View style={[styles.row, isCompact && styles.stack]}>
              <Field style={styles.flex} label="Email *" value={formData.email} onChangeText={(v) => handleInputChange('email', v)} placeholder="correo@ejemplo.com" keyboardType="email-address" />
              <Field style={styles.flex} label="Teléfono *" value={formData.phone} onChangeText={(v) => handleInputChange('phone', v)} placeholder="11 2345-6789" keyboardType="phone-pad" />
            </View>
            <Field label="DNI *" value={formData.dni} onChangeText={(v) => handleInputChange('dni', v.replace(/\D/g, '').slice(0, 8))} placeholder="12345678" keyboardType="number-pad" />
          </View>

          <View style={styles.card}>
            <CardHeader icon="car-outline" title="Método de entrega" />
            <View style={{ gap: 10 }}>
              <RadioRow label="Envío a domicilio" description="Gratis desde $150.000" icon="home-outline" active={shippingMethod === 'delivery'} onPress={() => setShippingMethod('delivery')} />
              <RadioRow label="Envío a sucursal OCA" description="Retirá en una sucursal cercana" icon="location-outline" active={shippingMethod === 'branch'} onPress={() => setShippingMethod('branch')} />
              <RadioRow label="Retiro en tienda" description="Bartolomé Mitre 587, Concepción del Uruguay" icon="storefront-outline" active={shippingMethod === 'pickup'} onPress={() => setShippingMethod('pickup')} />
            </View>

            {shippingMethod !== 'pickup' && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.sectionTitle}>{shippingMethod === 'delivery' ? 'Dirección de envío' : 'Dirección de facturación'}</Text>

                <View style={[styles.row, isCompact && styles.stack]}>
                  <Field style={[styles.flex, { flex: 2 }]} label="Calle *" value={formData.calle} onChangeText={(v) => handleInputChange('calle', v)} placeholder="Av. Corrientes" />
                  <Field style={styles.flex} label="Número *" value={formData.numero} onChangeText={(v) => handleInputChange('numero', v)} placeholder="1234" />
                </View>

                <View style={[styles.row, isCompact && styles.stack]}>
                  <Field style={styles.flex} label="Departamento (opcional)" value={formData.departamento} onChangeText={(v) => handleInputChange('departamento', v)} placeholder="4B" />
                  <Field style={styles.flex} label="Barrio (opcional)" value={formData.barrio} onChangeText={(v) => handleInputChange('barrio', v)} placeholder="Palermo" />
                </View>

                <View style={[styles.row, isCompact && styles.stack]}>
                  <Field style={styles.flex} label="Ciudad *" value={formData.city} onChangeText={(v) => handleInputChange('city', v)} placeholder="Buenos Aires" />
                  <View style={[styles.field, styles.flex]}>
                    <Text style={styles.label}>Provincia *</Text>
                    <Pressable onPress={() => setProvPicker(true)} style={styles.select}>
                      <Text style={[styles.selectText, !formData.province && { color: C.muted }]} numberOfLines={1}>
                        {formData.province || 'Seleccioná provincia'}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color={C.muted} />
                    </Pressable>
                    {!!provinceError && <Text style={styles.errorText}>{provinceError}</Text>}
                  </View>
                  <View style={[styles.field, styles.flex]}>
                    <Text style={styles.label}>Código Postal *</Text>
                    <TextInput
                      style={[styles.input, !!postalCodeError && { borderColor: C.danger }]}
                      value={formData.postalCode}
                      onChangeText={(v) => handleInputChange('postalCode', v)}
                      placeholder="1425"
                      placeholderTextColor={C.muted}
                      keyboardType="number-pad"
                      maxLength={4}
                    />
                    {isValidatingPostalCode && <Text style={styles.infoBlue}>Validando código postal...</Text>}
                    {!!postalCodeError && <Text style={styles.errorText}>{postalCodeError}</Text>}
                    {formData.postalCode.length > 0 && formData.postalCode.length < 4 && (
                      <Text style={styles.warnText}>El código postal debe tener 4 dígitos</Text>
                    )}
                  </View>
                </View>

                {selectedShippingOption && (
                  <View style={styles.shippingOption}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.textStrong}>
                        {shippingMethod === 'delivery' ? 'OCA Sucursal a Puerta' : 'OCA Sucursal a Sucursal'}
                      </Text>
                      <Text style={styles.mutedText}>
                        {shippingMethod === 'delivery' ? 'Envío a domicilio' : 'Envío a sucursal'} • CP: {formData.postalCode}
                      </Text>
                      {!!selectedShippingOption.plazoEntrega && (
                        <Text style={[styles.mutedText, { color: C.info }]}>{selectedShippingOption.plazoEntrega}</Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {isFreeShippingEligible ? (
                        <>
                          <Text style={{ color: C.success, fontWeight: '700' }}>¡GRATIS!</Text>
                          <Text style={[styles.mutedText, { textDecorationLine: 'line-through' }]}>{money(selectedShippingOption.precio)}</Text>
                        </>
                      ) : (
                        <Text style={{ color: C.success, fontWeight: '700' }}>{money(selectedShippingOption.precio)}</Text>
                      )}
                    </View>
                  </View>
                )}

                {isCalculatingShipping && <Text style={styles.infoBlue}>Calculando envío...</Text>}

                {shippingMethod === 'branch' && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.sectionTitle}>Seleccionar sucursal OCA</Text>
                    {selectedBranch ? (
                      <View style={styles.branchCard}>
                        <Text style={styles.text}>{selectedBranch.nombre}</Text>
                        <Text style={styles.mutedText}>{selectedBranch.direccion}</Text>
                        <Text style={styles.mutedText}>
                          {selectedBranch.localidad}, {selectedBranch.provincia} ({selectedBranch.codigoPostal})
                        </Text>
                        <View style={[styles.row, { marginTop: 8 }]}>
                          <Pressable onPress={() => setSelectedBranch(null)} style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.9 }]}>
                            <Ionicons name="trash-outline" size={16} color="#FCA5A5" />
                            <Text style={[styles.ghostText, { color: '#FCA5A5' }]}>Quitar</Text>
                          </Pressable>
                          <Pressable onPress={fetchBranches} style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.9 }]}>
                            <Ionicons name="refresh-outline" size={16} color={C.primary} />
                            <Text style={[styles.ghostText, { color: C.primary }]}>Buscar otra</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <Pressable onPress={fetchBranches} style={({ pressed }) => [styles.select, pressed && { opacity: 0.95 }]}>
                        <Text style={[styles.selectText, { color: C.muted }]} numberOfLines={1}>Elegir sucursal OCA</Text>
                        <Ionicons name="search-outline" size={18} color={C.muted} />
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            )}

            {shippingMethod === 'pickup' && (
              <View style={{ marginTop: 12 }}>
                <View style={styles.pickupCard}>
                  <Text style={styles.textStrong}>Universo Tattoo</Text>
                  <Text style={styles.mutedText}>Bartolomé Mitre 587</Text>
                  <Text style={styles.mutedText}>Concepción del Uruguay, Entre Ríos</Text>
                  <Text style={styles.mutedText}>CP: 3260</Text>
                  <View style={styles.separator} />
                  <Text style={{ color: C.success }}>✓ Retiro gratuito</Text>
                  <Text style={styles.mutedText}>Lunes a Viernes 9:00 - 18:00</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <CardHeader icon="card-outline" title="Método de pago" />
            <View style={{ gap: 10 }}>
              <RadioRow label="Mercado Pago" description="Crédito, débito o dinero en cuenta" icon="logo-usd" active={paymentMethod === 'mercadopago'} onPress={() => setPaymentMethod('mercadopago')} />
              <RadioRow label="Transferencia" description="Transferencia o depósito bancario" icon="business-outline" active={paymentMethod === 'transfer'} onPress={() => setPaymentMethod('transfer')} />
              <RadioRow label="Pago al retirar" description="Solo disponible para retiro en tienda" icon="cash-outline" active={paymentMethod === 'cash'} onPress={() => setPaymentMethod('cash')} />
            </View>

            {paymentMethod === 'transfer' && (
              <View style={styles.noticeBlue}>
                <Text style={styles.noticeTitle}>Datos para transferencia</Text>
                <Text style={styles.mutedText}>Banco: Mercado Pago</Text>
                <Text style={styles.mutedText}>CBU: 0000003100035600129127</Text>
                <Text style={styles.mutedText}>Alias: amoruniverso859</Text>
                <Text style={styles.mutedText}>Titular: Maria Carolina Roude</Text>
                <Text style={styles.mutedText}>CUIT/CUIL: 27-26306559-5</Text>
              </View>
            )}
            {paymentMethod === 'cash' && shippingMethod === 'delivery' && (
              <View style={styles.noticeAmber}>
                <Text style={styles.noticeTitle}>El efectivo solo aplica a "Retiro en tienda".</Text>
                <Text style={styles.mutedText}>Cambiá el método de envío a "Retiro en tienda".</Text>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <CardHeader icon="create-outline" title="Notas adicionales (opcional)" />
            <TextInput
              style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
              multiline
              value={formData.notes}
              onChangeText={(v) => handleInputChange('notes', v)}
              placeholder="Instrucciones para la entrega, horarios preferidos, etc."
              placeholderTextColor={C.muted}
            />
          </View>

          <View style={styles.card}>
            <CardHeader title={`Resumen del pedido (${count} productos)`} />
            <View style={{ gap: 10 }}>
              {orderSummary.items.map((it) => (
                <View key={it.id} style={styles.summaryRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.text} numberOfLines={2}>{it.name}</Text>
                    <Text style={styles.mutedText}>Cantidad: {it.quantity}</Text>
                    {it.quantity > it.stock && it.stock < 999 && (
                      <Text style={[styles.mutedText, { color: '#F87171' }]}>⚠️ Stock disponible: {it.stock}</Text>
                    )}
                  </View>
                  <Text style={styles.textStrong}>{money(it.price * it.quantity)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.separator} />
            <View style={styles.summaryLine}>
              <Text style={styles.mutedText}>Subtotal</Text>
              <Text style={styles.text}>{money(orderSummary.subtotal)}</Text>
            </View>
            {!!appliedCoupon && (
              <View style={styles.summaryLine}>
                <Text style={[styles.mutedText, { color: C.success }]}>Descuento ({appliedCoupon.discount}%)</Text>
                <Text style={[styles.text, { color: C.success }]}>- {money(orderSummary.discount)}</Text>
              </View>
            )}
            <View style={styles.summaryLine}>
              <Text style={styles.mutedText}>Envío</Text>
              <Text style={[styles.text, isFreeShippingEligible && { color: C.success, fontWeight: '700' }]}>
                {isFreeShippingEligible ? 'Gratis' : isCalculatingShipping ? 'Calculando...' : money(orderSummary.shipping)}
              </Text>
            </View>

            <View style={styles.separator} />
            <View style={styles.summaryLine}>
              <Text style={styles.total}>Total</Text>
              <Text style={styles.total}>{money(orderSummary.total)}</Text>
            </View>

            <Pressable onPress={() => setAcceptTerms((v) => !v)} style={styles.termsRow}>
              <Ionicons name={acceptTerms ? 'checkbox-outline' : 'square-outline'} size={22} color={acceptTerms ? C.primary : C.muted} />
              <Text style={styles.termsText}>
                Acepto los <Text style={styles.link}>términos</Text> y la <Text style={styles.link}>política de privacidad</Text>
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={
                isSubmitting ||
                isProcessing ||
                !acceptTerms ||
                (paymentMethod === 'cash' && shippingMethod === 'delivery') ||
                orderSummary.items.some((i) => i.quantity > i.stock)
              }
              style={({ pressed }) => [
                styles.submitBtn,
                (isSubmitting || isProcessing) && { opacity: 0.7 },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Ionicons name={isProcessing || isSubmitting ? 'time-outline' : 'checkmark-circle-outline'} size={16} color="#fff" />
              <Text style={styles.submitText}>
                {isProcessing || isSubmitting
                  ? paymentMethod === 'mercadopago' ? 'Redirigiendo...' : 'Procesando...'
                  : paymentMethod === 'mercadopago' ? 'Pagar con Mercado Pago' : 'Confirmar pedido'}
              </Text>
            </Pressable>
            <Text style={styles.secureNote}>🔒 Compra 100% segura • SSL certificado • Garantía de calidad</Text>
          </View>
        </ScrollView>

        <ProvincePicker
          visible={provPicker}
          onClose={() => setProvPicker(false)}
          value={formData.province}
          onSelect={(prov) => {
            setFormData((p) => ({ ...p, province: prov }));
            setProvinceError('');
            setProvPicker(false);
          }}
        />

        <Modal visible={branchModalVisible} transparent animationType="fade" onRequestClose={() => setBranchModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { width: '92%' }]}>
              <Text style={styles.cardTitle}>Sucursales OCA ({branches.length})</Text>
              <ScrollView style={{ maxHeight: 420, marginTop: 8 }}>
                {branches.map((b) => (
                  <Pressable
                    key={b.id ?? `${b.nombre}-${b.codigoPostal}`}
                    onPress={() => {
                      setSelectedBranch(b);
                      setBranchModalVisible(false);
                    }}
                    style={({ pressed }) => [styles.optionRow, pressed && { backgroundColor: C.primarySoft }]}
                  >
                    <Ionicons
                      name={selectedBranch?.id === b.id ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={selectedBranch?.id === b.id ? C.primary : C.muted}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.text} numberOfLines={1}>{b.nombre}</Text>
                      <Text style={styles.mutedText} numberOfLines={1}>{b.direccion}</Text>
                      <Text style={styles.mutedText} numberOfLines={1}>{b.localidad}, {b.provincia} ({b.codigoPostal})</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable onPress={() => setBranchModalVisible(false)} style={({ pressed }) => [styles.ghostBtn, { marginTop: 12 }, pressed && { opacity: 0.9 }]}>
                <Ionicons name="close-outline" size={16} color={C.muted} />
                <Text style={styles.ghostText}>Cerrar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CardHeader({ icon, title }: { icon?: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={styles.cardHeader}>
      {icon ? <Ionicons name={icon} size={18} color="#C4B5FD" /> : null}
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
  );
}

function Field(props: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; keyboardType?: any; style?: any }) {
  return (
    <View style={[styles.field, props.style]}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={C.muted}
        keyboardType={props.keyboardType}
        autoCapitalize="none"
      />
    </View>
  );
}

function RadioRow({
  label,
  description,
  icon,
  active,
  onPress,
}: {
  label: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.radioRow, active && styles.radioActive, pressed && { opacity: 0.95 }]}>
      <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={20} color={active ? C.primary : C.muted} />
      <View style={{ flex: 1 }}>
        <Text style={styles.text}>{label}</Text>
        {!!description && <Text style={styles.mutedText}>{description}</Text>}
      </View>
      <Ionicons name={icon} size={18} color="#C4B5FD" />
    </Pressable>
  );
}

function ProvincePicker({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: string;
  onSelect: (prov: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const PROVS = [
    'Buenos Aires','Ciudad Autónoma de Buenos Aires','Catamarca','Chaco','Chubut','Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán',
  ];
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return PROVS;
    return PROVS.filter((p) => p.toLowerCase().includes(s));
  }, [q]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { width: '92%' }]}>
          <Text style={styles.cardTitle}>Seleccionar provincia</Text>
          <TextInput style={styles.input} placeholder="Buscar..." placeholderTextColor={C.muted} value={q} onChangeText={setQ} />
          <ScrollView style={{ maxHeight: 320, marginTop: 8 }}>
            {list.map((p) => (
              <Pressable key={p} onPress={() => onSelect(p)} style={({ pressed }) => [styles.optionRow, pressed && { backgroundColor: C.primarySoft }]}>
                <Ionicons name={value === p ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={value === p ? C.primary : C.muted} />
                <Text style={styles.text}>{p}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.ghostBtn, { marginTop: 12 }, pressed && { opacity: 0.9 }]}>
            <Ionicons name="close-outline" size={16} color={C.muted} />
            <Text style={styles.ghostText}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, backgroundColor: C.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.text, fontSize: 20, fontWeight: '800' },
  headerSubtitle: { color: C.muted },
  infoBlue: { color: C.info, fontSize: 12, marginTop: 2 },
  infoGreen: { color: C.success, fontSize: 12, marginTop: 2 },

  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: C.text, fontWeight: '800', fontSize: 16 },

  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stack: { flexDirection: 'column' },
  flex: { flex: 1 },

  field: { flex: 1 },
  label: { color: C.text, opacity: 0.9, marginBottom: 6, fontSize: 12 },
  input: { height: 46, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border, color: C.text, backgroundColor: '#11151B' },
  select: { height: 46, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border, backgroundColor: '#11151B', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectText: { color: C.text },

  sectionTitle: { color: C.text, fontWeight: '700', marginBottom: 6 },

  mutedText: { color: C.muted },
  text: { color: C.text },
  textStrong: { color: C.text, fontWeight: '800' },

  radioRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: '#11151B' },
  radioActive: { borderColor: C.primary, backgroundColor: C.primarySoft },

  shippingOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#335d94', backgroundColor: 'rgba(59,130,246,0.12)', marginTop: 10 },

  branchCard: { borderWidth: 1, borderColor: C.border, backgroundColor: '#11151B', borderRadius: 12, padding: 10 },

  pickupCard: { borderWidth: 1, borderColor: C.border, backgroundColor: '#11151B', borderRadius: 12, padding: 10 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  separator: { height: 1, backgroundColor: C.border, marginVertical: 8 },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  total: { color: C.text, fontSize: 18, fontWeight: '800' },

  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  termsText: { color: C.text, flex: 1 },
  link: { color: C.primary, textDecorationLine: 'underline' },

  submitBtn: { height: 48, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 8 },
  submitText: { color: '#fff', fontWeight: '700' },
  secureNote: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 6 },

  ghostBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.1)' },
  ghostText: { color: C.text, fontWeight: '600' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, alignSelf: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },

  emptyRoot: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  emptyIconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#141821', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: C.text, fontSize: 22, fontWeight: '800' },
  emptyText: { color: C.muted, textAlign: 'center' },

  noticeBlue: { marginTop: 10, borderWidth: 1, borderColor: 'rgba(37,99,235,0.35)', backgroundColor: 'rgba(30,58,138,0.3)', borderRadius: 10, padding: 10, gap: 4 },
  noticeAmber: { marginTop: 10, borderWidth: 1, borderColor: 'rgba(251,191,36,0.35)', backgroundColor: 'rgba(120,53,15,0.3)', borderRadius: 10, padding: 10, gap: 4 },
  noticeTitle: { color: C.text, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, padding: 12 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },

  // Faltaban en tu build: mensajes para inputs
  errorText: { color: C.danger, fontSize: 12, marginTop: 4 },
  warnText: { color: C.warning, fontSize: 12, marginTop: 4 },
});