import { describe, it, expect } from 'vitest';
import { computeQuote } from '../../src/shared/quote';

describe('computeQuote', () => {
  it('computes base × hours + blackCar + tax', () => {
    const q = computeQuote({ basePerHour: 100, hours: 5, blackCar: 300, taxRate: 0.16 });
    expect(q.base).toBe(500);
    expect(q.subtotal).toBe(800);
    expect(q.taxes).toBeCloseTo(128);
    expect(q.total).toBeCloseTo(928);
  });
});
