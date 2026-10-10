// src/lib/scrollLock.ts

/* Bloquea el scroll de la página mientras hay un modal o el menú móvil abierto.
   Lleva la cuenta para que varios modales abiertos a la vez no se pisen. */
let activeLocks = 0;
let savedOverflow = '';
let savedPaddingRight = '';

export const lockScroll = (): (() => void) => {
  if (activeLocks === 0) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    savedOverflow = document.body.style.overflow;
    savedPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    // Evita que el contenido "salte" al desaparecer la barra de scroll
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
  activeLocks += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeLocks = Math.max(0, activeLocks - 1);
    if (activeLocks === 0) {
      document.body.style.overflow = savedOverflow;
      document.body.style.paddingRight = savedPaddingRight;
    }
  };
};