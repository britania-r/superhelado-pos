// src/features/reports/components/ReportSection.tsx
// Tarjeta de cada parte del reporte: título, la pregunta que responde,
// un "¿Cómo leerlo?" desplegable y su contenido.

import { useId, useState, type ReactNode } from 'react';
import { cx } from '../../../lib/cx';
import { getErrorMessage } from '../../../lib/errors';
import { Button } from '../../../components/ui/Button';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import styles from './ReportSection.module.css';

interface ReportSectionProps {
  id: string;
  icon: string;
  title: string;
  /** La pregunta que responde, en lenguaje simple: "¿Qué se vende más?" */
  question: string;
  /** Explicación para leer la sección */
  howTo?: ReactNode;
  /** Controles propios (Gráfico/Tabla, orden…) */
  actions?: ReactNode;
  /** Llegando datos nuevos: lo anterior se ve atenuado, sin saltos */
  busy?: boolean;
  className?: string;
  children: ReactNode;
}

export const ReportSection = ({ id, icon, title, question, howTo, actions, busy = false, className, children }: ReportSectionProps) => {
  const [showHelp, setShowHelp] = useState(false);
  const helpId = useId();

  return (
    <section id={id} className={cx(styles.section, className)} aria-labelledby={`${id}-title`} aria-busy={busy || undefined}>
      <header className={styles.header}>
        <span className={styles.icon} aria-hidden="true">
          <i className={cx('bx', icon)} />
        </span>
        <div className={styles.heading}>
          <h2 id={`${id}-title`} className={styles.title}>
            {title}
          </h2>
          <p className={styles.question}>{question}</p>
        </div>
        {howTo && (
          <Button
            variant="ghost"
            size="sm"
            icon="bx-bulb"
            iconOnlyOnMobile
            className={cx(styles.helpButton, showHelp && styles.helpActive)}
            aria-expanded={showHelp}
            aria-controls={helpId}
            onClick={() => setShowHelp((value) => !value)}
          >
            ¿Cómo leerlo?
          </Button>
        )}
      </header>

      {howTo && showHelp && (
        <div id={helpId} className={styles.help}>
          {howTo}
        </div>
      )}

      {actions && <div className={styles.actions}>{actions}</div>}

      <div className={cx(styles.body, busy && styles.busy)}>{children}</div>
    </section>
  );
};

/* ── Estados de carga ── */

interface QueryLike {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
}

interface SectionStatusProps {
  /** Una o varias consultas: si alguna está cargando o falló, se muestra ese estado */
  queries: QueryLike[];
  /** Alto del bloque de carga (para que no salte la página) */
  height?: number;
  children: ReactNode;
}

/** Carga inicial (bloque gris), error (con Reintentar) o el contenido */
export const SectionStatus = ({ queries, height = 200, children }: SectionStatusProps) => {
  const failed = queries.find((query) => query.isError);
  if (failed) {
    return (
      <div className={styles.error} role="alert">
        <i className="bx bx-error-circle" aria-hidden="true" />
        <div className={styles.errorText}>
          <strong>No se pudo cargar esta parte.</strong>
          <span>{getErrorMessage(failed.error)}</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon="bx-refresh"
          onClick={() => queries.filter((query) => query.isError).forEach((query) => query.refetch())}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  if (queries.some((query) => query.isPending)) {
    return <div className={styles.skeleton} style={{ height }} role="status" aria-label="Cargando" />;
  }

  return <>{children}</>;
};

/** Mensaje cuando no hay nada que mostrar */
export const SectionEmpty = ({ icon = 'bx-bar-chart-alt-2', children }: { icon?: string; children: ReactNode }) => (
  <div className={styles.empty}>
    <i className={cx('bx', icon)} aria-hidden="true" />
    <span>{children}</span>
  </div>
);

/* ── Gráfico o tabla ── */

export type ViewMode = 'chart' | 'table';

const VIEW_OPTIONS = [
  { value: 'chart' as const, label: 'Gráfico', icon: 'bx-bar-chart-alt-2' },
  { value: 'table' as const, label: 'Tabla', icon: 'bx-table' },
];

export const ViewToggle = ({ value, onChange }: { value: ViewMode; onChange: (value: ViewMode) => void }) => (
  <SegmentedControl options={VIEW_OPTIONS} value={value} onChange={onChange} ariaLabel="Ver como" />
);