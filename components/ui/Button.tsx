import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, Pressable, Text, TextStyle, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'gradient' | 'solid' | 'outline' | 'ghost';
  style?: ViewStyle;
  textStyle?: TextStyle;
  left?: React.ReactNode;
  right?: React.ReactNode;
};

export function Button({ title, onPress, disabled, loading, variant = 'gradient', style, textStyle, left, right }: Props) {
  const { colors, radius } = useTheme();

  const base: ViewStyle = {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    opacity: disabled || loading ? 0.7 : 1,
    flexDirection: 'row',
    gap: 8,
  };

  if (variant === 'gradient') {
    return (
      <Pressable onPress={onPress} disabled={disabled || loading} style={[{ borderRadius: radius.md }, style]}>
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[base]}
        >
          {loading && <ActivityIndicator color={colors.white} />}
          {!loading && left}
          <Text style={[{ color: colors.white, fontWeight: '600' }, textStyle]}>{title}</Text>
          {!loading && right}
        </LinearGradient>
      </Pressable>
    );
  }

  if (variant === 'outline') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          base,
          { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
          style,
        ]}
      >
        {loading && <ActivityIndicator color={colors.white} />}
        {!loading && left}
        <Text style={[{ color: colors.white, fontWeight: '600' }, textStyle]}>{title}</Text>
        {!loading && right}
      </Pressable>
    );
  }

  if (variant === 'ghost') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={[base, { backgroundColor: 'transparent' }, style]}
      >
        {loading && <ActivityIndicator color={colors.white} />}
        {!loading && left}
        <Text style={[{ color: colors.link, fontWeight: '600' }, textStyle]}>{title}</Text>
        {!loading && right}
      </Pressable>
    );
  }

  // solid
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[base, { backgroundColor: '#111827' }, style]}
    >
      {loading && <ActivityIndicator color={colors.white} />}
      {!loading && left}
      <Text style={[{ color: colors.white, fontWeight: '600' }, textStyle]}>{title}</Text>
      {!loading && right}
    </Pressable>
  );
}