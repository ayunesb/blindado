// src/client/components/Gate.tsx
import * as React from 'react';
import { getSessionRole, type UiRole } from '../lib/auth';

export default function Gate({
  allow, children, fallback = null,
}: { allow: UiRole[]; children: React.ReactNode; fallback?: React.ReactNode }) {
  const [role, setRole] = React.useState<UiRole | undefined>();
  React.useEffect(() => { getSessionRole().then(r => setRole(r.role)); }, []);
  if (role === undefined) return null; // could render skeleton
  return allow.includes(role) ? <>{children}</> : <>{fallback}</>;
}
