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

const faqs = [
  {
    category: 'Compras y Pagos',
    icon: 'card-outline',
    questions: [
      {
        question: '¿Qué medios de pago aceptan?',
        answer: 'Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express), transferencias bancarias y Mercado Pago.',
      },
      {
        question: '¿Los precios incluyen IVA?',
        answer: 'Sí, todos los precios publicados incluyen IVA.',
      },
      {
        question: '¿Puedo cancelar mi pedido?',
        answer: 'Sí, podés cancelar tu pedido dentro de las 24 horas posteriores a la compra, siempre que no haya sido despachado.',
      },
    ],
  },
  {
    category: 'Envíos',
    icon: 'car-outline',
    questions: [
      {
        question: '¿Cuánto tarda en llegar mi pedido?',
        answer: 'El tiempo estimado es de 2 a 6 días hábiles según tu localidad. Grandes centros urbanos suelen recibir en 2-4 días.',
      },
      {
        question: '¿Realizan envíos a todo el país?',
        answer: 'Sí, enviamos a todo el territorio argentino a través de OCA y Correo Argentino.',
      },
      {
        question: '¿El envío tiene costo?',
        answer: 'El envío tiene costo, pero ofrecemos envío gratis en compras superiores a $150.000.',
      },
      {
        question: '¿Puedo hacer seguimiento de mi pedido?',
        answer: 'Sí, una vez despachado tu pedido recibirás un código de tracking para rastrearlo en tiempo real.',
      },
    ],
  },
  {
    category: 'Productos',
    icon: 'cube-outline',
    questions: [
      {
        question: '¿Los productos son originales?',
        answer: 'Sí, todos nuestros productos son 100% originales y garantizados.',
      },
      {
        question: '¿Tienen garantía?',
        answer: 'Sí, todos nuestros productos cuentan con garantía oficial del fabricante.',
      },
    ],
  },
  {
    category: 'Devoluciones',
    icon: 'refresh-outline',
    questions: [
      {
        question: '¿Puedo devolver un producto?',
        answer: 'Sí, tenés 10 días hábiles desde la recepción para solicitar una devolución, según la Ley de Defensa del Consumidor.',
      },
      {
        question: '¿Qué productos no se pueden devolver?',
        answer: 'No se aceptan devoluciones de productos usados, abiertos o personalizados.',
      },
      {
        question: '¿Quién paga el envío de la devolución?',
        answer: 'El costo del envío de devolución está a cargo del cliente, salvo que el producto tenga un defecto o error de nuestra parte.',
      },
    ],
  },
];

export default function PreguntasFrecuentesScreen() {
  const router = useRouter();
  const [openQuestions, setOpenQuestions] = useState<string[]>([]);

  const toggleQuestion = (id: string) => {
    setOpenQuestions((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
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
              <Text style={{ color: '#C4B5FD' }}>Preguntas</Text> Frecuentes
            </Text>
            <Text style={styles.heroSubtitle}>Encontrá respuestas a las dudas más comunes</Text>
          </View>
        </View>

        {/* FAQs por Categoría */}
        {faqs.map((category, catIndex) => (
          <View key={catIndex} style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Ionicons name={category.icon as any} size={28} color={C.primary} />
              <Text style={styles.categoryTitle}>{category.category}</Text>
            </View>

            <View style={{ gap: 12 }}>
              {category.questions.map((item, qIndex) => {
                const questionId = `${catIndex}-${qIndex}`;
                const isOpen = openQuestions.includes(questionId);

                return (
                  <Card key={qIndex} style={{ padding: 0, overflow: 'hidden' }}>
                    <Pressable
                      onPress={() => toggleQuestion(questionId)}
                      style={({ pressed }) => [
                        styles.questionHeader,
                        pressed && { backgroundColor: 'rgba(124,58,237,0.1)' },
                      ]}
                    >
                      <Text style={styles.questionText}>{item.question}</Text>
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={C.primary}
                      />
                    </Pressable>

                    {isOpen && (
                      <View style={styles.answerContainer}>
                        <View style={styles.answerDivider} />
                        <Text style={styles.answerText}>{item.answer}</Text>
                      </View>
                    )}
                  </Card>
                );
              })}
            </View>
          </View>
        ))}

        {/* CTA Contacto */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>¿No encontraste tu respuesta?</Text>
          <Text style={styles.sectionSubtitle}>
            Nuestro equipo está listo para ayudarte. Contactanos por el medio que prefieras.
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
  categoryTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
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
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    gap: 12,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    flex: 1,
  },
  answerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  answerDivider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 16,
  },
  answerText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
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
