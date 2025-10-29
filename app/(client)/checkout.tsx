import { Ionicons } from '@expo/vector-icons';
import * as LinkingExpo from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { apiPost } from '../../lib/api';
import { useCartStore } from '../../lib/cart-store';
import { ocaCotizar, ocaSucursales } from '../../lib/oca';
import { supabase } from '../../lib/supabase';

const FREE_SHIPPING_MIN = 150_000;
const USE_WEB_API_CHECKOUT = process.env.EXPO_PUBLIC_USE_WEB_API_CHECKOUT === '1';

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

// Overlay simple de debug (se muestra solo si EXPO_PUBLIC_DEBUG_CHECKOUT=1)
function CheckoutDebug({
  step,
  error,
  extra,
  onClear,
}: {
  step?: string;
  error?: string | null;
  extra?: Record<string, any>;
  onClear?: () => void;
}) {
  const show = process.env.EXPO_PUBLIC_DEBUG_CHECKOUT === '1';
  if (!show) return null;
  return (
    <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
      <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 10 }}>
        <Text style={{ color: '#C4B5FD', fontWeight: '900', marginBottom: 6 }}>Checkout Debug</Text>
        {!!step && (
          <Text style={{ color: C.text }}>
            Paso: <Text style={{ fontFamily: 'monospace' }}>{step}</Text>
          </Text>
        )}
        {!!error && (
          <Text style={{ color: '#FCA5A5' }}>
            Error: <Text style={{ fontFamily: 'monospace' }}>{error}</Text>
          </Text>
        )}
        {!!extra &&
          Object.entries(extra).map(([k, v]) => (
            <Text key={k} style={{ color: C.muted }}>
              {k}: <Text style={{ fontFamily: 'monospace' }}>{safe(v)}</Text>
            </Text>
          ))}
        <Pressable
          onPress={onClear}
          style={({ pressed }) => [
            {
              marginTop: 8,
              alignSelf: 'flex-start',
              backgroundColor: C.primary,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
            },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>Limpiar</Text>
        </Pressable>
      </View>
    </View>
  );
}
function safe(v: any) {
  try {
    if (typeof v === 'string') return v;
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

// Helper para mensajes de error en catch unknown
function getErrMsg(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

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
    useState<{ precio: number; plazoEntrega?: string; descripcion?: string; operativa?: string } | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);

  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);

  const [provPicker, setProvPicker] = useState(false);

  const [dbgStep, setDbgStep] = useState<string>('mounted');
  const [dbgError, setDbgError] = useState<string | null>(null);

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
      const productId = String(it.id ?? it.id_producto ?? it.productoId ?? it.productId ?? '');
      return {
        id: productId,
        variantId: it.variantId ?? it.varianteId ?? null,
        name: it.nombre ?? it.name ?? 'Producto',
        quantity: qty,
        price: Number(it.precio ?? it.price ?? 0),
        stock: Number(it.stock ?? 999),
      };
    });

    return { items: normalizedItems, subtotal, discount, shipping, total, isFreeShippingEligible };
  }, [items, subtotal, discount, shippingCost, shippingMethod, isFreeShippingEligible]);

  useEffect(() => {
    const USE_WEB = process.env.EXPO_PUBLIC_USE_WEB_API_CHECKOUT === '1';
    const API_BASE = process.env.EXPO_PUBLIC_API_BASE;
    console.log('[checkout] mounted', {
      USE_WEB,
      API_BASE,
      items: items.length,
      subtotal,
      discount,
      shippingMethod,
      paymentMethod,
    });
    setDbgStep('mounted');
  }, []); // intencional: solo al montar

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoadingProfile(true);
        setDbgStep('profile:load:start');
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
        setDbgStep('profile:load:done');
      } catch (e: any) {
        console.warn('[checkout] profile load error:', e?.message ?? e);
        setDbgError(e?.message ?? String(e));
        setDbgStep('profile:load:error');
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
        setDbgStep('province:resolve');
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
        setDbgStep('shipping:pickup');
        setSelectedShippingOption(null);
        setShippingCost(0);
        return;
      }
      if (!/^\d{4}$/.test(formData.postalCode)) {
        setDbgStep('shipping:skip:cp');
        setSelectedShippingOption(null);
        setShippingCost(0);
        return;
      }

      setIsCalculatingShipping(true);
      setDbgStep('shipping:calc:start');

      const pesoTotal = Math.max(0.1, orderSummary.items.reduce((acc, _) => acc + 0.2, 0));
      const volumenTotal = Math.max(0.001, orderSummary.items.reduce((acc, _) => acc + 0.002, 0));
      const operativa = shippingMethod === 'branch' ? '414610' : '414609';

      try {
        console.log('[checkout] cotizar input', {
          pesoTotal,
          volumenTotal,
          cpDestino: formData.postalCode,
          paquetes: Math.max(1, orderSummary.items.length),
          valorDeclarado: Math.max(100, Math.round(orderSummary.subtotal)),
          operativa,
        });
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

        console.log('[checkout] cotizar resp', cot);
        if (cot.ok && cot.data?.length) {
          const opt = cot.data[0];
          setSelectedShippingOption({ ...opt, operativa });
          setShippingCost(isFreeShippingEligible ? 0 : (opt.precio ?? 0));
          setDbgStep('shipping:calc:ok');
        } else {
          setSelectedShippingOption(null);
          setShippingCost(0);
          setDbgStep('shipping:calc:none');
        }
      } catch (e: unknown) {
        const msg = getErrMsg(e);
        console.warn('[checkout] cotizar error:', msg, e);
        setDbgError(msg);
        setSelectedShippingOption(null);
        setShippingCost(0);
        setDbgStep('shipping:calc:error');
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
        setDbgStep('cp:clear');
        return;
      }
      setIsValidatingPostalCode(true);
      validatePostalCode(cleaned)
        .then((ok) => {
          setPostalCodeError(ok ? '' : 'Código postal inválido');
          setDbgStep(ok ? 'cp:valid' : 'cp:invalid');
        })
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
      setDbgStep('branches:load:start');
      const resp = await ocaSucursales(formData.postalCode, false);
      console.log('[checkout] sucursales resp', resp);
      if (resp.ok && resp.data) {
        setBranches(resp.data);
        setBranchModalVisible(true);
        setDbgStep('branches:load:ok');
      } else {
        Alert.alert('Sucursales', 'No se encontraron sucursales para ese CP.');
        setDbgStep('branches:load:none');
      }
    } catch (e: unknown) {
      const msg = getErrMsg(e);
      console.warn('[checkout] sucursales error:', msg, e);
      setDbgError(msg);
      Alert.alert('Sucursales', 'No se pudieron obtener sucursales.');
      setDbgStep('branches:load:error');
    }
  };

  async function createOrderInSupabaseFallback() {
    setDbgStep('fallback:supabase:start');
    const { data: ses } = await supabase.auth.getSession();
    const user = ses.session?.user;

    let cliente: any = null;
    if (user) {
      const { data: cli, error: cliSelErr } = await supabase.from('Cliente').select('*').eq('userId', user.id).maybeSingle();
      if (cliSelErr) {
        console.warn('[checkout] cliente select error:', cliSelErr);
      }
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
        if (cliErr) {
          console.error('[checkout] cliente insert error:', cliErr);
          setDbgError(cliErr.message ?? String(cliErr));
          throw cliErr;
        }
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
        direccion_envio:
          shippingMethod !== 'pickup'
            ? `${formData.calle} ${formData.numero}${formData.departamento ? `, ${formData.departamento}` : ''}`
            : null,
        ciudad_envio: shippingMethod !== 'pickup' ? formData.city : null,
        provincia_envio: shippingMethod !== 'pickup' ? formData.province : null,
        cp_envio: shippingMethod !== 'pickup' ? formData.postalCode : null,
        metodo_envio: shippingMethod.toUpperCase(),
        sucursal_envio: shippingMethod === 'branch' ? selectedBranch?.nombre ?? null : null,
        notas: formData.notes || null,
        metodo_pago: paymentMethod.toUpperCase(),
        cupon_descuento: appliedCoupon?.code ?? null,
        cupon_porcentaje: appliedCoupon?.discount ?? null,
      })
      .select('*')
      .single();
    if (pedErr) {
      console.error('[checkout] pedido insert error:', pedErr);
      setDbgError(pedErr.message ?? String(pedErr));
      throw pedErr;
    }

    const rows = orderSummary.items.map((it) => ({
      pedidoId: (pedido as any).id_pedido,
      productoId: Number(it.id),
      varianteId: it.variantId ?? null,
      cantidad: it.quantity,
      precio_unitario: it.price,
      descuento: 0,
    }));
    const { error: ppErr } = await supabase.from('PedidoProducto').insert(rows);
    if (ppErr) {
      console.error('[checkout] pedidoProducto insert error:', ppErr);
      setDbgError(ppErr.message ?? String(ppErr));
      throw ppErr;
    }

    setDbgStep('fallback:supabase:done');
    return { numeroPedido };
  }

  const handleSubmit = async () => {
    setDbgError(null);
    setDbgStep('submit:start');
    console.log('[checkout] submit:start', {
      items: orderSummary.items.length,
      paymentMethod,
      shippingMethod,
      subtotal,
      discount,
      shippingCost,
      total: orderSummary.total,
    });

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.dni) {
      setDbgStep('validate:basic:fail');
      console.warn('[checkout] validate basic fail');
      Alert.alert('Campos requeridos', 'Completá nombre, apellido, email, teléfono y DNI.');
      return;
    }
    if (shippingMethod !== 'pickup') {
      if (!formData.calle || !formData.numero || !formData.city || !formData.province || !formData.postalCode) {
        setDbgStep('validate:address:fail');
        console.warn('[checkout] validate address fail');
        Alert.alert('Dirección requerida', 'Completá los datos de envío.');
        return;
      }
      if (!(await validatePostalCode(formData.postalCode)) || postalCodeError) {
        setDbgStep('validate:cp:fail');
        console.warn('[checkout] validate cp fail', { postalCode: formData.postalCode, postalCodeError });
        Alert.alert('Código postal inválido', 'Ingresá un código postal de 4 dígitos válido.');
        return;
      }
      // Si no hay tarifa para delivery y no aplica envío gratis, permitimos continuar
      if (shippingMethod === 'delivery' && !isFreeShippingEligible && !selectedShippingOption) {
        console.warn('[checkout] sin tarifa OCA, continuando con envío a definir');
        setDbgStep('validate:shippingOption:warn');
        // placeholder para coherencia de payload
        setSelectedShippingOption({ precio: 0, descripcion: 'A cotizar', operativa: 'PENDIENTE' } as any);
        // No retornamos: dejamos seguir
      }
      if (shippingMethod === 'branch' && !selectedBranch) {
        setDbgStep('validate:branch:fail');
        console.warn('[checkout] validate branch fail');
        Alert.alert('Sucursal requerida', 'Seleccioná una sucursal OCA.');
        return;
      }
    }
    if (paymentMethod === 'cash' && shippingMethod !== 'pickup') {
      setDbgStep('validate:cash:fail');
      console.warn('[checkout] validate cash fail');
      Alert.alert('Combinación no válida', 'El pago en efectivo solo está disponible para retiro en tienda.');
      return;
    }
    if (!acceptTerms) {
      setDbgStep('validate:terms:fail');
      console.warn('[checkout] validate terms fail');
      Alert.alert('Términos', 'Debés aceptar los términos y condiciones.');
      return;
    }
    if (orderSummary.items.some((i) => i.quantity > i.stock && i.stock < 999)) {
      setDbgStep('validate:stock:fail');
      console.warn('[checkout] validate stock fail');
      Alert.alert('Stock insuficiente', 'Hay productos sin stock suficiente.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (paymentMethod === 'mercadopago' && USE_WEB_API_CHECKOUT) {
        setIsProcessing(true);

        const returnUrl = LinkingExpo.createURL('/(client)');
        setDbgStep('webapi:build-payload');

        const payload = {
          items: orderSummary.items.map((it) => ({
            id: String(it.id),
            variantId: it.variantId ?? null,
            quantity: it.quantity,
          })),
          customer: {
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            email: formData.email,
            phone: formData.phone,
          },
          shipping:
            shippingMethod === 'pickup'
              ? { optionCode: 'PICKUP' }
              : {
                  optionCode:
                    selectedShippingOption?.operativa ?? (shippingMethod === 'branch' ? '414610' : '414609'),
                  address:
                    shippingMethod === 'delivery'
                      ? {
                          street: formData.calle,
                          number: formData.numero,
                          apartment: formData.departamento || null,
                          city: formData.city,
                          province: formData.province,
                          postalCode: formData.postalCode,
                        }
                      : {
                          branchName: selectedBranch?.nombre ?? null,
                          branchCode: selectedBranch?.codigoSucursal ?? null,
                          branchPostalCode: selectedBranch?.codigoPostal ?? formData.postalCode,
                          city: selectedBranch?.localidad ?? formData.city,
                          province: selectedBranch?.provincia ?? formData.province,
                        },
                },
          couponCode: appliedCoupon?.code ?? null,
          returnUrl,
        } as const;

        console.log('[checkout] POST /api/checkout payload', payload);
        setDbgStep('webapi:request');
        const res = await apiPost<{ orderId?: string; mpPreferenceId?: string; redirectUrl?: string }>(
          '/api/checkout',
          payload
        );
        console.log('[checkout] /api/checkout resp', res);
        setDbgStep('webapi:response');

        if (res?.redirectUrl) {
          console.log('[checkout] opening browser', res.redirectUrl);
          await WebBrowser.openBrowserAsync(res.redirectUrl);
          Alert.alert(
            'Continuá el pago',
            'Te redirigimos a Mercado Pago. Una vez finalizado, vas a ver el estado de tu pedido. Podés volver a la app cuando quieras.'
          );
          setDbgStep('webapi:redirected');
          router.replace('/(client)/profile');
          return;
        } else {
          Alert.alert('Pedido creado', 'Tu pedido fue generado. Revisá tu email para continuar el pago.');
          setDbgStep('webapi:created');
          router.replace('/(client)');
          return;
        }
      }

      setDbgStep('fallback:start');
      const { numeroPedido } = await createOrderInSupabaseFallback();
      clearCart();
      Alert.alert('Pedido creado', `Tu pedido ${numeroPedido} fue generado correctamente.`);
      setDbgStep('fallback:done');
      router.replace('/(client)');
    } catch (e: any) {
      console.error('Checkout error:', e?.message ?? e);
      setDbgError(e?.message ?? String(e));
      setDbgStep('error');
      Alert.alert('Error', e?.message ?? 'No se pudo completar la compra.');
    } finally {
      setIsSubmitting(false);
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    console.log('[checkout] render: empty cart');
    return (
      <RNSafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'right', 'bottom', 'left']}>
        <View style={styles.emptyRoot}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="cube-outline" size={40} color={C.muted} />
          </View>
          <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
          <Text style={styles.emptyText}>Agregá productos antes de finalizar la compra.</Text>
          <Pressable
            onPress={() => router.replace('/(client)')}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="cart-outline" size={16} color="#fff" />
            <Text style={styles.primaryText}>Explorar productos</Text>
          </Pressable>
        </View>
      </RNSafeAreaView>
    );
  }

  return (
    <RNSafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'right', 'bottom', 'left']}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 28 }]}>
          {/* Encabezado */}
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Ionicons name="card-outline" size={20} color="#fff" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Finalizar compra</Text>
              <Text style={styles.headerSubtitle}>Completá tus datos para continuar</Text>
            </View>
          </View>

          {/* Datos del comprador */}
          <View style={styles.card}>
            <CardHeader icon="person-outline" title="Datos del comprador" />
            <View style={styles.row}>
              <Field label="Nombre" value={formData.firstName} onChangeText={(v) => handleInputChange('firstName', v)} style={{ flex: 1 }} />
              <Field label="Apellido" value={formData.lastName} onChangeText={(v) => handleInputChange('lastName', v)} style={{ flex: 1 }} />
            </View>
            <Field label="Email" value={formData.email} onChangeText={(v) => handleInputChange('email', v)} keyboardType="email-address" />
            <View style={styles.row}>
              <Field label="Teléfono" value={formData.phone} onChangeText={(v) => handleInputChange('phone', v)} keyboardType="phone-pad" style={{ flex: 1 }} />
              <Field label="DNI" value={formData.dni} onChangeText={(v) => handleInputChange('dni', v)} keyboardType="numeric" style={{ flex: 1 }} />
            </View>
          </View>

          {/* Envío */}
          <View style={styles.card}>
            <CardHeader icon="navigate-outline" title="Envío" />
            <RadioRow label="A domicilio" description="Recibí tu pedido en tu dirección" icon="home-outline" active={shippingMethod === 'delivery'} onPress={() => setShippingMethod('delivery')} />
            <RadioRow label="Retiro en sucursal OCA" description="Buscá tu pedido en una sucursal cercana" icon="business-outline" active={shippingMethod === 'branch'} onPress={() => setShippingMethod('branch')} />
            <RadioRow label="Retiro en tienda" description="Retirá en nuestra sucursal" icon="bag-handle-outline" active={shippingMethod === 'pickup'} onPress={() => setShippingMethod('pickup')} />

            {/* Campos según método */}
            {shippingMethod === 'delivery' && (
              <View style={{ marginTop: 8, gap: 10 }}>
                <View style={styles.row}>
                  <Field label="Calle" value={formData.calle} onChangeText={(v) => handleInputChange('calle', v)} style={{ flex: 1 }} />
                  <Field label="Número" value={formData.numero} onChangeText={(v) => handleInputChange('numero', v)} style={{ width: 110 }} keyboardType="numeric" />
                </View>
                <View style={styles.row}>
                  <Field label="Depto (opcional)" value={formData.departamento} onChangeText={(v) => handleInputChange('departamento', v)} style={{ flex: 1 }} />
                  <Field label="Barrio (opcional)" value={formData.barrio} onChangeText={(v) => handleInputChange('barrio', v)} style={{ flex: 1 }} />
                </View>
                <View style={styles.row}>
                  <Field label="Ciudad" value={formData.city} onChangeText={(v) => handleInputChange('city', v)} style={{ flex: 1 }} />
                  <Pressable onPress={() => setProvPicker(true)} style={[styles.select, { flex: 1 }]}>
                    <Text style={styles.selectText}>{formData.province || 'Provincia'}</Text>
                    <Ionicons name="chevron-down" size={16} color={C.muted} />
                  </Pressable>
                </View>
                <Field label="Código postal (4 dígitos)" value={formData.postalCode} onChangeText={(v) => handleInputChange('postalCode', v)} keyboardType="numeric" />
                {!!provinceError && <Text style={styles.warnText}>{provinceError}</Text>}
                {!!postalCodeError && <Text style={styles.errorText}>{postalCodeError}</Text>}

                {selectedShippingOption ? (
                  <View style={styles.shippingOption}>
                    <View>
                      <Text style={styles.text}>OCA {selectedShippingOption.descripcion || 'Envío'}</Text>
                      <Text style={styles.mutedText}>{selectedShippingOption.plazoEntrega || 'Plazo estimado'}</Text>
                    </View>
                    <Text style={styles.textStrong}>{isFreeShippingEligible ? 'Gratis' : money(selectedShippingOption.precio || 0)}</Text>
                  </View>
                ) : (
                  <Text style={styles.infoBlue}>
                    {isFreeShippingEligible
                      ? 'Tenés envío gratis por superar el mínimo.'
                      : 'Ingresá CP para calcular el envío. Si no aparece tarifa, lo coordinamos por WhatsApp.'}
                  </Text>
                )}
              </View>
            )}

            {shippingMethod === 'branch' && (
              <View style={{ marginTop: 8, gap: 10 }}>
                <Field label="Código postal (4 dígitos)" value={formData.postalCode} onChangeText={(v) => handleInputChange('postalCode', v)} keyboardType="numeric" />
                <Pressable onPress={fetchBranches} style={({ pressed }) => [styles.select, pressed && { opacity: 0.95 }]}>
                  <Text style={styles.selectText}>{selectedBranch ? selectedBranch.nombre : 'Elegir sucursal OCA'}</Text>
                  <Ionicons name="chevron-forward" size={16} color={C.muted} />
                </Pressable>
                {selectedBranch && (
                  <View style={styles.branchCard}>
                    <Text style={styles.text}>{selectedBranch.nombre}</Text>
                    <Text style={styles.mutedText}>{selectedBranch.direccion}</Text>
                    <Text style={styles.mutedText}>
                      {selectedBranch.localidad}, {selectedBranch.provincia} ({selectedBranch.codigoPostal})
                    </Text>
                  </View>
                )}
              </View>
            )}

            {shippingMethod === 'pickup' && (
              <View style={styles.pickupCard}>
                <Text style={styles.textStrong}>Retiro en tienda</Text>
                <Text style={styles.mutedText}>Bartolomé Mitre 587, Concepción del Uruguay, Entre Ríos</Text>
                <Text style={styles.infoGreen}>Sin costo de envío</Text>
              </View>
            )}
          </View>

          {/* Notas */}
          <View style={styles.card}>
            <CardHeader icon="chatbubbles-outline" title="Notas (opcional)" />
            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
              multiline
              placeholder="Instrucciones para la entrega, horarios, etc."
              placeholderTextColor={C.muted}
              value={formData.notes}
              onChangeText={(v) => handleInputChange('notes', v)}
            />
          </View>

          {/* Pago */}
          <View style={styles.card}>
            <CardHeader icon="card-outline" title="Pago" />
            <RadioRow
              label="Mercado Pago"
              description="Pagá con tarjeta, débito o efectivo"
              icon="logo-usd"
              active={paymentMethod === 'mercadopago'}
              onPress={() => setPaymentMethod('mercadopago')}
            />
            <RadioRow
              label="Transferencia bancaria"
              description="Te enviaremos los datos por email"
              icon="swap-vertical-outline"
              active={paymentMethod === 'transfer'}
              onPress={() => setPaymentMethod('transfer')}
            />
            <RadioRow
              label="Efectivo (sólo retiro en tienda)"
              description="Pagás al retirar"
              icon="cash-outline"
              active={paymentMethod === 'cash'}
              onPress={() => setPaymentMethod('cash')}
            />
          </View>

          {/* Resumen */}
          <View style={styles.card}>
            <CardHeader icon="receipt-outline" title="Resumen" />
            <View style={styles.summaryLine}>
              <Text style={styles.mutedText}>Productos ({count})</Text>
              <Text style={styles.text}>{money(subtotal)}</Text>
            </View>
            {discount > 0 && (
              <View style={styles.summaryLine}>
                <Text style={styles.mutedText}>Descuento</Text>
                <Text style={styles.text}>- {money(discount)}</Text>
              </View>
            )}
            <View style={styles.summaryLine}>
              <Text style={styles.mutedText}>Envío</Text>
              <Text style={styles.text}>
                {shippingMethod === 'pickup'
                  ? '—'
                  : selectedShippingOption
                  ? isFreeShippingEligible
                    ? 'Gratis'
                    : money(selectedShippingOption.precio || 0)
                  : 'A definir'}
              </Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.summaryLine}>
              <Text style={styles.total}>Total</Text>
              <Text style={styles.total}>{money(orderSummary.total)}</Text>
            </View>

            {/* Términos */}
            <View style={styles.termsRow}>
              <Pressable onPress={() => setAcceptTerms((v) => !v)} style={({ pressed }) => [styles.radioRow, { flex: 0 }, pressed && { opacity: 0.95 }]}>
                <Ionicons name={acceptTerms ? 'checkbox' : 'square-outline'} size={20} color={acceptTerms ? C.primary : C.muted} />
              </Pressable>
              <Text style={styles.termsText}>
                Acepto los <Text style={styles.link}>términos y condiciones</Text> y la <Text style={styles.link}>política de privacidad</Text>.
              </Text>
            </View>

            {/* CTA */}
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting || isProcessing}
              style={({ pressed }) => [
                styles.submitBtn,
                (isSubmitting || isProcessing) && { opacity: 0.6 },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Ionicons name="lock-closed-outline" size={16} color="#fff" />
              <Text style={styles.submitText}>
                {isSubmitting
                  ? 'Procesando…'
                  : paymentMethod === 'mercadopago'
                  ? 'Pagar con Mercado Pago'
                  : paymentMethod === 'transfer'
                  ? 'Confirmar pedido'
                  : 'Confirmar (pago en tienda)'}
              </Text>
            </Pressable>
            <Text style={styles.secureNote}>
              Pago seguro. Recibirás confirmación por email.
            </Text>
          </View>
        </ScrollView>

        {/* Overlay de debug (visible si EXPO_PUBLIC_DEBUG_CHECKOUT=1) */}
        <CheckoutDebug
          step={dbgStep}
          error={dbgError}
          extra={{
            USE_WEB: process.env.EXPO_PUBLIC_USE_WEB_API_CHECKOUT,
            API_BASE: process.env.EXPO_PUBLIC_API_BASE,
            items: items.length,
            subtotal,
            discount,
            shippingCost,
            shippingMethod,
            paymentMethod,
            selectedShippingOption: selectedShippingOption?.operativa ?? null,
          }}
          onClear={() => setDbgError(null)}
        />

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

        <Modal
          visible={branchModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setBranchModalVisible(false)}
        >
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
                      setDbgStep('branches:selected');
                    }}
                    style={({ pressed }) => [styles.optionRow, pressed && { backgroundColor: C.primarySoft }]}
                  >
                    <Ionicons
                      name={selectedBranch?.id === b.id ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={selectedBranch?.id === b.id ? C.primary : C.muted}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.text} numberOfLines={1}>
                        {b.nombre}
                      </Text>
                      <Text style={styles.mutedText} numberOfLines={1}>
                        {b.direccion}
                      </Text>
                      <Text style={styles.mutedText} numberOfLines={1}>
                        {b.localidad}, {b.provincia} ({b.codigoPostal})
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable
                onPress={() => setBranchModalVisible(false)}
                style={({ pressed }) => [styles.ghostBtn, { marginTop: 12 }, pressed && { opacity: 0.9 }]}
              >
                <Ionicons name="close-outline" size={16} color={C.muted} />
                <Text style={styles.ghostText}>Cerrar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </RNSafeAreaView>
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

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  style?: any;
}) {
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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.radioRow, active && styles.radioActive, pressed && { opacity: 0.95 }]}
    >
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
    'Buenos Aires',
    'Ciudad Autónoma de Buenos Aires',
    'Catamarca',
    'Chaco',
    'Chubut',
    'Córdoba',
    'Corrientes',
    'Entre Ríos',
    'Formosa',
    'Jujuy',
    'La Pampa',
    'La Rioja',
    'Mendoza',
    'Misiones',
    'Neuquén',
    'Río Negro',
    'Salta',
    'San Juan',
    'San Luis',
    'Santa Cruz',
    'Santa Fe',
    'Santiago del Estero',
    'Tierra del Fuego',
    'Tucumán',
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
          <TextInput
            style={styles.input}
            placeholder="Buscar..."
            placeholderTextColor={C.muted}
            value={q}
            onChangeText={setQ}
          />
          <ScrollView style={{ maxHeight: 320, marginTop: 8 }}>
            {list.map((p) => (
              <Pressable
                key={p}
                onPress={() => onSelect(p)}
                style={({ pressed }) => [styles.optionRow, pressed && { backgroundColor: C.primarySoft }]}
              >
                <Ionicons
                  name={value === p ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={value === p ? C.primary : C.muted}
                />
                <Text style={styles.text}>{p}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.ghostBtn, { marginTop: 12 }, pressed && { opacity: 0.9 }]}
          >
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

  errorText: { color: C.danger, fontSize: 12, marginTop: 4 },
  warnText: { color: C.warning, fontSize: 12, marginTop: 4 },
});