// src/features/reports/sections/ProductsSection.tsx
// ¿Qué se vende más? Ranking con clase ABC, los que suben y bajan, y los que no se venden.

import { useMemo, useState } from 'react';
import { BarList } from '../../../components/charts/BarList';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { DataTable, type DataTableColumn } from '../../../components/ui/DataTable';
import { DeltaBadge } from '../../../components/ui/DeltaBadge';
import { Badge } from '../../../components/ui/Badge';
import { Thumbnail } from '../../../components/ui/Thumbnail';
import { Pagination } from '../../../components/ui/Pagination';
import { PHONE_QUERY, useMediaQuery } from '../../../hooks/useMediaQuery';
import { ReportSection, SectionEmpty, SectionStatus } from '../components/ReportSection';
import type { ReportData } from '../useReportData';
import { countDays, formatDay, limaDay, todayInLima, type ReportPeriod } from '../lib/periods';
import type { AbcClass, ProductMove, ProductRow } from '../lib/metrics';
import { int, money, percent, plural, signedMoney } from '../lib/format';
import type { RptProductWithoutSales } from '../../../types';
import styles from './sections.module.css';

type Tab = 'ranking' | 'moves' | 'unsold';
type SortBy = 'sales' | 'units';

const PAGE_SIZE = 10;

const ABC_INFO: Record<AbcClass, { tone: 'brand' | 'accent' | 'neutral'; title: string }> = {
  A: { tone: 'brand', title: 'Clase A: el primer 80% de las ventas' },
  B: { tone: 'accent', title: 'Clase B: el siguiente 15% de las ventas' },
  C: { tone: 'neutral', title: 'Clase C: el último 5% de las ventas' },
};

const ProductName = ({ name, category, image }: { name: string; category: string; image: string | null }) => (
  <span className={styles.product}>
    <Thumbnail src={image} alt="" size="sm" icon="bx-package" />
    <span className={styles.productText}>
      <span className={styles.productName}>{name}</span>
      <span className={styles.productMeta}>{category}</span>
    </span>
  </span>
);

/** "Hace 12 días" a partir de un timestamp */
const daysAgo = (timestamp: string) => {
  const days = countDays(limaDay(timestamp), todayInLima()) - 1;
  if (days <= 0) return 'hoy';
  return days === 1 ? 'ayer' : `hace ${int(days)} días`;
};

interface ProductsSectionProps {
  period: ReportPeriod;
  data: ReportData;
  rows: ProductRow[];
  moves: { risers: ProductMove[]; fallers: ProductMove[] };
  allStores: boolean;
}

export const ProductsSection = ({ period, data, rows, moves, allStores }: ProductsSectionProps) => {
  const isPhone = useMediaQuery(PHONE_QUERY);
  const [tab, setTab] = useState<Tab>('ranking');
  const [sortBy, setSortBy] = useState<SortBy>('sales');
  const [page, setPage] = useState(1);
  const unsold = data.withoutSales.data ?? [];

  const sorted = useMemo(
    () => (sortBy === 'sales' ? rows : [...rows].sort((a, b) => b.units - a.units || b.total_sales - a.total_sales)),
    [rows, sortBy]
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const rankingColumns: DataTableColumn<ProductRow>[] = [
    {
      key: 'rank',
      header: '#',
      width: '52px',
      muted: true,
      mobile: 'hidden',
      render: (row) => (sortBy === 'sales' ? row.rank : sorted.indexOf(row) + 1),
    },
    {
      key: 'product',
      header: 'Producto',
      mobile: 'title',
      render: (row) => <ProductName name={row.product_name} category={row.category_name} image={row.image_url} />,
    },
    {
      key: 'sales',
      header: 'Ventas',
      align: 'right',
      strong: true,
      render: (row) => money(row.total_sales),
    },
    { key: 'units', header: 'Unidades', align: 'right', render: (row) => int(row.units) },
    {
      key: 'share',
      header: '% de ventas',
      align: 'right',
      render: (row) => (
        <span className={styles.shareCell}>
          {/* Barrita: comparada con el producto que más vendió */}
          <span className={styles.shareBar} aria-hidden="true">
            <span style={{ width: `${(row.total_sales / (rows[0]?.total_sales || 1)) * 100}%` }} />
          </span>
          {percent(row.share)}
        </span>
      ),
    },
    { key: 'tickets', header: 'Aparece en', align: 'right', render: (row) => `${percent(row.ticketShare)} de las ventas` },
    {
      key: 'abc',
      header: 'Clase',
      align: 'center',
      mobile: 'subtitle',
      render: (row) => (
        <span title={ABC_INFO[row.abc].title}>
          <Badge tone={ABC_INFO[row.abc].tone}>
            {isPhone ? `Clase ${row.abc}` : row.abc}
          </Badge>
        </span>
      ),
    },
    {
      key: 'change',
      header: 'Variación',
      align: 'right',
      render: (row) => <DeltaBadge ratio={row.change.ratio} emptyText="Nuevo" />,
    },
  ];

  const unsoldColumns: DataTableColumn<RptProductWithoutSales>[] = [
    {
      key: 'product',
      header: 'Producto',
      mobile: 'title',
      render: (row) => <ProductName name={row.product_name} category={row.category_name} image={row.image_url} />,
    },
    {
      key: 'price',
      header: 'Precio',
      align: 'right',
      render: (row) =>
        row.min_price === row.max_price ? money(row.min_price) : `${money(row.min_price)} – ${money(row.max_price)}`,
    },
    ...(allStores
      ? [{ key: 'stores', header: 'Activo en', align: 'right' as const, render: (row: RptProductWithoutSales) => plural(row.store_count, 'tienda') }]
      : []),
    {
      key: 'last',
      header: 'Última venta',
      align: 'right',
      render: (row) =>
        row.last_sold_at ? (
          <span className={styles.cellStack}>
            <span>{formatDay(limaDay(row.last_sold_at), 'shortYear')}</span>
            <span className={styles.muted}>{daysAgo(row.last_sold_at)}</span>
          </span>
        ) : (
          <Badge tone="warning" icon="bx-error">Nunca</Badge>
        ),
    },
  ];

  const moveItems = (list: ProductMove[]) =>
    list.map((move) => ({
      key: move.product_id,
      leading: <Thumbnail src={move.image_url} alt="" size="sm" icon="bx-package" />,
      label: move.product_name,
      sublabel: `${money(move.change.previous)} → ${money(move.change.current)}`,
      value: Math.abs(move.change.diff),
      valueLabel: signedMoney(move.change.diff),
      detail: <DeltaBadge ratio={move.change.ratio} emptyText="Nuevo" />,
    }));

  const queries = tab === 'unsold' ? [data.withoutSales] : [data.products, data.previousProducts];
  const busy = queries.some((query) => query.isPlaceholderData);

  return (
    <ReportSection
      id="productos"
      icon="bx-package"
      title="Productos"
      question="¿Qué se vende más y qué se está quedando?"
      busy={busy}
      actions={
        <>
          <SegmentedControl
            options={[
              { value: 'ranking' as const, label: 'Ranking', icon: 'bx-trophy' },
              { value: 'moves' as const, label: 'Suben y bajan', icon: 'bx-transfer-alt' },
              { value: 'unsold' as const, label: data.withoutSales.data ? `Sin ventas (${unsold.length})` : 'Sin ventas', icon: 'bx-package' },
            ]}
            value={tab}
            onChange={setTab}
            ariaLabel="Qué ver de los productos"
          />
          {tab === 'ranking' && (
            <SegmentedControl
              options={[
                { value: 'sales' as const, label: 'Por soles' },
                { value: 'units' as const, label: 'Por unidades' },
              ]}
              value={sortBy}
              onChange={(value) => {
                setSortBy(value);
                setPage(1);
              }}
              ariaLabel="Ordenar ranking"
            />
          )}
        </>
      }
      howTo={
        <>
          <ul>
            <li>
              <strong>% de ventas:</strong> qué parte de lo vendido en soles viene de ese producto.
            </li>
            <li>
              <strong>Aparece en:</strong> en qué parte de las ventas estuvo. "30% de las ventas" = 3 de cada 10
              clientes lo llevaron.
            </li>
            <li>
              <strong>Clase A, B, C (regla 80/20):</strong> se ordenan de mayor a menor venta y se van sumando. Los{' '}
              <strong>A</strong> juntan el primer 80% de las ventas: son pocos y no deben faltar nunca. Los{' '}
              <strong>B</strong> suman el siguiente 15% y los <strong>C</strong> el último 5%.
            </li>
            <li>
              <strong>Suben y bajan:</strong> compara cada producto con {period.comparisonLabel.replace(/^vs /, '')} en
              soles.
            </li>
            <li>
              <strong>Sin ventas:</strong> productos activos {allStores ? 'en alguna tienda' : 'en la tienda'} que no se
              vendieron ni una vez en el período. "Última venta" es la última vez antes del período.
            </li>
          </ul>
        </>
      }
    >
      <SectionStatus queries={queries} height={420}>
        {tab === 'ranking' &&
          (rows.length === 0 ? (
            <SectionEmpty icon="bx-package">No se vendió ningún producto en este período.</SectionEmpty>
          ) : (
            <div className={styles.stack}>
              <div className={styles.tableScroll}>
                <DataTable
                  columns={rankingColumns}
                  rows={pageRows}
                  rowKey={(row) => row.product_id}
                  caption={`Ranking de productos por ${sortBy === 'sales' ? 'ventas en soles' : 'unidades'}`}
                />
              </div>
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={sorted.length}
                pageSize={PAGE_SIZE}
              />
            </div>
          ))}

        {tab === 'moves' &&
          (moves.risers.length === 0 && moves.fallers.length === 0 ? (
            <SectionEmpty icon="bx-transfer-alt">No hay cambios para comparar con el período anterior.</SectionEmpty>
          ) : (
            <div className={styles.columns2}>
              <div>
                <h3 className={styles.subTitle}>
                  <i className="bx bx-up-arrow-alt" aria-hidden="true" /> Los que más subieron
                </h3>
                {moves.risers.length > 0 ? (
                  <BarList items={moveItems(moves.risers)} ariaLabel="Productos que más subieron" />
                ) : (
                  <p className={styles.muted}>Ningún producto vendió más que antes.</p>
                )}
              </div>
              <div>
                <h3 className={styles.subTitle}>
                  <i className="bx bx-down-arrow-alt" aria-hidden="true" /> Los que más bajaron
                </h3>
                {moves.fallers.length > 0 ? (
                  <BarList items={moveItems(moves.fallers)} color="var(--chart-8)" ariaLabel="Productos que más bajaron" />
                ) : (
                  <p className={styles.muted}>Ningún producto vendió menos que antes.</p>
                )}
              </div>
            </div>
          ))}

        {tab === 'unsold' &&
          (unsold.length === 0 ? (
            <SectionEmpty icon="bx-check-circle">Todos los productos activos se vendieron al menos una vez. ¡Bien!</SectionEmpty>
          ) : (
            <div className={styles.tableScroll}>
              <DataTable columns={unsoldColumns} rows={unsold} rowKey={(row) => row.product_id} caption="Productos activos sin ventas" />
            </div>
          ))}
      </SectionStatus>
    </ReportSection>
  );
};