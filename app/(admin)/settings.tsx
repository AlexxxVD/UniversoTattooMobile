import React, { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import Card from '../../components/ui/Card';
import Screen from '../../components/ui/Screen';
import SectionHeader from '../../components/ui/SectionHeader';
import { colors } from '../../theme/color';

export default function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);
  const [confirmDeletes, setConfirmDeletes] = useState(true);
  const [vibration, setVibration] = useState(true);

  return (
    <Screen padded>
      <View style={styles.container}>
        <SectionHeader
          title="Ajustes"
          subtitle="Configuraciones generales"
        />

        <Card style={styles.card}>
          <SettingRow
            label="Notificaciones push"
            subtitle="Recibir alertas y actualizaciones"
            value={pushEnabled}
            onValueChange={setPushEnabled}
          />
          <Divider />

          <SettingRow
            label="Ahorro de datos"
            subtitle="Reducir uso de datos en redes móviles"
            value={dataSaver}
            onValueChange={setDataSaver}
          />
          <Divider />

          <SettingRow
            label="Confirmar antes de eliminar"
            subtitle="Mostrar confirmación en acciones destructivas"
            value={confirmDeletes}
            onValueChange={setConfirmDeletes}
          />
          <Divider />

          <SettingRow
            label="Vibración"
            subtitle="Vibrar en interacciones clave"
            value={vibration}
            onValueChange={setVibration}
          />
        </Card>

        {/* Agregá tus toggles o preferencias acá */}
      </View>
    </Screen>
  );
}

function SettingRow({
  label,
  subtitle,
  value,
  onValueChange,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(168,85,247,0.45)' }}
        thumbColor={value ? colors.primary : '#9CA3AF'}
      />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12, gap: 12 },
  card: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  label: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, marginTop: 2 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    opacity: 0.8,
  },
});