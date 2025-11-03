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

const features = [
  {
    icon: 'cube-outline',
    title: 'Cobertura Nacional',
    description: 'Enviamos a todo el territorio argentino a través de OCA y Correo Argentino.',
  },
  {
    icon: 'timer-outline',
    title: 'Tiempos Estimados',
    description: '2 a 6 días hábiles según localidad. Grandes centros urbanos: 2-4 días.',
  },
  {
    icon: 'gift-outline',
    title: 'Envío Gratis',
    description: 'Compras superiores a $150.000 incluyen envío sin cargo.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Seguimiento',
    description: 'Código de tracking para rastrear tu pedido en tiempo real.',
  },
  {
    icon: 'notifications-outline',
    title: 'Notificaciones',
    description: 'Actualizaciones por email y WhatsApp del estado de tu envío.',
  },
  {
    icon: 'home-outline',
    title: 'Entrega a Domicilio',
    description: 'Recibí tu pedido en la puerta de tu casa u oficina.',
  },
];

const processSteps = [
  {
    icon: 'checkmark-circle-outline',
    title: 'Confirmación',
    description: 'Una vez acreditado el pago, confirmamos tu pedido.',
  },
  {
    icon: 'cube-outline',
    title: 'Preparación',
    description: 'Preparamos y embalamos tu pedido con cuidado.',
  },
  {
    icon: 'send-outline',
    title: 'Despacho',
    description: 'Enviamos y te compartimos el código de seguimiento.',
  },
  {
    icon: 'home-outline',
    title: 'Entrega',
    description: 'El operador logístico entrega en tu domicilio.',
  },
];

const restrictions = [
  {
    icon: 'alert-circle-outline',
    title: 'Zonas remotas',
    text: 'Algunas localidades pueden tener demoras adicionales.',
  },
  {
    icon: 'close-circle-outline',
    title: 'Envío internacional',
    text: 'Actualmente solo realizamos envíos dentro de Argentina.',
  },
  {
    icon: 'warning-outline',
    title: 'Fuerza mayor',
    text: 'Demoras por huelgas, condiciones climáticas o eventos externos están fuera de nuestro control.',
  },
];

export default function EnviosScreen() {
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
              <Text style={{ color: '#C4B5FD' }}>Información</Text> de Envíos
            </Text>
            <Text style={styles.heroSubtitle}>Recibí tus productos de forma rápida y segura</Text>
          </View>
        </View>

        {/* Proceso de Envío */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proceso de Envío</Text>
          <Text style={styles.sectionSubtitle}>Seguí el recorrido de tu pedido paso a paso</Text>

          <View style={{ gap: 12, marginTop: 16 }}>
            {processSteps.map((step, index) => (
              <Card key={index} style={styles.stepCard}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name={step.icon as any} size={20} color={C.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.stepTitle}>{step.title}</Text>
                  </View>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </Card>
            ))}
          </View>
        </View>

        {/* Características */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Características de Envío</Text>

          <View style={{ gap: 12, marginTop: 16 }}>
            {features.map((feature, index) => (
              <Card key={index} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon as any} size={28} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </Card>
            ))}
          </View>
        </View>

        {/* Restricciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consideraciones Importantes</Text>

          <View style={{ gap: 12, marginTop: 16 }}>
            {restrictions.map((item, index) => (
              <Card key={index} style={styles.restrictionCard}>
                <Ionicons name={item.icon as any} size={24} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.restrictionTitle}>{item.title}</Text>
                  <Text style={styles.restrictionText}>{item.text}</Text>
                </View>
              </Card>
            ))}
          </View>
        </View>

        {/* CTA Contacto */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>¿Dudas sobre tu envío?</Text>
          <Text style={styles.sectionSubtitle}>
            Nuestro equipo está disponible para ayudarte con cualquier consulta.
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
  stepCard: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: C.text,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  stepDescription: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
    marginTop: 4,
  },
  featureCard: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(124,58,237,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  restrictionCard: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  restrictionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
  },
  restrictionText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
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
