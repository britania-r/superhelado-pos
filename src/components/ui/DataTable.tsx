// src/components/ui/DataTable.tsx

import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { PHONE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import styles from './DataTable.module.css';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Ancho en escritorio, por ejemplo '30%' o '160px' */
  width?: string;
  align?: 'left' | 'center' | 'right';
  /** Texto destacado (negrita) */
  strong?: boolean;
  /** Texto secundario (gris) */
  muted?: boolean;
  /** Texto en gris cuando la celda queda vacía, por ejemplo 'Sin dirección' */
  fallback?: string;
  /**
   * Cómo se ve en las tarjetas del celular:
   * 'title' (título), 'subtitle' (línea gris sin etiqueta),
   * 'field' (etiqueta: valor, por defecto) u 'hidden' (no se muestra)
   */
  mobile?: 'title' | 'subtitle' | 'field' | 'hidden';
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  /** Botones de cada fila (editar, eliminar…) */
  actions?: (row: T) => ReactNode;
  loading?: boolean;
  skeletonRows?: number;
  /** Se muestra en lugar de la tabla cuando no hay filas */
  empty?: ReactNode;
  /** Descripción para lectores de pantalla */
  caption?: string;
}

/* Ancho "aleatorio" pero estable de las barras de carga, para que no se vean todas iguales */
const skeletonWidth = (row: number, column: number) => `${50 + ((row * 37 + column * 23) % 40)}%`;

const renderCell = <T,>(column: DataTableColumn<T>, row: T): ReactNode => {
  const value = column.render(row);
  const isEmpty = value === null || value === undefined || value === '';
  return isEmpty && column.fallback
    ? <span className={styles.fallback}>{column.fallback}</span>
    : value;
};

/** Tabla en computadora y tablet; tarjetas en celular */
export const DataTable = <T,>({
  columns,
  rows,
  rowKey,
  actions,
  loading = false,
  skeletonRows = 4,
  empty,
  caption,
}: DataTableProps<T>) => {
  const isPhone = useMediaQuery(PHONE_QUERY);

  if (!loading && rows.length === 0 && empty) return <>{empty}</>;

  const skeletons = Array.from({ length: skeletonRows }, (_, index) => index);

  /* ── Celular: tarjetas ── */
  if (isPhone) {
    const titleColumns = columns.filter((column) => column.mobile === 'title');
    const subtitleColumns = columns.filter((column) => column.mobile === 'subtitle');
    const fieldColumns = columns.filter((column) => (column.mobile ?? 'field') === 'field');

    return (
      <ul className={styles.cards} aria-label={caption} aria-busy={loading || undefined}>
        {loading
          ? skeletons.map((index) => (
              <li key={`skeleton-${index}`} className={styles.card} aria-hidden="true">
                <div className={styles.cardBody}>
                  <span className={cx(styles.skeleton, styles.skeletonTitle)} style={{ width: skeletonWidth(index, 1) }} />
                  <span className={styles.skeleton} style={{ width: skeletonWidth(index, 2) }} />
                </div>
              </li>
            ))
          : rows.map((row) => (
              <li key={rowKey(row)} className={styles.card}>
                <div className={styles.cardBody}>
                  {titleColumns.map((column) => (
                    <p key={column.key} className={styles.cardTitle}>{renderCell(column, row)}</p>
                  ))}
                  {subtitleColumns.map((column) => (
                    <p key={column.key} className={styles.cardSubtitle}>{renderCell(column, row)}</p>
                  ))}
                  {fieldColumns.length > 0 && (
                    <dl className={styles.cardFields}>
                      {fieldColumns.map((column) => (
                        <div key={column.key} className={styles.cardField}>
                          <dt>{column.header}</dt>
                          <dd>{renderCell(column, row)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
                {actions && <div className={styles.cardActions}>{actions(row)}</div>}
              </li>
            ))}
      </ul>
    );
  }

  /* ── Computadora y tablet: tabla ── */
  return (
    <div className={styles.wrapper}>
      <table className={styles.table} aria-busy={loading || undefined}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" style={{ width: column.width, textAlign: column.align }}>
                {column.header}
              </th>
            ))}
            {actions && (
              <th scope="col" className={styles.actionsCell}>
                <span className="sr-only">Acciones</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {loading
            ? skeletons.map((index) => (
                <tr key={`skeleton-${index}`} aria-hidden="true">
                  {columns.map((column, columnIndex) => (
                    <td key={column.key}>
                      <span className={styles.skeleton} style={{ width: skeletonWidth(index, columnIndex) }} />
                    </td>
                  ))}
                  {actions && (
                    <td className={styles.actionsCell}>
                      <span className={cx(styles.skeleton, styles.skeletonActions)} />
                    </td>
                  )}
                </tr>
              ))
            : rows.map((row) => (
                <tr key={rowKey(row)}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cx(column.strong && styles.strong, column.muted && styles.muted)}
                      style={{ textAlign: column.align }}
                    >
                      {renderCell(column, row)}
                    </td>
                  ))}
                  {actions && (
                    <td className={styles.actionsCell}>
                      <div className={styles.actions}>{actions(row)}</div>
                    </td>
                  )}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
};