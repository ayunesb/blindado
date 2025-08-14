-- Create a case-insensitive pricing rule lookup as RPC
create or replace function public.get_pricing_rule_ci(p_city text, p_tier text)
returns public.pricing_rules
language sql stable security definer
as $$
  select *
  from public.pricing_rules
  where lower(city) = lower(p_city)
    and lower(tier) = lower(p_tier)
  limit 1;
$$;

grant execute on function public.get_pricing_rule_ci(text, text) to anon, authenticated;
