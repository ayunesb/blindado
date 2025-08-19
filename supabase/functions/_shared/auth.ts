// supabase/functions/_shared/auth.ts
// deno-lint-ignore-file
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export function clientForRequest(req: Request) {
  return createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
}
export const admin = createClient(url, service);

export async function requireUser(req: Request) {
  const sb = clientForRequest(req);
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Response('Unauthorized', { status: 401 });
  return { user, sb } as const;
}

export async function getRole(user_id: string): Promise<'client'|'company'|'freelancer'|'admin'|null> {
  const { data } = await admin.from('profiles').select('role').eq('user_id', user_id).maybeSingle();
  const r = (data?.role as string | undefined);
  if (!r) return null;
  if (r === 'guard') return 'freelancer';
  if (r === 'company_admin') return 'company';
  if (['client','company','freelancer','admin'].includes(r)) return r as any;
  return null;
}

export async function assertRole(user_id: string, allowed: string[]) {
  const role = await getRole(user_id);
  if (!role || !allowed.includes(role)) {
    throw new Response('Forbidden', { status: 403 });
  }
}

export async function isCompanyMember(user_id: string, company_id: string) {
  const { count } = await admin.from('company_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user_id).eq('company_id', company_id);
  return (count ?? 0) > 0;
}
