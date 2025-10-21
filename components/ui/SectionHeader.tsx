import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { colors } from '../../theme/color';

type Props = ViewProps & { title: string; subtitle?: string }

export default function SectionHeader({ title, subtitle, style, ...rest }: Props) {
  return (
    <View style={[styles.container, style]} {...rest}>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 4,
  },
})