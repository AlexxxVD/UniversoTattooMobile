import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import { ActivityIndicator, GestureResponderEvent, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native'
import { colors } from '../../theme/color'

type Props = {
  title: string
  onPress?: (e: GestureResponderEvent) => void
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
  variant?: 'primary' | 'outline' | 'ghost'
  fullWidth?: boolean
}

export default function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
  variant = 'primary',
  fullWidth = true,
}: Props) {
  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? colors.textPrimary : '#fff'} />
      ) : (
        <Text
          style={[
            styles.text,
            variant !== 'primary' && { color: colors.textPrimary },
          ]}
        >
          {title}
        </Text>
      )}
    </>
  )

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.9}
        style={[styles.base, fullWidth && styles.fullWidth, style]}
      >
        <LinearGradient
          colors={[colors.primaryDark, colors.primary, colors.accent]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    )
  }

  // Outline/Ghost
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.base,
        fullWidth && styles.fullWidth,
        variant === 'outline' && styles.outline,
        style,
      ]}
    >
      {content}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(17,18,22,0.6)',
  },
})