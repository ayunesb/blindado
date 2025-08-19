import { describe, it, expect } from 'vitest';
import { routesFor, isAllowed } from '../../src/app/guard';

describe('route guards', () => {
  it('maps routes per role', () => {
    expect(routesFor.client).toContain('book');
    expect(routesFor.freelancer).not.toContain('book');
    expect(routesFor.company).toContain('company-vehicles');
    expect(routesFor.admin).toContain('assignments');
  });

  it('allows access when role is undefined (pre-auth)', () => {
    expect(isAllowed(undefined as any, 'home')).toBe(true);
    expect(isAllowed(undefined as any, 'company-vehicles')).toBe(true);
  });

  it('enforces allowed lists per role', () => {
    expect(isAllowed('client' as any, 'book')).toBe(true);
    expect(isAllowed('freelancer' as any, 'book')).toBe(false);
    expect(isAllowed('company' as any, 'company-vehicles')).toBe(true);
  });
});
