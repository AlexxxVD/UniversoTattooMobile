import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Card } from '@/components/ui/Card';

const C = {
  bg: '#0E1116',
  card: '#141821',
  border: '#2A2F3A',
  text: '#F3F4F6',
  muted: '#A0A8B0',
  primary: '#7C3AED',
  pink: '#EC4899',
};

const sections = [
  {
    icon: 'person-outline',
    title: 'Cuentas de Usuario',
    content: [
      'Registro con datos reales y actualizados.',
      'Obligación del usuario de mantener su contraseña segura.',
      'Derecho de la empresa a suspender cuentas fraudulentas o mal uso.',
      'Restricción: mayores de 18 años (o consentimiento parental).',
    ],
  },
  {
    icon: 'card-outline',
    title: 'Pagos y Facturación',
    content: [
      'Todos los precios están en pesos argentinos e incluyen IVA.',
      'Métodos de pago aceptados: tarjeta de crédito/débito, transferencias u otros medios habilitados en el checkout.',
      'Los precios pueden modificarse sin previo aviso.',
      'Promociones no acumulables salvo indicación expresa.',
      'La compra se confirma solo tras la acreditación del pago.',
    ],
  },
  {
    icon: 'car-outline',
    title: 'Política de Envíos',
    content: [
      'Cobertura: solo Argentina.',
      'Tiempo estimado de entrega: 2–6 días hábiles (dependiendo de localidad y operador).',
      'Envío gratis desde $150.000.',
      'Los tiempos pueden variar por factores externos (huelgas, demoras de correos, etc.).',
      'Responsable de la entrega: OCA / Correo Argentino u otro operador logístico.',
    ],
  },
  {
    icon: 'refresh-outline',
    title: 'Cambios y Devoluciones',
    content: [
      'Plazo para solicitar devoluciones: 10 días hábiles desde la recepción (Ley de Defensa del Consumidor).',
      'Productos deben estar sin uso, en empaque original y con factura.',
      'No se aceptan cambios de productos usados, abiertos o personalizados.',
      'Costos de envío de devolución: a cargo del cliente salvo error o falla del producto.',
    ],
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Privacidad y Datos',
    content: [
      'Se recolectan datos solo para procesar pedidos y mejorar la experiencia.',
      'No se comparten datos con terceros sin consentimiento.',
      'Los usuarios pueden solicitar la eliminación de sus datos.',
      'Uso de cookies con fines de navegación y analítica.',
    ],
  },
  {
    icon: 'lock-closed-outline',
    title: 'Propiedad Intelectual',
    content: [
      'Todo el contenido (imágenes, videos, diseños, marca Universo Tattoo) es de uso exclusivo.',
      'Prohibida la reproducción no autorizada.',
      'Uso comercial de materiales requiere autorización escrita.',
    ],
  },
  {
    icon: 'warning-outline',
    title: 'Limitación de Responsabilidad',
    content: [
      'Universo Tattoo no se hace responsable por:',
      'Retrasos atribuibles al operador logístico.',
      'Daños indirectos, pérdida de beneficios o uso indebido de productos.',
    ],
  },
  {
    icon: 'document-text-outline',
    title: 'Modificaciones a los Términos',
    content: [
      'Universo Tattoo puede actualizar los Términos y Condiciones en cualquier momento.',
      'La fecha de última actualización se mostrará en esta página.',
      'Es responsabilidad del usuario revisar periódicamente los cambios.',
    ],
  },
];

export default function TerminosYCondicionesScreen() {
  const router = useRouter();
  const [openSections, setOpenSections] = useState<number[]>([]);

  const toggleSection = (index: number) => {
    setOpenSections((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const openURL = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <Screen scroll={false}>
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient
            colors={['rgba(124,58,237,0.4)', 'rgba(236,72,153,0.3)', 'rgba(10,10,12,0.95)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>
              <Text style={{ color: '#C4B5FD' }}>Términos y</Text> Condiciones
            </Text>
            <Text style={styles.heroSubtitle}>Última actualización: 1 de Septiembre de 2025</Text>
          </View>
        </View>

        {/* Secciones Expandibles */}
        <View style={styles.section}>
          {sections.map((section, index) => (
            <Card key={index} style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
              <Pressable
                onPress={() => toggleSection(index)}
                style={({ pressed }) => [
                  styles.sectionHeader,
                  pressed && { backgroundColor: 'rgba(124,58,237,0.1)' },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons name={section.icon as any} size={24} color={C.primary} />
                  <Text style={styles.sectionHeaderText}>{section.title}</Text>
                </View>
                <Ionicons
                  name={openSections.includes(index) ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={C.primary}
                />
              </Pressable>

              {openSections.includes(index) && (
                <View style={styles.sectionContent}>
                  <View style={styles.contentDivider} />
                  {section.content.map((item, idx) => (
                    <View key={idx} style={styles.listItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.listText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          ))}
        </View>

        {/* CTA Contacto */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>¿Necesitas ayuda con nuestros términos?</Text>
          <Text style={styles.sectionSubtitle}>
            Nuestro equipo está aquí para ayudarte. Contáctanos a través de cualquiera de estos medios.
          </Text>

          <View style={{ gap: 12, marginTop: 16 }}>
            <Pressable
              onPress={() => openURL('mailto:contacto@universotattoo.com.ar')}
              style={({ pressed }) => [styles.contactCard, pressed && { opacity: 0.8 }]}
            >
              <Ionicons name="mail-outline" size={32} color={C.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.contactTitle}>Email</Text>
                <Text style={styles.contactText}>contacto@universotattoo.com.ar</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => openURL('https://wa.me/5493442550581')}
              style={({ pressed }) => [styles.contactCard, pressed && { opacity: 0.8 }]}
            >
              <Ionicons name="logo-whatsapp" size={32} color={C.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.contactTitle}>WhatsApp</Text>
                <Text style={styles.contactText}>+54 9 3442 550581</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(client)/contact' as any)}
              style={({ pressed }) => [styles.contactCard, pressed && { opacity: 0.8 }]}
            >
              <Ionicons name="chatbubble-outline" size={32} color={C.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.contactTitle}>Contacto</Text>
                <Text style={styles.contactText}>Formulario de contacto</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 200,
    justifyContent: 'center',
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    gap: 12,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginLeft: 12,
    flex: 1,
  },
  sectionContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  contentDivider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  bullet: {
    color: C.primary,
    fontSize: 16,
    lineHeight: 20,
  },
  listText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
    flex: 1,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: C.card,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  contactText: {
    fontSize: 13,
    color: C.muted,
  },
});
