import React, { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

type CartItem = {
  productoId: number;
  varianteId: number | null;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  increment: (productoId: number, varianteId: number | null) => void;
  decrement: (productoId: number, varianteId: number | null) => void;
  remove: (productoId: number, varianteId: number | null) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (item: CartItem) => {
    setItems(prev => {
      const idx = prev.findIndex(p => p.productoId === item.productoId && p.varianteId === item.varianteId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], cantidad: copy[idx].cantidad + item.cantidad };
        return copy;
      }
      return [...prev, item];
    });
  };

  const increment = (productoId: number, varianteId: number | null) => {
    setItems(prev => prev.map(p => (p.productoId === productoId && p.varianteId === varianteId ? { ...p, cantidad: p.cantidad + 1 } : p)));
  };

  const decrement = (productoId: number, varianteId: number | null) => {
    setItems(prev => prev.flatMap(p => {
      if (p.productoId === productoId && p.varianteId === varianteId) {
        const c = p.cantidad - 1;
        return c <= 0 ? [] : [{ ...p, cantidad: c }];
      }
      return [p];
    }));
  };

  const remove = (productoId: number, varianteId: number | null) => {
    setItems(prev => prev.filter(p => !(p.productoId === productoId && p.varianteId === varianteId)));
  };

  const clear = () => setItems([]);

  const value = useMemo(() => ({ items, addItem, increment, decrement, remove, clear }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
}