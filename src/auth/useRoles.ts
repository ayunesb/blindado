import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../client/lib/supabase';

export type Role = 'client'|'company'|'freelancer'|'admin';

export function useRoles() {
  const [role, setRole] = useState<Role|undefined>();
  useEffect(() => {
    (async () => {
      try {
        const supa = getSupabaseClient();
        const { data: u } = await supa.auth.getUser();
        const id = u?.user?.id;
        if (!id) { setRole(undefined); return; }
        let r: string | undefined;
        const a = await supa.from('profiles').select('role').eq('user_id', id).maybeSingle<{role?:string}>();
        r = a.data?.role ?? undefined;
        if (!r) {
          const b = await supa.from('profiles').select('role').eq('id', id).maybeSingle<{role?:string}>();
          r = b.data?.role ?? undefined;
        }
        if (r === 'guard') setRole('freelancer');
        else if (r === 'company_admin') setRole('company');
        else if (r === 'client' || r === 'company' || r === 'freelancer' || r === 'admin') setRole(r as Role);
        else setRole(undefined);
      } catch {
        setRole(undefined);
      }
    })();
  }, []);
  return role;
}
