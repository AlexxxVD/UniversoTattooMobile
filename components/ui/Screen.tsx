import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native'
import { colors } from '../../theme/color'

type Props = {
  children: React.ReactNode
  padded?: boolean
  center?: boolean
}

export default function Screen({ children, padded = true, center = false }: Props) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0A0A0A', '#120A1A', '#0A0A0A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={[styles.safe, padded && styles.padded]}>
        <View style={[styles.content, center && styles.center]}>{children}</View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  padded: { paddingHorizontal: 20 },
  content: { flex: 1 },
  center: { justifyContent: 'center' },
})