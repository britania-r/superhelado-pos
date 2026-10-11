// src/features/reports/DailyCashPage.tsx

import { useState, useEffect, useCallback, useMemo } from 'react';
import { v3_getDailyCashSummary } from '../../api/reports.api';
import { getStores } from '../../api/stores.api';
import { getOpenCashShift } from '../../api/shifts.api';
import type { V3DailyCashSummaryResult, Store, CashShift } from '../../types';
import { formatCurrency } from '../../lib/formatters';
import { getErrorMessage } from '../../lib/errors';
import { getCashDifferenceStatus } from '../../lib/cash';
import { cx } from '../../lib/cx';
import toast from 'react-hot-toast';
import { useUserStore } from '../../store/userStore';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatCard } from '../../components/ui/StatCard';
import { DatePicker } from '../../components/ui/DatePicker';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { SearchableSelect, type SelectOption } from '../../components/ui/SearchableSelect';
import { OpenCashShiftModal } from '../pos/components/OpenCashShiftModal';
import { CloseCashShiftModal } from '../pos/components/CloseCashShiftModal';
import styles from './DailyCashPage.module.css';

/* Valor de "Todas las tiendas" en el selector (los ids de tienda son UUID) */
const ALL_STORES = 'all';

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateToDDMMYYYY = (dateString: string) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
};

/* "hoy, 08:15 a. m." o "9 de octubre, 08:15 a. m." */
const formatOpenedAt = (isoDate: string) => {
  const date = new Date(isoDate);
  const time = date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday ? `hoy, ${time}` : `${date.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}, ${time}`;
};

const DifferenceCell = ({ value }: { value: number }) => {
  const status = getCashDifferenceStatus(value);
  return (
    <span className={styles.differenceCell}>
      <span className={styles.number}>{formatCurrency(value)}</span>
      <Badge tone={status.tone} icon={status.icon}>{status.label}</Badge>
    </span>
  );
};

const money = (value: number) => <span className={styles.number}>{formatCurrency(value)}</span>;

const COLUMNS: DataTableColumn<V3DailyCashSummaryResult>[] = [
  { key: 'store', header: 'Tienda', strong: true, mobile: 'title', render: (row) => row.store_name },
  { key: 'date', header: 'Fecha', muted: true, mobile: 'subtitle', render: (row) => formatDateToDDMMYYYY(row.report_date) },
  { key: 'opening', header: 'Apertura', align: 'right', render: (row) => money(row.opening_balance) },
  { key: 'sales', header: 'Ventas', align: 'right', render: (row) => money(row.total_sales_day) },
  { key: 'expected', header: 'Saldo esperado', align: 'right', strong: true, render: (row) => money(row.total_day_balance) },
  { key: 'counted', header: 'Monto contado', align: 'right', render: (row) => money(row.total_counted) },
  { key: 'difference', header: 'Diferencia', align: 'right', render: (row) => <DifferenceCell value={row.total_difference} /> },
];

export const DailyCashPage = () => {
  const { profile, user } = useUserStore();
  const [reportData, setReportData] = useState<V3DailyCashSummaryResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string | null>(null);
  const [currentShift, setCurrentShift] = useState<CashShift | null>(null);
  const [isOpeningShift, setIsOpeningShift] = useState(false);
  const [isClosingShift, setIsClosingShift] = useState(false);
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false);

  useEffect(() => {
    const loadStores = async () => {
      try {
        const storeList = await getStores();
        setStores(storeList);
        if (profile?.role === 'vendedor' && profile.store_id) {
          setSelectedStoreFilter(profile.store_id);
        }
      } catch (err) {
        toast.error(`Error cargando tiendas: ${getErrorMessage(err)}`);
      }
    };
    loadStores();
  }, [profile]);

  const fetchReport = useCallback(async () => {
    if (!selectedDate) {
      toast.error('Selecciona una fecha para el reporte.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setReportData([]);
    setHasGeneratedReport(true);

    try {
      let storeFilterId = selectedStoreFilter;
      if (profile?.role === 'vendedor' && profile.store_id) {
        storeFilterId = profile.store_id;
      }

      const data = await v3_getDailyCashSummary(selectedDate, storeFilterId);
      setReportData(data);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(`Error al cargar el reporte: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedStoreFilter, profile]);

  const loadDailyCashData = useCallback(async () => {
    if (!user || !profile) return;
    const storeIdToCheck = profile.role === 'vendedor' ? profile.store_id : selectedStoreFilter;
    if (storeIdToCheck) {
      try {
        const openShift = await getOpenCashShift(user.id, storeIdToCheck);
        setCurrentShift(openShift);
      } catch {
        setCurrentShift(null);
      }
    } else {
      setCurrentShift(null);
    }
  }, [user, selectedStoreFilter, profile]);

  useEffect(() => {
    loadDailyCashData();
  }, [loadDailyCashData]);

  const handleShiftOpened = (shift: CashShift) => {
    setCurrentShift(shift);
    setIsOpeningShift(false);
    toast.success('Caja abierta con éxito!');
    fetchReport();
  };

  const handleShiftClosed = () => {
    setCurrentShift(null);
    setIsClosingShift(false);
    toast.success('Caja cerrada con éxito!');
    fetchReport();
  };

  const isAdmin = profile?.role === 'admin';
  const selectedStoreName = stores.find((store) => store.id === selectedStoreFilter)?.name;

  const storeOptions = useMemo<SelectOption[]>(
    () => [
      { value: ALL_STORES, label: 'Todas las tiendas', icon: 'bx-buildings' },
      ...stores.map((store) => ({ value: store.id, label: store.name, icon: 'bx-store-alt' })),
    ],
    [stores]
  );

  /* Totales del resumen (una o varias tiendas) */
  const totals = useMemo(
    () =>
      reportData.reduce(
        (sum, row) => ({
          opening: sum.opening + Number(row.opening_balance),
          sales: sum.sales + Number(row.total_sales_day),
          expected: sum.expected + Number(row.total_day_balance),
          counted: sum.counted + Number(row.total_counted),
          difference: sum.difference + Number(row.total_difference),
        }),
        { opening: 0, sales: 0, expected: 0, counted: 0, difference: 0 }
      ),
    [reportData]
  );
  const totalsStatus = getCashDifferenceStatus(totals.difference);

  const resultsCaption =
    reportData.length === 1
      ? `${reportData[0].store_name} · ${formatDateToDDMMYYYY(reportData[0].report_date)}`
      : `${reportData.length} tiendas · ${formatDateToDDMMYYYY(selectedDate)}`;

  const showResults = hasGeneratedReport && !isLoading && !error && reportData.length > 0;

  return (
    <div>
      <PageHeader
        title="Caja diaria"
        subtitle={isAdmin ? 'Apertura, ventas y cierre de caja por tienda' : selectedStoreName}
      />

      {/* ── Estado de la caja de la tienda elegida ── */}
      {selectedStoreFilter && user ? (
        <section
          className={cx(styles.shift, currentShift ? styles.shiftOpen : styles.shiftClosed)}
          aria-label="Estado de la caja"
        >
          <span className={styles.shiftIcon} aria-hidden="true">
            <i className={cx('bx', currentShift ? 'bx-lock-open-alt' : 'bx-lock-alt')} />
          </span>
          <div className={styles.shiftText}>
            <p className={styles.shiftTitle}>
              {currentShift ? 'Caja abierta' : 'Caja cerrada'}
              {isAdmin && selectedStoreName && <span className={styles.shiftStore}> · {selectedStoreName}</span>}
            </p>
            <p className={styles.shiftDetail}>
              {currentShift
                ? `Desde ${formatOpenedAt(currentShift.opened_at)} · Apertura ${formatCurrency(currentShift.opening_balance)}`
                : 'Abre la caja para registrar el monto inicial del día.'}
            </p>
          </div>
          {!currentShift ? (
            <Button icon="bx-log-in-circle" onClick={() => setIsOpeningShift(true)} className={styles.shiftButton}>
              Abrir caja
            </Button>
          ) : (
            <Button
              variant="secondary"
              icon="bx-log-out-circle"
              onClick={() => setIsClosingShift(true)}
              className={styles.shiftButton}
            >
              Cerrar caja
            </Button>
          )}
        </section>
      ) : (
        isAdmin && (
          <p className={styles.shiftHint}>
            <i className="bx bx-info-circle" aria-hidden="true" />
            Elige una tienda para abrir o cerrar su caja.
          </p>
        )
      )}

      {/* ── Filtros ── */}
      <div className={styles.toolbar}>
        <DatePicker
          value={selectedDate}
          onChange={setSelectedDate}
          label="Fecha del reporte"
          className={styles.date}
        />
        {isAdmin && (
          <SearchableSelect
            options={storeOptions}
            value={selectedStoreFilter ?? ALL_STORES}
            onChange={(value) => setSelectedStoreFilter(value === ALL_STORES ? null : value)}
            label="Tienda"
            searchPlaceholder="Buscar tienda…"
            emptyMessage="No hay tiendas con ese nombre"
            className={styles.store}
          />
        )}
        <Button icon="bx-bar-chart-alt-2" onClick={fetchReport} loading={isLoading} className={styles.generate}>
          Generar reporte
        </Button>
      </div>

      {/* ── Resultado ── */}
      {isLoading && (
        <DataTable caption="Caja diaria" columns={COLUMNS} rows={[]} rowKey={(row) => row.store_id} loading skeletonRows={2} />
      )}

      {!isLoading && error && (
        <EmptyState
          tone="danger"
          icon="bx-error-circle"
          title="No se pudo cargar el reporte"
          description={error}
          action={
            <Button variant="secondary" icon="bx-refresh" onClick={fetchReport}>
              Reintentar
            </Button>
          }
        />
      )}

      {!hasGeneratedReport && !isLoading && (
        <EmptyState
          icon="bx-calculator"
          title="Genera el reporte de caja"
          description="Elige la fecha y haz clic en «Generar reporte» para ver apertura, ventas y cierre."
        />
      )}

      {hasGeneratedReport && !isLoading && !error && reportData.length === 0 && (
        <EmptyState
          icon="bx-calendar-x"
          title="Sin datos de caja"
          description="No hay datos de caja para la fecha y filtros seleccionados."
        />
      )}

      {showResults && (
        <section className={styles.results} aria-label="Resumen de caja">
          <p className={styles.caption}>{resultsCaption}</p>

          <div className={styles.stats}>
            <StatCard label="Apertura" value={formatCurrency(totals.opening)} icon="bx-wallet" tone="neutral" />
            <StatCard label="Ventas del día" value={formatCurrency(totals.sales)} icon="bx-receipt" tone="accent" />
            <StatCard
              label="Saldo esperado"
              value={formatCurrency(totals.expected)}
              icon="bx-calculator"
              tone="brand"
              hint="Apertura + ventas"
              emphasis
            />
            <StatCard label="Monto contado" value={formatCurrency(totals.counted)} icon="bx-coin-stack" tone="neutral" />
            <StatCard
              label="Diferencia"
              value={formatCurrency(totals.difference)}
              icon={totalsStatus.icon}
              tone={totalsStatus.tone}
              hint={<Badge tone={totalsStatus.tone} icon={totalsStatus.icon}>{totalsStatus.label}</Badge>}
              className={styles.differenceStat}
            />
          </div>

          {reportData.length > 1 && (
            <>
              <h2 className={styles.sectionTitle}>Detalle por tienda</h2>
              <DataTable
                caption="Caja diaria por tienda"
                columns={COLUMNS}
                rows={reportData}
                rowKey={(row) => row.store_id}
              />
            </>
          )}
        </section>
      )}

      <Modal
        isOpen={isOpeningShift}
        onClose={() => setIsOpeningShift(false)}
        title="Abrir caja"
        description={selectedStoreName}
        size="sm"
      >
        <OpenCashShiftModal
          userId={user!.id}
          storeId={selectedStoreFilter!}
          onShiftOpened={handleShiftOpened}
          onClose={() => setIsOpeningShift(false)}
        />
      </Modal>
      <Modal
        isOpen={isClosingShift}
        onClose={() => setIsClosingShift(false)}
        title="Cerrar caja"
        description={selectedStoreName}
        size="sm"
      >
        <CloseCashShiftModal
          shift={currentShift!}
          totalSales={reportData.find(r => r.store_id === currentShift?.store_id)?.total_sales_day ?? 0}
          onShiftClosed={handleShiftClosed}
          onClose={() => setIsClosingShift(false)}
        />
      </Modal>
    </div>
  );
};