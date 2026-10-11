// src/features/reports/sections/CategoriesSection.tsx
// ¿Qué línea de productos pesa más?

import { useState } from 'react';
import { BarList } from '../../../components/charts/BarList';
import { DataTable, type DataTableColumn } from '../../../components/ui/DataTable';
import { DeltaBadge } from '../../../components/ui/DeltaBadge';
import { ReportSection, SectionEmpty, SectionStatus, ViewToggle, type ViewMode } from '../components/ReportSection';
import type { ReportData } from '../useReportData';
import type { ReportPeriod } from '../lib/periods';
import type { CategoryRow } from '../lib/metrics';
import { int, money, percent, plural } from '../lib/format';
import styles from './sections.module.css';

interface CategoriesSectionProps {
  period: ReportPeriod;
  data: ReportData;
  rows: CategoryRow[];
}

export const CategoriesSection = ({ period, data, rows }: CategoriesSectionProps) => {
  const [view, setView] = useState<ViewMode>('chart');

  const columns: DataTableColumn<CategoryRow>[] = [
    { key: 'name', header: 'Categoría', render: (row) => row.name, strong: true, mobile: 'title' },
    { key: 'sales', header: 'Ventas', align: 'right', render: (row) => money(row.sales) },
    { key: 'share', header: '% de ventas', align: 'right', render: (row) => percent(row.share) },
    { key: 'units', header: 'Unidades', align: 'right', render: (row) => int(row.units) },
    { key: 'products', header: 'Productos vendidos', align: 'right', render: (row) => int(row.products) },
    { key: 'change', header: 'Variación', align: 'right', render: (row) => <DeltaBadge ratio={row.change.ratio} emptyText="Nuevo" /> },
  ];

  return (
    <ReportSection
      id="categorias"
      icon="bx-category"
      title="Categorías"
      question="¿Qué tipo de producto deja más dinero?"
      busy={data.products.isPlaceholderData || data.previousProducts.isPlaceholderData}
      actions={<ViewToggle value={view} onChange={setView} />}
      howTo={
        <p>
          Suma las ventas de todos los productos de cada categoría. El porcentaje dice qué parte del total aporta y la
          flecha, cómo le fue {period.comparisonLabel}. Una categoría que crece mucho puede merecer más espacio o
          variedad; una que cae, una promoción.
        </p>
      }
    >
      <SectionStatus queries={[data.products, data.previousProducts]} height={220}>
        {rows.length === 0 ? (
          <SectionEmpty icon="bx-category">No hay ventas en este período.</SectionEmpty>
        ) : view === 'table' ? (
          <div className={styles.tableScroll}>
            <DataTable columns={columns} rows={rows} rowKey={(row) => row.key} caption="Ventas por categoría" />
          </div>
        ) : (
          <BarList
            ariaLabel="Ventas por categoría"
            items={rows.map((row) => ({
              key: row.key,
              label: row.name,
              sublabel: `${plural(row.products, 'producto')} · ${plural(row.units, 'unidad', 'unidades')}`,
              value: row.sales,
              valueLabel: money(row.sales),
              detail: (
                <span className={styles.detailStack}>
                  <span>{percent(row.share)}</span>
                  <DeltaBadge ratio={row.change.ratio} emptyText="Nuevo" />
                </span>
              ),
            }))}
          />
        )}
      </SectionStatus>
    </ReportSection>
  );
};