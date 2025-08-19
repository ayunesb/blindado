export type Route =
  | 'home' | 'book' | 'quote' | 'bookings' | 'account' | 'profile' | 'onboard' | 'profile-edit'
  | 'company' | 'company-permits' | 'company-vehicles' | 'company-staff' | 'company-staff-new' | 'company-staff/:id'
  | 'apply' | 'assignments';

export function navigate(route: Route, params?: Record<string,string>) {
  const q = params ? `?${new URLSearchParams(params).toString()}` : '';
  let path = `/${route}`;
  if (route === 'company-staff/:id') {
    const id = params?.id || '';
    path = `/company-staff/${encodeURIComponent(id)}`;
  }
  const next = `${path}${q}`;
  if (location.hash !== `#${next}`) location.hash = next;
}
