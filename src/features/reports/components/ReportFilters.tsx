// src/features/reports/components/ReportFilters.tsx
// Una sola fila de filtros arriba de todo: período y tienda. Todo el reporte usa lo mismo.

import { useMemo } from 'react';
import type { Store } from '../../../types';
import { ChipGroup } from '../../../components/ui/ChipGroup';
import { DatePicker } from '../../../components/ui/DatePicker';
import { Field } from '../../../components/ui/Field';
import { SearchableSelect, type SelectOption } from '../../../components/ui/SearchableSelect';
import {
  addDays,
  MAX_RANGE_DAYS,
  PRESET_OPTIONS,
  todayInLima,
  type DateRange,
  type PeriodPreset,
  type ReportPeriod,
} from '../lib/periods';
import { plural } from '../lib/format';
import styles from './ReportFilters.module.css';

const ALL_STORES = 'all';

interface ReportFiltersProps {
  preset: PeriodPreset;
  onPresetChange: (preset: PeriodPreset) => void;
  custom: DateRange;
  onCustomChange: (range: DateRange) => void;
  storeId: string | null;
  onStoreChange: (storeId: string | null) => void;
  stores: Store[];
  storesLoading: boolean;
  period: ReportPeriod;
}

export const ReportFilters = ({
  preset,
  onPresetChange,
  custom,
  onCustomChange,
  storeId,
  onStoreChange,
  stores,
  storesLoading,
  period,
}: ReportFiltersProps) => {
  const today = todayInLima();

  const storeOptions = useMemo<SelectOption[]>(
    () => [
      { value: ALL_STORES, label: 'Todas las tiendas', icon: 'bx-buildings' },
      ...stores.map((store) => ({ value: store.id, label: store.name, icon: 'bx-store-alt' })),
    ],
    [stores]
  );

  const storeName = storeId ? stores.find((store) => store.id === storeId)?.name : null;

  /* El rango nunca pasa de 366 días: al mover un extremo, el otro se ajusta */
  const maxSpan = MAX_RANGE_DAYS - 1;
  const changeStart = (start: string) => {
    const latestEnd = addDays(start, maxSpan);
    const end = custom.end < start ? start : custom.end > latestEnd ? latestEnd : custom.end;
    onCustomChange({ start, end: end > today ? today : end });
  };
  const changeEnd = (end: string) => {
    const earliestStart = addDays(end, -maxSpan);
    const start = custom.start > end ? end : custom.start < earliestStart ? earliestStart : custom.start;
    onCustomChange({ start, end });
  };

  return (
    <div className={styles.filters}>
      <div className={styles.row}>
        <ChipGroup options={PRESET_OPTIONS} value={preset} onChange={onPresetChange} ariaLabel="Período" className={styles.presets} />

        <SearchableSelect
          options={storeOptions}
          value={storeId ?? ALL_STORES}
          onChange={(value) => onStoreChange(value === ALL_STORES ? null : value)}
          loading={storesLoading}
          label="Tienda"
          placeholder="Todas las tiendas"
          searchPlaceholder="Buscar tienda…"
          emptyMessage="No hay tiendas con ese nombre"
          className={styles.store}
        />
      </div>

      {preset === 'custom' && (
        <div className={styles.custom}>
          <Field label="Desde" htmlFor="report-start">
            <DatePicker
              id="report-start"
              value={custom.start}
              onChange={changeStart}
              max={today}
              label="Desde"
            />
          </Field>
          <Field label="Hasta" htmlFor="report-end">
            <DatePicker
              id="report-end"
              value={custom.end}
              onChange={changeEnd}
              min={custom.start}
              max={today}
              label="Hasta"
            />
          </Field>
        </div>
      )}

      <p className={styles.caption}>
        <i className="bx bx-calendar" aria-hidden="true" />
        <span>
          <strong>{period.label}</strong>
          {period.days > 1 && ` (${plural(period.days, 'día')})`}
          {' · '}
          {storeName ?? 'todas las tiendas'}
          <span className={styles.compare}> · se compara {period.comparisonLabel.replace(/^vs /, 'con ')}</span>
          {period.includesToday && !period.isSingleDay && (
            <span className={styles.compare}> · incluye hoy, que aún no termina</span>
          )}
        </span>
      </p>
    </div>
  );
};