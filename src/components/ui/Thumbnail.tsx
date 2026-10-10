// src/components/ui/Thumbnail.tsx

import { useState } from 'react';
import { cx } from '../../lib/cx';
import styles from './Thumbnail.module.css';

interface ThumbnailProps {
  src?: string | null;
  alt: string;
  /** sm 40px · md 56px · fill ocupa el contenedor (cuadrado) */
  size?: 'sm' | 'md' | 'fill';
  /** Ícono cuando no hay imagen o no carga */
  icon?: string;
  className?: string;
}

/** Imagen cuadrada con relleno de marca cuando falta o falla */
export const Thumbnail = ({ src, alt, size = 'sm', icon = 'bx-image', className }: ThumbnailProps) => {
  /* Si la URL falla se muestra el ícono; si cambia la URL se vuelve a intentar */
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = !!src && failedSrc !== src;

  return (
    <span className={cx(styles.thumb, styles[size], className)}>
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={styles.image}
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <i className={cx('bx', icon, styles.placeholder)} aria-hidden="true" />
      )}
    </span>
  );
};