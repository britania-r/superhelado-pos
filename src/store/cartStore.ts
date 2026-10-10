// src/store/cartStore.ts

import { create } from 'zustand';
import type { CartItem, CartState } from '../types';

// Los tipos viven en src/types; se re-exportan aquí por compatibilidad
export type { CartItem, CartState };

export const useCartStore = create<CartState>((set, get) => ({
  storeId: null,
  items: [],

  // Cambiar de tienda vacía el pedido: los precios y productos son por tienda
  setStore: (storeId) => {
    if (get().storeId === storeId) return;
    set({ storeId, items: [] });
  },

  addToCart: (product, price) => {
    const currentItems = get().items;
    const existingItem = currentItems.find((item) => item.id === product.id);

    if (existingItem) {
      // Si el producto ya existe, solo aumenta la cantidad
      const updatedItems = currentItems.map((item) =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      set({ items: updatedItems });
    } else {
      // Si es un producto nuevo, crea el CartItem con el precio de la tienda
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        image_url: product.image_url,
        price, // Precio "congelado" al momento de agregarlo
        quantity: 1,
      };
      set({ items: [...currentItems, newItem] });
    }
  },

  removeFromCart: (productId) => {
    set({
      items: get().items.filter((item) => item.id !== productId),
    });
  },

  updateQuantity: (productId, newQuantity) => {
    if (newQuantity <= 0) {
      get().removeFromCart(productId);
    } else {
      set({
        items: get().items.map((item) =>
          item.id === productId
            ? { ...item, quantity: newQuantity }
            : item
        ),
      });
    }
  },

  // Se usa cuando la BD avisa que el precio cambió
  updatePrice: (productId, newPrice) => {
    set({
      items: get().items.map((item) =>
        item.id === productId
          ? { ...item, price: newPrice }
          : item
      ),
    });
  },

  clearCart: () => {
    set({ items: [] });
  },

  getTotalItems: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0);
  },

  getTotal: () => {
    return get().items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  },
}));