import React from 'react'
import { StyleSheet, View, ViewProps } from 'react-native'

export default function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(17,18,22,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.25)',
    padding: 20,
    borderRadius: 18,
    shadowColor: '#A855F7',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
})