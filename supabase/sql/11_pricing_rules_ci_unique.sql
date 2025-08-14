-- Case-insensitive unique constraint for pricing rules
create unique index if not exists uq_pricing_rules_city_tier_lower
  on public.pricing_rules (lower(city), lower(tier));
