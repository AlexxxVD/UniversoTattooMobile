import React from 'react';
import { Linking, Text, View } from 'react-native';
import { Screen } from '../../components/layout/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { useTheme } from '../../theme';

export default function AboutScreen() {
  const { colors, spacing } = useTheme();

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
          <Text style={{ color: colors.text }}>Email: contacto@universotattoo.com</Text>
          <Text style={{ color: colors.text }}>Teléfono: +54 11 1234-5678</Text>
        </View>

        <Button
          title="Visitar sitio web"
          style={{ marginTop: spacing(3) }}
          onPress={() => Linking.openURL('https://universotattoo.com')}
        />
      </Card>
    </Screen>
  );
}