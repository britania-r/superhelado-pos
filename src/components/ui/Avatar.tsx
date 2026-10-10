// src/components/ui/Avatar.tsx

import { cx } from '../../lib/cx';
import { getInitials } from '../../lib/labels';
import styles from './Avatar.module.css';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md';
  className?: string;
}

const TONES = [styles.blue, styles.pink, styles.cream] as const;

/* El mismo nombre siempre da el mismo color */
const toneFor = (name: string) => {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
};

/** Círculo con las iniciales del nombre */
export const Avatar = ({ name, size = 'md', className }: AvatarProps) => (
  <span className={cx(styles.avatar, styles[size], toneFor(name), className)} aria-hidden="true">
    {getInitials(name)}
  </span>
);