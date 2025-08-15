// src/client/router.ts
import { useEffect, useState } from 'react';

export type Route = 'home' | 'book' | 'quote' | 'bookings' | 'account';

function normalize(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '').trim();
  if (raw === 'book' || raw === 'quote' || raw === 'bookings' || raw === 'account') return raw as Route;
  return 'home';
}

export function useHashRoute() {
  const [route, setRoute] = useState<Route>(() => normalize(window.location.hash));
  useEffect(() => {
    const onHash = () => setRoute(normalize(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const navigate = (r: Route) => {
    if (r === 'home') window.location.hash = '#/home';
    else window.location.hash = `#/${r}`;
  };
  return { route, navigate };
}
