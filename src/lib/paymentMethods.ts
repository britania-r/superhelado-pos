// src/lib/paymentMethods.ts

/* Ícono de Boxicons según el nombre del método de pago (solo visual) */
export const getPaymentMethodIcon = (name: string) => {
  const text = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/efectivo|cash|contado/.test(text)) return 'bx-money';
  if (/tarjeta|visa|master|credito|debito|pos/.test(text)) return 'bx-credit-card';
  if (/yape|plin|transfer|qr|billetera|wallet/.test(text)) return 'bx-mobile-alt';
  return 'bx-wallet';
};