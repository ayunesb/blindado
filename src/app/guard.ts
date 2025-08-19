import type { Route } from './navigate';
import type { Role } from '../auth/useRoles';

export const routesFor: Record<Role, Route[]> = {
  client: ['home','book','quote','bookings','account','profile','profile-edit'],
  freelancer: ['home','bookings','account','profile','profile-edit','assignments'],
  company: ['home','bookings','account','profile','profile-edit','company','company-permits','company-vehicles','company-staff','company-staff-new','assignments'],
  admin: ['home','book','quote','bookings','account','profile','profile-edit','company','company-permits','company-vehicles','company-staff','company-staff-new','assignments'],
};

export function isAllowed(role: Role | undefined, route: Route) {
  if (!role) return true; // pre-auth: allow home; caller can refine
  return routesFor[role].includes(route);
}
