// src/lib/errors.ts

export const getErrorMessage = (err: unknown) =>
  err instanceof Error ? err.message : 'Error desconocido';

/* Cuando un registro está en uso, Postgres responde en inglés, por ejemplo:
   'update or delete on table "stores" violates foreign key constraint
   "sales_store_id_fkey" on table "sales"'.
   Se toma la tabla que lo usa para explicarlo en español. */
const IN_USE_REASONS: Record<string, string> = {
  sales: 'tiene ventas registradas',
  profiles: 'tiene usuarios asignados',
  store_products: 'tiene productos asignados',
  products: 'tiene productos asignados',
  cash_shifts: 'tiene cajas registradas',
};

/** Texto para el toast cuando falla un eliminar */
export const getDeleteErrorMessage = (err: unknown, itemName: string) => {
  const message = getErrorMessage(err);
  if (!message.includes('foreign key')) return `Error al eliminar: ${message}`;

  const table = /on table "([^"]+)"\s*$/.exec(message)?.[1];
  const reason = (table && IN_USE_REASONS[table]) || 'está en uso en otros registros';
  return `No se puede eliminar ${itemName}: ${reason}.`;
};