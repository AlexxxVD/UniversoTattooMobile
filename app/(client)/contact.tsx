import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Linking,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { WebView } from 'react-native-webview';

import { Card } from '../../components/ui/Card';

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
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
};

const STORE = {
  name: 'Universo Tattoo',
  lat: -32.480559584856685,
  lng: -58.23086620578639,
  address: 'Bartolom� Mitre 587, Concepci�n del Uruguay, Entre R�os',
  phone: '+54 9 3442 550581',
  email: 'contacto@universotattoo.com.ar',
  instagram: 'https://www.instagram.com/universotattoo_insumos/',
  whatsapp: 'https://api.whatsapp.com/send?phone=543442550581&text=Hola%20Universo%20Tattoo%20quiero%20m�s%20informaci�n!%20',
};

type FormData = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  acceptTerms: boolean;
  website: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

const SUBJECTS = [
  { value: 'general', label: 'Consulta General' },
  { value: 'products', label: 'Productos y Stock' },
  { value: 'shipping', label: 'Envíos y Entregas' },
  { value: 'support', label: 'Soporte Técnico' },
  { value: 'wholesale', label: 'Ventas Mayoristas' },
];

const FAQS = [
  {
    question: '¿Hacen envíos a todo el país?',
    answer: 'Sí, realizamos envíos a toda Argentina. Envío gratis en compras mayores a $150,000.',
  },
  {
    question: '¿Tienen productos para principiantes?',
    answer: 'Absolutamente. Tenemos kits completos y productos específicos para quienes están empezando.',
  },
  {
    question: '¿Ofrecen asesoramiento técnico?',
    answer: 'Sí, nuestro equipo puede ayudarte a elegir los productos adecuados para tu proyecto.',
  },
];

export default function ContactScreen() {
  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    acceptTerms: false,
    website: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [formStartTime, setFormStartTime] = useState<number>(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [webviewFailed, setWebviewFailed] = useState(false);

  useEffect(() => {
    setFormStartTime(Date.now());
    checkRateLimit();
  }, []);

  const checkRateLimit = async () => {
    try {
      const submissionsStr = await AsyncStorage.getItem('contactSubmissions');
      const submissions: number[] = submissionsStr ? JSON.parse(submissionsStr) : [];
      const currentTime = Date.now();

      const recentSubmissions = submissions.filter((time: number) => currentTime - time < 3600000);

      if (recentSubmissions.length >= 3) {
        const oldestSubmission = Math.min(...recentSubmissions);
        const timeUntilNextSubmission = 3600000 - (currentTime - oldestSubmission);
        const remaining = Math.ceil(timeUntilNextSubmission / 1000);

        setTimeRemaining(remaining);
        setIsRateLimited(true);
      }
    } catch (error) {
      console.error('Error checking rate limit:', error);
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (isRateLimited && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRateLimited(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRateLimited, timeRemaining]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (form.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(form.name)) {
      newErrors.name = 'El nombre solo puede contener letras';
    }

    if (!form.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Ingresa un correo electrónico válido';
    }

    if (!form.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    } else if (form.phone.trim().length < 10) {
      newErrors.phone = 'El teléfono debe tener al menos 10 dígitos';
    } else if (!/^[\d\s\-()+]+$/.test(form.phone)) {
      newErrors.phone = 'El teléfono solo puede contener números';
    }

    if (!form.subject) {
      newErrors.subject = 'Selecciona un tema';
    }

    if (!form.message.trim()) {
      newErrors.message = 'El mensaje es requerido';
    } else if (form.message.trim().length < 10) {
      newErrors.message = 'El mensaje debe tener al menos 10 caracteres';
    }

    if (!form.acceptTerms) {
      newErrors.acceptTerms = 'Debes aceptar los términos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Toast.show({ type: 'error', text1: 'Por favor corrige los errores del formulario' });
      return;
    }

    const currentTime = Date.now();
    const timeTaken = currentTime - formStartTime;

    if (form.website && form.website.trim() !== '') {
      Toast.show({ type: 'error', text1: 'Formulario inválido' });
      return;
    }

    if (timeTaken < 3000) {
      Toast.show({ type: 'error', text1: 'Por favor, tómate un momento para completar el formulario' });
      return;
    }

    try {
      const submissionsStr = await AsyncStorage.getItem('contactSubmissions');
      const submissions: number[] = submissionsStr ? JSON.parse(submissionsStr) : [];
      const recentSubmissions = submissions.filter((time: number) => currentTime - time < 3600000);

      if (recentSubmissions.length >= 3) {
        const oldestSubmission = Math.min(...recentSubmissions);
        const timeUntilNextSubmission = 3600000 - (currentTime - oldestSubmission);
        const remaining = Math.ceil(timeUntilNextSubmission / 1000);

        setTimeRemaining(remaining);
        setIsRateLimited(true);
        Toast.show({
          type: 'error',
          text1: 'Límite alcanzado',
          text2: `Espera ${Math.floor(remaining / 60)} minutos para enviar otro mensaje`,
        });
        return;
      }

      setIsSubmitting(true);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const updatedSubmissions = [...recentSubmissions, currentTime];
      await AsyncStorage.setItem('contactSubmissions', JSON.stringify(updatedSubmissions));

      setShowConfirmation(true);
      Toast.show({
        type: 'success',
        text1: '¡Mensaje enviado!',
        text2: 'Gracias por contactarnos. Te responderemos pronto.',
      });

      setForm({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        acceptTerms: false,
        website: '',
      });
      setErrors({});
      setFormStartTime(Date.now());

      setTimeout(() => {
        setShowConfirmation(false);
      }, 5000);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo enviar el mensaje. Intenta de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameInput = (text: string) => {
    const value = text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    setForm({ ...form, name: value });
    if (errors.name) setErrors({ ...errors, name: undefined });
  };

  const handlePhoneInput = (text: string) => {
    const value = text.replace(/[^\d\s\-()+]/g, '');
    setForm({ ...form, phone: value });
    if (errors.phone) setErrors({ ...errors, phone: undefined });
  };

  const openExternalMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${STORE.lat},${STORE.lng}&travelmode=driving`;
    Linking.openURL(url);
  };

  const staticMapUrl = useMemo(() => {
    const size = '640x300';
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${STORE.lat},${STORE.lng}&zoom=16&size=${size}&markers=${STORE.lat},${STORE.lng},red-pushpin`;
  }, []);

  const leafletHTML = useMemo(() => {
    return `
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background:#0B0F14; }
  .leaflet-container { background: #0B0F14; }
</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const lat = ${STORE.lat};
    const lng = ${STORE.lng};
    const map = L.map('map', { zoomControl: true }).setView([lat, lng], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19
    }).addTo(map);
    const popup = '<strong>${STORE.name}</strong><br/>${STORE.address}';
    L.marker([lat, lng]).addTo(map).bindPopup(popup).openPopup();
    function postNav() {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage('nav');
      }
    }
    map.on('click', postNav);
  </script>
</body>
</html>
    `.trim();
  }, []);

  const contactMethods = [
    {
      icon: 'logo-whatsapp',
      title: 'WhatsApp',
      description: 'Respuesta inmediata',
      contact: STORE.phone,
      link: STORE.whatsapp,
      color: C.success,
    },
    {
      icon: 'mail-outline',
      title: 'Email',
      description: 'Para consultas detalladas',
      contact: STORE.email,
      link: `mailto:${STORE.email}`,
      color: C.info,
    },
    {
      icon: 'logo-instagram',
      title: 'Instagram',
      description: 'Síguenos en redes',
      contact: '@universotattoo_insumos',
      link: STORE.instagram,
      color: C.pink,
    },
  ];

  return (
    <RNSafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['right', 'bottom', 'left']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Contactanos</Text>
          <Text style={styles.heroSubtitle}>
            ¿Tenés dudas sobre nuestros productos? ¿Necesitás asesoramiento? Estamos aquí para ayudarte.
          </Text>
        </View>

        {isRateLimited && (
          <View style={styles.rateLimitBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <Ionicons name="time-outline" size={24} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.rateLimitTitle}>Ya solicitaste contacto</Text>
                <Text style={styles.rateLimitText}>
                  Podrás enviar otro mensaje en {Math.floor(timeRemaining / 3600)}h {Math.floor((timeRemaining % 3600) / 60)}
                  m {timeRemaining % 60}s
                </Text>
              </View>
            </View>
            <Pressable onPress={() => setIsRateLimited(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>
        )}

        {showConfirmation && (
          <View style={styles.confirmationBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.confirmationTitle}>¡Mensaje Enviado!</Text>
                <Text style={styles.confirmationText}>Te responderemos pronto</Text>
              </View>
            </View>
            <Pressable onPress={() => setShowConfirmation(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          {contactMethods.map((method, index) => (
            <Pressable
              key={index}
              onPress={() => Linking.openURL(method.link)}
              style={({ pressed }) => [styles.contactMethod, pressed && { opacity: 0.8 }]}
            >
              <View style={[styles.contactIcon, { backgroundColor: method.color }]}>
                <Ionicons name={method.icon as any} size={24} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactTitle}>{method.title}</Text>
                <Text style={styles.contactDescription}>{method.description}</Text>
                <Text style={styles.contactInfo}>{method.contact}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.muted} />
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <Card>
            <View style={{ gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color={C.primary} />
                <Text style={styles.formTitle}>Envíanos un Mensaje</Text>
              </View>

              <TextInput
                value={form.website}
                onChangeText={(text) => setForm({ ...form, website: text })}
                style={{ position: 'absolute', left: -9999, opacity: 0, height: 0 }}
                autoComplete="off"
              />

              <View style={{ gap: 16 }}>
                <View>
                  <Text style={styles.label}>Nombre completo</Text>
                  <TextInput
                    value={form.name}
                    onChangeText={handleNameInput}
                    placeholder="Tu nombre"
                    placeholderTextColor={C.muted}
                    style={[styles.input, errors.name && styles.inputError]}
                  />
                  {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                </View>

                <View>
                  <Text style={styles.label}>Teléfono</Text>
                  <TextInput
                    value={form.phone}
                    onChangeText={handlePhoneInput}
                    placeholder="+54 9 1234-5678"
                    placeholderTextColor={C.muted}
                    keyboardType="phone-pad"
                    style={[styles.input, errors.phone && styles.inputError]}
                  />
                  {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                </View>
              </View>

              <View>
                <Text style={styles.label}>Correo electrónico</Text>
                <TextInput
                  value={form.email}
                  onChangeText={(text) => {
                    setForm({ ...form, email: text });
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  placeholder="tu@email.com"
                  placeholderTextColor={C.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.input, errors.email && styles.inputError]}
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              <View>
                <Text style={styles.label}>Tema de consulta</Text>
                <Pressable
                  onPress={() => setShowSubjectPicker(true)}
                  style={[styles.input, { justifyContent: 'center' }, errors.subject && styles.inputError]}
                >
                  <Text style={{ color: form.subject ? C.text : C.muted }}>
                    {form.subject ? SUBJECTS.find((s) => s.value === form.subject)?.label : 'Selecciona un tema'}
                  </Text>
                </Pressable>
                {errors.subject && <Text style={styles.errorText}>{errors.subject}</Text>}
              </View>

              <View>
                <Text style={styles.label}>Mensaje</Text>
                <TextInput
                  value={form.message}
                  onChangeText={(text) => {
                    setForm({ ...form, message: text });
                    if (errors.message) setErrors({ ...errors, message: undefined });
                  }}
                  placeholder="Contanos en qué podemos ayudarte..."
                  placeholderTextColor={C.muted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={[styles.textarea, errors.message && styles.inputError]}
                />
                {errors.message && <Text style={styles.errorText}>{errors.message}</Text>}
              </View>

              <Pressable
                onPress={() => {
                  setForm({ ...form, acceptTerms: !form.acceptTerms });
                  if (errors.acceptTerms) setErrors({ ...errors, acceptTerms: undefined });
                }}
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}
              >
                <View
                  style={[
                    styles.checkbox,
                    form.acceptTerms && styles.checkboxChecked,
                    errors.acceptTerms && styles.checkboxError,
                  ]}
                >
                  {form.acceptTerms && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={[styles.checkboxLabel, errors.acceptTerms && { color: C.danger }]}>
                  Acepto los términos y condiciones y la política de privacidad *
                </Text>
              </Pressable>
              {errors.acceptTerms && <Text style={styles.errorText}>{errors.acceptTerms}</Text>}

              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting || isRateLimited}
                style={({ pressed }) => [
                  styles.submitBtn,
                  (isSubmitting || isRateLimited) && styles.submitBtnDisabled,
                  pressed && { opacity: 0.9 },
                ]}
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.submitBtnText}>Enviando...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#fff" />
                    <Text style={styles.submitBtnText}>Enviar Mensaje</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Card>
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="location-outline" size={24} color={C.primary} />
                <Text style={styles.formTitle}>Nuestra Ubicación</Text>
              </View>

              {webviewFailed ? (
                <Pressable onPress={openExternalMaps} style={styles.staticMapWrap}>
                  <Image source={{ uri: staticMapUrl }} style={styles.staticMap} resizeMode="cover" />
                  <View style={styles.mapOverlayCta}>
                    <Ionicons name="navigate-outline" size={16} color="#fff" />
                    <Text style={styles.mapOverlayText}>Cómo llegar</Text>
                  </View>
                </Pressable>
              ) : (
                <View style={styles.mapWrap}>
                  <WebView
                    originWhitelist={['*']}
                    source={{ html: leafletHTML }}
                    onMessage={(e) => {
                      if (e?.nativeEvent?.data === 'nav') openExternalMaps();
                    }}
                    onError={() => setWebviewFailed(true)}
                    onHttpError={() => setWebviewFailed(true)}
                    javaScriptEnabled
                    domStorageEnabled
                    style={styles.webview}
                  />
                  <View style={styles.mapActions}>
                    <Pressable onPress={openExternalMaps} style={styles.mapBtn} hitSlop={8}>
                      <Ionicons name="navigate-outline" size={16} color="#fff" />
                      <Text style={styles.mapBtnText}>Cómo llegar</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <View style={{ gap: 8, marginTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="location" size={16} color={C.primary} />
                  <Text style={styles.mapInfo}>{STORE.address}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="time-outline" size={16} color={C.primary} />
                  <Text style={styles.mapInfo}>Lunes a Sábados: 14:00 - 21:00</Text>
                </View>
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Card>
            <Text style={[styles.formTitle, { marginBottom: 16 }]}>Preguntas Frecuentes</Text>
            <View style={{ gap: 16 }}>
              {FAQS.map((faq, index) => (
                <View key={index} style={[styles.faqItem, index < FAQS.length - 1 && styles.faqBorder]}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                </View>
              ))}
            </View>
          </Card>
        </View>
      </ScrollView>

      <Modal
        visible={showSubjectPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSubjectPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSubjectPicker(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona un tema</Text>
              <Pressable onPress={() => setShowSubjectPicker(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={C.text} />
              </Pressable>
            </View>
            <ScrollView>
              {SUBJECTS.map((subject) => (
                <Pressable
                  key={subject.value}
                  onPress={() => {
                    setForm({ ...form, subject: subject.value });
                    if (errors.subject) setErrors({ ...errors, subject: undefined });
                    setShowSubjectPicker(false);
                  }}
                  style={({ pressed }) => [
                    styles.modalItem,
                    form.subject === subject.value && styles.modalItemSelected,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.modalItemText, form.subject === subject.value && styles.modalItemTextSelected]}>
                    {subject.label}
                  </Text>
                  {form.subject === subject.value && <Ionicons name="checkmark" size={20} color={C.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </RNSafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: C.primary,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 24,
  },
  rateLimitBanner: {
    backgroundColor: C.warning,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateLimitTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  rateLimitText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
  },
  confirmationBanner: {
    backgroundColor: C.success,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmationTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  confirmationText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  contactDescription: {
    fontSize: 13,
    color: C.muted,
    marginTop: 2,
  },
  contactInfo: {
    fontSize: 14,
    color: C.primary,
    marginTop: 4,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: C.muted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    color: C.text,
    fontSize: 15,
  },
  inputError: {
    borderColor: C.danger,
  },
  textarea: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    color: C.text,
    fontSize: 15,
    minHeight: 120,
  },
  errorText: {
    color: C.danger,
    fontSize: 12,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  checkboxError: {
    borderColor: C.danger,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: C.muted,
    lineHeight: 18,
  },
  submitBtn: {
    backgroundColor: C.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  mapWrap: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  webview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0B0F14',
  },
  mapActions: {
    position: 'absolute',
    right: 8,
    bottom: 8,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124,58,237,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  mapBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  staticMapWrap: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: C.border,
  },
  staticMap: {
    width: '100%',
    height: '100%',
  },
  mapOverlayCta: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(124,58,237,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapOverlayText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  mapInfo: {
    color: C.text,
    fontSize: 13,
    flex: 1,
  },
  faqItem: {
    paddingBottom: 16,
  },
  faqBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  faqQuestion: {
    color: C.primary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  faqAnswer: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalItemSelected: {
    backgroundColor: C.primarySoft,
  },
  modalItemText: {
    fontSize: 16,
    color: C.text,
  },
  modalItemTextSelected: {
    fontWeight: '700',
    color: C.primary,
  },
});
