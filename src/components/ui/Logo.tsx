// src/components/ui/Logo.tsx

interface LogoProps {
  /** 'full': logo completo · 'mark': solo el cono (para espacios chicos) */
  variant?: 'full' | 'mark';
  className?: string;
  alt?: string;
}

const SOURCES = {
  full: { src: '/brand/chepys-logo.webp', width: 720, height: 376 },
  mark: { src: '/brand/chepys-mark.webp', width: 150, height: 256 },
} as const;

/* El tamaño lo define quien lo usa (con className); width/height
   solo reservan la proporción para que la página no "salte" al cargar. */
export const Logo = ({ variant = 'full', className, alt = 'Helados Chepys' }: LogoProps) => {
  const { src, width, height } = SOURCES[variant];
  return (
    <img
      src={src}
      width={width}
      height={height}
      alt={alt}
      className={className}
      decoding="async"
      draggable={false}
      style={{ height: 'auto' }}
    />
  );
};