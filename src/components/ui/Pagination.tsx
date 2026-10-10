// src/components/ui/Pagination.tsx

import { cx } from '../../lib/cx';
import { IconButton } from './IconButton';
import styles from './Pagination.module.css';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Con estos dos se muestra "1–30 de 120" */
  totalItems?: number;
  pageSize?: number;
  className?: string;
}

/** Anterior · Página X de Y · Siguiente. No se muestra si hay una sola página. */
export const Pagination = ({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className,
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  const showRange = totalItems !== undefined && pageSize !== undefined;
  const from = showRange ? (page - 1) * pageSize + 1 : 0;
  const to = showRange ? Math.min(page * pageSize, totalItems) : 0;

  return (
    <nav aria-label="Paginación" className={cx(styles.pagination, className)}>
      {showRange && (
        <p className={styles.range}>
          {from}–{to} de {totalItems}
        </p>
      )}
      <div className={styles.controls}>
        <IconButton
          icon="bx-chevron-left"
          label="Página anterior"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        />
        <span className={styles.status} aria-live="polite">
          Página <strong>{page}</strong> de {totalPages}
        </span>
        <IconButton
          icon="bx-chevron-right"
          label="Página siguiente"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        />
      </div>
    </nav>
  );
};