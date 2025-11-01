import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Screen } from '../../components/layout/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { useTheme } from '../../theme';

const STORE = {
  name: 'Universo Tattoo',
  // Cambiá por tu ubicación real
  lat: -34.603684,
  lng: -58.381559,
  address: 'Bartolomé Mitre 587, Concepción del Uruguay, Entre Ríos',
  phone: '+54 03442 55-0581',
  email: 'contacto@universotattoo.com',
  instagram: 'https://www.instagram.com/universotattoo_insumos/',
};

export default function AboutScreen() {
  const { colors, spacing } = useTheme();
  const [webviewFailed, setWebviewFailed] = useState(false);

  const region = useMemo(
    () => ({ lat: STORE.lat, lng: STORE.lng, zoom: 15 }),
    []
  );

  const openExternalMaps = () => {
    const dest = `${STORE.lat},${STORE.lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
    Linking.openURL(url);
  };

  const staticMapUrl = useMemo(() => {
    const size = '640x300'; // se redimensiona al ancho del contenedor
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${STORE.lat},${STORE.lng}&zoom=${region.zoom}&size=${size}&markers=${STORE.lat},${STORE.lng},red-pushpin`;
  }, [region.zoom]);

  const leafletHTML = useMemo(() => {
    // HTML con Leaflet (OpenStreetMap). Sin keys.
    // Al tocar el mapa, mandamos un postMessage para abrir “Cómo llegar”.
    return `
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
/>
<link
  rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
/>
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background:#0B0F14; }
  .leaflet-container { background: #0B0F14; }
  .leaflet-control-attribution { font-size: 10px; }
</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const lat = ${STORE.lat};
    const lng = ${STORE.lng};

    const map = L.map('map', { zoomControl: true, attributionControl: true })
      .setView([lat, lng], ${region.zoom});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    const popup = '<strong>${STORE.name.replace(/'/g, "\\'")}</strong><br/>${STORE.address.replace(/'/g, "\\'")}';
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

  return (
    <Screen>
      <HeaderBar title="Sobre nosotros" canGoBack />

      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Universo Tattoo</Text>
        <Text style={{ color: colors.textMuted, marginTop: spacing(2), lineHeight: 20 }}>
          Somos una tienda especializada en insumos y equipamiento para tatuadores.
          Trabajamos con marcas de primera línea y ofrecemos atención personalizada.
        </Text>

        <View style={{ marginTop: spacing(3), gap: 6 }}>
          <Text style={{ color: colors.text }}>Horario: Lun a Vie 10:00–18:00</Text>
          <Text style={{ color: colors.text }}>Email: {STORE.email}</Text>
          <Text style={{ color: colors.text }}>Teléfono: {STORE.phone}</Text>
          <Text style={{ color: colors.text }}>Dirección: {STORE.address}</Text>
        </View>

        <View style={{ marginTop: spacing(3), flexDirection: 'row', gap: 8 }}>
          <Button title="Visitar sitio web" variant="outline" onPress={() => Linking.openURL('https://universotattoo.com')} />
          <Button title="Instagram" variant="ghost" onPress={() => Linking.openURL(STORE.instagram)} />
        </View>
      </Card>

      {/* Mapa (OpenStreetMap via WebView) */}
      <Card>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: spacing(2) }}>
          ¿Dónde estamos?
        </Text>

        {webviewFailed ? (
          // Fallback: mapa estático OSM clickeable
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
              setSupportMultipleWindows={false}
              style={styles.webview}
            />
            <View style={styles.mapActions}>
              <Pressable onPress={openExternalMaps} style={styles.mapBtn} hitSlop={8}>
                <Ionicons name="navigate-outline" size={16} color="#fff" />
                <Text style={styles.mapBtnText}>Cómo llegar</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  Linking.openURL(
                    `geo:${STORE.lat},${STORE.lng}?q=${STORE.lat},${STORE.lng}(${encodeURIComponent(STORE.name)})`
                  )
                }
                style={[styles.mapBtn, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
                hitSlop={8}
              >
                <Ionicons name="map-outline" size={16} color="#fff" />
                <Text style={styles.mapBtnText}>Abrir mapa</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing(2) }}>
          <Button title="Llamar" variant="outline" onPress={() => Linking.openURL(`tel:${STORE.phone.replace(/\s/g, '')}`)} />
          <Button title="WhatsApp" variant="ghost" onPress={() => Linking.openURL(`https://wa.me/${STORE.phone.replace(/\D/g, '')}`)} />
          <Button title="Email" onPress={() => Linking.openURL(`mailto:${STORE.email}`)} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapWrap: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
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
    flexDirection: 'row',
    gap: 8,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124,58,237,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  mapBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  staticMapWrap: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#272C36',
  },
  staticMap: { width: '100%', height: '100%' },
  mapOverlayCta: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(124,58,237,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapOverlayText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});