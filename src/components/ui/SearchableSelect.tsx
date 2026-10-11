// src/components/ui/SearchableSelect.tsx

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../lib/cx';
import { lockScroll } from '../../lib/scrollLock';
import { PHONE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { useFieldContext } from './Field';
import { IconButton } from './IconButton';
import { Spinner } from './Spinner';
import styles from './SearchableSelect.module.css';

export interface SelectOption<V extends string = string> {
  value: V;
  label: string;
  /** Segunda línea en gris (dirección, detalle…). También se usa al buscar. */
  description?: string;
  /** Ícono de Boxicons, por ejemplo 'bx-store-alt' */
  icon?: string;
  disabled?: boolean;
}

interface SearchableSelectProps<V extends string> {
  options: SelectOption<V>[];
  value: V | '' | null | undefined;
  onChange: (value: V) => void;
  onBlur?: () => void;
  /** id del campo (si está dentro de <Field>, se toma de ahí) */
  id?: string;
  name?: string;
  /** Para react-hook-form: permite enfocar el campo cuando tiene error */
  ref?: Ref<HTMLButtonElement>;
  placeholder?: string;
  /** false oculta el buscador (listas de 2 o 3 opciones) */
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Ícono de Boxicons a la izquierda (si no se pasa, se usa el de la opción elegida) */
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  /** Fuerza el estado de error (si está dentro de <Field>, se toma de ahí) */
  invalid?: boolean;
  /** Título de la lista en celular y nombre para lectores de pantalla */
  label?: string;
  className?: string;
}

/* "Tienda Panamá" se encuentra escribiendo "panama" */
const normalize = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const filterOptions = <V extends string>(options: SelectOption<V>[], query: string) => {
  const search = normalize(query);
  if (!search) return options;
  return options.filter((option) =>
    normalize(`${option.label} ${option.description ?? ''}`).includes(search)
  );
};

const firstEnabled = <V extends string>(options: SelectOption<V>[]) =>
  options.findIndex((option) => !option.disabled);

const GAP = 6;
const VIEWPORT_MARGIN = 8;
const MAX_LIST_HEIGHT = 320;

/* Lista con buscador que reemplaza al <select> nativo.
   En computadora se abre debajo del campo (o arriba si no hay espacio);
   en celular, como hoja desde abajo con opciones grandes para el dedo. */
export const SearchableSelect = <V extends string>({
  options,
  value,
  onChange,
  onBlur,
  id,
  name,
  ref,
  placeholder = 'Selecciona una opción',
  searchable = true,
  searchPlaceholder = 'Buscar…',
  emptyMessage = 'Sin resultados',
  icon,
  loading = false,
  disabled = false,
  invalid,
  label,
  className,
}: SearchableSelectProps<V>) => {
  const field = useFieldContext();
  const isPhone = useMediaQuery(PHONE_QUERY);
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<CSSProperties>();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const filtered = useMemo(() => filterOptions(options, query), [options, query]);
  const selectedOption = options.find((option) => option.value === value);
  const activeOption = activeIndex >= 0 ? filtered[activeIndex] : undefined;

  const isInvalid = invalid ?? field?.invalid ?? false;
  const title = label ?? placeholder;
  /* Sin ícono fijo, muestra el de la opción elegida */
  const triggerIcon = icon ?? selectedOption?.icon;

  /* El ref llega de react-hook-form y además lo necesitamos aquí */
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
    const openAbove = spaceBelow < 240 && spaceAbove > spaceBelow;
    return {
      left: rect.left,
      width: rect.width,
      maxHeight: Math.min(MAX_LIST_HEIGHT, openAbove ? spaceAbove : spaceBelow),
      ...(openAbove
        ? { bottom: window.innerHeight - rect.top + GAP }
        : { top: rect.bottom + GAP }),
    };
  }, []);

  const openList = () => {
    if (disabled || !triggerRef.current) return;
    /* Dentro de un modal se dibuja en el propio modal (foco y lectores de pantalla) */
    setPortalTarget(triggerRef.current.closest<HTMLElement>('[role="dialog"]') ?? document.body);
    setQuery('');
    const selectedIndex = options.findIndex((option) => option.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabled(options));
    setPosition(isPhone ? undefined : measure());
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

  const selectOption = (option: SelectOption<V> | undefined) => {
    if (!option || option.disabled) return;
    onChange(option.value);
    close();
  };

  const moveActive = (direction: 1 | -1) => {
    if (filtered.length === 0) return;
    let index = activeIndex;
    for (let step = 0; step < filtered.length; step += 1) {
      index = Math.min(Math.max(index + direction, 0), filtered.length - 1);
      if (!filtered[index].disabled) break;
    }
    if (!filtered[index].disabled) setActiveIndex(index);
  };

  const handleSearchChange = (nextQuery: string) => {
    setQuery(nextQuery);
    setActiveIndex(firstEnabled(filterOptions(options, nextQuery)));
  };

  /* Teclado con la lista abierta (desde el buscador o desde el campo) */
  const handleListKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveActive(-1);
        break;
      case 'Enter':
        event.preventDefault(); // no envía el formulario
        selectOption(activeOption);
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        close();
        break;
      case 'Tab':
        /* Vuelve al campo y deja que Tab siga al siguiente */
        close();
        break;
    }
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        openList();
      }
      return;
    }
    /* Sin buscador el foco se queda en el campo */
    if (!searchable) {
      if (event.key === ' ') {
        event.preventDefault();
        selectOption(activeOption);
        return;
      }
      handleListKeyDown(event);
    }
  };

  /* Foco al abrir: buscador en computadora; la hoja en celular (sin abrir el teclado) */
  useEffect(() => {
    if (!open) return;
    if (isPhone) sheetRef.current?.focus({ preventScroll: true });
    else if (searchable) searchRef.current?.focus({ preventScroll: true });
  }, [open, isPhone, searchable]);

  /* En celular la hoja tapa la pantalla: la página de atrás no se mueve */
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

  /* Mantiene visible la opción activa al moverse con las flechas */
  useEffect(() => {
    const list = listRef.current;
    const item = list?.children[activeIndex] as HTMLElement | undefined;
    if (!open || !list || !item) return;
    if (item.offsetTop < list.scrollTop) {
      list.scrollTop = item.offsetTop;
    } else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight;
    }
  }, [activeIndex, open]);

  const searchBox = searchable && (
    <div className={styles.search}>
      <i className={cx('bx bx-search', styles.searchIcon)} aria-hidden="true" />
      <input
        ref={searchRef}
        type="text"
        value={query}
        onChange={(event) => handleSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeOption ? optionId(activeIndex) : undefined}
        autoComplete="off"
        spellCheck={false}
        className={styles.searchInput}
      />
    </div>
  );

  const list = (
    <ul ref={listRef} id={listboxId} role="listbox" aria-label={title} className={styles.list}>
      {filtered.length === 0 ? (
        <li role="presentation" className={styles.empty}>
          {loading ? 'Cargando…' : emptyMessage}
        </li>
      ) : (
        filtered.map((option, index) => {
          const selected = option.value === value;
          return (
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={selected}
              aria-disabled={option.disabled || undefined}
              className={cx(
                styles.option,
                index === activeIndex && styles.active,
                selected && styles.selected,
                option.disabled && styles.disabled
              )}
              onPointerMove={() => {
                if (!option.disabled && index !== activeIndex) setActiveIndex(index);
              }}
              onMouseDown={(event) => event.preventDefault()} // el foco sigue en el buscador
              onClick={() => selectOption(option)}
            >
              {option.icon && (
                <i className={cx('bx', option.icon, styles.optionIcon)} aria-hidden="true" />
              )}
              <span className={styles.optionText}>
                <span className={styles.optionLabel}>{option.label}</span>
                {option.description && (
                  <span className={styles.optionDescription}>{option.description}</span>
                )}
              </span>
              {selected && <i className={cx('bx bx-check', styles.check)} aria-hidden="true" />}
            </li>
          );
        })
      )}
    </ul>
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
        >
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className={styles.sheet}
            onKeyDown={handleListKeyDown}
          >
            <div className={styles.sheetHeader}>
              <p className={styles.sheetTitle}>{title}</p>
              <IconButton icon="bx-x" label="Cerrar lista" onClick={() => close()} />
            </div>
            {searchBox}
            {list}
          </div>
        </div>
      ) : (
        <div
          ref={popupRef}
          className={styles.popover}
          style={position}
          onKeyDown={searchable ? handleListKeyDown : undefined}
        >
          {searchBox}
          {list}
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
        name={name}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && !searchable && activeOption ? optionId(activeIndex) : undefined}
        aria-invalid={isInvalid || undefined}
        aria-describedby={field?.describedBy}
        disabled={disabled}
        className={cx(styles.trigger, triggerIcon && styles.withIcon, open && styles.open)}
        onClick={() => (open ? close() : openList())}
        onKeyDown={handleTriggerKeyDown}
      >
        {triggerIcon && <i className={cx('bx', triggerIcon, styles.icon)} aria-hidden="true" />}
        <span className={cx(styles.value, !selectedOption && styles.placeholder)}>
          {selectedOption?.label ?? placeholder}
        </span>
        {loading ? (
          <Spinner size="sm" label="" />
        ) : (
          <i className={cx('bx bx-chevron-down', styles.chevron)} aria-hidden="true" />
        )}
      </button>
      {popup}
    </div>
  );
};