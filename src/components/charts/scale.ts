// src/components/charts/scale.ts

export interface NiceScale {
  max: number;
  ticks: number[];
}

/**
 * Eje Y "redondo": 0, 500, 1000, 1500… (pasos de 1, 2, 2.5 o 5 × 10ⁿ).
 * `integer` evita pasos con decimales (para conteos como tickets).
 */
export const niceScale = (maxValue: number, targetTicks = 4, integer = false): NiceScale => {
  if (!(maxValue > 0)) return { max: integer ? targetTicks : 1, ticks: [0] };

  const rough = maxValue / targetTicks;
  const power = 10 ** Math.floor(Math.log10(rough));
  let step = [1, 2, 2.5, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= rough) ?? 10 * power;
  if (integer) step = Math.max(1, Math.ceil(step));

  const max = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= max + step / 1000; value += step) ticks.push(Number(value.toFixed(6)));
  return { max, ticks };
};

/** Índices de etiquetas del eje X que caben sin chocar (siempre el primero y el último) */
export const pickLabelIndexes = (count: number, availableWidth: number, minSpacing = 64) => {
  if (count <= 0) return [];
  const maxLabels = Math.max(2, Math.floor(availableWidth / minSpacing));
  if (count <= maxLabels) return Array.from({ length: count }, (_, index) => index);
  const step = Math.ceil((count - 1) / (maxLabels - 1));
  const indexes: number[] = [];
  for (let index = 0; index < count; index += step) indexes.push(index);
  const last = count - 1;
  if (indexes[indexes.length - 1] !== last) {
    /* El último siempre se ve; si queda muy pegado al anterior, se quita el anterior */
    if (indexes.length > 1 && last - indexes[indexes.length - 1] < step * 0.75) indexes.pop();
    indexes.push(last);
  }
  return indexes;
};