import { Slot } from 'expo-router';
import React from 'react';
import { CartProvider } from '../providers/CartProvider';

export default function RootLayout() {
  return (
    <CartProvider>
      <Slot />
    </CartProvider>
  );
}