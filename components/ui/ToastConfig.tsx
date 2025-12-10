import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BaseToastProps } from 'react-native-toast-message';

// Colores de la marca Universo Tattoo
const C = {
  bg: '#0E1116',
  card: '#141821',
  violet: '#7C3AED',
  violetSoft: 'rgba(124,58,237,0.15)',
  violetBorder: 'rgba(124,58,237,0.5)',
  pink: '#EC4899',
  pinkSoft: 'rgba(236,72,153,0.15)',
  pinkBorder: 'rgba(236,72,153,0.5)',
  success: '#22C55E',
  successSoft: 'rgba(34,197,94,0.15)',
  successBorder: 'rgba(34,197,94,0.5)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239,68,68,0.15)',
  dangerBorder: 'rgba(239,68,68,0.5)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245,158,11,0.15)',
  warningBorder: 'rgba(245,158,11,0.5)',
  info: '#60A5FA',
  infoSoft: 'rgba(96,165,250,0.15)',
  infoBorder: 'rgba(96,165,250,0.5)',
  text: '#F3F4F6',
  muted: '#A0A8B0',
};

interface CustomToastProps extends BaseToastProps {
  text1?: string;
  text2?: string;
}

const CustomToast = ({
  text1,
  text2,
  icon,
  iconColor,
  bgColor,
  borderColor,
  accentColor,
}: CustomToastProps & {
  icon: string;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  accentColor: string;
}) => (
  <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
    <View style={[styles.iconContainer, { backgroundColor: accentColor }]}>
      <Ionicons name={icon as any} size={22} color={iconColor} />
    </View>
    <View style={styles.textContainer}>
      {text1 && <Text style={[styles.text1, { color: C.text }]}>{text1}</Text>}
      {text2 && <Text style={[styles.text2, { color: C.muted }]}>{text2}</Text>}
    </View>
  </View>
);

// Configuración exportada para usar en Toast
export const toastConfig = {
  success: (props: CustomToastProps) => (
    <CustomToast
      {...props}
      icon="checkmark-circle"
      iconColor={C.success}
      bgColor={C.card}
      borderColor={C.successBorder}
      accentColor={C.successSoft}
    />
  ),
  error: (props: CustomToastProps) => (
    <CustomToast
      {...props}
      icon="close-circle"
      iconColor={C.danger}
      bgColor={C.card}
      borderColor={C.dangerBorder}
      accentColor={C.dangerSoft}
    />
  ),
  info: (props: CustomToastProps) => (
    <CustomToast
      {...props}
      icon="information-circle"
      iconColor={C.violet}
      bgColor={C.card}
      borderColor={C.violetBorder}
      accentColor={C.violetSoft}
    />
  ),
  warning: (props: CustomToastProps) => (
    <CustomToast
      {...props}
      icon="warning"
      iconColor={C.warning}
      bgColor={C.card}
      borderColor={C.warningBorder}
      accentColor={C.warningSoft}
    />
  ),
  // Toast especial para carrito (violeta/rosa)
  cart: (props: CustomToastProps) => (
    <CustomToast
      {...props}
      icon="cart"
      iconColor={C.pink}
      bgColor={C.card}
      borderColor={C.pinkBorder}
      accentColor={C.pinkSoft}
    />
  ),
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '92%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  text1: {
    fontSize: 15,
    fontWeight: '700',
  },
  text2: {
    fontSize: 13,
    marginTop: 2,
  },
});