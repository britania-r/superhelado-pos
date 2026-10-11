// src/features/reports/sections/StoresSection.tsx
// ¿Qué tienda vende más? (solo con "Todas las tiendas")

import { useState } from 'react';
import { BarList } from '../../../components/charts/BarList';
import { DataTable, type DataTableColumn } from '../../../components/ui/DataTable';
import { DeltaBadge } from '../../../components/ui/DeltaBadge';
import { ReportSection, SectionEmpty, SectionStatus, ViewToggle, type ViewMode } from '../components/ReportSection';
import type { ReportData } from '../useReportData';
import type { ReportPeriod } from '../lib/periods';
import type { StoreRow } from '../lib/metrics';
import { int, money, percent, plural } from '../lib/format';
import styles from './sections.module.css';

interface StoresSectionProps {
  period: ReportPeriod;
  data: ReportData;
  rows: StoreRow[];
}

export const StoresSection = ({ period, data, rows }: StoresSectionProps) => {
  const [view, setView] = useState<ViewMode>('chart');

  const columns: DataTableColumn<StoreRow>[] = [
    { key: 'name', header: 'Tienda', render: (row) => row.store_name, strong: true, mobile: 'title' },
    { key: 'sales', header: 'Ventas', align: 'right', render: (row) => money(row.total_sales) },
    { key: 'share', header: '% de ventas', align: 'right', render: (row) => percent(row.share) },
    { key: 'tickets', header: 'N.º de ventas', align: 'right', render: (row) => int(row.tickets) },
    { key: 'avg', header: 'Ticket promedio', align: 'right', render: (row) => (row.tickets > 0 ? money(row.avgTicket) : '—') },
    { key: 'units', header: 'Unidades', align: 'right', render: (row) => int(row.units) },
    { key: 'change', header: 'Variación', align: 'right', render: (row) => <DeltaBadge ratio={row.change.ratio} emptyText="Sin ventas antes" /> },
  ];

  return (
    <ReportSection
      id="tiendas"
      icon="bx-store-alt"
      title="Tiendas"
      question="¿Qué tienda vende más?"
      busy={data.stores.isPlaceholderData || data.previousStores.isPlaceholderData}
      actions={<ViewToggle value={view} onChange={setView} />}
      howTo={
        <p>
          Compara las tiendas entre sí y contra {period.comparisonLabel.replace(/^vs /, '')}. Mira también el{' '}
          <strong>ticket promedio</strong>: una tienda con menos ventas pero ticket más alto atiende menos clientes que
          gastan más. Para ver el reporte de una sola tienda, elígela arriba.
        </p>
      }
    >
      <SectionStatus queries={[data.stores, data.previousStores]} height={200}>
        {rows.length === 0 ? (
          <SectionEmpty icon="bx-store-alt">No hay tiendas registradas.</SectionEmpty>
        ) : view === 'table' ? (
          <div className={styles.tableScroll}>
            <DataTable columns={columns} rows={rows} rowKey={(row) => row.store_id} caption="Ventas por tienda" />
          </div>
        ) : (
          <BarList
            ariaLabel="Ventas por tienda"
            items={rows.map((row) => ({
              key: row.store_id,
              label: row.store_name,
              sublabel:
                row.tickets > 0
                  ? `${plural(row.tickets, 'venta')} · ticket promedio ${money(row.avgTicket)}`
                  : 'Sin ventas en el período',
              value: row.total_sales,
              valueLabel: money(row.total_sales),
              detail: (
                <span className={styles.detailStack}>
                  <span>{percent(row.share)}</span>
                  <DeltaBadge ratio={row.change.ratio} emptyText="Sin ventas antes" />
                </span>
              ),
            }))}
          />
        )}
      </SectionStatus>
    </ReportSection>
  );
};