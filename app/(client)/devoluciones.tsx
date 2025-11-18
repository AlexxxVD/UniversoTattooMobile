import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
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

const returnSteps = [
  {
    icon: 'alert-circle-outline',
    title: 'Identifica el Problema',
    description: 'Verifica el estado del producto y determina si cumple con los requisitos para devolución.',
  },
  {
    icon: 'cube-outline',
    title: 'Empaca el Producto',
    description: 'Asegúrate de incluir todos los accesorios y el empaque original en buen estado.',
  },
  {
    icon: 'refresh-outline',
    title: 'Solicita la Devolución',
    description: 'Contacta a nuestro servicio al cliente o utiliza el formulario en línea.',
  },
  {
    icon: 'checkmark-circle-outline',
    title: 'Recibe el Reembolso',
    description: 'Una vez procesada la devolución, recibirás el reembolso en el método de pago original.',
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function DevolucionesScreen() {
  const router = useRouter();
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
              <Text style={{ color: '#C4B5FD' }}>Política de</Text> Devoluciones
            </Text>
            <Text style={styles.heroSubtitle}>
              Garantizamos tu satisfacción con una política de devoluciones clara y transparente
            </Text>
          </View>
        </View>

        {/* Proceso de Devolución */}
        <Section title="Proceso de Devolución">
          <View style={{ gap: 12 }}>
            {returnSteps.map((step, index) => (
              <Card key={index} style={styles.stepCard}>
                <Ionicons name={step.icon as any} size={32} color={C.primary} />
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </Card>
            ))}
          </View>
        </Section>

        {/* Condiciones y Excepciones */}
        <View style={styles.section}>
          <View style={{ gap: 12 }}>
            <Card style={{ padding: 20, gap: 12 }}>
              <Text style={styles.cardTitle}>Condiciones Generales</Text>
              <View style={{ gap: 10 }}>
                {[
                  { icon: 'time-outline', text: 'Plazo de devolución: 10 días desde la recepción del producto' },
                  { icon: 'cube-outline', text: 'El producto debe estar en su empaque original y sin usar' },
                  { icon: 'alert-circle-outline', text: 'Se requiere factura o comprobante de compra' },
                  { icon: 'checkmark-circle-outline', text: 'Los gastos de envío corren por cuenta del cliente' },
                ].map((item, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', gap: 12 }}>
                    <Ionicons name={item.icon as any} size={20} color={C.primary} style={{ marginTop: 2 }} />
                    <Text style={styles.listText}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </Card>

            <Card style={{ padding: 20, gap: 12 }}>
              <Text style={styles.cardTitle}>Excepciones</Text>
              <View style={{ gap: 6 }}>
                {[
                  'Productos personalizados o hechos a medida',
                  'Productos de higiene personal',
                  'Productos que hayan sido usados o dañados',
                  'Productos que no estén en su empaque original',
                  'Productos comprados en ofertas especiales',
                ].map((item, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ color: C.primary, fontSize: 16 }}>•</Text>
                    <Text style={styles.listText}>{item}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        </View>

        {/* CTA Contacto */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>¿Necesitas iniciar una devolución?</Text>
          <Text style={styles.sectionSubtitle}>Estamos aquí para ayudarte con tu proceso de devolución</Text>

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
    gap: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
  },
  stepCard: {
    padding: 20,
    gap: 12,
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
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
