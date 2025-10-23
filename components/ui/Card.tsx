import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

type Props = { children: React.ReactNode; style?: ViewStyle; bordered?: boolean };

export function Card({ children, style, bordered = true }: Props) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: bordered ? 1 : 0,
          borderColor: colors.surfaceBorder,
          padding: 14,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}