// src/features/reports/sections/HoursSection.tsx
// ¿Cuándo se vende más? Mapa de calor día × hora (o columnas por hora en períodos cortos).

import { useMemo, useState } from 'react';
import { Heatmap } from '../../../components/charts/Heatmap';
import { ColumnChart } from '../../../components/charts/ColumnChart';
import { BarList } from '../../../components/charts/BarList';
import { DataTable, type DataTableColumn } from '../../../components/ui/DataTable';
import { ReportSection, SectionEmpty, SectionStatus, ViewToggle, type ViewMode } from '../components/ReportSection';
import type { ReportData } from '../useReportData';
import type { ReportPeriod } from '../lib/periods';
import { buildHourMatrix, hourTotals, weekdayAverages, type HourCell } from '../lib/metrics';
import {
  decimal,
  hourAxisLabel,
  hourRangeLabel,
  int,
  money,
  moneyCompact,
  percent,
  plural,
  WEEKDAYS,
  WEEKDAYS_SHORT,
} from '../lib/format';
import styles from './sections.module.css';

interface HoursSectionProps {
  period: ReportPeriod;
  data: ReportData;
}

/** Con 7 días o más cada día de la semana aparece al menos una vez */
const MIN_DAYS_FOR_HEATMAP = 7;

export const HoursSection = ({ period, data }: HoursSectionProps) => {
  const [view, setView] = useState<ViewMode>('chart');
  const rows = data.hours.data;
  const useHeatmap = period.days >= MIN_DAYS_FOR_HEATMAP;

  const matrix = useMemo(() => (rows ? buildHourMatrix(rows, period.current) : null), [rows, period.current]);
  const totals = useMemo(() => (rows ? hourTotals(rows) : []), [rows]);
  const weekdays = useMemo(() => (rows ? weekdayAverages(rows, period.current) : []), [rows, period.current]);
  const grandTotal = totals.reduce((sum, row) => sum + row.sales, 0);

  /* Tabla: una fila por hora; con mapa de calor, una columna por día de la semana */
  const hourRows = matrix
    ? matrix.hours.map((hour, index) => ({ hour, cells: matrix.rows.map((weekdayRow) => weekdayRow[index]), total: totals[index] }))
    : [];
  type HourRow = (typeof hourRows)[number];

  const tableColumns: DataTableColumn<HourRow>[] = useHeatmap
    ? [
        { key: 'hour', header: 'Hora', render: (row) => hourRangeLabel(row.hour), strong: true, mobile: 'title' },
        ...[1, 2, 3, 4, 5, 6, 7].map<DataTableColumn<HourRow>>((weekday) => ({
          key: `d${weekday}`,
          header: WEEKDAYS_SHORT[weekday],
          align: 'right',
          render: (row: HourRow) => {
            const cell: HourCell = row.cells[weekday - 1];
            return cell.avgSales > 0 ? money(cell.avgSales) : '—';
          },
        })),
      ]
    : [
        { key: 'hour', header: 'Hora', render: (row) => hourRangeLabel(row.hour), strong: true, mobile: 'title' },
        { key: 'sales', header: 'Ventas', align: 'right', render: (row) => money(row.total.sales) },
        { key: 'tickets', header: 'N.º de ventas', align: 'right', render: (row) => int(row.total.tickets) },
        {
          key: 'share',
          header: '% del total',
          align: 'right',
          render: (row) => (grandTotal > 0 ? percent(row.total.sales / grandTotal) : '—'),
        },
      ];

  return (
    <ReportSection
      id="horas"
      icon="bx-time-five"
      title="Horas pico"
      question="¿A qué hora y qué día se vende más?"
      busy={data.hours.isPlaceholderData}
      actions={<ViewToggle value={view} onChange={setView} />}
      howTo={
        useHeatmap ? (
          <>
            <p>
              Cada cuadro es <strong>una hora de un día de la semana</strong>. Mientras más oscuro, más se vende en
              promedio a esa hora. Los grises no tuvieron ventas.
            </p>
            <ul>
              <li>
                Es un <strong>promedio</strong>: si el período tiene 2 sábados, se suman las ventas de ambos y se
                divide entre 2. Así un día que aparece más veces no se ve inflado.
              </li>
              <li>Úsalo para decidir cuándo reforzar personal o preparar más producto, y cuándo lanzar una promoción.</li>
            </ul>
          </>
        ) : (
          <p>
            Cada columna es una hora del día con lo que se vendió en ella, sumando todos los días del período. Para ver
            el mapa por día de la semana, elige un período de 7 días o más.
          </p>
        )
      }
    >
      <SectionStatus queries={[data.hours]} height={useHeatmap ? 300 : 248}>
        {!rows || rows.length === 0 || !matrix ? (
          <SectionEmpty icon="bx-time-five">No hay ventas en este período.</SectionEmpty>
        ) : view === 'table' ? (
          <div className={styles.tableScroll}>
            <DataTable columns={tableColumns} rows={hourRows} rowKey={(row) => row.hour} caption="Ventas por hora" />
          </div>
        ) : useHeatmap ? (
          <div className={styles.hoursLayout}>
            <Heatmap
              columns={matrix.hours.map((hour) => String(hour))}
              rows={matrix.rows.map((weekdayRow, index) => ({
                key: index + 1,
                label: WEEKDAYS_SHORT[index + 1],
                cells: weekdayRow.map((cell) => ({
                  value: cell.avgSales,
                  title: `${WEEKDAYS[cell.weekday]} · ${hourRangeLabel(cell.hour)}`,
                  rows: [
                    { value: money(cell.avgSales), label: 'promedio' },
                    {
                      value: Number.isInteger(cell.avgTickets) ? int(cell.avgTickets) : decimal(cell.avgTickets),
                      label: `ventas en promedio (${plural(matrix.weekdayCounts[cell.weekday], WEEKDAYS[cell.weekday].toLowerCase(), WEEKDAYS[cell.weekday].toLowerCase().replace(/o$/, 'os'))})`,
                    },
                  ],
                })),
              }))}
              max={matrix.maxAvg}
              legendLabel="Promedio de ventas por hora (horas en formato 24 h)"
              ariaLabel={`Mapa de calor de ventas promedio por día de la semana y hora, de ${period.label}. La vista de tabla tiene los mismos datos.`}
            />

            <div className={styles.weekdays}>
              <h3 className={styles.subTitle}>Promedio por día de la semana</h3>
              <BarList
                ariaLabel="Ventas promedio por día de la semana"
                items={weekdays.map((day) => ({
                  key: String(day.weekday),
                  label: WEEKDAYS[day.weekday],
                  value: day.average,
                  valueLabel: day.occurrences > 0 ? money(day.average) : '—',
                  detail: day.occurrences > 0 ? plural(day.occurrences, 'vez', 'veces') : undefined,
                }))}
              />
            </div>
          </div>
        ) : (
          <ColumnChart
            data={totals.map((row) => ({
              key: row.hour,
              label: hourAxisLabel(row.hour),
              value: row.sales,
              title: hourRangeLabel(row.hour),
              extra: [{ value: plural(row.tickets, 'venta'), label: grandTotal > 0 ? `${percent(row.sales / grandTotal)} del total` : undefined }],
            }))}
            formatValue={money}
            formatTick={moneyCompact}
            ariaLabel={`Ventas por hora de ${period.label}. La vista de tabla tiene los mismos datos.`}
          />
        )}
      </SectionStatus>
    </ReportSection>
  );
};