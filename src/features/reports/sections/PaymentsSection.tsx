// src/features/reports/sections/PaymentsSection.tsx
// ¿Cómo me pagan? Reparto del dinero por método de pago.

import { ShareBar } from '../../../components/charts/ShareBar';
import { DeltaBadge } from '../../../components/ui/DeltaBadge';
import { getPaymentMethodIcon } from '../../../lib/paymentMethods';
import { cx } from '../../../lib/cx';
import { ReportSection, SectionEmpty, SectionStatus } from '../components/ReportSection';
import type { ReportData } from '../useReportData';
import type { ReportPeriod } from '../lib/periods';
import type { PaymentRow } from '../lib/metrics';
import { money, percent, plural } from '../lib/format';
import styles from './sections.module.css';

interface PaymentsSectionProps {
  period: ReportPeriod;
  data: ReportData;
  rows: PaymentRow[];
}

/** Diferencia de participación en puntos: "+5 pts" */
const pointsChange = (row: PaymentRow) => {
  const points = Math.round((row.share - row.previousShare) * 1000) / 10;
  if (Math.abs(points) < 0.1) return 'igual que antes';
  return `${points > 0 ? '+' : '−'}${Math.abs(points).toFixed(1)} pts de participación`;
};

export const PaymentsSection = ({ period, data, rows }: PaymentsSectionProps) => {
  const hasPrevious = (data.previousPayments.data?.length ?? 0) > 0;
  return (
  <ReportSection
    id="pagos"
    icon="bx-wallet"
    title="Métodos de pago"
    question="¿Cómo me pagan los clientes?"
    busy={data.payments.isPlaceholderData || data.previousPayments.isPlaceholderData}
    howTo={
      <>
        <p>
          La barra completa es todo lo vendido; cada color es un método de pago y su ancho, la parte que representa.
          Cada método mantiene siempre el mismo color.
        </p>
        <ul>
          <li>
            <strong>Puntos de participación:</strong> cuánto cambió su porcentaje {period.comparisonLabel}. Si el
            efectivo pasa de 60% a 55%, bajó 5 puntos (más clientes pagan con otros medios).
          </li>
          <li>Te ayuda a saber cuánto entra en efectivo y cuánto por medios digitales.</li>
        </ul>
      </>
    }
  >
    <SectionStatus queries={[data.payments, data.previousPayments]} height={180}>
      {rows.length === 0 ? (
        <SectionEmpty icon="bx-wallet">No hay ventas en este período.</SectionEmpty>
      ) : (
        <div className={styles.stack}>
          <ShareBar
            ariaLabel={`Reparto de las ventas por método de pago: ${rows.map((row) => `${row.payment_method_name} ${percent(row.share)}`).join(', ')}`}
            segments={rows.map((row) => ({
              key: row.key,
              label: row.payment_method_name,
              value: row.total_sales,
              color: row.color,
              ink: row.ink,
              valueLabel: money(row.total_sales),
            }))}
          />

          {/* Leyenda con todos los números: hace de tabla */}
          <ul className={styles.paymentList}>
            {rows.map((row) => (
              <li key={row.key} className={styles.paymentItem}>
                <span className={styles.paymentSwatch} style={{ backgroundColor: row.color }} aria-hidden="true" />
                <i className={cx('bx', getPaymentMethodIcon(row.payment_method_name), styles.paymentIcon)} aria-hidden="true" />
                <span className={styles.paymentName}>
                  <strong>{row.payment_method_name}</strong>
                  <span className={styles.muted}>
                    {plural(row.tickets, 'venta')} · ticket promedio {money(row.avgTicket)}
                  </span>
                </span>
                <span className={styles.paymentValues}>
                  <strong>{money(row.total_sales)}</strong>
                  <span className={styles.paymentShare}>
                    {percent(row.share)}
                    <DeltaBadge ratio={row.change.ratio} emptyText="Nuevo" />
                  </span>
                  {hasPrevious && <span className={styles.muted}>{pointsChange(row)}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionStatus>
  </ReportSection>
);
};