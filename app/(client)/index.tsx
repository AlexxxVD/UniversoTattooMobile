import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { API_BASE } from '../../lib/api';

const C = {
  bg: '#0E1116',
  card: '#141821',
  border: '#2A2F3A',
  text: '#F3F4F6',
  muted: '#A0A8B0',
  primary: '#7C3AED',
  primarySoft: 'rgba(124,58,237,0.14)',
  pink: '#EC4899',
  purple: '#A855F7',
  info: '#60A5FA',
};

type Category = { name: string; image: string; link: string };

// Mapeo de imágenes locales con require directo
const localImages: { [key: string]: any } = {
  'img/maquinas.webp': require('../../assets/images/maquinas.webp'),
  'img/agujas.webp': require('../../assets/images/agujas.webp'),
  'img/tintas.webp': require('../../assets/images/tintas.webp'),
  'img/accesorios.webp': require('../../assets/images/accesorios.webp'),
  'img/bink.webp': require('../../assets/images/bink.webp'),
  'img/ariel-baldessari.webp': require('../../assets/images/ariel-baldessari.webp'),
  'img/amaitattoo.webp': require('../../assets/images/amaitattoo.webp'),
  '/img/maquinas.webp': require('../../assets/images/maquinas.webp'),
  '/img/agujas.webp': require('../../assets/images/agujas.webp'),
  '/img/tintas.webp': require('../../assets/images/tintas.webp'),
  '/img/accesorios.webp': require('../../assets/images/accesorios.webp'),
  '/img/bink.webp': require('../../assets/images/bink.webp'),
  '/img/ariel-baldessari.webp': require('../../assets/images/ariel-baldessari.webp'),
  '/img/amaitattoo.webp': require('../../assets/images/amaitattoo.webp'),
};

console.log('📦 [index] Imágenes locales cargadas:', Object.keys(localImages));

// Función para cargar imágenes (locales primero, servidor como fallback)
function img(src: string): any {
  console.log('🖼️ [img] Solicitando:', src);
  
  if (/^https?:\/\//i.test(src)) {
    console.log('✅ [img] URL absoluta, retornando:', { uri: src });
    return { uri: src };
  }
  
  const cleanPath = src.replace(/^\//, '');
  const withSlash = `/${cleanPath}`;
  
  console.log('🔍 [img] Buscando en local:', { cleanPath, withSlash });
  
  // Buscar en assets locales (con o sin slash inicial)
  // IMPORTANTE: require() ya retorna el asset source correcto para React Native
  if (localImages[cleanPath]) {
    const asset = localImages[cleanPath];
    console.log('✅ [img] Encontrado en local (cleanPath):', cleanPath, 'asset:', asset);
    return asset; // Retornar directamente el require()
  }
  if (localImages[withSlash]) {
    const asset = localImages[withSlash];
    console.log('✅ [img] Encontrado en local (withSlash):', withSlash, 'asset:', asset);
    return asset; // Retornar directamente el require()
  }
  
  // Fallback al servidor
  const base = (API_BASE || '').replace(/\/+$/, '');
  const serverUrl = `${base}/${cleanPath}`;
  console.log('⚠️ [img] No encontrado local, usando servidor:', serverUrl);
  return { uri: serverUrl };
}


// CATEGORIES como array mutable tipado, para evitar readonly y unknown
const CATEGORIES: Category[] = [
  { name: 'Máquinas', image: '/img/maquinas.webp', link: 'Máquinas' },
  { name: 'Agujas', image: '/img/agujas.webp', link: 'Agujas' },
  { name: 'Tintas', image: '/img/tintas.webp', link: 'Tintas' },
  { name: 'Accesorios', image: '/img/accesorios.webp', link: 'Accesorios' },
];

const TESTIMONIALS = [
  {
    name: 'Nahuel Bulay',
    role: 'Tatuador en B-Ink',
    quote:
      'La web de Universo Tattoo es súper clara y fácil de usar. Encontramos todo lo que necesitamos para el estudio y los pedidos siempre llegan rápido y bien embalados.',
    image: '/img/bink.webp',
    instagram: 'https://www.instagram.com/b_ink_cdelu/',
  },
  {
    name: 'Ariel Baldessari',
    role: 'Tatuador y organizador de convención de tatuajes',
    quote:
      'Universo Tattoo nos facilita conseguir insumos de alta calidad sin complicaciones. La web es intuitiva, con buenas fotos y descripciones precisas de cada producto.',
    image: '/img/ariel-baldessari.webp',
    instagram: 'https://www.instagram.com/ariel_baldessari/',
  },
  {
    name: 'Amai Tattoo',
    role: 'Tatuadora especializada en anime',
    quote:
      'Comprar en la web de Universo Tattoo es rápido y seguro. Siempre tienen stock de lo que busco y su atención al cliente es excelente.',
    image: '/img/amaitattoo.webp',
    instagram: 'https://www.instagram.com/amaixtattoo/',
  },
] as const;

export default function ClientHome() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [refreshing, setRefreshing] = useState(false);

  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, [glow]);

  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.5] });

  const onRefresh = async () => {
    setRefreshing(true);
    // Aquí podrías recargar otros datos si es necesario en el futuro
    setRefreshing(false);
  };

  const openURL = (url: string) => Linking.openURL(url).catch(() => {});
  const openInstagram = () => openURL('https://www.instagram.com/universotattoo_insumos/');
  // Reemplazá por tu número real en formato 549XXXXXXXXXX
  const openWhatsApp = () => openURL('https://wa.me/549xxxxxxxxxx?text=Hola%20Universo%20Tattoo%20%F0%9F%91%8B');

  const videoHeight = useMemo(() => {
    const pad = 24;
    return Math.max(180, Math.round((width - pad * 2) * (9 / 16)));
  }, [width]);

  return (
    <RNSafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'right', 'bottom', 'left']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        {/* HERO */}
        <View style={{ minHeight: 420, justifyContent: 'center' }}>
          <LinearGradient colors={['rgba(10,10,12,1)', 'rgba(10,10,12,0.98)']} style={StyleSheet.absoluteFill} />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glowBlob,
              { backgroundColor: C.primary, opacity: glowOpacity, transform: [{ scale: glowScale }] },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glowBlob,
              { backgroundColor: C.pink, top: '42%', left: '65%', opacity: glowOpacity, transform: [{ scale: glowScale }] },
            ]}
          />

          <View style={{ padding: 16, gap: 12 }}>
            <Text style={styles.heroTitle}>
              <Text style={{ color: '#C4B5FD' }}>Insumos Premium</Text> para tatuajes profesionales
            </Text>
            <Text style={styles.heroSubtitle}>
              Descubrí nuestra selección de productos de alta calidad para artistas que buscan excelencia.
            </Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => router.push('/(client)/store' as any)} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.95 }]}>
                <Ionicons name="storefront-outline" size={18} color="#fff" />
                <Text style={styles.primaryText}>Explorar productos</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/(client)/about' as any)} style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.95 }]}>
                <Ionicons name="information-circle-outline" size={18} color="#C4B5FD" />
                <Text style={styles.ghostText}>Sobre nosotros</Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              <Pill icon="shield-checkmark-outline" label="Productos certificados" />
              <Pill icon="trail-sign-outline" label="Envío a todo el país" />
              <Pill icon="flash-outline" label="Soporte técnico" />
            </View>
          </View>
        </View>

        {/* Video Lanzamiento */}
        <Section title="Lanzamiento Oficial" subtitle="Cómo Universo Tattoo está revolucionando el mundo de los insumos">
          <View style={styles.videoWrap}>
            <WebView
              style={{ width: '100%', height: videoHeight, backgroundColor: '#000' }}
              source={{ uri: 'https://www.youtube.com/embed/UdMqkpcwB9k' }}
              allowsFullscreenVideo
              javaScriptEnabled
              domStorageEnabled
            />
          </View>

          <View style={{ alignItems: 'center', gap: 8, marginTop: 10 }}>
            <Text style={{ color: C.muted }}>¿Te gustó lo que viste? ¡Sumate a la comunidad!</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => router.push('/(client)/store' as any)} style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.95 }]}>
                <Ionicons name="pricetags-outline" size={16} color="#C4B5FD" />
                <Text style={styles.ghostText}>Ver productos</Text>
              </Pressable>
              <Pressable onPress={openInstagram} style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.95 }]}>
                <Ionicons name="logo-instagram" size={16} color="#C4B5FD" />
                <Text style={styles.ghostText}>Instagram</Text>
              </Pressable>
            </View>
          </View>
        </Section>

        {/* Categorías */}
        <Section title="Explorá nuestras categorías" subtitle="Todo para tu estudio o práctica profesional">
          <View style={{ gap: 10 }}>
            {chunk(CATEGORIES, 2).map((row, idx) => (
              <View key={`cat-row-${idx}`} style={{ flexDirection: 'row', gap: 10 }}>
                {row.map((cat: Category) => (
                  <Pressable
                    key={cat.name}
                    onPress={() => router.push({ pathname: '/(client)/store', params: { categoria: cat.link } } as any)}
                    style={({ pressed }) => [styles.categoryCard, pressed && { opacity: 0.95 }]}
                  >
                    <Image source={img(cat.image)} style={styles.categoryImg} resizeMode="cover" />
                    <LinearGradient
                      colors={['rgba(0,0,0,0.75)', 'transparent']}
                      start={{ x: 0.5, y: 1 }}
                      end={{ x: 0.5, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryTitle}>{cat.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: '#A78BFA', fontWeight: '700' }}>Ver productos</Text>
                        <Ionicons name="chevron-forward" size={14} color="#A78BFA" />
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </Section>

        {/* Testimonios */}
        <Section title="Lo que dicen nuestros clientes" subtitle="Profesionales que confían en Universo Tattoo">
          <FlatList
            data={TESTIMONIALS}
            keyExtractor={(t) => t.name}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingRight: 10 }}
            renderItem={({ item }) => (
              <Pressable onPress={() => openURL(item.instagram)} style={({ pressed }) => [styles.testimonialCard, pressed && { opacity: 0.95 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Image source={img(item.image)} style={{ width: 48, height: 48, borderRadius: 999 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontWeight: '800' }}>{item.name}</Text>
                    <Text style={{ color: '#A78BFA', fontSize: 12 }}>{item.role}</Text>
                  </View>
                </View>
                <Text style={{ color: C.muted, marginTop: 8, fontStyle: 'italic' }}>"{item.quote}"</Text>
                <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Ionicons key={i} name="star" size={14} color="#FACC15" />
                  ))}
                </View>
              </Pressable>
            )}
          />
        </Section>

        {/* CTA */}
        <Section>
          <View style={styles.ctaCard}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: C.text, fontWeight: '900', fontSize: 20 }}>¿Listo para elevar tu arte?</Text>
              <Text style={{ color: C.muted }}>
                Descubrí nuestra colección de insumos premium y llevá tus creaciones al siguiente nivel.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => router.push('/(client)/store' as any)} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.95 }]}>
                <Ionicons name="pricetags-outline" size={18} color="#fff" />
                <Text style={styles.primaryText}>Explorar productos</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/(client)/contact' as any)} style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.95 }]}>
                <Ionicons name="chatbubbles-outline" size={18} color="#C4B5FD" />
                <Text style={styles.ghostText}>Contacto</Text>
              </Pressable>
            </View>
          </View>
        </Section>

        {/* Redes */}
        <Section>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18 }}>
            <Pressable onPress={openInstagram} style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.95 }]}>
              <View style={styles.socialIconWrap}>
                <Ionicons name="logo-instagram" size={20} color="#C4B5FD" />
              </View>
              <Text style={{ color: C.text }}>Instagram</Text>
            </Pressable>
            <Pressable onPress={openWhatsApp} style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.95 }]}>
              <View style={styles.socialIconWrap}>
                <Ionicons name="logo-whatsapp" size={20} color="#C4B5FD" />
              </View>
              <Text style={{ color: C.text }}>WhatsApp</Text>
            </Pressable>
            <Pressable onPress={() => openURL('mailto:contacto@universotattoo.com.ar')} style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.95 }]}>
              <View style={styles.socialIconWrap}>
                <Ionicons name="mail-outline" size={20} color="#C4B5FD" />
              </View>
              <Text style={{ color: C.text }}>Email</Text>
            </Pressable>
          </View>
        </Section>
      </ScrollView>
    </RNSafeAreaView>
  );
}

function Section({ title, subtitle, children }: { title?: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 10 }}>
      {!!title && <Text style={{ color: C.text, fontSize: 20, fontWeight: '900' }}>{title}</Text>}
      {!!subtitle && <Text style={{ color: C.muted }}>{subtitle}</Text>}
      {children}
    </View>
  );
}

function Pill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.pill}>
      <Ionicons name={icon} size={14} color="#A78BFA" />
      <Text style={{ color: '#E5E7EB', fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

// Acepta arrays readonly para evitar el error de asignabilidad
function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size) as T[]);
  return out;
}

function toCurrency(n: number) {
  try {
    return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
  } catch {
    return `$ ${Math.round(n).toLocaleString('es-AR')}`;
  }
}

const styles = StyleSheet.create({
  glowBlob: {
    position: 'absolute',
    top: '18%',
    left: '30%',
    width: 240,
    height: 240,
    borderRadius: 9999,
    filter: 'blur(40px)' as any,
    opacity: 0.3,
  },

  heroTitle: { color: C.text, fontSize: 26, fontWeight: '900', lineHeight: 32 },
  heroSubtitle: { color: C.muted },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
  },
  primaryText: { color: '#fff', fontWeight: '800' },

  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.card,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  ghostText: { color: '#E5E7EB', fontWeight: '700' },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  videoWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
    backgroundColor: '#000',
  },

  categoryCard: {
    flex: 1,
    height: 150,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
    backgroundColor: '#0B0F14',
  },
  categoryImg: { width: '100%', height: '100%' },
  categoryInfo: { position: 'absolute', bottom: 10, left: 10, right: 10 },
  categoryTitle: { color: '#fff', fontWeight: '900', fontSize: 18 },

  card: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  productImg: { width: '100%', height: 160, borderRadius: 8, backgroundColor: '#0B0F14' },

  // Estilo faltante para el botón "Ver detalles"
  smallBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: C.primary,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
  },

  testimonialCard: {
    width: 280,
    backgroundColor: 'rgba(20,24,33,0.9)',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },

  ctaCard: {
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderColor: 'rgba(124,58,237,0.35)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },

  socialBtn: { alignItems: 'center', gap: 6 },
  socialIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(124,58,237,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
  },
});