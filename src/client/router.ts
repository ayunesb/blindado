// src/client/router.ts
import { useEffect, useState } from 'react';

export type Route =
  | 'home'
  | 'book'
  | 'quote'
  | 'bookings'
  | 'account'
  | 'profile'
  | 'onboard'
  | 'profile-edit'
  | 'company'
  | 'company-permits'
  | 'company-vehicles'
  | 'company-staff'
  | 'company-staff-new'
  | 'company-staff/:id'
  | 'apply'
  | 'assignments';
export type Params = Record<string, string>;
const VALID: Route[] = [
  'home',
  'book',
  'quote',
  'bookings',
  'account',
  'profile',
  'onboard',
  'profile-edit',
  'company',
  'company-permits',
  'company-vehicles',
  'company-staff',
  'company-staff-new',
  'company-staff/:id',
  'apply',
  'assignments',
];
const DEFAULT: Route = 'home';

export function parse(): { route: Route; params: Params } {
  const raw = (location.hash || '').replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const head = (path || '').toLowerCase();
  let route: Route = DEFAULT;
  const params: Params = {};
  if (head.startsWith('company-staff/')) {
    route = 'company-staff/:id';
    params.id = decodeURIComponent(head.split('/')[1] || '');
  } else {
    route = (VALID.includes(head as Route) ? (head as Route) : DEFAULT);
  }
  if (qs) {
    for (const [k, v] of new URLSearchParams(qs).entries()) params[k] = v;
  }
  return { route, params };
}

export function navigate(route: Route, params?: Params) {
  const q = params ? `?${new URLSearchParams(params).toString()}` : '';
  let path = `/${route}`;
  if (route === 'company-staff/:id') {
    const id = params?.id || '';
    path = `/company-staff/${encodeURIComponent(id)}`;
  }
  const next = `${path}${q}`;
  if (location.hash !== `#${next}`) location.hash = next;
}

type Listener = (r: Route, p: Params) => void;
let listeners: Listener[] = [];
function onHash() {
  const { route, params } = parse();
  listeners.forEach((fn) => fn(route, params));
}
export function subscribe(fn: Listener) {
  if (!listeners.length) addEventListener('hashchange', onHash);
  listeners.push(fn);
  const { route, params } = parse();
  fn(route, params);
  return () => {
    listeners = listeners.filter((x) => x !== fn);
    if (!listeners.length) removeEventListener('hashchange', onHash);
  };
}

// Convenience React hook used by pages
export function useHashRoute() {
  const [{ route, params }, setState] = useState(parse());
  useEffect(() => subscribe((r, p) => setState({ route: r, params: p })), []);
  return { route, params, navigate };
}
