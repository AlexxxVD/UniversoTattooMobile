import React from 'react';
import { BaseToast, ErrorToast } from 'react-native-toast-message';
import { useTheme } from '../../theme';

// Úsalo más adelante si querés toasts con colores de marca.
// No es obligatorio cambiar tu _layout hoy.
export function useToastConfig() {
  const { colors } = useTheme();
  const config = {
    success: (props: any) => (
      <BaseToast
        {...props}
        style={{ borderLeftColor: colors.success, backgroundColor: '#111111', borderLeftWidth: 6 }}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        text1Style={{ color: '#D1FAE5', fontWeight: '700' }}
        text2Style={{ color: '#A7F3D0' }}
      />
    ),
    error: (props: any) => (
      <ErrorToast
        {...props}
        style={{ borderLeftColor: colors.danger, backgroundColor: '#111111', borderLeftWidth: 6 }}
        text1Style={{ color: '#FCA5A5', fontWeight: '700' }}
        text2Style={{ color: '#FECACA' }}
      />
    ),
  } as const;
  return config;
}