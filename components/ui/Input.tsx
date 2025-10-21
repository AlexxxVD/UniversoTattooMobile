import React, { useState } from 'react'
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native'
import { colors } from '../../theme/color'

export default function Input(props: TextInputProps) {
  const [focused, setFocused] = useState(false)

  return (
    <View style={[styles.wrapper, focused && styles.wrapperFocused]}>
      <TextInput
        placeholderTextColor={colors.placeholder}
        onFocus={(e) => {
          setFocused(true)
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          props.onBlur?.(e)
        }}
        style={styles.input}
        {...props}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(17,18,22,0.9)',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  wrapperFocused: { borderColor: colors.primary },
  input: {
    flex: 1,
    color: colors.textPrimary,
    paddingHorizontal: 14,
  },
})