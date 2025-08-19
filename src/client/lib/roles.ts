// src/client/lib/roles.ts
export type Role = 'client'|'company'|'freelancer'|'admin';

export const routesFor: Record<Role, string[]> = {
  client:     ['home','book','quote','bookings','account','profile','profile-edit'],
  freelancer: ['home','bookings','account','profile','profile-edit','assignments'],
  company:    ['home','bookings','account','profile','profile-edit','company','company-permits','company-vehicles','company-staff','company-staff-new','assignments'],
  admin:      ['home','book','quote','bookings','account','profile','profile-edit','company','company-permits','company-vehicles','company-staff','company-staff-new','assignments'],
};
