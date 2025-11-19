import { Ionicons } from '@expo/vector-icons';
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
  
  // Rangos completos y ordenados de códigos postales por provincia en Argentina
  // CABA
  if (cp >= 1000 && cp <= 1499) return 'Ciudad Autónoma de Buenos Aires';
  
  // Buenos Aires (múltiples rangos)
  if (cp >= 1500 && cp <= 1999) return 'Buenos Aires';
  if (cp >= 2000 && cp <= 2199) return 'Buenos Aires';
  if (cp >= 2700 && cp <= 2799) return 'Buenos Aires';
  if (cp >= 2800 && cp <= 2819) return 'Buenos Aires';
  if (cp >= 2850 && cp <= 2999) return 'Buenos Aires';
  if (cp >= 6000 && cp <= 6999) return 'Buenos Aires';
  if (cp >= 7000 && cp <= 7999) return 'Buenos Aires';
  if (cp >= 8000 && cp <= 8299) return 'Buenos Aires';
  
  // Santa Fe
  if (cp >= 2200 && cp <= 2299) return 'Santa Fe';
  if (cp >= 2300 && cp <= 2399) return 'Santa Fe';
  if (cp >= 2400 && cp <= 2499) return 'Santa Fe';
  if (cp >= 2500 && cp <= 2599) return 'Santa Fe';
  if (cp >= 2600 && cp <= 2699) return 'Santa Fe';
  if (cp >= 3000 && cp <= 3099) return 'Santa Fe';
  
  // Entre Ríos
  if (cp >= 2820 && cp <= 2849) return 'Entre Ríos';
  if (cp >= 3100 && cp <= 3199) return 'Entre Ríos';
  if (cp >= 3200 && cp <= 3299) return 'Entre Ríos';
  
  // Misiones
  if (cp >= 3300 && cp <= 3399) return 'Misiones';
  
  // Corrientes
  if (cp >= 3400 && cp <= 3499) return 'Corrientes';
  if (cp >= 3470 && cp <= 3479) return 'Corrientes';
  
  // Chaco
  if (cp >= 3500 && cp <= 3599) return 'Chaco';
  if (cp >= 3700 && cp <= 3799) return 'Chaco';
  
  // Formosa
  if (cp >= 3600 && cp <= 3699) return 'Formosa';
  
  // Tucumán
  if (cp >= 4000 && cp <= 4199) return 'Tucumán';
  
  // Santiago del Estero
  if (cp >= 4200 && cp <= 4299) return 'Santiago del Estero';
  if (cp >= 4300 && cp <= 4399) return 'Santiago del Estero';
  
  // Salta
  if (cp >= 4400 && cp <= 4499) return 'Salta';
  
  // Jujuy
  if (cp >= 4500 && cp <= 4699) return 'Jujuy';
  
  // Catamarca
  if (cp >= 4700 && cp <= 4999) return 'Catamarca';
  
  // Córdoba
  if (cp >= 5000 && cp <= 5299) return 'Córdoba';
  
  // La Rioja
  if (cp >= 5300 && cp <= 5399) return 'La Rioja';
  
  // San Juan
  if (cp >= 5400 && cp <= 5449) return 'San Juan';
  
  // Mendoza
  if (cp >= 5500 && cp <= 5599) return 'Mendoza';
  if (cp >= 5600 && cp <= 5699) return 'Mendoza';
  
  // San Luis
  if (cp >= 5700 && cp <= 5799) return 'San Luis';
  
  // La Pampa
  if (cp >= 6300 && cp <= 6399) return 'La Pampa';
  if (cp >= 8200 && cp <= 8299) return 'La Pampa';
  
  // Neuquén
  if (cp >= 8300 && cp <= 8399) return 'Neuquén';
  
  // Río Negro
  if (cp >= 8400 && cp <= 8599) return 'Río Negro';
  
  // Chubut
  if (cp >= 9000 && cp <= 9099) return 'Chubut';
  if (cp >= 9100 && cp <= 9199) return 'Chubut';
  if (cp >= 9200 && cp <= 9299) return 'Chubut';
  
  // Santa Cruz
  if (cp >= 9300 && cp <= 9399) return 'Santa Cruz';
  if (cp >= 9400 && cp <= 9499) return 'Santa Cruz';
  
  // Tierra del Fuego
  if (cp >= 9410 && cp <= 9431) return 'Tierra del Fuego';
  
  return 'Consultar';
}

type ShippingMethod = 'delivery' | 'branch' | 'pickup';
type PaymentMethod = 'mercadopago' | 'transfer' | 'cash';

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
  }, []); // intencional: solo al montar

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const { data: ses } = await supabase.auth.getSession();
        const user = ses.session?.user;
        
        if (user) {
          // Cargar datos de la tabla Cliente
          const { data: cliente, error: clienteError } = await supabase
            .from('Cliente')
            .select('*')
            .eq('userId', user.id)
            .maybeSingle();

          if (clienteError) {
            console.warn('[checkout] error cargando cliente:', clienteError);
          }

          if (cliente) {
            setFormData((prev) => ({
              ...prev,
              email: prev.email || cliente.email || user.email || '',
              firstName: prev.firstName || cliente.nombre || (user.user_metadata?.name?.split?.(' ')?.[0] ?? ''),
              lastName: prev.lastName || cliente.apellido || (user.user_metadata?.name?.split?.(' ')?.slice(1).join(' ') ?? ''),
              phone: prev.phone || cliente.telefono || '',
              dni: prev.dni || cliente.dni || '',
              calle: prev.calle || (cliente.direccion ? cliente.direccion.split(' ')[0] : ''),
              numero: prev.numero || (cliente.direccion ? cliente.direccion.split(' ').slice(1).join(' ') : ''),
              city: prev.city || cliente.ciudad || '',
              province: prev.province || cliente.provincia || '',
              postalCode: prev.postalCode || cliente.codigo_postal || '',
            }));
          } else {
            // Si no hay cliente, solo usar datos del user
            setFormData((prev) => ({
              ...prev,
              email: prev.email || user.email || '',
              firstName: prev.firstName || (user.user_metadata?.name?.split?.(' ')?.[0] ?? ''),
              lastName: prev.lastName || (user.user_metadata?.name?.split?.(' ')?.slice(1).join(' ') ?? ''),
            }));
          }
        }
        setProfileLoaded(true);
      } catch (e: any) {
        console.warn('[checkout] profile load error:', e?.message ?? e);
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
          setSelectedShippingOption({ ...opt, operativa });
          setShippingCost(isFreeShippingEligible ? 0 : (opt.precio ?? 0));
        } else {
          setSelectedShippingOption(null);
          setShippingCost(0);
        }
      } catch (e: unknown) {
        const msg = getErrMsg(e);
        console.warn('[checkout] cotizar error:', msg, e);
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
        .then((ok) => {
          setPostalCodeError(ok ? '' : 'Código postal inválido');
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
      const resp = await ocaSucursales(formData.postalCode, false);
      if (resp.ok && resp.data) {
        setBranches(resp.data);
        setBranchModalVisible(true);
      } else {
        Alert.alert('Sucursales', 'No se encontraron sucursales para ese CP.');
      }
    } catch (e: unknown) {
      const msg = getErrMsg(e);
      console.warn('[checkout] sucursales error:', msg, e);
      Alert.alert('Sucursales', 'No se pudieron obtener sucursales.');
    }
  };

  async function createOrderInSupabaseFallback() {
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
      throw ppErr;
    }
    return { numeroPedido };
  }

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
        console.warn('[checkout] validate cp fail', { postalCode: formData.postalCode, postalCodeError });
        Alert.alert('Código postal inválido', 'Ingresá un código postal de 4 dígitos válido.');
        return;
      }
      // Si no hay tarifa para delivery y no aplica envío gratis, permitimos continuar
      if (shippingMethod === 'delivery' && !isFreeShippingEligible && !selectedShippingOption) {
        console.warn('[checkout] sin tarifa OCA, continuando con envío a definir');
        // placeholder para coherencia de payload
        setSelectedShippingOption({ precio: 0, descripcion: 'A cotizar', operativa: 'PENDIENTE' } as any);
        // No retornamos: dejamos seguir
      }
      if (shippingMethod === 'branch' && !selectedBranch) {
        console.warn('[checkout] validate branch fail');
        Alert.alert('Sucursal requerida', 'Seleccioná una sucursal OCA.');
        return;
      }
    }
    if (paymentMethod === 'cash' && shippingMethod !== 'pickup') {
      console.warn('[checkout] validate cash fail');
      Alert.alert('Combinación no válida', 'El pago en efectivo solo está disponible para retiro en tienda.');
      return;
    }
    if (!acceptTerms) {
      console.warn('[checkout] validate terms fail');
      Alert.alert('Términos', 'Debés aceptar los términos y condiciones.');
      return;
    }
    if (orderSummary.items.some((i) => i.quantity > i.stock && i.stock < 999)) {
      console.warn('[checkout] validate stock fail');
      Alert.alert('Stock insuficiente', 'Hay productos sin stock suficiente.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Usar APIs web si está configurado
      if (USE_WEB_API_CHECKOUT) {
        setIsProcessing(true);

        // 1. Preparar payload para crear orden
        const orderPayload = {
          items: orderSummary.items.map((it) => ({
            id: String(it.id),
            variantId: it.variantId ?? null,
            quantity: it.quantity,
            price: it.price,
          })),
          customerInfo: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            dni: formData.dni,
          },
          shippingInfo:
            shippingMethod === 'pickup'
              ? {
                  method: 'retiro',
                  address: null,
                  postalCode: null,
                }
              : shippingMethod === 'branch'
              ? {
                  method: 'sucursal',
                  branchDetails: {
                    nombre: selectedBranch?.nombre ?? '',
                    codigoSucursal: selectedBranch?.codigoSucursal ?? '',
                    direccion: selectedBranch?.direccion ?? '',
                    localidad: selectedBranch?.localidad ?? '',
                    provincia: selectedBranch?.provincia ?? '',
                    codigoPostal: selectedBranch?.codigoPostal ?? '',
                  },
                  address: {
                    calle: formData.calle || '',
                    numero: formData.numero || '',
                    departamento: formData.departamento || '',
                    barrio: formData.barrio || '',
                    ciudad: formData.city,
                    provincia: formData.province,
                    codigo_postal: formData.postalCode,
                  },
                }
              : {
                  method: 'delivery',
                  address: {
                    calle: formData.calle,
                    numero: formData.numero,
                    departamento: formData.departamento || '',
                    barrio: formData.barrio || '',
                    ciudad: formData.city,
                    provincia: formData.province,
                    codigo_postal: formData.postalCode,
                  },
                },
          paymentMethod: paymentMethod === 'mercadopago' ? 'MercadoPago' : paymentMethod === 'transfer' ? 'Transferencia' : 'Efectivo',
          shippingCost: orderSummary.shipping,
          subtotal: orderSummary.subtotal,
          discount: orderSummary.discount,
          total: orderSummary.total,
          couponCode: appliedCoupon?.code ?? null,
          notes: formData.notes || null,
        };

        // 2. Crear orden
        const orderRes = await apiPost<any>(
          '/api/orders',
          orderPayload
        );

        // La API puede devolver diferentes formatos
        const orderNumber = 
          orderRes?.order_number || 
          orderRes?.orderNumber || 
          orderRes?.numero_pedido ||
          orderRes?.numeroPedido ||
          orderRes?.pedido?.numero_pedido ||  // ← La API devuelve en este formato
          orderRes?.pedido?.numeroPedido ||
          orderRes?.data?.order_number ||
          orderRes?.data?.orderNumber ||
          orderRes?.data?.numero_pedido;

        if (!orderNumber) {
          throw new Error(`No se recibió el número de pedido. Respuesta: ${JSON.stringify(orderRes)}`);
        }

        // 3. Si es Mercado Pago, crear preferencia y redirigir
        if (paymentMethod === 'mercadopago') {

          const preferencePayload = {
            order_number: orderNumber,
            items: [
              ...orderSummary.items.map((it) => {
                const unitPrice = Number(it.price);
                const quantity = Number(it.quantity);
                
                // MercadoPago requiere unit_price con máximo 2 decimales y > 0
                const validUnitPrice = Number.isFinite(unitPrice) && unitPrice > 0 
                  ? Math.round(unitPrice * 100) / 100 
                  : 1;

                return {
                  id: it.id || `item_${Math.random()}`,
                  name: it.name || 'Producto',
                  quantity: quantity > 0 ? quantity : 1,
                  price: validUnitPrice,
                };
              }),
              // Agregar envío como item si corresponde
              ...(orderSummary.shipping > 0 ? [{
                id: 'shipping',
                name: 'Envío',
                quantity: 1,
                price: Math.round(orderSummary.shipping * 100) / 100,
              }] : []),
            ],
            payer: {
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              phone: formData.phone,
            },
            total: orderSummary.total,
          };

          const prefRes = await apiPost<{ init_point?: string; sandbox_init_point?: string }>(
            '/api/create-preference',
            preferencePayload
          );

          if (prefRes?.init_point || prefRes?.sandbox_init_point) {
            const redirectUrl = prefRes.init_point || prefRes.sandbox_init_point;
            
            // Abrir MercadoPago y esperar el resultado
            const result = await WebBrowser.openBrowserAsync(redirectUrl!);
            
            // Si el usuario cancela o cierra, no limpiar el carrito
            if (result.type === 'cancel' || result.type === 'dismiss') {
              Alert.alert(
                'Pago cancelado',
                'No completaste el pago. Podés intentarlo nuevamente cuando quieras.',
                [{ text: 'OK' }]
              );
              return;
            }
            
            // Solo limpiar el carrito si completó el proceso
            clearCart();
            
            // Redirigir a pantalla de confirmación (pendiente hasta que MercadoPago confirme)
            router.replace({
              pathname: '/(client)/pago/pendiente' as any,
              params: { order_number: orderNumber },
            });
            return;
          } else {
            throw new Error('No se pudo obtener el link de pago de Mercado Pago');
          }
        } else {
          // 4. Para transferencia o efectivo, mostrar confirmación
          clearCart();
          
          // Redirigir a la pantalla de confirmación
          router.replace('/(client)');
          setTimeout(() => {
            router.push({
              pathname: '/(client)/pago/confirmado' as any,
              params: { order_number: orderNumber },
            });
          }, 100);
          return;
        }
      }

      // Fallback: crear orden directamente en Supabase (sin API web)
      const { numeroPedido } = await createOrderInSupabaseFallback();
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
