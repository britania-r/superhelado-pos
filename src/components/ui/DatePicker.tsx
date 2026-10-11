// src/components/ui/DatePicker.tsx

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../lib/cx';
import { lockScroll } from '../../lib/scrollLock';
import { PHONE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { useFieldContext } from './Field';
import { IconButton } from './IconButton';
import styles from './DatePicker.module.css';

interface DatePickerProps {
  /** Fecha en formato YYYY-MM-DD ('' si no hay) */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** id del campo (si está dentro de <Field>, se toma de ahí) */
  id?: string;
  /** Para react-hook-form: permite enfocar el campo cuando tiene error */
  ref?: Ref<HTMLButtonElement>;
  /** Límites en formato YYYY-MM-DD */
  min?: string;
  max?: string;
  placeholder?: string;
  /** Nombre del campo para lectores de pantalla y título en celular, por ejemplo "Fecha" */
  label?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}

/* ── Fechas sin zona horaria: siempre "YYYY-MM-DD" en hora local ── */
const pad = (n: number) => String(n).padStart(2, '0');
const toDateString = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseDate = (value: string | undefined): Date | null => {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/* Mismo día en otro mes (31 de marzo − 1 mes = 28/29 de febrero) */
const addMonths = (date: Date, months: number) => {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + months + 1, 0).getDate();
  return new Date(date.getFullYear(), date.getMonth() + months, Math.min(date.getDate(), lastDay));
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const sameDay = (a: Date, b: Date) => toDateString(a) === toDateString(b);
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const DISPLAY_FORMAT = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
const MONTH_FORMAT = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' });
const DAY_LABEL_FORMAT = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/* En Perú la semana empieza el lunes */
const WEEKDAYS = [
  { short: 'lu', long: 'lunes' },
  { short: 'ma', long: 'martes' },
  { short: 'mi', long: 'miércoles' },
  { short: 'ju', long: 'jueves' },
  { short: 'vi', long: 'viernes' },
  { short: 'sá', long: 'sábado' },
  { short: 'do', long: 'domingo' },
];

const POPOVER_WIDTH = 300;
const POPOVER_HEIGHT = 370;
const GAP = 6;
const VIEWPORT_MARGIN = 8;

/** Calendario propio en lugar del <input type="date"> del navegador */
export const DatePicker = ({
  value,
  onChange,
  onBlur,
  id,
  ref,
  min,
  max,
  placeholder = 'Elige una fecha',
  label,
  disabled = false,
  invalid,
  className,
}: DatePickerProps) => {
  const field = useFieldContext();
  const isPhone = useMediaQuery(PHONE_QUERY);
  const baseId = useId();
  const titleId = `${baseId}-title`;

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  /* Solo se mueve el foco al calendario al abrir o al navegar con teclado */
  const shouldFocusDay = useRef(false);

  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [focusedDate, setFocusedDate] = useState(() => new Date());
  const [position, setPosition] = useState<CSSProperties>();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const selectedDate = parseDate(value);
  const minDate = parseDate(min);
  const maxDate = parseDate(max);
  const today = new Date();
  const isInvalid = invalid ?? field?.invalid ?? false;
  const display = selectedDate ? DISPLAY_FORMAT.format(selectedDate) : placeholder;

  const isDisabledDay = (date: Date) =>
    (minDate !== null && toDateString(date) < toDateString(minDate)) ||
    (maxDate !== null && toDateString(date) > toDateString(maxDate));

  const clamp = (date: Date) => {
    if (minDate && toDateString(date) < toDateString(minDate)) return minDate;
    if (maxDate && toDateString(date) > toDateString(maxDate)) return maxDate;
    return date;
  };

  /* 6 semanas siempre: el calendario no cambia de alto entre meses */
  const days = useMemo(() => {
    const first = startOfMonth(viewMonth);
    const offset = (first.getDay() + 6) % 7;
    const start = addDays(first, -offset);
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [viewMonth]);

  const weeks = useMemo(
    () => Array.from({ length: 6 }, (_, week) => days.slice(week * 7, week * 7 + 7)),
    [days]
  );

  const setTriggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref]
  );

  /* Posición fija en pantalla: así no la recortan el modal ni su scroll */
  const measure = useCallback((): CSSProperties | undefined => {
    const trigger = triggerRef.current;
    if (!trigger) return undefined;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - GAP - VIEWPORT_MARGIN;
    const openAbove = spaceBelow < POPOVER_HEIGHT && spaceAbove > spaceBelow;
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN)
    );
    return {
      left,
      width: POPOVER_WIDTH,
      ...(openAbove
        ? { bottom: window.innerHeight - rect.top + GAP }
        : { top: rect.bottom + GAP }),
    };
  }, []);

  const openCalendar = () => {
    if (disabled || !triggerRef.current) return;
    setPortalTarget(triggerRef.current.closest<HTMLElement>('[role="dialog"]') ?? document.body);
    const start = clamp(selectedDate ?? new Date());
    setFocusedDate(start);
    setViewMonth(startOfMonth(start));
    setPosition(isPhone ? undefined : measure());
    shouldFocusDay.current = true;
    setOpen(true);
  };

  const close = useCallback(
    (returnFocus = true) => {
      setOpen(false);
      if (returnFocus) triggerRef.current?.focus({ preventScroll: true });
      onBlur?.();
    },
    [onBlur]
  );

  const selectDate = (date: Date) => {
    if (isDisabledDay(date)) return;
    onChange(toDateString(date));
    close();
  };

  /* Mover el día enfocado con el teclado (cambia de mes si hace falta) */
  const moveFocus = (date: Date) => {
    const next = clamp(date);
    shouldFocusDay.current = true;
    setFocusedDate(next);
    if (next.getMonth() !== viewMonth.getMonth() || next.getFullYear() !== viewMonth.getFullYear()) {
      setViewMonth(startOfMonth(next));
    }
  };

  /* Flechas del encabezado: solo cambian el mes que se ve */
  const showMonth = (months: number) => {
    const next = addMonths(viewMonth, months);
    setViewMonth(next);
    setFocusedDate(clamp(addMonths(focusedDate, months)));
  };

  const handleGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const weekday = (focusedDate.getDay() + 6) % 7;
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focusedDate, -1),
      ArrowRight: () => addDays(focusedDate, 1),
      ArrowUp: () => addDays(focusedDate, -7),
      ArrowDown: () => addDays(focusedDate, 7),
      Home: () => addDays(focusedDate, -weekday),
      End: () => addDays(focusedDate, 6 - weekday),
      PageUp: () => addMonths(focusedDate, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focusedDate, event.shiftKey ? 12 : 1),
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      moveFocus(move());
    }
  };

  const handlePopupKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  /* Tab fuera del calendario: se cierra */
  const handlePopupBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && !popupRef.current?.contains(next) && !triggerRef.current?.contains(next)) close(false);
  };

  /* Enfoca el día activo después de abrir o de moverse con el teclado */
  useEffect(() => {
    if (!open || !shouldFocusDay.current) return;
    shouldFocusDay.current = false;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${toDateString(focusedDate)}"]`)
      ?.focus({ preventScroll: true });
  }, [open, focusedDate, viewMonth]);

  /* Celular: la hoja tapa la pantalla; la página de atrás no se mueve */
  useEffect(() => {
    if (!open || !isPhone) return;
    return lockScroll();
  }, [open, isPhone]);

  /* Sigue al campo si la página o el modal hacen scroll */
  useLayoutEffect(() => {
    if (!open || isPhone) return;
    const update = () => setPosition(measure());
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, isPhone, measure]);

  /* Clic afuera: cierra sin mover el foco */
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      close(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, close]);

  const todayDisabled = isDisabledDay(today);

  const calendar = (
    <>
      <div className={styles.header}>
        <IconButton icon="bx-chevron-left" label="Mes anterior" size="sm" onClick={() => showMonth(-1)} />
        <p id={titleId} className={styles.month} aria-live="polite">
          {capitalize(MONTH_FORMAT.format(viewMonth))}
        </p>
        <IconButton icon="bx-chevron-right" label="Mes siguiente" size="sm" onClick={() => showMonth(1)} />
      </div>

      <div ref={gridRef} role="grid" aria-labelledby={titleId} className={styles.grid} onKeyDown={handleGridKeyDown}>
        <div role="row" className={styles.weekRow}>
          {WEEKDAYS.map((day) => (
            <span key={day.long} role="columnheader" aria-label={day.long} className={styles.weekday}>
              {day.short}
            </span>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={toDateString(week[0])} role="row" className={styles.weekRow}>
            {week.map((day) => {
              const dayString = toDateString(day);
              const isSelected = !!selectedDate && sameDay(day, selectedDate);
              const isToday = sameDay(day, today);
              const isOutside = day.getMonth() !== viewMonth.getMonth();
              const dayDisabled = isDisabledDay(day);
              return (
                <span key={dayString} role="gridcell" aria-selected={isSelected}>
                  <button
                    type="button"
                    data-date={dayString}
                    tabIndex={sameDay(day, focusedDate) ? 0 : -1}
                    aria-label={DAY_LABEL_FORMAT.format(day)}
                    aria-current={isToday ? 'date' : undefined}
                    disabled={dayDisabled}
                    className={cx(
                      styles.day,
                      isOutside && styles.outside,
                      isToday && styles.today,
                      isSelected && styles.selected
                    )}
                    onClick={() => selectDate(day)}
                  >
                    {day.getDate()}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.todayButton}
          disabled={todayDisabled}
          onClick={() => selectDate(today)}
        >
          Hoy
        </button>
      </div>
    </>
  );

  const popup =
    open &&
    portalTarget &&
    createPortal(
      isPhone ? (
        <div
          ref={popupRef}
          className={styles.sheetOverlay}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          onKeyDown={handlePopupKeyDown}
        >
          <div role="dialog" aria-modal="true" aria-label={label ?? 'Calendario'} className={styles.sheet}>
            <div className={styles.sheetHeader}>
              <p className={styles.sheetTitle}>{label ?? 'Elige una fecha'}</p>
              <IconButton icon="bx-x" label="Cerrar calendario" onClick={() => close()} />
            </div>
            {calendar}
          </div>
        </div>
      ) : (
        <div
          ref={popupRef}
          role="dialog"
          aria-label={label ?? 'Calendario'}
          className={styles.popover}
          style={position}
          onKeyDown={handlePopupKeyDown}
          onBlur={handlePopupBlur}
        >
          {calendar}
        </div>
      ),
      portalTarget
    );

  return (
    <div className={cx(styles.wrapper, className)}>
      <button
        ref={setTriggerRef}
        type="button"
        id={id ?? field?.id}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={!field && label ? `${label}: ${display}` : undefined}
        aria-invalid={isInvalid || undefined}
        aria-describedby={field?.describedBy}
        disabled={disabled}
        className={cx(styles.trigger, open && styles.open)}
        onClick={() => (open ? close() : openCalendar())}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            openCalendar();
          }
        }}
      >
        <i className={cx('bx bx-calendar', styles.icon)} aria-hidden="true" />
        <span className={cx(styles.value, !selectedDate && styles.placeholder)}>{display}</span>
        <i className={cx('bx bx-chevron-down', styles.chevron)} aria-hidden="true" />
      </button>
      {popup}
    </div>
  );
};