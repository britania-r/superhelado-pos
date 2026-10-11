// src/features/reports/sections/InsightsSection.tsx
// Lo más importante, en frases.

import { cx } from '../../../lib/cx';
import { ReportSection } from '../components/ReportSection';
import type { Insight } from '../lib/insights';
import styles from './sections.module.css';

interface InsightsSectionProps {
  insights: Insight[];
  loading: boolean;
}

export const InsightsSection = ({ insights, loading }: InsightsSectionProps) => (
  <ReportSection
    id="hallazgos"
    icon="bx-bulb"
    title="Lo más importante"
    question="¿Qué debería saber de un vistazo?"
    howTo={
      <p>
        Son frases armadas automáticamente con los números de este reporte. Las verdes son buenas noticias, las rojas
        piden atención y las amarillas son avisos. Más abajo está el detalle de cada una.
      </p>
    }
  >
    {loading && insights.length === 0 ? (
      <div className={styles.insightSkeleton} role="status" aria-label="Cargando" />
    ) : (
      <ul className={styles.insights}>
        {insights.map((insight) => (
          <li key={insight.id} className={styles.insight}>
            <span className={cx(styles.insightIcon, styles[`tone_${insight.tone}`])} aria-hidden="true">
              <i className={cx('bx', insight.icon)} />
            </span>
            <p className={styles.insightText}>
              {insight.parts.map((part, index) =>
                typeof part === 'string' ? <span key={index}>{part}</span> : <strong key={index}>{part.strong}</strong>
              )}
            </p>
          </li>
        ))}
      </ul>
    )}
  </ReportSection>
);