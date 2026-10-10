// src/lib/modalStack.ts

/* Lleva el orden de los modales abiertos: Escape solo cierra el de arriba,
   y el menú móvil no se cierra si hay un modal encima. */
const openModals: string[] = [];

export const pushModal = (id: string) => {
  openModals.push(id);
};

export const removeModal = (id: string) => {
  const index = openModals.lastIndexOf(id);
  if (index !== -1) openModals.splice(index, 1);
};

export const isTopModal = (id: string) => openModals[openModals.length - 1] === id;

export const isAnyModalOpen = () => openModals.length > 0;