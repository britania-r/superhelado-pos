// src/lib/cx.ts

/** Une clases CSS ignorando valores vacíos: cx('a', cond && 'b') */
export const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');