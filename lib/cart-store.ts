import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface CartItem {
  id: string;
  nombre: string;
  precio: number;
  imagen_url?: string;
  imagen?: string;
  ProductoImagen?: Array<{
    url_imagen: string;
    alt_text: string;
    es_principal: boolean;
  }>;
  quantity?: number;
  cantidad?: number;
  categoria?: string | { nombre: string; id_categoria: number };
  stock?: number;
  peso?: number; // en gramos
}

interface AppliedCoupon {
  code: string;
  discount: number;
}

interface CartState {
  items: CartItem[];
  appliedCoupon: AppliedCoupon | null;
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  applyCoupon: (coupon: AppliedCoupon) => void;
  removeCoupon: () => void;
  getDiscountAmount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      appliedCoupon: null,
      isOpen: false,

      setIsOpen: (isOpen) => set({ isOpen }),

      applyCoupon: (coupon) => set({ appliedCoupon: coupon }),
      removeCoupon: () => set({ appliedCoupon: null }),

      getDiscountAmount: () => {
        const { appliedCoupon } = get();
        if (!appliedCoupon) return 0;
        const subtotal = get().getTotalPrice();
        return Math.round((subtotal * appliedCoupon.discount) / 100);
      },

      addItem: (item) => {
        const existing = get().items.find(i => i.id === item.id);
        let qtyToAdd = item.quantity ?? item.cantidad ?? 1;

        const currentQty = existing ? (existing.quantity ?? existing.cantidad ?? 0) : 0;
        const newQty = currentQty + qtyToAdd;
        const availableStock = item.stock ?? 0;

        if (availableStock > 0 && newQty > availableStock) {
          const maxCanAdd = Math.max(0, availableStock - currentQty);
          if (maxCanAdd === 0) return;
          qtyToAdd = maxCanAdd;
        }

        if (existing) {
          const finalQty = currentQty + qtyToAdd;
          set(state => ({
            items: state.items.map(i =>
              i.id === item.id ? { ...i, quantity: finalQty, cantidad: finalQty } : i
            ),
          }));
        } else {
          const normalized = { ...item, quantity: qtyToAdd, cantidad: qtyToAdd };
          set(state => ({ items: [...state.items, normalized] }));
        }
      },

      removeItem: (itemId) => {
        set(state => ({ items: state.items.filter(i => i.id !== itemId) }));
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        const item = get().items.find(i => i.id === itemId);
        if (item && item.stock && quantity > item.stock) {
          quantity = item.stock;
        }
        set(state => ({
          items: state.items.map(i =>
            i.id === itemId ? { ...i, quantity, cantidad: quantity } : i
          ),
        }));
      },

      clearCart: () => set({ items: [], appliedCoupon: null }),

      getTotalPrice: () => {
        return get().items.reduce((acc, i) => {
          const price = i.precio ?? 0;
          const q = i.quantity ?? i.cantidad ?? 0;
          return acc + price * q;
        }, 0);
      },

      getTotalItems: () => {
        return get().items.reduce((acc, i) => acc + (i.quantity ?? i.cantidad ?? 0), 0);
      },
    }),
    {
      name: 'universo-tattoo-cart',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items, appliedCoupon: state.appliedCoupon }),
      version: 1,
    }
  )
);