import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Card } from '@/components/ui/Card';
import { API_BASE } from '@/lib/api';

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

// Mapeo de imágenes locales con require directo
const localImages: { [key: string]: any } = {
  'img/carolinaroude.jpeg': require('../../assets/images/carolinaroude.jpeg'),
  'img/cristiansuarez.jpeg': require('../../assets/images/cristiansuarez.jpeg'),
  'img/cintiasuarez.jpeg': require('../../assets/images/cintiasuarez.jpeg'),
  'img/carolina_cristian.jpeg': require('../../assets/images/carolina_cristian.jpeg'),
  'img/alma.webp': require('../../assets/images/alma.webp'),
  'img/erne.jpeg': require('../../assets/images/erne.jpeg'),
  'img/pantera.webp': require('../../assets/images/pantera.webp'),
  '/img/carolinaroude.jpeg': require('../../assets/images/carolinaroude.jpeg'),
  '/img/cristiansuarez.jpeg': require('../../assets/images/cristiansuarez.jpeg'),
  '/img/cintiasuarez.jpeg': require('../../assets/images/cintiasuarez.jpeg'),
  '/img/carolina_cristian.jpeg': require('../../assets/images/carolina_cristian.jpeg'),
  '/img/alma.webp': require('../../assets/images/alma.webp'),
  '/img/erne.jpeg': require('../../assets/images/erne.jpeg'),
  '/img/pantera.webp': require('../../assets/images/pantera.webp'),
};

console.log('📦 [about] Imágenes locales cargadas:', Object.keys(localImages));

// Función para cargar imágenes (locales primero, servidor como fallback)
function img(src: string): any {
  console.log('🖼️ [about/img] Solicitando:', src);
  
  if (/^https?:\/\//i.test(src)) {
    console.log('✅ [about/img] URL absoluta, retornando:', { uri: src });
    return { uri: src };
  }
  
  const cleanPath = src.replace(/^\//, '');
  const withSlash = `/${cleanPath}`;
  
  console.log('🔍 [about/img] Buscando en local:', { cleanPath, withSlash });
  
  // Buscar en assets locales (con o sin slash inicial)
  // IMPORTANTE: require() ya retorna el asset source correcto para React Native
  if (localImages[cleanPath]) {
    const asset = localImages[cleanPath];
    console.log('✅ [about/img] Encontrado en local (cleanPath):', cleanPath, 'asset:', asset);
    return asset; // Retornar directamente el require()
  }
  if (localImages[withSlash]) {
    const asset = localImages[withSlash];
    console.log('✅ [about/img] Encontrado en local (withSlash):', withSlash, 'asset:', asset);
    return asset; // Retornar directamente el require()
  }
  
  // Fallback al servidor
  const base = (API_BASE || '').replace(/\/+$/, '');
  const serverUrl = `${base}/${cleanPath}`;
  console.log('⚠️ [about/img] No encontrado local, usando servidor:', serverUrl);
  return { uri: serverUrl };
}

const teamMembers = [
  {
    name: 'Maria Carolina Roude',
    role: 'Fundadora',
    specialty: 'Experiencia en Industria de Insumos',
    bio: 'Fundadora de Universo Tattoo con amplia experiencia en la industria de los insumos para tatuajes. Su conocimiento profundo del mercado y las necesidades de los artistas ha sido fundamental para el éxito de la empresa.',
    image: 'img/carolinaroude.jpeg',
    bgColor: '#7C3AED',
    textColor: '#C4B5FD',
  },
  {
    name: 'Cristian Jesus Suarez',
    role: 'Tatuador & Co-fundador',
    specialty: 'Arte del Tatuaje Profesional',
    bio: 'Co-fundador y tatuador profesional de Universo Tattoo. Su experiencia práctica como artista del tatuaje aporta una perspectiva única al desarrollo de productos y servicios de la empresa.',
    image: 'img/cristiansuarez.jpeg',
    bgColor: '#3B82F6',
    textColor: '#93C5FD',
  },
  {
    name: 'Cintia Suarez',
    role: 'Body Piercer Especialista',
    specialty: 'Colocación de Piercings Facial y Corporal',
    bio: 'Especialista en Body Piercing con expertise en colocación de piercings faciales y corporales. Su dedicación a la seguridad y técnicas avanzadas garantiza resultados excepcionales para nuestros clientes.',
    image: 'img/cintiasuarez.jpeg',
    bgColor: '#10B981',
    textColor: '#6EE7B7',
  },
];

const testimonials = [
  {
    name: 'Flavio Alvisto',
    role: 'Tatuador en Alma Tattoo',
    quote:
      'La web de Universo Tattoo es directa y rápida. Pido lo que necesito para el estudio sin vueltas y llega todo bien embalado. Muy buen catálogo y precios claros.',
    image: '/img/alma.webp',
    instagram: 'https://www.instagram.com/alma_tattoo_cdelu/',
  },
  {
    name: 'Erne Brown',
    role: 'Tatuador en 13 Craneos Tattoo',
    quote:
      'Comprar por la web de Universo Tattoo me ahorra tiempo: stock real, descripciones precisas y checkout ágil. Confío porque siempre cumplen con los envíos.',
    image: '/img/erne.jpeg',
    instagram: 'https://www.instagram.com/erne_tattoos/',
  },
  {
    name: 'Pantera Negra Tatuajes',
    role: 'Estudio de Tatuajes y Piercing',
    quote:
      'Para el estudio es clave: encontramos agujas, tintas y materiales descartables en dos clics. La web es clara y el servicio postventa responde al toque. Recomendado.',
    image: '/img/pantera.webp',
    instagram: 'https://www.instagram.com/pantera.negra.tatuajes/',
  },
];

function Pill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.pill}>
      <Ionicons name={icon} size={16} color={C.primary} />
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export default function AboutScreen() {
  const router = useRouter();

  const openURL = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <Screen scroll={false}>
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient colors={['rgba(124,58,237,0.4)', 'rgba(236,72,153,0.3)', 'rgba(10,10,12,0.95)']} style={StyleSheet.absoluteFill} />
          
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>
              <Text style={{ color: '#C4B5FD' }}>Sobre</Text> Universo Tattoo
            </Text>

            <Text style={styles.heroSubtitle}>
              Somos más que una tienda de insumos para tatuajes. Somos una comunidad dedicada a elevar el arte del tatuaje a través de productos de calidad, educación y pasión.
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              <Pill icon="shield-checkmark-outline" label="Productos Certificados" />
              <Pill icon="car-outline" label="Envío a Todo el País" />
              <Pill icon="flash-outline" label="Soporte Técnico" />
            </View>
          </View>
        </View>

        {/* Nuestra Historia */}
        <Section title="Nuestra Historia" subtitle="Cómo comenzó todo">
          <View style={{ gap: 16 }}>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <Image
                source={img('/img/carolina_cristian.jpeg')}
                style={{ width: '100%', height: 250 }}
                resizeMode="cover"
              />
            </Card>

            <View style={{ gap: 12 }}>
              <Text style={styles.paragraph}>
                Fundada en 2020 por un grupo de artistas apasionados, Universo Tattoo nació de la necesidad de productos de alta calidad en el mercado local del tatuaje.
              </Text>

              <Text style={styles.paragraph}>
                Lo que comenzó como una pequeña tienda especializada, rápidamente se convirtió en un referente para artistas y estudios de tatuajes en todo el país, gracias a nuestro compromiso con la excelencia.
              </Text>

              <Text style={styles.paragraph}>
                En estos 5 años de trayectoria, nos hemos consolidado como una empresa confiable en la distribución de insumos para tatuajes, manteniendo siempre nuestro compromiso con la calidad, la innovación y el apoyo a la comunidad artística.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>5+</Text>
                <Text style={styles.statLabel}>Años</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>1000+</Text>
                <Text style={styles.statLabel}>Clientes</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>20+</Text>
                <Text style={styles.statLabel}>Provincias</Text>
              </View>
            </View>
          </View>
        </Section>

        {/* Misión, Visión y Valores */}
        <Section title="Misión, Visión y Valores" subtitle="Los pilares que nos guían">
          <View style={{ gap: 12 }}>
            <Card style={styles.valueCard}>
              <View style={[styles.valueIcon, { backgroundColor: 'rgba(124,58,237,0.2)' }]}>
                <Ionicons name="flag-outline" size={28} color={C.primary} />
              </View>
              <Text style={styles.valueTitle}>Misión</Text>
              <Text style={styles.valueText}>
                Proporcionar a los artistas del tatuaje los mejores productos y herramientas para que puedan expresar su creatividad sin límites, garantizando la seguridad y satisfacción tanto de los profesionales como de sus clientes.
              </Text>
            </Card>

            <Card style={styles.valueCard}>
              <View style={[styles.valueIcon, { backgroundColor: 'rgba(236,72,153,0.2)' }]}>
                <Ionicons name="star-outline" size={28} color={C.pink} />
              </View>
              <Text style={styles.valueTitle}>Visión</Text>
              <Text style={styles.valueText}>
                Ser reconocidos globalmente como la empresa líder en insumos para tatuajes, impulsando la innovación en la industria y contribuyendo al reconocimiento del tatuaje como una forma de arte respetada y valorada en la sociedad.
              </Text>
            </Card>

            <Card style={styles.valueCard}>
              <View style={[styles.valueIcon, { backgroundColor: 'rgba(59,130,246,0.2)' }]}>
                <Ionicons name="ribbon-outline" size={28} color={C.info} />
              </View>
              <Text style={styles.valueTitle}>Valores</Text>
              <View style={{ gap: 6 }}>
                {[
                  'Calidad sin compromisos',
                  'Innovación constante',
                  'Integridad en cada acción',
                  'Pasión por el arte',
                  'Responsabilidad social',
                ].map((value, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.info }} />
                    <Text style={styles.valueText}>{value}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        </Section>

        {/* Nuestro Equipo */}
        <Section title="Nuestro Equipo" subtitle="Las personas detrás de Universo Tattoo">
          <View style={{ gap: 12 }}>
            {teamMembers.map((member) => (
              <Card key={member.name} style={{ padding: 0, overflow: 'hidden' }}>
                <View style={{ width: '100%', height: 400, backgroundColor: '#1A1F2E' }}>
                  <Image
                    source={img(member.image)}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                  />
                </View>
                <View style={{ padding: 16, gap: 8 }}>
                  <Text style={styles.teamName}>{member.name}</Text>
                  <Text style={[styles.teamRole, { color: member.textColor }]}>{member.role}</Text>
                  <View style={{ height: 1, backgroundColor: C.border, marginVertical: 4 }} />
                  <Text style={styles.teamSpecialty}>{member.specialty}</Text>
                  <Text style={styles.teamBio}>{member.bio}</Text>
                </View>
              </Card>
            ))}
          </View>
        </Section>

        {/* Testimonios */}
        <Section title="Lo Que Dicen Nuestros Clientes" subtitle="Profesionales que confían en nosotros">
          <View style={{ gap: 12 }}>
            {testimonials.map((testimonial) => (
              <Pressable
                key={testimonial.name}
                onPress={() => openURL(testimonial.instagram)}
                style={({ pressed }) => [styles.testimonialCard, pressed && { opacity: 0.8 }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Image
                    source={img(testimonial.image)}
                    style={{ width: 56, height: 56, borderRadius: 28 }}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.testimonialName}>{testimonial.name}</Text>
                    <Text style={styles.testimonialRole}>{testimonial.role}</Text>
                  </View>
                </View>
                <Text style={styles.testimonialQuote}>"{testimonial.quote}"</Text>
                <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Ionicons key={i} name="star" size={14} color="#FACC15" />
                  ))}
                </View>
              </Pressable>
            ))}
          </View>
        </Section>

        {/* CTA Final */}
        <View style={styles.ctaContainer}>
          <Card style={{ padding: 20, backgroundColor: 'rgba(124,58,237,0.1)', borderColor: 'rgba(124,58,237,0.3)' }}>
            <Text style={styles.ctaTitle}>¿Listo para Formar Parte de Nuestro Universo?</Text>
            <Text style={styles.ctaText}>
              Descubre nuestra colección de insumos premium para tatuajes y únete a los miles de artistas que confían en Universo Tattoo.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Pressable
                onPress={() => router.push('/(client)/store' as any)}
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.primaryBtnText}>Ver Productos</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => router.push('/(client)/contact' as any)}
                style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.secondaryBtnText}>Contacto</Text>
              </Pressable>
            </View>
          </Card>
        </View>

        {/* Redes Sociales */}
        <View style={styles.socialContainer}>
          <Pressable
            onPress={() => openURL('https://www.instagram.com/universotattoo_insumos/')}
            style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.8 }]}
          >
            <View style={styles.socialIcon}>
              <Ionicons name="logo-instagram" size={24} color={C.primary} />
            </View>
            <Text style={styles.socialText}>Instagram</Text>
          </Pressable>

          <Pressable
            onPress={() => openURL('mailto:contacto@universotattoo.com.ar')}
            style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.8 }]}
          >
            <View style={styles.socialIcon}>
              <Ionicons name="mail-outline" size={24} color={C.primary} />
            </View>
            <Text style={styles.socialText}>Email</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 320,
    justifyContent: 'center',
    position: 'relative',
  },
  heroContent: {
    padding: 20,
    gap: 12,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: C.text,
    lineHeight: 38,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#D1D5DB',
    lineHeight: 24,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
  },
  pillText: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    gap: 16,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: C.muted,
  },
  paragraph: {
    fontSize: 15,
    color: '#D1D5DB',
    lineHeight: 22,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: C.primary,
  },
  statLabel: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },
  valueCard: {
    padding: 20,
    gap: 12,
  },
  valueIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
  },
  valueText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  teamName: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
  },
  teamRole: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  teamSpecialty: {
    fontSize: 13,
    color: C.muted,
  },
  teamBio: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  testimonialCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 16,
  },
  testimonialName: {
    fontSize: 16,
    fontWeight: '800',
    color: C.text,
  },
  testimonialRole: {
    fontSize: 13,
    color: C.primary,
  },
  testimonialQuote: {
    fontSize: 14,
    color: '#D1D5DB',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  ctaContainer: {
    padding: 16,
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    marginBottom: 8,
  },
  ctaText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  primaryBtn: {
    flex: 1,
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
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.5)',
  },
  secondaryBtnText: {
    color: '#C4B5FD',
    fontSize: 15,
    fontWeight: '800',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    padding: 16,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  socialIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialText: {
    color: C.muted,
    fontSize: 14,
    fontWeight: '600',
  },
});
