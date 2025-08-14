-- Public RPC to list guards with enriched fields for gallery
create or replace function public.list_guards_public(
  p_q text default null,
  p_armed boolean default null,
  p_vehicle boolean default null,
  p_min_exp int default 0,
  p_order text default 'rating', -- 'rating'|'experience'|'city'|'availability'
  p_dir text default 'desc',     -- 'asc'|'desc' (applies to numeric sorts)
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid,
  first_name text,
  last_name text,
  photo_url text,
  city text,
  rating numeric,
  availability text,
  armed boolean,
  weapon_type text,
  experience_years int,
  has_vehicle boolean,
  vehicle_plates text,
  vehicle_type text,
  vehicle_color text,
  license_status text,
  license_type text,
  license_number text,
  license_valid_to date
)
language sql
security definer
set search_path = public as
$$
  select g.id,
         p.first_name,
         p.last_name,
         p.photo_url,
         g.city,
         g.rating,
         g.availability_status as availability,
         coalesce((g.skills->>'armed')::boolean, false)  as armed,
         (g.skills->>'weapon_type')::text as weapon_type,
         coalesce((g.skills->>'experience_years')::int, 0) as experience_years,
         (veh.plates is not null) as has_vehicle,
         veh.plates as vehicle_plates,
         veh.type   as vehicle_type,
         veh.color  as vehicle_color,
         lic.status as license_status,
         lic.type   as license_type,
         lic.number as license_number,
         lic.valid_to as license_valid_to
  from public.guards g
  join public.profiles p on p.id = g.id
  left join lateral (
    select v.plates, v.type, v.color
    from public.vehicles v
    where v.guard_id = g.id and coalesce(v.active,true) is true
    order by v.id
    limit 1
  ) as veh on true
  left join lateral (
    select l.status, l.type, l.number, l.valid_to
    from public.licenses l
    where l.guard_id = g.id
    order by coalesce(l.valid_to, now()::date) desc
    limit 1
  ) as lic on true
  where coalesce(g.active, true) is true
    and (p_q is null or (coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')) ilike '%'||p_q||'%')
    and (p_armed is null or coalesce((g.skills->>'armed')::boolean,false) = p_armed)
    and (p_vehicle is null or (veh.plates is not null) = p_vehicle)
    and (coalesce((g.skills->>'experience_years')::int, 0) >= coalesce(p_min_exp,0))
  order by
    -- rating/experience numeric sorts default to p_dir; string sorts use ascending
    case when p_order='rating' then g.rating end   
      desc nulls last,
    case when p_order='experience' then coalesce((g.skills->>'experience_years')::int,0) end 
      desc nulls last,
    case when p_order='city' then g.city end asc nulls last,
    case when p_order='availability' then g.availability_status end asc nulls last,
    g.id asc
  limit greatest(0,p_limit)
  offset greatest(0,p_offset)
$$;

revoke all on function public.list_guards_public() from public;
grant execute on function public.list_guards_public() to anon, authenticated;
