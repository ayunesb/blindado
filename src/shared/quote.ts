// src/shared/quote.ts
export function computeQuote({
  basePerHour,
  hours,
  blackCar,
  taxRate,
}: {
  basePerHour: number;
  hours: number;
  blackCar: number;
  taxRate: number;
}) {
  const base = basePerHour * hours;
  const subtotal = base + blackCar;
  const taxes = +(subtotal * taxRate).toFixed(2);
  const total = +(subtotal + taxes).toFixed(2);
  return { base, subtotal, taxes, total };
}
